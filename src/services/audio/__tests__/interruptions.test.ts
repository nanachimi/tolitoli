import { fromInterruptionEvent, interruptionAction } from '../interruptions';

describe('interruption mapping', () => {
  it('closes the segment when an interruption begins', () => {
    expect(interruptionAction(fromInterruptionEvent({ type: 'began', shouldResume: false }))).toBe(
      'close-segment',
    );
  });

  it('only offers to resume when it ends, whatever the OS hint', () => {
    for (const shouldResume of [true, false]) {
      expect(interruptionAction(fromInterruptionEvent({ type: 'ended', shouldResume }))).toBe(
        'offer-resume',
      );
    }
  });

  it('keeps recording when the headset or Bluetooth route is lost', () => {
    expect(interruptionAction({ kind: 'route-lost' })).toBe('none');
  });
});
