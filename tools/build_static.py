#!/usr/bin/env python3
"""Pages lisibles du Laboratoire pour les moteurs de recherche et les IA.

Usage : python3 tools/build_static.py

Génère, sans toucher au site animé :
- projets/<id>/index.html : une fiche HTML par projet de data/projects.json ;
- atelier/<id>/index.html : une page par dossier de data/atelier.json ;
- projets/index.html : le sommaire ;
- sitemap.xml.
Dates : champ "published" (première apparition, retrouvée dans l'historique des sites) et annonces de
data/news.json ; la plus ancienne = publication, la plus récente = mise à jour.
Exclus : toute entrée marquée "hidden": true, "status": "draft" ou "index": false.

Bibliothèque standard uniquement. Relancé par .github/workflows/pages-lisibles.yml.
"""
import html, json, os, re, shutil

SITE = 'https://lab.codexmental.com'
AUTHOR = 'Vincent (Bixent)'
AUTHOR_URL = 'https://bixent.codexmental.com'
SITE_NAME = 'Codex Mental · Laboratoire'
CONTACT = 'https://codexmental.com/#contact/form'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']


def load(p):
    with open(os.path.join(ROOT, p), encoding='utf8') as f:
        return json.load(f)


def esc(s):
    return html.escape(str(s or ''), quote=True)


def fr_date(d):
    try:
        y, m, j = (int(x) for x in d.split('-'))
        return '%d %s %d' % (j, MOIS[m - 1], y)
    except Exception:
        return d


def excluded(x):
    return x.get('hidden') or x.get('status') == 'draft' or x.get('index') is False


def text_of(frag):
    t = re.sub(r'<(script|style)\b.*?</\1>', ' ', frag, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t))).strip()


def clean(frag):
    frag = re.sub(r'<(script|style)\b.*?</\1>', '', frag, flags=re.S | re.I)
    frag = re.sub(r'\son[a-z]+="[^"]*"', '', frag, flags=re.I)
    frag = re.sub(r'\sstyle="[^"]*"', '', frag, flags=re.I)

    def fix(m):
        attr, url = m.group(1), m.group(2)
        if re.match(r'^(https?:|mailto:|tel:|data:|#|/)', url):
            return m.group(0)
        return '%s="/%s"' % (attr, url)
    return re.sub(r'\b(src|href|poster)="([^"]*)"', fix, frag)


def short(t, n=220):
    t = t or ''
    return t if len(t) <= n else t[:n].rsplit(' ', 1)[0] + '…'


def dates_for(news, href, published=None):
    ds = sorted([u['date'] for u in news if u.get('href') == href and u.get('date')] + ([published] if published else []))
    return (ds[0], ds[-1]) if ds else (None, None)


BAR = ('<header class="bar"><a class="brand" href="/"><img src="/favicon.svg" alt="" width="26" height="26"><span>CODEX MENTAL · LABORATOIRE</span></a>'
       '<a class="enter" href="/">Entrer dans le Laboratoire <span aria-hidden="true">→</span></a></header>')
PROMO = ('<a class="promo%s" href="/"><img src="/projets/apercu.webp" alt="Aperçu du site" width="1280" height="720" loading="lazy">'
         '<span class="promo-t"><b>Le Laboratoire de Codex Mental</b><span>Des idées qui passent de la fiole à l’éprouvette : applications, logiciels, styles pour le navigateur, prototypes de jeux et dossiers d’idées, à parcourir étagère par étagère.</span>'
         '<span class="enter">Entrer dans le Laboratoire <span aria-hidden="true">→</span></span></span></a>')
OG_IMAGE = 'https://lab.codexmental.com/projets/apercu.webp'


FOOT = ('<footer class="foot"><p>© %s — Codex Mental. Citation et reprise d\'extraits bienvenues, avec le nom de '
        'l\'auteur et un lien vers la page d\'origine. Pour une reprise plus large, <a href="%s">écrivez-moi</a>.</p>'
        '<p><a href="/projets/">Tous les projets</a> · <a href="/">Entrer dans le Laboratoire</a></p></footer>')


def shell(title, desc, canonical, body, ld, og_type='article', top=False):
    return '''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta name="description" content="{d}">
<meta name="author" content="{a}">
<link rel="canonical" href="{c}">
<meta property="og:type" content="{o}">
<meta property="og:site_name" content="{s}">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{c}">
<meta property="og:locale" content="fr_FR">
<meta property="og:image" content="{ogimg}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/projets/lisible.css">
<script type="application/ld+json">{ld}</script>
</head>
<body>
{bar}
<main class="page">
{top}{b}
{promo}
{f}
</main>
</body>
</html>
'''.format(bar=BAR, promo=PROMO % '', top=(PROMO % ' top') if top else '', ogimg=OG_IMAGE, t=esc(title), d=esc(desc), a=esc(AUTHOR), c=esc(canonical), o=og_type, s=esc(SITE_NAME), b=body,
           f=FOOT % (esc(AUTHOR), esc(CONTACT)), ld=json.dumps(ld, ensure_ascii=False).replace('</', '<\\/'))


def write(rel, content):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf8') as f:
        f.write(content)


def page(kind, xid, title, desc, inner, immersive, crumbs, pub, mod, schema_type='CreativeWork', extra=None):
    url = '%s/%s/%s/' % (SITE, kind, xid)
    person = {'@type': 'Person', 'name': AUTHOR, 'url': AUTHOR_URL}
    ld = {'@context': 'https://schema.org', '@type': schema_type, 'name': title, 'headline': title, 'description': desc,
          'url': url, 'mainEntityOfPage': url, 'inLanguage': 'fr', 'author': person, 'copyrightHolder': person,
          'isPartOf': {'@type': 'WebSite', 'name': SITE_NAME, 'url': SITE}, 'usageInfo': SITE + '/projets/#reutilisation'}
    if pub:
        ld['datePublished'] = pub
    if mod and mod != pub:
        ld['dateModified'] = mod
    if extra:
        ld.update(extra)
    meta = [esc(AUTHOR)]
    if pub:
        meta.append('<time datetime="%s">%s</time>' % (esc(pub), esc(fr_date(pub))))
    if mod and mod != pub:
        meta.append('mis à jour le <time datetime="%s">%s</time>' % (esc(mod), esc(fr_date(mod))))
    body = ('<nav class="crumbs"><a href="/projets/">Laboratoire</a> › %s</nav>\n'
            '<header class="head"><h1>%s</h1><p class="meta">%s</p>'
            '<p><a class="go" href="%s">Voir dans le Laboratoire</a></p></header>\n<div class="txt">%s</div>\n'
            '<p class="cite">Source : %s, « %s », Laboratoire de Codex Mental%s — <a href="%s">%s</a></p>') % (
        esc(crumbs), esc(title), ' · '.join(meta), esc(immersive), inner, esc(AUTHOR), esc(title),
        (', ' + esc(fr_date(pub))) if pub else '', esc(url), esc(url))
    write('%s/%s/index.html' % (kind, xid), shell(title + ' — ' + SITE_NAME, desc, url, body, ld))
    return url


def project_html(p, statuses):
    out = []
    for k in ('tagline', 'summary', 'detail'):
        if p.get(k):
            out.append('<p>%s</p>' % esc(p[k]))
    facts = [('Plateforme', p.get('platform')), ('Statut', statuses.get(p.get('status'), p.get('status'))),
             ('État', p.get('state')), ('Technologies', p.get('tech')), ('Accès', p.get('access')),
             ('Diffusion', p.get('diffusion')), ('Licence', p.get('license'))]
    rows = ''.join('<tr><th>%s</th><td>%s</td></tr>' % (esc(a), esc(b)) for a, b in facts if b)
    if rows:
        out.append('<table>%s</table>' % rows)
    if p.get('features'):
        out.append('<h2>Fonctionnalités</h2><ul>%s</ul>' % ''.join('<li>%s</li>' % esc(f) for f in p['features']))
    for s in p.get('stages') or []:
        out.append('<h2>%s</h2><ul>%s</ul>' % (esc(s.get('label')), ''.join('<li>%s</li>' % esc(i) for i in s.get('items', []))))
    for s in p.get('sections') or []:
        out.append('<h2>%s</h2><p>%s</p>' % (esc(s.get('title')), esc(s.get('text'))))
    for k, label in (('concept', 'Concept'), ('goal', 'Objectif'), ('next', 'Prochaines étapes'), ('anecdote', 'Anecdote')):
        v = p.get(k)
        if isinstance(v, str) and v:
            out.append('<h2>%s</h2><p>%s</p>' % (label, esc(v)))
    return '\n'.join(out)


def main():
    data = load('data/projects.json')
    atelier = load('data/atelier.json')
    news = load('data/news.json').get('updates', [])
    cats = {c['id']: c['label'] for c in data.get('categories', [])}
    statuses = {}
    for s in data.get('statuses') or []:
        if isinstance(s, dict) and s.get('id'):
            statuses[s['id']] = s.get('label', s['id'])
    if isinstance(data.get('statuses'), dict):
        statuses = {k: (v.get('label') if isinstance(v, dict) else v) for k, v in data['statuses'].items()}

    for d in ('projets', 'atelier'):
        p = os.path.join(ROOT, d)
        if os.path.isdir(p):
            for name in os.listdir(p):
                if os.path.isdir(os.path.join(p, name)):
                    shutil.rmtree(os.path.join(p, name))

    listing, skipped = [], []
    for p in data['projects']:
        if excluded(p):
            skipped.append(p['id']); continue
        href = '#/p/' + p['id']
        pub, mod = dates_for(news, href, p.get('published'))
        desc = short(p.get('summary') or p.get('tagline') or p.get('detail'))
        extra = {'@type': 'SoftwareApplication', 'applicationCategory': cats.get(p.get('cat'), ''),
                 'operatingSystem': p.get('platform') or ''} if p.get('cat') in ('applications', 'logiciels') else None
        url = page('projets', p['id'], p['name'], desc, project_html(p, statuses), SITE + '/' + href,
                   cats.get(p.get('cat'), 'Projets'), pub, mod, extra=extra)
        listing.append((cats.get(p.get('cat'), 'Projets'), url, p['name'], pub, desc))

    for sec in atelier.get('sections', []):
        for it in sec.get('items', []):
            if excluded(it):
                skipped.append(it['id']); continue
            src = os.path.join(ROOT, 'content', 'atelier', it['id'] + '.html')
            if not os.path.exists(src):
                skipped.append(it['id'] + ' (fichier absent)'); continue
            with open(src, encoding='utf8') as f:
                frag = f.read()
            href = '#/atelier/' + it['id']
            pub, mod = dates_for(news, href, it.get('published'))
            desc = short(text_of(frag))
            url = page('atelier', it['id'], it['title'], desc, clean(frag), SITE + '/' + href,
                       'Atelier › ' + sec.get('label', ''), pub, mod, schema_type='Article')
            listing.append(('Atelier — ' + sec.get('label', ''), url, it['title'], pub, desc))

    groups = {}
    for g, url, title, pub, desc in listing:
        groups.setdefault(g, []).append((url, title, pub, desc))
    parts = ['<header class="head"><h1>Laboratoire de Codex Mental — tous les projets</h1>'
             '<p class="meta">Applications, logiciels, expériences web et dossiers d\'idées de %s. Version lisible de '
             '<a href="/">lab.codexmental.com</a>, qui reste l\'entrée animée.</p></header>' % esc(AUTHOR)]
    for g, items in groups.items():
        parts.append('<h2>%s</h2><ul class="list">' % esc(g))
        for url, title, pub, desc in items:
            parts.append('<li><a href="%s">%s</a>%s<br><span>%s</span></li>' % (
                esc(url.replace(SITE, '')), esc(title),
                (' <time datetime="%s">%s</time>' % (esc(pub), esc(fr_date(pub)))) if pub else '', esc(desc)))
        parts.append('</ul>')
    parts.append('<h2 id="reutilisation">Réutilisation</h2><p>Les textes, projets et créations du Laboratoire sont '
                 'l\'œuvre de %s, tous droits réservés. Vous pouvez les citer et en reprendre des extraits en indiquant '
                 'le nom de l\'auteur et un lien vers la page d\'origine. Pour une reprise plus large, '
                 '<a href="%s">écrivez-moi</a>.</p>' % (esc(AUTHOR), esc(CONTACT)))
    ld = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'Laboratoire de Codex Mental — projets',
          'url': SITE + '/projets/', 'inLanguage': 'fr', 'author': {'@type': 'Person', 'name': AUTHOR, 'url': AUTHOR_URL},
          'hasPart': [{'@type': 'CreativeWork', 'name': t, 'url': u} for _, u, t, _, _ in listing]}
    write('projets/index.html', shell('Tous les projets — ' + SITE_NAME,
                                      'Sommaire des projets et dossiers d\'idées du Laboratoire de Codex Mental, par ' + AUTHOR + '.',
                                      SITE + '/projets/', '\n'.join(parts), ld, og_type='website', top=True))

    urls = [(SITE + '/', None), (SITE + '/projets/', None)] + [(u, pub) for _, u, _, pub, _ in listing]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u, d in urls:
        sm.append('  <url><loc>%s</loc>%s</url>' % (esc(u), ('<lastmod>%s</lastmod>' % d) if d else ''))
    sm.append('</urlset>')
    write('sitemap.xml', '\n'.join(sm) + '\n')
    # inventaire des images : le site s'en sert pour trouver bannières, logos, captures et versions « old »
    # sans tester des adresses au hasard (plus d'erreurs 404 dans la console)
    imgs = sorted(os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, '/')
                  for dp, ds, fs in os.walk(ROOT) if not ds.__setitem__(slice(None), [d for d in ds if not d.startswith('.')])
                  for f in fs if re.search(r'\.(webp|png|jpe?g|gif|svg|avif)$', f, re.I))
    write('data/images.json', json.dumps(imgs, ensure_ascii=False, indent=0) + '\n')
    print('%d pages générées, exclues : %s' % (len(listing), ', '.join(skipped) or 'aucune'))
    print('%d sans date' % sum(1 for x in listing if not x[3]))


if __name__ == '__main__':
    main()
