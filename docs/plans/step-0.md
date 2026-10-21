# Étape 0 : initialisation du projet Tolitoli

## Contexte

Le dépôt ne contient que `CLAUDE.md`, `CAHIER_DES_CHARGES.md` et `DECISIONS.md` (vide), tous à la racine, et `main` n'a aucun commit. L'étape 0 pose le socle de toutes les étapes suivantes : projet Expo, dev client, EAS, i18n en sept langues avec RTL, thème, structure de dossiers, outillage qualité et CI. Ce plan sera recopié tel quel dans `docs/plans/step-0.md`.

**Critères de fin (cahier des charges, §Plan, ligne 0)** : l'app vide se lance sur un iPhone et un Android physiques via le dev client, et la CI est verte.
**Adaptation validée** : Android physique d'abord. Xcode étant absent du Mac, le lancement sur iPhone est reporté à l'étape 1 seulement : le compte Apple Developer et l'enregistrement de l'iPhone (`eas device:create`) sont un prérequis de clôture de l'étape 1 (D-003).

## Décisions prises avec le propriétaire (à consigner dans DECISIONS.md)

| #     | Décision                                                                                                                                                                                                                                                                                                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-001 | Expo **SDK 58** (expo 58.0.16, RN 0.88.0, React 19.3.0). Avant de clore l'étape, je vérifie que react-native-executorch 0.10.x et react-native-audio-api 0.13.x sont compatibles avec RN 0.88 (notes de version, issues). Sinon, repli sur SDK 57 avant l'étape 1.                                               |
| D-002 | Identifiant `app.tolitoli.mobile` (iOS et Android) pour la production. Les variantes `app.tolitoli.mobile.dev` et `app.tolitoli.mobile.preview` permettent aux trois builds de coexister sur l'appareil.                                                                                                         |
| D-003 | Étape 0 close sur Android physique et CI ; l'iPhone n'est reporté que pour l'étape 0. Compte Apple Developer et `eas device:create` obligatoires **avant la clôture de l'étape 1**, dont le critère de fin (60 min écran verrouillé) exige l'iPhone : l'arrière-plan audio iOS est ce qui casse le plus souvent. |
| D-004 | Documents déplacés dans `docs/`. Le commit initial sur `main` est fait par le propriétaire, et tout le reste passe par la branche `step-0-init`.                                                                                                                                                                 |
| D-005 | La préférence de langue de l'interface est stockée dans `expo-sqlite/kv-store` : API synchrone, lue avant le premier rendu, et déjà dans la stack. C'est un fichier distinct de la future base drizzle de l'étape 2.                                                                                             |
| D-006 | La bascule RTL passe par `I18nManager.allowRTL/forceRTL` puis un rechargement de l'app (`Updates.reloadAsync()`, ou `DevSettings.reload()` en dev), seulement quand le sens d'écriture change.                                                                                                                   |
| D-007 | Les traductions en, de, ru, ar, zh-Hans et wo sont des brouillons automatiques, marqués « à relire par un locuteur natif » avant publication. Le wolof suit l'orthographe officielle sénégalaise.                                                                                                                |
| D-008 | Chinois traditionnel non pris en charge : un appareil en `zh-Hant` (Taïwan, Hong Kong, Macao) retombe sur `zh-Hans`, puis sur `en`. Ces utilisateurs lisent le simplifié bien plus facilement que l'anglais.                                                                                                     |

## Prérequis côté propriétaire (avant implémentation)

1. Faire le commit initial sur `main` après mon déplacement des docs : `git mv` vers `docs/`, puis `git add CLAUDE.md docs/ && git commit -m "chore: initial docs"`. Ajouter `.DS_Store` au `.gitignore` dès ce premier commit, ou ne pas l'ajouter au commit.
2. Créer le dépôt GitHub et l'ajouter comme `origin`. `gh` n'est pas installé : soit `brew install gh`, soit créer la PR à la main.
3. Compte Expo : lancer `! npx eas-cli@25.3.0 login` dans la session. Je lance ensuite `eas init`, qui crée le projet EAS et son `projectId`.
4. Android : activer le mode développeur et le débogage USB sur le téléphone. `adb` n'est pas dans le PATH : il faut le paquet Android SDK `platform-tools`. Ce n'est utile que pour `npm run android` en local, puisque la build EAS s'installe par APK.

## Création du projet

- `npx create-expo-app@latest` avec le template `blank-typescript@sdk-58`, généré dans le scratchpad puis copié à la racine, car le dossier n'est pas vide. Je supprime ensuite `App.tsx` et `index.ts`, et je règle `"main": "expo-router/entry"`.
- Toutes les dépendances natives passent par `npx expo install` : les versions sont alignées sur `bundledNativeModules.json` du SDK 58.
- La nouvelle architecture est la seule disponible depuis SDK 55 : rien à activer, je le vérifie dans la build.

## Dépendances

### Exécution

| Paquet                         | Version         | Raison                                                                       |
| ------------------------------ | --------------- | ---------------------------------------------------------------------------- |
| expo                           | ~58.0.16        | SDK imposé                                                                   |
| react / react-native           | 19.3.0 / 0.88.0 | Imposés par le SDK 58                                                        |
| expo-router                    | ~58.0.24        | Navigation imposée                                                           |
| react-native-screens           | ~4.30.0         | Dépendance pair d'expo-router                                                |
| react-native-safe-area-context | ~5.10.1         | Dépendance pair d'expo-router, marges sûres                                  |
| expo-linking                   | ~58.0.13        | Dépendance pair d'expo-router, schéma `tolitoli://`                          |
| expo-constants                 | ~58.0.12        | Dépendance pair d'expo-router, lecture de la config                          |
| expo-status-bar                | ~58.0.3         | Template ; barre d'état selon le thème                                       |
| expo-system-ui                 | ~58.0.6         | Couleur de fond racine (mode sombre, pas de flash blanc)                     |
| expo-splash-screen             | ~58.0.10        | Garder l'écran de démarrage pendant l'init i18n                              |
| expo-dev-client                | ~58.0.14        | Dev client obligatoire (pas Expo Go)                                         |
| expo-updates                   | ~58.0.17        | EAS Update (canaux) et `reloadAsync()` pour la bascule RTL                   |
| expo-localization              | ~58.0.5         | Locale de l'appareil, plugin `supportsRTL`                                   |
| expo-sqlite                    | ~58.0.13        | `kv-store` pour la langue choisie (D-005), déjà dans la stack pour l'étape 2 |
| i18next                        | ^26.5.4         | i18n imposée                                                                 |
| react-i18next                  | ^17.1.0         | Liaison React d'i18next                                                      |

### Développement

| Paquet                        | Version  | Raison                                                                                               |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| typescript                    | ~6.0.3   | Version du template SDK 58 (pas TS 7, que le template n'a pas encore adopté)                         |
| @types/react                  | ~19.3.0  | Types React                                                                                          |
| jest                          | ^30.5.2  | Tests imposés                                                                                        |
| jest-expo                     | ~58.0.11 | Preset Jest pour Expo                                                                                |
| @testing-library/react-native | ^14.1.0  | Tests de composants imposés (matchers intégrés)                                                      |
| @types/jest                   | ^30      | Types Jest                                                                                           |
| eslint                        | ^10.13.0 | Lint                                                                                                 |
| eslint-config-expo            | ~58.0.4  | Config ESLint officielle (flat config)                                                               |
| eslint-config-prettier        | ^10.1.8  | Désactive les règles ESLint en conflit avec Prettier                                                 |
| eslint-plugin-i18next         | ^6.1.5   | Règle `no-literal-string` (mode `jsx-text-only`) : détecte les chaînes en dur sans attendre le rendu |
| prettier                      | ^3.9.10  | Formatage                                                                                            |

- `Intl.PluralRules` sous Hermes : la CI tourne sous Node (Intl complet) et ne verra jamais un manque, problème connu d'i18next sur Android. La vérification des pluriels ru et wo est donc **la première chose faite après l'installation de l'APK**. Si un manque est constaté, `@formatjs/intl-pluralrules` (^6.3.16, avec les seules données de locale nécessaires) est ajouté **dans l'étape 0**, avec une nouvelle entrée dans DECISIONS.md ; l'étape n'est pas close sans pluriels corrects sur l'appareil.
- `eas-cli` n'est pas ajouté aux dépendances : il s'utilise via `npx eas-cli@25.3.0`, et `eas.json` fixe `cli.version >= 25.3.0`.

## Fichiers créés ou modifiés

### Racine et configuration

- `package.json` : `main`, scripts, `engines.node >= 24`.
- `app.config.ts` (pas de `app.json`) :
  - `name` vient de `fr.json` (`app.name`, D-002), `slug: tolitoli`, `scheme: tolitoli`, `orientation: default`.
  - iOS : `supportsTablet: true`. Android : tablette par défaut.
  - Variantes selon `APP_VARIANT` (development / preview / production) : identifiant et nom affiché (« Tolitoli Dev », « Tolitoli Preview »).
  - `runtimeVersion: { policy: "fingerprint" }`, `updates.url` d'EAS, `extra.eas.projectId`.
  - Plugins : `expo-router`, `expo-localization` (`supportsRTL: true`), `expo-dev-client`, `expo-sqlite`, `expo-splash-screen`.
  - Aucune permission micro à cette étape : elles arrivent à l'étape 1 et seront annoncées dans son plan.
- `eas.json` :
  - `development` : `developmentClient: true`, distribution interne, `android.buildType: apk`, canal `development`, `APP_VARIANT=development`.
  - `preview` : distribution interne, APK, canal `preview`.
  - `production` : `autoIncrement`, canal `production`, `appVersionSource: remote`.
- `tsconfig.json` : étend `expo/tsconfig.base` avec `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` et l'alias `@/*` vers `src/*`.
- `eslint.config.js` (flat config) : `eslint-config-expo/flat`, `eslint-config-prettier` et `i18next/no-literal-string` sur `app/` et `src/ui/` et `src/features/`. Deux règles d'architecture :
  - `no-restricted-imports` interdit `react`, `react-native`, `expo-router`, `@/ui` et `@/features` dans `src/services/**`, pour faire respecter la règle de CLAUDE.md.
  - `@typescript-eslint/no-explicit-any: error`.
- `.prettierrc.json` (singleQuote, trailingComma all, printWidth 100) et `.prettierignore`.
- `jest.config.js` : preset `jest-expo`, `setupFilesAfterEnv` vers `jest.setup.ts`, `moduleNameMapper` pour `@/`, couverture sur `src/`.
- `jest.setup.ts` : mocks d'`expo-localization`, `expo-sqlite/kv-store` (Map en mémoire), `expo-updates` et `I18nManager`.
- `.gitignore` : template Expo plus `.env*` sauf `.env.example`, `.DS_Store`, `ios/`, `android/` (Continuous Native Generation), `coverage/`, `*.keystore`, `credentials.json`.
- `.env.example` : `APP_VARIANT=development` et des commentaires sur les futures variables (`EXPO_PUBLIC_SUPABASE_URL`, etc., étape 7a), sans valeur secrète.
- `.nvmrc` : `24`.

### CI

- `.github/workflows/ci.yml` : déclenché sur `pull_request` et `push` vers `main`.
  - Environnement : ubuntu-latest, Node 24 via `.nvmrc`, cache npm, `npm ci`.
  - Étapes : `npm run typecheck`, `npm run lint`, `npm test -- --ci`, puis `npx expo-doctor` (versions alignées avec le SDK).
  - La pseudo-localisation et la parité des clés sont des tests Jest, donc déjà couvertes par `npm test`.

### Documentation

- `docs/CAHIER_DES_CHARGES.md` et `docs/DECISIONS.md` : déplacés (déplacement fait avant le commit initial du propriétaire).
- `docs/DECISIONS.md` : format d'entrée (date, contexte, décision, alternatives, conséquences), avec les entrées D-001 à D-008.
- `docs/plans/step-0.md` : ce plan.
- `CLAUDE.md` : non modifié.

### Écrans (`app/`)

- `app/_layout.tsx` : initialise i18n de façon synchrone avant le rendu, garde l'écran de démarrage, fournit le thème (`ThemeProvider`) et la `Stack` racine.
- `app/(tabs)/_layout.tsx` : deux onglets, Bibliothèque et Réglages, avec libellés et `accessibilityLabel` traduits.
- `app/(tabs)/index.tsx` : Bibliothèque vide (état « aucun enregistrement »), enveloppée dans `SplitLayout`.
- `app/(tabs)/settings.tsx` : section « Langue de l'interface ».
  - Liste des sept langues, chacune affichée dans sa propre langue (Français, English, Deutsch, Русский, العربية, Wolof, 简体中文), avec un `accessibilityRole="radio"` et l'état sélectionné.
  - Une ligne « Pseudo » apparaît seulement en `__DEV__`.
  - Un libellé précise que la langue de transcription se règle séparément (étape 3).

### i18n (`src/i18n/`)

- `src/i18n/{fr,en,de,ru,ar,wo,zh-Hans}.json` (directement dans `src/i18n/`, comme le prévoit CLAUDE.md) : environ 15 clés en anglais à plat ou par domaine (`app.name`, `tabs.library`, `tabs.settings`, `library.empty.title`, `library.empty.body`, `settings.language.title`, `settings.language.hint`, `settings.language.restartRtl`, pluriel de démonstration `library.count_one/_few/_many/_other`…).
- `src/i18n/languages.ts` : table `UI_LANGUAGES` avec code, nom natif et `dir: 'ltr'|'rtl'`. Les fonctions `isRtl(code)` et `resolveInitialLanguage(stored, deviceLocales)` sont pures et testables.
- `src/i18n/pseudo.ts` : `pseudoLocalize(resources)` accentue les caractères (a vers á…), allonge de 35 % (comme l'allemand) et encadre chaque chaîne de `⟦…⟧`, en conservant les variables `{{x}}`. Fonction pure.
- `src/i18n/index.ts` : initialise i18next.
  - Ressources : les sept langues, plus `pseudo` en dev et en test.
  - Repli : `fallbackLng: { 'zh-Hant': ['zh-Hans', 'en'], default: ['en'] }`.
  - `interpolation.escapeValue: false`.
  - `setUiLanguage(code)` écrit dans le kv-store, change la langue d'i18next, puis si le sens d'écriture change appelle `forceRTL` et recharge l'app.

### Thème et layout (`src/ui/`)

- `src/ui/theme/tokens.ts` : couleurs claires et sombres (contraste AA vérifié par un test), espacements, rayons, tailles de police de base. Aucune largeur fixe sur un texte.
- `src/ui/theme/ThemeProvider.tsx` et `useTheme.ts` : suivent `useColorScheme()`.
- `src/ui/components/AppText.tsx` : `Text` avec `allowFontScaling` (polices dynamiques), `writingDirection` hérité.
- `src/ui/components/Screen.tsx` : conteneur avec marges sûres, fond du thème, et marges en `start`/`end` (jamais `left`/`right`) pour le RTL.
- `src/ui/layout/useLayoutMode.ts` : renvoie `'tablet-split'` si largeur ≥ 768 pt et paysage, sinon `'single'`.
- `src/ui/layout/SplitLayout.tsx` : layout tablette vide. Panneau `start` de 360 pt et panneau détail flexible, ou un seul panneau sur téléphone. Il est rempli à l'étape 5.

### Squelette de dossiers

Les dossiers suivants sont créés avec un `.gitkeep` ou un `README.md` d'une ligne décrivant leur rôle :

- `src/features/` : `recording`, `transcription`, `library`, `player`, `sync`, `billing`
- `src/services/` : `audio`, `whisper`, `cloudStt`, `storage`, `quota`, `transcription`
- `src/db/`
- `supabase/` : `functions`, `migrations`

`src/services/transcription/` est ajouté parce que CLAUDE.md y place `languages.ts` à l'étape 8.

## Scripts npm

| Script      | Commande                         | Note                                                                                |
| ----------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| `start`     | `expo start --dev-client`        | Pour le dev client installé via EAS (usage principal sans Xcode)                    |
| `ios`       | `expo run:ios --device`          | Exige Xcode, inutilisable sur ce Mac pour l'instant ; conservé comme dans CLAUDE.md |
| `android`   | `expo run:android --device`      | Exige `platform-tools`                                                              |
| `typecheck` | `tsc --noEmit`                   |                                                                                     |
| `lint`      | `eslint . && prettier --check .` |                                                                                     |
| `format`    | `prettier --write .`             |                                                                                     |
| `test`      | `jest`                           |                                                                                     |
| `doctor`    | `expo-doctor`                    |                                                                                     |

## Tests (Jest + RNTL)

1. `src/i18n/__tests__/parity.test.ts` : les sept fichiers ont exactement les mêmes clés que `fr.json`, avec les mêmes variables `{{…}}` ; les suffixes de pluriel requis par CLDR sont présents pour chaque langue (ru : one/few/many/other ; wo, zh, ar : formes CLDR), et aucune valeur n'est vide.
2. `src/i18n/__tests__/languages.test.ts` : `resolveInitialLanguage`.
   - Ordre de priorité : langue stockée, puis locale de l'appareil, puis `en`.
   - Correspondances : `zh-Hans-CN` donne `zh-Hans`, `zh-Hant-TW` et `zh-Hant-HK` donnent `zh-Hans`, `zh-HK` (sans script) donne `zh-Hans`, `de-AT` donne `de`, `ar-EG` donne `ar` ; `wo` n'est jamais une locale système.
   - `isRtl('ar')` vaut vrai et toutes les autres langues faux.
3. `src/i18n/__tests__/setUiLanguage.test.ts` :
   - fr vers de : aucun rechargement ;
   - fr vers ar : `forceRTL(true)` et rechargement ;
   - ar vers en : `forceRTL(false)` et rechargement ;
   - la valeur est bien persistée dans le kv-store.
4. `src/i18n/__tests__/pseudo.test.ts` : `pseudoLocalize` garde les variables, allonge d'au moins 30 % et ajoute les marqueurs.
5. `app/__tests__/pseudo-render.test.tsx` : chaque écran (Bibliothèque, Réglages) est rendu en langue `pseudo`, et chaque nœud texte rendu doit contenir `⟦`. C'est le test qui attrape les chaînes en dur. Les noms natifs des langues du sélecteur sont exemptés explicitement, car ce sont des données et non des libellés.
6. `app/__tests__/settings.test.tsx` (test exemple RNTL) : appuyer sur « Deutsch » passe le titre en allemand ; chaque option a un `accessibilityLabel` et un état sélectionné.
7. `app/__tests__/rtl-render.test.tsx` : avec `I18nManager.isRTL` simulé à vrai et la langue `ar`, les écrans se rendent sans erreur et `SplitLayout` met le panneau liste du côté `start`.
8. `src/ui/__tests__/useLayoutMode.test.ts` : 390×844 donne `single`, 1024×768 donne `tablet-split`, 768×1024 (portrait) donne `single`.
9. `src/ui/__tests__/tokens.test.ts` : contraste texte/fond ≥ 4,5:1 en clair et en sombre.

## Risques et parades

| Risque                                                                                             | Parade                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDK 58 trop récent pour executorch et audio-api                                                    | Vérification documentaire avant la fin de l'étape 0 (D-001). Repli sur SDK 57 décidé avant l'étape 1.                                                                 |
| Pas de données Intl/ICU pour `ru`/`wo` sous Hermes, donc pluriels faux (invisible en CI sous Node) | Premier test fait sur l'APK, avant tout le reste. Polyfill ajouté dans l'étape 0 si nécessaire, puis nouvelle build et nouveau test.                                  |
| Le changement de sens RTL exige un redémarrage                                                     | Rechargement automatique avec un message prévenant l'utilisateur (`settings.language.restartRtl`), et seulement quand le sens change.                                 |
| Nom de l'app traduit et nom du store                                                               | `app.name` reste « Tolitoli » dans toutes les langues : clé i18n, valeur identique.                                                                                   |
| La première build EAS fige l'identifiant                                                           | Validé (D-002). `eas init` seulement après le commit des décisions.                                                                                                   |
| Pas d'iPhone à l'étape 0                                                                           | Report limité à l'étape 0 (D-003) ; compte Apple et `eas device:create` exigés avant la clôture de l'étape 1. Les tests RTL et tablette tournent en Jest entre-temps. |

## Branche et commits

- Branche `step-0-init`, créée depuis le commit initial du propriétaire sur `main`.
- Commits successifs du type `step-0: scaffold expo sdk 58 project with expo-router`, `step-0: add i18n with seven locales and rtl switch`, `step-0: add theme and tablet split layout`, `step-0: configure eslint prettier jest`, `step-0: add github actions ci`, `step-0: configure eas profiles`, `step-0: add decisions log and step plan`.
- Chaque commit ne part qu'avec `npm run typecheck && npm run lint && npm test` au vert, et se termine par la ligne `Co-Authored-By`.
- PR vers `main`, dont la description reprend les critères de fin.

## Vérification

1. En local : `npm run typecheck && npm run lint && npm test` au vert, et `npx expo-doctor` sans erreur.
2. CI : la PR `step-0-init` déclenche le workflow, qui passe au vert.
3. Un test volontaire avec un `<Text>Bonjour</Text>` en dur fait échouer `lint` (no-literal-string) et le test de pseudo-rendu. Je le montre dans la PR, puis je le retire.
4. Build : `npx eas-cli@25.3.0 build --profile development --platform android`, puis installation de l'APK sur le téléphone Android, puis `npm start` et connexion du dev client.
5. **Test manuel sur Android physique** (procédure à suivre par le propriétaire) :
   1. **En premier, avant tout autre test** : choisir le russe et vérifier le pluriel de démonstration pour 1, 2, 5 et 21 (formes one/few/many/one), puis le wolof. Si une forme est fausse, je vérifie `Intl.PluralRules` et ajoute le polyfill dans l'étape 0, puis on refait une build et on reprend ce point.
   2. L'app s'ouvre sur la Bibliothèque vide, dans la langue du téléphone ou en `en`.
   3. Dans Réglages, parcourir les sept langues : textes traduits, rien de coupé en allemand.
   4. Passer en arabe : l'app redémarre, la mise en page est en miroir et les onglets sont inversés.
   5. Revenir en français : l'app redémarre et la mise en page repasse de gauche à droite.
   6. Grossir la police système au maximum : le texte s'agrandit et ne se superpose pas.
   7. Passer en mode sombre : le thème suit.
   8. Activer TalkBack : chaque option est annoncée avec son état.
   9. Sur une tablette Android en paysage, si disponible : deux panneaux vides visibles.
6. iPhone : reporté à l'étape 1 (D-003). La même procédure, pluriels en premier, sera rejouée après `eas device:create` et une build iOS de développement, avant la clôture de l'étape 1.
7. Fin d'étape : entrées D-001 à D-008 écrites, résultat de la vérification de compatibilité SDK 58 consigné, PR ouverte.
