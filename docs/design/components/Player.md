Lecteur audio de l'écran Détail : carte `surface-raised` cerclée d'une `hairline`, `radius-md`, posée **en bas de l'écran**, au-dessus de la barre d'onglets, pendant que la transcription défile au-dessus. Il ne disparaît jamais au défilement.

Contenu, de haut en bas : la barre de progression (piste `surface-sunken` de 4 px, remplissage `accent`, poignée de 16 px cerclée de `surface-raised`), les deux temps en `caption` `ink-muted` à chiffres tabulaires (écoulé au début, total à la fin), puis la rangée de contrôles : reculer de 15 s, lire/pause (`control-md`, rond `accent`, icône `on-accent`), avancer de 15 s, et à la fin le sélecteur de vitesse (`radius-pill`, `surface-sunken`).

- **En RTL, tout se reflète**, barre comprise : le remplissage part de la droite, « reculer » est à droite, et les icônes de saut sont inversées. C'est la convention des lecteurs média arabes.
- En pause, le remplissage et la poignée passent en `ink-muted` ; la barre reste déplaçable.
- Vitesses : 0,5× · 0,75× · 1× · 1,25× · 1,5× · 2×. Un appui ouvre un `ActionSheet` ; la vitesse choisie est mémorisée entre les lectures. Les chiffres suivent la locale (« 1,5× » en français).
- Déplacer la poignée surligne le segment correspondant dans la transcription, et inversement : appuyer sur un segment déplace la lecture.
- Zones tactiles d'au moins 48 px, y compris la poignée, dont le dessin fait 16 px.
- Accessibilité : la barre est un `adjustable` (incréments de 15 s au balayage haut/bas de TalkBack), avec un `accessibilityValue` en texte (« 12 minutes 14 sur 32 minutes 8 »), pas en pourcentage. Chaque bouton porte son libellé ; lire/pause change de libellé avec l'état.
- Le consommateur fournit `positionMs`, `durationMs`, `playing`, `rate`, `onSeek`, `onTogglePlay`, `onSkip(±15)`, `onRateChange`.
