import {
  findTranscriptionLanguage,
  isTranscriptionLanguageCode,
  requiresCloud,
  TRANSCRIPTION_LANGUAGES,
} from '../languages';

describe('transcription languages (CLAUDE.md, Langues de transcription)', () => {
  it('lists the six major and the ten African languages, once each', () => {
    const codes = TRANSCRIPTION_LANGUAGES.map((language) => language.code);
    expect(codes).toHaveLength(16);
    expect(new Set(codes).size).toBe(16);
  });

  it('transcribes the major languages locally in good quality', () => {
    for (const code of ['fr', 'en', 'de', 'ru', 'zh', 'ar']) {
      expect(findTranscriptionLanguage(code)?.localQuality).toBe('good');
    }
  });

  it('gives Swahili, Hausa and Yoruba a draft local quality, Lingala and Malagasy a medium one', () => {
    expect(['sw', 'ha', 'yo'].map((c) => findTranscriptionLanguage(c)?.localQuality)).toEqual([
      'draft',
      'draft',
      'draft',
    ]);
    expect(['ln', 'mg'].map((c) => findTranscriptionLanguage(c)?.localQuality)).toEqual([
      'medium',
      'medium',
    ]);
  });

  it('requires the cloud for exactly igbo, pidgin, zulu, luganda and wolof', () => {
    const cloudOnly = TRANSCRIPTION_LANGUAGES.filter((language) => requiresCloud(language.code));
    expect(cloudOnly.map((language) => language.code).sort()).toEqual(
      ['ig', 'lg', 'pcm', 'wo', 'zu'].sort(),
    );
  });

  it('recognises valid codes only', () => {
    expect(isTranscriptionLanguageCode('wo')).toBe(true);
    expect(isTranscriptionLanguageCode('zh-Hans')).toBe(false);
    expect(isTranscriptionLanguageCode(null)).toBe(false);
  });
});
