Jauge de niveau sous le chrono : piste `surface-sunken` cerclée d'une `hairline`, remplissage `accent`, 12 px de haut, `radius-pill`. Elle rassure : si elle bouge, le micro capte.

- Valeur 0 → 1 calculée en dBFS côté service (`level.ts`), lissée à 60 ms ; en dessous de 0,05 le remplissage passe en `ink-faint` pour dire « silence » sans alarmer.
- Si le micro est coupé par le système (silence numérique > 500 ms), ce n'est pas la jauge qui alerte mais la `Banner` « Le micro semble coupé ».
- Pas de graduations, pas de crête : ce n'est pas un outil de mixage.
- Le consommateur fournit `level` (0–1). Rôle `meter` pour les lecteurs d'écran, sans annonce continue.
