import type { FlowStateMode, EEGSample, BandPowers } from '../../types/eeg';

type EventListener = (data: EEGSample) => void;

const SAMPLE_RATE = 250; // Hz
const NUM_CHANNELS = 8;
const EMIT_INTERVAL_MS = 4; // ~250Hz

// Power spectrum profiles per mode (µV² per band)
const MODE_PROFILES: Record<FlowStateMode, BandPowers> = {
  flow: { delta: 2.5, theta: 8.0, alpha: 12.0, beta: 5.0, gamma: 1.5 },
  focus: { delta: 2.0, theta: 10.0, alpha: 7.0, beta: 6.0, gamma: 2.0 },
  relaxed: { delta: 3.0, theta: 5.0, alpha: 15.0, beta: 3.0, gamma: 0.8 },
  stressed: { delta: 2.0, theta: 3.0, alpha: 4.0, beta: 14.0, gamma: 5.0 },
  neutral: { delta: 4.0, theta: 5.0, alpha: 8.0, beta: 6.0, gamma: 2.0 },
};

/**
 * Simulated EEG device that generates realistic synthetic brain signals
 * with 1/f noise characteristics and configurable cognitive state profiles.
 */
export class SimulatedEEGDevice {
  private mode: FlowStateMode = 'neutral';
  private listeners: EventListener[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private time = 0;
  private pinkNoiseBuffers: Float32Array[];
  private blinkTimer = 0;
  private muscleTimer = 0;

  constructor() {
    this.pinkNoiseBuffers = Array.from(
      { length: NUM_CHANNELS },
      () => new Float32Array(16)
    );
  }

  setMode(mode: FlowStateMode): void {
    this.mode = mode;
  }

  on(event: 'data', listener: EventListener): void {
    if (event === 'data') {
      this.listeners.push(listener);
    }
  }

  off(event: 'data', listener: EventListener): void {
    if (event === 'data') {
      this.listeners = this.listeners.filter((l) => l !== listener);
    }
  }

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      this.tick();
    }, EMIT_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const profile = MODE_PROFILES[this.mode];
    this.time += EMIT_INTERVAL_MS / 1000;
    this.blinkTimer += EMIT_INTERVAL_MS;
    this.muscleTimer += EMIT_INTERVAL_MS;

    const isBlink = this.blinkTimer > 3000 + Math.random() * 5000; // blink every 3-8s
    const isMuscle = this.muscleTimer > 8000 + Math.random() * 10000;

    if (isBlink) this.blinkTimer = 0;
    if (isMuscle) this.muscleTimer = 0;

    const channels: Float32Array[] = [];
    const quality: number[] = [];

    for (let ch = 0; ch < NUM_CHANNELS; ch++) {
      const sample = this.generateSample(ch, profile, isBlink, isMuscle);
      channels.push(new Float32Array([sample]));
      quality.push(isBlink ? 0.3 : isMuscle ? 0.6 : 0.95);
    }

    const eegSample: EEGSample = {
      timestamp: Date.now(),
      channels,
      quality,
    };

    for (const listener of this.listeners) {
      listener(eegSample);
    }
  }

  private generateSample(
    channel: number,
    profile: BandPowers,
    isBlink: boolean,
    isMuscle: boolean
  ): number {
    const t = this.time;

    // Generate band-specific oscillations
    const delta =
      Math.sqrt(profile.delta) * Math.sin(2 * Math.PI * 2 * t + channel * 0.3);
    const theta =
      Math.sqrt(profile.theta) * Math.sin(2 * Math.PI * 6 * t + channel * 0.5);
    const alpha =
      Math.sqrt(profile.alpha) *
      Math.sin(2 * Math.PI * 10 * t + channel * 0.7) *
      (1 + 0.1 * Math.sin(2 * Math.PI * 0.1 * t)); // amplitude modulation
    const beta =
      Math.sqrt(profile.beta) * Math.sin(2 * Math.PI * 20 * t + channel * 0.9);
    const gamma =
      Math.sqrt(profile.gamma) * Math.sin(2 * Math.PI * 40 * t + channel * 1.1);

    // 1/f noise (pink noise approximation)
    const pinkNoise = this.getPinkNoise(channel) * 2.0;

    // Combine all components
    let signal = delta + theta + alpha + beta + gamma + pinkNoise;

    // Add blink artifact (mainly on frontal channels 0-1)
    if (isBlink && channel <= 1) {
      signal += 120 * Math.exp(-((this.blinkTimer % 200) / 50));
    }

    // Add muscle artifact (high-frequency noise)
    if (isMuscle) {
      signal += (Math.random() - 0.5) * 30;
    }

    return signal;
  }

  private getPinkNoise(channel: number): number {
    // Voss-McCartney algorithm for pink noise
    const buf = this.pinkNoiseBuffers[channel];
    const idx = Math.floor(Math.random() * buf.length);
    buf[idx] = (Math.random() - 0.5) * 2;

    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      sum += buf[i];
    }
    return sum / buf.length;
  }
}
