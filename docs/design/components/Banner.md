Bannière d'état sous le chrono : icône Lucide, un titre en `body-strong`, une ligne en `caption`, et au plus un bouton. Fond `accent-soft` pour les états liés à l'enregistrement (interruption, reprise possible), `surface-raised` + `hairline` avec icône `danger` pour une alerte (micro coupé, espace disque).

- **La bannière ne porte jamais le bouton « Reprendre ».** Pendant un appel elle explique l'interruption, à la fin de l'appel elle dit que la reprise est possible : dans les deux cas, c'est le bouton rond qui reprend, parce que deux chemins pour la même action en font un de trop. Le bouton de la notification suit la règle D-023 et reste, lui, le seul moyen d'agir sans ouvrir l'app.
- Un seul paragraphe d'explication, en phrase complète, au vouvoiement.
- La bannière ne se ferme pas d'elle-même ; elle disparaît quand l'état change.
- Le consommateur fournit `kind` (`interrupted` | `resumable` | `alert`), `title`, `body`, `action` optionnelle. `accessibilityLiveRegion="assertive"` à l'apparition.
