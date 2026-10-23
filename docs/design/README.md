Tolitoli enregistre des conversations et les transcrit, en local d'abord, dans dix langues africaines et sept langues d'interface. Son interface doit être **chaleureuse et sobre** : rassurante quand on appuie sur Enregistrer devant quelqu'un, lisible au soleil et en grande police, identique dans les deux sens d'écriture. Un seul accent, la terre cuite ; tout le reste est crème, anthracite et encre.

## Principes

1. **Une action par écran.** La Bibliothèque mène à Enregistrer ; l'écran Enregistrement mène à Arrêter. Le bouton principal est le seul élément en `accent` plein de l'écran.
2. **Dire ce qui se passe.** Un enregistrement en cours, en pause, interrompu par un appel, en cours de transcription, récupéré après une coupure : chaque état a un mot, une couleur et une icône, jamais l'un sans les deux autres.
3. **Rien de caché.** Pas de mode discret, pas d'indicateur d'enregistrement atténué : le point `accent` et le chrono restent visibles tant que le micro est ouvert.
4. **Les formes sont rondes, pas molles.** `radius-md` sur les boutons et les cartes, `radius-pill` sur ce qui se touche du pouce ; les bordures sont des `hairline`, jamais des ombres.
5. **La typographie fait le travail du décor.** Pas d'illustrations dans l'interface ; les titres en Rubik et l'espace suffisent.

## Contenu

- **Tutoiement ou vouvoiement :** vouvoiement en français (« Vous pourrez reprendre à la fin de l'appel »), registre neutre et direct dans les autres langues. Jamais d'exclamation, jamais d'emoji.
- **Verbes à l'infinitif sur les boutons** (« Enregistrer », « Arrêter », « Reprendre l'enregistrement »), phrases complètes dans les bannières, étiquettes nominales dans les réglages.
- **Les durées** s'écrivent `42 min`, `1 h 12`, et le chrono `00:42:17` ; les dates suivent la locale (`Intl.DateTimeFormat`, polyfill compris).
- **Les langues** s'affichent dans leur propre nom (Français, English, Deutsch, Русский, العربية, Wolof, 简体中文) et jamais sans leur **indicateur de qualité** quand il s'agit de transcription : « bonne », « moyenne », « brouillon ».
- **Le nom** s'écrit Tolitoli, jamais en capitales, jamais traduit.

## Couleur

- Fond `surface`, cartes `surface-raised`, champs `surface-sunken`. Les trois se touchent sans ombre ; une `hairline` de 1 px les sépare quand le contraste de fond ne suffit pas.
- Texte `ink` ; métadonnées `ink-muted` ; placeholders et désactivé `ink-faint` seulement.
- `accent` est réservé : bouton principal, bouton Enregistrer, point et bannière d'enregistrement, onglet actif, lien. Un écran n'en porte qu'un aplat. Sur `accent`, le texte est `on-accent`, jamais blanc en dur : en thème sombre l'accent s'éclaircit et le texte devient brun.
- `accent-soft` pour les fonds d'état « en cours » (chip, bannière, segment actif) ; `ochre` reste décoratif (couverture, état vide, fond du chip « moyenne ») et n'est jamais une couleur de texte sur fond clair.
- États : `success` (terminé, synchronisé, qualité bonne), `warning` (quota, espace, qualité brouillon), `danger` (supprimer, erreur, micro coupé). Ils apparaissent toujours avec un mot ou une icône ; `success` est sarcelle pour ne pas dépendre de l'axe rouge-vert face à `danger`.
- Focus clavier et lecteur d'écran : anneau `focus` de 2 px plein, à 2 px à l'extérieur du contrôle, sur toutes les surfaces.
- Le thème suit le réglage système ; aucune bascule dans l'app en 1.0. Chaque écran est vérifié dans les deux thèmes avant d'être livré.

## Typographie

- **Titres en Rubik** (`display`, `title`, `heading`, `timer`), chargée depuis Google Fonts dans l'app via `@expo-google-fonts/rubik` (poids 500 et 600). Rubik couvre le latin étendu (wolof compris), le cyrillique et l'arabe ; pour le chinois simplifié, le système retombe sur la police système, ce qui est voulu.
- **Texte en police système** (`body`, `body-strong`, `caption`, `overline`) : Roboto sur Android, SF sur iOS. C'est elle qui garantit les sept écritures et le respect de la taille de police choisie par l'utilisateur.
- **Horodatages en mono** (`timestamp`) : chiffres alignés dans la transcription.
- Le texte courant suit la police dynamique sans plafond ; les libellés de barre d'onglets plafonnent à 1,5×. Aucun texte n'a de largeur fixe : les libellés allemands sont 30 % plus longs et les arabes se lisent de droite à gauche.
- Chiffres tabulaires sur le chrono et les durées (`font-variant-numeric: tabular-nums`).

## Espacement et formes

- Gouttière `space-4` sur téléphone, `space-8` sur tablette ; `space-6` entre sections ; `space-4` dans une carte ; `space-3` pour une ligne de liste ; `space-1` entre une icône et son mot.
- Toute zone tactile fait au moins `control-md` (48 px) ; le bouton Enregistrer fait `control-lg`, le bouton Arrêter `control-xl`.
- `radius-sm` pour les chips et champs, `radius-md` pour boutons, cartes et bannières, `radius-lg` pour les feuilles, `radius-pill` pour Enregistrer, Arrêter, la jauge et les boutons de notification.
- Marges exprimées en `start`/`end`, jamais `left`/`right` : la mise en page se reflète en arabe. Les chevrons se retournent en RTL ; les autres icônes non.

## Iconographie

Lucide, trait `stroke-icon` (1,75 px), extrémités rondes, taille `icon-md`. Les icônes accompagnent un mot : seules sur un bouton d'icône, elles portent un `accessibilityLabel` ; à côté d'un libellé (onglets, boutons), elles sont masquées aux lecteurs d'écran. Le groupe **Icons** liste les correspondances d'usage ; le groupe **Logo** porte la marque et sa version monochrome pour la barre d'état Android.

## États et mouvement

- Enregistrement en cours : point `accent` qui pulse lentement (1,2 s, opacité 1 → 0,4), chrono `timer`, jauge de niveau `LevelMeter`. Rien d'autre ne bouge.
- Interruption (appel) : `Banner` sur `accent-soft` avec `phone-off`, sans bouton — ni pendant l'appel, ni après. La reprise se fait par le bouton rond, qui redevient actif à la fin de l'appel ; la bannière dit seulement ce qui se passe.
- Transcription en cours : chip « Transcription… » avec `clock`, texte qui apparaît par segments, sans animation.
- Transitions d'écran : celles du système. Réduction des animations activée dans le système → le point ne pulse plus.

## Pour l'implémentation (Expo)

- `tokens.json` est la source ; `src/ui/theme/tokens.ts` en est la transcription typée (couleurs par thème, espacements en nombres, rayons, tailles). Un test vérifie que les deux restent alignés.
- Rubik : `@expo-google-fonts/rubik` (`Rubik_500Medium`, `Rubik_600SemiBold`), chargée avant de lever l'écran de démarrage. Icônes : `lucide-react-native@0.544.0`.
- Icône d'app et de notification : `assets/Logo/tolitoli-mark.svg` exporté en 1024 px pour `icon`, premier plan de l'icône adaptative sur fond `accent`, `tolitoli-mark-mono.svg` pour `notification.icon` Android.
- Chaque composant ci-dessous a un équivalent React Native du même nom dans `src/ui/components/` ; ses états et ses libellés d'accessibilité sont ceux du guide du composant.
