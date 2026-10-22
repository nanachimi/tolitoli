import type { FormatProfile } from './formatProfile';
import { joinPath, type Fs } from './fs';
import type { RecordingManifest } from './recordingStore';

/** Native audio operations the app provides (react-native-audio-api). */
export interface AudioFiles {
  /** Duration in ms, or null when the file cannot be decoded (e.g. M4A cut by a kill). */
  probeDurationMs(path: string): Promise<number | null>;
  /** Joins readable files of the same format into `output`. */
  concat(inputs: string[], output: string): Promise<void>;
  /** Encodes PCM WAV files, in order, into one AAC `.m4a` at `bitRate`. */
  encode(inputs: string[], output: string, bitRate: number): Promise<void>;
  /** Fixes a file left inconsistent by a kill (WAV header sizes); no-op for other formats. */
  repair(path: string): Promise<void>;
}

export type AssemblyResult = {
  finalFile: string | null;
  durationMs: number | null;
  unreadable: string[];
  /** Segment files whose content is in the checked final file; safe to release. */
  encoded: string[];
};

/** Largest gap between the encoded file and the sum of its sources before it is rejected. */
export const ENCODED_DURATION_TOLERANCE_MS = 500;

/** Segment files present in the recording directory, in recording order. */
export function segmentFilesOnDisk(fs: Fs, dir: string, profile: FormatProfile): string[] {
  return fs
    .list(dir)
    .filter((name) => name.endsWith(`.${profile.extension}`))
    .sort();
}

/**
 * Builds the final file from every readable segment. Unreadable segments stay
 * on disk and are listed. When the profile encodes (WAV, D-021), the `.m4a` is
 * checked against the sources; if encoding fails, the WAV is kept as the final
 * file instead. Deletes nothing: see `releaseRecordedFiles`.
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

  if (readable.length === 0) return { finalFile: null, durationMs: null, unreadable, encoded: [] };

  if (profile.encodeBitRate !== null) {
    const finalName = `${manifest.id}.${profile.finalExtension}`;
    const temporary = joinPath(dir, `assembling.${profile.finalExtension}`);
    try {
      await audio.encode(readable, temporary, profile.encodeBitRate);
      const encodedMs = await audio.probeDurationMs(temporary);
      if (encodedMs !== null && Math.abs(encodedMs - durationMs) <= ENCODED_DURATION_TOLERANCE_MS) {
        fs.move(temporary, joinPath(root, finalName));
        const encoded = readable.map((path) => path.slice(dir.length + 1));
        return { finalFile: finalName, durationMs, unreadable, encoded };
      }
    } catch {
      // Falls through: the recording is kept as WAV rather than lost.
    }
  }

  const finalName = `${manifest.id}.${profile.extension}`;
  const temporary = joinPath(dir, `assembling.${profile.extension}`);
  await audio.concat(readable, temporary);
  fs.move(temporary, joinPath(root, finalName));
  return { finalFile: finalName, durationMs, unreadable, encoded: [] };
}

/**
 * Deletes the recorded segments once their content sits in the final file,
 * which the manifest must already point to. Unreadable files are never touched.
 */
export function releaseRecordedFiles(
  fs: Fs,
  root: string,
  manifest: RecordingManifest,
  encoded: string[],
): void {
  if (manifest.status !== 'local' || manifest.finalFile === null) return;
  const dir = joinPath(root, manifest.id);
  for (const name of encoded) {
    if (manifest.unreadable.includes(name)) continue;
    fs.remove(joinPath(dir, name));
  }
}
