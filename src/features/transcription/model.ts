import { File } from 'expo-file-system';
import * as Network from 'expo-network';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import { settingsStorage as Storage } from '@/features/settings/storage';
import { ModelDownloader, type ModelPaths, type ModelState } from '@/services/whisper/download';
import { isLocalModelId, modelBytes, type LocalModelId } from '@/services/whisper/models';

import { fetchModelFiles } from './executorch';

/**
 * Model the app downloads. Provisional: the default is chosen by the owner once tiny and base
 * are measured on the A05 (docs/plans/step-3.md, D-037).
 */
export const LOCAL_MODEL: LocalModelId = 'tiny';
export const MODEL_BYTES = modelBytes(LOCAL_MODEL);

/** The verified model: `{ model, paths }`. Step 1c's simulated "model.status" is ignored. */
export const MODEL_STORAGE_KEY = 'model.local';

function fileOf(path: string): File {
  return new File(path.startsWith('file://') ? path : `file://${path}`);
}

/** Set right below: the downloader reports its first state while the store is being created. */
let store: UseBoundStore<StoreApi<ModelState>> | undefined;

const downloader = new ModelDownloader(
  {
    fetch: fetchModelFiles,
    sha256: (path) => fileOf(path).digest('SHA-256'),
    size: (path) => {
      const file = fileOf(path);
      return file.exists ? file.size : null;
    },
    remove: (path) => {
      const file = fileOf(path);
      if (file.exists) file.delete();
    },
    network: {
      isWifi: async () => {
        const { type } = await Network.getNetworkStateAsync();
        return type === Network.NetworkStateType.WIFI || type === Network.NetworkStateType.ETHERNET;
      },
      onChange: (listener) => {
        const subscription = Network.addNetworkStateListener(() => listener());
        return () => subscription.remove();
      },
    },
    saved: {
      load: () => {
        try {
          const value = JSON.parse(Storage.getItemSync(MODEL_STORAGE_KEY) ?? 'null') as {
            model?: string;
            paths?: ModelPaths;
          } | null;
          return value && isLocalModelId(value.model) && value.paths
            ? { model: value.model, paths: value.paths }
            : null;
        } catch {
          return null;
        }
      },
      save: (value) => {
        if (value) Storage.setItemSync(MODEL_STORAGE_KEY, JSON.stringify(value));
        else Storage.removeItemSync(MODEL_STORAGE_KEY);
      },
    },
    onState: (state) => store?.setState(state, true),
    log: (...args) => console.log('[model]', ...args),
  },
  LOCAL_MODEL,
);

/** The local Whisper model on the device: what the onboarding, the Library and the queue read. */
export const useModel = create<ModelState>(() => downloader.restore());
store = useModel;

/** Wi-Fi only unless the user asks for mobile data; resumes a download put off earlier. */
export function startModelDownload(options: { mobileData?: boolean } = {}): void {
  void downloader.start(options);
}

/** "Plus tard": the download stops, its partial files kept for the next start. */
export function cancelModelDownload(): void {
  downloader.pause();
}

/** Verified paths of the ready model, or null. */
export function readyModel(): { id: LocalModelId; paths: ModelPaths } | null {
  const state = useModel.getState();
  return state.status === 'ready' && state.paths ? { id: state.model, paths: state.paths } : null;
}
