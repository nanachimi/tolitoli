import { createServiceSwitch } from '../serviceSwitch';

function slow() {
  const calls: string[] = [];
  let release: () => void = () => {};
  const ops = {
    start: () =>
      new Promise<void>((resolve) => {
        calls.push('start');
        release = resolve;
      }),
    stop: async () => {
      calls.push('stop');
    },
  };
  return { calls, ops, release: () => release() };
}

describe('foreground service switch', () => {
  it('stops in the end when "stop" comes while "start" is under way', async () => {
    const { calls, ops, release } = slow();
    const service = createServiceSwitch(ops);
    void service.set(true);
    for (let i = 0; i < 5 && calls.length === 0; i++) await Promise.resolve();
    expect(calls).toEqual(['start']);
    const done = service.set(false);
    release();
    await done;
    expect(calls).toEqual(['start', 'stop']);
    expect(service.running).toBe(false);
  });

  it('starts nothing when the wish is already gone', async () => {
    const { calls, ops } = slow();
    const service = createServiceSwitch(ops);
    void service.set(true);
    await service.set(false);
    expect(calls).toEqual([]);
  });

  it('starts once for repeated wishes, and stays up', async () => {
    const calls: string[] = [];
    const service = createServiceSwitch({
      start: async () => void calls.push('start'),
      stop: async () => void calls.push('stop'),
    });
    await Promise.all([service.set(true), service.set(true), service.set(true)]);
    expect(calls).toEqual(['start']);
    expect(service.running).toBe(true);
  });

  it('is not running when Android refuses to start it', async () => {
    const service = createServiceSwitch({
      start: async () => {
        throw new Error('ERR_BACKGROUND_START');
      },
      stop: async () => {},
    });
    await service.set(true);
    expect(service.running).toBe(false);
  });
});
