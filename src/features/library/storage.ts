import { File, Paths } from 'expo-file-system';

import type { LibraryItem } from '@/services/library';

import { recordingsRoot } from '../recording/expoFs';
import { useRecordingStore } from '../recording/useRecordingStore';

/** AAC 64 kbit/s (D-021): what a demo item would weigh on disk. */
const DEMO_BYTES_PER_MS = 64_000 / 8 / 1000;

/** Size of a library item: the real final file, or an estimate for demo items. */
export function itemBytes(item: LibraryItem): number {
  if (item.demo) return Math.round((item.durationMs ?? 0) * DEMO_BYTES_PER_MS);
  const manifest = useRecordingStore.getState().recordings.find((m) => m.id === item.id);
  if (!manifest?.finalFile) return 0;
  try {
    const file = new File(`${recordingsRoot()}/${manifest.finalFile}`);
    return file.exists ? file.size : 0;
  } catch {
    return 0;
  }
}

export function totalBytes(items: LibraryItem[]): number {
  return items.reduce((sum, item) => sum + itemBytes(item), 0);
}

export function freeBytes(): number {
  return Paths.availableDiskSpace;
}
