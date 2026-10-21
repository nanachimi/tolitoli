# Journal des décisions — Tolitoli

Une entrée par décision structurante. Format : date, étape, contexte, décision, alternatives écartées, conséquences. Les entrées ne sont jamais réécrites : une décision révisée donne lieu à une nouvelle entrée qui renvoie à l'ancienne.

---

## D-001 — Expo SDK 58

- **Date / étape** : 2026-10-21, étape 0
- **Contexte** : la consigne demande le SDK stable le plus récent. Le SDK 58 (expo 58.0.16, React Native 0.88.0, React 19.3.0) est sorti le 29/09/2026. Le risque était la compatibilité des deux modules natifs critiques des étapes 1 et 3.
- **Décision** : SDK 58.
- **Vérification de compatibilité (21/10/2026, documentaire)** :
  - react-native-executorch : la v0.10.6 (19/10/2026) annonce « React Native 0.87/0.88 and Expo SDK 58 support » et exige `react-native-blob-util` ≥ 0.24.11. Dernière version : 0.10.7.
  - react-native-audio-api : le tableau de compatibilité officiel marque la branche 0.13.x « yes » pour RN 0.88 (nouvelle architecture). Dernière version : 0.13.6.
  - Conclusion : pas de repli sur SDK 57. La confirmation réelle viendra des builds des étapes 1 et 3.
- **Alternative écartée** : SDK 57 (RN 0.87), plus mûr mais à faire monter de version plus tard.
- **Sources** : [executorch releases](https://github.com/software-mansion/react-native-executorch/releases), [audio-api compatibility](https://docs.swmansion.com/react-native-audio-api/docs/other/compatibility).

## D-002 — Identifiant de bundle et de package

- **Date / étape** : 2026-10-21, étape 0
- **Décision** :
  - Production : `app.tolitoli.mobile` sur iOS et Android. Cet identifiant est figé dès la première build EAS.
  - Variantes : `app.tolitoli.mobile.dev` (« Tolitoli Dev ») et `app.tolitoli.mobile.preview` (« Tolitoli Preview »), choisies par `APP_VARIANT` dans `app.config.ts`, pour que les trois builds coexistent sur l'appareil.
- **Conséquence** : le domaine (tolitoli.app / .com) peut être choisi plus tard, l'identifiant ne changera pas.

## D-003 — iPhone reporté à l'étape 1, pas au-delà

- **Date / étape** : 2026-10-21, étape 0
- **Contexte** :
  - Xcode n'est pas installé sur le Mac de développement.
  - Installer un dev client EAS sur un iPhone physique exige un compte Apple Developer payant.
- **Décision** :
  - L'étape 0 est close sur Android physique et la CI.
  - Le compte Apple Developer et `eas device:create` sont **obligatoires avant la clôture de l'étape 1**, dont le critère de fin (60 min écran verrouillé sur iPhone et Android) exige l'iPhone : l'arrière-plan audio iOS est ce qui casse le plus souvent.
  - Aucun report sur les étapes 1 à 4.
- **Alternative écartée** : Xcode avec un Apple ID gratuit (profil valable 7 jours, fragile, ne prépare pas TestFlight).

## D-004 — Documents dans `docs/`, branches d'étape

- **Date / étape** : 2026-10-21, étape 0
- **Contexte** : `main` contenait déjà un commit initial du propriétaire avec les documents à la racine et `.DS_Store`.
- **Décision** :
  - Le déplacement vers `docs/` et le retrait de `.DS_Store` sont faits sur la branche `step-0-init`.
  - Tout passe par des PR, jamais de commit direct sur `main`.

## D-005 — Stockage de la langue d'interface

- **Date / étape** : 2026-10-21, étape 0
- **Décision** : `expo-sqlite/kv-store`, clé `ui.language`.
  - Son API est synchrone : la langue est lue avant le premier rendu, sans clignotement.
  - Le module est déjà dans la stack.
  - C'est une base distincte de la future base drizzle (étape 2) : pas d'impact sur son schéma.
- **Alternatives écartées** :
  - AsyncStorage : nouvelle dépendance, API asynchrone.
  - expo-secure-store : réservé aux secrets.

## D-006 — Bascule RTL

- **Date / étape** : 2026-10-21, étape 0
- **Décision** :
  - Le plugin `expo-localization` est configuré avec `supportsRTL: true`.
  - Au lancement et à chaque changement de langue, si `I18nManager.isRTL` ne correspond pas au sens de la langue : `allowRTL` + `forceRTL`, puis rechargement (`DevSettings.reload()` en dev, `Updates.reloadAsync()` sinon). `forceRTL` est persistant, il n'y a donc pas de boucle.
  - Un message prévient l'utilisateur une seconde avant le rechargement.
- **Conséquence** : un appareil réglé dans une langue RTL non prise en charge (hébreu…), avec l'app en anglais, est remis en LTR au premier lancement.

## D-007 — Traductions initiales

- **Date / étape** : 2026-10-21, étape 0
- **Décision** :
  - `fr.json` est la source.
  - en, de, ru, ar, zh-Hans et wo sont des **brouillons** produits automatiquement.
  - **À faire relire par un locuteur natif avant publication**, en priorité le wolof (orthographe officielle sénégalaise, terminologie à valider : « Bibliyoteek », « Tànneef yi », « baat bu ñu dénc » pour « enregistrement »).
- **Garde-fous en CI** :
  - parité des clés avec `fr.json` ;
  - formes de pluriel CLDR complètes pour chaque langue ;
  - variables `{{…}}` identiques ;
  - pseudo-localisation de chaque écran ;
  - règle ESLint `i18next/no-literal-string`.

## D-008 — Repli du chinois traditionnel

- **Date / étape** : 2026-10-21, étape 0
- **Décision** :
  - zh-Hant n'est pas proposé.
  - Toute locale chinoise (zh-Hans, zh-Hant, zh-TW, zh-HK, zh-MO) donne `zh-Hans`.
  - Dans i18next, la chaîne de repli est `zh-Hant → zh-Hans → en`.
- **Raison** : un lecteur de Taïwan ou de Hong Kong lit le chinois simplifié bien plus facilement que l'anglais.

## D-009 — Détection tablette pour la vue à deux panneaux

- **Date / étape** : 2026-10-21, étape 0
- **Contexte** : le cahier des charges dit « ≥ 768 pt, paysage ». Or un grand téléphone en paysage dépasse 768 pt de large (iPhone Pro Max : 932 pt) et aurait donc deux panneaux trop étroits.
- **Décision** : deux panneaux seulement si les trois conditions sont réunies :
  - largeur ≥ 768 ;
  - largeur > hauteur ;
  - plus petit côté ≥ 600 (seuil tablette Android sw600dp, que tous les iPad dépassent).
- **À valider** à l'étape 5 sur iPad et tablette Android.

## D-010 — Routes dans `app/` à la racine

- **Date / étape** : 2026-10-21, étape 0
- **Contexte** : le template SDK 58 place les routes dans `src/app/`, mais CLAUDE.md impose `app/` à la racine.
- **Décision** :
  - `app/` à la racine, conformément à CLAUDE.md. expo-router l'utilise tant que `src/app/` n'existe pas.
  - **Ne jamais créer `src/app/`.**
  - Les tests d'écrans vivent dans `__tests__/screens/`, hors de `app/`, pour ne pas être pris pour des routes.

## D-011 — Écarts d'outillage par rapport au plan d'étape 0

- **Date / étape** : 2026-10-21, étape 0
- **ESLint 9.39** et non 10 : `npx expo install` retient la version compatible avec `eslint-config-expo` 58.
- **`react-dom` 19.3.0 ajouté** pour figer une dépendance pair d'expo-router. Sinon npm prend 19.3.1, qui exige React 19.3.1 et entre en conflit avec React 19.3.0 imposé par le SDK.
- **TypeScript 6** : l'option `types` vaut `[]` par défaut, d'où `"types": ["jest"]` dans `tsconfig.json`.
- **`projectId` EAS** : écrit en dur dans `app.config.ts` après `eas init`. C'est un identifiant public, pas un secret, et il doit être lisible sur les serveurs EAS sans variable d'environnement.
- **Scripts d'installation npm 11** : ceux de `@parcel/watcher`, `fsevents` et `unrs-resolver` restent bloqués, car des binaires précompilés suffisent. À réexaminer si une build échoue.

## D-012 — Polyfill Intl pour les pluriels (Hermes Android)

- **Date / étape** : 2026-10-21, étape 0
- **Constat sur appareil** (premier test après installation de l'APK de développement, Android physique) : la section Diagnostic affiche `Intl.PluralRules: unavailable`. Sans cette API, i18next applique une règle anglaise one/other :
  - le russe affiche une forme fausse pour 2, 5 ou 11 ;
  - le wolof, qui n'a que la forme `other`, retombe sur l'anglais pour 1.

  La CI sous Node, avec ICU complet, ne pouvait pas le voir.

- **Décision** : charger les polyfills formatjs avant l'initialisation d'i18next (`src/i18n/intlPolyfills.ts`, importé en premier par `src/i18n/index.ts`), pour les sept langues de l'interface.
  - `@formatjs/intl-getcanonicallocales` ^3.2.12 et `@formatjs/intl-locale` ^5.3.12 sont des prérequis documentés du polyfill de pluriels. `Intl.Locale` sert quand la langue demandée ne correspond pas exactement aux données (`zh-Hans` → données `zh`, `pseudo`).
  - `@formatjs/intl-pluralrules` ^6.3.16, avec les données CLDR fr, en, de, ru, ar, wo et zh.
  - Chargement conditionnel (`shouldPolyfill`) : un moteur doté d'une implémentation native complète ne charge rien. Dès qu'une seule langue manque, l'implémentation entière est remplacée (`polyfill-force`), pour que toutes les langues suivent les mêmes règles.
- **Garde-fou CI** : `src/i18n/__tests__/intlPolyfills.test.ts`.
  - Le test retire `Intl.PluralRules`, `Intl.Locale` et `Intl.getCanonicalLocales` pour reproduire Hermes, recharge i18n, puis vérifie les formes ru (1, 2, 5, 11, 21), wo, ar (0, 1, 2, 3, 11, 100), fr, de, en et zh-Hans.
  - Sans le polyfill, 9 cas sur 14 échouent.
- **Jest** : les paquets formatjs sont uniquement en ES modules, donc `@formatjs` est ajouté aux exceptions de `transformIgnorePatterns`.
- **Diagnostic** : en dev, l'écran Réglages indique `[polyfill]` ou `[native]`.
- **À surveiller** : d'autres API Intl (`DateTimeFormat`, `NumberFormat`, `RelativeTimeFormat`) peuvent manquer aussi sur cet appareil. À vérifier sur l'appareil au début de l'étape 2, avant d'afficher dates et durées dans la Bibliothèque. Je n'ajoute aucun polyfill sans constat.
- **Résultat sur appareil** (2026-10-21, Samsung Galaxy A05 SM-A055F, APK de développement, captures prises par adb) : vérifié.
  - Russe : la ligne de diagnostic affiche `Intl.PluralRules(ru) [polyfill] → ru: one, few, many, other`. 0 « записей », 1 « запись », 2 « записи », 5 « записей », 11 « записей », 21 « запись », 100 « записей ».
  - Wolof : la ligne de diagnostic affiche `Intl.PluralRules(wo) [polyfill] → wo: other`. 1 « 1 baat yu ñu dénc », sans repli sur l'anglais.
  - Captures : [russe](captures/step-0/d012-pluriels-russe-polyfill.png), [wolof](captures/step-0/d012-pluriels-wolof-polyfill.png), [arabe](captures/step-0/rtl-05-pluriels-arabe.png).
- **Numérotation** : la demande parlait de D-009, mais ce numéro était déjà pris par la détection tablette. Les entrées n'étant jamais renumérotées, celle-ci prend le numéro suivant libre.

## D-013 — Icônes de la barre d'onglets

- **Date / étape** : 2026-10-21, étape 0
- **Contexte** : sans icône, la barre d'onglets gardait une zone vide au-dessus des libellés (constaté sur l'appareil).
- **Décision** : ajouter `@expo/vector-icons` ^15.0.2 (version du SDK 58). Il repose sur `expo-font`, déjà compilé dans le dev client, donc pas de nouvelle build.
  - Icônes Ionicons **symétriques**, sans sens de lecture, donc rien à inverser en RTL : `albums` pour la Bibliothèque et `settings` pour les Réglages. Pleine sur l'onglet actif, en contour sinon.
  - L'icône `library` d'Ionicons a été écartée parce que ses livres penchés auraient dû être inversés en RTL.
  - Les libellés sont inchangés. Les icônes sont décoratives et masquées aux lecteurs d'écran : le nom accessible reste celui de l'onglet.
- **Règle pour la suite** : toute icône directionnelle (flèches, lecture, retour) devra être inversée en RTL et testée en arabe.
- **Capture** : [barre d'onglets avec icônes](captures/step-0/d013-icones-onglets.png).

## D-014 — Barre d'onglets et grandes polices

- **Date / étape** : 2026-10-21, étape 0
- **Constat sur appareil** (Galaxy A05, Android 14, police système à 2.0) : les libellés des onglets étaient coupés par la barre de navigation système. La barre gardait la hauteur fixe de React Navigation (49 pt plus la marge système du bas), alors que le libellé de 10 pt doublait de taille.
- **Décision** :
  - Les libellés des onglets suivent la police système jusqu'à **1,5×** (`maxFontSizeMultiplier`), puis s'arrêtent. iOS ne grossit pas non plus les libellés de sa barre d'onglets au-delà d'un seuil.
  - La barre **grandit** de la hauteur supplémentaire du libellé plafonné : `getTabBarHeight(fontScale, bottomInset)` dans `src/ui/layout/tabBar.ts`, testée unitairement.
  - Le texte des écrans n'est **jamais** plafonné.
- **Vérifié sur appareil** à police 2.0, en français et en allemand (« Einstellungen ») : libellés entiers, la barre commence à y = 1406 px au lieu de 1418.
- **Leçon de méthode** : la première vérification a tourné sur l'ancien code, car la mise à jour à chaud n'avait pas été appliquée à la barre d'onglets. Avant toute vérification sur appareil d'un changement de layout, relancer complètement l'app (fermeture forcée, puis lien profond vers Metro).
- **Captures** (police 2.0) :
  - Avant le correctif : [Bibliothèque fr](captures/step-0/d014-avant-police2-bibliotheque-fr.png), [Réglages fr](captures/step-0/d014-avant-police2-reglages-fr.png), [Einstellungen de](captures/step-0/d014-avant-police2-reglages-de.png), [Bibliothek de](captures/step-0/d014-avant-police2-bibliotheque-de.png).
  - Ancien bundle, vérification invalide : [Réglages fr](captures/step-0/d014-ancien-bundle-police2-reglages-fr.png), [Einstellungen de](captures/step-0/d014-ancien-bundle-police2-reglages-de.png).
  - Après correctif et relance : [Bibliothèque fr](captures/step-0/d014-apres-police2-bibliotheque-fr.png), [Réglages fr](captures/step-0/d014-apres-police2-reglages-fr.png), [Einstellungen de](captures/step-0/d014-apres-police2-reglages-de.png), [Bibliothek de](captures/step-0/d014-apres-police2-bibliotheque-de.png).

## D-015 — Barre de navigation Android en mode sombre : reportée à l'étape 1

- **Date / étape** : 2026-10-21, étape 0
- **Constat sur appareil** : en mode sombre, la barre de navigation système d'Android reste claire, alors que le reste de l'app suit le thème.
- **Décision** : corriger avec `expo-navigation-bar` (couleur et style des boutons selon le thème) **lors de la prochaine build native, c'est-à-dire à l'étape 1**, qui en demande une de toute façon pour l'audio. Le module est natif : l'ajouter maintenant imposerait une build supplémentaire pour un défaut purement esthétique.
- **À faire à l'étape 1** : inscrire la dépendance dans le plan de l'étape 1, puis vérifier en clair et en sombre sur le Galaxy A05.

## D-016 — Message de redémarrage dans la langue quittée

- **Date / étape** : 2026-10-21, étape 0
- **Contexte** : quand le sens d'écriture change (vers ou depuis l'arabe), l'app affiche « L'application va redémarrer… » pendant une seconde, avant de changer de langue (D-006). Le message est donc rédigé dans la langue que l'utilisateur quitte : en passant du russe à l'arabe, il s'affiche en russe.
- **Décision** : **choix délibéré, conservé.** L'utilisateur lit forcément la langue qu'il quitte, puisqu'il vient de s'en servir pour trouver l'option, alors qu'il ne lit peut-être pas encore la langue choisie.
- **Alternative écartée** : afficher le message dans la langue cible. Ce serait plus cohérent visuellement, mais potentiellement illisible pour la personne qui fait le choix.

## D-017 — `expo-font` en dépendance directe et alignement sur les correctifs du SDK 58

- **Date / étape** : 2026-10-21, étape 0
- **Constat (CI de la PR, `npm run doctor`)** :
  1. `expo-font`, dépendance pair de `@expo/vector-icons` (D-013), n'était présent que de façon indirecte, via `expo`. Expo exige qu'un module natif pair soit déclaré directement.
  2. Expo a publié des correctifs du SDK 58 dans la journée (`expo` 58.0.17, `expo-router` 58.0.25, `expo-updates` 58.0.18…). `expo-doctor` compare les versions installées aux dernières versions publiées : le contrôle qui passait le matin échouait le soir sans changement de notre côté.
- **Décision** :
  - `npx expo install expo-font` (~58.0.9, même version que celle déjà compilée dans l'APK).
  - `npx expo install --fix` jusqu'à ce que `expo-doctor` passe ses 20 vérifications.
- **Pas de nouvelle build** : j'ai comparé le contenu publié des versions concernées.
  - Côté Android, seuls les numéros de version de `build.gradle` changent.
  - Le seul changement natif est un module iOS ajouté à `expo-status-bar`, sans effet tant qu'il n'y a pas de build iOS.
  - L'APK de développement reste compatible : l'app a été relancée sur un bundle neuf, sans erreur ([capture](captures/step-0/apres-correctifs-sdk-58-0-17.png)).
- **Conséquence pour la CI** : l'étape « Expo doctor » reste bloquante. Elle peut donc échouer à chaque nouveau correctif publié par Expo, même sans changement dans le dépôt. La réponse attendue est `npx expo install --fix` dans la PR en cours. Si ces ruptures deviennent trop fréquentes, on pourra rendre ce contrôle de versions non bloquant et garder les autres contrôles du doctor bloquants. Ce n'est pas encore décidé.

## D-018 — Contrôle des versions du SDK non bloquant en CI

- **Date / étape** : 2026-10-21, étape 0
- **Contexte** : le contrôle de versions d'`expo-doctor` compare les dépendances installées aux derniers correctifs publiés par Expo. La CI peut donc échouer sans aucun changement dans le dépôt (D-017).
- **Décision** :
  - L'étape CI « Expo doctor » reste **bloquante** pour tous les autres contrôles (19 sur 20). Seul le contrôle de versions est désactivé, par la variable officielle `EXPO_DOCTOR_SKIP_DEPENDENCY_VERSION_CHECK=1`.
  - Une étape séparée, « Expo SDK versions (non-blocking) », lance `npx expo install --check`. En cas d'écart, elle émet un **avertissement GitHub** visible dans la PR (`::warning`), sans faire échouer la CI.
  - **Contrepartie**, inscrite dans CLAUDE.md (Méthode de travail) : `npx expo install --fix` est exécuté à l'ouverture de chaque étape et avant chaque build EAS, et le résultat est commité séparément.
- **Vérifié en local** :
  - Le doctor bloquant passe 19 contrôles sur 19.
  - Avec un écart simulé (`expo-status-bar` déclaré en 58.0.3 au lieu de 58.0.4, puis restauré), l'étape non bloquante affiche l'avertissement et sort avec le code 0, et le doctor bloquant reste vert.
- **Alternative écartée** : `continue-on-error` sur tout le doctor, qui aurait aussi rendu non bloquants les autres contrôles, dont celui des dépendances pair manquantes qui a détecté `expo-font` (D-017).

## D-019 — Test TalkBack par adb : ce qui est vérifié, ce qui reste à confirmer à l'oreille

- **Date / étape** : 2026-10-21, étape 0. Galaxy A05 (SM-A055F), Android 14, TalkBack Samsung 14.1.00.6, APK de développement.
- **Méthode** :
  - Arbre d'accessibilité lu par `uiautomator dump`, en deux versions :
    - le dump complet, qui contient toutes les vues ;
    - le dump `--compressed`, qui ne garde que les vues importantes pour l'accessibilité, celles que TalkBack peut atteindre.
  - Écrans Bibliothèque et Réglages, en français puis en arabe.
  - Ensuite, TalkBack activé par `settings put secure enabled_accessibility_services`.

### 1. Vérifié structurellement (arbre d'accessibilité)

**Onglets**, dans l'ordre de l'arbre :

| Langue | 1er                                                         | 2e                                 |
| ------ | ----------------------------------------------------------- | ---------------------------------- |
| fr     | « Bibliothèque », sélectionné sur la Bibliothèque, à gauche | « Réglages », à droite             |
| ar     | « المكتبة » (Bibliothèque), à droite                        | « الإعدادات » (Réglages), à gauche |

- Chaque onglet est un nœud focusable et cliquable, avec une description traduite. L'état `selected` suit l'onglet actif.
- En arabe, l'ordre de l'arbre suit le sens de lecture : l'onglet de droite vient en premier.

**Icônes d'onglet : exclues.**

- Dans le dump complet, ce sont des `TextView` contenant un seul glyphe de police d'icônes (U+F10F/U+F110 pour `albums`, U+F56C/U+F56B pour `settings`), **sans description et non focusables**.
- Elles sont **absentes du dump compressé**, donc hors de portée de TalkBack.
- Vérifié sur les quatre écrans.

**Options de langue (Réglages)** : 8 nœuds de classe `RadioButton`, cochables, focusables et cliquables, dans cet ordre : Français, English, Deutsch, Русский, العربية, Wolof, 简体中文, Pseudo (dev seulement).

| Langue de l'interface | Libellé                                 | Cochée             |
| --------------------- | --------------------------------------- | ------------------ |
| fr                    | « Langue de l'interface : <nom natif> » | Français seulement |
| ar                    | « لغة الواجهة: <nom natif> »            | العربية seulement  |

**Ordre complet de l'arbre compressé**, Réglages en français :

1. bouton « Tools » du dev client, absent de l'app publiée ;
2. titre « Réglages » ;
3. « Langue de l'interface » ;
4. phrase d'aide ;
5. les 8 options, chacune suivie de son `TextView` enfant portant le nom natif ;
6. « Diagnostic (développement) » et ses lignes, en dev seulement ;
7. onglet Bibliothèque ;
8. onglet Réglages.

En arabe, l'ordre est le même, avec les textes alignés à droite ([capture](captures/step-0/d019-arbre-a11y-bibliotheque-ar.png)).

**Annonce réellement captée.** Une seule : le message de redémarrage (région `accessibilityLiveRegion="polite"`) a été prononcé en arabe, « سيُعاد تشغيل التطبيق لتغيير اتجاه الكتابة. ». Il a été lu dans le bandeau « texte prononcé » des options de développeur de TalkBack ([capture](captures/step-0/d019-talkback-annonce-message-redemarrage-ar.png)).

### 2. Ce qui n'a pas pu être fait par adb (constaté, pas déduit)

- **Parcourir les éléments avec TalkBack** :
  - Un `input tap` injecté n'est pas traité comme « explorer au toucher » : c'est un **vrai clic**. Toucher « Français » a activé l'option et relancé l'app en français.
  - Les raccourcis clavier `Alt + flèche droite` (`input keycombination`) ne déplacent pas le focus : aucune annonce, aucun changement à l'écran ([capture](captures/step-0/d019-talkback-raccourci-clavier-sans-effet.png)).
  - Aucune annonce d'onglet ou d'option n'a donc été captée.
- **Lire les annonces dans logcat** : TalkBack ne journalise pas ses annonces à ce niveau, et le moteur vocal Samsung ne journalise qu'une forme chiffrée du texte (`[Synthesize] text = Po95l97BBIVKL6pYqzeG0w==`).
- **Rôles et états annoncés** : `uiautomator dump` n'expose ni le rôle « onglet », ni l'en-tête (`accessibilityRole="header"`), ni le groupe d'options (`radiogroup`), ni la formulation « coché / non coché » que TalkBack prononce.

### 3. Reste à confirmer à l'oreille (propriétaire)

1. Annonce de chaque onglet : nom, rôle « onglet » et « sélectionné ». L'icône ne doit pas être lue.
2. Annonce de chaque option : « Langue de l'interface : Français, case d'option, cochée » (ou formulation équivalente), et « non cochée » pour les autres.
3. Pas de **double focus** sur une option : le `TextView` enfant (nom natif) ne doit pas recevoir son propre focus après le `RadioButton`.
4. Ordre de balayage droite/gauche conforme à l'arbre ci-dessus, en français et en arabe.
5. Titres annoncés comme en-têtes (« Langue de l'interface », « Aucun enregistrement »).
6. **Prononciation** : la synthèse du téléphone était réglée sur l'anglais (`FailoverTextToSpeech: Restored TTS locale to en_GB`). Il faut écouter comment sont lus les libellés français et arabes, ainsi que les noms natifs mêlés (« لغة الواجهة: Français »). Sur Android, React Native n'offre pas d'attribut de langue par élément (`accessibilityLanguage` est réservé à iOS). Si la lecture est mauvaise, une solution sera proposée à l'étape 5.

### 4. Effets de bord sur le téléphone, et remise en état

- Au premier démarrage, TalkBack a ouvert son tutoriel, fermé avec la touche Retour.
- Il a aussi demandé l'autorisation « gérer les appels téléphoniques ». Elle a été **fermée avec Retour, sans choix enregistré** (`READ_PHONE_STATE: granted=false`).
- L'app est passée de l'arabe au français : c'était son état initial.
- Remise en état vérifiée, identique au relevé de départ :
  - `enabled_accessibility_services` vide ;
  - `accessibility_enabled=0` et `touch_exploration_enabled=0` ;
  - aucun service lié ;
  - police à 1.0 ;
  - mode clair ;
  - Tolitoli en français sur la Bibliothèque.
- Les captures du tutoriel et de la demande d'autorisation ne sont pas versionnées, car ce sont des écrans d'une autre application.
