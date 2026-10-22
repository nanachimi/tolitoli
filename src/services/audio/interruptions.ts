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

/**
 * Maps react-native-audio-api's `interruption` event payload. With our patch
 * (patches/, D-023), Android reports a transient focus loss as `began` with
 * `shouldResume: true`. Where the loss kind is not reported (iOS), every
 * interruption is treated as transient: the "ended" event is awaited.
 */
export function fromInterruptionEvent(
  event: { type: 'began' | 'ended'; shouldResume: boolean },
  lossKindReported: boolean,
): SystemInterruption {
  return event.type === 'began'
    ? { kind: 'interruption-began', transient: lossKindReported ? event.shouldResume : true }
    : { kind: 'interruption-ended', shouldResume: event.shouldResume };
}
