export interface PermissionDto {
  account: string;
  key: string;
}

/**
 * DTO for adding a file to the Data Registry with permissions
 */
export interface AddFileWithPermissionsDto {
  url: string;
  ownerAddress: string;
  permissions: PermissionDto[];
}

export interface RequestRewardDto {
  fileId: number;
  proofIndex: number;
}

/**
 * DTO for requesting a contribution proof from the TEE Pool
 */
export interface RequestProofDto {
  fileId: number;
}

/**
 * Interface for standardized transaction responses
 */
export interface RelayTransactionResponse {
  /**
   * Transaction hash from the blockchain
   */
  transactionHash: string;

  /**
   * Status of the transaction
   */
  status: 'success' | 'pending' | 'failed';

  /**
   * Timestamp of when the transaction was processed
   */
  timestamp: string;

  /**
   * Additional metadata about the transaction
   */
  metadata?: Record<string, any>;
}
