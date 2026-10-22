Bouton de Tolitoli en quatre variantes : principal (`accent` / `on-accent`), secondaire (`surface-raised` + `hairline`), discret (texte `accent` sans fond) et danger (texte `danger`). Hauteur `control-md`, rayon `radius-md`, libellé en `body-strong`, icône Lucide optionnelle à `space-1` du texte.

- Un seul bouton principal par écran : c'est l'action que l'écran existe pour faire.
- Le libellé est un verbe à l'infinitif, traduit par i18n ; jamais une icône seule sans `accessibilityLabel`.
- Désactivé : `ink-faint` sur `surface-sunken`, jamais une opacité réduite sur le bouton principal.
- Le consommateur fournit `label`, `onPress`, `variant`, `icon` optionnel, `disabled`. Le composant gère la zone tactile de 48 px et l'anneau `focus`.
