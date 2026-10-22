Chronomètre de l'écran Enregistrement : style `timer` (Rubik 48 px, chiffres tabulaires) précédé d'un point `accent` de 12 px qui pulse en 1,2 s. En pause, le point cesse de pulser et le chrono passe en `ink-muted`.

- Format `HH:MM:SS` dès la première seconde, pour que la largeur ne change jamais.
- Le point respecte « réduire les animations » du système : il reste fixe.
- Le chrono est annoncé par le lecteur d'écran toutes les minutes, pas à chaque seconde (`accessibilityLiveRegion="polite"` sur un texte caché mis à jour à la minute).
- Le consommateur fournit `elapsedMs` et `state` (`recording` | `paused` | `interrupted`).
