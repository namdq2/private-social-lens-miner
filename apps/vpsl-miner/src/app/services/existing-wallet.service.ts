import { inject, Injectable, signal } from '@angular/core';
import { AppKit, createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { AppKitNetwork } from '@reown/appkit/networks';
import { http } from 'viem';
import { WalletType } from '../models/wallet';
import { ENCRYPTION_SEED } from '../shared/constants';
import { AppConfigService } from './app-config.service';
import { ElectronIpcService } from './electron-ipc.service';

@Injectable({
  providedIn: 'root',
})
export class ExistingWalletService {
  private readonly electronIpcService: ElectronIpcService = inject(ElectronIpcService);
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

  private reownAppKit: AppKit | null = null; // modal
  public eip155Provider = signal<any>(null);
  public isConnected = signal<boolean>(false);
  public isOpenModal = signal<boolean>(false);

  public selectedNetworkId = signal<string>('');

  public vanaNetwork: AppKitNetwork = {
    id: 1480,
    name: 'Vana Mainnet',
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

  public wagmiAdapter: WagmiAdapter;

  constructor() {
    this.vanaNetwork = this.appConfigService.reownAppkit!.network;
    console.log('this.vanaNetwork', this.vanaNetwork);

    this.wagmiAdapter = new WagmiAdapter({
      projectId: this.projectId,
      networks: [this.vanaNetwork],
      transports: {
        [this.vanaNetwork.id]: http(this.vanaNetwork.rpcUrls.default.http[0]),
      }
    });

    this.initializeAppKit();
  }

  private async initializeAppKit() {
    const metadata = {
      name: 'dfusion',
      description: 'dFusion DLP Miner',
      url: this.domain,
      icons: [this.icon],
    };

    this.reownAppKit = await createAppKit({
      adapters: [this.wagmiAdapter],
      networks: [this.vanaNetwork],
      metadata,
      projectId: this.projectId,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#000000',
      },
      features: {
        analytics: true,
        email: false,
        socials: false,
      },
      allWallets: 'SHOW',
      enableNetworkSwitch: false,
      defaultNetwork: this.vanaNetwork,
    });

    // Subscribe events
    this.reownAppKit.subscribeProviders((providersState: any) => {
      console.log('reown state', providersState);
      this.eip155Provider.set(providersState['eip155']);

      console.log('this?.reownAppKit?.getState()', this?.reownAppKit?.getState());

      const isConnected = this?.reownAppKit?.getIsConnectedState() || false;
      this.isConnected.set(isConnected);

      if (this.isConnected() && this.eip155Provider()) {
        try {
          if (!this.reownAppKit) {
            throw new Error('AppKit is not initialized');
          }

          this.isOpenModal.set(true);
          const address = this.reownAppKit.getAddress();

          if (!address) {
            throw new Error('Wallet address does not exist');
          }

          this.electronIpcService.setWalletAddress(address);
          this.electronIpcService.setWalletType(WalletType.EXISTING_WALLET);
        } catch (error) {
          console.log('Save data connected wallet error: ', error);
        }
      }
    });

    this?.reownAppKit.subscribeState((state: any) => {
      console.log('reown state', state);
      const stateDetails = state['selectedNetworkId'];
      if (stateDetails) {
        const networkStateString = stateDetails.split(':')[1];
        this.selectedNetworkId.set(networkStateString);
        console.log('this.selectedNetworkId()', this.selectedNetworkId());

        // if (this.selectedNetworkId() !== this.vanaNetwork.id.toString()) {
        //   this?.reownAppKit?.open({ view: 'Networks' });
        // }
        // else {
        //   this?.reownAppKit?.close();
        // }
      }
    });

    // this?.reownAppKit.subscribeNetwork((networkState: any) => {
    //   console.log('reown network state', networkState);
    // });

    // this?.reownAppKit.subscribeAccount((accountState: any) => {
    //   console.log('reown account state', accountState);
    // });

    // this?.reownAppKit.subscribeEvents((eventState: any) => {
    //   console.log('reown event state', eventState);
    // });

    // this?.reownAppKit.subscribeWalletInfo((walletInfoState: any) => {
    //   console.log('reown wallet info state', walletInfoState);
    // });
  }

  public connectExistingWallet() {
    if (this.reownAppKit && !this.isOpenModal()) {
      this.reownAppKit.open();
    }
  }

  public async disconnectWallet() {
    try {
      if (this.reownAppKit) {
        await this.reownAppKit.disconnect();
      }
      this.isConnected.set(false);
      this.isOpenModal.set(false);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }

  public async signMessage(walletAddress: string) {
    if (!walletAddress) {
      throw new Error('The wallet address does not exist');
    }
    const signature = await this.eip155Provider().request({
      method: 'personal_sign',
      params: [ENCRYPTION_SEED, walletAddress],
    });

    return signature;
  }
}
