import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, firstValueFrom } from 'rxjs';
import { catchError, filter, take, timeout } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';
import { ElectronIpcService } from './electron-ipc.service';
import { TIMEOUT_MS } from '../shared/constants';
import { IStreamConversationResponse } from '../models/ai-chat';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  private apiUrl = ''; // Replace with your API base URL
  private refreshTokenInProgress = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  // Queue for failed requests that need to be retried after token refresh
  private failedRequestsQueue: Array<{
    method: string;
    endpoint: string;
    body: any;
    options: { headers?: HttpHeaders };
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(private http: HttpClient, private readonly appConfigService: AppConfigService, private readonly electronIpcService: ElectronIpcService) {
    this.apiUrl = appConfigService.aiAgent?.aiAgentUrl || '';
  }

  // Generic GET request
  get<T>(endpoint: string, options?: { headers?: HttpHeaders }): Observable<T> {
    return this.requestWithTokenHandling('get', endpoint, null, options);
  }

  // Generic POST request
  post<T>(endpoint: string, body: any, options?: { headers?: HttpHeaders }): Observable<T> {
    return this.requestWithTokenHandling('post', endpoint, body, options);
  }

  // Generic PUT request
  put<T>(endpoint: string, body: any, options?: { headers?: HttpHeaders }): Observable<T> {
    return this.requestWithTokenHandling('put', endpoint, body, options);
  }

  // Generic DELETE request
  delete<T>(endpoint: string, options?: { headers?: HttpHeaders }): Observable<T> {
    return this.requestWithTokenHandling('delete', endpoint, null, options);
  }

  // New method for SSE streaming
  stream<T>(
    endpoint: string,
    body: any,
    onConversation: (conversation: IStreamConversationResponse) => void,
    onChunk: (content: string) => void,
    onComplete: (finalMessage: any) => void,
    onError: (error: any) => void,
  ): Observable<void> {
    return new Observable<void>((observer) => {
      const url = `${this.apiUrl}/${endpoint}`;
      const token = this.getAiAccessToken();

      // Use fetch instead of EventSource to support custom headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
        .then((response) => {
          if (!response.ok) {
            if (response.status === 401) {
              // Handle 401 by attempting token refresh
              this.handleStreaming401Error(endpoint, body, onConversation, onChunk, onComplete, onError, observer);
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body available');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.substring(6).trim();
                    if (data) {
                      try {
                        const parsed = JSON.parse(data);
                        this.handleStreamingEvent(parsed, onConversation, onChunk, onComplete, onError);
                      } catch (e) {
                        console.warn('Failed to parse SSE data:', data);
                      }
                    }
                  }
                }
              }
            } catch (error) {
              observer.error(error);
            }
          };

          processStream();
        })
        .catch((error) => {
          observer.error(error);
        });

      // Clean up on unsubscribe
      return () => {
        // Cleanup will be handled by the fetch promise
      };
    });
  }

  // Handle 401 errors for streaming requests
  private handleStreaming401Error(
    endpoint: string,
    body: any,
    onConversation: (conversation: IStreamConversationResponse) => void,
    onChunk: (content: string) => void,
    onComplete: (finalMessage: any) => void,
    onError: (error: any) => void,
    observer: any,
  ): void {
    if (this.refreshTokenInProgress) {
      // If refresh is already in progress, wait for it to complete
      this.refreshTokenSubject
        .pipe(
          filter((token) => token !== null),
          take(1),
        )
        .subscribe(() => {
          this.stream(endpoint, body, onConversation, onChunk, onComplete, onError).subscribe({
            next: () => observer.next(),
            error: (err) => {
              onError(err);
              observer.error(err);
            },
          });
        });
      return;
    }

    this.refreshTokenInProgress = true;
    this.refreshTokenSubject.next(null);

    this.refreshAiAccessToken()
      .then((newToken: string) => {
        this.refreshTokenInProgress = false;
        this.refreshTokenSubject.next(newToken);

        // Retry all queued requests
        this.retryQueuedRequests();

        this.stream(endpoint, body, onConversation, onChunk, onComplete, onError).subscribe({
          next: () => observer.next(),
          error: (err) => {
            onError(err);
            observer.error(err);
          },
        });
      })
      .catch((err: any) => {
        this.refreshTokenInProgress = false;
        this.refreshTokenSubject.next(null);
        this.logoutAiAgent();

        // Reject all queued requests
        this.rejectQueuedRequests(err);

        onError(err);
        observer.error(err);
      });
  }

  // Handle streaming events
  private handleStreamingEvent(
    event: any,
    onConversation: (conversation: IStreamConversationResponse) => void,
    onChunk: (content: string) => void,
    onComplete: (finalMessage: any) => void,
    onError: (error: any) => void,
  ): void {
    switch (event.type) {
      case 'chunk':
        if (event.content && typeof event.content === 'string') {
          onChunk(event.content);
        }
        break;
      case 'complete':
        onComplete(event.aiMessage || event);
        break;
      case 'error':
        onError(event.aiMessage || event);
        break;
      case 'conversation':
        onConversation(event);
        break;
      case 'userMessage':
        console.log('User message processed:', event.userMessage);
        break;
      default:
        console.warn('Unknown streaming event type:', event.type);
    }
  }

  // Handle HTTP requests with token
  private requestWithTokenHandling<T>(method: string, endpoint: string, body: any | null, options: { headers?: HttpHeaders } = {}): Observable<T> {
    const headers = this.setAuthHeaders(options.headers);
    const requestOptions = { ...options, headers };

    return this.http.request<T>(method, `${this.apiUrl}/${endpoint}`, { ...requestOptions, body }).pipe(
      timeout(TIMEOUT_MS.THREE_MINUTES),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.refreshTokenInProgress) {
          return this.handle401Error<T>(method, endpoint, body, requestOptions);
        }
        return throwError(() => error);
      }),
    );
  }

  // Set Authorization header with token
  private setAuthHeaders(headers: HttpHeaders = new HttpHeaders()): HttpHeaders {
    const token = this.getAiAccessToken();
    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Handle 401 Unauthorized errors
  private handle401Error<T>(method: string, endpoint: string, body: any, options: { headers?: HttpHeaders }): Observable<T> {
    if (this.refreshTokenInProgress) {
      // If refresh is already in progress, queue this request
      return new Observable<T>((observer) => {
        this.failedRequestsQueue.push({
          method,
          endpoint,
          body,
          options,
          resolve: (value: T) => observer.next(value),
          reject: (error: any) => observer.error(error),
        });
      });
    }

    this.refreshTokenInProgress = true;
    this.refreshTokenSubject.next(null);

    return new Observable<T>((observer) => {
      this.refreshAiAccessToken()
        .then((newToken: string) => {
          this.refreshTokenInProgress = false;
          this.refreshTokenSubject.next(newToken);

          // Retry all queued requests
          this.retryQueuedRequests();

          // Retry the current request
          this.requestWithTokenHandling<T>(method, endpoint, body, options).subscribe({
            next: (value) => observer.next(value),
            error: (error) => observer.error(error),
          });
        })
        .catch((err: any) => {
          this.refreshTokenInProgress = false;
          this.refreshTokenSubject.next(null);
          this.logoutAiAgent();

          // Reject all queued requests
          this.rejectQueuedRequests(err);

          observer.error(err);
        });
    });
  }

  // Refresh access token
  private async refreshAiAccessToken(): Promise<string> {
    const refreshToken = this.getAiRefreshToken();
    if (!refreshToken) {
      this.logoutAiAgent();
      throw new Error('No refresh token available');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string; refreshToken: string }>(`${this.apiUrl}/auth/refresh`, null, {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        }),
      );

      this.setAiAccessToken(response.token);
      this.setAiRefreshToken(response.refreshToken);
      return response.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  // Token storage methods (using localStorage as example)
  private getAiAccessToken(): string | null {
    return this.electronIpcService.aiAgentAccessToken();
  }

  private setAiAccessToken(token: string): void {
    this.electronIpcService.setAiAgentAccessToken(token);
  }

  private getAiRefreshToken(): string | null {
    return this.electronIpcService.aiAgentRefreshToken();
  }

  private setAiRefreshToken(token: string): void {
    this.electronIpcService.setAiAgentRefreshToken(token);
  }

  // Logout method
  logoutAiAgent(): void {
    this.electronIpcService.setAiAgentAccessToken('');
    this.electronIpcService.setAiAgentRefreshToken('');
  }

  // Retry all queued requests
  private retryQueuedRequests(): void {
    const retryCount = this.failedRequestsQueue.length;
    for (let i = 0; i < retryCount; i++) {
      const request = this.failedRequestsQueue.shift();
      if (request) {
        this.requestWithTokenHandling(request.method, request.endpoint, request.body, request.options).subscribe({
          next: (value) => request.resolve(value),
          error: (error) => request.reject(error),
        });
      }
    }
  }

  // Reject all queued requests
  private rejectQueuedRequests(error: any): void {
    const retryCount = this.failedRequestsQueue.length;
    for (let i = 0; i < retryCount; i++) {
      const request = this.failedRequestsQueue.shift();
      if (request) {
        request.reject(error);
      }
    }
  }
}
