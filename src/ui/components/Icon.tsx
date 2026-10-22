import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Cloud,
  CloudOff,
  Download,
  FileText,
  Folder,
  Headphones,
  Languages,
  List,
  Mic,
  MoreHorizontal,
  Pause,
  PhoneOff,
  Play,
  Plus,
  Search,
  Settings,
  Share2,
  Square,
  Trash2,
  Volume2,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { I18nManager, View } from 'react-native';

import { useTheme, type ColorName } from '../theme';

/** The Lucide set of docs/design/ICONS.md (lucide-react-native 0.544.0). */
const ICONS = {
  'alert-triangle': AlertTriangle,
  check: Check,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  circle: Circle,
  clock: Clock,
  cloud: Cloud,
  'cloud-off': CloudOff,
  download: Download,
  'file-text': FileText,
  folder: Folder,
  headphones: Headphones,
  languages: Languages,
  list: List,
  mic: Mic,
  'more-horizontal': MoreHorizontal,
  pause: Pause,
  'phone-off': PhoneOff,
  play: Play,
  plus: Plus,
  search: Search,
  settings: Settings,
  'share-2': Share2,
  square: Square,
  'trash-2': Trash2,
  'volume-2': Volume2,
  'wifi-off': WifiOff,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Only chevrons point somewhere; every other icon keeps its drawing in RTL (CLAUDE.md, Design). */
const MIRRORED_IN_RTL: ReadonlySet<IconName> = new Set(['chevron-left', 'chevron-right']);

type BaseProps = {
  name: IconName;
  size?: 'icon-sm' | 'icon-md' | 'icon-lg';
  color?: ColorName;
};

/**
 * Decorative by default: hidden from screen readers because a label goes with it. An icon
 * that stands alone must say what it means.
 */
export type IconProps = BaseProps &
  (
    | { decorative?: true; accessibilityLabel?: never }
    | { decorative: false; accessibilityLabel: string }
  );

export function Icon({ name, size = 'icon-md', color = 'ink', ...a11y }: IconProps) {
  const theme = useTheme();
  const Glyph = ICONS[name];
  const mirrored = MIRRORED_IN_RTL.has(name) && I18nManager.isRTL;
  const glyph = (
    <Glyph
      size={theme.size[size]}
      color={theme.color[color]}
      strokeWidth={theme.size['stroke-icon']}
    />
  );
  if (a11y.decorative === false) {
    return (
      <View
        testID={`icon-${name}`}
        accessible
        accessibilityRole="image"
        accessibilityLabel={a11y.accessibilityLabel}
        style={mirrored ? { transform: [{ scaleX: -1 }] } : null}
      >
        {glyph}
      </View>
    );
  }
  return (
    <View
      testID={`icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={mirrored ? { transform: [{ scaleX: -1 }] } : null}
    >
      {glyph}
    </View>
  );
}
