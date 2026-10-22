Barre d'onglets à deux entrées sur `surface-raised`, séparée de l'écran par une `hairline` : icône Lucide `icon-md` et libellé `caption`. Onglet actif en `accent`, inactif en `ink-muted` ; pas d'autre indicateur.

- Les libellés suivent la police système jusqu'à 1,5× (D-014) et la barre grandit avec eux ; le texte de l'écran, lui, n'a pas de plafond.
- L'icône est masquée aux lecteurs d'écran ; l'onglet est annoncé par son libellé et son état « sélectionné » (D-019).
- L'ordre des onglets se reflète en RTL (Bibliothèque à droite en arabe).
- Sur tablette en paysage (1.1), la barre devient un rail au début de l'écran ; en 1.0 elle reste en bas.
- Fourni par expo-router ; le consommateur ne fait que passer les libellés i18n et les icônes.
