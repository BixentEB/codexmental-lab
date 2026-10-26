/* ==========================================================================
   CODEX MENTAL · LAB — la salle d'expérience
   Une pièce entière, sans texte : on clique, on observe, on découvre.
   Monde fixe de 400 × 225 pixels, agrandi sans lissage.
   ========================================================================== */
(() => {
'use strict';

const W0 = 400, H0 = 225, FLOOR = 192, FEET = 207;
const LAB = window.LAB || {};
const HALLOWEEN = !!LAB.halloween;
const CALM = LAB.motion !== 'full';
const FPS = CALM ? 15 : 30;

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
const K = {
  cu: '#b8692f', cuHi: '#e39a55', cuLo: '#6e3a18', brass: '#c9993a', brassHi: '#f1cd6a', brassLo: '#7a5a1c',
  iron: '#353a45', ironHi: '#565e6e', ironLo: '#1f2229', steel: '#8e99a8', silver: '#c9d2dc',
  wood: '#5f3a20', woodHi: '#83532f', woodLo: '#361f10', glassL: '#a9dceb', glassD: '#4d7886'
};

let cvs, x, back, bx, raf = 0, running = false, last = 0, tick = 0, t = 0;
let mouse = { x: 200, y: 110, in: false }, hover = null;

/* ---------- primitives ---------- */
function R(c, X, Y, W, H, col) { c.fillStyle = col; c.fillRect(F(X), F(Y), W, H); }
function P(c, X, Y, col) { c.fillStyle = col; c.fillRect(F(X), F(Y), 1, 1); }
function linePts(x0, y0, x1, y1) {
  x0 = F(x0); y0 = F(y0); x1 = F(x1); y1 = F(y1);
  const out = [], dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let e = dx + dy, n = 0;
  for (;;) { out.push([x0, y0]); if ((x0 === x1 && y0 === y1) || ++n > 2000) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
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

/* ---------- symboles des bulles (pas de texte) ---------- */
const GLYPH = {
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'], '+': ['.##', '.#.', '.#.', '##.', '##.'],
  h: ['#.#', '###', '###', '.#.', '...'], z: ['###', '..#', '.#.', '#..', '###'], '*': ['...', '#.#', '.#.', '#.#', '...'], ' ': ['...', '...', '...', '...', '...'],
  e: ['###', '#..', '##.', '#..', '###'], u: ['#.#', '#.#', '#.#', '#.#', '###'], r: ['##.', '#.#', '##.', '#.#', '#.#'], k: ['#.#', '#.#', '##.', '#.#', '#.#'], a: ['.#.', '#.#', '###', '#.#', '#.#'], g: ['.##', '#..', '#.#', '#.#', '.##']
};
function text3(c, s, X, Y, col) { [...s].forEach((ch, i) => (GLYPH[ch] || GLYPH[' ']).forEach((r, yy) => [...r].forEach((p, xx) => { if (p === '#') P(c, X + i * 4 + xx, Y + yy, col); }))); }
function bubble(c, s, cx, by, col) {
  const wd = s.length * 4 + 3, X = F(cx - wd / 2), Y = by - 9;
  R(c, X, Y + 1, wd, 7, '#0a0c10'); R(c, X + 1, Y, wd - 2, 9, '#0a0c10'); R(c, X + 1, Y + 1, wd - 2, 7, '#f1f4f2');
  P(c, cx, Y + 9, '#0a0c10'); P(c, cx, Y + 8, '#f1f4f2'); text3(c, s, X + 2, Y + 2, col || '#14161c');
}

/* ---------- moment de la journée (heure réelle) ---------- */
function daypart() {
  const hr = new Date().getHours();
  if (hr >= 21 || hr < 6) return { id: 'night', top: [8, 10, 26], bot: [22, 28, 52], cloud: [30, 34, 54], amb: 0 };
  if (hr < 8) return { id: 'dawn', top: [40, 36, 70], bot: [190, 110, 90], cloud: [70, 60, 86], amb: .04 };
  if (hr < 18) return { id: 'day', top: [70, 86, 110], bot: [140, 156, 170], cloud: [96, 104, 118], amb: .08 };
  return { id: 'dusk', top: [36, 24, 60], bot: [200, 90, 70], cloud: [70, 46, 76], amb: .03 };
}
let DAY = daypart();

/* ---------- sons (désactivés par défaut) ---------- */
const SND = { ctx: null, on: false, master: null, amb: [], radio: null };
function audio() {
  if (SND.ctx) return SND.ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  SND.ctx = new AC(); SND.master = SND.ctx.createGain(); SND.master.gain.value = .9; SND.master.connect(SND.ctx.destination);
  return SND.ctx;
}
function noiseBuf(sec) { const a = SND.ctx, b = a.createBuffer(1, a.sampleRate * sec, a.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } return b; }
function setSound(on) {
  const a = audio(); if (!a) return;
  SND.on = on; if (a.state === 'suspended') a.resume();
  SND.amb.forEach(n => { try { n.stop(); } catch (e) { /* déjà arrêté */ } }); SND.amb = [];
  if (on) {
    const src = a.createBufferSource(); src.buffer = noiseBuf(3); src.loop = true;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    const g = a.createGain(); g.gain.value = .05; src.connect(lp).connect(g).connect(SND.master); src.start();
    const hum = a.createOscillator(); hum.frequency.value = 55; const hg = a.createGain(); hg.gain.value = .018; hum.connect(hg).connect(SND.master); hum.start();
    SND.amb.push(src, hum);
  } else stopRadio();
  window.dispatchEvent(new CustomEvent('salle:sound', { detail: on }));
}
function env(node, g0, g1, dur) { const a = SND.ctx, g = a.createGain(); g.gain.setValueAtTime(g0, a.currentTime); g.gain.exponentialRampToValueAtTime(Math.max(.0001, g1), a.currentTime + dur); node.connect(g).connect(SND.master); return g; }
function sfx(kind) {
  if (!SND.on || !SND.ctx) return;
  const a = SND.ctx, now = a.currentTime;
  if (kind === 'thunder') {
    const s = a.createBufferSource(); s.buffer = noiseBuf(2.5); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, now); lp.frequency.exponentialRampToValueAtTime(120, now + 2.2);
    s.connect(lp); env(lp, .5, .001, 2.4); s.start(); s.stop(now + 2.5);
  } else if (kind === 'zap') {
    const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, now); o.frequency.exponentialRampToValueAtTime(1400, now + .5);
    env(o, .09, .001, .6); o.start(); o.stop(now + .6);
  } else if (kind === 'blip' || kind === 'pour') {
    const o = a.createOscillator(); o.type = kind === 'pour' ? 'sine' : 'square'; o.frequency.setValueAtTime(kind === 'pour' ? 500 : 880, now); o.frequency.exponentialRampToValueAtTime(kind === 'pour' ? 260 : 1300, now + .12);
    env(o, .06, .001, .15); o.start(); o.stop(now + .16);
  } else if (kind === 'meow') {
    const o = a.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(620, now); o.frequency.linearRampToValueAtTime(820, now + .12); o.frequency.linearRampToValueAtTime(480, now + .45);
    env(o, .08, .001, .5); o.start(); o.stop(now + .5);
  } else if (kind === 'boom') {
    const s = a.createBufferSource(); s.buffer = noiseBuf(1); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; s.connect(lp); env(lp, .6, .001, .9); s.start(); s.stop(now + 1);
  } else if (kind === 'chime') {
    [523, 659, 784, 1047].forEach((f, i) => { const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = a.createGain(); g.gain.setValueAtTime(0, now + i * .09); g.gain.linearRampToValueAtTime(.07, now + i * .09 + .01); g.gain.exponentialRampToValueAtTime(.001, now + i * .09 + .5); o.connect(g).connect(SND.master); o.start(now + i * .09); o.stop(now + i * .09 + .55); });
  } else if (kind === 'grr') {
    const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, now); o.frequency.linearRampToValueAtTime(55, now + .6);
    const lfo = a.createOscillator(); lfo.frequency.value = 18; const lg = a.createGain(); lg.gain.value = 12; lfo.connect(lg).connect(o.frequency); lfo.start(); lfo.stop(now + .7);
    env(o, .12, .001, .7); o.start(); o.stop(now + .7);
  }
}
// petite mélodie originale de la radio (la mineur, ambiance laboratoire)
const TUNE = [[57, 1], [60, 1], [64, 1], [69, 2], [67, 1], [64, 1], [62, 2], [60, 1], [62, 1], [64, 2], [57, 2], [55, 1], [57, 1], [60, 1], [64, 2], [62, 1], [60, 1], [59, 2], [57, 4]];
const BASS = [45, 45, 41, 41, 43, 43, 40, 40];
function startRadio() {
  const a = audio(); if (!a) return;
  if (!SND.on) setSound(true);
  stopRadio();
  const g = a.createGain(); g.gain.value = .05; g.connect(SND.master);
  const beat = .2; let tNext = a.currentTime + .05, i = 0, bi = 0, acc = 0;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const step = () => {
    while (tNext < a.currentTime + .3) {
      const [n, d] = TUNE[i % TUNE.length];
      const o = a.createOscillator(); o.type = 'square'; o.frequency.value = midi(n + 12);
      const eg = a.createGain(); eg.gain.setValueAtTime(.0001, tNext); eg.gain.linearRampToValueAtTime(1, tNext + .01); eg.gain.exponentialRampToValueAtTime(.05, tNext + d * beat * .9);
      o.connect(eg).connect(g); o.start(tNext); o.stop(tNext + d * beat);
      if (acc % 2 === 0) { const b = a.createOscillator(); b.type = 'triangle'; b.frequency.value = midi(BASS[bi % BASS.length]); const bg = a.createGain(); bg.gain.setValueAtTime(1.6, tNext); bg.gain.exponentialRampToValueAtTime(.01, tNext + beat * 1.8); b.connect(bg).connect(g); b.start(tNext); b.stop(tNext + beat * 2); bi++; }
      tNext += d * beat; acc += d; i++;
    }
  };
  step(); SND.radio = { g, id: setInterval(step, 100) };
}
function stopRadio() { if (SND.radio) { clearInterval(SND.radio.id); try { SND.radio.g.disconnect(); } catch (e) { /* rien */ } SND.radio = null; } }

/* ---------- sprites ---------- */
const SCI_PAL = { h: '#f3f3ef', H: '#b9bdc6', s: '#f1c29a', S: '#c98f68', g: '#c9993a', G: '#8fefff', e: '#1b1b22', m: '#7a3328', c: '#e7eef1', C: '#a7b6bf', b: '#6f7f88', t: '#b0303f', p: '#2b2e39', k: '#121317', w: '#7a5233', n: '#efe8d4' };
const SOOT_PAL = Object.assign({}, SCI_PAL, { h: '#55524d', H: '#3a3936', s: '#5a4636', S: '#3e2f24', c: '#6d6f70', C: '#4a4c4d' });
const HEAD = ['....h.hhh.h...', '..hhhhhhhhhh..', '.hhhhhhhhhhhh.', 'hhhggGGggGGgh.', 'hHhsssssssssh.', 'hHhsssesssess.', '.hhsssssssssS.', '.hhssHHHHHssS.', '..hhSssmssSS..', '....SSssSS....'];
const COAT = ['...cccttccc...', '..ccccbbcccc..', '.cccccbbccccC.', '.ccCccbbccccC.', '.ccCccbbcccCC.', '.ccCcccccccCC.', '.sCCccbbcccCs.', '..cccccccccC..', '..cccccbbccC..', '..ccccccccCC..'];
const NOTES = ['...cccttccc...', '..ccccbbcccc..', '.cccccbbccccC.', '.ccCccbbwwwwww', '.ccCccbbwnnnnw', '.ccCcccswnnnnw', '.sCCccbbwnnnnw', '..cccccccwwwww', '..cccccbbccC..', '..ccccccccCC..'];
const CHEER = ['s..cccttccc..s', 's.ccccbbcccc.s', '.scccccbbccccs', '..cCccbbccccC.', '..cCccbbcccCC.', '..cCcccccccCC.', '..CCccbbcccC..', '..cccccccccC..', '..cccccbbccC..', '..ccccccccCC..'];
const LEGS = { stand: ['...pppp.ppp...', '...ppp..ppp...', '...ppp..ppp...', '..kkkk..kkkk..'], a: ['...pppp.ppp...', '..ppp....ppp..', '.ppp......ppp.', 'kkkk......kkkk'], b: ['...ppppppp....', '....ppppp.....', '....pppp......', '...kkkkkk.....'] };
function sciSet(pal) {
  return { stand: pair([...HEAD, ...COAT, ...LEGS.stand], pal), walkA: pair([...HEAD, ...COAT, ...LEGS.a], pal), walkB: pair([...HEAD, ...COAT, ...LEGS.b], pal), notes: pair([...HEAD, ...NOTES, ...LEGS.stand], pal), cheer: pair([...HEAD, ...CHEER, ...LEGS.stand], pal) };
}
const SCI = sciSet(SCI_PAL), SOOT = sciSet(SOOT_PAL);
const Z_PAL = { k: '#15131b', z: '#86c45a', Z: '#5a8f3c', x: '#2c3a22', e: '#e8ff6a', n: '#a3acb6', j: '#3b3352', J: '#2a2440', p: '#2b2f3a' };
const ZTOP = ['..kkkkkkkk....', '.kkkkkkkkkk...', '.kzxxxxxxzk...', '..zzezzezz....', '..zzzzzzzz....', '..zZzmmzZz....', 'n..zzzzzz..n..', '...jjjjjjj....', '..jjjjjjjjjzz.', '.zjjjjjjjjJzz.', '.zjjjjjjjJj...', '..jjjjjjJj....', '..jjjjjjJj....'];
const CRE = {
  stand: pair([...ZTOP, '...ppp..ppp...', '...ppp..ppp...', '...ppp..ppp...', '...ppp..ppp...', '..kkkk..kkkk..'], Z_PAL),
  walk: pair([...ZTOP, '...ppp...ppp..', '..ppp....ppp..', '..ppp.....ppp.', '.ppp......ppp.', 'kkkk......kkkk'], Z_PAL)
};
const CAT_PAL = { k: '#1d1a24', K: '#4a4458', e: '#ffd23a', p: '#ff8fb0' };
const CAT = {
  sleep: bake(['..k.k.......', '.kkkkk..kkk.', 'kkKkkkkkkkkk', 'kkkkkkkkkkKk', '.kkkkkkkkkk.'], CAT_PAL),
  sit: bake(['.k...k....', '.kk.kk....', '.kkkkk....', '.keke k...', '.kkpkk....', '..kkk.....', '.kkkkk..k.', 'kkkkkkk.k.', 'kkKkkkkkk.', '.kk.kk....'].map(r => r.replace(' ', 'k')), CAT_PAL)
};

/* ---------- état de la scène ---------- */
let SKY = [], clouds = [], rain = [], parts = [], smoke = [], arcs = [], notes = [], bats = [], sparks = [];
let flash = 0, bolt = null, nextBolt = 6, lightK = 0;
let found = {};
const SECRETS = ['lever', 'creature', 'colors', 'cat', 'radio', 'eye', 'tank'];
try { found = JSON.parse(localStorage.getItem('lab.salle.secrets') || '{}') || {}; } catch (e) { found = {}; }
let starPulse = {};
function unlock(id) {
  if (found[id]) return;
  found[id] = true; starPulse[id] = 40; sfx('chime');
  try { localStorage.setItem('lab.salle.secrets', JSON.stringify(found)); } catch (e) { /* pas de stockage */ }
  if (SECRETS.every(s => found[s])) setTimeout(() => { sci.bub = { s: 'eureka', t: 80 }; sci.mode = 'cheer'; sci.timer = 80; for (let i = 0; i < 60; i++) parts.push({ x: rnd(0, W0), y: rnd(-20, 0), vx: rnd(-.3, .3), vy: rnd(.4, 1.2), life: ri(80, 160), col: pick(['#ff6ad5', '#6ff3ff', '#9dff5c', '#ffb347', '#b48cff']) }); }, 600);
}

const tank = { level: .88, bub: [], wake: 0, eyes: 0, wave: 0 };
const jars = [];
const eye = { x: 92, y: 80, blink: 0, spin: 0 };
const cat = { state: 'sleep', timer: 0, x: 118, y: 54 };
const radio = { on: false };
const lever = { a: 0, target: 0, charge: 0, pulls: [] };
const lamp = { ang: 0, vel: 0 };
const bottles = [
  { x: 341, col: '#ff3b4a', id: 'r', lift: 0 },
  { x: 359, col: '#3b7bff', id: 'b', lift: 0 },
  { x: 377, col: '#ffd23a', id: 'y', lift: 0 }
];
const beaker = { mix: [], col: null, level: 0, effect: null, timer: 0, bub: [] };
let held = null;           // flacon sélectionné
let pour = null;           // animation de versement
const creature = { stage: 'lie', twitch: 0, x: 0, t0: 0, say: null };
const scope = { mode: 0 };
let sci = null;

/* ---------- décor fixe ---------- */
const WIN1 = { x0: 170, x1: 230, y0: 18, y1: 108, cx: 200, ay: 48 };
const WIN2 = { cx: 366, cy: 46, r: 17 };
function inWin1(X, Y) { if (X < WIN1.x0 || X >= WIN1.x1 || Y >= WIN1.y1) return false; if (Y >= WIN1.ay) return Y >= WIN1.y0; return (X - WIN1.cx + .5) ** 2 + (Y - WIN1.ay) ** 2 <= 30 * 30; }
function inWin2(X, Y) { return (X - WIN2.cx + .5) ** 2 + (Y - WIN2.cy + .5) ** 2 <= WIN2.r * WIN2.r; }
function buildBack() {
  back = document.createElement('canvas'); back.width = W0; back.height = H0; bx = back.getContext('2d');
  const c = bx, r = seeded(31);
  // mur de briques ardoise (joints peints d'abord)
  R(c, 0, 0, W0, FLOOR, '#11141c');
  for (let row = 0; row * 6 < FLOOR; row++) {
    const off = row % 2 ? 8 : 0;
    for (let col = -1; col * 16 < W0 + 16; col++) {
      const X = col * 16 + off, Y = row * 6, v = r();
      const base = v < .1 ? '#171b26' : v < .55 ? '#1c2130' : v < .9 ? '#212738' : '#272e42';
      R(c, X, Y, 15, 5, base); R(c, X, Y, 15, 1, '#2b3246');
      if (v > .96) R(c, X + 3, Y + 2, 3, 1, '#12151d');
    }
  }
  // trous des fenêtres
  const img = c.getImageData(0, 0, W0, H0);
  for (let Y = 0; Y < H0; Y++) for (let X = 0; X < W0; X++) if (inWin1(X, Y) || inWin2(X, Y)) img.data[(Y * W0 + X) * 4 + 3] = 0;
  c.putImageData(img, 0, 0);
  // encadrement de la grande fenêtre
  const fr = '#3a2f28', frHi = '#5a4838';
  for (let Y = WIN1.y0 - 2; Y < WIN1.y1 + 3; Y++) for (let X = WIN1.x0 - 3; X < WIN1.x1 + 3; X++) {
    if (inWin1(X, Y)) continue;
    let near = false; for (let d = 1; d <= 2 && !near; d++) near = inWin1(X - d, Y) || inWin1(X + d, Y) || inWin1(X, Y + d) || inWin1(X, Y - d);
    if (near) P(c, X, Y, Y < WIN1.ay + 5 && X < WIN1.cx ? frHi : fr);
  }
  R(c, WIN1.cx, WIN1.y0 - 1, 1, WIN1.y1 - WIN1.y0 + 1, fr); R(c, WIN1.x0, 72, 60, 1, fr); R(c, WIN1.x0, 90, 60, 1, fr); R(c, WIN1.x0, WIN1.ay, 60, 1, fr);
  R(c, WIN1.x0 - 4, WIN1.y1, 68, 3, '#4a3b30'); R(c, WIN1.x0 - 4, WIN1.y1, 68, 1, '#6a5544');
  // hublot rond
  for (let a = 0; a < 140; a++) { const an = a / 140 * Math.PI * 2; for (const rr of [WIN2.r, WIN2.r + 1, WIN2.r + 2]) P(c, WIN2.cx + Math.cos(an) * rr, WIN2.cy + Math.sin(an) * rr, rr === WIN2.r + 1 ? K.brass : K.brassLo); }
  R(c, WIN2.cx - WIN2.r, WIN2.cy, WIN2.r * 2, 1, K.brassLo); R(c, WIN2.cx, WIN2.cy - WIN2.r, 1, WIN2.r * 2, K.brassLo);
  // tuyauterie murale
  const pipeV = (X, y0, y1, hi, mid, lo) => { R(c, X, y0, 1, y1 - y0, hi); R(c, X + 1, y0, 2, y1 - y0, mid); R(c, X + 3, y0, 1, y1 - y0, lo); };
  const pipeH = (Y, x0, x1, hi, mid, lo) => { R(c, x0, Y, x1 - x0, 1, hi); R(c, x0, Y + 1, x1 - x0, 2, mid); R(c, x0, Y + 3, x1 - x0, 1, lo); };
  pipeH(4, 0, W0, K.cuHi, K.cu, K.cuLo); pipeH(11, 60, 165, '#6d7686', K.iron, K.ironLo); pipeH(11, 236, 340, '#6d7686', K.iron, K.ironLo);
  pipeV(64, 8, FLOOR, K.cuHi, K.cu, K.cuLo); pipeV(148, 11, 118, '#6d7686', K.iron, K.ironLo); pipeV(250, 11, 140, K.cuHi, K.cu, K.cuLo); pipeV(332, 8, FLOOR, '#6d7686', K.iron, K.ironLo);
  for (const [X, Y] of [[64, 40], [64, 120], [148, 60], [250, 70], [332, 100], [100, 4], [300, 4]]) { R(c, X - 1, Y, 6, 3, K.brass); R(c, X - 1, Y, 6, 1, K.brassHi); }
  // manomètres
  for (const [X, Y] of [[156, 30], [258, 90]]) { disc(c, X, Y, 5, K.brass); disc(c, X, Y, 4, '#d8d2bc'); P(c, X, Y - 3, '#b0303f'); }
  // paratonnerre au plafond, au-dessus de la bobine
  R(c, 199, 0, 3, 9, K.brassLo); R(c, 200, 0, 1, 9, K.brassHi); disc(c, 200, 10, 2, K.brass);

  // cuve géante : couvercle, socle, tuyaux
  R(c, 10, 50, 48, 8, K.iron); R(c, 10, 50, 48, 1, K.ironHi); R(c, 12, 57, 44, 2, K.brass);
  for (let i = 0; i < 4; i++) R(c, 16 + i * 11, 51, 3, 3, K.brassHi);
  R(c, 22, 0, 4, 50, K.ironLo); R(c, 23, 0, 1, 50, K.ironHi); R(c, 42, 14, 3, 36, K.cuLo); R(c, 42, 14, 1, 36, K.cuHi);
  R(c, 8, 182, 52, 10, K.brass); R(c, 8, 182, 52, 1, K.brassHi); R(c, 8, 190, 52, 2, K.brassLo);
  for (let i = 0; i < 5; i++) P(c, 12 + i * 10, 186, (i % 2) ? '#7dff7a' : '#ff5050');

  // étagères murales
  for (const Y of [62, 100]) { R(c, 70, Y, 76, 2, K.woodHi); R(c, 70, Y + 2, 76, 1, K.woodLo); for (const X of [74, 138]) { R(c, X, Y + 3, 2, 4, K.ironHi); } }
  // livres sur l'étagère du haut
  const bk = ['#7a2b2b', '#2b4a7a', '#3d6b2f', '#6b4a8a', '#8a6a2a'];
  for (let i = 0; i < 5; i++) { const hh = 10 + (i * 3) % 4; R(c, 72 + i * 3, 62 - hh, 3, hh, bk[i]); P(c, 72 + i * 3, 64 - hh, K.brassHi); }
  // crâne sur l'étagère du bas
  disc(c, 132, 94, 3, '#e8e2cc'); R(c, 130, 96, 5, 3, '#e8e2cc'); P(c, 131, 94, '#1a1a1a'); P(c, 133, 94, '#1a1a1a');

  // bureau + radio + console (supports)
  R(c, 70, 150, 76, 3, K.woodHi); R(c, 70, 153, 76, 1, K.woodLo); R(c, 72, 154, 3, FLOOR - 154, K.woodLo); R(c, 141, 154, 3, FLOOR - 154, K.woodLo);
  R(c, 110, 156, 30, 22, K.wood); R(c, 110, 156, 30, 1, K.woodHi); R(c, 110, 166, 30, 1, K.woodLo); P(c, 124, 161, K.brassHi); P(c, 124, 172, K.brassHi);
  // radio rétro (bois arrondi)
  R(c, 76, 132, 26, 18, '#6b3f22'); R(c, 77, 131, 24, 1, '#8f5a33'); R(c, 76, 132, 1, 18, '#8f5a33');
  R(c, 79, 135, 12, 11, '#2a1a10'); for (let yy = 136; yy < 146; yy += 2) R(c, 80, yy, 10, 1, '#4a3020');
  disc(c, 96, 143, 2, K.brass);
  // console
  R(c, 106, 124, 36, 26, K.iron); R(c, 106, 124, 36, 1, K.ironHi); R(c, 106, 124, 1, 26, K.ironHi); R(c, 141, 125, 1, 25, K.ironLo);
  R(c, 110, 127, 26, 13, '#03140f');
  for (let i = 0; i < 6; i++) disc(c, 112 + i * 5, 145, 1, i % 2 ? K.brass : K.steel);

  // levier mural
  R(c, 152, 120, 14, 30, K.ironLo); R(c, 153, 121, 12, 28, K.iron); R(c, 153, 121, 12, 1, K.ironHi);
  R(c, 157, 126, 4, 18, '#0d0f13');
  poly(c, [[159, 150], [159, 172], [186, 176]], '#b33a2a'); poly(c, [[161, 150], [161, 170], [186, 172]], '#c88a2a');

  // bobine Tesla (statique)
  const cx = 200;
  R(c, 184, 180, 32, 12, K.iron); R(c, 184, 180, 32, 1, K.brassHi); R(c, 184, 181, 32, 1, K.brass); R(c, 184, 180, 1, 12, K.ironHi); R(c, 215, 180, 1, 12, K.ironLo);
  for (let i = 0; i < 6; i++) R(c, 188, 174 + i, 24, 1, i % 2 ? K.cuLo : K.cuHi);
  for (let Y = 130; Y < 174; Y++) { R(c, cx - 4, Y, 9, 1, Y % 2 ? K.cu : K.cuLo); P(c, cx - 4, Y, K.cuHi); }
  const sr = 14, ramp = ['#22262e', '#363c47', '#545d6b', '#7c8796', '#a9b4c2', '#d6dee8', '#f6f9fc'];
  for (let yy = -sr; yy <= sr; yy++) for (let xx = -sr; xx <= sr; xx++) {
    const d2 = xx * xx + yy * yy; if (d2 > sr * sr + sr * .4) continue;
    const nz = Math.sqrt(Math.max(0, 1 - d2 / (sr * sr))), li = clamp(-.45 * xx / sr - .55 * yy / sr + .7 * nz, 0, 1) * .8 + .04 + ((xx + yy) % 2 ? .03 : -.03);
    P(c, cx + xx, 118 + yy, ramp[clamp(F(li * ramp.length), 0, ramp.length - 1)]);
  }

  // table d'opération et électrodes
  R(c, 262, 170, 62, 3, K.steel); R(c, 262, 170, 62, 1, K.silver); R(c, 262, 173, 62, 1, K.ironLo);
  for (const X of [266, 316]) { R(c, X, 174, 3, FLOOR - 174, K.ironHi); R(c, X - 2, FLOOR - 2, 7, 2, K.iron); }
  R(c, 268, 182, 50, 1, K.iron);
  for (const X of [254, 330]) { R(c, X, 146, 2, FLOOR - 146, K.brassLo); R(c, X, 146, 1, FLOOR - 146, K.brass); disc(c, X + 1, 144, 2, K.brassHi); }
  // lampe chirurgicale : câble
  R(c, 292, 0, 1, 34, '#101215');

  // établi de mélange + étagère à réactifs
  R(c, 336, 160, 62, 3, K.woodHi); R(c, 336, 163, 62, 1, K.woodLo); R(c, 338, 164, 3, FLOOR - 164, K.woodLo); R(c, 393, 164, 3, FLOOR - 164, K.woodLo);
  R(c, 336, 122, 60, 2, K.woodHi); R(c, 336, 124, 60, 1, K.woodLo); R(c, 340, 125, 2, 4, K.ironHi); R(c, 390, 125, 2, 4, K.ironHi);
  // trépied + brûleur sous le bécher
  line(c, 358, 159, 360, 152, K.ironHi); line(c, 374, 159, 372, 152, K.ironHi); R(c, 359, 152, 15, 1, K.steel);

  // sol en planches
  R(c, 0, FLOOR, W0, H0 - FLOOR, '#2a1d14');
  for (let Y = FLOOR; Y < H0; Y += 5) { R(c, 0, Y, W0, 1, '#1a120c'); for (let X = (Y / 5 % 2) * 20; X < W0; X += 40) R(c, X, Y + 1, 1, 4, '#1a120c'); }
  R(c, 0, FLOOR, W0, 1, '#3d2a1c');
  const g = c.createLinearGradient(0, FLOOR, 0, H0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = g; c.fillRect(0, FLOOR, W0, H0 - FLOOR);
  // bocaux de l'étagère (positions)
  jars.length = 0;
  const jc = ['#3dff8a', '#b06bff', '#ff9a2e', '#45e6ff', '#ff5fc8'];
  [[100, 62, 8, 12], [110, 62, 6, 9], [84, 100, 7, 10], [102, 100, 9, 12], [118, 100, 6, 8]].forEach(([X, Y, ww, hh], i) => jars.push({ x: X, y: Y - hh, w: ww, h: hh, col: hex(jc[i]), lvl: .5 + r() * .4, wob: 0, bub: [] }));
}

/* ---------- ciel, pluie, éclairs ---------- */
function initSky() {
  clouds = [];
  for (let i = 0; i < 9; i++) clouds.push({ x: rnd(150, 400), y: rnd(14, 70), r: ri(5, 11), v: rnd(.03, .1) });
  rain = [];
  for (let i = 0; i < 70; i++) rain.push({ x: rnd(140, 400), y: rnd(0, 120), v: rnd(2.5, 4) });
}
function drawSky(dx) {
  const D = DAY;
  for (let Y = 0; Y < 112; Y++) { const k = Y / 112; x.fillStyle = css(D.top.map((v, i) => v + (D.bot[i] - v) * k)); x.fillRect(160, Y, 80, 1); x.fillRect(346, Y, 42, 1); }
  // ville lointaine
  for (let X = 160; X < 240; X += 6) { const hh = 6 + ((X * 7) % 13); R(x, X + dx, 108 - hh, 5, hh, '#0b0d14'); if ((X * 3) % 5 === 0) P(x, X + 2 + dx, 108 - hh + 3, (tick >> 5) % 3 ? '#ffd27a' : '#0b0d14'); }
  // lune (nuit)
  if (D.id === 'night' || D.id === 'dusk') { disc(x, 214 + dx * 1.5, 34, 5, '#f4eccc'); disc(x, 216 + dx * 1.5, 32, 5, css(D.top)); glow(x, 214 + dx, 34, 14, [244, 236, 204], .15); }
  for (const cl of clouds) { const cc = cl.x + dx * 2; disc(x, cc, cl.y, cl.r, css(D.cloud)); disc(x, cc + cl.r * .8, cl.y + 2, F(cl.r * .7), css(dark(D.cloud, .15))); }
  if (bolt && bolt.sky) { poly(x, bolt.pts, '#f0ffff'); glow(x, bolt.pts[bolt.pts.length - 1][0], 60, 40, [200, 230, 255], .4); }
  x.fillStyle = 'rgba(170,200,230,.45)';
  for (const d of rain) { x.fillRect(F(d.x + dx), F(d.y), 1, 2); }
  if (HALLOWEEN) for (const b of bats) { const up = (tick >> 2) % 2; R(x, b.x + dx, b.y, 3, 2, '#120e18'); R(x, b.x - 2 + dx, b.y + (up ? -1 : 1), 2, 1, '#120e18'); R(x, b.x + 3 + dx, b.y + (up ? -1 : 1), 2, 1, '#120e18'); }
  if (lightK > 0) { x.fillStyle = `rgba(230,240,255,${lightK * .8})`; x.fillRect(160, 0, 80, 112); x.fillRect(346, 26, 42, 42); }
}
function stepSky() {
  for (const cl of clouds) { cl.x -= cl.v; if (cl.x < 140) { cl.x = 410; cl.y = rnd(14, 70); } }
  for (const d of rain) { d.y += d.v; d.x -= d.v * .3; if (d.y > 112) { d.y = rnd(-10, 0); d.x = rnd(160, 420); } }
  if (t > nextBolt) skyBolt();
  if (bolt && --bolt.life <= 0) bolt = null;
  lightK *= .82; if (lightK < .01) lightK = 0;
  if (HALLOWEEN && Math.random() < .01 && bats.length < 3) bats.push({ x: 236, y: rnd(20, 60), v: rnd(.6, 1.1) });
  for (let i = bats.length - 1; i >= 0; i--) { bats[i].x -= bats[i].v; bats[i].y += Math.sin(t * 5 + i) * .4; if (bats[i].x < 150) bats.splice(i, 1); }
}
function skyBolt() {
  const pts = []; let X = rnd(176, 224), Y = 0;
  while (Y < 100) { pts.push([X, Y]); Y += ri(5, 10); X += rnd(-6, 6); X = clamp(X, 172, 228); }
  bolt = { pts, life: 4, sky: true }; lightK = CALM ? .3 : .7;
  if (!CALM) flash = Math.max(flash, .08);
  nextBolt = t + rnd(9, 20);
  setTimeout(() => sfx('thunder'), 300 + Math.random() * 900);
  if (sci && Math.random() < .3 && !creature.busy) { sci.jump = 6; sci.bub = { s: '!', t: 20 }; }
}

/* ---------- arcs électriques ---------- */
function makeArc(x0, y0, x1, y1, life, big) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(3, F(d / (big ? 7 : 3))), j = big ? 5 : 2, pts = [];
  const nx = -(y1 - y0) / (d || 1), ny = (x1 - x0) / (d || 1);
  for (let i = 0; i <= n; i++) { const k = i / n, o = (i === 0 || i === n) ? 0 : rnd(-j, j); pts.push([x0 + (x1 - x0) * k + nx * o, y0 + (y1 - y0) * k + ny * o]); }
  return { a: [x0, y0], b: [x1, y1], pts, life, big };
}
function drawArc(a) {
  x.fillStyle = 'rgba(120,230,255,.3)';
  for (let i = 1; i < a.pts.length; i++) for (const [p, q] of linePts(a.pts[i - 1][0], a.pts[i - 1][1], a.pts[i][0], a.pts[i][1])) { x.fillRect(p - 1, q, 1, 1); x.fillRect(p + 1, q, 1, 1); }
  poly(x, a.pts, '#f0ffff');
  glow(x, a.b[0], a.b[1], a.big ? 12 : 4, [120, 230, 255], a.big ? .4 : .2);
}

/* ---------- le levier : éclair dans la bobine ---------- */
function pullLever() {
  if (lever.target === 1) return;
  lever.target = 1; lever.charge = 0; sfx('zap'); unlock('lever');
  const now = t; lever.pulls = lever.pulls.filter(p => now - p < 25); lever.pulls.push(now);
  setTimeout(() => {
    // l'éclair traverse le toit jusqu'à la sphère
    const pts = []; let X = 200, Y = 0;
    while (Y < 104) { pts.push([X, Y]); Y += ri(6, 11); X = 200 + rnd(-9, 9); }
    pts.push([200, 104]);
    bolt = { pts, life: 7, sky: false }; lightK = 1; flash = CALM ? .15 : .45; sfx('thunder');
    for (let i = 0; i < 18; i++) sparks.push({ x: 200 + rnd(-10, 10), y: 106, vx: rnd(-1.8, 1.8), vy: rnd(-2, .2), life: ri(8, 16) });
    // la bobine décharge vers la table
    setTimeout(() => {
      for (let k = 0; k < 6; k++) setTimeout(() => { arcs.push(makeArc(212, 116, 255, 145, 3, true)); arcs.push(makeArc(255, 145, 331, 145, 3, true)); }, k * 140);
      if (creature.stage === 'lie') {
        const wake = HALLOWEEN || lever.pulls.length >= 2;
        if (wake) setTimeout(wakeCreature, 900); else { creature.twitch = 40; sci.bub = { s: '?', t: 40 }; }
      }
    }, 400);
    if (sci && !creature.busy) { sci.jump = 8; sci.bub = { s: '!', t: 30 }; }
  }, 700);
  setTimeout(() => { lever.target = 0; }, 2600);
}
function wakeCreature() {
  creature.stage = 'sit'; creature.t0 = t; creature.busy = true;
  sci.target = 238; sci.mode = 'walk'; sci.task = 'watch';
}
function stepCreature() {
  const c = creature, e = t - c.t0;
  if (c.twitch > 0) c.twitch--;
  if (c.say && --c.say.t <= 0) c.say = null;
  if (c.stage === 'sit' && e > 1.4) { c.stage = 'stand'; c.x = 300; c.t0 = t; c.say = { s: 'grr', t: 40 }; sfx('grr'); sci.bub = { s: 'eureka', t: 50 }; sci.mode = 'cheer'; sci.timer = 50; unlock('creature'); }
  else if (c.stage === 'stand' && e > 2.2) {
    if (radio.on) { c.stage = 'dance'; c.t0 = t; }
    else { c.stage = 'walk'; c.t0 = t; sci.bub = { s: '?!', t: 30 }; setTimeout(() => { sci.target = W0 + 30; sci.mode = 'run'; sci.task = 'chase'; }, 500); }
  } else if (c.stage === 'walk') { c.x += CALM ? 1.4 : .7; if (c.x > W0 + 20) { c.stage = 'away'; c.t0 = t; } }
  else if (c.stage === 'dance') { if (e > 8 || !radio.on) { c.stage = 'back'; c.dir = -1; } }
  else if (c.stage === 'away' && e > 7) { c.stage = 'back'; c.x = -20; c.dir = 1; }
  else if (c.stage === 'back') {
    const tgt = 268, d = tgt - c.x;
    if (Math.abs(d) < 1.2) { c.stage = 'lie'; c.busy = false; c.say = null; }
    else c.x += Math.sign(d) * (CALM ? 1.2 : .6);
  }
}
function drawCreature() {
  const c = creature;
  if (c.stage === 'lie') {
    const tw = c.twitch > 0 && (tick >> 1) % 2 ? 1 : 0;
    R(x, 268, 163, 50, 7, '#e9e6dc'); R(x, 268, 163, 50, 1, '#ffffff'); R(x, 312, 161 - tw, 6, 3, '#e9e6dc');
    R(x, 268, 169, 50, 1, '#b9b4a6');
    R(x, 262, 162, 7, 7, '#86c45a'); R(x, 262, 161, 7, 2, '#15131b'); P(x, 263, 165, '#2c3a22'); P(x, 261, 166, '#a3acb6');
    if (c.twitch > 0) { R(x, 290, 170, 2, 5 + tw, '#86c45a'); }
    if (!c.twitch && (tick >> 5) % 6 === 0) text3(x, 'z', 264, 152 - ((tick >> 3) % 4), 'rgba(200,220,255,.7)');
    return;
  }
  if (c.stage === 'sit') {
    R(x, 278, 163, 40, 7, '#e9e6dc');
    R(x, 266, 150, 9, 14, '#3b3352'); R(x, 266, 142, 9, 8, '#86c45a'); R(x, 266, 141, 9, 2, '#15131b'); P(x, 268, 145, '#e8ff6a'); P(x, 272, 145, '#e8ff6a');
    glow(x, 270, 146, 8, [140, 255, 120], .4);
    return;
  }
  R(x, 268, 163, 50, 7, '#e9e6dc');
  if (c.stage === 'away') return;
  const walking = c.stage === 'walk' || c.stage === 'back', dir = c.stage === 'back' ? (c.dir || 1) : 1;
  const set = walking && (tick >> 2) % 2 ? CRE.walk : CRE.stand, img = set[dir > 0 ? 0 : 1];
  const bob = c.stage === 'dance' ? Math.round(Math.abs(Math.sin(t * 6)) * -2) : 0;
  x.drawImage(img, F(c.x), FEET - img.height + bob);
  if (c.stage === 'dance' && (tick >> 3) % 2) { P(x, c.x + 1, FEET - 11, '#86c45a'); P(x, c.x + 12, FEET - 11, '#86c45a'); }
  if (c.say) bubble(x, c.say.s, F(c.x + 6), FEET - img.height - 1, '#2f6b1a');
}

/* ---------- la station de mélange ---------- */
const MIX = { r: [255, 59, 74], b: [59, 123, 255], y: [255, 210, 58], rb: [176, 80, 255], by: [60, 230, 110], ry: [255, 140, 30], rby: [110, 80, 50] };
function mixKey(m) { return ['r', 'b', 'y'].filter(k => m.includes(k)).join(''); }
function pourInto(b) {
  if (beaker.effect) return;
  pour = { b, t: 0 }; b.lift = 1; sfx('pour');
}
function stepPour() {
  if (!pour) return;
  pour.t++;
  if (pour.t === 14) {
    const id = pour.b.id; if (!beaker.mix.includes(id)) beaker.mix.push(id);
    beaker.level = Math.min(.9, beaker.level + .3);
    const k = mixKey(beaker.mix); beaker.col = MIX[k];
    if (beaker.mix.length >= 2) {
      const eff = k === 'rby' ? 'boom' : k;
      beaker.effect = eff; beaker.timer = eff === 'boom' ? 10 : 90;
      if (eff !== 'boom') { const made = JSON.parse(safeGet('lab.salle.mix') || '[]'); if (!made.includes(k)) { made.push(k); safeSet('lab.salle.mix', JSON.stringify(made)); } if (['rb', 'by', 'ry'].every(z => made.includes(z))) unlock('colors'); }
    }
  }
  if (pour.t > 26) { pour.b.lift = 0; pour = null; }
}
function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* rien */ } }
function stepBeaker() {
  const b = beaker;
  if (b.level > 0 && Math.random() < (b.effect ? .6 : .1)) b.bub.push({ x: rnd(359, 372), y: 158, v: rnd(.3, .8) });
  for (let i = b.bub.length - 1; i >= 0; i--) { b.bub[i].y -= b.bub[i].v; if (b.bub[i].y < 158 - b.level * 18) b.bub.splice(i, 1); }
  if (!b.effect) return;
  b.timer--;
  const top = 158 - b.level * 18;
  if (b.effect === 'rb' && tick % 2 === 0) parts.push({ x: rnd(359, 373), y: top, vx: rnd(-.3, .3), vy: rnd(-.9, -.4), life: ri(20, 40), col: pick(['#e0a8ff', '#ffffff', '#b06bff']), float: true });
  if (b.effect === 'by' && tick % 3 === 0) parts.push({ x: rnd(360, 372), y: top, vx: rnd(-.2, .2), vy: rnd(-.5, -.2), life: ri(30, 50), col: '#9dffb0', bubble: true });
  if (b.effect === 'ry' && tick % 2 === 0) parts.push({ x: rnd(361, 371), y: top - 1, vx: rnd(-.2, .2), vy: rnd(-.8, -.4), life: ri(8, 16), col: pick(['#ffb347', '#fff0a0', '#ff6a1a']), fire: true });
  if (b.effect === 'boom' && b.timer === 9) {
    sfx('boom'); flash = CALM ? .2 : .5;
    for (let i = 0; i < 50; i++) smoke.push({ x: 366 + rnd(-4, 4), y: top, vx: rnd(-1.2, 1.2), vy: rnd(-1.2, -.2), life: 0, max: ri(40, 90) });
    for (let i = 0; i < 20; i++) sparks.push({ x: 366, y: top, vx: rnd(-2, 2), vy: rnd(-2.4, 0), life: ri(8, 16), col: pick(['#ffb347', '#fff', '#8a6a3a']) });
    if (sci && Math.abs(sci.x - 352) < 40) { sci.soot = 240; sci.bub = { s: '?!', t: 40 }; }
    else if (sci) { sci.bub = { s: '!', t: 30 }; sci.jump = 6; }
  }
  if (b.effect === 'by' && b.timer === 60 && sci) { sci.jump = 8; sci.bub = { s: 'h', t: 30 }; }
  if (b.timer <= 0) { b.effect = null; b.mix = []; b.level = 0; b.col = null; }
}
function drawMixStation() {
  // flacons de réactif
  for (const b of bottles) {
    if (pour && pour.b === b) continue;
    const sel = held === b, Y = 108 - (sel ? 3 : 0);
    R(x, b.x, Y + 3, 9, 11, K.glassD); R(x, b.x + 1, Y + 4, 7, 9, b.col); R(x, b.x + 1, Y + 4, 1, 9, css(light(hex(b.col), .5)));
    R(x, b.x + 3, Y, 3, 3, K.glassL); R(x, b.x + 3, Y - 1, 3, 1, '#8a5a34');
    if (sel) glow(x, b.x + 4, Y + 8, 10, hex(b.col), .4);
  }
  // bécher
  const bxl = 357, top = 136;
  R(x, bxl, top, 1, 23, K.glassL); R(x, bxl + 17, top, 1, 23, K.glassD); R(x, bxl, 159, 18, 1, K.glassD); R(x, bxl - 1, top, 2, 1, K.glassL); R(x, bxl + 17, top, 2, 1, K.glassD);
  for (let yy = top + 4; yy < 158; yy += 4) P(x, bxl + 1, yy, 'rgba(230,250,255,.5)');
  if (beaker.level > 0 && beaker.col) {
    const lh = F(beaker.level * 18), c = beaker.col;
    R(x, bxl + 1, 159 - lh, 16, lh, css(c)); R(x, bxl + 1, 159 - lh, 16, 1, css(light(c, .5))); R(x, bxl + 1, 159 - lh, 1, lh, css(light(c, .4)));
    for (const b of beaker.bub) P(x, b.x, b.y, css(light(c, .6)));
    glow(x, 366, 159 - lh / 2, 16, c, beaker.effect ? .45 : .2);
  }
  x.fillStyle = 'rgba(150,210,230,.07)'; x.fillRect(bxl + 1, top, 16, 23);
  // brûleur
  const on = beaker.level > 0, fl = on ? 2 + (tick % 3 === 0 ? 1 : 0) : 0;
  R(x, 364, 156, 4, 4, K.ironHi);
  for (let i = 0; i < fl; i++) P(x, 366, 155 - i, i ? '#ffb347' : '#5aa8ff');
  // versement en cours
  if (pour) {
    const b = pour.b, k = Math.min(1, pour.t / 10), X = b.x + (352 - b.x) * k, Y = 108 - k * 2;
    x.save(); x.translate(F(X + 4), F(Y + 8)); x.rotate(k * 1.9); x.fillStyle = K.glassD; x.fillRect(-4, -8, 9, 11); x.fillStyle = b.col; x.fillRect(-3, -7, 7, 9); x.restore();
    if (pour.t > 9 && pour.t < 22) for (let yy = F(Y + 10); yy < 158 - beaker.level * 18; yy++) P(x, 364 + ((yy + tick) % 2), yy, b.col);
  }
}

/* ---------- éléments animés ---------- */
function drawTank() {
  const x0 = 12, x1 = 56, y0 = 59, y1 = 182, lv = F(y1 - (y1 - y0) * tank.level);
  const g = x.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(60,255,140,.55)'); g.addColorStop(.5, 'rgba(40,220,120,.4)'); g.addColorStop(1, 'rgba(20,140,80,.55)');
  x.fillStyle = g; x.fillRect(x0, lv, x1 - x0, y1 - lv);
  R(x, x0, lv, x1 - x0, 1, 'rgba(190,255,210,.8)');
  for (const b of tank.bub) P(x, b.x, b.y, 'rgba(210,255,225,.85)');
  // créature du bocal
  const by = 118 + Math.sin(t * .8) * 4, bxx = 34 + Math.sin(t * .5) * 2;
  for (let k = 0; k < 4; k++) { const ph = t * 2 + k * 1.3 + (tank.wave > 0 ? t * 6 : 0); poly(x, [[bxx - 4 + k * 3, by + 4], [bxx - 5 + k * 3 + Math.sin(ph) * 2, by + 9], [bxx - 4 + k * 3 + Math.sin(ph + 1) * 3, by + 14]], '#c46aa8'); }
  disc(x, F(bxx), F(by), 6, '#d97ab9'); disc(x, F(bxx) - 2, F(by) - 2, 2, '#f0a6d6');
  if (tank.eyes > 0) { disc(x, F(bxx) - 2, F(by), 1, '#fff7c0'); disc(x, F(bxx) + 2, F(by), 1, '#fff7c0'); P(x, F(bxx) - 2 + Math.sign(mouse.x - bxx), F(by), '#14141a'); P(x, F(bxx) + 2 + Math.sign(mouse.x - bxx), F(by), '#14141a'); }
  else { R(x, F(bxx) - 3, F(by), 2, 1, '#7a3a68'); R(x, F(bxx) + 1, F(by), 2, 1, '#7a3a68'); }
  // verre
  R(x, x0 - 1, y0, 1, y1 - y0, K.glassL); R(x, x1, y0, 1, y1 - y0, K.glassD);
  x.fillStyle = 'rgba(235,255,250,.22)'; x.fillRect(x0 + 4, y0 + 4, 2, y1 - y0 - 10); x.fillRect(x0 + 8, y0 + 4, 1, 40);
  glow(x, 34, 130, 50, [60, 255, 140], .16 + tank.wake * .2);
}
function drawShelves() {
  for (const j of jars) {
    const wob = j.wob > 0 ? Math.round(Math.sin(j.wob) * 1) : 0, X = j.x + wob, lh = F(j.h * j.lvl);
    R(x, X, j.y, j.w, j.h, 'rgba(120,190,215,.12)'); R(x, X, j.y, 1, j.h, K.glassL); R(x, X + j.w - 1, j.y, 1, j.h, K.glassD);
    R(x, X + 1, j.y + j.h - lh, j.w - 2, lh, css(j.col)); R(x, X + 1, j.y + j.h - lh, j.w - 2, 1, css(light(j.col, .5)));
    R(x, X, j.y - 1, j.w, 1, K.brass);
    for (const b of j.bub) P(x, X + b.x, b.y, css(light(j.col, .6)));
    glow(x, X + j.w / 2, j.y + j.h - lh / 2, 8, j.col, .14);
  }
  // le bocal à œil
  const ex = eye.x, ey = eye.y, wob = eye.spin > 0 ? Math.round(Math.sin(eye.spin * .6)) : 0;
  R(x, ex - 6 + wob, ey - 9, 13, 17, 'rgba(160,220,200,.18)'); R(x, ex - 6 + wob, ey - 9, 1, 17, K.glassL); R(x, ex + 6 + wob, ey - 9, 1, 17, K.glassD); R(x, ex - 6 + wob, ey - 10, 13, 1, K.brass);
  R(x, ex - 5 + wob, ey - 6, 11, 14, 'rgba(180,240,190,.25)');
  disc(x, ex + wob, ey + Math.round(Math.sin(t) * 1), 4, '#f4f1e8');
  if (eye.blink > 0) R(x, ex - 4 + wob, ey, 9, 1, '#a04050');
  else {
    const a = eye.spin > 0 ? t * 12 : Math.atan2(mouse.y - ey, mouse.x - ex), d = eye.spin > 0 ? 2 : Math.min(2, Math.hypot(mouse.x - ex, mouse.y - ey) / 30);
    const ix = ex + wob + Math.round(Math.cos(a) * d), iy = ey + Math.round(Math.sin(t) * 1) + Math.round(Math.sin(a) * d);
    disc(x, ix, iy, 2, '#3fa86a'); P(x, ix, iy, '#0a0a0a'); P(x, ix - 1, iy - 1, '#ffffff');
  }
  // le chat
  if (cat.state === 'sleep') { x.drawImage(CAT.sleep, cat.x, cat.y); if ((tick >> 4) % 4 === 0) text3(x, 'z', cat.x + 10, cat.y - 7 - ((tick >> 2) % 3), 'rgba(220,220,255,.7)'); }
  else {
    x.drawImage(CAT.sit, cat.x, cat.y - 5);
    if ((tick >> 2) % 12 === 0) R(x, cat.x + 2, cat.y - 2, 3, 1, '#16141b');
    const tl = Math.round(Math.sin(t * 6) * 2); P(x, cat.x + 9, cat.y - 3 + tl, '#16141b'); P(x, cat.x + 9, cat.y - 2 + tl, '#16141b');
  }
}
function drawRadio() {
  const on = radio.on;
  R(x, 92, 135, 8, 4, on ? '#ffcf70' : '#3a2a10'); if (on) { P(x, 93 + ((tick >> 2) % 6), 136, '#b0303f'); glow(x, 96, 137, 9, [255, 200, 110], .35); }
  if (on && tick % 10 === 0) notes.push({ x: 88, y: 128, vx: rnd(-.25, .25), life: 60, col: pick(['#ffd27a', '#ff8fb0', '#8fefff']) });
}
function drawConsole() {
  const x0 = 110, y0 = 127, wd = 26, hh = 13, col = ['#3dff8a', '#45e6ff', '#ffb347'][scope.mode];
  for (let i = 0; i < wd; i++) {
    let yy;
    if (scope.mode === 0) yy = Math.sin((i + tick * .6) / 2.4) * 4;
    else if (scope.mode === 1) yy = ((i + tick) % 8 < 4 ? -3 : 3);
    else yy = Math.sin((i + tick * .4) / 3) * 3 + Math.sin((i + tick) * 1.3) * 1.5;
    P(x, x0 + i, y0 + 6 + Math.round(yy), col);
  }
  glow(x, x0 + 13, y0 + 6, 14, hex(col), .2);
  for (let i = 0; i < 3; i++) P(x, 132 + i * 0, 129 + i * 3, (tick >> (3 + i)) % 2 ? '#ff5050' : '#3a1414');
}
function drawLever() {
  lever.a += (lever.target - lever.a) * .2;
  const a = -1 + lever.a * 2, px = 159, py = 135, ex = px + Math.sin(a) * 9, ey = py - Math.cos(a) * 9;
  line(x, px, py, ex, ey, K.steel); line(x, px + 1, py, ex + 1, ey, K.ironHi);
  disc(x, F(ex) + 1, F(ey), 2, '#b0303f'); P(x, F(ex), F(ey) - 1, '#ff6070'); disc(x, px + 1, py, 1, K.brass);
  P(x, 155, 146, lever.target ? '#7dff7a' : '#ff5050');
}
function drawTesla() {
  glow(x, 200, 118, 34 + lever.a * 20, [120, 230, 255], .1 + lever.a * .3 + Math.sin(t * 5) * .03);
  if (Math.random() < (CALM ? .1 : .3)) { const an = rnd(0, Math.PI * 2), r1 = 15, r2 = 15 + rnd(3, 8 + lever.a * 14); arcs.push(makeArc(200 + Math.cos(an) * r1, 118 + Math.sin(an) * r1, 200 + Math.cos(an + rnd(-.4, .4)) * r2, 118 + Math.sin(an + rnd(-.4, .4)) * r2, ri(1, 2), false)); }
  P(x, 188, 185, (tick >> 3) % 2 ? '#ff5050' : '#3a1414'); P(x, 191, 185, (tick >> 2) % 2 ? '#7dff7a' : '#1a3a14');
}
function drawLamps() {
  // lampe chirurgicale (balancier)
  lamp.vel += -lamp.ang * .015; lamp.vel *= .985; lamp.ang += lamp.vel;
  const lx = 292 + Math.sin(lamp.ang) * 34, ly = 34 + Math.cos(lamp.ang) * 4 + 4;
  line(x, 292, 30, lx, ly - 2, '#101215');
  R(x, lx - 6, ly - 2, 13, 3, K.iron); R(x, lx - 7, ly + 1, 15, 2, K.steel); R(x, lx - 4, ly + 3, 9, 1, '#fff0c0');
  x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,240,200,.05)';
  x.beginPath(); x.moveTo(lx - 5, ly + 3); x.lineTo(lx + 5, ly + 3); x.lineTo(lx + 30 + Math.sin(lamp.ang) * 20, 172); x.lineTo(lx - 30 + Math.sin(lamp.ang) * 20, 172); x.closePath(); x.fill(); x.restore();
  glow(x, lx, ly + 3, 16, [255, 240, 200], .3);
  // suspensions chaudes
  for (const X of [110, 360]) {
    R(x, X, 0, 1, 18, '#101215'); R(x, X - 4, 18, 9, 2, K.brassLo); R(x, X - 3, 20, 7, 2, K.brass); P(x, X, 22, '#fff0c0');
    x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,190,110,.04)';
    x.beginPath(); x.moveTo(X - 3, 22); x.lineTo(X + 4, 22); x.lineTo(X + 34, 150); x.lineTo(X - 33, 150); x.closePath(); x.fill(); x.restore();
    glow(x, X, 22, 18, [255, 195, 110], .3);
  }
  // poussière dans les rayons
  for (let i = 0; i < 8; i++) { const ph = t * .3 + i * 7.1; P(x, 100 + ((i * 37 + Math.sin(ph) * 10) % 40), 40 + ((i * 53 + t * 3) % 100), 'rgba(255,230,180,.35)'); }
}
function drawStars() {
  for (let i = 0; i < SECRETS.length; i++) {
    const id = SECRETS[i], X = W0 - 9 - (SECRETS.length - 1 - i) * 8, Y = 4, on = found[id], pul = starPulse[id] || 0;
    const col = on ? (pul > 0 && (pul >> 2) % 2 ? '#ffffff' : '#ffd23a') : 'rgba(200,210,230,.25)';
    P(x, X + 2, Y, col); R(x, X + 1, Y + 1, 3, 1, col); R(x, X, Y + 2, 5, 1, col); R(x, X + 1, Y + 3, 3, 1, col); P(x, X, Y + 4, col); P(x, X + 4, Y + 4, col);
    if (on && pul > 0) { glow(x, X + 2, Y + 2, 8, [255, 210, 58], pul / 40); starPulse[id]--; }
  }
}
function drawHover() {
  if (!hover || !mouse.in) return;
  const [X, Y, W, H] = hover.r, c = (tick >> 3) % 2 ? 'rgba(255,230,150,.9)' : 'rgba(255,230,150,.5)';
  for (const [cx, cy, sx, sy] of [[X - 2, Y - 2, 1, 1], [X + W + 1, Y - 2, -1, 1], [X - 2, Y + H + 1, 1, -1], [X + W + 1, Y + H + 1, -1, -1]]) { R(x, cx + (sx < 0 ? -2 : 0), cy, 3, 1, c); R(x, cx, cy + (sy < 0 ? -2 : 0), 1, 3, c); }
}

/* ---------- le savant ---------- */
const STOPS = [
  { x: 60, task: 'tank' }, { x: 88, task: 'notes' }, { x: 120, task: 'console' }, { x: 168, task: 'lever-look' },
  { x: 236, task: 'tesla' }, { x: 276, task: 'table' }, { x: 340, task: 'mix' }
];
function initSci() { sci = { x: 220, dir: -1, mode: 'idle', timer: 50, target: 220, task: null, bub: null, jump: 0, soot: 0 }; }
function stepSci() {
  const s = sci;
  if (s.bub && --s.bub.t <= 0) s.bub = null;
  if (s.jump > 0) s.jump--;
  if (s.soot > 0) s.soot--;
  const sp = (s.mode === 'run' ? 1.4 : .6) * (CALM ? 2 : 1);
  if (s.mode === 'walk' || s.mode === 'run') {
    const d = s.target - s.x; s.dir = d >= 0 ? 1 : -1;
    if (Math.abs(d) <= sp) { s.x = s.target; arriveSci(); } else s.x += s.dir * sp;
  } else if (s.mode === 'idle' || s.mode === 'act' || s.mode === 'cheer') {
    if (--s.timer <= 0) {
      if (creature.busy && creature.stage !== 'dance') { s.timer = 20; return; }
      if (radio.on && Math.random() < .5) { s.mode = 'dance'; s.timer = 120; return; }
      const st = pick(STOPS); s.target = st.x; s.task = st.task; s.mode = 'walk';
    }
  } else if (s.mode === 'dance') { if (--s.timer <= 0 || !radio.on) { s.mode = 'idle'; s.timer = 30; } }
}
function arriveSci() {
  const s = sci, tk = s.task;
  if (tk === 'chase') { s.x = -20; s.target = 120; s.mode = 'walk'; s.task = null; return; }
  s.mode = 'act'; s.timer = ri(60, 140);
  if (tk === 'tank') { s.dir = -1; if (Math.random() < .5) s.bub = { s: '?', t: 30 }; }
  else if (tk === 'notes' || tk === 'console') { s.dir = 1; s.notes = true; }
  else if (tk === 'mix') { s.dir = 1; if (Math.random() < .4) s.bub = { s: '+', t: 30 }; }
  else if (tk === 'table') { s.dir = 1; if (creature.stage === 'lie' && Math.random() < .5) s.bub = { s: 'h', t: 30 }; }
  else if (tk === 'goto') { s.mode = 'idle'; s.timer = ri(80, 160); }
  else if (tk === 'watch') { s.dir = 1; s.timer = 30; }
}
function drawSci() {
  const s = sci, set = s.soot > 0 ? SOOT : SCI;
  const walking = s.mode === 'walk' || s.mode === 'run';
  let fr = set.stand;
  if (walking) fr = (tick >> 2) % 2 ? set.walkA : set.walkB;
  else if (s.mode === 'cheer' || (s.mode === 'dance' && (tick >> 3) % 2)) fr = set.cheer;
  else if (s.mode === 'act' && s.notes) fr = set.notes;
  if (!walking && s.mode !== 'act') s.notes = false;
  const img = fr[s.dir > 0 ? 0 : 1];
  const jmp = s.jump > 0 ? -Math.round(Math.sin(s.jump / 8 * Math.PI) * 3) : 0, dance = s.mode === 'dance' ? -Math.round(Math.abs(Math.sin(t * 7)) * 2) : 0;
  const X = F(s.x), Y = FEET - img.height + jmp + dance;
  x.drawImage(img, X, Y);
  if (s.soot > 0 && tick % 6 === 0) smoke.push({ x: X + 6, y: Y, vx: rnd(-.2, .2), vy: -.3, life: 0, max: 20 });
  if (s.bub) bubble(x, s.bub.s, X + 7, Y - 1, s.bub.s === 'eureka' ? '#a0401a' : '#14161c');
}

/* ---------- zones cliquables ---------- */
const HOT = [
  { id: 'tank', r: [10, 58, 48, 124], act: () => { tank.wake = 1; tank.eyes = 90; tank.wave = 60; for (let i = 0; i < 20; i++) tank.bub.push({ x: rnd(14, 54), y: rnd(150, 180), v: rnd(.5, 1.4) }); sfx('blip'); unlock('tank'); } },
  { id: 'eye', r: [86, 70, 13, 18], act: () => { eye.spin = 50; eye.blink = 0; sfx('blip'); unlock('eye'); } },
  { id: 'cat', r: [116, 46, 16, 12], act: () => { if (cat.state === 'sleep') { cat.state = 'awake'; cat.timer = 160; sfx('meow'); unlock('cat'); } else { sfx('meow'); cat.timer = 120; } } },
  { id: 'jars', r: [82, 86, 46, 14], act: () => { const j = pick(jars.slice(2)); j.wob = 18; for (let i = 0; i < 6; i++) j.bub.push({ x: ri(1, j.w - 2), y: j.y + j.h - 1, v: rnd(.3, .7) }); sfx('blip'); } },
  { id: 'jars2', r: [98, 48, 20, 14], act: () => { const j = pick(jars.slice(0, 2)); j.wob = 18; for (let i = 0; i < 6; i++) j.bub.push({ x: ri(1, j.w - 2), y: j.y + j.h - 1, v: rnd(.3, .7) }); sfx('blip'); } },
  { id: 'radio', r: [75, 130, 28, 20], act: () => { radio.on = !radio.on; if (radio.on) { startRadio(); unlock('radio'); } else stopRadio(); } },
  { id: 'console', r: [105, 123, 38, 28], act: () => { scope.mode = (scope.mode + 1) % 3; sfx('blip'); } },
  { id: 'lever', r: [151, 119, 16, 32], act: pullLever },
  { id: 'tesla', r: [184, 102, 32, 90], act: () => { for (let k = 0; k < 4; k++) arcs.push(makeArc(200, 104, 200 + rnd(-30, 30), rnd(80, 100), 3, true)); sfx('zap'); } },
  { id: 'window', r: [168, 16, 64, 94], act: skyBolt },
  { id: 'porthole', r: [347, 27, 38, 38], act: skyBolt },
  { id: 'lamp', r: [282, 30, 22, 14], act: () => { lamp.vel += .05; } },
  { id: 'creature', r: [260, 150, 62, 22], act: () => { if (creature.stage === 'lie') { creature.twitch = 24; sfx('grr'); } } },
  { id: 'bottle-r', r: [339, 104, 13, 18], act: () => selectBottle(0) },
  { id: 'bottle-b', r: [357, 104, 13, 18], act: () => selectBottle(1) },
  { id: 'bottle-y', r: [375, 104, 13, 18], act: () => selectBottle(2) },
  { id: 'beaker', r: [355, 134, 22, 27], act: () => { if (held) { pourInto(held); held = null; } else if (beaker.level > 0) { beaker.effect = null; beaker.timer = 0; beaker.level = 0; beaker.mix = []; beaker.col = null; sfx('pour'); } } }
];
function selectBottle(i) { held = held === bottles[i] ? null : bottles[i]; sfx('blip'); }
function hitHot(X, Y) { return HOT.find(h => X >= h.r[0] && X < h.r[0] + h.r[2] && Y >= h.r[1] && Y < h.r[1] + h.r[3]); }
function onClick(X, Y) {
  const h = hitHot(X, Y);
  if (h) { h.act(); return; }
  if (Y >= FLOOR - 4) { sci.target = clamp(F(X - 7), 4, W0 - 18); sci.task = 'goto'; sci.mode = 'walk'; if (held) held = null; return; }
  if (held) held = null;
}

/* ---------- mise à jour ---------- */
function update() {
  stepSky();
  // cuve
  if (Math.random() < .35) tank.bub.push({ x: rnd(14, 54), y: 180, v: rnd(.3, 1) });
  for (let i = tank.bub.length - 1; i >= 0; i--) { const b = tank.bub[i]; b.y -= b.v; b.x += Math.sin(t * 3 + i) * .1; if (b.y < 182 - (182 - 59) * tank.level) tank.bub.splice(i, 1); }
  tank.wake *= .97; if (tank.eyes > 0) tank.eyes--; if (tank.wave > 0) tank.wave--;
  if (!tank.eyes && Math.random() < .002) tank.eyes = 40;
  // bocaux
  for (const j of jars) { if (j.wob > 0) j.wob -= 1; if (Math.random() < .03) j.bub.push({ x: ri(1, j.w - 2), y: j.y + j.h - 1, v: rnd(.15, .4) }); for (let i = j.bub.length - 1; i >= 0; i--) { j.bub[i].y -= j.bub[i].v; if (j.bub[i].y < j.y + j.h - j.h * j.lvl) j.bub.splice(i, 1); } }
  if (eye.spin > 0) eye.spin--; else if (eye.blink > 0) eye.blink--; else if (Math.random() < .006) eye.blink = 5;
  if (cat.state === 'awake' && --cat.timer <= 0) cat.state = 'sleep';
  // particules
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; if (!p.float && !p.bubble && !p.fire) p.vy += .03; if (p.bubble) p.x += Math.sin(t * 4 + i) * .2; if (--p.life <= 0 || p.y > H0) parts.splice(i, 1); }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += .12; if (--s.life <= 0) sparks.splice(i, 1); }
  for (let i = smoke.length - 1; i >= 0; i--) { const s = smoke[i]; s.x += s.vx; s.y += s.vy; s.vx *= .97; s.vy *= .98; if (++s.life > s.max) smoke.splice(i, 1); }
  for (let i = notes.length - 1; i >= 0; i--) { const n = notes[i]; n.x += n.vx + Math.sin(t * 3 + i) * .2; n.y -= .35; if (--n.life <= 0) notes.splice(i, 1); }
  for (let i = arcs.length - 1; i >= 0; i--) { const a = arcs[i]; if (--a.life <= 0) arcs.splice(i, 1); else if (a.big) arcs[i] = Object.assign(makeArc(a.a[0], a.a[1], a.b[0], a.b[1], a.life, true), { life: a.life }); }
  flash *= .65; if (flash < .01) flash = 0;
  stepPour(); stepBeaker(); stepCreature(); stepSci();
  // hors des heures, rafraîchit le ciel toutes les minutes
  if (tick % (FPS * 60) === 0) DAY = daypart();
}
function draw() {
  x.imageSmoothingEnabled = false;
  const dx = mouse.in ? Math.round((mouse.x - 200) / 200 * 3) : 0;
  R(x, 0, 0, W0, H0, '#07080b');
  drawSky(-dx);
  x.drawImage(back, 0, 0);
  // lumière de l'éclair projetée au sol
  if (lightK > .05) { x.fillStyle = `rgba(210,225,255,${lightK * .18})`; x.beginPath(); x.moveTo(170, 108); x.lineTo(230, 108); x.lineTo(262, FLOOR + 30); x.lineTo(140, FLOOR + 30); x.closePath(); x.fill(); }
  drawLamps();
  drawTank();
  drawShelves();
  drawRadio(); drawConsole(); drawLever(); drawTesla();
  drawMixStation();
  drawCreature();
  if (HALLOWEEN) for (const [X, Y] of [[70, 186], [344, 186], [146, 144]]) { disc(x, X + 4, Y + 2, 4, '#e0701a'); disc(x, X + 2, Y + 2, 3, '#c25f12'); R(x, X + 4, Y - 3, 1, 2, '#4a7a2a'); const f = Math.random() > .25 ? '#ffe680' : '#ffb347'; P(x, X + 2, Y + 1, f); P(x, X + 6, Y + 1, f); R(x, X + 2, Y + 3, 5, 1, f); glow(x, X + 4, Y + 2, 8, [255, 140, 26], .25); }
  drawSci();
  for (const n of notes) { x.fillStyle = n.col; x.fillRect(F(n.x), F(n.y), 2, 2); x.fillRect(F(n.x) + 1, F(n.y) - 4, 1, 4); x.fillRect(F(n.x) + 1, F(n.y) - 4, 2, 1); }
  for (const s of smoke) { const k = s.life / s.max; x.fillStyle = `rgba(90,90,95,${.6 * (1 - k)})`; const sz = k > .3 ? 3 : 2; x.fillRect(F(s.x), F(s.y), sz, sz); }
  for (const p of parts) { x.fillStyle = p.col; x.fillRect(F(p.x), F(p.y), 1, 1); if (p.fire) glow(x, p.x, p.y, 3, [255, 160, 60], .2); }
  if (bolt && !bolt.sky) { for (const [p, q] of bolt.pts.flatMap((pt, i, a) => i ? linePts(a[i - 1][0], a[i - 1][1], pt[0], pt[1]) : [])) { x.fillStyle = 'rgba(150,230,255,.5)'; x.fillRect(p - 1, q, 3, 1); } poly(x, bolt.pts, '#ffffff'); glow(x, 200, 104, 30, [180, 240, 255], .7); }
  for (const a of arcs) drawArc(a);
  for (const s of sparks) P(x, s.x, s.y, s.col || (s.life > 6 ? '#ffffff' : '#7fe8ff'));
  // ambiance jour / nuit
  if (DAY.amb > 0) { x.fillStyle = `rgba(200,210,230,${DAY.amb})`; x.fillRect(0, 0, W0, H0); }
  const vg = x.createRadialGradient(W0 / 2, H0 / 2, 80, W0 / 2, H0 / 2, 260); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = vg; x.fillRect(0, 0, W0, H0);
  if (flash > 0) { x.fillStyle = `rgba(230,245,255,${flash})`; x.fillRect(0, 0, W0, H0); }
  drawHover();
  drawStars();
}

/* ---------- boucle et cycle de vie ---------- */
function loop(now) {
  if (!running) return;
  raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  const step = 1000 / FPS;
  if (now - last < step) return;
  last = now - ((now - last) % step);
  tick++; t = tick / FPS;
  update(); draw();
}
function fit() {
  const host = cvs.parentElement, W = host.clientWidth, H = host.clientHeight;
  let s = Math.min(W / W0, H / H0);
  if (s >= 2) s = F(s);
  cvs.style.width = F(W0 * s) + 'px'; cvs.style.height = F(H0 * s) + 'px';
}
function toWorld(e) { const r = cvs.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W0, (e.clientY - r.top) / r.height * H0]; }
let wired = false;
function wire() {
  if (wired) return; wired = true;
  cvs.addEventListener('pointermove', e => { const [X, Y] = toWorld(e); mouse.x = X; mouse.y = Y; mouse.in = true; hover = hitHot(X, Y); cvs.style.cursor = hover ? 'pointer' : (Y >= FLOOR - 4 ? 'crosshair' : 'default'); });
  cvs.addEventListener('pointerleave', () => { mouse.in = false; hover = null; });
  cvs.addEventListener('click', e => { const [X, Y] = toWorld(e); onClick(X, Y); });
  window.addEventListener('resize', () => { if (running) fit(); });
}
let built = false;
window.Salle = {
  start(canvas) {
    cvs = canvas; x = cvs.getContext('2d');
    cvs.width = W0; cvs.height = H0;
    if (!built) { buildBack(); initSky(); initSci(); built = true; }
    DAY = daypart();
    wire(); fit();
    running = true; last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    draw();
  },
  stop() { running = false; cancelAnimationFrame(raf); stopRadio(); if (SND.on) setSound(false); },
  toggleSound() { setSound(!SND.on); return SND.on; },
  get sound() { return SND.on; },
  secrets: () => ({ found: SECRETS.filter(s => found[s]).length, total: SECRETS.length })
};
})();
