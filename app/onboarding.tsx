import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';

import {
  acceptConsent,
  finishOnboarding,
  firstOnboardingPage,
  type OnboardingPageNumber,
} from '@/features/onboarding/onboarding';
import { cancelModelDownload, startModelDownload, useModel } from '@/features/transcription/model';
import { OnboardingPage, Screen } from '@/ui';
import { modelBytes } from '@/services/whisper/models';
import { formatBytes } from '@/ui/format/display';

/** Model page: the real download, Wi-Fi only by default (step 3). */
function ModelPage({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const { status, progress, model } = useModel();
  const bytes = modelBytes(model);
  useEffect(() => startModelDownload(), []);
  const value = status === 'ready' ? 1 : progress;
  return (
    <OnboardingPage
      page={3}
      onNext={onDone}
      onLater={() => {
        cancelModelDownload();
        onDone();
      }}
      download={{
        value,
        done: value >= 1,
        doneSize: formatBytes(bytes * value, i18n.language, t),
        totalSize: formatBytes(bytes, i18n.language, t),
      }}
    />
  );
}

/** First launch: promise, recording consent (draft, à faire relire par un juriste), model. */
export default function OnboardingScreen() {
  const [page, setPage] = useState<OnboardingPageNumber>(firstOnboardingPage);
  const [accepted, setAccepted] = useState(false);

  // Back from the consent returns to the promise; after it, the consent stays acquired.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page !== 2) return false;
      setPage(1);
      return true;
    });
    return () => subscription.remove();
  }, [page]);

  return (
    <Screen>
      {page === 1 ? (
        <OnboardingPage page={1} onNext={() => setPage(2)} />
      ) : page === 2 ? (
        <OnboardingPage
          page={2}
          accepted={accepted}
          onToggleAccept={() => setAccepted((value) => !value)}
          onNext={() => {
            acceptConsent();
            setPage(3);
          }}
        />
      ) : (
        // The root layout's guard opens the Library as soon as it is done.
        <ModelPage onDone={finishOnboarding} />
      )}
    </Screen>
  );
}
