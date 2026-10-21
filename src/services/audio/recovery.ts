import { assembleRecording, type AudioFiles } from './assembly';
import type { FormatProfile, FormatProfileId } from './formatProfile';
import type { Fs } from './fs';
import { finalizeRecording, listRecordings, type RecordingManifest } from './recordingStore';

/**
 * Finalises recordings left in `recording` by a killed app and marks them
 * recovered. Idempotent: finalised manifests are skipped. Deletes nothing.
 */
export async function recoverInterruptedRecordings(
  fs: Fs,
  root: string,
  profiles: Record<FormatProfileId, FormatProfile>,
  audio: AudioFiles,
  now: () => Date,
  isActive: (id: string) => boolean = () => false,
): Promise<RecordingManifest[]> {
  const recovered: RecordingManifest[] = [];
  for (const manifest of listRecordings(fs, root)) {
    if (manifest.status !== 'recording' || isActive(manifest.id)) continue;
    const result = await assembleRecording(fs, root, manifest, profiles[manifest.format], audio);
    recovered.push(finalizeRecording(fs, root, manifest, { ...result, recovered: true }, now()));
  }
  return recovered;
}
