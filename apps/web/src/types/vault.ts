export type NeuralDataType =
  | 'raw_eeg'
  | 'band_powers'
  | 'flow_state'
  | 'feature_vector'
  | 'model_gradients';

export interface GranteeSpec {
  address: string;
  name?: string;
  organization?: string;
}

export interface NCDParams {
  ownerDID: string;
  dataTypes: NeuralDataType[];
  grantees: GranteeSpec[];
  expiry: number;
  purposes: string[];
  revocable: boolean;
  privacyBudget: {
    epsilon: number;
    delta: number;
  };
}

export interface ConsentManifest {
  '@context': {
    '@vocab': string;
    schema: string;
  };
  id: string;
  type: string;
  ownerDID: string;
  dataTypes: NeuralDataType[];
  grantees: GranteeSpec[];
  expiry: string;
  purposes: string[];
  revocable: boolean;
  privacyBudget: {
    epsilon: number;
    delta: number;
  };
  issuedAt: string;
}

export interface SignedManifest extends ConsentManifest {
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}

export interface EncryptedBlob {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  tag?: ArrayBuffer;
}

export interface VaultMetadata {
  ownerDID: string;
  createdAt: number;
  sessionCount: number;
  totalDuration: number;
}

export interface VaultEntry {
  id: string;
  sessionId: string;
  ipfsCID: string;
  encryptedMetaCID?: string;
  timestamp: number;
  duration: number;
  flowState: string;
  sampleCount: number;
  grantCount: number;
}

export interface Grant {
  id: string;
  grantId: string;
  vaultEntryId: string;
  grantee: GranteeSpec;
  dataTypes: NeuralDataType[];
  purposes: string[];
  expiry: number;
  revoked: boolean;
  scopedKeyHash: string;
  ipfsCID: string;
  createdAt: number;
}

export interface RevocationRecord {
  grantId: string;
  owner: string;
  revokedAt: number;
  reason: string;
  keyDestructionProof: string;
}
