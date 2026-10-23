import { router, useLocalSearchParams } from 'expo-router';

import { RecordingDetail } from '@/features/library/RecordingDetail';
import { Screen } from '@/ui';

export default function RecordingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <RecordingDetail id={id} onBack={() => router.back()} />
    </Screen>
  );
}
