import type { AudioFiles } from '../assembly';
import type { RecordingEngine } from '../engine';
import type { Fs } from '../fs';

/** In-memory file system; `deleted` must stay empty: nothing may ever be deleted. */
export class MemoryFs implements Fs {
  readonly files = new Map<string, string>();
  readonly dirs = new Set<string>();
  readonly deleted: string[] = [];
  readonly writes: string[] = [];

  exists(path: string) {
    return this.files.has(path) || this.dirs.has(path);
  }
  readText(path: string) {
    const text = this.files.get(path);
    if (text === undefined) throw new Error(`ENOENT ${path}`);
    return text;
  }
  writeText(path: string, text: string) {
    this.writes.push(path);
    this.files.set(path, text);
  }
  move(from: string, to: string) {
    const text = this.readText(from);
    this.files.delete(from);
    this.files.set(to, text);
  }
  list(dir: string) {
    const prefix = `${dir}/`;
    const names = new Set<string>();
    for (const path of [...this.files.keys(), ...this.dirs]) {
      if (path.startsWith(prefix)) names.add(path.slice(prefix.length).split('/')[0] ?? '');
    }
    return [...names].filter(Boolean);
  }
  makeDir(path: string) {
    this.dirs.add(path);
  }
  size(path: string) {
    return this.files.get(path)?.length ?? 0;
  }
}

/** Audio stand-in: a file is "readable" unless its content is CORRUPT; duration = length × 1000. */
export class FakeAudio implements AudioFiles {
  readonly repaired: string[] = [];
  constructor(private readonly fs: MemoryFs) {}
  async probeDurationMs(path: string) {
    const text = this.fs.files.get(path);
    if (text === undefined || text === 'CORRUPT') return null;
    return text.length * 1000;
  }
  async concat(inputs: string[], output: string) {
    this.fs.writeText(output, inputs.map((path) => this.fs.readText(path)).join(''));
  }
  async repair(path: string) {
    this.repaired.push(path);
  }
}

/** Engine writing one segment file per `open`/`close`, or several to mimic rotation. */
export class FakeEngine implements RecordingEngine {
  readonly calls: string[] = [];
  failNextOpens = 0;
  segmentsPerClose = 1;
  private dir = '';
  private prefix = '';
  constructor(private readonly fs: MemoryFs) {}
  /** Runs while a recorder is starting, to deliver system events mid-open. */
  duringOpen: (() => Promise<void>) | null = null;
  async open(dir: string, prefix: string) {
    this.calls.push(`open ${prefix}`);
    const duringOpen = this.duringOpen;
    this.duringOpen = null;
    if (duringOpen) await duringOpen();
    if (this.failNextOpens > 0) {
      this.failNextOpens -= 1;
      throw new Error('recorder would not start');
    }
    this.dir = dir;
    this.prefix = prefix;
  }
  async close() {
    this.calls.push('close');
    const names: string[] = [];
    for (let i = 0; i < this.segmentsPerClose; i += 1) {
      const name = `${this.prefix}${i}.m4a`;
      this.fs.writeText(`${this.dir}/${name}`, 'ab');
      names.push(name);
    }
    return names;
  }
  pause() {
    this.calls.push('pause');
  }
  resume() {
    this.calls.push('resume');
  }
}
