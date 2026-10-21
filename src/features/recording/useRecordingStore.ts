import { create } from 'zustand';

import type { RecorderStatus } from '@/services/audio/recorderMachine';
import type { RecordingManifest } from '@/services/audio/recordingStore';

export type RecordingNotice =
  'permission-denied' | 'notifications-denied' | 'disk-low' | 'disk-insufficient' | 'error';

export type RecordingState = {
  status: RecorderStatus;
  /** Closed recording spans, excluding the running one. */
  accumulatedMs: number;
  /** When the current recording span started, or null when not recording. */
  runningSince: number | null;
  /** 0..1 input level. */
  level: number;
  resumeOffered: boolean;
  notice: RecordingNotice | null;
  diskMinutes: number | null;
  recordings: RecordingManifest[];
};

export const initialRecordingState: RecordingState = {
  status: 'idle',
  accumulatedMs: 0,
  runningSince: null,
  level: 0,
  resumeOffered: false,
  notice: null,
  diskMinutes: null,
  recordings: [],
};

export const useRecordingStore = create<RecordingState>(() => initialRecordingState);
