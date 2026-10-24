/**
 * The foreground service follows the queue's activity, one operation at a time, ending on the
 * last wish: a "stop" that arrives while "start" is still under way is not lost (step 3, the
 * service was left running with its wake lock and no work after such a race).
 */
export function createServiceSwitch(ops: {
  start(): Promise<void>;
  stop(): Promise<void>;
  log?(...args: unknown[]): void;
}) {
  let wanted = false;
  let running = false;
  let chain: Promise<void> = Promise.resolve();

  const settle = async () => {
    if (wanted && !running) {
      try {
        await ops.start();
        running = true;
      } catch (error) {
        // In the background Android refuses: the queue goes on while the process lives.
        ops.log?.('foreground service not started', String(error));
      }
    } else if (!wanted && running) {
      running = false;
      await ops
        .stop()
        .catch((error: unknown) => ops.log?.('foreground service not stopped', String(error)));
    }
  };

  return {
    set(on: boolean): Promise<void> {
      wanted = on;
      chain = chain.then(settle).then(settle);
      return chain;
    },
    get running(): boolean {
      return running;
    },
  };
}
