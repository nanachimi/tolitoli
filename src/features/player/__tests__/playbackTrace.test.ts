import { PLAYBACK_TRACE, traceRender, traceStatus, traceTap } from '../playbackTrace';

describe('playback trace', () => {
  it('is inert unless the build sets EXPO_PUBLIC_PLAYBACK_TRACE', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(PLAYBACK_TRACE).toBe(false);
    traceTap('pause');
    for (let i = 0; i < 50; i += 1) {
      traceStatus(i * 100, true);
      traceRender('detail', 'update', 12);
    }
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
