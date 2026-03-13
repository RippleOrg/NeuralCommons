import type { EncryptedBlob } from '../../types/vault';
import type { HeliaNode } from './heliaClient';
import { pinEncryptedBlob, fetchBlob } from './heliaClient';

export interface VaultStoreEntry {
  cid: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}

const localStore = new Map<string, VaultStoreEntry>();

/**
 * Store an encrypted vault entry in IPFS
 */
export async function storeVaultEntry(
  node: HeliaNode,
  blob: EncryptedBlob,
  metadata: Record<string, unknown>
): Promise<VaultStoreEntry> {
  const cid = await pinEncryptedBlob(node, blob, metadata);
  const entry: VaultStoreEntry = {
    cid,
    metadata,
    timestamp: Date.now(),
  };
  localStore.set(cid, entry);
  return entry;
}

/**
 * Retrieve a vault entry from IPFS
 */
export async function retrieveVaultEntry(
  node: HeliaNode,
  cid: string
): Promise<{ blob: EncryptedBlob; metadata: Record<string, unknown> }> {
  const blob = await fetchBlob(node, cid);
  const cached = localStore.get(cid);
  return {
    blob,
    metadata: cached?.metadata ?? {},
  };
}

/**
 * List all locally known CIDs
 */
export function listLocalCIDs(): VaultStoreEntry[] {
  return Array.from(localStore.values()).sort((a, b) => b.timestamp - a.timestamp);
}
