/* ==========================================================================
   CODEX MENTAL · LAB — univers orbital, salle n°1 : la station
   Module de recherche en apesanteur : hublot sur une planète qui tourne,
   réacteur à plasma, serre hydroponique, bras robotisé, et des bulles de
   liquide qui flottent, se rencontrent et fusionnent (le volume est conservé).
   ========================================================================== */
(() => {
'use strict';
const { rnd, pick, clamp, seeded, rgba, metal, rr, glow, mix, lighten, darken, STEEL, WHITE } = VK;
const LIQ = [[95, 242, 255], [255, 95, 200], [160, 120, 255], [120, 255, 160], [255, 190, 80]];

/* texture de la planète : continents, mers et nuages, calculés une fois */
function planetTexture(seed) {
  const w = 512, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
  const k = c.getContext('2d'), r = seeded(seed), img = k.createImageData(w, h), d = img.data;
  const blobs = []; for (let i = 0; i < 22; i++) blobs.push([r() * w, r() * h * .7 + h * .15, 14 + r() * 42, r()]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0; for (const [bx, by, br, bw] of blobs) { let dx = Math.abs(x - bx); dx = Math.min(dx, w - dx); const q = 1 - (dx * dx + (y - by) ** 2) / (br * br); if (q > 0) v += q * (.6 + bw * .6); }
    v += Math.sin(x * .07 + y * .05) * .08 + Math.sin(x * .19 - y * .13) * .05;
    const lat = Math.abs(y / h - .5) * 2, i = (y * w + x) * 4;
    let col;
    if (lat > .86) col = [235, 245, 250];
    else if (v > .7) col = v > 1.5 ? [170, 150, 110] : (lat > .6 ? [96, 130, 90] : [58, 120, 66]);
    else col = mix([20, 70, 140], [30, 110, 170], Math.min(1, v * 1.5));
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  k.putImageData(img, 0, 0);
  const cl = document.createElement('canvas'); cl.width = w; cl.height = h; const q = cl.getContext('2d');
  for (let i = 0; i < 140; i++) { q.globalAlpha = .18 + r() * .25; const x = r() * w, y = r() * h, s = 20 + r() * 70; q.drawImage(VK.puff(), x - s, y - s * .3, s * 2, s * .6); if (x + s > w) q.drawImage(VK.puff(), x - s - w, y - s * .3, s * 2, s * .6); }
  return { land: c, clouds: cl };
}

VK.room({
  panel(S) {
    const { W, u, compact } = S;
    const SL = compact ? 10 : Math.max(260 * u, W * .15), SR = SL;
    return { TOP: compact ? 62 : 92 * u, BOT: compact ? 160 * u : 240 * u, SL, SR };
  },
  build(S) {
    const { W, H, u, compact, SL, SR } = S;
    S.tex = S.tex || planetTexture(7);
    S.win = compact ? { cx: W * .82, cy: 34, r: 26 } : { cx: W - SR * .5, cy: S.TOP + (H - S.TOP - S.BOT) * .45, r: Math.min(SR * .4, 130 * u) };
    S.reactor = compact ? null : { cx: Math.max(SL * .55, VK.doorRight(H) + 60 * u), top: S.TOP + 40 * u, bot: H - 300 * u, w: Math.min(SL * .5, 120 * u) };
    S.spin = 0; S.spinSp = 1; S.cloud = 0;
    S.zone = { x0: compact ? 0 : SL * .1, x1: W - (compact ? 0 : SR * .1), y0: H - S.BOT + 20 * u, y1: H - 40 * u };
    S.blobs = [];
    const r = seeded(3); for (let i = 0; i < (compact ? 4 : 7); i++) S.blobs.push(blob(S, rnd(S.zone.x0 + 80 * u, S.zone.x1 - 80 * u), rnd(S.zone.y0, S.zone.y1 - 30 * u), (8 + r() * 10) * u, LIQ[i % LIQ.length]));
    S.tools = [{ kind: 'wrench' }, { kind: 'pen' }, { kind: 'duck' }].map(t => Object.assign(t, { x: rnd(S.zone.x0 + 100 * u, S.zone.x1 - 100 * u), y: rnd(S.zone.y0, S.zone.y1), vx: rnd(-12, 12) * u, vy: rnd(-8, 8) * u, a: rnd(0, 6), va: rnd(-.6, .6) }));
    S.debris = []; S.sats = []; S.nextSat = 6; S.drops = [];
    S.arm = { a1: -.6, a2: 1.1, t1: -.6, t2: 1.1, next: 3 };
    S.sci = { x: W * .5, y: S.zone.y0 + 60 * u, vx: 0, vy: 0, tx: W * .5, ty: S.zone.y0 + 60 * u, next: 2, rot: 0, rotV: 0, dir: 1, bub: null, bubT: 0, pose: null };
    S.sc = compact ? u * 1.0 : clamp(H * .17, 120, 190) / 1.12 / 122;
    S.ev = null; S.nextEvent = 55; S.alien = 0; S.plasma = 0;
    S.stars = []; for (let i = 0; i < 70; i++) S.stars.push([r(), r(), r()]);
  },
  bake(S, L) {
    const { W, H, u, compact } = S;
    // --- parois du module ---
    const wall = S.layer(), k = wall.k;
    let g = k.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b2433'); g.addColorStop(.5, '#141c29'); g.addColorStop(1, '#0c121c');
    k.fillStyle = g; k.fillRect(-wall.M, -wall.M, W + 2 * wall.M, H + 2 * wall.M);
    const pw = 150 * u, ph = 110 * u;
    for (let y = -wall.M, row = 0; y < H + wall.M; y += ph, row++) for (let x = -wall.M - (row % 2) * pw / 2; x < W + wall.M; x += pw) {
      const pg = k.createLinearGradient(x, y, x, y + ph); pg.addColorStop(0, 'rgba(255,255,255,.045)'); pg.addColorStop(1, 'rgba(255,255,255,.01)');
      k.fillStyle = pg; rr(k, x + 3 * u, y + 3 * u, pw - 6 * u, ph - 6 * u, 10 * u); k.fill();
      k.strokeStyle = 'rgba(0,0,0,.35)'; k.lineWidth = 1.5 * u; k.stroke();
      for (const [sx, sy] of [[x + 12 * u, y + 12 * u], [x + pw - 12 * u, y + 12 * u], [x + 12 * u, y + ph - 12 * u], [x + pw - 12 * u, y + ph - 12 * u]]) { k.fillStyle = 'rgba(160,180,200,.25)'; k.beginPath(); k.arc(sx, sy, 2.5 * u, 0, 6.3); k.fill(); }
    }
    // poutres et rampes de maintien
    for (const y of [S.TOP * .2, H - 26 * u]) { k.fillStyle = metal(k, 0, y, 0, y + 18 * u, ['#c9d2dc', '#8e99a8', '#59636f', '#2d333c']); k.fillRect(-wall.M, y, W + 2 * wall.M, 18 * u); }
    for (let x = 80 * u; x < W; x += 240 * u) { k.strokeStyle = '#d0d8e2'; k.lineWidth = 4 * u; k.lineCap = 'round'; k.beginPath(); k.moveTo(x, S.TOP * .62); k.lineTo(x + 70 * u, S.TOP * .62); k.stroke(); k.fillStyle = '#ffcf4a'; k.fillRect(x + 30 * u, S.TOP * .62 - 2 * u, 10 * u, 4 * u); }
    // faisceaux de câbles au plafond
    for (const [col, off] of [['#3a6a9a', 0], ['#9a3a5a', 5], ['#5a5a6a', 10]]) { k.strokeStyle = col; k.lineWidth = 3.5 * u; k.beginPath(); k.moveTo(-10, S.TOP * .42 + off * u); for (let x = 0; x <= W + 20; x += 120 * u) k.quadraticCurveTo(x + 60 * u, S.TOP * .42 + (22 + off) * u, x + 120 * u, S.TOP * .42 + off * u); k.stroke(); }
    // serre hydroponique en bas
    if (!compact) {
      const gy = H - 112 * u;
      for (let x = S.SL * .9, i = 0; x < W - S.SR * .9 - 120 * u; x += 200 * u, i++) {
        k.fillStyle = '#1e2836'; rr(k, x, gy, 170 * u, 40 * u, 8 * u); k.fill(); k.strokeStyle = 'rgba(160,190,220,.35)'; k.lineWidth = 1.5 * u; k.stroke();
        k.fillStyle = 'rgba(190,120,255,.18)'; rr(k, x + 6 * u, gy - 54 * u, 158 * u, 54 * u, 6 * u); k.fill();
        k.fillStyle = '#c9a6ff'; k.fillRect(x + 10 * u, gy - 56 * u, 150 * u, 3 * u);
      }
    }
    L.wall = wall;
    // --- cadres fixes : hublot, réacteur ---
    const fr = S.layer(), f = fr.k, w = S.win;
    f.fillStyle = metal(f, w.cx - w.r, w.cy - w.r, w.cx + w.r, w.cy + w.r, ['#e8eef4', '#aab6c4', '#5d6876', '#2a313a']); f.beginPath(); f.arc(w.cx, w.cy, w.r + 18 * u, 0, 6.3); f.fill();
    f.save(); f.globalCompositeOperation = 'destination-out'; f.beginPath(); f.arc(w.cx, w.cy, w.r, 0, 6.3); f.fill(); f.restore();
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; f.fillStyle = '#1b222b'; f.beginPath(); f.arc(w.cx + Math.cos(a) * (w.r + 10 * u), w.cy + Math.sin(a) * (w.r + 10 * u), 2.6 * u, 0, 6.3); f.fill(); }
    if (S.reactor) {
      const R = S.reactor;
      f.fillStyle = metal(f, R.cx - R.w, 0, R.cx + R.w, 0, ['#c9d2dc', '#8e99a8', '#4a535e', '#20252c']);
      rr(f, R.cx - R.w * .62, R.top - 30 * u, R.w * 1.24, 30 * u, 8 * u); f.fill(); rr(f, R.cx - R.w * .62, R.bot, R.w * 1.24, 34 * u, 8 * u); f.fill();
      for (const sx of [-.55, .55]) { f.fillStyle = metal(f, R.cx + sx * R.w - 6 * u, 0, R.cx + sx * R.w + 6 * u, 0, STEEL); f.fillRect(R.cx + sx * R.w - 5 * u, R.top, 10 * u, R.bot - R.top); }
      f.fillStyle = '#ffcf4a'; for (let y = R.bot + 8 * u; y < R.bot + 30 * u; y += 8 * u) f.fillRect(R.cx - R.w * .55, y, R.w * 1.1, 3 * u);
    }
    L.frame = fr;
    const vg = S.layer(); g = vg.k.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); vg.k.fillStyle = g; vg.k.fillRect(-vg.M, -vg.M, W + 2 * vg.M, H + 2 * vg.M);
    L.vign = vg;
  },
  update(S, dt) {
    const { u, W } = S, t = S.t, Z = S.zone;
    S.spin += dt * .012 * S.spinSp; S.cloud += dt * .02 * S.spinSp; S.spinSp += (1 - S.spinSp) * dt * .4;
    // bulles en apesanteur : rebonds doux, attraction faible, fusion
    for (const b of S.blobs) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.ph += dt * (1 + 3 / Math.max(1, b.r / u));
      if (b.x < Z.x0 + b.r || b.x > Z.x1 - b.r) { b.vx *= -.9; b.x = clamp(b.x, Z.x0 + b.r, Z.x1 - b.r); b.wob = 1; }
      if (b.y < Z.y0 + b.r || b.y > Z.y1 - b.r) { b.vy *= -.9; b.y = clamp(b.y, Z.y0 + b.r, Z.y1 - b.r); b.wob = 1; }
      b.wob = Math.max(0, (b.wob || 0) - dt * 1.5);
    }
    for (let i = 0; i < S.blobs.length; i++) for (let j = i + 1; j < S.blobs.length; j++) {
      const a = S.blobs[i], b = S.blobs[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < a.r + b.r) {   // fusion : le volume se conserve
        const va = a.r ** 3, vb = b.r ** 3, vt = va + vb;
        a.x = (a.x * va + b.x * vb) / vt; a.y = (a.y * va + b.y * vb) / vt; a.vx = (a.vx * va + b.vx * vb) / vt; a.vy = (a.vy * va + b.vy * vb) / vt;
        a.col = mix(a.col, b.col, vb / vt); a.r = Math.cbrt(vt); a.wob = 1; S.blobs.splice(j, 1); j--;
        if (a.r > 28 * u && !S.merged) { S.merged = true; VK.say('merge', 'start'); setTimeout(() => split(S, a), 6000); }
      } else if (d < (a.r + b.r) * 4) { const f = 4 * u * dt / Math.max(d, 1); a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; }
    }
    for (const b of S.blobs) { const sp = Math.hypot(b.vx, b.vy), mx = 40 * u; if (sp > mx) { b.vx *= mx / sp; b.vy *= mx / sp; } }
    if (S.blobs.length < 3) S.blobs.push(blob(S, rnd(Z.x0 + 80 * u, Z.x1 - 80 * u), Z.y1 - 20 * u, rnd(7, 12) * u, pick(LIQ)));
    for (let i = S.drops.length - 1; i >= 0; i--) { const d = S.drops[i]; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; if (d.life <= 0) S.drops.splice(i, 1); }
    for (const o of S.tools) { o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.va * dt; if (o.x < Z.x0 || o.x > Z.x1) o.vx *= -1; if (o.y < Z.y0 || o.y > Z.y1) o.vy *= -1; o.x = clamp(o.x, Z.x0, Z.x1); o.y = clamp(o.y, Z.y0, Z.y1); }
    // bras robotisé
    const A = S.arm; if (t > A.next) { A.t1 = rnd(-1.2, .2); A.t2 = rnd(.4, 2); A.next = t + rnd(3, 7); }
    A.a1 += (A.t1 - A.a1) * dt * 1.2; A.a2 += (A.t2 - A.a2) * dt * 1.2;
    // satellites qui passent devant le hublot
    if (t > S.nextSat) { S.nextSat = t + rnd(8, 16); S.sats.push({ k: 0, y: rnd(-.6, .6), sp: rnd(.08, .16), kind: pick(['sat', 'sat', 'iss']) }); }
    for (let i = S.sats.length - 1; i >= 0; i--) { S.sats[i].k += S.sats[i].sp * dt; if (S.sats[i].k > 1) S.sats.splice(i, 1); }
    for (let i = S.debris.length - 1; i >= 0; i--) { const d = S.debris[i]; d.k += d.sp * dt; d.a += d.va * dt; if (d.k > 1) S.debris.splice(i, 1); }
    if (S.plasma > 0) S.plasma -= dt;
    if (S.alien > 0) S.alien -= dt;
    sciStep(S, dt);
    // événements rares
    if (!S.ev && VK.MOTION === 'full' && t > S.nextEvent) { S.nextEvent = t + rnd(80, 150); Math.random() < .55 ? startAlert(S) : startFlare(S); }
    if (S.ev) {
      const e = t - S.ev.t0;
      if (S.ev.type === 'alert') { if (Math.random() < 4 * dt) S.debris.push({ k: 0, y: rnd(-.7, .7), sp: rnd(.4, .8), a: 0, va: rnd(-4, 4), s: rnd(3, 9) }); if (e > 10) { S.ev = null; S.dimT = 0; VK.say('alert', 'end'); } }
      if (S.ev && S.ev.type === 'flare') { if (e < 1.2) { S.flash = Math.max(S.flash, .5); S.flashCol = [255, 170, 80]; } if (e > 7) { S.ev = null; S.flashCol = null; } }
    }
  },
  draw(S, ctx, par) {
    const { W, H, u } = S, t = S.t, P = par.P;
    const ox1 = par.x * P * .25, oy1 = par.y * P * .12, ox2 = par.x * P * .6, oy2 = par.y * P * .3;
    S.put(S.layers.wall, ox1, oy1);
    // lumières du module (rouges pendant l'alerte)
    const alert = S.ev && S.ev.type === 'alert', strobe = alert && Math.sin(t * 10) > 0;
    ctx.save(); ctx.translate(ox1, oy1);
    for (let x = 60 * u; x < W; x += 240 * u) { const col = alert ? (strobe ? [255, 60, 60] : [80, 10, 10]) : [95, 242, 255]; ctx.fillStyle = rgba(col, .9); ctx.fillRect(x, S.TOP * .2 + 18 * u, 90 * u, 3 * u); VK.glow(ctx, x + 45 * u, S.TOP * .2 + 24 * u, 60 * u, col, alert ? .5 : .25); }
    ctx.restore();
    // le hublot et la planète
    drawWindow(ctx, S, ox2, oy2);
    // le réacteur à plasma
    if (S.reactor) drawReactor(ctx, S, ox2, oy2);
    S.put(S.layers.frame, ox2, oy2);
    // plantes de la serre
    if (!S.compact) {
      ctx.save(); ctx.translate(ox2 * .6, 0);
      for (let x = S.SL * .9 + 20 * u; x < W - S.SR * .9 - 120 * u; x += 200 * u) for (let i = 0; i < 6; i++) {
        const px = x + i * 24 * u, py = H - 112 * u, sw = Math.sin(t * .8 + i + x) * 4 * u;
        ctx.strokeStyle = '#3fbf6a'; ctx.lineWidth = 2.5 * u; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + sw, py - 24 * u, px + sw * 1.5, py - 40 * u); ctx.stroke();
        ctx.fillStyle = '#5be08a'; ctx.beginPath(); ctx.ellipse(px + sw * 1.5, py - 40 * u, 6 * u, 3 * u, .5, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(px + sw, py - 26 * u, 5 * u, 2.5 * u, -.5, 0, 6.3); ctx.fill();
      }
      for (let x = S.SL * .9; x < W - S.SR * .9 - 120 * u; x += 200 * u) VK.glow(ctx, x + 85 * u, H - 150 * u, 90 * u, [190, 120, 255], .18);
      ctx.restore();
    }
    // bras robotisé du plafond
    drawArm(ctx, S, ox2);
    // objets et bulles en apesanteur
    for (const o of S.tools) drawTool(ctx, o, u);
    for (const b of S.blobs) drawBlob(ctx, b, t, u);
    for (const d of S.drops) { ctx.fillStyle = rgba(d.col, .85); ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.3); ctx.fill(); }
    // le savant flotte, attaché par un câble
    const s = S.sci, anchor = [S.compact ? 20 : S.SL * .95, S.zone.y0 + 10 * u];
    ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(anchor[0], anchor[1]); ctx.quadraticCurveTo((anchor[0] + s.x) / 2, Math.max(anchor[1], s.y) + 40 * u, s.x - 14 * S.sc * s.dir, s.y - 70 * S.sc); ctx.stroke();
    ctx.fillStyle = '#c9d2dc'; ctx.beginPath(); ctx.arc(anchor[0], anchor[1], 6 * u, 0, 6.3); ctx.fill();
    VK.scientist(ctx, { x: s.x, foot: s.y + 50 * S.sc, sc: S.sc, dir: s.dir, suit: true, helmet: true, float: true, rot: s.rot, pose: s.pose, bub: s.bub });
    S.put(S.layers.vign);
  },
  drawDark(S, ctx) {},
  hit(S, x, y) {
    const { u } = S, w = S.win;
    for (const b of S.blobs) if (Math.hypot(x - b.x, y - b.y) < b.r + 6 * u) return 'blob';
    if (Math.hypot(x - w.cx, y - w.cy) < w.r) return 'planet';
    if (S.reactor && x > S.reactor.cx - S.reactor.w * .6 && x < S.reactor.cx + S.reactor.w * .6 && y > S.reactor.top && y < S.reactor.bot) return 'reactor';
    if (Math.hypot(x - S.sci.x, y - (S.sci.y - 20 * S.sc)) < 60 * S.sc) return 'sci';
    for (const o of S.tools) if (Math.hypot(x - o.x, y - o.y) < 18 * u) return 'tool';
    return null;
  },
  click(S, x, y, h) {
    const { u } = S;
    if (h === 'blob') { const b = S.blobs.find(b => Math.hypot(x - b.x, y - b.y) < b.r + 6 * u); split(S, b); }
    else if (h === 'planet') S.spinSp = 14;
    else if (h === 'reactor') S.plasma = 2.5;
    else if (h === 'sci') { S.sci.rotV = 6.28 / 1.2; S.sci.bub = pick(['Wouhou !', '!', '✦']); S.sci.bubT = 1.6; }
    else if (h === 'tool') { const o = S.tools.find(o => Math.hypot(x - o.x, y - o.y) < 18 * u); o.vx = rnd(-60, 60) * u; o.vy = rnd(-40, 40) * u; o.va = rnd(-6, 6); }
  },
  accent(S, col) { const Z = S.zone; S.blobs.push(blob(S, rnd(Z.x0 + 80 * S.u, Z.x1 - 80 * S.u), Z.y1 - 20 * S.u, 9 * S.u, col)); },
  event(S, type) { type === 'flare' ? startFlare(S) : startAlert(S); },
  secret(S) { S.alien = 6; S.sci.bub = '?!'; S.sci.bubT = 2; VK.say('ufo', 'start'); }
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
function drawBlob(ctx, b, t, u) {
  const wob = .06 + b.wob * .18, sx = 1 + Math.sin(b.ph * 2) * wob, sy = 1 - Math.sin(b.ph * 2) * wob;
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(sx, sy);
  VK.glow(ctx, 0, 0, b.r * 2.6, b.col, .25);
  const g = ctx.createRadialGradient(-b.r * .35, -b.r * .35, b.r * .1, 0, 0, b.r);
  g.addColorStop(0, rgba(lighten(b.col, .7), .95)); g.addColorStop(.55, rgba(b.col, .8)); g.addColorStop(1, rgba(darken(b.col, .45), .9));
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
function drawWindow(ctx, S, ox, oy) {
  const { u } = S, w = S.win, t = S.t, cx = w.cx + ox, cy = w.cy + oy, r = w.r;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.clip();
  ctx.fillStyle = '#01030a'; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  for (const [sx, sy, b] of S.stars) { ctx.fillStyle = `rgba(255,255,255,${.3 + b * .6})`; ctx.fillRect(cx - r + sx * 2 * r, cy - r + sy * 2 * r, u, u); }
  // la planète, vue de biais : sa texture défile pour la faire tourner
  const pr = r * 1.15, px = cx + r * .25, py = cy + r * .55;
  ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.3); ctx.clip();
  const tw = pr * 4, off = ((S.spin % 1) + 1) % 1 * tw;
  for (let k = -1; k <= 1; k++) ctx.drawImage(S.tex.land, px - pr - off + k * tw, py - pr, tw, pr * 2);
  const off2 = ((S.cloud % 1) + 1) % 1 * tw;
  ctx.globalAlpha = .85; for (let k = -1; k <= 1; k++) ctx.drawImage(S.tex.clouds, px - pr - off2 + k * tw, py - pr, tw, pr * 2); ctx.globalAlpha = 1;
  // relief sphérique + terminateur jour/nuit
  let g = ctx.createRadialGradient(px - pr * .45, py - pr * .45, pr * .1, px, py, pr); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,.55)');
  ctx.fillStyle = g; ctx.fillRect(px - pr, py - pr, 2 * pr, 2 * pr);
  g = ctx.createLinearGradient(px - pr, py, px + pr, py); g.addColorStop(0, 'rgba(0,0,8,0)'); g.addColorStop(.55, 'rgba(0,0,8,0)'); g.addColorStop(.8, 'rgba(0,2,12,.85)'); g.addColorStop(1, 'rgba(0,2,12,.95)');
  ctx.fillStyle = g; ctx.fillRect(px - pr, py - pr, 2 * pr, 2 * pr);
  const rs = seeded(21); for (let i = 0; i < 40; i++) { const lx = px + pr * (.45 + rs() * .5), ly = py - pr * .6 + rs() * pr * 1.2; ctx.fillStyle = `rgba(255,210,120,${.5 + .4 * Math.sin(t * 2 + i)})`; ctx.fillRect(lx, ly, 1.2 * u, 1.2 * u); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(120,190,255,.6)'; ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.arc(px, py, pr + 2 * u, 3.4, 5.2); ctx.stroke();
  VK.glow(ctx, px - pr * .7, py - pr * .7, pr * .9, [120, 190, 255], .2);
  // satellites et débris
  for (const s of S.sats) { const x = cx - r + s.k * 2 * r, y = cy + s.y * r * .7; ctx.fillStyle = '#c9d2dc'; ctx.fillRect(x - 3 * u, y - 2 * u, 6 * u, 4 * u); ctx.fillStyle = '#3a6ad8'; ctx.fillRect(x - (s.kind === 'iss' ? 16 : 10) * u, y - 1 * u, (s.kind === 'iss' ? 10 : 6) * u, 2 * u); ctx.fillRect(x + 3 * u, y - 1 * u, (s.kind === 'iss' ? 13 : 7) * u, 2 * u); if (Math.sin(t * 6) > .6) VK.glow(ctx, x, y, 6 * u, [255, 80, 80], .8); }
  for (const d of S.debris) { const x = cx + r - d.k * 2 * r, y = cy + d.y * r; ctx.save(); ctx.translate(x, y); ctx.rotate(d.a); ctx.fillStyle = '#8e99a8'; ctx.fillRect(-d.s * u / 2, -d.s * u / 3, d.s * u, d.s * u * .66); ctx.restore(); }
  // visiteur au hublot (secret)
  if (S.alien > 0) { const k = Math.min(1, (6 - S.alien) * 2, S.alien * 2), ay = cy + r - r * .55 * k; ctx.fillStyle = '#8fd88a'; ctx.beginPath(); ctx.ellipse(cx - r * .2, ay, r * .3, r * .38, 0, 0, 6.3); ctx.fill(); for (const dx of [-.12, .12]) { ctx.fillStyle = '#05080a'; ctx.beginPath(); ctx.ellipse(cx - r * .2 + dx * r, ay - r * .05, r * .08, r * .13, dx * 2, 0, 6.3); ctx.fill(); } ctx.fillStyle = '#8fd88a'; ctx.beginPath(); ctx.ellipse(cx + r * .2, ay + r * .1 + Math.sin(t * 9) * 4 * u, r * .07, r * .14, Math.sin(t * 9) * .5, 0, 6.3); ctx.fill(); }
  // reflet du verre
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 6 * u; ctx.beginPath(); ctx.arc(cx, cy, r * .82, 3.7, 4.5); ctx.stroke();
  if (S.ev && S.ev.type === 'flare') VK.glow(ctx, cx, cy, r * 1.6, [255, 170, 80], .5);
}
function drawReactor(ctx, S, ox, oy) {
  const { u } = S, R = S.reactor, t = S.t, cx = R.cx + ox, cy = (R.top + R.bot) / 2 + oy, h = R.bot - R.top;
  const boost = S.plasma > 0 ? 1 : 0;
  ctx.fillStyle = 'rgba(40,10,60,.55)'; rr(ctx, cx - R.w * .5, R.top + oy, R.w, h, 14 * u); ctx.fill();
  // anneau de plasma vu de biais
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) { ctx.strokeStyle = i === 1 ? `rgba(255,120,230,${.5 + boost * .4})` : `rgba(95,242,255,${.35 + boost * .3})`; ctx.lineWidth = (10 - i * 3) * u; ctx.beginPath(); ctx.ellipse(cx, cy, R.w * .38, h * .38, Math.sin(t * .4) * .2, 0, 6.3); ctx.stroke(); }
  for (let i = 0; i < 18; i++) { const a = t * (1.6 + boost * 3) + i / 18 * 6.28; ctx.fillStyle = i % 2 ? 'rgba(255,200,255,.9)' : 'rgba(180,250,255,.9)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R.w * .38, cy + Math.sin(a) * h * .38, 2.2 * u, 0, 6.3); ctx.fill(); }
  ctx.restore();
  VK.glow(ctx, cx, cy, R.w * 1.2, [255, 110, 220], .35 + boost * .4);
  VK.glow(ctx, cx, cy, R.w * .5, [255, 255, 255], .3 + boost * .5);
  ctx.strokeStyle = 'rgba(220,240,255,.45)'; ctx.lineWidth = 2 * u; rr(ctx, cx - R.w * .5, R.top + oy, R.w, h, 14 * u); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(ctx, cx - R.w * .42, R.top + oy + 10 * u, 8 * u, h - 20 * u, 4 * u); ctx.fill();
}
function drawArm(ctx, S, ox) {
  if (S.compact) return;
  const { u } = S, A = S.arm, bx = S.W * .5 + ox * .5, by = S.TOP * .62;
  const l1 = 120 * u, l2 = 100 * u;
  const j1 = [bx + Math.sin(A.a1) * l1, by + Math.cos(A.a1) * l1 * .5], j2 = [j1[0] + Math.sin(A.a1 + A.a2) * l2, j1[1] - Math.cos(A.a1 + A.a2) * l2 * .3];
  ctx.lineCap = 'round';
  for (const [a, b] of [[[bx, by], j1], [j1, j2]]) { ctx.strokeStyle = '#59636f'; ctx.lineWidth = 16 * u; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.strokeStyle = '#dfe6ee'; ctx.lineWidth = 11 * u; ctx.stroke(); }
  for (const [x, y] of [[bx, by], j1, j2]) { ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(x, y, 7 * u, 0, 6.3); ctx.fill(); ctx.fillStyle = '#2d333c'; ctx.beginPath(); ctx.arc(x, y, 3 * u, 0, 6.3); ctx.fill(); }
  VK.glow(ctx, j2[0], j2[1], 12 * u, [95, 242, 255], .6);
}
/* ---------- le savant en apesanteur ---------- */
function sciStep(S, dt) {
  const s = S.sci, u = S.u, Z = S.zone;
  if (s.bub && (s.bubT -= dt) <= 0) s.bub = null;
  if (S.t > s.next) { s.next = S.t + rnd(4, 9); s.tx = rnd(Z.x0 + 120 * u, Z.x1 - 120 * u); s.ty = rnd(Z.y0 + 40 * u, Z.y1 - 30 * u); s.pose = pick([null, null, 'tool', 'notes', 'reach']); if (Math.random() < .25) { s.bub = pick(['♪', '✦', '!']); s.bubT = 1.4; } }
  const ax = (s.tx - s.x) * .6, ay = (s.ty - s.y) * .6; s.vx += (ax - s.vx) * dt * .8; s.vy += (ay - s.vy) * dt * .8;
  s.x += s.vx * dt; s.y += s.vy * dt + Math.sin(S.t * 1.1) * 6 * u * dt;
  if (Math.abs(s.vx) > 4 * u) s.dir = s.vx > 0 ? 1 : -1;
  if (s.rotV) { s.rot += s.rotV * dt; if (s.rot > 6.28) { s.rot = 0; s.rotV = 0; } } else s.rot = Math.sin(S.t * .6) * .12;
  if (S.ev && S.ev.type === 'alert') { s.pose = 'reach'; s.tx = S.compact ? 30 : S.SL; }
}
function startAlert(S) { if (S.ev) return; S.ev = { type: 'alert', t0: S.t }; S.dimT = .15; S.sci.bub = '!!'; S.sci.bubT = 2; VK.say('alert', 'start'); }
function startFlare(S) { if (S.ev) return; S.ev = { type: 'flare', t0: S.t }; S.sci.bub = '☀'; S.sci.bubT = 2; VK.say('flare', 'start'); }
})();
