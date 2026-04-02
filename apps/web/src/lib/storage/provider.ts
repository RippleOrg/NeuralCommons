import { getRuntimeConfig } from '../runtime';
import { storeBundleLocally } from './localArchive';
import type { NeuralDatasetBundle } from '../../types/vault';

export interface StorageReceipt {
  cid: string;
  uri: string;
  provider: 'local' | 'storacha';
  degraded?: boolean;
  note?: string;
}

export async function persistDatasetBundle(bundle: NeuralDatasetBundle): Promise<StorageReceipt> {
  const config = getRuntimeConfig();
  const localUri = await storeBundleLocally(bundle);

  if (config.storageMode !== 'storacha' || !config.storageApiUrl) {
    return {
      cid: bundle.datasetHash,
      uri: localUri,
      provider: 'local',
    };
  }

  try {
    const response = await fetch(`${config.storageApiUrl.replace(/\/$/, '')}/datasets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bundle),
    });

    if (!response.ok) {
      throw new Error(`Storacha upload failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { cid: string; uri?: string };
    return {
      cid: result.cid,
      uri: result.uri ?? `${config.ipfsGateway}${result.cid}`,
      provider: 'storacha',
    };
  } catch (error) {
    return {
      cid: bundle.datasetHash,
      uri: localUri,
      provider: 'local',
      degraded: true,
      note: error instanceof Error ? error.message : 'Storacha upload failed; retained locally.',
    };
  }
}
