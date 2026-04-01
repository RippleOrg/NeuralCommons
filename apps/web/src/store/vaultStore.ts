import { create } from 'zustand';
import type { VaultEntry, Grant, RevocationRecord } from '../types/vault';
import type { HeliaNode } from '../lib/ipfs/heliaClient';

interface VaultStore {
  entries: VaultEntry[];
  grants: Grant[];
  revocations: RevocationRecord[];
  ipfsNode: HeliaNode | null;
  pinning: boolean;
  peerCount: number;

  addEntry: (entry: VaultEntry) => void;
  updateEntry: (id: string, updates: Partial<VaultEntry>) => void;
  setEntries: (entries: VaultEntry[]) => void;
  addGrant: (grant: Grant) => void;
  setGrants: (grants: Grant[]) => void;
  revokeGrant: (grantId: string, record: RevocationRecord) => void;
  setRevocations: (revocations: RevocationRecord[]) => void;
  setIPFSNode: (node: HeliaNode | null) => void;
  setPinning: (pinning: boolean) => void;
  setPeerCount: (count: number) => void;
}

export const useVaultStore = create<VaultStore>((set) => ({
  entries: [],
  grants: [],
  revocations: [],
  ipfsNode: null,
  pinning: false,
  peerCount: 0,

  addEntry: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries.filter((existing) => existing.id !== entry.id)],
    })),

  updateEntry: (id, updates) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  setEntries: (entries) =>
    set({
      entries: [...entries].sort((left, right) => right.timestamp - left.timestamp),
    }),

  addGrant: (grant) =>
    set((state) => ({
      grants: [...state.grants.filter((existing) => existing.grantId !== grant.grantId), grant],
    })),

  setGrants: (grants) =>
    set({
      grants: [...grants].sort((left, right) => right.expiry - left.expiry),
    }),

  revokeGrant: (grantId, record) =>
    set((state) => ({
      grants: state.grants.map((g) =>
        g.grantId === grantId ? { ...g, revoked: true } : g
      ),
      revocations: [
        ...state.revocations.filter((existing) => existing.grantId !== record.grantId),
        record,
      ],
    })),

  setRevocations: (revocations) =>
    set({
      revocations: [...revocations].sort((left, right) => right.revokedAt - left.revokedAt),
    }),

  setIPFSNode: (node) => set({ ipfsNode: node }),

  setPinning: (pinning) => set({ pinning }),

  setPeerCount: (peerCount) => set({ peerCount }),
}));
