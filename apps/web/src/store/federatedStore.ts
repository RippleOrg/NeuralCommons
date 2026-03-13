import { create } from 'zustand';
import type { PrivacyAccountant } from '../types/federated';

interface FederatedStore {
  model: unknown | null;
  localAccuracy: number;
  globalAccuracy: number;
  rounds: number;
  contributions: Map<string, number>;
  privacyBudget: PrivacyAccountant;
  peers: string[];
  training: boolean;
  localLoss: number;

  setModel: (model: unknown) => void;
  updateAccuracy: (local: number, global?: number) => void;
  setLocalLoss: (loss: number) => void;
  incrementRound: () => void;
  addContribution: (peerId: string, score: number) => void;
  updatePrivacyBudget: (budget: PrivacyAccountant) => void;
  setPeers: (peers: string[]) => void;
  setTraining: (training: boolean) => void;
}

const DEFAULT_PRIVACY_BUDGET: PrivacyAccountant = {
  totalEpsilon: 0,
  totalDelta: 0,
  rounds: 0,
  epsilonPerRound: 0.1,
  remainingBudget: 1.0,
  maxEpsilon: 1.0,
};

export const useFederatedStore = create<FederatedStore>((set) => ({
  model: null,
  localAccuracy: 0,
  globalAccuracy: 0,
  rounds: 0,
  contributions: new Map(),
  privacyBudget: DEFAULT_PRIVACY_BUDGET,
  peers: [],
  training: false,
  localLoss: 0,

  setModel: (model) => set({ model }),

  updateAccuracy: (local, global) =>
    set((state) => ({
      localAccuracy: local,
      globalAccuracy: global ?? state.globalAccuracy,
    })),

  setLocalLoss: (localLoss) => set({ localLoss }),

  incrementRound: () =>
    set((state) => ({ rounds: state.rounds + 1 })),

  addContribution: (peerId, score) =>
    set((state) => {
      const newContributions = new Map(state.contributions);
      const existing = newContributions.get(peerId) ?? 0;
      newContributions.set(peerId, existing + score);
      return { contributions: newContributions };
    }),

  updatePrivacyBudget: (privacyBudget) => set({ privacyBudget }),

  setPeers: (peers) => set({ peers }),

  setTraining: (training) => set({ training }),
}));
