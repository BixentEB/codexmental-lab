/* ==========================================================================
   CODEX MENTAL · LAB — thème « Grand labo » (prototype HD)
   Laboratoire d'alchimie rétrofuturiste dessiné en vectoriel au canvas,
   à la résolution native de l'écran, avec plusieurs plans en parallaxe.
   Le circuit conserve réellement le liquide :
   cuve géante → bouilleur → condenseur → récepteur → pompe → ballon de
   réaction (réactif) → colonne → retour à la cuve.
   ========================================================================== */
(() => {
'use strict';

const cvs = document.getElementById('scene');
if (!cvs) return;
const ctx = cvs.getContext('2d');
const LAB = window.LAB || {};
const MOTION = LAB.motion || 'full';
const STATIC = MOTION === 'off', CALM = MOTION === 'calm';
const HALLOWEEN = !!LAB.halloween;

/* ---------- outils ---------- */
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const lighten = (c, k) => c.map(v => v + (255 - v) * k);
const darken = (c, k) => c.map(v => v * (1 - k));
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function vivid(c) {
  let [r, g, b] = c.map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0, l = (mx + mn) / 2, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) { hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
  s = Math.max(s, .8); l = clamp(l, .5, .6);
  const C2 = (1 - Math.abs(2 * l - 1)) * s, X2 = C2 * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - C2 / 2;
  const o = hh < 60 ? [C2, X2, 0] : hh < 120 ? [X2, C2, 0] : hh < 180 ? [0, C2, X2] : hh < 240 ? [0, X2, C2] : hh < 300 ? [X2, 0, C2] : [C2, 0, X2];
  return o.map(v => (v + m) * 255);
}
const PAL = (HALLOWEEN ? ['#5cff6a', '#ff8a1f', '#a65cff', '#c8ff3d', '#ff4fd8', '#3fe6ff'] : ['#3dff8a', '#3fd8ff', '#b06bff', '#ff9a2e', '#ff5fc8', '#c8ff3d']).map(hex);
const BRASS = ['#f6dc8c', '#d4a849', '#9a7024', '#5a3f12'], COPPER = ['#f2b27a', '#c8763a', '#8a4a1e', '#4a240c'], STEEL = ['#e1e7ee', '#a7b2bf', '#69737f', '#353b44'];
function metal(c, x0, y0, x1, y1, pal) { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, pal[0]); g.addColorStop(.35, pal[1]); g.addColorStop(.75, pal[2]); g.addColorStop(1, pal[3]); return g; }
// halos : sprites pré-calculés par couleur, bien plus rapides que des dégradés à chaque image
const glowCache = new Map();
function glowSprite(col) {
  const k = ((col[0] >> 4) << 8) | ((col[1] >> 4) << 4) | (col[2] >> 4);
  let c = glowCache.get(k);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 128; const g2 = c.getContext('2d');
    const g = g2.createRadialGradient(64, 64, 0, 64, 64, 64), cc = [(col[0] >> 4) * 17, (col[1] >> 4) * 17, (col[2] >> 4) * 17];
    g.addColorStop(0, rgba(cc, 1)); g.addColorStop(.4, rgba(cc, .35)); g.addColorStop(1, rgba(cc, 0));
    g2.fillStyle = g; g2.fillRect(0, 0, 128, 128);
    if (glowCache.size > 300) glowCache.clear();
    glowCache.set(k, c);
  }
  return c;
}
function glow(c, x, y, r, col, a) {
  if (a <= .004 || r < 1) return;
  const pa = c.globalAlpha, po = c.globalCompositeOperation;
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, a);
  c.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  c.globalAlpha = pa; c.globalCompositeOperation = po;
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }

/* ---------- moment de la journée ---------- */
function daypart() {
  const hr = new Date().getHours();
  if (hr >= 21 || hr < 6) return { id: 'night', top: [6, 9, 22], bot: [24, 32, 58], cloud: [34, 40, 62] };
  if (hr < 8) return { id: 'dawn', top: [40, 38, 78], bot: [214, 128, 104], cloud: [92, 70, 96] };
  if (hr < 18) return { id: 'day', top: [60, 78, 104], bot: [150, 166, 182], cloud: [104, 112, 126] };
  return { id: 'dusk', top: [34, 22, 60], bot: [214, 98, 72], cloud: [80, 52, 82] };
}
const DAY = daypart();

/* ---------- état ---------- */
let W = 0, H = 0, DPR = 1, u = 1, compact = false, quality = Math.min(window.devicePixelRatio || 1, 2);
let G = {}, layers = {}, V = {}, links = [], drops = [], puffs = [], sparks = [], foam = [], arcs = [], dust = [], rain = [], clouds = [];
let t = 0, last = 0, mx = 0, my = 0, tmx = 0, tmy = 0, flash = 0, dim = 0, dimT = 0, bolt = null, nextBolt = 8, nextZap = 6, nextEvent = 70;
let ev = null, sci = null, accent = null, gearDir = 1, orrerySpin = 1, clicks = [], frameAvg = 16;
let puffImg = null, cloudImg = null, lite = false;

function makePuff() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const k = c.getContext('2d');
  const g = k.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.45, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  k.fillStyle = g; k.fillRect(0, 0, 64, 64); return c;
}

/* ---------- récipients ---------- */
function roundPath(cx, cy, r, nw, neckTop) {
  const a0 = Math.asin(nw / r), yS = cy - r * Math.cos(a0), p = new Path2D();
  p.moveTo(cx - nw, neckTop); p.lineTo(cx - nw, yS); p.arc(cx, cy, r, -Math.PI / 2 - a0, -Math.PI / 2 + a0, true); p.lineTo(cx + nw, neckTop); p.closePath();
  return p;
}
function erlenPath(cx, by, bw, h, nw, neckTop) {
  const p = new Path2D(), k = 7 * u;
  p.moveTo(cx - nw, neckTop); p.lineTo(cx - nw, by - h); p.lineTo(cx - bw, by - k); p.quadraticCurveTo(cx - bw, by, cx - bw + k, by);
  p.lineTo(cx + bw - k, by); p.quadraticCurveTo(cx + bw, by, cx + bw, by - k); p.lineTo(cx + nw, by - h); p.lineTo(cx + nw, neckTop); p.closePath();
  return p;
}
function cylPath(cx, w, top, bot, rb) { const p = new Path2D(); if (p.roundRect) p.roundRect(cx - w, top, w * 2, bot - top, [2 * u, 2 * u, rb, rb]); else p.rect(cx - w, top, w * 2, bot - top); return p; }
function funnelPath(cx, top, h, w) {
  const p = new Path2D();
  p.moveTo(cx - 4 * u, top); p.lineTo(cx - 4 * u, top + 6 * u); p.bezierCurveTo(cx - w, top + 8 * u, cx - w, top + h * .55, cx - w * .55, top + h * .74);
  p.lineTo(cx - 2.5 * u, top + h); p.lineTo(cx + 2.5 * u, top + h); p.lineTo(cx + w * .55, top + h * .74);
  p.bezierCurveTo(cx + w, top + h * .55, cx + w, top + 8 * u, cx + 4 * u, top + 6 * u); p.lineTo(cx + 4 * u, top); p.closePath();
  return p;
}
function jugPath(cx, by, w, h, nw, neckTop) {
  const p = new Path2D(), sh = by - h;
  p.moveTo(cx - nw, neckTop); p.lineTo(cx - nw, sh - 10 * u); p.bezierCurveTo(cx - nw, sh, cx - w, sh, cx - w, sh + 14 * u);
  p.lineTo(cx - w, by - 8 * u); p.quadraticCurveTo(cx - w, by, cx - w + 8 * u, by); p.lineTo(cx + w - 8 * u, by); p.quadraticCurveTo(cx + w, by, cx + w, by - 8 * u);
  p.lineTo(cx + w, sh + 14 * u); p.bezierCurveTo(cx + w, sh, cx + nw, sh, cx + nw, sh - 10 * u); p.lineTo(cx + nw, neckTop); p.closePath();
  return p;
}
const probe = document.createElement('canvas').getContext('2d');
function vessel(id, path, box, cap, vol, col, o = {}) {
  // largeur réelle du verre à chaque hauteur : le niveau suit le volume, pas la hauteur
  const [x0, y0, x1, y1] = box, rows = [], step = Math.max(1, (y1 - y0) / 90);
  for (let y = y0; y <= y1; y += step) { let n = 0; for (let x = x0; x <= x1; x += 1) if (probe.isPointInPath(path, x, y)) n++; rows.push({ y, n }); }
  const total = rows.reduce((s, r) => s + r.n, 0), cum = []; let acc = 0;
  for (let i = rows.length - 1; i >= 0; i--) { acc += rows[i].n; cum.unshift({ y: rows[i].y, a: acc / Math.max(1, total) }); }
  const v = Object.assign({ id, path, x0, y0, x1, y1, cap, vol, col: vivid(col), cum, bub: [], agit: 0, pulse: 0, ph: Math.random() * 6 }, o);
  const eg = probe.createLinearGradient(x0, y0, x1, y1);
  eg.addColorStop(0, 'rgba(235,250,255,.8)'); eg.addColorStop(.45, 'rgba(160,210,230,.32)'); eg.addColorStop(1, 'rgba(120,175,195,.6)');
  v.edge = eg; V[id] = v; return v;
}
const lev = v => v.vol / v.cap;
function surfY(v) {
  const L = clamp(lev(v), 0, 1); if (L <= .002) return v.y1 + 10;
  const c = v.cum; for (let i = 0; i < c.length; i++) if (c[i].a <= L) return i ? c[i].y : v.y0;
  return v.y1;
}
function addTo(v, q, col) { v.vol += q; if (col) v.col = vivid(mixc(v.col, col, Math.min(1, q / Math.max(q, v.vol) * 1.8))); }
function drawVessel(v, c = ctx) {
  c.save();
  c.fillStyle = 'rgba(170,215,235,.05)'; c.fill(v.path);
  const sy = surfY(v);
  if (v.vol > .3 && sy < v.y1) {
    c.save(); c.clip(v.path);
    const col = v.col, g = c.createLinearGradient(0, sy, 0, v.y1);
    g.addColorStop(0, rgba(lighten(col, .3), .9)); g.addColorStop(.3, rgba(col, .82)); g.addColorStop(1, rgba(darken(col, .5), .95));
    c.fillStyle = g; c.fillRect(v.x0 - 2, sy + 1.5 * u, v.x1 - v.x0 + 4, v.y1 - sy + 4);
    c.beginPath();
    const amp = (1 + v.agit * 3) * u;
    for (let x = v.x0; x <= v.x1 + 3 * u; x += 3 * u) { const y = sy + Math.sin(x * .07 / u + t * 3 + v.ph) * amp; x === v.x0 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.lineTo(v.x1 + 4, sy + 5 * u); c.lineTo(v.x0 - 4, sy + 5 * u); c.closePath();
    c.fillStyle = rgba(lighten(col, .6), .6); c.fill();
    c.lineWidth = Math.max(1, u); c.strokeStyle = 'rgba(255,255,255,.55)';
    for (const b of v.bub) { if (b.y < sy) continue; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 6.3); c.stroke(); }
    c.restore();
    glow(c, (v.x0 + v.x1) / 2, (sy + v.y1) / 2, Math.max(20 * u, (v.x1 - v.x0) * .9), col, .16 + v.pulse * .35);
  }
  c.lineWidth = 2 * u; c.strokeStyle = v.edge; c.stroke(v.path);
  c.save(); c.clip(v.path);
  const wd = v.x1 - v.x0, hh = v.y1 - v.y0;
  c.strokeStyle = 'rgba(255,255,255,.42)'; c.lineWidth = Math.max(2, wd * .07); c.lineCap = 'round';
  c.beginPath(); c.moveTo(v.x0 + wd * .2, v.y0 + hh * .32); c.quadraticCurveTo(v.x0 + wd * .1, v.y0 + hh * .62, v.x0 + wd * .22, v.y0 + hh * .86); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = Math.max(1, wd * .03);
  c.beginPath(); c.moveTo(v.x1 - wd * .16, v.y0 + hh * .5); c.lineTo(v.x1 - wd * .14, v.y0 + hh * .78); c.stroke();
  c.restore();
  c.restore();
}
function stepBubbles(v, rate, dt) {
  const sy = surfY(v);
  if (v.vol > 1 && Math.random() < rate * dt * 60) v.bub.push({ x: rnd(v.x0 + (v.x1 - v.x0) * .2, v.x1 - (v.x1 - v.x0) * .2), y: v.y1 - 4 * u, r: rnd(1, 3) * u, v: rnd(20, 50) * u });
  for (let i = v.bub.length - 1; i >= 0; i--) { const b = v.bub[i]; b.y -= b.v * dt; b.x += Math.sin(t * 4 + i) * .2 * u; b.r += .6 * u * dt; if (b.y < sy) v.bub.splice(i, 1); }
  v.agit *= Math.pow(.2, dt); v.pulse *= Math.pow(.15, dt);
}

/* ---------- tuyaux : le liquide voyage par « bouchons » ---------- */
function makePipe(pts) {
  const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]);
  const seg = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { p.lineTo(pts[i][0], pts[i][1]); const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push({ a: pts[i - 1], b: pts[i], s: L, d }); L += d; }
  return { path: p, pts, seg, len: L };
}
function subPath(pp, a, b) {
  const p = new Path2D(), s0 = pointAt(pp, a); p.moveTo(s0[0], s0[1]);
  for (const g of pp.seg) { const e = g.s + g.d; if (e > a && e < b) p.lineTo(g.b[0], g.b[1]); }
  const s1 = pointAt(pp, b); p.lineTo(s1[0], s1[1]); return p;
}
function pointAt(pp, s) {
  for (const g of pp.seg) if (s <= g.s + g.d) { const k = (s - g.s) / (g.d || 1); return [g.a[0] + (g.b[0] - g.a[0]) * k, g.a[1] + (g.b[1] - g.a[1]) * k]; }
  return pp.pts[pp.pts.length - 1];
}
function link(o) {
  const L = Object.assign({ rate: 3, speed: 110, on: false, slugs: [], hi: .6, lo: .15, full: .95, style: 'liquid', w: 5 }, o);
  L.pipe = makePipe(o.path); L.q = L.rate / (L.speed * u); links.push(L); return L;
}
function stepLink(L, dt) {
  L.decide();
  const v = L.speed * u * dt, head = L.slugs[0];
  // on paie d'abord le liquide qui entre, puis tout avance
  let fed = false, fresh = null;
  if (L.on && L.from.vol >= L.q * v) {
    L.from.vol -= L.q * v;
    const col = L.color ? L.color() : L.from.col;
    if (head && head.feeding && dist(head.col, col) < 90) { fed = true; head.col = mixc(head.col, col, .05); }
    else { if (head) head.feeding = false; fresh = { a: 0, b: 0, col: col.slice(), feeding: true }; }
  } else if (head) head.feeding = false;
  for (const s of L.slugs) { s.b += v; if (!(fed && s === head)) s.a += v; }
  if (fresh) { fresh.b = v; L.slugs.unshift(fresh); }
  // livraison au bout du tuyau
  for (let i = L.slugs.length - 1; i >= 0; i--) {
    const s = L.slugs[i];
    if (s.b > L.pipe.len) { const over = s.b - Math.max(s.a, L.pipe.len); if (over > 0) L.deliver(over * L.q, s.col); s.b = L.pipe.len; }
    if (s.a >= L.pipe.len) L.slugs.splice(i, 1);
  }
  // bouchons qui se touchent et de couleur proche : on les fusionne
  for (let i = L.slugs.length - 2; i >= 0; i--) {
    const a = L.slugs[i], b = L.slugs[i + 1];
    if (a.a <= b.b + 1 && dist(a.col, b.col) < 140 && !a.feeding) { b.b = Math.max(a.b, b.b); b.a = Math.min(a.a, b.a); L.slugs.splice(i, 1); }
  }
}
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
function drawLinkLiquid(L) {
  const P = L.pipe;
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  for (const s of L.slugs) {
    const a = Math.max(0, s.a), b = Math.min(P.len, s.b); if (b - a < .5) continue;
    if (L.style === 'vapor') {
      // vapeur : de légers points qui filent, puis des gouttes dans le serpentin
      for (let k = a + ((t * L.speed * u) % (9 * u)); k < b; k += 9 * u) {
        const [x, y] = pointAt(P, k), cond = k > L.vaporEnd;
        ctx.fillStyle = cond ? rgba(lighten(s.col, .2), .95) : rgba(lighten(s.col, .7), .45);
        ctx.beginPath(); ctx.arc(x, y, (cond ? 1.8 : 1.4) * u, 0, 6.3); ctx.fill();
      }
      continue;
    }
    const sp = subPath(P, a, b);
    ctx.lineWidth = L.w * u; ctx.strokeStyle = rgba(s.col, .9); ctx.stroke(sp);
    ctx.lineWidth = L.w * u * .35; ctx.strokeStyle = rgba(lighten(s.col, .55), .7); ctx.stroke(sp);
  }
  // reflets qui filent dans le liquide
  for (const s of L.slugs) {
    if (L.style === 'vapor') continue;
    const a = Math.max(0, s.a), b = Math.min(P.len, s.b);
    for (let k = a + ((t * L.speed * u * .9) % (26 * u)); k < b; k += 26 * u) { const [x, y] = pointAt(P, k); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x, y, 1.3 * u, 0, 6.3); ctx.fill(); }
  }
  ctx.restore();
}
function bakePipeGlass(c, P, w) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = (w + 5) * u; c.strokeStyle = 'rgba(190,230,245,.30)'; c.stroke(P.path);
  c.lineWidth = (w + 2) * u; c.strokeStyle = 'rgba(6,12,16,.62)'; c.stroke(P.path);
  c.restore();
}
function bakePipeShine(c, P, w) {
  c.save(); c.translate(-(w * .35) * u, -(w * .35) * u); c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = 1.2 * u; c.strokeStyle = 'rgba(255,255,255,.3)'; c.stroke(P.path); c.restore();
}

/* ---------- gouttes ---------- */
function drop(x, y, col, q, dest, o = {}) { drops.push(Object.assign({ x, y, vy: 0, col: col.slice(), q, dest }, o)); }
function stepDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (d.path) { d.s += 60 * u * dt; if (d.s >= d.path.len) { d.path = null; } else { [d.x, d.y] = pointAt(d.path, d.s); continue; } }
    d.vy += 900 * u * dt; d.y += d.vy * dt;
    const ty = d.dest ? Math.min(surfY(d.dest), d.dest.y1) : H;
    if (d.y >= ty) {
      drops.splice(i, 1);
      if (d.react) d.react(); else if (d.dest) addTo(d.dest, d.q, d.col);
      if (d.dest) d.dest.agit = Math.min(1, d.dest.agit + .15);
    }
  }
}

/* ---------- mise en page ---------- */
function canvasLayer() {
  const M = 24 * u, c = document.createElement('canvas');
  c.width = Math.ceil((W + 2 * M) * DPR); c.height = Math.ceil((H + 2 * M) * DPR);
  const k = c.getContext('2d'); k.setTransform(DPR, 0, 0, DPR, M * DPR, M * DPR);
  return { c, k, M };
}
function layout() {
  W = innerWidth; H = innerHeight; compact = W < 820;
  DPR = quality;
  cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
  cvs.style.width = W + 'px'; cvs.style.height = H + 'px'; cvs.style.left = '0px'; cvs.style.top = '0px';
  u = compact ? clamp(Math.min(H / 1080, W / 640), .45, .9) : clamp(Math.min(H / 900, W / 1500), .62, 1.7);
  const TOP = compact ? 62 : 84 * u, yB = H - (compact ? 128 : 150) * u, pBot = yB - 150 * u;
  const SL = compact ? 10 : Math.max(230 * u, W * .13), SR = SL;
  G = { TOP, yB, pBot, SL, SR };
  const st = document.documentElement.style;
  st.setProperty('--in-t', TOP + 'px'); st.setProperty('--in-b', (H - pBot) + 'px'); st.setProperty('--in-l', SL + 'px'); st.setProperty('--in-r', SR + 'px');
  puffImg = puffImg || makePuff();
  if (!cloudImg) { cloudImg = document.createElement('canvas'); cloudImg.width = cloudImg.height = 64; const k = cloudImg.getContext('2d'); k.drawImage(puffImg, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = rgba(DAY.cloud); k.fillRect(0, 0, 64, 64); }
  build();
  bakeAll();
  // préchauffage : l'installation tourne déjà au premier regard
  for (let i = 0; i < 1500; i++) simulate(1 / 60, true);
  if (STATIC) draw();
}

function build() {
  V = {}; links = []; drops = []; puffs = []; sparks = []; foam = []; arcs = []; ev = null;
  const { yB, SL, SR, TOP } = G;
  const bx0 = compact ? 8 : SL * .82, bx1 = compact ? W - 8 : W - SR * .82;
  G.bx0 = bx0; G.bx1 = bx1;

  /* éléments de la paillasse, placés selon la place disponible */
  const items = compact
    ? [['A', 110], ['CD', 80], ['pump', 64], ['E', 132], ['jug', 86]]
    : [['A', 120], ['CD', 86], ['pump', 70], ['E', 140], ['orrery', 120], ['micro', 66], ['rack', 100], ['books', 86], ['K', 64]];
  const drop_ = ['books', 'rack', 'micro', 'orrery'];
  const avail = bx1 - bx0 - 30 * u;
  let list = items.slice();
  while (list.reduce((s, it) => s + it[1] * u, 0) > avail && drop_.length) { const d = drop_.shift(); list = list.filter(it => it[0] !== d); }
  const total = list.reduce((s, it) => s + it[1] * u, 0), gap = Math.max(0, (avail - total) / (list.length + 1));
  let X = bx0 + 15 * u + gap; const pos = {};
  for (const [k, wd] of list) { pos[k] = X; X += wd * u + gap; }
  G.items = list.map(i => i[0]); G.pos = pos;

  // bouilleur A
  const rA = 38 * u, Acx = pos.A + 60 * u, Acy = yB - 40 * u - rA, nwA = 9 * u, neckA = Acy - rA * Math.cos(Math.asin(nwA / rA)) - 22 * u;
  vessel('A', roundPath(Acx, Acy, rA, nwA, neckA), [Acx - rA, neckA, Acx + rA, Acy + rA], 100, 62, PAL[0]);
  G.A = { cx: Acx, cy: Acy, r: rA, neck: neckA };
  // condenseur + récepteur D
  const Cx = pos.CD + 32 * u, jTop = yB - 122 * u, jBot = yB - 66 * u;
  const Dby = yB - 1 * u, Dneck = yB - 50 * u;
  vessel('D', erlenPath(Cx, Dby, 27 * u, 34 * u, 8 * u, Dneck), [Cx - 27 * u, Dneck, Cx + 27 * u, Dby], 60, 22, PAL[0]);
  G.C = { x: Cx, jTop, jBot };
  // pompe
  const Px = pos.pump + 35 * u; G.pump = { x: Px };
  // ballon de réaction E + ampoule F
  const rE = 36 * u, Ecx = pos.E + 52 * u, Ecy = yB - 30 * u - rE, nwE = 8 * u, neckE = Ecy - rE * Math.cos(Math.asin(nwE / rE)) - 18 * u;
  vessel('E', roundPath(Ecx, Ecy, rE, nwE, neckE), [Ecx - rE, neckE, Ecx + rE, Ecy + rE], 80, 44, PAL[1]);
  const Fcx = Ecx + 64 * u, Ftop = yB - 142 * u, Fh = 50 * u;
  vessel('F', funnelPath(Fcx, Ftop, Fh, 17 * u), [Fcx - 17 * u, Ftop, Fcx + 17 * u, Ftop + Fh], 20, 14, PAL[2]);
  G.E = { cx: Ecx, cy: Ecy, r: rE, neck: neckE }; G.F = { cx: Fcx, top: Ftop, bot: Ftop + Fh };
  G.stem = makePipe([[Fcx, Ftop + Fh + 2 * u], [Fcx, Ftop + Fh + 6 * u], [Ecx + rE * .86, Ecy - rE * .5]]);

  // réservoir : cuve géante (bureau) ou bonbonne (mobile)
  if (!compact) {
    const tw = Math.min(76 * u, SR * .33), tcx = W - SR * .5, gTop = TOP + 80 * u, gBot = H - 86 * u;
    vessel('T', cylPath(tcx, tw, gTop, gBot, 10 * u), [tcx - tw, gTop, tcx + tw, gBot], 420, 300, PAL[3], { big: true });
    G.T = { cx: tcx, w: tw, top: gTop, bot: gBot, x0: tcx - tw };
    // colonne K
    const Kcx = pos.K + 32 * u, Ktop = yB - 128 * u, Kbot = yB - 6 * u;
    vessel('K', cylPath(Kcx, 15 * u, Ktop, Kbot, 6 * u), [Kcx - 15 * u, Ktop, Kcx + 15 * u, Kbot], 120, 64, PAL[4]);
    G.K = { cx: Kcx, top: Ktop, bot: Kbot };
  } else {
    const jcx = pos.jug + 43 * u, jneck = yB - 120 * u;
    vessel('T', jugPath(jcx, yB - 1 * u, 38 * u, 82 * u, 10 * u, jneck), [jcx - 38 * u, jneck, jcx + 38 * u, yB - 1 * u], 160, 96, PAL[3]);
    G.T = { cx: jcx, w: 38 * u, top: jneck, bot: yB, x0: jcx - 38 * u, jug: true };
  }

  /* ---------- circuits ---------- */
  const T = V.T, A = V.A, D = V.D, E = V.E, Fv = V.F;
  const yLine = yB - 142 * u;
  // 1. réservoir → bouilleur : se déclenche quand le bouilleur a soif
  const sup = compact
    ? link({ id: 'sup', from: T, to: A, path: [[G.T.cx - 20 * u, yB - 8 * u], [G.T.cx - 20 * u, yB - 4 * u], [G.T.x0 - 14 * u, yB - 4 * u], [G.T.x0 - 14 * u, yLine], [Acx - 5 * u, yLine], [Acx - 5 * u, neckA + 12 * u]] })
    : link({ id: 'sup', from: T, to: A, path: [[G.T.x0 + 8 * u, yB - 50 * u], [G.T.x0 - 40 * u, yB - 50 * u], [G.T.x0 - 40 * u, yLine], [Acx - 5 * u, yLine], [Acx - 5 * u, neckA + 12 * u]] });
  sup.deliver = (q, col) => addTo(A, q, col);
  sup.decide = () => { const a = lev(A); if (!sup.on) { if (a < .45 && lev(T) > .03) sup.on = true; } else if (a >= .85 || T.vol < 1) sup.on = false; };
  // 2. bouilleur → condenseur → récepteur (vapeur, puis gouttes)
  const coil = [[Cx, jTop - 4 * u]];
  for (let y = jTop + 4 * u, s = -1; y < jBot - 4 * u; y += 7 * u, s = -s) coil.push([Cx + s * 8 * u, y]);
  coil.push([Cx, jBot], [Cx, jBot + 6 * u]);
  const vap = link({ id: 'vap', from: A, to: D, style: 'vapor', rate: 2.4, speed: 80, path: [[Acx + 5 * u, neckA + 12 * u], [Acx + 5 * u, neckA - 3 * u], [Cx, jTop - 10 * u], ...coil] });
  vap.vaporEnd = vap.pipe.seg[2] ? vap.pipe.seg[2].s + vap.pipe.seg[2].d : 0;
  vap.pend = 0;
  vap.deliver = (q, col) => { vap.pend += q; if (vap.pend >= .45) { drop(Cx, jBot + 8 * u, col, vap.pend, D); vap.pend = 0; } };
  vap.decide = () => { const s = lev(A), d = lev(D); if (!vap.on) { if (s >= .4 && d < .95) vap.on = true; } else if (s <= .2 || d >= .95) vap.on = false; };
  // 3. récepteur → pompe → ballon de réaction
  const pp = [[Cx + 20 * u, yB - 9 * u], [Px - 23 * u, yB - 9 * u], [Px + 23 * u, yB - 9 * u], [Ecx - 48 * u, yB - 9 * u], [Ecx - 48 * u, yB - 132 * u], [Ecx, yB - 132 * u], [Ecx, neckE + 10 * u]];
  const pump = link({ id: 'pump', from: D, to: E, rate: 3.2, path: pp });
  pump.deliver = (q, col) => addTo(E, q, col);
  pump.decide = () => { const s = lev(D), d = lev(E); if (!pump.on) { if (s >= .6 && d < .95) pump.on = true; } else if (s <= .12 || d >= .95) pump.on = false; };
  // 4. ballon → colonne (ou bonbonne sur mobile)
  const dest = compact ? T : V.K;
  const dpath = compact
    ? [[Ecx, Ecy + rE - 4 * u], [Ecx, yB - 14 * u], [G.T.cx - 6 * u, yB - 14 * u], [G.T.cx - 6 * u, yB - 30 * u]]
    : [[Ecx, Ecy + rE - 4 * u], [Ecx, yB - 14 * u], [G.K.cx - 22 * u, yB - 14 * u], [G.K.cx - 8 * u, yB - 14 * u]];
  const drn = link({ id: 'drain', from: E, to: dest, rate: 3, path: dpath });
  drn.deliver = (q, col) => addTo(dest, q, col);
  drn.decide = () => { const s = lev(E), d = lev(dest); if (!drn.on) { if (s >= .55 && d < .95) drn.on = true; } else if (s <= .12 || d >= .95) drn.on = false; };
  // 5. colonne → montée le long de la cuve → retour par le couvercle
  if (!compact) {
    const K = V.K, Tg = G.T;
    const lift = link({ id: 'lift', from: K, to: T, rate: 3.4, speed: 130, path: [[G.K.cx, G.K.top + 6 * u], [G.K.cx, yB - 138 * u], [Tg.x0 - 20 * u, yB - 138 * u], [Tg.x0 - 20 * u, Tg.top - 46 * u], [Tg.cx, Tg.top - 46 * u], [Tg.cx, Tg.top + 6 * u]] });
    lift.deliver = (q, col) => addTo(T, q, col);
    lift.decide = () => { const s = lev(K), d = lev(T); if (!lift.on) { if (s >= .6 && d < .97) lift.on = true; } else if (s <= .2 || d >= .97) lift.on = false; };
  }
  G.vap = vap; G.pumpL = pump;

  /* bobine Tesla, fenêtre, porte, lampes, engrenages, manomètres */
  if (!compact) {
    const tcx = SL * .58, torY = TOP + (H - TOP) * .34, torW = Math.min(170 * u, SL * .88);
    G.tesla = { cx: tcx, torY, torW, torH: 44 * u, base: H, cabW: 128 * u, cabH: 70 * u };
    G.win = { cx: SL * .5, top: TOP + 26 * u, bot: TOP + (H - TOP) * .62, w: SL * .8 };
    G.door = { x: 12 * u, w: 46 * u, top: H - 92 * u, bot: H - 4 * u };
    G.lamps = [W * .3, W * .5, W * .7].map(x => ({ x, y: TOP * .62, k: 1, off: 0, swing: 0, vs: 0 }));
    G.gears = [
      { x: 40 * u, y: 40 * u, r: 34 * u, n: 14, sp: .4, pal: BRASS }, { x: 92 * u, y: 70 * u, r: 20 * u, n: 9, sp: -.4 * 34 / 20, pal: COPPER, ph: .2 }, { x: 118 * u, y: 28 * u, r: 14 * u, n: 7, sp: .4 * 34 / 14 * .6, pal: STEEL },
      { x: W - 44 * u, y: 46 * u, r: 38 * u, n: 16, sp: -.3, pal: BRASS }, { x: W - 104 * u, y: 32 * u, r: 18 * u, n: 8, sp: .3 * 38 / 18, pal: COPPER, ph: .3 }
    ];
    G.gauges = [{ x: W * .2, y: TOP * .45, r: 13 * u, v: .4 }, { x: W * .8, y: TOP * .45, r: 13 * u, v: .6 }, { x: G.T.cx, y: G.T.top - 18 * u, r: 11 * u, v: .5, link: 'T' }, { x: G.C.x + 26 * u, y: G.C.jTop - 8 * u, r: 9 * u, v: .3, link: 'A' }];
  } else {
    G.tesla = null; G.win = null; G.door = null;
    G.lamps = [W * .25, W * .75].map(x => ({ x, y: 30, k: 1, off: 0, swing: 0, vs: 0 }));
    G.gears = [{ x: 22, y: 26, r: 18, n: 10, sp: .4, pal: BRASS }, { x: W - 24, y: 28, r: 20, n: 11, sp: -.35, pal: COPPER }];
    G.gauges = [{ x: G.C.x + 26 * u, y: G.C.jTop - 8 * u, r: 9 * u, v: .3, link: 'A' }];
  }
  // éprouvettes décoratives
  if (pos.rack) {
    G.rack = []; const cols = [PAL[0], PAL[2], PAL[3], PAL[4], PAL[1]];
    for (let i = 0; i < 5; i++) { const cx = pos.rack + 14 * u + i * 18 * u, top = yB - 70 * u; G.rack.push(vessel('R' + i, cylPath(cx, 6 * u, top, yB - 12 * u, 6 * u), [cx - 6 * u, top, cx + 6 * u, yB - 12 * u], 10, 4 + i * 1.1, cols[i], { deco: true })); }
  }
  // poussière et pluie
  dust = []; for (let i = 0; i < (compact ? 20 : 60); i++) dust.push({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-4, 4), vy: rnd(-3, 3), a: rnd(.1, .4) });
  rain = []; clouds = [];
  if (G.win) { for (let i = 0; i < 60; i++) rain.push({ x: rnd(0, 1), y: rnd(0, 1), v: rnd(.6, 1.1) }); for (let i = 0; i < 7; i++) clouds.push({ x: rnd(-.2, 1.2), y: rnd(.05, .6), s: rnd(.5, 1.1), v: rnd(.004, .012) }); }
  sci = { x: (bx0 + bx1) / 2, dir: 1, mode: 'idle', timer: 2, target: 0, task: null, phase: 0, arm: 0, bub: null, jump: 0, soot: 0 };
}

/* ---------- couches fixes ---------- */
function windowPath(c, o = 0) {
  const w = G.win, r = w.w / 2, x0 = w.cx - r;
  c.beginPath(); c.moveTo(x0 + o, w.bot); c.lineTo(x0 + o, w.top + r); c.arc(w.cx, w.top + r, r - o, Math.PI, 0); c.lineTo(w.cx + r - o, w.bot); c.closePath();
}
function bakeAll() {
  /* --- fond : mur de pierre, fenêtre, sol --- */
  const far = canvasLayer(), f = far.k, r = seeded(7);
  f.fillStyle = '#0c0e13'; f.fillRect(-far.M, -far.M, W + 2 * far.M, H + 2 * far.M);
  const bh = 44 * u;
  for (let y = -far.M, row = 0; y < H + far.M; y += bh, row++) {
    let x = -far.M - (row % 2) * 40 * u;
    while (x < W + far.M) {
      const bw = (70 + r() * 50) * u, l = 22 + r() * 12, g = f.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, `rgb(${l + 6},${l + 9},${l + 16})`); g.addColorStop(1, `rgb(${l - 6},${l - 4},${l + 2})`);
      f.fillStyle = g; rr(f, x + 1.5 * u, y + 1.5 * u, bw - 3 * u, bh - 3 * u, 3 * u); f.fill();
      for (let k = 0; k < 6; k++) { f.fillStyle = `rgba(0,0,0,${.1 + r() * .15})`; f.fillRect(x + r() * bw, y + r() * bh, (1 + r() * 2) * u, (1 + r() * 2) * u); }
      x += bw;
    }
  }
  // éclairage chaud du centre, froid sur les côtés
  let g = f.createRadialGradient(W / 2, H * .45, 50 * u, W / 2, H * .45, Math.max(W, H) * .7);
  g.addColorStop(0, 'rgba(255,170,90,.08)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); f.fillStyle = g; f.fillRect(-far.M, -far.M, W + 2 * far.M, H + 2 * far.M);
  // poutres du plafond
  for (const y of [0, G.TOP * .34]) { const pg = f.createLinearGradient(0, y, 0, y + 16 * u); pg.addColorStop(0, '#3a2414'); pg.addColorStop(1, '#170d06'); f.fillStyle = pg; f.fillRect(-far.M, y, W + 2 * far.M, 16 * u); }
  // tuyauterie murale en cuivre
  f.save(); f.lineCap = 'round';
  const pipeRun = (pts, w, pal) => { f.beginPath(); f.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) f.lineTo(p[0], p[1]); f.lineWidth = w; f.strokeStyle = pal[2]; f.stroke(); f.lineWidth = w * .55; f.strokeStyle = pal[1]; f.stroke(); f.lineWidth = w * .18; f.strokeStyle = pal[0]; f.stroke(); };
  pipeRun([[-20, G.TOP * .78], [W + 20, G.TOP * .78]], 9 * u, COPPER);
  pipeRun([[W * .2, G.TOP * .78], [W * .2, G.TOP * .45]], 6 * u, STEEL); pipeRun([[W * .8, G.TOP * .78], [W * .8, G.TOP * .45]], 6 * u, STEEL);
  if (!compact) { pipeRun([[G.SL * .1, G.TOP * .78], [G.SL * .1, H]], 8 * u, COPPER); pipeRun([[W - G.SR * .08, G.TOP], [W - G.SR * .08, H]], 8 * u, STEEL); }
  for (let x = 60 * u; x < W; x += 180 * u) { f.fillStyle = metal(f, 0, G.TOP * .78 - 8 * u, 0, G.TOP * .78 + 8 * u, BRASS); f.fillRect(x, G.TOP * .78 - 7 * u, 10 * u, 14 * u); }
  f.restore();
  // fenêtre en ogive : trou + cadre
  if (G.win) {
    f.save(); windowPath(f); f.globalCompositeOperation = 'destination-out'; f.fill(); f.restore();
    f.save(); windowPath(f); f.lineWidth = 12 * u; f.strokeStyle = '#2a1d14'; f.stroke(); f.lineWidth = 4 * u; f.strokeStyle = metal(f, 0, G.win.top, 0, G.win.bot, BRASS); f.stroke();
    f.clip(); f.lineWidth = 4 * u; f.strokeStyle = '#2a1d14';
    const w = G.win; f.beginPath(); f.moveTo(w.cx, w.top); f.lineTo(w.cx, w.bot);
    for (let y = w.top + w.w * .5; y < w.bot; y += (w.bot - w.top) / 4.2) { f.moveTo(w.cx - w.w / 2, y); f.lineTo(w.cx + w.w / 2, y); }
    f.stroke(); f.restore();
    f.fillStyle = metal(f, 0, G.win.bot, 0, G.win.bot + 14 * u, ['#6a5040', '#4a3424', '#2a1a10', '#140a04']); f.fillRect(G.win.cx - G.win.w / 2 - 14 * u, G.win.bot, G.win.w + 28 * u, 14 * u);
  }
  // sol
  g = f.createLinearGradient(0, H - 40 * u, 0, H); g.addColorStop(0, '#15120f'); g.addColorStop(1, '#0a0806'); f.fillStyle = g; f.fillRect(-far.M, H - 30 * u, W + 2 * far.M, 30 * u + far.M);
  // porte vers la salle pixel
  if (G.door) {
    const d = G.door, rd = d.w / 2;
    f.save(); f.beginPath(); f.moveTo(d.x, d.bot); f.lineTo(d.x, d.top + rd); f.arc(d.x + rd, d.top + rd, rd, Math.PI, 0); f.lineTo(d.x + d.w, d.bot); f.closePath();
    f.fillStyle = metal(f, d.x, 0, d.x + d.w, 0, ['#6b4426', '#4e2f19', '#3a2211', '#24140a']); f.fill();
    f.lineWidth = 3 * u; f.strokeStyle = metal(f, 0, d.top, 0, d.bot, STEEL); f.stroke();
    f.clip(); f.strokeStyle = 'rgba(0,0,0,.35)'; f.lineWidth = 1.5 * u; for (let x = d.x + 9 * u; x < d.x + d.w; x += 9 * u) { f.beginPath(); f.moveTo(x, d.top); f.lineTo(x, d.bot); f.stroke(); }
    f.restore();
    f.fillStyle = BRASS[1]; f.beginPath(); f.arc(d.x + d.w - 9 * u, (d.top + d.bot) / 2 + 6 * u, 3 * u, 0, 6.3); f.fill();
  }
  layers.far = far;

  /* --- plan intermédiaire : bobine Tesla, cuve, lampes --- */
  const mid = canvasLayer(), m = mid.k;
  if (G.tesla) bakeTesla(m);
  if (!compact) bakeTankBack(m);
  for (const l of G.lamps) { m.strokeStyle = '#0b0b0d'; m.lineWidth = 1.5 * u; m.beginPath(); m.moveTo(l.x, 0); m.lineTo(l.x, l.y - 10 * u); m.stroke(); }
  for (const gg of G.gauges) bakeGauge(m, gg);
  layers.mid = mid;
  const over = canvasLayer();
  if (!compact) bakeTankFront(over.k);
  layers.midOver = over;

  /* --- paillasse --- */
  const bench = canvasLayer(), b = bench.k;
  bakeBench(b);
  for (const L of links) bakePipeGlass(b, L.pipe, L.w);
  bakePipeGlass(b, G.stem, 3);
  layers.bench = bench;
  const shine = canvasLayer();
  for (const L of links) bakePipeShine(shine.k, L.pipe, L.w);
  layers.shine = shine;

  /* --- premier plan flou + vignette --- */
  const fg = canvasLayer(), fk = fg.k;
  if (!compact) {
    fk.save(); fk.filter = `blur(${6 * u}px)`;
    const bottle = (x, by, w, h, col) => { fk.fillStyle = 'rgba(10,14,18,.85)'; rr(fk, x - w / 2, by - h, w, h, w * .3); fk.fill(); fk.fillStyle = rgba(col, .35); rr(fk, x - w / 2 + 4 * u, by - h * .55, w - 8 * u, h * .55 - 4 * u, w * .25); fk.fill(); fk.fillStyle = 'rgba(10,14,18,.85)'; fk.fillRect(x - w * .14, by - h - 26 * u, w * .28, 30 * u); };
    bottle(-26 * u, H + 30 * u, 70 * u, 130 * u, PAL[2]);
    bottle(W - 26 * u, H + 24 * u, 66 * u, 140 * u, PAL[3]);
    fk.restore();
  }
  g = fk.createRadialGradient(W / 2, H * .5, Math.min(W, H) * .35, W / 2, H * .5, Math.max(W, H) * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)'); fk.fillStyle = g; fk.fillRect(-fg.M, -fg.M, W + 2 * fg.M, H + 2 * fg.M);
  layers.fg = fg;
}
function bakeTesla(c) {
  const T = G.tesla, cx = T.cx, base = T.base;
  // armoire
  const cw = T.cabW, ch = T.cabH, cy0 = base - ch;
  c.fillStyle = metal(c, cx - cw / 2, 0, cx + cw / 2, 0, ['#4a5260', '#2c323c', '#1c2028', '#111419']); rr(c, cx - cw / 2, cy0, cw, ch, 6 * u); c.fill();
  c.strokeStyle = metal(c, 0, cy0, 0, base, BRASS); c.lineWidth = 3 * u; c.stroke();
  for (const [x, y] of [[cx - cw / 2 + 8 * u, cy0 + 8 * u], [cx + cw / 2 - 8 * u, cy0 + 8 * u], [cx - cw / 2 + 8 * u, base - 8 * u], [cx + cw / 2 - 8 * u, base - 8 * u]]) { c.fillStyle = BRASS[0]; c.beginPath(); c.arc(x, y, 2.5 * u, 0, 6.3); c.fill(); }
  c.fillStyle = '#07090c'; rr(c, cx - 30 * u, cy0 + 16 * u, 60 * u, 26 * u, 4 * u); c.fill();
  // bobine primaire
  for (let i = 0; i < 6; i++) { c.strokeStyle = i % 2 ? COPPER[1] : COPPER[0]; c.lineWidth = 3 * u; c.beginPath(); c.ellipse(cx, cy0 - 4 * u - i * 4 * u, 40 * u - i * 2 * u, 7 * u, 0, 0, Math.PI * 2); c.stroke(); }
  // bobine secondaire
  const sTop = T.torY + T.torH * .3, sBot = cy0 - 26 * u, sw = 22 * u;
  c.fillStyle = metal(c, cx - sw, 0, cx + sw, 0, ['#f0b27a', '#c8763a', '#8a4a1e', '#3a1a08']); c.fillRect(cx - sw, sTop, sw * 2, sBot - sTop);
  c.strokeStyle = 'rgba(40,16,4,.45)'; c.lineWidth = Math.max(1, .8 * u);
  for (let y = sTop; y < sBot; y += 2.6 * u) { c.beginPath(); c.moveTo(cx - sw, y); c.lineTo(cx + sw, y + 1 * u); c.stroke(); }
  c.fillStyle = metal(c, 0, sBot, 0, sBot + 10 * u, BRASS); c.fillRect(cx - sw - 4 * u, sBot, sw * 2 + 8 * u, 8 * u);
  // tore métallique
  const tw = T.torW / 2, th = T.torH / 2, ty = T.torY;
  let g = c.createLinearGradient(0, ty - th, 0, ty + th); g.addColorStop(0, '#f4f8fb'); g.addColorStop(.35, '#b6c1cc'); g.addColorStop(.7, '#5b6573'); g.addColorStop(1, '#262b33');
  c.fillStyle = g; c.beginPath(); c.ellipse(cx, ty, tw, th, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(10,12,16,.75)'; c.beginPath(); c.ellipse(cx, ty - th * .25, tw * .42, th * .32, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2 * u; c.beginPath(); c.ellipse(cx, ty - th * .1, tw * .82, th * .55, 0, Math.PI * 1.1, Math.PI * 1.75); c.stroke();
  c.fillStyle = metal(c, cx - 5 * u, 0, cx + 5 * u, 0, STEEL); c.fillRect(cx - 3 * u, ty - th - 16 * u, 6 * u, 16 * u);
  g = c.createRadialGradient(cx - 3 * u, ty - th - 20 * u, 1, cx, ty - th - 18 * u, 8 * u); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#6b7684');
  c.fillStyle = g; c.beginPath(); c.arc(cx, ty - th - 18 * u, 7 * u, 0, 6.3); c.fill();
}
function bakeTankBack(c) {
  const T = G.T, x0 = T.cx - T.w, x1 = T.cx + T.w;
  c.fillStyle = 'rgba(6,14,12,.9)'; c.fillRect(x0, T.top, T.w * 2, T.bot - T.top);
  // couvercle et socle
  c.fillStyle = metal(c, 0, T.top - 34 * u, 0, T.top, BRASS); rr(c, x0 - 14 * u, T.top - 34 * u, T.w * 2 + 28 * u, 34 * u, 6 * u); c.fill();
  c.fillStyle = metal(c, 0, T.bot, 0, H, ['#4a5260', '#2c323c', '#1c2028', '#0d1014']); rr(c, x0 - 18 * u, T.bot, T.w * 2 + 36 * u, H - T.bot + 10, 6 * u); c.fill();
  c.strokeStyle = metal(c, 0, T.bot, 0, T.bot + 20 * u, BRASS); c.lineWidth = 3 * u; c.strokeRect(x0 - 18 * u, T.bot, T.w * 2 + 36 * u, 10 * u);
  for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#3dff8a' : '#ff6060'; c.beginPath(); c.arc(x0 + (T.w * 2) * (i + .5) / 5, T.bot + 30 * u, 2.5 * u, 0, 6.3); c.fill(); }
  // tuyaux vers le plafond
  for (const xx of [x0 + 10 * u, x1 - 14 * u]) { c.fillStyle = metal(c, xx, 0, xx + 8 * u, 0, STEEL); c.fillRect(xx, 0, 8 * u, T.top - 34 * u); }
}
function bakeTankFront(c) {
  const T = G.T, x0 = T.cx - T.w;
  for (const y of [T.top + (T.bot - T.top) * .33, T.top + (T.bot - T.top) * .66]) { c.fillStyle = metal(c, 0, y - 5 * u, 0, y + 5 * u, BRASS); c.fillRect(x0 - 4 * u, y - 5 * u, T.w * 2 + 8 * u, 10 * u); }
  const g = c.createLinearGradient(x0, 0, x0 + T.w * 2, 0);
  g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(.12, 'rgba(255,255,255,.42)'); g.addColorStop(.2, 'rgba(255,255,255,.05)'); g.addColorStop(.85, 'rgba(255,255,255,0)'); g.addColorStop(.93, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(255,255,255,.08)');
  c.fillStyle = g; c.fillRect(x0, T.top, T.w * 2, T.bot - T.top);
  c.strokeStyle = 'rgba(200,235,250,.55)'; c.lineWidth = 2 * u; c.strokeRect(x0, T.top, T.w * 2, T.bot - T.top);
}
function bakeGauge(c, gg) {
  c.fillStyle = metal(c, gg.x - gg.r, gg.y - gg.r, gg.x + gg.r, gg.y + gg.r, BRASS); c.beginPath(); c.arc(gg.x, gg.y, gg.r + 3 * u, 0, 6.3); c.fill();
  const g = c.createRadialGradient(gg.x - gg.r * .3, gg.y - gg.r * .3, 1, gg.x, gg.y, gg.r); g.addColorStop(0, '#fbf6e6'); g.addColorStop(1, '#c9bf9e');
  c.fillStyle = g; c.beginPath(); c.arc(gg.x, gg.y, gg.r, 0, 6.3); c.fill();
  c.strokeStyle = '#3a2a1a'; c.lineWidth = Math.max(1, u);
  for (let i = 0; i <= 8; i++) { const a = Math.PI * .75 + i / 8 * Math.PI * 1.5; c.beginPath(); c.moveTo(gg.x + Math.cos(a) * gg.r * .72, gg.y + Math.sin(a) * gg.r * .72); c.lineTo(gg.x + Math.cos(a) * gg.r * .9, gg.y + Math.sin(a) * gg.r * .9); c.stroke(); }
  c.strokeStyle = '#b0303f'; c.lineWidth = 2 * u; c.beginPath(); c.arc(gg.x, gg.y, gg.r * .8, Math.PI * 1.95, Math.PI * 2.25); c.stroke();
}
function bakeBench(c) {
  const { yB, bx0, bx1 } = G, th = 16 * u;
  // meuble
  let g = c.createLinearGradient(0, yB, 0, H); g.addColorStop(0, '#2a1a10'); g.addColorStop(1, '#0d0805');
  c.fillStyle = g; c.fillRect(bx0, yB + th, bx1 - bx0, H - yB);
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 2 * u;
  const nd = Math.max(2, Math.round((bx1 - bx0) / (170 * u)));
  for (let i = 0; i < nd; i++) { const x = bx0 + 10 * u + i * (bx1 - bx0 - 20 * u) / nd; rr(c, x, yB + th + 12 * u, (bx1 - bx0 - 20 * u) / nd - 12 * u, H - yB - th - 30 * u, 4 * u); c.stroke(); c.fillStyle = BRASS[1]; c.fillRect(x + (bx1 - bx0 - 20 * u) / nd / 2 - 14 * u, yB + th + 26 * u, 16 * u, 4 * u); }
  // plateau
  g = c.createLinearGradient(0, yB, 0, yB + th); g.addColorStop(0, '#8a5a34'); g.addColorStop(.3, '#6b4226'); g.addColorStop(1, '#3a2213');
  c.fillStyle = g; rr(c, bx0 - 8 * u, yB, bx1 - bx0 + 16 * u, th, 3 * u); c.fill();
  c.fillStyle = metal(c, 0, yB + th - 3 * u, 0, yB + th + 2 * u, BRASS); c.fillRect(bx0 - 8 * u, yB + th - 3 * u, bx1 - bx0 + 16 * u, 3 * u);

  const A = G.A;
  // trépied + brûleur
  c.strokeStyle = metal(c, 0, yB - 40 * u, 0, yB, STEEL); c.lineWidth = 3 * u;
  c.beginPath(); c.moveTo(A.cx - 30 * u, yB); c.lineTo(A.cx - 22 * u, yB - 40 * u); c.moveTo(A.cx + 30 * u, yB); c.lineTo(A.cx + 22 * u, yB - 40 * u); c.stroke();
  c.fillStyle = STEEL[1]; c.fillRect(A.cx - 26 * u, yB - 42 * u, 52 * u, 3 * u);
  c.fillStyle = metal(c, A.cx - 6 * u, 0, A.cx + 6 * u, 0, BRASS); c.fillRect(A.cx - 5 * u, yB - 26 * u, 10 * u, 22 * u); c.fillStyle = metal(c, 0, yB - 6 * u, 0, yB, STEEL); c.fillRect(A.cx - 14 * u, yB - 6 * u, 28 * u, 6 * u);
  // condenseur : support + manchon
  const C = G.C;
  c.fillStyle = metal(c, C.x + 34 * u, 0, C.x + 39 * u, 0, STEEL); c.fillRect(C.x + 34 * u, C.jTop - 20 * u, 4 * u, yB - C.jTop + 20 * u);
  c.fillStyle = STEEL[2]; c.fillRect(C.x + 10 * u, C.jTop + 10 * u, 26 * u, 3 * u); c.fillRect(C.x + 10 * u, C.jBot - 10 * u, 26 * u, 3 * u);
  c.fillStyle = 'rgba(80,150,255,.12)'; rr(c, C.x - 14 * u, C.jTop, 28 * u, C.jBot - C.jTop, 10 * u); c.fill();
  c.strokeStyle = 'rgba(200,235,250,.55)'; c.lineWidth = 2 * u; c.stroke();
  // pompe (corps)
  const P = G.pump.x;
  c.fillStyle = metal(c, P - 23 * u, 0, P + 23 * u, 0, ['#4a5260', '#2c323c', '#1c2028', '#0d1014']); rr(c, P - 23 * u, yB - 34 * u, 46 * u, 34 * u, 5 * u); c.fill();
  c.strokeStyle = metal(c, 0, yB - 34 * u, 0, yB, BRASS); c.lineWidth = 2 * u; c.stroke();
  c.fillStyle = '#05070a'; c.beginPath(); c.arc(P, yB - 17 * u, 9 * u, 0, 6.3); c.fill();
  // statif du ballon E + pince de l'ampoule F
  const E = G.E;
  c.fillStyle = metal(c, E.cx + 46 * u, 0, E.cx + 50 * u, 0, STEEL); c.fillRect(E.cx + 45 * u, G.F.top - 8 * u, 4 * u, yB - G.F.top + 8 * u);
  c.fillStyle = STEEL[2]; c.fillRect(E.cx + 49 * u, G.F.top + 18 * u, G.F.cx - E.cx - 49 * u, 3 * u);
  c.strokeStyle = STEEL[1]; c.lineWidth = 3 * u; c.beginPath(); c.ellipse(E.cx, E.cy + E.r * .45, E.r * .85, 6 * u, 0, 0, Math.PI * 2); c.stroke(); c.fillRect(E.cx + E.r * .8, E.cy + E.r * .45 - 1.5 * u, 46 * u - E.r * .8, 3 * u);
  c.fillStyle = metal(c, 0, yB - 4 * u, 0, yB, STEEL); c.fillRect(E.cx + 30 * u, yB - 4 * u, 34 * u, 4 * u);
  // colonne : socle
  if (G.K) { c.fillStyle = metal(c, 0, G.K.bot, 0, yB, BRASS); rr(c, G.K.cx - 22 * u, G.K.bot - 2 * u, 44 * u, yB - G.K.bot + 2 * u, 3 * u); c.fill(); }
  // planétaire (socle)
  if (G.pos.orrery) {
    const ox = G.pos.orrery + 60 * u;
    c.fillStyle = metal(c, ox - 30 * u, 0, ox + 30 * u, 0, ['#5a3a20', '#3e2614', '#2a180c', '#140a04']); rr(c, ox - 34 * u, yB - 12 * u, 68 * u, 12 * u, 4 * u); c.fill();
    c.fillStyle = metal(c, ox - 3 * u, 0, ox + 3 * u, 0, BRASS); c.fillRect(ox - 3 * u, yB - 60 * u, 6 * u, 48 * u);
  }
  // microscope
  if (G.pos.micro) {
    const mx0 = G.pos.micro + 16 * u;
    c.fillStyle = metal(c, 0, yB - 10 * u, 0, yB, ['#4a5260', '#2c323c', '#1c2028', '#0d1014']); rr(c, mx0 - 4 * u, yB - 10 * u, 44 * u, 10 * u, 4 * u); c.fill();
    c.strokeStyle = metal(c, mx0 + 24 * u, 0, mx0 + 34 * u, 0, ['#4a5260', '#2c323c', '#1c2028', '#0d1014']); c.lineWidth = 9 * u; c.lineCap = 'round';
    c.beginPath(); c.moveTo(mx0 + 30 * u, yB - 10 * u); c.quadraticCurveTo(mx0 + 40 * u, yB - 50 * u, mx0 + 22 * u, yB - 78 * u); c.stroke();
    c.save(); c.translate(mx0 + 14 * u, yB - 72 * u); c.rotate(-.45); c.fillStyle = metal(c, -6 * u, 0, 6 * u, 0, BRASS); c.fillRect(-6 * u, -26 * u, 12 * u, 46 * u); c.fillStyle = '#111'; c.fillRect(-8 * u, -30 * u, 16 * u, 6 * u); c.restore();
    c.fillStyle = STEEL[2]; c.fillRect(mx0, yB - 34 * u, 34 * u, 4 * u);
    c.lineCap = 'butt';
  }
  // support d'éprouvettes
  if (G.pos.rack) {
    const rx = G.pos.rack;
    c.fillStyle = metal(c, 0, yB - 46 * u, 0, yB - 38 * u, ['#9a6a40', '#7a4e2a', '#5a361a', '#3a2010']); c.fillRect(rx, yB - 46 * u, 100 * u, 7 * u); c.fillRect(rx, yB - 10 * u, 100 * u, 10 * u);
    c.fillRect(rx, yB - 46 * u, 5 * u, 46 * u); c.fillRect(rx + 95 * u, yB - 46 * u, 5 * u, 46 * u);
  }
  // livres, crâne, chandelle
  if (G.pos.books) {
    const bx = G.pos.books, cols = ['#6b2626', '#26406b', '#355e2a', '#5a3e7a'];
    cols.forEach((col, i) => { const h = 12 * u, y = yB - (i + 1) * h; c.fillStyle = col; rr(c, bx + (i % 2) * 6 * u, y, 62 * u, h - 1 * u, 2 * u); c.fill(); c.fillStyle = '#e8dcc0'; c.fillRect(bx + (i % 2) * 6 * u + 58 * u, y + 2 * u, 3 * u, h - 5 * u); c.fillStyle = BRASS[1]; c.fillRect(bx + (i % 2) * 6 * u + 8 * u, y + 4 * u, 14 * u, 2 * u); });
    const sx = bx + 34 * u, sy = yB - 48 * u - 14 * u;
    c.fillStyle = '#e8e2cc'; c.beginPath(); c.arc(sx, sy, 11 * u, 0, 6.3); c.fill(); c.fillRect(sx - 7 * u, sy + 6 * u, 14 * u, 9 * u);
    c.fillStyle = '#1a1612'; c.beginPath(); c.arc(sx - 4 * u, sy + 1 * u, 3 * u, 0, 6.3); c.arc(sx + 4 * u, sy + 1 * u, 3 * u, 0, 6.3); c.fill(); c.fillRect(sx - 1 * u, sy + 6 * u, 2 * u, 3 * u);
    c.fillStyle = '#efe6c8'; c.fillRect(bx + 70 * u, yB - 40 * u, 7 * u, 40 * u);
  }
  if (HALLOWEEN) { const px = G.pos.books ? G.pos.books - 26 * u : G.bx1 - 60 * u; pumpkin(c, px, yB); }
}
function pumpkin(c, x, yB) {
  for (let i = -2; i <= 2; i++) { c.fillStyle = i % 2 ? '#c85e10' : '#e47a1c'; c.beginPath(); c.ellipse(x + i * 6 * u, yB - 15 * u, 9 * u, 15 * u, 0, 0, 6.3); c.fill(); }
  c.fillStyle = '#4a7a2a'; c.fillRect(x - 2 * u, yB - 34 * u, 4 * u, 6 * u);
  c.fillStyle = '#ffd04a'; c.beginPath(); c.moveTo(x - 12 * u, yB - 20 * u); c.lineTo(x - 6 * u, yB - 24 * u); c.lineTo(x - 4 * u, yB - 18 * u); c.fill();
  c.beginPath(); c.moveTo(x + 12 * u, yB - 20 * u); c.lineTo(x + 6 * u, yB - 24 * u); c.lineTo(x + 4 * u, yB - 18 * u); c.fill();
  c.fillRect(x - 10 * u, yB - 11 * u, 20 * u, 3 * u);
}

/* ---------- éléments animés ---------- */
const gearPaths = new Map();
function gearPath(r, n) {
  const k = r.toFixed(1) + ':' + n; if (gearPaths.has(k)) return gearPaths.get(k);
  const p = new Path2D(), ro = r + r * .16, step = Math.PI * 2 / n;
  for (let i = 0; i < n; i++) { const a = i * step; const pts = [[r, a - step * .28], [ro, a - step * .17], [ro, a + step * .17], [r, a + step * .28]]; pts.forEach(([rad, an], j) => { const x = Math.cos(an) * rad, y = Math.sin(an) * rad; i === 0 && j === 0 ? p.moveTo(x, y) : p.lineTo(x, y); }); }
  p.closePath();
  p.moveTo(r * .32, 0); p.arc(0, 0, r * .32, 0, Math.PI * 2, true);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + .3; p.moveTo(Math.cos(a) * r * .55 + r * .12, Math.sin(a) * r * .55); p.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .55, r * .12, 0, Math.PI * 2, true); }
  gearPaths.set(k, p); return p;
}
function drawGear(x, y, r, n, ang, pal) {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, pal[0]); g.addColorStop(.5, pal[1]); g.addColorStop(1, pal[3]);
  ctx.rotate(ang); ctx.fillStyle = g; ctx.fill(gearPath(r, n), 'evenodd');
  ctx.rotate(-ang); ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.arc(0, 0, r * .14, 0, 6.3); ctx.fill();
  ctx.restore();
}
function drawGauge(gg) {
  let v = gg.v;
  if (gg.link && V[gg.link]) v = .15 + lev(V[gg.link]) * .7;
  if (ev && ev.type === 'surge') v = .95 + Math.sin(t * 40) * .05;
  if (gg.kick) { v = Math.min(1, v + gg.kick); gg.kick *= .9; if (gg.kick < .01) gg.kick = 0; }
  const a = Math.PI * .75 + clamp(v + Math.sin(t * 2.3 + gg.x) * .02, 0, 1) * Math.PI * 1.5;
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.6 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(gg.x, gg.y); ctx.lineTo(gg.x + Math.cos(a) * gg.r * .75, gg.y + Math.sin(a) * gg.r * .75); ctx.stroke();
  ctx.fillStyle = BRASS[2]; ctx.beginPath(); ctx.arc(gg.x, gg.y, 2 * u, 0, 6.3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(gg.x - gg.r * .3, gg.y - gg.r * .35, gg.r * .5, gg.r * .25, -.6, 0, 6.3); ctx.fill();
}
function drawLamps() {
  for (const l of G.lamps) {
    l.vs += -l.swing * .02; l.vs *= .985; l.swing += l.vs;
    if (l.off > 0) l.off -= 1;
    const on = ev && ev.type === 'surge' ? (Math.random() < .5 ? .2 : 1) : (l.off > 0 ? (l.off % 4 < 2 ? .25 : .8) : 1);
    l.k += (on - l.k) * .3;
    const ang = l.swing, sx = l.x + Math.sin(ang) * 30 * u, sy = l.y + (1 - Math.cos(ang)) * 30 * u;
    ctx.strokeStyle = '#0b0b0d'; ctx.lineWidth = 1.5 * u; ctx.beginPath(); ctx.moveTo(l.x, l.y - 10 * u); ctx.lineTo(sx, sy - 6 * u); ctx.stroke();
    // cône de lumière
    if (!lite) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const len = H * .75, g = ctx.createLinearGradient(sx, sy, sx, sy + len); g.addColorStop(0, `rgba(255,200,130,${.10 * l.k})`); g.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - 10 * u, sy + 4 * u); ctx.lineTo(sx + 10 * u, sy + 4 * u); ctx.lineTo(sx + 160 * u + Math.sin(ang) * len * .6, sy + len); ctx.lineTo(sx - 160 * u + Math.sin(ang) * len * .6, sy + len); ctx.closePath(); ctx.fill();
    ctx.restore();
    }
    // abat-jour
    ctx.fillStyle = metal(ctx, sx - 18 * u, 0, sx + 18 * u, 0, BRASS);
    ctx.beginPath(); ctx.moveTo(sx - 5 * u, sy - 8 * u); ctx.lineTo(sx + 5 * u, sy - 8 * u); ctx.lineTo(sx + 18 * u, sy + 4 * u); ctx.lineTo(sx - 18 * u, sy + 4 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,236,190,${.4 + .6 * l.k})`; ctx.beginPath(); ctx.ellipse(sx, sy + 5 * u, 8 * u, 3.5 * u, 0, 0, 6.3); ctx.fill();
    glow(ctx, sx, sy + 6 * u, 60 * u, [255, 196, 120], .45 * l.k);
  }
}
function drawSky(ox, oy) {
  if (!G.win) return;
  const w = G.win;
  ctx.save(); ctx.translate(ox, oy); windowPath(ctx); ctx.clip(); ctx.translate(ox * .6, oy * .6);
  const x0 = w.cx - w.w / 2 - 20 * u, y0 = w.top - 20 * u, ww = w.w + 40 * u, hh = w.bot - w.top + 40 * u;
  const g = ctx.createLinearGradient(0, y0, 0, y0 + hh); g.addColorStop(0, rgba(DAY.top)); g.addColorStop(1, rgba(DAY.bot)); ctx.fillStyle = g; ctx.fillRect(x0, y0, ww, hh);
  if (DAY.id === 'night' || DAY.id === 'dusk') {
    const rs = seeded(3); for (let i = 0; i < 40; i++) { const a = .3 + .7 * Math.abs(Math.sin(t * .8 + i)); ctx.fillStyle = `rgba(255,255,255,${a * .8})`; ctx.fillRect(x0 + rs() * ww, y0 + rs() * hh * .7, 1.3 * u, 1.3 * u); }
    const mx2 = w.cx + w.w * .18, my2 = w.top + w.w * .35;
    glow(ctx, mx2, my2, 60 * u, [244, 236, 204], .35); ctx.fillStyle = '#f4eccc'; ctx.beginPath(); ctx.arc(mx2, my2, 14 * u, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,160,.5)'; ctx.beginPath(); ctx.arc(mx2 - 4 * u, my2 - 3 * u, 3 * u, 0, 6.3); ctx.arc(mx2 + 5 * u, my2 + 4 * u, 2 * u, 0, 6.3); ctx.fill();
  }
  // montagnes et ville
  ctx.fillStyle = 'rgba(10,12,20,.9)'; ctx.beginPath(); ctx.moveTo(x0, w.bot);
  for (let x = x0; x <= x0 + ww; x += 12 * u) ctx.lineTo(x, w.bot - 40 * u - Math.abs(Math.sin(x * .013 / u)) * 50 * u);
  ctx.lineTo(x0 + ww, w.bot + 10); ctx.closePath(); ctx.fill();
  for (const c of clouds) {
    const cx = x0 + c.x * ww, cy = y0 + c.y * hh, s = c.s * 120 * u;
    ctx.globalAlpha = .75; ctx.drawImage(cloudImg, cx - s / 2, cy - s / 4, s, s / 2);
  }
  ctx.globalAlpha = 1;
  if (bolt) { ctx.strokeStyle = '#f2fbff'; ctx.lineWidth = 2 * u; ctx.shadowColor = '#9fd8ff'; ctx.shadowBlur = 16 * u; ctx.beginPath(); bolt.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.shadowBlur = 0; }
  ctx.strokeStyle = 'rgba(190,210,235,.35)'; ctx.lineWidth = 1 * u;
  for (const d of rain) { const x = x0 + d.x * ww, y = y0 + d.y * hh; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3 * u, y + 12 * u); ctx.stroke(); }
  if (flash > .05) { ctx.fillStyle = `rgba(230,240,255,${flash})`; ctx.fillRect(x0, y0, ww, hh); }
  ctx.restore();
}
function drawTank(ox, oy) {
  if (compact) return;
  const T = G.T, v = V.T;
  ctx.save(); ctx.translate(ox, oy);
  drawVessel(v);
  // le spécimen : une sorte de céphalopode endormi, rétroéclairé par le liquide
  const cr = ev && ev.type === 'creature' ? ev : null, wake = cr ? Math.min(1, (t - cr.t0) / 1.5) : 0;
  const sy0 = surfY(v), lc = v.col;
  const cw = T.w * .5, chh = T.w * .62, breathe = 1 + Math.sin(t * 1.1) * .045;
  const bx = T.cx + Math.sin(t * .35) * T.w * .12 + wake * T.w * .12;
  const by = clamp(T.top + (T.bot - T.top) * .45 + Math.sin(t * .6) * 8 * u, sy0 + chh * 1.25, T.bot - chh * 2.4);
  ctx.save(); ctx.beginPath(); ctx.rect(T.cx - T.w, sy0 + 2 * u, T.w * 2, T.bot - sy0); ctx.clip();
  const body = rgba(mixc([6, 18, 14], lc, .12), .92), rim = rgba(lighten(lc, .35), .55);
  // tentacules : rubans effilés qui ondulent
  const tent = (sx, ang, len, w0, ph, reach) => {
    const N = 22, L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const k = i / N, wav = Math.sin(t * 1.6 + ph + k * 4.2) * (10 + 16 * k) * u * (1 - reach * .8);
      let x = sx + Math.sin(ang) * len * k + wav, y = by + Math.cos(ang) * len * k;
      if (reach) { x = sx + (T.cx + T.w - 6 * u - sx) * Math.pow(k, .8) * reach + wav * .3 * (1 - reach) + x * 0; y = by + (len * .45) * k * (1 - reach) + Math.sin(k * 3) * 14 * u * reach; }
      const w = w0 * (1 - k * .92), nx = Math.cos(ang), ny = -Math.sin(ang);
      L.push([x - nx * w, y - ny * w]); R.push([x + nx * w, y + ny * w]);
    }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const q of L) ctx.lineTo(q[0], q[1]); for (const q of R.reverse()) ctx.lineTo(q[0], q[1]); ctx.closePath();
    ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = rgba(lighten(lc, .35), .22); ctx.lineWidth = 1 * u; ctx.stroke();
    // ventouses
    ctx.fillStyle = rgba(lighten(lc, .5), .25);
    for (let i = 3; i < N - 4; i += 3) { const q = R[N - i]; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(.8, w0 * (1 - i / N) * .35), 0, 6.3); ctx.fill(); }
  };
  const nT = 7;
  for (let i = 0; i < nT; i++) {
    const k = i / (nT - 1) - .5, reach = cr && i === nT - 1 ? clamp((t - cr.t0 - 1.2) / 1.2, 0, 1) : 0;
    tent(bx + k * cw * 1.3, k * .55, chh * (2.1 + Math.abs(Math.sin(i * 7.3)) * .5), 5.5 * u, i * 1.3, reach);
  }
  // manteau (la « tête »)
  const mw = cw * breathe, mh = chh * (2 - breathe);
  ctx.beginPath();
  ctx.moveTo(bx - mw * .78, by + 4 * u);
  ctx.bezierCurveTo(bx - mw * 1.02, by - mh * .55, bx - mw * .62, by - mh * 1.25, bx, by - mh * 1.3);
  ctx.bezierCurveTo(bx + mw * .62, by - mh * 1.25, bx + mw * 1.02, by - mh * .55, bx + mw * .78, by + 4 * u);
  for (let i = 4; i >= -4; i--) ctx.quadraticCurveTo(bx + (i + .5) * mw * .19, by + 12 * u, bx + i * mw * .19, by + 4 * u);
  ctx.closePath();
  const mg = ctx.createRadialGradient(bx - mw * .25, by - mh * .9, 2 * u, bx, by - mh * .4, mw * 1.4);
  mg.addColorStop(0, rgba(mixc([30, 60, 48], lc, .25), .95)); mg.addColorStop(.6, body); mg.addColorStop(1, rgba([3, 10, 8], .95));
  ctx.fillStyle = mg; ctx.fill(); ctx.strokeStyle = rim; ctx.lineWidth = 1.5 * u; ctx.stroke();
  // taches bioluminescentes
  for (let i = 0; i < 6; i++) { const a = i * 1.9, r = (.3 + (i % 3) * .18); const x = bx + Math.cos(a) * mw * r * .8, y = by - mh * .7 + Math.sin(a) * mh * r * .4; glow(ctx, x, y, 5 * u, lighten(lc, .3), .25 + Math.sin(t * 2 + i) * .12); }
  // yeux : fermés, ils s'ouvrent parfois… ou quand on le réveille
  const eyeK = cr ? wake : clamp((Math.sin(t * .23) - .93) * 14, 0, 1);
  const ec = HALLOWEEN ? [255, 150, 40] : [210, 255, 140];
  for (const dx of [-.34, .34]) {
    const ex = bx + dx * mw, ey = by - mh * .28, look = (tmx || 0) * 2 * u;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.ellipse(ex, ey, 7 * u, 5 * u, dx * .5, 0, 6.3); ctx.fill();
    if (eyeK > .02) {
      glow(ctx, ex, ey, 18 * u, ec, .7 * eyeK);
      ctx.fillStyle = rgba(ec, eyeK); ctx.beginPath(); ctx.ellipse(ex, ey, 6 * u, 4.5 * u * eyeK, dx * .5, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(5,8,5,.95)'; ctx.beginPath(); ctx.ellipse(ex + look, ey, 1.4 * u, 3.6 * u * eyeK, 0, 0, 6.3); ctx.fill();
    } else { ctx.strokeStyle = rim; ctx.lineWidth = 1.2 * u; ctx.beginPath(); ctx.ellipse(ex, ey - 1 * u, 6 * u, 2.5 * u, dx * .5, .2, Math.PI - .2); ctx.stroke(); }
  }
  // bulles qu'il expire
  if (Math.random() < .03) v.bub.push({ x: bx + rnd(-4, 4) * u, y: by - mh * 1.3, r: rnd(1.5, 3) * u, v: rnd(30, 60) * u });
  ctx.restore();
  ctx.restore();
}
function drawTeslaLive(ox, oy) {
  const T = G.tesla; if (!T) return;
  ctx.save(); ctx.translate(ox, oy);
  glow(ctx, T.cx, T.torY, T.torW * .9, [120, 200, 255], .12 + Math.sin(t * 4) * .03 + (ev && ev.type === 'surge' ? .25 : 0));
  // voyants de l'armoire
  const cy0 = T.base - T.cabH;
  for (let i = 0; i < 4; i++) { const on = Math.sin(t * (2 + i) + i) > 0; ctx.fillStyle = on ? ['#ff5050', '#7dff7a', '#ffc04a', '#6fd8ff'][i] : '#20242c'; ctx.beginPath(); ctx.arc(T.cx - 18 * u + i * 12 * u, cy0 + 29 * u, 3 * u, 0, 6.3); ctx.fill(); if (on) glow(ctx, T.cx - 18 * u + i * 12 * u, cy0 + 29 * u, 8 * u, hex(['#ff5050', '#7dff7a', '#ffc04a', '#6fd8ff'][i]), .4); }
  ctx.restore();
}

/* ---------- arcs électriques ---------- */
function makeArc(x0, y0, x1, y1, life, big) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(4, Math.floor(d / (big ? 22 * u : 8 * u))), j = (big ? 16 : 5) * u, pts = [];
  const nx = -(y1 - y0) / (d || 1), ny = (x1 - x0) / (d || 1);
  for (let i = 0; i <= n; i++) { const k = i / n, o = (i === 0 || i === n) ? 0 : rnd(-j, j) * Math.sin(k * Math.PI); pts.push([x0 + (x1 - x0) * k + nx * o, y0 + (y1 - y0) * k + ny * o]); }
  const br = [];
  if (big) for (let b = 0; b < 2; b++) { const s = pts[1 + Math.floor(Math.random() * (pts.length - 2))], an = Math.atan2(y1 - y0, x1 - x0) + rnd(-1.2, 1.2), ln = rnd(20, 60) * u; br.push([s, [s[0] + Math.cos(an) * ln * .5 + rnd(-6, 6) * u, s[1] + Math.sin(an) * ln * .5 + rnd(-6, 6) * u], [s[0] + Math.cos(an) * ln, s[1] + Math.sin(an) * ln]]); }
  return { a: [x0, y0], b: [x1, y1], pts, br, life, max: life, big };
}
function drawArcs() {
  if (!arcs.length) return;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
  for (const a of arcs) {
    const all = [a.pts, ...a.br], k = a.life / a.max;
    for (const [lw, col] of [[8 * u, `rgba(90,170,255,${.18 * k})`], [3.5 * u, `rgba(150,215,255,${.5 * k})`], [1.4 * u, `rgba(255,255,255,${.95 * k})`]]) {
      ctx.lineWidth = a.big ? lw : lw * .5; ctx.strokeStyle = col;
      for (const pts of all) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
    }
    glow(ctx, a.b[0], a.b[1], (a.big ? 40 : 12) * u, [140, 210, 255], .5 * k);
  }
  ctx.restore();
}
function zap(strong) {
  const T = G.tesla; if (!T) return;
  const targets = [[G.SL + rnd(0, 4) * u, rnd(G.TOP + 40 * u, G.pBot - 40 * u)], [T.cx + rnd(-90, -40) * u, T.torY - rnd(80, 160) * u], [G.SL * .1, T.torY + rnd(-60, 60) * u], [T.cx + rnd(50, 110) * u, T.torY - rnd(40, 120) * u]];
  const n = strong ? 3 : 1;
  for (let i = 0; i < n; i++) { const tg = targets[strong ? i : Math.floor(Math.random() * targets.length)], side = tg[0] > T.cx ? 1 : -1; arcs.push(makeArc(T.cx + side * T.torW * .45, T.torY, tg[0], tg[1], strong ? 14 : 8, true)); }
  if (strong) { if (!CALM) flash = Math.max(flash, .12); for (const l of G.lamps) l.off = Math.floor(rnd(4, 14)); window.dispatchEvent(new CustomEvent('lab:zap')); if (sci && !ev && Math.random() < .5) { sci.jump = .35; sci.bub = { s: '!', t: 1.2 }; } }
  for (let i = 0; i < 12; i++) sparks.push({ x: T.cx + rnd(-T.torW / 2, T.torW / 2), y: T.torY, vx: rnd(-120, 120) * u, vy: rnd(-160, 40) * u, life: rnd(.3, .7) });
  nextZap = t + (CALM ? rnd(25, 40) : rnd(9, 16));
}
function skyBolt() {
  if (!G.win) return;
  const w = G.win, pts = []; let x = w.cx + rnd(-w.w * .3, w.w * .3), y = w.top;
  while (y < w.bot - 30 * u) { pts.push([x, y]); y += rnd(12, 26) * u; x += rnd(-16, 16) * u; }
  bolt = pts; flash = CALM ? .25 : .55;
  setTimeout(() => { bolt = null; }, 160);
  nextBolt = t + rnd(10, 22);
}

/* ---------- le savant (dessiné en vectoriel) ---------- */
function drawScientist() {
  const s = sci, sc = u * (compact ? 1.15 : 1), x = s.x, fy = H - 8 * u;
  const walk = s.mode === 'walk' || s.mode === 'run', ph = s.phase;
  const jump = s.jump > 0 ? Math.sin(s.jump / .35 * Math.PI) * 14 * sc : 0;
  const bob = walk ? Math.abs(Math.sin(ph)) * 2.5 * sc : Math.sin(t * 2) * .8 * sc;
  ctx.save(); ctx.translate(x, fy - jump); ctx.scale(s.dir, 1);
  const soot = s.soot > 0;
  const coatA = soot ? '#7a7c7e' : '#f1f5f7', coatB = soot ? '#4a4c4e' : '#b7c5cd', skin = soot ? '#5a4636' : '#f1c29a', hair = soot ? '#5a5650' : '#f6f6f2';
  // ombre
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 22 * sc, 4 * sc, 0, 0, 6.3); ctx.fill();
  // jambes
  const legA = walk ? Math.sin(ph) * .5 : 0;
  for (const [sgn, sh] of [[1, '#22252e'], [-1, '#2c303b']]) {
    ctx.save(); ctx.translate(sgn * 5 * sc, -46 * sc - bob); ctx.rotate(legA * sgn);
    ctx.fillStyle = sh; rr(ctx, -5 * sc, 0, 10 * sc, 42 * sc, 4 * sc); ctx.fill();
    ctx.fillStyle = '#121317'; ctx.beginPath(); ctx.ellipse(4 * sc, 44 * sc, 9 * sc, 4 * sc, 0, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  ctx.translate(0, -bob);
  // bras arrière
  const armSwing = walk ? Math.sin(ph) * .5 : 0;
  const drawArm = (side, ang, hold) => {
    ctx.save(); ctx.translate(side * 13 * sc, -88 * sc); ctx.rotate(ang);
    ctx.fillStyle = side < 0 ? coatB : coatA; rr(ctx, -5 * sc, 0, 10 * sc, 32 * sc, 5 * sc); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, 34 * sc, 4.5 * sc, 0, 6.3); ctx.fill();
    if (hold === 'flask') { ctx.translate(0, 40 * sc); ctx.rotate(-ang); const fc = V.F ? V.F.col : PAL[2]; ctx.fillStyle = rgba(fc, .85); ctx.beginPath(); ctx.arc(0, 4 * sc, 7 * sc, 0, 6.3); ctx.fill(); ctx.strokeStyle = 'rgba(220,245,255,.8)'; ctx.lineWidth = 1.5 * sc; ctx.stroke(); ctx.fillRect(-2 * sc, -8 * sc, 4 * sc, 8 * sc); }
    if (hold === 'board') { ctx.translate(0, 34 * sc); ctx.rotate(-ang); ctx.fillStyle = '#7a5233'; rr(ctx, -2 * sc, -16 * sc, 18 * sc, 24 * sc, 2 * sc); ctx.fill(); ctx.fillStyle = '#f1ead6'; ctx.fillRect(0, -13 * sc, 14 * sc, 19 * sc); ctx.fillStyle = '#9a907a'; for (let i = 0; i < 4; i++) ctx.fillRect(2 * sc, (-10 + i * 4) * sc, (i === 3 ? 6 : 10) * sc, 1 * sc); }
    if (hold === 'ext') { ctx.translate(0, 36 * sc); ctx.rotate(-ang); ctx.fillStyle = '#c0392b'; rr(ctx, -5 * sc, -4 * sc, 11 * sc, 22 * sc, 4 * sc); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(-2 * sc, -9 * sc, 5 * sc, 6 * sc); }
    ctx.restore();
  };
  let aBack = -armSwing, aFront = armSwing, hold = null;
  if (s.pose === 'reach') { aFront = -2.6; hold = 'flask'; }
  else if (s.pose === 'notes') { aFront = -1.1; hold = 'board'; }
  else if (s.pose === 'spray') { aFront = -1.5; hold = 'ext'; }
  else if (s.pose === 'cheer') { aFront = -2.8; aBack = 2.8; }
  else if (s.pose === 'crouch') { aFront = -.6; }
  drawArm(-1, aBack, null);
  // blouse
  const g = ctx.createLinearGradient(-20 * sc, 0, 20 * sc, 0); g.addColorStop(0, coatB); g.addColorStop(.45, coatA); g.addColorStop(1, coatB);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-16 * sc, -92 * sc); ctx.lineTo(16 * sc, -92 * sc); ctx.lineTo(22 * sc, -36 * sc); ctx.quadraticCurveTo(0, -32 * sc, -22 * sc, -36 * sc); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.2 * sc; ctx.beginPath(); ctx.moveTo(2 * sc, -90 * sc); ctx.lineTo(4 * sc, -36 * sc); ctx.stroke();
  ctx.fillStyle = '#b0303f'; ctx.beginPath(); ctx.moveTo(-4 * sc, -90 * sc); ctx.lineTo(4 * sc, -86 * sc); ctx.lineTo(4 * sc, -90 * sc); ctx.lineTo(-4 * sc, -86 * sc); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d9e2e7'; ctx.fillRect(6 * sc, -70 * sc, 9 * sc, 8 * sc); ctx.fillStyle = '#3f6fd8'; ctx.fillRect(8 * sc, -74 * sc, 1.5 * sc, 6 * sc); ctx.fillStyle = '#d83f5a'; ctx.fillRect(11 * sc, -73 * sc, 1.5 * sc, 5 * sc);
  // tête
  const hy = -106 * sc;
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(3 * sc, hy, 12 * sc, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(14 * sc, hy + 2 * sc, 3.5 * sc, 0, 6.3); ctx.fill();
  // cheveux en bataille
  ctx.fillStyle = hair;
  for (const [hx, hy2, r] of [[-9, -4, 7], [-6, -12, 7], [2, -15, 7], [10, -13, 6], [-12, 4, 6], [-4, -16, 5], [14, -8, 4]]) { ctx.beginPath(); ctx.arc(hx * sc, hy + hy2 * sc, r * sc, 0, 6.3); ctx.fill(); }
  // lunettes de protection sur le front
  ctx.fillStyle = BRASS[1]; ctx.fillRect(-8 * sc, hy - 8 * sc, 22 * sc, 3 * sc);
  for (const ex of [4, 11]) { ctx.fillStyle = BRASS[2]; ctx.beginPath(); ctx.arc(ex * sc, hy - 7 * sc, 4 * sc, 0, 6.3); ctx.fill(); ctx.fillStyle = '#8fefff'; ctx.beginPath(); ctx.arc(ex * sc, hy - 7 * sc, 2.6 * sc, 0, 6.3); ctx.fill(); }
  // œil, moustache, bouche
  const blink = (t % 4) < .12;
  ctx.fillStyle = '#1b1b22'; if (blink) ctx.fillRect(7 * sc, hy + 1 * sc, 4 * sc, 1 * sc); else { ctx.beginPath(); ctx.arc(9 * sc, hy + 1 * sc, 1.8 * sc, 0, 6.3); ctx.fill(); }
  ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(10 * sc, hy + 7 * sc, 7 * sc, 2.5 * sc, -.1, 0, 6.3); ctx.fill();
  drawArm(1, aFront, hold);
  ctx.restore();
  if (s.bub) bubbleAt(x + 12 * sc * s.dir, fy - 150 * sc - jump, s.bub.s);
}
function bubbleAt(x, y, sym) {
  ctx.save();
  const w = Math.max(26, sym.length * 12 + 14) * u, h = 24 * u;
  ctx.fillStyle = 'rgba(245,248,250,.95)'; rr(ctx, x - w / 2, y - h, w, h, 10 * u); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 4 * u, y - 1); ctx.lineTo(x, y + 7 * u); ctx.lineTo(x + 4 * u, y - 1); ctx.fill();
  ctx.fillStyle = sym === 'Eurêka !' ? '#a0401a' : '#14161c'; ctx.font = `700 ${14 * u}px 'IBM Plex Sans', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(sym, x, y - h / 2 + 1);
  ctx.restore();
}
function sciStops() {
  const s = [{ x: G.A.cx - 34 * u, task: 'burner' }, { x: G.E.cx - 30 * u, task: 'watch' }, { x: G.C.x - 30 * u, task: 'notes' }];
  if (G.pos.orrery) s.push({ x: G.pos.orrery + 30 * u, task: 'notes' });
  if (G.pos.micro) s.push({ x: G.pos.micro, task: 'micro' });
  if (G.pos.rack) s.push({ x: G.pos.rack + 30 * u, task: 'notes' });
  return s;
}
function goTo(x, task, mode = 'walk') { sci.target = clamp(x, G.bx0 + 10 * u, G.bx1 - 30 * u); sci.task = task; sci.mode = mode; sci.pose = null; }
function stepSci(dt) {
  const s = sci;
  if (s.bub && (s.bub.t -= dt) <= 0) s.bub = null;
  if (s.jump > 0) s.jump = Math.max(0, s.jump - dt);
  if (s.soot > 0) s.soot -= dt;
  if (s.mode === 'walk' || s.mode === 'run') {
    const sp = (s.mode === 'run' ? 150 : 62) * u, d = s.target - s.x;
    s.dir = d >= 0 ? 1 : -1; s.phase += dt * (s.mode === 'run' ? 14 : 7);
    if (Math.abs(d) <= sp * dt) { s.x = s.target; arrive(); } else s.x += s.dir * sp * dt;
  } else if (s.mode === 'act' || s.mode === 'idle') {
    s.timer -= dt;
    if (s.timer <= 0) {
      if (s.mode === 'act') finishTask();
      else if (!ev) { if (V.F.vol < 1) { goTo(G.F.cx - 34 * u, 'refill'); s.bub = { s: '?', t: 1.4 }; } else { const st = pick(sciStops()); goTo(st.x, st.task); } }
      else s.timer = .5;
    }
  }
}
function arrive() {
  const s = sci, tk = s.task; s.mode = 'act'; s.dir = 1;
  if (tk === 'refill') { s.pose = 'reach'; s.timer = 1.6; }
  else if (tk === 'burner') { s.pose = 'crouch'; s.timer = 1.4; }
  else if (tk === 'notes' || tk === 'watch' || tk === 'micro') { s.pose = 'notes'; s.timer = rnd(2.5, 4.5); }
  else if (tk === 'spray') { s.pose = 'spray'; s.timer = 2.2; }
  else if (tk === 'lever') { s.pose = 'reach'; s.timer = 1; }
  else { s.pose = null; s.mode = 'idle'; s.timer = rnd(1, 3); }
}
function finishTask() {
  const s = sci, tk = s.task; s.pose = null; s.task = null; s.mode = 'idle'; s.timer = rnd(1.5, 4.5);
  if (tk === 'refill') { const others = PAL.filter(p => dist(p, V.F.col) > 120); V.F.col = vivid(accent && Math.random() < .5 ? accent : pick(others)); V.F.vol = V.F.cap; s.bub = { s: '✦', t: 1.2 }; }
  if (tk === 'burner') { V.A.agit = 1; for (let i = 0; i < 8; i++) sparks.push({ x: G.A.cx, y: G.yB - 28 * u, vx: rnd(-50, 50) * u, vy: rnd(-120, -40) * u, life: rnd(.2, .5), col: '#ffb347' }); }
  if (tk === 'micro' && Math.random() < .5) s.bub = { s: pick(['!', '?', '✦']), t: 1.4 };
  if (tk === 'spray' && ev && ev.type === 'overflow') ev.done = true;
  if (tk === 'lever' && ev && ev.type === 'surge') endSurge();
}

/* ---------- réactif ---------- */
function doseReagent(force) {
  const Fv = V.F, E = V.E; if (!force && Fv.vol < 1) return;
  if (!force) Fv.vol = Math.max(0, Fv.vol - 1);
  const col = Fv.col.slice();
  drops.push({ x: 0, y: 0, vy: 0, s: 0, path: G.stem, col, q: 0, dest: E, react: () => { E.col = vivid(mixc(E.col, col, .3)); E.pulse = 1; E.agit = 1; for (let i = 0; i < 6; i++) sparks.push({ x: G.E.cx + rnd(-10, 10) * u, y: surfY(E), vx: rnd(-50, 50) * u, vy: rnd(-90, -30) * u, life: rnd(.3, .6), col: rgba(lighten(col, .5)) }); } });
}
let doseTimer = 1;

/* ---------- incidents rares ---------- */
function startEvent(type) {
  if (ev || compact) return;
  ev = { type, t0: t };
  if (type === 'surge') { dimT = .25; sci.bub = { s: '?!', t: 1.5 }; setTimeout(() => { if (ev && ev.type === 'surge') goTo(G.tesla.cx + G.tesla.cabW / 2 + 6 * u, 'lever', 'run'); }, 1200); }
  if (type === 'overflow') { sci.bub = { s: '!', t: 1.2 }; sci.jump = .35; setTimeout(() => { if (ev && ev.type === 'overflow') goTo(G.E.cx - 70 * u, 'spray', 'run'); }, 900); }
  if (type === 'creature') { dimT = .35; sci.bub = { s: '?!', t: 2 }; goTo(G.T.x0 - 120 * u, 'notes'); }
  window.dispatchEvent(new CustomEvent('lab:event', { detail: { type, phase: 'start' } }));
}
function endSurge() { dimT = 0; ev = null; nextEvent = t + rnd(70, 140); for (const l of G.lamps) l.off = 8; sci.bub = { s: '✓', t: 1.2 }; window.dispatchEvent(new CustomEvent('lab:event', { detail: { type: 'surge', phase: 'end' } })); }
function stepEvent(dt) {
  if (!ev) {
    if (MOTION === 'full' && !compact && t > nextEvent) { const r = Math.random(); startEvent(r < .35 ? 'surge' : r < .7 ? 'overflow' : 'creature'); nextEvent = t + rnd(80, 150); }
    return;
  }
  const e = t - ev.t0;
  if (ev.type === 'surge') {
    if (Math.random() < 6 * dt) { const T = G.tesla, tg = pick([[G.SL, rnd(G.TOP, G.pBot)], [rnd(0, G.SL), rnd(0, G.TOP)], [G.T.x0, rnd(G.T.top, G.T.bot)], [rnd(G.bx0, G.bx1), G.pBot + rnd(10, 60) * u]]); arcs.push(makeArc(T.cx, T.torY, tg[0], tg[1], 10, true)); }
    if (Math.random() < 3 * dt) flash = Math.max(flash, CALM ? .05 : .15);
    if (e > 15) endSurge();
  } else if (ev.type === 'overflow') {
    const E = V.E;
    if (!ev.done) {
      E.agit = 1; E.pulse = .6;
      if (Math.random() < 30 * dt) foam.push({ x: G.E.cx + rnd(-6, 6) * u, y: G.E.neck, vx: rnd(-40, 40) * u, vy: rnd(-60, -10) * u, r: rnd(4, 9) * u, life: rnd(1.5, 3), col: Math.random() < .5 ? E.col.slice() : [240, 250, 255] });
      if (Math.random() < 10 * dt) puffs.push({ x: G.E.cx + rnd(-8, 8) * u, y: G.E.neck - 10 * u, vx: rnd(-20, 20) * u, vy: rnd(-40, -20) * u, s: rnd(30, 50) * u, gs: 40 * u, life: 0, max: rnd(2, 4), a: .5, col: [120, 125, 130] });
      if (e > 12) ev.done = true;
    } else if (e > 2) { ev = null; nextEvent = t + rnd(70, 140); sci.bub = { s: 'Ouf', t: 1.4 }; window.dispatchEvent(new CustomEvent('lab:event', { detail: { type: 'overflow', phase: 'end' } })); }
  } else if (ev.type === 'creature') {
    if (e > 2 && e < 2.1 && !ev.knock) { ev.knock = true; shake = .4; V.T.agit = 1; for (let i = 0; i < 30; i++) V.T.bub.push({ x: rnd(G.T.cx - G.T.w * .8, G.T.cx + G.T.w * .8), y: G.T.bot - rnd(0, 200) * u, r: rnd(2, 5) * u, v: rnd(60, 140) * u }); }
    if (e > 3 && e < 3.1 && !ev.knock2) { ev.knock2 = true; shake = .4; }
    if (e > 8) { ev = null; dimT = 0; nextEvent = t + rnd(80, 150); window.dispatchEvent(new CustomEvent('lab:event', { detail: { type: 'creature', phase: 'end' } })); }
  }
}
let shake = 0;

/* ---------- simulation ---------- */
function simulate(dt, warm) {
  for (const L of links) stepLink(L, dt);
  stepDrops(dt);
  const vapOn = G.vap.on;
  if (!warm) {
    stepBubbles(V.A, vapOn ? .9 : .15, dt); stepBubbles(V.D, .04, dt); stepBubbles(V.E, .15 + V.E.agit, dt);
    if (V.K) stepBubbles(V.K, .7, dt); stepBubbles(V.T, compact ? .1 : .5, dt); stepBubbles(V.F, .01, dt);
    if (G.rack) for (const r of G.rack) stepBubbles(r, .05, dt);
  }
  doseTimer -= dt; if (doseTimer <= 0) { doseTimer = rnd(2, 3.2); if (V.E.vol > 6) doseReagent(false); }
}
function totalVolume() { let s = 0; for (const k in V) if (k !== 'F' && !V[k].deco) s += V[k].vol; for (const L of links) for (const sl of L.slugs) s += Math.max(0, Math.min(L.pipe.len, sl.b) - Math.max(0, sl.a)) * L.q; for (const d of drops) s += d.q; s += G.vap ? G.vap.pend : 0; return s; }

/* ---------- dessin ---------- */
function layer(L, ox, oy) { ctx.drawImage(L.c, -L.M + ox, -L.M + oy, W + 2 * L.M, H + 2 * L.M); }
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const sk = shake > 0 ? (Math.random() - .5) * 8 * u * shake : 0;
  ctx.translate(sk, 0);
  const P = 14 * u, oxF = mx * P * .35, oyF = my * P * .2, oxM = mx * P * .7, oyM = my * P * .35, oxB = mx * P * .1, oxG = -mx * P * 1.1;
  ctx.fillStyle = '#07080b'; ctx.fillRect(-20, -20, W + 40, H + 40);
  drawSky(oxF, oyF);
  layer(layers.far, oxF, oyF);
  // halo de la fenêtre au sol
  if (G.win && flash > .05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(200,220,255,${flash * .35})`; ctx.beginPath(); ctx.moveTo(G.win.cx - G.win.w / 2, G.win.bot); ctx.lineTo(G.win.cx + G.win.w / 2, G.win.bot); ctx.lineTo(G.win.cx + G.win.w * 1.4, H); ctx.lineTo(G.win.cx - G.win.w * .6, H); ctx.closePath(); ctx.fill(); ctx.restore(); }
  if (G.door) { const d = G.door; glow(ctx, d.x + d.w / 2 + oxF, d.bot + oyF, 40 * u, [255, 106, 213], .18 + Math.sin(t * 2) * .06 + (doorHov ? .3 : 0)); }
  // plan intermédiaire
  layer(layers.mid, oxM, oyM);
  ctx.save(); ctx.translate(oxM, oyM);
  for (const gg of G.gears) drawGear(gg.x, gg.y, gg.r, gg.n, (gg.ph || 0) + t * gg.sp * gearDir, gg.pal);
  for (const gg of G.gauges) drawGauge(gg);
  drawLamps();
  ctx.restore();
  drawTeslaLive(oxM, oyM);
  drawTank(oxM, oyM);
  layer(layers.midOver, oxM, oyM);
  ctx.save(); ctx.translate(oxM, oyM); drawArcs(); ctx.restore();
  // paillasse
  ctx.save(); ctx.translate(oxB, 0);
  layer(layers.bench, 0, 0);
  for (const L of links) drawLinkLiquid(L);
  drawBenchLive();
  for (const id of ['A', 'D', 'E', 'F', 'K']) if (V[id]) drawVessel(V[id]);
  if (compact) drawVessel(V.T);
  if (G.rack) for (const r of G.rack) drawVessel(r);
  for (const d of drops) { ctx.fillStyle = rgba(lighten(d.col, .2), .95); ctx.beginPath(); ctx.arc(d.x, d.y, 2.4 * u, 0, 6.3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(d.x - .7 * u, d.y - .8 * u, .8 * u, 0, 6.3); ctx.fill(); }
  layer(layers.shine, 0, 0);
  for (const f of foam) { ctx.fillStyle = rgba(f.col, .85 * Math.min(1, f.life)); ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill(); }
  ctx.restore();
  // vapeur, fumée
  for (const p of puffs) { const k = p.life / p.max; ctx.globalAlpha = p.a * (1 - k) * Math.min(1, p.life * 4); const s = p.s + p.gs * k; ctx.drawImage(puffImg, p.x - s / 2, p.y - s / 2, s, s); }
  ctx.globalAlpha = 1;
  drawScientist();
  // étincelles et poussière
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of sparks) { ctx.fillStyle = s.col || 'rgba(200,235,255,.95)'; ctx.fillRect(s.x, s.y, 2 * u, 2 * u); }
  if (!lite) for (const d of dust) { ctx.fillStyle = `rgba(255,225,180,${d.a})`; ctx.fillRect(d.x, d.y, 1.4 * u, 1.4 * u); }
  ctx.restore();
  layer(layers.fg, oxG, 0);
  if (dim > .01) { ctx.fillStyle = `rgba(2,4,10,${dim})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
  if (flash > .01) { ctx.fillStyle = `rgba(225,240,255,${flash * .35})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
}
function drawBenchLive() {
  const yB = G.yB, A = G.A;
  // flamme du brûleur
  const fh = (V.A.agit > .3 ? 26 : 18) * u + Math.sin(t * 20) * 2 * u;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(A.cx, yB - 26 * u - fh * .3, 1, A.cx, yB - 26 * u - fh * .3, fh);
  g.addColorStop(0, 'rgba(140,200,255,.9)'); g.addColorStop(.4, 'rgba(80,140,255,.5)'); g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(A.cx - 5 * u, yB - 26 * u); ctx.quadraticCurveTo(A.cx - 6 * u, yB - 26 * u - fh * .6, A.cx, yB - 26 * u - fh); ctx.quadraticCurveTo(A.cx + 6 * u, yB - 26 * u - fh * .6, A.cx + 5 * u, yB - 26 * u); ctx.fill();
  ctx.restore();
  glow(ctx, A.cx, yB - 36 * u, 40 * u, [255, 160, 80], .3);
  // reflets colorés sur le plateau
  for (const id of ['A', 'D', 'E', 'K']) { const v = V[id]; if (!v || v.vol < 2) continue; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const cx = (v.x0 + v.x1) / 2, w = (v.x1 - v.x0) * .8; const rg = ctx.createRadialGradient(cx, yB + 2 * u, 1, cx, yB + 2 * u, w); rg.addColorStop(0, rgba(v.col, .28)); rg.addColorStop(1, rgba(v.col, 0)); ctx.fillStyle = rg; ctx.fillRect(cx - w, yB - 4 * u, w * 2, 14 * u); ctx.restore(); }
  // pompe : engrenages et voyant
  const P = G.pump.x, on = G.pumpL.on, a = on ? t * 3 : 0;
  drawGear(P - 8 * u, yB - 58 * u, 22 * u, 11, a, BRASS); drawGear(P + 22 * u, yB - 80 * u, 13 * u, 7, -a * 22 / 13 + .2, COPPER);
  ctx.fillStyle = on ? '#7dff7a' : '#ff5050'; ctx.beginPath(); ctx.arc(P + 15 * u, yB - 6 * u, 2.5 * u, 0, 6.3); ctx.fill(); glow(ctx, P + 15 * u, yB - 6 * u, 8 * u, on ? [125, 255, 122] : [255, 80, 80], .4);
  if (on) { ctx.save(); ctx.translate(P, yB - 17 * u); ctx.rotate(t * 6); ctx.strokeStyle = rgba(V.D.col, .8); ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(-7 * u, 0); ctx.lineTo(7 * u, 0); ctx.moveTo(0, -7 * u); ctx.lineTo(0, 7 * u); ctx.stroke(); ctx.restore(); }
  // condenseur : eau de refroidissement
  const C = G.C; ctx.save(); rr(ctx, C.x - 13 * u, C.jTop + 1 * u, 26 * u, C.jBot - C.jTop - 2 * u, 9 * u); ctx.clip();
  ctx.fillStyle = 'rgba(70,150,255,.10)'; ctx.fillRect(C.x - 14 * u, C.jTop, 28 * u, C.jBot - C.jTop);
  ctx.strokeStyle = 'rgba(170,215,255,.35)'; ctx.lineWidth = 1 * u;
  for (let i = 0; i < 4; i++) { const y = C.jBot - ((t * 30 * u + i * 16 * u) % (C.jBot - C.jTop)); ctx.beginPath(); ctx.arc(C.x + 9 * u, y, 1.5 * u, 0, 6.3); ctx.stroke(); }
  ctx.restore();
  // planétaire (clin d'œil astronomique)
  if (G.pos.orrery) {
    const ox = G.pos.orrery + 60 * u, oy = yB - 76 * u;
    ctx.strokeStyle = 'rgba(212,168,73,.55)'; ctx.lineWidth = 1.2 * u;
    const orbits = [[22, 9, 1.6, '#c9d2dc', 3], [34, 13, 1, '#45a0ff', 4.2], [48, 18, .6, '#ff7a4a', 3.6], [60, 22, .35, '#e8c27a', 5.5]];
    for (const [rx, ry] of orbits) { ctx.beginPath(); ctx.ellipse(ox, oy, rx * u, ry * u, -.15, 0, 6.3); ctx.stroke(); }
    const bodies = orbits.map(([rx, ry, sp, col, r], i) => { const a2 = t * sp * orrerySpin + i * 1.7; return { x: ox + Math.cos(a2) * rx * u * Math.cos(-.15) - Math.sin(a2) * ry * u * Math.sin(-.15), y: oy + Math.cos(a2) * rx * u * Math.sin(-.15) + Math.sin(a2) * ry * u * Math.cos(-.15), col, r, back: Math.sin(a2) < 0 }; });
    for (const b of bodies.filter(b => b.back)) planet(b);
    glow(ctx, ox, oy, 40 * u, [255, 200, 90], .55); ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(ox, oy, 8 * u, 0, 6.3); ctx.fill();
    for (const b of bodies.filter(b => !b.back)) planet(b);
  }
  // microscope : lumière sous la platine
  if (G.pos.micro) { const mx0 = G.pos.micro + 16 * u; glow(ctx, mx0 + 14 * u, yB - 30 * u, 18 * u, [255, 240, 200], .4 + Math.sin(t * 3) * .05); ctx.fillStyle = rgba(PAL[4], .9); ctx.fillRect(mx0 + 8 * u, yB - 37 * u, 12 * u, 3 * u); }
  // chandelle
  if (G.pos.books) { const cx = G.pos.books + 73.5 * u, cy = yB - 44 * u, fl = Math.sin(t * 13) * 1.2 * u; ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(cx + fl * .3, cy, 2.5 * u, 6 * u + fl, 0, 0, 6.3); ctx.fill(); glow(ctx, cx, cy, 34 * u, [255, 190, 90], .45); }
}
function planet(b) { ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * u, 0, 6.3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(b.x - b.r * .3 * u, b.y - b.r * .3 * u, b.r * .35 * u, 0, 6.3); ctx.fill(); }

/* ---------- mise à jour ---------- */
function update(dt) {
  simulate(dt, false);
  mx += (tmx - mx) * Math.min(1, dt * 3); my += (tmy - my) * Math.min(1, dt * 3);
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * u * dt; if ((s.life -= dt) <= 0) sparks.splice(i, 1); }
  for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.x += p.vx * dt; p.y += p.vy * dt; if ((p.life += dt) > p.max) puffs.splice(i, 1); }
  for (let i = foam.length - 1; i >= 0; i--) { const f = foam[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 160 * u * dt; f.vx *= .98; if (f.y > G.yB - f.r) { f.y = G.yB - f.r; f.vy = 0; f.vx *= .9; } if ((f.life -= dt) <= 0) foam.splice(i, 1); }
  for (const d of dust) { d.x += d.vx * dt * u; d.y += d.vy * dt * u; if (d.x < 0) d.x = W; if (d.x > W) d.x = 0; if (d.y < 0) d.y = H; if (d.y > H) d.y = 0; }
  for (const d of rain) { d.y += d.v * dt * 1.4; d.x -= d.v * dt * .2; if (d.y > 1) { d.y = 0; d.x = rnd(0, 1.2); } }
  for (const c of clouds) { c.x -= c.v * dt * 4; if (c.x < -.3) c.x = 1.3; }
  // vapeurs permanentes
  if (Math.random() < (CALM ? 2 : 4) * dt) { const C = G.C; puffs.push({ x: C.x + rnd(-6, 6) * u, y: C.jTop - 12 * u, vx: rnd(-6, 6) * u, vy: rnd(-26, -14) * u, s: 14 * u, gs: 36 * u, life: 0, max: rnd(1.6, 2.6), a: .18, col: [255, 255, 255] }); }
  if (!compact && Math.random() < 2 * dt) { const T = G.T; puffs.push({ x: T.cx + rnd(-20, 20) * u, y: T.top - 36 * u, vx: rnd(-6, 6) * u, vy: rnd(-24, -12) * u, s: 18 * u, gs: 40 * u, life: 0, max: rnd(2, 3), a: .14 }); }
  for (let i = arcs.length - 1; i >= 0; i--) { const a = arcs[i]; if (--a.life <= 0) arcs.splice(i, 1); else if (a.big && a.life % 2 === 0) { const n = makeArc(a.a[0], a.a[1], a.b[0], a.b[1], a.life, true); n.max = a.max; arcs[i] = n; } }
  if (G.tesla && Math.random() < (CALM ? .6 : 2.2) * dt) { const T = G.tesla, an = rnd(0, Math.PI * 2), sx = T.cx + Math.cos(an) * T.torW * .5, sy = T.torY + Math.sin(an) * T.torH * .5; arcs.push(makeArc(sx, sy, sx + Math.cos(an) * rnd(20, 50) * u, sy + Math.sin(an) * rnd(14, 40) * u - 10 * u, 4, false)); }
  if (G.tesla && t > nextZap && !ev) zap(true);
  if (G.win && t > nextBolt) skyBolt();
  flash *= Math.pow(.02, dt); if (flash < .005) flash = 0;
  dim += (dimT - dim) * Math.min(1, dt * 3);
  shake = Math.max(0, shake - dt);
  stepSci(dt); stepEvent(dt);
}

/* ---------- boucle ---------- */
function loop(now) {
  requestAnimationFrame(loop);
  if (document.hidden || STATIC || (window.LAB && window.LAB.paused)) { last = now; return; }
  const minStep = CALM ? 1000 / 30 : 1000 / 60;
  if (last && now - last < minStep - 1) return;
  const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now; t += dt;
  const t0 = performance.now();
  update(dt); draw();
  frameAvg = frameAvg * .95 + (performance.now() - t0) * .05;
  // garde-fou de performance : si l'image coûte trop cher, on baisse la définition
  if (frameAvg > 22 && quality > 1) { quality = 1; frameAvg = 12; layout(); }
  else if (frameAvg > 30 && !lite) { lite = true; frameAvg = 16; }
}

/* ---------- interactions ---------- */
let doorHov = false;
function inBox(x, y, b) { return x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]; }
function hit(x, y) {
  if (G.door && inBox(x, y, [G.door.x, G.door.top, G.door.x + G.door.w, G.door.bot])) return 'door';
  if (G.tesla) { const T = G.tesla; if (inBox(x, y, [T.cx - T.torW / 2, T.torY - T.torH, T.cx + T.torW / 2, H])) return 'tesla'; }
  if (!compact && inBox(x, y, [G.T.cx - G.T.w, G.T.top - 34 * u, G.T.cx + G.T.w, G.T.bot])) return 'tank';
  if (G.win && inBox(x, y, [G.win.cx - G.win.w / 2, G.win.top, G.win.cx + G.win.w / 2, G.win.bot])) return 'window';
  for (const id of ['A', 'D', 'E', 'F', 'K']) { const v = V[id]; if (v && inBox(x, y, [v.x0, v.y0, v.x1, v.y1])) return 'v:' + id; }
  if (compact && inBox(x, y, [V.T.x0, V.T.y0, V.T.x1, V.T.y1])) return 'v:T';
  if (G.pos.orrery && inBox(x, y, [G.pos.orrery, G.yB - 110 * u, G.pos.orrery + 120 * u, G.yB])) return 'orrery';
  for (const gg of G.gauges) if (Math.hypot(x - gg.x, y - gg.y) < gg.r + 4 * u) return 'gauge';
  for (const gg of G.gears) if (Math.hypot(x - gg.x, y - gg.y) < gg.r * 1.1) return 'gear';
  for (const l of G.lamps) if (Math.abs(x - l.x) < 22 * u && Math.abs(y - l.y) < 16 * u) return 'lamp';
  if (Math.abs(x - sci.x) < 22 * u && y > H - 160 * u) return 'sci';
  return null;
}
cvs.addEventListener('pointermove', e => {
  tmx = (e.clientX / W - .5) * 2; tmy = (e.clientY / H - .5) * 2;
  const h = hit(e.clientX, e.clientY); doorHov = h === 'door'; cvs.style.cursor = h ? 'pointer' : 'default';
});
window.addEventListener('pointermove', e => { tmx = (e.clientX / W - .5) * 2; tmy = (e.clientY / H - .5) * 2; }, { passive: true });
cvs.addEventListener('click', e => {
  const h = hit(e.clientX, e.clientY); if (!h) return;
  if (h === 'door') { window.dispatchEvent(new CustomEvent('lab:door')); return; }
  if (h === 'tesla') { zap(true); const now = performance.now(); clicks = clicks.filter(c => now - c < 1500); clicks.push(now); if (clicks.length >= 3) { clicks = []; startEvent('surge'); } }
  else if (h === 'tank') startEvent('creature');
  else if (h === 'window') skyBolt();
  else if (h.startsWith('v:')) { const v = V[h.slice(2)]; v.agit = 1; v.pulse = 1; for (let i = 0; i < 10; i++) v.bub.push({ x: rnd(v.x0 + 4 * u, v.x1 - 4 * u), y: v.y1 - rnd(2, 20) * u, r: rnd(1.5, 3.5) * u, v: rnd(40, 90) * u }); if (h === 'v:F' || h === 'v:E') doseReagent(true); }
  else if (h === 'orrery') orrerySpin = 6;
  else if (h === 'gauge') { for (const gg of G.gauges) if (Math.hypot(e.clientX - gg.x, e.clientY - gg.y) < gg.r + 4 * u) { gg.kick = .6; for (let i = 0; i < 6; i++) puffs.push({ x: gg.x + gg.r, y: gg.y, vx: rnd(30, 70) * u, vy: rnd(-30, -10) * u, s: 10 * u, gs: 40 * u, life: 0, max: rnd(.8, 1.4), a: .35 }); } }
  else if (h === 'gear') gearDir = -gearDir;
  else if (h === 'lamp') { for (const l of G.lamps) if (Math.abs(e.clientX - l.x) < 22 * u) l.vs += .03; }
  else if (h === 'sci') { sci.jump = .35; sci.bub = { s: pick(['?', '!', '♥', '✦']), t: 1.2 }; }
  if (STATIC) draw();
});
let typed = '';
window.addEventListener('keydown', e => {
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  if (e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-6); if (typed.endsWith('igor')) { typed = ''; startEvent('creature'); }
});
setInterval(() => { orrerySpin += (1 - orrerySpin) * .2; }, 200);
let rz = 0;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 160); });

window.LabScene = {
  zap: () => { zap(true); if (STATIC) draw(); },
  creature: () => startEvent('creature'),
  event: type => startEvent(type === 'blackout' ? 'surge' : type === 'runaway' ? 'overflow' : type),
  setAccent: col => {
    const c = vivid(hex(col)), first = accent === null; accent = c; if (first) return;
    V.F.col = c; V.F.vol = Math.max(V.F.vol, 6);
    if (STATIC) { V.E.col = vivid(mixc(V.E.col, c, .5)); draw(); return; }
    for (let i = 0; i < 3; i++) setTimeout(() => doseReagent(true), i * 240);
  },
  debug: () => ({ slugs: links.map(l => l.slugs.length).join(','), total: +totalVolume().toFixed(2), levels: Object.fromEntries(Object.entries(V).filter(([, v]) => !v.deco).map(([k, v]) => [k, +lev(v).toFixed(2)])), on: Object.fromEntries(links.map(l => [l.id, l.on])), frame: +frameAvg.toFixed(1), dpr: DPR }),
  get halloween() { return HALLOWEEN; }
};

layout();
draw();
requestAnimationFrame(loop);
})();
