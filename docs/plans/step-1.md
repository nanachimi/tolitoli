# Étape 1 : enregistrement audio

## Contexte

L'étape 0 est fusionnée (PR #1 et #2). L'étape 1 livre le service `audio` défini par le cahier des charges :

- start / pause / resume / stop, fichier `.m4a`, niveau sonore ;
- arrière-plan iOS et service de premier plan Android ;
- gestion des interruptions ;
- écriture par blocs et récupération des fichiers partiels.

**Critères de fin (cahier des charges, ligne 1, ajustés par D-022)** :

- Un enregistrement de 60 min écran verrouillé, sans perte, **sur Android** (Galaxy A05, sur batterie).
- Un appel entrant géré sur Android.
- Un enregistrement interrompu brutalement est récupéré au lancement suivant, jamais supprimé.
- **Dette iOS** : les vérifications iPhone de l'étape 1 sont consignées dans DECISIONS.md, avec la liste exacte à rejouer.

**D-022 (remplace D-003)** : le compte Apple Developer est reporté pour raison budgétaire.

- L'étape 1 se clôt sur Android seul.
- Les vérifications iPhone des étapes 1 et 3 forment une « dette iOS », à solder **avant l'ouverture de l'étape 5**.
- Comme le journal n'est jamais réécrit, D-003 reste en place et reçoit un renvoi vers D-022.
- CLAUDE.md (Méthode de travail) et le cahier des charges (plan de développement, lignes 1 et 3, et coûts) sont ajustés en conséquence.

**Déjà fait à l'ouverture** :

- branche `step-1-recording` créée ;
- `npx expo install --fix` lancé sans rien à corriger, donc pas de commit séparé ;
- actions `checkout` et `setup-node` passées en v7 (commit `2039dfc`).

## Décisions prises avec le propriétaire (à consigner)

- **D-020 — Moteur d'enregistrement : react-native-audio-api seul.**
  - Un seul moteur sur le micro, pour le fichier maintenant et pour le flux PCM 16 kHz de Whisper à l'étape 3.
  - Notification Android traduisible avec pause, reprise et stop.
  - Événements d'interruption et de changement de sortie audio.
  - expo-audio reste prévu pour la **lecture** (étapes 2 et 4). Ses limites pour l'enregistrement : notification Android en anglais impossible à traduire, aucun événement d'interruption sur Android, pas de découpage.
  - Écart à la table de stack de CLAUDE.md : la ligne Audio sera corrigée en « react-native-audio-api : enregistrement (fichier + flux PCM) ; expo-audio : lecture ».
- **D-021 — Stratégie anti-perte, choisie après un essai d'une demi-journée au plus**, dans cet ordre :
  1. Vérifier qu'un encodeur AAC natif est accessible pour convertir un WAV en `.m4a` : MediaCodec et MediaMuxer sur Android, AVAssetWriter ou AVAssetExportSession sur iOS, via une bibliothèque maintenue ou un petit module Expo. **Sans encodeur, la variante WAV est abandonnée** et on part sur les segments M4A sans mesure comparative.
  2. Si l'encodeur existe, comparer sur le Galaxy A05 : (a) segments M4A à **2 s** et à **30 s**, assemblés à l'arrêt ; (b) WAV continu, en-tête réparé au lancement suivant, puis conversion en `.m4a`.
  3. Critères : perte après un kill, coupures audibles aux jonctions, taille.
  4. Les « 2 s » sont un **objectif de perte maximale**, pas une longueur de segment imposée.
  5. Le choix est consigné dans DECISIONS.md. Si la formulation « blocs de 2 s » change, le cahier des charges (§ Synchronisation intelligente) est mis à jour.
  6. Si la demi-journée est dépassée, on part sur les segments M4A, avec la longueur la plus courte qui ne produit pas de coupure audible.

## Phase 1a — Essai anti-perte (demi-journée au plus)

1. **Recherche d'encodeur, une heure au plus** :
   - dans react-native-audio-api : `concatAudioFiles`, existence d'un rendu hors ligne vers un fichier ;
   - bibliothèques maintenues en 2026 (ffmpeg-kit est archivé, à exclure) ;
   - coût d'un module Expo local : Android MediaCodec + MediaMuxer, iOS AVAssetExportSession avec le préréglage `AppleM4A`.

   Je rends un verdict « encodeur disponible / non », avec la référence trouvée.

2. **Banc d'essai** : un écran `app/dev/spike.tsx`, visible seulement en `__DEV__` et **supprimé avant la PR**. Il lance chaque variante avec des réglages fixes : AAC 64 kbit/s, mono, 44,1 kHz.
3. **Mesures sur le Galaxy A05, par adb** :
   - **Signal** : un son continu de 1 kHz joué par le Mac (`afplay`), téléphone à côté, pendant 3 min par variante.
   - **Kill** : `adb shell kill -9 <pid>` en cours d'enregistrement, puis relance et récupération. Perte = durée écoulée avant le kill − durée récupérée.
   - **Jonctions** : fichiers rapatriés par `adb pull`, convertis en WAV avec `afconvert` (fourni avec macOS), puis analyse de l'énergie par fenêtres de 10 ms avec un script Python (scratchpad). On compte les creux et les discontinuités aux jonctions.
   - **Taille** : en Mo par heure.
4. **Résultat** : un tableau dans DECISIONS.md (D-021), captures dans `docs/captures/step-1/`, et éventuellement la mise à jour du cahier des charges.

## Phase 1b — Implémentation (selon le choix de D-021)

### Dépendances (via `npx expo install` ou version exacte)

| Paquet                 | Version  | Raison                                                                                                |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| react-native-audio-api | ~0.13.6  | Moteur d'enregistrement (D-020) ; compatibilité RN 0.88 annoncée par son tableau officiel             |
| react-native-worklets  | 0.13.0   | Dépendance pair optionnelle d'audio-api ; ajoutée **seulement** si l'installation ou la build l'exige |
| expo-file-system       | ~58.0.10 | Segments, manifeste, déplacement, espace disque libre (`Paths.availableDiskSpace`)                    |
| expo-crypto            | ~58.0.7  | `randomUUID()` pour l'identifiant d'enregistrement ; servira à SHA-256 à l'étape 7                    |
| zustand                | ^5.0.15  | État de l'écran d'enregistrement (stack imposée)                                                      |
| expo-navigation-bar    | ~58.0.4  | Barre de navigation Android en mode sombre (D-015)                                                    |

S'y ajoute éventuellement un module Expo local d'encodage (`modules/audio-encoder/`), seulement si D-021 retient la variante WAV.

### `app.config.ts` et permissions natives (modifications annoncées)

**Plugin `react-native-audio-api`** :

- `iosBackgroundMode: true` (ajoute `UIBackgroundModes: ["audio"]`) ;
- `iosMicrophonePermission` ;
- `androidPermissions: [RECORD_AUDIO, FOREGROUND_SERVICE, FOREGROUND_SERVICE_MICROPHONE, POST_NOTIFICATIONS]` ;
- `androidForegroundService: true` et `androidFSTypes: ["microphone"]` ;
- `androidFSStopWithTask: false` : l'enregistrement continue si l'app est retirée des apps récentes. La notification reste visible, donc il n'y a pas de mode discret.

**Plugin `expo-navigation-bar`** :

- `enforceContrast: false`, plus `<NavigationBar style="auto" />` dans `app/_layout.tsx` ;
- l'API de couleur de fond n'existe plus depuis la version 56 ; seuls le style des boutons et le fond de l'app sous la barre sont réglables.

**Textes de permission iOS dans les 7 langues** : `locales` de `app.config.ts` pointant vers `src/i18n/native/{fr,en,de,ru,ar,wo,zh-Hans}.json` (`NSMicrophoneUsageDescription`).

### Architecture

**`src/services/audio/` : TypeScript pur, testable en Jest.** Les modules natifs sont derrière des interfaces, conformément à la règle ESLint existante.

- `recorderMachine.ts` : machine à états `idle → preparing → recording ⇄ paused`, `recording → interrupted → (reprise proposée) recording | stopping`, `stopping → local`, `* → error`. Fonction pure `transition(state, event)`, chaque transition testée.
- `engine.ts` : interface `RecordingEngine` (`start`, `pause`, `resume`, `stop`, `onLevel`, `onInterruption`, `onSegmentClosed`, `onError`).
- `recordingStore.ts` : un dossier `documents/recordings/<uuid>/` par enregistrement, avec `manifest.json` (id, createdAt, status `recording | local`, `recovered`, segments, durationMs, format). Écriture atomique : fichier temporaire puis renommage, à chaque fermeture de segment. Fichier final : `documents/recordings/<uuid>.m4a`. Le système de fichiers est injecté (interface `Fs`).
- `recovery.ts` : au lancement, tout manifeste resté en `recording` est finalisé (assemblage des segments terminés ou réparation du WAV), passé en `local` et marqué `recovered: true`. **Aucune suppression**, même des morceaux illisibles, qui restent dans le dossier.
- `level.ts` : calcul RMS → dBFS → jauge de 0 à 1, sur les buffers `onAudioReady`. audio-api ne fournit pas de niveau.
- `diskSpace.ts` : besoin estimé à partir du débit **pendant l'enregistrement** de `formatProfile` (environ 29 Mo/h en segments M4A, environ 115 Mo/h en WAV avant conversion), jamais codé en dur. Alerte sous 500 Mo libres, refus de démarrer si l'espace ne couvre pas 10 min au débit du profil.
- `interruptions.ts` : traduit les événements système (`interruption began/ended`, `routeChange`) en événements de la machine à états.
  - **Règle :** toute interruption **ferme immédiatement le segment en cours**, quelle que soit l'issue de D-021 : ce qui est enregistré est alors finalisé et inscrit au manifeste. « Reprendre » ouvre **un nouveau segment**, ou un nouvel enregistreur si la reprise du précédent échoue. L'enregistrement logique reste le même : un manifeste, des segments assemblés à l'arrêt.
  - Conséquence : le contournement du bug iOS #1220 devient secondaire. Si `resume()` échoue, on démarre un nouvel enregistreur et l'utilisateur ne perd rien.
  - **Détection de l'appel sur Android** : le micro reçoit du silence sans erreur pendant un appel, donc la détection ne peut venir que d'un signal externe :
    1. **Signal principal : la perte du focus audio**, remontée par `AudioManager.observeAudioInterruptions(true)` comme événement `interruption` `began`. L'appli Téléphone prend le focus au début d'un appel.
    2. **Repli : un écouteur `READ_PHONE_STATE`**, avancé depuis l'étape 6b, si le premier test sur le Galaxy A05 montre que le focus n'est pas perdu. Ce repli implique une permission en plus, un module natif léger ou une bibliothèque maintenue (choix à vous soumettre), et la déclaration Play Console. Il serait consigné dans DECISIONS.md.
- `formatProfile.ts` : profil du format retenu par D-021 (débit en Mo/h pendant l'enregistrement et après finalisation, extension, durée de segment). C'est la seule source de ces paramètres, testée.

**Adaptateurs natifs dans `src/features/recording/`**, hors de `src/services` :

- `rnAudioApiEngine.ts` :
  - `AudioRecorder` avec `enableFileOutput` (format et rotation selon D-021) ;
  - `AudioManager.setAudioSessionOptions` en `playAndRecord` ;
  - `observeAudioInterruptions(true)` ;
  - `RecordingNotificationManager.show({ title, contentText, pauseActionTitle, resumeActionTitle, stopActionTitle, usesChronometer, dismissible: false })` avec des textes traduits ;
  - à l'interruption : arrêt du segment en cours (`stop()` ou rotation forcée selon D-021) avant tout le reste ;
  - à la reprise : `setAudioSessionActivity(true)` puis démarrage d'un nouveau segment. Si cela échoue (bug iOS #1220), un nouvel `AudioRecorder` est créé.
- `expoFs.ts` : implémente `Fs` avec expo-file-system.
- `useRecordingStore.ts` : zustand ; état, minuterie et niveau pour l'interface.
- Composants : `LevelMeter`, `RecordingTimer`, `RecordingControls`, `InterruptionBanner`.

**Écrans** :

- `app/record.tsx`, modal plein écran :
  - chrono, jauge de niveau, boutons pause / reprise / stop ;
  - rappel permanent « Informez les personnes présentes » (cahier, § Contraintes) ;
  - bannière « En pause : appel en cours » puis « Reprendre ».
- `app/(tabs)/index.tsx` :
  - bouton « Enregistrer » ;
  - liste **minimale et provisoire** des enregistrements, lue depuis les manifestes : date et heure, durée, badge « Récupéré ». Pas de lecture : c'est l'étape 2, avec SQLite.
- **Permissions à la demande**, au premier appui sur « Enregistrer » :
  - micro, puis notifications sur Android 13+ ;
  - en cas de refus, un écran d'explication avec un lien vers les réglages ;
  - le consentement légal reste à l'étape 5, en attendant le rappel sur l'écran d'enregistrement.

**i18n** : toutes les nouvelles chaînes, y compris les textes de la notification Android et des permissions, en sept langues. Les brouillons suivent la règle D-007.

### Tests (Jest)

- `recorderMachine` : chaque transition valide, et chaque transition invalide rejetée (par exemple `stop` depuis `idle`).
- `recordingStore` et `recovery` avec un `Fs` en mémoire :
  - manifeste écrit à chaque segment ;
  - récupération d'un enregistrement interrompu ;
  - aucune suppression de fichier, même quand un segment est illisible ;
  - idempotence de la récupération si l'app est relancée deux fois.
- `level` : silence → 0, pleine échelle → 1, valeurs dBFS connues.
- `diskSpace` : seuils calculés avec les deux profils (M4A et WAV), estimation pour 1 h.
- `formatProfile` : débits et durée de segment cohérents pour chaque variante.
- `interruptions` :
  - séquences début, fin et reprise, perte de la sortie audio ;
  - **l'interruption ferme le segment et met à jour le manifeste avant toute autre action** ;
  - « Reprendre » ouvre un nouveau segment ;
  - un échec de `resume()` bascule sur un nouvel enregistreur sans perte de segment.
- Écrans (RNTL) :
  - `record.tsx` en pseudo-locale, sans chaîne en dur ;
  - en arabe RTL ;
  - libellés d'accessibilité des contrôles ;
  - bannière d'interruption.
- Le test de pseudo-localisation existant est étendu aux nouveaux écrans.

## Vérification sur appareil (captures dans `docs/captures/step-1/`)

**Builds** :

- Avant chaque build EAS : `npx expo install --fix` (commit séparé si quelque chose change).
- **Build Android d'essai** (phase 1a) : elle contient dès le départ react-native-audio-api, expo-navigation-bar, expo-file-system et expo-crypto.
- **Seconde build Android**, seulement si D-021 retient le WAV et ajoute le module d'encodage. Sinon la build d'essai suffit pour toute l'étape, puisque le reste est du JS.
- Pas de build iOS à cette étape (D-022).

**Android (Galaxy A05)** :

1. **Premier test après la build : détection d'appel.** Vous appelez le Galaxy A05 depuis un autre téléphone pendant un enregistrement. Pendant ce temps, je relève par logcat et dans l'app ce qui se passe :
   - l'événement `interruption began` arrive-t-il, et quand ;
   - la pause est-elle automatique ;
   - le segment est-il fermé et inscrit au manifeste ;
   - la bannière et le bouton « Reprendre » de la notification apparaissent-ils.

   Ensuite, je mesure la reprise dans un nouveau segment et la perte, qui ne doit porter que sur la durée de l'appel. **Si le focus audio ne bouge pas, on bascule sur le repli `READ_PHONE_STATE` avant d'aller plus loin** (choix de module à vous soumettre).

2. Démarrage en moins de 2 s, mesuré par logcat et horodatage.
3. **Kill** pendant l'enregistrement (`kill -9`), relance, enregistrement récupéré avec le badge, perte inférieure ou égale à l'objectif de D-021.
4. Retrait de l'app des apps récentes : l'enregistrement continue.
5. **60 min n° 1, instrumenté par adb** (branché en USB, donc en charge) : écran verrouillé (`input keyevent 26`), arrêt depuis la notification, `adb pull`, durée mesurée avec `afinfo` (écart toléré inférieur à 1 s), notification persistante traduite.
   - **Ce test ne prouve rien sur Doze ni sur l'optimisation de batterie Samsung**, qui ne s'enclenchent pas pendant la charge.
6. **60 min n° 2, celui qui remplit le critère de fin** : vous le faites à la main, téléphone **débranché, sur batterie**, option développeur « Rester activé » **désactivée**, écran verrouillé, sans adb pendant l'enregistrement. À la fin, seule la durée du fichier est vérifiée (`adb pull` et `afinfo`, ou affichage dans la liste de l'app).
7. Casque débranché et Bluetooth, si disponibles.
8. Barre de navigation en clair et en sombre (D-015).
9. Remise en état du téléphone après chaque test (police, thème, accessibilité, langue).

**iPhone : dette iOS (D-022), rien n'est exécuté à cette étape.** La liste à rejouer avant l'ouverture de l'étape 5 est consignée dans DECISIONS.md :

- appel entrant en premier ;
- puis démarrage, kill et 60 min sur batterie ;
- reprise après appel avec ouverture d'un nouveau segment (bug #1220) ;
- indicateur orange du micro visible ;
- textes de permission dans les 7 langues ;
- plus les vérifications de l'étape 0 qui sont restées en attente sur iPhone.

**CI** : typecheck, lint et tests au vert à chaque commit.

## Risques

| Risque                                                                                                                                            | Parade                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Appel non détecté sur Android : le micro reçoit du silence sans erreur, et la perte de focus audio peut ne pas se produire sur ce modèle          | Premier test après la build ; si le focus ne bouge pas, écouteur `READ_PHONE_STATE` avancé depuis l'étape 6b (permission, déclaration Play Console, choix de module soumis au propriétaire) ; en dernier recours, détection d'un silence prolongé par la jauge, signalé à l'utilisateur sans pause automatique |
| Bug iOS #1220 : pas de reprise après un appel                                                                                                     | Peu critique : l'interruption ferme le segment, et la reprise ouvre un nouveau segment ou un nouvel enregistreur ; la réactivation de session reste tentée en premier                                                                                                                                          |
| Test de 60 min faussé par la charge USB (Doze et batterie Samsung inactifs)                                                                       | Second test de 60 min, sur batterie, sans « Rester activé », qui seul remplit le critère de fin                                                                                                                                                                                                                |
| Bug Android #1299 : perte d'environ 0,1 % au rééchantillonnage en 16 kHz                                                                          | Sans effet à l'étape 1, qui n'utilise que le fichier ; à traiter à l'étape 3 (version 1.0 ou rééchantillonnage côté JS)                                                                                                                                                                                        |
| Arrêt par la gestion de batterie Samsung                                                                                                          | Service de premier plan déclaré ; si le test de 60 min échoue, guide « Ne pas optimiser » et consignation                                                                                                                                                                                                      |
| Démarrage impossible depuis l'arrière-plan (iOS 12.4+, Android 14)                                                                                | L'enregistrement ne démarre qu'avec l'app au premier plan ; le bouton de la notification ne fait que mettre en pause ou reprendre                                                                                                                                                                              |
| Exclusion de la sauvegarde iCloud (cahier, § Fichiers) : aucune API Expo, et Apple recommande de sauvegarder les données créées par l'utilisateur | Hors étape 1 : décision produit à l'étape 2                                                                                                                                                                                                                                                                    |

## Branche et commits

- Branche `step-1-recording`, une PR.
- Commits en anglais, préfixés `step-1:`. L'essai et le choix (D-021) sont commités avant le service.
- `npm run typecheck && npm run lint && npm test` au vert avant chaque commit.
- CLAUDE.md : ligne Audio de la table de stack mise à jour (D-020).
