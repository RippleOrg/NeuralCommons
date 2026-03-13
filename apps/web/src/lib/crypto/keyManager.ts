const keyStore = new Map<string, CryptoKey>();
let keyCounter = 0;

/**
 * Generate a new AES-GCM 256-bit vault key
 */
export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey to a Base64-encoded JWK string
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return btoa(JSON.stringify(jwk));
}

/**
 * Import a CryptoKey from a Base64-encoded JWK string
 */
export async function importKey(jwkBase64: string): Promise<CryptoKey> {
  const jwk = JSON.parse(atob(jwkBase64)) as JsonWebKey;
  return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Store a key in the in-memory map, returning a key ID
 */
export function storeKey(key: CryptoKey): string {
  const keyId = `key-${++keyCounter}-${Date.now()}`;
  keyStore.set(keyId, key);
  return keyId;
}

/**
 * Retrieve a key from the in-memory store
 */
export function getKey(keyId: string): CryptoKey | undefined {
  return keyStore.get(keyId);
}

/**
 * Destroy a key by removing it from the in-memory store
 * Keys are NEVER persisted to localStorage
 */
export function destroyKey(keyId: string): void {
  keyStore.delete(keyId);
}

/**
 * Derive a scoped access key using HKDF
 * Creates a deterministic key for a specific grantee + scope combination
 */
export async function deriveAccessKey(
  masterKey: CryptoKey,
  grantee: string,
  scope: string[]
): Promise<CryptoKey> {
  // Export master key material
  const keyMaterial = await crypto.subtle.exportKey('raw', masterKey).catch(async () => {
    // If not extractable as raw, derive from it using PBKDF2 approach
    const exportedJwk = await crypto.subtle.exportKey('jwk', masterKey);
    const encoder = new TextEncoder();
    return encoder.encode(JSON.stringify(exportedJwk));
  });

  // Import as key material for HKDF
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial instanceof ArrayBuffer ? keyMaterial : (keyMaterial as Uint8Array).buffer as ArrayBuffer,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  // Build info parameter from grantee + scope
  const encoder = new TextEncoder();
  const info = encoder.encode(`${grantee}:${scope.sort().join(',')}`);

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('NeuralCommons-v1'),
      info,
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get the number of currently stored keys (for diagnostics)
 */
export function getKeyCount(): number {
  return keyStore.size;
}
