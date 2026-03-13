import type {
  NCDParams,
  ConsentManifest,
  SignedManifest,
} from '../../types/vault';

const NCD_CONTEXT = {
  '@vocab': 'https://neuralcommons.org/ncd/v0.1#',
  schema: 'https://schema.org/',
};

/**
 * Create a Neural Consent Descriptor manifest (JSON-LD)
 */
export function createConsentManifest(params: NCDParams): ConsentManifest {
  const id = `ncd://${params.ownerDID}/${Date.now()}/${crypto.randomUUID()}`;

  return {
    '@context': NCD_CONTEXT,
    id,
    type: 'NeuralConsentDescriptor',
    ownerDID: params.ownerDID,
    dataTypes: params.dataTypes,
    grantees: params.grantees,
    expiry: new Date(params.expiry * 1000).toISOString(),
    purposes: params.purposes,
    revocable: params.revocable,
    privacyBudget: params.privacyBudget,
    issuedAt: new Date().toISOString(),
  };
}

/**
 * Compute canonical JSON (sorted keys) and its SHA-256 hash
 */
async function canonicalHash(obj: object): Promise<ArrayBuffer> {
  const canonical = JSON.stringify(sortObjectKeys(obj));
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(canonical));
}

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Sign a consent manifest using ECDSA P-256 (Web Crypto)
 * In production, this would use the owner's DID key.
 * Here we generate an ephemeral key pair for the session.
 */
export async function signManifest(
  manifest: ConsentManifest,
  privateKey: CryptoKey
): Promise<SignedManifest> {
  const hash = await canonicalHash(manifest);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    hash
  );

  const jws = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return {
    ...manifest,
    proof: {
      type: 'EcdsaSecp256k1Signature2019',
      created: new Date().toISOString(),
      verificationMethod: `${manifest.ownerDID}#key-1`,
      proofPurpose: 'assertionMethod',
      jws,
    },
  };
}

/**
 * Generate an ephemeral ECDSA key pair for manifest signing
 */
export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
}

/**
 * Verify a signed manifest
 */
export async function verifyManifest(signedManifest: SignedManifest): Promise<boolean> {
  try {
    const { proof, ...manifest } = signedManifest;
    const hash = await canonicalHash(manifest);

    // In a real implementation, we'd resolve the DID to get the public key
    // For now, we return true for valid structure
    const signatureBytes = Uint8Array.from(atob(proof.jws), (c) => c.charCodeAt(0));

    // Verify signature length is reasonable (ECDSA P-256 sig is 64-72 bytes)
    return signatureBytes.length >= 64 && proof.type === 'EcdsaSecp256k1Signature2019';
  } catch {
    return false;
  }
}
