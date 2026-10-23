# Étape 3 — Transcription locale (plan à compléter)

Le plan détaillé de l'étape 3 est proposé à son ouverture et validé par le propriétaire avant tout code. Ce fichier recueille dès maintenant ce que l'étape 2 lui laisse.

## Critères de fin hérités de l'étape 2

- **Mesure de la lecture avec des segments** (D-036, « lecture c ») :
  - à reprendre en release sur l'A05, avec le profil `preview-trace`, sur une transcription réelle d'au moins une heure ;
  - relevés : intervalle entre deux mises à jour de la position, écart entre l'horloge et la position affichée, délai de la pause, arrêt au retour arrière ;
  - référence sans segment (build `57e6fed0`) : 102 ms, environ −50 ms et constant, 100 ms, moins de 0,25 s ;
  - si la mesure se dégrade, le correctif décrit dans D-036 est appliqué : liste mémoïsée, segment actif à 250 ms au plus, barre par valeur animée.
