import { Directory, File, Paths } from 'expo-file-system';

import { joinPath, type Fs } from '@/services/audio/fs';

/** Recordings live in the app documents directory (both engines resolve it the same way). */
export const RECORDINGS_DIR_NAME = 'recordings';

export function recordingsRoot(): string {
  return joinPath(Paths.document.uri, RECORDINGS_DIR_NAME);
}

/** expo-file-system behind the pure `Fs` port. */
export const expoFs: Fs = {
  exists: (path) => new File(path).exists || new Directory(path).exists,
  readText: (path) => new File(path).textSync(),
  writeText: (path, text) => {
    const file = new File(path);
    if (!file.exists) file.create({ intermediates: true });
    file.writeSync(text);
  },
  move: (from, to) => new File(from).moveSync(new File(to), { overwrite: true }),
  list: (dir) => {
    const directory = new Directory(dir);
    return directory.exists ? directory.list().map((entry) => entry.name) : [];
  },
  makeDir: (path) => new Directory(path).create({ intermediates: true, idempotent: true }),
  size: (path) => new File(path).size,
  remove: (path) => {
    const file = new File(path);
    if (file.exists) file.delete();
  },
};

export function availableDiskSpace(): number {
  return Paths.availableDiskSpace;
}
