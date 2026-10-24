import { settingsStorage as Storage } from '@/features/settings/storage';
import { modelBytes } from '@/services/whisper/models';

describe('local model store', () => {
  beforeEach(() => {
    jest.resetModules();
    Storage.clearSync();
  });

  it('ignores the simulated "ready" of step 1c: the real model is still missing', () => {
    Storage.setItemSync('model.status', 'ready');
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module registry
      const { useModel, readyModel } = require('../model');
      expect(useModel.getState()).toMatchObject({ status: 'missing', progress: 0 });
      expect(readyModel()).toBeNull();
    });
  });

  it('announces the real size of the chosen model', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module registry
      const { selectedModelBytes, selectedModel } = require('../model');
      expect(selectedModelBytes()).toBe(modelBytes(selectedModel()));
    });
  });

  /** The model store and the key-value store of one fresh module registry. */
  function fresh(before?: (storage: typeof Storage) => void) {
    let loaded!: typeof import('../model') & { storage: typeof Storage };
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module registry
      const storage = require('@/features/settings/storage').settingsStorage as typeof Storage;
      before?.(storage);
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module registry
      loaded = { ...(require('../model') as typeof import('../model')), storage };
    });
    return loaded;
  }

  it('gives base by default, and remembers another choice', () => {
    const model = fresh();
    expect(model.selectedModel()).toBe('base');
    model.selectModel('small');
    expect(model.selectedModel()).toBe('small');
    expect(model.storage.getItemSync('model.selected')).toBe('small');
  });

  it('starts on the remembered choice', () => {
    const model = fresh((storage) => storage.setItemSync('model.selected', 'small'));
    expect(model.selectedModel()).toBe('small');
    expect(model.useModel.getState().model).toBe('small');
  });

  it('keeps the model already on the phone when nothing was chosen (no forced download)', () => {
    const model = fresh((storage) =>
      storage.setItemSync(
        'model.local',
        JSON.stringify({ model: 'tiny', paths: { whisper: '/w', tokenizer: '/t', vad: '/v' } }),
      ),
    );
    expect(model.selectedModel()).toBe('tiny');
  });

  it('reads the tiny model downloaded before the model choice', () => {
    const model = fresh((storage) => {
      storage.setItemSync(
        'model.local',
        JSON.stringify({ model: 'tiny', paths: { whisper: '/w', tokenizer: '/t', vad: '/v' } }),
      );
      storage.setItemSync('model.selected', 'tiny');
    });
    // Jest has no file on disk: "missing" here, but the old entry is read, without a crash or
    // a reset of the choice.
    expect(model.useModel.getState()).toMatchObject({ model: 'tiny', status: 'missing' });
  });
});
