/* ==========================================================================
   CODEX MENTAL · LAB — boîte à outils des salles vectorielles et orbitales
   Toile à la résolution de l'écran, plans fixes pré-dessinés, halos rapides,
   savant dessiné en vectoriel, boucle d'animation économe.
   Une salle s'enregistre avec VK.room({ ... }).
   ========================================================================== */
(() => {
'use strict';
const VK = window.VK = {};
const LAB = window.LAB || {};
VK.MOTION = LAB.motion || 'full';
VK.STATIC = VK.MOTION === 'off';
VK.CALM = VK.MOTION === 'calm';
VK.HALLOWEEN = !!LAB.halloween;

/* ---------- outils ---------- */
VK.rnd = (a, b) => a + Math.random() * (b - a);
VK.pick = a => a[Math.floor(Math.random() * a.length)];
VK.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
VK.seeded = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
VK.hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
VK.rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
VK.lighten = (c, k) => c.map(v => v + (255 - v) * k);
VK.darken = (c, k) => c.map(v => v * (1 - k));
VK.mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
VK.BRASS = ['#f6dc8c', '#d4a849', '#9a7024', '#5a3f12'];
VK.COPPER = ['#f2b27a', '#c8763a', '#8a4a1e', '#4a240c'];
VK.STEEL = ['#e1e7ee', '#a7b2bf', '#69737f', '#353b44'];
VK.WHITE = ['#ffffff', '#dfe6ee', '#aab6c4', '#6d7886'];
VK.metal = (c, x0, y0, x1, y1, pal) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, pal[0]); g.addColorStop(.35, pal[1]); g.addColorStop(.75, pal[2]); g.addColorStop(1, pal[3]); return g; };
VK.rr = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
const glowCache = new Map();
function glowSprite(col) {
  const k = ((col[0] >> 4) << 8) | ((col[1] >> 4) << 4) | (col[2] >> 4);
  let c = glowCache.get(k);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 128; const g2 = c.getContext('2d');
    const cc = [(col[0] >> 4) * 17, (col[1] >> 4) * 17, (col[2] >> 4) * 17], g = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, VK.rgba(cc, 1)); g.addColorStop(.4, VK.rgba(cc, .35)); g.addColorStop(1, VK.rgba(cc, 0));
    g2.fillStyle = g; g2.fillRect(0, 0, 128, 128);
    if (glowCache.size > 300) glowCache.clear(); glowCache.set(k, c);
  }
  return c;
}
VK.glow = (c, x, y, r, col, a) => {
  if (a <= .004 || r < 1) return;
  const pa = c.globalAlpha, po = c.globalCompositeOperation;
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, a);
  c.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  c.globalAlpha = pa; c.globalCompositeOperation = po;
};
let puff = null;
VK.puff = () => {
  if (puff) return puff;
  puff = document.createElement('canvas'); puff.width = puff.height = 64; const k = puff.getContext('2d');
  const g = k.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.45, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  k.fillStyle = g; k.fillRect(0, 0, 64, 64); return puff;
};
VK.doorRight = H => VK.clamp(H * .17, 120, 190) * .48 + 14;

/* ---------- le savant, dessiné en vectoriel ---------- */
// o : { x, foot, sc, dir, phase, walk, pose, jump, soot, suit, helmet, rot, bub }
VK.scientist = (ctx, o) => {
  const sc = o.sc, walk = !!o.walk, ph = o.phase || 0;
  const bob = walk ? Math.abs(Math.sin(ph)) * 2.5 * sc : Math.sin(VK.t * 2) * .8 * sc;
  ctx.save(); ctx.translate(o.x, o.foot - (o.jump || 0)); if (o.rot) ctx.rotate(o.rot); ctx.scale(o.dir || 1, 1);
  const suit = !!o.suit, soot = o.soot > 0;
  const coatA = soot ? '#7a7c7e' : (suit ? '#f4f6f8' : '#f1f5f7'), coatB = soot ? '#4a4c4e' : (suit ? '#b9c4cf' : '#b7c5cd');
  const skin = soot ? '#5a4636' : '#f1c29a', hair = soot ? '#5a5650' : '#f6f6f2';
  if (!o.float) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 22 * sc, 4 * sc, 0, 0, 6.3); ctx.fill(); }
  const legA = walk ? Math.sin(ph) * .5 : (o.float ? Math.sin(VK.t * 1.3) * .25 : 0);
  for (const [sg, col] of [[1, suit ? '#c9d2dc' : '#22252e'], [-1, suit ? '#aeb9c4' : '#2c303b']]) {
    ctx.save(); ctx.translate(sg * 5 * sc, -46 * sc - bob); ctx.rotate(legA * sg);
    ctx.fillStyle = col; VK.rr(ctx, -5 * sc, 0, 10 * sc, 42 * sc, 4 * sc); ctx.fill();
    ctx.fillStyle = suit ? '#5a6472' : '#121317'; ctx.beginPath(); ctx.ellipse(4 * sc, 44 * sc, 9 * sc, 4 * sc, 0, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  ctx.translate(0, -bob);
  const arm = (side, ang, hold) => {
    ctx.save(); ctx.translate(side * 13 * sc, -88 * sc); ctx.rotate(ang);
    ctx.fillStyle = side < 0 ? coatB : coatA; VK.rr(ctx, -5 * sc, 0, 10 * sc, 32 * sc, 5 * sc); ctx.fill();
    ctx.fillStyle = suit ? '#7f8a99' : skin; ctx.beginPath(); ctx.arc(0, 34 * sc, 4.5 * sc, 0, 6.3); ctx.fill();
    if (hold === 'board') { ctx.translate(0, 34 * sc); ctx.rotate(-ang); ctx.fillStyle = '#7a5233'; VK.rr(ctx, -2 * sc, -16 * sc, 18 * sc, 24 * sc, 2 * sc); ctx.fill(); ctx.fillStyle = '#f1ead6'; ctx.fillRect(0, -13 * sc, 14 * sc, 19 * sc); ctx.fillStyle = '#9a907a'; for (let i = 0; i < 4; i++) ctx.fillRect(2 * sc, (-10 + i * 4) * sc, (i === 3 ? 6 : 10) * sc, sc); }
    if (hold === 'tool') { ctx.translate(0, 38 * sc); ctx.rotate(-ang + .6); ctx.fillStyle = '#a7b2bf'; ctx.fillRect(-1.5 * sc, -14 * sc, 3 * sc, 18 * sc); ctx.beginPath(); ctx.arc(0, -15 * sc, 4 * sc, 0, 6.3); ctx.fill(); }
    if (hold === 'lens') { ctx.translate(0, 36 * sc); ctx.rotate(-ang); ctx.strokeStyle = VK.BRASS[1]; ctx.lineWidth = 2 * sc; ctx.beginPath(); ctx.arc(4 * sc, -4 * sc, 6 * sc, 0, 6.3); ctx.stroke(); ctx.fillStyle = 'rgba(180,230,255,.35)'; ctx.fill(); }
    ctx.restore();
  };
  let aB = walk ? -Math.sin(ph) * .5 : (o.float ? -.6 + Math.sin(VK.t) * .2 : 0), aF = walk ? Math.sin(ph) * .5 : (o.float ? .6 - Math.sin(VK.t) * .2 : 0), hold = null;
  if (o.pose === 'notes') { aF = -1.1; hold = 'board'; }
  else if (o.pose === 'reach') { aF = -2.6; }
  else if (o.pose === 'cheer') { aF = -2.8; aB = 2.8; }
  else if (o.pose === 'tool') { aF = -1.4; hold = 'tool'; }
  else if (o.pose === 'look') { aF = -1.9; hold = 'lens'; }
  else if (o.pose === 'wave') { aF = -2.4 + Math.sin(VK.t * 10) * .4; }
  arm(-1, aB, null);
  const g = ctx.createLinearGradient(-20 * sc, 0, 20 * sc, 0); g.addColorStop(0, coatB); g.addColorStop(.45, coatA); g.addColorStop(1, coatB);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-16 * sc, -92 * sc); ctx.lineTo(16 * sc, -92 * sc); ctx.lineTo(22 * sc, -36 * sc); ctx.quadraticCurveTo(0, -32 * sc, -22 * sc, -36 * sc); ctx.closePath(); ctx.fill();
  if (suit) {
    ctx.fillStyle = '#3fd8ff'; ctx.fillRect(-10 * sc, -76 * sc, 8 * sc, 5 * sc); ctx.fillStyle = '#ff6a6a'; ctx.fillRect(2 * sc, -76 * sc, 5 * sc, 5 * sc);
    ctx.fillStyle = '#c9d2dc'; VK.rr(ctx, -14 * sc, -60 * sc, 28 * sc, 6 * sc, 2 * sc); ctx.fill();
    ctx.fillStyle = '#e8edf2'; VK.rr(ctx, -21 * sc, -90 * sc, 8 * sc, 40 * sc, 3 * sc); ctx.fill();   // sac de survie
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.2 * sc; ctx.beginPath(); ctx.moveTo(2 * sc, -90 * sc); ctx.lineTo(4 * sc, -36 * sc); ctx.stroke();
    ctx.fillStyle = '#b0303f'; ctx.beginPath(); ctx.moveTo(-4 * sc, -90 * sc); ctx.lineTo(4 * sc, -86 * sc); ctx.lineTo(4 * sc, -90 * sc); ctx.lineTo(-4 * sc, -86 * sc); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9e2e7'; ctx.fillRect(6 * sc, -70 * sc, 9 * sc, 8 * sc); ctx.fillStyle = '#3f6fd8'; ctx.fillRect(8 * sc, -74 * sc, 1.5 * sc, 6 * sc);
  }
  const hy = -106 * sc;
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(3 * sc, hy, 12 * sc, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(14 * sc, hy + 2 * sc, 3.5 * sc, 0, 6.3); ctx.fill();
  ctx.fillStyle = hair;
  const puffs = o.float ? [[-9, -6, 7], [-6, -15, 7], [2, -18, 7], [10, -16, 6], [-12, 0, 6], [-4, -20, 5], [14, -12, 4]] : [[-9, -4, 7], [-6, -12, 7], [2, -15, 7], [10, -13, 6], [-12, 4, 6], [-4, -16, 5], [14, -8, 4]];
  for (const [hx, hy2, r] of puffs) { ctx.beginPath(); ctx.arc(hx * sc, hy + hy2 * sc, r * sc, 0, 6.3); ctx.fill(); }
  if (!suit) {
    ctx.fillStyle = VK.BRASS[1]; ctx.fillRect(-8 * sc, hy - 8 * sc, 22 * sc, 3 * sc);
    for (const ex of [4, 11]) { ctx.fillStyle = VK.BRASS[2]; ctx.beginPath(); ctx.arc(ex * sc, hy - 7 * sc, 4 * sc, 0, 6.3); ctx.fill(); ctx.fillStyle = '#8fefff'; ctx.beginPath(); ctx.arc(ex * sc, hy - 7 * sc, 2.6 * sc, 0, 6.3); ctx.fill(); }
  }
  const blink = (VK.t % 4) < .12;
  ctx.fillStyle = '#1b1b22'; if (blink) ctx.fillRect(7 * sc, hy + sc, 4 * sc, sc); else { ctx.beginPath(); ctx.arc(9 * sc, hy + sc, 1.8 * sc, 0, 6.3); ctx.fill(); }
  ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(10 * sc, hy + 7 * sc, 7 * sc, 2.5 * sc, -.1, 0, 6.3); ctx.fill();
  if (o.helmet) {   // casque transparent
    ctx.fillStyle = 'rgba(180,230,255,.12)'; ctx.strokeStyle = 'rgba(220,245,255,.75)'; ctx.lineWidth = 2 * sc;
    ctx.beginPath(); ctx.arc(2 * sc, hy - 2 * sc, 22 * sc, 0, 6.3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5 * sc; ctx.beginPath(); ctx.arc(2 * sc, hy - 2 * sc, 17 * sc, 3.6, 4.4); ctx.stroke();
    ctx.fillStyle = '#c9d2dc'; VK.rr(ctx, -16 * sc, hy + 16 * sc, 36 * sc, 6 * sc, 3 * sc); ctx.fill();
  }
  arm(1, aF, hold);
  ctx.restore();
  if (o.bub) VK.bubble(ctx, o.x + 14 * sc * (o.dir || 1), o.foot - (o.jump || 0) - 152 * sc, o.bub, sc);
};
VK.bubble = (ctx, x, y, sym, u) => {
  ctx.save();
  const w = Math.max(26, sym.length * 11 + 16) * u, h = 24 * u;
  ctx.fillStyle = 'rgba(245,248,250,.95)'; VK.rr(ctx, x - w / 2, y - h, w, h, 10 * u); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 4 * u, y - 1); ctx.lineTo(x, y + 7 * u); ctx.lineTo(x + 4 * u, y - 1); ctx.fill();
  ctx.fillStyle = '#14161c'; ctx.font = `700 ${14 * u}px 'IBM Plex Sans', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(sym, x, y - h / 2 + 1);
  ctx.restore();
};
VK.say = (type, phase) => window.dispatchEvent(new CustomEvent('lab:event', { detail: { type, phase } }));

/* ---------- une salle ---------- */
// R : { panel(W,H,u,compact) → {TOP, BOT, SL, SR}, build(S), bake(S, layers), update(S, dt), draw(S, ctx, par), hit(S,x,y), click(S,x,y,kind), accent(S,col) }
VK.room = R => {
  const cvs = document.getElementById('scene'); if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const S = { W: 0, H: 0, u: 1, compact: false, DPR: 1, layers: {}, mx: 0, my: 0, tmx: 0, tmy: 0, flash: 0, dim: 0, dimT: 0, shake: 0 };
  let quality = Math.min(window.devicePixelRatio || 1, 2), last = 0, avg = 16;
  VK.t = 0;
  S.layer = () => {
    const M = 24 * S.u, c = document.createElement('canvas');
    c.width = Math.ceil((S.W + 2 * M) * S.DPR); c.height = Math.ceil((S.H + 2 * M) * S.DPR);
    const k = c.getContext('2d'); k.setTransform(S.DPR, 0, 0, S.DPR, M * S.DPR, M * S.DPR);
    return { c, k, M };
  };
  S.put = (L, ox = 0, oy = 0) => ctx.drawImage(L.c, -L.M + ox, -L.M + oy, S.W + 2 * L.M, S.H + 2 * L.M);
  function layout() {
    S.W = innerWidth; S.H = innerHeight; S.compact = S.W < 820; S.DPR = quality;
    cvs.width = Math.round(S.W * S.DPR); cvs.height = Math.round(S.H * S.DPR);
    cvs.style.width = S.W + 'px'; cvs.style.height = S.H + 'px'; cvs.style.left = '0px'; cvs.style.top = '0px';
    S.u = S.compact ? VK.clamp(Math.min(S.H / 1080, S.W / 640), .45, .9) : VK.clamp(Math.min(S.H / 900, S.W / 1500), .62, 1.7);
    const P = R.panel(S);
    Object.assign(S, P);
    const st = document.documentElement.style;
    st.setProperty('--in-t', P.TOP + 'px'); st.setProperty('--in-b', P.BOT + 'px'); st.setProperty('--in-l', P.SL + 'px'); st.setProperty('--in-r', P.SR + 'px');
    st.setProperty('--door-b', (P.doorB != null ? P.doorB : 8 * S.u) + 'px');
    R.build(S);
    S.layers = {}; R.bake(S, S.layers);
    if (R.warm) R.warm(S);
    if (VK.STATIC) draw();
  }
  function draw() {
    ctx.setTransform(S.DPR, 0, 0, S.DPR, 0, 0);
    if (S.shake > 0) ctx.translate((Math.random() - .5) * 8 * S.u * S.shake, (Math.random() - .5) * 4 * S.u * S.shake);
    R.draw(S, ctx, { x: S.mx, y: S.my, P: 14 * S.u });
    if (S.dim > .01) { ctx.fillStyle = `rgba(2,4,10,${S.dim})`; ctx.fillRect(-20, -20, S.W + 40, S.H + 40); if (R.drawDark) R.drawDark(S, ctx); }
    if (S.flash > .01) { ctx.fillStyle = VK.rgba(S.flashCol || [225, 240, 255], S.flash * .35); ctx.fillRect(-20, -20, S.W + 40, S.H + 40); }
  }
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || VK.STATIC || (window.LAB && window.LAB.paused)) { last = now; return; }
    const min = VK.CALM ? 1000 / 30 : 1000 / 60;
    if (last && now - last < min - 1) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now; VK.t += dt; S.t = VK.t;
    const t0 = performance.now();
    S.mx += (S.tmx - S.mx) * Math.min(1, dt * 3); S.my += (S.tmy - S.my) * Math.min(1, dt * 3);
    S.flash *= Math.pow(.02, dt); if (S.flash < .005) S.flash = 0;
    S.dim += (S.dimT - S.dim) * Math.min(1, dt * 3); S.shake = Math.max(0, S.shake - dt);
    R.update(S, dt); draw();
    avg = avg * .95 + (performance.now() - t0) * .05;
    if (avg > 22 && quality > 1) { quality = 1; avg = 12; layout(); }
    else if (avg > 30 && !S.lite) { S.lite = true; avg = 16; }
  }
  window.addEventListener('pointermove', e => { S.tmx = (e.clientX / S.W - .5) * 2; S.tmy = (e.clientY / S.H - .5) * 2; }, { passive: true });
  cvs.addEventListener('pointermove', e => { cvs.style.cursor = R.hit(S, e.clientX, e.clientY) ? 'pointer' : 'default'; });
  cvs.addEventListener('click', e => { const h = R.hit(S, e.clientX, e.clientY); if (h) { R.click(S, e.clientX, e.clientY, h); if (VK.STATIC) draw(); } });
  let typed = '';
  window.addEventListener('keydown', e => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key.length !== 1) return; typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed.endsWith('igor') && R.secret) { typed = ''; R.secret(S); }
  });
  let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 160); });
  window.LabScene = {
    setAccent: col => { if (R.accent) R.accent(S, VK.hex(col)); if (VK.STATIC) draw(); },
    event: type => { if (R.event) R.event(S, type); },
    creature: () => { if (R.secret) R.secret(S); },
    zap: () => {}, state: () => S
  };
  layout(); draw(); requestAnimationFrame(loop);
};
})();
