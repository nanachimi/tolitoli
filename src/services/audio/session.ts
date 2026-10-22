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
  /** True after an interruption ended, or at once when it is permanent: the UI offers "Resume". */
  resumeOffered: boolean;
  /**
   * A transient interruption (call, ringtone) still holds the microphone.
   * Resuming is refused until it ends: the cahier forbids the mic during a call.
   */
  micBusy: boolean;
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
  private micBusy = false;
  /** A recorder is starting; an interruption arriving now is applied once it has started. */
  private opening = false;
  private interruptedWhileOpening = false;
  private readonly listeners = new Set<(snapshot: SessionSnapshot) => void>();

  constructor(private readonly deps: SessionDeps) {}

  snapshot(): SessionSnapshot {
    return {
      status: this.status,
      manifest: this.manifest,
      resumeOffered: this.resumeOffered,
      micBusy: this.micBusy,
    };
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
    await this.applyInterruptionFromOpening();
    return this.requireManifest();
  }

  pause(): void {
    this.apply('PAUSE');
    this.deps.engine.pause();
  }

  /** Returns false, doing nothing, while a call still holds the microphone. */
  async resume(): Promise<boolean> {
    if (this.micBusy) return false;
    if (this.status === 'paused' && this.segmentOpen) {
      this.apply('RESUME');
      this.deps.engine.resume();
      return true;
    }
    if (this.status !== 'paused' && this.status !== 'interrupted') {
      throw new InvalidSessionTransition(this.status, 'RESUME');
    }
    try {
      await this.openSegment();
    } catch {
      // A recorder that will not restart (iOS issue #1220): try once more with a fresh one.
      try {
        await this.openSegment();
      } catch (error) {
        this.interruptedWhileOpening = false;
        throw error;
      }
    }
    this.resumeOffered = false;
    this.apply('RESUME');
    await this.applyInterruptionFromOpening();
    return true;
  }

  async handleSystemEvent(event: SystemInterruption): Promise<void> {
    if (!this.isActive()) return;
    const action = interruptionAction(event);
    if (action === 'close-segment' && event.kind === 'interruption-began') {
      this.micBusy = event.transient;
      this.resumeOffered = !event.transient;
      if (this.opening) {
        // The recorder being started would record the call: close it as soon as it runs.
        this.interruptedWhileOpening = true;
        this.emit();
        return;
      }
      if (this.status !== 'recording' && this.status !== 'paused') {
        this.emit();
        return;
      }
      await this.closeSegment();
      this.apply('INTERRUPTION_BEGAN');
      return;
    }
    if (action === 'offer-resume') {
      this.micBusy = false;
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
    this.micBusy = false;
    this.interruptedWhileOpening = false;
    this.emit();
  }

  private isActive(): boolean {
    return (
      this.status === 'preparing' ||
      this.status === 'recording' ||
      this.status === 'paused' ||
      this.status === 'interrupted'
    );
  }

  private async openSegment(): Promise<void> {
    const manifest = this.requireManifest();
    const prefix = `s${String(this.segmentIndex).padStart(3, '0')}-`;
    this.segmentIndex += 1;
    this.opening = true;
    try {
      await this.deps.engine.open(recordingDir(this.deps.root, manifest.id), prefix);
    } finally {
      this.opening = false;
    }
    this.segmentOpen = true;
  }

  private async applyInterruptionFromOpening(): Promise<void> {
    if (!this.interruptedWhileOpening) return;
    this.interruptedWhileOpening = false;
    await this.closeSegment();
    this.apply('INTERRUPTION_BEGAN');
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
