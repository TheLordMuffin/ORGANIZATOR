# Organizator

Une liste de tâches minimaliste : une ligne, un texte, rien d'autre à l'œil
nu. Le reste (statut, échéance, assignation) se découvre au clic ou au
glissement. Fichier unique `index.html`, aucune dépendance, aucun serveur —
tout est stocké dans `localStorage` du navigateur.

## Utilisation

Ouvrir `index.html` dans un navigateur. Aucune étape de build.

- **+** ajoute une tâche vide et ouvre directement son menu pour la nommer.
  Une tâche sans nom ne reste jamais dans la liste.
- **Clic** sur une ligne : ouvre son menu (renommer, marquer **bloqué**,
  poser une échéance). Une tâche bloquée a un trait rouge sous la ligne ;
  une échéance dépassée s'affiche en rouge à droite.
- **Glissement horizontal** : ouvre le panneau d'assignation — raccourcis
  vers les contacts créés dans les réglages, ou un nom libre.
- **Glissement vertical** : déplace la tâche à sa nouvelle position dans
  la liste.
- **⚙** ouvre les réglages, où on crée des contacts (nom obligatoire,
  email et téléphone facultatifs) qui deviennent des raccourcis
  d'assignation.
- **Échap** ferme le panneau ouvert.
