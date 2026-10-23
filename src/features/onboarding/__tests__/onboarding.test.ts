import Storage from 'expo-sqlite/kv-store';

import {
  acceptConsent,
  consentAcceptedAt,
  finishOnboarding,
  firstOnboardingPage,
  isOnboardingDone,
} from '../onboarding';

beforeEach(() => {
  Storage.clearSync();
});

describe('onboarding state', () => {
  it('starts at the promise, with nothing accepted', () => {
    expect(consentAcceptedAt()).toBeNull();
    expect(isOnboardingDone()).toBe(false);
    expect(firstOnboardingPage()).toBe(1);
  });

  it('keeps the first acceptance date for good', () => {
    acceptConsent(new Date('2026-10-22T10:00:00Z'));
    acceptConsent(new Date('2026-10-23T10:00:00Z'));
    expect(consentAcceptedAt()).toBe('2026-10-22T10:00:00.000Z');
  });

  it('resumes at the model page once consent is acquired', () => {
    acceptConsent();
    expect(firstOnboardingPage()).toBe(3);
  });

  it('never finishes without the consent', () => {
    expect(() => finishOnboarding()).toThrow();
    expect(isOnboardingDone()).toBe(false);
    acceptConsent();
    finishOnboarding();
    expect(isOnboardingDone()).toBe(true);
  });
});
