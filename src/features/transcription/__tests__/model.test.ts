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
      const { useModel, readyModel } = require('../model');
      expect(useModel.getState()).toMatchObject({ status: 'missing', progress: 0 });
      expect(readyModel()).toBeNull();
    });
  });

  it('announces the real size of the model', () => {
    jest.isolateModules(() => {
      const { MODEL_BYTES, LOCAL_MODEL } = require('../model');
      expect(MODEL_BYTES).toBe(modelBytes(LOCAL_MODEL));
    });
  });
});
