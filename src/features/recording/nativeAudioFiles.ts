import { File, FileMode } from 'expo-file-system';
import { concatAudioFiles, getAudioDuration } from 'react-native-audio-api';

import { AudioEncoder } from '../../../modules/audio-encoder';

import type { AudioFiles } from '@/services/audio/assembly';
import { wavHeaderPatches } from '@/services/audio/wavHeader';

/** react-native-audio-api takes plain paths, expo-file-system file:// URIs. */
export function toPlainPath(uri: string): string {
  return decodeURI(uri.replace(/^file:\/\//, ''));
}

function repairWav(uri: string): void {
  const file = new File(uri);
  const handle = file.open(FileMode.ReadWrite);
  try {
    const patches = wavHeaderPatches(handle.readBytesSync(4096), file.size);
    for (const patch of patches ?? []) {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setUint32(0, patch.value, true);
      handle.offset = patch.offset;
      handle.writeBytesSync(bytes);
    }
  } finally {
    handle.close();
  }
}

export const nativeAudioFiles: AudioFiles = {
  async probeDurationMs(uri) {
    try {
      const seconds = await getAudioDuration(toPlainPath(uri));
      return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
    } catch {
      return null;
    }
  },
  async concat(inputs, output) {
    if (inputs.length === 1 && inputs[0]) {
      new File(inputs[0]).copySync(new File(output), { overwrite: true });
      return;
    }
    await concatAudioFiles(inputs.map(toPlainPath), toPlainPath(output));
  },
  async encode(inputs, output, bitRate) {
    await AudioEncoder.encodeToM4a(inputs.map(toPlainPath), toPlainPath(output), bitRate);
  },
  async repair(uri) {
    if (uri.endsWith('.wav')) repairWav(uri);
  },
};
