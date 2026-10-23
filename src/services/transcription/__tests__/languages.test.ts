import {
  isNotYetAvailable,
  isTranscriptionLanguageCode,
  localQualityFor,
  QUALITY_THRESHOLDS,
  qualityFromWer,
  requiresCloud,
  TRANSCRIPTION_LANGUAGES,
} from '../languages';

describe('transcription languages (CLAUDE.md, Langues de transcription)', () => {
  it('lists the six major and the ten African languages, once each', () => {
    const codes = TRANSCRIPTION_LANGUAGES.map((language) => language.code);
    expect(codes).toHaveLength(16);
    expect(new Set(codes).size).toBe(16);
  });

  it('derives the quality from the model, not only the language (owner, step 3)', () => {
    expect(localQualityFor('fr', 'tiny')).toBe('draft');
    expect(localQualityFor('fr', 'base')).toBe('medium');
    expect(localQualityFor('en', 'tiny')).toBe('good');
    expect(localQualityFor('wo', 'base')).toBeNull();
  });

  it('never calls a figure nobody measured better than draft', () => {
    expect(qualityFromWer(null)).toBe('draft');
  });

  it('shows no local quality where the device gives noise (owner, step 3)', () => {
    for (const code of ['sw', 'ha', 'yo', 'ln', 'mg'] as const) {
      expect(localQualityFor(code, 'small')).toBeNull();
    }
  });

  it('announces Lingala and Malagasy as not available yet, never hides them', () => {
    const notYet = TRANSCRIPTION_LANGUAGES.filter((language) => isNotYetAvailable(language.code));
    expect(notYet.map((language) => language.code)).toEqual(['ln', 'mg']);
  });

  it('cuts at the thresholds', () => {
    expect(qualityFromWer(QUALITY_THRESHOLDS.good - 0.1)).toBe('good');
    expect(qualityFromWer(QUALITY_THRESHOLDS.good)).toBe('medium');
    expect(qualityFromWer(QUALITY_THRESHOLDS.medium)).toBe('medium');
    expect(qualityFromWer(QUALITY_THRESHOLDS.medium + 0.1)).toBe('draft');
  });

  it('says where every local figure comes from', () => {
    for (const language of TRANSCRIPTION_LANGUAGES) {
      for (const estimate of Object.values(language.local ?? {})) {
        expect(['whisper-paper', 'tolitoli']).toContain(estimate.source);
      }
    }
  });

  it('requires the cloud for the eight African languages Intron covers', () => {
    const cloudOnly = TRANSCRIPTION_LANGUAGES.filter((language) => requiresCloud(language.code));
    expect(cloudOnly.map((language) => language.code).sort()).toEqual(
      ['ha', 'ig', 'lg', 'pcm', 'sw', 'wo', 'yo', 'zu'].sort(),
    );
  });

  it('recognises valid codes only', () => {
    expect(isTranscriptionLanguageCode('wo')).toBe(true);
    expect(isTranscriptionLanguageCode('zh-Hans')).toBe(false);
    expect(isTranscriptionLanguageCode(null)).toBe(false);
  });
});
