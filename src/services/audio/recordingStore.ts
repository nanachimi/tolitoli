import type { FormatProfileId } from './formatProfile';
import { joinPath, type Fs } from './fs';

export const MANIFEST_NAME = 'manifest.json';
export const MANIFEST_VERSION = 1;

export type RecordingManifest = {
  version: typeof MANIFEST_VERSION;
  id: string;
  createdAt: string;
  updatedAt: string;
  /** `recording` until finalised; a leftover `recording` manifest means the app died. */
  status: 'recording' | 'local';
  /** Finalised at the next launch rather than by a clean stop. */
  recovered: boolean;
  format: FormatProfileId;
  /** Finished segment files, in recording order, relative to the recording directory. */
  segments: string[];
  /** Files kept on disk but left out of the final audio because they cannot be read. */
  unreadable: string[];
  /** Final audio file, relative to the recordings root. */
  finalFile: string | null;
  durationMs: number | null;
};

export function recordingDir(root: string, id: string): string {
  return joinPath(root, id);
}

export function manifestPath(root: string, id: string): string {
  return joinPath(recordingDir(root, id), MANIFEST_NAME);
}

/** Written to a temporary file then moved, so a kill never leaves half a manifest. */
export function writeManifest(fs: Fs, root: string, manifest: RecordingManifest): void {
  const path = manifestPath(root, manifest.id);
  const temporary = `${path}.tmp`;
  fs.writeText(temporary, JSON.stringify(manifest, null, 2));
  fs.move(temporary, path);
}

export function readManifest(fs: Fs, root: string, id: string): RecordingManifest | null {
  const path = manifestPath(root, id);
  if (!fs.exists(path)) return null;
  try {
    const parsed = JSON.parse(fs.readText(path)) as RecordingManifest;
    return parsed.version === MANIFEST_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function createRecording(
  fs: Fs,
  root: string,
  id: string,
  format: FormatProfileId,
  now: Date,
): RecordingManifest {
  fs.makeDir(recordingDir(root, id));
  const manifest: RecordingManifest = {
    version: MANIFEST_VERSION,
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: 'recording',
    recovered: false,
    format,
    segments: [],
    unreadable: [],
    finalFile: null,
    durationMs: null,
  };
  writeManifest(fs, root, manifest);
  return manifest;
}

/** Records newly closed segments; already known names are ignored. */
export function appendSegments(
  fs: Fs,
  root: string,
  manifest: RecordingManifest,
  files: string[],
  now: Date,
): RecordingManifest {
  const fresh = files.filter((file) => !manifest.segments.includes(file));
  const next = {
    ...manifest,
    segments: [...manifest.segments, ...fresh],
    updatedAt: now.toISOString(),
  };
  writeManifest(fs, root, next);
  return next;
}

export function finalizeRecording(
  fs: Fs,
  root: string,
  manifest: RecordingManifest,
  result: {
    finalFile: string | null;
    durationMs: number | null;
    unreadable: string[];
    recovered: boolean;
  },
  now: Date,
): RecordingManifest {
  const next: RecordingManifest = {
    ...manifest,
    ...result,
    status: 'local',
    updatedAt: now.toISOString(),
  };
  writeManifest(fs, root, next);
  return next;
}

/** All readable manifests, newest first. */
export function listRecordings(fs: Fs, root: string): RecordingManifest[] {
  return fs
    .list(root)
    .map((name) => readManifest(fs, root, name))
    .filter((manifest): manifest is RecordingManifest => manifest !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
