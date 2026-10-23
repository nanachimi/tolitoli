# Politique de confidentialité de Tolitoli

> **Brouillon — à faire relire par un juriste avant publication.** Les passages entre crochets
> sont à compléter (éditeur, adresse, pays de lancement, durée de conservation des fournisseurs).

Dernière mise à jour : [date]

## En bref

Tolitoli enregistre les conversations que **vous** démarrez, les transcrit et les conserve **sur votre appareil**. Sans votre action, rien ne quitte votre téléphone : pas de compte, pas de publicité, pas de mesure d'audience, pas de télémétrie.

## Qui est responsable

[Nom de l'éditeur], [adresse], [contact : adresse électronique dédiée à la confidentialité].

## Ce que l'app fait de vos données

**Sur votre appareil, toujours.** Les enregistrements audio, leurs transcriptions, leurs titres et vos réglages sont stockés dans l'espace privé de l'app sur votre téléphone, protégé par le chiffrement de l'appareil fourni par Android. Ils ne sont accessibles qu'à Tolitoli.

**Transcription sur l'appareil.** La transcription locale (modèle Whisper) fonctionne sans réseau. Le modèle se télécharge une fois, en wifi par défaut, depuis Hugging Face Inc. (États-Unis), dont les fichiers sont servis par le réseau de diffusion d'Amazon Web Services (AWS). Comme pour tout téléchargement, Hugging Face et AWS voient l'adresse IP de votre téléphone et le nom technique du logiciel qui télécharge ; ce téléchargement ne transmet aucune de vos données, ni enregistrement, ni texte, ni identifiant. Tolitoli désactive la mesure d'audience que la bibliothèque de transcription (react-native-executorch) envoie par défaut à son éditeur à chaque téléchargement. L'app vérifie l'empreinte de chaque fichier téléchargé avant de l'utiliser.

**Transcription dans le cloud, seulement si vous l'activez.** Le cloud est désactivé par défaut. Si vous l'activez pour un enregistrement, une copie de l'audio est envoyée, après son enregistrement sur l'appareil, à notre serveur (Supabase, [région]), qui la transmet au service de transcription :

- Intron Sahara pour les langues africaines prises en charge ;
- Deepgram pour les autres langues.

Le texte obtenu revient sur votre appareil. Pour compter votre quota mensuel de transcription cloud, l'app crée un **identifiant anonyme** lié à l'appareil. Il ne contient ni votre nom, ni votre numéro, ni votre adresse électronique. [Durée de conservation de l'audio chez Intron et Deepgram : à confirmer auprès d'eux avant publication.]

## Ce que l'app ne fait pas

- Elle n'enregistre jamais sans que vous ayez démarré l'enregistrement. Une notification reste visible pendant toute la durée de l'enregistrement.
- Elle ne capte pas les appels téléphoniques. Pendant un appel, l'enregistrement se met en pause.
- Elle ne lit ni vos contacts, ni votre position, ni vos autres fichiers.
- Elle ne vend ni ne partage vos données à des fins publicitaires.

## Votre responsabilité envers les personnes enregistrées

Dans de nombreux pays, enregistrer une conversation sans l'accord des personnes présentes est interdit. Tolitoli vous le rappelle au premier lancement et à chaque enregistrement. Il vous appartient d'informer les personnes présentes et de recueillir leur accord.

## Vos droits

- **Supprimer.** Un enregistrement mis à la corbeille est supprimé définitivement, audio compris, après 30 jours, ou tout de suite si vous videz la corbeille. Désinstaller l'app supprime toutes les données locales.
- **Supprimer les données cloud.** [Le geste « Supprimer mes données cloud » de l'app efface l'identifiant anonyme et tout ce qui lui est associé sur notre serveur. À écrire quand l'étape 7a l'aura livré.]
- Accès, rectification, opposition : [contact]. Vous pouvez aussi saisir l'autorité de protection des données de votre pays ([CNIL en France], [autres pays de lancement]).

## Enfants

Tolitoli ne s'adresse pas aux enfants de moins de [13 / 15] ans.

## Modifications

Toute modification de cette politique est annoncée dans l'app avant de s'appliquer.
