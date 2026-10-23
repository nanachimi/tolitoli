import type { LibraryItem } from '@/services/library';

import { availableDiskSpace } from '../recording/expoFs';

/** Size of a library item: audio_size, read from disk when the recording was finalised. */
export function itemBytes(item: LibraryItem): number {
  return item.audioSize ?? 0;
}

export function totalBytes(items: LibraryItem[]): number {
  return items.reduce((sum, item) => sum + itemBytes(item), 0);
}

/** The same reading as the recording screen's, so both screens say the same thing. */
export function freeBytes(): number {
  return availableDiskSpace();
}
