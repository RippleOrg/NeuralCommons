import type { FFTResult, FrequencyBand, BandPowers } from '../../types/eeg';

// Lightweight FFT implementation (Cooley-Tukey)
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  // Cooley-Tukey FFT
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

export function computeFFT(signal: Float32Array, sampleRate: number): FFTResult {
  const n = nextPowerOf2(signal.length);
  const re = new Float32Array(n);
  const im = new Float32Array(n);

  // Apply Hann window to reduce spectral leakage
  for (let i = 0; i < signal.length; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (signal.length - 1)));
    re[i] = signal[i] * window;
  }

  fft(re, im);

  const halfN = n / 2 + 1;
  const frequencies = new Float32Array(halfN);
  const magnitudes = new Float32Array(halfN);
  const powerSpectrum = new Float32Array(halfN);

  for (let i = 0; i < halfN; i++) {
    frequencies[i] = (i * sampleRate) / n;
    magnitudes[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    powerSpectrum[i] = (magnitudes[i] * magnitudes[i]) / n;
  }

  return { frequencies, magnitudes, powerSpectrum, sampleRate };
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

const BAND_RANGES: Record<FrequencyBand, [number, number]> = {
  delta: [0.5, 4],
  theta: [4, 8],
  alpha: [8, 13],
  beta: [13, 30],
  gamma: [30, 100],
};

export function computeBandPower(fftResult: FFTResult, band: FrequencyBand): number {
  const [lowHz, highHz] = BAND_RANGES[band];
  let power = 0;
  let count = 0;

  for (let i = 0; i < fftResult.frequencies.length; i++) {
    const freq = fftResult.frequencies[i];
    if (freq >= lowHz && freq < highHz) {
      power += fftResult.powerSpectrum[i];
      count++;
    }
  }

  return count > 0 ? power / count : 0;
}

export function computeAllBandPowers(fftResult: FFTResult): BandPowers {
  return {
    delta: computeBandPower(fftResult, 'delta'),
    theta: computeBandPower(fftResult, 'theta'),
    alpha: computeBandPower(fftResult, 'alpha'),
    beta: computeBandPower(fftResult, 'beta'),
    gamma: computeBandPower(fftResult, 'gamma'),
  };
}

export function normalizeSignal(signal: Float32Array): Float32Array {
  const n = signal.length;
  if (n === 0) return signal;

  let mean = 0;
  for (let i = 0; i < n; i++) mean += signal[i];
  mean /= n;

  let variance = 0;
  for (let i = 0; i < n; i++) {
    const diff = signal[i] - mean;
    variance += diff * diff;
  }
  variance /= n;

  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return new Float32Array(n);

  const normalized = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    normalized[i] = (signal[i] - mean) / stdDev;
  }
  return normalized;
}

export function applyBandpassFilter(
  signal: Float32Array,
  lowHz: number,
  highHz: number,
  sampleRate: number
): Float32Array {
  // 2nd-order Butterworth bandpass filter
  const nyquist = sampleRate / 2;
  const lowNorm = lowHz / nyquist;
  const highNorm = highHz / nyquist;

  // Pre-warp frequencies
  const wl = Math.tan(Math.PI * lowNorm);
  const wh = Math.tan(Math.PI * highNorm);
  const bw = wh - wl;
  const wc = Math.sqrt(wl * wh);

  // Bilinear transform coefficients for 2nd-order Butterworth bandpass
  const q = wc / bw;
  const k = 1 / (1 + wc / q + wc * wc);

  const b0 = k * (wc / q);
  const b1 = 0;
  const b2 = -k * (wc / q);
  const a1 = k * 2 * (wc * wc - 1);
  const a2 = k * (1 - wc / q + wc * wc);

  const filtered = new Float32Array(signal.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < signal.length; i++) {
    const x0 = signal[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    filtered[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }

  return filtered;
}
