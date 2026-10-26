# Codex Mental · Laboratoire

Site statique de **lab.codexmental.com** : un labo de savant fou en pixel art, animé en canvas autour d'un écran central.

## Univers et salles

Le site s'ouvre sur la **Vitrine**, sobre et lisible, en sombre ou en clair (réglage automatique selon l'appareil, ou au choix dans le menu **Univers**). De là, on peut entrer dans les labos :

| Univers | Salles (on passe de l'une à l'autre par la porte en bas à gauche) |
|---|---|
| Vitrine (`css/theme-pro.css`) | aucune, pas de décor |
| Labo pixel | Le labo (`js/scene.js`) → La paillasse (`js/scene-alchimie.js` + `css/theme-alchimie.css`) |
| Labo vectoriel | Le grand labo (`js/scene-hd.js` + `css/theme-hd.css`) → L'observatoire (`js/scene-observatoire.js`) |
| Univers orbital | La station (`js/scene-station.js`) → L'avant-poste (`js/scene-avantposte.js`), interface `css/theme-orbital.css` |

Les nouvelles salles vectorielles et orbitales partagent `js/vec-kit.js` (toile haute définition, halos, savant dessiné, boucle d'animation).

- Le menu **Univers** change d'univers ; la porte change de salle dans l'univers en cours.
- Dans les labos, le menu règle les animations : Vivantes, Calmes ou Figées.
- Les choix sont mémorisés dans le navigateur. Raccourcis d'adresse : `?theme=pro|pixel|alchimie|hd`, `?scheme=dark|light`, `?anim=calm`, `?halloween=1`.

Ajouter une salle : une scène dans `js/` (avec `kit: true` si elle utilise `VK.room`), une entrée dans `THEMES` et dans la liste `rooms` de son univers (script en tête de `index.html`), et un CSS limité à `[data-lab="nom"]`.

**Pour mettre à jour les fiches, les captures et les téléchargements, voir [GUIDE.md](GUIDE.md).**

## Fiches enrichies

Une fiche de `data/projects.json` peut aussi contenir :
- `gallery` : captures (`src`, `mini`, `alt`, `caption`), agrandies au clic ;
- `tools` : liens vers les outils nécessaires ;
- `files` : codes à partager (`file`, et `install` pour un fichier `.user.css` ou `.user.js` qui s'installe en un clic) ;
- `guide` et `notes` : mode d'emploi pas à pas.

Les fichiers partagés vivent dans `files/`, les captures dans `img/lab/`.

## Ajouter un projet

Ajouter une entrée dans `data/projects.json` avec `cat` parmi `applications`, `logiciels`, `web`, `jeux`, `ia`.

## Ajouter un article à l'Atelier

Déposer le fichier HTML dans `content/atelier/<dossier>/<nom>.html`, puis l'ajouter dans `data/atelier.json`.

## Secrets du labo

Dans le thème Alchimie, le circuit conserve réellement le liquide : bouilleur → condenseur → récepteur → pompe → ballon de réaction (le réactif change sa couleur) → rampe → éprouvettes → serpentin → colonne → réservoir → retour au bouilleur. Le savant recharge le réactif quand il est vide, et de temps en temps une panne de courant ou une réaction incontrôlée vient pimenter la journée. Changer d'onglet verse une dose de réactif à la couleur de la catégorie.

- Cliquer sur la bobine Tesla déclenche une décharge ; trois clics rapprochés lancent l'expérience n°31.
- Taper `igor` au clavier fonctionne aussi.
- Du 20 octobre au 2 novembre, le labo passe en mode Halloween (forçable avec `?halloween=1` ou `?halloween=0`).

## Tester en local

```
python3 -m http.server
```
puis ouvrir http://localhost:8000 (les données sont chargées par `fetch`, l'ouverture directe du fichier ne marche pas).
