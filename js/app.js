/* ==========================================================================
   CODEX MENTAL · LAB — contenu : onglets, fiches, Atelier, barre de défilement
   ========================================================================== */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view'), lab = $('#lab'), tabsEl = $('#tabs');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let DATA = null, ATELIER = null, TABS = [];
const filters = {};
const articleCache = new Map();

/* ---------- icônes pixel (SVG) ---------- */
const ICONS = {
  flask: ['...oo...', '...oo...', '...oo...', '..o##o..', '..o##o..', '.o####o.', '.o####o.', 'o######o', 'o######o', 'oooooooo'],
  tube: ['oooooo', '.o##o.', '.o##o.', '.o##o.', '.o##o.', '.o##o.', '.o##o.', '.o##o.', '..oo..'],
  beaker: ['o......o', 'oo....oo', '.o....o.', '.o####o.', '.o####o.', '.o####o.', '.o####o.', '.oooooo.'],
  potion: ['...cc...', '...cc...', '..o##o..', '.o####o.', 'o######o', 'o######o', 'o######o', '.oooooo.'],
  book: ['.oooooo.', 'o######o', 'o#oooo#o', 'o######o', 'o#ooo##o', 'o######o', 'o######o', 'oooooooo'],
  door: ['.oooooo.', 'o######o', 'o#oooo#o', 'o#o..o#o', 'o#o..o#o', 'o#o..oco', 'o#o..o#o', 'o#oooo#o', 'o######o', 'oooooooo'],
  speaker: ['....o...', '...oo..#', 'oooo#.#.', 'o###o.#.', 'o###o.#.', 'oooo#.#.', '...oo..#', '....o...'],
  mute: ['....o...', '...oo...', 'oooo#.#.#', 'o###o..#.', 'o###o..#.', 'oooo#.#.#', '...oo...', '....o...'],
  chip: ['.o.o.o.o', 'oooooooo', '.o####o.', 'oo#oo#oo', '.o####o.', 'oo#oo#oo', '.o####o.', 'oooooooo', '.o.o.o.o'],
  bolt: ['....##..', '...##...', '..##....', '.######.', '....##..', '...##...', '..##....', '.##.....']
};
/* icônes vectorielles pour les thèmes non pixel : même famille, verrerie fine */
const VEC = {
  flask: c => `<path d="M9.5 3h5M10 3v6.2L4.6 18.4A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5-2.6L14 9.2V3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M7.2 14h9.6l2.6 4.4a1.7 1.7 0 0 1-1.5 2.6H6.1a1.7 1.7 0 0 1-1.5-2.6Z" fill="${c}" opacity=".9"/><circle cx="10.5" cy="17" r=".9" fill="#fff" opacity=".8"/><circle cx="13.6" cy="15.6" r=".6" fill="#fff" opacity=".7"/>`,
  tube: c => `<path d="M8.5 2.5h7M9.5 2.5v15.5a2.5 2.5 0 0 0 5 0V2.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9.5 11h5v7a2.5 2.5 0 0 1-5 0Z" fill="${c}" opacity=".9"/><circle cx="11.4" cy="15.5" r=".7" fill="#fff" opacity=".8"/>`,
  beaker: c => `<path d="M4.5 3.5h15M6 3.5v15.5A2 2 0 0 0 8 21h8a2 2 0 0 0 2-2V3.5M18 7h-2M18 10.5h-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 12.5h12V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" fill="${c}" opacity=".9"/><circle cx="9.5" cy="16" r=".8" fill="#fff" opacity=".8"/>`,
  potion: c => `<path d="M10 2.5h4M10.5 2.5v4.6a6.6 6.6 0 1 0 3 0V2.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.6 14.5h12.8a6.6 6.6 0 0 1-12.8 0Z" fill="${c}" opacity=".9"/><rect x="10" y="1" width="4" height="2" rx=".6" fill="#b8763a"/><circle cx="9.4" cy="16.6" r=".8" fill="#fff" opacity=".8"/>`,
  book: c => `<path d="M12 6.2C9.8 4.6 6.6 4.2 3.5 4.6v14c3.1-.4 6.3 0 8.5 1.6 2.2-1.6 5.4-2 8.5-1.6v-14c-3.1-.4-6.3 0-8.5 1.6Zm0 0v14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M14.5 9.2l1.2 2.2 2.3.4-1.7 1.6.4 2.3-2.2-1.1-2.1 1.1" fill="${c}" opacity=".95"/><path d="M5.8 8.3c1.5-.1 3 .1 4.3.7M5.8 11.3c1.5-.1 3 .1 4.3.7M5.8 14.3c1.5-.1 3 .1 4.3.7" stroke="${c}" stroke-width="1" fill="none" opacity=".75"/>`,
  chip: c => `<rect x="6" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M9.5 14.5c0-1.6.9-2.4 2.5-2.4s2.5.8 2.5 2.4M10.2 10.4h.01M13.8 10.4h.01" stroke="${c}" stroke-width="1.6" stroke-linecap="round" fill="none"/><rect x="7.5" y="7.5" width="9" height="9" rx="1.5" fill="${c}" opacity=".22"/>`,
  bolt: c => `<path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2Z" fill="${c}" stroke="${c}" stroke-width="1" stroke-linejoin="round"/>`,
  door: c => `<path d="M5.5 21V9.5a6.5 6.5 0 0 1 13 0V21Z" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/><path d="M3.5 21h17M9 21V11M12 21V9M15 21V11" stroke="${c}" stroke-width="1" opacity=".55"/><circle cx="15.8" cy="15" r="1" fill="${c}"/>`
};
function pix(name, color, size = 32, forcePixel) {
  if (!forcePixel && document.documentElement.dataset.universe !== 'pixel' && VEC[name]) {
    return `<svg class="vec" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${VEC[name](color)}</svg>`;
  }
  const rows = ICONS[name] || ICONS.flask, wd = Math.max(...rows.map(r => r.length)), ht = rows.length;
  let r = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const fill = ch === '#' ? color : ch === 'o' ? '#cfe9f2' : ch === 'c' ? '#8a5a34' : null;
    if (fill) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
  }));
  return `<svg class="pix" viewBox="0 0 ${wd} ${ht}" width="${size}" height="${Math.round(size * ht / wd)}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const CAT_ICON = { applications: 'flask', logiciels: 'tube', web: 'beaker', jeux: 'potion', ia: 'chip' };

/* ---------- données ---------- */
async function load() {
  const [p, a] = await Promise.all([fetch('data/projects.json').then(r => r.json()), fetch('data/atelier.json').then(r => r.json())]);
  DATA = p; ATELIER = a;
  TABS = [{ id: 'accueil', label: 'Accueil', color: '#ffb347', href: '#/' }]
    .concat(DATA.categories.map(c => ({ id: c.id, label: c.label, color: c.color, href: '#/c/' + c.id })))
    .concat([{ id: 'atelier', label: 'Atelier', color: '#c9a6ff', href: '#/atelier' }]);
  $('.brand-ico').innerHTML = pix('flask', window.LAB && window.LAB.halloween ? '#ff8c1a' : '#9dff5c', 16);
  tabsEl.innerHTML = TABS.map(t => `<a class="tab" role="tab" href="${t.href}" data-id="${t.id}" style="--c:${t.color}">${esc(t.label)}</a>`).join('');
}
const cat = id => DATA.categories.find(c => c.id === id);
const projectsOf = id => DATA.projects.filter(p => p.cat === id);
const tagColor = tag => (DATA.palette && DATA.palette[tag]) || '#8aa39c';

/* ---------- morceaux de rendu ---------- */
function statusBadge(p) {
  return p.status === 'cours' ? '<span class="status s-cours">En cours</span>' : '<span class="status s-reflexion">En réflexion</span>';
}
function tags(list) {
  if (!list || !list.length) return '';
  return `<ul class="tags">${list.map(t => `<li style="--t:${tagColor(t)}">${esc(t)}</li>`).join('')}</ul>`;
}
function card(p) {
  const sum = p.summary || p.tagline || p.concept || '';
  return `<a class="card" href="#/p/${esc(p.id)}" style="--c:${esc(p.accent || cat(p.cat).color)}">
    <div class="card-top"><span class="mark">${esc(p.mark || '✦')}</span>${statusBadge(p)}</div>
    <h3>${esc(p.name)}</h3>
    <p class="plat">${esc(p.platform || '')}</p>
    <p class="sum">${esc(sum.length > 150 ? sum.slice(0, 147).trim() + '…' : sum)}</p>
    ${tags((p.tags || []).filter(t => !/^(Bêta|Concept|Prototype|En développement|Expérimental|Accès privé|Site public)$/.test(t)).slice(0, 4))}
  </a>`;
}
// petits textes propres à chaque salle
const ROOM_TEXT = {
  pixel: { kicker: '<p class="kicker"><span class="prompt">&gt;</span> ouverture du labo… ok <span class="caret"></span></p>', hint: hw => hw ? '🎃 Saison d\'Halloween : la bobine Tesla semble… agitée. Trois décharges rapprochées, et qui sait ?' : '⚡ Astuce : la bobine Tesla, à gauche, réagit aux clics. Les fioles de l\'étagère aussi.' },
  alchimie: { kicker: '<p class="kicker"><span class="prompt">&gt;</span> paillasse sous tension… ok <span class="caret"></span></p>', hint: hw => hw ? '🎃 Saison d\'Halloween : la bobine Tesla semble… agitée. Trois décharges rapprochées, et qui sait ?' : '⚗ Astuce : la bobine Tesla réagit aux clics, et le ballon de réaction aime les gouttes de réactif.' },
  hd: { kicker: '<p class="kicker">Codex Mental · Laboratoire d\'alchimie</p>', hint: () => '⚗ Astuce : cliquez sur la grande cuve… si vous osez. Le bouton ⤓ range l\'écran pour admirer le labo.' },
  observatoire: { kicker: '<p class="kicker">Codex Mental · L\'observatoire</p>', hint: () => '🔭 Astuce : cliquez sur le télescope pour viser un astre, et sur le ciel pour une étoile filante.' },
  station: { kicker: '<p class="kicker">Station orbitale · Module de recherche</p>', hint: () => '🛰 Astuce : attrapez une bulle de liquide qui flotte, ou faites tourner la planète derrière le hublot.' },
  avantposte: { kicker: '<p class="kicker">Avant-poste · Planète Kepler-C</p>', hint: () => '👽 Astuce : tapotez la vitre du dôme. Ils finissent toujours par venir voir.' }
};
function roomText() { return ROOM_TEXT[(window.LAB || {}).theme] || ROOM_TEXT.pixel; }
function footer() {
  const hw = window.LAB && window.LAB.halloween;
  if (window.LAB && window.LAB.universe === 'pro') return `<footer class="lab-foot">
    <p class="hint">Envie d'explorer ? Le labo cache trois univers : <a href="#" data-go="pixel">en pixel</a>, <a href="#" data-go="vecto">en vectoriel</a> et <a href="#" data-go="orbital">en orbite</a>.</p>
    <p>Codex Mental · Laboratoire <span class="sep">/</span> <a href="https://codexmental.com">retour au Codex</a></p>
  </footer>`;
  return `<footer class="lab-foot">
    <p class="hint">${esc(roomText().hint(hw))}</p>
    <p>Codex Mental · Laboratoire <span class="sep">/</span> <a href="https://codexmental.com">retour au Codex</a></p>
  </footer>`;
}

/* ---------- pages ---------- */
function heroFlask() {
  // une grande fiole : le liquide ondule et prend la couleur des réactifs, quelques bulles montent
  const bub = [[92, 0], [118, 1.2], [104, 2.3], [130, .6], [80, 1.8]].map(([cx, d], i) => `<circle class="hb" cx="${cx}" cy="250" r="${3 + (i % 3)}" style="animation-delay:${d}s"/>`).join('');
  return `<svg viewBox="0 0 220 280" width="220" height="280">
    <defs>
      <linearGradient id="hl" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#7cf29a"/><stop offset=".5" stop-color="#7fd8ff"/><stop offset="1" stop-color="#c9a6ff"/></linearGradient>
      <clipPath id="hc"><path d="M88 30v72L30 226a20 20 0 0 0 18 30h124a20 20 0 0 0 18-30L132 102V30Z"/></clipPath>
      <radialGradient id="hg" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#7fd8ff" stop-opacity=".45"/><stop offset="1" stop-color="#7fd8ff" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="110" cy="200" rx="110" ry="80" fill="url(#hg)"/>
    <g clip-path="url(#hc)">
      <g class="hw"><path d="M-110 150q27-10 55 0t55 0 55 0 55 0 55 0 55 0 55 0V280H-110Z" fill="url(#hl)" opacity=".9"/></g>
      <g class="hw hw2"><path d="M-110 156q27-8 55 0t55 0 55 0 55 0 55 0 55 0 55 0V280H-110Z" fill="#fff" opacity=".12"/></g>
      <g class="hbs">${bub}</g>
    </g>
    <path class="glass" d="M88 30v72L30 226a20 20 0 0 0 18 30h124a20 20 0 0 0 18-30L132 102V30" fill="none" stroke-width="3" stroke-linejoin="round"/>
    <path class="glass" d="M80 30h60" stroke-width="3" stroke-linecap="round"/>
    <path d="M52 220l40-74" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>
    <rect x="96" y="12" width="28" height="18" rx="4" fill="#9a6a40"/>
  </svg>`;
}
function pageHome() {
  const inv = DATA.categories.map(c => {
    const ps = projectsOf(c.id), n1 = ps.filter(p => p.status === 'cours').length, n2 = ps.length - n1;
    return `<a class="shelf" href="#/c/${c.id}" style="--c:${c.color}">
      ${pix(CAT_ICON[c.id], c.color, 30)}
      <b>${esc(c.label)}</b>
      <small>${ps.length ? `${n1} en cours${n2 ? ` · ${n2} en réflexion` : ''}` : 'Bientôt sur l\'étagère'}</small>
    </a>`;
  }).join('') + `<a class="shelf" href="#/atelier" style="--c:#c9a6ff">${pix('book', '#c9a6ff', 30)}<b>Atelier</b><small>${ATELIER.sections.reduce((s, x) => s + x.items.length, 0)} dossiers d'idées</small></a>`;
  const now = DATA.projects.filter(p => p.status === 'cours').slice(0, 3).map(card).join('');
  if (window.LAB && window.LAB.universe === 'pro') {
    const nApps = DATA.projects.length, nCours = DATA.projects.filter(p => p.status === 'cours').length, nIdeas = ATELIER.sections.reduce((s2, x) => s2 + x.items.length, 0);
    return `<section class="pro-hero">
      <div class="pro-hero-txt">
        <p class="kicker">Codex Mental · Laboratoire</p>
        <h1 class="px-title">Des idées qui passent de la fiole à l'éprouvette.</h1>
        <p class="lead">Applications, logiciels, styles pour le navigateur, prototypes de jeux… et les concepts qui mijotent dans l'Atelier. Tout ce que je fabrique, au même endroit.</p>
        <div class="cta">
          <a class="btn btn-main" href="#/c/applications">Voir les projets</a>
          <button type="button" class="btn btn-lab" data-go="pixel">${pix('potion', '#ff8ad8', 18)} Entrer dans le labo</button>
        </div>
        <dl class="pro-stats"><div><dt>Projets</dt><dd>${nApps}</dd></div><div><dt>En cours</dt><dd>${nCours}</dd></div><div><dt>Idées dans l'Atelier</dt><dd>${nIdeas}</dd></div></dl>
      </div>
      <div class="pro-flask" aria-hidden="true">${heroFlask()}</div>
    </section>
    <h2 class="sec">Les étagères</h2>
    <div class="shelves">${inv}</div>
    <h2 class="sec">En cours</h2>
    <div class="grid">${now}</div>
    ${footer()}`;
  }
  return `<section class="hero">
      ${roomText().kicker}
      <h1 class="px-title">Le Laboratoire</h1>
      <p class="lead">Bienvenue dans l'antre du Codex Mental. Ici, les idées passent de la fiole à l'éprouvette : applications, logiciels, bidouilles CSS, prototypes de jeux, et tout ce qui mijote dans l'Atelier.</p>
      <p class="warn">${pix('bolt', '#ffb347', 14)} Certaines expériences sont encore instables. Merci de ne pas secouer les fioles.</p>
    </section>
    <h2 class="sec">Inventaire des étagères</h2>
    <div class="shelves">${inv}</div>
    <h2 class="sec">Sur la paillasse en ce moment</h2>
    <div class="grid">${now}</div>
    ${footer()}`;
}
function pageCat(id) {
  const c = cat(id); if (!c) return page404();
  const all = projectsOf(id), f = filters[id] || 'all';
  const list = f === 'all' ? all : all.filter(p => p.status === f);
  const n = s => all.filter(p => p.status === s).length;
  const btn = (k, label, count) => `<button class="chip" data-f="${k}" aria-pressed="${f === k}">${label} <span>${count}</span></button>`;
  return `<header class="cat-head" style="--c:${c.color}">
      <div class="cat-ico">${pix(CAT_ICON[id], c.color, 44)}</div>
      <div><p class="kicker">Étagère n°${DATA.categories.indexOf(c) + 1}</p><h1 class="px-title">${esc(c.label)}</h1><p class="lead">${esc(c.desc)}</p></div>
    </header>
    <div class="filters" role="group" aria-label="Filtrer par état" data-cat="${id}">
      ${btn('all', 'Tout', all.length)}${btn('cours', 'En cours', n('cours'))}${btn('reflexion', 'En réflexion', n('reflexion'))}
    </div>
    ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '<p class="empty">Aucune expérience ici pour l\'instant. Les fioles sont vides… mais propres.</p>'}
    ${footer()}`;
}
function pageProject(id) {
  const p = DATA.projects.find(x => x.id === id); if (!p) return page404();
  const c = cat(p.cat), sibs = projectsOf(p.cat), i = sibs.indexOf(p);
  // fiche technique : les lignes essentielles s'affichent toujours, « à renseigner » si l'info manque
  const todo = '<span class="todo">à renseigner</span>';
  const specs = [['État', p.state, 1], ['Plateforme', p.platform, 1], ['Logiciels et technologies', p.tech, 1], ['Licence', p.license, 1], ['Accès', p.access, 1], ['Diffusion', p.diffusion, 0], ['Prochaines étapes', p.next, 0], ['Objectif', p.goal, 0], ['Lien', p.link, 0]]
    .filter(r => r[1] || r[2]).map(r => `<dt>${r[0]}</dt><dd>${r[1] ? esc(r[1]) : todo}</dd>`).join('');
  const list = (title, arr) => arr && arr.length ? `<section class="box"><h2>${title}</h2><ul class="px-list">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '';
  const prev = sibs[i - 1], next = sibs[i + 1];
  return `<nav class="crumbs"><a href="#/c/${c.id}">← ${esc(c.label)}</a></nav>
    <article class="detail" style="--c:${esc(p.accent || c.color)}">
      <header class="d-head">
        <span class="mark big">${esc(p.mark || '✦')}</span>
        <div>
          <p class="kicker">${esc(c.label)} · ${p.status === 'cours' ? 'en cours' : 'en réflexion'}</p>
          <h1 class="px-title">${esc(p.name)}</h1>
          ${p.tagline ? `<p class="tagline">« ${esc(p.tagline)} »</p>` : ''}
          <p class="plat">${esc(p.platform || '')}</p>
        </div>
      </header>
      ${p.summary ? `<p class="lead">${esc(p.summary)}</p>` : ''}
      ${p.concept ? `<p class="lead">${esc(p.concept)}</p>` : ''}
      ${p.detail ? `<p>${esc(p.detail)}</p>` : ''}
      ${gallery(p)}
      ${p.shot ? `<figure class="shot"><img src="${esc(p.shot)}" alt="${esc(p.shotAlt || '')}" loading="lazy"><figcaption>${esc(p.shotAlt || '')}</figcaption></figure>` : ''}
      <div class="d-cols">
        ${list('Fonctionnalités', p.features)}
        ${specs ? `<section class="box"><h2>Fiche technique</h2><dl class="specs">${specs}</dl></section>` : ''}
      </div>
      ${list('Pistes de développement', p.dev)}
      ${downloadsBlock(p)}
      ${toolsBlock(p)}
      ${filesBlock(p)}
      ${guideBlock(p)}
      ${p.play ? `<p class="play"><a class="play-btn" href="${esc(p.play)}">${pix('door', '#ffb347', 18)} Entrer dans la salle</a></p>` : ''}
      ${tags(p.tags)}
    </article>
    <nav class="pager">${prev ? `<a href="#/p/${prev.id}">← ${esc(prev.name)}</a>` : '<span></span>'}${next ? `<a href="#/p/${next.id}">${esc(next.name)} →</a>` : '<span></span>'}</nav>
    ${footer()}`;
}

/* ---------- fiche : galerie, outils, fichiers, mode d'emploi ---------- */
// captures : celles décrites dans projects.json, plus celles déposées dans img/projets/<id>/ (1.png, 2.jpg, 3.webp…)
function galleryItems(p) { return (p.gallery || []).concat(p._auto || []); }
function galleryHTML(p) {
  return galleryItems(p).map((g, i) => `<figure role="listitem"><button type="button" class="g-open" data-g="${i}" aria-label="Agrandir : ${esc(g.caption || g.alt)}"><img src="${esc(g.mini || g.src)}" alt="${esc(g.alt)}" loading="lazy"></button><figcaption>${esc(g.caption || '')}</figcaption></figure>`).join('');
}
function gallery(p) {
  return `<section class="block shots-block" data-shots="${esc(p.id)}" ${galleryItems(p).length ? '' : 'hidden'}><h2 class="sec"><span class="dot"></span>Captures</h2><div class="gallery" role="list">${galleryHTML(p)}</div></section>`;
}
const EXTS = ['webp', 'png', 'jpg', 'jpeg'];
function probe(src) { return new Promise(ok => { const im = new Image(); im.onload = () => ok(true); im.onerror = () => ok(false); im.src = src; }); }
async function findShots(p) {
  if (p._auto) return;
  const found = [];
  for (let n = 1; n <= 12; n++) {
    let hit = null;
    for (const ext of EXTS) { const src = `img/projets/${p.id}/${n}.${ext}`; if (await probe(src)) { hit = src; break; } }
    if (!hit) break;
    found.push({ src: hit, alt: `Capture ${n} : ${p.name}`, caption: `Capture ${n}` });
  }
  p._auto = found;
}
async function fillShots(p) {
  await findShots(p);
  const sec = view.querySelector(`[data-shots="${CSS.escape(p.id)}"]`);
  if (!sec || !galleryItems(p).length) return;
  sec.querySelector('.gallery').innerHTML = galleryHTML(p); sec.hidden = false; updateTube();
}
function downloadsBlock(p) {
  if (p.files && p.files.length) return '';
  const dl = (p.downloads || []).filter(x => x && x.url);
  return `<section class="block"><h2 class="sec"><span class="dot"></span>Téléchargement</h2>${dl.length
    ? `<div class="dl-list">${dl.map(x => `<a class="btn btn-main" href="${esc(x.url)}"${/^https?:/.test(x.url) ? ' target="_blank" rel="noopener"' : ' download'}>${esc(x.label || 'Télécharger')}${x.version ? ` <small>v${esc(x.version)}</small>` : ''}${x.size ? ` <small>${esc(x.size)}</small>` : ''}</a>`).join('')}</div>`
    : `<div class="box dl-empty"><p>${p.download ? esc(p.download) + '. ' : ''}Les liens de téléchargement apparaîtront ici dès qu'une version sera prête.</p></div>`}</section>`;
}
function toolsBlock(p) {
  if (!p.tools || !p.tools.length) return '';
  return `<section class="block"><h2 class="sec"><span class="dot"></span>Les outils</h2><div class="tools">${p.tools.map(tl => `<a class="tool" href="${esc(tl.url)}" target="_blank" rel="noopener"><b>${esc(tl.name)} <span aria-hidden="true">↗</span></b><span>${esc(tl.desc)}</span><small>Chrome Web Store · gratuit</small></a>`).join('')}</div></section>`;
}
function filesBlock(p) {
  if (!p.files || !p.files.length) return '';
  return `<section class="block"><h2 class="sec"><span class="dot"></span>Les codes</h2><div class="files">${p.files.map((f, i) => `<div class="file box">
      <div class="file-head"><div><b>${esc(f.name)}</b><small>${esc(f.kind)}</small></div></div>
      <p>${esc(f.desc)}</p>
      <div class="file-actions">
        ${f.install ? `<a class="btn btn-main" href="${esc(f.install)}">${esc(f.installLabel || 'Installer')}</a>` : ''}
        <button type="button" class="btn" data-copy="${esc(f.file)}">Copier le code</button>
        <a class="btn" href="${esc(f.file)}" download>Télécharger</a>
      </div>
      <details class="code" data-src="${esc(f.file)}"><summary>Voir le code</summary><pre><code>Chargement…</code></pre></details>
    </div>`).join('')}</div></section>`;
}
function guideBlock(p) {
  if (!p.guide || !p.guide.length) return '';
  return `<section class="block"><h2 class="sec"><span class="dot"></span>Mode d'emploi express</h2><div class="guide">${p.guide.map(g => `<div class="box step-box"><h3>${esc(g.title)}</h3><ol class="steps">${g.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>${g.alt ? `<p class="alt">${esc(g.alt)}</p>` : ''}</div>`).join('')}</div>
    ${p.notes && p.notes.length ? `<ul class="notes">${p.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</section>`;
}
const codeCache = new Map();
function getCode(src) { if (!codeCache.has(src)) codeCache.set(src, fetch(src).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })); return codeCache.get(src); }
view.addEventListener('toggle', e => {
  const d = e.target; if (!d.matches || !d.matches('details.code') || !d.open || d.dataset.loaded) return;
  d.dataset.loaded = '1';
  getCode(d.dataset.src).then(txt => { d.querySelector('code').textContent = txt; updateTube(); }).catch(() => { d.querySelector('code').textContent = 'Impossible de charger le fichier.'; });
}, true);
view.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if (b) {
    getCode(b.dataset.copy).then(txt => navigator.clipboard.writeText(txt)).then(() => { b.textContent = 'Copié ✓'; say('📋 Code copié dans le presse-papiers.', 2200); setTimeout(() => { b.textContent = 'Copier le code'; }, 2000); })
      .catch(() => { const d = b.closest('.file').querySelector('details'); d.open = true; say('Copie automatique impossible : le code est affiché, sélectionnez-le à la main.', 3500); });
    return;
  }
  const g = e.target.closest('.g-open');
  if (g) openLightbox(+g.dataset.g);
});
let lb = null, lbItems = [], lbIdx = 0;
function openLightbox(i) {
  const pid = (location.hash.match(/#\/p\/([^/]+)/) || [])[1], p = DATA.projects.find(x => x.id === pid); if (!p) return;
  lbItems = galleryItems(p); lbIdx = i;
  if (!lb) {
    lb = document.createElement('dialog'); lb.className = 'lightbox';
    lb.innerHTML = `<figure><img alt=""><figcaption></figcaption></figure><button type="button" class="lb-x" aria-label="Fermer">×</button><button type="button" class="lb-prev" aria-label="Image précédente">‹</button><button type="button" class="lb-next" aria-label="Image suivante">›</button>`;
    document.body.appendChild(lb);
    lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.lb-x') || e.target.tagName === 'IMG') lb.close(); else if (e.target.closest('.lb-prev')) showLb(lbIdx - 1); else if (e.target.closest('.lb-next')) showLb(lbIdx + 1); });
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') showLb(lbIdx - 1); if (e.key === 'ArrowRight') showLb(lbIdx + 1); });
  }
  showLb(i); lb.showModal();
}
function showLb(i) {
  lbIdx = (i + lbItems.length) % lbItems.length; const g = lbItems[lbIdx];
  lb.querySelector('img').src = g.src; lb.querySelector('img').alt = g.alt; lb.querySelector('figcaption').textContent = `${g.caption || ''} · ${lbIdx + 1} / ${lbItems.length}`;
}

/* ---------- Atelier ---------- */
async function getArticle(id) {
  if (articleCache.has(id)) return articleCache.get(id);
  const src = id === 'intro' ? ATELIER.intro : `content/atelier/${id}.html`;
  const html = await fetch(src).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); });
  const tmp = document.createElement('div'); tmp.innerHTML = html;
  tmp.querySelectorAll('#article-tools, script').forEach(n => n.remove());
  const firstP = [...tmp.querySelectorAll('p')].map(p => p.textContent.trim()).find(s => s.length > 60) || '';
  const words = tmp.textContent.trim().split(/\s+/).length;
  const out = { html: tmp.innerHTML, excerpt: firstP, words };
  articleCache.set(id, out); return out;
}
function allArticles() { return ATELIER.sections.flatMap(s => s.items.map(it => Object.assign({ section: s }, it))); }
async function pageAtelier() {
  const items = allArticles();
  await Promise.all(items.map(it => getArticle(it.id).catch(() => null)).concat([getArticle('intro').catch(() => null)]));
  const intro = articleCache.get('intro');
  const introText = intro ? (() => { const d = document.createElement('div'); d.innerHTML = intro.html; return [...d.querySelectorAll('p')].slice(0, 2).map(p => `<p>${p.innerHTML}</p>`).join(''); })() : '';
  const sec = ATELIER.sections.map(s => `
    <h2 class="sec" style="--c:${s.color}"><span class="dot"></span>${esc(s.label)}</h2>
    <div class="grid">${s.items.map(it => {
      const a = articleCache.get(it.id);
      return `<a class="card art" href="#/atelier/${it.id}" style="--c:${s.color}">
        ${it.cover ? `<img class="cover" src="${esc(it.cover)}" alt="" loading="lazy">` : ''}
        <div class="card-top"><span class="kicker small">${esc(s.label)}</span>${a ? `<span class="read">${Math.max(1, Math.round(a.words / 200))} min</span>` : ''}</div>
        <h3>${esc(it.title)}</h3>
        <p class="sum">${esc(a ? (a.excerpt.length > 160 ? a.excerpt.slice(0, 157).trim() + '…' : a.excerpt) : '')}</p>
      </a>`;
    }).join('')}</div>`).join('');
  return `<header class="cat-head" style="--c:#c9a6ff">
      <div class="cat-ico">${pix('book', '#c9a6ff', 44)}</div>
      <div><p class="kicker">Le carnet du savant</p><h1 class="px-title">L'Atelier</h1><p class="lead">Idées, concepts et explorations. Ici on développe, on schématise, on ajoute des images… et on rêve un peu.</p></div>
    </header>
    <section class="box intro-box">${introText}<p><a class="more" href="#/atelier/intro">Lire la définition complète →</a></p></section>
    ${sec}
    ${footer()}`;
}
async function pageArticle(id) {
  const items = allArticles(), i = items.findIndex(x => x.id === id), it = items[i];
  if (!it && id !== 'intro') return page404();
  const a = await getArticle(id);
  const prev = items[i - 1], next = items[i + 1];
  return `<nav class="crumbs"><a href="#/atelier">← Atelier</a>${it ? ` <span>› ${esc(it.section.label)}</span>` : ''}</nav>
    <article class="prose" style="--c:${it ? it.section.color : '#c9a6ff'}">${a.html}</article>
    <nav class="pager">${prev ? `<a href="#/atelier/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="#/atelier/${next.id}">${esc(next.title)} →</a>` : '<span></span>'}</nav>
    ${footer()}`;
}
function page404() {
  return `<section class="hero"><p class="kicker">Erreur 404</p><h1 class="px-title">Fiole introuvable</h1><p class="lead">Cette expérience a dû s'évaporer. <a href="#/">Retour à l'accueil du labo</a>.</p></section>`;
}

/* ---------- la salle d'expérience (plein écran, sans texte) ---------- */
let salleOn = false, salleEl = null, lastRoute = '#/', salleLoading = null;
function loadSalle() {
  if (window.Salle) return Promise.resolve();
  if (!salleLoading) salleLoading = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'js/salle.js'; s.onload = ok; s.onerror = ko; document.body.appendChild(s); });
  return salleLoading;
}
function enterSalle() {
  if (!salleEl) {
    salleEl = document.createElement('div');
    salleEl.className = 'salle'; salleEl.id = 'salle';
    salleEl.innerHTML = `<div class="salle-stage"><canvas id="salle-cvs" role="img" aria-label="Salle d'expérience : le laboratoire du savant fou, à explorer en cliquant sur les objets."></canvas></div>
      <a class="salle-btn salle-exit" href="#/" aria-label="Retour au laboratoire" title="Retour au laboratoire">${pix('door', '#ffb347', 18, true)}</a>
      <button class="salle-btn salle-sound" type="button" aria-pressed="false" aria-label="Activer le son" title="Son">${pix('mute', '#cfe9f2', 18, true)}</button>`;
    document.body.appendChild(salleEl);
    salleEl.querySelector('.salle-exit').addEventListener('click', e => { e.preventDefault(); location.hash = lastRoute === '#/salle' ? '#/' : lastRoute; });
    salleEl.querySelector('.salle-sound').addEventListener('click', () => { if (window.Salle) window.Salle.toggleSound(); });
    window.addEventListener('salle:sound', e => {
      const b = salleEl.querySelector('.salle-sound');
      b.setAttribute('aria-pressed', e.detail); b.setAttribute('aria-label', e.detail ? 'Couper le son' : 'Activer le son');
      b.innerHTML = pix(e.detail ? 'speaker' : 'mute', e.detail ? '#9dff5c' : '#cfe9f2', 18, true);
    });
  }
  salleOn = true; window.LAB = window.LAB || {}; window.LAB.paused = true;
  document.documentElement.classList.add('in-salle');
  document.title = 'Salle d\'expérience · Codex Mental · Laboratoire';
  loadSalle().then(() => { if (salleOn) window.Salle.start(document.getElementById('salle-cvs')); salleEl.querySelector('.salle-exit').focus({ preventScroll: true }); })
    .catch(() => say('La salle est fermée pour le moment : impossible de charger la scène.', 4000));
}
function exitSalle() {
  salleOn = false; if (window.Salle) window.Salle.stop();
  window.LAB.paused = false;
  document.documentElement.classList.remove('in-salle');
}
document.addEventListener('keydown', e => { if (salleOn && e.key === 'Escape') location.hash = lastRoute === '#/salle' ? '#/' : lastRoute; });
/* ---------- univers, salles et portes ---------- */
// change un réglage mémorisé (salle, apparence, animations) puis recharge la page au même endroit
function switchTo(key, val, msg) {
  const K = { theme: ['lab.theme', 'theme'], scheme: ['lab.scheme', 'scheme'], motion: ['lab.motion', 'anim'] }[key];
  try { localStorage.setItem(K[0], val); } catch (err) { /* sans stockage, on passe par l'adresse */ }
  const u = new URL(location.href); u.searchParams.delete(K[1]);
  let ok = null; try { ok = localStorage.getItem(K[0]); } catch (err) { ok = null; }
  if (ok !== val) u.searchParams.set(K[1], val);
  if (msg) say(msg, 1800);
  document.documentElement.classList.add('leaving');
  setTimeout(() => { if (u.href === location.href) location.reload(); else location.replace(u.href); }, key === 'theme' ? 650 : 250);
}
function roomsHere() { const C = window.LAB || {}, U = C.universes && C.universes[C.universe]; return U ? U.rooms.filter(id => C.themes[id]) : []; }
function nextRoom() { const r = roomsHere(), C = window.LAB || {}; return r.length > 1 ? r[(r.indexOf(C.theme) + 1) % r.length] : null; }
/* la porte : un vrai bouton, même place et même taille dans toutes les salles d'un univers */
(function () {
  const C = window.LAB || {}, next = nextRoom();
  if (!next) return;
  const name = C.themes[next].label;
  const pixelDoor = () => {
    const W2 = 12, H2 = 25, r = [];
    const inside = (x, y) => { const cx = 5.5, rr = 6; return y >= 6 ? true : (x - cx) ** 2 + (y - 6) ** 2 <= rr * rr; };
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || y === H2 - 1;
      let col = edge ? '#3a3f4b' : (x % 3 === 0 ? '#45281a' : '#5a3520');
      if (!edge && (y === 9 || y === 19)) col = '#2a1a10';
      if (!edge && (y === 9 || y === 19) && (x === 2 || x === 9)) col = '#8e99a8';
      if (x === 9 && y === 14) col = '#f1cd6a';
      if (edge && y < 4 && x < 6) col = '#5b6273';
      r.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`);
    }
    return `<svg viewBox="0 0 12 25" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">${r.join('')}</svg>`;
  };
  const vecDoor = () => `<svg viewBox="0 0 48 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="dw" x1="0" x2="1"><stop offset="0" stop-color="#6b4426"/><stop offset=".5" stop-color="#4e2f19"/><stop offset="1" stop-color="#2a170b"/></linearGradient>
    <linearGradient id="db" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f6dc8c"/><stop offset=".5" stop-color="#c99a3e"/><stop offset="1" stop-color="#5a3f12"/></linearGradient></defs>
    <path d="M3 99V24a21 21 0 0 1 42 0v75Z" fill="url(#dw)" stroke="url(#db)" stroke-width="3"/>
    <path d="M12 98V28M20 98V22M28 98V22M36 98V28" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
    <path d="M5 40h38M5 78h38" stroke="url(#db)" stroke-width="2.4" opacity=".85"/>
    <circle cx="37" cy="60" r="2.6" fill="#f1cd6a"/><circle cx="24" cy="24" r="7" fill="#0b1014" stroke="url(#db)" stroke-width="1.6"/>
    <circle cx="24" cy="24" r="4.4" fill="#ff6ad5" opacity=".45"/></svg>`;
  const d = document.createElement('button');
  d.type = 'button'; d.className = 'lab-door'; d.dataset.next = name;
  d.setAttribute('aria-label', 'Passer à la salle suivante : ' + name); d.title = 'Salle suivante : ' + name;
  const sciDoor = () => `<svg viewBox="0 0 48 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="sd" x1="0" x2="1"><stop offset="0" stop-color="#dfe6ee"/><stop offset=".5" stop-color="#a7b2bf"/><stop offset="1" stop-color="#59636f"/></linearGradient></defs>
    <path d="M4 99V14q0-10 10-10h20q10 0 10 10v85Z" fill="#1b2433" stroke="url(#sd)" stroke-width="3"/>
    <path d="M8 97V16q0-8 8-8h7v89Z" fill="url(#sd)"/><path d="M25 97V8h7q8 0 8 8v81Z" fill="url(#sd)"/>
    <path d="M23.5 10v86" stroke="#0b1018" stroke-width="2"/><rect x="10" y="44" width="11" height="4" rx="2" fill="#5ff2ff"/><rect x="27" y="44" width="11" height="4" rx="2" fill="#5ff2ff"/>
    <path d="M10 88h28" stroke="#ffcf4a" stroke-width="3" stroke-dasharray="4 3"/></svg>`;
  d.innerHTML = (C.universe === 'pixel' ? pixelDoor() : C.universe === 'orbital' ? sciDoor() : vecDoor()) + `<span class="door-plate" aria-hidden="true">→ ${esc(name)}</span>`;
  d.addEventListener('click', () => window.dispatchEvent(new CustomEvent('lab:door')));
  document.body.appendChild(d);
})();
/* sur mobile, pas de place pour la porte : une petite barre « salle précédente / suivante » */
function prevRoom() { const r = roomsHere(), C = window.LAB || {}; return r.length > 1 ? r[(r.indexOf(C.theme) - 1 + r.length) % r.length] : null; }
(function () {
  const C = window.LAB || {}, rooms = roomsHere();
  if (rooms.length < 2) return;
  const i = rooms.indexOf(C.theme), nav = document.createElement('nav');
  nav.className = 'room-nav'; nav.setAttribute('aria-label', 'Changer de salle');
  nav.innerHTML = `<button type="button" data-room="prev" aria-label="Salle précédente : ${esc(C.themes[prevRoom()].label)}">‹</button>
    <span>${esc(C.themes[C.theme].label)} <small>${i + 1}/${rooms.length}</small></span>
    <button type="button" data-room="next" aria-label="Salle suivante : ${esc(C.themes[nextRoom()].label)}">›</button>`;
  nav.addEventListener('click', e => {
    const b = e.target.closest('[data-room]'); if (!b) return;
    const to = b.dataset.room === 'prev' ? prevRoom() : nextRoom();
    switchTo('theme', to, '🚪 Direction : ' + C.themes[to].label + '.');
  });
  document.body.appendChild(nav);
})();
window.addEventListener('lab:door', () => {
  const next = nextRoom(); if (!next) return;
  switchTo('theme', next, '🚪 La porte grince… direction : ' + window.LAB.themes[next].label + '.');
});

/* ---------- routeur ---------- */
let firstRender = true;
async function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  if (parts[0] === 'salle') { enterSalle(); return; }
  if (salleOn) exitSalle();
  lastRoute = location.hash || '#/';
  let tab = 'accueil', html;
  try {
    if (!parts.length) html = pageHome();
    else if (parts[0] === 'c') { tab = parts[1]; html = pageCat(parts[1]); }
    else if (parts[0] === 'p') { const p = DATA.projects.find(x => x.id === parts[1]); tab = p ? p.cat : 'accueil'; html = pageProject(parts[1]); }
    else if (parts[0] === 'atelier') { tab = 'atelier'; view.innerHTML = '<p class="loading">Ouverture du carnet…</p>'; html = parts.length > 1 ? await pageArticle(parts.slice(1).join('/')) : await pageAtelier(); }
    else html = page404();
  } catch (e) {
    console.error(e);
    html = `<section class="hero"><h1 class="px-title">Explosion mineure</h1><p class="lead">Impossible de charger cette page. Si vous ouvrez le fichier en local, lancez un petit serveur (les fichiers sont chargés par le réseau).</p></section>`;
  }
  view.innerHTML = html;
  view.scrollTop = 0;
  if (parts[0] === 'p') { const pp = DATA.projects.find(x => x.id === parts[1]); if (pp) fillShots(pp); }
  const t = TABS.find(x => x.id === tab) || TABS[0];
  tabsEl.querySelectorAll('.tab').forEach(a => a.setAttribute('aria-selected', a.dataset.id === t.id));
  lab.style.setProperty('--accent', t.color);
  if (window.LabScene) window.LabScene.setAccent(t.color);
  document.title = (t.id === 'accueil' ? '' : t.label + ' · ') + 'Codex Mental · Laboratoire';
  const act = tabsEl.querySelector('[aria-selected="true"]');
  if (act) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (!firstRender) view.focus({ preventScroll: true });
  firstRender = false;
  updateTube();
}
view.addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  const id = b.closest('.filters').dataset.cat;
  filters[id] = b.dataset.f;
  const top = view.scrollTop;
  view.innerHTML = pageCat(id); view.scrollTop = top; updateTube();
});

/* ---------- barre de défilement : l'éprouvette ---------- */
const tube = $('#tube'), glass = $('#tube-glass'), thumb = $('#tube-thumb');
function metrics() {
  const max = view.scrollHeight - view.clientHeight, track = glass.clientHeight;
  const th = Math.max(30, Math.round(track * view.clientHeight / Math.max(1, view.scrollHeight)));
  return { max, track, th };
}
function updateTube() {
  const { max, track, th } = metrics();
  tube.classList.toggle('off', max <= 2);
  const p = max > 0 ? view.scrollTop / max : 0;
  thumb.style.height = th + 'px';
  thumb.style.transform = `translateY(${Math.round((track - th) * p)}px)`;
}
view.addEventListener('scroll', updateTube, { passive: true });
new ResizeObserver(updateTube).observe(view);
new MutationObserver(() => requestAnimationFrame(updateTube)).observe(view, { childList: true, subtree: true });
view.addEventListener('load', updateTube, true);
let drag = null;
thumb.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  drag = { y: e.clientY, top: view.scrollTop }; thumb.setPointerCapture(e.pointerId); tube.classList.add('drag');
});
thumb.addEventListener('pointermove', e => {
  if (!drag) return;
  const { max, track, th } = metrics();
  view.scrollTop = drag.top + (e.clientY - drag.y) * max / Math.max(1, track - th);
});
const endDrag = () => { drag = null; tube.classList.remove('drag'); };
thumb.addEventListener('pointerup', endDrag); thumb.addEventListener('pointercancel', endDrag);
glass.addEventListener('pointerdown', e => {
  if (e.target !== glass) return;
  const r = glass.getBoundingClientRect(), { max, track, th } = metrics();
  view.scrollTo({ top: (e.clientY - r.top - th / 2) / Math.max(1, track - th) * max, behavior: 'smooth' });
});
tube.addEventListener('wheel', e => { view.scrollTop += e.deltaY; e.preventDefault(); }, { passive: false });

/* ---------- réactions à la scène ---------- */
const toast = $('#toast');
function say(msg, ms = 4200) {
  toast.textContent = msg; toast.classList.add('on');
  clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('on'), ms);
}
window.addEventListener('lab:zap', () => { lab.classList.remove('zap'); void lab.offsetWidth; lab.classList.add('zap'); });
window.addEventListener('lab:event', e => {
  const d = e.detail;
  if (d.type === 'blackout' && d.phase === 'start') say('🔌 Panne de courant ! Le savant cherche le disjoncteur…', 4000);
  if (d.type === 'blackout' && d.phase === 'end') say('💡 Courant rétabli.', 2200);
  if (d.type === 'runaway' && d.phase === 'start') say('💥 Réaction incontrôlée dans le ballon !', 3600);
  if (d.type === 'runaway' && d.phase === 'end') say('🧯 Situation maîtrisée. Presque.', 2600);
  if (d.type === 'shower' && d.phase === 'start') say('✦ Pluie d\'étoiles filantes ! Faites un vœu…', 3600);
  if (d.type === 'comet' && d.phase === 'start') say('☄ Une comète traverse le ciel de la coupole.', 3600);
  if (d.type === 'ufo' && d.phase === 'start') say('🛸 Euh… ça, ce n\'est pas dans le catalogue.', 3200);
  if (d.type === 'alert' && d.phase === 'start') say('🚨 Alerte : champ de débris en approche ! Le savant sécurise le module.', 3800);
  if (d.type === 'alert' && d.phase === 'end') say('✅ Débris évités. On respire.', 2400);
  if (d.type === 'flare' && d.phase === 'start') say('☀ Éruption solaire : boucliers du hublot activés.', 3400);
  if (d.type === 'merge' && d.phase === 'start') say('💧 Les bulles ont fusionné en une goutte géante…', 3000);
  if (d.type === 'beam' && d.phase === 'start') say('🛸 Rayon tracteur ! Ils emmènent le professeur…', 3600);
  if (d.type === 'beam' && d.phase === 'end') say('😵 Le professeur est revenu. Un peu décoiffé.', 3000);
  if (d.type === 'storm' && d.phase === 'start') say('🌪 Tempête de poussière sur l\'avant-poste.', 3400);
  if (d.type === 'surge' && d.phase === 'start') say('⚡ Surtension ! La bobine Tesla s\'emballe…', 3600);
  if (d.type === 'surge' && d.phase === 'end') say('🔧 Le savant a coupé le circuit. Ouf.', 2600);
  if (d.type === 'overflow' && d.phase === 'start') say('💥 Le mélange déborde du ballon !', 3400);
  if (d.type === 'overflow' && d.phase === 'end') say('🧯 Mousse sous contrôle.', 2400);
  if (d.type === 'creature' && d.phase === 'start') say('👁 Quelque chose bouge dans la grande cuve…', 3600);
  if (d.type === 'creature' && d.phase === 'end') say('🫧 Le spécimen s\'est rendormi. Pour l\'instant.', 3000);
});
window.addEventListener('lab:creature', e => {
  if (e.detail.phase === 'start') { lab.classList.add('storm'); say('⚡ Expérience n°31 en cours… reculez de la paillasse !', 3800); }
  if (e.detail.phase === 'alive') { say('🧟 Sujet réanimé avec succès. Il s\'est échappé par la droite… le chimiste le poursuit !', 5200); setTimeout(() => lab.classList.remove('storm'), 4000); }
});

/* ---------- réglages : univers, apparence, animations ---------- */
const setBtn = $('#set-btn'), setPanel = $('#set-panel');
const MOTIONS = [['full', 'Vivantes', 'Tout bouge, avec les incidents du labo.'], ['calm', 'Calmes', 'Moins d\'éclairs, pas d\'incidents.'], ['off', 'Figées', 'Une image fixe du labo.']];
const SCHEMES = [['auto', 'Auto', 'Suit le réglage de votre appareil.'], ['dark', 'Sombre', 'Bleu nuit, doux pour les yeux.'], ['light', 'Clair', 'Fond clair, pour la lecture en plein jour.']];
function buildSettings() {
  const C = window.LAB || {}, U = C.universes || {}, pro = C.universe === 'pro';
  $('.set-ico').innerHTML = pix(pro ? 'flask' : 'potion', pro ? '#8b9cff' : (C.universe === 'vecto' ? '#f0c46a' : '#c9993a'), pro || C.universe === 'vecto' ? 16 : 14);
  const rooms = roomsHere();
  setPanel.innerHTML = `
    <p class="set-h" id="set-h1">Univers</p>
    <div class="set-list" role="radiogroup" aria-labelledby="set-h1">
      ${Object.entries(U).map(([id, un]) => `<button type="button" class="opt${un.soon ? ' soon' : ''}" role="radio" aria-checked="${id === C.universe}" ${un.soon ? 'aria-disabled="true"' : ''} data-set="universe" data-val="${id}"><span class="sw sw-${id}" aria-hidden="true"></span><span><b>${esc(un.label)}${un.soon ? ' <em>bientôt</em>' : ''}</b><small>${esc(un.desc)}${!un.soon && un.rooms.length > 1 ? ` · ${un.rooms.length} salles` : ''}</small></span></button>`).join('')}
    </div>
    ${rooms.length > 1 ? `<p class="set-h" id="set-h3">Salles</p><div class="set-row set-rooms" role="radiogroup" aria-labelledby="set-h3">${rooms.map(id => `<button type="button" class="opt opt-s" role="radio" aria-checked="${id === C.theme}" data-set="theme" data-val="${id}">${esc(C.themes[id].label)}</button>`).join('')}</div>` : ''}
    ${pro ? `<p class="set-h" id="set-h2">Apparence</p>
    <div class="set-row" role="radiogroup" aria-labelledby="set-h2">
      ${SCHEMES.map(([id, label, d]) => `<button type="button" class="opt opt-s" role="radio" aria-checked="${id === C.scheme}" data-set="scheme" data-val="${id}" title="${esc(d)}">${label}</button>`).join('')}
    </div>
    <p class="set-note">${esc((SCHEMES.find(m => m[0] === C.scheme) || SCHEMES[0])[2])}</p>` : `<p class="set-h" id="set-h2">Animations</p>
    <div class="set-row" role="radiogroup" aria-labelledby="set-h2">
      ${MOTIONS.map(([id, label, d]) => `<button type="button" class="opt opt-s" role="radio" aria-checked="${id === C.motion}" data-set="motion" data-val="${id}" title="${esc(d)}">${label}</button>`).join('')}
    </div>
    <p class="set-note">${esc((MOTIONS.find(m => m[0] === C.motion) || MOTIONS[0])[2])}</p>`}`;
}
function openSettings(open) {
  setPanel.hidden = !open; setBtn.setAttribute('aria-expanded', open);
  if (open) { const cur = setPanel.querySelector('[aria-checked="true"]'); if (cur) cur.focus(); }
}
setBtn.addEventListener('click', e => { e.stopPropagation(); openSettings(setPanel.hidden); });
document.addEventListener('click', e => { if (!setPanel.hidden && !e.target.closest('.settings')) openSettings(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !setPanel.hidden) { openSettings(false); setBtn.focus(); } });
function goUniverse(id) {
  const C = window.LAB || {}, U = C.universes[id];
  if (!U || U.soon) { say('🛰 La station orbitale est encore en construction. Revenez bientôt !', 2600); return; }
  if (id === C.universe) { openSettings(false); return; }
  switchTo('theme', U.rooms[0], id === 'pro' ? '✦ Retour à la vitrine…' : '⚗ Ouverture du ' + U.label.toLowerCase() + '…');
}
setPanel.addEventListener('click', e => {
  const b = e.target.closest('.opt'); if (!b) return;
  const key = b.dataset.set, val = b.dataset.val, C = window.LAB || {};
  if (key === 'universe') { goUniverse(val); return; }
  if ((key === 'theme' && val === C.theme) || (key === 'motion' && val === C.motion) || (key === 'scheme' && val === C.scheme)) { openSettings(false); return; }
  if (key === 'scheme') {   // l'apparence change sans recharger
    try { localStorage.setItem('lab.scheme', val); } catch (err) { /* rien */ }
    C.scheme = val; const light = val === 'auto' ? matchMedia('(prefers-color-scheme: light)').matches : val === 'light';
    document.documentElement.dataset.scheme = light ? 'light' : 'dark';
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = light ? '#f4f6fa' : '#0f1521';
    buildSettings(); openSettings(true); return;
  }
  switchTo(key, val, key === 'theme' ? '🚪 Changement de salle…' : '⚙ Réglage des machines…');
});
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { e.preventDefault(); goUniverse(b.dataset.go); } });
buildSettings();

/* ---------- sortie du labo : toujours un chemin visible vers la Vitrine ---------- */
if (window.LAB && window.LAB.universe !== 'pro') {
  const ex = document.createElement('button');
  ex.type = 'button'; ex.className = 'set-btn exit-btn'; ex.dataset.go = 'pro';
  ex.title = 'Quitter le labo et revenir à la Vitrine'; ex.setAttribute('aria-label', 'Revenir à la Vitrine');
  ex.innerHTML = '<span aria-hidden="true">←</span><span class="set-txt">Vitrine</span>';
  $('.settings').before(ex);
}

/* ---------- ranger l'écran pour admirer le labo (thème Grand labo) ---------- */
(function () {
  const head = $('.lab-head');
  const away = document.createElement('button');
  away.type = 'button'; away.className = 'away-btn'; away.title = 'Ranger l\'écran pour admirer le laboratoire'; away.setAttribute('aria-label', 'Ranger l\'écran');
  away.innerHTML = '<span aria-hidden="true">⤓</span>';
  head.insertBefore(away, $('.settings'));
  const call = document.createElement('button');
  call.type = 'button'; call.className = 'call-btn'; call.textContent = 'Rouvrir l\'écran';
  document.body.appendChild(call);
  const setAway = on => { document.documentElement.classList.toggle('panel-away', on); (on ? call : away).focus({ preventScroll: true }); };
  away.addEventListener('click', () => setAway(true));
  call.addEventListener('click', () => setAway(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.documentElement.classList.contains('panel-away')) setAway(false); });
})();

/* ---------- démarrage ---------- */
window.addEventListener('hashchange', route);
load().then(route).catch(err => {
  console.error(err);
  view.innerHTML = '<section class="hero"><h1 class="px-title">Explosion mineure</h1><p class="lead">Les données du labo n\'ont pas pu être chargées.</p></section>';
});
})();
