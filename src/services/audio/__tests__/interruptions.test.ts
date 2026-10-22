import { fromInterruptionEvent, interruptionAction } from '../interruptions';

describe('interruption mapping', () => {
  it('closes the segment when an interruption begins', () => {
    expect(
      interruptionAction(fromInterruptionEvent({ type: 'began', shouldResume: false }, true)),
    ).toBe('close-segment');
  });

  it('only offers to resume when it ends, whatever the OS hint', () => {
    for (const shouldResume of [true, false]) {
      expect(interruptionAction(fromInterruptionEvent({ type: 'ended', shouldResume }, true))).toBe(
        'offer-resume',
      );
    }
  });

  it('reads a transient loss from the patched Android event', () => {
    expect(fromInterruptionEvent({ type: 'began', shouldResume: true }, true)).toEqual({
      kind: 'interruption-began',
      transient: true,
    });
    expect(fromInterruptionEvent({ type: 'began', shouldResume: false }, true)).toEqual({
      kind: 'interruption-began',
      transient: false,
    });
  });

  it('treats every interruption as transient where the loss kind is not reported (iOS)', () => {
    expect(fromInterruptionEvent({ type: 'began', shouldResume: false }, false)).toEqual({
      kind: 'interruption-began',
      transient: true,
    });
  });

  it('keeps recording when the headset or Bluetooth route is lost', () => {
    expect(interruptionAction({ kind: 'route-lost' })).toBe('none');
  });
});
