import type { RecordingManifest } from '../audio/recordingStore';
import { demoItems, demoSegments } from './demo';
import type { LibraryItem, LibraryRepository, Segment, TrashedItem } from './types';

export type SimulatedLibraryOptions = {
  /** Real recordings of step 1, read only. */
  readManifests: () => RecordingManifest[];
  /** Development demo set (never in production builds). */
  demoEnabled: () => boolean;
  now: () => Date;
};

function fromManifest(manifest: RecordingManifest): LibraryItem {
  return {
    id: manifest.id,
    title: null,
    createdAt: manifest.createdAt,
    durationMs: manifest.durationMs,
    state: 'audio',
    language: null,
    quality: null,
    recovered: manifest.recovered,
    demo: false,
  };
}

/** Lower case without accents, so "reunion" finds "Réunion". */
export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Step 1c stand-in for the SQLite library: real manifests plus the demo set, with
 * renames and the trash kept in memory only. It has no file system access at all:
 * nothing is written, moved or deleted, whatever the user does.
 */
export class SimulatedLibraryRepository implements LibraryRepository {
  private readonly titles = new Map<string, string>();
  private readonly trashed = new Map<string, string>();
  /** Hidden for this session once the trash is emptied; files stay on disk. */
  private readonly purged = new Set<string>();
  /** Failed transcriptions sent again: shown as running, nothing actually runs. */
  private readonly retried = new Set<string>();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly options: SimulatedLibraryOptions) {}

  private all(): LibraryItem[] {
    const now = this.options.now();
    const items = [
      ...this.options.readManifests().map(fromManifest),
      ...(this.options.demoEnabled() ? demoItems(now) : []),
    ];
    return items
      .filter((item) => !this.purged.has(item.id))
      .map((item) => ({ ...item, title: this.titles.get(item.id) ?? item.title }))
      .map((item) => (this.retried.has(item.id) ? retrying(item) : item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  list(): LibraryItem[] {
    return this.all().filter((item) => !this.trashed.has(item.id));
  }

  get(id: string): LibraryItem | undefined {
    return this.all().find((item) => item.id === id);
  }

  segments(id: string): Segment[] {
    return this.get(id)?.demo ? demoSegments(id) : [];
  }

  search(query: string): LibraryItem[] {
    const needle = normalise(query.trim());
    if (needle === '') return this.list();
    return this.list().filter(
      (item) =>
        normalise(item.title ?? '').includes(needle) ||
        this.segments(item.id).some((segment) => normalise(segment.text).includes(needle)),
    );
  }

  rename(id: string, title: string): void {
    const trimmed = title.trim();
    if (trimmed === '') this.titles.delete(id);
    else this.titles.set(id, trimmed);
    this.emit();
  }

  trash(id: string): void {
    this.trashed.set(id, this.options.now().toISOString());
    this.emit();
  }

  restore(id: string): void {
    this.trashed.delete(id);
    this.emit();
  }

  listTrash(): TrashedItem[] {
    return this.all()
      .filter((item) => this.trashed.has(item.id))
      .map((item) => ({ ...item, trashedAt: this.trashed.get(item.id) ?? '' }));
  }

  emptyTrash(): void {
    for (const id of this.trashed.keys()) this.purged.add(id);
    this.trashed.clear();
    this.emit();
  }

  retryTranscription(id: string): void {
    this.retried.add(id);
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Called by the app when the underlying manifests or the demo switch change. */
  emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

function retrying(item: LibraryItem): LibraryItem {
  const { issue: _issue, progress: _progress, ...rest } = item;
  return { ...rest, state: 'transcribing' };
}
