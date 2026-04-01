import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { getRuntimeConfig } from '../runtime';
import {
  CONSENT_VAULT_ABI,
  REVOCATION_REGISTRY_ABI,
  DATA_DAO_ABI,
  BOUNTY_POOL_ABI,
} from './abis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPublicClient = any;

const runtimeConfig = getRuntimeConfig();

export const CHAIN_CONFIG = {
  chainId: runtimeConfig.chainId,
  name: runtimeConfig.chainName,
  rpcUrl: runtimeConfig.rpcUrl,
  blockExplorer: runtimeConfig.blockExplorerUrl,
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
};

export const CONTRACT_ADDRESSES = {
  ConsentVault: import.meta.env.VITE_CONSENT_VAULT_ADDRESS as `0x${string}` | undefined,
  RevocationRegistry: import.meta.env.VITE_REVOCATION_REGISTRY_ADDRESS as `0x${string}` | undefined,
  DataDAO: import.meta.env.VITE_DATA_DAO_ADDRESS as `0x${string}` | undefined,
  BountyPool: import.meta.env.VITE_BOUNTY_POOL_ADDRESS as `0x${string}` | undefined,
};

export function createDefaultPublicClient(): AnyPublicClient {
  return createPublicClient({
    chain: sepolia,
    transport: http(CHAIN_CONFIG.rpcUrl),
  });
}

export function getConsentVaultContract(publicClient: AnyPublicClient) {
  const address = CONTRACT_ADDRESSES.ConsentVault;
  if (!address) throw new Error('VITE_CONSENT_VAULT_ADDRESS not set');

  return {
    address,
    abi: CONSENT_VAULT_ABI,
    publicClient,
    read: {
      isGrantValid: (ownerAddr: `0x${string}`, grantee: `0x${string}`, dataType: number) =>
        publicClient.readContract({
          address,
          abi: CONSENT_VAULT_ABI,
          functionName: 'isGrantValid',
          args: [ownerAddr, grantee, dataType],
        }),
      getGrant: (grantId: `0x${string}`) =>
        publicClient.readContract({
          address,
          abi: CONSENT_VAULT_ABI,
          functionName: 'getGrant',
          args: [grantId],
        }),
    },
  };
}

export function getRevocationRegistryContract(publicClient: AnyPublicClient) {
  const address = CONTRACT_ADDRESSES.RevocationRegistry;
  if (!address) throw new Error('VITE_REVOCATION_REGISTRY_ADDRESS not set');

  return {
    address,
    abi: REVOCATION_REGISTRY_ABI,
    publicClient,
    read: {
      isRevoked: (grantId: `0x${string}`) =>
        publicClient.readContract({
          address,
          abi: REVOCATION_REGISTRY_ABI,
          functionName: 'isRevoked',
          args: [grantId],
        }),
    },
  };
}

export function getDataDAOContract(publicClient: AnyPublicClient) {
  const address = CONTRACT_ADDRESSES.DataDAO;
  if (!address) throw new Error('VITE_DATA_DAO_ADDRESS not set');

  return {
    address,
    abi: DATA_DAO_ABI,
    publicClient,
    read: {
      getProposal: (proposalId: bigint) =>
        publicClient.readContract({
          address,
          abi: DATA_DAO_ABI,
          functionName: 'getProposal',
          args: [proposalId],
        }),
    },
  };
}

export function getBountyPoolContract(publicClient: AnyPublicClient) {
  const address = CONTRACT_ADDRESSES.BountyPool;
  if (!address) throw new Error('VITE_BOUNTY_POOL_ADDRESS not set');

  return {
    address,
    abi: BOUNTY_POOL_ABI,
    publicClient,
    read: {
      getBounty: (bountyId: bigint) =>
        publicClient.readContract({
          address,
          abi: BOUNTY_POOL_ABI,
          functionName: 'getBounty',
          args: [bountyId],
        }),
    },
  };
}
