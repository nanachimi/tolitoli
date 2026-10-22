import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { elapsedMs, formatDuration } from '@/services/audio/duration';
import { AppText } from '@/ui';

const TICK_MS = 250;

export function RecordingTimer({
  accumulatedMs,
  runningSince,
}: {
  accumulatedMs: number;
  runningSince: number | null;
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (runningSince === null) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [runningSince]);

  const duration = formatDuration(elapsedMs(accumulatedMs, runningSince, now));
  return (
    <AppText
      testID="i18n-data"
      accessibilityRole="timer"
      accessibilityLabel={t('record.timerA11y', { duration })}
      style={{ fontSize: 56, fontVariant: ['tabular-nums'], textAlign: 'center' }}
    >
      {duration}
    </AppText>
  );
}
