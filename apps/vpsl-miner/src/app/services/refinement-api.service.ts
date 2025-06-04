import { inject, Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RefinementApiService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly http: HttpClient = inject(HttpClient);

  // Default URL of the Refinement Service
  private defaultRefinementServiceUrl = 'https://a7df0ae43df690b889c1201546d7058ceb04d21b-8000.dstack-prod5.phala.network/refine';

  // Default refiner ID
  private defaultRefinerId = 12;

  // Get the refinement service URL from config or use default
  private get refinementServiceUrl(): string {
    return this.appConfigService.vana?.refinementServiceUrl || this.defaultRefinementServiceUrl;
  }

  // Get the refiner ID from config or use default
  private get refinerId(): number {
    return this.appConfigService.vana?.refinerId || this.defaultRefinerId;
  }

  /**
   * Call the refinement API to process data
   * @param fileId ID of the file in Data Registry
   * @param encryptionKey Original encryption key
   * @returns Promise with transaction hash of addRefinementWithPermission
   */
  public async callRefinementService(
    fileId: number,
    encryptionKey: string
  ): Promise<{add_refinement_tx_hash: string}> {
    const requestBody = {
      file_id: fileId,
      encryption_key: encryptionKey,
      refiner_id: this.refinerId,
      env_vars: {
        PINATA_API_JWT: this.appConfigService.pinata?.jwt,
      }
    };

    try {
      return await firstValueFrom(this.http.post<{add_refinement_tx_hash: string}>(
        this.refinementServiceUrl,
        requestBody
      ));
    } catch (error) {
      console.error('Error calling refinement service:', error);
      throw new Error('Failed to process data refinement. Please try again.');
    }
  }
}