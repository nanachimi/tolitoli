import type { FormatProfile } from './formatProfile';
import { joinPath, type Fs } from './fs';
import type { RecordingManifest } from './recordingStore';

/** Native audio operations the app provides (react-native-audio-api). */
export interface AudioFiles {
  /** Duration in ms, or null when the file cannot be decoded (e.g. M4A cut by a kill). */
  probeDurationMs(path: string): Promise<number | null>;
  /** Joins readable files of the same format into `output`. */
  concat(inputs: string[], output: string): Promise<void>;
  /** Fixes a file left inconsistent by a kill (WAV header sizes); no-op for other formats. */
  repair(path: string): Promise<void>;
}

export type AssemblyResult = {
  finalFile: string | null;
  durationMs: number | null;
  unreadable: string[];
};

/** Segment files present in the recording directory, in recording order. */
export function segmentFilesOnDisk(fs: Fs, dir: string, profile: FormatProfile): string[] {
  return fs
    .list(dir)
    .filter((name) => name.endsWith(`.${profile.extension}`))
    .sort();
}

/**
 * Builds the final file from every readable segment. Unreadable segments stay
 * on disk and are listed; nothing is ever deleted (CLAUDE.md).
 */
export async function assembleRecording(
  fs: Fs,
  root: string,
  manifest: RecordingManifest,
  profile: FormatProfile,
  audio: AudioFiles,
): Promise<AssemblyResult> {
  const dir = joinPath(root, manifest.id);
  const known = new Set(manifest.segments);
  // Segments closed after the last manifest write (kill) are still on disk.
  const candidates = [
    ...manifest.segments,
    ...segmentFilesOnDisk(fs, dir, profile).filter((name) => !known.has(name)),
  ];

  const readable: string[] = [];
  const unreadable: string[] = [];
  let durationMs = 0;
  for (const name of candidates) {
    const path = joinPath(dir, name);
    if (!fs.exists(path)) continue;
    await audio.repair(path);
    const duration = await audio.probeDurationMs(path);
    if (duration === null || duration <= 0) {
      unreadable.push(name);
    } else {
      readable.push(path);
      durationMs += duration;
    }
  }

  if (readable.length === 0) return { finalFile: null, durationMs: null, unreadable };

  const finalName = `${manifest.id}.${profile.extension}`;
  const finalPath = joinPath(root, finalName);
  const temporary = joinPath(dir, `assembling.${profile.extension}`);
  await audio.concat(readable, temporary);
  fs.move(temporary, finalPath);
  return { finalFile: finalName, durationMs, unreadable };
}
