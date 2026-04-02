import { useCallback, useEffect, useState } from 'react';
import { computeFFT, computeAllBandPowers } from '../lib/eeg/fft';
import { classifyFlowState, extractFeatures } from '../lib/eeg/flowState';
import { useEEGStore } from '../store/eegStore';
import type { EEGSample } from '../types/eeg';

declare global {
  interface Navigator {
    readonly bluetooth: {
      requestDevice(options: {
        filters?: Array<{ name?: string; namePrefix?: string }>;
        optionalServices?: string[];
      }): Promise<BluetoothDeviceCompat>;
    };
  }

  interface BluetoothDeviceCompat extends EventTarget {
    readonly name?: string;
    readonly gatt?: BluetoothRemoteGATTServerCompat;
  }

  interface BluetoothRemoteGATTServerCompat {
    readonly connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServerCompat>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTServiceCompat>;
  }

  interface BluetoothRemoteGATTServiceCompat {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristicCompat>;
  }

  interface BluetoothRemoteGATTCharacteristicCompat extends EventTarget {
    readonly value: DataView | null;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristicCompat>;
  }
}

const SAMPLE_RATE = 250;
const BUFFER_SECONDS = 4;
const BUFFER_SIZE = SAMPLE_RATE * BUFFER_SECONDS;
const COMPUTE_INTERVAL_MS = 500;

const MUSE_SERVICE_UUID = '0000fe8d-0000-1000-8000-00805f9b34fb';
const MUSE_EEG_CHAR_UUID = '273e0003-4c4d-454d-96be-f03bac821358';

const channelBuffers = Array.from({ length: 8 }, () => new Float32Array(BUFFER_SIZE));
const bufferPositions = Array(8).fill(0);
const rawSignalSubscribers = new Set<(window: number[][]) => void>();

let bluetoothDevice: BluetoothDeviceCompat | null = null;
let notificationCharacteristic: BluetoothRemoteGATTCharacteristicCompat | null = null;
let characteristicListener: ((event: Event) => void) | null = null;
let lastComputeTime = 0;
let rawSignalWindowState: number[][] = [];

function resetRealtimeBuffers() {
  lastComputeTime = 0;
  rawSignalWindowState = [];

  for (const buffer of channelBuffers) {
    buffer.fill(0);
  }

  for (let index = 0; index < bufferPositions.length; index++) {
    bufferPositions[index] = 0;
  }

  notifyRawSignalSubscribers([]);
}

function notifyRawSignalSubscribers(window: number[][]) {
  rawSignalWindowState = window;
  rawSignalSubscribers.forEach((subscriber) => subscriber(window));
}

function processEEGSample(sample: EEGSample) {
  const store = useEEGStore.getState();
  store.appendRawSignal(sample);

  for (let channel = 0; channel < Math.min(sample.channels.length, 8); channel++) {
    const channelData = sample.channels[channel];
    if (!channelData) continue;

    for (let index = 0; index < channelData.length; index++) {
      const position = bufferPositions[channel] % BUFFER_SIZE;
      channelBuffers[channel][position] = channelData[index];
      bufferPositions[channel]++;
    }
  }

  const now = Date.now();
  if (now - lastComputeTime < COMPUTE_INTERVAL_MS) {
    return;
  }

  lastComputeTime = now;

  const avgBuffer = new Float32Array(BUFFER_SIZE);
  for (let channel = 0; channel < 8; channel++) {
    for (let index = 0; index < BUFFER_SIZE; index++) {
      avgBuffer[index] += channelBuffers[channel][index] / 8;
    }
  }

  try {
    const fftResult = computeFFT(avgBuffer, SAMPLE_RATE);
    const bandPowers = computeAllBandPowers(fftResult);
    const flowState = classifyFlowState(bandPowers);
    const feature = extractFeatures(
      channelBuffers.map((buffer) => buffer.slice()),
      SAMPLE_RATE
    );

    store.setBandPowers(bandPowers);
    store.setFlowState(flowState);
    store.recordFeature(feature, flowState.state);

    const windowSize = 750;
    const position = bufferPositions[0];
    const window: number[] = [];
    for (let index = 0; index < Math.min(windowSize, BUFFER_SIZE); index++) {
      window.push(channelBuffers[0][(position - windowSize + index + BUFFER_SIZE) % BUFFER_SIZE]);
    }
    notifyRawSignalSubscribers([window]);
  } catch {
    // Skip malformed frames without interrupting the stream.
  }

  const quality = sample.quality.length > 0 ? sample.quality : Array(8).fill(0.8);
  store.setQuality(quality);
}

function disconnectShared() {
  if (notificationCharacteristic && characteristicListener) {
    notificationCharacteristic.removeEventListener('characteristicvaluechanged', characteristicListener);
  }

  if (bluetoothDevice?.gatt?.connected) {
    bluetoothDevice.gatt.disconnect();
  }

  bluetoothDevice = null;
  notificationCharacteristic = null;
  characteristicListener = null;
  resetRealtimeBuffers();
  useEEGStore.getState().setConnected(false);
}

async function connectHardwareShared() {
  const store = useEEGStore.getState();

  try {
    disconnectShared();
    store.setConnecting(true);

    if (!('bluetooth' in navigator)) {
      throw new Error(
        'Web Bluetooth is not available in this browser. Use a supported Chromium browser with a Muse-compatible device.'
      );
    }

    resetRealtimeBuffers();

    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'Muse' }, { namePrefix: 'Muse' }],
      optionalServices: [MUSE_SERVICE_UUID],
    });

    const server = await bluetoothDevice.gatt?.connect();
    if (!server) {
      throw new Error('Failed to connect to the Muse GATT server.');
    }

    const service = await server.getPrimaryService(MUSE_SERVICE_UUID);
    notificationCharacteristic = await service.getCharacteristic(MUSE_EEG_CHAR_UUID);
    await notificationCharacteristic.startNotifications();

    characteristicListener = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristicCompat;
      const value = target.value;
      if (!value) return;

      const samples = parseMusePacket(value);
      const channels: Float32Array[] = samples.map((sample) => new Float32Array([sample]));
      const quality = channels.map(() => 0.82);

      processEEGSample({
        timestamp: Date.now(),
        channels,
        quality,
      });
    };

    notificationCharacteristic.addEventListener(
      'characteristicvaluechanged',
      characteristicListener
    );

    store.setConnected(true, bluetoothDevice.name ?? 'Muse 2');
  } catch (error) {
    store.setConnecting(false);
    throw error;
  }
}

export function useEEG() {
  const store = useEEGStore();
  const [rawSignalWindow, setRawSignalWindow] = useState<number[][]>(rawSignalWindowState);

  useEffect(() => {
    rawSignalSubscribers.add(setRawSignalWindow);
    setRawSignalWindow(rawSignalWindowState);

    return () => {
      rawSignalSubscribers.delete(setRawSignalWindow);
    };
  }, []);

  const connect = useCallback(async () => {
    await connectHardwareShared();
  }, []);

  const disconnect = useCallback(() => {
    disconnectShared();
  }, []);

  return {
    connected: store.connected,
    connecting: store.connecting,
    connect,
    disconnect,
    startSession: store.startSession,
    endSession: store.endSession,
    currentSession: store.currentSession,
    bandPowers: store.bandPowers,
    flowState: store.flowState,
    rawSignal: rawSignalWindow,
    channels: store.channels,
    quality: store.quality,
    device: store.device,
  };
}

function parseMusePacket(dataView: DataView): number[] {
  const samples: number[] = [];

  for (let index = 0; index < Math.min(4, dataView.byteLength / 3); index++) {
    const offset = index * 3;
    if (offset + 2 >= dataView.byteLength) break;

    const b0 = dataView.getUint8(offset);
    const b1 = dataView.getUint8(offset + 1);
    const b2 = dataView.getUint8(offset + 2);

    const sample1 = ((b0 << 4) | (b1 >> 4)) & 0xfff;
    const sample2 = (((b1 & 0x0f) << 8) | b2) & 0xfff;

    samples.push((sample1 - 2048) * 0.48828125);
    samples.push((sample2 - 2048) * 0.48828125);
  }

  return samples.length > 0 ? samples : Array(8).fill(0);
}
