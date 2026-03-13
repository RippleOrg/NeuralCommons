import type { EncryptedBlob } from '../../types/vault';

/**
 * Encrypt neural data (Float32Array) using AES-GCM
 */
export async function encryptNeuralData(
  data: Float32Array,
  key: CryptoKey
): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const plaintext = data.buffer as ArrayBuffer;

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plaintext
  );

  return {
    ciphertext,
    iv,
  };
}

/**
 * Decrypt neural data back to Float32Array
 */
export async function decryptNeuralData(
  blob: EncryptedBlob,
  key: CryptoKey
): Promise<Float32Array> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: blob.iv as Uint8Array<ArrayBuffer>, tagLength: 128 },
    key,
    blob.ciphertext
  );

  return new Float32Array(plaintext);
}

/**
 * Encrypt a feature vector (Record<string, number>)
 */
export async function encryptFeatureVector(
  features: Record<string, number>,
  key: CryptoKey
): Promise<EncryptedBlob> {
  const encoder = new TextEncoder();
  const json = JSON.stringify(features);
  const plaintext = encoder.encode(json);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plaintext
  );

  return { ciphertext, iv };
}

/**
 * Decrypt a feature vector
 */
export async function decryptFeatureVector(
  blob: EncryptedBlob,
  key: CryptoKey
): Promise<Record<string, number>> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: blob.iv as Uint8Array<ArrayBuffer>, tagLength: 128 },
    key,
    blob.ciphertext
  );

  const decoder = new TextDecoder();
  const json = decoder.decode(plaintext);
  return JSON.parse(json) as Record<string, number>;
}

/**
 * Serialize an EncryptedBlob to a JSON-compatible object
 */
export function serializeBlob(blob: EncryptedBlob): {
  ciphertext: string;
  iv: string;
} {
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(blob.ciphertext))),
    iv: btoa(String.fromCharCode(...blob.iv)),
  };
}

/**
 * Deserialize an EncryptedBlob from a JSON-compatible object
 */
export function deserializeBlob(data: { ciphertext: string; iv: string }): EncryptedBlob {
  const ciphertext = Uint8Array.from(atob(data.ciphertext), (c) => c.charCodeAt(0)).buffer;
  const iv = Uint8Array.from(atob(data.iv), (c) => c.charCodeAt(0));
  return { ciphertext, iv };
}
