# Étape 1c : interface complète (plan validé le 2026-10-22)

## Contexte

Les étapes 1 (enregistrement) et 1b (thème et composants) sont fusionnées dans `main`. Avant toute nouvelle build, le propriétaire veut terminer l'interface de la 1.0, qui est du JavaScript pur : Metro et le dev client actuel (build `1af57476`) suffisent.

L'étape 1c (CLAUDE.md, « Objectif et ordre des étapes ») construit tous les écrans de la 1.0 avec les composants existants, sans dépendance native nouvelle et sans build. Les données sont simulées derrière une interface que l'étape 2 remplacera par SQLite.

- Branche `step-1c-interface`, déjà ouverte depuis `main`. Son premier commit est la mise à jour de CLAUDE.md (`91879cd`).
- **Appareils** (nouvelle règle) : tout le travail d'interface se fait sur **l'émulateur Android**. Le téléphone ne sert à rien dans cette étape.
  - L'émulateur `Medium_Phone_API_37.0` (x86_64, Play Store) est libre ; le dev client contient la bibliothèque x86_64.
  - Les deux émulateurs déjà lancés (`MDT680`, `MDT865`) appartiennent à un autre travail : je n'y touche pas.
- **Aucune build** dans cette étape.
- **Build `preview` `272c3221` (étape 1b)** : terminée, donc le Lint de release est passé. Test de fumée sur l'émulateur : Bibliothèque et Réglages sans erreur. À l'ouverture du micro, l'émulateur s'est figé (rendu GPU, trois émulateurs ouverts sur ce Mac Intel). Il a été relancé en `-gpu swiftshader_indirect -no-audio`. L'audio reste le domaine du téléphone.

## Choix du propriétaire (2026-10-22)

1. **Données** : les enregistrements réels de l'étape 1 (manifestes) restent listés, en audio seul. Un **jeu de démonstration** s'y ajoute, activé par un réglage de développement **invisible en production** (`__DEV__`).
   - Le jeu de démo **n'écrit jamais** ni dans les fichiers ni dans les manifestes.
   - Renommer et supprimer sont simulés en mémoire.
2. **Onboarding en trois écrans** :
   - Promesse.
   - Consentement : texte en **brouillon marqué « à faire relire par un juriste »**, acceptation **mémorisée pour de bon** (`expo-sqlite/kv-store`, déjà présent).
   - Téléchargement du modèle Whisper : progression **simulée**, choix « wifi uniquement ». L'étape 3 branchera le vrai téléchargement.
3. **Table des langues provisoire** `src/services/transcription/languages.ts` : TypeScript pur, testé, 16 langues.
   - fr, en, de, ru, zh, ar : moteur local, qualité **bonne**.
   - Swahili, haoussa, yoruba : moteur local, qualité **brouillon**.
   - Lingala, malgache : moteur local, qualité **moyenne**.
   - Igbo, pidgin, zoulou, luganda, wolof : **pas de moteur local**, le sélecteur affiche **« cloud requis »** et pas de qualité.
   - L'étape 8 ajoutera les moteurs cloud (Deepgram, Intron) sans changer l'interface.

## Guides complémentaires : fournis par le propriétaire

Les dix guides ci-dessous sont maintenant dans `docs/design/`, et `INDEX.md` liste vingt composants. Ils sont commités en tête de l'étape (`step-1c: add the remaining design guides`). Le lot 1 puis le lot 2 s'enchaînent sans attendre : chaque écran applique directement le guide qui le concerne, sans solution provisoire.

### Liste initiale des manques (pour mémoire)

Voici les guides et aperçus absents de `docs/design/components/` sans lesquels les écrans ne peuvent pas être complets sans style ad hoc :

| Composant manquant            | Écrans qui l'attendent                                                            | Ce que le guide doit fixer                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SearchField**               | Bibliothèque (recherche plein texte)                                              | Champ (`surface-sunken`, `radius-sm`), icône `search`, effacer (`x`), état « aucun résultat »                                                                                    |
| **Player** (lecteur)          | Détail                                                                            | Lecture et pause, barre de progression avec déplacement, temps écoulé et total, vitesse de 0,5× à 2×, position (haut ou bas), comportement en RTL (la barre se reflète-t-elle ?) |
| **ActionSheet / Menu**        | Détail (bouton `more-horizontal`), appui long sur une carte                       | Liste d'actions (renommer, exporter, déplacer, supprimer en `danger`), annuler, accessibilité                                                                                    |
| **Dialog** (confirmation)     | Supprimer (vers la corbeille), quitter sans enregistrer                           | Titre, texte, deux boutons, action destructrice                                                                                                                                  |
| **TextField**                 | Renommer                                                                          | Champ, libellé, aide, erreur, validation                                                                                                                                         |
| **EmptyState**                | Bibliothèque vide, recherche sans résultat, corbeille vide, transcription absente | Icône `icon-lg` (ou illustration `ochre`), titre, texte, action facultative                                                                                                      |
| **ProgressBar** (et attente)  | Téléchargement du modèle, transcription en cours, écrans d'attente                | Barre déterminée ou indéterminée, libellé, pourcentage, accessibilité (`progressbar`, annonces)                                                                                  |
| **ScreenHeader** (retour)     | Détail, sous-écrans des Réglages (stockage, à propos, langue de transcription)    | Chevron retour (inversé en RTL), titre, action à la fin                                                                                                                          |
| **OnboardingPage**            | Onboarding                                                                        | Mise en page d'une page, indicateur de pages, bouton principal, « passer » ou non, acceptation explicite du consentement                                                         |
| **StorageMeter** (facultatif) | Réglages, stockage                                                                | Espace utilisé, libre et corbeille, ou un simple texte dans une OptionRow                                                                                                        |

Tous ces guides sont désormais fournis.

## Plan de travail

### Lot 1

1. **Couche de données** :
   - `src/services/library/` (TypeScript pur) : interface `LibraryRepository`, avec `list()`, `get(id)`, `segments(id)`, `search(query)`, `rename(id, title)`, `trash(id)`, `restore(id)`, `listTrash()` et un abonnement.
   - Types `LibraryItem` (titre, date, durée, état `audio | transcribing | transcribed | failed`, langue, qualité, `recovered`), `Segment` et `TrashedItem`.
   - Implémentation `SimulatedLibraryRepository` : lit les manifestes en lecture seule (`listRecordings` de `src/services/audio/recordingStore.ts`). Elle ajoute le jeu de démo quand il est activé et garde renommages et corbeille **en mémoire**.
   - Aucun appel à `fs.writeText`, `move` ou `remove` : un test garantit qu'elle n'écrit rien (`MemoryFs.writes` vide).
   - `src/services/library/demo.ts` : 8 enregistrements fictifs (voir « Données de démonstration »).
   - `src/features/library/` : `useLibrary` (zustand) branché sur le dépôt, et l'interrupteur de développement « Données de démonstration », mémorisé en kv-store sous `__DEV__` uniquement.
2. **Table des langues** `src/services/transcription/languages.ts`, avec ses tests.
3. **Réglages complets**, avec `OptionGroup` et `OptionRow` :
   - Langue de l'interface (existe).
   - Langue de transcription : une ligne `link` qui mène à une liste de 16 `OptionRow radio`. La description de chaque ligne vaut « cloud requis » ou la qualité, et la qualité de la langue choisie s'affiche en description de la ligne.
   - Stockage : `link`, avec en description l'espace utilisé par les enregistrements (somme réelle des fichiers, `Paths.availableDiskSpace`) et la corbeille.
   - À propos : version (`expo-constants`, déjà présent), licences, confidentialité et conditions (brouillons « à faire relire par un juriste »).
   - Développement (`__DEV__`) : données de démo, diagnostic des pluriels.

   Les sous-écrans (langue de transcription, stockage avec `StorageMeter`, à propos, corbeille) ont un `ScreenHeader`, conformément au guide.

4. **Bibliothèque** : cartes branchées sur le dépôt.
   - États « Transcription… » (`QualityChip busy`), transcrit (langue et qualité), échec, récupéré.
   - Appui qui ouvre le Détail, avec chevron (fin de l'écart de D-030, décision 6).
5. **Détail** `app/recording/[id].tsx`, partie sans guide manquant :
   - titre `title`, métadonnées, `QualityChip` sous le titre (guide QualityChip) ;
   - liste des `TranscriptSegment` (passé, actif, à venir) ;
   - bannières d'état en `Banner` : transcription en échec avec « Réessayer », modèle absent, hors ligne, quota épuisé. Ce sont des états simulés du jeu de démo.
   - **Lecteur** (`Player`, selon le guide) :
     - **`expo-audio` n'est pas dans le dev client `1af57476`** : absent de `package.json` et aucune classe `expo/modules/audio` dans le code natif de l'APK. La lecture réelle n'est donc pas possible sans build.
     - Le lecteur pilote une **horloge simulée** (`useSimulatedPlayback` : lecture, pause, déplacement, sauts de ±15 s, vitesse) derrière une interface `PlaybackEngine`, que l'étape 2 remplacera par `expo-audio`.
     - Sauts de 15 s, et vitesses 0,5×, 0,75×, 1×, 1,25×, 1,5× et 2× choisies par `ActionSheet` et mémorisées. Je ne vois pas de raison de changer ces valeurs : ce sont les valeurs standard des lecteurs de podcast, et 2× reste intelligible pour de la parole.
     - Le segment actif suit la position, et appuyer sur un segment déplace la lecture.
     - **Note du propriétaire** : `expo-audio` est groupé dans la **prochaine build native**, quelle que soit l'étape qui la déclenche (2 ou 3), pour que la lecture réelle arrive avec elle. L'interface `PlaybackEngine` est prévue pour cette bascule. À rappeler dans la PR.
   - « Copier » au long appui n'est pas fait (`expo-clipboard` est natif, il viendra plus tard).
6. **Onboarding** `app/onboarding.tsx`, partie sans guide :
   - contenu des trois écrans ;
   - mémorisation du consentement ;
   - redirection au lancement tant qu'il n'est pas accepté ;
   - progression simulée du téléchargement.

   Les trois pages utilisent `OnboardingPage`, et le téléchargement simulé utilise `ProgressBar`, conformément aux guides.

7. **Écrans d'erreur et d'attente** : `EmptyState` (bibliothèque vide, aucun résultat, corbeille vide, transcription absente), `ProgressBar` (téléchargement, transcription) et `Banner` (échec, hors ligne, quota, stockage).

### Lot 2 : composants restants, enchaîné après le lot 1

- SearchField : recherche dans la Bibliothèque (`search()` du dépôt, sur le titre et le texte des segments), puis état « aucun résultat ».
- Player : lecteur du Détail (UI ; lecture réelle à l'étape 2).
- ActionSheet, Dialog et TextField : renommer, exporter (simulé : « export disponible à l'étape 4 », car `expo-sharing` est natif), supprimer vers la corbeille avec confirmation, écran Corbeille (restaurer).
- Les composants des guides utilisés au lot 1 (EmptyState, ProgressBar, ScreenHeader, OnboardingPage, StorageMeter, Player) sont créés au fil du lot 1, chacun avec ses tests.

## Données de démonstration (`demo.ts`, jamais écrites sur disque)

Huit enregistrements fictifs, sans donnée personnelle réelle, qui couvrent tous les états à concevoir (cahier, « États à concevoir ») :

- transcrit en français (bonne) ;
- swahili-anglais mélangés (brouillon) ;
- lingala (moyenne) ;
- wolof en « cloud requis », non transcrit ;
- « Transcription… » en cours ;
- transcription en échec ;
- un récupéré après coupure ;
- un long d'1 h 12.

Les segments reprennent des phrases du type de l'aperçu `TranscriptSegment`, avec deux locuteurs.

## Tests et i18n

- Chaque écran a son test RNTL :
  - pseudo-locale, sans texte en dur (`src/ui/__tests__/support.ts`) ;
  - arabe RTL ;
  - accessibilité : rôles, libellés, états, textes décoratifs masqués (D-019).
- Services : `SimulatedLibraryRepository` (aucune écriture, renommer et corbeille en mémoire, recherche), `languages.ts` (16 langues ; « cloud requis » pour exactement les 5 langues prévues ; qualités conformes à CLAUDE.md) et la mémorisation du consentement.
- Toutes les nouvelles clés existent dans les 7 langues, en brouillon selon D-007, avec le wolof à faire relire. Le test de parité i18n existant les couvre.

## Vérification

- `npm run typecheck && npm run lint && npm test` au vert à chaque commit, vérifiés par **code de sortie**.
- Sur l'**émulateur** `Medium_Phone_API_37.0`, sans demander :
  - dev client `1af57476` installé, Metro sur 8081 ;
  - démarrage à froid avant chaque vérification ;
  - captures de chaque écran en clair, en sombre, en arabe et en police agrandie (réglages de l'émulateur remis à leur valeur initiale), dans `docs/captures/step-1c/` et comparées aux aperçus.
- Le téléphone n'est pas utilisé.

## Commits prévus (`step-1c: …`)

1. (fait) règles dans CLAUDE.md
2. `add the remaining design guides` (fait), puis `add the step 1c plan`
3. `add the transcription language table`
4. `add a simulated library repository and demo data`
5. `complete the Settings screen`
6. `wire the Library to the repository and open recordings`
7. `add the recording Detail screen`
8. `add onboarding with legal consent`
9. `add error and waiting states`
10. Lot 2, puis captures et décisions (`DECISIONS.md`, D-031), et PR soumise au propriétaire. La PR rappelle que `expo-audio` rejoint la prochaine build native.
