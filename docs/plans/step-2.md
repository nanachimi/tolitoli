# Étape 2 : Bibliothèque et base locale

## Contexte

L'étape 1c a construit tous les écrans de la 1.0 sur un dépôt simulé, en mémoire. L'étape 2 remplace ce simulé par une vraie base SQLite (drizzle, FTS5) et branche une vraie lecture audio (expo-audio).

- **Organisation** : branche `step-2-library`, partie de la tête de `step-1c-interface`, et rebasée sur `main` (`git rebase --onto`) dès que la PR #5 est fusionnée. Une seule session (D-035).
- **Déjà commité à l'ouverture** :
  - `docs: refresh the spec with the accelerated plan` ;
  - `step-2: run steps 2 and 3 in sequence, executorch in step 2's build` (CLAUDE.md, D-035) ;
  - `npx expo install --fix` : rien à mettre à jour.

**Critères de fin** (cahier, ligne 2 du tableau des étapes) :

- **Livrable** : schéma drizzle, migrations, FTS5, écran Bibliothèque, écran Détail minimal avec un lecteur audio réel.
- **Fonctions** : créer, renommer, supprimer, rechercher ; corbeille de 30 jours ; tests unitaires du dépôt de données.
- **Invariants de CLAUDE.md** :
  - `outbox` est écrite dans la même transaction que la donnée ;
  - chaque migration a son test ;
  - aucun audio utilisateur n'est supprimé par du code de test ou de migration ;
  - aucun effacement sans geste de l'utilisateur (ici, « Mettre à la corbeille » ou « Vider la corbeille »).

**Ce que 1c a simulé, à remplacer ici** :

1. le dépôt (`src/services/library/simulated.ts`) ;
2. la recherche, faite aujourd'hui en JS ;
3. la corbeille, tenue en mémoire ;
4. les données de démonstration ;
5. l'horloge de lecture (`SimulatedPlaybackEngine`) ;
6. les tailles estimées du Stockage ;
7. le kv-store, qui vit dans un autre fichier.

**Restent simulés hors étape 2** : le téléchargement du modèle et `retryTranscription` (étape 3), l'export et la copie (étape 4).

## Dépendances (une seule build native, lancée au premier commit de code)

| Paquet                                                                             | Rôle                                                                      | Natif                           | Justification                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `drizzle-orm` 0.45.x                                                               | Schéma et requêtes typées                                                 | non                             | Imposé par la stack (CLAUDE.md)                                                                                                                                                                              |
| `drizzle-kit` 0.31.x (dev)                                                         | Génère les migrations SQL                                                 | non                             | Migrations versionnées                                                                                                                                                                                       |
| `babel-plugin-inline-import` (dev)                                                 | Importe les `.sql` dans le bundle                                         | non                             | Méthode documentée par Expo pour drizzle (`metro.config.js` : `sourceExts` + `sql`)                                                                                                                          |
| `better-sqlite3` (dev)                                                             | Exécute **les mêmes migrations SQL** et le dépôt dans Jest (FTS5 compris) | Node seulement, absent de l'app | Tester le vrai SQL et les triggers sans appareil ; le dépôt est écrit pour l'API synchrone commune de drizzle (`BaseSQLiteDatabase<'sync'>`), que ses deux pilotes, expo-sqlite et better-sqlite3, partagent |
| `expo-audio` ~58.0.10                                                              | Lecture réelle                                                            | oui                             | Prévu depuis D-020 ; note de 1c : groupé dans la prochaine build native                                                                                                                                      |
| `react-native-executorch` 0.10.x + `react-native-executorch-expo-resource-fetcher` | Whisper, **non utilisé en étape 2**                                       | oui                             | D-035 : l'étape 3 n'aura pas de build à lancer                                                                                                                                                               |
| `react-native-worklets` (<0.14), `react-native-blob-util` (≥0.24.11)               | Dépendances pairs **obligatoires** d'executorch (importées par son cœur)  | oui                             | Sans elles, le module ne compile pas. Les deux sont de Software Mansion ou en sont recommandées ; `@kesha-antonov/react-native-background-downloader` est facultatif : **non pris**                          |

**Executorch, à vérifier pour qu'il ne casse rien** :

- Taille : un bloc `"react-native-executorch": { "backends": ["xnnpack", "coreml"] }` dans `package.json` limite les bibliothèques natives téléchargées à XNNPACK (Android) et CoreML (iOS). OpenCV, Vulkan et MLX sont exclus. Si Whisper s'avère trop lent en étape 3 sur l'A05, ajouter Vulkan demanderait une nouvelle build : je le signale comme risque.
- Le script `postinstall` d'executorch télécharge ses bibliothèques depuis GitHub à chaque `npm ci`. Je mets `RNET_SKIP_DOWNLOAD=1` dans la CI (Jest n'en a pas besoin). L'EAS les télécharge, lui.
- **Mesures, comparées à la build `1af57476`** : taille de l'APK (`build:list`, puis `unzip -l` pour confirmer `libexecutorch.so` et `libxnnpack_executorch_backend.so`), et démarrage à froid sur l'A05 (`am start -W`, cinq essais, médiane). Critère : pas de plantage ni d'ANR au démarrage, et l'écart de taille noté dans D-036.

**`app.config.ts`** (annoncé ici) : plugin `expo-audio`, avec `microphonePermission: false` et `recordAudioAndroid: false`. Nous n'enregistrons pas avec expo-audio, et les permissions existantes ne changent pas.

## Schéma proposé (à relire ligne à ligne)

Le fichier est `tolitoli.db`. Les dates sont des entiers en ms, les booléens des entiers.

**`recordings`**

| Colonne                                  | Type                           | Note                                                                                                                     |
| ---------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `id`                                     | text PK                        | uuid du manifeste                                                                                                        |
| `title`                                  | text null                      | null = titre par défaut                                                                                                  |
| `created_at`, `updated_at`               | integer not null               |                                                                                                                          |
| `duration_ms`                            | integer null                   |                                                                                                                          |
| `audio_path`                             | text null                      | relatif à la racine des enregistrements                                                                                  |
| `audio_size`                             | integer null                   | octets, lus sur disque à la finalisation                                                                                 |
| `audio_format`                           | text null                      | format du **fichier final** : `m4a` ou `wav` (CHECK) ; `wav` quand l'encodage a échoué (D-021) ; null pendant la capture |
| `sample_rate`                            | integer not null default 16000 |                                                                                                                          |
| `recovered`                              | integer not null default 0     |                                                                                                                          |
| `state`                                  | text not null                  | **`recording → local → queued → uploading → verifying → synced \| error`** (CHECK)                                       |
| `state_error`                            | text null                      | cause de `error`                                                                                                         |
| `transcription_state`                    | text not null default `none`   | `none \| queued \| transcribing \| done \| failed` (CHECK)                                                               |
| `transcription_progress`                 | real null                      | 0–1                                                                                                                      |
| `transcription_issue`                    | text null                      | `failed \| model-missing \| offline \| quota-exhausted`                                                                  |
| `language`, `engine`, `model`, `quality` | text null                      | `quality` : `good \| medium \| draft`                                                                                    |
| `sha256`                                 | text null                      | calculée avec la synchronisation (1.1) ; colonne prévue pour éviter une migration                                        |
| `deleted_at`                             | integer null                   | corbeille                                                                                                                |
| `purged_at`                              | integer null                   | purge commencée : la ligne est invisible partout, la purge reprend au démarrage suivant                                  |

Index : `(deleted_at, created_at DESC)`. Dossiers, marqueurs, `device_id` et `quota_ledger` sont hors 1.0 (cahier) et n'ont pas de table.

**`segments`**

| Colonne              | Type             | Note                                  |
| -------------------- | ---------------- | ------------------------------------- |
| `id`                 | text PK          | rowid implicite conservé pour FTS     |
| `recording_id`       | text not null    | FK `recordings(id)` ON DELETE CASCADE |
| `start_ms`, `end_ms` | integer not null |                                       |
| `speaker`            | integer null     |                                       |
| `text`               | text not null    |                                       |
| `search_text`        | text not null    | voir Recherche                        |

Index : `(recording_id, start_ms)`.

**`outbox`**

| Colonne      | Type                       | Note                                                          |
| ------------ | -------------------------- | ------------------------------------------------------------- |
| `id`         | integer PK autoincrement   |                                                               |
| `entity`     | text not null              | `recording \| segment`                                        |
| `entity_id`  | text not null              |                                                               |
| `op`         | text not null              | `create \| update \| trash \| restore \| purge \| transcript` |
| `payload`    | text null                  | JSON des champs changés                                       |
| `created_at` | integer not null           |                                                               |
| `attempts`   | integer not null default 0 |                                                               |
| `sent_at`    | integer null               |                                                               |

Personne ne la consomme avant la synchronisation (1.1). Chaque écriture du dépôt l'alimente dans sa transaction.

**FTS5 (migration SQL écrite à la main, `drizzle-kit generate --custom`)**

- `segments_fts` : `fts5(search_text, content='segments', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2')`.
- `recordings_fts` : `fts5(title_search, content='', tokenize='unicode61 remove_diacritics 2')`, alimentée par le dépôt dans la même transaction.
- Triggers `AFTER INSERT / DELETE / UPDATE` sur `segments` pour tenir `segments_fts`.

**Recherche (tokenizer retenu)** :

- `unicode61` avec `remove_diacritics 2` retire les accents décomposables : é è ë à ñ, et les tons du lingala (á, ɛ́).
- Il ne replie pas les **lettres** propres au wolof, au lingala et au haoussa : ɛ, ɔ, ŋ, ɓ, ɗ, ƙ, ƴ. Or « mbote » doit trouver « mbɔ́tɛ ».
- Je propose donc une colonne `search_text`, calculée en TypeScript par `foldForSearch()` (`src/services/library/search.ts`). Elle met le texte en NFKD, retire les accents et replie ɛ→e, ɔ→o, ŋ→n, ɓ→b, ɗ→d, ƙ→k, ƴ→y. La même fonction prépare la requête.
- Requête : chaque mot devient `"mot"*` (préfixe), en ET. Résultat : union des titres et des segments, sans les éléments en corbeille, les plus récents d'abord.
- **Validé par le propriétaire.** `text` reste intact pour l'affichage, `search_text` sert à l'index, et la même `foldForSearch` sert des deux côtés. Sa table de repliement vit à côté de `languages.ts` (`src/services/transcription/searchFolding.ts`), avec ses tests.
- **Chinois** : `unicode61` classe les idéogrammes comme des lettres, et le chinois ne met pas d'espaces. Une phrase risque donc de former un seul token, que l'on ne trouve pas par un mot pris au milieu. Le diagnostic FTS le mesure, dans Jest et sur l'appareil. Si c'est cassé, je propose le repli le plus simple : un `LIKE` pour les requêtes qui contiennent des idéogrammes, ou un second index en tokenizer `trigram`. Pas de tokenizer maison.

**Migrations** :

- fichiers SQL générés dans `src/db/migrations/`, appliqués au démarrage par `migrate()` de `drizzle-orm/expo-sqlite/migrator`, avant l'ouverture des écrans ;
- **une migration, un test** : Jest applique chaque migration sur une base better-sqlite3 vide, puis vérifie les tables, les index, les CHECK, les triggers FTS et qu'une migration rejouée ne fait rien ;
- les migrations ne touchent jamais au système de fichiers.

**Kv-store dans le même fichier** :

- `new SQLiteStorage('tolitoli.db')` remplace l'instance par défaut (fichier `ExpoSQLiteStorage`) dans un module `src/features/settings/storage.ts`. Tous les `Storage.getItemSync`/`setItemSync` existants passent par lui ;
- au premier lancement, une recopie idempotente des sept clés existantes vers `tolitoli.db`. Le consentement ne doit pas être perdu. L'ancien fichier est **conservé**, jamais supprimé ;
- **risque** : le kv-store gère ses propres migrations par `PRAGMA user_version`, que mes migrations n'utilisent donc pas (drizzle passe par sa table `__drizzle_migrations`). Kv-store et drizzle ouvrent deux connexions sur le même fichier : je mets le journal en WAL et un `busy_timeout`, et je teste une écriture kv pendant une transaction.

## Machine d'états (TypeScript pur, `src/services/library/states.ts`)

- `transition(state, event)` : `finalized` (`recording → local`), `queue`, `upload`, `uploaded`, `verified` (→ `synced`), `fail` (→ `error`), `retry` (`error → local`). Toute autre transition lève `InvalidRecordingTransition`.
- **Chaque transition, valide ou interdite, a son test.** En 1.0, seules `recording → local` et l'import servent ; les autres préparent la 1.1.
- Transcription : `transcriptionTransition` (`none → queued → transcribing → done | failed`, `failed → queued`), testée de même.

## Dépôt SQLite (`src/services/library/sqlite.ts`, implémente `LibraryRepository`)

L'interface reste celle de 1c : `list`, `get`, `segments`, `search`, `rename`, `trash`, `restore`, `listTrash`, `emptyTrash`, `retryTranscription`, `subscribe`. Les écrans ne changent pas.

**Écritures, toutes en transaction avec `outbox`** :

- `createRecording(manifest)` à `startRecording` (état `recording`) ;
- `finalizeRecording(id, { audioPath, audioSize, durationMs, recovered })` (→ `local`), appelé à l'arrêt et par la récupération au lancement ;
- `importManifests(manifests)` : rattrape les manifestes sans ligne (étape 1, ou coupure entre deux écritures). Le manifeste reste la vérité pendant la capture (D-021) ;
- `rename`, `trash` (`deleted_at = now`), `restore`, `emptyTrash`.

**API pour l'étape 3, qui n'aura qu'à l'appeler** :

- `queueTranscription(id, { language, engine, model })`, qui gère aussi `retryTranscription` ;
- `startTranscription(id)` ;
- `reportTranscriptionProgress(id, progress)` ;
- `saveTranscript(id, segments, { quality })` : supprime puis réinsère les segments, met à jour la FTS et passe à `done`, en une transaction ;
- `failTranscription(id, issue)`.

**Purge de la corbeille à 30 jours** (`purgeExpiredTrash(db, files, now)`, appelée **seulement au démarrage**, après migrations et récupération ; jamais par les migrations ; dans Jest, toujours sur `MemoryFs`) :

- éligibles : `deleted_at ≤ now − 30 j`, `state` terminal (`local`, `synced`, `error`) et `transcription_state` ni `queued` ni `transcribing` ;
- ordre, pour ne jamais ressusciter un enregistrement :
  1. marquer `purged_at` et écrire l'`outbox` `purge`, en une transaction. La ligne disparaît alors de toutes les listes ;
  2. supprimer les fichiers : dossier, puis fichier final ;
  3. supprimer la ligne, ses segments **et l'entrée de son titre dans `recordings_fts`** (table sans contenu externe, que rien ne nettoie toute seule), en une transaction. Même règle partout où une ligne de `recordings` disparaît ; un test cherche le titre après la purge et n'obtient rien ;
- au démarrage, toute ligne déjà marquée `purged_at` reprend à l'étape 2 ;
- `importManifests` **ignore tout id déjà connu de la base**, quel que soit son état (purge comprise) ;
- un test pour chaque mort en route : après le marquage, puis après la suppression des fichiers. Dans les deux cas, le démarrage suivant termine la purge et rien ne revient dans la Bibliothèque ;
- « Vider la corbeille » suit le même chemin, sur geste explicite.

**Écran Corbeille** : jours restants par élément (« Supprimé dans 12 jours », pluriels en 7 langues).

## Données de démonstration : base séparée

- `tolitoli-demo.db`, même schéma, mêmes migrations. Le dépôt est construit sur l'un ou l'autre fichier ; **c'est une bascule de chemin, la base réelle n'est jamais écrite**.
- Le jeu de `demo.ts` est inséré dans la base de démo à sa première ouverture, par les mêmes API du dépôt.
- Le choix est en kv dans `tolitoli.db` (`dev.libraryDatabase` : `real` ou `demo`), honoré seulement sous `__DEV__`. La ligne du groupe Développement dit quelle base est active ; changer de base recharge l'app.
- Les éléments de démo n'ont pas de fichier audio. Pour un élément sans fichier, le lecteur garde l'horloge simulée, en développement seulement. En production, un élément sans fichier n'a pas de lecteur.

## Lecture réelle (`src/features/player/expoAudioEngine.ts`)

- `ExpoAudioPlaybackEngine implements PlaybackEngine` : `createAudioPlayer`, `play`, `pause`, `seekTo`, `setPlaybackRate`, l'événement `playbackStatusUpdate`. **La position affichée est toujours celle que rapporte le lecteur**, jamais un compteur.
- **Libération (amendé, voir Corrections 3b)** : au démontage du Détail, au retour arrière et au passage en arrière-plan, le lecteur est mis en pause, désabonné, puis libéré par `release()` de l'objet partagé. Sous Android, `remove()` seul n'arrête pas ExoPlayer. La 1.0 n'a pas de lecture en arrière-plan.
- **Rendu (amendé, voir Corrections 3c)** : la mise à jour du lecteur ne re-rend plus l'écran entier.
  - La barre de progression et le temps du lecteur passent par une valeur animée.
  - La liste des segments est mémoïsée.
  - Le segment actif est recalculé toutes les 250 ms au plus.

  L'ancienne règle, « 100 ms pour tout », est abandonnée.

- `createEngine` (`usePlayback.ts`) choisit expo-audio quand le fichier existe, l'horloge simulée sinon (démo, en développement).
- Tests : la logique de position, de vitesse et de fin reste couverte par l'interface. Le moteur expo-audio est testé avec un module simulé, et **vérifié sur le téléphone** : c'est de l'audio.

## Autres branchements

- `recordingController` : création de la ligne au démarrage, finalisation à l'arrêt, récupération. `useRecordingStore.recordings` n'alimente plus la Bibliothèque.
- Stockage : `audio_size` en base, plus d'estimation (`src/features/library/storage.ts`).
- `library.ts` : le singleton devient le dépôt SQLite, ouvert par `src/db/client.ts`. `SimulatedLibraryRepository` est retiré, ses tests sont réécrits sur le dépôt SQLite.
- Groupe Développement : une ligne « Base active : réelle / démonstration », et un **diagnostic FTS**. Celui-ci lance, sur une base en mémoire, des recherches de contrôle en français (« elephant » → « éléphant »), en wolof (« naata » → « Ñaata », « nangu » → « ŋangu ») en lingala (« mbote » → « mbɔ́tɛ ») et en chinois (un mot pris au milieu d'une phrase), et affiche le résultat de chacune.

## Commits prévus (`step-2: …`)

1. `add react-native-executorch for step 3's build`, seul, en premier, avec ses deux dépendances pairs et `RNET_SKIP_DOWNLOAD` en CI. **Il ne bloque jamais l'étape 2.** Si la build échoue, si le démarrage à froid régresse sensiblement sur l'A05, ou si worklets et blob-util demandent plus qu'une configuration triviale, je le retire, je le note dans D-036, et l'étape 3 lancera sa propre build.
   1b. `add database and audio dependencies` (drizzle, expo-audio, `app.config.ts`). **La build de développement Android part aussitôt, en arrière-plan.**
2. `add the database schema and migrations`, avec un test par migration.
3. `add recording state machines`, avec le test de chaque transition.
4. `add the SQLite library repository`, avec ses tests (transactions et `outbox`, recherche, corbeille, purge).
5. `keep settings in the app database`, avec la recopie des clés.
6. `move demo data to its own database`.
7. `wire recording, launch and screens to the database`, avec les jours restants dans la Corbeille.
8. `play recordings with expo-audio`.
9. `add the FTS diagnostic`, puis les vérifications sur l'appareil et l'émulateur, D-036 et `docs/plans/step-2.md`.
10. `draft the Play Store submission documents` (`docs/store/`, brouillons marqués « À faire relire par un juriste ») : politique de confidentialité, formulaire « sécurité des données », texte de la déclaration du service de premier plan micro, script de la vidéo de démonstration de 30 s. Puis la PR.

## Corrections (test du propriétaire sur l'A05, 23 octobre)

Ce qu'a établi le diagnostic, en lecture seule :

- l'enregistrement de test est correct en base (`local`, 32,2 s, 262 Ko, m4a) ;
- « 23 oct » ne trouve rien parce qu'un enregistrement sans titre n'a rien dans `recordings_fts`, et que sa date n'est indexée nulle part ;
- **la position affichée vient bien du lecteur** : `onStatus` lit `currentTime × 1000`, et expo-audio Android envoie toujours un état complet. Il n'y a aucun compteur côté JS : le chrono deux fois trop lent n'est donc pas une accumulation ;
- **le son qui continue** : sous Android, `player.remove()` retire seulement le lecteur de la liste du module. Il n'arrête pas ExoPlayer, qui n'est libéré qu'au `release()` de l'objet partagé, ou quand le ramasse-miettes JS le collecte. Notre `release()` n'appelle que `remove()`, et rien ne réagit au passage en arrière-plan.

1. **Bouton rond unique (écran Enregistrement).**
   - Le guide `RecordButton.md` et son aperçu, modifiés hors de ma session, font foi : je les relis et je les commite à part.
   - `RecordButton.mode` devient `record | pause | resume` : un disque `accent` plein, avec l'icône `mic`, puis `pause`, puis `mic`. Plus de carré « stop ».
   - Arrêter devient un `Button` secondaire libellé sous le rond, visible en cours d'enregistrement comme en pause. Les boutons Pause et Reprendre latéraux disparaissent.
   - D-023 reste en vigueur : pendant un appel, le rond en mode `resume` est désactivé, avec la bannière qui explique pourquoi.
   - En pause, le point du Timer cesse de pulser et le chrono se fige. Je le vérifie, et je corrige si besoin.
   - Libellés d'accessibilité : « Enregistrer », « Mettre en pause », « Reprendre l'enregistrement », en 7 langues.
   - Tests : mode et icône par état, libellés, Arrêter sous le rond, pulsation arrêtée et chrono figé en pause, reprise refusée pendant un appel, pseudo-locale, arabe.
   - Captures : enregistrement en cours, et en pause.
2. **Recherche par date (option 1).**
   - `recordings_fts.title_search` contient, pour chaque enregistrement, le titre affiché (saisi, ou par défaut) plus des jetons de date tirés de `created_at` dans la langue d'interface : jour, mois abrégé, mois en toutes lettres, année, formes numériques (jour/mois, mois en chiffres), heure. Le tout passe par `foldForSearch`.
   - La construction de ce texte est une fonction pure, injectée dans le dépôt, qui reste ainsi sans i18n.
   - `foldForSearch` replie aussi les chiffres arabo-indiens vers les chiffres latins, avec ses tests.
   - `reindexTitles(language)` reconstruit l'index des titres, une ligne par enregistrement, en une transaction. Il tourne au changement de langue d'interface, et au lancement si la langue indexée (kv `search.titlesLanguage`) diffère de la langue courante, ce qui couvre le redémarrage d'une bascule RTL.
   - Tests, en français et en arabe, un par forme : « 23 oct », « octobre », « 23/10 », « 2026 », l'heure, le titre par défaut, un titre saisi, les chiffres arabo-indiens. Plus : la reconstruction au changement de langue, aucune entrée en double après un renommage, et rien qui reste après la purge.
   - Capture : la recherche « 23 oct ».
3. **Lecture, dans cet ordre, et sans travail de performance avant a et b.**
   - **a. Position venue du lecteur.** Le code le fait déjà (voir le diagnostic). Deux tests pour le garantir : la position suit `currentTime` même quand les événements arrivent espacés, et `createEngine` ne prend jamais l'horloge simulée quand un fichier existe. Si la mesure de c ne montre pas de retard des événements, je reviens vers toi avant de chercher ailleurs.
   - **b. Arrêt et libération.**
     - `ExpoAudioPlaybackEngine.release()` fait `pause()`, retire l'abonnement, puis appelle `release()` de l'objet partagé, en gardant `remove()`.
     - `usePlayback` libère au démontage du Détail, et met en pause au passage en arrière-plan (`AppState`), sans reprise automatique au retour.
     - Tests : montage puis démontage (pause et libération), passage en arrière-plan (pause), retour au premier plan (rien ne repart).
   - **Avant c, vérifier le fichier lui-même** : l'enregistrement de test est extrait de l'appareil et passé à ffprobe. Je relève la durée déclarée, la fréquence d'échantillonnage, le nombre de canaux et l'échelle de temps du conteneur. Un en-tête faux de notre encodeur expliquerait un temps qui ne s'écoule pas au bon rythme ; c'est aussi un prérequis de l'étape 3, Whisper attend du 16 kHz. Résultat noté dans D-036, quel qu'il soit.
   - **c. Saturation du fil JS**, mesurée sur une build preview. La preuve directe est l'**intervalle réel entre deux événements `playbackStatusUpdate`**, pas seulement la dérive du chrono. Si les événements arrivent à l'heure et que le chrono dérive quand même, je te le dis avant de corriger.
     - Avant correctif : sur `0471f29f`, déjà construite avec le code actuel, je relève le chrono affiché contre l'horloge réelle et le délai entre l'appui sur Pause et le changement d'icône.
     - Si la saturation est confirmée : la liste des segments et l'en-tête sont mémoïsés ; le segment actif est recalculé au plus toutes les 250 ms ; la barre de progression et le temps du lecteur passent par une `Animated.Value` alimentée par le moteur, sans rendu React à chaque mise à jour. Le rafraîchissement natif n'est pas ralenti.
     - Tests : nombre de rendus de la liste pendant une lecture simulée, et surlignage qui suit la position.
     - Après correctif : nouvelle preview, mêmes relevés.
     - Capture : le lecteur en cours de lecture.
4. **Pause et « … » inertes pendant la lecture** : ce sont des symptômes du fil bloqué, sans correctif propre. Je les revérifie sur la preview après 3, et je te signale celui qui résisterait.

**Commits de correction**, à la suite de ceux déjà faits (jusqu'à `77d8e40`, mesure de la recherche) et avant D-036 et la PR :

- C1. `step-2: sync design guides with implemented behaviour` (RecordButton.md et son aperçu)
- C2. `step-2: one round button records, pauses and resumes`
- C3. `step-2: index the displayed title and the date for search`
- C4. `step-2: stop and release playback when leaving the Detail` (3a et 3b)
- C5. `step-2: keep the playback tick from re-rendering the Detail` (3c, si la mesure le confirme)
- Puis l'ancien point 9 : `record decision D-036 and the device checks`, qui inclut le point g, le démarrage des deux previews, la taille de livraison et les captures après correction. Enfin le rebasage sur `main` et la PR.

## Vérification

- **À chaque commit** : `npm run typecheck && npm run lint && npm test && git commit`, sans tube.
- **Émulateur** (sans demander) : démarrage à froid ; Bibliothèque et Détail sur la base réelle puis sur la base de démo ; renommer, corbeille, restaurer, rechercher ; Corbeille avec jours restants. Captures en clair, sombre et arabe dans `docs/captures/step-2/`.
- **Téléphone** (je demande avant), dès la première build installée :
  1. test de fumée (`smoke-<build>-*.png`), démarrage à froid sans ANR ;
  2. taille de l'APK et temps de démarrage, comparés à `1af57476` ;
  3. diagnostic FTS en français, wolof, lingala et **chinois** ;
  4. le consentement et la langue sont conservés après la recopie du kv ;
  5. un enregistrement réel : arrêt, ligne en base, recherche par titre après renommage ;
  6. lecture réelle : lecture, pause, déplacement, sauts de 15 s, vitesses, fin de fichier ;
  7. corbeille et restauration ; « Vider la corbeille » qui supprime vraiment les fichiers, vérifié par `adb` sur un enregistrement de test créé pour l'occasion.
- **Dette iOS** : expo-audio, FTS et kv sur iPhone, ajoutés à D-022.

## Risques

- executorch 0.10.x est très récent (version du 21 octobre) : je prends la plus récente qui a au moins une semaine (0.10.6, du 19 octobre), comme ses bibliothèques natives (`nativeLibsVersion` 0.10.6).
- Le plugin Babel de worklets : babel-preset-expo l'ajoute de lui-même quand le paquet est présent. Je le vérifie au premier bundle.
- Deux connexions SQLite sur le même fichier (kv et drizzle) : WAL, `busy_timeout` et un test dédié.
- Repliement de recherche : validé ; reste à mesurer le chinois (diagnostic FTS), verdict signalé au propriétaire dès qu'il tombe.
