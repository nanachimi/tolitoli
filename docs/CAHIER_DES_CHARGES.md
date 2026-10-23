# Cahier des charges — Tolitoli

Oct 21, 2026 · @Achille Nana Chimi

## Vision et objectifs

Tolitoli est une app gratuite, iPhone/iPad et Android (téléphone et tablette), qui enregistre une conversation, la transcrit et la conserve en local ou dans le cloud. La transcription locale est gratuite et illimitée ; la transcription cloud, plus précise, est en option et devient payante au-delà d'un seuil mensuel.

**Pour qui.** Étudiants (cours, entretiens), professionnels (réunions, consultations, visites terrain), journalistes, personnes malentendantes qui veulent une trace écrite d'un échange.

**Promesses produit**

- Un bouton, un enregistrement : lancer en moins de 2 secondes, écran éteint ou app en arrière-plan.
- La transcription ne quitte jamais l'appareil par défaut : aucun compte requis pour le mode local.
- Les données appartiennent à l'utilisateur : export audio + texte, suppression totale en un geste.
- Une seule base de code pour les quatre formats d'écran.

**Hors périmètre V1.** Capture directe de l'audio des appels téléphoniques (impossible pour une app tierce sur iOS comme sur Android ; voir la section « Appels téléphoniques » pour ce que l'app automatise à la place), résumé par IA générative, collaboration multi-utilisateurs.

**Méthode de développement.** Le projet est construit avec Claude Code : ce cahier des charges et le fichier `CLAUDE.md` servent de contexte permanent ; chaque étape du plan (section 9) fait l'objet d'un plan détaillé élaboré dans Claude Code avant implémentation.

## Comparatif des frameworks

Recommandation : **Expo (React Native)**. C'est le meilleur compromis entre une seule base de code, la richesse des bibliothèques audio et de transcription embarquée, et la facilité de publication. Flutter est un second choix solide si Dart vous attire ; le natif double le travail pour un gain marginal sur ce type d'app.

| Critère | Expo / React Native | Flutter | Natif (Swift + Kotlin) |
| --- | --- | --- | --- |
| Langage | TypeScript | Dart | Swift et Kotlin (deux bases de code) |
| Une base de code pour iOS + Android, téléphone + tablette | Oui | Oui | Non : tout en double |
| Rendu de l'interface | Composants natifs réels (look iOS sur iOS, Material sur Android) | Moteur de rendu propre (Impeller) : identique partout, très fluide | Natif par définition |
| Enregistrement audio | expo-audio ; react-native-audio-api pour le flux brut 16 kHz | record, flutter\_sound ; flux PCM accessible | AVAudioEngine / AudioRecord : contrôle total |
| Enregistrement en arrière-plan | Supporté (mode audio background iOS, service de premier plan Android) ; nécessite un dev client, pas Expo Go | Supporté ; même configuration native à faire | Supporté, le plus fiable |
| Transcription locale moteur natif (Apple Speech / Google) | expo-speech-transcriber, react-native-speech-recognition-kit | speech\_to\_text | SFSpeechRecognizer / SpeechRecognizer directement |
| Transcription locale Whisper (whisper.cpp) | react-native-executorch (hook useSpeechToText), Cactus SDK | whisper\_wrapper, whisper\_edge, whisper\_ggml\_plus : écosystème le plus riche | whisper.cpp en C via bridge, ou WhisperKit (iOS) |
| Horodatage par mot, langue française | Oui via react-native-executorch (format verbose\_json) | Oui via whisper\_\* | Oui |
| Base locale + recherche plein-texte | expo-sqlite (FTS5), op-sqlite | drift, sqflite (FTS5) | Core Data / Room |
| Cloud : Supabase / Firebase | SDK officiels, très utilisés | SDK officiels (FlutterFire, supabase\_flutter) | SDK officiels |
| iCloud Drive / Google Drive | Modules communautaires, parfois à compléter | Modules communautaires, parfois à compléter | API natives complètes |
| Interface adaptative tablette | Flexbox + hooks de dimension ; split view à construire | LayoutBuilder, excellent pour les grands écrans | UISplitViewController / Jetpack adaptive layouts |
| Mises à jour sans passer par les stores | Oui (EAS Update) : correctifs JS en quelques minutes | Non (Shorebird en tiers) | Non |
| Compilation et distribution | EAS Build dans le cloud : pas besoin de Mac pour iOS | Mac obligatoire pour iOS, ou Codemagic | Mac obligatoire |
| Temps de démarrage / fluidité | Bon ; très bon avec la nouvelle architecture | Excellent | Excellent |
| Taille de l'app (hors modèle Whisper) | 25 à 40 Mo | 20 à 35 Mo | 10 à 20 Mo |
| Taille du modèle Whisper embarqué | tiny 75 Mo, base 145 Mo, small 480 Mo : identique quel que soit le framework | idem | idem |
| Communauté, offres d'emploi, exemples | La plus grande | Grande | Grande mais séparée par plateforme |
| Adéquation avec Claude Code | Très bonne : TypeScript, projet unique, outillage npm standard | Très bonne : projet unique, `flutter` CLI claire | Moyenne : deux projets, deux langages, Xcode indispensable |
| Risque principal | Dépendance à des modules natifs tiers pour la transcription | Écosystème Whisper récent : vérifier la maintenance des plugins | Coût de développement doublé |
| Verdict | **Recommandé** | Bonne alternative | Déconseillé pour un développeur seul |

Sources : [expo-speech-transcriber](https://github.com/DaveyEke/expo-speech-transcriber), [react-native-executorch useSpeechToText](https://docs.swmansion.com/react-native-executorch/docs/next/hooks/natural-language-processing/useSpeechToText), [whisper\_wrapper](https://pub.dev/packages/whisper_wrapper), [whisper\_edge](https://pub.dev/documentation/whisper_edge/0.1.1/), [react-native-speech-recognition-kit](https://github.com/Gautham495/react-native-speech-recognition-kit).

## Fonctionnalités

Le MVP doit être utilisable au quotidien par vous-même avant d'ajouter le cloud. Chaque colonne correspond à une livraison publiable.

| Domaine | MVP (local uniquement) | V1 (cloud + paiement) | V2 |
| --- | --- | --- | --- |
| Enregistrement | Démarrer/pause/arrêter ; écran éteint et arrière-plan ; indicateur de niveau sonore ; reprise après interruption (appel entrant) | Marqueurs pendant l'enregistrement (« moment important ») | Enregistrement depuis un micro Bluetooth, importation de fichiers audio existants |
| Transcription | Locale, Whisper embarqué (français + 20 langues), choix du modèle tiny/base/small, horodatage par segment, traitement en arrière-plan avec progression | Cloud en option : meilleure précision, séparation des locuteurs, ponctuation ; file d'attente avec reprise | Résumé et points d'action par IA, traduction |
| Lecture | Lecteur audio synchronisé avec le texte (clic sur un mot = saut audio), vitesse 0,5× à 2× | Édition du texte, renommage des locuteurs | Surlignage et notes |
| Organisation | Liste chronologique, titre automatique (date + heure), renommage, dossiers, recherche plein-texte | Tags, favoris, tri | Dossiers partagés (lecture seule) |
| Stockage | Local : audio + texte sur l'appareil, suppression, corbeille 30 jours | Sauvegarde cloud au choix : iCloud Drive / Google Drive (gratuit pour vous) ou compte in-app (Supabase) ; synchronisation multi-appareils | Chiffrement de bout en bout du compte in-app |
| Export et partage | Texte (.txt, .md), audio (.m4a), feuille de partage système | PDF avec horodatages, .srt | Lien de partage web |
| Compte et paiement | Aucun compte | Compte optionnel (e-mail, Apple, Google) ; quota cloud gratuit mensuel puis abonnement via achats in-app | Offre famille / équipe |
| Tablette | Vue à deux panneaux (liste + détail) en paysage | Glisser-déposer entre dossiers, raccourcis clavier | Multi-fenêtres iPadOS |
| Accessibilité | VoiceOver / TalkBack, taille de police dynamique | Mode contraste élevé | Sous-titres en direct (transcription en temps réel affichée en grand) |
| Réglages | Langue de transcription, modèle, qualité audio, conservation | Seuil cloud, consommation du quota, gestion de l'abonnement | Automatisations (Raccourcis iOS, intents Android) |

## Appels téléphoniques

L'enregistrement automatique des appels entrants et sortants par une app tierce est bloqué par les deux plateformes ; l'app doit donc s'appuyer sur l'enregistreur d'appels intégré au téléphone et automatiser tout le reste : détection, import, transcription, classement.

**Ce que les plateformes autorisent (octobre 2026)**

| Capacité | iOS | Android |
| --- | --- | --- |
| Accéder à l'audio d'un appel depuis une app tierce | Non, jamais autorisé ; aucune app de l'App Store ne peut le faire ([source](https://recapmycalls.com/how-to-record-phone-calls-iphone/)) | Non : micro silencieux pendant un appel depuis Android 10, API d'accessibilité interdite sur Google Play depuis mai 2022 ([source](https://www.engadget.com/google-is-banning-third-party-call-recording-apps-from-the-play-store-093201443.html)) |
| Déclencher automatiquement un enregistrement sur appel | Non, aucun mécanisme ([source](https://recapmycalls.com/automatically-record-every-phone-call/)) | Seul le dialer pré-installé (Pixel, Samsung, Xiaomi selon pays) propose l'auto-enregistrement, avec annonce vocale obligatoire |
| Détecter qu'un appel commence ou finit (sans l'audio) | Oui : CallKit `CXCallObserver` | Oui : `READ_PHONE_STATE` ou `CallScreeningService` |
| Enregistreur d'appels intégré | Oui, iOS 18.1+ : app Téléphone, manuel, annonce vocale, résultat dans Notes | Oui sur Pixel, Samsung, Xiaomi, OnePlus selon région ; fichiers dans un dossier accessible |

**Ce que l'app propose à la place** (réglage « Appels » avec trois modes, par type d'appel entrant / sortant) :

| Mode | iOS | Android | Étape |
| --- | --- | --- | --- |
| Désactivé (défaut) | — | — | — |
| Assistant d'appel | À la fin de chaque appel, notification : « Transcrire cet appel ? » ; si l'utilisateur a enregistré avec l'app Téléphone, il partage le fichier depuis Notes vers l'app (feuille de partage), qui le rattache automatiquement au contact, à l'heure et à la durée détectées | Surveillance du dossier d'enregistrements du dialer intégré (`Recordings/Call`, chemin variable par constructeur) : tout nouveau fichier est importé, transcrit et classé automatiquement, avec contact et horodatage issus du journal d'appels | Étape 6b |
| Mémo post-appel | Dès que l'appel se termine, l'app propose en notification d'enregistrer un mémo vocal de 30 s (« ce qu'il faut retenir »), transcrit et rattaché à l'appel | Idem | Étape 6b |
| Appels via l'app (V2, optionnel) | L'app passe elle-même l'appel en VoIP (Twilio ou Telnyx) avec un numéro dédié ; les deux voix sont enregistrées légalement avec annonce ; coût d'environ 0,01 à 0,02 $/min à répercuter sur l'abonnement Pro | Idem | V2 |

La détection d'appel ne requiert pas l'accès aux contacts ; le rattachement au contact est optionnel et demande la permission Contacts. Google Play exige un formulaire justifiant `READ_PHONE_STATE` et `READ_CALL_LOG` : prévoir une vidéo de démonstration pour la relecture.

Question ouverte : voulez-vous les modes « Assistant d'appel » et « Mémo post-appel » dès la V1, ou préférez-vous attendre la V2 avec les appels VoIP ?

## Langues

L'interface est traduite en sept langues dès l'étape 0. La transcription est une autre affaire : Whisper standard couvre bien les grandes langues, mal une poignée de langues africaines, et pas du tout le wolof, l'igbo, le twi, le bambara, le peul ou les langues du Cameroun ; celles-ci exigent un moteur spécialisé côté serveur.

**Interface (i18n, étape 0)**

| Langue | Code | Particularités à prévoir |
| --- | --- | --- |
| Français | fr | Langue source des fichiers de traduction |
| Anglais | en | Langue de repli |
| Allemand | de | Textes 30 % plus longs : boutons et libellés extensibles, pas de largeur fixe |
| Russe | ru | Trois formes de pluriel (gérées par i18next via CLDR) |
| Arabe | ar | Écriture de droite à gauche : `I18nManager.forceRTL`, miroir des icônes directionnelles et des animations, chiffres arabes ou occidentaux au choix ; chaque écran est vérifié en RTL dès l'étape 0 |
| Wolof | wo | Aucune langue système wolof sur iOS ni Android : le sélecteur de langue dans l'app est indispensable ; orthographe officielle sénégalaise ; très peu de traducteurs professionnels, prévoir un relecteur natif |
| Chinois simplifié | zh-Hans | Polices système suffisantes ; chinois traditionnel (zh-Hant) ajouté plus tard sur demande |

Méthode : un fichier JSON par langue, clés en anglais, traduction automatique initiale puis relecture par un locuteur natif avant publication ; pseudo-localisation en CI pour détecter les chaînes en dur ; la langue de l'interface et la langue de transcription sont deux réglages distincts.

**Transcription : ce que les moteurs reconnaissent (octobre 2026)**

| Langues | Whisper standard (local, gratuit) | Moteurs spécialisés (cloud) | Qualité attendue |
| --- | --- | --- | --- |
| Français, anglais, allemand, russe, chinois mandarin, arabe standard | Oui | — | Bonne à très bonne ; l'arabe dialectal (maghrébin, égyptien) est nettement moins bien reconnu |
| Swahili | Oui | Sunbird ASR-51, Google Chirp 3, AssemblyAI, AWS Transcribe | Environ 34 % de mots erronés avec Whisper, 9 % avec Sunbird ([source](https://convertaudiototext.com/blog/best-transcription-for-african-languages), [Sunbird](https://salt.sunbird.ai/models/asr-whisper-51-african-languages/)) |
| Haoussa, yoruba, amharique, somali, shona, lingala, afrikaans, malgache | Oui, mais médiocre | Sunbird ASR-51 (haoussa 17 %, yoruba 38 %), Google Chirp 3 (aperçu), AWS Transcribe, AssemblyAI (« fair ») | Yoruba vers 49 % d'erreurs en local : brouillon seulement ; acceptable en cloud spécialisé |
| Wolof | Non : plus de 100 % d'erreurs sur les bancs d'essai | Sunbird ASR-51 (32 %), Google Chirp 3 (aperçu), AWS Transcribe (différé uniquement), Soynade / Wolof-HuBERT (accès anticipé), Meta MMS | Utilisable comme brouillon via le cloud spécialisé seulement |
| Igbo, twi / akan, ewe, ga, dagbani, pidgin nigérian (Ghana, Nigeria) | Non | Sunbird ASR-51, Intron Sahara v2.5 (31 langues africaines, mélange de langues), Meta MMS | Idem |
| Bambara, peul / fulfulde, dioula, mooré, songhaï (Mali, Burkina) | Non | Sunbird ASR-51 (bambara, fulani), Bambara-ASR-v2 de MALIBA-AI (gère le mélange bambara-français), Meta MMS, Orange SSA-HuBERT (recherche, licence non commerciale) | Idem ; très peu d'offres commerciales |
| Langues du Cameroun (ewondo, duala, bassa, fulfulde, pidgin camerounais) | Non | Meta MMS pour certaines ; rien de commercial pour l'ewondo et le duala | Non couvert de manière fiable en 2026 |

**Conséquences pour le produit**

- Whisper embarqué reste le moteur local pour les grandes langues. Les modèles spécialisés africains (Sunbird est un Whisper large-v3 affiné, 1,5 milliard de paramètres, environ 3 Go) sont trop lourds pour un téléphone : ces langues passent obligatoirement par le cloud.
- Un second moteur cloud « langues africaines » est ajouté à l'étape 8, au choix : Sunbird ASR-51 auto-hébergé via faster-whisper sur un GPU à la demande (environ 0,50 à 1 $ par heure de calcul, licence à vérifier), ou l'API Intron Sahara v2.5, ou Google Chirp 3. Le routage choisit le moteur selon la langue de transcription sélectionnée.
- La détection automatique de langue de Whisper n'est pas fiable pour ces langues : l'utilisateur choisit la langue de transcription manuellement, l'app la mémorise par défaut.
- Le mélange de langues (wolof-français, bambara-français) est la norme dans l'usage réel ; Whisper standard le gère mal. Chaque langue cible est validée à l'étape 8 sur au moins 30 minutes d'audio réel, pas sur des corpus de lecture.
- L'app affiche une estimation de qualité par langue (bonne / moyenne / brouillon) avant la transcription, et ne présente jamais une langue africaine comme « reconnue » sans cette nuance.
- Option commerciale : un quota cloud plus généreux pour les langues sans alternative locale, car c'est là que l'app apporte le plus par rapport aux concurrents.

**Décision : dix langues africaines dès le lancement, avec Intron Sahara v2.5 comme moteur cloud.** Sahara v2.5 (26 août 2026) couvre 31 langues africaines et plus de 500 accents ; il apporte 12 modèles bilingues qui suivent le passage de l'anglais à une langue africaine au milieu d'une phrase (zoulou, haoussa, swahili, luganda, yoruba, pidgin nigérian, entre autres), un modèle trilingue kinyarwanda-anglais-français, et une API de reconnaissance en flux (streaming) et de synthèse vocale. Sur ses propres bancs d'essai en mélange de langues, Intron annonce 34,3 % de mots erronés en moyenne contre 53,8 % pour Gemini : chiffres éditeur, à vérifier sur votre audio. Le modèle est servi par API cloud, le déploiement hors ligne étant réservé aux entreprises via Nvidia, donc jamais sur téléphone ([Intron](https://www.intron.io/), [Techpoint](https://techpoint.africa/feature/intron-expands-sahara-voice-ai/), [Techlabari](https://techlabari.com/intron-unveils-sahara-v2-5-bringing-natural-african-language-mixing-to-voice-ai/)).

| Langue | Code | Moteur local (Whisper embarqué) | Moteur cloud | Utilisable sans cloud ? |
| --- | --- | --- | --- | --- |
| Swahili | sw | Oui, brouillon (environ 34 % d'erreurs) | Sahara v2.5, modèle bilingue swahili-anglais | Oui, qualité brouillon |
| Haoussa | ha | Oui, brouillon | Sahara v2.5, modèle bilingue haoussa-anglais | Oui, qualité brouillon |
| Yoruba | yo | Oui, brouillon (environ 49 % d'erreurs) | Sahara v2.5, modèle bilingue yoruba-anglais | Oui, qualité brouillon |
| Igbo | ig | Non | Sahara v2.5 (bilingue à confirmer) | Non |
| Pidgin nigérian | pcm | Non | Sahara v2.5, modèle bilingue pidgin-anglais | Non |
| Zoulou | zu | Non | Sahara v2.5, modèle bilingue zoulou-anglais | Non |
| Luganda | lg | Non | Sahara v2.5, modèle bilingue luganda-anglais | Non |
| Wolof | wo | Non | Sahara v2.5 (bilingue wolof-français à confirmer) | Non |
| Lingala | ln | Oui, qualité moyenne | Aucun : non couvert par Intron (liste officielle vérifiée le 22 octobre 2026) ; Whisper local seulement en 1.0 | Oui, qualité moyenne |
| Malgache | mg | Oui, qualité moyenne | Idem | Oui, qualité moyenne |

**Conséquences**

- Sept langues sur dix n'ont aucun moteur local : pour elles, l'app ne fonctionne pas sans cloud. Le MVP « local uniquement » ne tient donc plus : le backend minimal et le moteur cloud remontent avant la première publication (voir le plan de développement).
- Pour ne pas imposer de compte : authentification anonyme Supabase (identifiant lié à l'appareil) pour compter le quota ; le compte nommé reste optionnel et ne sert qu'à la synchronisation multi-appareils.
- Une interface `TranscriptionEngine` unique et trois implémentations : `WhisperLocal`, `DeepgramCloud` (grandes langues, séparation des locuteurs) et `SaharaCloud` (langues africaines) ; `SunbirdCloud` en quatrième seulement si Intron ne couvre pas le lingala et le malgache. La table `languages.ts` associe à chaque langue son moteur local éventuel, son moteur cloud et sa qualité attendue, et pilote le sélecteur comme le routage.
- Transcription en direct pendant l'enregistrement : Whisper local pour les langues qu'il couvre ; pour les langues africaines, l'API en flux de Sahara v2.5 le permet aussi, mais elle consomme le quota cloud en continu et exige du réseau pendant tout l'enregistrement. V1 : transcription différée (fichier envoyé à la fin de l'enregistrement, local d'abord) ; le flux Sahara est une option de V2.
- Quota : le quota gratuit de 60 min/mois s'applique ; une fois le tarif Intron connu, décider d'un quota « langues africaines » plus généreux (par exemple 120 min) ou identique.

**À faire avant l'étape 8**

- [ ] Fait le 22 octobre 2026 : Intron est en libre-service. Inscription sur voice.intron.io, clé API dans l'onglet Developers, crédits prépayés (USD, ou NGN pour un compte nigérian), tarif visible après connexion. API : POST https://infer.voice.intron.io/file/v1/upload en multipart (audio\_file\_name, audio\_file\_blob, use\_language\_asr\_input), puis Get File Status ; formats wav, mp3, m4a, ogg, flac ; option use\_diarization ; use\_category à fixer sur file\_category\_general ou file\_category\_meeting\_notes (défaut : télésanté) ; use\_disable\_llm\_corrections à évaluer sur audio réel ; 60 requêtes par minute ; variantes synchrone et streaming disponibles ; documentation sur docs.voice.intron.io. Langues confirmées : sw, ha, yo, ig, pcm, zu, lg, wo (toutes en mode bilingue avec l'anglais), ainsi que fr, en, de, ru, ar. Non couverts : lingala et malgache. Restent à lire après connexion : prix par minute, crédits offerts, conservation de l'audio.
- [ ] Collecter 30 minutes d'audio conversationnel réel par langue, avec le mélange anglais ou français habituel, pour le banc de mesure Whisper vs Sahara vs Sunbird.
- [ ] Sunbird ASR-51 n'est plus nécessaire : lingala et malgache restent sur Whisper local (qualité moyenne), sans moteur cloud en 1.0.

## Architecture technique

Une seule app Expo (TypeScript) avec trois couches : écrans, services métier, modules natifs. Le cloud est une branche optionnelle du pipeline, jamais un prérequis.

&#91;embedded content: pipeline audio → transcription → stockage · 1 décision\]

L'enregistrement produit un fichier .m4a et un flux PCM 16 kHz ; la file d'attente envoie chaque enregistrement à Whisper embarqué par défaut, ou à l'API cloud si l'option est activée et le quota disponible ; le résultat est écrit en SQLite avec index plein-texte, puis synchronisé si l'utilisateur l'a demandé.

**Choix de bibliothèques (Expo SDK 54+, dev client obligatoire)**

| Besoin | Bibliothèque | Remarque |
| --- | --- | --- |
| Navigation, écrans | expo-router | Routes par fichiers, layouts tablette |
| Enregistrement audio | expo-audio + react-native-audio-api | expo-audio pour le .m4a ; audio-api pour le flux PCM 16 kHz mono destiné à Whisper |
| Transcription locale | react-native-executorch (useSpeechToText, Whisper) | Modèles tiny/base/small téléchargés au premier lancement ; transcription en flux ou par fichier, français supporté |
| Détection de voix | react-native-vad ou VAD intégré d'executorch | Découper les silences : accélère Whisper, réduit la facture cloud |
| Base locale | expo-sqlite avec FTS5 + drizzle-orm | Schéma versionné, migrations, recherche plein-texte |
| Fichiers | expo-file-system | Audio dans le dossier documents de l'app, exclu de la sauvegarde iCloud par défaut |
| État | zustand + TanStack Query | Léger, testable |
| Tâches en arrière-plan | expo-task-manager + expo-background-task | Reprendre une transcription interrompue |
| Secrets locaux | expo-secure-store | Jeton de session, clé de chiffrement |
| Cloud (compte in-app) | Supabase (auth, Postgres, Storage, Edge Functions) | La clé du fournisseur STT ne quitte jamais le serveur : l'app appelle une Edge Function |
| Cloud utilisateur | iCloud Drive (iOS), Google Drive API (Android) | Modules communautaires à évaluer à l'étape 6 ; Supabase en repli |
| Paiement | RevenueCat (expo plugin) | Gère App Store et Play Store, quotas, essais |
| Build et mises à jour | EAS Build, EAS Update, EAS Submit | Pas de Mac requis pour compiler iOS |
| Tests | Jest + React Native Testing Library ; Maestro pour les parcours | Les services métier sont du TypeScript pur, testables sans appareil |
| Transcription cloud, langues africaines | Intron Sahara v2.5 (API REST et flux, appelée par une Edge Function) | Routage par langue via la table languages.ts ; Sunbird ASR-51 auto-hébergé en repli pour le lingala et le malgache si Intron ne les couvre pas |

**Structure du dépôt**

```
app/            écrans (expo-router)
src/features/   recording, transcription, library, player, sync, billing
src/services/   audio, whisper, cloudStt, storage, quota
src/db/         schéma drizzle, migrations, requêtes FTS
src/ui/         composants partagés, thème, layouts tablette
supabase/       fonctions Edge, schéma SQL, politiques RLS
```

## Modèle hybride de transcription

Le mode local reste gratuit et illimité pour toujours ; le cloud est un confort payant au-delà d'un quota mensuel gratuit. L'app ne demande jamais de compte tant que l'utilisateur n'active pas le cloud.

**Règle de routage** (appliquée par le service `quota`, voir le schéma d'architecture) :

1. Cloud désactivé dans les réglages → Whisper embarqué.
2. Cloud activé, quota mensuel restant ≥ durée de l'enregistrement → API cloud.
3. Cloud activé, quota épuisé, abonnement actif → API cloud (décompté sur l'abonnement).
4. Cloud activé, quota épuisé, pas d'abonnement → Whisper embarqué + bannière « Passez au cloud pour cet enregistrement » (achat ponctuel ou abonnement).
5. Pas de réseau → Whisper embarqué ; l'utilisateur peut relancer en cloud plus tard depuis le détail.

**Paliers proposés** (à valider après mesure des coûts réels ; prix hors taxes, à ajuster par pays dans App Store Connect / Play Console) :

| Palier | Prix | Transcription locale | Transcription cloud | Stockage cloud compte in-app | Cible |
| --- | --- | --- | --- | --- | --- |
| Gratuit | 0 € | Illimitée | 60 min / mois | 500 Mo | Tout le monde, usage occasionnel |
| Plus | 4,99 € / mois ou 39,99 € / an | Illimitée | 20 h / mois, séparation des locuteurs | 10 Go | Étudiants, indépendants |
| Pro | 9,99 € / mois ou 79,99 € / an | Illimitée | 60 h / mois, priorité de traitement | 50 Go | Journalistes, consultants |
| Recharge ponctuelle | 2,99 € | — | +5 h, sans expiration | — | Besoin exceptionnel sans abonnement |

**Fournisseurs cloud STT** (ordres de grandeur publics d'octobre 2026, à revérifier sur leurs pages tarifaires avant signature) :

| Fournisseur | Coût indicatif | Locuteurs | Français | Pourquoi / pourquoi pas |
| --- | --- | --- | --- | --- |
| Deepgram Nova | environ 0,004 à 0,008 $/min | Oui | Bon | Le moins cher, rapide, API simple : premier choix |
| AssemblyAI | environ 0,004 à 0,01 $/min | Oui | Bon | Très bonne diarisation, résumés intégrés pour la V2 |
| OpenAI (Whisper / gpt-4o-transcribe) | environ 0,006 $/min | Non natif | Excellent | Qualité, mais pas de locuteurs sans post-traitement |
| Google Speech-to-Text | environ 0,016 $/min | Oui | Bon | Plus cher ; utile si vous visez beaucoup de langues rares |
| Intron Sahara v2.5 | Crédits prépayés en libre-service ; tarif par minute visible après inscription sur voice.intron.io | À confirmer | Oui, français africain | Seul moteur commercial couvrant haoussa, yoruba, igbo, pidgin, zoulou, luganda, wolof et swahili bilingue : retenu pour les langues africaines (voir la section « Langues ») |

Avec Deepgram à 0,006 $/min, 60 min gratuites coûtent environ 0,36 $ par utilisateur actif et par mois ; le palier Plus à 20 h coûte environ 7,20 $ de STT au maximum pour 4,99 € encaissés, donc l'abonné moyen doit consommer moins de 12 h pour rester rentable. À surveiller dès la V1 avec un tableau de bord de consommation ; ajuster le quota Plus à 10 h si la moyenne dépasse 12 h.

**Mesures anti-abus** : quota compté côté serveur (Edge Function), pas côté app ; durée maximale par fichier cloud 3 h ; un seul compte par identifiant Apple/Google ; limitation de débit par compte.

## Stockage local et cloud

Le local est la source de vérité ; le cloud est une copie synchronisée. L'app fonctionne intégralement sans réseau.

**Schéma de données (SQLite, drizzle)**

| Table | Colonnes principales | Rôle |
| --- | --- | --- |
| recordings | id (uuid), title, created\_at, duration\_ms, audio\_path, audio\_size, sample\_rate, folder\_id, status (recording / queued / transcribing / done / failed), engine (local / cloud), model, language, sync\_state, deleted\_at | Un enregistrement |
| segments | id, recording\_id, start\_ms, end\_ms, speaker, text | Transcription découpée pour la lecture synchronisée |
| segments\_fts | text, recording\_id (table virtuelle FTS5) | Recherche plein-texte, mise à jour par trigger |
| folders | id, name, parent\_id, sort\_order | Organisation |
| markers | id, recording\_id, at\_ms, label | Marqueurs posés pendant l'enregistrement (V1) |
| quota\_ledger | month, cloud\_seconds\_used, synced\_at | Cache local du quota ; le serveur fait foi |
| settings | key, value | Préférences |

Le fichier audio est stocké sous `documents/recordings/<uuid>.m4a` (AAC 64 kbit/s mono, soit environ 29 Mo par heure). Le PCM 16 kHz n'est jamais conservé : il est produit à la volée pour Whisper.

**Trois destinations cloud, au choix de l'utilisateur**

| Option | Coût pour vous | Ce qui est synchronisé | Avantage | Limite |
| --- | --- | --- | --- | --- |
| Aucune (défaut) | 0 | Rien | Confidentialité maximale, aucun compte | Perte des données si l'appareil est perdu : prévoir un export manuel et un rappel de sauvegarde |
| Cloud de l'utilisateur : iCloud Drive (iOS) ou Google Drive (Android) | 0 | Audio + export JSON de la transcription dans un dossier de l'app | Gratuit pour vous, l'utilisateur garde le contrôle | Pas de synchro iOS ↔ Android ; modules communautaires à fiabiliser |
| Compte in-app (Supabase) | Stockage et sortie réseau facturés au-delà de l'offre gratuite | Tout : enregistrements, segments, dossiers ; multi-appareils | Synchro iOS ↔ Android, pré-requis du cloud STT | Vous hébergez des conversations privées : chiffrement et RLS indispensables |

**Synchronisation (compte in-app)** : chaque ligne porte `updated_at` et `sync_state` (local / pending / synced / conflict). Push des changements locaux puis pull des changements distants, dernière écriture gagnante pour les métadonnées, jamais de suppression distante sans corbeille 30 jours. L'audio est envoyé en reprise par morceaux (upload résumable) et jamais retéléchargé s'il existe localement.

**Sécurité et confidentialité**

- Base SQLite chiffrée au repos (SQLCipher via op-sqlite) avec une clé dans Keychain / Keystore ; les fichiers audio bénéficient du chiffrement matériel de l'appareil.
- Supabase : RLS stricte (chaque ligne appartient à `auth.uid()`), stockage privé, URL signées à durée courte.
- Chiffrement de bout en bout du compte in-app en V2 (clé dérivée d'une phrase de l'utilisateur) : à ce stade, la recherche cloud devient impossible, d'où le report.
- Suppression de compte en un geste, conforme aux exigences d'Apple et de Google : efface Postgres, Storage et révoque les sessions.

## Synchronisation intelligente

Principe : rien n'est jamais envoyé au cloud sans avoir d'abord été écrit sur l'appareil. Un enregistrement commence toujours en local, même avec le cloud activé et le réseau disponible ; le cloud ne reçoit qu'une copie, après coup. La perte de connexion ne change donc rien à la capture, seulement au moment de la copie.

**Garanties**

| Garantie | Mécanisme |
| --- | --- |
| Aucune perte pendant la capture | Audio vidé sur le disque au moins toutes les 2 s (WAV continu vidé toutes les 200 ms, converti en .m4a à l'arrêt, voir D-021) ; en cas de mort de l'app ou du système, le fichier partiel est finalisé au prochain lancement et marqué « récupéré » |
| Aucune perte avant la synchro | Boîte de sortie persistante (table `outbox`) : chaque changement local (nouvel audio, segment, renommage, suppression) y est inscrit dans la même transaction SQLite que la donnée elle-même |
| Aucune corruption | Somme de contrôle SHA-256 calculée à la fin de l'enregistrement, vérifiée côté serveur après upload et après téléchargement sur un autre appareil |
| Reprise après coupure | Upload résumable par morceaux de 5 Mo (TUS via Supabase Storage) ; un morceau envoyé n'est jamais renvoyé |
| Pas d'épuisement de batterie ou de forfait | File traitée par expo-background-task ; politique par défaut « wifi uniquement pour l'audio, données mobiles pour le texte », modifiable ; recul exponentiel 10 s → 15 min entre tentatives |
| Pas de perte par manque de place | Avant d'enregistrer, estimation de l'espace requis (environ 29 Mo/h) ; alerte sous 500 Mo libres ; proposition de libérer l'audio déjà synchronisé et vérifié (le texte reste toujours local) |
| Cohérence multi-appareils | Horodatage `updated_at` et `device_id` sur chaque ligne ; métadonnées : dernière écriture gagne ; segments de transcription : jamais fusionnés, la version la plus récente remplace ; suppression : corbeille 30 jours sur tous les appareils avant effacement réel |
| Visibilité | Icône d'état par enregistrement (local seul / en cours / synchronisé / erreur) ; écran « Synchronisation » listant la file, la dernière réussite, les erreurs avec bouton réessayer ; notification si un enregistrement attend depuis plus de 7 jours |

**Cycle de vie d'un enregistrement**

1. `recording` : audio écrit sur disque en continu.
2. `local` : fichier finalisé, somme de contrôle calculée, inscription dans `outbox`.
3. `queued` : réseau et politique (wifi/données) satisfaits, upload prêt.
4. `uploading` : envoi par morceaux, progression affichée.
5. `verifying` : le serveur recalcule la somme de contrôle.
6. `synced` : copie confirmée ; l'audio local peut être libéré si l'utilisateur le demande.
7. `error` : après 10 échecs consécutifs ou refus serveur (quota de stockage, authentification expirée) ; l'enregistrement reste intact en local et l'utilisateur est prévenu.

Un appareil hors ligne pendant des semaines reste pleinement fonctionnel ; au retour du réseau, la file se vide dans l'ordre chronologique, texte d'abord (léger, utile pour la recherche sur les autres appareils), audio ensuite.

**Transcription cloud et réseau** : la règle de routage de la section 5 s'applique ; si le réseau tombe pendant un envoi au STT cloud, l'enregistrement bascule en transcription locale sans intervention, et l'utilisateur peut relancer la version cloud plus tard depuis l'écran de détail. Le quota cloud n'est décompté qu'après réponse réussie du serveur.

## Écrans et parcours utilisateur

Cinq écrans suffisent au MVP. Sur tablette en paysage, la liste et le détail s'affichent côte à côte ; sur téléphone, l'un pousse l'autre.

| Écran | Route expo-router | Contenu | Tablette (≥ 768 pt, paysage) |
| --- | --- | --- | --- |
| Bibliothèque | `app/(tabs)/index.tsx` | Liste des enregistrements groupés par jour, barre de recherche plein-texte, dossiers, bouton flottant « Enregistrer » | Panneau gauche (360 pt), persistant |
| Enregistrement | `app/record.tsx` (modal plein écran) | Chrono, niveau sonore, pause / reprise / stop, transcription en direct en option, bouton marqueur (V1) | Même modal, centré |
| Détail | `app/recording/[id].tsx` | Lecteur audio, texte synchronisé (le segment en cours se surligne, appui sur un mot = saut), statut de transcription, actions : renommer, déplacer, exporter, retranscrire en cloud | Panneau droit, remplit l'espace restant |
| Réglages | `app/(tabs)/settings.tsx` | Langue, modèle Whisper (taille et précision affichées), qualité audio, conservation, cloud on/off, destination de sauvegarde, compte et abonnement | Formulaire en colonne centrée (max 640 pt) |
| Premier lancement | `app/onboarding.tsx` | 3 écrans : promesse, consentement légal à l'enregistrement, téléchargement du modèle Whisper (barre de progression, choix wifi uniquement) | Identique |

**Parcours principal (téléphone)** : ouvrir l'app → appuyer sur Enregistrer → l'enregistrement démarre en moins de 2 s avec un retour haptique → verrouiller le téléphone, l'enregistrement continue (notification persistante) → Stop → retour à la bibliothèque, l'élément apparaît avec un statut « Transcription… » et une progression → appui sur l'élément → le texte s'affiche au fur et à mesure, le lecteur est utilisable immédiatement.

**États à concevoir** : première ouverture sans enregistrement ; modèle non téléchargé ; transcription en échec (bouton réessayer, bascule locale/cloud) ; stockage presque plein ; quota cloud épuisé ; hors ligne.

**Interruptions à gérer** : appel entrant (pause automatique, reprise proposée), app tuée par le système (l'audio déjà écrit est conservé et finalisé au relancement), casque débranché, changement de route audio Bluetooth.

## Contraintes

Le risque principal n'est pas technique : une app d'enregistrement de conversations est refusée par Apple si le consentement n'est pas visible, et illégale dans de nombreux pays si elle est utilisée à l'insu des participants.

**Légal**

- L'enregistrement d'une conversation privée sans le consentement de tous les participants est pénalement sanctionné en France (art. 226-1 du Code pénal), en Allemagne, en Suisse, et dans une dizaine d'États américains (Californie, Floride, Illinois…) ; d'autres pays exigent le consentement d'un seul participant. L'app ne peut pas trancher pour l'utilisateur : elle informe et fait accepter.
- Écran de consentement au premier lancement, rappel discret sur l'écran d'enregistrement (« Informez les personnes présentes »), mention dans les conditions d'utilisation. Prévoir une relecture par un juriste avant publication.
- RGPD / lois équivalentes : politique de confidentialité publique obligatoire pour les deux stores, registre des traitements si compte in-app, sous-traitants listés (Supabase, fournisseur STT, RevenueCat), droit à l'effacement effectif.
- Enregistrement direct des appels : impossible pour une app tierce (voir la section « Appels téléphoniques ») ; la détection d'appel et la lecture du journal d'appels sur Android exigent une justification et une vidéo de démonstration dans la Play Console.

**Permissions et comportements système**

| Plateforme | Exigence | Mise en œuvre |
| --- | --- | --- |
| iOS | NSMicrophoneUsageDescription, NSSpeechRecognitionUsageDescription (si moteur Apple), UIBackgroundModes audio | Textes de permission explicites en français et anglais ; indicateur orange d'enregistrement visible, c'est attendu |
| iOS | App Review : Apple refuse les apps qui semblent enregistrer en secret | Icône et nom explicites, pas de mode « discret », capture d'écran du consentement dans la fiche |
| Android | RECORD\_AUDIO, FOREGROUND\_SERVICE\_MICROPHONE (Android 14+), POST\_NOTIFICATIONS | Service de premier plan avec notification persistante pendant l'enregistrement, obligatoire |
| Android | Déclaration Play Console du type de service de premier plan, formulaire sécurité des données | À remplir à l'étape de publication |
| Les deux | Suppression de compte depuis l'app (exigée par Apple et Google) | Écran dédié dans Réglages |
| Les deux | Achats in-app uniquement via StoreKit / Google Play Billing | RevenueCat ; aucun lien de paiement externe |

**Confidentialité comme argument** : le mode local, sans compte, est une promesse forte à mettre en avant dans la fiche des stores et le formulaire de confidentialité (« les données ne quittent pas l'appareil sauf activation explicite »).

## Plan de développement avec Claude Code

Dix étapes, chacune livrant quelque chose de testable sur un vrai téléphone. Pour chaque étape, la méthode est la même dans Claude Code : ouvrir une session, demander un plan détaillé (mode plan), le relire, puis laisser implémenter ; terminer par les critères de fin avant de passer à la suivante. Le fichier `CLAUDE.md` et ce document sont le contexte permanent du projet.

**Rituel par étape**

1. `claude` dans le dossier du projet, puis : « Lis CLAUDE.md et docs/CAHIER\_DES\_CHARGES.md. Nous attaquons l'étape N. Propose un plan détaillé en mode plan : fichiers à créer ou modifier, bibliothèques à installer, risques, tests. N'écris pas de code avant ma validation. »
2. Relire le plan, corriger, valider.
3. Laisser implémenter ; exiger `npm run typecheck`, `npm run lint`, `npm test` verts avant tout commit.
4. Tester sur appareil réel (jamais le simulateur pour l'audio), noter les bugs, les faire corriger.
5. Demander un résumé de ce qui a été fait et des décisions prises, à ajouter dans `docs/DECISIONS.md`.

**Les dix étapes**

| N° | Étape | Livrable | Critères de fin |
| --- | --- | --- | --- |
| 0 | Initialisation du projet | Projet Expo (TypeScript, expo-router), dev client, EAS configuré, i18n en sept langues (fr, en, de, ru, ar, wo, zh-Hans) avec prise en charge RTL et sélecteur de langue dans l'app, lint, tests, CI GitHub Actions, `CLAUDE.md`, structure de dossiers | L'app vide se lance sur un iPhone et un Android physiques via le dev client ; CI verte |
| 1 | Enregistrement audio | Service `audio` : start / pause / resume / stop, fichier .m4a, niveau sonore, arrière-plan iOS et service de premier plan Android, gestion des interruptions | Enregistrement de 60 min écran verrouillé, sans perte, sur Android ; appel entrant géré ; vérification iPhone inscrite à la dette iOS (D-022) |
| 2 | Base locale et bibliothèque | Schéma drizzle, migrations, FTS5, écran Bibliothèque, écran Détail minimal (lecteur audio) | Créer, renommer, supprimer, rechercher ; corbeille 30 jours ; tests unitaires du dépôt de données |
| 3 | Transcription locale | Service `whisper` avec react-native-executorch, téléchargement des modèles, file d'attente persistante, transcription par segments avec progression, reprise après kill | 1 h d'audio français transcrite en moins de 15 min sur un Android milieu de gamme ; reprise après fermeture forcée ; vérification iPhone 13 inscrite à la dette iOS (D-022) |
| 4 | Détail et lecture synchronisée | Texte synchronisé avec l'audio, appui sur un mot, vitesse, export .txt/.md/.m4a, feuille de partage | Décalage texte/audio inférieur à 300 ms ; export ouvert dans une autre app |
| 5 | Tablette, accessibilité, finition MVP | Vue à deux panneaux, VoiceOver/TalkBack, polices dynamiques, onboarding avec consentement, réglages | Prérequis à l'ouverture : dette iOS des étapes 1 et 3 soldée (D-022). Audit accessibilité passé ; revue UX sur iPad et tablette Android ; build TestFlight et test interne Play |
| 6 | Sauvegarde cloud utilisateur | iCloud Drive (iOS) et Google Drive (Android) : export automatique audio + JSON, restauration | Perte simulée de l'appareil : restauration complète sur un nouvel appareil de la même plateforme |
| 7 | Backend Supabase et compte | Auth (Apple, Google, e-mail), schéma Postgres, RLS, Storage, synchro bidirectionnelle, suppression de compte | Synchro iPhone ↔ Android sous 30 s ; tests RLS automatisés ; suppression de compte vérifiée |
| 8 | Transcription cloud et quota | Edge Function vers Deepgram, compteur de quota serveur, routage local/cloud selon la règle de la section 5, bannières d'incitation | Quota respecté sous tests concurrents ; clé API jamais présente dans l'app ; coût par minute mesuré |
| 9 | Paiement et publication | RevenueCat, paliers, écran d'abonnement, politique de confidentialité, fiches stores, formulaires de confidentialité, soumission | Achat sandbox validé sur les deux stores ; app approuvée par Apple et Google |

Les étapes 0 à 5 constituent le MVP publiable en local uniquement ; publier à ce stade donne des retours réels avant d'engager les coûts cloud. Les étapes 6 à 9 forment la V1.

**Ajouts liés aux appels et à la synchronisation** : l'étape 1 inclut l'écriture par blocs et la récupération des fichiers partiels ; l'étape 6b « Appels » (détection d'appel, assistant d'appel, mémo post-appel, import automatique des enregistrements du dialer Android) s'insère après l'étape 6 et peut être reportée en V2 ; la synchronisation intelligente (boîte de sortie, upload résumable, sommes de contrôle, écran Synchronisation, politique wifi/données) fait partie des critères de fin de l'étape 7.

**Plan accéléré : Android 1.0 sur le Play Store (22 octobre 2026).** Objectif : une première version publique Android le plus tôt possible ; iOS suit dès que le compte Apple Developer est pris. Quatre leviers :

1. **Le test fermé Google Play démarre tôt.** Un compte développeur personnel doit faire tester l'app par au moins 12 testeurs pendant 14 jours consécutifs avant la production. Ce délai est incompressible : la première build utilisable part en test fermé dès la semaine 3, et les 14 jours courent pendant la fin du développement. À préparer dès maintenant : compte Play Console (25 $), recrutement des 12 testeurs, politique de confidentialité publiée, formulaire « sécurité des données », déclaration du service de premier plan micro avec vidéo de démonstration, fiche et captures.
2. **Intron en libre-service, donc les langues africaines restent en 1.0.** Le backend se réduit à ce que la clé Intron impose : Edge Function Supabase qui porte la clé, authentification anonyme liée à l'appareil, compteur de quota côté serveur (étape 7a réduite). Comptes nommés et synchronisation multi-appareils passent en 1.1. Lingala et malgache restent sur Whisper local.
3. **Deux sessions Claude Code en parallèle** (worktrees) dès la clôture de l'étape 1 : l'étape 2 (base locale et bibliothèque) et l'étape 3 (Whisper) ne touchent pas les mêmes fichiers. Le téléphone reste unique ; les tests sur appareil se font en alternance, toujours après un démarrage à froid.
4. **Périmètre 1.0 réduit.** Conservé : enregistrement, transcription locale et cloud, lecteur synchronisé, recherche, export texte et audio, réglages, écran de consentement légal, accessibilité de base. Reporté en 1.1 ou 1.2 : vue tablette, dossiers, marqueurs, exports PDF et SRT, sauvegarde cloud, comptes nommés, synchronisation, flux Sahara en direct.

| Semaine | Travail | Jalon |
| --- | --- | --- |
| 1 (en cours) | Clôture de l'étape 1 sur Android ; compte Play Console ; recrutement des testeurs ; compte Intron et lecture du tarif ; brouillons de la politique de confidentialité et de la fiche | Étape 1 close |
| 2 | Étapes 2 et 3 en parallèle | Enregistrer, transcrire en local, retrouver un enregistrement |
| 3 | Étape 4 (lecteur synchronisé, export) ; étape 5 réduite (consentement, réglages, onboarding) ; 7a réduite + 8 (Intron) si la semaine le permet | **Build en test fermé : le compte à rebours de 14 jours démarre** |
| 4 et 5 | Corrections remontées par les testeurs via EAS Update ; 7a réduite + 8 (Intron) ; relecture juridique du consentement | Fin des 14 jours |
| 6 | Soumission en production ; revue Google | **Tolitoli 1.0 Android sur le Play Store** |

L'ordre d'exécution des étapes devient : 1, 1b, 1c, puis 2 et 3, puis 4, 5 réduite, 7a réduite, 8, 9. Révision du 23 octobre 2026 : les étapes 2 et 3 s'enchaînent dans un seul dépôt au lieu de deux worktrees en parallèle. Les worktrees ont coûté plus en coordination (DECISIONS.md et CLAUDE.md tenus par une seule session, téléphone partagé) qu'ils n'ont fait gagner, et l'étape 3 est de toute façon bornée par l'appareil. Le temps perdu est repris en faisant entrer react-native-executorch dans la build native de l'étape 2, pour que l'étape 3 n'ait pas à en lancer une autre. Les étapes 6, 6b et 7b passent en 1.1. Ce calendrier suppose une disponibilité quotidienne pour les tests sur appareil ; chaque jour sans test décale la semaine 3 d'autant.

**Réordonnancement imposé par les dix langues africaines** : sept d'entre elles n'ont aucun moteur local, donc l'app publiée doit déjà inclure le cloud STT. Nouvel ordre : 0, 1, 2, 3, 4, puis 7a (backend minimal : projet Supabase, authentification anonyme, Edge Function, compteur de quota, RLS), puis 8 (Deepgram et Intron Sahara v2.5, table `languages.ts`, banc de mesure par langue sur audio réel), puis 5 (finition, TestFlight et test interne Play), puis 6, 6b, 7b (comptes nommés et synchronisation complète), puis 9. Ce réordonnancement est précisé par le plan accéléré ci-dessus (22 octobre 2026), qui fait foi.

**Conventions à imposer dès l'étape 0** (reprises dans `CLAUDE.md`) : TypeScript strict ; services métier sans dépendance React ; un test par règle de routage et par migration ; aucune clé secrète dans le dépôt ; chaque étape = une branche et une PR ; commits en anglais, interface en français, anglais, allemand, russe, arabe (droite à gauche), wolof et chinois simplifié via i18n dès l'étape 0 (voir la section « Langues »).

## Coûts et publication

Le MVP local coûte moins de 300 € la première année ; les coûts variables n'apparaissent qu'avec le cloud et croissent avec l'usage. Montants indicatifs d'octobre 2026, à revérifier sur les sites des fournisseurs.

| Poste | Coût | Quand |
| --- | --- | --- |
| Apple Developer Program | 99 $ / an | Avant l'ouverture de l'étape 5, pour solder la dette iOS (D-022) |
| Google Play Console | 25 $ une fois | Avant le test interne (étape 5) ; prévoir 12 testeurs pendant 14 jours avant la production pour un compte personnel |
| EAS (Expo) | Gratuit jusqu'à 30 builds / mois ; environ 19 $ / mois au-delà | Étape 0 |
| Supabase | Gratuit (500 Mo base, 1 Go stockage) puis environ 25 $ / mois (Pro) + stockage et sortie réseau à l'usage | Étape 7 |
| Deepgram (STT cloud) | Crédit gratuit à l'inscription, puis environ 0,004 à 0,008 $ / min | Étape 8 |
| RevenueCat | Gratuit jusqu'à 2 500 $ de revenus mensuels, puis 1 % | Étape 9 |
| Nom de domaine + page de confidentialité | environ 15 € / an | Étape 9 |
| Juriste (relecture consentement, CGU, confidentialité) | 300 à 800 € selon le pays | Avant l'étape 9 |
| Claude Code | Selon votre abonnement actuel | Tout le long |

**Projection à 1 000 utilisateurs actifs mensuels, 10 % avec cloud activé** : 100 utilisateurs × 60 min gratuites × 0,006 $ ≈ 36 $ / mois de STT, plus Supabase Pro 25 $, soit environ 60 $ / mois avant tout revenu. Vingt abonnés Plus couvrent ce coût.

**Publication**

1. Comptes développeurs créés, identifiant de bundle `app.tolitoli.mobile` réservé sur les deux stores.
2. Fiches stores : nom, sous-titre, 6 captures par format (iPhone 6,7", iPad 13", téléphone et tablette Android), vidéo optionnelle, description mettant en avant le local et la confidentialité.
3. Formulaires : Apple « App Privacy » et Google « Data safety » cohérents avec la politique de confidentialité.
4. TestFlight et test interne Play avec une dizaine de personnes pendant deux semaines ; correction des retours.
5. Soumission ; prévoir un refus Apple probable à la première soumission sur la question du consentement : la réponse est la capture de l'écran de consentement et une note au réviseur.
6. Après lancement : EAS Update pour les correctifs JS sans resoumission ; nouvelle soumission uniquement pour les changements natifs.

**Nom** : Tolitoli. Aucune app de ce nom n'apparaît sur l'App Store ni sur Google Play en octobre 2026 ; l'homonyme principal est la régence de Tolitoli (Sulawesi central, Indonésie), ce qui peut faire remonter des résultats indonésiens dans la recherche des stores : prévoir un sous-titre explicite (« Enregistrer et transcrire ») dans la fiche. À faire : vérifier le domaine (tolitoli.app, tolitoli.com), déposer la marque dans les pays de lancement (INPI, OAPI pour l'Afrique francophone, EUIPO, USPTO selon le cas), réserver le nom sur App Store Connect dès la création du compte.

**Ouvertes** : pays de lancement initial (détermine la relecture juridique et le dépôt de marque) ; réponses d'Intron sur le tarif et la couverture du lingala et du malgache.
