Barre de progression pour les attentes longues : téléchargement du modèle Whisper, transcription en cours, envoi vers le cloud. Piste `surface-sunken` cerclée d'une `hairline`, 8 px, `radius-pill` ; remplissage `accent`. Au-dessus, un libellé en `body` et, à la fin de la ligne, le pourcentage en `caption` ; en dessous, une ligne de détail facultative en `caption` `ink-muted`.

- **Déterminée** quand la durée est connue (téléchargement) : le pourcentage est affiché et la barre avance.
- **Indéterminée** quand elle ne l'est pas (transcription locale) : un segment de 40 % glisse en 1,4 s, sans pourcentage, et la ligne de détail prévient (« Cela peut prendre quelques minutes »). Avec « réduire les animations », la barre devient pleine et atténuée, sans mouvement.
- Terminé : barre pleine, et « Terminé » en `success` précédé de `check`. L'état d'échec n'utilise pas cette barre mais une `Banner` d'alerte.
- Plus fine que `LevelMeter` (8 px contre 12) : ce sont deux objets différents, le niveau sonore n'est pas une progression.
- Accessibilité : rôle `progressbar` avec sa valeur quand elle est connue, `accessibilityLabel` sinon ; la fin est annoncée une fois, pas chaque pourcentage.
- Le consommateur fournit `label`, `value?` (0–1 ; absent = indéterminée), `detail?`, `state` (`running` | `done`).
