import { settingsStorage as Storage } from '@/features/settings/storage';
import { DevSettings, I18nManager } from 'react-native';

import { i18next, initI18n, LANGUAGE_STORAGE_KEY, setUiLanguage } from '..';

describe('setUiLanguage', () => {
  let forceRTL: jest.SpyInstance;
  let reload: jest.SpyInstance;

  beforeAll(() => {
    initI18n();
  });

  beforeEach(async () => {
    await i18next.changeLanguage('fr');
    jest.replaceProperty(I18nManager, 'isRTL', false);
    forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => {});
    reload = jest.spyOn(DevSettings, 'reload').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('switches between LTR languages without reloading', async () => {
    await setUiLanguage('de');
    expect(i18next.language).toBe('de');
    expect(i18next.t('settings.title')).toBe('Einstellungen');
    expect(forceRTL).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('forces RTL and reloads when switching to Arabic', async () => {
    await setUiLanguage('ar');
    expect(forceRTL).toHaveBeenCalledWith(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('forces LTR and reloads when leaving Arabic', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await setUiLanguage('en');
    expect(forceRTL).toHaveBeenCalledWith(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('persists the choice', async () => {
    await setUiLanguage('wo');
    expect(Storage.getItemSync(LANGUAGE_STORAGE_KEY)).toBe('wo');
  });

  it('falls back from Traditional Chinese to Simplified, then English', () => {
    expect(i18next.t('tabs.settings', { lng: 'zh-Hant' })).toBe('设置');
  });
});
