/* ==========================================================================
   CODEX MENTAL · LAB — univers NEXUS (écran des années 80)
   Chargé seulement quand l'univers « nexus » est actif.
   - logo et nom NEXUS LAB dans l'en-tête
   - écran de démarrage, une fois par session
   - console toujours visible en bas : on tape un nom de fiche, une rubrique, ou help
   - réglages en plus : palette, police, intensité de l'effet cathodique
   - images : si « nom-old.ext » existe à côté de « nom.ext », NEXUS l'affiche à la place
   ========================================================================== */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const root = document.documentElement;
const C = window.LAB || {};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* pas de stockage : réglage pour cette visite */ } };
const say = (m, ms) => window.LabSay && window.LabSay(m, ms);

const PALETTES = [
  ['glacier', 'Glacier', '#7fe7ef'], ['ambre', 'Ambre', '#ffb000'], ['cuivre', 'Cuivre', '#ff8a5c'],
  ['lavande', 'Lavande', '#b9a2ff'], ['bleu', 'Bleu', '#3d9bff'], ['menthe', 'Menthe', '#6fd3a6']
];
const FONTS = [
  ['ecran', 'Écran', 'Police de terminal, lisible.'],
  ['pixel', 'Pixel', 'Plus rétro, plus grande.'],
  ['lisible', 'Lisible', 'Police classique, pour les longues lectures.']
];

/* ---------- logo et nom ---------- */
const LOGO = `<svg viewBox="0 0 64 64" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
  <circle cx="32" cy="32" r="7" fill="currentColor"/><circle cx="32" cy="10" r="4.5"/><circle cx="12" cy="46" r="4.5"/><circle cx="52" cy="46" r="4.5"/>
  <line x1="32" y1="25" x2="32" y2="15"/><line x1="26" y1="36" x2="16" y2="43"/><line x1="38" y1="36" x2="48" y2="43"/>
  <circle cx="32" cy="32" r="17" stroke-width="2" stroke-dasharray="2 4" opacity=".55"/></svg>`;
function brandUp() {
  const ico = $('.brand-ico'), name = $('.brand-name');
  if (ico) ico.innerHTML = LOGO;
  if (name) name.innerHTML = 'NEXUS<b>LAB</b>';
}
brandUp();
window.addEventListener('lab:ready', brandUp);   // le moteur repose sa fiole une fois les données chargées
const brand = $('.brand'); if (brand) brand.setAttribute('aria-label', 'Accueil de NEXUS LAB');
const setIco = $('.set-ico'); if (setIco) setIco.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>';
const setTxt = $('#set-btn .set-txt'); if (setTxt) setTxt.textContent = 'Réglages';

/* ---------- écran de démarrage (une fois par session) ---------- */
(function boot() {
  let seen = true;
  try { seen = !!sessionStorage.getItem('nexus.boot'); sessionStorage.setItem('nexus.boot', '1'); } catch (e) { seen = true; }
  if (seen || C.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lines = ['NEXUS BIOS v5.0', 'mémoire ............ 640 Ko ....... OK', 'processeur ......... 4 cœurs ...... OK', 'réseau ............. liens établis . OK', 'chargement de NEXUS LAB…', 'bienvenue.'];
  const el = document.createElement('div');
  el.className = 'nx-boot'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = lines.map(l => `<div>${esc(l)}</div>`).join('') + '<div class="nx-skip">appuyez sur une touche pour continuer</div>';
  document.body.appendChild(el);
  const rows = [...el.children];
  const timers = rows.map((r, i) => setTimeout(() => r.classList.add('on'), 200 + i * 240));
  const end = () => { timers.forEach(clearTimeout); el.classList.add('off'); setTimeout(() => el.remove(), 300); document.removeEventListener('keydown', end); };
  timers.push(setTimeout(end, 200 + rows.length * 240 + 800));
  el.addEventListener('click', end); document.addEventListener('keydown', end);
})();

/* ---------- réglages en plus : palette, police, écran ---------- */
function applyPalette(id) {
  if (!PALETTES.some(p => p[0] === id)) return false;
  root.dataset.nxpal = id; save('nexus.palette', id); markSettings(); return true;
}
function applyFont(id) {
  if (!FONTS.some(f => f[0] === id)) return false;
  root.dataset.nxfont = id; save('nexus.font', id); markSettings(); return true;
}
function applyFx(v) {
  v = Math.max(0, Math.min(100, Math.round(+v)));
  root.style.setProperty('--nx-fx', (v / 100).toFixed(2)); save('nexus.fx', v);
  const r = $('#nx-fx'); if (r) r.value = v;
  return v;
}
function currentFx() { return Math.round(parseFloat(getComputedStyle(root).getPropertyValue('--nx-fx') || '0') * 100); }
const setPanel = $('#set-panel');
if (setPanel) {
  setPanel.insertAdjacentHTML('beforeend', `
    <p class="set-h" id="nx-h1">Palette</p>
    <div class="nx-row" role="radiogroup" aria-labelledby="nx-h1">${PALETTES.map(([id, label, c]) => `<button type="button" class="nx-opt" role="radio" data-nxpal="${id}" style="--sw:${c}"><span class="nx-sw" aria-hidden="true"></span>${label}</button>`).join('')}</div>
    <p class="set-h" id="nx-h2">Police</p>
    <div class="nx-row" role="radiogroup" aria-labelledby="nx-h2">${FONTS.map(([id, label, d]) => `<button type="button" class="nx-opt nx-font-${id}" role="radio" data-nxfont="${id}" title="${esc(d)}">${label}</button>`).join('')}</div>
    <p class="set-h"><label for="nx-fx">Effet cathodique</label></p>
    <div class="nx-range"><span aria-hidden="true">net</span><input type="range" id="nx-fx" min="0" max="100" step="5" value="${currentFx()}"><span aria-hidden="true">fort</span></div>`);
  setPanel.addEventListener('click', e => {
    const b = e.target.closest('.nx-opt'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.nxpal) applyPalette(b.dataset.nxpal);
    if (b.dataset.nxfont) applyFont(b.dataset.nxfont);
  });
  $('#nx-fx').addEventListener('input', e => applyFx(e.target.value));
  markSettings();
}
function markSettings() {
  document.querySelectorAll('.nx-opt[data-nxpal]').forEach(b => b.setAttribute('aria-checked', b.dataset.nxpal === root.dataset.nxpal));
  document.querySelectorAll('.nx-opt[data-nxfont]').forEach(b => b.setAttribute('aria-checked', b.dataset.nxfont === root.dataset.nxfont));
}

/* ---------- images « old » : nom-old.ext à côté de nom.ext ---------- */
const oldCache = new Map();
function oldSrc(src) { const m = /^(.*?)(\.(webp|png|jpe?g|svg))(\?.*)?$/i.exec(src); return m && !/-old$/.test(m[1]) ? m[1] + '-old' + m[2] : null; }
function probe(src) {
  if (!oldCache.has(src)) oldCache.set(src, new Promise(ok => { const im = new Image(); im.onload = () => ok(true); im.onerror = () => ok(false); im.src = src; }));
  return oldCache.get(src);
}
function retro(scope) {
  scope.querySelectorAll('img:not([data-nx])').forEach(img => {
    img.dataset.nx = '1';
    const raw = img.getAttribute('src') || '', alt = oldSrc(raw);
    if (!alt || /^data:/.test(raw)) { img.classList.add('nx-tint'); return; }
    probe(alt).then(ok => { if (ok) { img.src = alt; img.classList.add('nx-old'); } else img.classList.add('nx-tint'); });
  });
}
const view = $('#view');
if (view) { new MutationObserver(() => retro(view)).observe(view, { childList: true, subtree: true }); retro(view); }

/* ---------- la console ---------- */
const con = document.createElement('div');
con.className = 'nx-console'; con.id = 'nx-console';
con.innerHTML = `<div class="nx-out" id="nx-out" role="log" aria-live="polite" aria-label="Journal de la console"></div>
  <form class="nx-line" id="nx-form" autocomplete="off">
    <label class="nx-prompt" for="nx-cmd"><span class="nx-host">visiteur@nexus:~</span>$</label>
    <input id="nx-cmd" name="cmd" spellcheck="false" autocapitalize="off" enterkeyhint="go" placeholder="tapez help, une rubrique ou un nom de fiche">
    <button type="button" class="nx-log-btn" id="nx-log" aria-expanded="false" aria-controls="nx-out">journal</button>
  </form>`;
document.body.appendChild(con);
root.classList.add('nx-has-console');
const out = $('#nx-out'), cmd = $('#nx-cmd'), logBtn = $('#nx-log');
const hist = []; let hIdx = 0;

function openLog(on) { con.classList.toggle('open', on); logBtn.setAttribute('aria-expanded', on); }
function print(text, cls, quiet) {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.textContent = text;
  out.appendChild(d);
  while (out.children.length > 200) out.firstChild.remove();
  out.scrollTop = out.scrollHeight;
  if (!quiet) openLog(true);
}
function printLink(label, href, extra) {
  const d = document.createElement('div');
  d.innerHTML = `<a href="${esc(href)}">${esc(label)}</a>${extra ? ' <span class="nx-dim">' + esc(extra) + '</span>' : ''}`;
  out.appendChild(d); out.scrollTop = out.scrollHeight; openLog(true);
}

// tout ce qu'on peut ouvrir : rubriques, fiches, articles de l'Atelier
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function index() {
  const D = window.LABDATA; if (!D) return [];
  const list = [{ key: 'accueil', label: 'Accueil', href: '#/', kind: 'rubrique' }];
  D.categories.forEach(c => list.push({ key: norm(c.id), alias: [norm(c.label)], label: c.label, href: '#/c/' + c.id, kind: 'rubrique' }));
  list.push({ key: 'atelier', label: 'Atelier', href: '#/atelier', kind: 'rubrique' });
  D.projects.forEach(p => list.push({ key: norm(p.id), alias: [norm(p.name)], label: p.name, href: '#/p/' + p.id, kind: 'fiche', cat: p.cat }));
  D.atelier.sections.forEach(s => s.items.forEach(it => list.push({ key: norm(it.id.split('/').pop()), alias: [norm(it.title), norm(it.id)], label: it.title, href: '#/atelier/' + it.id, kind: 'article', cat: 'atelier' })));
  return list;
}
function find(q) {
  const k = norm(q); if (!k) return [];
  const L = index();
  const exact = L.filter(x => x.key === k || (x.alias || []).includes(k));
  if (exact.length) return exact;
  return L.filter(x => x.key.startsWith(k) || (x.alias || []).some(a => a.startsWith(k) || a.includes(k)));
}
function go(x) { print('ouverture : ' + x.label, 'nx-ok'); location.hash = x.href.slice(1) ? x.href : '#/'; }

const HELP = [
  'tapez directement :',
  '  un nom de fiche        noxdl, perimgo-home…  → ouvre la fiche',
  '  une rubrique           logiciels, jeux, atelier, accueil',
  '  un mot du titre        reseau, polaris…  → ouvre l\'article',
  'commandes :',
  '  ls [rubrique]          liste les fiches (ou celles d\'une rubrique)',
  '  cd <rubrique>          va dans une rubrique ; cd .. revient à l\'accueil',
  '  open <nom>             ouvre une fiche ou un article',
  '  palette <nom>          glacier, ambre, cuivre, lavande, bleu, menthe',
  '  police <nom>           ecran, pixel, lisible',
  '  fx <0-100>             intensité de l\'effet cathodique',
  '  reglages               ouvre le panneau des réglages',
  '  vitrine                quitte NEXUS pour la Vitrine',
  '  clear                  vide le journal',
  'astuces : touche / pour revenir ici, flèches ↑ ↓ pour l\'historique, Tab pour compléter.'
].join('\n');

function openThing(arg) {
  const hits = find(arg);
  if (!hits.length) { print(`introuvable : « ${arg} ». tapez ls pour voir la liste.`, 'nx-err'); return; }
  if (hits.length === 1) { go(hits[0]); return; }
  print(`${hits.length} résultats pour « ${arg} » :`);
  hits.slice(0, 12).forEach(x => printLink(x.label, x.href, x.kind));
}
const COMMANDS = {
  help: () => print(HELP, 'nx-ok'),
  aide: () => print(HELP, 'nx-ok'),
  ls: arg => {
    const D = window.LABDATA; if (!D) return print('les données chargent encore…');
    const where = arg ? find(arg).find(x => x.kind === 'rubrique') : null;
    if (arg && !where) return print(`rubrique inconnue : « ${arg} »`, 'nx-err');
    const id = where ? where.href.split('/').pop() : null;
    if (!where || where.key === 'accueil') {
      D.categories.forEach(c => print(`${(c.id + '/').padEnd(16)}${D.projects.filter(p => p.cat === c.id).length} fiches`));
      return print(`${'atelier/'.padEnd(16)}${D.atelier.sections.reduce((s, x) => s + x.items.length, 0)} articles`);
    }
    if (id === 'atelier') return D.atelier.sections.forEach(s => s.items.forEach(it => printLink(it.title, '#/atelier/' + it.id, s.label)));
    D.projects.filter(p => p.cat === id).forEach(p => printLink(p.id, '#/p/' + p.id, p.name));
  },
  cd: arg => {
    if (!arg || arg === '..' || arg === '~' || arg === '/') return go({ label: 'Accueil', href: '#/' });
    const r = find(arg).find(x => x.kind === 'rubrique');
    r ? go(r) : print(`rubrique inconnue : « ${arg} »`, 'nx-err');
  },
  open: arg => arg ? openThing(arg) : print('usage : open <nom>'),
  palette: arg => applyPalette(norm(arg)) ? print('palette : ' + norm(arg), 'nx-ok') : print('palettes : ' + PALETTES.map(p => p[0]).join(', ')),
  police: arg => applyFont(norm(arg)) ? print('police : ' + norm(arg), 'nx-ok') : print('polices : ' + FONTS.map(f => f[0]).join(', ')),
  font: arg => COMMANDS.police(arg),
  fx: arg => (arg === '' || isNaN(+arg)) ? print('usage : fx <0-100> (actuel : ' + currentFx() + ')') : print('effet cathodique : ' + applyFx(arg), 'nx-ok'),
  reglages: () => { const b = $('#set-btn'); if (b) b.click(); },
  vitrine: () => { const b = document.querySelector('[data-go="pro"]'); if (b) b.click(); },
  clear: () => { out.innerHTML = ''; openLog(false); },
  cls: () => COMMANDS.clear(),
  whoami: () => print('visiteur. bienvenue dans le labo de Codex Mental.', 'nx-ok'),
  date: () => print(new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }), 'nx-ok'),
  pwd: () => print('/' + (location.hash.replace(/^#\/?/, '') || ''), 'nx-ok'),
  exit: () => COMMANDS.vitrine(),
  sudo: () => print('accès refusé. bien essayé.', 'nx-err')
};
function run(raw) {
  const line = raw.trim(); if (!line) return;
  print('$ ' + line, 'nx-cmd');
  hist.push(line); hIdx = hist.length;
  const [w, ...rest] = line.split(/\s+/), key = norm(w).replace(/-/g, ''), arg = rest.join(' ');
  if (COMMANDS[key]) return COMMANDS[key](arg);
  openThing(line);
}
$('#nx-form').addEventListener('submit', e => { e.preventDefault(); const v = cmd.value; cmd.value = ''; run(v); });
cmd.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hIdx = Math.max(0, hIdx - 1); cmd.value = hist[hIdx]; }
  else if (e.key === 'ArrowDown' && hist.length) { e.preventDefault(); hIdx = Math.min(hist.length, hIdx + 1); cmd.value = hist[hIdx] || ''; }
  else if (e.key === 'Tab' && cmd.value.trim()) {
    e.preventDefault();
    const parts = cmd.value.split(/\s+/), last = parts.pop(), pool = Object.keys(COMMANDS).concat(index().map(x => x.key));
    const hits = [...new Set(pool.filter(k => k.startsWith(norm(last))))];
    if (hits.length === 1) cmd.value = parts.concat(hits[0]).join(' ') + ' ';
    else if (hits.length > 1) print(hits.slice(0, 20).join('  '));
  }
  else if (e.key === 'Escape') { openLog(false); cmd.blur(); }
});
logBtn.addEventListener('click', () => openLog(!con.classList.contains('open')));
out.addEventListener('click', e => { if (e.target.closest('a')) cmd.focus({ preventScroll: true }); });
document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
  const a = document.activeElement;
  if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
  e.preventDefault(); cmd.focus();
});

// le journal reste replié au départ : on l'ouvre en tapant, ou avec le bouton
print('NEXUS OS 5.0 prêt. tapez help pour la liste des commandes.', '', true);
})();
