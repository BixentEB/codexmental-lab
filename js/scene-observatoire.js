/* ==========================================================================
   CODEX MENTAL · LAB — salle vectorielle n°2 : l'observatoire
   Une coupole en bois et laiton ouverte sur le ciel (phase de la Lune réelle),
   un grand réfracteur qui suit les astres, une sphère armillaire, un globe
   céleste et le bureau du savant-astronome.
   ========================================================================== */
(() => {
'use strict';
const { rnd, pick, clamp, seeded, rgba, metal, rr, glow, BRASS, COPPER, STEEL } = VK;

// phase de la Lune aujourd'hui (0 = nouvelle, 0.5 = pleine)
function moonPhase(d = new Date()) {
  const ref = Date.UTC(2000, 0, 6, 18, 14), syn = 29.530588853;
  let p = ((d.getTime() - ref) / 86400000 / syn) % 1; if (p < 0) p += 1; return p;
}
const PHASE = moonPhase();

const CONSTELLATIONS = [
  // Grande Ourse, Cassiopée, Orion (coordonnées normalisées)
  [[.10, .30], [.16, .26], [.22, .27], [.27, .30], [.30, .40], [.38, .38], [.36, .28], [.27, .30]],
  [[.58, .18], [.63, .28], [.68, .20], [.73, .30], [.78, .19]],
  [[.50, .50], [.56, .48], [.62, .50], [.55, .62], [.53, .70], [.56, .70], [.59, .70], [.62, .80], [.50, .80]]
];

VK.room({
  panel(S) {
    const { W, H, u, compact } = S;
    const SL = compact ? 10 : Math.max(250 * u, W * .14), SR = SL;
    return { TOP: compact ? 62 : 128 * u, BOT: compact ? 150 * u : 260 * u, SL, SR };
  },
  build(S) {
    const { W, H, u, compact, SL } = S;
    S.floor = H - 8 * u; S.yB = H - 150 * u;
    S.bx0 = compact ? 8 : SL * .82; S.bx1 = compact ? W - 8 : W - S.SR * .82;
    S.slit = { cx: W / 2, w: compact ? W * .5 : W * .26, bot: H * .62 };
    const r = seeded(9);
    S.stars = []; for (let i = 0; i < (compact ? 90 : 260); i++) S.stars.push({ x: r(), y: r(), s: r() < .08 ? 2 : (r() < .3 ? 1.4 : 1), ph: r() * 6, c: r() < .15 ? [255, 210, 170] : (r() < .25 ? [180, 210, 255] : [255, 255, 255]) });
    S.meteors = []; S.nextMeteor = 4; S.comet = null; S.ufo = null; S.view = null; S.showConst = 0;
    S.arm = 0; S.armSpin = 1; S.globe = 0; S.globeSpin = 1;
    // télescope : pivot sur sa colonne, à gauche (ou au centre sur mobile)
    const tx = compact ? W * .2 : Math.max(VK.doorRight(H) + 70 * u, SL * .55);
    S.tel = { x: tx, y: compact ? S.yB - 60 * u : H - 330 * u, len: compact ? 120 * u : Math.min(330 * u, H * .42), ang: -1.05, base: -1.05 };
    S.armil = compact ? null : { x: W - SL * .5, y: H * .45, r: Math.min(SL * .36, 90 * u) };
    S.lamps = compact ? [] : [W * .3, W * .7].map(x => ({ x, y: S.TOP * .55 }));
    S.sci = { x: compact ? W * .55 : W * .5, dir: 1, mode: 'idle', timer: 1.5, phase: 0, bub: null, bubT: 0, pose: null, jump: 0 };
    S.sc = compact ? u * 1.1 : clamp(H * .17, 120, 190) / 1.12 / 122;
    S.ev = null; S.nextEvent = 60;
  },
  bake(S, L) {
    const { W, H, u, compact } = S;
    // --- le ciel de fond (vu par la fente) ---
    const sky = S.layer(), k = sky.k;
    let g = k.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#050816'); g.addColorStop(.6, '#0b1430'); g.addColorStop(1, '#1a2448');
    k.fillStyle = g; k.fillRect(-sky.M, -sky.M, W + 2 * sky.M, H + 2 * sky.M);
    // Voie lactée
    k.save(); k.translate(W / 2, H * .3); k.rotate(-.5);
    for (let i = 0; i < 260; i++) { const x = rnd(-W * .6, W * .6), y = rnd(-60, 60) * u * (1 - Math.abs(x) / W); k.globalAlpha = rnd(.02, .07); k.drawImage(VK.puff(), x - 40 * u, y - 20 * u, 80 * u, 40 * u); }
    k.restore(); k.globalAlpha = 1;
    L.sky = sky;
    // --- la coupole (avec la fente découpée) ---
    const dome = S.layer(), d = dome.k, sl = S.slit;
    g = d.createRadialGradient(W / 2, -H * .3, H * .2, W / 2, -H * .3, H * 1.5); g.addColorStop(0, '#2c2118'); g.addColorStop(.6, '#1b140e'); g.addColorStop(1, '#0c0907');
    d.fillStyle = g; d.fillRect(-dome.M, -dome.M, W + 2 * dome.M, H + 2 * dome.M);
    // lattes de bois et nervures de laiton qui convergent vers le zénith
    const zx = W / 2, zy = -H * .9;
    d.strokeStyle = 'rgba(0,0,0,.35)'; d.lineWidth = 1;
    for (let i = -30; i <= 30; i++) { d.beginPath(); d.moveTo(zx, zy); d.lineTo(zx + i * W * .06, H * 1.2); d.stroke(); }
    for (let rr2 = H * .9; rr2 < H * 2.4; rr2 += 46 * u) { d.beginPath(); d.arc(zx, zy, rr2, 0, Math.PI); d.strokeStyle = 'rgba(255,220,170,.035)'; d.lineWidth = 18 * u; d.stroke(); d.strokeStyle = 'rgba(0,0,0,.25)'; d.lineWidth = 1.5; d.stroke(); }
    for (const i of [-4, -2, 2, 4]) { d.beginPath(); d.moveTo(zx, zy); d.lineTo(zx + i * W * .14, H * 1.2); d.strokeStyle = metal(d, 0, 0, 0, H, BRASS); d.lineWidth = 6 * u; d.stroke(); }
    // fente : découpe + rails
    d.save(); d.globalCompositeOperation = 'destination-out'; d.fillRect(sl.cx - sl.w / 2, -dome.M, sl.w, sl.bot + dome.M); d.restore();
    for (const sx of [sl.cx - sl.w / 2, sl.cx + sl.w / 2]) { d.fillStyle = metal(d, sx - 8 * u, 0, sx + 8 * u, 0, BRASS); d.fillRect(sx - 7 * u, -dome.M, 14 * u, sl.bot + dome.M); for (let y = 20 * u; y < sl.bot; y += 60 * u) { d.fillStyle = BRASS[0]; d.beginPath(); d.arc(sx, y, 2.5 * u, 0, 6.3); d.fill(); } }
    d.fillStyle = metal(d, 0, sl.bot, 0, sl.bot + 16 * u, ['#6a5040', '#4a3424', '#2a1a10', '#140a04']); d.fillRect(sl.cx - sl.w / 2 - 10 * u, sl.bot, sl.w + 20 * u, 16 * u);
    // mur circulaire bas + sol en bois avec rose des vents
    g = d.createLinearGradient(0, H * .62, 0, H); g.addColorStop(0, '#2a1d14'); g.addColorStop(1, '#120b07');
    d.fillStyle = g; d.fillRect(-dome.M, H * .62 + 16 * u, W + 2 * dome.M, H);
    for (let x = -dome.M; x < W + dome.M; x += 90 * u) { d.fillStyle = 'rgba(0,0,0,.3)'; d.fillRect(x, H * .62 + 16 * u, 2 * u, H); }
    d.fillStyle = '#17100a'; d.fillRect(-dome.M, S.floor - 20 * u, W + 2 * dome.M, H);
    if (!compact) {
      // cartes du ciel accrochées à gauche
      const cx0 = S.SL * .12, cy0 = S.TOP + 30 * u, cw = S.SL * .32, ch = cw * 1.25;
      d.fillStyle = '#d8ccaa'; d.fillRect(cx0, cy0, cw, ch); d.strokeStyle = '#7a6a48'; d.lineWidth = 2 * u; d.strokeRect(cx0, cy0, cw, ch);
      d.strokeStyle = 'rgba(60,40,20,.5)'; d.lineWidth = 1; d.beginPath(); d.arc(cx0 + cw / 2, cy0 + ch / 2, cw * .4, 0, 6.3); d.stroke();
      d.fillStyle = 'rgba(40,30,20,.8)'; for (let i = 0; i < 24; i++) { d.beginPath(); d.arc(cx0 + cw * (.15 + .7 * Math.random()), cy0 + ch * (.15 + .7 * Math.random()), 1.2 * u, 0, 6.3); d.fill(); }
      d.strokeStyle = 'rgba(40,30,20,.5)'; d.beginPath(); d.moveTo(cx0 + cw * .2, cy0 + ch * .3); d.lineTo(cx0 + cw * .4, cy0 + ch * .45); d.lineTo(cx0 + cw * .6, cy0 + ch * .35); d.lineTo(cx0 + cw * .75, cy0 + ch * .6); d.stroke();
      d.fillStyle = '#c0392b'; d.beginPath(); d.arc(cx0 + cw / 2, cy0 + 4 * u, 3 * u, 0, 6.3); d.fill();
      // étagère de livres à droite, sous la sphère
      const bx = W - S.SR * .9, by = H * .62 + 70 * u;
      d.fillStyle = '#3a2414'; d.fillRect(bx, by, S.SR * .8, 6 * u);
      const cols = ['#6b2626', '#26406b', '#355e2a', '#5a3e7a', '#7a5a1c', '#2a5a5a'];
      for (let i = 0, x = bx + 6 * u; x < bx + S.SR * .75; i++) { const w2 = (10 + (i * 7) % 8) * u, h2 = (40 + (i * 13) % 22) * u; d.fillStyle = cols[i % cols.length]; d.fillRect(x, by - h2, w2, h2); d.fillStyle = BRASS[1]; d.fillRect(x, by - h2 + 8 * u, w2, 2 * u); x += w2 + 2 * u; }
    }
    L.dome = dome;
    // --- bureau et objets fixes ---
    const desk = S.layer(), b = desk.k, yB = S.yB, x0 = S.bx0, x1 = S.bx1, th = 16 * u;
    g = b.createLinearGradient(0, yB, 0, H); g.addColorStop(0, '#2a1a10'); g.addColorStop(1, '#0d0805');
    b.fillStyle = g; b.fillRect(x0, yB + th, x1 - x0, H - yB);
    g = b.createLinearGradient(0, yB, 0, yB + th); g.addColorStop(0, '#8a5a34'); g.addColorStop(.3, '#6b4226'); g.addColorStop(1, '#3a2213');
    b.fillStyle = g; rr(b, x0 - 8 * u, yB, x1 - x0 + 16 * u, th, 3 * u); b.fill();
    b.fillStyle = metal(b, 0, yB + th - 3 * u, 0, yB + th + 2 * u, BRASS); b.fillRect(x0 - 8 * u, yB + th - 3 * u, x1 - x0 + 16 * u, 3 * u);
    const span = x1 - x0;
    S.items = { atlas: x0 + span * .18, globe: x0 + span * .42, books: x0 + span * .62, astro: x0 + span * .82 };
    if (compact) S.items = { atlas: x0 + span * .55, globe: x0 + span * .8 };
    // atlas ouvert
    const ax = S.items.atlas, aw = 120 * u;
    b.fillStyle = '#5a2f1a'; rr(b, ax - aw / 2 - 4 * u, yB - 8 * u, aw + 8 * u, 10 * u, 2 * u); b.fill();
    b.fillStyle = '#efe6cc'; b.beginPath(); b.moveTo(ax - aw / 2, yB - 6 * u); b.quadraticCurveTo(ax - aw / 4, yB - 16 * u, ax, yB - 8 * u); b.quadraticCurveTo(ax + aw / 4, yB - 16 * u, ax + aw / 2, yB - 6 * u); b.lineTo(ax + aw / 2, yB - 2 * u); b.lineTo(ax - aw / 2, yB - 2 * u); b.fill();
    b.strokeStyle = 'rgba(40,40,80,.55)'; b.lineWidth = 1; b.beginPath(); b.moveTo(ax - aw * .4, yB - 9 * u); b.lineTo(ax - aw * .3, yB - 12 * u); b.lineTo(ax - aw * .15, yB - 10 * u); b.moveTo(ax + aw * .15, yB - 10 * u); b.lineTo(ax + aw * .3, yB - 13 * u); b.lineTo(ax + aw * .42, yB - 9 * u); b.stroke();
    // encrier + plume
    b.fillStyle = '#1a1a22'; rr(b, ax + aw / 2 + 12 * u, yB - 14 * u, 14 * u, 14 * u, 3 * u); b.fill();
    b.strokeStyle = '#efe6cc'; b.lineWidth = 2 * u; b.beginPath(); b.moveTo(ax + aw / 2 + 19 * u, yB - 12 * u); b.quadraticCurveTo(ax + aw / 2 + 30 * u, yB - 40 * u, ax + aw / 2 + 40 * u, yB - 54 * u); b.stroke();
    // pied du globe
    const gx = S.items.globe;
    b.fillStyle = metal(b, gx - 20 * u, 0, gx + 20 * u, 0, ['#6b4426', '#4e2f19', '#3a2211', '#24140a']); rr(b, gx - 24 * u, yB - 10 * u, 48 * u, 10 * u, 3 * u); b.fill();
    b.fillStyle = metal(b, gx - 3 * u, 0, gx + 3 * u, 0, BRASS); b.fillRect(gx - 3 * u, yB - 40 * u, 6 * u, 32 * u);
    if (S.items.books) {
      const bx = S.items.books, cols = ['#6b2626', '#26406b', '#355e2a', '#5a3e7a'];
      cols.forEach((col, i) => { const h2 = 12 * u, y = yB - (i + 1) * h2; b.fillStyle = col; rr(b, bx + (i % 2) * 6 * u - 30 * u, y, 62 * u, h2 - u, 2 * u); b.fill(); b.fillStyle = '#e8dcc0'; b.fillRect(bx + (i % 2) * 6 * u + 28 * u, y + 2 * u, 3 * u, h2 - 5 * u); });
      b.fillStyle = '#efe6c8'; b.fillRect(bx + 40 * u, yB - 40 * u, 7 * u, 40 * u);
    }
    if (S.items.astro) {   // astrolabe posé
      const sx = S.items.astro, sy = yB - 46 * u;
      b.fillStyle = metal(b, sx - 30 * u, sy - 30 * u, sx + 30 * u, sy + 30 * u, BRASS); b.beginPath(); b.arc(sx, sy, 30 * u, 0, 6.3); b.fill();
      b.fillStyle = '#2a1d10'; b.beginPath(); b.arc(sx, sy, 24 * u, 0, 6.3); b.fill();
      b.strokeStyle = BRASS[0]; b.lineWidth = 1.2 * u; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; b.beginPath(); b.moveTo(sx + Math.cos(a) * 20 * u, sy + Math.sin(a) * 20 * u); b.lineTo(sx + Math.cos(a) * 24 * u, sy + Math.sin(a) * 24 * u); b.stroke(); }
      b.fillStyle = metal(b, 0, sy + 28 * u, 0, yB, ['#6b4426', '#4e2f19', '#3a2211', '#24140a']); b.fillRect(sx - 14 * u, sy + 28 * u, 28 * u, yB - sy - 28 * u);
    }
    // colonne du télescope
    const T = S.tel;
    b.fillStyle = metal(b, T.x - 22 * u, 0, T.x + 22 * u, 0, ['#5a5f6a', '#3a3f4a', '#262a33', '#15181d']);
    b.beginPath(); b.moveTo(T.x - 14 * u, T.y + 10 * u); b.lineTo(T.x + 14 * u, T.y + 10 * u); b.lineTo(T.x + 30 * u, S.floor); b.lineTo(T.x - 30 * u, S.floor); b.closePath(); b.fill();
    b.fillStyle = metal(b, 0, S.floor - 14 * u, 0, S.floor, BRASS); rr(b, T.x - 40 * u, S.floor - 14 * u, 80 * u, 14 * u, 4 * u); b.fill();
    L.desk = desk;
    // vignette
    const vg = S.layer(); g = vg.k.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); vg.k.fillStyle = g; vg.k.fillRect(-vg.M, -vg.M, W + 2 * vg.M, H + 2 * vg.M);
    L.vign = vg;
  },
  update(S, dt) {
    const { W, H, u } = S, t = S.t;
    // étoiles filantes
    if (t > S.nextMeteor) { S.nextMeteor = t + (VK.CALM ? rnd(12, 24) : rnd(5, 12)); meteor(S); }
    for (let i = S.meteors.length - 1; i >= 0; i--) { const m = S.meteors[i]; m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt; if (m.life <= 0) S.meteors.splice(i, 1); }
    if (S.comet) { S.comet.x += S.comet.vx * dt; if (S.comet.x > W + 200 * u) { S.comet = null; VK.say('comet', 'end'); } }
    if (S.ufo) { const f = S.ufo; f.x += f.vx * dt; f.y = f.y0 + Math.sin(t * 3) * 10 * u; if (f.x > W + 100) S.ufo = null; }
    // le télescope suit lentement le ciel
    const T = S.tel; T.ang = T.base + Math.sin(t * .05) * .12 + (S.view ? 0 : 0);
    if (S.view && (S.view.t -= dt) <= 0) S.view = null;
    S.arm += dt * .25 * S.armSpin; S.armSpin += (1 - S.armSpin) * dt * .5;
    S.globe += dt * .3 * S.globeSpin; S.globeSpin += (1 - S.globeSpin) * dt * .5;
    if (S.showConst > 0) S.showConst -= dt;
    sciStep(S, dt);
    // événements rares
    if (!S.ev && VK.MOTION === 'full' && t > S.nextEvent) { S.nextEvent = t + rnd(80, 150); Math.random() < .5 ? startShower(S) : startComet(S); }
    if (S.ev && S.ev.type === 'shower') { if (Math.random() < 10 * dt) meteor(S); if (t - S.ev.t0 > 10) { S.ev = null; VK.say('shower', 'end'); } }
  },
  draw(S, ctx, par) {
    const { W, H, u } = S, t = S.t, P = par.P;
    const ox1 = par.x * P * .2, oy1 = par.y * P * .1, ox2 = par.x * P * .5, oy2 = par.y * P * .25, ox3 = par.x * P * .9;
    // ciel
    S.put(S.layers.sky, ox1, oy1);
    ctx.save(); ctx.translate(ox1, oy1);
    for (const s of S.stars) { const a = .45 + .55 * Math.abs(Math.sin(t * (.6 + s.ph * .2) + s.ph)); ctx.fillStyle = rgba(s.c, a); ctx.fillRect(s.x * W, s.y * H * .75, s.s * u, s.s * u); }
    if (S.showConst > 0) { ctx.strokeStyle = `rgba(150,190,255,${Math.min(.6, S.showConst * .4)})`; ctx.lineWidth = 1.2 * u; for (const c of CONSTELLATIONS) { ctx.beginPath(); c.forEach(([x, y], i) => i ? ctx.lineTo(W * (.2 + x * .6), H * y * .6) : ctx.moveTo(W * (.2 + x * .6), H * y * .6)); ctx.stroke(); } }
    // Lune avec sa phase du jour
    drawMoon(ctx, W / 2 + S.slit.w * .18, S.TOP * .55, 22 * u, PHASE);
    // Saturne qui dérive lentement
    const sx = W / 2 - S.slit.w * .25 + Math.sin(t * .02) * 20 * u, sy = H * .32;
    ctx.fillStyle = '#e8d29a'; ctx.beginPath(); ctx.arc(sx, sy, 5 * u, 0, 6.3); ctx.fill(); ctx.strokeStyle = 'rgba(232,210,154,.8)'; ctx.lineWidth = 1.2 * u; ctx.beginPath(); ctx.ellipse(sx, sy, 10 * u, 3 * u, -.3, 0, 6.3); ctx.stroke();
    for (const m of S.meteors) { const k = m.life / m.max; ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 1.6 * u; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * .08, m.y - m.vy * .08); ctx.stroke(); VK.glow(ctx, m.x, m.y, 6 * u, [200, 220, 255], .5 * k); }
    if (S.comet) { const c = S.comet; const tail = ctx.createLinearGradient(c.x, c.y, c.x - 220 * u, c.y + 40 * u); tail.addColorStop(0, 'rgba(200,240,255,.7)'); tail.addColorStop(1, 'rgba(200,240,255,0)'); ctx.strokeStyle = tail; ctx.lineWidth = 8 * u; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - 220 * u, c.y + 40 * u); ctx.stroke(); VK.glow(ctx, c.x, c.y, 18 * u, [200, 240, 255], .9); }
    if (S.ufo) { const f = S.ufo; VK.glow(ctx, f.x, f.y, 26 * u, [140, 255, 160], .5); ctx.fillStyle = '#9aa6b4'; ctx.beginPath(); ctx.ellipse(f.x, f.y, 20 * u, 5 * u, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = 'rgba(160,255,190,.8)'; ctx.beginPath(); ctx.ellipse(f.x, f.y - 4 * u, 8 * u, 6 * u, 0, Math.PI, 0); ctx.fill(); for (let i = -2; i <= 2; i++) { ctx.fillStyle = Math.sin(t * 8 + i) > 0 ? '#ffe36b' : '#6bf0ff'; ctx.beginPath(); ctx.arc(f.x + i * 7 * u, f.y + 1 * u, 1.5 * u, 0, 6.3); ctx.fill(); } }
    ctx.restore();
    // coupole
    S.put(S.layers.dome, ox2, oy2);
    // lanternes
    ctx.save(); ctx.translate(ox2, oy2);
    for (const l of S.lamps) { ctx.strokeStyle = '#0b0b0d'; ctx.lineWidth = 1.5 * u; ctx.beginPath(); ctx.moveTo(l.x, 0); ctx.lineTo(l.x, l.y - 14 * u); ctx.stroke(); ctx.fillStyle = metal(ctx, l.x - 10 * u, 0, l.x + 10 * u, 0, BRASS); rr(ctx, l.x - 9 * u, l.y - 14 * u, 18 * u, 24 * u, 3 * u); ctx.fill(); ctx.fillStyle = `rgba(255,214,140,${.8 + Math.sin(t * 9 + l.x) * .1})`; ctx.fillRect(l.x - 6 * u, l.y - 9 * u, 12 * u, 14 * u); VK.glow(ctx, l.x, l.y, 80 * u, [255, 190, 110], .35); }
    if (S.armil) drawArmillary(ctx, S);
    ctx.restore();
    // télescope
    drawTelescope(ctx, S, ox2 * .8);
    // bureau
    ctx.save(); ctx.translate(ox2 * .3, 0);
    S.put(S.layers.desk);
    drawGlobe(ctx, S);
    if (S.items.books) { const cx = S.items.books + 43.5 * u, cy = S.yB - 44 * u; ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(cx, cy, 2.5 * u, 6 * u + Math.sin(t * 13) * u, 0, 0, 6.3); ctx.fill(); VK.glow(ctx, cx, cy, 40 * u, [255, 190, 90], .5); }
    if (S.items.astro) { const sx2 = S.items.astro, sy2 = S.yB - 46 * u; ctx.strokeStyle = BRASS[0]; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(sx2, sy2); ctx.lineTo(sx2 + Math.cos(t * .3) * 22 * u, sy2 + Math.sin(t * .3) * 22 * u); ctx.stroke(); ctx.beginPath(); ctx.arc(sx2 + 6 * u, sy2 - 4 * u, 10 * u, 0, 6.3); ctx.stroke(); }
    ctx.restore();
    VK.scientist(ctx, { x: S.sci.x, foot: S.floor, sc: S.sc, dir: S.sci.dir, phase: S.sci.phase, walk: S.sci.mode === 'walk', pose: S.sci.pose, jump: S.sci.jump > 0 ? Math.sin(S.sci.jump / .35 * Math.PI) * 14 * S.sc : 0, bub: S.sci.bub });
    // vue à l'oculaire
    if (S.view) drawEyepiece(ctx, S);
    S.put(S.layers.vign, -ox3 * .2, 0);
  },
  hit(S, x, y) {
    const { u } = S, T = S.tel;
    const ex = T.x + Math.cos(T.ang) * T.len, ey = T.y + Math.sin(T.ang) * T.len;
    if (distSeg(x, y, T.x, T.y, ex, ey) < 26 * u) return 'tel';
    if (S.armil && Math.hypot(x - S.armil.x, y - S.armil.y) < S.armil.r * 1.1) return 'armil';
    if (Math.abs(x - S.items.globe) < 32 * u && y > S.yB - 80 * u && y < S.yB) return 'globe';
    if (Math.abs(x - S.sci.x) < 22 * S.sc && y > S.floor - 140 * S.sc) return 'sci';
    if (y < S.TOP || (x > S.slit.cx - S.slit.w / 2 && x < S.slit.cx + S.slit.w / 2 && y < S.slit.bot && document.documentElement.classList.contains('panel-away'))) return 'sky';
    return null;
  },
  click(S, x, y, h) {
    if (h === 'tel') { S.view = { t: 6, obj: pick(['saturne', 'jupiter', 'lune', 'nebuleuse']) }; S.sci.bub = '!'; S.sci.bubT = 1.4; }
    else if (h === 'armil') S.armSpin = 8;
    else if (h === 'globe') S.globeSpin = 10;
    else if (h === 'sci') { S.sci.jump = .35; S.sci.bub = pick(['?', '!', '✦', '☾']); S.sci.bubT = 1.2; }
    else if (h === 'sky') { meteor(S, x, y); S.showConst = 3; }
  },
  accent(S, col) { S.accentCol = col; },
  event(S, type) { type === 'comet' ? startComet(S) : startShower(S); },
  secret(S) { S.ufo = { x: -60, y0: S.TOP * .5, y: 0, vx: 160 * S.u }; S.sci.bub = '?!'; S.sci.bubT = 2; VK.say('ufo', 'start'); }
});

/* ---------- morceaux de dessin ---------- */
function distSeg(px, py, x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0, k = clamp(((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(px - x0 - dx * k, py - y0 - dy * k); }
function meteor(S, x, y) {
  const { W, u } = S;
  const sx = x != null ? x : rnd(W * .3, W * .8), sy = y != null ? y : rnd(0, S.TOP * .6);
  S.meteors.push({ x: sx, y: sy, vx: -rnd(300, 520) * u, vy: rnd(120, 220) * u, life: .7, max: .7 });
}
function startShower(S) { if (S.ev) return; S.ev = { type: 'shower', t0: S.t }; S.sci.bub = '✦'; S.sci.bubT = 2; VK.say('shower', 'start'); }
function startComet(S) { if (S.comet) return; S.comet = { x: -100 * S.u, y: S.TOP * .45, vx: 40 * S.u }; VK.say('comet', 'start'); }
function drawMoon(ctx, x, y, r, p) {
  VK.glow(ctx, x, y, r * 3, [244, 236, 204], .25);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.clip();
  ctx.fillStyle = '#20263a'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // partie éclairée : la phase décide de la largeur du terminateur
  const waxing = p < .5, k = Math.cos(p * Math.PI * 2);   // 1 nouvelle, -1 pleine
  ctx.fillStyle = '#f2ead0';
  ctx.beginPath();
  if (waxing) { ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2); ctx.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0); }
  else { ctx.arc(x, y, r, Math.PI / 2, -Math.PI / 2); ctx.ellipse(x, y, Math.abs(k) * r, r, 0, -Math.PI / 2, Math.PI / 2, k > 0); }
  ctx.fill();
  ctx.fillStyle = 'rgba(160,150,120,.35)'; for (const [dx, dy, rr2] of [[-.3, -.2, .18], [.25, .3, .12], [.1, -.45, .08], [-.1, .35, .1]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr2 * r, 0, 6.3); ctx.fill(); }
  ctx.restore();
}
function drawTelescope(ctx, S, ox) {
  const { u } = S, T = S.tel, x = T.x + ox, y = T.y;
  ctx.save(); ctx.translate(x, y);
  // monture
  ctx.fillStyle = metal(ctx, -20 * u, -20 * u, 20 * u, 20 * u, BRASS); ctx.beginPath(); ctx.arc(0, 0, 18 * u, 0, 6.3); ctx.fill();
  ctx.rotate(T.ang);
  const L = T.len, r0 = 13 * u, r1 = 22 * u;
  const g = ctx.createLinearGradient(0, -r1, 0, r1); g.addColorStop(0, '#f6dc8c'); g.addColorStop(.35, '#c99a3e'); g.addColorStop(.7, '#7a5418'); g.addColorStop(1, '#3a280a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-L * .22, -r0 * .8); ctx.lineTo(L, -r1); ctx.lineTo(L, r1); ctx.lineTo(-L * .22, r0 * .8); ctx.closePath(); ctx.fill();
  for (const k of [.15, .45, .75, .98]) { ctx.fillStyle = '#3a280a'; ctx.fillRect(L * k - 3 * u, -(r0 + (r1 - r0) * k) - 2 * u, 6 * u, 2 * (r0 + (r1 - r0) * k) + 4 * u); }
  ctx.fillStyle = '#0c1220'; ctx.beginPath(); ctx.ellipse(L, 0, 4 * u, r1 - 2 * u, 0, 0, 6.3); ctx.fill();
  VK.glow(ctx, L + 2 * u, 0, 16 * u, [180, 220, 255], .25 + (S.view ? .3 : 0));
  // chercheur et oculaire
  ctx.fillStyle = BRASS[2]; ctx.fillRect(L * .35, -r1 - 10 * u, L * .3, 6 * u);
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-L * .22 - 18 * u, -5 * u, 18 * u, 10 * u);
  ctx.restore();
}
function drawArmillary(ctx, S) {
  const { u } = S, A = S.armil, a = S.arm;
  ctx.fillStyle = metal(ctx, A.x - 6 * u, 0, A.x + 6 * u, 0, ['#6b4426', '#4e2f19', '#3a2211', '#24140a']); ctx.fillRect(A.x - 5 * u, A.y + A.r, 10 * u, S.H * .62 - A.y - A.r + 10 * u);
  ctx.lineWidth = 3 * u;
  for (const [tilt, sp, col] of [[0, 1, BRASS[1]], [1.2, -1.3, BRASS[0]], [-.5, .7, COPPER[1]], [Math.PI / 2, 0, BRASS[2]]]) {
    ctx.strokeStyle = col; ctx.beginPath(); ctx.ellipse(A.x, A.y, A.r, Math.abs(Math.cos(a * sp + tilt)) * A.r + 2 * u, tilt * .3, 0, 6.3); ctx.stroke();
  }
  ctx.strokeStyle = BRASS[1]; ctx.beginPath(); ctx.ellipse(A.x, A.y, A.r * .9, A.r * .25, -.4, 0, 6.3); ctx.stroke();
  VK.glow(ctx, A.x, A.y, 18 * u, [255, 210, 120], .6); ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(A.x, A.y, 6 * u, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#5aa0ff'; ctx.beginPath(); ctx.arc(A.x + Math.cos(a * 2) * A.r * .9, A.y + Math.sin(a * 2) * A.r * .25 - .4 * Math.cos(a * 2) * 10 * u, 4 * u, 0, 6.3); ctx.fill();
}
function drawGlobe(ctx, S) {
  const { u } = S, gx = S.items.globe, gy = S.yB - 58 * u, r = 22 * u;
  const g = ctx.createRadialGradient(gx - r * .3, gy - r * .3, 2, gx, gy, r); g.addColorStop(0, '#2a4a8a'); g.addColorStop(1, '#0a1630');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 6.3); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(gx, gy, r, 0, 6.3); ctx.clip();
  const rs = seeded(4);
  for (let i = 0; i < 40; i++) { const lon = rs() * 6.28 + S.globe, lat = (rs() - .5) * 2.6, z = Math.cos(lon); if (z < 0) continue; ctx.fillStyle = `rgba(255,240,200,${.4 + z * .6})`; ctx.beginPath(); ctx.arc(gx + Math.sin(lon) * Math.cos(lat * .6) * r, gy + Math.sin(lat * .6) * r, 1.2 * u, 0, 6.3); ctx.fill(); }
  ctx.strokeStyle = 'rgba(212,168,73,.4)'; ctx.lineWidth = 1; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(gx, gy + k * r * .35, r * Math.sqrt(1 - (k * .35) ** 2), 2 * u, 0, 0, 6.3); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = BRASS[1]; ctx.lineWidth = 2.5 * u; ctx.beginPath(); ctx.arc(gx, gy, r + 4 * u, Math.PI * .6, Math.PI * 2.4); ctx.stroke();
}
function drawEyepiece(ctx, S) {
  const { u, W, H } = S, T = S.tel, k = Math.min(1, (6 - S.view.t) * 3, S.view.t * 2);
  const r = Math.min(S.SL * .42, 110 * u) * k, cx = S.compact ? W * .5 : S.SL * .5, cy = S.compact ? S.TOP + r + 10 : S.TOP + r + 30 * u;
  if (r < 4) return;
  ctx.save();
  ctx.fillStyle = metal(ctx, cx - r, cy - r, cx + r, cy + r, BRASS); ctx.beginPath(); ctx.arc(cx, cy, r + 8 * u, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.clip();
  ctx.fillStyle = '#02040a'; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  const rs = seeded(12); for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(cx - r + rs() * 2 * r, cy - r + rs() * 2 * r, u, u); }
  const o = S.view.obj, pr = r * .38;
  if (o === 'saturne') {
    ctx.strokeStyle = 'rgba(230,210,160,.9)'; ctx.lineWidth = pr * .18; ctx.beginPath(); ctx.ellipse(cx, cy, pr * 2, pr * .55, -.35, Math.PI, 2 * Math.PI); ctx.stroke();
    const g = ctx.createLinearGradient(cx, cy - pr, cx, cy + pr); g.addColorStop(0, '#f0dca8'); g.addColorStop(.5, '#d8b878'); g.addColorStop(1, '#a88a50');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy, pr * 2, pr * .55, -.35, 0, Math.PI); ctx.stroke();
  } else if (o === 'jupiter') {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, pr * 1.2, 0, 6.3); ctx.clip();
    const bands = ['#e8d2b0', '#b88a5a', '#f0e0c0', '#a8784a', '#e0c8a0', '#c09060', '#ead6b8'];
    bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(cx - pr * 1.3, cy - pr * 1.2 + i * pr * 2.4 / bands.length, pr * 2.6, pr * 2.4 / bands.length + 1); });
    ctx.fillStyle = '#c0583a'; ctx.beginPath(); ctx.ellipse(cx + pr * .4, cy + pr * .35, pr * .25, pr * .13, 0, 0, 6.3); ctx.fill(); ctx.restore();
    for (const [dx, s] of [[-2.2, 1], [-1.6, .8], [1.8, 1.1], [2.6, .7]]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + dx * pr, cy + dx * 2 * u, 2 * u * s, 0, 6.3); ctx.fill(); }
  } else if (o === 'lune') {
    ctx.fillStyle = '#d8d2bc'; ctx.beginPath(); ctx.arc(cx + pr * .6, cy, pr * 2.2, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(120,110,90,.45)'; const rc = seeded(5); for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(cx - r + rc() * 2 * r, cy - r + rc() * 2 * r, rc() * pr * .35, 0, 6.3); ctx.fill(); }
  } else {
    for (let i = 0; i < 26; i++) { ctx.globalAlpha = .12; ctx.drawImage(VK.puff(), cx - pr * 1.6 + Math.sin(i * 1.7) * pr, cy - pr + Math.cos(i * 2.3) * pr * .8, pr * 1.6, pr * 1.2); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-atop'; const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r); g.addColorStop(0, 'rgba(255,120,200,.7)'); g.addColorStop(.6, 'rgba(90,120,255,.5)'); g.addColorStop(1, 'rgba(20,20,60,0)'); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r); ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.arc(cx, cy, r - 4 * u, 3.6, 4.6); ctx.stroke();
}
/* ---------- le savant-astronome ---------- */
function sciStep(S, dt) {
  const s = S.sci, u = S.u;
  if (s.bub && (s.bubT -= dt) <= 0) s.bub = null;
  if (s.jump > 0) s.jump = Math.max(0, s.jump - dt);
  if (s.mode === 'walk') {
    const sp = 60 * u, d = s.target - s.x; s.dir = d >= 0 ? 1 : -1; s.phase += dt * 7;
    if (Math.abs(d) < sp * dt) { s.x = s.target; s.mode = 'act'; s.pose = s.task; s.timer = rnd(2.5, 5); if (s.task === 'look') { s.dir = -1; if (Math.random() < .5) { S.view = { t: 5, obj: pick(['saturne', 'jupiter', 'lune', 'nebuleuse']) }; } } }
    else s.x += s.dir * sp * dt;
  } else if ((s.timer -= dt) <= 0) {
    s.pose = null;
    const stops = [{ x: S.tel.x + 70 * u, task: 'look' }, { x: S.items.atlas - 40 * u, task: 'notes' }, { x: S.items.globe - 40 * u, task: 'reach' }];
    if (S.items.astro) stops.push({ x: S.items.astro - 50 * u, task: 'notes' });
    const st = pick(stops); s.target = clamp(st.x, S.bx0 + 30 * u, S.bx1 - 30 * u); s.task = st.task; s.mode = 'walk';
  }
}
})();
