/** A little-endian uint32 to write at `offset`. */
export type HeaderPatch = { offset: number; value: number };

function tag(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4));
}

/**
 * Size fields a killed writer left stale (RIFF size and data chunk size),
 * recomputed from the real file size. Returns [] when they are already right,
 * null when the bytes are not a WAV header.
 */
export function wavHeaderPatches(header: Uint8Array, fileSize: number): HeaderPatch[] | null {
  if (header.byteLength < 12 || tag(header, 0) !== 'RIFF' || tag(header, 8) !== 'WAVE') {
    return null;
  }
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  let offset = 12;
  while (offset + 8 <= header.byteLength) {
    const id = tag(header, offset);
    const size = view.getUint32(offset + 4, true);
    if (id === 'data') {
      const patches: HeaderPatch[] = [];
      const riffSize = fileSize - 8;
      const dataSize = fileSize - (offset + 8);
      if (view.getUint32(4, true) !== riffSize) patches.push({ offset: 4, value: riffSize });
      if (size !== dataSize) patches.push({ offset: offset + 4, value: dataSize });
      return patches;
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}
