import { SQLiteStorage } from 'expo-sqlite/kv-store';

import { copyLegacySettings, LEGACY_COPIED_KEY } from '../storage';

describe('copyLegacySettings', () => {
  let n = 0;
  function stores() {
    n += 1;
    return { legacy: new SQLiteStorage(`legacy-${n}`), target: new SQLiteStorage(`target-${n}`) };
  }

  it('copies the settings of the legacy file, consent included', () => {
    const { legacy, target } = stores();
    legacy.setItemSync('onboarding.consentAcceptedAt', '2026-10-22T10:00:00.000Z');
    legacy.setItemSync('ui.language', 'wo');
    expect(copyLegacySettings(legacy, target).sort()).toEqual([
      'onboarding.consentAcceptedAt',
      'ui.language',
    ]);
    expect(target.getItemSync('onboarding.consentAcceptedAt')).toBe('2026-10-22T10:00:00.000Z');
    expect(target.getItemSync('ui.language')).toBe('wo');
  });

  it('never overwrites a value the app database already has, and runs once', () => {
    const { legacy, target } = stores();
    legacy.setItemSync('ui.language', 'wo');
    target.setItemSync('ui.language', 'ar');
    copyLegacySettings(legacy, target);
    expect(target.getItemSync('ui.language')).toBe('ar');
    legacy.setItemSync('player.rate', '1.5');
    expect(copyLegacySettings(legacy, target)).toEqual([]);
    expect(target.getItemSync('player.rate')).toBeNull();
  });

  it('leaves the legacy file as it is', () => {
    const { legacy, target } = stores();
    legacy.setItemSync('ui.language', 'wo');
    copyLegacySettings(legacy, target);
    expect(legacy.getAllKeysSync()).toEqual(['ui.language']);
  });

  it('marks a fresh install as done, without a legacy file', () => {
    const { target } = stores();
    expect(copyLegacySettings(null, target)).toEqual([]);
    expect(target.getItemSync(LEGACY_COPIED_KEY)).not.toBeNull();
  });
});
