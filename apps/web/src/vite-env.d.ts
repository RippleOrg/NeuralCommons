/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIMULATE_EEG: string;
  readonly VITE_IPFS_GATEWAY: string;
  readonly VITE_CONSENT_VAULT_ADDRESS: string;
  readonly VITE_REVOCATION_REGISTRY_ADDRESS: string;
  readonly VITE_DATA_DAO_ADDRESS: string;
  readonly VITE_BOUNTY_POOL_ADDRESS: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID: string;
  readonly VITE_CHAIN_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
