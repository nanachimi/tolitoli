import { wavHeaderPatches } from '../wavHeader';

function header(riffSize: number, dataSize: number): Uint8Array {
  const bytes = new Uint8Array(44);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, text: string) =>
    [...text].forEach((c, i) => (bytes[offset + i] = c.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, riffSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);
  return bytes;
}

describe('wavHeaderPatches', () => {
  it('recomputes sizes left at zero by a killed writer', () => {
    expect(wavHeaderPatches(header(36, 0), 44 + 32_000)).toEqual([
      { offset: 4, value: 36 + 32_000 },
      { offset: 40, value: 32_000 },
    ]);
  });

  it('leaves a correct header alone', () => {
    expect(wavHeaderPatches(header(36 + 100, 100), 144)).toEqual([]);
  });

  it('rejects data that is not a WAV header', () => {
    expect(wavHeaderPatches(new Uint8Array(44), 1000)).toBeNull();
    expect(wavHeaderPatches(new Uint8Array(4), 1000)).toBeNull();
  });
});
