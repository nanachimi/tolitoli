Répartition de l'espace, en tête de l'écran Réglages → Stockage : une barre segmentée de 12 px à `radius-pill` sur `surface-sunken`, et sous elle une légende en `caption` `ink-muted`. Trois parts : enregistrements en `accent`, corbeille en `ochre`, espace libre en `surface-sunken`.

- Les tailles s'écrivent avec l'unité la plus lisible (`1,8 Go`, `240 Mo`), selon la locale.
- Sous la barre, deux actions en `Button` secondaires : « Vider la corbeille » (ouvre un `Dialog`) et « Libérer l'audio synchronisé », cette dernière seulement quand le cloud est actif et que des fichiers sont vérifiés.
- Quand l'espace libre passe sous 500 Mo, une `Banner` d'alerte s'ajoute au-dessus ; sous 50 Mo, elle dit que l'enregistrement ne démarrera pas.
- Les parts les plus petites restent visibles : un segment non nul fait au moins 2 % de la largeur.
- La couleur ne porte pas l'information seule : la légende nomme chaque part. La barre est une seule image pour les lecteurs d'écran, avec un libellé qui énumère les trois valeurs.
- Le consommateur fournit `recordingsBytes`, `trashBytes`, `freeBytes` et les actions.
