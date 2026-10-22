# Design Tolitoli — index

Source de vérité du design, exportée du système de design publié sur claude.ai (Tolitoli Design System). Tout ce dossier est lu par Claude Code ; rien n'est modifié ici sans mettre à jour le système de design.

- `README.md` : brand book (principes, contenu, couleur, typographie, espacement, iconographie, états, implémentation Expo).
- `tokens.json` : les tokens (couleurs par thème, styles de texte, espacements, rayons, tailles). `src/ui/theme/tokens.ts` doit en être la transcription typée, vérifiée par un test.
- `logo/` : marque (`tolitoli-mark.svg`), version sombre, silhouette monochrome pour la notification Android ; règles d'usage dans `logo/README.md`.
- `ICONS.md` : set Lucide 0.544.0 (installé via `lucide-react-native`, pas copié ici) et correspondance icône → usage.
- `components/*.md` : guide de chaque composant React Native à créer dans `src/ui/components/` (états, props, accessibilité).
- `previews/*.html` : aperçus HTML des composants et couverture, pour référence visuelle (ils utilisent les variables CSS des tokens ; ouvrables tels quels dans un navigateur avec un `tokens.css` dérivé).
