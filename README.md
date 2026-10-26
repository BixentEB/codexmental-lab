# Codex Mental · Laboratoire

Site statique de **lab.codexmental.com** : un labo de savant fou en pixel art, animé en canvas autour d'un écran central.

## Thèmes

Le bouton **Thème** (en haut à droite) permet de choisir le labo et le niveau d'animation. Le choix est mémorisé dans le navigateur.

- **Labo pixel** (`js/scene.js`) : le premier prototype, thème par défaut.
- **Alchimie** (`js/scene-alchimie.js` + `css/theme-alchimie.css`) : une installation de chimie qui tourne en boucle autour de l'interface.
- **Grand labo** (`js/scene-hd.js` + `css/theme-hd.css`) : laboratoire d'alchimie dessiné en vectoriel, plusieurs plans en parallaxe, interface en verre dépoli avec icônes vectorielles. Le bouton ⤓ range l'écran pour admirer le labo.
- Animations : Vivantes, Calmes (moins d'éclairs, pas d'incidents) ou Figées (image fixe). Par défaut, « Figées » si le système demande moins d'animations.
- Raccourcis d'adresse : `?theme=alchimie`, `?anim=calm`, `?halloween=1`.

Pour ajouter un thème : une scène dans `js/`, une entrée dans `THEMES` (script en tête de `index.html`), un CSS limité à `[data-theme="nom"]`, et une description dans `THEME_DESC` (`js/app.js`).

## Salle d'expérience

L'onglet **Expérience** (ou la petite porte cachée dans le décor des thèmes) ouvre une pièce entière en plein écran, sans texte : on clique sur les objets, on clique au sol pour déplacer le savant. Fichier : `js/salle.js`, chargé seulement à l'ouverture.

- Ciel de la fenêtre selon l'heure réelle (aube, jour, crépuscule, nuit), orage, pluie.
- Son coupé par défaut (bouton haut-parleur) ; la radio l'active.
- 7 secrets à trouver (étoiles en haut à droite), mémorisés dans le navigateur.

## Structure

- `index.html` : la page unique (navigation par `#/…`)
- `js/scene.js` : le décor animé (étagère, alambic, bobine Tesla, chimiste, easter egg Halloween)
- `js/app.js` : onglets, fiches projets, Atelier, barre de défilement en éprouvette
- `css/lab.css` : l'habillage
- `data/projects.json` : les projets (champ `cat` = étagère, `status` = `cours` ou `reflexion`)
- `data/atelier.json` + `content/atelier/` : les articles de l'Atelier
- `fonts/` : polices auto-hébergées (SIL OFL)

## Fiches enrichies

Une fiche de `data/projects.json` peut aussi contenir :
- `gallery` : captures (`src`, `mini`, `alt`, `caption`), agrandies au clic ;
- `tools` : liens vers les outils nécessaires ;
- `files` : codes à partager (`file`, et `install` pour un fichier `.user.css` ou `.user.js` qui s'installe en un clic) ;
- `guide` et `notes` : mode d'emploi pas à pas.

Les fichiers partagés vivent dans `files/`, les captures dans `img/lab/`.

## Ajouter un projet

Ajouter une entrée dans `data/projects.json` avec `cat` parmi `applications`, `logiciels`, `web`, `jeux`.

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
