/* ==========================================================================
   CODEX MENTAL · LAB — scène pixel art du laboratoire
   Tout est dessiné en code sur un canvas basse résolution, agrandi en
   "pixelated" par le navigateur. Aucune image externe.
   ========================================================================== */
(() => {
'use strict';

const cvs = document.getElementById('scene');
if (!cvs) return;
const x = cvs.getContext('2d');
const back = document.createElement('canvas');
const bx = back.getContext('2d');

const mq = matchMedia('(prefers-reduced-motion: reduce)');
let reduce = mq.matches;
const HALLOWEEN = !!(window.LAB && window.LAB.halloween);
const FPS = 24;

/* ---------- outils ---------- */
const F = Math.floor;
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => F(rnd(a, b + 1));
const pick = a => a[F(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function hex2rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function shade(h, k) {
  const c = hex2rgb(h).map(v => clamp(Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)), 0, 255));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
function rgba(h, a) { const [r, g, b] = hex2rgb(h); return `rgba(${r},${g},${b},${a})`; }
function liq(hex) { return { c: hex, hi: shade(hex, .5), lo: shade(hex, -.4), dk: shade(hex, -.6) }; }

const C = {
  void: '#07080b', mortar: '#0d0f14',
  wood: '#6b3f22', woodHi: '#8f5a33', woodLo: '#3b2213', woodDk: '#24140a',
  cu: '#b8692f', cuHi: '#e39a55', cuLo: '#6e3a18',
  brass: '#c9993a', brassHi: '#f1cd6a', brassLo: '#7a5a1c',
  iron: '#3a3f4b', ironHi: '#5b6273', ironLo: '#23262e', steel: '#8e99a8', silver: '#c9d2dc',
  dark: '#14161c', white: '#f4f7f8',
  cyan: '#6ff3ff', lime: '#9dff5c', pink: '#ff6ad5', amber: '#ffb347', violet: '#b48cff',
  green: '#4dff9a', red: '#ff5a5a', blue: '#5aa8ff', orange: '#ff8c1a'
};
const LIQ = [C.cyan, C.lime, C.pink, C.amber, C.violet, C.green, C.red, C.blue].map(liq);
const LIQ_H = [C.lime, C.orange, C.green, C.violet, '#c6ff3d', C.amber].map(liq);
const POOL = HALLOWEEN ? LIQ_H : LIQ;

/* ---------- primitives pixel ---------- */
function R(c, X, Y, W, H, col) { c.fillStyle = col; c.fillRect(F(X), F(Y), W, H); }
function P(c, X, Y, col) { c.fillStyle = col; c.fillRect(F(X), F(Y), 1, 1); }
function linePts(x0, y0, x1, y1) {
  x0 = F(x0); y0 = F(y0); x1 = F(x1); y1 = F(y1);
  const out = [], dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let e = dx + dy, n = 0;
  for (;;) {
    out.push([x0, y0]);
    if ((x0 === x1 && y0 === y1) || ++n > 2000) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
  return out;
}
function line(c, x0, y0, x1, y1, col) { c.fillStyle = col; for (const [a, b] of linePts(x0, y0, x1, y1)) c.fillRect(a, b, 1, 1); }
function poly(c, pts, col) { for (let i = 1; i < pts.length; i++) line(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col); }
function disc(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let yy = -r; yy <= r; yy++) { const ww = F(Math.sqrt(r * r - yy * yy) + .5); c.fillRect(F(cx - ww), F(cy + yy), ww * 2 + 1, 1); }
}
function ring(c, cx, cy, r, col) {
  c.fillStyle = col;
  const n = Math.max(12, F(r * 7));
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; c.fillRect(F(cx + Math.cos(a) * r + .5), F(cy + Math.sin(a) * r + .5), 1, 1); }
}
function glow(c, cx, cy, r, col, a) {
  if (a <= 0.003 || r < 1) return;
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(col, Math.min(1, a))); g.addColorStop(1, rgba(col, 0));
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2); c.restore();
}
function bake(rows, pal) {
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
  const k = c.getContext('2d');
  rows.forEach((r, yy) => [...r].forEach((ch, xx) => { const col = pal[ch]; if (col) { k.fillStyle = col; k.fillRect(xx, yy, 1, 1); } }));
  return c;
}
function flipped(src) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const k = c.getContext('2d'); k.translate(src.width, 0); k.scale(-1, 1); k.drawImage(src, 0, 0); return c;
}
function pair(rows, pal) { const r = bake(rows, pal); return [r, flipped(r)]; }

/* ---------- mini police 3x5 ---------- */
const GLYPH = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], E: ['###', '#..', '##.', '#..', '###'], G: ['.##', '#..', '#.#', '#.#', '.##'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'], R: ['##.', '#.#', '##.', '#.#', '#.#'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  O: ['###', '#.#', '#.#', '#.#', '###'], H: ['#.#', '#.#', '###', '#.#', '#.#'], Z: ['###', '..#', '.#.', '#..', '###'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'], '.': ['...', '...', '...', '...', '.#.'],
  '*': ['...', '#.#', '.#.', '#.#', '...'], '~': ['...', '.#.', '#.#', '...', '...'], ' ': ['...', '...', '...', '...', '...'],
  '+': ['.##', '.#.', '.#.', '##.', '##.'] /* note de musique */
};
function text3(c, s, X, Y, col) {
  [...s].forEach((ch, i) => { const g = GLYPH[ch] || GLYPH[' ']; g.forEach((r, yy) => [...r].forEach((p, xx) => { if (p === '#') P(c, X + i * 4 + xx, Y + yy, col); })); });
}
function bubble(c, s, cx, by, col) {
  const wdt = s.length * 4 + 3, X = F(cx - wdt / 2), Y = by - 9;
  R(c, X, Y + 1, wdt, 7, '#0a0c10'); R(c, X + 1, Y, wdt - 2, 9, '#0a0c10');
  R(c, X + 1, Y + 1, wdt - 2, 7, '#f4f7f8');
  P(c, cx, Y + 9, '#0a0c10'); P(c, cx, Y + 8, '#f4f7f8');
  text3(c, s, X + 2, Y + 2, col || '#14161c');
}

/* ---------- récipients en verre (gabarits) ---------- */
const VESSELS = {
  round: ['   ccc   ', '   oio   ', '   oio   ', '  oiiio  ', ' oiiiiio ', 'oiiiiiiio', 'oiiiiiiio', 'oiiiiiiio', ' oiiiiio ', '  ooooo  '],
  tube: ['oooo', 'oiio', 'oiio', 'oiio', 'oiio', 'oiio', 'oiio', 'oiio', 'oiio', 'oiio', 'oiio', ' oo '],
  potion: ['  cc  ', '  cc  ', ' oiio ', ' oiio ', 'oiiiio', 'oiiiio', 'oiiiio', 'oiiiio', 'oiiiio', 'oiiiio', ' oooo '],
  jar: [' LLLLLL ', 'llllllll', 'oiiiiiio', 'oiiiiiio', 'oiiiiiio', 'oiiiiiio', 'oiiiiiio', 'oiiiiiio', 'oiiiiiio', ' oooooo '],
  erlen: ['   ooo   ', '   oio   ', '   oio   ', '  oiiio  ', '  oiiio  ', ' oiiiiio ', ' oiiiiio ', 'oiiiiiiio', 'oiiiiiiio', 'oiiiiiiio', 'ooooooooo'],
  bigjar: [' LLLLLLLLL ', 'lllllllllll', 'oiiiiiiiiio', 'oiiiiiiiiio', 'oiiiiiiiiio', 'oiiiiiiiiio', 'oiiiiiiiiio', 'oiiiiiiiiio', 'oiiiiiiiiio', 'oiiiiiiiiio', 'oiiiiiiiiio', 'oiiiiiiiiio', 'ooooooooooo', 'bbbbbbbbbbb']
};
const VDATA = {};
for (const k in VESSELS) {
  const rows = VESSELS[k], px = [];
  let top = 99, bot = 0;
  rows.forEach((r, yy) => [...r].forEach((ch, xx) => {
    if (ch === ' ') return;
    const leftO = xx > 0 && r[xx - 1] === 'o';
    px.push([xx, yy, ch, leftO]);
    if (ch === 'i') { top = Math.min(top, yy); bot = Math.max(bot, yy); }
  }));
  VDATA[k] = { px, top, bot, w: rows[0].length, h: rows.length };
}
function surfRow(v, level) { return v.bot - Math.round(level * (v.bot - v.top + 1)) + 1; }

function drawVessel(c, kind, X, Y, L, level, phase, bubbles) {
  const v = VDATA[kind], s = surfRow(v, level), half = v.w / 2;
  for (const [px, py, ch, leftO] of v.px) {
    let col = null;
    if (ch === 'o') col = py === 0 ? 'rgba(225,248,255,.9)' : (px < half ? 'rgba(190,232,245,.85)' : 'rgba(110,165,185,.8)');
    else if (ch === 'i') {
      if (py > s) col = py >= v.bot ? L.lo : (py >= v.bot - 1 ? shade(L.c, -.15) : L.c);
      else if (py === s) col = Math.sin(t * 4 + px * 1.7 + phase) > .55 ? 'rgba(160,210,225,.14)' : L.hi;
      else col = leftO ? 'rgba(230,250,255,.28)' : 'rgba(150,200,220,.10)';
      if (py > s && leftO) col = L.hi;
    } else if (ch === 'c') col = py % 2 ? '#6b4224' : '#8a5a34';
    else if (ch === 'L') col = C.brassHi;
    else if (ch === 'l') col = C.brass;
    else if (ch === 'b') col = C.brassLo;
    if (col) P(c, X + px, Y + py, col);
  }
  if (bubbles) for (const b of bubbles) if (b.y > s) P(c, X + b.x, Y + b.y, L.hi);
  return s;
}
function stepBubbles(kind, list, level, rate) {
  const v = VDATA[kind], s = surfRow(v, level);
  if (Math.random() < rate) {
    const cand = v.px.filter(p => p[2] === 'i' && p[1] === v.bot - 1);
    if (cand.length) { const p = pick(cand); list.push({ x: p[0], y: p[1], v: rnd(.35, .8) }); }
  }
  for (let i = list.length - 1; i >= 0; i--) { list[i].y -= list[i].v; if (list[i].y <= s) list.splice(i, 1); }
}

/* ---------- sprites ---------- */
const CHEM_PAL = { h: '#ffffff', H: '#b9c4cc', s: '#f2c49b', S: '#d39a6e', G: '#ffb347', g: '#3a2a1a', m: '#8a3b2b', c: '#dfe7ec', C: '#93a5b1', p: '#2b2f3a', k: '#141418' };
const CHEM_TOP = [
  ' h H h h  ',
  'hhhhhhhH  ',
  'hHsssssh  ',
  ' hgGGgGG  ',
  ' hsssssss ',
  '  ssmSs   ',
  '   SSS    '];
const CHEM = {
  stand: pair(CHEM_TOP.concat([
    '  cccccC  ', ' ccccccCc ', ' cccccCCc ', ' scccccCs ', '  ccccCc  ', '  ccccCc  ', '  pp  pp  ', '  pp  pp  ', '  kk  kkk ']), CHEM_PAL),
  walk: pair(CHEM_TOP.concat([
    '  cccccC  ', ' ccccccCc ', 'scccccCCc ', ' ccccccCs ', '  ccccCc  ', '  ccccCc  ', '  pp   pp ', ' pp    pp ', ' kk    kk ']), CHEM_PAL),
  cheer: pair([
    ' h H h h  ', 'hhhhhhhH  ', 'hHsssssh  ', 'shgGGgGGs ', 's hssssssss', 's  ssmSs s', 's   SSS  s', ' scccccCs ', ' ccccccCc ', ' cccccCCc ', ' ccccccCc ', '  ccccCc  ', '  ccccCc  ', '  pp  pp  ', '  pp  pp  ', '  kk  kkk '], CHEM_PAL)
};
const Z_PAL = { k: '#16141c', z: '#86c45a', Z: '#5a8f3c', x: '#2c3a22', e: '#e8ff6a', n: '#9aa3ad', j: '#3b3352', J: '#2a2440', p: '#2b2f3a', w: '#e9e6dc', W: '#b9b4a6', m: '#1b2414' };
const CREATURE = {
  lie: bake([
    '  kk                ',
    ' kkzzk  wwwwwwwwwwW ',
    'nzezzZwwwwwwwwwwwwwW',
    ' kzxzz  wwwwwwwwwWW ',
    '  kk                '], Z_PAL),
  sit: bake([
    '  kkkk          ',
    ' kkkkkk         ',
    ' kxxxxk         ',
    '  zezez         ',
    '  zzmzz         ',
    ' n zzz n        ',
    '  jjjjj         ',
    ' zjjjjjjwwwwwwW ',
    ' zjjjjjwwwwwwwwW', '   jjjjwwwwwwwWW'], Z_PAL),
  stand: pair([
    '  kkkkkk   ',
    ' kkkkkkkk  ',
    ' kzxxxxzk  ',
    '  zezzez   ',
    '  zzzzzz   ',
    '  zZmmZz   ',
    ' n zzzz n  ',
    '  jjjjjjzz ',
    ' jjjjjjjjzz',
    ' jjjjjjJj  ',
    '  jjjjJj   ',
    '  jjjjJj   ',
    '  pp  pp   ',
    '  pp  pp   ',
    '  pp  pp   ',
    ' kkk  kkk  '], Z_PAL),
  walk: pair([
    '  kkkkkk   ',
    ' kkkkkkkk  ',
    ' kzxxxxzk  ',
    '  zezzez   ',
    '  zzzzzz   ',
    '  zZmmZz   ',
    ' n zzzz n  ',
    '  jjjjjjzz ',
    ' jjjjjjjjzz',
    ' jjjjjjJj  ',
    '  jjjjJj   ',
    '  jjjjJj   ',
    '  pp   pp  ',
    ' pp    pp  ',
    ' pp     pp ',
    'kkk     kkk'], Z_PAL)
};
const BAT = [
  bake(['k     k', 'kk e kk', ' kkkkk ', '  k k  '], { k: '#2e2440', e: '#ff4040' }),
  bake(['  k k  ', ' kkekk ', 'kk k kk', 'k     k'], { k: '#2e2440', e: '#ff4040' })];
const SPIDER = bake(['k k k', ' kek ', 'k k k'], { k: '#0c0c10', e: '#ff3030' });
const PUMPKIN_ROWS = ['    g    ', '  oogoo  ', ' oOoooOo ', 'oofoOofoo', 'oOooOooOo', 'ofofofofo', ' offfffo ', '  ooooo  '];
const SKULL = bake([' wwwww ', 'wwwwwww', 'wkkwkkw', 'wwwkwww', ' wwwww ', ' w w w '], { w: '#e8e2cc', k: '#1a1a1a' });
const MICRO = bake([
  '   kkkk     ',
  '   bBbb     ',
  '    bBbb    ',
  '    bBbb    ',
  '     bBbb Ii',
  '     bBbbIIi',
  '      bBbIi ',
  '      kkkIi ',
  '      kekIi ',
  '   IIIIIIIi ',
  '    ssgs Ii ',
  '      y  Ii ',
  '    iiiiIii ',
  '   IIIIIIIii',
  '   iiiiiiiii'], { k: '#1d1f26', b: C.brass, B: C.brassHi, I: C.ironHi, i: C.iron, e: C.cyan, s: 'rgba(200,240,255,.7)', g: C.pink, y: C.amber });
const BRAIN = bake([' ppPpp ', 'pPpppPp', 'ppPpPpp', 'pppPppp', ' pp pp ', '   P   '], { p: '#ff9fd0', P: '#c74a8a' });

/* ---------- état ---------- */
let S = 3, W = 0, H = 0, w = 0, h = 0, L = {};
let tick = 0, t = 0, last = 0;
let shelf = [], lamps = [], bench = [], stars = [], coil = {}, col = {}, alem = null, chem = null;
let arcs = [], smoke = [], bats = [], sparks = [];
let flash = 0, dim = 0, dimTarget = 0, nextZap = 6, nextBat = 4, shoot = null;
let ev = null, clicks = [];
let accent = C.violet;

/* ---------- mise en page ---------- */
function layout() {
  W = innerWidth; H = innerHeight;
  const mobile = W < 760;
  S = (W >= 1800 && H >= 1000) ? 5 : (W >= 1100 && H >= 760) ? 4 : 3;
  w = Math.ceil(W / S); h = Math.ceil(H / S);
  cvs.width = w; cvs.height = h;
  cvs.style.width = (w * S) + 'px'; cvs.style.height = (h * S) + 'px';
  const offX = w * S - W, offY = h * S - H, left = -F(offX / 2);
  cvs.style.left = left + 'px'; cvs.style.top = (-offY) + 'px';
  const TOP = mobile ? 22 : 32, BOT = mobile ? 30 : 36, SIDE = mobile ? 3 : 30;
  L = {
    mobile, TOP, BOT, SIDE, px0: SIDE, py0: TOP, px1: w - SIDE, py1: h - BOT,
    shelfY: TOP - 4, floorY: h - (mobile ? 3 : 4), benchY: h - (mobile ? 11 : 13)
  };
  // positions du panneau HTML (alignées sur la grille de pixels)
  const st = document.documentElement.style;
  st.setProperty('--in-t', (TOP * S - offY) + 'px');
  st.setProperty('--in-b', (BOT * S) + 'px');
  st.setProperty('--in-l', (SIDE * S + left) + 'px');
  st.setProperty('--in-r', (SIDE * S - (offX + left)) + 'px');
  st.setProperty('--px', S + 'px');

  // bobine Tesla
  if (mobile) coil = { cx: 7, base: L.floorY, top: L.py1 + 6, small: true };
  else coil = { cx: 15, base: L.floorY, top: F(L.py1 - (L.py1 - L.py0) * .45), small: false };
  L.benchX0 = coil.cx + (coil.small ? 8 : 13);
  L.benchX1 = w - 1;
  // colonne à bulles (droite)
  col = mobile ? null : { x: w - 20, top: L.py0 + 10, bot: L.benchY - 1, bubbles: [] };
  // zone des bocaux
  L.jx0 = mobile ? 3 : SIDE + 1;
  L.jx1 = mobile ? w - 22 : w - SIDE - 1;
  genShelf(); genLamps(); genBench(); genStars();
  if (!chem) chem = { x: F((L.benchX0 + L.benchX1) / 2), dir: 1, mode: 'idle', timer: 40, bub: null, jump: 0, target: null };
  chem.x = clamp(chem.x, L.benchX0 + 4, L.benchX1 - 14);
  buildBack();
  if (reduce) draw();
}

function genShelf() {
  const r = seeded(7 + (L.mobile ? 1 : 0));
  const types = ['round', 'tubes', 'potion', 'jar', 'erlen', 'potion', 'round', 'books', 'jar', 'candle', 'erlen', 'tubes'];
  const WD = { round: 9, tubes: 14, potion: 6, jar: 8, erlen: 9, books: 9, candle: 3, pumpkin: 9, skull: 7 };
  shelf = [];
  let X = L.jx0 + 1, n = 0;
  while (true) {
    let type = types[F(r() * types.length)];
    if (HALLOWEEN && n % 7 === 3) type = n % 14 === 3 ? 'pumpkin' : 'skull';
    const wd = WD[type];
    if (X + wd > L.jx1) break;
    const it = { type, x: X, w: wd, phase: r() * 6, glow: r() < .38, bub: r() < .55 };
    if (WD[type] && VDATA[type]) {
      it.h = VDATA[type].h; it.L = POOL[F(r() * POOL.length)]; it.level = .35 + r() * .55; it.bubbles = [];
    } else if (type === 'tubes') {
      it.h = 12; it.tubes = [0, 1, 2].map(() => ({ L: POOL[F(r() * POOL.length)], level: .3 + r() * .6, bubbles: [] }));
    } else if (type === 'books') it.h = 11;
    else if (type === 'candle') it.h = 5;
    else if (type === 'pumpkin') it.h = 8;
    else if (type === 'skull') it.h = 6;
    it.y = L.shelfY - it.h;
    shelf.push(it);
    X += wd + 2 + F(r() * 5); n++;
  }
}
function genLamps() {
  lamps = [];
  if (L.mobile) return;
  const span = L.jx1 - L.jx0, n = span > 330 ? 3 : 2;
  for (let i = 0; i < n; i++) lamps.push({ x: F(L.jx0 + span * (i + 1) / (n + 1)), k: 1, off: 0 });
}
function genStars() {
  const p = porthole(); stars = [];
  const r = seeded(3);
  for (let i = 0; i < (L.mobile ? 7 : 14); i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (p.r - 1.5);
    stars.push({ x: F(p.cx + Math.cos(a) * d), y: F(p.cy + Math.sin(a) * d), ph: r() * 6 });
  }
}
function porthole() { return L.mobile ? { cx: w - 11, cy: 11, r: 7 } : { cx: w - 15, cy: 16, r: 11 }; }

function genBench() {
  const DEF = {
    rack: { w: 17, pri: 3 }, alembic: { w: 40, pri: 1 }, microscope: { w: 12, pri: 2 }, scope: { w: 16, pri: 5 },
    brain: { w: 11, pri: 4 }, globe: { w: 11, pri: 6 }, erlen: { w: 9, pri: 7 }, books: { w: 12, pri: 8 }, pumpkin: { w: 9, pri: 4.5 }
  };
  let order = ['rack', 'alembic', 'microscope', 'scope', 'globe', 'brain', 'erlen', 'books'];
  if (HALLOWEEN) order.splice(6, 0, 'pumpkin');
  const x0 = L.benchX0 + 3, x1 = (col ? col.x - 3 : L.benchX1 - 2);
  const avail = x1 - x0, minGap = 4;
  const chosen = [];
  let used = 0;
  for (const k of [...order].sort((a, b) => DEF[a].pri - DEF[b].pri)) {
    if (used + DEF[k].w + minGap <= avail) { chosen.push(k); used += DEF[k].w + minGap; }
  }
  let list = order.filter(k => chosen.includes(k));
  // remplissage si la paillasse est très large
  const fillers = ['potions', 'candle', 'tubes2', 'potions', 'candle'];
  const FW = { potions: 13, candle: 3, tubes2: 9 };
  let fi = 0, total = list.reduce((s, k) => s + DEF[k].w, 0);
  while (fi < fillers.length && (avail - total) / (list.length + 1) > 26) {
    const f = fillers[fi++]; DEF[f] = { w: FW[f] }; list.splice(1 + (fi * 2) % list.length, 0, f); total += FW[f];
  }
  const gap = (avail - total) / (list.length + 1);
  bench = []; let X = x0 + gap;
  const r = seeded(11);
  for (const k of list) {
    const it = { type: k, x: F(X), w: DEF[k].w, phase: r() * 6 };
    if (k === 'rack') it.tubes = [0, 1, 2, 3].map(i => ({ L: POOL[(i * 3 + 1) % POOL.length], level: .35 + r() * .5, bubbles: [] }));
    if (k === 'tubes2') it.tubes = [0, 1].map(i => ({ L: POOL[(i * 5 + 2) % POOL.length], level: .4 + r() * .5, bubbles: [] }));
    if (k === 'potions') it.v = [0, 1].map(i => ({ L: POOL[(i * 4 + 3) % POOL.length], level: .4 + r() * .5, bubbles: [] }));
    if (k === 'brain' || k === 'erlen') it.bubbles = [];
    bench.push(it); X += DEF[k].w + gap;
  }
  const a = bench.find(b => b.type === 'alembic');
  alem = a ? setupAlembic(a) : null;
}

/* ---------- alambic : le liquide passe d'une fiole à l'autre ---------- */
function setupAlembic(it) {
  const X = it.x, B = L.benchY;
  const p1 = [[X + 4, B - 18], [X + 4, B - 19], [X + 13, B - 19], [X + 17, B - 17], [X + 13, B - 15], [X + 18, B - 14], [X + 14, B - 12], [X + 20, B - 12], [X + 32, B - 12]];
  const p2 = [[X + 29, B - 2], [X + 25, B - 2], [X + 20, B - 2], [X + 12, B - 2], [X + 10, B - 4], [X + 9, B - 11]];
  const mk = pts => { let len = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); len += d; } return { pts, seg, len }; };
  return { it, X, B, p1: mk(p1), p2: mk(p2), phase: 'distill', A: .85, Bv: .12, L: POOL[0], ci: 0, parts: [], drops: [], bubA: [], bubB: [], timer: 0 };
}
function along(path, s) {
  let d = s;
  for (let i = 0; i < path.seg.length; i++) {
    if (d <= path.seg[i]) { const k = d / path.seg[i], a = path.pts[i], b = path.pts[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
    d -= path.seg[i];
  }
  return path.pts[path.pts.length - 1];
}
function updateAlembic() {
  const a = alem; if (!a) return;
  const rate = 1 / (12 * FPS);
  if (a.phase === 'distill') {
    a.A = Math.max(.12, a.A - rate * .75); a.Bv = Math.min(.85, a.Bv + rate * .75);
    if (tick % 3 === 0) a.parts.push({ s: 0, p: 1 });
    stepBubbles('round', a.bubA, a.A, .7);
    if (a.A <= .121) { a.phase = 'pump'; a.timer = 0; }
  } else {
    a.timer++;
    a.A = Math.min(.85, a.A + rate * 2); a.Bv = Math.max(.12, a.Bv - rate * 2);
    if (tick % 2 === 0) a.parts.push({ s: 0, p: 2 });
    stepBubbles('round', a.bubA, a.A, .12);
    if (a.A >= .849) { a.phase = 'distill'; a.ci = (a.ci + 1) % POOL.length; a.L = POOL[a.ci]; }
  }
  stepBubbles('erlen', a.bubB, a.Bv, .15);
  for (let i = a.parts.length - 1; i >= 0; i--) {
    const p = a.parts[i], path = p.p === 1 ? a.p1 : a.p2;
    p.s += p.p === 1 ? .55 : .9;
    if (p.s >= path.len) {
      a.parts.splice(i, 1);
      if (p.p === 1) a.drops.push({ x: a.X + 33, y: a.B - 12, v: .3 });
    }
  }
  const surfB = a.B - 11 + surfRow(VDATA.erlen, a.Bv);
  for (let i = a.drops.length - 1; i >= 0; i--) { const d = a.drops[i]; d.v += .12; d.y += d.v; if (d.y >= surfB) a.drops.splice(i, 1); }
}
function drawAlembic() {
  const a = alem; if (!a) return;
  const X = a.X, B = a.B, Lq = a.L;
  // tuyaux en verre
  poly(x, a.p2.pts, 'rgba(150,200,215,.45)');
  poly(x, a.p1.pts, 'rgba(170,220,235,.6)');
  // trépied + brûleur + flamme
  line(x, X, B - 1, X + 2, B - 8, C.ironHi); line(x, X + 8, B - 1, X + 6, B - 8, C.ironHi);
  R(x, X + 1, B - 8, 8, 1, C.steel);
  R(x, X + 2, B - 3, 5, 3, C.iron); R(x, X + 2, B - 3, 5, 1, C.ironHi); R(x, X + 3, B - 4, 3, 1, C.steel);
  const fl = a.phase === 'distill' ? 3 + (tick % 3 === 0 ? 1 : 0) : 1;
  for (let i = 0; i < fl; i++) R(x, X + 3 + (i > 1 ? 1 : 0), B - 5 - i, i > 1 ? 1 : 3, 1, i === 0 ? C.blue : i === 1 ? C.amber : '#fff3b0');
  glow(x, X + 4, B - 6, 6, C.amber, a.phase === 'distill' ? .35 : .12);
  // fiole A (sur le trépied)
  drawVessel(x, 'round', X, B - 18, Lq, a.A, it2(a), a.bubA);
  // pompe
  R(x, X + 19, B - 6, 6, 6, C.iron); R(x, X + 19, B - 6, 6, 1, C.ironHi); R(x, X + 24, B - 5, 1, 5, C.ironLo);
  const ang = (a.phase === 'pump' ? tick * .6 : 0);
  P(x, X + 22 + Math.round(Math.cos(ang) * 1.4), B - 8 + Math.round(Math.sin(ang) * 1.4), C.brassHi);
  P(x, X + 22, B - 7, C.brass);
  P(x, X + 21, B - 3, a.phase === 'pump' ? C.lime : C.red);
  // fiole B
  drawVessel(x, 'erlen', X + 29, B - 11, Lq, a.Bv, 1.3, a.bubB);
  // liquide en transit
  for (const p of a.parts) { const q = along(p.p === 1 ? a.p1 : a.p2, p.s); P(x, q[0], q[1], Lq.hi); }
  for (const d of a.drops) P(x, d.x, d.y, Lq.hi);
  glow(x, X + 4, B - 12, 9, Lq.c, .18);
  glow(x, X + 33, B - 5, 8, Lq.c, .14);
}
function it2(a) { return a.ci * 1.7; }

/* ---------- couche statique (murs, meubles) ---------- */
function buildBack() {
  back.width = w; back.height = h;
  const c = bx, r = seeded(21);
  R(c, 0, 0, w, h, C.void);
  // briques
  const BH = 5, BW = 12;
  for (let row = 0; row * BH < h; row++) {
    const off = row % 2 ? 6 : 0;
    for (let col_ = -1; col_ * BW < w + BW; col_++) {
      const X = col_ * BW + off, Y = row * BH, v = r();
      const base = v < .08 ? '#14171e' : v < .5 ? '#1b1f28' : v < .85 ? '#20242e' : '#252a35';
      R(c, X, Y, BW - 1, BH - 1, base);
      R(c, X, Y, BW - 1, 1, shade(base, .08));
      if (v > .93) { P(c, X + 3, Y + 2, '#11141a'); P(c, X + 4, Y + 1, '#11141a'); }
      if (v < .05) R(c, X + 1, Y + BH - 2, 4, 1, '#1f3020');
    }
  }
  // vignette
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .25, w / 2, h / 2, Math.max(w, h) * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.65)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // tuyau du plafond
  R(c, 0, 2, w, 1, C.cuHi); R(c, 0, 3, w, 1, C.cu); R(c, 0, 4, w, 1, C.cuLo);
  for (let X = 8; X < w; X += 36) { R(c, X, 1, 3, 5, C.brass); R(c, X, 1, 1, 5, C.brassHi); }
  // étagère
  R(c, L.jx0 - 1, L.shelfY, L.jx1 - L.jx0 + 2, 1, C.woodHi);
  R(c, L.jx0 - 1, L.shelfY + 1, L.jx1 - L.jx0 + 2, 1, C.wood);
  R(c, L.jx0 - 1, L.shelfY + 2, L.jx1 - L.jx0 + 2, 1, C.woodLo);
  for (let X = L.jx0 + 6; X < L.jx1 - 4; X += 46) { R(c, X, L.shelfY + 3, 3, 1, C.ironHi); R(c, X + 1, L.shelfY + 4, 2, 1, C.iron); P(c, X + 2, L.shelfY + 5, C.iron); }
  // lampes
  for (const l of lamps) {
    R(c, l.x, 5, 1, 3, '#0e0f12');
    R(c, l.x - 2, 8, 5, 1, C.ironLo); R(c, l.x - 3, 9, 7, 1, C.iron); R(c, l.x - 4, 10, 9, 1, C.brass); P(c, l.x - 4, 10, C.brassHi);
  }
  // toile d'araignée (coin haut gauche)
  const web = 'rgba(200,210,225,.22)', wl = L.mobile ? 9 : 16;
  line(c, 0, 6, wl, 6, web); line(c, 0, 6, F(wl * .8), F(6 + wl * .5), web); line(c, 0, 6, F(wl * .35), 6 + wl, web); line(c, 0, 6, 0, 6 + wl, web);
  for (const k of [.35, .65, .95]) { poly(c, [[F(wl * k), 6], [F(wl * k * .8), F(6 + wl * k * .5)], [F(wl * k * .35), F(6 + wl * k)], [0, F(6 + wl * k)]], web); }
  // hublot (structure)
  const p = porthole();
  disc(c, p.cx, p.cy, p.r + 2, C.brassLo); disc(c, p.cx, p.cy, p.r + 1, C.brass); ring(c, p.cx, p.cy, p.r + 1, C.brassHi);
  for (const k of [0, 1, 2, 3]) { const an = k * Math.PI / 2 + Math.PI / 4; P(c, p.cx + Math.round(Math.cos(an) * (p.r + 1)), p.cy + Math.round(Math.sin(an) * (p.r + 1)), C.brassLo); }

  if (!L.mobile) {
    // mur gauche : tuyau, boîte à fusibles, câbles, paratonnerre
    R(c, 1, 5, 2, L.floorY - 5, C.cu); R(c, 1, 5, 1, L.floorY - 5, C.cuHi);
    for (let Y = 20; Y < L.floorY; Y += 40) R(c, 0, Y, 4, 2, C.brass);
    const fbY = L.py0 + 6;
    R(c, 5, fbY, 17, 22, C.ironLo); R(c, 6, fbY + 1, 15, 20, C.iron); R(c, 6, fbY + 1, 15, 1, C.ironHi); R(c, 6, fbY + 1, 1, 20, C.ironHi);
    R(c, 8, fbY + 4, 11, 6, '#0f1116');
    R(c, 9, fbY + 13, 2, 6, C.ironLo); R(c, 9, fbY + 12, 2, 1, C.brassHi); // levier
    R(c, 7, fbY + 15, 6, 1, C.brass);
    const cy0 = fbY + 22;
    poly(c, [[10, cy0], [10, cy0 + 8], [8, cy0 + 16], [9, coil.base - 10]], '#b33a2a');
    poly(c, [[16, cy0], [17, cy0 + 9], [20, cy0 + 18], [19, coil.base - 10]], '#c88a2a');
    // jauge murale
    disc(c, 25, L.py0 + 36, 4, C.brass); disc(c, 25, L.py0 + 36, 3, '#d8d2bc'); P(c, 25, L.py0 + 33, C.red);
    // paratonnerre
    R(c, 0, coil.top - 24, 6, 1, C.brassLo); disc(c, 6, coil.top - 24, 1, C.brassHi);
    // mur droit : tuyau + vanne + support de la colonne
    R(c, w - 28, 5, 2, L.benchY - 5, C.cu); R(c, w - 28, 5, 1, L.benchY - 5, C.cuHi);
    const vy = L.py0 + 50; disc(c, w - 27, vy, 3, '#9b2a2a'); line(c, w - 30, vy, w - 24, vy, '#5a1515'); line(c, w - 27, vy - 3, w - 27, vy + 3, '#5a1515'); P(c, w - 27, vy, C.brass);
    R(c, w - 17, 5, 2, col.top - 8, C.iron); R(c, w - 17, 5, 1, col.top - 8, C.ironHi);
    R(c, col.x - 1, col.top - 3, 10, 3, C.brass); R(c, col.x - 1, col.top - 3, 10, 1, C.brassHi);
    R(c, col.x - 1, col.bot - 2, 10, 3, C.brass); R(c, col.x - 1, col.bot - 2, 10, 1, C.brassHi);
    disc(c, w - 5, L.py0 + 46, 3, C.brass); disc(c, w - 5, L.py0 + 46, 2, '#d8d2bc');
    R(c, w - 8, L.py0 + 6, 6, 18, C.ironLo); R(c, w - 7, L.py0 + 7, 4, 16, C.iron);
  }

  // sol
  R(c, 0, L.floorY, w, h - L.floorY, '#1e2128'); R(c, 0, L.floorY, w, 1, '#2c3039');
  for (let X = 0; X < w; X += 14) R(c, X, L.floorY + 1, 1, h - L.floorY, '#15171c');
  // paillasse
  const bx0 = L.benchX0, bw = L.benchX1 - bx0 + 1, bY = L.benchY;
  R(c, bx0, bY + 3, bw, L.floorY - bY - 3, 'rgba(0,0,0,.45)');
  R(c, bx0, bY, bw, 1, C.woodHi); R(c, bx0, bY + 1, bw, 1, C.wood); R(c, bx0, bY + 2, bw, 1, C.woodLo); R(c, bx0, bY + 3, bw, 1, C.woodDk);
  for (let X = bx0 + 2; X < L.benchX1 - 2; X += 54) { R(c, X, bY + 4, 2, L.floorY - bY - 4, C.woodLo); P(c, X, bY + 4, C.wood); }
  R(c, L.benchX1 - 3, bY + 4, 2, L.floorY - bY - 4, C.woodLo);
  if (!L.mobile) {
    for (let X = bx0 + 18, i = 0; X < L.benchX1 - 20; X += 77, i++) {
      if (i % 2) { R(c, X, L.floorY - 5, 7, 5, C.wood); R(c, X, L.floorY - 5, 7, 1, C.woodHi); line(c, X, L.floorY - 5, X + 6, L.floorY - 1, C.woodLo); }
      else { R(c, X, L.floorY - 6, 5, 6, '#2f3a2a'); R(c, X, L.floorY - 4, 5, 1, '#c9b13a'); P(c, X + 2, L.floorY - 6, C.ironHi); }
    }
  }
  drawCoilStatic(c);
}

/* ---------- bobine Tesla ---------- */
function torusRows() { return coil.small ? [6, 10, 12, 10, 6] : [10, 18, 22, 24, 24, 22, 16]; }
function drawCoilStatic(c) {
  const { cx, base, top, small } = coil;
  const bw = small ? 10 : 20, bh = small ? 4 : 8;
  R(c, cx - bw / 2, base - bh, bw, bh, C.iron); R(c, cx - bw / 2, base - bh, bw, 1, C.brassHi); R(c, cx - bw / 2, base - bh + 1, bw, 1, C.brass);
  R(c, cx - bw / 2, base - bh, 1, bh, C.ironHi); R(c, cx + bw / 2 - 1, base - bh, 1, bh, C.ironLo);
  const pw = small ? 8 : 16, ph = small ? 2 : 5, pY = base - bh - ph;
  for (let i = 0; i < ph; i++) R(c, cx - pw / 2, pY + i, pw, 1, i % 2 ? C.cuLo : C.cuHi);
  R(c, cx - pw / 2 - 1, pY, 1, ph, C.ironHi); R(c, cx + pw / 2, pY, 1, ph, C.ironHi);
  const colW = small ? 4 : 8, cTop = top + (small ? 3 : 3), cBot = pY;
  for (let Y = cTop; Y < cBot; Y++) {
    R(c, cx - colW / 2, Y, colW, 1, Y % 2 ? C.cu : C.cuLo); P(c, cx - colW / 2, Y, C.cuHi);
    if (!small && (Y - cTop) % 14 === 7) R(c, cx - colW / 2 - 1, Y, colW + 2, 1, C.ironHi);
  }
  const rows = torusRows(), tc = ['#dfe6ee', '#dfe6ee', C.silver, C.steel, C.steel, C.ironHi, C.iron];
  rows.forEach((rw, i) => { const Y = top - F(rows.length / 2) + i; R(c, cx - rw / 2, Y, rw, 1, tc[Math.min(i, tc.length - 1)]); });
  P(c, cx - rows[1] / 2 + 2, top - F(rows.length / 2) + 1, C.white);
  R(c, cx - 1, top - F(rows.length / 2) - 2, 2, 2, C.silver);
}
function coilTip() { return [coil.cx, coil.top - F(torusRows().length / 2) - 2]; }
function makeArc(x0, y0, x1, y1, life, big) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(3, F(d / (big ? 5 : 3))), j = big ? 4 : 2, pts = [];
  const nx = -(y1 - y0) / (d || 1), ny = (x1 - x0) / (d || 1);
  for (let i = 0; i <= n; i++) {
    const k = i / n, o = (i === 0 || i === n) ? 0 : rnd(-j, j);
    pts.push([x0 + (x1 - x0) * k + nx * o, y0 + (y1 - y0) * k + ny * o]);
  }
  const branches = [];
  if (big) for (let b = 0; b < 2; b++) {
    const s = pts[ri(1, pts.length - 2)], an = Math.atan2(y1 - y0, x1 - x0) + rnd(-1.2, 1.2), len = rnd(5, 12);
    branches.push([s, [s[0] + Math.cos(an) * len * .5 + rnd(-2, 2), s[1] + Math.sin(an) * len * .5 + rnd(-2, 2)], [s[0] + Math.cos(an) * len, s[1] + Math.sin(an) * len]]);
  }
  return { a: [x0, y0], b: [x1, y1], pts, branches, life, big };
}
function drawArc(ar) {
  const all = [ar.pts, ...ar.branches];
  for (const pts of all) for (let i = 1; i < pts.length; i++) {
    const q = linePts(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    x.fillStyle = 'rgba(111,243,255,.35)';
    for (const [a, b] of q) { x.fillRect(a - 1, b, 1, 1); x.fillRect(a + 1, b, 1, 1); x.fillRect(a, b - 1, 1, 1); x.fillRect(a, b + 1, 1, 1); }
  }
  for (const pts of all) poly(x, pts.map(p => [p[0], p[1]]), '#f2ffff');
  glow(x, ar.b[0], ar.b[1], ar.big ? 8 : 4, C.cyan, ar.big ? .5 : .25);
}
function zapTargets() {
  const [tx, ty] = coilTip();
  if (L.mobile) return [[rnd(L.benchX0 + 4, w * .5), L.py1 + 1], [rnd(2, 12), L.py1 + 2], [tx + rnd(6, 16), L.py1 + 1]];
  return [[L.px0, rnd(L.py0 + 10, L.py1 - 10)], [6, coil.top - 24], [rnd(2, 28), 5], [rnd(18, 40), L.floorY]];
}
function zap(strong = true) {
  const [tx, ty] = coilTip();
  for (const [a, b] of zapTargets()) arcs.push(makeArc(tx, ty, a, b, strong ? ri(4, 6) : 3, true));
  if (!reduce) flash = strong ? .24 : .12;
  for (const l of lamps) l.off = ri(2, 8);
  if (chem && chem.mode !== 'chase') { chem.jump = 6; chem.bub = { s: '!', t: 30 }; }
  for (let i = 0; i < 10; i++) sparks.push({ x: tx, y: ty, vx: rnd(-1.2, 1.2), vy: rnd(-1.4, .3), life: ri(6, 14) });
  window.dispatchEvent(new CustomEvent('lab:zap'));
  nextZap = t + rnd(9, 16);
}

/* ---------- l'expérience secrète d'Halloween ---------- */
function startCreature() {
  if (ev) return;
  const cx = F((L.benchX0 + (col ? col.x : L.benchX1)) / 2);
  ev = { t0: t, tx: cx - 12, stage: 0, zx: 0, told: false };
  dimTarget = .62;
  if (chem) { chem.mode = 'walk'; chem.target = clamp(ev.tx - 12, L.benchX0 + 2, w - 12); chem.bub = { s: '!', t: 40 }; }
  window.dispatchEvent(new CustomEvent('lab:creature', { detail: { phase: 'start' } }));
}
function updateEvent() {
  if (!ev) return;
  const e = t - ev.t0, tx = ev.tx, B = L.benchY;
  const eL = [tx - 1, B - 15], eR = [tx + 24, B - 15];
  if (e < 3.2) {
    if (tick % 4 === 0) arcs.push(makeArc(...coilTip(), eL[0], eL[1], 2, true));
    if (e > 1 && tick % 3 === 0) arcs.push(makeArc(eL[0], eL[1], eR[0], eR[1], 2, true));
    if (!reduce && [1.1, 2.0, 2.9].some(k => Math.abs(e - k) < .03)) flash = .28;
    for (const l of lamps) if (Math.random() < .2) l.off = ri(1, 4);
  }
  if (e >= 3.2 && ev.stage === 0) ev.stage = 1;
  if (e >= 4.4 && ev.stage === 1) {
    ev.stage = 2; ev.zx = tx + 24;
    if (chem) { chem.mode = 'cheer'; chem.timer = 40; chem.bub = { s: 'EUREKA!', t: 44 }; chem.jump = 8; }
    ev.say = { s: 'GRRR!', t: 40 };
  }
  if (e >= 4.6 && !ev.told) { ev.told = true; window.dispatchEvent(new CustomEvent('lab:creature', { detail: { phase: 'alive' } })); }
  if (e >= 6.2 && ev.stage === 2) { ev.stage = 3; if (chem) { chem.mode = 'chase'; chem.target = w + 30; chem.bub = { s: '?!', t: 30 }; } }
  if (ev.stage === 3) { ev.zx += .7; if (ev.zx > w + 14) { ev.stage = 4; ev.end = t; dimTarget = 0; } }
  if (ev.say) { ev.say.t--; if (ev.say.t <= 0) ev.say = null; }
  if (ev.stage === 4 && t - ev.end > 1.2) { ev = null; }
}
function drawEvent() {
  if (!ev) return;
  const tx = ev.tx, B = L.benchY;
  // table d'opération + électrodes
  R(x, tx, B - 6, 24, 1, C.steel); R(x, tx, B - 5, 24, 1, C.ironHi); R(x, tx + 2, B - 4, 2, 4, C.iron); R(x, tx + 20, B - 4, 2, 4, C.iron);
  R(x, tx - 2, B - 15, 1, 15, C.brassLo); R(x, tx + 24, B - 15, 1, 15, C.brassLo);
  disc(x, tx - 2, B - 16, 1, C.brassHi); disc(x, tx + 24, B - 16, 1, C.brassHi);
  if (ev.stage === 0) x.drawImage(CREATURE.lie, tx + 2, B - 11);
  else if (ev.stage === 1) x.drawImage(CREATURE.sit, tx + 3, B - 16);
  else if (ev.stage >= 2) {
    const walking = ev.stage === 3, spr = walking && (tick >> 2) % 2 ? CREATURE.walk[0] : CREATURE.stand[0];
    x.drawImage(spr, F(ev.zx), L.floorY - 16 + (walking && (tick >> 2) % 2 ? -1 : 0));
    glow(x, ev.zx + 4, L.floorY - 13, 5, C.lime, .35);
    if (ev.say) bubble(x, ev.say.s, F(ev.zx + 5), L.floorY - 18, '#2f6b1a');
  }
  if (ev.stage === 1) glow(x, tx + 6, B - 13, 4, C.lime, .5);
}

/* ---------- mise à jour ---------- */
function update() {
  // bocaux de l'étagère
  for (const it of shelf) {
    if (it.bubbles) stepBubbles(it.type, it.bubbles, it.level, it.bub ? .12 : .02);
    if (it.tubes) it.tubes.forEach((tb, i) => stepBubbles('tube', tb.bubbles, tb.level, i === 1 ? .15 : .03));
  }
  for (const it of bench) {
    if (it.tubes) it.tubes.forEach((tb, i) => stepBubbles('tube', tb.bubbles, tb.level, i === 1 ? .2 : .04));
    if (it.v) it.v.forEach(v => stepBubbles('potion', v.bubbles, v.level, .06));
    if (it.type === 'brain') stepBubbles('bigjar', it.bubbles, .86, .15);
    if (it.type === 'erlen') {
      stepBubbles('erlen', it.bubbles, .6, .3);
      if (tick % 4 === 0) smoke.push({ x: it.x + 4 + rnd(-.5, .5), y: L.benchY - 12, vx: rnd(-.12, .12), vy: rnd(-.35, -.2), life: 0, max: ri(40, 70) });
    }
  }
  updateAlembic();
  // colonne à bulles
  if (col) {
    if (Math.random() < .55) col.bubbles.push({ x: ri(1, 6), y: col.bot - 1, v: rnd(.4, 1.1), s: Math.random() < .2 ? 2 : 1 });
    for (let i = col.bubbles.length - 1; i >= 0; i--) { const b = col.bubbles[i]; b.y -= b.v; b.x += Math.sin(t * 3 + b.y * .3) * .15; if (b.y < col.top + 3) col.bubbles.splice(i, 1); }
  }
  // fumée
  for (let i = smoke.length - 1; i >= 0; i--) { const s = smoke[i]; s.x += s.vx + Math.sin((t + i) * 2) * .05; s.y += s.vy; s.life++; if (s.life > s.max) smoke.splice(i, 1); }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += .12; if (--s.life <= 0) sparks.splice(i, 1); }
  // lampes
  for (const l of lamps) {
    if (l.off > 0) l.off--;
    else if (Math.random() < .004) l.off = ri(2, 6);
    l.k = l.off > 0 ? (l.off % 2 ? .25 : .7) : .92 + Math.sin(t * 9 + l.x) * .04;
  }
  // arcs électriques
  for (let i = arcs.length - 1; i >= 0; i--) {
    const a = arcs[i];
    if (--a.life <= 0) arcs.splice(i, 1);
    else if (a.big) arcs[i] = Object.assign(makeArc(a.a[0], a.a[1], a.b[0], a.b[1], a.life, true), { life: a.life });
  }
  if (Math.random() < (ev ? .5 : .22)) {
    const [tx, ty] = coilTip(), an = rnd(-Math.PI * .95, -Math.PI * .05) + (Math.random() < .3 ? Math.PI : 0), len = rnd(4, coil.small ? 8 : 13);
    arcs.push(makeArc(tx + Math.cos(an) * 3, ty + 2 + Math.sin(an) * 1, tx + Math.cos(an) * len, ty + 2 + Math.sin(an) * len * .7, ri(1, 2), false));
  }
  if (t > nextZap && !ev) zap(true);
  flash *= .62; if (flash < .01) flash = 0;
  dim += (dimTarget - dim) * .08;
  // chauves-souris
  if (HALLOWEEN && t > nextBat) {
    nextBat = t + rnd(5, 11);
    const dir = Math.random() < .5 ? 1 : -1;
    bats.push({ x: dir > 0 ? -8 : w + 2, y: rnd(6, L.TOP - 10), dir, v: rnd(.9, 1.5), ph: rnd(0, 6) });
  }
  for (let i = bats.length - 1; i >= 0; i--) { const b = bats[i]; b.x += b.v * b.dir; if (b.x < -12 || b.x > w + 12) bats.splice(i, 1); }
  // étoile filante
  if (!shoot && Math.random() < .003) shoot = { k: 0 };
  if (shoot && ++shoot.k > 14) shoot = null;
  updateChem();
  updateEvent();
}

/* ---------- le petit chimiste ---------- */
function stops() {
  const s = bench.filter(b => b.type !== 'alembic').map(b => ({ x: b.x + F(b.w / 2) - 5, b }));
  if (alem) s.push({ x: alem.X + 12, b: alem.it });
  return s;
}
function updateChem() {
  const c = chem; if (!c) return;
  if (c.bub && --c.bub.t <= 0) c.bub = null;
  if (c.jump > 0) c.jump--;
  if (c.mode === 'walk' || c.mode === 'chase') {
    const sp = c.mode === 'chase' ? 1.1 : .45, dx = c.target - c.x;
    c.dir = dx >= 0 ? 1 : -1;
    if (Math.abs(dx) <= sp) {
      c.x = c.target;
      if (c.mode === 'chase') { c.x = -12; c.mode = 'walk'; c.target = ri(L.benchX0 + 4, F(w * .5)); return; }
      c.mode = 'idle'; c.timer = ri(30, 110);
      if (!ev) {
        const near = stops().find(s => Math.abs(s.x - c.x) < 3);
        if (near && Math.random() < .7) c.bub = { s: near.b.type === 'microscope' ? '!' : near.b.type === 'brain' ? '?' : near.b.type === 'scope' ? '~' : pick(['+', '?', '!', '.']), t: 40 };
      }
    } else c.x += c.dir * sp;
  } else if (c.mode === 'idle') {
    if (ev) return;
    if (--c.timer <= 0) { const s = stops(); c.target = clamp(s.length ? pick(s).x : ri(L.benchX0 + 4, w - 20), L.benchX0 + 1, (col ? col.x - 10 : w - 12)); c.mode = 'walk'; }
  } else if (c.mode === 'cheer') {
    if (--c.timer <= 0) c.mode = 'idle';
  }
}
function drawChem() {
  const c = chem; if (!c) return;
  const walking = c.mode === 'walk' || c.mode === 'chase';
  const fr = c.mode === 'cheer' ? CHEM.cheer : (walking && (tick >> 2) % 2) ? CHEM.walk : CHEM.stand;
  const img = fr[c.dir > 0 ? 0 : 1];
  const bob = walking && (tick >> 2) % 2 ? -1 : 0, jmp = c.jump > 0 ? -Math.round(Math.sin(c.jump / 8 * Math.PI) * 3) : 0;
  const Y = L.floorY - img.height + bob + jmp;
  x.drawImage(img, F(c.x), Y);
  if (c.bub) bubble(x, c.bub.s, F(c.x + 5), Y - 1, c.bub.s === 'EUREKA!' ? '#b0401a' : '#14161c');
}

/* ---------- dessin ---------- */
function drawItemShelf(it) {
  const X = it.x, Y = it.y;
  if (VDATA[it.type]) {
    drawVessel(x, it.type, X, Y, it.L, it.level, it.phase, it.bubbles);
    if (it.glow) glow(x, X + it.w / 2, Y + it.h * .65, 9, it.L.c, (.16 + Math.sin(t * 2 + it.phase) * .05) * (ev ? 1.8 : 1));
  } else if (it.type === 'tubes') {
    R(x, X, Y + 8, 14, 1, C.woodHi); R(x, X, Y + 11, 14, 1, C.wood); R(x, X, Y + 8, 1, 4, C.woodLo); R(x, X + 13, Y + 8, 1, 4, C.woodLo);
    it.tubes.forEach((tb, i) => drawVessel(x, 'tube', X + 1 + i * 4, Y, tb.L, tb.level, i + it.phase, tb.bubbles));
    R(x, X, Y + 8, 14, 1, 'rgba(143,90,51,.85)');
  } else if (it.type === 'books') {
    const cols = ['#7a2b2b', '#2b4a7a', '#3d6b2f', '#6b4a8a'];
    for (let i = 0; i < 4; i++) { const hh = 8 + ((i * 7 + 3) % 4); R(x, X + i * 2, Y + it.h - hh, 2, hh, cols[i]); P(x, X + i * 2, Y + it.h - hh + 2, C.brassHi); }
    R(x, X + 8, Y + 4, 1, 7, '#5a3a22');
  } else if (it.type === 'candle') drawCandle(X + 1, Y + it.h);
  else if (it.type === 'pumpkin') drawPumpkin(X, Y);
  else if (it.type === 'skull') x.drawImage(SKULL, X, Y);
}
function drawCandle(cx, by) {
  R(x, cx, by - 4, 2, 4, '#efe6c8'); P(x, cx, by - 4, '#fffbe8'); P(x, cx + 1, by - 5, '#1a1a1a');
  const f = (tick >> 1) % 3;
  P(x, cx + 1, by - 6, f ? '#ffd27a' : '#fff3b0'); if (f !== 2) P(x, cx + 1, by - 7, C.amber);
  glow(x, cx + 1, by - 6, 7, C.amber, .28 + Math.random() * .06);
}
let pumpkinSpr = null;
function drawPumpkin(X, Y) {
  const f = .5 + Math.random() * .5;
  const face = f > .75 ? '#ffe680' : '#ffb347';
  if (!pumpkinSpr || pumpkinSpr.face !== face) { pumpkinSpr = bake(PUMPKIN_ROWS, { o: '#e0701a', O: '#a84f10', g: '#4a7a2a', f: face }); pumpkinSpr.face = face; }
  x.drawImage(pumpkinSpr, X, Y);
  glow(x, X + 4, Y + 5, 9, C.orange, .22 * f);
}
function drawBenchItem(it) {
  const X = it.x, B = L.benchY;
  switch (it.type) {
    case 'alembic': drawAlembic(); break;
    case 'rack':
      R(x, X, B - 9, 1, 9, C.woodLo); R(x, X + 16, B - 9, 1, 9, C.woodLo); R(x, X, B - 2, 17, 2, C.wood); R(x, X, B - 2, 17, 1, C.woodHi);
      it.tubes.forEach((tb, i) => drawVessel(x, 'tube', X + 1 + i * 4, B - 13, tb.L, tb.level, i + 2, tb.bubbles));
      R(x, X, B - 8, 17, 1, C.woodHi); R(x, X, B - 7, 17, 1, C.wood);
      glow(x, X + 6, B - 6, 7, it.tubes[1].L.c, .14);
      break;
    case 'tubes2':
      R(x, X, B - 2, 9, 2, C.wood); R(x, X, B - 2, 9, 1, C.woodHi);
      it.tubes.forEach((tb, i) => drawVessel(x, 'tube', X + i * 5, B - 13, tb.L, tb.level, i, tb.bubbles));
      R(x, X, B - 7, 9, 1, C.woodHi);
      break;
    case 'potions':
      it.v.forEach((v, i) => drawVessel(x, 'potion', X + i * 7, B - 11, v.L, v.level, i * 2, v.bubbles));
      glow(x, X + 6, B - 4, 7, it.v[0].L.c, .12);
      break;
    case 'microscope':
      x.drawImage(MICRO, X, B - 15);
      if ((tick >> 3) % 6 === 0) P(x, X + 7, B - 7, C.white);
      glow(x, X + 6, B - 4, 4, C.amber, .25);
      break;
    case 'scope': {
      R(x, X, B - 13, 16, 13, C.iron); R(x, X, B - 13, 16, 1, C.ironHi); R(x, X, B - 13, 1, 13, C.ironHi); R(x, X + 15, B - 12, 1, 12, C.ironLo); R(x, X, B - 1, 16, 1, C.ironLo);
      R(x, X + 2, B - 11, 12, 7, '#04201f');
      for (let gx = 2; gx < 14; gx += 3) for (let gy = 1; gy < 7; gy += 3) P(x, X + 2 + gx - 1, B - 11 + gy, '#0b3a36');
      const tr = HALLOWEEN ? C.lime : C.cyan;
      for (let i = 0; i < 12; i++) {
        const ph = (i + tick * .5) % 12, y = ph > 5 && ph < 6.2 ? -3 : ph > 6.2 && ph < 7 ? 2 : Math.round(Math.sin((i + tick * .5) / 1.6) * .8);
        P(x, X + 2 + i, B - 8 + y, tr);
      }
      P(x, X + 3, B - 3, C.brassHi); P(x, X + 6, B - 3, C.brassHi); P(x, X + 12, B - 3, (tick >> 3) % 2 ? C.lime : '#2a3a20');
      glow(x, X + 8, B - 8, 9, tr, .14);
      break;
    }
    case 'brain': {
      drawVessel(x, 'bigjar', X, B - 14, liq(HALLOWEEN ? C.lime : C.green), .86, it.phase, it.bubbles);
      x.globalAlpha = .9; x.drawImage(BRAIN, X + 2, B - 10 + Math.round(Math.sin(t * 1.5) * 1)); x.globalAlpha = 1;
      glow(x, X + 5, B - 7, 10, C.green, .2);
      break;
    }
    case 'globe': {
      R(x, X + 2, B - 3, 7, 3, '#15161b'); R(x, X + 1, B - 1, 9, 1, '#15161b'); R(x, X + 3, B - 3, 5, 1, C.ironHi);
      const cx = X + 5, cy = B - 9;
      disc(x, cx, cy, 5, 'rgba(40,12,60,.92)');
      if (!it.tend || tick % 3 === 0) {
        it.tend = [0, 1, 2, 3].map(() => { let a = rnd(0, Math.PI * 2), px = cx, py = cy, pts = [[cx, cy]]; for (let s = 0; s < 5; s++) { a += rnd(-.5, .5); px += Math.cos(a); py += Math.sin(a); pts.push([px, py]); } return pts; });
      }
      for (const tp of it.tend) poly(x, tp, Math.random() < .5 ? C.pink : '#ffb3ff');
      disc(x, cx, cy, 1, '#fff0ff');
      ring(x, cx, cy, 5, 'rgba(220,200,255,.55)'); P(x, cx - 3, cy - 3, C.white);
      glow(x, cx, cy, 10, C.pink, .25 + Math.random() * .08);
      break;
    }
    case 'erlen':
      drawVessel(x, 'erlen', X, B - 11, liq(HALLOWEEN ? C.lime : C.violet), .6, it.phase, it.bubbles);
      glow(x, X + 4, B - 5, 8, HALLOWEEN ? C.lime : C.violet, .16);
      break;
    case 'books': {
      R(x, X, B - 3, 12, 3, '#7a2b2b'); R(x, X, B - 3, 12, 1, '#9a3b3b'); R(x, X + 9, B - 2, 1, 1, C.brassHi);
      R(x, X + 1, B - 6, 10, 3, '#2b4a7a'); R(x, X + 1, B - 6, 10, 1, '#3b5f9a');
      R(x, X + 2, B - 8, 8, 2, '#3d6b2f'); R(x, X + 2, B - 8, 8, 1, '#4e8a3d');
      if (HALLOWEEN) { x.drawImage(SKULL, X + 1, B - 14); drawCandle(X + 9, B - 8); }
      else drawCandle(X + 5, B - 8);
      break;
    }
    case 'candle': drawCandle(X, B); break;
    case 'pumpkin': drawPumpkin(X, B - 8); break;
  }
}
function drawPorthole() {
  const p = porthole();
  disc(x, p.cx, p.cy, p.r, '#0b1430');
  disc(x, p.cx - 2, p.cy - 3, F(p.r * .6), '#111d40');
  for (const s of stars) { const b = Math.sin(t * 2 + s.ph); if (b > -.3) P(x, s.x, s.y, b > .6 ? '#ffffff' : '#8fa6d8'); }
  const mx = p.cx + F(p.r * .35), my = p.cy - F(p.r * .3), mr = L.mobile ? 2 : 3;
  if (HALLOWEEN) { disc(x, mx, my, mr, '#ffd27a'); P(x, mx - 1, my, '#e0a84a'); glow(x, mx, my, mr * 3, C.amber, .25); }
  else { disc(x, mx, my, mr, '#f4eccc'); disc(x, mx + 1, my - 1, mr, '#0b1430'); glow(x, mx, my, mr * 3, '#f4eccc', .15); }
  if (shoot) { const k = shoot.k; line(x, p.cx - p.r + k, p.cy - 4 + F(k * .4), p.cx - p.r + k - 3, p.cy - 4 + F(k * .4) - 1, '#ffffff'); }
  // croisillons + reflet
  R(x, p.cx - p.r, p.cy, p.r * 2 + 1, 1, C.brassLo); R(x, p.cx, p.cy - p.r, 1, p.r * 2 + 1, C.brassLo);
  P(x, p.cx - F(p.r * .5), p.cy - F(p.r * .6), 'rgba(255,255,255,.5)');
}
function drawLamps() {
  for (const l of lamps) {
    R(x, l.x - 1, 11, 3, 1, l.k > .5 ? '#fff2c0' : '#7a6a40');
    if (l.k > .3) {
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = `rgba(255,190,100,${.05 * l.k})`;
      x.beginPath(); x.moveTo(l.x - 3, 11); x.lineTo(l.x + 4, 11); x.lineTo(l.x + 26, L.shelfY + 2); x.lineTo(l.x - 25, L.shelfY + 2); x.closePath(); x.fill();
      x.restore();
      glow(x, l.x, 12, 14, '#ffc36b', .3 * l.k);
    }
  }
}
function drawColumn() {
  if (!col) return;
  const X = col.x, top = col.top, bot = col.bot, Lc = liq(accent);
  const surf = top + 3 + Math.round(Math.sin(t * 2) * .6);
  for (let Y = top; Y < bot - 2; Y++) {
    const inLiq = Y >= surf;
    R(x, X, Y, 1, 1, 'rgba(190,232,245,.85)'); R(x, X + 7, Y, 1, 1, 'rgba(110,165,185,.8)');
    R(x, X + 1, Y, 6, 1, inLiq ? (Y > bot - 8 ? Lc.lo : Lc.c) : 'rgba(150,200,220,.10)');
    if (inLiq) P(x, X + 1, Y, Lc.hi);
  }
  for (const b of col.bubbles) { if (b.y > surf) { P(x, X + 1 + clamp(F(b.x), 0, 5), b.y, Lc.hi); if (b.s > 1) P(x, X + 1 + clamp(F(b.x) + 1, 0, 5), b.y, Lc.hi); } }
  glow(x, X + 4, (top + bot) / 2, 18, accent, .16);
  // voyants
  for (let i = 0; i < 4; i++) P(x, w - 6 + (i % 2) * 2, L.py0 + 9 + i * 3, (tick >> (2 + i)) % 2 ? [C.red, C.lime, C.amber, C.cyan][i] : '#1a1d24');
  // aiguilles des jauges
  const an = -Math.PI / 2 + Math.sin(t * .9) * .8 + (flash > .1 ? rnd(-.5, .5) : 0);
  line(x, w - 5, L.py0 + 46, w - 5 + Math.round(Math.cos(an) * 2), L.py0 + 46 + Math.round(Math.sin(an) * 2), '#2a1a1a');
}
function drawLeftWall() {
  if (L.mobile) return;
  const fbY = L.py0 + 6;
  for (let i = 0; i < 5; i++) P(x, 9 + i * 2, fbY + 6 + (i % 2), (tick >> (1 + i % 3)) % 3 ? '#3a1414' : (i % 2 ? C.lime : C.red));
  for (let i = 0; i < 5; i++) P(x, 9 + i * 2, fbY + 8, (tick + i * 7) % 20 < 10 ? C.amber : '#3a2a10');
  const an = -Math.PI / 2 + Math.sin(t * 1.3 + 1) * 1.1;
  line(x, 25, L.py0 + 36, 25 + Math.round(Math.cos(an) * 2), L.py0 + 36 + Math.round(Math.sin(an) * 2), '#2a1a1a');
  // araignée
  const sy = 10 + F((Math.sin(t * .5) + 1) * (L.mobile ? 3 : 6));
  line(x, 7, 6, 7, sy, 'rgba(220,225,235,.35)');
  x.drawImage(SPIDER, 5, sy);
}
function drawCoilLive() {
  const { cx, base, small } = coil, bh = small ? 4 : 7;
  P(x, cx - (small ? 3 : 5), base - bh + 3, (tick >> 2) % 2 ? C.red : '#3a1414');
  P(x, cx - (small ? 1 : 2), base - bh + 3, (tick >> 3) % 2 ? C.lime : '#1a3a14');
  if (!small) P(x, cx + 2, base - bh + 3, (tick >> 1) % 4 ? '#3a3010' : C.amber);
  const [tx, ty] = coilTip();
  glow(x, tx, ty + 3, small ? 9 : 16, C.cyan, .16 + Math.sin(t * 6) * .05 + (ev ? .15 : 0));
}
function draw() {
  x.imageSmoothingEnabled = false;
  x.drawImage(back, 0, 0);
  drawPorthole();
  drawLamps();
  drawLeftWall();
  for (const it of shelf) drawItemShelf(it);
  drawColumn();
  drawCoilLive();
  for (const it of bench) drawBenchItem(it);
  for (const s of smoke) { const k = s.life / s.max; x.fillStyle = HALLOWEEN ? `rgba(160,255,140,${.35 * (1 - k)})` : `rgba(190,200,215,${.3 * (1 - k)})`; const sz = k > .5 ? 2 : 1; x.fillRect(F(s.x), F(s.y), sz, sz); }
  drawEvent();
  drawChem();
  for (const b of bats) { const sp = BAT[(tick >> 2) % 2]; x.drawImage(sp, F(b.x), F(b.y + Math.sin(t * 4 + b.ph) * 2)); }
  if (dim > .01) { x.fillStyle = `rgba(2,3,10,${dim})`; x.fillRect(0, 0, w, h); }
  for (const a of arcs) drawArc(a);
  for (const s of sparks) P(x, s.x, s.y, s.life > 6 ? '#ffffff' : C.cyan);
  if (ev && dim > .2) {
    if (ev.stage >= 2) { const zy = L.floorY - 13; P(x, F(ev.zx) + 3, zy, C.lime); P(x, F(ev.zx) + 6, zy, C.lime); }
    for (const it of bench) if (it.type === 'pumpkin') drawPumpkin(it.x, L.benchY - 8);
    for (const l of lamps) if (l.k > .5) glow(x, l.x, 12, 8, '#ffc36b', .15);
  }
  if (flash > 0) { x.fillStyle = `rgba(220,255,255,${flash})`; x.fillRect(0, 0, w, h); }
}

/* ---------- boucle ---------- */
function loop(now) {
  requestAnimationFrame(loop);
  if (document.hidden) return;
  if (reduce && !ev) return;
  const step = 1000 / FPS;
  if (now - last < step) return;
  last = now - ((now - last) % step);
  tick++; t = tick / FPS;
  update(); draw();
}

/* ---------- interactions ---------- */
function toLogical(e) { const r = cvs.getBoundingClientRect(); return [(e.clientX - r.left) / S, (e.clientY - r.top) / S]; }
function hitCoil(lx, ly) { return Math.abs(lx - coil.cx) < (coil.small ? 7 : 13) && ly > coil.top - 6 && ly < coil.base; }
function hitShelf(lx, ly) { return shelf.find(it => lx >= it.x && lx < it.x + it.w && ly >= it.y && ly < it.y + it.h); }
function hitChem(lx, ly) { return chem && lx >= chem.x && lx < chem.x + 10 && ly > L.floorY - 16 && ly < L.floorY; }
function hitPort(lx, ly) { const p = porthole(); return Math.hypot(lx - p.cx, ly - p.cy) <= p.r + 2; }
cvs.addEventListener('pointermove', e => {
  const [lx, ly] = toLogical(e);
  cvs.style.cursor = (hitCoil(lx, ly) || hitShelf(lx, ly) || hitChem(lx, ly) || hitPort(lx, ly)) ? 'pointer' : 'default';
});
cvs.addEventListener('click', e => {
  const [lx, ly] = toLogical(e);
  if (hitCoil(lx, ly)) {
    zap(true);
    const now = performance.now();
    clicks = clicks.filter(c => now - c < 1500); clicks.push(now);
    if (clicks.length >= 3) { clicks = []; startCreature(); }
  } else if (hitChem(lx, ly)) { chem.bub = { s: pick(['?', '!', '+', '*']), t: 36 }; chem.jump = 6; }
  else if (hitPort(lx, ly)) shoot = { k: 0 };
  else {
    const it = hitShelf(lx, ly);
    if (it) {
      if (it.L) { it.L = pick(POOL); it.level = rnd(.3, .9); for (let i = 0; i < 6; i++) it.bubbles.push({ x: ri(2, it.w - 3), y: VDATA[it.type].bot - 1 - i, v: rnd(.4, .9) }); it.glow = true; }
      else if (it.tubes) it.tubes.forEach(tb => { tb.L = pick(POOL); tb.level = rnd(.3, .9); });
      for (let i = 0; i < 5; i++) sparks.push({ x: it.x + it.w / 2, y: it.y, vx: rnd(-.8, .8), vy: rnd(-1.2, -.3), life: ri(5, 10) });
    }
  }
  if (reduce) draw();
});
let typed = '';
window.addEventListener('keydown', e => {
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  if (e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-6);
  if (typed.endsWith('igor')) { typed = ''; startCreature(); }
});
mq.addEventListener('change', () => { reduce = mq.matches; if (reduce) draw(); });
let rz = 0;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 120); });

window.LabScene = {
  zap: () => { zap(true); if (reduce) draw(); },
  creature: startCreature,
  setAccent: c => { accent = c; if (reduce) draw(); },
  get halloween() { return HALLOWEEN; }
};

layout();
draw();
requestAnimationFrame(loop);
})();
