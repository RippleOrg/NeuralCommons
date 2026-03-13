// FFT Web Worker
// Runs FFT computation off the main thread

import type { FFTResult } from '../types/eeg';

interface FFTWorkerMessage {
  type: 'compute';
  signal: Float32Array;
  sampleRate: number;
  id: string;
}

interface FFTWorkerResult {
  type: 'result';
  id: string;
  result: {
    frequencies: Float32Array;
    magnitudes: Float32Array;
    powerSpectrum: Float32Array;
    sampleRate: number;
  };
  error?: string;
}

// Inline FFT implementation (same as fft.ts but worker-compatible)
function fftInplace(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n <= 1) return;

  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

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

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function computeFFTWorker(signal: Float32Array, sampleRate: number): FFTResult {
  const n = nextPowerOf2(signal.length);
  const re = new Float32Array(n);
  const im = new Float32Array(n);

  for (let i = 0; i < signal.length; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (signal.length - 1)));
    re[i] = signal[i] * window;
  }

  fftInplace(re, im);

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

self.onmessage = (event: MessageEvent<FFTWorkerMessage>) => {
  const { type, signal, sampleRate, id } = event.data;

  if (type === 'compute') {
    try {
      const result = computeFFTWorker(signal, sampleRate);
      const response: FFTWorkerResult = { type: 'result', id, result };
      self.postMessage(response, {
        transfer: [
          result.frequencies.buffer,
          result.magnitudes.buffer,
          result.powerSpectrum.buffer,
        ],
      });
    } catch (error) {
      const response: FFTWorkerResult = {
        type: 'result',
        id,
        result: {
          frequencies: new Float32Array(0),
          magnitudes: new Float32Array(0),
          powerSpectrum: new Float32Array(0),
          sampleRate,
        },
        error: String(error),
      };
      self.postMessage(response);
    }
  }
};
