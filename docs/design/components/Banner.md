Bannière d'état sous le chrono : icône Lucide, un titre en `body-strong`, une ligne en `caption`, et au plus un bouton. Fond `accent-soft` pour les états liés à l'enregistrement (interruption, reprise possible), `surface-raised` + `hairline` avec icône `danger` pour une alerte (micro coupé, espace disque).

- Pendant un appel, la bannière n'a **pas** de bouton : « Reprendre » n'apparaît qu'à la fin de l'appel (règle D-023). Le bouton de la notification suit la même règle.
- Un seul paragraphe d'explication, en phrase complète, au vouvoiement.
- La bannière ne se ferme pas d'elle-même ; elle disparaît quand l'état change.
- Le consommateur fournit `kind` (`interrupted` | `resumable` | `alert`), `title`, `body`, `action` optionnelle. `accessibilityLiveRegion="assertive"` à l'apparition.
