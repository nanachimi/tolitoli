Les deux grands boutons ronds de l'app : Enregistrer sur la Bibliothèque (`control-lg`, `accent` plein, icône `mic` 32 px en `on-accent`) et Arrêter au centre de l'écran Enregistrement (`control-xl`, cercle `surface-raised` cerclé d'`accent`, carré `accent` de 32 px à `radius-sm`).

- Enregistrer flotte en bas de la Bibliothèque, centré, à `space-6` du bord, au-dessus de la barre d'onglets ; son libellé est sous lui en `caption`.
- Arrêter n'apparaît que pendant un enregistrement ; Pause et Reprendre sont des `Button` secondaires de part et d'autre, jamais un autre bouton rond.
- Retour haptique au démarrage ; l'enregistrement doit partir en moins de 2 s.
- Le consommateur fournit `mode` (`record` | `stop`), `onPress`, et le libellé i18n. L'`accessibilityLabel` dit « Enregistrer » ou « Arrêter l'enregistrement », jamais le seul mot « micro ».
