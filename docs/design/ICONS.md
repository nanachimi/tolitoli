Icônes [Lucide](https://lucide.dev) (licence ISC), version 0.544.0, trait fin et arrondi. Dans l'app : `lucide-react-native`, même version, `strokeWidth={1.75}` (`stroke-icon`), taille `icon-md` (24) par défaut. Les fichiers ici sont des copies de référence : l'encre est `currentColor` dans le SVG, donc une `<img>` les affiche en noir ; recolorer en `ink`, `ink-muted` ou `accent` selon le contexte.

Correspondance d'usage :

- `mic` : action Enregistrer et icône de notification tant que la marque n'est pas installée.
- `square` (plein, en `on-accent`) : Arrêter ; `pause`, `play` : pause et reprise, dans l'app et dans la notification.
- `circle` (plein, `accent`, 8 px) : point « en cours d'enregistrement », à côté du chrono.
- `list` : onglet Bibliothèque ; `settings` : onglet Réglages. Les onglets portent leur libellé : l'icône est masquée aux lecteurs d'écran.
- `search`, `folder`, `share-2`, `file-text`, `download` : recherche, dossiers, feuille de partage, export texte, export audio.
- `languages` : langue de transcription ; `cloud`, `cloud-off` : transcription cloud activée / désactivée ; `wifi-off` : hors ligne.
- `phone-off` : bannière « Enregistrement interrompu » pendant un appel ; `volume-2`, `headphones` : sortie audio.
- `check`, `alert-triangle`, `clock` : états terminé, attention, en attente, toujours avec un mot.
- `trash-2` : suppression (en `danger`) ; `chevron-left`, `chevron-right` : navigation, **inversés en RTL** ; `more-horizontal`, `plus`, `x` : menu, ajouter, fermer.
