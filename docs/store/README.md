# Dossier de soumission Google Play (brouillons)

> **À faire relire par un juriste.** Brouillons de l'étape 2, à reprendre avant le test fermé
> (semaine 3 du plan accéléré). Rien ici n'est définitif.

| Document                                                           | Pour                                                | État                |
| ------------------------------------------------------------------ | --------------------------------------------------- | ------------------- |
| [politique-de-confidentialite.md](politique-de-confidentialite.md) | URL publique exigée par la Play Console             | Brouillon, à relire |
| [securite-des-donnees.md](securite-des-donnees.md)                 | Formulaire « Sécurité des données »                 | Brouillon, à relire |
| [service-premier-plan-micro.md](service-premier-plan-micro.md)     | Déclaration du service de premier plan `microphone` | Brouillon, à relire |
| [video-demonstration.md](video-demonstration.md)                   | Vidéo de 30 s jointe à la déclaration               | Script              |

Faits vérifiés sur lesquels ils reposent (build de développement `7ff8b5e8`, D-036) :

- **Permissions de l'APK** : `RECORD_AUDIO`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`, `POST_NOTIFICATIONS`, `INTERNET`, `VIBRATE`, `MODIFY_AUDIO_SETTINGS` (expo-audio), `WAKE_LOCK`, `ACCESS_WIFI_STATE`, `DOWNLOAD_WITHOUT_NOTIFICATION` (react-native-blob-util, pour le téléchargement du modèle Whisper), `ACCESS_NETWORK_STATE`, `READ_EXTERNAL_STORAGE` et `WRITE_EXTERNAL_STORAGE` (déclarées par défaut, inutiles à Tolitoli), `SYSTEM_ALERT_WINDOW` (développement), `BIND_GET_INSTALL_REFERRER_SERVICE` (origine à identifier).
- **À trancher avant la soumission** : retirer de la build de production les permissions inutiles (`READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `BIND_GET_INSTALL_REFERRER_SERVICE`), pour que le formulaire et l'APK disent la même chose.
- **Hors 1.0** : comptes nommés, synchronisation, sauvegarde cloud, paiement. Le formulaire est à revoir à chaque ajout.
