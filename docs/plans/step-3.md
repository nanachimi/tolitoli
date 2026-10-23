# Étape 3 — Transcription locale

Plan validé par le propriétaire le 23 octobre 2026, avec ses réponses aux quatre questions (A à D) et trois ajouts. Le prompt d'ouverture est dans `docs/plans/step-3-prompt.md`.

## Critères de fin hérités de l'étape 2

- **Mesure de la lecture avec des segments** (D-036, « lecture c ») :
  - à reprendre en release sur l'A05, avec le profil `preview-trace`, sur une transcription réelle d'au moins une heure ;
  - relevés : intervalle entre deux mises à jour de la position, écart entre l'horloge et la position affichée, délai de la pause, arrêt au retour arrière ;
  - référence sans segment (build `57e6fed0`) : 102 ms, environ −50 ms et constant, 100 ms, moins de 0,25 s ;
  - si la mesure se dégrade, le correctif décrit dans D-036 est appliqué : liste mémoïsée, segment actif à 250 ms au plus, barre par valeur animée.

## Contexte

- **Organisation** : branche `step-3-transcription`, partie de `main` à jour (`139f166`), une seule session (D-035). Elle seule modifie `DECISIONS.md` (D-037) et ce fichier.
- **Déjà commité à l'ouverture** : `docs: add the step 3 opening prompt`. `npx expo install --fix` : « Dependencies are up to date », rien à commiter.
- **Critères de fin** (cahier, ligne 3 du tableau des étapes, et prompt d'ouverture) :
  - 1 h d'audio français transcrite en moins de 15 min, **jugée sur l'A05** en release, sur batterie, écran éteint. Si l'A05 en est loin même en tiny, c'est une information produit, remontée avant le choix du modèle par défaut ;
  - reprise après fermeture forcée : tout ce qui était `queued` ou `transcribing` reprend au lancement, au point où la transcription s'était arrêtée ;
  - enregistrement prioritaire : deux tests unitaires, un pour chaque sens, et la vérification sur l'A05 décrite plus bas ;
  - batterie et chaleur d'une transcription d'une heure, mesurées et consignées dans D-037 ;
  - les cinq langues sans moteur local (wolof, igbo, pidgin, zoulou, luganda), avec le cloud désactivé : un message clair et une proposition, jamais une transcription vide ni une erreur technique. Tests et captures en français et en arabe ;
  - aucune langue affichée comme transcrite sans son indicateur de qualité. Tests et captures en français et en arabe ;
  - la mesure c, rejouée (voir plus haut) ;
  - vérification sur iPhone 13 inscrite à la dette iOS (D-022).

## Ce que l'API d'executorch 0.10.6 impose

Lu dans le paquet installé, API principale seulement :

1. **Aucun horodatage.**
   - `transcribe(Float32Array 16 kHz, { language })` rend une seule chaîne. `<|notimestamps|>` est forcé, et il n'y a ni `verbose` ni segments.
   - **Le découpage vient donc du VAD FSMN**, livré avec chaque modèle Whisper (1,8 Mo). Chaque prise de parole devient un segment de 15 s au plus, transcrit à part, avec ses propres bornes.
   - On saute ainsi les silences. Aucun mot n'est coupé à la limite fixe de 29 s d'executorch, et on reste sous son plafond de 128 jetons par appel.
   - **Conséquence acceptée par le propriétaire** : l'horodatage se fait au segment, pas au mot. Le cahier est corrigé dans le même commit que ce plan : la ligne « Lecture », l'écran Détail, l'étape 4 et le comparatif des frameworks, qui annonçait à tort un horodatage par mot via executorch.
2. **`react-native-executorch-expo-resource-fetcher` importe `react-native-executorch/legacy`**, qui importe `react-native-device-info`.
   - Le paquet est **retiré** : c'est du JS pur.
   - On utilise à la place `download()` de l'API principale (blob-util). Il reprend un téléchargement interrompu par l'en-tête `Range`, à partir du `.partial`, et s'annule par `AbortSignal`.
3. **Télémétrie activée par défaut** : un POST vers `ai.swmansion.com` à chaque téléchargement réel.
   - `setTelemetryEnabled(false)` est appelé avant tout téléchargement, et un test Jest le vérifie.
   - Reste une requête HEAD de « compteur » vers `huggingface.co/software-mansion/…/config.json` : l'hébergeur lui-même, sans autre tiers.
4. **Interruption** : `transcribeStop()` est vérifié avant chaque jeton, et le calcul tourne sur un runtime worklet natif, pas sur le fil JS.
   - L'appel interrompu rend son texte partiel. La file le jette et refait ce segment à la reprise.
5. Sur Android, executorch choisit Vulkan avant XNNPACK par défaut. Vulkan n'est pas dans la build, donc **XNNPACK_FP32 est fixé explicitement**.

## Modèles et hébergeur

| Modèle (XNNPACK fp32, multilingue) | Taille (HEAD sur HF, 23 oct.)                                     | Licence                                                      |
| ---------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `whisper-tiny`                     | 232 609 280 octets, plus le tokenizer (2,5 Mo) et le VAD (1,8 Mo) | Apache-2.0 (export Software Mansion), poids d'origine OpenAI |
| `whisper-base`                     | 398 650 240 octets, plus le tokenizer et le VAD                   | Apache-2.0                                                   |
| `whisper-small`                    | 1,13 Go : **écarté pour l'A05**                                   | Apache-2.0                                                   |

- Il n'existe pas d'int8 XNNPACK multilingue : seuls les modèles `.en` en ont.
- **Le modèle par défaut n'est pas choisi.** Tiny et base sont mesurés sur l'A05, et les chiffres sont remontés au propriétaire avant le choix.
- **Hébergeur (réponse C)** : Hugging Face, dépôts `software-mansion/react-native-executorch-*`, pour le test fermé.
  - **Ce qui rend ce choix acceptable, c'est le tag figé `v0.10.0` dans l'URL et l'empreinte vérifiée dans l'app** : sans eux, un tiers pourrait changer le modèle sous nos pieds. Chaque fichier a sa taille et son empreinte attendues dans le code. Un fichier qui ne les respecte pas est supprimé et n'est jamais chargé.
  - **Tiers contacté au premier lancement** : Hugging Face Inc. (États-Unis), dont le CDN est servi par AWS (`us.aws.cdn.hf.co`). Ce nom remplace « [hébergeur du modèle] » dans la politique de confidentialité et dans le formulaire « sécurité des données », et le CDN AWS y est nommé aussi.
  - **L'hébergement en propre se décide avant la production.** D-037 le note, avec le coût de bande passante par installation (233 Mo pour tiny, 399 Mo pour base).

## Dépendances et build : une seule build native, en deux profils

| Élément                                                                                        | Natif | Justification                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/audio-encoder/` : `decodePcm(path, startMs, durationMs)`                              | oui   | MediaExtractor et MediaCodec en décodage, symétrique de l'encodeur (D-021). Il rend des octets Float32 16 kHz mono, par fenêtre de 60 s (3,8 Mo) : une heure entière ferait 230 Mo. Recherche de position à la trame AAC près, amorçage retiré, et le WAV de repli de D-021 est lu aussi. iOS : AVAudioFile, écrit mais non testé (dette iOS). |
| `modules/audio-encoder/` : service de premier plan « transcription » (**réponse A, option 1**) | oui   | Environ 100 lignes de Kotlin, de type `dataSync`, avec une notification traduite et un `PARTIAL_WAKE_LOCK`. Sans lui, le processeur s'endort écran éteint et la transcription s'arrête.                                                                                                                                                        |
| `expo-network` (**réponse A**)                                                                 | oui   | « Wifi seulement » exige de connaître le type de réseau. Module Expo.                                                                                                                                                                                                                                                                          |
| Retrait de `react-native-executorch-expo-resource-fetcher`                                     | non   | Il tire l'API legacy, donc device-info                                                                                                                                                                                                                                                                                                         |

- **Builds** :
  - `development`, lancée en arrière-plan au premier commit ;
  - `preview-trace`, sur le même code natif et lancée en même temps, pour les mesures en release. Son JS suit par `eas update --branch preview`, car l'empreinte native ne change pas.
- **Vérifications sur l'APK** : `BIND_GET_INSTALL_REFERRER_SERVICE` a disparu ; la liste complète des permissions du manifeste est consignée dans D-036, avec la nouvelle `FOREGROUND_SERVICE_DATA_SYNC`.
- **`app.config.ts`** (annoncé) : seulement ce qu'il faut au service et à `expo-network`, si leurs manifestes ne le portent pas d'eux-mêmes.
- **Play Console (réponse A)** : c'est notre **deuxième type de service de premier plan**, après le micro, donc une seconde déclaration.
  - Son brouillon est rédigé **dès le commit natif**, dans `docs/store/`, et non à la fin : c'est cette déclaration qui retarde les soumissions.
  - Il traite la limite d'Android 15 (`dataSync` : 6 h par 24 h) et ce qu'elle implique quand un utilisateur met plusieurs heures d'audio en file.

## Schéma (réponse B, option 1) : migration `0003_transcript_drafts`

- Table `transcript_drafts` : `recording_id` (avec suppression en cascade), `idx`, `start_ms`, `end_ms`, `text`, et la clé primaire (`recording_id`, `idx`).
- Colonne `recordings.transcription_cursor_ms`, entier nullable : l'audio est traité jusqu'à ce point.
- Chaque segment fini est écrit dans les brouillons **dans la même transaction** que le curseur. C'est de l'état de travail, sans entrée dans `outbox`, comme la progression.
- `saveTranscript` recopie les brouillons dans `segments`, les vide et remet le curseur à nul, en une transaction.
- **L'ancien texte survit donc à une retranscription qui échoue** : il n'est remplacé qu'au dernier instant. Ce n'est jamais « ni texte ancien, ni texte nouveau ».
- Une nouvelle mise en file (autre langue ou autre modèle) vide les brouillons et le curseur, et laisse les segments.
- Le test de migration couvre : une base peuplée sous 0002, l'application de 0003, les données intactes, la cascade et les contraintes.

## Machine d'états

- Nouvel événement `suspend`, de `transcribing` vers `queued`. Il sert à l'interruption par un enregistrement et à la reprise après une coupure. Pas de nouvelle valeur d'état, donc les `check` ne changent pas. Transition testée.

## Services (TypeScript pur, `src/services/`)

- `transcription/engine.ts` : interface `TranscriptionEngine` (`transcribe(pcm, language, signal) → texte`). `WhisperLocal` en est la première implémentation ; `DeepgramCloud` et `SaharaCloud` suivront à l'étape 8.
- `transcription/routing.ts` : règles 1 et 5, et le résultat `cloud-required` pour les langues sans moteur local. C'est la langue choisie qui décide, jamais la détection automatique. Un test par règle.
- `transcription/segmenter.ts` : regroupe les zones du VAD (écart de moins de 0,5 s), plafonne chaque segment à 15 s, et avance une fenêtre de 60 s dont le curseur s'arrête à la fin du dernier segment complet.
- `transcription/queue.ts` : la file, qui dépend par injection du dépôt, du moteur, du décodeur, de l'état de l'enregistreur et de l'horloge.
  - **Aucune transcription ne démarre** pendant un enregistrement (`preparing | recording | paused | interrupted | stopping`). Test 1.
  - **Une transcription en cours s'interrompt** au démarrage d'un enregistrement : `transcribeStop()`, attente de la fin de l'appel, `suspend`. Elle reprend au curseur une fois l'enregistrement `local`, sans refaire les segments déjà écrits. Test 2.
  - **Reprise au lancement** de tout ce qui est `queued` ou `transcribing` (test de la séquence de démarrage).
  - **Modèle absent** : échec `model-missing` (bannière existante), puis remise en file automatique quand le modèle est prêt.
- `whisper/` : fichiers du modèle (URL au tag figé, taille et empreinte), téléchargement et vérification.
  - Wifi seulement par défaut. « Plus tard » met en pause en gardant le `.partial` ; « Annuler » supprime.
  - Télémétrie coupée.

## Qualité : couple (langue, modèle) — ajout 2

- `languages.ts` ne donne plus une qualité par langue, mais **par couple (langue, modèle)** : `localQuality: Record<LocalModelId, Quality> | null`.
  - Un commentaire dit, pour chaque valeur, le modèle qu'elle suppose et d'où elle vient.
  - Aujourd'hui, toutes viennent du cahier et **aucune n'a été mesurée**. Chaque valeur porte donc un indicateur `measured: false` jusqu'à sa mesure.
- `qualityFor(language, model)` alimente le sélecteur, les réglages, la carte, le Détail et `saveTranscript`, qui enregistre le modèle utilisé.
  - Les transcriptions déjà faites gardent la qualité de leur modèle.
  - Un test garantit qu'un enregistrement transcrit n'a jamais `quality` nul.
- **Mesure du français** avec le banc : 30 min d'audio réel conversationnel, avec du mélange de langues si possible, et le WER de tiny et de base contre une référence.
  - L'audio est enregistré par le propriétaire, avec le consentement des personnes présentes.
  - **La référence doit être humaine** : la transcription de base, corrigée à la main par le propriétaire, ce qui introduit un biais à signaler. Le WER est calculé par un script de `scripts/`.
  - Seuils proposés, à valider : bonne si le WER est sous 15 %, moyenne de 15 à 30 %, brouillon au-delà.
  - Résultat consigné dans D-037. Les autres langues restent marquées « non mesurées ».

## Interface (composants existants, aucun style ad hoc)

- **Bibliothèque et Détail** : « en attente », « en cours », « en pause pendant l'enregistrement ». La progression compte le curseur sur la durée, décodage compris.
- **Onboarding** : le vrai téléchargement, à sa vraie taille. Hors wifi, il est « en attente du wifi ».
- **Stockage** : une ligne pour le modèle.
- **Les cinq langues sans moteur local (réponse D, option 1)** :
  - leur choix dans le sélecteur, ou le Détail d'un enregistrement dans l'une d'elles, affiche un Banner « cette langue demande la transcription cloud » ;
  - son action ouvre un Dialog qui dit la vérité : la transcription cloud arrive dans une prochaine version, **sans date promise**. Aucun réglage cloud factice, et aucune file vers une fonction qui n'existe pas.
- **« Changer la langue de transcription »** (ajout 3) : dans le menu « … » du Détail, le sélecteur de langue puis `queueTranscription` avec la nouvelle langue. C'est le seul recours après une heure enregistrée dans la mauvaise langue. Si cela coûtait plus qu'un branchement, le propriétaire est prévenu avant.
- Toutes les nouvelles clés sont traduites dans les sept langues, et la pseudo-locale passe.

## Ordre de travail : les points incertains d'abord, sur l'A05

1. Commit natif, puis les deux builds en arrière-plan. Pendant ce temps : schéma, file et tests Jest.
2. **Banc** (groupe Développement), sur l'enregistrement de 1 h 23 de l'étape 1 déjà sur l'A05 : décodage seul sur une heure entière, VAD seul, transcription en tiny puis en base.
   - Estimation du décodage avant mesure : 20 à 60 s pour une heure.
3. **Débit, batterie et chaleur, en release** : sur batterie, écran éteint, une heure entière.
   - `dumpsys battery` et `dumpsys thermalservice` au départ et à l'arrivée.
   - Chiffres remontés au propriétaire avant le choix du modèle par défaut, et avant toute décision sur « attendre la charge ».
4. **Enregistrement prioritaire** : une transcription d'une heure tourne, et **le propriétaire lance à la main** un enregistrement de 5 min. Trois preuves qu'il ne manque rien :
   - un son de 1 kHz continu, joué par le Mac pendant la capture, analysé comme dans D-021 (creux d'énergie et ruptures de phase, par fenêtres de 10 ms) ;
   - la durée ffprobe du `.m4a`, comparée à l'horloge réelle relevée dans les journaux ;
   - logcat relevé pour tout débordement de tampon d'AudioRecord.
5. **Reprise** après `am force-stop` en pleine transcription, puis après un retrait de la liste des apps récentes.
6. **Mesure c** en release, sur la transcription d'une heure.
7. **Captures sur l'émulateur**, en français et en arabe : les cinq langues sans moteur local et les indicateurs de qualité. Tests de fumée de chaque build.

Le téléphone est demandé une fois, pour les points 2 à 5. Chaque test se fait après un démarrage à froid, et le code servi par Metro n'est pas modifié pendant que le propriétaire a le téléphone en main.

## Commits prévus (`step-3: …`)

0. `plan local transcription; segment-level sync in the spec` (ce fichier et le cahier).
1. `add PCM decoding and the transcription service to the native build` : décodeur, service, `expo-network`, retrait du paquet de téléchargement. **Les deux builds partent ici.**
2. `draft the data-sync foreground service declaration` (`docs/store/`).
3. `add transcript drafts and the transcription cursor` (migration 0003 et son test).
4. `add the suspend transition`.
5. `rate local quality per language and model`.
6. `add the transcription engine, routing and segmenter`.
7. `add the transcription queue`.
8. `download the Whisper model`.
9. `wire transcription to recording, launch and screens`, dont « Changer la langue » et le Dialog cloud.
10. `add the transcription bench`.
11. Mesures, D-037, `docs/store/` (hébergeur), dette iOS. Puis la PR.

## Risques

- **L'A05 trop lent, même en tiny** : c'est une information produit, et le routage devra le dire.
- **Hallucinations de Whisper sur du bruit** : le VAD les limite. Mesure d'abord, puis un filtre si besoin.
- **Retour des octets par le module Expo** : `ByteArray` doit arriver en `Uint8Array` sans copie coûteuse. Vérifié en premier, sur une fenêtre de 60 s.
- **Type `dataSync`** : il demande une déclaration Play, et Android 15 le limite à 6 h par 24 h. `mediaProcessing` n'existe qu'à partir d'Android 15, et l'A05 est en Android 14.
- **iOS** : pas de service de premier plan, donc la transcription n'avance qu'avec l'app ouverte, et le décodeur n'y est pas testé. Les deux vont à la dette iOS.

## Reprise (pause du 24 octobre 2026, 00:50)

Le texte de référence est la section « Reprise » de D-037. En bref :

- **Où nous en sommes** : 18 commits poussés, tests verts. La chaîne complète fonctionne sur l'A05, mais **tiny en XNNPACK fp32 dépasse 66 min de calcul par heure d'audio**, en release, écran éteint, sur batterie. La mesure était inachevée à 77,6 min de calcul pour 70,6 min d'audio. Le cahier vise moins de 15.
- **Mesuré** :
  - téléchargement de tiny en environ 1 à 2 min en wifi ;
  - décodage à 13 fois le temps réel (environ 4,6 min par heure), avant la correction `16f7f37`, pas encore mesurée ;
  - VAD : 21 s pour 29 min ;
  - batterie −11 points en 78 min ; température de la batterie de 33,9 à 36,5 °C ; processeur à 59 °C ; pas de bridage ;
  - pic de mémoire de tiny : 785 Mo de PSS, et 161 Mo en swap.
- **Pas mesuré** : débit exact, base et small, décodeur corrigé, mesure c, reprise après fermeture forcée, enregistrement prioritaire, règle des 35 % de mémoire, WER réel.
- **STOP** sur le choix du modèle et sur « base par défaut » (`41d821a`) : on ne construit plus au-dessus avant d'avoir tranché le moteur.
- **Première action de demain** : l'expérience whisper.cpp quantifié (q5 et q8, NEON) contre executorch fp32, sur l'A05, même fichier, tiny puis base. Elle est bornée à une journée, et ses suites sont décrites dans D-037 :
  - un facteur 3 ou plus : proposition de remplacement de bibliothèque, le propriétaire tranche ;
  - un écart faible : le local devient la voie des mémos courts, le cloud celle des réunions.
- **À redemander** : la fin de la consigne du 24 octobre, tronquée à « Dans les deux c… ».
- **Attention au premier lancement de la preview** : la transcription de l'enregistrement de banc `f6adae63` reprendra d'elle-même.
