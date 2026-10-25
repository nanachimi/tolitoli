import { AudioEncoder } from '../../../../modules/audio-encoder';
import { openTestLibrary } from '../../../db/__tests__/testLibrary';
import { getLibrary, openLibrary, setLibraryOpener } from '@/features/library/library';
import { initI18n } from '@/i18n';

jest.mock('../model', () => ({
  readyModel: () => ({ id: 'tiny', paths: { whisper: '/w', tokenizer: '/t', vad: '/v' } }),
  selectedModel: () => 'tiny',
  useModel: { subscribe: () => () => {} },
}));

const mockWhisper = {
  transcribe: jest.fn(async () => 'Bonjour'),
  stop: jest.fn(),
  dispose: jest.fn(),
};
const mockVad = { detect: jest.fn(async () => [{ startMs: 0, endMs: 1000 }]), dispose: jest.fn() };

jest.mock('../executorch', () => ({
  WhisperLocal: { load: jest.fn(async () => mockWhisper) },
  FsmnDetector: { load: jest.fn(async () => mockVad) },
}));

// eslint-disable-next-line import/first -- after the mocks
import { transcriptionQueue } from '../transcription';

initI18n();

describe('the local models once the queue has nothing left', () => {
  beforeAll(async () => {
    setLibraryOpener(async (choice) => openTestLibrary(choice));
    await openLibrary();
  });

  it('leave memory when the last transcription is done', async () => {
    // One second of audio: a single, last window.
    jest
      .mocked(AudioEncoder.decodePcm)
      .mockResolvedValue(new Uint8Array(new Float32Array(16_000).buffer));
    const library = getLibrary();
    library.createRecording({ id: 'rec', createdAt: new Date().toISOString() });
    library.finalizeRecording('rec', {
      audioPath: 'rec.m4a',
      audioSize: 1,
      audioFormat: 'm4a',
      durationMs: 1000,
      recovered: false,
    });
    library.queueTranscription('rec', { language: 'fr', engine: 'local', model: 'tiny' });

    transcriptionQueue.kick();
    await transcriptionQueue.idle();

    expect(mockWhisper.transcribe).toHaveBeenCalled();
    expect(library.get('rec')?.state).toBe('transcribed');
    expect(mockWhisper.dispose).toHaveBeenCalledTimes(1);
    expect(mockVad.dispose).toHaveBeenCalledTimes(1);
  });
});
