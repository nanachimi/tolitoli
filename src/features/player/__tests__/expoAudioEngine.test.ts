import { createAudioPlayer } from 'expo-audio';

import { ExpoAudioPlaybackEngine, STATUS_INTERVAL_MS } from '../expoAudioEngine';

type StatusListener = (status: Record<string, unknown>) => void;

let mockStatusListener: StatusListener | null = null;

const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(async () => undefined),
  setPlaybackRate: jest.fn(),
  remove: jest.fn(),
  removeSubscription: jest.fn(),
  addListener: jest.fn((_event: string, listener: StatusListener): { remove: () => void } => {
    mockStatusListener = listener;
    return { remove: mockPlayer.removeSubscription };
  }),
};

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(() => mockPlayer) }));

function status(change: Record<string, unknown>) {
  mockStatusListener?.({
    currentTime: 0,
    duration: 60,
    playing: false,
    didJustFinish: false,
    isLoaded: true,
    playbackRate: 1,
    ...change,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ExpoAudioPlaybackEngine', () => {
  it('loads the file with frequent status updates and the stored rate', () => {
    new ExpoAudioPlaybackEngine('file:///rec.m4a', 60_000, 1.5);
    expect(createAudioPlayer).toHaveBeenCalledWith(
      { uri: 'file:///rec.m4a' },
      { updateInterval: STATUS_INTERVAL_MS },
    );
    expect(mockPlayer.setPlaybackRate).toHaveBeenCalledWith(1.5);
  });

  it('follows the player: position, duration, playing', () => {
    const engine = new ExpoAudioPlaybackEngine('file:///rec.m4a', 59_000, 1);
    const listener = jest.fn();
    engine.subscribe(listener);
    status({ currentTime: 12.34, duration: 60.5, playing: true });
    expect(engine.status()).toEqual({
      positionMs: 12_340,
      durationMs: 60_500,
      playing: true,
      rate: 1,
    });
    expect(listener).toHaveBeenCalled();
  });

  it('plays, pauses, seeks within the file and changes rate', () => {
    const engine = new ExpoAudioPlaybackEngine('file:///rec.m4a', 60_000, 1);
    engine.play();
    engine.seek(90_000);
    expect(mockPlayer.seekTo).toHaveBeenLastCalledWith(60);
    engine.seek(-5);
    expect(mockPlayer.seekTo).toHaveBeenLastCalledWith(0);
    engine.setRate(2);
    engine.pause();
    expect(mockPlayer.play).toHaveBeenCalled();
    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(engine.status()).toMatchObject({ playing: false, rate: 2 });
  });

  it('stops at the end, and starts again from the beginning', () => {
    const engine = new ExpoAudioPlaybackEngine('file:///rec.m4a', 60_000, 1);
    status({ currentTime: 60, playing: false, didJustFinish: true });
    expect(engine.status()).toMatchObject({ positionMs: 60_000, playing: false });
    engine.play();
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
  });

  it('frees the native player on release', () => {
    const engine = new ExpoAudioPlaybackEngine('file:///rec.m4a', 60_000, 1);
    engine.release();
    expect(mockPlayer.removeSubscription).toHaveBeenCalled();
    expect(mockPlayer.remove).toHaveBeenCalled();
  });
});

describe('createEngine', () => {
  // Imported here so that the expo-audio mock above applies.
  const { createEngine } = jest.requireActual<typeof import('../usePlayback')>('../usePlayback');
  const { SimulatedPlaybackEngine } =
    jest.requireActual<typeof import('@/services/playback')>('@/services/playback');

  it('plays the file of a recording with expo-audio', () => {
    expect(createEngine(60_000, 'file:///rec.m4a')).toBeInstanceOf(ExpoAudioPlaybackEngine);
  });

  it('keeps the simulated clock for an item without a file (demo, development only)', () => {
    expect(createEngine(60_000, null)).toBeInstanceOf(SimulatedPlaybackEngine);
  });
});
