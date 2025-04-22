import { forwardRef, inject, Injectable, signal } from '@angular/core';
import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { AppKitNetwork } from '@reown/appkit/networks';
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

  public isConnected = signal<boolean>(false);
  public walletAddress = signal<string>('');
  public encryptionKey = signal<string>('');
  public walletType = signal<WalletType | null>(null);
  public isOpenModal = signal<boolean>(false);
  
  // Define Vana networks
  public vanaMainnet: AppKitNetwork = {
    id: 1480,
    name: 'Vana Mainnet',
    nativeCurrency: {
      name: 'VANA',
      symbol: 'VANA',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ['https://rpc.vana.org'],
      },
      public: {
        http: ['https://rpc.vana.org'],
      },
    },
    blockExplorers: {
      default: {
        name: 'Vana Explorer',
        url: 'https://vanascan.io',
      },
    },
  };

  public vanaMokshaTestnet: AppKitNetwork = {
    id: 14800,
    name: 'Vana Moksha Testnet',
    nativeCurrency: {
      name: 'VANA',
      symbol: 'VANA',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ['https://rpc.moksha.vana.org'],
      },
      public: {
        http: ['https://rpc.moksha.vana.org'],
      },
    },
    blockExplorers: {
      default: {
        name: 'Vana Moksha Explorer',
        url: 'https://moksha.vanascan.io',
      },
    },
    testnet: true,
  };

  public networks = [this.vanaMainnet, this.vanaMokshaTestnet];
  
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
      icons: [this.icon],
    };

    this.reownAppKit = await createAppKit({
      adapters: [this.wagmiAdapter],
      networks: [this.vanaMainnet, this.vanaMokshaTestnet],
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

    // Subscribe events
    this.reownAppKit.subscribeProviders(async (state: any) => {
      this.eip155Provider = state['eip155'];

      const isConnected = await this.reownAppKit.getIsConnectedState();
      this.isConnected.set(isConnected);
      if (isConnected && !this.isOpenModal()) {
        try {
          this.isOpenModal.set(true);
          const address = await this.reownAppKit.getAddress();
          this.walletAddress.set(address);
          this.electronIpcService.setWalletAddress(address);

          if (!this.encryptionKey()) {
            const signature = await this.signMessage();
            this.encryptionKey.set(signature);
            this.electronIpcService.setEncryptionKey(signature);
          }
        } catch (error) {
          console.log("Save data connected wallet error: ", error);
        }
      }
    });
  }

  public async connectWallet(): Promise<void> {
    if (this.walletType() === WalletType.EXISTING_WALLET && !this.isOpenModal()) {
      await this.reownAppKit.open();
    }

    const isConnected = this.isConnected();
    if (isConnected && !this.encryptionKey()) {
      const signature = await this.signMessage();
      this.encryptionKey.set(signature);
      this.electronIpcService.setEncryptionKey(signature);
    }
  }

  public async disconnectWallet(): Promise<void> {
    try {
      await this.reownAppKit?.disconnect();
      this.eip155Provider = null;
      this.isConnected.set(false);
      this.isOpenModal.set(false);
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
