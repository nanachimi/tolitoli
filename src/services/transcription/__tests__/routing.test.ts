import { TRANSCRIPTION_LANGUAGES, requiresCloud } from '../languages';
import { routeTranscription } from '../routing';

const NO_LOCAL_ENGINE = ['wo', 'ig', 'pcm', 'zu', 'lg'];

describe('routeTranscription (rules 1 and 5; 2 to 4 at step 8)', () => {
  it.each(TRANSCRIPTION_LANGUAGES.filter((language) => !requiresCloud(language.code)))(
    'rule 1: cloud disabled, $code goes to Whisper on the device',
    ({ code }) => {
      expect(routeTranscription({ language: code, cloudEnabled: false, online: true })).toEqual({
        kind: 'local',
      });
    },
  );

  it.each(NO_LOCAL_ENGINE)(
    'cloud disabled, %s has no engine on the device: cloud required, never local',
    (code) => {
      expect(
        routeTranscription({
          language: code as (typeof TRANSCRIPTION_LANGUAGES)[number]['code'],
          cloudEnabled: false,
          online: true,
        }),
      ).toEqual({ kind: 'cloud-required' });
    },
  );

  it('rule 5: offline, Whisper on the device', () => {
    expect(routeTranscription({ language: 'fr', cloudEnabled: true, online: false })).toEqual({
      kind: 'local',
    });
  });

  it('offline, a language without a local engine still asks for the cloud', () => {
    expect(routeTranscription({ language: 'wo', cloudEnabled: false, online: false })).toEqual({
      kind: 'cloud-required',
    });
  });
});
