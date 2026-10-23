# Prompt d'ouverture — étape 3 : Transcription locale

Ouvre l'étape 3 — Transcription locale.

Lis d'abord CLAUDE.md, le cahier des charges (étape 3 et « Langues »), D-021, D-035, D-036 et docs/plans/step-3.md. Pars de main à jour, sur la branche step-3-transcription, en une seule session. Lance `npx expo install --fix` et commite son résultat à part. Puis propose un plan détaillé et attends ma validation avant tout code. Une fois le plan validé, ajoute-le dans docs/plans/step-3.md, à la suite des critères déjà hérités, comme pour les étapes précédentes.

## Ce que l'étape 2 te laisse

- Le dépôt SQLite (`src/services/library/sqlite.ts`) a déjà l'API de transcription. Ses transitions sont testées et chaque écriture passe dans `outbox` dans la même transaction :
  - `queueTranscription(id, { language, engine, model })` ;
  - `startTranscription(id)` ;
  - `reportTranscriptionProgress(id, progress)`, sans transition ni outbox ;
  - `saveTranscript(id, segments, { quality })`, qui remplace tout le texte en une transaction (la recherche FTS suit par triggers) ;
  - `failTranscription(id, issue)`, avec `failed | model-missing | offline | quota-exhausted`.
- `retryTranscription` remet l'enregistrement en file, mais rien ne consomme la file : aucun moteur ne tourne. C'est le premier vrai branchement.
- Le téléchargement du modèle est simulé dans `src/features/transcription/model.ts` : 233 Mo factices, une minuterie de 8 s, la clé kv `model.status`. L'onboarding et la Bibliothèque l'affichent. `src/services/whisper/` est vide.
- `src/services/transcription/languages.ts` donne la qualité locale de chaque langue et `requiresCloud`. Le routage choisit le moteur d'après la langue sélectionnée, jamais d'après la détection automatique.
- executorch 0.10.6 est déjà dans la build, avec les backends xnnpack et coreml, worklets et blob-util ; background-downloader n'a pas été pris.
  - Utilise l'API principale (`useSpeechToText` depuis l'entrée du paquet), jamais l'API legacy, qui tire react-native-device-info.
  - executorch n'existe qu'en arm64 et x86_64, et la production est en 64 bits seulement (D-036, option A).

## Décidé : l'entrée audio

- Un seul chemin : `.m4a` → PCM 16 kHz Float32, décodé au moment de transcrire. On ne garde pas le WAV plus longtemps.
- Transcrire le WAV ne marcherait qu'une fois, à l'arrêt de l'enregistrement. Or aucun des cas de retranscription n'aura de WAV : changement de langue ou de modèle, `retryTranscription`, bascule du local vers le cloud, règle de routage n° 5.
- Regarde d'abord si `modules/audio-encoder/` peut porter le décodage. Il fait déjà l'encodage AAC par MediaCodec ; la symétrie évite une dépendance de plus.
- Le fichier est de l'AAC-LC 16 kHz mono, vérifié par ffprobe (D-036).
- Donne dans le plan le temps de décodage d'une heure d'audio sur l'A05. S'il est significatif, la progression doit le montrer.

## Décidé : l'enregistrement est toujours prioritaire

- Whisper sur une heure d'audio sature un A05 pendant de longues minutes. Une transcription qui tourne pendant un enregistrement risque de faire sauter la capture, c'est-à-dire l'invariant que le projet protège depuis l'étape 1.
- La règle a deux sens :
  - aucune transcription ne démarre tant qu'un enregistrement est en cours ;
  - une transcription en cours s'interrompt proprement quand un enregistrement démarre, puis reprend là où elle en était.
- Un test unitaire pour chacun des deux sens.
- Vérification sur l'A05 : un enregistrement de cinq minutes lancé pendant une transcription d'une heure, sans qu'aucune seconde d'audio ne manque.
  - C'est moi qui lance cet enregistrement, à la main.
  - Décris dans le plan comment tu prouves qu'il ne manque rien. Par exemple, comparer la durée du fichier (ffprobe) à l'horloge réelle, et relever tout trou ou toute perte que le moteur d'enregistrement signale.

## Points incertains, à tester en premier sur l'A05

1. Le décodage ci-dessus, et son temps.
2. Le débit. Le cahier vise 1 h d'audio français en moins de 15 min sur un Android milieu de gamme.
   - L'A05 est d'entrée de gamme, mais c'est l'appareil de nos utilisateurs : mesure et juge le critère sur lui, en release, sur batterie, écran éteint.
   - Si une heure y demande beaucoup plus de quinze minutes même en tiny, ce n'est pas un échec de mesure, c'est une information produit. La transcription locale devient alors une promesse que nous ne tenons pas sur ces téléphones, et le routage vers le cloud doit le dire.
   - Remonte-le-moi avant de choisir le modèle par défaut.
3. La batterie et la chaleur. Pour une transcription d'une heure sur l'A05, sur batterie, relève le pourcentage de batterie consommé et la température en fin de course (`dumpsys battery`, `dumpsys thermalservice`).
   - Si c'est lourd, dis-le-moi avec les chiffres : la transcription devra peut-être attendre la charge par défaut, comme le téléchargement attend le wifi.
   - Ne décide pas seul de ce réglage, mais arrive avec la mesure.
4. L'arrière-plan et la reprise après fermeture forcée. Une transcription d'une heure ne peut pas dépendre de l'app au premier plan. Au lancement, tout ce qui était `queued` ou `transcribing` doit reprendre.

## Modèle et hébergeur : arrive avec de quoi trancher, sans trancher seul

- Propose les modèles candidats avec leur taille, leur licence et leur hébergeur.
- Dis explicitement quel tiers le téléphone contactera au premier lancement. Ce choix entre dans la politique de confidentialité, qui porte encore « [hébergeur du modèle] », et dans le formulaire « sécurité des données ».
- Le téléchargement reste en wifi par défaut, reprenable et annulable : nos marchés paient cher les données mobiles.

## Critères de fin explicites

- Les cinq langues sans moteur local : wolof, igbo, pidgin, zoulou, luganda.
  - Avec le cloud désactivé, choisir l'une d'elles affiche clairement que cette langue demande le cloud et propose de l'activer.
  - Jamais de transcription vide, jamais d'erreur technique.
  - Tests et captures, en français et en arabe.
- Aucune langue ne s'affiche comme transcrite sans son indicateur de qualité, pris dans `languages.ts`. Tests et captures, en français et en arabe.
- L'enregistrement prioritaire : les deux tests unitaires, et la vérification sur l'A05 décrite plus haut.
- La batterie et la chaleur, mesurées et consignées dans DECISIONS.md.
- La mesure c rejouée en release sur l'A05 (profil preview-trace), avec une transcription réelle d'au moins une heure (docs/plans/step-3.md).
  - Référence sans segment : mises à jour toutes les 102 ms, écart constant d'environ −50 ms, pause en 100 ms, arrêt au retour en moins de 0,25 s.
  - Si elle se dégrade, le correctif décrit dans D-036 sort du tiroir.
- La vérification sur iPhone 13 va à la dette iOS (D-022).

## Build

- D-035 ne prévoit pas de build pour l'étape 3. Si une dépendance native ou une modification du module natif devient nécessaire, le décodage compris, annonce-la dans le plan et groupe tout dans une seule build.
- Cette prochaine build native porte aussi deux vérifications sur l'APK construite :
  - la permission `BIND_GET_INSTALL_REFERRER_SERVICE` a bien disparu ;
  - la liste complète des permissions du manifeste est consignée dans D-036, pour le formulaire « sécurité des données ».

## Règles à garder en tête

- Aucun appui scripté sur le bouton d'enregistrement, ni sur un contrôle non identifié : un vrai enregistrement se fait à la main, par moi.
- Demander avant d'utiliser le téléphone.
- Démarrage à froid avant chaque test.
- Aucune modification du code servi par Metro pendant que j'ai le téléphone en main.
- Commits conditionnés aux codes de sortie.
