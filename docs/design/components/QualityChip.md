Chip qui dit la langue de transcription et la qualité attendue, en `caption`, `radius-sm`. Jamais une langue sans sa qualité : c'est la règle produit (« Ne jamais annoncer une langue comme reconnue sans l'indicateur de qualité »).

- `good` : icône `check`, texte `success`. `medium` : `clock`, fond `accent-soft`, texte `ink`. `draft` : `alert-triangle`, texte `warning`. `busy` : `clock`, texte `ink-muted`, libellé « Transcription… ».
- La couleur n'est jamais seule : le mot « bonne », « moyenne », « brouillon » est toujours présent, traduit.
- Sur une carte de la Bibliothèque, le chip est à droite du titre (à la fin en RTL) ; sur l'écran Détail, sous le titre.
- Le consommateur fournit `language` (nom natif), `quality` (`good` | `medium` | `draft` | `busy`).
