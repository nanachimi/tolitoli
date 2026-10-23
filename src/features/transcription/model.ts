import { File } from 'expo-file-system';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

import { settingsStorage as Storage } from '@/features/settings/storage';
import { defaultModel, parseMemTotal } from '@/services/whisper/capability';
import { ModelDownloader, type ModelPaths, type ModelState } from '@/services/whisper/download';
import {
  isLocalModelId,
  LOCAL_MODEL_IDS,
  modelBytes,
  type LocalModelId,
} from '@/services/whisper/models';

import { fetchModelFiles } from './executorch';

/** The model the user chose; absent, the default for this phone (capability.ts). */
export const MODEL_SELECTION_STORAGE_KEY = 'model.selected';

/** The verified files of one model: `{ model, paths }`. */
export function modelStorageKey(model: LocalModelId): string {
  return `model.local.${model}`;
}

/** Before the model choice, one key held the only model (tiny); its files are kept as such. */
export const LEGACY_MODEL_STORAGE_KEY = 'model.local';

function fileOf(path: string): File {
  return new File(path.startsWith('file://') ? path : `file://${path}`);
}

/** Total memory of the phone (Android: /proc/meminfo, readable by any app); null on iOS. */
function readDeviceMemory(): number | null {
  if (Platform.OS !== 'android') return null;
  try {
    return parseMemTotal(new File('file:///proc/meminfo').textSync());
  } catch {
    return null;
  }
}

export const DEVICE_MEMORY_BYTES = readDeviceMemory();

/** base unless this phone is known not to run it (owner, step 3). */
export const DEFAULT_MODEL = defaultModel(DEVICE_MEMORY_BYTES);

function storedSelection(): LocalModelId {
  const value = Storage.getItemSync(MODEL_SELECTION_STORAGE_KEY);
  return isLocalModelId(value) ? value : DEFAULT_MODEL;
}

function loadSaved(model: LocalModelId): { model: LocalModelId; paths: ModelPaths } | null {
  for (const key of [modelStorageKey(model), LEGACY_MODEL_STORAGE_KEY]) {
    try {
      const value = JSON.parse(Storage.getItemSync(key) ?? 'null') as {
        model?: string;
        paths?: ModelPaths;
      } | null;
      if (value?.model === model && value.paths) return { model, paths: value.paths };
    } catch {
      // A damaged entry counts as no model: it is downloaded again.
    }
  }
  return null;
}

/** Set right below: a downloader reports its first state while the store is being created. */
let store: UseBoundStore<StoreApi<ModelState>> | undefined;
let current: LocalModelId = storedSelection();
const downloaders = new Map<LocalModelId, ModelDownloader>();

function downloaderFor(model: LocalModelId): ModelDownloader {
  const existing = downloaders.get(model);
  if (existing) return existing;
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
          return (
            type === Network.NetworkStateType.WIFI || type === Network.NetworkStateType.ETHERNET
          );
        },
        onChange: (listener) => {
          const subscription = Network.addNetworkStateListener(() => listener());
          return () => subscription.remove();
        },
      },
      saved: {
        load: () => loadSaved(model),
        save: (value) => {
          if (value) Storage.setItemSync(modelStorageKey(model), JSON.stringify(value));
          else Storage.removeItemSync(modelStorageKey(model));
          Storage.removeItemSync(LEGACY_MODEL_STORAGE_KEY);
        },
      },
      onState: (state) => {
        if (model !== current) return;
        store?.setState(state, true);
        if (state.status === 'ready') removeOtherModels(model);
      },
      log: (...args) => console.log('[model]', model, ...args),
    },
    model,
  );
  downloaders.set(model, downloader);
  return downloader;
}

/**
 * Once a model is verified, the others leave the phone (233 MB to 1.1 GB each). The voice
 * detector is the same file for all of them and stays.
 */
function removeOtherModels(kept: LocalModelId): void {
  const keptPaths = loadSaved(kept)?.paths;
  for (const model of LOCAL_MODEL_IDS) {
    if (model === kept) continue;
    const saved = loadSaved(model);
    if (!saved) continue;
    for (const path of [saved.paths.whisper, saved.paths.tokenizer]) {
      if (path !== keptPaths?.tokenizer && path !== keptPaths?.vad) {
        const file = fileOf(path);
        if (file.exists) file.delete();
      }
    }
    Storage.removeItemSync(modelStorageKey(model));
    console.log('[model] removed', model);
  }
}

/** The local Whisper model on the device: what the onboarding, the Library and the queue read. */
export const useModel = create<ModelState>(() => downloaderFor(current).restore());
store = useModel;

/** The model chosen in the settings, for the screens. */
export const useSelectedModel = create<{ model: LocalModelId }>(() => ({ model: current }));

export function selectedModel(): LocalModelId {
  return current;
}

/**
 * Another model: the current download stops, the new one is checked on the phone and, if
 * absent, downloaded (Wi-Fi only by default). The previous model leaves once the new one is
 * verified, so that transcription never stays without a model meanwhile.
 */
export function selectModel(model: LocalModelId): void {
  if (model === current) return;
  downloaderFor(current).pause();
  current = model;
  Storage.setItemSync(MODEL_SELECTION_STORAGE_KEY, model);
  useSelectedModel.setState({ model });
  const state = downloaderFor(model).restore();
  useModel.setState(state, true);
  if (state.status === 'ready') removeOtherModels(model);
  else startModelDownload();
}

/** Wi-Fi only unless the user asks for mobile data; resumes a download put off earlier. */
export function startModelDownload(options: { mobileData?: boolean } = {}): void {
  void downloaderFor(current).start(options);
}

/** "Plus tard": the download stops, its partial files kept for the next start. */
export function cancelModelDownload(): void {
  downloaderFor(current).pause();
}

/** Bytes to download for the chosen model. */
export function selectedModelBytes(): number {
  return modelBytes(current);
}

/** Verified paths of the ready model, or null. */
export function readyModel(): { id: LocalModelId; paths: ModelPaths } | null {
  const state = useModel.getState();
  return state.status === 'ready' && state.paths ? { id: state.model, paths: state.paths } : null;
}
