export type FrequencyBand = 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';

export type BandPowers = Record<FrequencyBand, number>;

export type FlowStateMode = 'flow' | 'focus' | 'relaxed' | 'stressed' | 'neutral';

export interface FlowStateResult {
  state: FlowStateMode;
  confidence: number;
  scores: Record<FlowStateMode, number>;
}

export interface EEGSample {
  timestamp: number;
  channels: Float32Array[];
  quality: number[];
}

export interface FeatureVector {
  bandPowers: BandPowers;
  ratios: Record<string, number>;
  variance: number;
  zeroCrossings: number;
  timestamp: number;
}

export interface NeuralSession {
  id: string;
  startTime: number;
  endTime: number | null;
  sampleCount: number;
  features: FeatureVector[];
  dominantState: FlowStateMode;
  ipfsCID?: string;
  encrypted: boolean;
}

export interface FFTResult {
  frequencies: Float32Array;
  magnitudes: Float32Array;
  powerSpectrum: Float32Array;
  sampleRate: number;
}
