# Étape 1b : thème et composants (plan validé)

## Contexte

L'étape 1 (enregistrement) est close et fusionnée dans `main` (PR #3, D-029). L'étape 1b habille l'app avec le système de design exporté dans `docs/design/` : tokens, Rubik, Lucide, dix composants (avec `OptionRow`), puis les trois écrans refaits avec eux.

**Organisation (propriétaire, 2026-10-22)** : plan validé, rédigé quand l'étape 1 était encore ouverte. Le worktree parallèle prévu au départ a été abandonné. Il n'y a désormais qu'**une seule session**, dans le dépôt principal, sur la branche `step-1b-design` partie de `main`. Les règles de parallélisme ne s'appliquent plus : zones interdites, DECISIONS.md réservé à l'autre session, worktree, port 8082. Les autres règles restent :

- fichiers ajoutés nommément, commits `step-1b: …`, `npm run typecheck && npm run lint && npm test` au vert avant chaque commit ;
- `npx expo install --fix` à l'ouverture de l'étape et avant chaque build EAS ;
- pas de build d'un profil non prévu sans accord : la build `preview` et la PR de 1b sont soumises au propriétaire ;
- les décisions sont notées ci-dessous puis reportées dans `DECISIONS.md`.

## Ce qui existe déjà (étape 1)

- `src/ui/theme/tokens.ts` : une ancienne palette bleue de 7 couleurs (`primary`, `text`, `border`…), `spacing` xs→xl, `radius` sm/md et `fontSize`. Il est consommé par `useTheme()` (`ThemeProvider.tsx`, qui suit `useColorScheme`).
- Composants `AppText` (variantes title, body, caption) et `Screen`, plus `SplitLayout`, `useLayoutMode` et `layout/tabBar.ts` (plafond de 1,5× des libellés, D-014).
- Écrans : `app/(tabs)/_layout.tsx` (onglets Ionicons, en-tête React Navigation), `app/(tabs)/index.tsx`, `app/(tabs)/settings.tsx` et `app/record.tsx`.
- Composants d'enregistrement dans `src/features/recording/components/` : LevelMeter, RecordingTimer, InterruptionBanner, MicSilentBanner, RecordingControls.
- Tests : `src/ui/__tests__/tokens.test.ts` (contrastes de l'ancienne palette) et `__tests__/screens/*` (`renderScreen`, pseudo-locale `⟦…⟧`, RTL par `jest.replaceProperty(I18nManager,'isRTL')`, libellés d'accessibilité).
- **Déjà livré en D-024** :
  - icône d'app, icône adaptative (fond `accent`), écran de démarrage clair et sombre ;
  - notification avec la silhouette de la marque, la marque en couleur et un en-tête `accent`.

  Le seul écart restant est la couleur `#b84a24`, écrite en dur dans `recordingController.ts`, à lire désormais depuis `tokens.ts`.

- Une seule autre couleur en dur dans `src/` et `app/` : celle de `tokens.ts`, qui sera remplacé.

## Dépendances (à justifier dans le premier commit de code)

| Paquet                     | Version                                  | Raison                                                                | Natif ?                     |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------------- | --------------------------- |
| `lucide-react-native`      | 0.544.0 exacte                           | Icônes (CLAUDE.md, Design)                                            | non                         |
| `react-native-svg`         | `npx expo install` (15.16.0 pour SDK 58) | Pair obligatoire de Lucide                                            | **oui**                     |
| `@expo-google-fonts/rubik` | 0.4.2                                    | Rubik 500 et 600 (`Rubik_500Medium`, `Rubik_600SemiBold`)             | non (expo-font est déjà là) |
| `expo-haptics`             | `npx expo install`                       | Retour haptique au démarrage de l'enregistrement (guide RecordButton) | **oui**                     |
| `@expo/vector-icons`       | retiré                                   | Plus utilisé une fois les onglets en Lucide                           | —                           |

Les deux modules natifs imposent une nouvelle build de développement. Elle sera lancée **après** la libération du téléphone. D'ici là, rien ne s'exécute sur l'appareil : le dev client installé ne contient pas `react-native-svg`.

## Partie A, sans téléphone (Jest et CI)

### A1. Tokens (`src/ui/theme/tokens.ts`, réécrit)

- Transcription typée de `docs/design/tokens.json` qui **garde les noms du design** :
  - `color.light['surface-raised']`, `color.dark['on-accent']` ;
  - `space['space-4']`, `radius['radius-md']`, `size['control-md']`, `size['stroke-icon']` ;
  - `text.display`, `text['body-strong']`, `text.timestamp`.
- Conversions :
  - les valeurs en px deviennent des nombres ;
  - `letterSpacing` passe de em à px (taille × em) ;
  - `fontWeight` devient une chaîne ;
  - la famille d'affichage devient `Rubik_500Medium` ou `Rubik_600SemiBold` selon le poids ;
  - le texte courant reste sur la police système (pas de famille) ;
  - la police mono vient de `Platform.select({ android: 'monospace', ios: 'Menlo' })` ;
  - `timer` reçoit `fontVariant: ['tabular-nums']`.
- `useTheme()` garde sa forme `{ scheme, color, space, radius, size, text }` et suit toujours le système.
- Les constantes de tablette (`SPLIT_LIST_WIDTH`…) restent.
- **Test de parité** `src/ui/__tests__/tokens.parity.test.ts` : il importe `docs/design/tokens.json` et compare chaque couleur des deux thèmes, chaque espacement, rayon, taille et style de texte, ainsi que l'ensemble des noms dans les deux sens. Il échoue si l'un des deux fichiers change sans l'autre.
- `tokens.test.ts` réécrit : il vérifie les contrastes que `tokens.json` annonce, dans les deux thèmes :
  - `ink` ≥ 12:1 sur les trois surfaces ;
  - `ink-muted` ≥ 5:1 ;
  - `on-accent` sur `accent` ≥ 4,5:1 ;
  - `warning` ≥ 4,5:1 sur `surface`.
- `recordingController.ts` : `NOTIFICATION_COLOR` est lu dans `tokens.ts`, plus de `#b84a24` en dur.

### A2. Typographie

- `AppText` devient `Text` avec `variant` = un nom de style de `tokens.json` (`display` … `timestamp`) et `color` = un nom de token (`ink` par défaut). `allowFontScaling` reste toujours actif, sans plafond.
- `app/_layout.tsx` : `SplashScreen.preventAutoHideAsync()`, puis `useFonts({ Rubik_500Medium, Rubik_600SemiBold })`, puis `hideAsync()` une fois les polices chargées ou en erreur. En cas d'erreur, l'app continue avec la police système. Chargement JS via expo-font : pas de plugin, `app.config.ts` n'est pas touché.
- Le `overline` est en majuscules seulement pour les écritures latines (brand book), par un `textTransform` conditionnel selon la langue.

### A3. Icônes (`src/ui/components/Icon.tsx`)

- Le composant prend `name` (un nom Lucide de la liste `docs/design/ICONS.md`, typé en union), `size` (`icon-sm`, `icon-md` ou `icon-lg`, `icon-md` par défaut) et `color` (un token).
- Le trait `stroke-icon` vaut 1,75. Les chevrons sont inversés en RTL (`transform: [{ scaleX: -1 }]` quand `I18nManager.isRTL`), et seulement eux.
- `decorative` (vrai par défaut) masque l'icône aux lecteurs d'écran (`accessibilityElementsHidden` et `importantForAccessibility="no-hide-descendants"`). Sinon, `accessibilityLabel` est obligatoire, ce que le typage impose.
- Tests : chevron inversé en RTL et pas les autres icônes, icône masquée, libellé requis.

### A4. Les dix composants (`src/ui/components/`, chacun avec son test RNTL)

Chaque test couvre la pseudo-locale (aucun texte en dur), l'arabe RTL, les rôles, libellés et états d'accessibilité, et les états du guide.

| Composant                   | Contenu (guide et aperçu)                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                    | Variantes `primary`, `secondary`, `ghost` et `danger` ; hauteur `control-md` ; `radius-md` ; libellé `body-strong` ; icône optionnelle à `space-1`. Désactivé : `ink-faint` sur `surface-sunken`, sans opacité. Anneau `focus` de 2 px visible au focus.                                                                                                                                                            |
| `Banner`                    | Types `interrupted`, `resumable` et `alert`, avec une icône Lucide (`phone-off`, `alert-triangle`) ; fond `accent-soft`, ou `surface-raised` et `hairline` pour une alerte ; `title` en `body-strong`, `body` en `caption` `ink-muted` ; au plus une action ; `accessibilityLiveRegion="assertive"`.                                                                                                                |
| `LevelMeter`                | Piste `surface-sunken` avec `hairline`, 12 px, `radius-pill`. Remplissage `accent`, ou `ink-faint` sous 0,05, lissé sur 60 ms par `Animated`. Rôle `progressbar` (RN n'a pas de rôle `meter`), sans annonce continue.                                                                                                                                                                                               |
| `Timer`                     | Point `accent` de 12 px qui pulse en 1,2 s (opacité 1 → 0,4), puis style `timer` en `HH:MM:SS`. En pause ou interrompu : point fixe et texte `ink-muted`. Respecte « réduire les animations » (`AccessibilityInfo`). Un texte caché, `polite`, est mis à jour à la minute.                                                                                                                                          |
| `RecordButton`              | `record` : `control-lg`, `accent`, icône `mic` 32 px en `on-accent`. `stop` : `control-xl`, cercle `surface-raised` cerclé d'`accent`, carré `accent` de 32 px à `radius-sm`. Libellé en `caption` dessous. Haptique (`expo-haptics`) en mode `record`. Libellés d'accessibilité « Enregistrer » et « Arrêter l'enregistrement ».                                                                                   |
| `RecordingCard`             | Carte `surface-raised`, `hairline`, `radius-md`. Icône d'état au début (`mic` pour l'audio seul à cette étape), titre `heading` sur 2 lignes au plus, métadonnées `caption` `ink-muted` « heure · durée », badge « Récupéré » sur `accent-soft`. Chevron à la fin, inversé en RTL, **affiché seulement si `onPress` est fourni** (voir Décisions). Plus `overline` de groupe de dates (`RecordingCardGroupHeader`). |
| `QualityChip`               | `good` (`check`, `success`), `medium` (`clock`, `accent-soft`), `draft` (`alert-triangle`, `warning`) et `busy` (« Transcription… ») ; le mot de qualité est toujours affiché. Pas encore utilisé dans les écrans : composant et tests seulement.                                                                                                                                                                   |
| `TranscriptSegment`         | Horodatage `timestamp` `ink-muted`, locuteur `caption`, texte `body`. États `past`, `active` (`accent-soft`, `radius-sm`) et `upcoming` (`ink-muted`). Appui et appui long. Composant et tests seulement.                                                                                                                                                                                                           |
| `OptionRow` (10e composant) | Ligne de choix exclusif pour les Réglages (langue de l'interface), suivant `docs/design/components/OptionRow.md` et son aperçu. Implémente exactement les états, props et libellés du guide. Tests : rôle `radio`, état `checked`, nom de langue masqué (D-019), pseudo-locale, RTL.                                                                                                                                |
| `TabBar`                    | Pas de composant maison : options de `Tabs` (expo-router). Fond `surface-raised` avec `hairline` en haut ; icônes Lucide `list` et `settings` (`icon-md`, masquées) ; libellés `caption` (13/18) plafonnés à 1,5× ; actif `accent`, inactif `ink-muted`. `layout/tabBar.ts` recalcule la hauteur (13/18 au lieu de 10/13) et son test est mis à jour.                                                               |

### A5. Formats d'affichage (`src/ui/format/`, TypeScript pur et testé)

Les formats d'affichage sont une affaire d'interface : `src/services/audio/duration.ts` reste tel quel, et des formateurs d'interface s'ajoutent à côté :

- `formatClock(ms)` donne `HH:MM:SS` pour le chrono ;
- `formatDurationShort(ms, t)` donne « 42 min » ou « 1 h 12 » (unités traduites) pour les cartes ;
- `formatTime(date, lang)` et `formatDayGroup(date, now, lang)` donnent « Aujourd'hui », « Hier » ou la date, avec `Intl.DateTimeFormat`.

Le format actuel, `YYYY-MM-DD HH:mm` (`formatRecordingDate`), n'est plus utilisé par les écrans mais reste dans les services.

### A6. Écrans refaits (aucune couleur ni taille en dur, uniquement des composants et `AppText`)

- **Onglets** (`app/(tabs)/_layout.tsx`) : TabBar ci-dessus. L'en-tête React Navigation est masqué : chaque écran porte son titre.
- **Bibliothèque** (`app/(tabs)/index.tsx`) :
  - titre `display` ;
  - cartes `RecordingCard` groupées par jour sous un `overline` ;
  - état vide en `heading` et `body` ;
  - `RecordButton` « Enregistrer » centré, à `space-6` du bas, au-dessus des onglets.
- **Enregistrement** (`app/record.tsx`) :
  - titre `title`, puis le **rappel légal en `caption` `ink-muted`** sous le titre ;
  - mot d'état en `caption` ;
  - `Timer`, puis `LevelMeter` ;
  - `Banner` :
    - pendant un appel : `interrupted`, sans bouton ;
    - reprise possible : `resumable`, avec un titre **selon la cause** (voir Décisions) ;
    - micro coupé : `alert` ;
  - `RecordButton stop` au centre, avec `Button` secondaires Pause et Reprendre de part et d'autre (Reprendre masqué tant que `micBusy`) ;
  - après l'arrêt : `Button primary` « Fermer » ;
  - écran de refus : `Button primary` « Ouvrir les réglages » et `Button ghost` « Fermer ».

  Les anciens composants de `src/features/recording/components/` sont remplacés par ceux de `src/ui/components/`, puis supprimés.

- **Cause de l'interruption** : `recordingController.ts` (autorisé) enregistre dans `useRecordingStore` un champ `interruptionCause: 'call' | 'taken' | null`, déduit du `transient` de l'événement : un appel ou une sonnerie donne `call`, une autre app qui garde le micro donne `taken`. Les services ne changent pas.
- **Réglages** (`app/(tabs)/settings.tsx`) : titre de section en `title`, aide en `body` `ink-muted`, une `OptionRow` par langue (groupe `radiogroup`), le message de redémarrage RTL et le bloc de diagnostic réservé au développement, avec les tokens. Il passe en dernier, après l'arrivée du guide `OptionRow`. Pas de bouton détourné en attendant.
- i18n : nouvelles clés dans les 7 langues, en brouillon selon D-007 avec le wolof à faire relire :
  - textes de bannière de l'aperçu (« Appel terminé », « Ce qui précède l'appel est conservé. », « Une autre application a pris le micro. ») ;
  - unités de durée, « Aujourd'hui » et « Hier », titre par défaut « Enregistrement du {{date}} {{time}} » ;
  - « Arrêter l'enregistrement ».

  Les tests d'écran existants sont mis à jour : libellés, rôles, pseudo-locale et RTL.

## Partie B, quand le téléphone sera libre (sur le feu vert du propriétaire)

1. `npx expo install --fix` (commit séparé si besoin), puis **build EAS `development`** (Android). Elle est prévue au plan et contient `react-native-svg` et `expo-haptics`.
2. **Test de fumée** (CLAUDE.md) : démarrage à froid, captures `docs/captures/step-1b/smoke-<id>-<écran>.png`, aucune erreur rouge, résultat dans `docs/plans/step-1b.md`.
3. Metro du dépôt principal (port 8081).
4. **Captures de fin** dans `docs/captures/step-1b/` :
   - Bibliothèque, Enregistrement (pendant un vrai enregistrement court) et Réglages ;
   - chacun en français clair, en français sombre et en arabe (clair et sombre).
   - Le thème sombre passe par `adb shell cmd uimode night yes/no`, remis à la valeur initiale à la fin (CLAUDE.md).
   - Comparaison avec les aperçus de `docs/design/previews/`, rendus dans le navigateur à partir d'un `tokens.css` tiré de `tokens.json` et généré dans `build/`, non versionné.
   - Les écarts sont notés dans les Décisions.
5. Vérifications sur l'appareil :
   - Rubik se charge avant que l'écran de démarrage se lève ;
   - les glyphes arabes et chinois passent par la police système ;
   - `Intl.DateTimeFormat` de Hermes donne le bon résultat en `wo`, `ar` et `zh-Hans` (sinon, repli prévu dans les formateurs) ;
   - le retour haptique fonctionne ;
   - « réduire les animations » est respecté.
6. **`Intl.DateTimeFormat` (propriétaire)** : à trancher au premier test sur l'appareil.
   - Si l'API manque ou se trompe pour une langue de l'interface, ajouter le polyfill `@formatjs/intl-datetimeformat` aux mêmes conditions que D-012 : chargé seulement si nécessaire, avec les seules locales utiles.
   - Le repli fr/en des formateurs reste **derrière** le polyfill, il ne le remplace pas.
7. **Chiffres tabulaires du chrono (propriétaire)** : vérifier sur l'appareil que Rubik applique `tnum` (`fontVariant: ['tabular-nums']`), le chrono ne devant pas trembler d'une seconde à l'autre. Sinon, donner à chaque chiffre une largeur fixe, sans changer de police.
8. **Une build `preview`** avant la PR, parce que des modules natifs sont ajoutés (le Lint de release, leçon de D-025). Elle est **soumise à l'accord du propriétaire** au moment voulu, conformément à CLAUDE.md.
9. Rebase sur `main` une fois l'étape 1 fusionnée, puis PR.

## Décisions

**Reportées dans `DECISIONS.md` (D-030), avec les résultats sur l'appareil.** Cette section recueillait les décisions de l'étape 1b ; Les premières sont les conflits avec l'étape 1 relevés pendant le plan.

1. **Noms de tokens** : on garde les noms du design (`surface-raised`…), au prix de clés entre guillemets, parce que la parité et la recherche dans le code en deviennent triviales. Tout le code d'interface est renommé (`primary` → `accent`, `text` → `ink`…).
2. **Formats** : le chrono en `HH:MM:SS` (guide Timer) et les durées en « 42 min » / « 1 h 12 » (brand book) remplacent le `m:ss` et le `YYYY-MM-DD` de l'étape 1, par des formateurs d'interface, sans toucher à `services/audio/duration.ts`.
3. **Titre de la bannière de reprise selon la cause** (propriétaire) : « Appel terminé » après un appel, « Enregistrement interrompu » et « Une autre application a pris le micro » après une perte définitive.
4. **Rappel légal** en `caption` `ink-muted` (propriétaire).
5. **Lignes d'option des Réglages** : `OptionRow`, dixième composant, dont le guide est rédigé par le propriétaire dans le système de design (`docs/design/components/OptionRow.md` et son aperçu). Les critères de fin passent donc de neuf à dix composants.
6. **Chevron des cartes** : il n'apparaît que si la carte ouvre quelque chose. L'écran Détail n'existe pas encore (étapes 2 et 4), donc pas de chevron à l'étape 1b. C'est un écart temporaire au guide.
7. **Libellé d'accessibilité du bouton Enregistrer** : « Enregistrer », comme dans le guide, au lieu de « Démarrer un enregistrement ». Le test est mis à jour.
8. **Icône adaptative sombre** : `tolitoli-mark-dark.svg` est prévu pour une icône adaptative en mode sombre, mais Android n'en a pas (les icônes à thème utilisent la silhouette monochrome). L'écart est déjà noté en D-024.
9. **Boutons de la notification** : la règle « Reprendre après l'appel » est respectée (D-023). En revanche, les icônes Lucide `pause`/`play` et le `radius-pill` ne peuvent pas s'appliquer aux actions d'une notification Android, qui restent du texte système.
10. **Rôle `meter`** : React Native n'a pas ce rôle, on utilise `progressbar` avec une valeur et sans annonce continue.
11. **Rubik et l'arabe** : le brand book dit que Rubik couvre l'arabe. Ce sera vérifié sur les fichiers TTF installés ; à défaut, la police système prend le relais glyphe par glyphe, et ce sera consigné.

## Risques

- **Lucide et react-native-svg sous Jest** : il faudra peut-être ajouter `lucide-react-native` à `transformIgnorePatterns`, ou un mock léger de `react-native-svg` dans `jest.setup.ts`.
- **Le dev client actuel n'a pas `react-native-svg`** : le code 1b planterait sur le téléphone avant la nouvelle build. Aucun essai sur l'appareil avant la build de la partie B.
- **`Intl.DateTimeFormat` sous Hermes** pour `wo` (aucune donnée de locale) : repli sur `fr`/`en` dans les formateurs, et test unitaire du repli.
- **Hauteur de la barre d'onglets** avec des libellés de 13 px au lieu de 10 : le calcul D-014 est revu et testé, et les grandes polices seront vérifiées sur l'appareil.

## Commits prévus (branche `step-1b-design`)

1. `step-1b: add step plan`
2. `step-1b: add OptionRow design guide`
   2b. `step-1b: run expo install --fix` (si nécessaire)
3. `step-1b: add design dependencies` (lucide 0.544.0, react-native-svg, Rubik, expo-haptics ; retrait de @expo/vector-icons)
4. `step-1b: transcribe design tokens with a parity test`
5. `step-1b: load Rubik and name text styles after the tokens`
6. `step-1b: add the Icon component`
7. `step-1b: add Button, Banner, LevelMeter and Timer`
8. `step-1b: add RecordButton, RecordingCard, QualityChip and TranscriptSegment`
9. `step-1b: add display formatters`
10. `step-1b: restyle tabs, Library and Recording screens`
11. `step-1b: add OptionRow and restyle Settings`
12. Partie B : smoke, captures, notes de décisions, puis la PR après rebase

## Vérification

- Partie A : `npm run typecheck && npm run lint && npm test` au vert à chaque commit, et CI au vert.
  - Le test de parité échoue si on modifie un token d'un seul côté (essai manuel, puis annulation).
  - `grep -rn "#[0-9a-fA-F]\{6\}" app src --include=*.ts*` ne trouve plus que `tokens.ts`.
- Partie B : build de développement installée, test de fumée, puis les captures des 3 écrans dans les 2 thèmes et en arabe, comparées aux aperçus. Enfin, la build `preview` si le propriétaire l'accepte.
