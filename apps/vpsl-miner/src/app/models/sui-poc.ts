export interface IProcessedData {
  unprocessedWalrusUrl: string;
  unprocessedOnChainFileUrl: string;
  walrusUrl: string;
  attestationUrl: string;
  onChainFileUrl: string;
  policyObjectUrl: string;
}

export interface IInternalEncryptRes {
  success: boolean
  encryptedData: IInternalEncryptedData
  message: string
}

export interface IInternalEncryptedData {
  nonce: string
  ciphertext: string
  tag: string
}
