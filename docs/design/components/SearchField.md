Champ de recherche de la Bibliothèque : fond `surface-sunken`, `hairline`, `radius-sm`, hauteur `control-md`, icône `search` de 20 px en `ink-muted` au début, texte en `body`, placeholder en `ink-faint`. Dès qu'il y a du texte, un bouton `x` apparaît à la fin pour effacer.

- La recherche porte sur le titre **et** le texte des transcriptions ; le placeholder le dit (« Rechercher dans les enregistrements »).
- Elle se déclenche à la frappe, avec un délai de 250 ms, sans bouton Rechercher. Pas de filtre, pas de tri en 1.0.
- Sans résultat, la liste est remplacée par un `EmptyState` discret : « Aucun résultat » en `body-strong`, une ligne d'explication en `caption`. Le champ reste rempli.
- Le champ se place sous le titre de la Bibliothèque, à `space-4` des bords ; il défile avec la liste plutôt que de rester collé en haut.
- Icône et bouton d'effacement ne sont jamais seuls : l'icône est décorative (masquée), le bouton porte `accessibilityLabel` « Effacer la recherche ». Le champ a `accessibilityLabel` = le placeholder, et `accessibilityRole="search"`.
- Le consommateur fournit `value`, `onChangeText`, `onClear`, `placeholder` (i18n). Le champ ne gère pas la recherche lui-même.
