# CLAUDE.md — Tolitoli

## Le projet en une phrase

Tolitoli est une app mobile gratuite (iPhone, iPad, téléphones et tablettes Android) qui enregistre une conversation, la transcrit et la conserve en local ou dans le cloud. La transcription locale (Whisper embarqué) est gratuite et illimitée ; la transcription cloud, plus précise, est optionnelle et payante au-delà d'un quota mensuel.

Le cahier des charges complet est dans `docs/CAHIER_DES_CHARGES.md`. Lis-le avant toute étape. Les décisions prises au fil du projet sont consignées dans `docs/DECISIONS.md` : ajoute une entrée à chaque décision structurante.

## Identité

- Nom de l'app : **Tolitoli** (même graphie partout : fiches stores, `app.json`, textes d'interface, notifications). Clé i18n `app.name`, jamais en dur.
- Slug Expo : `tolitoli`. Identifiant de bundle iOS et nom de package Android : `app.tolitoli.mobile`, figé depuis la première build EAS (D-002) ; variantes `.dev` et `.preview`.
- Schéma d'URL : `tolitoli://`.
- Ne pas utiliser le nom dans le code à la place d'un terme technique (pas de `TolitoliService`) : les modules portent le nom de ce qu'ils font.

## Objectif et ordre des étapes

- Objectif : **Tolitoli 1.0 Android sur le Play Store en six semaines** (plan accéléré du 22 octobre 2026 dans le cahier des charges, section « Plan de développement » ; il fait foi sur l'ancien ordre). iOS suit dès que le compte Apple Developer est pris.
- Ordre d'exécution : 1, puis **1b (thème et composants, voir Design)**, puis **2 et 3 en parallèle** (deux sessions, deux worktrees), puis 4, 5 réduite, 7a réduite (Edge Function portant la clé Intron, authentification anonyme, quota serveur ; pas de comptes nommés), 8 (Intron + `languages.ts`), 9. Les étapes 6, 6b, 7b et la vue tablette passent en 1.1.
- Étape 1c (interface complète) s’intercale après 1b : tous les écrans de la 1.0 construits avec les composants existants, sans dépendance native nouvelle, sans build. Les données sont simulées tant que l’étape 2 n’a pas livré la base.
- Périmètre 1.0 : enregistrement, transcription locale et cloud, lecteur synchronisé, recherche, export texte et audio, réglages, consentement légal, accessibilité de base. Tout ce qui n'est pas dans cette liste est hors 1.0 : le signaler plutôt que l'implémenter.
- Le test fermé Google Play (12 testeurs, 14 jours) démarre avec la première build utilisable, fin de semaine 3. Tout ce que Google Play demande (politique de confidentialité, formulaire « sécurité des données », déclaration du service de premier plan micro avec vidéo, fiche, captures) se prépare en parallèle dès l'étape 2, en brouillon marqué « à relire », dans `docs/store/`.

## Design

- La source de vérité visuelle est `docs/design/` (index dans `docs/design/INDEX.md`), export du système de design Tolitoli publié sur claude.ai. Lis `docs/design/README.md` avant tout travail d'interface.
- Tokens : `docs/design/tokens.json` → `src/ui/theme/tokens.ts` (transcription typée, un test de parité). Deux thèmes, clair et sombre, qui suivent le système. Jamais de couleur en dur dans un composant.
- Typographie : titres en Rubik (`@expo-google-fonts/rubik`, poids 500 et 600, chargée avant de lever l'écran de démarrage), texte en police système, horodatages en mono ; les styles portent les noms de `tokens.json` (`display`, `title`, `heading`, `timer`, `body`, `body-strong`, `caption`, `overline`, `timestamp`).
- Icônes : `lucide-react-native@0.544.0`, trait 1,75, 24 px ; correspondances dans `docs/design/ICONS.md`. Chevrons inversés en RTL ; icône masquée aux lecteurs d'écran quand un libellé l'accompagne.
- Marque : `docs/design/logo/` ; `tolitoli-mark.svg` exporté en PNG 1024 pour l'icône d'app et l'écran de démarrage, premier plan de l'icône adaptative sur fond `accent`, `tolitoli-mark-mono.svg` pour la notification Android.
- Composants : un composant React Native par guide de `docs/design/components/`, dans `src/ui/components/`, avec les états, props et libellés d'accessibilité décrits. Un écran se compose de ces composants ; pas de style ad hoc.
- Étape 1b « thème et composants » : `tokens.ts`, polices, icônes, marque et icônes d'app, les neuf composants avec tests RNTL (pseudo-locale, RTL, accessibilité), et les écrans existants (Bibliothèque, Enregistrement, Réglages) refaits avec eux. Critère de fin : captures des trois écrans dans les deux thèmes et en arabe, conformes aux aperçus de `docs/design/previews/`.
- Une modification de design se fait d'abord dans le système de design, puis dans `docs/design/`, jamais dans le code seul.

## Méthode de travail

- Une étape = une branche `step-N-<slug>` = une PR. Avant d'écrire du code pour une étape : propose un plan détaillé (fichiers à créer/modifier, dépendances, risques, tests, critères de fin). Attends la validation explicite de l'utilisateur.
- Ne commence jamais l'étape suivante sans que les critères de fin de l'étape en cours soient remplis.
- Quand tu hésites entre deux approches, expose les deux avec leurs compromis et demande. Ne tranche pas seul sur : choix de bibliothèque native, schéma de base de données, modèle de tarification, texte juridique.
- Deux sessions en parallèle : chacune reste sur sa branche et ses fichiers ; `DECISIONS.md` et `CLAUDE.md` ne sont modifiés que par une seule session à la fois (dire laquelle dans le plan ; l'autre note ses décisions dans `docs/plans/step-N.md`, reportées à la fusion). Le téléphone est partagé : un test sur appareil à la fois.
- L'audio ne se teste que sur appareil physique. Le simulateur/émulateur n'a pas de micro fiable : dis-le quand un test manuel est requis et décris la procédure.
- **Tout test sur appareil se fait après un démarrage à froid de l'app** (D-014, D-023) : jamais sur une app rechargée à chaud, dont les modules natifs peuvent être dans un état faux. Relancer l'app avant toute vérification de mise en page ou d'événement natif.
- **Test de fumée après chaque build EAS installée**, avant toute autre chose : démarrage à froid, capture de l'écran d'accueil et de chaque écran principal, enregistrées dans `docs/captures/step-N/smoke-<id de build>-<écran>.png`, vérification qu'aucune n'affiche d'erreur rouge, résultat noté dans `DECISIONS.md` avec l'identifiant de la build.
- Dette iOS (D-022) : tant que le compte Apple Developer n'est pas pris, les étapes se clôturent sur Android ; chaque vérification iPhone non faite est ajoutée à la liste « dette iOS » de `docs/DECISIONS.md`. Cette dette est soldée **avant la première build iOS de développement**, donc avant toute publication iOS ; elle ne bloque pas la 1.0 Android.
- Émulateur pour l’interface, téléphone pour l’audio. Captures d’écran, thèmes, RTL, polices agrandies, accessibilité structurelle et tests de fumée se font sur l’émulateur Android. Le Galaxy A05 est réservé à ce qui exige un vrai appareil : enregistrement, appels, interruptions, tenue sur batterie, retour haptique. Demander avant toute utilisation du téléphone, jamais pour l’émulateur.
- Une build native par étape au plus, décidée dans le plan de l’étape et lancée à son premier commit. Tout ajout de module natif est groupé avec elle. Ce qui est purement JavaScript ne demande aucune build : Metro et le dev client suffisent.
- Une build se lance en arrière-plan, jamais en attente. Continuer le travail pendant qu’elle tourne ; l’installer et faire le test de fumée à la pause suivante. Ne jamais bloquer une session sur une build.
- `npx expo install --fix` est exécuté à l'ouverture de chaque étape et avant chaque build EAS, et le résultat est commité séparément.
- **Une vérification se juge sur le code de sortie de chaque commande, jamais sur le texte qu'elle affiche.** Le commit est enchaîné aux vérifications par `&&` et rien d'autre : `npm run typecheck && npm run lint && npm test && git commit …`. Aucune commande de cette chaîne ne passe dans un tube (`|`) ; pour lire sa sortie, on la redirige vers un fichier (`npm test > fichier.log 2>&1`) et on lit le fichier après. Si une sortie doit malgré tout être filtrée, la commande commence par `set -o pipefail`, pour que l'échec de la commande filtrée reste l'échec de l'ensemble.
- Machine de développement : Mac Intel sans Homebrew. Les outils système (`gh`, `adb`, `ffmpeg`…) s'installent par installeur ou binaire officiel, jamais via `brew`.

## Stack imposée

| Domaine | Choix | Ne pas remplacer sans accord |
| --- | --- | --- |
| Framework | Expo SDK 58 (React Native 0.88, nouvelle architecture), TypeScript strict | Oui |
| Navigation | expo-router | Oui |
| Audio | react-native-audio-api (enregistrement : WAV 16 kHz mono continu, flux PCM 16 kHz ; patch-package sur l'écouteur de focus, D-023) ; expo-audio (lecture) — voir D-020, D-021 | Oui |
| Encodage audio | module Expo local `modules/audio-encoder/` (MediaCodec + MediaMuxer sur Android, AVAudioConverter sur iOS) : WAV → .m4a 64 kbit/s à l'arrêt | Oui |
| Transcription locale | react-native-executorch, hook `useSpeechToText` (Whisper) | Oui |
| Détection de voix | react-native-vad ou le VAD d'executorch | Non |
| Base locale | expo-sqlite (ou op-sqlite si SQLCipher requis) + drizzle-orm, FTS5 | Oui |
| Fichiers | expo-file-system | Oui |
| État | zustand + TanStack Query | Non |
| Arrière-plan | expo-task-manager, expo-background-task | Non |
| Secrets locaux | expo-secure-store | Oui |
| Backend (étape 7a) | Supabase : Auth anonyme, Postgres + RLS, Edge Functions (Deno) ; Storage et comptes nommés en 1.1 | Oui |
| STT cloud, grandes langues (étape 8) | Deepgram via Edge Function ; la clé API ne quitte jamais le serveur | Oui |
| STT cloud, langues africaines (étape 8) | Intron Sahara v2.5 via Edge Function (API REST ; flux réservé à la V2). Sunbird n'est plus prévu | Oui |
| Paiement (étape 9) | RevenueCat | Oui |
| Build / distribution | EAS Build, EAS Update, EAS Submit ; dev client (pas Expo Go) ; projet EAS sous le compte `tolitoli` | Oui |
| Tests | Jest + React Native Testing Library ; Maestro pour les parcours | Non |
| i18n | i18next + expo-localization ; sept langues dès l'étape 0 : `fr` (source), `en` (repli), `de`, `ru`, `ar` (RTL), `wo`, `zh-Hans` ; polyfills formatjs pour `Intl` (D-012) | Oui |

Ne pas ajouter de dépendance sans la justifier dans le plan de l'étape. Préférer les modules maintenus par Expo ou Software Mansion.

## Structure du dépôt

```
app/                 écrans expo-router (routes par fichiers) — jamais de src/app/ (D-010)
modules/             modules Expo locaux (audio-encoder)
patches/             patch-package (react-native-audio-api)
src/features/        recording, transcription, library, player, sync, billing — adaptateurs natifs et UI
src/services/        audio, whisper, cloudStt, storage, quota, transcription — TypeScript pur, sans React
src/db/              schéma drizzle, migrations, requêtes FTS
src/ui/              composants partagés, thème, layouts
src/i18n/            fr.json, en.json… ; native/ pour les textes de permission
supabase/            fonctions Edge, migrations SQL, politiques RLS
docs/                CAHIER_DES_CHARGES.md, DECISIONS.md, plans/step-N.md, captures/step-N/, store/
```

## Règles de code

- TypeScript `strict: true`, pas de `any` sans commentaire justificatif.
- Les services métier (`src/services`) n'importent jamais React ni de composant d'interface : ils doivent être testables en Jest sans appareil (règle ESLint `no-restricted-imports`).
- Chaque règle de routage local/cloud, chaque migration, chaque calcul de quota a un test unitaire.
- Aucune clé secrète dans le dépôt : `.env` est ignoré par git, `app.config.ts` lit `process.env`, les secrets de build passent par EAS Secrets. L'identifiant de projet EAS est public et peut être en dur.
- Interface traduite via i18n, aucune chaîne en dur dans les composants ; clés en anglais, un JSON par langue dans `src/i18n/`. Le sélecteur de langue est dans l'app (le wolof n'existe pas comme langue système). L'arabe impose le RTL : `I18nManager`, icônes directionnelles en miroir, chaque écran testé en RTL. L'allemand impose des libellés 30 % plus longs : jamais de largeur fixe sur un texte. Pseudo-localisation en CI.
- La langue de l'interface et la langue de transcription sont deux réglages indépendants.
- Accessibilité : chaque élément interactif a un `accessibilityLabel` ; polices dynamiques respectées (libellés de barre d'onglets plafonnés à 1,5×, D-014) ; textes décoratifs masqués aux lecteurs d'écran (D-019).
- Commits en anglais, impératif, préfixés par l'étape : `step-3: persist transcription queue`.
- Avant tout commit : `npm run typecheck && npm run lint && npm test` verts.
- Captures d'écran : enregistrées dans `docs/captures/step-N/` (N = étape en cours), réduites à 720 px de large, nom descriptif en minuscules et sans espace (`d014-apres-police2-reglages-de.png`), commitées avec l'étape et référencées depuis l'entrée de `docs/DECISIONS.md` qu'elles documentent. Tout ce qui sert au diagnostic est conservé, y compris les fenêtres système (permissions, notifications, réglages). Sont exclues uniquement les données personnelles d'autrui : identité d'un appelant, contenu d'une conversation, contacts, contenu d'une autre application. Le dépôt est privé ; si le dépôt devient public un jour, `docs/captures/` est passé en revue avant.

## Contraintes produit non négociables

- Le mode local fonctionne sans compte, sans réseau, sans télémétrie.
- Le cloud n'est jamais activé par défaut ; aucune donnée audio ou texte ne quitte l'appareil sans action explicite de l'utilisateur.
- **Local d'abord, toujours.** Un enregistrement est écrit sur l'appareil avant toute chose, même avec le cloud activé et le réseau disponible ; le cloud ne reçoit qu'une copie. Ne jamais concevoir un chemin où l'audio part directement vers le réseau.
- **Appels téléphoniques.** Aucune app tierce ne peut capter l'audio d'un appel sur iOS ni sur Android (Play Store interdit l'API d'accessibilité pour cela depuis 2022 ; micro silencieux pendant un appel depuis Android 10). Ne jamais proposer ni implémenter de capture d'appel par service d'accessibilité, `AudioSource.VOICE_CALL`, ou micro pendant un appel. Pendant un appel, classique ou VoIP (WhatsApp, Telegram…), l'enregistrement est mis en pause par la perte de focus audio, le segment est fermé, et « Reprendre » n'est proposé qu'à la fin de l'appel (D-023). Ce que l'app fait en 1.1 : détecter début/fin d'appel, proposer un mémo post-appel, importer les enregistrements du dialer intégré. Voir le cahier des charges, section « Appels téléphoniques ».
- **Lecture automatique des messages.** Aucune lecture automatique des SMS, des boîtes courriel ou des messageries (WhatsApp, Telegram…). `READ_SMS` est réservé à l'app de messagerie par défaut sur Google Play ; aucune messagerie privée n'expose d'API permettant de lire les conversations d'un utilisateur ; les périmètres de lecture Gmail sont soumis à une vérification annuelle payante ; iOS ne l'autorise à aucune condition. Les messages n'entrent dans Tolitoli que par la feuille de partage du système, sur geste explicite de l'utilisateur. Ne pas le proposer, ne pas l'implémenter, ne pas l'annoncer. Voir le cahier des charges, section « Vision long terme ».
- Écran de consentement légal au premier lancement (enregistrer une conversation sans le consentement des participants est illégal dans de nombreux pays). Ne jamais proposer de mode « discret » ou cacher l'indicateur d'enregistrement.
- Permissions iOS : `NSMicrophoneUsageDescription`, `UIBackgroundModes: ["audio"]`. Android : `RECORD_AUDIO`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`, `POST_NOTIFICATIONS`, service de premier plan avec notification persistante et traduite pendant l'enregistrement ; l'enregistrement ne démarre qu'avec l'app au premier plan.
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

Dix langues africaines sont supportées dès la 1.0 : swahili, haoussa, yoruba, lingala, malgache, luganda, zoulou, wolof, pidgin nigérian, igbo.

- Whisper embarqué couvre les grandes langues (fr, en, de, ru, zh, ar standard) correctement. Parmi les dix langues africaines, il n'en couvre que cinq, et mal : swahili, haoussa, yoruba (qualité « brouillon »), lingala, malgache (qualité « moyenne »). Igbo, pidgin, zoulou, luganda et wolof n'ont aucun moteur local : sans cloud, l'app doit le dire clairement et proposer d'activer le cloud.
- Moteur cloud des langues africaines : **Intron Sahara v2.5**, en libre-service (voice.intron.io, crédits prépayés, clé API dans l'onglet Developers). Documentation : docs.voice.intron.io. Endpoint : `POST https://infer.voice.intron.io/file/v1/upload` (multipart : `audio_file_name`, `audio_file_blob`, `use_language_asr_input`), puis Get File Status ; `.m4a` accepté ; `use_diarization` disponible ; **toujours fixer `use_category` sur `file_category_general` ou `file_category_meeting_notes`** (défaut : télésanté) ; évaluer `use_disable_llm_corrections` sur audio réel avant de choisir ; 60 requêtes/min. Codes confirmés : sw, ha, yo, ig, pcm, zu, lg, wo (bilingues avec l'anglais), fr, en, de, ru, ar. **Lingala et malgache ne sont pas couverts** : Whisper local seulement. Deepgram reste le moteur cloud des grandes langues.
- La clé Intron ne quitte jamais le serveur : l'app appelle une Edge Function Supabase, qui appelle Intron et décompte le quota.
- Une seule interface `TranscriptionEngine`, implémentations `WhisperLocal`, `DeepgramCloud`, `SaharaCloud`. Le routage choisit le moteur d'après la langue de transcription sélectionnée par l'utilisateur, jamais d'après la détection automatique, qui n'est pas fiable pour ces langues.
- Le quota cloud est compté sur un identifiant anonyme Supabase lié à l'appareil : aucun compte nommé n'est requis pour transcrire en cloud.
- 1.0 : transcription cloud différée (fichier envoyé à la fin de l'enregistrement, après écriture locale). Le flux Sahara (transcription en direct) est une option de V2.
- Ne jamais annoncer une langue comme « reconnue » sans l'indicateur de qualité (bonne / moyenne / brouillon). Toute langue est validée sur 30 minutes d'audio réel conversationnel, avec mélange de langues, et le résultat est consigné dans `docs/DECISIONS.md`. Les chiffres publiés par Intron sont des chiffres éditeur, pas une mesure.
- La table des langues (code, moteur local éventuel, moteur cloud, qualité attendue) vit dans `src/services/transcription/languages.ts` et pilote à la fois le sélecteur et le routage.

## Synchronisation : règles invariantes (détail dans le cahier des charges, section « Synchronisation intelligente »)

- L'audio est vidé sur disque au moins toutes les 2 s (WAV continu, converti en `.m4a` à l'arrêt, D-021) ; un fichier partiel est finalisé et marqué « récupéré » au lancement suivant, jamais supprimé. Si l'encodage échoue, le WAV est conservé comme fichier final.
- Chaque changement local est inscrit dans la table `outbox` dans la même transaction SQLite que la donnée.
- Upload résumable par morceaux (TUS, 5 Mo) ; somme de contrôle SHA-256 vérifiée côté serveur avant de marquer `synced` (1.1).
- Recul exponentiel 10 s → 15 min ; politique par défaut : audio sur wifi seulement, texte sur tout réseau.
- Un enregistrement n'est jamais effacé localement tant qu'il n'est pas `synced` et vérifié, et seulement si l'utilisateur le demande.
- États d'un enregistrement : `recording → local → queued → uploading → verifying → synced | error`. Toute transition est testée unitairement.
- Si le STT cloud échoue ou le réseau tombe, bascule automatique vers Whisper local ; le quota cloud n'est décompté qu'après réponse serveur réussie.

## Commandes

```
npm start                       # Metro pour le dev client (téléphone sur le même wifi, ou -- --tunnel)
npm run android                 # dev client Android sur appareil branché (adb requis)
npm run ios                     # exige Xcode ; inutilisable sur ce Mac pour l'instant
npm run typecheck
npm run lint
npm test
npx eas-cli@25 build --profile development --platform android
npx eas-cli@25 build:list --platform android --limit 1   # identifiant et URL de l'APK
npx eas-cli@25 update --branch preview
```

## Ce que Claude Code ne doit pas faire

- Pas de modification de `app.config.ts`, des permissions natives ou du schéma de base sans l'avoir annoncé dans le plan.
- Pas de suppression de fichiers audio utilisateur dans du code de test ou de migration.
- Pas de texte juridique (consentement, CGU, confidentialité) écrit de manière définitive : produire un brouillon marqué « À faire relire par un juriste ».
- Pas de commit direct sur `main`.
- Pas de `git add -A` ni `git add .` : ajouter nommément les fichiers modifiés par la session.
- Pas d'action publique ou externe (issue ou PR chez un tiers, publication, message) sans accord explicite, même si elle a été évoquée dans un plan.
- Pas de nouvelle build EAS d'un profil non prévu au plan sans accord.
- Pas de suppression de capture sans me demander.
- Pas de modification des réglages du téléphone par adb (police, thème, accessibilité, veille) sans les remettre à leur valeur initiale à la fin du test, et sans l'avoir dit.

## Langue

Réponds toujours en français.