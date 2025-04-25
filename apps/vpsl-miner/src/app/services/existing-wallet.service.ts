import { forwardRef, inject, Injectable, signal } from '@angular/core';
import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { AppKitNetwork } from '@reown/appkit/networks';
import { WalletType } from '../models/wallet';
import { ENCRYPTION_SEED } from '../shared/constants';
import { AppConfigService } from './app-config.service';
import { ElectronIpcService } from './electron-ipc.service';
import { http } from 'viem';

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
  public eip155Provider: any;
  public isConnected = signal<boolean>(false);
  public isOpenModal = signal<boolean>(false);

  // Define Vana networks
  public vanaMainnet: AppKitNetwork = {
    id: 1480,
    name: 'Vana',
    nativeCurrency: {
      name: 'VANA',
      symbol: 'VANA',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ['https://rpc.vana.org']
      }
    },
    blockExplorers: {
      default: {
        name: 'Vana Explorer',
        url: 'https://vanascan.io',
        apiUrl: 'https://api.vanascan.io/api',
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
        http: ['https://rpc.moksha.vana.org']
      }
    },
    blockExplorers: {
      default: {
        name: 'Vana Moksha Explorer',
        url: 'https://moksha.vanascan.io',
        apiUrl: 'https://api.moksha.vanascan.io/api',
      },
    },
    testnet: true,
  };

  public networks = [this.vanaMainnet, this.vanaMokshaTestnet];

  public wagmiAdapter = new WagmiAdapter({
    projectId: this.projectId,
    networks: this.networks,
    transports: {
      [this.vanaMainnet.id]: http('https://rpc.vana.org'),
      [this.vanaMokshaTestnet.id]: http('https://rpc.moksha.vana.org')
    }
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
    this.reownAppKit.subscribeProviders((state: any) => {
      this.eip155Provider = state['eip155'];

      const isConnected = this?.reownAppKit?.getIsConnectedState() || false;
      this.isConnected.set(isConnected);
      if (isConnected) {
        try {
          this.isOpenModal.set(true);
          const address = this.reownAppKit.getAddress();
          this.electronIpcService.setWalletAddress(address);
        } catch (error) {
          console.log('Save data connected wallet error: ', error);
        }
      }
    });
  }

  public connectWallet(walletType: WalletType) {
    if (walletType === WalletType.EXISTING_WALLET && !this.isOpenModal()) {
      this.reownAppKit.open();
    }
  }

  public async disconnectWallet() {
    try {
      if (this.reownAppKit) {
        await this.reownAppKit.disconnect();
      }
      this.eip155Provider = null;
      this.isConnected.set(false);
      this.isOpenModal.set(false);
      console.log('Existing Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }

  public async signMessage(walletAddress: string) {
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
