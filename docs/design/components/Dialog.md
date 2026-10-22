Boîte de confirmation, pour les seules actions qu'on ne peut pas annuler d'un geste : mettre à la corbeille, vider la corbeille, abandonner une saisie, supprimer le compte. Carte `surface-raised` à `radius-lg` sur un voile sombre, titre en `heading`, explication en `caption` `ink-muted`, deux boutons alignés à la fin.

- **Deux boutons au maximum**, le moins risqué en premier (à gauche en LTR, à droite en RTL) : Annuler en `ghost`, l'action en `primary`, ou en `danger` plein si elle détruit. Jamais trois boutons, jamais un seul.
- Le libellé du bouton d'action **répète l'action**, il ne dit pas « OK » : « Mettre à la corbeille », « Abandonner ».
- Le titre est une question, l'explication dit la conséquence réelle, chiffrée quand c'est possible (« 30 jours dans la corbeille »). Pas de « Êtes-vous sûr ? » seul.
- Ce qui est réversible n'ouvre pas de dialogue : la suppression passe par la corbeille, donc le dialogue sert surtout à prévenir, pas à protéger. Les actions annulables se font directement, avec un retour discret.
- Le voile ferme le dialogue (équivalent d'Annuler) ; le bouton retour système aussi. Une action destructrice n'est jamais l'action par défaut d'un clavier.
- Accessibilité : rôle `alertdialog`, focus posé sur le titre à l'ouverture, retour au déclencheur à la fermeture, fond rendu inerte.
- Le consommateur fournit `title`, `body`, `confirmLabel`, `onConfirm`, `onCancel`, `destructive?`.
