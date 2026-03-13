import type { EEGSample } from '../../types/eeg';

/**
 * Detects muscle artifact using high-frequency power ratio
 */
export function detectMuscleArtifact(signal: Float32Array): boolean {
  // High-frequency content (>40Hz) relative to total power
  let totalPower = 0;
  let highFreqVariance = 0;
  const diff = new Float32Array(signal.length - 1);

  for (let i = 0; i < signal.length - 1; i++) {
    diff[i] = signal[i + 1] - signal[i];
    totalPower += signal[i] * signal[i];
  }

  for (let i = 0; i < diff.length; i++) {
    highFreqVariance += diff[i] * diff[i];
  }

  const ratio = totalPower > 0 ? highFreqVariance / totalPower : 0;
  return ratio > 0.5; // Threshold for muscle artifact
}

/**
 * Detects eye blink artifact using frontal amplitude threshold
 */
export function detectBlinkArtifact(signal: Float32Array): boolean {
  let maxAmplitude = 0;
  for (let i = 0; i < signal.length; i++) {
    if (Math.abs(signal[i]) > maxAmplitude) {
      maxAmplitude = Math.abs(signal[i]);
    }
  }
  // Blinks typically produce >100µV deflections in frontal channels
  return maxAmplitude > 100;
}

/**
 * Compute signal quality score (0-1)
 */
export function computeSignalQuality(signal: Float32Array): number {
  if (signal.length === 0) return 0;

  const hasMuscle = detectMuscleArtifact(signal);
  const hasBlink = detectBlinkArtifact(signal);

  // Check for flat-line (disconnected electrode)
  let variance = 0;
  let mean = 0;
  for (let i = 0; i < signal.length; i++) mean += signal[i];
  mean /= signal.length;
  for (let i = 0; i < signal.length; i++) variance += (signal[i] - mean) ** 2;
  variance /= signal.length;

  const isFlatline = variance < 0.01;
  const isSaturated = Math.abs(mean) > 500;

  if (isFlatline || isSaturated) return 0;
  if (hasBlink) return 0.3;
  if (hasMuscle) return 0.6;
  return 1.0;
}

/**
 * Remove artifacts from a batch of samples using quality thresholding
 */
export function filterArtifactSamples(
  samples: EEGSample[],
  qualityThreshold = 0.5
): EEGSample[] {
  return samples.filter((s) => s.quality.every((q) => q >= qualityThreshold));
}
