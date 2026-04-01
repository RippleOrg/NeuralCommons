import { serializeBlob } from './crypto/encrypt';
import { createConsentManifest } from './crypto/consentManifest';
import { deriveDidFromAddress, sealVaultKeyWithLit } from './security/lit';
import { getRuntimeConfig } from './runtime';
import type { NeuralSession } from '../types/eeg';
import type { NeuralDatasetBundle, NCDParams } from '../types/vault';
import type { EncryptedBlob } from '../types/vault';

function encodeFeatures(session: NeuralSession): string {
  return JSON.stringify({
    sessionId: session.id,
    dominantState: session.dominantState,
    sampleCount: session.sampleCount,
    features: session.features,
  });
}

export async function computeDatasetHash(payload: string): Promise<string> {
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildDatasetBundle(input: {
  session: NeuralSession;
  ownerAddress: string;
  encrypted: EncryptedBlob;
  manifestParams: NCDParams;
  litRecipients: string[];
}): Promise<NeuralDatasetBundle> {
  const payload = encodeFeatures(input.session);
  const datasetHash = await computeDatasetHash(payload);
  const manifest = createConsentManifest(input.manifestParams);
  const litEnvelope =
    input.litRecipients.length > 0
      ? await sealVaultKeyWithLit({
          ownerAddress: input.ownerAddress,
          recipientAddresses: input.litRecipients,
          exportedKeyMaterial: JSON.stringify({ datasetHash, manifestId: manifest.id }),
        })
      : undefined;

  return {
    sessionId: input.session.id,
    ownerAddress: input.ownerAddress,
    ownerDID: deriveDidFromAddress(input.ownerAddress),
    createdAt: Date.now(),
    dominantState: input.session.dominantState,
    sampleCount: input.session.sampleCount,
    featureCount: input.session.features.length,
    datasetHash,
    encryptedPayload: serializeBlob(input.encrypted),
    manifest,
    litEnvelope,
    provenance: {
      cid: `prov-${datasetHash.slice(0, 32)}`,
      modelVersion: getRuntimeConfig().impulseDeploymentId ?? 'local-flow-model-v1',
    },
  };
}

export function buildDefaultManifestParams(session: NeuralSession, ownerAddress: string): NCDParams {
  return {
    ownerDID: deriveDidFromAddress(ownerAddress),
    dataTypes: ['feature_vector', 'band_powers', 'flow_state'],
    grantees: [],
    expiry: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    purposes: ['self_custody'],
    revocable: true,
    privacyBudget: {
      epsilon: 0.1,
      delta: 1e-5,
    },
  };
}
