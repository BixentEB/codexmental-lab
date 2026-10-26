/* ==========================================================================
   CODEX MENTAL · LAB — univers orbital : la station (salle libre)
   Décor peint (pack graphique « Station orbitale ») découpé en calques :
   l'espace derrière, le module devant, puis les machines au premier plan.
   Tout ce qui bouge est animé par-dessus : étoiles, lumières des villes,
   astéroïdes, réacteur, écrans, bulles en apesanteur, savant, incidents.
   ========================================================================== */
(() => {
'use strict';
const { rnd, pick, clamp, seeded, rgba, glow, mix, lighten, darken } = VK;
const DIR = 'img/orbital/station/';
const FILES = { fond: 'fond.jpg', module: 'module.png', reacteur: 'reacteur.png', console: 'console.png', caisses: 'caisses.png', rambarde: 'rambarde.png', cables: 'cables.png', plantes: 'plantes.png' };
const LIQ = [[95, 242, 255], [255, 95, 200], [160, 120, 255], [120, 255, 160], [255, 190, 80]];
const MW = 885, MH = 425;                       // dimensions du module (repère de la scène)
// fenêtres du module, dans son repère : on peut cliquer à travers
const WIN_RECT = [121, 86, 461, 294], PORT = [655, 188, 127];
// placement des éléments au premier plan, dans le repère du module : x, bas, hauteur, profondeur
const PROPS = [
  { k: 'reacteur', x: 72, bottom: 418, h: 250, depth: 1 },
  { k: 'caisses', x: 650, bottom: 424, h: 120, depth: 1 },
  { k: 'console', x: 300, bottom: 430, h: 112, depth: 1.15 },
  { k: 'plantes', x: 548, bottom: 430, h: 70, depth: 1.15 },
  { k: 'rambarde', x: -20, bottom: 438, h: 40, w: MW + 40, depth: 1.3 },
  { k: 'cables', x: 250, top: -8, h: 92, depth: 1.45, hang: true }
];

function load(src) { return new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = DIR + src; }); }
// repère les points lumineux d'une image (lampes, écrans, villes) pour les animer
function emitters(img, test, cell, max) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const k = c.getContext('2d', { willReadFrequently: true }); k.drawImage(img, 0, 0);
  const d = k.getImageData(0, 0, img.width, img.height).data, out = [], seen = new Set();
  for (let y = 0; y < img.height; y += 2) for (let x = 0; x < img.width; x += 2) {
    const i = (y * img.width + x) * 4; if (d[i + 3] < 200) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (!test(r, g, b)) continue;
    const key = ((x / cell) | 0) + ',' + ((y / cell) | 0); if (seen.has(key)) continue; seen.add(key);
    out.push({ x, y, col: [r, g, b], ph: Math.random() * 6 });
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.slice(0, max);
}

Promise.all(Object.entries(FILES).map(([k, f]) => load(f).then(im => [k, im]))).then(list => {
  const IMG = Object.fromEntries(list);
  const CITY = emitters(IMG.fond, (r, g, b) => r > 215 && g > 150 && b < 140 && r - b > 90, 10, 140);
  const STARS = emitters(IMG.fond, (r, g, b) => r > 225 && g > 225 && b > 225, 22, 90).filter(p => p.y < IMG.fond.height * .45);
  const LAMPS = emitters(IMG.module, (r, g, b) => (r > 235 && g > 200) || (b > 235 && g > 200 && r < 200), 26, 40);
  const SCREENS = emitters(IMG.console, (r, g, b) => b > 200 && g > 160 && r < 170, 18, 24);

  VK.room({
    panel(S) {
      const { W, u, compact } = S;
      const SL = compact ? 10 : Math.max(250 * u, W * .14);
      return { TOP: compact ? 62 : 96 * u, BOT: compact ? 160 * u : 230 * u, SL, SR: SL };
    },
    build(S) {
      const { W, H, u, compact } = S;
      // le module couvre l'écran, ancré en bas
      S.k = Math.max(W / MW, H / MH); S.mx0 = (W - MW * S.k) / 2; S.my0 = H - MH * S.k;
      S.M = (x, y) => [S.mx0 + x * S.k, S.my0 + y * S.k];
      // l'espace derrière, un peu plus grand pour la parallaxe
      S.kb = Math.max(W / IMG.fond.width, H / IMG.fond.height) * 1.1;
      S.bx0 = (W - IMG.fond.width * S.kb) / 2; S.by0 = (H - IMG.fond.height * S.kb) / 2;
      S.B = (x, y) => [S.bx0 + x * S.kb, S.by0 + y * S.kb];
      const fl = S.M(0, 330)[1], top = S.M(0, 150)[1];
      S.zone = { x0: Math.max(20 * u, S.M(150, 0)[0]), x1: Math.min(W - 20 * u, S.M(780, 0)[0]), y0: top, y1: fl };
      S.blobs = []; for (let i = 0; i < (compact ? 4 : 7); i++) S.blobs.push(blob(S, rnd(S.zone.x0, S.zone.x1), rnd(S.zone.y0, S.zone.y1), rnd(8, 16) * u, LIQ[i % LIQ.length]));
      S.tools = ['wrench', 'duck', 'pen'].map(kind => ({ kind, x: rnd(S.zone.x0, S.zone.x1), y: rnd(S.zone.y0, S.zone.y1), vx: rnd(-12, 12) * u, vy: rnd(-8, 8) * u, a: rnd(0, 6), va: rnd(-.6, .6) }));
      S.drops = []; S.rocks = []; for (let i = 0; i < 6; i++) S.rocks.push(rock(S, true)); S.meteors = []; S.sats = []; S.nextSat = 5; S.nextMeteor = 3;
      S.t = S.t || 0; S.reactorBoost = 0; S.screenBoost = 0; S.flare = 0; S.ev = null; S.nextEvent = 45;
      S.sci = { x: S.M(470, 0)[0], y: S.M(0, 250)[1], vx: 0, vy: 0, tx: S.M(470, 0)[0], ty: S.M(0, 250)[1], next: 1, rot: 0, rotV: 0, dir: -1, bub: null, bubT: 0, pose: null };
      S.sc = compact ? u * 1.0 : clamp(H * .17, 120, 190) / 1.12 / 122;
      S.dust = []; for (let i = 0; i < 50; i++) S.dust.push({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-4, 4), vy: rnd(-3, 3), a: rnd(.08, .3) });
    },
    bake(S, L) {
      const { W, H } = S;
      const bg = S.layer(); bg.k.drawImage(IMG.fond, S.bx0, S.by0, IMG.fond.width * S.kb, IMG.fond.height * S.kb); L.bg = bg;
      const md = S.layer(); md.k.drawImage(IMG.module, S.mx0, S.my0, MW * S.k, MH * S.k);
      // un voile froid sur le module pour qu'il se fonde dans la lumière de l'espace
      md.k.globalCompositeOperation = 'source-atop'; const g = md.k.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(20,40,80,.12)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); md.k.fillStyle = g; md.k.fillRect(-md.M, -md.M, W + 2 * md.M, H + 2 * md.M);
      L.module = md;
      // premier plan, regroupé par profondeur
      S.propPos = {};
      const byDepth = {};
      for (const p of PROPS) {
        const im = IMG[p.k], h = p.h * S.k, w = p.w ? p.w * S.k : im.width / im.height * h;
        const [x, y] = S.M(p.x, p.hang ? p.top : p.bottom - p.h);
        S.propPos[p.k] = { x, y, w, h };
        (byDepth[p.depth] = byDepth[p.depth] || []).push([im, x, y, w, h]);
      }
      S.front = Object.keys(byDepth).sort().map(dp => { const Ly = S.layer(); for (const [im, x, y, w, h] of byDepth[dp]) { Ly.k.save(); Ly.k.shadowColor = 'rgba(0,0,0,.55)'; Ly.k.shadowBlur = 18 * S.u; Ly.k.shadowOffsetY = 8 * S.u; Ly.k.drawImage(im, x, y, w, h); Ly.k.restore(); } return { L: Ly, depth: +dp }; });
      const vg = S.layer(); const gg = vg.k.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.max(W, H) * .78); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,.5)'); vg.k.fillStyle = gg; vg.k.fillRect(-vg.M, -vg.M, W + 2 * vg.M, H + 2 * vg.M); L.vign = vg;
    },
    update(S, dt) {
      const { u, W, H } = S, t = S.t, Z = S.zone;
      for (const b of S.blobs) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.ph += dt * (1 + 3 / Math.max(1, b.r / u));
        if (b.x < Z.x0 + b.r || b.x > Z.x1 - b.r) { b.vx *= -.9; b.x = clamp(b.x, Z.x0 + b.r, Z.x1 - b.r); b.wob = 1; }
        if (b.y < Z.y0 + b.r || b.y > Z.y1 - b.r) { b.vy *= -.9; b.y = clamp(b.y, Z.y0 + b.r, Z.y1 - b.r); b.wob = 1; }
        b.wob = Math.max(0, (b.wob || 0) - dt * 1.5);
      }
      for (let i = 0; i < S.blobs.length; i++) for (let j = i + 1; j < S.blobs.length; j++) {
        const a = S.blobs[i], b = S.blobs[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < a.r + b.r) {       // fusion : le volume est conservé
          const va = a.r ** 3, vb = b.r ** 3, vt = va + vb;
          a.x = (a.x * va + b.x * vb) / vt; a.y = (a.y * va + b.y * vb) / vt; a.vx = (a.vx * va + b.vx * vb) / vt; a.vy = (a.vy * va + b.vy * vb) / vt;
          a.col = mix(a.col, b.col, vb / vt); a.r = Math.cbrt(vt); a.wob = 1; S.blobs.splice(j, 1); j--;
          if (a.r > 30 * u && !S.merged) { S.merged = true; VK.say('merge', 'start'); setTimeout(() => split(S, a), 6000); }
        } else if (d < (a.r + b.r) * 4) { const f = 4 * u * dt / Math.max(d, 1); a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; }
      }
      for (const b of S.blobs) { const sp = Math.hypot(b.vx, b.vy), mx = 40 * u; if (sp > mx) { b.vx *= mx / sp; b.vy *= mx / sp; } }
      if (S.blobs.length < 3) S.blobs.push(blob(S, rnd(Z.x0, Z.x1), Z.y1 - 20 * u, rnd(8, 13) * u, pick(LIQ)));
      for (let i = S.drops.length - 1; i >= 0; i--) { const d = S.drops[i]; d.x += d.vx * dt; d.y += d.vy * dt; if ((d.life -= dt) <= 0) S.drops.splice(i, 1); }
      for (const o of S.tools) { o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.va * dt; if (o.x < Z.x0 || o.x > Z.x1) o.vx *= -1; if (o.y < Z.y0 || o.y > Z.y1) o.vy *= -1; o.x = clamp(o.x, Z.x0, Z.x1); o.y = clamp(o.y, Z.y0, Z.y1); }
      // dehors : astéroïdes, satellites, étoiles filantes
      for (let i = S.rocks.length - 1; i >= 0; i--) { const r = S.rocks[i]; r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.va * dt; if (r.x < -60 * u || r.x > W + 60 * u) S.rocks[i] = rock(S); }
      if (t > S.nextSat) { S.nextSat = t + rnd(9, 18); const [x0] = S.M(WIN_RECT[0], 0), [x1] = S.M(PORT[0] + PORT[2], 0); S.sats.push({ x: x1 + 20 * u, y: S.M(0, rnd(110, 200))[1], vx: -rnd(30, 60) * u, lim: x0 - 30 * u }); }
      for (let i = S.sats.length - 1; i >= 0; i--) { const s = S.sats[i]; s.x += s.vx * dt; if (s.x < s.lim) S.sats.splice(i, 1); }
      if (t > S.nextMeteor) { S.nextMeteor = t + (S.ev && S.ev.type === 'shower' ? rnd(.2, .6) : rnd(6, 14)); meteor(S); }
      for (let i = S.meteors.length - 1; i >= 0; i--) { const m = S.meteors[i]; m.x += m.vx * dt; m.y += m.vy * dt; if ((m.life -= dt) <= 0) S.meteors.splice(i, 1); }
      for (const d of S.dust) { d.x += d.vx * dt * u; d.y += d.vy * dt * u; if (d.x < 0) d.x = W; if (d.x > W) d.x = 0; if (d.y < 0) d.y = H; if (d.y > H) d.y = 0; }
      S.reactorBoost = Math.max(0, S.reactorBoost - dt * .5); S.screenBoost = Math.max(0, S.screenBoost - dt); S.flare = Math.max(0, S.flare - dt * .4);
      sciStep(S, dt);
      if (!S.ev && VK.MOTION === 'full' && t > S.nextEvent) { S.nextEvent = t + rnd(70, 140); const r = Math.random(); startEvent(S, r < .4 ? 'alert' : r < .7 ? 'flare' : 'shower'); }
      if (S.ev) {
        const e = t - S.ev.t0;
        if (S.ev.type === 'alert') { if (Math.random() < 3 * dt) S.rocks.push(Object.assign(rock(S), { vx: -rnd(80, 160) * u, s: rnd(6, 14) * u })); if (e > 10) { S.ev = null; S.dimT = 0; VK.say('alert', 'end'); } }
        else if (S.ev.type === 'flare') { if (e < 1) { S.flash = Math.max(S.flash, .55); S.flashCol = [255, 190, 110]; } if (e > 6) { S.ev = null; S.flashCol = null; } }
        else if (e > 10) { S.ev = null; VK.say('shower', 'end'); }
      }
    },
    draw(S, ctx, par) {
      const { W, H, u } = S, t = S.t, P = par.P;
      const oB = [par.x * P * .25, par.y * P * .12], oM = [par.x * P * .6, par.y * P * .3];
      // l'espace
      S.put(S.layers.bg, oB[0], oB[1]);
      ctx.save(); ctx.translate(oB[0], oB[1]);
      for (const s of STARS) { const [x, y] = S.B(s.x, s.y), a = Math.max(0, Math.sin(t * 1.3 + s.ph)); if (a > .3) { ctx.strokeStyle = `rgba(255,255,255,${a * .8})`; ctx.lineWidth = 1; const l = (2 + a * 5) * u; ctx.beginPath(); ctx.moveTo(x - l, y); ctx.lineTo(x + l, y); ctx.moveTo(x, y - l); ctx.lineTo(x, y + l); ctx.stroke(); } }
      for (const c of CITY) { const [x, y] = S.B(c.x, c.y), a = .35 + .35 * Math.sin(t * (2 + c.ph) + c.ph * 5); glow(ctx, x, y, 7 * u, [255, 200, 120], a * .6); }
      const [sx, sy] = S.B(40, 455); glow(ctx, sx, sy, (120 + Math.sin(t * 1.5) * 10 + S.flare * 300) * u, [255, 210, 150], .35 + S.flare * .6);
      for (const r of S.rocks) drawRock(ctx, r);
      for (const m of S.meteors) { const k = m.life / m.max; ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 1.6 * u; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * .1, m.y - m.vy * .1); ctx.stroke(); glow(ctx, m.x, m.y, 8 * u, [200, 220, 255], .6 * k); }
      for (const s of S.sats) { ctx.fillStyle = '#d0d8e2'; ctx.fillRect(s.x - 4 * u, s.y - 2 * u, 8 * u, 4 * u); ctx.fillStyle = '#3a6ad8'; ctx.fillRect(s.x - 14 * u, s.y - 1 * u, 9 * u, 2 * u); ctx.fillRect(s.x + 5 * u, s.y - 1 * u, 9 * u, 2 * u); if (Math.sin(t * 6) > .6) glow(ctx, s.x, s.y, 6 * u, [255, 80, 80], .9); }
      ctx.restore();
      // le module et ses lampes
      S.put(S.layers.module, oM[0], oM[1]);
      ctx.save(); ctx.translate(oM[0], oM[1]);
      const alert = S.ev && S.ev.type === 'alert', strobe = alert && Math.sin(t * 9) > 0;
      for (const l of LAMPS) { const [x, y] = S.M(l.x, l.y); const fl = .5 + .25 * Math.sin(t * 3 + l.ph) + (Math.random() < .01 ? -.4 : 0); glow(ctx, x, y, 26 * u, alert ? [255, 50, 50] : l.col, (alert ? (strobe ? .9 : .1) : fl * .45)); }
      ctx.restore();
      // le premier plan, et ce qui s'y anime
      for (const f of S.front) {
        const ox = par.x * P * f.depth, oy = par.y * P * f.depth * .5;
        S.put(f.L, ox, oy);
        if (f.depth === 1) drawReactorFx(ctx, S, ox, oy);
        if (f.depth === 1.15) drawScreensFx(ctx, S, ox, oy);
        if (f.depth === 1) { // ce qui flotte se trouve entre le module et la console
          for (const o of S.tools) drawTool(ctx, o, u);
          for (const b of S.blobs) drawBlob(ctx, b, u);
          for (const d of S.drops) { ctx.fillStyle = rgba(d.col, .85); ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.3); ctx.fill(); }
          const s = S.sci, an = S.propPos.reacteur;
          ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(an.x + an.w * .9, an.y + an.h * .55); ctx.quadraticCurveTo((an.x + s.x) / 2, Math.max(an.y + an.h * .55, s.y) + 50 * u, s.x - 14 * S.sc * s.dir, s.y - 70 * S.sc); ctx.stroke();
          VK.scientist(ctx, { x: s.x, foot: s.y + 50 * S.sc, sc: S.sc, dir: s.dir, suit: true, helmet: true, float: true, rot: s.rot, pose: s.pose, bub: s.bub });
        }
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const d of S.dust) { ctx.fillStyle = `rgba(180,220,255,${d.a})`; ctx.fillRect(d.x, d.y, 1.4 * u, 1.4 * u); } ctx.restore();
      if (alert) { ctx.fillStyle = `rgba(255,20,20,${strobe ? .12 : .04})`; ctx.fillRect(0, 0, W, H); }
      S.put(S.layers.vign);
    },
    hit(S, x, y) {
      const { u } = S;
      for (const b of S.blobs) if (Math.hypot(x - b.x, y - b.y) < b.r + 8 * u) return 'blob';
      if (Math.hypot(x - S.sci.x, y - (S.sci.y - 20 * S.sc)) < 60 * S.sc) return 'sci';
      for (const o of S.tools) if (Math.hypot(x - o.x, y - o.y) < 20 * u) return 'tool';
      const R = S.propPos.reacteur, C = S.propPos.console;
      if (x > R.x && x < R.x + R.w && y > R.y && y < R.y + R.h) return 'reactor';
      if (x > C.x && x < C.x + C.w && y > C.y && y < C.y + C.h * .55) return 'console';
      const [sx, sy] = S.B(40, 455); if (Math.hypot(x - sx, y - sy) < 70 * u) return 'sun';
      const [wx0, wy0] = S.M(WIN_RECT[0], WIN_RECT[1]), [wx1, wy1] = S.M(WIN_RECT[2], WIN_RECT[3]); if (x > wx0 && x < wx1 && y > wy0 && y < wy1) return 'space';
      const [px, py] = S.M(PORT[0], PORT[1]); if (Math.hypot(x - px, y - py) < PORT[2] * S.k * .85) return 'space';
      return null;
    },
    click(S, x, y, h) {
      const { u } = S;
      if (h === 'blob') split(S, S.blobs.find(b => Math.hypot(x - b.x, y - b.y) < b.r + 8 * u));
      else if (h === 'sci') { S.sci.rotV = 6.28 / 1.2; S.sci.bub = pick(['Wouhou !', '!', '✦']); S.sci.bubT = 1.6; }
      else if (h === 'tool') { const o = S.tools.find(o => Math.hypot(x - o.x, y - o.y) < 20 * u); o.vx = rnd(-70, 70) * u; o.vy = rnd(-40, 40) * u; o.va = rnd(-6, 6); }
      else if (h === 'reactor') { S.reactorBoost = 1.6; S.flash = .2; S.flashCol = [255, 120, 230]; setTimeout(() => { S.flashCol = null; }, 800); }
      else if (h === 'console') { S.screenBoost = 1.5; S.sci.bub = '?'; S.sci.bubT = 1.2; }
      else if (h === 'sun') { S.flare = 1; }
      else if (h === 'space') { meteor(S, x, y); }
    },
    accent(S, col) { const Z = S.zone; S.blobs.push(blob(S, rnd(Z.x0, Z.x1), Z.y1 - 20 * S.u, 10 * S.u, col)); },
    event(S, type) { startEvent(S, type); },
    secret(S) { startEvent(S, 'shower'); S.sci.bub = '✦✦✦'; S.sci.bubT = 2; }
  });

  /* ---------- pièces ---------- */
  function blob(S, x, y, r, col) { return { x, y, r, col: col.slice(), vx: rnd(-14, 14) * S.u, vy: rnd(-10, 10) * S.u, ph: rnd(0, 6), wob: 0 }; }
  function split(S, b) {
    if (!b) return; S.merged = false;
    const i = S.blobs.indexOf(b); if (i < 0) return; S.blobs.splice(i, 1);
    const n = b.r > 20 * S.u ? 4 : 2, r = b.r / Math.cbrt(n);
    for (let k = 0; k < n; k++) { const a = k / n * 6.28 + rnd(0, .5), nb = blob(S, b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, r, b.col); nb.vx = Math.cos(a) * 30 * S.u; nb.vy = Math.sin(a) * 30 * S.u; nb.wob = 1; S.blobs.push(nb); }
    for (let k = 0; k < 10; k++) { const a = rnd(0, 6.28); S.drops.push({ x: b.x, y: b.y, vx: Math.cos(a) * rnd(30, 80) * S.u, vy: Math.sin(a) * rnd(30, 80) * S.u, r: rnd(1, 2.5) * S.u, life: rnd(.6, 1.4), col: b.col }); }
  }
  function drawBlob(ctx, b, u) {
    const wob = .06 + b.wob * .18, sx = 1 + Math.sin(b.ph * 2) * wob, sy = 1 - Math.sin(b.ph * 2) * wob;
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(sx, sy);
    glow(ctx, 0, 0, b.r * 2.6, b.col, .3);
    const g = ctx.createRadialGradient(-b.r * .35, -b.r * .35, b.r * .1, 0, 0, b.r);
    g.addColorStop(0, rgba(lighten(b.col, .7), .95)); g.addColorStop(.55, rgba(b.col, .78)); g.addColorStop(1, rgba(darken(b.col, .5), .9));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-b.r * .35, -b.r * .42, b.r * .28, b.r * .16, -.6, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function drawTool(ctx, o, u) {
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
    if (o.kind === 'wrench') { ctx.fillStyle = '#b8c2ce'; ctx.fillRect(-14 * u, -2.5 * u, 24 * u, 5 * u); ctx.beginPath(); ctx.arc(12 * u, 0, 6 * u, 0, 6.3); ctx.fill(); ctx.fillStyle = '#141c29'; ctx.fillRect(12 * u, -2.5 * u, 8 * u, 5 * u); }
    else if (o.kind === 'pen') { ctx.fillStyle = '#ff5fc8'; ctx.fillRect(-12 * u, -2 * u, 20 * u, 4 * u); ctx.fillStyle = '#e8eef4'; ctx.beginPath(); ctx.moveTo(8 * u, -2 * u); ctx.lineTo(14 * u, 0); ctx.lineTo(8 * u, 2 * u); ctx.fill(); }
    else { ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.ellipse(0, 3 * u, 11 * u, 7 * u, 0, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(6 * u, -5 * u, 6 * u, 0, 6.3); ctx.fill(); ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.moveTo(11 * u, -5 * u); ctx.lineTo(17 * u, -3 * u); ctx.lineTo(11 * u, -2 * u); ctx.fill(); ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(8 * u, -6 * u, 1.2 * u, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
  function rock(S, anywhere) {
    const { W, u } = S, [, y0] = S.M(0, 60), [, y1] = S.M(0, 280);
    return { x: anywhere ? rnd(0, W) : W + 40 * u, y: rnd(y0, y1), vx: -rnd(4, 14) * u, vy: rnd(-1, 1) * u, a: rnd(0, 6), va: rnd(-.5, .5), s: rnd(3, 9) * u, seed: Math.random() };
  }
  function drawRock(ctx, r) {
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a);
    ctx.fillStyle = '#4a4440'; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, rr = r.s * (.75 + .3 * Math.sin(r.seed * 50 + i * 2.3)); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,220,180,.35)'; ctx.beginPath(); ctx.arc(-r.s * .3, -r.s * .3, r.s * .35, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function meteor(S, x, y) {
    const { W, u } = S, [, y0] = S.M(0, 90);
    S.meteors.push({ x: x != null ? x : rnd(W * .2, W * .9), y: y != null ? y : y0 + rnd(0, 60) * u, vx: -rnd(300, 520) * u, vy: rnd(120, 200) * u, life: .7, max: .7 });
  }
  function drawReactorFx(ctx, S, ox, oy) {
    const R = S.propPos.reacteur, t = S.t, u = S.u, b = S.reactorBoost;
    const cx = R.x + R.w * .5 + ox, cy = R.y + R.h * .42 + oy, h = R.h * .42, w = R.w * .28;
    glow(ctx, cx, cy, R.w * (.9 + b * .6), [255, 100, 230], .35 + Math.sin(t * 3) * .08 + b * .4);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = (.9 + b) * u; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < 2 + Math.round(b * 3); k++) {
      ctx.strokeStyle = k % 2 ? `rgba(255,200,255,${.35 + b * .3})` : `rgba(170,240,255,${.3 + b * .3})`;
      ctx.beginPath(); for (let i = 0; i <= 18; i++) { const yy = cy - h / 2 + h * i / 18, xx = cx + (Math.sin(t * (5 + k) + i * .7 + k * 2) * .7 + Math.sin(t * 13 + i * 2.1 + k) * .3) * w * .8 * Math.sin(i / 18 * Math.PI); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
    }
    ctx.restore();
  }
  function drawScreensFx(ctx, S, ox, oy) {
    const C = S.propPos.console, im = IMG.console, t = S.t, u = S.u, b = S.screenBoost;
    for (const s of SCREENS) { const x = C.x + s.x / im.width * C.w + ox, y = C.y + s.y / im.height * C.h + oy; glow(ctx, x, y, (14 + b * 10) * u, [90, 200, 255], .18 + .12 * Math.sin(t * 4 + s.ph) + b * .3); }
    if (Math.random() < .03 + b * .3) { const s = pick(SCREENS); if (s) { const x = C.x + s.x / im.width * C.w + ox, y = C.y + s.y / im.height * C.h + oy; glow(ctx, x, y, 22 * u, [200, 240, 255], .6); } }
  }
  function sciStep(S, dt) {
    const s = S.sci, u = S.u, Z = S.zone;
    if (s.bub && (s.bubT -= dt) <= 0) s.bub = null;
    if (S.t > s.next) { s.next = S.t + rnd(4, 9); s.tx = rnd(Z.x0 + 80 * u, Z.x1 - 80 * u); s.ty = rnd(Z.y0 + 40 * u, Z.y1 - 20 * u); s.pose = pick([null, null, 'tool', 'notes', 'reach', 'look']); if (Math.random() < .25) { s.bub = pick(['♪', '✦', '!', '☄']); s.bubT = 1.4; } }
    if (S.ev && S.ev.type === 'alert') { s.pose = 'reach'; s.tx = S.propPos.reacteur.x + S.propPos.reacteur.w + 30 * u; }
    const ax = (s.tx - s.x) * .6, ay = (s.ty - s.y) * .6; s.vx += (ax - s.vx) * dt * .8; s.vy += (ay - s.vy) * dt * .8;
    s.x += s.vx * dt; s.y += s.vy * dt + Math.sin(S.t * 1.1) * 6 * u * dt;
    if (Math.abs(s.vx) > 4 * u) s.dir = s.vx > 0 ? 1 : -1;
    if (s.rotV) { s.rot += s.rotV * dt; if (s.rot > 6.28) { s.rot = 0; s.rotV = 0; } } else s.rot = Math.sin(S.t * .6) * .12;
  }
  function startEvent(S, type) {
    if (S.ev) return; S.ev = { type, t0: S.t };
    if (type === 'alert') { S.dimT = .12; S.sci.bub = '!!'; S.sci.bubT = 2; VK.say('alert', 'start'); }
    else if (type === 'flare') { S.flare = 1; S.sci.bub = '☀'; S.sci.bubT = 2; VK.say('flare', 'start'); }
    else { S.nextMeteor = S.t; S.sci.bub = '✦'; S.sci.bubT = 2; VK.say('shower', 'start'); }
  }
}).catch(err => console.error('Station : images introuvables', err));
})();
