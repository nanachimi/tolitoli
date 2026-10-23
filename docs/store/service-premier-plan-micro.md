# Déclaration du service de premier plan « microphone »

> **Brouillon — à faire relire avant soumission.** Texte destiné au formulaire
> « Autorisations de services de premier plan » de la Play Console (Android 14 et suivants).

**Type de service** : `FOREGROUND_SERVICE_MICROPHONE` (`foregroundServiceType="microphone"`), déclaré par react-native-audio-api (D-020).

**Fonctionnalité qui l'utilise** : l'enregistrement d'une conversation, démarré par l'utilisateur.

**Description proposée (à coller dans le formulaire)** :

> Tolitoli enregistre les conversations que l'utilisateur démarre lui-même en appuyant sur
> « Enregistrer ». Le service de premier plan de type microphone garde l'enregistrement actif
> quand l'écran se verrouille ou que l'utilisateur ouvre une autre app, pour qu'une réunion ou un
> cours d'une heure ne soit pas coupé. Une notification persistante reste visible pendant tout
> l'enregistrement, avec les boutons Pause et Arrêter. Le service s'arrête dès que l'utilisateur
> arrête l'enregistrement. L'enregistrement ne démarre jamais en arrière-plan ni sans action de
> l'utilisateur. Pendant un appel téléphonique, il se met en pause.

**Pourquoi une alternative ne convient pas** : WorkManager et les tâches différées ne garantissent pas la capture audio continue. Sans service de premier plan, Android coupe l'accès au micro dès que l'app passe en arrière-plan, et l'enregistrement d'une réunion serait perdu.

**Impact pour l'utilisateur si le service est interrompu** : la partie déjà enregistrée est conservée (écriture continue sur le disque, D-021). La suite de la conversation n'est pas enregistrée.

**Lien vers la vidéo** : [URL de la vidéo de démonstration, voir video-demonstration.md].
