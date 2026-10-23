Champ de saisie d'une ligne, utilisé pour renommer un enregistrement et, plus tard, pour les champs des Réglages. Libellé en `caption` `ink-muted` au-dessus, champ `surface-sunken` cerclé d'une `hairline` à `radius-sm`, hauteur `control-md`, texte en `body`. Sous le champ, une ligne d'aide en `caption` `ink-muted`, remplacée en cas d'erreur par le message en `danger` précédé de `alert-triangle` (16 px).

- Le libellé est toujours visible : pas de libellé flottant, pas de placeholder tenant lieu de libellé. Le placeholder montre un exemple (le titre par défaut).
- L'erreur apparaît à la validation, pas à la frappe, et le champ prend une bordure `danger`. Le message dit quoi faire, pas seulement ce qui ne va pas.
- La couleur n'est jamais le seul signal : l'icône et le texte portent l'erreur.
- Accessibilité : le libellé est lié au champ, l'erreur est annoncée (`accessibilityState={{ invalid: true }}` et le message en `accessibilityLiveRegion="polite"`).
- Le consommateur fournit `label`, `value`, `onChangeText`, `placeholder?`, `hint?`, `error?`, `autoFocus?`. Le champ ne valide rien lui-même.
