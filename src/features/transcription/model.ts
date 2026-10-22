import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

/** Order of size of a Whisper model; step 3 picks the real one and downloads it. */
export const SIMULATED_MODEL_BYTES = 233 * 1024 * 1024;
export const SIMULATED_DOWNLOAD_MS = 8000;
const TICK_MS = 200;

export const MODEL_STORAGE_KEY = 'model.status';

export type ModelStatus = 'missing' | 'downloading' | 'ready';

/** Local transcription model. Step 1c simulates the download: nothing is fetched. */
export const useModel = create<{ status: ModelStatus; progress: number }>(() =>
  Storage.getItemSync(MODEL_STORAGE_KEY) === 'ready'
    ? { status: 'ready', progress: 1 }
    : { status: 'missing', progress: 0 },
);

let timer: ReturnType<typeof setInterval> | null = null;

export function startModelDownload(): void {
  if (useModel.getState().status !== 'missing') return;
  useModel.setState({ status: 'downloading', progress: 0 });
  const step = TICK_MS / SIMULATED_DOWNLOAD_MS;
  timer = setInterval(() => {
    const progress = Math.min(1, useModel.getState().progress + step);
    if (progress < 1) {
      useModel.setState({ progress });
      return;
    }
    stopTimer();
    Storage.setItemSync(MODEL_STORAGE_KEY, 'ready');
    useModel.setState({ status: 'ready', progress: 1 });
  }, TICK_MS);
}

/** "Plus tard": the model stays missing and the Library offers it again. */
export function cancelModelDownload(): void {
  if (useModel.getState().status !== 'downloading') return;
  stopTimer();
  useModel.setState({ status: 'missing', progress: 0 });
}

function stopTimer(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}
