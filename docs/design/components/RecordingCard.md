Ligne de la Bibliothèque : carte `surface-raised` cerclée d'une `hairline`, `radius-md`, icône d'état à gauche (au début en RTL), titre en `heading`, métadonnées en `caption` `ink-muted`, chevron à la fin. Les cartes sont groupées sous un `overline` de date (« AUJOURD'HUI », « HIER », puis la date).

- Icône d'état : `file-text` transcrit, `clock` en cours, `mic` audio seul, `cloud` synchronisé, `alert-triangle` en `danger` quand la transcription a échoué.
- Un échec se voit à l'œil, pas seulement au lecteur d'écran : l'icône passe en `danger` et les métadonnées se terminent par un `QualityChip` `failed` (« Échec »). L'explication et le bouton « Réessayer » restent dans le Détail ; la carte ne porte pas d'action.
- Métadonnées dans cet ordre : heure · durée · langue et qualité (ou « Transcription… »). Un enregistrement finalisé après une coupure porte le badge « Récupéré » sur `accent-soft`.
- Titre par défaut « Enregistrement du <date> <heure> », renommable ; le titre tient sur deux lignes au plus, puis tronque.
- Appui : ouvre le Détail ; appui long : menu (renommer, exporter, supprimer). Le chevron se retourne en RTL.
- Le consommateur fournit `recording` (titre, date, durée, état, langue, qualité, `recovered`), `onPress`, `onLongPress`.
