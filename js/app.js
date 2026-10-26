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
  bolt: ['....##..', '...##...', '..##....', '.######.', '....##..', '...##...', '..##....', '.##.....']
};
function pix(name, color, size = 32) {
  const rows = ICONS[name] || ICONS.flask, wd = Math.max(...rows.map(r => r.length)), ht = rows.length;
  let r = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const fill = ch === '#' ? color : ch === 'o' ? '#cfe9f2' : ch === 'c' ? '#8a5a34' : null;
    if (fill) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
  }));
  return `<svg class="pix" viewBox="0 0 ${wd} ${ht}" width="${size}" height="${Math.round(size * ht / wd)}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const CAT_ICON = { applications: 'flask', logiciels: 'tube', web: 'beaker', jeux: 'potion' };

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
function footer() {
  const hw = window.LAB && window.LAB.halloween;
  return `<footer class="lab-foot">
    <p class="hint">${hw ? '🎃 Saison d\'Halloween : la bobine Tesla semble… agitée. Trois décharges rapprochées, et qui sait ?' : (document.documentElement.dataset.theme === 'alchimie' ? '⚗ Astuce : la bobine Tesla réagit aux clics, et le ballon de réaction aime les gouttes de réactif.' : '⚡ Astuce : la bobine Tesla, à gauche, réagit aux clics. Les fioles de l\'étagère aussi.')}</p>
    <p>Codex Mental · Laboratoire <span class="sep">/</span> <a href="https://codexmental.com">retour au Codex</a></p>
  </footer>`;
}

/* ---------- pages ---------- */
function pageHome() {
  const inv = DATA.categories.map(c => {
    const ps = projectsOf(c.id), n1 = ps.filter(p => p.status === 'cours').length, n2 = ps.length - n1;
    return `<a class="shelf" href="#/c/${c.id}" style="--c:${c.color}">
      ${pix(CAT_ICON[c.id], c.color, 30)}
      <b>${esc(c.label)}</b>
      <small>${n1} en cours${n2 ? ` · ${n2} en réflexion` : ''}</small>
    </a>`;
  }).join('') + `<a class="shelf" href="#/atelier" style="--c:#c9a6ff">${pix('book', '#c9a6ff', 30)}<b>Atelier</b><small>${ATELIER.sections.reduce((s, x) => s + x.items.length, 0)} dossiers d'idées</small></a>`;
  const now = DATA.projects.filter(p => p.status === 'cours').slice(0, 3).map(card).join('');
  return `<section class="hero">
      <p class="kicker"><span class="prompt">&gt;</span> ouverture du labo… ok <span class="caret"></span></p>
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
  const specs = [['État', p.state], ['Accès', p.access], ['Diffusion', p.diffusion], ['Licence', p.license], ['Téléchargement', p.download], ['Technologies', p.tech], ['Prochaines étapes', p.next], ['Objectif', p.goal], ['Lien', p.link]]
    .filter(r => r[1]).map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join('');
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
      ${p.shot ? `<figure class="shot"><img src="${esc(p.shot)}" alt="${esc(p.shotAlt || '')}" loading="lazy"><figcaption>${esc(p.shotAlt || '')}</figcaption></figure>` : ''}
      <div class="d-cols">
        ${list('Fonctionnalités', p.features)}
        ${specs ? `<section class="box"><h2>Fiche technique</h2><dl class="specs">${specs}</dl></section>` : ''}
      </div>
      ${list('Pistes de développement', p.dev)}
      ${p.play ? `<p class="play"><a class="play-btn" href="${esc(p.play)}">${pix('door', '#ffb347', 18)} Entrer dans la salle</a></p>` : ''}
      ${tags(p.tags)}
    </article>
    <nav class="pager">${prev ? `<a href="#/p/${prev.id}">← ${esc(prev.name)}</a>` : '<span></span>'}${next ? `<a href="#/p/${next.id}">${esc(next.name)} →</a>` : '<span></span>'}</nav>
    ${footer()}`;
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
      <a class="salle-btn salle-exit" href="#/" aria-label="Retour au laboratoire" title="Retour au laboratoire">${pix('door', '#ffb347', 18)}</a>
      <button class="salle-btn salle-sound" type="button" aria-pressed="false" aria-label="Activer le son" title="Son">${pix('mute', '#cfe9f2', 18)}</button>`;
    document.body.appendChild(salleEl);
    salleEl.querySelector('.salle-exit').addEventListener('click', e => { e.preventDefault(); location.hash = lastRoute === '#/salle' ? '#/' : lastRoute; });
    salleEl.querySelector('.salle-sound').addEventListener('click', () => { if (window.Salle) window.Salle.toggleSound(); });
    window.addEventListener('salle:sound', e => {
      const b = salleEl.querySelector('.salle-sound');
      b.setAttribute('aria-pressed', e.detail); b.setAttribute('aria-label', e.detail ? 'Couper le son' : 'Activer le son');
      b.innerHTML = pix(e.detail ? 'speaker' : 'mute', e.detail ? '#9dff5c' : '#cfe9f2', 18);
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
window.addEventListener('lab:door', () => { say('🚪 Une porte grince… vous entrez dans la salle d\'expérience.', 2600); location.hash = '#/salle'; });

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
});
window.addEventListener('lab:creature', e => {
  if (e.detail.phase === 'start') { lab.classList.add('storm'); say('⚡ Expérience n°31 en cours… reculez de la paillasse !', 3800); }
  if (e.detail.phase === 'alive') { say('🧟 Sujet réanimé avec succès. Il s\'est échappé par la droite… le chimiste le poursuit !', 5200); setTimeout(() => lab.classList.remove('storm'), 4000); }
});

/* ---------- réglages : thème et animations ---------- */
const setBtn = $('#set-btn'), setPanel = $('#set-panel');
const THEME_DESC = { pixel: 'Étagère de fioles, bobine Tesla et petit chimiste.', alchimie: 'Paillasse et circuit de fluides qui tourne en boucle.' };
const MOTIONS = [['full', 'Vivantes', 'Tout bouge, avec les incidents du labo.'], ['calm', 'Calmes', 'Moins d\'éclairs, pas d\'incidents.'], ['off', 'Figées', 'Une image fixe du labo.']];
function buildSettings() {
  const C = window.LAB || {};
  $('.set-ico').innerHTML = pix('potion', '#c9993a', 14);
  setPanel.innerHTML = `
    <p class="set-h" id="set-h1">Thème du labo</p>
    <div class="set-list" role="radiogroup" aria-labelledby="set-h1">
      ${Object.entries(C.themes || {}).map(([id, th]) => `<button type="button" class="opt" role="radio" aria-checked="${id === C.theme}" data-set="theme" data-val="${id}"><span class="sw sw-${id}" aria-hidden="true"></span><span><b>${esc(th.label)}</b><small>${esc(THEME_DESC[id] || '')}</small></span></button>`).join('')}
    </div>
    <p class="set-h" id="set-h2">Animations</p>
    <div class="set-row" role="radiogroup" aria-labelledby="set-h2">
      ${MOTIONS.map(([id, label, d]) => `<button type="button" class="opt opt-s" role="radio" aria-checked="${id === C.motion}" data-set="motion" data-val="${id}" title="${esc(d)}">${label}</button>`).join('')}
    </div>
    <p class="set-note">${esc((MOTIONS.find(m => m[0] === C.motion) || MOTIONS[0])[2])}</p>`;
}
function openSettings(open) {
  setPanel.hidden = !open; setBtn.setAttribute('aria-expanded', open);
  if (open) { const cur = setPanel.querySelector('[aria-checked="true"]'); if (cur) cur.focus(); }
}
setBtn.addEventListener('click', e => { e.stopPropagation(); openSettings(setPanel.hidden); });
document.addEventListener('click', e => { if (!setPanel.hidden && !e.target.closest('.settings')) openSettings(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !setPanel.hidden) { openSettings(false); setBtn.focus(); } });
setPanel.addEventListener('click', e => {
  const b = e.target.closest('.opt'); if (!b) return;
  const key = b.dataset.set, val = b.dataset.val, C = window.LAB || {};
  if ((key === 'theme' && val === C.theme) || (key === 'motion' && val === C.motion)) { openSettings(false); return; }
  try { localStorage.setItem(key === 'theme' ? 'lab.theme' : 'lab.motion', val); } catch (err) { /* stockage indisponible : on passe par l'adresse */ }
  const u = new URL(location.href);
  u.searchParams.delete('theme'); u.searchParams.delete('anim');
  let stored = null; try { stored = localStorage.getItem(key === 'theme' ? 'lab.theme' : 'lab.motion'); } catch (err) { stored = null; }
  if (stored !== val) u.searchParams.set(key === 'theme' ? 'theme' : 'anim', val);
  say(key === 'theme' ? '⚗ Changement de laboratoire…' : '⚙ Réglage des machines…', 1500);
  setTimeout(() => { location.href = u.toString(); if (u.pathname === location.pathname && u.search === location.search) location.reload(); }, 250);
});
buildSettings();

/* ---------- démarrage ---------- */
window.addEventListener('hashchange', route);
load().then(route).catch(err => {
  console.error(err);
  view.innerHTML = '<section class="hero"><h1 class="px-title">Explosion mineure</h1><p class="lead">Les données du labo n\'ont pas pu être chargées.</p></section>';
});
})();
