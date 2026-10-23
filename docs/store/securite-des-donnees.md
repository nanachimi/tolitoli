# Formulaire « Sécurité des données » (Play Console)

> **Brouillon — à faire relire par un juriste avant soumission.** Réponses proposées pour la
> 1.0 Android (transcription cloud incluse, étape 8). À revoir si le périmètre change.

## Collecte et partage

| Question                                                          | Réponse proposée | Justification                                                                                                        |
| ----------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| L'app collecte-t-elle ou partage-t-elle des données utilisateur ? | **Oui**          | Seulement la transcription cloud, si l'utilisateur l'active                                                          |
| Toutes les données collectées sont-elles chiffrées en transit ?   | **Oui**          | HTTPS vers Supabase, puis vers Intron et Deepgram                                                                    |
| Les utilisateurs peuvent-ils demander la suppression ?            | **Oui**          | Geste « Supprimer mes données cloud » (étape 7a) ; données locales supprimées par la corbeille ou la désinstallation |

## Types de données

| Type (catégorie Play)                                          | Collecté                    | Partagé               | Facultatif | Finalité                        | Note                                                         |
| -------------------------------------------------------------- | --------------------------- | --------------------- | ---------- | ------------------------------- | ------------------------------------------------------------ |
| Audio → Enregistrements vocaux ou sonores                      | Oui, si le cloud est activé | Non (voir ci-dessous) | **Oui**    | Fonctionnalité de l'app         | Copie envoyée après l'écriture locale, pour la transcription |
| Identifiants de l'appareil ou autres identifiants              | Oui, si le cloud est activé | Non                   | **Oui**    | Fonctionnalité de l'app (quota) | Identifiant anonyme Supabase, aucune donnée personnelle      |
| Messages, contacts, position, photos, historique de navigation | Non                         | Non                   | —          | —                               | —                                                            |
| Diagnostics, journaux de plantage, mesure d'audience           | Non                         | Non                   | —          | —                               | Aucune télémétrie (CLAUDE.md)                                |

**« Partagé » : non.** Intron et Deepgram traitent l'audio pour le compte de l'éditeur, en tant que sous-traitants. Selon la définition de Google, un transfert à un prestataire qui agit pour le compte du développeur n'est pas un partage. **Point à faire confirmer par le juriste**, avec les contrats de sous-traitance d'Intron et de Deepgram.

**Traitement éphémère ?** À cocher seulement si Intron et Deepgram confirment par écrit qu'ils ne conservent pas l'audio (encore à lire après connexion à leurs consoles, cahier des charges).

## Téléchargement du modèle de transcription

- Le modèle Whisper (233 Mo pour tiny, 399 Mo pour base) se télécharge une fois depuis **Hugging Face Inc. (États-Unis)**, dont le CDN est servi par **Amazon Web Services** (`us.aws.cdn.hf.co`). Aucune donnée de l'utilisateur n'est envoyée : seuls l'adresse IP et l'agent HTTP sont vus par l'hébergeur, comme pour tout téléchargement.
- La mesure d'audience de react-native-executorch (un POST vers `ai.swmansion.com` à chaque téléchargement, active par défaut) est **désactivée** par l'app. Un test automatisé le vérifie (étape 3).
- Reste une requête HEAD de « compteur de téléchargements » vers `huggingface.co`, l'hébergeur lui-même. Elle ne porte aucune donnée de l'utilisateur.
- **Point à faire confirmer par le juriste** : selon la définition de Google, l'adresse IP vue par un hébergeur lors d'un téléchargement n'est pas une donnée « collectée » par l'app.
- **L'hébergement en propre** (Cloudflare R2 ou Supabase Storage) se décide avant la production (D-037). Ce paragraphe sera alors revu.

## Pratiques de sécurité

- Données en transit chiffrées : oui.
- Engagement à suivre la politique « Familles » de Google : non (l'app ne vise pas les enfants).
- Examen de sécurité indépendant : non.
