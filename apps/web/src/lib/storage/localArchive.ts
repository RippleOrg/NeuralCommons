import type { NeuralDatasetBundle } from '../../types/vault';

const ARCHIVE_KEY = 'neuralcommons.local.archive.v1';

function readArchive(): NeuralDatasetBundle[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as NeuralDatasetBundle[];
  } catch {
    return [];
  }
}

function writeArchive(entries: NeuralDatasetBundle[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries));
}

export async function storeBundleLocally(bundle: NeuralDatasetBundle): Promise<string> {
  const archive = readArchive().filter((entry) => entry.sessionId !== bundle.sessionId);
  archive.unshift(bundle);
  writeArchive(archive.slice(0, 50));
  return `local://${bundle.sessionId}`;
}

export async function loadLocalBundle(sessionId: string): Promise<NeuralDatasetBundle | null> {
  return readArchive().find((entry) => entry.sessionId === sessionId) ?? null;
}

export function listLocalBundles(): NeuralDatasetBundle[] {
  return readArchive();
}
