export type StorageMode = 'local' | 'storacha';
export type CoordinationMode = 'local' | 'near';

export interface ProviderStatus {
  configured: boolean;
  healthy: boolean;
  label: string;
  detail: string;
}

export interface RuntimeConfig {
  appEnv: string;
  chainId: number;
  chainName: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  ipfsGateway: string;
  storageMode: StorageMode;
  storageApiUrl?: string;
  walletConnectProjectId?: string;
  litNetwork: string;
  litChain: string;
  nearRpcUrl?: string;
  nearContractId?: string;
  coordinationMode: CoordinationMode;
  impulseApiUrl?: string;
  impulseDeploymentId?: string;
  impulseProxyUrl?: string;
}

export interface CoordinationRoundReceipt {
  roundId: string;
  anchor: string;
  publishedAt: number;
}

export interface ImpulseInference {
  model: string;
  label: string;
  confidence: number;
  raw?: unknown;
  requestedAt: number;
}
