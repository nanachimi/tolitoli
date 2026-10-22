import { act, screen, userEvent } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import { BackHandler, I18nManager } from 'react-native';

import OnboardingScreen from '../../app/onboarding';
import {
  acceptConsent,
  consentAcceptedAt,
  isOnboardingDone,
  useOnboarding,
} from '@/features/onboarding/onboarding';
import {
  cancelModelDownload,
  SIMULATED_DOWNLOAD_MS,
  useModel,
} from '@/features/transcription/model';
import { i18next } from '@/i18n';

import { hardCodedTexts, usePseudoLocale } from '../../src/ui/__tests__/support';
import { renderScreen } from './renderScreen';

beforeEach(async () => {
  Storage.clearSync();
  useOnboarding.setState({ done: false });
  useModel.setState({ status: 'missing', progress: 0 });
  await i18next.changeLanguage('fr');
});

afterEach(() => {
  cancelModelDownload();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function toConsent() {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Continuer' }));
  return user;
}

describe('Onboarding', () => {
  it('asks for the consent before anything, and keeps it for good', async () => {
    jest.useFakeTimers();
    await renderScreen(<OnboardingScreen />);
    const user = await toConsent();
    expect(screen.getByRole('header', { name: 'Avant d’enregistrer' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Accepter et continuer' })).toBeDisabled();
    expect(consentAcceptedAt()).toBeNull();

    await user.press(screen.getByRole('checkbox'));
    await user.press(screen.getByRole('button', { name: 'Accepter et continuer' }));
    expect(consentAcceptedAt()).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Téléchargement…' })).toBeDisabled();
  });

  it('starts the app once the simulated download ends', async () => {
    jest.useFakeTimers();
    acceptConsent();
    await renderScreen(<OnboardingScreen />);
    await act(() => jest.advanceTimersByTimeAsync(SIMULATED_DOWNLOAD_MS));
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole('button', { name: 'Commencer' }));
    expect(isOnboardingDone()).toBe(true);
    expect(useOnboarding.getState().done).toBe(true);
  });

  it('lets the download wait', async () => {
    acceptConsent();
    await renderScreen(<OnboardingScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Télécharger plus tard' }));
    expect(isOnboardingDone()).toBe(true);
    expect(useModel.getState().status).toBe('missing');
  });

  it('goes back from the consent to the promise with the system back button', async () => {
    type Handler = Parameters<typeof BackHandler.addEventListener>[1];
    const handlers: Handler[] = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      handlers.push(handler);
      return { remove: () => handlers.splice(handlers.indexOf(handler), 1) };
    });
    await renderScreen(<OnboardingScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Continuer' }));
    let handled: boolean | null | undefined;
    await act(async () => {
      handled = handlers.at(-1)?.({} as Parameters<Handler>[0]);
    });
    expect(handled).toBe(true);
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeOnTheScreen();
  });

  it('renders the consent in Arabic', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await i18next.changeLanguage('ar');
    await renderScreen(<OnboardingScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: /.+/ }));
    expect(screen.getByRole('checkbox')).toBeOnTheScreen();
  });

  it('has no hard-coded text on any page (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(<OnboardingScreen />);
    expect(hardCodedTexts()).toEqual([]);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button'));
    expect(hardCodedTexts()).toEqual([]);
    await user.press(screen.getByRole('checkbox'));
    await user.press(screen.getAllByRole('button').at(-1)!);
    expect(hardCodedTexts()).toEqual([]);
  });
});
