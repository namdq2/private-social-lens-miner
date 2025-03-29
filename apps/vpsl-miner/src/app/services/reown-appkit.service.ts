// import { inject, Injectable } from '@angular/core';
// import { ethers } from 'ethers';
// import { AppConfigService } from './app-config.service';

// // import DLPTokenABI from '../assets/contracts/DLPTokenImplementation.json';

// import { createAppKit } from '@reown/appkit';
// import { EthersAdapter } from '@reown/appkit-adapter-ethers';
// import { AppKitNetwork } from '@reown/appkit/networks';

// @Injectable({
//   providedIn: 'root',
// })
// export class ReownAppkitService {
//   private readonly appConfigService: AppConfigService = inject(AppConfigService);

//   private appKitModal: any;
//   public get walletModal() {
//     return this.appKitModal;
//   }

//   public get walletIsConnected() {
//     return this.walletModal.getIsConnected();
//   }

//   public get walletAddress() {
//     return this.appKitModal.getAddress();
//   }

//   constructor() {
//     this.initializeAppKit();
//   }

//   public async signMessage(): Promise<string> {
//     try {
//       // this.encryptionSeed.set(`${this.SEED_MESSAGE}. Session: ${crypto.randomUUID()}`);
//       // const signature = await this.wallet.signMessage(this.encryptionSeed());

//       const provider = await this.walletModal.subscribeProviders((state: any) => {
//         return state['eip155'];
//       });
//       const providerValue = await provider.value;
//       const web3Provider = new ethers.BrowserProvider(providerValue);
//         const signer = await web3Provider.getSigner();
//       const signature = await signer.signMessage(this.encryptionSeed());
//       console.log('signature', signature);
//       return signature;
//     } catch (error: any) {
//       if (error instanceof Error) {
//         throw new Error(`Message signing failed: ${error.message}`);
//       }
//       throw new Error('An unknown error occurred while signing the message.');
//     }
//   }

//   private initializeAppKit() {
//     const vanaChain: AppKitNetwork = {
//       id: 14800,
//       name: 'Vana Moksha Testnet',
//       nativeCurrency: {
//         name: 'VANA',
//         symbol: 'VANA',
//         decimals: 18,
//       },
//       rpcUrls: {
//         default: {
//           http: ['https://rpc.moksha.vana.org'],
//         },
//       },
//       blockExplorers: {
//         default: {
//           name: 'Vana Moksha ',
//           url: 'https://moksha.vanascan.io/',
//           apiUrl: 'https://api.moksha.vanascan.io/api',
//         },
//       },
//     };

//     this.appKitModal = createAppKit({
//       adapters: [new EthersAdapter()],
//       networks: [vanaChain],
//       projectId: '4dd96a8a1b616053cba88b6d7b528e7b', // dfcd23018a11c29826ae3ee56b8c6de7
//     });
//   }
// }
