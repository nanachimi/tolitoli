import type { SystemInterruption } from './engine';

/** What the session does for a system event; resuming is always offered, never automatic. */
export type InterruptionAction = 'close-segment' | 'offer-resume' | 'none';

export function interruptionAction(event: SystemInterruption): InterruptionAction {
  switch (event.kind) {
    case 'interruption-began':
      return 'close-segment';
    case 'interruption-ended':
      return 'offer-resume';
    case 'route-lost':
      // Headset or Bluetooth gone: the OS switches to the built-in mic and recording goes on.
      return 'none';
  }
}

/** Maps react-native-audio-api's `interruption` event payload. */
export function fromInterruptionEvent(event: {
  type: 'began' | 'ended';
  shouldResume: boolean;
}): SystemInterruption {
  return event.type === 'began'
    ? { kind: 'interruption-began' }
    : { kind: 'interruption-ended', shouldResume: event.shouldResume };
}
