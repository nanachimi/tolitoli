Les deux grands boutons ronds de l'app : Enregistrer sur la Bibliothèque (`control-lg`, `accent` plein, icône `mic` 32 px en `on-accent`) et Arrêter au centre de l'écran Enregistrement (`control-xl`, cercle `surface-raised` cerclé d'`accent`, carré `accent` de 32 px à `radius-sm`).

- **Enregistrer n'est pas un bouton flottant.** Il est posé dans une barre fixe en bas de la Bibliothèque, sur `surface-raised`, séparée de la liste par une `hairline` et placée juste au-dessus de la barre d'onglets : bouton centré, `control-lg`, `space-4` au-dessus et au-dessous. La liste s'arrête à cette barre au lieu de passer dessous, donc aucune carte n'est jamais masquée et la dernière reste entièrement lisible.
- **Pas de libellé sous le bouton.** Le disque `accent` plein et l'icône `mic` suffisent : c'est le seul aplat d'accent de l'écran et il n'a pas de voisin avec lequel être confondu. Le mot vit dans l'`accessibilityLabel`, pas à l'écran.
- Arrêter n'apparaît que pendant un enregistrement ; Pause et Reprendre sont des `Button` secondaires de part et d'autre, jamais un autre bouton rond.
- Retour haptique au démarrage ; l'enregistrement doit partir en moins de 2 s.
- Le consommateur fournit `mode` (`record` | `stop`), `onPress`, et le libellé i18n. L'`accessibilityLabel` dit « Enregistrer » ou « Arrêter l'enregistrement », jamais le seul mot « micro ».
