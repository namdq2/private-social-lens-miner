import { forwardRef, inject, Injectable, signal } from '@angular/core';
import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { arbitrum, mainnet, optimism, polygon, sepolia } from '@reown/appkit/networks';
import { ElectronIpcService } from './electron-ipc.service';
import { WalletType } from '../models/wallet';
import { AppConfigService } from './app-config.service';
import { ENCRYPTION_SEED } from '../shared/constants';

@Injectable({
  providedIn: 'root',
})
export class ExistingWalletService {
  private readonly electronIpcService: ElectronIpcService = inject(forwardRef(() => ElectronIpcService));
  private readonly appConfigService: AppConfigService = inject(AppConfigService);

  public get projectId() {
    return this.appConfigService.reownAppkit?.projectId || '';
  }

  public get domain() {
    return this.appConfigService.reownAppkit?.domain || '';
  }
  public get icon() {
    return this.appConfigService.reownAppkit?.icon || '';
  }

  private reownAppKit: any;
  private eip155Provider: any;
  private connectionWatcherInterval: any;

  public isConnected = signal<boolean>(false);
  public walletAddress = signal<string>('');
  public encryptionKey = signal<string>('');
  public networks = [arbitrum, mainnet, optimism, polygon, sepolia];
  public wagmiAdapter = new WagmiAdapter({
    projectId: this.projectId,
    networks: this.networks,
  });

  constructor() {
    this.initializeAppKit();
  }

  private async initializeAppKit() {
    const metadata = {
      name: 'dfusion',
      description: 'AppKit Example',
      url: this.domain,
      icons: [this.icon]
    }
    this.reownAppKit = await createAppKit({
      adapters: [this.wagmiAdapter],
      networks: [arbitrum, ...this.networks.slice(1)],
      metadata,
      projectId: this.projectId,
      themeMode: 'light',
      themeVariables: {
        '--w3m-accent': '#000000',
      },
      features: {
        analytics: true,
        email: false,
        socials: false,
      },
      allWallets: 'HIDE',
    });
    this.reownAppKit.subscribeProviders((state: any) => {
      this.eip155Provider = state['eip155'];
    });
  }

  ngOnDestroy() {
    this.cleanup();
  }

  public async connectWallet(): Promise<void> {
    if (this.electronIpcService.walletType() === WalletType.EXISTING_WALLET) {
      await this.reownAppKit.open();
    }

    this.startConnectionWatcher();
  }

  private startConnectionWatcher() {
    this.connectionWatcherInterval = setInterval(async () => {
      const isConnected = await this.reownAppKit.getIsConnectedState();

      if (isConnected) {
        this.cleanup();
        this.isConnected.set(true);
        const address = await this.reownAppKit.getAddress();
        this.walletAddress.set(address);
        this.electronIpcService.setWalletAddress(address);
        if (!this.encryptionKey()) {
          const signature = await this.signMessage();
          this.encryptionKey.set(signature);
          this.electronIpcService.setEncryptionKey(signature);
        }
      } else {
        console.log("Connection lost");
        this.isConnected.set(false);
        this.walletAddress.set('');
      }
    }, 1000);
  }

  public cleanup() {
    if (this.connectionWatcherInterval) {
      clearInterval(this.connectionWatcherInterval);
    }
  }

  public async disconnectWallet(): Promise<void> {
    try {
      await this.reownAppKit?.disconnect();
      this.eip155Provider = null;
      this.isConnected.set(false);
      this.walletAddress.set('');
      this.encryptionKey.set('');
      console.log('Existing Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }

  public async signMessage() {
    const walletAddress = this.walletAddress();
    if (!walletAddress) {
      throw new Error('The wallet address does not exist');
    }
    const signature = await this.eip155Provider.request({
      method: 'personal_sign',
      params: [ENCRYPTION_SEED, walletAddress],
    });

    return signature;
  }
}
