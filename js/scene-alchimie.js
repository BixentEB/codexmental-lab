/* ==========================================================================
   CODEX MENTAL · LAB — thème « Alchimie »
   Une installation de chimie qui tourne en boucle autour de l'interface :
   bouilleur → condenseur → récepteur → pompe → ballon de réaction (réactif)
   → distributeur → éprouvettes → serpentin → colonne → réservoir → bouilleur.
   Les volumes sont conservés : ce qui quitte un récipient voyage dans les
   tubes, puis arrive ailleurs.
   ========================================================================== */
(() => {
'use strict';

const cvs = document.getElementById('scene');
if (!cvs) return;
const x = cvs.getContext('2d');
const back = document.createElement('canvas');
const bx = back.getContext('2d');

const LAB = window.LAB || {};
const MOTION = LAB.motion || 'full';           // full | calm | off
const HALLOWEEN = !!LAB.halloween;
const FPS = MOTION === 'calm' ? 15 : 30;
const STATIC = MOTION === 'off';

/* ---------- outils ---------- */
const F = Math.floor;
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => F(rnd(a, b + 1));
const pick = a => a[F(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const css = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const light = (c, k) => c.map(v => v + (255 - v) * k);
const dark = (c, k) => c.map(v => v * (1 - k));
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function vivid(c) {
  let [r, g, b] = c.map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0, l = (mx + mn) / 2, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) { hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
  s = Math.max(s, .82); l = clamp(l, .5, .62);
  const C2 = (1 - Math.abs(2 * l - 1)) * s, X2 = C2 * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - C2 / 2;
  let o = hh < 60 ? [C2, X2, 0] : hh < 120 ? [X2, C2, 0] : hh < 180 ? [0, C2, X2] : hh < 240 ? [0, X2, C2] : hh < 300 ? [X2, 0, C2] : [C2, 0, X2];
  return o.map(v => (v + m) * 255);
}
const PAL = (HALLOWEEN ? ['#5cff6a', '#ff8a1f', '#a65cff', '#c8ff3d', '#ff4fd8', '#3fe6ff'] : ['#3dff8a', '#45e6ff', '#b06bff', '#ff9a2e', '#ff5fc8', '#c8ff3d']).map(hex);
const K = {
  void: '#08090c', glassL: '#a9dceb', glassD: '#4d7886', glassIn: '#0c161b',
  cu: '#b8692f', cuHi: '#e39a55', cuLo: '#6e3a18', brass: '#c9993a', brassHi: '#f1cd6a', brassLo: '#7a5a1c',
  iron: '#353a45', ironHi: '#565e6e', ironLo: '#1f2229', steel: '#8e99a8', wood: '#5f3a20', woodHi: '#83532f', woodLo: '#361f10'
};

/* ---------- primitives ---------- */
function R(c, X, Y, W, H, col) { c.fillStyle = col; c.fillRect(F(X), F(Y), W, H); }
function P(c, X, Y, col) { c.fillStyle = col; c.fillRect(F(X), F(Y), 1, 1); }
function linePts(x0, y0, x1, y1) {
  x0 = F(x0); y0 = F(y0); x1 = F(x1); y1 = F(y1);
  const out = [], dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let e = dx + dy, n = 0;
  for (;;) { out.push([x0, y0]); if ((x0 === x1 && y0 === y1) || ++n > 4000) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  return out;
}
function line(c, x0, y0, x1, y1, col) { c.fillStyle = col; for (const [a, b] of linePts(x0, y0, x1, y1)) c.fillRect(a, b, 1, 1); }
function poly(c, pts, col) { for (let i = 1; i < pts.length; i++) line(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col); }
function disc(c, cx, cy, r, col) { c.fillStyle = col; for (let yy = -r; yy <= r; yy++) { const ww = F(Math.sqrt(r * r - yy * yy) + .5); c.fillRect(F(cx - ww), F(cy + yy), ww * 2 + 1, 1); } }
function glow(c, cx, cy, r, col, a) {
  if (a <= .004 || r < 1) return;
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, css(col, Math.min(1, a))); g.addColorStop(1, css(col, 0));
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2); c.restore();
}
function bake(rows, pal) {
  const c = document.createElement('canvas'); c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
  const k = c.getContext('2d');
  rows.forEach((r, yy) => [...r].forEach((ch, xx) => { const col = pal[ch]; if (col) { k.fillStyle = col; k.fillRect(xx, yy, 1, 1); } }));
  return c;
}
function flip(src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const k = c.getContext('2d'); k.translate(src.width, 0); k.scale(-1, 1); k.drawImage(src, 0, 0); return c; }
const pair = (rows, pal) => { const r = bake(rows, pal); return [r, flip(r)]; };

/* ---------- mini police 3x5 (bulles) ---------- */
const GLYPH = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'], E: ['###', '#..', '##.', '#..', '###'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'], M: ['#.#', '###', '###', '#.#', '#.#'], O: ['###', '#.#', '#.#', '#.#', '###'], P: ['##.', '#.#', '##.', '#..', '#..'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], U: ['#.#', '#.#', '#.#', '#.#', '###'], G: ['.##', '#..', '#.#', '#.#', '.##'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'], '.': ['...', '...', '...', '...', '.#.'], ' ': ['...', '...', '...', '...', '...'],
  '+': ['.##', '.#.', '.#.', '##.', '##.']
};
function text3(c, s, X, Y, col) { [...s].forEach((ch, i) => (GLYPH[ch] || GLYPH[' ']).forEach((r, yy) => [...r].forEach((p, xx) => { if (p === '#') P(c, X + i * 4 + xx, Y + yy, col); }))); }
function bubble(c, s, cx, by, col) {
  const wd = s.length * 4 + 3, X = F(cx - wd / 2), Y = by - 9;
  R(c, X, Y + 1, wd, 7, '#0a0c10'); R(c, X + 1, Y, wd - 2, 9, '#0a0c10'); R(c, X + 1, Y + 1, wd - 2, 7, '#f1f4f2');
  P(c, cx, Y + 9, '#0a0c10'); P(c, cx, Y + 8, '#f1f4f2'); text3(c, s, X + 2, Y + 2, col || '#14161c');
}

/* ---------- formes de verrerie (masques générés) ---------- */
function makeShape(w, h, inside) {
  const g = new Uint8Array(w * h);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) g[yy * w + xx] = inside(xx, yy) ? 1 : 0;
  const at = (a, b) => a >= 0 && b >= 0 && a < w && b < h && g[b * w + a];
  const rows = [];
  for (let yy = 0; yy < h; yy++) { let x0 = -1, x1 = -1; for (let xx = 0; xx < w; xx++) if (g[yy * w + xx]) { if (x0 < 0) x0 = xx; x1 = xx; } if (x0 >= 0) rows.push({ y: yy, x0, x1 }); }
  const glass = document.createElement('canvas'); glass.width = w; glass.height = h;
  const spec = document.createElement('canvas'); spec.width = w; spec.height = h;
  const gc = glass.getContext('2d'), sc = spec.getContext('2d');
  for (const r of rows) {
    gc.fillStyle = 'rgba(120,190,215,.07)'; gc.fillRect(r.x0, r.y, r.x1 - r.x0 + 1, 1);
    const wd = r.x1 - r.x0 + 1;
    if (wd >= 4) { sc.fillStyle = 'rgba(235,252,255,.30)'; sc.fillRect(r.x0 + 1 + F(wd * .12), r.y, 1, 1); }
  }
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    if (g[yy * w + xx]) continue;
    if (at(xx - 1, yy) || at(xx + 1, yy) || at(xx, yy - 1) || at(xx, yy + 1)) {
      const litSide = (xx - w / 2) + (yy - h / 2) * .5 < 0;
      gc.fillStyle = litSide ? K.glassL : K.glassD; gc.fillRect(xx, yy, 1, 1);
    }
  }
  // surface pour chaque pourcentage de remplissage (volume réel, pas hauteur)
  const total = rows.reduce((s, r) => s + r.x1 - r.x0 + 1, 0), surf = new Int16Array(101);
  for (let p = 0; p <= 100; p++) {
    const target = total * p / 100; let acc = 0, s = 9999;
    for (let i = rows.length - 1; i >= 0; i--) { acc += rows[i].x1 - rows[i].x0 + 1; if (acc >= target - .5) { s = rows[i].y; break; } }
    surf[p] = p === 0 ? 9999 : s;
  }
  return { w, h, rows, glass, spec, surf, bot: rows[rows.length - 1].y, top: rows[0].y };
}
const SH = {
  round: (r, nw, nh) => { const w = 2 * r + 3, cx = r + 1, cy = nh + r + 1; return Object.assign(makeShape(w, nh + 2 * r + 3, (a, b) => ((a - cx) ** 2 + (b - cy) ** 2 <= r * r + r * .6) || (Math.abs(a - cx) <= nw / 2 - .5 && b >= 1 && b <= cy)), { cx, cy, r }); },
  erlen: (bw, hh, nw, nh) => { const w = bw + 2, cx = w / 2 - .5; return Object.assign(makeShape(w, nh + hh + 2, (a, b) => { if (b < 1 || b > nh + hh) return false; if (b <= nh) return Math.abs(a - cx) <= nw / 2 - .5; const k = (b - nh) / hh; return Math.abs(a - cx) <= (nw / 2 + (bw / 2 - nw / 2) * Math.min(1, k * 1.15)) - .5; }), { cx }); },
  tube: (tw, th) => { const w = tw + 2, cx = w / 2 - .5, r = tw / 2; return Object.assign(makeShape(w, th + 2, (a, b) => b >= 1 && (b <= th - r ? Math.abs(a - cx) <= r - .5 : (a - cx) ** 2 + (b - (th - r)) ** 2 <= r * r)), { cx }); },
  column: (cw, ch) => Object.assign(makeShape(cw + 2, ch + 2, (a, b) => a >= 1 && a <= cw && b >= 1 && b <= ch), { cx: cw / 2 + .5 }),
  capsule: (cw, ch) => { const r = ch / 2; return makeShape(cw + 2, ch + 2, (a, b) => { const yy = b - (r + .5); if (Math.abs(yy) > r - .3) return false; const lx = a - (r + .5), rx = a - (cw - r + 1.5); if (lx < 0) return lx * lx + yy * yy <= r * r; if (rx > 0) return rx * rx + yy * yy <= r * r; return true; }); },
  funnel: (fw, fh) => { const w = fw + 2, cx = w / 2 - .5; return Object.assign(makeShape(w, fh + 2, (a, b) => { if (b < 1 || b > fh) return false; if (b <= 2) return Math.abs(a - cx) <= 1; const k = (b - 2) / (fh - 2); const half = k < .45 ? (fw / 2) * Math.sin(Math.PI / 2 * (k / .45) * .9 + .3) : (fw / 2) * (1 - (k - .45) / .55 * .85); return Math.abs(a - cx) <= Math.max(.6, half) - .5; }), { cx }); }
};

/* ---------- état ---------- */
let S = 2, W = 0, H = 0, w = 0, h = 0, L = {};
let tick = 0, t = 0, last = 0;
let V = {}, links = [], drops = [], parts = [], smoke = [], arcs = [], sparks = [], bats = [];
let G = {};               // géométrie
let sci = null, ev = null, flash = 0, dimK = 0, dimT = 0, nextZap = 8, nextEvent = 50, nextBat = 6, clicks = [];
const liqCache = new Map();
function liq(c) {
  const k = (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0);
  let o = liqCache.get(k);
  if (!o) { o = { c: css(c), hi: css(light(c, .5)), lo: css(dark(c, .35)), dk: css(dark(c, .6)), rgb: c }; if (liqCache.size > 400) liqCache.clear(); liqCache.set(k, o); }
  return o;
}

/* ---------- récipients ---------- */
function vessel(id, shape, X, Y, cap, vol, col, o = {}) {
  V[id] = Object.assign({ id, shape, X: F(X), Y: F(Y), cap, vol, col: vivid(col), bub: [], boil: 0, pulse: 0 }, o);
  return V[id];
}
const lev = v => v.vol / v.cap;
function surfY(v) { const p = clamp(Math.round(lev(v) * 100), 0, 100); return v.Y + v.shape.surf[p]; }
function addTo(v, q, col) { v.vol += q; if (col) v.col = vivid(lerp(v.col, col, Math.min(1, q / Math.max(q, v.vol) * 1.6))); }
function drawVessel(v) {
  const s = v.shape, X = v.X, Y = v.Y;
  x.drawImage(s.glass, X, Y);
  const p = clamp(Math.round(lev(v) * 100), 0, 100), sy = s.surf[p], Lq = liq(v.col);
  if (p > 0) for (const r of s.rows) {
    if (r.y < sy) continue;
    const wd = r.x1 - r.x0 + 1;
    if (r.y === sy) {
      R(x, X + r.x0, Y + r.y, wd, 1, Lq.hi);
      if (wd > 4) { const k = F((t * 6 + v.X) % wd); P(x, X + r.x0 + k, Y + r.y, Lq.c); }
      continue;
    }
    R(x, X + r.x0, Y + r.y, wd, 1, r.y >= s.bot - 1 ? Lq.lo : Lq.c);
    if (wd > 2) { P(x, X + r.x1, Y + r.y, Lq.lo); }
  }
  for (const b of v.bub) if (Y + b.y > Y + sy) P(x, X + b.x, Y + b.y, Lq.hi);
  x.drawImage(s.spec, X, Y);
}
function stepBubbles(v, rate) {
  const s = v.shape, p = clamp(Math.round(lev(v) * 100), 0, 100), sy = s.surf[p];
  if (p > 2 && Math.random() < rate) {
    const r = s.rows[s.rows.length - 2] || s.rows[0];
    if (r.y > sy) v.bub.push({ x: ri(r.x0, r.x1), y: r.y, v: rnd(.35, .9) * (FPS === 15 ? 2 : 1) });
  }
  for (let i = v.bub.length - 1; i >= 0; i--) {
    const b = v.bub[i]; b.y -= b.v;
    const row = s.rows.find(r => r.y === F(b.y)); if (row) b.x = clamp(b.x + (Math.random() < .2 ? ri(-1, 1) : 0), row.x0, row.x1);
    if (b.y <= sy) v.bub.splice(i, 1);
  }
}

/* ---------- tubes (convoyeurs de liquide) ---------- */
function pathPx(pts) {
  const out = [];
  for (let i = 1; i < pts.length; i++) { const seg = linePts(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); if (out.length) seg.shift(); out.push(...seg); }
  return out;
}
function link(o) {
  const L2 = Object.assign({ v: 18, q: .16, wd: 2, style: 'liquid', on: false, acc: 0, off: 0, count: 0, hi: .6, lo: .15, full: .95 }, o);
  L2.px = pathPx(o.path); L2.cells = new Array(L2.px.length).fill(null);
  links.push(L2); return L2;
}
function idxNear(Lk, X, Y) { let best = 0, bd = 1e9; Lk.px.forEach(([a, b], i) => { const d = Math.abs(a - X) + Math.abs(b - Y); if (d < bd) { bd = d; best = i; } }); return best; }
function stepLink(Lk, dt) {
  Lk.decide();
  if (!Lk.on && Lk.count <= 0) return;
  Lk.acc += Lk.v * dt; Lk.off += Lk.v * dt;
  let guard = 0;
  while (Lk.acc >= 1 && guard++ < 50) { Lk.acc -= 1; shiftLink(Lk); }
}
function shiftLink(Lk) {
  const end = Lk.outAt != null ? Lk.outAt : Lk.cells.length - 1, cells = Lk.cells;
  const out = cells[end];
  if (out) { Lk.count--; Lk.deliver(out, Lk.px[end]); }
  for (let i = end; i > 0; i--) cells[i] = cells[i - 1];
  cells[0] = null;
  if (Lk.on) { const c = Lk.take(); if (c) { cells[0] = c; Lk.count++; } }
}
function drawLinkLiquid(Lk) {
  const c = Lk.cells, px = Lk.px, wd = Lk.wd, off = F(Lk.off), n = c.length;
  for (let i = 0; i < n; i++) {
    const col = c[i]; if (!col) continue;
    const [X, Y] = px[i], ph = ((i - off) % 9 + 9) % 9;
    if (Lk.style === 'vapor' && i < Lk.vaporEnd) {
      if ((i * 7 + off * 3) % 5 !== 0) continue;
      x.fillStyle = css(light(col, .65), .55); x.fillRect(X, Y, 1, 1); continue;
    }
    if (Lk.style === 'vapor' && (((i - off) % 5) + 5) % 5 !== 0) continue;
    const Lq = liq(col);
    x.fillStyle = ph < 2 ? Lq.hi : Lq.c;
    x.fillRect(X, Y, wd, wd);
  }
}
function bakePipe(c, px, wd, alpha) {
  const o = wd === 2 ? 4 : 3;
  c.fillStyle = K.glassD; for (const [X, Y] of px) c.fillRect(X - 1, Y - 1, o, o);
  c.fillStyle = K.glassL; for (const [X, Y] of px) c.fillRect(X - 1, Y - 1, o - 1, 1);
  c.fillStyle = K.glassIn; for (const [X, Y] of px) c.fillRect(X, Y, wd, wd);
}

/* ---------- gouttes ---------- */
function drop(X, Y, col, q, dest, o = {}) { drops.push(Object.assign({ x: X, y: Y, vy: 0, col, q, dest }, o)); }
function stepDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (d.path) {           // goutte qui glisse le long d'un tube (réactif)
      d.s += 30 * dt;
      if (d.s >= d.len) { d.path = null; d.x = d.end[0]; d.y = d.end[1]; }
      else { let rem = d.s; for (let k = 1; k < d.path.length; k++) { const a = d.path[k - 1], b = d.path[k], sl = Math.hypot(b[0] - a[0], b[1] - a[1]); if (rem <= sl) { d.x = a[0] + (b[0] - a[0]) * rem / sl; d.y = a[1] + (b[1] - a[1]) * rem / sl; break; } rem -= sl; } }
      continue;
    }
    d.vy += 140 * dt; d.y += d.vy * dt;
    const target = d.dest ? Math.min(surfY(d.dest), d.dest.Y + d.dest.shape.bot) : 9999;
    if (d.y >= target) {
      drops.splice(i, 1);
      if (d.react) d.react(); else if (d.dest) addTo(d.dest, d.q, d.col);
      if (MOTION === 'full') for (let k = 0; k < 2; k++) parts.push({ x: d.x, y: target - 1, vx: rnd(-.6, .6), vy: rnd(-1.2, -.4), life: ri(4, 8), col: liq(d.col).hi });
    }
  }
}

/* ---------- mise en page ---------- */
function layout() {
  W = innerWidth; H = innerHeight;
  const compact = W < 760;
  S = compact ? 2 : (H >= 1300 && W >= 1800) ? 4 : (H >= 820 && W >= 1100) ? 3 : 2;
  w = Math.ceil(W / S); h = Math.ceil(H / S);
  cvs.width = w; cvs.height = h;
  cvs.style.width = (w * S) + 'px'; cvs.style.height = (h * S) + 'px';
  const offX = w * S - W, offY = h * S - H, left = -F(offX / 2);
  cvs.style.left = left + 'px'; cvs.style.top = (-offY) + 'px';
  const TOP = compact ? 22 : (S >= 3 ? 38 : 44), BOT = compact ? 66 : (S >= 3 ? 82 : 88), SL = compact ? 3 : 46, SR = compact ? 3 : 42;
  L = { compact, TOP, BOT, SL, SR, floor: h - (compact ? 4 : 6), yB: h - (compact ? 14 : 20), py0: TOP, py1: h - BOT };
  const st = document.documentElement.style;
  st.setProperty('--in-t', (TOP * S - offY) + 'px'); st.setProperty('--in-b', (BOT * S) + 'px');
  st.setProperty('--in-l', (SL * S + left) + 'px'); st.setProperty('--in-r', (SR * S - (offX + left)) + 'px');
  st.setProperty('--px', S + 'px');
  build();
  buildBack();
  // préchauffage : l'installation tourne déjà quand la page s'affiche
  for (let i = 0; i < 26 * 30; i++) simulate(1 / 30, true);
  if (STATIC) draw();
}

function build() {
  V = {}; links = []; drops = []; parts = []; smoke = []; arcs = []; sparks = []; bats = []; ev = null; liqCache.clear();
  const c = L.compact, yB = L.yB, fl = L.floor, rs = seeded(5);
  const bx0 = c ? 2 : L.SL, bx1 = c ? w - 2 : w - L.SR;
  const benchW = bx1 - bx0;
  const k = c ? 1 : clamp((benchW * .6 - 80) / 120, .9, 2.3);
  G = { bx0, bx1, k, items: [] };

  /* bouilleur A sur trépied + brûleur */
  const rA = c ? 7 : 11, tri = c ? 6 : 9;
  const shA = SH.round(rA, c ? 5 : 7, c ? 4 : 6);
  const Acx = bx0 + (c ? 12 : 22);
  const A = vessel('A', shA, Acx - shA.cx, yB - tri - shA.h + 1, 100, c ? 80 : 70, PAL[0], { name: 'Bouilleur' });
  G.A = { cx: Acx, tri };

  /* condenseur + récepteur D */
  const Cx = F(Acx + (c ? 22 : 30 * k));
  const shD = SH.erlen(c ? 11 : 16, c ? 11 : 15, 4, c ? 3 : 4);
  const D = vessel('D', shD, Cx - F(shD.cx), yB - shD.h + 1, 60, 30, PAL[0], { name: 'Récepteur' });
  const yVap = A.Y - (c ? 7 : 10), yRet = A.Y - (c ? 11 : 16);
  const jTop = yVap + 3, jBot = D.Y - (c ? 4 : 6);
  G.C = { x: Cx, jTop, jBot };

  /* pompe + ballon de réaction E + ampoule à réactif Fn */
  const pumpX = F(Cx + (c ? 16 : 22 * k));
  const rE = c ? 6 : 10, shE = SH.round(rE, c ? 4 : 5, c ? 3 : 5);
  const Ecx = F(pumpX + (c ? 15 : 22 * k));
  const Ecy = yB - (c ? 26 : 40);
  const E = vessel('E', shE, Ecx - shE.cx, Ecy - shE.cy, 80, c ? 60 : 50, PAL[1], { name: 'Ballon de réaction' });
  const shF = SH.funnel(c ? 7 : 11, c ? 10 : 15);
  const Fcx = Ecx + (c ? 12 : 20);
  const Fn = vessel('F', shF, Fcx - F(shF.cx), E.Y - (c ? 3 : 4), 20, 14, PAL[2], { name: 'Réactif' });
  G.pump = { x: pumpX, y: yB - 4 }; G.E = { cx: Ecx, cy: Ecy, r: rE }; G.F = { cx: Fcx };

  /* distributeur + éprouvettes */
  const nT = c ? 2 : 3, tw = c ? 4 : 5, th = c ? 15 : 21, gap = c ? 7 : 9;
  const rackX = F(Fcx + (c ? 9 : 14 * k));
  const tubes = [];
  for (let i = 0; i < nT; i++) {
    const sh = SH.tube(tw, th);
    tubes.push(vessel('T' + i, sh, rackX + i * gap, yB - sh.h + 1 - 1, 24, i === 0 ? 20 : i === 1 ? (c ? 14 : 6) : 0, PAL[1], { name: 'Éprouvette' }));
  }
  G.rack = { x: rackX, n: nT, gap, tw, top: yB - th - 2, drain: false, target: 0 };

  /* serpentin (bureau) */
  const spx = c ? 0 : F(rackX + nT * gap + 16 + 26 * k);
  G.sp = c ? null : { x: spx, top: yB - 50, bot: yB - 2 };

  /* colonne H + réservoir R (bureau) */
  if (!c) {
    const Hcx = w - 22, shH = SH.column(10, fl - 1 - 10);
    vessel('H', shH, Hcx - 6, 10, 130, 118, PAL[3], { name: 'Colonne' });
    const Rw = Math.min(110, F(w * .16)), Rcx = F(L.SL + (w - L.SL - L.SR) * .58);
    const shR = SH.capsule(Rw, L.TOP - 22);
    vessel('R', shR, Rcx - F(Rw / 2), 8, 100, 70, PAL[4], { name: 'Réservoir' });
  }

  /* ---------- circuits ---------- */
  const tubeTop = G.rack.top;
  // 1. A → condenseur → D (vapeur puis gouttes)
  const zig = [[Cx, yVap], [Cx, jTop]];
  for (let yy = jTop + 2, s2 = -1; yy < jBot - 1; yy += c ? 3 : 4, s2 = -s2) zig.push([Cx + s2 * (c ? 2 : 3), yy]);
  zig.push([Cx, jBot], [Cx, jBot + 1]);
  const vap = link({
    id: 'vap', from: A, to: D, wd: 1, style: 'vapor', v: 16, q: .14, hi: .4, lo: .16,
    path: [[Acx + 2, A.Y + 3], [Acx + 2, yVap], ...zig]
  });
  vap.vaporEnd = idxNear(vap, Cx, jTop + 1);
  vap.take = () => A.vol >= vap.q ? (A.vol -= vap.q, A.col.slice()) : null;
  vap.deliver = (col, p) => drop(p[0], p[1] + 1, col, vap.q, D);
  vap.decide = () => { const s = lev(A), d = lev(D); if (!vap.on) { if (s >= vap.hi && d < vap.full) vap.on = true; } else if (s <= vap.lo || d >= vap.full) vap.on = false; };

  // 2. D → pompe → E
  const pumpPath = [[D.X + D.shape.w - 3, yB - 3], [pumpX, yB - 3], [Ecx - (c ? 9 : 13), yB - 3], [Ecx - (c ? 9 : 13), E.Y - 3], [Ecx - 1, E.Y - 3], [Ecx - 1, E.Y + 2]];
  const pump = link({ id: 'pump', from: D, to: E, v: 20, q: .17, hi: .62, lo: .14, path: pumpPath });
  pump.take = () => D.vol >= pump.q ? (D.vol -= pump.q, D.col.slice()) : null;
  pump.deliver = col => addTo(E, pump.q, col);
  pump.decide = () => { const s = lev(D), d = lev(E); if (!pump.on) { if (s >= pump.hi && d < pump.full) pump.on = true; } else if (s <= pump.lo || d >= pump.full) pump.on = false; };

  // 3. E → rampe de distribution → éprouvettes
  const ry = tubeTop - (c ? 4 : 6);
  const man = link({ id: 'man', from: E, wd: 1, v: 16, q: .15, hi: .58, lo: .14, path: [[Ecx, Ecy + rE - 1], [Ecx, ry], [rackX + (nT - 1) * gap + F(tw / 2) + 1, ry]] });
  G.rack.ry = ry;
  man.spouts = tubes.map(tb => idxNear(man, tb.X + F(tb.shape.cx), ry));
  man.outAt = man.spouts[0];
  man.take = () => E.vol >= man.q ? (E.vol -= man.q, E.col.slice()) : null;
  man.deliver = (col, p) => { const tb = tubes[G.rack.target] || tubes[tubes.length - 1]; drop(p[0], p[1] + 2, col, man.q, tb); };
  man.decide = () => {
    let tIdx = tubes.findIndex(tb => lev(tb) < .95);
    const blocked = G.rack.drain || tIdx < 0;
    if (!blocked && tIdx !== G.rack.target) { G.rack.target = tIdx; setOutAt(man, man.spouts[tIdx], tubes[tIdx]); }
    const s = lev(E);
    if (!man.on) { if (s >= man.hi && !blocked) man.on = true; } else if (s <= man.lo || blocked) man.on = false;
  };

  // 4. éprouvettes → collecteur → (serpentin → colonne H) ou retour direct vers A
  const cy2 = yB + (c ? 5 : 6);
  let drainPath;
  if (c) drainPath = [[rackX + 1, cy2], [2, cy2], [2, yRet], [Acx - 3, yRet], [Acx - 3, A.Y + 1]];
  else {
    const Hb = V.H;
    drainPath = [[rackX + 1, cy2], [spx - 7, cy2], [spx - 7, yB - 4]];
    for (let yy = yB - 8, s2 = 1; yy >= G.sp.top + 2; yy -= 5, s2 = -s2) drainPath.push([spx + s2 * 7, yy]);
    const lastX = drainPath[drainPath.length - 1][0];
    drainPath.push([lastX, G.sp.top - 2], [spx + 12, G.sp.top - 2], [spx + 12, cy2], [Hb.X - 2, cy2], [Hb.X + 3, cy2]);
  }
  const dest4 = c ? A : V.H;
  const drain = link({ id: 'drain', v: 22, q: .16, path: drainPath });
  drain.take = () => { const tb = tubes.find(z => z.vol >= drain.q); return tb ? (tb.vol -= drain.q, tb.col.slice()) : null; };
  drain.deliver = col => addTo(dest4, drain.q, col);
  drain.decide = () => {
    const allFull = tubes.every(tb => lev(tb) >= .95), empty = tubes.every(tb => tb.vol < drain.q);
    if (!drain.on) { if (allFull && lev(dest4) < drain.full) { drain.on = true; G.rack.drain = true; } }
    else if (empty || lev(dest4) >= drain.full) { drain.on = false; if (empty) G.rack.drain = false; }
  };

  if (!c) {
    const Hv = V.H, Rv = V.R, Hcx = Hv.X + 6;
    // 5. colonne H → tuyau du plafond → réservoir R
    const up = link({ id: 'up', from: Hv, to: Rv, v: 24, q: .17, hi: .6, lo: .2, path: [[Hcx, 13], [Hcx, 5], [Rv.X + Rv.shape.w - 9, 5], [Rv.X + Rv.shape.w - 9, Rv.Y + 4]] });
    up.take = () => Hv.vol >= up.q ? (Hv.vol -= up.q, Hv.col.slice()) : null;
    up.deliver = col => addTo(Rv, up.q, col);
    up.decide = () => { const s = lev(Hv), d = lev(Rv); if (!up.on) { if (s >= up.hi && d < up.full) up.on = true; } else if (s <= up.lo || d >= up.full) up.on = false; };
    // 6. réservoir R → descente gauche → bouilleur A
    const rd = link({ id: 'ret', from: Rv, to: A, v: 22, q: .17, hi: .5, lo: .1, path: [[Rv.X + 8, Rv.Y + Rv.shape.bot - 1], [Rv.X + 8, L.TOP - 7], [5, L.TOP - 7], [5, yRet], [Acx - 3, yRet], [Acx - 3, A.Y + 1]] });
    rd.take = () => Rv.vol >= rd.q ? (Rv.vol -= rd.q, Rv.col.slice()) : null;
    rd.deliver = col => addTo(A, rd.q, col);
    rd.decide = () => { const s = lev(Rv), d = lev(A); if (!rd.on) { if (s >= rd.hi && d < rd.full) rd.on = true; } else if (s <= rd.lo || d >= rd.full) rd.on = false; };
  } else {
    drain.hi = 0; // la vidange se déclenche dès que les tubes sont pleins
  }
  G.yRet = yRet; G.yVap = yVap; G.cy2 = cy2;

  /* bobine Tesla */
  if (c) G.tesla = { cx: w - 14, base: fl, sy: yB - 34, r: 6, small: true };
  else G.tesla = { cx: 23, base: fl, sy: F(L.py0 + (fl - L.py0) * .5), r: 12, small: false };

  /* instruments sur l'espace libre */
  const used = c ? rackX + nT * gap + 6 : spx + 18;
  const end = c ? G.tesla.cx - 10 : bx1 - 6;
  const cand = c ? ['micro', 'bird'] : ['micro', 'bird', 'gears', 'book', 'meter'];
  const WD = { micro: 13, bird: 18, gears: 24, book: 16, meter: 14, pumpkin: 10 };
  if (HALLOWEEN) cand.splice(2, 0, 'pumpkin');
  const chosen = []; let sum = 0;
  for (const it of cand) if (sum + WD[it] + 12 <= end - used) { chosen.push(it); sum += WD[it] + 12; }
  const g2 = (end - used - sum) / (chosen.length + 1);
  let X = used + g2;
  for (const it of chosen) { G.items.push({ type: it, x: F(X + 6), w: WD[it], ph: rs() * 6 }); X += WD[it] + 12 + g2; }

  /* disjoncteur (bureau) */
  G.breaker = c ? null : { x: w - L.SR + 3, y: fl - 44 };
  /* lampes du plafond */
  G.lamps = [];
  if (!c) { const r0 = L.SL + 30, r1 = V.R.X - 20; const n = r1 - r0 > 260 ? 3 : 2; for (let i = 0; i < n; i++) G.lamps.push({ x: F(r0 + (r1 - r0) * (i + .5) / n), k: 1, off: 0 }); }

  /* scientifique */
  sci = { x: F((G.bx0 + G.bx1) / 2), dir: 1, mode: 'idle', timer: 60, task: null, bub: null, jump: 0, frame: 'stand', note: 0 };
}
function setOutAt(Lk, idx, tb) {
  // ce qui est déjà passé plus loin dans la rampe tombe dans la nouvelle éprouvette
  for (let i = idx + 1; i < Lk.cells.length; i++) if (Lk.cells[i]) { addTo(tb, Lk.q, Lk.cells[i]); Lk.cells[i] = null; Lk.count--; }
  Lk.outAt = idx;
}

/* ---------- décor fixe ---------- */
function buildBack() {
  back.width = w; back.height = h;
  const c = bx, r = seeded(13), cp = L.compact;
  R(c, 0, 0, w, h, K.void);
  // mur de pierre anthracite
  const BH = 6, BW = 14;
  for (let row = 0; row * BH < h; row++) {
    const off = row % 2 ? 7 : 0;
    for (let col = -1; col * BW < w + BW; col++) {
      const X = col * BW + off, Y = row * BH, v = r();
      const base = v < .1 ? '#15181e' : v < .55 ? '#1a1d24' : v < .9 ? '#1e222a' : '#232833';
      R(c, X, Y, BW - 1, BH - 1, base); R(c, X, Y, BW - 1, 1, '#262b36');
      if (v > .95) P(c, X + 4, Y + 3, '#101216');
    }
  }
  const g = c.createRadialGradient(w / 2, h * .55, Math.min(w, h) * .2, w / 2, h / 2, Math.max(w, h) * .8);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.7)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // tuyaux de cuivre au plafond
  R(c, 0, 1, w, 1, K.cuHi); R(c, 0, 2, w, 1, K.cu); R(c, 0, 3, w, 1, K.cuLo);
  for (let X = 10; X < w; X += 42) { R(c, X, 0, 3, 5, K.brass); P(c, X, 0, K.brassHi); }
  if (!cp) {
    // schémas punaisés
    const sx = L.SL + 6;
    [[sx, 10, 22, 16], [sx + 26, 14, 18, 14]].forEach(([X, Y, ww, hh], i) => {
      R(c, X, Y, ww, hh, '#c9bb93'); R(c, X, Y, ww, 1, '#e3d6b0'); R(c, X + ww - 1, Y, 1, hh, '#9c8f6a');
      for (let k2 = 0; k2 < 4; k2++) R(c, X + 3, Y + 4 + k2 * 3, F(ww * (.4 + r() * .4)), 1, '#6a5f48');
      if (i === 0) { disc(c, X + ww - 6, Y + 6, 3, '#6a5f48'); disc(c, X + ww - 6, Y + 6, 2, '#c9bb93'); }
      P(c, X + F(ww / 2), Y + 1, '#c0392b');
    });
    // lampes (fixations)
    for (const l of G.lamps) { R(c, l.x, 4, 1, 6, '#101215'); R(c, l.x - 3, 10, 7, 1, K.ironLo); R(c, l.x - 4, 11, 9, 1, K.brassLo); R(c, l.x - 5, 12, 11, 1, K.brass); }
    // conduites décoratives des murs
    R(c, 1, 6, 1, L.floor - 6, K.cuLo); R(c, w - 2, 6, 1, L.floor - 6, K.cuLo);
    // disjoncteur
    const b = G.breaker;
    R(c, b.x, b.y, 12, 16, K.ironLo); R(c, b.x + 1, b.y + 1, 10, 14, K.iron); R(c, b.x + 1, b.y + 1, 10, 1, K.ironHi);
    R(c, b.x + 3, b.y + 3, 6, 4, '#0d0f13'); P(c, b.x + 4, b.y + 12, '#e0c040'); P(c, b.x + 6, b.y + 12, '#000');
    line(c, b.x + 6, b.y + 16, b.x + 6, L.floor, '#2a2f38');
  }
  // sol
  R(c, 0, L.floor, w, h - L.floor, '#1b1e25'); R(c, 0, L.floor, w, 1, '#2a2f39');
  for (let X = 0; X < w; X += 16) R(c, X, L.floor + 1, 1, h, '#131519');
  // paillasse
  const yB = L.yB, x0 = G.bx0, x1 = G.bx1;
  R(c, x0, yB, x1 - x0, 1, '#4a4f58'); R(c, x0, yB + 1, x1 - x0, 1, '#363a42'); R(c, x0, yB + 2, x1 - x0, 1, '#2a2d34'); R(c, x0, yB + 3, x1 - x0, 1, '#15171b');
  for (let X = x0 + 2; X < x1; X += 60) { R(c, X, yB + 4, 2, L.floor - yB - 4, K.woodLo); P(c, X, yB + 4, K.wood); }
  R(c, x1 - 3, yB + 4, 2, L.floor - yB - 4, K.woodLo);
  // tuyaux en verre (sans liquide)
  for (const Lk of links) bakePipe(c, Lk.px, Lk.wd);
  // condenseur : manchon et support
  const C = G.C;
  R(c, C.x + 8, C.jTop - 4, 1, L.yB - C.jTop + 4, K.ironHi); R(c, C.x + 4, C.jTop + 4, 5, 1, K.steel);
  R(c, C.x - 5, C.jTop, 11, 1, K.glassL); R(c, C.x - 5, C.jBot, 11, 1, K.glassD);
  R(c, C.x - 6, C.jTop, 1, C.jBot - C.jTop + 1, K.glassL); R(c, C.x + 6, C.jTop, 1, C.jBot - C.jTop + 1, K.glassD);
  // statif + anneau du ballon E
  const E = G.E; const rod = E.cx + E.r + 4;
  R(c, rod, V.F.Y - 4, 1, yB - V.F.Y + 4, K.ironHi); R(c, rod - 4, yB - 1, 9, 1, K.iron);
  R(c, E.cx - E.r, E.cy + 3, E.r * 2 + 1, 1, K.steel); R(c, E.cx + E.r, E.cy + 3, rod - E.cx - E.r, 1, K.steel);
  R(c, G.F.cx + 4, V.F.Y + 6, rod - G.F.cx - 4, 1, K.steel);
  // tige de l'ampoule à réactif jusqu'au ballon
  const Fv = V.F, fy = Fv.Y + Fv.shape.bot + 1;
  G.stem = [[G.F.cx, fy + 1], [G.F.cx, fy + 3], [E.cx + F(E.r * .6), E.cy - F(E.r * .7)]];
  poly(c, G.stem.map(p => [p[0] - 1, p[1]]), K.glassD); poly(c, G.stem, K.glassIn); poly(c, G.stem.map(p => [p[0] + 1, p[1]]), K.glassD);
  // support des éprouvettes + becs de la rampe
  const rk = G.rack, rx0 = rk.x - 2, rx1 = rk.x + rk.n * rk.gap;
  R(c, rx0, rk.top + 8, rx1 - rx0, 1, K.woodHi); R(c, rx0, rk.top + 9, rx1 - rx0, 1, K.wood);
  R(c, rx0, yB - 2, rx1 - rx0, 2, K.wood); R(c, rx0, yB - 2, rx1 - rx0, 1, K.woodHi); R(c, rx0, rk.top + 8, 1, yB - rk.top - 8, K.woodLo); R(c, rx1 - 1, rk.top + 8, 1, yB - rk.top - 8, K.woodLo);
  for (let i = 0; i < rk.n; i++) {
    const tb = V['T' + i], cx = tb.X + F(tb.shape.cx);
    R(c, cx - 1, rk.ry + 1, 3, 3, K.glassD); P(c, cx, rk.ry + 2, K.glassIn); P(c, cx, rk.ry + 3, K.glassIn);
    R(c, cx, yB, 1, G.cy2 - yB, K.glassD);   // tube de vidange vers le collecteur
  }
  // serpentin : tige de support
  if (G.sp) { R(c, G.sp.x, G.sp.top - 6, 1, yB - G.sp.top + 6, K.ironHi); R(c, G.sp.x - 3, yB - 1, 7, 1, K.iron); }
  // trépied du bouilleur
  const A = V.A, ax = G.A.cx, ab = A.Y + A.shape.h - 1;
  line(c, ax - 7, yB - 1, ax - 5, ab, K.ironHi); line(c, ax + 7, yB - 1, ax + 5, ab, K.ironHi); R(c, ax - 6, ab, 13, 1, K.steel);
  // bobine Tesla
  bakeTesla(c);
  // réservoir : colliers
  if (V.R) { const Rv = V.R; for (const X of [Rv.X + 14, Rv.X + Rv.shape.w - 15]) { R(c, X, 4, 1, Rv.Y - 3, K.ironHi); R(c, X - 1, Rv.Y - 1, 3, 1, K.brass); } }
  // colonne : socle
  if (V.H) { const Hv = V.H; R(c, Hv.X - 2, L.floor - 3, Hv.shape.w + 4, 3, K.brass); R(c, Hv.X - 2, L.floor - 3, Hv.shape.w + 4, 1, K.brassHi); for (let yy = 40; yy < L.floor - 20; yy += 70) R(c, Hv.X - 1, yy, Hv.shape.w + 2, 2, K.brassLo); }
}
function bakeTesla(c) {
  const T = G.tesla, cx = T.cx, b = T.base, sm = T.small;
  const bw = sm ? 10 : 22, bh = sm ? 4 : 10;
  R(c, cx - bw / 2, b - bh, bw, bh, K.iron); R(c, cx - bw / 2, b - bh, bw, 1, K.brassHi); R(c, cx - bw / 2, b - bh + 1, bw, 1, K.brass);
  R(c, cx - bw / 2, b - bh, 1, bh, K.ironHi); R(c, cx + bw / 2 - 1, b - bh, 1, bh, K.ironLo);
  const pw = sm ? 8 : 18, ph = sm ? 2 : 6, pY = b - bh - ph;
  for (let i = 0; i < ph; i++) R(c, cx - pw / 2, pY + i, pw, 1, i % 2 ? K.cuLo : K.cuHi);
  const colW = sm ? 3 : 7, top = T.sy + T.r - 1;
  for (let Y = top; Y < pY; Y++) { R(c, cx - F(colW / 2), Y, colW, 1, Y % 2 ? K.cu : K.cuLo); P(c, cx - F(colW / 2), Y, K.cuHi); }
  // sphère métallique ombrée (lumière en haut à gauche, tramage)
  const r = T.r, ramp = ['#22262e', '#363c47', '#545d6b', '#7c8796', '#a9b4c2', '#d6dee8', '#f6f9fc'];
  const bay = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
    const d2 = xx * xx + yy * yy; if (d2 > r * r + r * .4) continue;
    const nz = Math.sqrt(Math.max(0, 1 - d2 / (r * r))), nx = xx / r, ny = yy / r;
    let li = clamp(-.45 * nx - .55 * ny + .7 * nz, 0, 1) * .78 + .04;
    li += (bay[(yy + 16) % 4][(xx + 16) % 4] / 16 - .5) * .14;
    c.fillStyle = ramp[clamp(F(li * ramp.length), 0, ramp.length - 1)]; c.fillRect(cx + xx, T.sy + yy, 1, 1);
  }
}
function teslaTip() { const T = G.tesla; return [T.cx, T.sy]; }

/* ---------- arcs électriques ---------- */
function makeArc(x0, y0, x1, y1, life, big) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(3, F(d / (big ? 6 : 3))), j = big ? 5 : 2, pts = [];
  const nx = -(y1 - y0) / (d || 1), ny = (x1 - x0) / (d || 1);
  for (let i = 0; i <= n; i++) { const kk = i / n, o = (i === 0 || i === n) ? 0 : rnd(-j, j); pts.push([x0 + (x1 - x0) * kk + nx * o, y0 + (y1 - y0) * kk + ny * o]); }
  const br = [];
  if (big) for (let b = 0; b < 2; b++) { const s = pts[ri(1, pts.length - 2)], an = Math.atan2(y1 - y0, x1 - x0) + rnd(-1.3, 1.3), ln = rnd(6, 16); br.push([s, [s[0] + Math.cos(an) * ln * .5 + rnd(-2, 2), s[1] + Math.sin(an) * ln * .5 + rnd(-2, 2)], [s[0] + Math.cos(an) * ln, s[1] + Math.sin(an) * ln]]); }
  return { a: [x0, y0], b: [x1, y1], pts, br, life, big };
}
function drawArc(a) {
  const all = [a.pts, ...a.br];
  x.fillStyle = 'rgba(120,230,255,.28)';
  for (const pts of all) for (let i = 1; i < pts.length; i++) for (const [p, q] of linePts(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])) { x.fillRect(p - 1, q, 1, 1); x.fillRect(p + 1, q, 1, 1); x.fillRect(p, q - 1, 1, 1); x.fillRect(p, q + 1, 1, 1); }
  for (const pts of all) poly(x, pts, '#f0ffff');
  glow(x, a.b[0], a.b[1], a.big ? 10 : 4, [120, 230, 255], a.big ? .45 : .2);
}
function zap(strong) {
  const [sx, sy] = teslaTip(), T = G.tesla, targets = [];
  if (L.compact) targets.push([rnd(w * .5, w - 30), L.py1 + 1], [T.cx + rnd(-8, 8), L.yB - 1]);
  else targets.push([L.SL, rnd(L.py0 + 10, L.py1 - 10)], [rnd(4, 40), 3], [5, rnd(40, sy - 20)], [rnd(6, 40), L.floor]);
  const n = strong ? targets.length : 1;
  for (let i = 0; i < n; i++) { const tg = strong ? targets[i] : pick(targets), an = Math.atan2(tg[1] - sy, tg[0] - sx); arcs.push(makeArc(sx + Math.cos(an) * T.r, sy + Math.sin(an) * T.r, tg[0], tg[1], strong ? ri(4, 6) : 3, true)); }
  if (MOTION === 'full') flash = strong ? .18 : .08;
  for (const l of G.lamps) l.off = ri(2, 6);
  if (sci && strong && !ev && Math.random() < .5) { sci.jump = 6; sci.bub = { s: '!', t: 24 }; }
  for (let i = 0; i < 8; i++) sparks.push({ x: sx + rnd(-T.r, T.r), y: sy + rnd(-T.r, T.r), vx: rnd(-1.2, 1.2), vy: rnd(-1.4, .4), life: ri(5, 12) });
  window.dispatchEvent(new CustomEvent('lab:zap'));
  nextZap = t + (MOTION === 'calm' ? rnd(25, 40) : rnd(12, 20));
}

/* ---------- réactif : une goutte part de l'ampoule vers le ballon ---------- */
function doseReagent(force) {
  const Fv = V.F, E = V.E;
  if (!force && Fv.vol < 1) return false;
  if (!force) Fv.vol = Math.max(0, Fv.vol - 1);
  const pts = G.stem, len = pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
  const col = Fv.col.slice();
  drops.push({ x: pts[0][0], y: pts[0][1], vy: 0, s: 0, len, path: pts, end: pts[pts.length - 1], col, q: 0, dest: E,
    react: () => { E.col = vivid(lerp(E.col, col, .3)); E.pulse = 1; E.boil = Math.max(E.boil, .8); if (MOTION === 'full') for (let i = 0; i < 4; i++) sparks.push({ x: G.E.cx + rnd(-3, 3), y: surfY(E), vx: rnd(-.8, .8), vy: rnd(-1.4, -.4), life: ri(5, 10), col: liq(col).hi }); } });
  return true;
}
let doseTimer = 0, accent = null;

/* ---------- simulation ---------- */
function simulate(dt, warm) {
  for (const Lk of links) stepLink(Lk, dt);
  stepDrops(dt);
  // ébullition et bulles
  const vapOn = links[0].on;
  V.A.boil = vapOn ? 1 : .25;
  if (!warm) {
    stepBubbles(V.A, V.A.boil * .9);
    stepBubbles(V.D, .05); stepBubbles(V.E, .12 + V.E.boil * .6);
    V.E.boil *= .97; V.E.pulse *= .93;
    for (let i = 0; i < G.rack.n; i++) stepBubbles(V['T' + i], .03);
    if (V.H) stepBubbles(V.H, .35);
    if (V.R) stepBubbles(V.R, .04);
  }
  // le réactif goutte régulièrement tant qu'il en reste
  doseTimer -= dt;
  if (doseTimer <= 0) { doseTimer = rnd(1.6, 2.6); if (V.E.vol > 4) doseReagent(false); }
}
function totalVolume() { let s = 0; for (const k in V) if (k !== 'F') s += V[k].vol; for (const Lk of links) s += Lk.count * Lk.q; for (const d of drops) s += d.q; return s; }

/* ---------- le scientifique ---------- */
const SCI_PAL = { h: '#f3f3ef', H: '#b9bdc6', s: '#f1c29a', S: '#c98f68', g: '#c9993a', G: '#8fefff', e: '#1b1b22', m: '#7a3328', c: '#e7eef1', C: '#a7b6bf', b: '#6f7f88', t: '#b0303f', p: '#2b2e39', k: '#121317', w: '#7a5233', n: '#efe8d4', o: '#0d0f13' };
const HEAD = [
  '..............', '..............', '..............', '..............',
  '....h.hhh.h...', '..hhhhhhhhhh..', '.hhhhhhhhhhhh.', 'hhhggGGggGGgh.', 'hHhsssssssssh.', 'hHhsssesssess.', '.hhsssssssssS.', '.hhssHHHHHssS.', '..hhSssmssSS..', '....SSssSS....'];
const COAT = ['...cccttccc...', '..ccccbbcccc..', '.cccccbbccccC.', '.ccCccbbccccC.', '.ccCccbbcccCC.', '.ccCcccccccCC.', '.sCCccbbcccCs.', '..cccccccccC..', '..cccccbbccC..', '..ccccccccCC..'];
const NOTES = ['...cccttccc...', '..ccccbbcccc..', '.cccccbbccccC.', '.ccCccbbwwwwww', '.ccCccbbwnnnnw', '.ccCcccswnnnnw', '.sCCccbbwnnnnw', '..cccccccwwwww', '..cccccbbccC..', '..ccccccccCC..'];
const LEGS = {
  stand: ['...pppp.ppp...', '...ppp..ppp...', '...ppp..ppp...', '..kkkk..kkkk..'],
  a: ['...pppp.ppp...', '..ppp....ppp..', '.ppp......ppp.', 'kkkk......kkkk'],
  b: ['...ppppppp....', '....ppppp.....', '....pppp......', '...kkkkkk.....']
};
const SCI = {
  stand: pair([...HEAD, ...COAT, ...LEGS.stand], SCI_PAL), walkA: pair([...HEAD, ...COAT, ...LEGS.a], SCI_PAL), walkB: pair([...HEAD, ...COAT, ...LEGS.b], SCI_PAL),
  notes: pair([...HEAD, ...NOTES, ...LEGS.stand], SCI_PAL)
};
const Z_PAL = { k: '#15131b', z: '#86c45a', Z: '#5a8f3c', x: '#2c3a22', e: '#e8ff6a', n: '#a3acb6', j: '#3b3352', J: '#2a2440', p: '#2b2f3a', w: '#e9e6dc', m: '#1b2414' };
const CRE = {
  stand: pair(['..kkkkkkkk....', '.kkkkkkkkkk...', '.kzxxxxxxzk...', '..zzezzezz....', '..zzzzzzzz....', '..zZzmmzZz....', 'n..zzzzzz..n..', '...jjjjjjj....', '..jjjjjjjjjzz.', '.zjjjjjjjjJzz.', '.zjjjjjjjJj...', '..jjjjjjJj....', '..jjjjjjJj....', '...ppp..ppp...', '...ppp..ppp...', '...ppp..ppp...', '...ppp..ppp...', '..kkkk..kkkk..'], Z_PAL),
  walk: pair(['..kkkkkkkk....', '.kkkkkkkkkk...', '.kzxxxxxxzk...', '..zzezzezz....', '..zzzzzzzz....', '..zZzmmzZz....', 'n..zzzzzz..n..', '...jjjjjjj....', '..jjjjjjjjjzz.', '.zjjjjjjjjJzz.', '.zjjjjjjjJj...', '..jjjjjjJj....', '..jjjjjjJj....', '...ppp...ppp..', '..ppp....ppp..', '..ppp.....ppp.', '.ppp......ppp.', 'kkkk......kkkk'], Z_PAL)
};
const sciH = () => SCI.stand[0].height;
function sciStops() {
  const s = [{ x: G.A.cx - 7, task: 'burner' }, { x: G.rack.x - 2, task: 'notes' }, { x: G.E.cx - 4, task: 'watch' }];
  for (const it of G.items) if (it.type === 'micro') s.push({ x: it.x - 6, task: 'micro' });
  if (G.sp) s.push({ x: G.sp.x - 7, task: 'notes' });
  return s;
}
function goTo(xT, task, mode = 'walk') { sci.target = clamp(F(xT), G.bx0, G.bx1 - 14); sci.task = task; sci.mode = mode; }
function stepSci() {
  const s = sci; if (!s) return;
  if (s.bub && --s.bub.t <= 0) s.bub = null;
  if (s.jump > 0) s.jump--;
  if (s.mode === 'walk' || s.mode === 'run') {
    const sp = s.mode === 'run' ? 1.3 : .55, d = s.target - s.x;
    s.dir = d >= 0 ? 1 : -1;
    if (Math.abs(d) <= sp) { s.x = s.target; arrive(); }
    else s.x += s.dir * sp * (FPS === 15 ? 2 : 1);
  } else if (s.mode === 'act') {
    if (--s.timer <= 0) finishTask();
  } else if (s.mode === 'idle') {
    if (ev) return;
    if (--s.timer <= 0) {
      if (V.F.vol < 1) { goTo(G.F.cx - 10, 'refill'); s.bub = { s: '?', t: 30 }; }
      else { const st = pick(sciStops()); goTo(st.x, st.task); }
    }
  }
}
function arrive() {
  const s = sci, tk = s.task;
  s.mode = 'act'; s.dir = 1;
  if (tk === 'refill') { s.timer = 50; s.frame = 'reach'; }
  else if (tk === 'burner') { s.timer = 40; s.frame = 'kneel'; }
  else if (tk === 'micro') { s.timer = 70; s.frame = 'look'; }
  else if (tk === 'notes' || tk === 'watch') { s.timer = ri(60, 120); s.frame = 'notes'; }
  else if (tk === 'fix') { s.timer = 40; s.frame = 'reach'; }
  else if (tk === 'spray') { s.timer = 70; s.frame = 'spray'; }
  else if (tk === 'chase') { s.x = -20; s.mode = 'walk'; s.target = F((G.bx0 + G.bx1) / 2); s.task = null; return; }
  else { s.mode = 'idle'; s.timer = 40; }
}
function finishTask() {
  const s = sci, tk = s.task;
  s.frame = 'stand'; s.task = null; s.mode = 'idle'; s.timer = ri(40, 140);
  if (tk === 'refill') {
    const others = PAL.filter(p => Math.abs(p[0] - V.F.col[0]) + Math.abs(p[1] - V.F.col[1]) + Math.abs(p[2] - V.F.col[2]) > 90);
    V.F.col = vivid((accent && Math.random() < .5) ? accent : pick(others)); V.F.vol = V.F.cap; s.bub = { s: '+', t: 30 };
  }
  if (tk === 'burner') { V.A.boil = 1.5; for (let i = 0; i < 6; i++) sparks.push({ x: G.A.cx, y: L.yB - 4, vx: rnd(-.6, .6), vy: rnd(-1.2, -.2), life: ri(4, 8), col: '#ffb347' }); }
  if (tk === 'micro' && Math.random() < .5) s.bub = { s: pick(['HMM', '!', 'AHA']), t: 36 };
  if (tk === 'fix' && ev && ev.type === 'blackout') endBlackout();
  if (tk === 'spray' && ev && ev.type === 'runaway') { ev.done = true; }
}
function drawSci() {
  const s = sci; if (!s) return;
  const walking = s.mode === 'walk' || s.mode === 'run';
  let set = SCI.stand;
  if (walking) set = (tick >> 2) % 2 ? SCI.walkA : SCI.walkB;
  else if (s.frame === 'notes') set = SCI.notes;
  const img = set[s.dir > 0 ? 0 : 1];
  const jmp = s.jump > 0 ? -Math.round(Math.sin(s.jump / 6 * Math.PI) * 3) : 0;
  const kneel = s.frame === 'kneel' ? 3 : 0, look = s.frame === 'look' ? 2 : 0;
  const X = F(s.x), Y = L.floor - img.height + jmp + kneel + look;
  x.drawImage(img, X, Y);
  const d = s.dir;
  if (s.frame === 'notes' && (tick >> 3) % 2) P(x, X + (d > 0 ? 10 : 3), Y + 18, '#2b2e39');
  if (s.frame === 'reach') {      // bras levé avec une fiole
    const ax = d > 0 ? X + 12 : X + 1;
    R(x, ax, Y + 9, 2, 8, SCI_PAL.c); R(x, ax, Y + 7, 2, 2, SCI_PAL.s);
    const fc = s.task === 'refill' ? liq(V.F.col) : null;
    if (fc) { R(x, ax - 1, Y + 2, 4, 5, K.glassL); R(x, ax, Y + 3, 2, 3, fc.c); R(x, ax, Y + 1, 2, 1, '#8a5a34'); }
  }
  if (s.frame === 'spray') {      // extincteur
    const ax = d > 0 ? X + 11 : X - 4;
    R(x, ax, Y + 15, 5, 8, '#c0392b'); R(x, ax, Y + 15, 5, 1, '#e74c3c'); R(x, ax + 1, Y + 13, 3, 2, '#222');
    if (MOTION !== 'off') for (let i = 0; i < 3; i++) parts.push({ x: ax + (d > 0 ? 5 : 0), y: Y + 14, vx: d * rnd(1, 2.4), vy: rnd(-1, .2), life: ri(8, 16), col: 'rgba(235,245,255,.8)' });
  }
  if (s.frame === 'look') { P(x, X + (d > 0 ? 11 : 2), Y + 8, K.brassHi); }
  if (s.bub) bubble(x, s.bub.s, X + 7, Y + 3, s.bub.s === 'EUREKA!' ? '#a0401a' : '#14161c');
}

/* ---------- événements rares ---------- */
function startEvent(type) {
  if (ev || !sci) return;
  if (type === 'blackout') {
    if (!G.breaker) return;
    ev = { type, t0: t }; dimT = .72;
    for (const l of G.lamps) l.off = 999;
    sci.bub = { s: '?!', t: 40 };
    setTimeout(() => { if (ev && ev.type === 'blackout') goTo(G.breaker.x - 14, 'fix', 'run'); }, 1400);
    window.dispatchEvent(new CustomEvent('lab:event', { detail: { type, phase: 'start' } }));
  } else if (type === 'runaway') {
    ev = { type, t0: t, done: false }; V.E.boil = 3;
    sci.bub = { s: '!', t: 30 }; sci.jump = 6;
    setTimeout(() => { if (ev && ev.type === 'runaway') goTo(G.E.cx - 22, 'spray', 'run'); }, 900);
    window.dispatchEvent(new CustomEvent('lab:event', { detail: { type, phase: 'start' } }));
  } else if (type === 'creature') {
    const span = (G.sp ? G.sp.x + 20 : G.rack.x + 20), xx = F(clamp(span, G.bx0 + 40, G.bx1 - 60));
    ev = { type, t0: t, tx: xx, stage: 0 }; dimT = .6;
    goTo(xx - 22, null, 'run'); sci.bub = { s: '!', t: 36 };
    window.dispatchEvent(new CustomEvent('lab:creature', { detail: { phase: 'start' } }));
  }
}
function endBlackout() {
  dimT = 0; for (const l of G.lamps) l.off = ri(4, 10);
  const b = G.breaker; for (let i = 0; i < 10; i++) sparks.push({ x: b.x + 5, y: b.y + 8, vx: rnd(-1.4, 1.4), vy: rnd(-1.6, .2), life: ri(6, 12) });
  sci.bub = { s: 'OK', t: 30 }; ev = null; nextEvent = t + rnd(70, 140);
  window.dispatchEvent(new CustomEvent('lab:event', { detail: { type: 'blackout', phase: 'end' } }));
}
function stepEvent() {
  if (!ev) {
    if (MOTION === 'full' && t > nextEvent && !L.compact) {
      const r = Math.random();
      startEvent(HALLOWEEN && r < .3 ? 'creature' : r < .65 ? 'runaway' : 'blackout');
      nextEvent = t + rnd(80, 150);
    }
    return;
  }
  const e = t - ev.t0;
  if (ev.type === 'blackout') {
    if (tick % 7 === 0 && Math.random() < .5) { const [sx, sy] = teslaTip(); sparks.push({ x: sx + rnd(-6, 6), y: sy + rnd(-6, 6), vx: rnd(-.5, .5), vy: rnd(-.5, .5), life: 4 }); }
    if (e > 14) endBlackout();
  } else if (ev.type === 'runaway') {
    const E = V.E, top = E.Y;
    if (!ev.done) {
      E.boil = 3;
      if (tick % 2 === 0) parts.push({ x: G.E.cx + rnd(-1.5, 1.5), y: top, vx: rnd(-.6, .6), vy: rnd(-.4, .2), life: ri(14, 26), col: liq(E.col).hi, foam: true });
      if (tick % 2 === 0) smoke.push({ x: G.E.cx + rnd(-2, 2), y: top - 2, vx: rnd(-.6, .6), vy: rnd(-.35, -.15), life: 0, max: ri(50, 90), s: 1 });
      if (e > 12) ev.done = true;
    } else if (e > 2) {
      ev = null; nextEvent = t + rnd(70, 140); sci.bub = { s: 'OUPS', t: 36 };
      window.dispatchEvent(new CustomEvent('lab:event', { detail: { type: 'runaway', phase: 'end' } }));
    }
  } else if (ev.type === 'creature') {
    const tx = ev.tx, yB = L.yB;
    if (e < 3.4) {
      if (tick % 4 === 0) arcs.push(makeArc(...teslaTip(), tx - 2, yB - 18, 2, true));
      if (e > 1 && tick % 3 === 0) arcs.push(makeArc(tx - 2, yB - 18, tx + 28, yB - 18, 2, true));
      if (MOTION === 'full' && [1.2, 2.2, 3.1].some(k2 => Math.abs(e - k2) < .02)) flash = .22;
    }
    if (e >= 3.4 && ev.stage === 0) ev.stage = 1;
    if (e >= 4.6 && ev.stage === 1) { ev.stage = 2; ev.zx = tx + 28; ev.say = { s: 'GRR!', t: 40 }; sci.bub = { s: 'EUREKA!', t: 46 }; sci.jump = 8; sci.mode = 'act'; sci.timer = 40; sci.frame = 'stand'; window.dispatchEvent(new CustomEvent('lab:creature', { detail: { phase: 'alive' } })); }
    if (e >= 6.4 && ev.stage === 2) { ev.stage = 3; goTo(w + 40, 'chase', 'run'); sci.bub = { s: '?!', t: 30 }; }
    if (ev.stage === 3) { ev.zx += .8 * (FPS === 15 ? 2 : 1); if (ev.zx > w + 20) { ev.stage = 4; ev.end = t; dimT = 0; } }
    if (ev.say && --ev.say.t <= 0) ev.say = null;
    if (ev.stage === 4 && t - ev.end > 1) { ev = null; nextEvent = t + rnd(80, 150); }
  }
}
function drawFoam() {
  if (!ev || ev.type !== 'runaway' || ev.done) return;
  const E = V.E, cx = G.E.cx, top = E.Y, Lq = liq(E.col), grow = Math.min(1, (t - ev.t0) / 2);
  const r0 = 2 + Math.round(grow * 3);
  for (let i = 0; i < 5; i++) disc(x, cx + Math.round(Math.sin(t * 3 + i * 1.7) * (r0 + 1)), top - 1 - Math.round(Math.abs(Math.cos(t * 2 + i)) * r0), 2, i % 2 ? Lq.hi : '#f4fbff');
  const run = Math.round(grow * (G.E.r * 2 + 4));
  for (let k2 = 0; k2 < run; k2++) { P(x, cx - 3 - Math.round(k2 * .25), top + k2, Lq.hi); if (k2 % 3) P(x, cx + 3 + Math.round(k2 * .3), top + k2, '#f4fbff'); }
  glow(x, cx, top, 16, E.col, .35 + Math.random() * .1);
}
function drawEventBack() {
  if (!ev || ev.type !== 'creature') return;
  const tx = ev.tx, yB = L.yB;
  R(x, tx, yB - 7, 28, 1, K.steel); R(x, tx, yB - 6, 28, 1, K.ironHi); R(x, tx + 2, yB - 5, 2, 5, K.iron); R(x, tx + 24, yB - 5, 2, 5, K.iron);
  for (const ex of [tx - 2, tx + 28]) { R(x, ex, yB - 18, 1, 18, K.brassLo); disc(x, ex, yB - 19, 1, K.brassHi); }
  if (ev.stage === 0) { R(x, tx + 3, yB - 10, 22, 3, '#e9e6dc'); R(x, tx + 1, yB - 11, 4, 4, '#86c45a'); P(x, tx + 2, yB - 10, '#e8ff6a'); R(x, tx, yB - 11, 1, 3, '#15131b'); }
  else if (ev.stage === 1) { R(x, tx + 8, yB - 10, 18, 3, '#e9e6dc'); R(x, tx + 3, yB - 20, 6, 11, '#3b3352'); R(x, tx + 3, yB - 25, 6, 5, '#86c45a'); R(x, tx + 3, yB - 26, 6, 2, '#15131b'); P(x, tx + 5, yB - 23, '#e8ff6a'); P(x, tx + 7, yB - 23, '#e8ff6a'); glow(x, tx + 6, yB - 22, 6, [140, 255, 120], .5); }
  else if (ev.stage >= 2) {
    const wk = ev.stage === 3 && (tick >> 2) % 2, img = (wk ? CRE.walk : CRE.stand)[0];
    x.drawImage(img, F(ev.zx), L.floor - img.height);
    glow(x, ev.zx + 5, L.floor - 15, 6, [140, 255, 120], .3);
    if (ev.say) bubble(x, ev.say.s, F(ev.zx + 6), L.floor - img.height - 1, '#2f6b1a');
  }
}

/* ---------- dessin des éléments ---------- */
function gear(cx, cy, r, teeth, ang, col, colHi) {
  const ro = r + 1.6;
  for (let yy = -F(ro) - 1; yy <= ro + 1; yy++) for (let xx = -F(ro) - 1; xx <= ro + 1; xx++) {
    const d = Math.hypot(xx, yy); if (d > ro) continue;
    const a = Math.atan2(yy, xx), tooth = Math.cos(teeth * (a - ang)) > .25;
    if (d > r && !tooth) continue;
    if (d < r * .3) continue;
    const spoke = d < r * .75 && d > r * .3 && Math.abs(Math.sin(3 * (a - ang))) > .45;
    if (spoke) continue;
    x.fillStyle = yy < -r * .2 ? colHi : col; x.fillRect(cx + xx, cy + yy, 1, 1);
  }
}
function drawPump() {
  const p = G.pump, on = links[1].on, X = p.x - 5, yB = L.yB;
  R(x, X, yB - 9, 11, 9, K.iron); R(x, X, yB - 9, 11, 1, K.ironHi); R(x, X + 10, yB - 8, 1, 8, K.ironLo); R(x, X + 2, yB - 6, 7, 4, '#0d0f13');
  disc(x, p.x, yB - 4, 2, on ? liq(V.D.col).c : '#1d2a2f');
  P(x, X + 1, yB - 2, on ? '#7dff7a' : '#ff5050');
  const a = on ? t * 3 : 0, sm = L.compact;
  gear(p.x - 1, yB - (sm ? 13 : 15), sm ? 3 : 5, sm ? 6 : 8, a, K.brass, K.brassHi);
  gear(p.x + (sm ? 5 : 8), yB - (sm ? 17 : 21), sm ? 2 : 3, 6, -a * 1.6 + .3, K.cu, K.cuHi);
}
function drawBurner() {
  const ax = G.A.cx, yB = L.yB, sm = L.compact;
  R(x, ax - 2, yB - 4, 5, 4, K.ironHi); R(x, ax - 1, yB - 5, 3, 1, K.steel); R(x, ax - 4, yB - 1, 9, 1, K.iron);
  const big = V.A.boil > 1 ? 2 : 0, fl = (sm ? 2 : 3) + big + (tick % 3 === 0 ? 1 : 0);
  for (let i = 0; i < fl; i++) R(x, ax - (i < 2 ? 1 : 0), yB - 6 - i, i < 2 ? 3 : 1, 1, i === 0 ? '#5aa8ff' : i < 2 ? '#8fd0ff' : (i % 2 ? '#ffb347' : '#fff0a0'));
  glow(x, ax, yB - 7, 8, [255, 170, 80], .3);
  if (V.A.boil > 1) V.A.boil -= .01;
}
function drawJacket() {
  const C = G.C;
  x.fillStyle = 'rgba(70,150,255,.16)'; x.fillRect(C.x - 5, C.jTop + 1, 11, C.jBot - C.jTop - 1);
  const k = F(t * 8) % 6;
  for (let yy = C.jTop + 1 + k; yy < C.jBot; yy += 6) P(x, C.x + 5, yy, 'rgba(160,210,255,.55)');
}
function drawTubesMarks() {
  const rk = G.rack, man = links[2], drn = links[3];
  for (let i = 0; i < rk.n; i++) {
    const tb = V['T' + i], cx = tb.X + F(tb.shape.cx);
    P(x, cx, rk.ry + 3, man.on && rk.target === i ? '#7dff7a' : '#3a2a2a');
    P(x, cx, L.yB + 1, drn.on ? '#7dff7a' : '#2a3a2a');
  }
  if (drn.on) for (let i = 0; i < rk.n; i++) { const tb = V['T' + i]; if (tb.vol > 0) P(x, tb.X + F(tb.shape.cx), L.yB + 2 + (tick >> 1) % (G.cy2 - L.yB - 2), liq(tb.col).hi); }
}
function drawItem(it) {
  const X = it.x, yB = L.yB;
  if (it.type === 'micro') {
    R(x, X + 1, yB - 2, 11, 2, K.iron); R(x, X + 1, yB - 2, 11, 1, K.ironHi);
    R(x, X + 8, yB - 16, 2, 14, K.ironHi); R(x, X + 9, yB - 16, 1, 14, K.iron);
    R(x, X + 2, yB - 8, 8, 1, K.steel);
    line(x, X + 2, yB - 20, X + 6, yB - 12, K.brass); line(x, X + 3, yB - 20, X + 7, yB - 12, K.brassHi);
    R(x, X + 1, yB - 22, 3, 2, '#1d1f26'); R(x, X + 6, yB - 12, 3, 2, '#1d1f26');
    P(x, X + 7, yB - 10, '#8fefff'); P(x, X + 4, yB - 9, '#ff7ad0');
    R(x, X + 4, yB - 6, 3, 1, '#ffb347'); glow(x, X + 5, yB - 6, 4, [255, 180, 80], .3);
  } else if (it.type === 'bird') {        // oiseau buveur
    const px = X + 8, py = yB - 12;
    R(x, X + 2, yB - 5, 6, 5, K.glassD); R(x, X + 3, yB - 4, 4, 4, 'rgba(90,170,255,.6)'); P(x, X + 3, yB - 4, K.glassL);
    line(x, px - 2, yB - 1, px, py, K.ironHi); line(x, px + 2, yB - 1, px, py, K.ironHi);
    const cyc = (t * .45 + it.ph) % 1, a = cyc < .82 ? -.25 + Math.sin(cyc / .82 * Math.PI * 4) * .12 * (1 - cyc) : -.25 - (cyc - .82) / .18 * 1.15;
    const hx = px + Math.sin(a) * 9, hy = py - Math.cos(a) * 9, bx2 = px - Math.sin(a) * 5, by2 = py + Math.cos(a) * 5;
    line(x, bx2, by2, hx, hy, K.glassL);
    disc(x, F(bx2), F(by2), 2, '#d83a5a'); disc(x, F(hx), F(hy), 2, '#d83a5a');
    R(x, F(hx) - 2, F(hy) - 4, 5, 1, '#2b4a7a'); R(x, F(hx) - 1, F(hy) - 6, 3, 2, '#2b4a7a');
    P(x, F(hx + Math.cos(a) * -3), F(hy + Math.sin(a) * -3), '#ffb347'); P(x, F(px), F(py), K.brassHi);
  } else if (it.type === 'gears') {       // invention : horloge à engrenages
    R(x, X, yB - 30, 24, 30, '#1c1f26'); R(x, X, yB - 30, 24, 1, '#2c313b'); R(x, X, yB - 30, 1, 30, '#2c313b');
    const a = t * .8;
    gear(X + 8, yB - 20, 5, 9, a, K.brass, K.brassHi); gear(X + 17, yB - 13, 4, 7, -a * 1.3 + .2, K.cu, K.cuHi); gear(X + 16, yB - 24, 2, 5, -a * 2.2, K.steel, '#c9d2dc');
    P(x, X + 3, yB - 4, (tick >> 4) % 2 ? '#7dff7a' : '#203020');
  } else if (it.type === 'book') {
    R(x, X, yB - 3, 16, 3, '#6b2d2d'); R(x, X, yB - 3, 16, 1, '#8e3d3d'); R(x, X + 1, yB - 5, 14, 2, '#efe8d4'); R(x, X + 8, yB - 5, 1, 2, '#bdb39a');
    for (let i = 0; i < 3; i++) R(x, X + 2 + (i % 2) * 7, yB - 5 + 0, 4, 1, '#9a907a');
    R(x, X + 12, yB - 11, 1, 7, '#efe6c8'); P(x, X + 12, yB - 12, (tick >> 1) % 3 ? '#ffd27a' : '#fff3b0'); glow(x, X + 12, yB - 12, 6, [255, 190, 90], .3);
  } else if (it.type === 'meter') {
    R(x, X, yB - 14, 14, 14, K.iron); R(x, X, yB - 14, 14, 1, K.ironHi);
    disc(x, X + 7, yB - 8, 5, '#d8d2bc'); disc(x, X + 7, yB - 8, 4, '#ece6d0');
    const a = -Math.PI / 2 + (lev(V.A) - .5) * 2.2 + Math.sin(t * 3) * .05;
    line(x, X + 7, yB - 8, X + 7 + Math.round(Math.cos(a) * 4), yB - 8 + Math.round(Math.sin(a) * 4), '#b0303f');
    P(x, X + 2, yB - 2, links[0].on ? '#ffb347' : '#3a2a10');
  } else if (it.type === 'pumpkin') {
    disc(x, X + 5, yB - 4, 4, '#e0701a'); disc(x, X + 3, yB - 4, 3, '#c25f12'); R(x, X + 5, yB - 9, 1, 2, '#4a7a2a');
    const f = Math.random() > .25 ? '#ffe680' : '#ffb347'; P(x, X + 3, yB - 5, f); P(x, X + 7, yB - 5, f); R(x, X + 3, yB - 3, 5, 1, f);
    glow(x, X + 5, yB - 4, 8, [255, 140, 26], .22);
  }
}
function drawTeslaLive() {
  const [sx, sy] = teslaTip(), T = G.tesla;
  glow(x, sx, sy, T.r * 2.4, [120, 230, 255], .12 + Math.sin(t * 5) * .04 + (ev && ev.type === 'creature' ? .15 : 0));
  if (MOTION !== 'off' && Math.random() < (MOTION === 'calm' ? .08 : .25)) {
    const a = rnd(0, Math.PI * 2), r1 = T.r + 1, r2 = T.r + rnd(3, T.small ? 5 : 9);
    arcs.push(makeArc(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1, sx + Math.cos(a + rnd(-.4, .4)) * r2, sy + Math.sin(a + rnd(-.4, .4)) * r2, ri(1, 2), false));
  }
  const b = T.base, bh = T.small ? 4 : 10;
  P(x, T.cx - (T.small ? 3 : 7), b - bh + 4, (tick >> 3) % 2 ? '#ff5050' : '#3a1414');
  P(x, T.cx - (T.small ? 1 : 4), b - bh + 4, (tick >> 2) % 2 ? '#7dff7a' : '#1a3a14');
}
function drawLamps() {
  for (const l of G.lamps) {
    l.k = l.off > 0 ? (l.off > 900 ? 0 : (l.off % 2 ? .3 : .75)) : .92 + Math.sin(t * 7 + l.x) * .03;
    if (l.off > 0 && l.off < 900) l.off--;
    R(x, l.x - 2, 13, 5, 1, l.k > .5 ? '#fff0c0' : '#5a4a2a');
    if (l.k > .2) {
      x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = `rgba(255,190,110,${.045 * l.k})`;
      x.beginPath(); x.moveTo(l.x - 4, 13); x.lineTo(l.x + 5, 13); x.lineTo(l.x + 22, L.py0); x.lineTo(l.x - 21, L.py0); x.closePath(); x.fill(); x.restore();
      glow(x, l.x, 14, 14, [255, 195, 110], .28 * l.k);
    }
  }
}
function drawLiquids() {
  for (const Lk of links) drawLinkLiquid(Lk);
  for (const d of drops) { const Lq = liq(d.col); P(x, d.x, d.y, Lq.hi); if (!d.path) P(x, d.x, d.y - 1, Lq.c); }
  for (const k in V) drawVessel(V[k]);
}
function drawGlows(k = 1) {
  for (const id in V) {
    const v = V[id]; if (v.vol <= .5) continue;
    const s = v.shape, cx = v.X + s.w / 2, cy = (surfY(v) + v.Y + s.bot) / 2, r = Math.max(6, Math.min(26, s.w * .9, (v.Y + s.bot - surfY(v)) + 8));
    glow(x, cx, cy, r, v.col, (.13 + v.pulse * .3) * k);
  }
}
function draw() {
  x.imageSmoothingEnabled = false;
  x.drawImage(back, 0, 0);
  drawLamps();
  drawTeslaLive();
  drawEventBack();
  drawLiquids();
  drawJacket();
  drawPump();
  drawBurner();
  drawTubesMarks();
  drawFoam();
  for (const it of G.items) drawItem(it);
  // vapeur au sommet de la colonne
  for (const s of smoke) { const kk = s.life / s.max, sz = kk > .4 ? 2 : 1; x.fillStyle = `rgba(200,210,220,${.32 * (1 - kk)})`; x.fillRect(F(s.x), F(s.y), sz, sz); }
  for (const p of parts) { x.fillStyle = p.col || '#fff'; x.fillRect(F(p.x), F(p.y), 1, 1); }
  drawSci();
  for (const b of bats) { const up = (tick >> 2) % 2; const X = F(b.x), Y = F(b.y + Math.sin(t * 4 + b.ph) * 2); x.fillStyle = '#2e2440'; x.fillRect(X + 2, Y + 1, 3, 2); x.fillRect(X, Y + (up ? 0 : 2), 2, 1); x.fillRect(X + 5, Y + (up ? 0 : 2), 2, 1); P(x, X + 3, Y + 1, '#ff4040'); }
  if (dimK > .01) { x.fillStyle = `rgba(2,3,8,${dimK})`; x.fillRect(0, 0, w, h); if (dimK > .25) { drawLiquids(); drawBurner(); } }
  drawGlows(dimK > .25 ? 1.8 : 1);
  for (const a of arcs) drawArc(a);
  for (const s of sparks) P(x, s.x, s.y, s.col || (s.life > 5 ? '#ffffff' : '#7fe8ff'));
  if (flash > 0) { x.fillStyle = `rgba(220,250,255,${flash})`; x.fillRect(0, 0, w, h); }
}

/* ---------- mise à jour visuelle ---------- */
function update() {
  const dt = 1 / FPS;
  simulate(dt, false);
  // particules
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.foam ? .05 : .12; if (p.foam && p.y > L.yB - 1) { p.y = L.yB - 1; p.vy = 0; p.vx *= .8; } if (--p.life <= 0) parts.splice(i, 1); }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += .1; if (--s.life <= 0) sparks.splice(i, 1); }
  for (let i = smoke.length - 1; i >= 0; i--) { const s = smoke[i]; s.x += s.vx + Math.sin((t + i) * 2) * .06; s.y += s.vy; if (++s.life > s.max) smoke.splice(i, 1); }
  if (V.H && links[4].on && tick % 5 === 0) smoke.push({ x: V.H.X + 6 + rnd(-1, 1), y: 9, vx: rnd(-.1, .1), vy: rnd(-.3, -.15), life: 0, max: ri(20, 34) });
  if (tick % 9 === 0 && links[0].on) smoke.push({ x: G.C.x + rnd(-1, 1), y: G.C.jBot + 2, vx: rnd(-.1, .1), vy: rnd(-.2, -.1), life: 0, max: 14 });
  for (let i = arcs.length - 1; i >= 0; i--) { const a = arcs[i]; if (--a.life <= 0) arcs.splice(i, 1); else if (a.big) arcs[i] = Object.assign(makeArc(a.a[0], a.a[1], a.b[0], a.b[1], a.life, true), { life: a.life }); }
  if (t > nextZap && !ev && MOTION !== 'off') zap(true);
  flash *= .6; if (flash < .01) flash = 0;
  dimK += (dimT - dimK) * .08;
  if (HALLOWEEN && MOTION === 'full' && t > nextBat) { nextBat = t + rnd(6, 12); const d = Math.random() < .5 ? 1 : -1; bats.push({ x: d > 0 ? -8 : w + 2, y: rnd(16, L.TOP - 8), d, v: rnd(.8, 1.4), ph: rnd(0, 6) }); }
  for (let i = bats.length - 1; i >= 0; i--) { const b = bats[i]; b.x += b.v * b.d; if (b.x < -12 || b.x > w + 12) bats.splice(i, 1); }
  stepSci();
  stepEvent();
}

/* ---------- boucle ---------- */
function loop(now) {
  requestAnimationFrame(loop);
  if (document.hidden || STATIC) return;
  const step = 1000 / FPS;
  if (now - last < step) return;
  last = now - ((now - last) % step);
  tick++; t = tick / FPS;
  update(); draw();
}

/* ---------- interactions ---------- */
function toLogical(e) { const r = cvs.getBoundingClientRect(); return [(e.clientX - r.left) / S, (e.clientY - r.top) / S]; }
function hitTesla(lx, ly) { const T = G.tesla; return Math.hypot(lx - T.cx, ly - T.sy) <= T.r + 3 || (Math.abs(lx - T.cx) < (T.small ? 5 : 11) && ly > T.sy && ly < T.base); }
function hitVessel(lx, ly) { for (const k in V) { const v = V[k]; if (lx >= v.X && lx < v.X + v.shape.w && ly >= v.Y && ly < v.Y + v.shape.h) return v; } return null; }
function hitSci(lx, ly) { return sci && lx >= sci.x && lx < sci.x + 14 && ly > L.floor - sciH() && ly < L.floor; }
cvs.addEventListener('pointermove', e => { const [lx, ly] = toLogical(e); cvs.style.cursor = (hitTesla(lx, ly) || hitVessel(lx, ly) || hitSci(lx, ly)) ? 'pointer' : 'default'; });
cvs.addEventListener('click', e => {
  const [lx, ly] = toLogical(e);
  if (hitTesla(lx, ly)) {
    zap(true);
    const now = performance.now(); clicks = clicks.filter(c => now - c < 1500); clicks.push(now);
    if (clicks.length >= 3) { clicks = []; startEvent('creature'); }
  } else if (hitSci(lx, ly)) { sci.bub = { s: pick(['?', 'HMM', '!', '+']), t: 34 }; sci.jump = 6; }
  else {
    const v = hitVessel(lx, ly);
    if (v) {
      if (v.id === 'F' || v.id === 'E') doseReagent(true);
      for (let i = 0; i < 8; i++) v.bub.push({ x: ri(2, v.shape.w - 3), y: v.shape.bot - i, v: rnd(.5, 1.2) });
      v.pulse = 1;
    }
  }
  if (STATIC) draw();
});
let typed = '';
window.addEventListener('keydown', e => {
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  if (e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-6);
  if (typed.endsWith('igor')) { typed = ''; startEvent('creature'); }
});
let rz = 0;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 150); });

window.LabScene = {
  zap: () => { zap(true); if (STATIC) draw(); },
  creature: () => startEvent('creature'),
  event: type => startEvent(type),
  setAccent: col => {
    const c = vivid(hex(col)); const first = accent === null; accent = c;
    if (first) return;
    V.F.col = c; V.F.vol = Math.max(V.F.vol, 6);
    if (STATIC) { V.E.col = vivid(lerp(V.E.col, c, .5)); draw(); return; }
    for (let i = 0; i < 3; i++) setTimeout(() => doseReagent(true), i * 260);
  },
  debug: () => ({ total: totalVolume(), levels: Object.fromEntries(Object.entries(V).map(([k, v]) => [k, +lev(v).toFixed(2)])), on: Object.fromEntries(links.map(l => [l.id, l.on])) }),
  get halloween() { return HALLOWEEN; }
};

layout();
draw();
requestAnimationFrame(loop);
})();
