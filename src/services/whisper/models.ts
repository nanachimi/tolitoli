/**
 * On-device Whisper models (step 3): XNNPACK fp32, multilingual, exported by Software Mansion
 * for react-native-executorch 0.10. Host: Hugging Face Inc. (owner's answer C), its files served
 * by AWS. Each URL is pinned to a commit of its repository, not to a movable tag, and each file
 * is checked against its size and SHA-256 before use: nobody can swap a model under our feet.
 * Sizes and digests read on 23 October 2026 (HEAD `x-linked-*`, and SHA-256 recomputed on the
 * downloaded files for tiny and base; small's from its `x-linked-etag`, the same field that
 * matched the recomputed digests of the other two).
 */

export type LocalModelId = 'tiny' | 'base' | 'small';

export const LOCAL_MODEL_IDS: readonly LocalModelId[] = ['tiny', 'base', 'small'];

export type ModelFile = { url: string; bytes: number; sha256: string };

export type LocalModel = {
  id: LocalModelId;
  whisper: ModelFile;
  tokenizer: ModelFile;
  /** FSMN voice activity detection: it cuts the audio into segments (segmenter.ts). */
  vad: ModelFile;
};

const HF = 'https://huggingface.co/software-mansion/react-native-executorch';
const TINY_COMMIT = '4b12c1e9d4e0404743ca820e6414e903402ab113';
const BASE_COMMIT = '8804dc6eb60448c91161513b47d0cf5da4955430';
const SMALL_COMMIT = '6173e6b4646c73192f2d031535c2a61ca947c205';
const VAD_COMMIT = '5c31b30fe998c798adde26e8cb8ce0a28fa839e3';

const TOKENIZER = {
  bytes: 2_480_466,
  sha256: '27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566',
};

const VAD: ModelFile = {
  url: `${HF}-fsmn-vad/resolve/${VAD_COMMIT}/xnnpack/fsmn_vad_xnnpack_fp32.pte`,
  bytes: 1_827_808,
  sha256: '9158ab9c3e4986cd213983cae8124e4493d2db54771dec37511a8105251fe2c8',
};

export const LOCAL_MODELS: Record<LocalModelId, LocalModel> = {
  tiny: {
    id: 'tiny',
    whisper: {
      url: `${HF}-whisper-tiny/resolve/${TINY_COMMIT}/xnnpack/whisper_tiny_xnnpack_fp32.pte`,
      bytes: 232_609_280,
      sha256: 'efad9b1c482dfe59e9496cb0fde5d46d5c1524973667469584a8ba156d35689c',
    },
    tokenizer: { url: `${HF}-whisper-tiny/resolve/${TINY_COMMIT}/tokenizer.json`, ...TOKENIZER },
    vad: VAD,
  },
  base: {
    id: 'base',
    whisper: {
      url: `${HF}-whisper-base/resolve/${BASE_COMMIT}/xnnpack/whisper_base_xnnpack_fp32.pte`,
      bytes: 398_650_240,
      sha256: 'e74f8407a3a411ccac5f9dffd7b3199149028e1ea6b05567e346ed1d77237b42',
    },
    tokenizer: { url: `${HF}-whisper-base/resolve/${BASE_COMMIT}/tokenizer.json`, ...TOKENIZER },
    vad: VAD,
  },
  small: {
    id: 'small',
    whisper: {
      url: `${HF}-whisper-small/resolve/${SMALL_COMMIT}/xnnpack/whisper_small_xnnpack_fp32.pte`,
      bytes: 1_128_717_824,
      sha256: 'f069b9ba7868c636404da12b6fdf1422ec9de689bd53afc5ef94a123c503690f',
    },
    tokenizer: { url: `${HF}-whisper-small/resolve/${SMALL_COMMIT}/tokenizer.json`, ...TOKENIZER },
    vad: VAD,
  },
};

export function modelFiles(model: LocalModel): ModelFile[] {
  return [model.whisper, model.tokenizer, model.vad];
}

/** Bytes to download for a model: what the onboarding and the Library announce. */
export function modelBytes(id: LocalModelId): number {
  return modelFiles(LOCAL_MODELS[id]).reduce((total, file) => total + file.bytes, 0);
}

export function isLocalModelId(value: string | null | undefined): value is LocalModelId {
  return LOCAL_MODEL_IDS.includes(value as LocalModelId);
}
