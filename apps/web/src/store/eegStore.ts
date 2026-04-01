import { create } from 'zustand';
import type { BandPowers, FlowStateResult, NeuralSession, EEGSample } from '../types/eeg';

interface EEGStore {
  connected: boolean;
  connecting: boolean;
  device: string | null;
  bandPowers: BandPowers;
  flowState: FlowStateResult | null;
  sessions: NeuralSession[];
  currentSession: NeuralSession | null;
  rawSignal: EEGSample[];
  channels: string[];
  quality: number[];

  setConnected: (connected: boolean, device?: string) => void;
  setConnecting: (connecting: boolean) => void;
  setBandPowers: (bandPowers: BandPowers) => void;
  setFlowState: (flowState: FlowStateResult) => void;
  addSession: (session: NeuralSession) => void;
  startSession: () => void;
  endSession: () => NeuralSession | null;
  appendRawSignal: (sample: EEGSample) => void;
  recordFeature: (feature: NeuralSession['features'][number], flowState: FlowStateResult['state']) => void;
  setQuality: (quality: number[]) => void;
}

const DEFAULT_BAND_POWERS: BandPowers = {
  delta: 0,
  theta: 0,
  alpha: 0,
  beta: 0,
  gamma: 0,
};

export const useEEGStore = create<EEGStore>((set, get) => ({
  connected: false,
  connecting: false,
  device: null,
  bandPowers: DEFAULT_BAND_POWERS,
  flowState: null,
  sessions: [],
  currentSession: null,
  rawSignal: [],
  channels: ['TP9', 'AF7', 'AF8', 'TP10', 'AUX1', 'AUX2', 'AUX3', 'AUX4'],
  quality: Array(8).fill(0),

  setConnected: (connected, device) =>
    set({ connected, device: device ?? null, connecting: false }),

  setConnecting: (connecting) => set({ connecting }),

  setBandPowers: (bandPowers) => set({ bandPowers }),

  setFlowState: (flowState) => set({ flowState }),

  addSession: (session) =>
    set((state) => ({ sessions: [...state.sessions, session] })),

  startSession: () => {
    const session: NeuralSession = {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      endTime: null,
      sampleCount: 0,
      features: [],
      dominantState: 'neutral',
      encrypted: false,
    };
    set({ currentSession: session });
  },

  endSession: () => {
    const { currentSession } = get();
    if (!currentSession) return null;

    const endedSession: NeuralSession = {
      ...currentSession,
      endTime: Date.now(),
    };

    set((state) => ({
      sessions: [...state.sessions, endedSession],
      currentSession: null,
    }));

    return endedSession;
  },

  appendRawSignal: (sample) =>
    set((state) => {
      const currentSession = state.currentSession
        ? {
            ...state.currentSession,
            sampleCount: state.currentSession.sampleCount + sample.channels.reduce((count, channel) => count + channel.length, 0),
          }
        : null;

      return {
        rawSignal: [...state.rawSignal.slice(-750), sample], // keep last 3 seconds at 250Hz
        quality: sample.quality,
        currentSession,
      };
    }),

  recordFeature: (feature, flowState) =>
    set((state) => {
      if (!state.currentSession) return state;

      return {
        currentSession: {
          ...state.currentSession,
          features: [...state.currentSession.features, feature],
          dominantState: flowState,
        },
      };
    }),

  setQuality: (quality) => set({ quality }),
}));
