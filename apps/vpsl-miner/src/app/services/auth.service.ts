import { Inject, Injectable } from '@angular/core';
import { ElectronIpcService } from './electron-ipc.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    @Inject(ElectronIpcService)
    private readonly electronIpcService: ElectronIpcService,
  ) {}

  isAuthenticated(): boolean {
    const walletAddress = this.electronIpcService.walletAddress();
    const encryptionKey = this.electronIpcService.encryptionKey();

    return !!walletAddress && !!encryptionKey;
  }
}
