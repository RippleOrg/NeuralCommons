import type { BandPowers, FrequencyBand } from '../../types/eeg';
import { computeFFT, computeBandPower } from './fft';

export function computeBandpowerFromSignal(
  signal: Float32Array,
  sampleRate: number,
  band: FrequencyBand
): number {
  const fftResult = computeFFT(signal, sampleRate);
  return computeBandPower(fftResult, band);
}

export function computeAllBandpowersFromSignal(
  signal: Float32Array,
  sampleRate: number
): BandPowers {
  const fftResult = computeFFT(signal, sampleRate);
  return {
    delta: computeBandPower(fftResult, 'delta'),
    theta: computeBandPower(fftResult, 'theta'),
    alpha: computeBandPower(fftResult, 'alpha'),
    beta: computeBandPower(fftResult, 'beta'),
    gamma: computeBandPower(fftResult, 'gamma'),
  };
}

export function computeRelativeBandpower(bandPowers: BandPowers): BandPowers {
  const total = Object.values(bandPowers).reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    return { delta: 0.2, theta: 0.2, alpha: 0.2, beta: 0.2, gamma: 0.2 };
  }
  return {
    delta: bandPowers.delta / total,
    theta: bandPowers.theta / total,
    alpha: bandPowers.alpha / total,
    beta: bandPowers.beta / total,
    gamma: bandPowers.gamma / total,
  };
}
