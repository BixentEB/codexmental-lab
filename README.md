# Codex Mental · Laboratoire

Site statique de **lab.codexmental.com** : un labo de savant fou en pixel art, animé en canvas autour d'un écran central.

## Structure

- `index.html` : la page unique (navigation par `#/…`)
- `js/scene.js` : le décor animé (étagère, alambic, bobine Tesla, chimiste, easter egg Halloween)
- `js/app.js` : onglets, fiches projets, Atelier, barre de défilement en éprouvette
- `css/lab.css` : l'habillage
- `data/projects.json` : les projets (champ `cat` = étagère, `status` = `cours` ou `reflexion`)
- `data/atelier.json` + `content/atelier/` : les articles de l'Atelier
- `fonts/` : polices auto-hébergées (SIL OFL)

## Ajouter un projet

Ajouter une entrée dans `data/projects.json` avec `cat` parmi `applications`, `logiciels`, `web`, `jeux`.

## Ajouter un article à l'Atelier

Déposer le fichier HTML dans `content/atelier/<dossier>/<nom>.html`, puis l'ajouter dans `data/atelier.json`.

## Secrets du labo

- Cliquer sur la bobine Tesla déclenche une décharge ; trois clics rapprochés lancent l'expérience n°31.
- Taper `igor` au clavier fonctionne aussi.
- Du 20 octobre au 2 novembre, le labo passe en mode Halloween (forçable avec `?halloween=1` ou `?halloween=0`).

## Tester en local

```
python3 -m http.server
```
puis ouvrir http://localhost:8000 (les données sont chargées par `fetch`, l'ouverture directe du fichier ne marche pas).
