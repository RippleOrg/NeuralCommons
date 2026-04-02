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
const DEFAULT_DEPLOYMENT = {
  ConsentVault: '0xc634a5CCf4A008B6085a1735024aA443207723A8',
  RevocationRegistry: '0x6a2a12F68bb9A121E68765e4631151Cb463c2222',
  DataDAO: '0x5f5D961153800c2A4F00876F9D3D79A0723507a3',
  BountyPool: '0xAb85d120b59a394770088Eb7c0f8D17F61438451',
} as const;

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
  ConsentVault: (import.meta.env.VITE_CONSENT_VAULT_ADDRESS ?? DEFAULT_DEPLOYMENT.ConsentVault) as `0x${string}`,
  RevocationRegistry: (import.meta.env.VITE_REVOCATION_REGISTRY_ADDRESS ?? DEFAULT_DEPLOYMENT.RevocationRegistry) as `0x${string}`,
  DataDAO: (import.meta.env.VITE_DATA_DAO_ADDRESS ?? DEFAULT_DEPLOYMENT.DataDAO) as `0x${string}`,
  BountyPool: (import.meta.env.VITE_BOUNTY_POOL_ADDRESS ?? DEFAULT_DEPLOYMENT.BountyPool) as `0x${string}`,
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
