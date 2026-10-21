# CLAUDE.md — Tolitoli

## Le projet en une phrase

Tolitoli est une app mobile gratuite (iPhone, iPad, téléphones et tablettes Android) qui enregistre une conversation, la transcrit et la conserve en local ou dans le cloud. La transcription locale (Whisper embarqué) est gratuite et illimitée ; la transcription cloud, plus précise, est optionnelle et payante au-delà d'un quota mensuel.

Le cahier des charges complet est dans `docs/CAHIER_DES_CHARGES.md`. Lis-le avant toute étape. Les décisions prises au fil du projet sont consignées dans `docs/DECISIONS.md` : ajoute une entrée à chaque décision structurante.

## Identité

- Nom de l'app : **Tolitoli** (même graphie partout : fiches stores, `app.json`, textes d'interface, notifications). Clé i18n `app.name`, jamais en dur.
- Slug Expo : `tolitoli`. Identifiant de bundle iOS et nom de package Android : `app.tolitoli.mobile` (à ajuster si le domaine retenu diffère ; décision à consigner dans `docs/DECISIONS.md` avant la première build EAS, car il ne change plus ensuite).
- Schéma d'URL : `tolitoli://`.
- Ne pas utiliser le nom dans le code à la place d'un terme technique (pas de `TolitoliService`) : les modules portent le nom de ce qu'ils font.

## Méthode de travail

- Le projet avance par étapes numérotées (voir le cahier des charges, section « Plan de développement »). Ordre d'exécution : 0, 1, 2, 3, 4, 7a (backend minimal : Supabase, auth anonyme, Edge Function, quota, RLS), 8 (Deepgram + Intron Sahara v2.5 + `languages.ts`), 5, 6, 6b, 7b (comptes nommés et synchronisation), 9. La première version publiée = 0 à 4 + 7a + 8 + 5. Une étape = une branche `step-N-<slug>` = une PR.
- Avant d'écrire du code pour une étape : propose un plan détaillé (fichiers à créer/modifier, dépendances, risques, tests, critères de fin). Attends la validation explicite de l'utilisateur.
- Ne commence jamais l'étape suivante sans que les critères de fin de l'étape en cours soient remplis.
- Quand tu hésites entre deux approches, expose les deux avec leurs compromis et demande. Ne tranche pas seul sur : choix de bibliothèque native, schéma de base de données, modèle de tarification, texte juridique.
- L'audio ne se teste que sur appareil physique. Le simulateur/émulateur n'a pas de micro fiable : dis-le quand un test manuel est requis et décris la procédure.

## Stack imposée

| Domaine | Choix | Ne pas remplacer sans accord |
| --- | --- | --- |
| Framework | Expo SDK 54+ (React Native, nouvelle architecture), TypeScript strict | Oui |
| Navigation | expo-router | Oui |
| Audio | expo-audio (fichier .m4a) + react-native-audio-api (flux PCM 16 kHz mono) | Oui |
| Transcription locale | react-native-executorch, hook `useSpeechToText` (Whisper) | Oui |
| Détection de voix | react-native-vad ou le VAD d'executorch | Non |
| Base locale | expo-sqlite (ou op-sqlite si SQLCipher requis) + drizzle-orm, FTS5 | Oui |
| Fichiers | expo-file-system | Oui |
| État | zustand + TanStack Query | Non |
| Arrière-plan | expo-task-manager, expo-background-task | Non |
| Secrets locaux | expo-secure-store | Oui |
| Backend (étape 7+) | Supabase : Auth, Postgres + RLS, Storage, Edge Functions (Deno) | Oui |
| STT cloud, grandes langues (étape 8) | Deepgram via Edge Function ; la clé API ne quitte jamais le serveur | Oui |
| STT cloud, langues africaines (étape 8) | Intron Sahara v2.5 via Edge Function (API REST ; flux réservé à la V2) ; Sunbird ASR-51 auto-hébergé en repli pour lingala et malgache si Intron ne les couvre pas | Oui |
| Paiement (étape 9) | RevenueCat | Oui |
| Build / distribution | EAS Build, EAS Update, EAS Submit ; dev client (pas Expo Go) | Oui |
| Tests | Jest + React Native Testing Library ; Maestro pour les parcours | Non |
| i18n | i18next + expo-localization ; sept langues dès l'étape 0 : `fr` (source), `en` (repli), `de`, `ru`, `ar` (RTL), `wo`, `zh-Hans` | Oui |

Ne pas ajouter de dépendance sans la justifier dans le plan de l'étape. Préférer les modules maintenus par Expo ou Software Mansion.

## Structure du dépôt

```
app/                 écrans expo-router (routes par fichiers)
src/features/        recording, transcription, library, player, sync, billing
src/services/        audio, whisper, cloudStt, storage, quota — TypeScript pur, sans React
src/db/              schéma drizzle, migrations, requêtes FTS
src/ui/              composants partagés, thème, layouts tablette
src/i18n/            fr.json, en.json
supabase/            fonctions Edge, migrations SQL, politiques RLS
docs/                CAHIER_DES_CHARGES.md, DECISIONS.md, plans d'étapes (docs/plans/step-N.md)
```

## Règles de code

- TypeScript `strict: true`, pas de `any` sans commentaire justificatif.
- Les services métier (`src/services`) n'importent jamais React ni de composant d'interface : ils doivent être testables en Jest sans appareil.
- Chaque règle de routage local/cloud, chaque migration, chaque calcul de quota a un test unitaire.
- Aucune clé secrète dans le dépôt : `.env` est ignoré par git, `app.config.ts` lit `process.env`, les secrets de build passent par EAS Secrets.
- Interface traduite via i18n, aucune chaîne en dur dans les composants ; clés en anglais, un JSON par langue dans `src/i18n/`. Le sélecteur de langue est dans l'app (le wolof n'existe pas comme langue système). L'arabe impose le RTL : `I18nManager`, icônes directionnelles en miroir, chaque écran testé en RTL. L'allemand impose des libellés 30 % plus longs : jamais de largeur fixe sur un texte. Pseudo-localisation en CI.
- La langue de l'interface et la langue de transcription sont deux réglages indépendants.
- Accessibilité : chaque élément interactif a un `accessibilityLabel` ; polices dynamiques respectées.
- Commits en anglais, impératif, préfixés par l'étape : `step-3: persist transcription queue`.
- Avant tout commit : `npm run typecheck && npm run lint && npm test` verts.
- Captures d'écran : enregistrées dans `docs/captures/step-N/` (N = étape en cours), réduites à 720 px de large, nom descriptif en minuscules et sans espace (`d014-apres-police2-reglages-de.png`), commitées avec l'étape et référencées depuis l'entrée de `docs/DECISIONS.md` qu'elles documentent. Jamais de capture d'une autre application ni de données personnelles.

## Contraintes produit non négociables

- Le mode local fonctionne sans compte, sans réseau, sans télémétrie.
- Le cloud n'est jamais activé par défaut ; aucune donnée audio ou texte ne quitte l'appareil sans action explicite de l'utilisateur.
- **Local d'abord, toujours.** Un enregistrement est écrit sur l'appareil avant toute chose, même avec le cloud activé et le réseau disponible ; le cloud ne reçoit qu'une copie. Ne jamais concevoir un chemin où l'audio part directement vers le réseau.
- **Appels téléphoniques.** Aucune app tierce ne peut capter l'audio d'un appel sur iOS ni sur Android (Play Store interdit l'API d'accessibilité pour cela depuis 2022 ; micro silencieux pendant un appel depuis Android 10). Ne jamais proposer ni implémenter de capture d'appel par service d'accessibilité, `AudioSource.VOICE_CALL`, ou micro pendant un appel. Ce que l'app fait : détecter début/fin d'appel (CallKit `CXCallObserver`, `READ_PHONE_STATE`), proposer un mémo post-appel, importer et transcrire les enregistrements faits par le dialer intégré (feuille de partage iOS, surveillance du dossier d'enregistrements sur Android). Voir le cahier des charges, section « Appels téléphoniques ».
- Écran de consentement légal au premier lancement (enregistrer une conversation sans le consentement des participants est illégal dans de nombreux pays). Ne jamais proposer de mode « discret » ou cacher l'indicateur d'enregistrement.
- Permissions iOS : `NSMicrophoneUsageDescription`, `UIBackgroundModes: ["audio"]`. Android : `RECORD_AUDIO`, `FOREGROUND_SERVICE_MICROPHONE`, `POST_NOTIFICATIONS`, service de premier plan avec notification persistante pendant l'enregistrement.
- Suppression de compte et de toutes les données en un geste, depuis l'app.
- Les achats passent uniquement par StoreKit / Google Play Billing (RevenueCat).

## Routage de la transcription (résumé, détail dans le cahier des charges §5)

1. Cloud désactivé → Whisper local.
2. Cloud activé et quota mensuel suffisant → cloud.
3. Cloud activé, quota épuisé, abonnement actif → cloud.
4. Cloud activé, quota épuisé, pas d'abonnement → local + proposition d'achat.
5. Hors ligne → local, retranscription cloud possible plus tard.

Le quota est compté côté serveur ; le cache local n'est qu'indicatif.

## Langues de transcription (détail dans le cahier des charges, section « Langues »)

Dix langues africaines sont supportées dès la première version publiée : swahili, haoussa, yoruba, lingala, malgache, luganda, zoulou, wolof, pidgin nigérian, igbo.

- Whisper embarqué couvre les grandes langues (fr, en, de, ru, zh, ar standard) correctement. Parmi les dix langues africaines, il n'en couvre que cinq, et mal : swahili, haoussa, yoruba (qualité « brouillon »), lingala, malgache (qualité « moyenne »). Igbo, pidgin, zoulou, luganda et wolof n'ont aucun moteur local : sans cloud, l'app doit le dire clairement et proposer d'activer le cloud.
- Moteur cloud des langues africaines : **Intron Sahara v2.5** (31 langues africaines, 12 modèles bilingues pour le mélange anglais ⇄ langue africaine, API REST et flux). Deepgram reste le moteur cloud des grandes langues. Sunbird ASR-51 auto-hébergé uniquement si Intron ne couvre pas le lingala ou le malgache.
- Une seule interface `TranscriptionEngine`, implémentations `WhisperLocal`, `DeepgramCloud`, `SaharaCloud` (et `SunbirdCloud` si nécessaire). Le routage choisit le moteur d'après la langue de transcription sélectionnée par l'utilisateur, jamais d'après la détection automatique, qui n'est pas fiable pour ces langues.
- Le quota cloud est compté sur un identifiant anonyme Supabase lié à l'appareil : aucun compte nommé n'est requis pour transcrire en cloud.
- V1 : transcription cloud différée (fichier envoyé à la fin de l'enregistrement, après écriture locale). Le flux Sahara (transcription en direct) est une option de V2.
- Ne jamais annoncer une langue comme « reconnue » sans l'indicateur de qualité (bonne / moyenne / brouillon). Toute langue est validée sur 30 minutes d'audio réel conversationnel, avec mélange de langues, et le résultat est consigné dans `docs/DECISIONS.md`. Les chiffres publiés par Intron sont des chiffres éditeur, pas une mesure.
- La table des langues (code, moteur local éventuel, moteur cloud, qualité attendue) vit dans `src/services/transcription/languages.ts` et pilote à la fois le sélecteur et le routage.

## Synchronisation : règles invariantes (détail dans le cahier des charges, section « Synchronisation intelligente »)

- L'audio est écrit sur disque par blocs toutes les 2 s ; un fichier partiel est finalisé et marqué « récupéré » au lancement suivant, jamais supprimé.
- Chaque changement local est inscrit dans la table `outbox` dans la même transaction SQLite que la donnée.
- Upload résumable par morceaux (TUS, 5 Mo) ; somme de contrôle SHA-256 vérifiée côté serveur avant de marquer `synced`.
- Recul exponentiel 10 s → 15 min ; politique par défaut : audio sur wifi seulement, texte sur tout réseau.
- Un enregistrement n'est jamais effacé localement tant qu'il n'est pas `synced` et vérifié, et seulement si l'utilisateur le demande.
- États d'un enregistrement : `recording → local → queued → uploading → verifying → synced | error`. Toute transition est testée unitairement.
- Si le STT cloud échoue ou le réseau tombe, bascule automatique vers Whisper local ; le quota cloud n'est décompté qu'après réponse serveur réussie.

## Commandes

```
npm run ios          # dev client iOS sur appareil branché
npm run android      # dev client Android sur appareil branché
npm run typecheck
npm run lint
npm test
npx eas build --profile development --platform all
npx eas update --branch preview
```

## Ce que Claude Code ne doit pas faire

- Pas de modification de `app.config.ts`, des permissions natives ou du schéma de base sans l'avoir annoncé dans le plan.
- Pas de suppression de fichiers audio utilisateur dans du code de test ou de migration.
- Pas de texte juridique (consentement, CGU, confidentialité) écrit de manière définitive : produire un brouillon marqué « À faire relire par un juriste ».
- Pas de commit direct sur `main`.

## Langue

Réponds toujours en français
