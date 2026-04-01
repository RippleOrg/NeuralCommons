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
      healthy: config.storageMode === 'local' || Boolean(config.storageApiUrl),
      label: config.storageMode === 'storacha' ? 'Storacha / Filecoin' : 'Local encrypted archive',
      detail:
        config.storageMode === 'storacha'
          ? config.storageApiUrl
            ? 'Encrypted datasets replicate to Storacha via the API service.'
            : 'Set VITE_STORAGE_API_URL to push encrypted datasets to Storacha.'
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
      healthy: config.coordinationMode === 'local' || Boolean(config.nearRpcUrl && config.nearContractId),
      label: config.coordinationMode === 'near' ? 'NEAR coordination layer' : 'Local coordination ledger',
      detail:
        config.coordinationMode === 'near'
          ? config.nearRpcUrl && config.nearContractId
            ? 'Federation rounds and proposals can be anchored to the NEAR contract.'
            : 'Set VITE_NEAR_RPC_URL and VITE_NEAR_COORDINATION_CONTRACT_ID to anchor rounds on NEAR.'
          : 'Rounds and proposals are tracked locally until a trust-minimized coordination layer is configured.',
    },
    wallet: {
      configured: Boolean(config.walletConnectProjectId),
      healthy: true,
      label: `${config.chainName} wallet access`,
      detail: config.walletConnectProjectId
        ? 'RainbowKit can expose WalletConnect-compatible wallets in addition to injected providers.'
        : 'Injected wallet connections are available; set VITE_WALLETCONNECT_PROJECT_ID to enable WalletConnect wallets in RainbowKit.',
    },
    impulse: {
      configured: Boolean(config.impulseProxyUrl || (config.impulseApiUrl && config.impulseDeploymentId)),
      healthy: Boolean(config.impulseProxyUrl || (config.impulseApiUrl && config.impulseDeploymentId)),
      label: 'Impulse AI cognitive interface',
      detail:
        config.impulseProxyUrl || (config.impulseApiUrl && config.impulseDeploymentId)
          ? 'Remote inference is available for session-level cognitive predictions.'
          : 'Set VITE_IMPULSE_PROXY_URL or direct API settings to enable Impulse inference.',
    },
  };
}
