export const CONSENT_VAULT_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ internalType: 'string', name: 'encryptedMetadataCID', type: 'string' }],
    name: 'createVault',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'grantee', type: 'address' },
      { internalType: 'uint8[]', name: 'dataTypes', type: 'uint8[]' },
      { internalType: 'bytes32[]', name: 'purposes', type: 'bytes32[]' },
      { internalType: 'uint256', name: 'expiry', type: 'uint256' },
      { internalType: 'string', name: 'ipfsCID', type: 'string' },
      { internalType: 'bytes32', name: 'scopedKeyHash', type: 'bytes32' },
    ],
    name: 'grantAccess',
    outputs: [{ internalType: 'bytes32', name: 'grantId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'grantId', type: 'bytes32' },
      { internalType: 'string', name: 'reason', type: 'string' },
      { internalType: 'bytes32', name: 'keyDestructionProof', type: 'bytes32' },
    ],
    name: 'revokeAccess',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'ownerAddr', type: 'address' },
      { internalType: 'address', name: 'grantee', type: 'address' },
      { internalType: 'uint8', name: 'dataType', type: 'uint8' },
    ],
    name: 'isGrantValid',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'grantId', type: 'bytes32' }],
    name: 'getGrant',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'grantee', type: 'address' },
          { internalType: 'uint8[]', name: 'dataTypes', type: 'uint8[]' },
          { internalType: 'bytes32[]', name: 'purposes', type: 'bytes32[]' },
          { internalType: 'uint256', name: 'expiry', type: 'uint256' },
          { internalType: 'bool', name: 'revoked', type: 'bool' },
          { internalType: 'string', name: 'ipfsCID', type: 'string' },
          { internalType: 'bytes32', name: 'scopedKeyHash', type: 'bytes32' },
        ],
        internalType: 'struct ConsentVault.DataGrant',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMyGrants',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'grantId', type: 'bytes32' }],
    name: 'recordAccess',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: false, internalType: 'string', name: 'encryptedMetadataCID', type: 'string' },
    ],
    name: 'VaultCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'grantId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'grantee', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'expiry', type: 'uint256' },
    ],
    name: 'GrantCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'grantId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'grantee', type: 'address' },
    ],
    name: 'GrantRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'grantId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'grantee', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'DataAccessed',
    type: 'event',
  },
] as const;

export const REVOCATION_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'bytes32', name: 'grantId', type: 'bytes32' },
    ],
    name: 'isRevoked',
    outputs: [
      { internalType: 'bool', name: '', type: 'bool' },
      {
        components: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'bytes32', name: 'grantId', type: 'bytes32' },
          { internalType: 'uint256', name: 'revokedAt', type: 'uint256' },
          { internalType: 'string', name: 'reason', type: 'string' },
          { internalType: 'bytes32', name: 'keyDestructionProof', type: 'bytes32' },
        ],
        internalType: 'struct RevocationRegistry.RevocationRecord',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'grantId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'revokedAt', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'reason', type: 'string' },
    ],
    name: 'RevocationPublished',
    type: 'event',
  },
] as const;

export const DATA_DAO_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'string', name: 'ipfsCID', type: 'string' },
      { internalType: 'uint8', name: 'proposalType', type: 'uint8' },
    ],
    name: 'propose',
    outputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      { internalType: 'bool', name: 'support', type: 'bool' },
    ],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'execute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'getProposal',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'address', name: 'proposer', type: 'address' },
          { internalType: 'string', name: 'description', type: 'string' },
          { internalType: 'string', name: 'ipfsCID', type: 'string' },
          { internalType: 'uint256', name: 'forVotes', type: 'uint256' },
          { internalType: 'uint256', name: 'againstVotes', type: 'uint256' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'bool', name: 'executed', type: 'bool' },
          { internalType: 'uint8', name: 'proposalType', type: 'uint8' },
        ],
        internalType: 'struct DataDAO.Proposal',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'proposer', type: 'address' },
      { indexed: false, internalType: 'string', name: 'description', type: 'string' },
      { indexed: false, internalType: 'uint8', name: 'proposalType', type: 'uint8' },
    ],
    name: 'ProposalCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'voter', type: 'address' },
      { indexed: false, internalType: 'bool', name: 'support', type: 'bool' },
    ],
    name: 'VoteCast',
    type: 'event',
  },
] as const;

export const BOUNTY_POOL_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'uint8', name: 'dataTypeRequired', type: 'uint8' },
    ],
    name: 'depositBounty',
    outputs: [{ internalType: 'uint256', name: 'bountyId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'bountyId', type: 'uint256' },
      { internalType: 'string', name: 'ipfsProofCID', type: 'string' },
    ],
    name: 'claimBounty',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'bountyId', type: 'uint256' },
      { internalType: 'address', name: 'contributor', type: 'address' },
    ],
    name: 'approveClaim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'bountyId', type: 'uint256' }],
    name: 'getBounty',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'address', name: 'depositor', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'string', name: 'description', type: 'string' },
          { internalType: 'uint8', name: 'dataType', type: 'uint8' },
          { internalType: 'bool', name: 'claimed', type: 'bool' },
          { internalType: 'address', name: 'contributor', type: 'address' },
          { internalType: 'string', name: 'ipfsProofCID', type: 'string' },
          { internalType: 'bool', name: 'approved', type: 'bool' },
        ],
        internalType: 'struct BountyPool.Bounty',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'bountyId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'depositor', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'description', type: 'string' },
    ],
    name: 'BountyDeposited',
    type: 'event',
  },
] as const;
