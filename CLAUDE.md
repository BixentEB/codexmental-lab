# Consignes pour Claude (dépôt codexmental-lab)

- Site statique publié sur lab.codexmental.com depuis `main` ; pousser aussi sur `prototype-hd` (`git push origin main && git push origin main:prototype-hd`).
- Fiches projet : `data/projects.json` ; articles de l'Atelier : `content/atelier/<dossier>/<nom>.html` + une ligne dans `data/atelier.json` ; images : `img/projets/<id>/` et `img/articles/`.
- **À chaque nouveauté publiée, ajouter une entrée en haut de `data/news.json`, dans le même commit** :
  - `kind: "new"` pour un nouvel article, une nouvelle fiche ou un nouveau menu (pastille NEW) ;
  - `kind: "maj"` pour une mise à jour notable (petit rond de couleur) ;
  - `date` au format AAAA-MM-JJ (date du jour), `tab` = onglet concerné, `href` = lien vers la page.
- Ne rien inventer dans les fiches : laisser vide (« à renseigner ») ce que l'auteur n'a pas donné.
- Textes en français, ton de l'auteur ; vérifier le rendu (Playwright) dans la Vitrine sombre et claire, un labo et sur mobile avant de pousser.
- Mode d'emploi pour l'auteur : `GUIDE.md` (le tenir à jour si un nouveau champ ou fichier apparaît).
- Univers NEXUS (`css/theme-nexus.css`, `js/nexus.js`) : pour chaque nouvelle image, prévoir aussi une version rétro `nom-old.ext` à côté de `nom.ext` (NEXUS la prend automatiquement ; sinon il teinte l'originale). Le rappeler à l'auteur si elle manque.
