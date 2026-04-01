import {
  decodeEventLog,
  getAddress,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from 'viem';
import {
  getAccount,
  readContract,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
} from '@wagmi/core';
import { listLocalBundles } from '../storage/localArchive';
import { getRuntimeConfig } from '../runtime';
import { wagmiConfig } from '../wallet/config';
import {
  BOUNTY_POOL_ABI,
  CONSENT_VAULT_ABI,
  DATA_DAO_ABI,
  REVOCATION_REGISTRY_ABI,
} from './abis';
import { CONTRACT_ADDRESSES, createDefaultPublicClient } from './client';
import type { FlowStateMode } from '../../types/eeg';
import type { Proposal, ProposalType } from '../../types/governance';
import type { Grant, NeuralDataType, RevocationRecord, VaultEntry } from '../../types/vault';

const VOTING_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

const DATA_TYPE_TO_CODE: Record<NeuralDataType, number> = {
  raw_eeg: 0,
  band_powers: 1,
  flow_state: 2,
  feature_vector: 3,
  model_gradients: 4,
};

const CODE_TO_DATA_TYPE = Object.fromEntries(
  Object.entries(DATA_TYPE_TO_CODE).map(([key, value]) => [value, key as NeuralDataType])
) as Record<number, NeuralDataType>;

const PROPOSAL_TYPE_TO_CODE: Record<ProposalType, number> = {
  MODEL_UPDATE: 0,
  PRIVACY_BUDGET_CHANGE: 1,
  GRANTEE_WHITELIST: 2,
  BOUNTY_ALLOCATION: 3,
};

const CODE_TO_PROPOSAL_TYPE = Object.fromEntries(
  Object.entries(PROPOSAL_TYPE_TO_CODE).map(([key, value]) => [value, key as ProposalType])
) as Record<number, ProposalType>;

const walletConfig = wagmiConfig as any;

const FLOW_STATES: FlowStateMode[] = ['flow', 'focus', 'relaxed', 'stressed', 'neutral'];
const FLOW_STATE_HASH_TO_NAME = Object.fromEntries(
  FLOW_STATES.map((state) => [keccak256(stringToHex(state)), state])
) as Record<string, FlowStateMode>;

function requireAddress(name: keyof typeof CONTRACT_ADDRESSES): Address {
  const value = CONTRACT_ADDRESSES[name];
  if (!value) {
    throw new Error(`${name} address is not configured.`);
  }

  return getAddress(value);
}

function toBytes32(value: string): Hex {
  if (value.startsWith('0x') && value.length === 66) {
    return value as Hex;
  }

  const normalizedHex = value.startsWith('0x') ? value : `0x${value}`;
  if (normalizedHex.length === 66) {
    return normalizedHex as Hex;
  }

  return keccak256(stringToHex(value));
}

function decodeFlowState(flowState: Hex): FlowStateMode {
  return FLOW_STATE_HASH_TO_NAME[flowState] ?? 'neutral';
}

async function ensureWalletOnTargetChain(): Promise<Address> {
  const account = getAccount(walletConfig);
  if (!account.address) {
    throw new Error('Connect a wallet before sending contract transactions.');
  }

  const targetChainId = getRuntimeConfig().chainId;
  if (account.chainId !== targetChainId) {
    await switchChain(walletConfig, { chainId: targetChainId });
  }

  return getAddress(account.address);
}

async function waitForWrite(hash: Hex) {
  return waitForTransactionReceipt(walletConfig, { hash });
}

function parseFirstEvent<TEventName extends string>(
  logs: Array<{ data: Hex; topics: readonly Hex[] }>,
  abi: readonly unknown[],
  eventName: TEventName
) {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi,
        data: log.data,
        topics: [...log.topics] as [Hex, ...Hex[]] | [],
      }) as { eventName: string; args: Record<string, unknown> };
      if (decoded.eventName === eventName) {
        return decoded;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  return null;
}

type ContractGrantTuple = {
  grantee: Address;
  dataTypes: readonly bigint[];
  purposes: readonly Hex[];
  expiry: bigint;
  revoked: boolean;
  ipfsCID: string;
  scopedKeyHash: Hex;
};

type ContractDatasetTuple = {
  ipfsCID: string;
  datasetHash: Hex;
  sampleCount: bigint;
  featureCount: bigint;
  flowState: Hex;
  timestamp: bigint;
};

function mapGrant(grantId: Hex, grant: ContractGrantTuple, vaultEntries: VaultEntry[]): Grant {
  const matchingEntry = vaultEntries.find((entry) => entry.ipfsCID === grant.ipfsCID);

  return {
    id: grantId,
    grantId,
    vaultEntryId: matchingEntry?.id ?? grant.ipfsCID,
    grantee: { address: grant.grantee },
    dataTypes: grant.dataTypes.map((value) => CODE_TO_DATA_TYPE[Number(value)] ?? 'feature_vector'),
    purposes: grant.purposes.map((value) => value),
    expiry: Number(grant.expiry),
    revoked: grant.revoked,
    scopedKeyHash: grant.scopedKeyHash,
    ipfsCID: grant.ipfsCID,
    createdAt: 0,
    permissionNetwork: 'local',
  };
}

export async function ensureVaultRegistration(storageReference: string): Promise<void> {
  const owner = await ensureWalletOnTargetChain();

  const summary = await fetchVaultSummary(owner);
  if (summary?.owner && summary.owner !== '0x0000000000000000000000000000000000000000') {
    return;
  }

  const hash = await writeContract(walletConfig, {
    address: requireAddress('ConsentVault'),
    abi: CONSENT_VAULT_ABI,
    functionName: 'createVault',
    args: [storageReference],
  });

  await waitForWrite(hash);
}

export async function anchorDatasetOnChain(input: {
  storageReference: string;
  datasetHash: string;
  sampleCount: number;
  featureCount: number;
  flowState: FlowStateMode;
}): Promise<void> {
  await ensureWalletOnTargetChain();

  const hash = await writeContract(walletConfig, {
    address: requireAddress('ConsentVault'),
    abi: CONSENT_VAULT_ABI,
    functionName: 'anchorDataset',
    args: [
      input.storageReference,
      toBytes32(input.datasetHash),
      BigInt(input.sampleCount),
      BigInt(input.featureCount),
      keccak256(stringToHex(input.flowState)),
    ],
  });

  await waitForWrite(hash);
}

export async function grantAccessOnChain(input: {
  grantee: Address;
  dataTypes: NeuralDataType[];
  purposes: string[];
  expiry: number;
  storageReference: string;
  scopedKeyHash: string;
}): Promise<Hex> {
  await ensureWalletOnTargetChain();

  const hash = await writeContract(walletConfig, {
    address: requireAddress('ConsentVault'),
    abi: CONSENT_VAULT_ABI,
    functionName: 'grantAccess',
    args: [
      getAddress(input.grantee),
      input.dataTypes.map((value) => DATA_TYPE_TO_CODE[value]),
      input.purposes.map((value) => keccak256(stringToHex(value))),
      BigInt(input.expiry),
      input.storageReference,
      toBytes32(input.scopedKeyHash),
    ],
  });

  const receipt = await waitForWrite(hash);
  const event = parseFirstEvent(receipt.logs, CONSENT_VAULT_ABI, 'GrantCreated');
  if (!event) {
    throw new Error('GrantCreated event was not found in the transaction receipt.');
  }

  return event.args.grantId as Hex;
}

export async function revokeAccessOnChain(grantId: string, reason: string, keyDestructionProof: string): Promise<void> {
  await ensureWalletOnTargetChain();

  const hash = await writeContract(walletConfig, {
    address: requireAddress('ConsentVault'),
    abi: CONSENT_VAULT_ABI,
    functionName: 'revokeAccess',
    args: [toBytes32(grantId), reason, toBytes32(keyDestructionProof)],
  });

  await waitForWrite(hash);
}

export async function fetchVaultSummary(ownerAddress: Address) {
  try {
    const publicClient = createDefaultPublicClient();
    const vault = await publicClient.readContract({
      address: requireAddress('ConsentVault'),
      abi: CONSENT_VAULT_ABI,
      functionName: 'getVault',
      args: [ownerAddress],
    });

    return {
      owner: vault[0] as Address,
      encryptedMetadataCID: vault[1] as string,
      createdAt: Number(vault[2]),
      datasetCount: Number(vault[3]),
      grantCount: Number(vault[4]),
    };
  } catch {
    return null;
  }
}

export async function fetchVaultEntries(ownerAddress: Address): Promise<VaultEntry[]> {
  try {
    const publicClient = createDefaultPublicClient();
    const summary = await fetchVaultSummary(ownerAddress);
    if (!summary || summary.owner === '0x0000000000000000000000000000000000000000') {
      return [];
    }

    const localBundles = listLocalBundles();
    const grants = await fetchOwnerGrants(ownerAddress, []);
    const grantCountByReference = grants.reduce<Record<string, number>>((accumulator, grant) => {
      accumulator[grant.ipfsCID] = (accumulator[grant.ipfsCID] ?? 0) + (grant.revoked ? 0 : 1);
      return accumulator;
    }, {});

    const datasets = await Promise.all(
      Array.from({ length: summary.datasetCount }, (_, index) =>
        publicClient.readContract({
          address: requireAddress('ConsentVault'),
          abi: CONSENT_VAULT_ABI,
          functionName: 'getDatasetAt',
          args: [ownerAddress, BigInt(index)],
        })
      )
    );

    return datasets
      .map((dataset, index) => {
        const tuple = dataset as ContractDatasetTuple;
        const datasetHash = tuple.datasetHash.slice(2);
        const localBundle = localBundles.find((bundle) => bundle.datasetHash === datasetHash);
        const storageReference = tuple.ipfsCID;
        const storageUri = storageReference.startsWith('local://')
          ? storageReference
          : `${getRuntimeConfig().ipfsGateway}${storageReference}`;

        return {
          id: localBundle?.sessionId ?? `${ownerAddress}-${index}`,
          sessionId: localBundle?.sessionId ?? `${ownerAddress}-${index}`,
          ipfsCID: storageReference,
          storageUri,
          storageProvider: storageReference.startsWith('local://') ? 'local' : 'storacha',
          timestamp: Number(tuple.timestamp) * 1000,
          duration: 0,
          flowState: decodeFlowState(tuple.flowState),
          sampleCount: Number(tuple.sampleCount),
          featureCount: Number(tuple.featureCount),
          datasetHash,
          grantCount: grantCountByReference[storageReference] ?? 0,
          manifestId: localBundle?.manifest.id ?? storageReference,
          provenanceCID: localBundle?.provenance?.cid,
          litEnvelope: localBundle?.litEnvelope,
        } satisfies VaultEntry;
      })
      .sort((left, right) => right.timestamp - left.timestamp);
  } catch {
    return [];
  }
}

export async function fetchOwnerGrants(ownerAddress: Address, vaultEntries?: VaultEntry[]): Promise<Grant[]> {
  try {
    const publicClient = createDefaultPublicClient();
    const grantIds = (await publicClient.readContract({
      address: requireAddress('ConsentVault'),
      abi: CONSENT_VAULT_ABI,
      functionName: 'getMyGrants',
      account: ownerAddress,
    })) as readonly Hex[];

    const entries = vaultEntries ?? (await fetchVaultEntries(ownerAddress));
    const grants = await Promise.all(
      grantIds.map(async (grantId) => {
        const grant = (await publicClient.readContract({
          address: requireAddress('ConsentVault'),
          abi: CONSENT_VAULT_ABI,
          functionName: 'getGrant',
          args: [grantId],
        })) as ContractGrantTuple;

        return mapGrant(grantId, grant, entries);
      })
    );

    return grants;
  } catch {
    return [];
  }
}

export async function fetchRevocationHistory(): Promise<RevocationRecord[]> {
  try {
    const publicClient = createDefaultPublicClient();
    const count = (await publicClient.readContract({
      address: requireAddress('RevocationRegistry'),
      abi: REVOCATION_REGISTRY_ABI,
      functionName: 'getRevocationCount',
    })) as bigint;

    const records = await Promise.all(
      Array.from({ length: Number(count) }, (_, index) =>
        publicClient.readContract({
          address: requireAddress('RevocationRegistry'),
          abi: REVOCATION_REGISTRY_ABI,
          functionName: 'getRevocationAt',
          args: [BigInt(index)],
        })
      )
    );

    return records
      .map((record) => ({
        owner: record.owner,
        grantId: record.grantId,
        revokedAt: Number(record.revokedAt) * 1000,
        reason: record.reason,
        keyDestructionProof: record.keyDestructionProof,
      }))
      .sort((left, right) => right.revokedAt - left.revokedAt);
  } catch {
    return [];
  }
}

export async function fetchGovernanceState(voterAddress?: Address) {
  try {
    const publicClient = createDefaultPublicClient();
    const proposalCount = (await publicClient.readContract({
      address: requireAddress('DataDAO'),
      abi: DATA_DAO_ABI,
      functionName: 'getProposalCount',
    })) as bigint;

    const proposals = await Promise.all(
      Array.from({ length: Number(proposalCount) }, (_, index) =>
        publicClient.readContract({
          address: requireAddress('DataDAO'),
          abi: DATA_DAO_ABI,
          functionName: 'getProposal',
          args: [BigInt(index + 1)],
        })
      )
    );

    const voted = new Set<string>();
    if (voterAddress) {
      await Promise.all(
        Array.from({ length: Number(proposalCount) }, async (_, index) => {
          const proposalId = BigInt(index + 1);
          const hasVoted = (await publicClient.readContract({
            address: requireAddress('DataDAO'),
            abi: DATA_DAO_ABI,
            functionName: 'hasVoted',
            args: [proposalId, voterAddress],
          })) as boolean;

          if (hasVoted) {
            voted.add(proposalId.toString());
          }
        })
      );
    }

    const memberScore = voterAddress
      ? Number(
          (await publicClient.readContract({
            address: requireAddress('DataDAO'),
            abi: DATA_DAO_ABI,
            functionName: 'contributionScore',
            args: [voterAddress],
          })) as bigint
        )
      : 0;

    const isMember = voterAddress
      ? ((await publicClient.readContract({
          address: requireAddress('DataDAO'),
          abi: DATA_DAO_ABI,
          functionName: 'members',
          args: [voterAddress],
        })) as boolean)
      : false;

    const mappedProposals: Proposal[] = proposals
      .map((proposal) => ({
        id: proposal.id.toString(),
        proposer: proposal.proposer,
        description: proposal.description,
        ipfsCID: proposal.ipfsCID,
        forVotes: Number(proposal.forVotes),
        againstVotes: Number(proposal.againstVotes),
        deadline: Number(proposal.deadline) * 1000,
        executed: proposal.executed,
        proposalType: CODE_TO_PROPOSAL_TYPE[Number(proposal.proposalType)] ?? 'MODEL_UPDATE',
        createdAt: Number(proposal.deadline) * 1000 - VOTING_PERIOD_MS,
      }))
      .sort((left, right) => right.createdAt - left.createdAt);

    return {
      proposals: mappedProposals,
      voted,
      memberScore,
      isMember,
    };
  } catch {
    return {
      proposals: [],
      voted: new Set<string>(),
      memberScore: 0,
      isMember: false,
    };
  }
}

export async function createProposalOnChain(description: string, ipfsCID: string, proposalType: ProposalType): Promise<void> {
  await ensureWalletOnTargetChain();

  const hash = await writeContract(walletConfig, {
    address: requireAddress('DataDAO'),
    abi: DATA_DAO_ABI,
    functionName: 'propose',
    args: [description, ipfsCID, PROPOSAL_TYPE_TO_CODE[proposalType]],
  });

  await waitForWrite(hash);
}

export async function voteOnProposalOnChain(proposalId: string, support: boolean): Promise<void> {
  await ensureWalletOnTargetChain();

  const hash = await writeContract(walletConfig, {
    address: requireAddress('DataDAO'),
    abi: DATA_DAO_ABI,
    functionName: 'vote',
    args: [BigInt(proposalId), support],
  });

  await waitForWrite(hash);
}

export async function fetchBountyCount(): Promise<number> {
  try {
    const publicClient = createDefaultPublicClient();
    const count = (await publicClient.readContract({
      address: requireAddress('BountyPool'),
      abi: BOUNTY_POOL_ABI,
      functionName: 'getBountyCount',
    })) as bigint;

    return Number(count);
  } catch {
    return 0;
  }
}