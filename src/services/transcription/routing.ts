import { requiresCloud, type TranscriptionLanguageCode } from './languages';

/**
 * Routing of a transcription (CLAUDE.md, « Routage », rules 1 and 5). Rules 2 to 4 (cloud
 * enabled, quota, subscription) come with the cloud engines at step 8. The engine follows the
 * language the user chose, never automatic detection.
 */
export type TranscriptionRoute =
  /** Whisper on the device. */
  | { kind: 'local' }
  /** No engine on the device for this language and no cloud: say so, offer the cloud. */
  | { kind: 'cloud-required' };

export type RoutingInput = {
  language: TranscriptionLanguageCode;
  /** The cloud transcription setting; it does not exist before step 8 (owner's answer D). */
  cloudEnabled: boolean;
  online: boolean;
};

export function routeTranscription(input: RoutingInput): TranscriptionRoute {
  if (requiresCloud(input.language)) return { kind: 'cloud-required' };
  // Rule 1, cloud disabled, and rule 5, offline: Whisper on the device.
  return { kind: 'local' };
}
