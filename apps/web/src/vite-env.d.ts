/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIMULATE_EEG?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_CHAIN_NAME?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_BLOCK_EXPLORER_URL?: string;
  readonly VITE_IPFS_GATEWAY?: string;
  readonly VITE_CONSENT_VAULT_ADDRESS?: string;
  readonly VITE_REVOCATION_REGISTRY_ADDRESS?: string;
  readonly VITE_DATA_DAO_ADDRESS?: string;
  readonly VITE_BOUNTY_POOL_ADDRESS?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_STORAGE_MODE?: string;
  readonly VITE_STORAGE_API_URL?: string;
  readonly VITE_LIT_NETWORK?: string;
  readonly VITE_LIT_CHAIN?: string;
  readonly VITE_NEAR_RPC_URL?: string;
  readonly VITE_NEAR_COORDINATION_CONTRACT_ID?: string;
  readonly VITE_COORDINATION_MODE?: string;
  readonly VITE_IMPULSE_API_URL?: string;
  readonly VITE_IMPULSE_DEPLOYMENT_ID?: string;
  readonly VITE_IMPULSE_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
