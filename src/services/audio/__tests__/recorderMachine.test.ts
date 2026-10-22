import {
  canTransition,
  isCapturing,
  transition,
  type RecorderEvent,
  type RecorderStatus,
} from '../recorderMachine';

const STATUSES: RecorderStatus[] = [
  'idle',
  'preparing',
  'recording',
  'paused',
  'interrupted',
  'stopping',
  'local',
  'error',
];
const EVENTS: RecorderEvent[] = [
  'PREPARE',
  'STARTED',
  'PAUSE',
  'RESUME',
  'INTERRUPTION_BEGAN',
  'STOP',
  'STOPPED',
  'FAILED',
  'RESET',
];

const ALLOWED: [RecorderStatus, RecorderEvent, RecorderStatus][] = [
  ['idle', 'PREPARE', 'preparing'],
  ['preparing', 'STARTED', 'recording'],
  ['preparing', 'FAILED', 'error'],
  ['recording', 'PAUSE', 'paused'],
  ['recording', 'INTERRUPTION_BEGAN', 'interrupted'],
  ['recording', 'STOP', 'stopping'],
  ['recording', 'FAILED', 'error'],
  ['paused', 'RESUME', 'recording'],
  ['paused', 'INTERRUPTION_BEGAN', 'paused'],
  ['paused', 'STOP', 'stopping'],
  ['paused', 'FAILED', 'error'],
  ['interrupted', 'RESUME', 'recording'],
  ['interrupted', 'STOP', 'stopping'],
  ['interrupted', 'FAILED', 'error'],
  ['stopping', 'STOPPED', 'local'],
  ['stopping', 'FAILED', 'error'],
  ['local', 'RESET', 'idle'],
  ['error', 'RESET', 'idle'],
];

describe('recorder state machine', () => {
  it.each(ALLOWED)('%s --%s--> %s', (from, event, to) => {
    expect(transition(from, event)).toBe(to);
  });

  it('rejects every other transition', () => {
    const allowed = new Set(ALLOWED.map(([from, event]) => `${from}/${event}`));
    for (const status of STATUSES) {
      for (const event of EVENTS) {
        if (allowed.has(`${status}/${event}`)) continue;
        expect(transition(status, event)).toBeNull();
        expect(canTransition(status, event)).toBe(false);
      }
    }
  });

  it('never resumes by itself after an interruption', () => {
    expect(transition('interrupted', 'STARTED')).toBeNull();
  });

  it('flags capturing statuses', () => {
    expect(STATUSES.filter(isCapturing)).toEqual(['recording', 'paused']);
  });
});
