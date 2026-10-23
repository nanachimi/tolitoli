import { settingsStorage as Storage } from '@/features/settings/storage';
import { create } from 'zustand';

/**
 * Onboarding state, kept for good on the device. The consent text itself
 * (i18n `onboarding.consent.*`) is a DRAFT: à faire relire par un juriste avant
 * publication (CLAUDE.md, « Ce que Claude Code ne doit pas faire »).
 */
export const CONSENT_STORAGE_KEY = 'onboarding.consentAcceptedAt';
export const ONBOARDING_DONE_STORAGE_KEY = 'onboarding.done';

export type OnboardingPageNumber = 1 | 2 | 3;

/** When the user accepted the recording consent, or null. */
export function consentAcceptedAt(): string | null {
  return Storage.getItemSync(CONSENT_STORAGE_KEY);
}

export function acceptConsent(now: Date = new Date()): void {
  if (consentAcceptedAt() === null) Storage.setItemSync(CONSENT_STORAGE_KEY, now.toISOString());
}

export function isOnboardingDone(): boolean {
  return Storage.getItemSync(ONBOARDING_DONE_STORAGE_KEY) === 'yes';
}

/** Read by the root layout's protected routes, so finishing opens the app at once. */
export const useOnboarding = create<{ done: boolean }>(() => ({ done: isOnboardingDone() }));

/** Only once the consent is accepted: the app never opens without it. */
export function finishOnboarding(): void {
  if (consentAcceptedAt() === null) throw new Error('Consent not accepted');
  Storage.setItemSync(ONBOARDING_DONE_STORAGE_KEY, 'yes');
  useOnboarding.setState({ done: true });
}

/** A launch cut on the model page resumes there: the consent stays acquired. */
export function firstOnboardingPage(): OnboardingPageNumber {
  return consentAcceptedAt() === null ? 1 : 3;
}
