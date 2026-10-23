Page de l'onboarding, en trois écrans au premier lancement. Même squelette partout : le contenu occupe le haut, l'indicateur de pages et le bouton principal sont ancrés en bas, à `space-4` des bords. Pas de bouton « Passer » : les trois pages sont courtes et la deuxième est obligatoire.

1. **Promesse** : la marque dans un disque `accent-soft`, le nom en `display`, une phrase en `body`, une ligne rassurante en `caption` (« Tout reste sur votre appareil »). Bouton « Continuer ».
2. **Consentement** : titre en `title`, le fait juridique en `body`, la conduite à tenir en `caption`, puis une case à cocher sur `surface-raised` dont le libellé est un engagement à la première personne. Le bouton « Accepter et continuer » reste désactivé tant que la case n'est pas cochée. L'acceptation est mémorisée ; cet écran ne revient plus. **Texte à faire relire par un juriste avant publication.**
3. **Modèle de transcription** : titre, explication, `ProgressBar` déterminée, détail en `caption` (pourcentage, taille, « wifi uniquement »). Le bouton affiche « Téléchargement… » désactivé pendant l'opération, puis « Commencer ». Une ligne secondaire permet de télécharger plus tard.

Règles :

- Indicateur de pages : trois points `hairline`, celui de la page courante en `accent` et allongé. Décoratif, masqué aux lecteurs d'écran ; la progression est annoncée par le titre de page.
- Pas de retour en arrière après la page 2 : le consentement reste acquis.
- Le bouton principal est toujours au même endroit, pleine largeur, pour que l'on puisse enchaîner sans déplacer le pouce.
- En arabe, tout se reflète, y compris l'ordre des points.
- Accessibilité : chaque page est annoncée par son titre (`accessibilityRole="header"`), la case à cocher porte son rôle et son état, et le bouton désactivé explique pourquoi (`accessibilityHint`).
- Le consommateur fournit `page` (1–3), `onNext`, et pour la page 2 `accepted` / `onToggleAccept`.
