import type { ProviderStatus, RuntimeConfig } from '../types/runtime';

const FALLBACK_GATEWAY = 'https://w3s.link/ipfs/';

export function getRuntimeConfig(): RuntimeConfig {
  return {
    appEnv: import.meta.env.MODE,
    chainId: Number(import.meta.env.VITE_CHAIN_ID ?? '11155111'),
    chainName: import.meta.env.VITE_CHAIN_NAME ?? 'Ethereum Sepolia',
    rpcUrl: import.meta.env.VITE_RPC_URL ?? 'https://rpc.sepolia.org',
    blockExplorerUrl: import.meta.env.VITE_BLOCK_EXPLORER_URL ?? 'https://sepolia.etherscan.io',
    ipfsGateway: import.meta.env.VITE_IPFS_GATEWAY ?? FALLBACK_GATEWAY,
    storageMode: import.meta.env.VITE_STORAGE_MODE === 'storacha' ? 'storacha' : 'local',
    storageApiUrl: import.meta.env.VITE_STORAGE_API_URL,
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    litNetwork: import.meta.env.VITE_LIT_NETWORK ?? 'datil',
    litChain: import.meta.env.VITE_LIT_CHAIN ?? 'ethereum',
    nearRpcUrl: import.meta.env.VITE_NEAR_RPC_URL,
    nearContractId: import.meta.env.VITE_NEAR_COORDINATION_CONTRACT_ID,
    coordinationMode: import.meta.env.VITE_COORDINATION_MODE === 'near' ? 'near' : 'local',
    impulseApiUrl: import.meta.env.VITE_IMPULSE_API_URL,
    impulseDeploymentId: import.meta.env.VITE_IMPULSE_DEPLOYMENT_ID,
    impulseProxyUrl: import.meta.env.VITE_IMPULSE_PROXY_URL,
  };
}

export function getProviderStatuses(config = getRuntimeConfig()): Record<string, ProviderStatus> {
  return {
    storage: {
      configured: config.storageMode === 'local' || Boolean(config.storageApiUrl),
      healthy: true,
      label: config.storageMode === 'storacha' ? 'Storacha / Filecoin' : 'Local encrypted archive',
      detail:
        config.storageMode === 'storacha'
          ? config.storageApiUrl
            ? 'Encrypted datasets replicate to Storacha through the API service, with local retention preserved in the browser.'
            : 'Encrypted datasets remain protected in the local archive until remote replication is enabled.'
          : 'Encrypted datasets stay in the browser archive until remote storage is configured.',
    },
    permissions: {
      configured: true,
      healthy: true,
      label: 'Lit Protocol envelope',
      detail: `AES payload keys can be wrapped with Lit on ${config.litNetwork}/${config.litChain}.`,
    },
    coordination: {
      configured: config.coordinationMode === 'local' || Boolean(config.nearRpcUrl && config.nearContractId),
      healthy: true,
      label: config.coordinationMode === 'near' ? 'NEAR coordination layer' : 'Local coordination ledger',
      detail:
        config.coordinationMode === 'near'
          ? config.nearRpcUrl && config.nearContractId
            ? 'Federation rounds and proposals can be anchored to the NEAR contract.'
            : 'Federation rounds are running locally while remote coordination is being finalized.'
          : 'Rounds and proposals are tracked locally until a trust-minimized coordination layer is configured.',
    },
    wallet: {
      configured: Boolean(config.walletConnectProjectId),
      healthy: true,
      label: `${config.chainName} wallet access`,
      detail: config.walletConnectProjectId
        ? 'RainbowKit can expose WalletConnect-compatible wallets in addition to injected providers.'
        : 'Injected wallet connections are available and WalletConnect can be added when needed.',
    },
    impulse: {
      configured: Boolean(config.impulseProxyUrl || (config.impulseApiUrl && config.impulseDeploymentId)),
      healthy: true,
      label: 'Impulse AI cognitive interface',
      detail:
        config.impulseProxyUrl || (config.impulseApiUrl && config.impulseDeploymentId)
          ? 'Remote inference is available for session-level cognitive predictions, with heuristic fallback when providers fail.'
          : 'Hosted inference is optional. Local classification and the API fallback path remain available.',
    },
  };
}
