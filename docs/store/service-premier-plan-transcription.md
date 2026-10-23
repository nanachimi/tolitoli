# Déclaration du service de premier plan « transcription » (dataSync)

> **Brouillon — à faire relire avant soumission.** Texte destiné au formulaire
> « Autorisations de services de premier plan » de la Play Console (Android 14 et suivants).
> C'est le **deuxième** type de service de premier plan de Tolitoli, après le micro
> ([service-premier-plan-micro.md](service-premier-plan-micro.md)) : deux déclarations à remplir.
> Rédigé dès le commit natif de l'étape 3, parce que c'est cette déclaration qui retarde les
> soumissions.

**Type de service** : `FOREGROUND_SERVICE_DATA_SYNC` (`foregroundServiceType="dataSync"`), déclaré par le module local `modules/audio-encoder/` (`TranscriptionService`, étape 3).

**Fonctionnalité qui l'utilise** : la transcription sur l'appareil (Whisper) d'un enregistrement déjà écrit sur le téléphone. Aucune donnée ne quitte l'appareil pendant ce traitement.

**Pourquoi `dataSync`** : Android 14, la version de l'A05 et d'une grande partie de nos utilisateurs, n'a pas de type dédié au traitement local de fichiers. La documentation d'Android range le traitement de fichiers locaux sous `dataSync`. Le type `mediaProcessing` n'existe qu'à partir d'Android 15 et ne couvrirait pas l'A05. Il pourra s'ajouter pour Android 15 et suivants si Google le demande à la revue.

**Description proposée (à coller dans le formulaire)** :

> Après un enregistrement, Tolitoli le transcrit en texte sur le téléphone lui-même, sans
> l'envoyer sur Internet. Pour une réunion d'une heure, ce calcul dure plusieurs minutes sur un
> téléphone d'entrée de gamme. Le service de premier plan garde la transcription active quand
> l'écran s'éteint ou que l'utilisateur ouvre une autre app. Une notification visible indique la
> transcription en cours et sa progression, pendant toute sa durée. Le service démarre seulement
> quand un enregistrement arrêté par l'utilisateur attend sa transcription, et s'arrête dès que la
> file est vide. Il ne démarre jamais pendant un enregistrement, et une transcription en cours
> s'interrompt dès qu'un enregistrement commence.

**Pourquoi une alternative ne convient pas** :

- WorkManager limite une tâche à environ 10 minutes. Elle s'arrête et reprend selon des conditions que l'app ne maîtrise pas, et une transcription d'une heure en demande beaucoup plus sur un téléphone d'entrée de gamme.
- Les tâches de transfert lancées par l'utilisateur (`user-initiated data transfer jobs`) sont réservées aux transferts réseau. Ici, il n'y a aucun transfert : le calcul est local.
- Sans service de premier plan, le processeur s'endort écran éteint, et la transcription s'arrête jusqu'à la prochaine ouverture de l'app.

**Impact pour l'utilisateur si le service est interrompu** : rien n'est perdu. Chaque segment transcrit est écrit en base avec le point d'avancement (migration `0003`, étape 3). La transcription reprend à ce point au lancement suivant de l'app. L'enregistrement audio n'est jamais touché.

## Limite d'Android 15 : 6 h par 24 h

À partir d'Android 15, un service `dataSync` ne peut tourner que **6 heures cumulées par période de 24 heures** en arrière-plan. Ensuite, le système appelle `onTimeout` et l'app doit arrêter le service. Le compteur repart à zéro quand l'utilisateur ramène l'app au premier plan.

Ce que Tolitoli fait :

- à l'appel de `onTimeout`, le service s'arrête. La transcription en cours s'interrompt proprement, comme pour un enregistrement : le segment en cours est refait, rien d'autre n'est perdu ;
- les enregistrements restent « en attente » dans la file, avec leur point d'avancement ;
- la file reprend à la prochaine ouverture de l'app, qui remet aussi le compteur d'Android à zéro.

Ce que cela implique quand un utilisateur met plusieurs heures d'audio en file :

- 6 h de calcul représentent bien plus de 6 h d'audio. Si une heure d'audio se transcrit en 15 min, la limite tombe après environ 24 h d'audio transcrites d'affilée sans ouvrir l'app. Le débit réel sur l'A05 est mesuré à l'étape 3 (D-037) ; le chiffre est à reporter ici ;
- avec un modèle plus lent, la limite arrive plus tôt. À 45 min par heure d'audio, elle tombe après environ 8 h d'audio ;
- dans tous les cas, rien n'est perdu. La file attend simplement que l'utilisateur rouvre l'app. La Bibliothèque montre alors « en attente » sur les enregistrements restants ;
- Android 14 et versions antérieures, dont l'A05, n'ont pas cette limite.

**Lien vers la vidéo** : [URL de la vidéo de démonstration, voir video-demonstration.md, partie « Transcription »].
