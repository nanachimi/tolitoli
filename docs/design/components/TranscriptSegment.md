Un segment de transcription dans l'écran Détail : horodatage en `timestamp` (mono, `ink-muted`), nom du locuteur en `caption` quand la séparation des locuteurs existe, texte en `body`. Le segment en cours de lecture est surligné en `accent-soft` à `radius-sm` et reste visible à l'écran (défilement automatique) ; les segments à venir sont en `ink-muted`.

- Appui sur un segment : le lecteur saute à son horodatage. Appui long : copier.
- Le texte mélangé (swahili-anglais, wolof-français) s'affiche tel quel, sans marquage de langue, dans la police système.
- Pas de ponctuation ajoutée par l'interface ; ce que le moteur rend est ce qu'on lit. Les locuteurs sont « Locuteur 1 », « Locuteur 2 » jusqu'à renommage.
- Le consommateur fournit `segment` (startMs, text, speaker?), `state` (`past` | `active` | `upcoming`), `onPress`.
