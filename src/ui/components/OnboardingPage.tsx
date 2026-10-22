import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';

export type OnboardingPageProps =
  | { page: 1; onNext: () => void }
  | { page: 2; onNext: () => void; accepted: boolean; onToggleAccept: () => void }
  | {
      page: 3;
      onNext: () => void;
      /** Model download (simulated until step 3): fraction and sizes already formatted. */
      download: { value: number; done: boolean; doneSize: string; totalSize: string };
      onLater: () => void;
    };

const HALO = 64;
const DOT = 6;
const DOT_CURRENT = 18;
const BOX = 22;

/** The Tolitoli mark (three bars, docs/design/logo), drawn at 32 px. */
function BrandMark() {
  const theme = useTheme();
  const bars = [
    { height: 9, top: 11 },
    { height: 22, top: 4 },
    { height: 15, top: 8 },
  ];
  return (
    <View style={styles.mark}>
      {bars.map((bar, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            start: 6 + index * 8,
            top: bar.top,
            width: 5,
            height: bar.height,
            borderRadius: 2.5,
            backgroundColor: theme.color.accent,
          }}
        />
      ))}
    </View>
  );
}

function Dots({ page }: { page: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.dots, { gap: theme.space['space-1'], marginBottom: theme.space['space-4'] }]}
    >
      {[1, 2, 3].map((dot) => (
        <View
          key={dot}
          testID={dot === page ? 'onboarding-dot-current' : undefined}
          style={{
            width: dot === page ? DOT_CURRENT : DOT,
            height: DOT,
            borderRadius: theme.radius['radius-pill'],
            backgroundColor: dot === page ? theme.color.accent : theme.color.hairline,
          }}
        />
      ))}
    </View>
  );
}

/**
 * One of the three first-launch pages (guide OnboardingPage): content at the top,
 * dots and the full-width primary button anchored at the bottom. The consent text is
 * a draft to be reviewed by a lawyer before publication (CLAUDE.md).
 */
export function OnboardingPage(props: OnboardingPageProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  let content;
  let button;
  if (props.page === 1) {
    content = (
      <>
        <View
          style={[
            styles.halo,
            {
              borderRadius: theme.radius['radius-pill'],
              backgroundColor: theme.color['accent-soft'],
              marginBottom: theme.space['space-4'],
            },
          ]}
        >
          <BrandMark />
        </View>
        <AppText testID="i18n-data" variant="display" accessibilityRole="header">
          {t('app.name')}
        </AppText>
        <AppText>{t('onboarding.promise.body')}</AppText>
        <AppText variant="caption" color="ink-muted">
          {t('onboarding.promise.caption')}
        </AppText>
      </>
    );
    button = <Button label={t('onboarding.continue')} onPress={props.onNext} />;
  } else if (props.page === 2) {
    const { accepted, onToggleAccept } = props;
    content = (
      <>
        <AppText variant="title" accessibilityRole="header">
          {t('onboarding.consent.title')}
        </AppText>
        <AppText>{t('onboarding.consent.body')}</AppText>
        <AppText variant="caption" color="ink-muted">
          {t('onboarding.consent.caption')}
        </AppText>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel={t('onboarding.consent.checkbox')}
          onPress={onToggleAccept}
          style={[
            styles.check,
            {
              gap: theme.space['space-3'],
              padding: theme.space['space-3'],
              marginTop: theme.space['space-4'],
              borderRadius: theme.radius['radius-sm'],
              backgroundColor: theme.color['surface-raised'],
              borderColor: theme.color.hairline,
            },
          ]}
        >
          <View
            testID="consent-box"
            style={[
              styles.box,
              {
                borderColor: theme.color.accent,
                backgroundColor: accepted ? theme.color.accent : 'transparent',
              },
            ]}
          >
            {accepted ? <Icon name="check" size="icon-sm" color="on-accent" /> : null}
          </View>
          <AppText
            variant="caption"
            style={styles.flex}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {t('onboarding.consent.checkbox')}
          </AppText>
        </Pressable>
      </>
    );
    button = (
      <Button
        label={t('onboarding.consent.accept')}
        onPress={props.onNext}
        disabled={!accepted}
        accessibilityLabel={t('onboarding.consent.accept')}
        accessibilityHint={accepted ? undefined : t('onboarding.consent.acceptHint')}
      />
    );
  } else {
    const { download, onLater } = props;
    content = (
      <>
        <AppText variant="title" accessibilityRole="header">
          {t('onboarding.model.title')}
        </AppText>
        <AppText>{t('onboarding.model.body')}</AppText>
        <View style={{ marginTop: theme.space['space-4'] }}>
          <ProgressBar
            label={t('onboarding.model.progress')}
            value={download.value}
            state={download.done ? 'done' : 'running'}
            detail={t('onboarding.model.detail', {
              done: download.doneSize,
              total: download.totalSize,
            })}
          />
        </View>
      </>
    );
    button = (
      <>
        <Button
          label={download.done ? t('onboarding.model.start') : t('onboarding.model.downloading')}
          onPress={props.onNext}
          disabled={!download.done}
        />
        {download.done ? null : (
          <Button label={t('onboarding.model.later')} variant="ghost" onPress={onLater} />
        )}
      </>
    );
  }

  return (
    <View
      style={[
        styles.page,
        {
          paddingTop: theme.space['space-8'],
          paddingHorizontal: theme.space['space-4'],
          paddingBottom: theme.space['space-4'],
        },
      ]}
    >
      <View style={[styles.flex, { gap: theme.space['space-3'] }]}>{content}</View>
      <Dots page={props.page} />
      <View style={[styles.footer, { gap: theme.space['space-2'] }]}>{button}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  flex: { flex: 1 },
  halo: { width: HALO, height: HALO, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 32, height: 30 },
  dots: { flexDirection: 'row', justifyContent: 'center' },
  // Full-width primary button, always in the same place.
  footer: { alignItems: 'stretch' },
  check: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1 },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
