import type {
  BandPowers,
  FlowStateMode,
  FlowStateResult,
  FeatureVector,
} from '../../types/eeg';
import { computeFFT, computeBandPower, normalizeSignal } from './fft';

/**
 * Classify cognitive flow state from band powers
 */
export function classifyFlowState(bands: BandPowers): FlowStateResult {
  const { delta, theta, alpha, beta, gamma } = bands;
  const total = delta + theta + alpha + beta + gamma || 1;

  // Relative powers
  const relAlpha = alpha / total;
  const relTheta = theta / total;
  const relBeta = beta / total;
  const relGamma = gamma / total;
  const relDelta = delta / total;

  // Flow: high alpha + theta, moderate beta
  const flowScore =
    relAlpha * 2.5 + relTheta * 2.0 - relBeta * 0.5 - relGamma * 0.8 - relDelta * 0.3;

  // Stress: high beta + gamma, low alpha
  const stressScore =
    relBeta * 2.5 + relGamma * 2.0 - relAlpha * 1.5 - relTheta * 0.5;

  // Relaxed: high alpha, low beta
  const relaxedScore =
    relAlpha * 3.0 - relBeta * 2.0 - relGamma * 1.5 - relDelta * 0.3;

  // Focus: high theta + moderate alpha, low delta
  const focusScore =
    relTheta * 2.5 + relAlpha * 1.5 - relDelta * 1.5 - relGamma * 0.5;

  // Neutral: baseline - not particularly any state
  const neutralScore = 0.3 - Math.abs(flowScore) * 0.2 - Math.abs(stressScore) * 0.2;

  const rawScores: Record<FlowStateMode, number> = {
    flow: flowScore,
    stressed: stressScore,
    relaxed: relaxedScore,
    focus: focusScore,
    neutral: neutralScore,
  };

  // Softmax normalization
  const maxScore = Math.max(...Object.values(rawScores));
  const expScores = Object.fromEntries(
    Object.entries(rawScores).map(([k, v]) => [k, Math.exp(v - maxScore)])
  ) as Record<FlowStateMode, number>;
  const expSum = Object.values(expScores).reduce((s, v) => s + v, 0);
  const scores = Object.fromEntries(
    Object.entries(expScores).map(([k, v]) => [k, v / expSum])
  ) as Record<FlowStateMode, number>;

  // Find winning state
  let state: FlowStateMode = 'neutral';
  let maxProb = 0;
  for (const [k, v] of Object.entries(scores) as [FlowStateMode, number][]) {
    if (v > maxProb) {
      maxProb = v;
      state = k;
    }
  }

  return { state, confidence: maxProb, scores };
}

/**
 * Extract 12-dimensional feature vector from EEG epochs
 */
export function extractFeatures(
  epochs: Float32Array[],
  sampleRate: number
): FeatureVector {
  if (epochs.length === 0) {
    return {
      bandPowers: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
      ratios: {},
      variance: 0,
      zeroCrossings: 0,
      timestamp: Date.now(),
    };
  }

  // Average across channels
  const avgEpoch = new Float32Array(epochs[0].length);
  for (const epoch of epochs) {
    for (let i = 0; i < epoch.length; i++) {
      avgEpoch[i] += epoch[i] / epochs.length;
    }
  }

  const normalized = normalizeSignal(avgEpoch);
  const fftResult = computeFFT(normalized, sampleRate);

  const bandPowers: BandPowers = {
    delta: computeBandPower(fftResult, 'delta'),
    theta: computeBandPower(fftResult, 'theta'),
    alpha: computeBandPower(fftResult, 'alpha'),
    beta: computeBandPower(fftResult, 'beta'),
    gamma: computeBandPower(fftResult, 'gamma'),
  };

  const { delta, theta, alpha, beta, gamma } = bandPowers;

  // 5 band power ratios
  const ratios: Record<string, number> = {
    theta_alpha: alpha > 0 ? theta / alpha : 0,
    beta_alpha: alpha > 0 ? beta / alpha : 0,
    theta_beta: beta > 0 ? theta / beta : 0,
    alpha_delta: delta > 0 ? alpha / delta : 0,
    gamma_theta: theta > 0 ? gamma / theta : 0,
  };

  // Variance
  let mean = 0;
  for (let i = 0; i < normalized.length; i++) mean += normalized[i];
  mean /= normalized.length;
  let variance = 0;
  for (let i = 0; i < normalized.length; i++) {
    variance += (normalized[i] - mean) ** 2;
  }
  variance /= normalized.length;

  // Zero-crossing rate
  let zeroCrossings = 0;
  for (let i = 1; i < normalized.length; i++) {
    if (normalized[i - 1] * normalized[i] < 0) zeroCrossings++;
  }
  const zeroCrossingRate = zeroCrossings / normalized.length;

  return {
    bandPowers,
    ratios,
    variance,
    zeroCrossings: zeroCrossingRate,
    timestamp: Date.now(),
  };
}
