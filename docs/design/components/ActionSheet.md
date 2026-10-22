Feuille d'actions qui monte du bas de l'écran : `surface-raised`, coins supérieurs à `radius-lg`, poignée `hairline` de 36 × 4 px, un en-tête facultatif en `caption` `ink-muted` qui rappelle sur quoi on agit, puis une liste d'actions de hauteur `control-md` avec leur icône Lucide au début.

Deux usages :

- **Actions** (bouton `more-horizontal` du Détail, appui long sur une carte) : Renommer, Exporter, Déplacer, puis, après une `hairline` de séparation, l'action destructrice en `danger`. L'ordre va du plus courant au plus risqué.
- **Choix** (vitesse de lecture, tri) : rôle `menuitemradio`, coche `accent` à la fin de la ligne choisie, pas d'icône au début.

Règles :

- Pas de bouton Annuler : le voile et le geste vers le bas ferment la feuille, comme partout sur Android et iOS.
- Six actions au plus. Au-delà, c'est un écran, pas une feuille.
- Une action destructrice ouvre ensuite un `Dialog` ; elle n'agit jamais directement depuis la feuille.
- Les actions indisponibles ne sont pas grisées, elles sont absentes ; si leur absence surprend, une ligne d'explication en `caption` le dit (« L'export arrive avec la transcription »).
- Accessibilité : rôle `menu`, chaque ligne `menuitem` ou `menuitemradio` avec son état ; le focus entre dans la feuille à l'ouverture et revient au déclencheur à la fermeture ; le reste de l'écran devient inerte.
- Le consommateur fournit `title?`, `items` (libellé, icône?, destructive?, checked?, onPress), `onClose`.
