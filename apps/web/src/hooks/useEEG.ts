import { useEffect, useRef, useCallback, useState } from 'react';
import { computeFFT, computeAllBandPowers } from '../lib/eeg/fft';
import { classifyFlowState, extractFeatures } from '../lib/eeg/flowState';
import { useEEGStore } from '../store/eegStore';
import type { EEGSample } from '../types/eeg';

// Web Bluetooth API type declarations (not in standard lib)
declare global {
  interface Navigator {
    readonly bluetooth: {
      requestDevice(options: {
        filters?: Array<{ name?: string; namePrefix?: string }>;
        optionalServices?: string[];
      }): Promise<BluetoothDeviceCompat>;
    };
  }
  interface BluetoothDeviceCompat {
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

// Muse 2 GATT UUIDs
const MUSE_SERVICE_UUID = '0000fe8d-0000-1000-8000-00805f9b34fb';
const MUSE_EEG_CHAR_UUID = '273e0003-4c4d-454d-96be-f03bac821358';

export function useEEG() {
  const store = useEEGStore();
  const bluetoothDeviceRef = useRef<BluetoothDeviceCompat | null>(null);
  const channelBuffers = useRef<Float32Array[]>(
    Array.from({ length: 8 }, () => new Float32Array(BUFFER_SIZE))
  );
  const bufferPositions = useRef<number[]>(Array(8).fill(0));
  const lastComputeTime = useRef(0);
  const [rawSignalWindow, setRawSignalWindow] = useState<number[][]>([]);

  const processEEGSample = useCallback((sample: EEGSample) => {
    store.appendRawSignal(sample);

    // Update rolling buffers
    for (let ch = 0; ch < Math.min(sample.channels.length, 8); ch++) {
      const channelData = sample.channels[ch];
      if (!channelData) continue;

      for (let i = 0; i < channelData.length; i++) {
        const pos = bufferPositions.current[ch] % BUFFER_SIZE;
        channelBuffers.current[ch][pos] = channelData[i];
        bufferPositions.current[ch]++;
      }
    }

    // Compute band powers every 500ms
    const now = Date.now();
    if (now - lastComputeTime.current >= COMPUTE_INTERVAL_MS) {
      lastComputeTime.current = now;

      // Average over all channels
      const avgBuffer = new Float32Array(BUFFER_SIZE);
      for (let ch = 0; ch < 8; ch++) {
        for (let i = 0; i < BUFFER_SIZE; i++) {
          avgBuffer[i] += channelBuffers.current[ch][i] / 8;
        }
      }

      try {
        const fftResult = computeFFT(avgBuffer, SAMPLE_RATE);
        const bandPowers = computeAllBandPowers(fftResult);
        const flowState = classifyFlowState(bandPowers);
        const feature = extractFeatures(
          channelBuffers.current.map((buffer) => buffer.slice()),
          SAMPLE_RATE
        );

        store.setBandPowers(bandPowers);
        store.setFlowState(flowState);
        store.recordFeature(feature, flowState.state);

        // Update raw signal visualization window
        const windowSize = 750; // 3 seconds
        const pos = bufferPositions.current[0];
        const window: number[] = [];
        for (let i = 0; i < Math.min(windowSize, BUFFER_SIZE); i++) {
          window.push(channelBuffers.current[0][(pos - windowSize + i + BUFFER_SIZE) % BUFFER_SIZE]);
        }
        setRawSignalWindow([window]);
      } catch {
        // FFT computation failed, skip this frame
      }

      // Compute quality from first channel
      const quality = sample.quality.length > 0 ? sample.quality : Array(8).fill(0.8);
      store.setQuality(quality);
    }
  }, [store]);

  const connect = useCallback(async () => {
    store.setConnecting(true);

    try {
      if (!('bluetooth' in navigator)) {
        throw new Error('Web Bluetooth is not available in this browser. Use a supported Chromium browser and a Muse-compatible device.');
      }

      // Try Web Bluetooth connection to Muse 2
      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'Muse' }, { namePrefix: 'Muse' }],
        optionalServices: [MUSE_SERVICE_UUID],
      });

      bluetoothDeviceRef.current = bluetoothDevice;

      const server = await bluetoothDevice.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      const service = await server.getPrimaryService(MUSE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(MUSE_EEG_CHAR_UUID);

      await characteristic.startNotifications();

      characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristicCompat;
        const value = target.value;
        if (!value) return;

        // Parse Muse 12-byte packet: 2 × 12-bit samples per channel
        const samples = parseMusePacket(value);
        const channels: Float32Array[] = samples.map((s) => new Float32Array([s]));
        const quality = channels.map(() => 0.8);

        processEEGSample({
          timestamp: Date.now(),
          channels,
          quality,
        });
      });

      store.setConnected(true, bluetoothDevice.name ?? 'Muse 2');
    } catch (error) {
      store.setConnecting(false);
      throw error;
    }
  }, [store, processEEGSample]);

  const disconnect = useCallback(() => {
    if (bluetoothDeviceRef.current?.gatt?.connected) {
      bluetoothDeviceRef.current.gatt.disconnect();
      bluetoothDeviceRef.current = null;
    }

    store.setConnected(false);
  }, [store]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

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
  };
}

/**
 * Parse a Muse 2 EEG packet (12 bytes = 2 × 12-bit samples per channel)
 */
function parseMusePacket(dataView: DataView): number[] {
  const samples: number[] = [];

  // Muse packet format: first 2 bytes are packet index, then 10 bytes of EEG data
  // Each EEG sample is 12 bits, packed into bytes
  for (let i = 0; i < Math.min(4, dataView.byteLength / 3); i++) {
    const offset = i * 3;
    if (offset + 2 >= dataView.byteLength) break;

    const b0 = dataView.getUint8(offset);
    const b1 = dataView.getUint8(offset + 1);
    const b2 = dataView.getUint8(offset + 2);

    // Extract two 12-bit values
    const sample1 = ((b0 << 4) | (b1 >> 4)) & 0xfff;
    const sample2 = ((b1 & 0x0f) << 8 | b2) & 0xfff;

    // Convert from 12-bit unsigned to signed µV
    // Muse 2 uses 10µV/count with 2048 as midpoint
    samples.push((sample1 - 2048) * 0.48828125);
    samples.push((sample2 - 2048) * 0.48828125);
  }

  return samples.length > 0 ? samples : Array(8).fill(0);
}
