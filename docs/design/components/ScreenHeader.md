En-tête des écrans qui ne sont pas des onglets : Détail, sous-écrans des Réglages (langue de transcription, stockage, à propos), Corbeille. Bouton retour (`chevron-left`, **inversé en RTL**), titre en `title` sur une ligne (tronqué si besoin), et à la fin une action facultative (`more-horizontal`, ou un bouton texte).

- Pas d'en-tête de navigation natif : chaque écran porte le sien, pour que le titre suive la typographie de Tolitoli. L'en-tête défile avec le contenu, sauf sur le Détail où il reste fixe.
- Sous l'en-tête, une ligne de métadonnées en `caption` `ink-muted` est possible (date · durée · langue · qualité) ; elle fait partie de l'écran, pas de l'en-tête.
- Le bouton retour fait toujours la même chose que le geste système ; il ne demande jamais confirmation, sauf si une saisie est en cours, auquel cas il ouvre un `Dialog`.
- Les boutons débordent de `space-2` vers l'extérieur pour que leur zone tactile de 48 px ne décale pas le titre.
- Accessibilité : le titre porte `accessibilityRole="header"` ; le retour s'appelle « Retour », l'action de fin décrit ce qu'elle ouvre (« Autres actions »).
- Le consommateur fournit `title`, `onBack`, `action?` (icône + libellé + onPress), `sticky?`.
