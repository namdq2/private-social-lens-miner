import { CommonModule } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { WhatsAppService } from '../../services/whatsapp.service';

@Component({
  selector: 'app-whatsapp-connect',
  templateUrl: './whatsapp-connect.component.html',
  styleUrls: ['./whatsapp-connect.component.scss'],
  standalone: false,
})
export class WhatsAppConnectComponent implements OnInit, OnDestroy {
  qrCode: string | null = null;
  isConnected = false;
  loading = false;
  error: string | null = null;
  apiAvailable = false;
  debugInfo = '';
  private destroy$ = new Subject<void>();

  constructor(private whatsAppService: WhatsAppService, private zone: NgZone) {
    this.debugApiStatus();
  }

  ngOnInit(): void {
    this.whatsAppService.apiAvailable$.pipe(takeUntil(this.destroy$)).subscribe((available) => {
      this.zone.run(() => {
        this.apiAvailable = available;
        if (!available) {
          this.error = 'WhatsApp API are not available. Please restart the application.';
        }
      });
    });

    this.whatsAppService.qrCode$.pipe(takeUntil(this.destroy$)).subscribe((qrCode) => this.zone.run(() => (this.qrCode = qrCode)));

    this.whatsAppService.isConnected$.pipe(takeUntil(this.destroy$)).subscribe((status) => this.zone.run(() => (this.isConnected = status)));

    this.whatsAppService.loading$.pipe(takeUntil(this.destroy$)).subscribe((loading) => this.zone.run(() => (this.loading = loading)));

    this.whatsAppService.error$.pipe(takeUntil(this.destroy$)).subscribe((error) => this.zone.run(() => (this.error = error)));

    // Check API status after 2 seconds
    setTimeout(() => this.debugApiStatus(), 2000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async connectWhatsApp(): Promise<void> {
    if (!this.apiAvailable) {
      this.error = 'WhatsApp API is not available. Please restart the application.';
      return;
    }
    await this.whatsAppService.initialize();
  }

  async logout(): Promise<void> {
    await this.whatsAppService.logout();
  }

  debugApiStatus(): void {
    try {
      const api = (window as any).whatsappAPI;
      if (api) {
        this.debugInfo = `WhatsApp API is available. Methods: ${Object.keys(api).join(', ')}`;
        console.log('WhatsApp API found:', api);
        this.apiAvailable = true;
      } else {
        this.debugInfo = 'WhatsApp API is NOT available (undefined)';
        console.error('WhatsApp API not available - window.whatsappAPI is undefined');
        this.apiAvailable = false;
      }
    } catch (e) {
      this.debugInfo = `Error checking API: ${e}`;
      console.error('Error checking WhatsApp API:', e);
      this.apiAvailable = false;
    }
  }

  reloadApp(): void {
    if (window.location) {
      window.location.reload();
    }
  }
}
