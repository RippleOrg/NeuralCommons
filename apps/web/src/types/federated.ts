export interface SerializedGradients {
  weights: Record<string, Float32Array>;
  datasetSize: number;
  round: number;
  contributorId: string;
}

export interface DPGradients extends SerializedGradients {
  epsilon: number;
  delta: number;
  noiseMultiplier: number;
  clippingNorm: number;
}

export interface ModelWeights {
  weights: Record<string, Float32Array>;
  version: number;
  round: number;
}

export interface TrainingResult {
  loss: number;
  accuracy: number;
  gradients: SerializedGradients;
  epochs: number;
  duration: number;
}

export interface PrivacyAccountant {
  totalEpsilon: number;
  totalDelta: number;
  rounds: number;
  epsilonPerRound: number;
  remainingBudget: number;
  maxEpsilon: number;
}

export type FederationMessageType =
  | 'GRADIENT_UPDATE'
  | 'MODEL_UPDATE'
  | 'PEER_HELLO'
  | 'CONTRIBUTION_SCORE';

export interface FederationMessage {
  type: FederationMessageType;
  from: string;
  timestamp: number;
  payload: DPGradients | ModelWeights | { peerId: string } | { score: number };
}
