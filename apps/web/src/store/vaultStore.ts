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
  addGrant: (grant: Grant) => void;
  revokeGrant: (grantId: string, record: RevocationRecord) => void;
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
    set((state) => ({ entries: [entry, ...state.entries] })),

  updateEntry: (id, updates) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  addGrant: (grant) =>
    set((state) => ({ grants: [...state.grants, grant] })),

  revokeGrant: (grantId, record) =>
    set((state) => ({
      grants: state.grants.map((g) =>
        g.grantId === grantId ? { ...g, revoked: true } : g
      ),
      revocations: [...state.revocations, record],
    })),

  setIPFSNode: (node) => set({ ipfsNode: node }),

  setPinning: (pinning) => set({ pinning }),

  setPeerCount: (peerCount) => set({ peerCount }),
}));
