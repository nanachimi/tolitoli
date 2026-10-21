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
