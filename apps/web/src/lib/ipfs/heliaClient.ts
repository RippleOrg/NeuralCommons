import type { EncryptedBlob } from '../../types/vault';

export interface HeliaNode {
  gateway: string;
  getPeerCount: () => number;
  stop: () => Promise<void>;
}

export async function createHeliaNode(): Promise<HeliaNode> {
  const gateway = import.meta.env.VITE_IPFS_GATEWAY ?? 'https://w3s.link/ipfs/';
  return {
    gateway,
    getPeerCount: () => 0,
    stop: async () => undefined,
  };
}

export async function pinEncryptedBlob(
  _node: HeliaNode,
  blob: EncryptedBlob,
  metadata: Record<string, unknown>
): Promise<string> {
  const payload = {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(blob.ciphertext))),
    iv: btoa(String.fromCharCode(...blob.iv)),
    metadata,
    timestamp: Date.now(),
  };

  const formData = new FormData();
  formData.append('file', new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'neural-bundle.json');

  const response = await fetch('http://127.0.0.1:5001/api/v0/add', {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`IPFS add failed: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as { Hash?: string };
  if (!result.Hash) {
    throw new Error('IPFS add did not return a CID');
  }

  return result.Hash;
}

export async function fetchBlob(node: HeliaNode, cid: string): Promise<EncryptedBlob> {
  const response = await fetch(`${node.gateway}${cid}`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CID ${cid}: ${response.statusText}`);
  }

  const payload = (await response.json()) as { ciphertext: string; iv: string };
  return {
    ciphertext: Uint8Array.from(atob(payload.ciphertext), (char) => char.charCodeAt(0)).buffer,
    iv: Uint8Array.from(atob(payload.iv), (char) => char.charCodeAt(0)),
  };
}

export async function buildProvenanceDAG(
  _node: HeliaNode,
  session: {
    sessionId: string;
    features: unknown;
    consentManifest: unknown;
    modelVersion: string;
  }
): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(session));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 46);
}
