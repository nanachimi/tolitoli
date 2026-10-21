import { assembleRecording, type AudioFiles } from './assembly';
import type { RecordingEngine, SystemInterruption } from './engine';
import type { FormatProfile } from './formatProfile';
import type { Fs } from './fs';
import { interruptionAction } from './interruptions';
import { transition, type RecorderEvent, type RecorderStatus } from './recorderMachine';
import {
  appendSegments,
  createRecording,
  finalizeRecording,
  recordingDir,
  type RecordingManifest,
} from './recordingStore';

export type SessionDeps = {
  fs: Fs;
  root: string;
  engine: RecordingEngine;
  audio: AudioFiles;
  profile: FormatProfile;
  now: () => Date;
  newId: () => string;
};

export type SessionSnapshot = {
  status: RecorderStatus;
  manifest: RecordingManifest | null;
  /** True after an interruption ended: the UI offers "Resume". */
  resumeOffered: boolean;
};

export class InvalidSessionTransition extends Error {
  constructor(status: RecorderStatus, event: RecorderEvent) {
    super(`Cannot ${event} while ${status}`);
  }
}

/**
 * One logical recording made of segments. An interruption closes the open
 * segment and records it in the manifest before anything else; resuming opens
 * a new native recorder, so a recorder that cannot resume loses nothing.
 */
export class RecordingSession {
  private status: RecorderStatus = 'idle';
  private manifest: RecordingManifest | null = null;
  private segmentOpen = false;
  private segmentIndex = 0;
  private resumeOffered = false;
  private readonly listeners = new Set<(snapshot: SessionSnapshot) => void>();

  constructor(private readonly deps: SessionDeps) {}

  snapshot(): SessionSnapshot {
    return { status: this.status, manifest: this.manifest, resumeOffered: this.resumeOffered };
  }

  subscribe(listener: (snapshot: SessionSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start(): Promise<RecordingManifest> {
    this.apply('PREPARE');
    const { fs, root, profile, now, newId } = this.deps;
    this.manifest = createRecording(fs, root, newId(), profile.id, now());
    try {
      await this.openSegment();
    } catch (error) {
      this.apply('FAILED');
      throw error;
    }
    this.apply('STARTED');
    return this.manifest;
  }

  pause(): void {
    this.apply('PAUSE');
    this.deps.engine.pause();
  }

  async resume(): Promise<void> {
    if (this.status === 'paused' && this.segmentOpen) {
      this.apply('RESUME');
      this.deps.engine.resume();
      return;
    }
    if (this.status !== 'paused' && this.status !== 'interrupted') {
      throw new InvalidSessionTransition(this.status, 'RESUME');
    }
    try {
      await this.openSegment();
    } catch {
      // A recorder that will not restart (iOS issue #1220): try once more with a fresh one.
      await this.openSegment();
    }
    this.resumeOffered = false;
    this.apply('RESUME');
  }

  async handleSystemEvent(event: SystemInterruption): Promise<void> {
    const action = interruptionAction(event);
    if (action === 'close-segment') {
      if (this.status !== 'recording' && this.status !== 'paused') return;
      await this.closeSegment();
      this.apply('INTERRUPTION_BEGAN');
      return;
    }
    if (action === 'offer-resume' && this.status === 'interrupted') {
      this.resumeOffered = true;
      this.emit();
    }
  }

  async stop(): Promise<RecordingManifest> {
    this.apply('STOP');
    const { fs, root, profile, audio, now } = this.deps;
    try {
      await this.closeSegment();
      const manifest = this.requireManifest();
      const result = await assembleRecording(fs, root, manifest, profile, audio);
      this.manifest = finalizeRecording(fs, root, manifest, { ...result, recovered: false }, now());
    } catch (error) {
      this.apply('FAILED');
      throw error;
    }
    this.apply('STOPPED');
    return this.manifest;
  }

  reset(): void {
    this.apply('RESET');
    this.manifest = null;
    this.segmentIndex = 0;
    this.resumeOffered = false;
    this.emit();
  }

  private async openSegment(): Promise<void> {
    const manifest = this.requireManifest();
    const prefix = `s${String(this.segmentIndex).padStart(3, '0')}-`;
    this.segmentIndex += 1;
    await this.deps.engine.open(recordingDir(this.deps.root, manifest.id), prefix);
    this.segmentOpen = true;
  }

  private async closeSegment(): Promise<void> {
    if (!this.segmentOpen) return;
    const files = await this.deps.engine.close();
    this.segmentOpen = false;
    const { fs, root, now } = this.deps;
    this.manifest = appendSegments(fs, root, this.requireManifest(), files, now());
  }

  private requireManifest(): RecordingManifest {
    if (!this.manifest) throw new Error('No recording in progress');
    return this.manifest;
  }

  private apply(event: RecorderEvent): void {
    const next = transition(this.status, event);
    if (next === null) throw new InvalidSessionTransition(this.status, event);
    this.status = next;
    this.emit();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
