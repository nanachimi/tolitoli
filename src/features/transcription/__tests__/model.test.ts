import { settingsStorage as Storage } from '@/features/settings/storage';

import {
  cancelModelDownload,
  MODEL_STORAGE_KEY,
  SIMULATED_DOWNLOAD_MS,
  startModelDownload,
  useModel,
} from '../model';

beforeEach(() => {
  jest.useFakeTimers();
  Storage.clearSync();
  useModel.setState({ status: 'missing', progress: 0 });
});

afterEach(() => {
  cancelModelDownload();
  jest.useRealTimers();
});

describe('simulated model download', () => {
  it('moves from missing to ready, and remembers it', () => {
    startModelDownload();
    expect(useModel.getState().status).toBe('downloading');
    jest.advanceTimersByTime(SIMULATED_DOWNLOAD_MS / 2);
    expect(useModel.getState().progress).toBeCloseTo(0.5);
    jest.advanceTimersByTime(SIMULATED_DOWNLOAD_MS);
    expect(useModel.getState()).toEqual({ status: 'ready', progress: 1 });
    expect(Storage.getItemSync(MODEL_STORAGE_KEY)).toBe('ready');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('goes back to missing when put off', () => {
    startModelDownload();
    jest.advanceTimersByTime(1000);
    cancelModelDownload();
    expect(useModel.getState()).toEqual({ status: 'missing', progress: 0 });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not start twice', () => {
    startModelDownload();
    startModelDownload();
    expect(jest.getTimerCount()).toBe(1);
  });
});
