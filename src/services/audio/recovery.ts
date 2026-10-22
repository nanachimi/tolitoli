import {
  assembleRecording,
  releaseRecordedFiles,
  segmentFilesOnDisk,
  type AudioFiles,
} from './assembly';
import type { FormatProfile, FormatProfileId } from './formatProfile';
import { joinPath, type Fs } from './fs';
import { finalizeRecording, listRecordings, type RecordingManifest } from './recordingStore';

/**
 * Time to watch the files of a `recording` manifest before treating it as abandoned. The
 * recorder flushes every 200 ms, so a live one always grows within this window.
 */
export const STILL_WRITING_CHECK_MS = 1500;

export type RecoveryOptions = {
  /** The recording the current session owns. */
  isActive?: (id: string) => boolean;
  wait?: (ms: number) => Promise<void>;
};

function recordedBytes(fs: Fs, root: string, manifest: RecordingManifest, profile: FormatProfile) {
  const dir = joinPath(root, manifest.id);
  return segmentFilesOnDisk(fs, dir, profile).reduce(
    (total, name) => total + fs.size(joinPath(dir, name)),
    0,
  );
}

/**
 * Finalises recordings left in `recording` by a killed app and marks them
 * recovered. Idempotent: finalised manifests are skipped. Only segments whose
 * content is in a checked final file are released.
 *
 * A recording whose files still grow is left alone: its native recorder
 * outlived the JavaScript that started it (a reload during development), and
 * finalising it would release the file being written (D-023).
 */
export async function recoverInterruptedRecordings(
  fs: Fs,
  root: string,
  profiles: Record<FormatProfileId, FormatProfile>,
  audio: AudioFiles,
  now: () => Date,
  {
    isActive = () => false,
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  }: RecoveryOptions = {},
): Promise<RecordingManifest[]> {
  const candidates = listRecordings(fs, root).filter(
    (manifest) => manifest.status === 'recording' && !isActive(manifest.id),
  );
  if (candidates.length === 0) return [];

  const sizeOf = (manifest: RecordingManifest) =>
    recordedBytes(fs, root, manifest, profiles[manifest.format]);
  const before = new Map(candidates.map((manifest) => [manifest.id, sizeOf(manifest)]));
  await wait(STILL_WRITING_CHECK_MS);

  const recovered: RecordingManifest[] = [];
  for (const manifest of candidates) {
    if (sizeOf(manifest) !== before.get(manifest.id)) continue;
    const profile = profiles[manifest.format];
    const { encoded, ...result } = await assembleRecording(fs, root, manifest, profile, audio);
    const finalised = finalizeRecording(fs, root, manifest, { ...result, recovered: true }, now());
    releaseRecordedFiles(fs, root, finalised, encoded);
    recovered.push(finalised);
  }
  return recovered;
}
