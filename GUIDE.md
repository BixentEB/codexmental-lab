# Mettre à jour le labo soi-même

Tout se fait depuis le site de GitHub, sans rien installer. Après chaque enregistrement, le site en ligne se met à jour tout seul en une ou deux minutes (rechargez la page avec Ctrl + F5).

## Ajouter des captures d'écran à un projet

Chaque projet a son dossier : `img/projets/<identifiant>/`.

| Projet | Dossier |
|---|---|
| NOX (Outils IA) | `img/projets/nox/` |
| NoxDL | `img/projets/noxdl/` |
| Périm-GO Home | `img/projets/perimgo-home/` |
| Périm-GO Business | `img/projets/perimgo-business/` |
| DexLibera | `img/projets/dexlibera/` |
| Codex Mental | `img/projets/codex-mental/` |
| Habiller le Web (thème ChatGPT) | `img/projets/css-chatgpt/` |
| Heures Sacrées | `img/projets/heures-sacrees/` |
| NoxLayer | `img/projets/noxlayer/` |
| Widgets Windows & Android | `img/projets/widgets/` |
| Mini-RPG | `img/projets/mini-rpg/` |
| La salle d'expérience | `img/projets/salle-experience/` |

1. Sur GitHub, ouvrez le dossier du projet.
2. Cliquez sur **Add file › Upload files**, glissez vos images, puis **Commit changes**.
3. **Nommez-les 1, 2, 3…** dans l'ordre d'affichage : `1.png`, `2.jpg`, `3.webp`… Les formats acceptés sont `webp`, `png`, `jpg` et `jpeg`, jusqu'à 12 images.

C'est tout : la fiche affiche une section **Captures** dès qu'elle trouve `1.xxx`. La numérotation doit se suivre (s'il n'y a pas de `2`, le `3` n'est pas cherché).

Conseils : des images de 1600 px de large maximum, au format `webp` ou `jpg`, pour que la page reste rapide.

Pour donner une légende à vos captures, utilisez plutôt le champ `gallery` (voir plus bas).

## Modifier les informations d'un projet

Toutes les fiches sont dans **`data/projects.json`**. Sur GitHub, ouvrez ce fichier, cliquez sur le crayon (✏️ **Edit**), modifiez, puis **Commit changes**.

Chaque projet ressemble à ceci :

```json
{
 "id": "noxdl",
 "name": "NoxDL",
 "cat": "logiciels",
 "status": "cours",
 "platform": "Windows",
 "summary": "Phrase d'accroche affichée sur la carte.",
 "detail": "Description plus longue, sur la fiche.",
 "features": ["Une fonctionnalité", "Une autre"],
 "tech": "Python, CustomTkinter, yt-dlp, FFmpeg",
 "state": "Développement avancé (bêta interne)",
 "access": "Non publié",
 "diffusion": "Publication gratuite envisagée après tests",
 "license": "À définir",
 "download": "Aucun fichier public",
 "downloads": [],
 "tags": ["Windows", "Python"]
}
```

| Champ | Ce qu'il affiche |
|---|---|
| `name` | le nom du projet |
| `cat` | l'étagère : `applications`, `logiciels`, `web`, `jeux` ou `ia` (Outils IA) |
| `status` | `cours` (en cours) ou `reflexion` (en réflexion) |
| `platform` | sous le titre (Windows, Android…) |
| `tagline` | la petite phrase entre guillemets, sous le titre |
| `summary` | la description courte (carte et fiche) |
| `concept` | pour un projet en réflexion : l'idée de départ |
| `detail` | la description longue de la fiche |
| `anecdote` | un encadré « Anecdote » après la présentation (voir la fiche NOX) ; absent ou vide, rien ne s'affiche |
| `features` | la liste « Fonctionnalités » |
| `dev` | la liste « Pistes de développement » |
| `tech` | « Logiciels et technologies » |
| `state`, `access`, `diffusion`, `license` | la fiche technique |
| `next`, `goal` | « Prochaines étapes », « Objectif » (s'affichent seulement s'ils sont remplis) |
| `download` | une phrase sur la disponibilité |
| `downloads` | les vrais boutons de téléchargement (voir ci-dessous) |
| `tags` | les étiquettes en bas |

Un champ laissé vide (`""`) s'affiche « à renseigner » dans la fiche technique : rien n'est inventé.

Attention aux virgules : chaque ligne se termine par une virgule, sauf la dernière avant `}`. Les guillemets droits `"` sont obligatoires. Si la page affiche « Explosion mineure » après une modification, c'est presque toujours une virgule ou un guillemet en trop ou en moins.

## Logo, bannière et émojis d'un projet

Déposez dans le dossier du projet (`img/projets/<identifiant>/`) :

| Fichier | Où il apparaît |
|---|---|
| `icone.png` (ou `.webp`, `.svg`) | remplace le symbole à côté du titre de la fiche ; carré, 256 px suffit |
| `banniere.png` (ou `.webp`, `.jpg`) | grande image en haut de la fiche, affichée en entier ; format allongé, 1600 px de large suffisent |
| `emoji-1.png`, `emoji-2.png`… | section « Son univers visuel », en rangée ; fond transparent, 128 px suffit. Pour leur donner une légende (« Quand NOX réfléchit »), voir le champ `emojis` de la fiche NOX |

Pour que le logo apparaisse aussi sur la petite carte du projet (dans les étagères), ajoutez dans `data/projects.json` : `"icon": "img/projets/<identifiant>/icone.png"`.

Une planche avec plusieurs émojis sur la même image ? Envoyez-la dans la conversation : je la découpe et je range chaque émoji.

## Étapes du projet et sections libres (facultatif)

Pour montrer où en est un projet, en trois colonnes colorées :

```json
"stages": [
 { "level": "ok", "label": "Fonctionne déjà", "items": ["…", "…"] },
 { "level": "wip", "label": "En cours d'intégration", "items": ["…"] },
 { "level": "idea", "label": "Envisagé", "items": ["…"] }
]
```

Pour ajouter des blocs à la fiche (une expérimentation, des domaines d'application…) :

```json
"sections": [
 { "title": "Expérimentation vocale", "text": "Un paragraphe.", "tags": ["F5-TTS", "XTTS-v2"], "list": ["Un point", "Un autre"], "note": "Une remarque mise en avant." }
]
```

Chaque élément d'une section est facultatif. La fiche de Nox (`"id": "nox"`) sert d'exemple complet.

## Ajouter un bouton de téléchargement

Dans le champ `downloads` du projet :

```json
"downloads": [
 { "label": "Télécharger pour Windows", "url": "https://github.com/BixentEB/noxdl/releases/download/v1.0/NoxDL.zip", "version": "1.0", "size": "48 Mo" }
]
```

Seuls `label` et `url` sont nécessaires. Le lien peut pointer vers une « release » GitHub, un Google Drive, etc. Pour un petit fichier, vous pouvez aussi le déposer dans `files/<identifiant>/` et mettre `"url": "files/noxdl/NoxDL.zip"`.

## Captures avec légende (facultatif)

```json
"gallery": [
 { "src": "img/projets/noxdl/1.png", "alt": "Fenêtre principale de NoxDL en mode Radar", "caption": "Le mode Radar" }
]
```

`alt` décrit l'image pour les personnes qui ne la voient pas ; `caption` est la légende sous la miniature.

## Ajouter un projet

Copiez un bloc existant dans `data/projects.json`, changez l'`id` (en minuscules, sans espace ni accent : `mon-projet`), puis créez le dossier `img/projets/mon-projet/` pour ses captures.

## Ajouter un article à l'Atelier

1. Déposez le fichier HTML dans `content/atelier/<dossier>/<nom>.html` (par exemple `content/atelier/explo/mon-idee.html`). Les images vont dans `img/articles/`.
2. Ajoutez une ligne dans `data/atelier.json`, dans la bonne section : `{ "id": "explo/mon-idee", "title": "Mon idée" }`.

## Annoncer une nouveauté (accueil et pastilles)

Les « Dernières mises à jour » de l'accueil viennent du fichier **`data/news.json`**. Ajoutez une ligne **en haut** de la liste `updates` :

```json
{ "date": "2026-11-05", "kind": "new", "tab": "atelier", "title": "Titre court", "text": "Une phrase d'explication.", "href": "#/atelier/explo/hypercodex" },
```

| Champ | Ce qu'il fait |
|---|---|
| `date` | la date de publication, au format `AAAA-MM-JJ` |
| `kind` | `new` pour une nouvelle page ou un nouveau menu (pastille **NEW**), `maj` pour une mise à jour (petit rond de couleur) |
| `tab` | l'onglet qui reçoit la pastille : `accueil`, `applications`, `logiciels`, `web`, `jeux`, `ia` ou `atelier` |
| `title`, `text` | le titre et la petite phrase affichés sur l'accueil |
| `href` | le lien : `#/p/<identifiant>` pour une fiche, `#/atelier/<dossier>/<nom>` pour un article, `#/c/<étagère>` pour une étagère |

La pastille apparaît sur l'onglet, sur l'étagère de l'accueil et sur la carte de la fiche ou de l'article. Elle disparaît toute seule **7 jours** après la date. La liste de l'accueil montre les 4 dernières entrées.

## Besoin d'un coup de main

Vous pouvez aussi m'envoyer les infos et les images dans la conversation : je les range au bon endroit.

## Pages lisibles (moteurs de recherche et IA)

Rien à faire à la main : à chaque modification de `data/projects.json`, `data/atelier.json`, `data/news.json` ou d'un article de l'Atelier, une automatisation régénère une page HTML simple par projet (`projets/<id>/`) et par dossier de l'Atelier (`atelier/<id>/`), le sommaire `projets/` et `sitemap.xml`. Le site animé ne change pas.

- Dates : champ `"published": "AAAA-MM-JJ"` d'un projet ou d'un dossier de l'Atelier (première apparition), complété par les annonces de `data/news.json`. La plus ancienne sert de date de publication, la plus récente de date de mise à jour. Pour une nouvelle fiche, l'annonce dans `news.json` suffit.
- Pour qu'un projet ou un dossier n'apparaisse pas dans ces pages : `"index": false` dans son entrée (ou `"hidden": true`).
- Pour régénérer à la main : `python3 tools/build_static.py`.
