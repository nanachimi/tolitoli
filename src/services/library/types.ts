import type { Quality, TranscriptionLanguageCode } from '../transcription/languages';

/** Where a recording stands, for the Library card and the Detail screen. */
export type LibraryItemState = 'audio' | 'transcribing' | 'transcribed' | 'failed';

/** Why a transcription failed or cannot run (cahier, « États à concevoir »). */
export type TranscriptionIssue = 'failed' | 'model-missing' | 'offline' | 'quota-exhausted';

export type LibraryItem = {
  id: string;
  /** Set by the user; null means the default title ("Enregistrement du <date> <heure>"). */
  title: string | null;
  createdAt: string;
  durationMs: number | null;
  state: LibraryItemState;
  language: TranscriptionLanguageCode | null;
  quality: Quality | null;
  /** Finalised at the next launch after a cut (step 1). */
  recovered: boolean;
  /** Progress of a running transcription, 0–1, when known. */
  progress?: number;
  issue?: TranscriptionIssue;
  /** Part of the development demo set, never written anywhere. */
  demo: boolean;
};

export type Segment = {
  id: string;
  startMs: number;
  endMs: number;
  /** 1, 2… once speakers are separated; null otherwise. */
  speaker: number | null;
  text: string;
};

export type TrashedItem = LibraryItem & { trashedAt: string };

/**
 * The Library's data. Step 1c provides a simulated implementation; step 2 replaces
 * it with SQLite (drizzle, FTS5) behind the same interface.
 */
export interface LibraryRepository {
  /** Newest first, without trashed items. */
  list(): LibraryItem[];
  get(id: string): LibraryItem | undefined;
  segments(id: string): Segment[];
  /** Title and transcript text, case- and accent-insensitive. */
  search(query: string): LibraryItem[];
  rename(id: string, title: string): void;
  trash(id: string): void;
  restore(id: string): void;
  listTrash(): TrashedItem[];
  emptyTrash(): void;
  /** Queues a failed transcription again (the queue itself comes with step 3). */
  retryTranscription(id: string): void;
  subscribe(listener: () => void): () => void;
}
