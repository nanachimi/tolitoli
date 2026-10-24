import { openTestLibrary } from '../../../db/__tests__/testLibrary';
import { getLibrary, openLibrary, setLibraryOpener } from '@/features/library/library';
import { initI18n } from '@/i18n';

jest.mock('../model', () => ({
  readyModel: () => ({ id: 'tiny', paths: { whisper: '/w', tokenizer: '/t', vad: '/v' } }),
  selectedModel: () => 'tiny',
  useModel: { subscribe: () => () => {} },
}));

// eslint-disable-next-line import/first -- after the model mock
import { startTranscription, transcriptionQueue } from '../transcription';

initI18n();

describe('startTranscription at launch', () => {
  beforeAll(async () => {
    setLibraryOpener(async (choice) => openTestLibrary(choice));
    await openLibrary();
  });

  it('resumes a transcription that waited for a model already there, drafts kept', () => {
    const library = getLibrary();
    library.createRecording({ id: 'rec', createdAt: new Date().toISOString() });
    library.finalizeRecording('rec', {
      audioPath: 'rec.m4a',
      audioSize: 1,
      audioFormat: 'm4a',
      durationMs: 60_000,
      recovered: false,
    });
    library.queueTranscription('rec', { language: 'fr', engine: 'local', model: 'tiny' });
    library.startTranscription('rec');
    library.saveDraft('rec', { startMs: 0, endMs: 3000, text: 'Un' }, 3000);
    library.failTranscription('rec', 'model-missing');

    const start = jest.spyOn(transcriptionQueue, 'start').mockImplementation(() => {});
    startTranscription();
    expect(start).toHaveBeenCalled();
    expect(library.get('rec')).toMatchObject({ state: 'transcribing', waiting: true });
    expect(library.get('rec')?.issue).toBeUndefined();
    expect(library.transcriptionCheckpoint('rec').cursorMs).toBe(3000);
  });
});
