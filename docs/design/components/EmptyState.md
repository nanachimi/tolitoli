État vide d'une liste ou d'un écran : icône `icon-lg` centrée, un titre, une ligne d'explication, et au plus une action. Deux intensités.

- **Accueillant** (bibliothèque vide, pas de transcription) : l'icône est posée dans un disque `accent-soft` de 64 px, en `accent` ; titre en `heading`, explication en `caption` `ink-muted`, bouton principal facultatif.
- **Discret** (aucun résultat de recherche, corbeille vide) : pas de disque, icône en `ink-faint`, titre en `body-strong`. Il ne doit pas peser plus que la liste qu'il remplace.

Règles :

- Le texte dit quoi faire, pas ce qui manque : « Appuyez sur Enregistrer pour commencer », pas « Liste vide ». La deuxième phrase peut rassurer (« Tout reste sur votre appareil »).
- Une action au maximum, et seulement si elle résout l'état. Pas d'action sur « Aucun résultat » : effacer la recherche suffit.
- Pas d'illustration : l'icône et le texte suffisent (brand book, « la typographie fait le travail du décor »).
- L'ensemble est un seul nœud pour les lecteurs d'écran (titre puis explication), l'icône masquée ; le bouton reste séparé.
- Le consommateur fournit `icon`, `title`, `body`, `action?`, `tone` (`welcoming` | `quiet`).
