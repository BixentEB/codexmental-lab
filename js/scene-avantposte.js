/* ==========================================================================
   CODEX MENTAL · LAB — univers orbital, salle n°2 : l'avant-poste
   Un dôme vitré posé sur une planète habitée : deux lunes, une géante à
   anneaux, des aurores, une flore qui luit… et des habitants curieux qui
   viennent coller leur tête contre la vitre.
   ========================================================================== */
(() => {
'use strict';
const { rnd, pick, clamp, seeded, rgba, metal, rr, glow, mix, lighten, STEEL } = VK;

VK.room({
  panel(S) {
    const { W, u, compact } = S;
    const SL = compact ? 10 : Math.max(260 * u, W * .15), SR = SL;
    return { TOP: compact ? 62 : 104 * u, BOT: compact ? 150 * u : 230 * u, SL, SR };
  },
  build(S) {
    const { W, H, u, compact } = S;
    S.hz = H * .7;                         // ligne d'horizon (base de la vitre)
    S.floor = H - 8 * u; S.deck = H - 70 * u;
    const r = seeded(17);
    S.stars = []; for (let i = 0; i < 160; i++) S.stars.push([r(), r() * .7, r()]);
    S.plants = []; for (let i = 0; i < (compact ? 10 : 26); i++) S.plants.push({ x: r() * W, h: (20 + r() * 50) * u, col: pick([[95, 242, 255], [255, 95, 200], [160, 255, 120], [180, 140, 255]]), ph: r() * 6, kind: r() < .5 ? 'bulb' : 'fern' });
    // emplacements où les habitants peuvent apparaître : bas de la vitre, côtés et bande du bas
    S.spots = compact ? [W * .2, W * .8] : [S.SL * .3, S.SL * .7, W - S.SR * .7, W - S.SR * .3, W * .32, W * .5, W * .68];
    S.aliens = []; S.nextAlien = 3;
    S.rover = null; S.nextRover = 12;
    S.ufo = null; S.ev = null; S.nextEvent = 50; S.dust = [];
    S.giant = 0;
    S.sci = { x: W * .55, dir: 1, mode: 'idle', timer: 2, phase: 0, bub: null, bubT: 0, pose: null, lift: 0, gone: false };
    S.sc = compact ? u * 1.05 : clamp(H * .17, 120, 190) / 1.12 / 122;
    S.screens = [];
  },
  bake(S, L) {
    const { W, H, u, compact } = S, hz = S.hz;
    // --- ciel et paysage lointain ---
    const sky = S.layer(), k = sky.k;
    let g = k.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#07051a'); g.addColorStop(.45, '#1d1240'); g.addColorStop(.8, '#4a2a6a'); g.addColorStop(1, '#b0507a');
    k.fillStyle = g; k.fillRect(-sky.M, -sky.M, W + 2 * sky.M, hz + sky.M);
    // géante gazeuse à anneaux, posée sur l'horizon
    const gx = W * .74, gy = hz - 40 * u, gr = Math.min(W, H) * .32;
    k.save(); k.beginPath(); k.rect(-sky.M, -sky.M, W + 2 * sky.M, hz - 10 * u + sky.M); k.clip();
    k.strokeStyle = 'rgba(255,210,170,.35)'; k.lineWidth = gr * .08; k.beginPath(); k.ellipse(gx, gy, gr * 1.9, gr * .32, -.18, Math.PI, 2 * Math.PI); k.stroke();
    g = k.createLinearGradient(gx - gr, gy - gr, gx + gr, gy + gr); g.addColorStop(0, '#f0b48a'); g.addColorStop(.5, '#c06a6a'); g.addColorStop(1, '#3a1a3a');
    k.fillStyle = g; k.beginPath(); k.arc(gx, gy, gr, 0, 6.3); k.fill();
    k.save(); k.beginPath(); k.arc(gx, gy, gr, 0, 6.3); k.clip();
    for (let i = 0; i < 9; i++) { k.fillStyle = `rgba(${i % 2 ? '255,230,200' : '90,30,60'},.12)`; k.fillRect(gx - gr, gy - gr + i * gr * .24 + Math.sin(i) * 6 * u, gr * 2, gr * .1); }
    g = k.createRadialGradient(gx - gr * .4, gy - gr * .4, gr * .1, gx, gy, gr); g.addColorStop(0, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(10,0,20,.6)'); k.fillStyle = g; k.fillRect(gx - gr, gy - gr, 2 * gr, 2 * gr);
    k.restore();
    k.strokeStyle = 'rgba(255,220,180,.55)'; k.lineWidth = gr * .05; k.beginPath(); k.ellipse(gx, gy, gr * 1.9, gr * .32, -.18, 0, Math.PI); k.stroke();
    k.restore();
    // montagnes (deux plans)
    for (const [col, amp, base, f] of [['#2a1838', 110, hz - 34 * u, .004], ['#170d22', 70, hz - 6 * u, .009]]) {
      k.fillStyle = col; k.beginPath(); k.moveTo(-sky.M, hz + 10);
      for (let x = -sky.M; x <= W + sky.M; x += 8 * u) k.lineTo(x, base - Math.abs(Math.sin(x * f / u) * amp + Math.sin(x * f * 2.7 / u) * amp * .4) * u);
      k.lineTo(W + sky.M, hz + 10); k.closePath(); k.fill();
    }
    // sol extraterrestre
    g = k.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#1a0f24'); g.addColorStop(1, '#0a0610');
    k.fillStyle = g; k.fillRect(-sky.M, hz - 2, W + 2 * sky.M, H - hz + sky.M);
    for (let i = 0; i < 40; i++) { k.fillStyle = 'rgba(255,255,255,.04)'; k.beginPath(); k.ellipse(Math.random() * W, hz + Math.random() * (H - hz), rnd(10, 40) * u, rnd(2, 6) * u, 0, 0, 6.3); k.fill(); }
    L.sky = sky;
    // --- structure du dôme : arceaux et cadre ---
    const dome = S.layer(), d = dome.k;
    const ribs = compact ? [W * .5] : [S.SL * .55, W * .5, W - S.SR * .55];
    d.strokeStyle = metal(d, 0, 0, W, 0, ['#c9d2dc', '#8e99a8', '#4a535e', '#20252c']); d.lineWidth = 14 * u;
    for (const rx of [W * .5]) { d.beginPath(); d.ellipse(rx, hz, W * .62, hz * 1.05, 0, Math.PI, 2 * Math.PI); d.stroke(); }
    d.lineWidth = 8 * u; for (const rx of ribs) { d.beginPath(); d.moveTo(rx, hz); d.quadraticCurveTo(rx + (rx - W / 2) * .2, hz * .3, W / 2, -20 * u); d.stroke(); }
    d.lineWidth = 6 * u; for (const k2 of [.35, .65]) { d.beginPath(); d.ellipse(W * .5, hz, W * .62 * Math.sqrt(1 - k2 * k2 * .4), hz * (1.05 - k2 * .55), 0, Math.PI, 2 * Math.PI); d.stroke(); }
    // base de la vitre + plancher intérieur
    d.fillStyle = metal(d, 0, hz, 0, hz + 22 * u, ['#dfe6ee', '#a7b2bf', '#69737f', '#353b44']); d.fillRect(-dome.M, hz, W + 2 * dome.M, 22 * u);
    for (let x = 20 * u; x < W; x += 60 * u) { d.fillStyle = 'rgba(95,242,255,.5)'; d.fillRect(x, hz + 9 * u, 24 * u, 3 * u); }
    g = d.createLinearGradient(0, S.deck, 0, H); g.addColorStop(0, '#222b38'); g.addColorStop(1, '#0d1118');
    d.fillStyle = g; d.fillRect(-dome.M, S.deck, W + 2 * dome.M, H - S.deck + dome.M);
    for (let x = -dome.M; x < W + dome.M; x += 80 * u) { d.fillStyle = 'rgba(0,0,0,.3)'; d.fillRect(x, S.deck, 2 * u, H); }
    d.fillStyle = '#ffcf4a'; for (let x = 0; x < W; x += 40 * u) d.fillRect(x, S.deck, 20 * u, 3 * u);
    if (!compact) {
      // consoles et bocaux d'échantillons sur le pont
      const cx0 = S.SL * 1.05, cw = 150 * u;
      for (const x of [cx0, W - S.SR * 1.05 - cw]) {
        d.fillStyle = metal(d, 0, S.deck - 70 * u, 0, S.deck, ['#4a5568', '#2d3646', '#1d2430', '#11161e']);
        d.beginPath(); d.moveTo(x, S.deck); d.lineTo(x + 10 * u, S.deck - 70 * u); d.lineTo(x + cw - 10 * u, S.deck - 70 * u); d.lineTo(x + cw, S.deck); d.closePath(); d.fill();
        d.fillStyle = '#04121a'; rr(d, x + 18 * u, S.deck - 62 * u, cw - 36 * u, 34 * u, 4 * u); d.fill();
        S.screens.push({ x: x + 18 * u, y: S.deck - 62 * u, w: cw - 36 * u, h: 34 * u });
      }
      const jx = W * .5 - 140 * u;
      for (let i = 0; i < 3; i++) { const x = jx + i * 46 * u; d.fillStyle = 'rgba(160,255,200,.12)'; rr(d, x, S.deck - 58 * u, 34 * u, 58 * u, 8 * u); d.fill(); d.strokeStyle = 'rgba(200,240,255,.5)'; d.lineWidth = 1.5 * u; d.stroke(); d.fillStyle = metal(d, 0, 0, 0, 1, STEEL); d.fillRect(x - 2 * u, S.deck - 62 * u, 38 * u, 6 * u); }
    }
    L.dome = dome;
    // reflets de la vitre (premier plan)
    const gl = S.layer(), q = gl.k;
    q.save(); q.beginPath(); q.ellipse(W * .5, hz, W * .62, hz * 1.05, 0, Math.PI, 2 * Math.PI); q.clip();
    g = q.createLinearGradient(0, 0, W, hz); g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(.3, 'rgba(255,255,255,0)'); g.addColorStop(.62, 'rgba(255,255,255,.05)'); g.addColorStop(.66, 'rgba(255,255,255,0)');
    q.fillStyle = g; q.fillRect(0, 0, W, hz); q.restore();
    g = q.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); q.fillStyle = g; q.fillRect(-gl.M, -gl.M, W + 2 * gl.M, H + 2 * gl.M);
    L.glass = gl;
  },
  update(S, dt) {
    const { u, W } = S, t = S.t;
    // les habitants
    if (t > S.nextAlien && S.aliens.length < (S.party ? 7 : 2)) { S.nextAlien = t + (S.party ? .3 : rnd(5, 11)); spawnAlien(S); }
    for (let i = S.aliens.length - 1; i >= 0; i--) {
      const a = S.aliens[i]; a.t += dt;
      if (a.state === 'rise') { a.k = Math.min(1, a.k + dt * 1.2); if (a.k >= 1) { a.state = 'look'; a.t = 0; } }
      else if (a.state === 'look') { if (a.t > a.stay) { a.state = 'duck'; } if (Math.random() < dt * .6) a.tap = .5; if (Math.random() < dt * .5) a.wave = 1.6; }
      else if (a.state === 'duck') { a.k = Math.max(0, a.k - dt * (a.fast ? 4 : 1.4)); if (a.k <= 0) S.aliens.splice(i, 1); }
      if (a.tap > 0) a.tap -= dt; if (a.wave > 0) a.wave -= dt; a.blink = (t + a.seed) % 3.5 < .12;
    }
    // le petit robot dehors
    if (!S.rover && t > S.nextRover) { S.nextRover = t + rnd(18, 30); const dir = Math.random() < .5 ? 1 : -1; S.rover = { x: dir > 0 ? -60 * u : W + 60 * u, dir }; }
    if (S.rover) { S.rover.x += S.rover.dir * 35 * u * dt; if (S.rover.x < -80 * u || S.rover.x > W + 80 * u) S.rover = null; }
    S.giant = (Math.sin(t * .03) > .97) ? Math.min(1, S.giant + dt * .3) : Math.max(0, S.giant - dt * .3);
    // tempête et soucoupe
    for (let i = S.dust.length - 1; i >= 0; i--) { const d = S.dust[i]; d.x += d.vx * dt; d.y += Math.sin(t * 3 + i) * 10 * u * dt; if (d.x > W + 40) S.dust.splice(i, 1); }
    if (S.ev && S.ev.type === 'storm') { for (let i = 0; i < 6; i++) S.dust.push({ x: -20, y: rnd(S.hz * .3, S.hz + 30 * u), vx: rnd(300, 600) * u, s: rnd(1, 3) * u }); if (t - S.ev.t0 > 9) { S.ev = null; S.dimT = 0; } }
    if (S.ufo) stepBeam(S, dt);
    sciStep(S, dt);
    if (!S.ev && !S.ufo && VK.MOTION === 'full' && t > S.nextEvent) { S.nextEvent = t + rnd(80, 150); Math.random() < .55 ? startBeam(S) : startStorm(S); }
    if (S.party && (S.partyT -= dt) <= 0) S.party = false;
  },
  draw(S, ctx, par) {
    const { W, H, u } = S, t = S.t, P = par.P;
    const ox1 = par.x * P * .2, oy1 = par.y * P * .1, ox2 = par.x * P * .55, oy2 = par.y * P * .25;
    S.put(S.layers.sky, ox1, oy1);
    ctx.save(); ctx.translate(ox1, oy1);
    for (const [x, y, b] of S.stars) { const a = .3 + .5 * Math.abs(Math.sin(t * .8 + b * 9)); ctx.fillStyle = `rgba(255,240,255,${a})`; ctx.fillRect(x * W, y * S.hz * .9, (b > .9 ? 2 : 1.2) * u, (b > .9 ? 2 : 1.2) * u); }
    // aurores
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) { const g = ctx.createLinearGradient(0, S.hz * .1, 0, S.hz * .5); g.addColorStop(0, 'rgba(95,255,180,0)'); g.addColorStop(.6, `rgba(${k === 1 ? '190,120,255' : '95,255,180'},.12)`); g.addColorStop(1, 'rgba(95,255,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, S.hz * .5); for (let x = 0; x <= W; x += 30 * u) ctx.lineTo(x, S.hz * (.18 + k * .06) + Math.sin(x * .004 / u + t * .3 + k * 2) * 40 * u); ctx.lineTo(W, S.hz * .5); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // deux lunes
    const m1 = [W * .2 + Math.sin(t * .01) * 30 * u, S.hz * .18], m2 = [W * .36, S.hz * .1];
    VK.glow(ctx, m1[0], m1[1], 60 * u, [200, 230, 255], .25); ctx.fillStyle = '#dfe8f4'; ctx.beginPath(); ctx.arc(m1[0], m1[1], 20 * u, 0, 6.3); ctx.fill(); ctx.fillStyle = 'rgba(29,18,64,.75)'; ctx.beginPath(); ctx.arc(m1[0] + 8 * u, m1[1] - 4 * u, 18 * u, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#ffb08a'; ctx.beginPath(); ctx.arc(m2[0], m2[1], 7 * u, 0, 6.3); ctx.fill();
    // silhouette géante, au loin, de temps en temps
    if (S.giant > 0) { ctx.globalAlpha = S.giant * .7; ctx.fillStyle = '#0c0614'; const gx = W * .12, gy = S.hz - 40 * u; ctx.beginPath(); ctx.ellipse(gx, gy - 80 * u, 30 * u, 60 * u, 0, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(gx + 10 * u, gy - 150 * u, 20 * u, 0, 6.3); ctx.fill(); for (const dx of [-14, 14]) { ctx.fillRect(gx + dx * u - 4 * u, gy - 30 * u, 8 * u, 40 * u); } ctx.globalAlpha = 1; VK.glow(ctx, gx + 16 * u, gy - 152 * u, 8 * u, [255, 60, 60], S.giant); }
    // flore qui luit
    for (const p of S.plants) {
      const sw = Math.sin(t * .9 + p.ph) * 5 * u, by = S.hz - 2 * u;
      if (p.kind === 'bulb') { ctx.strokeStyle = 'rgba(40,20,60,.9)'; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(p.x, by); ctx.quadraticCurveTo(p.x + sw, by - p.h * .6, p.x + sw * 1.4, by - p.h); ctx.stroke(); VK.glow(ctx, p.x + sw * 1.4, by - p.h, 14 * u, p.col, .5 + Math.sin(t * 2 + p.ph) * .2); ctx.fillStyle = rgba(lighten(p.col, .4)); ctx.beginPath(); ctx.arc(p.x + sw * 1.4, by - p.h, 4 * u, 0, 6.3); ctx.fill(); }
      else { ctx.strokeStyle = rgba(p.col, .55); ctx.lineWidth = 2 * u; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(p.x, by); ctx.quadraticCurveTo(p.x + k * 6 * u + sw, by - p.h * .6, p.x + k * 12 * u + sw, by - p.h * .8); ctx.stroke(); } }
    }
    // le petit robot
    if (S.rover) { const r = S.rover, y = S.hz - 6 * u; ctx.fillStyle = '#c9d2dc'; rr(ctx, r.x - 22 * u, y - 22 * u, 44 * u, 16 * u, 4 * u); ctx.fill(); ctx.fillStyle = '#2a3140'; for (const dx of [-14, 0, 14]) { ctx.beginPath(); ctx.arc(r.x + dx * u, y - 4 * u, 6 * u, 0, 6.3); ctx.fill(); } ctx.strokeStyle = '#c9d2dc'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(r.x + 10 * u * r.dir, y - 22 * u); ctx.lineTo(r.x + 14 * u * r.dir, y - 40 * u); ctx.stroke(); VK.glow(ctx, r.x + 14 * u * r.dir, y - 40 * u, 8 * u, [95, 242, 255], .8); }
    // poussière de tempête
    for (const d of S.dust) { ctx.fillStyle = 'rgba(255,190,150,.35)'; ctx.fillRect(d.x, d.y, d.s * 6, d.s); }
    ctx.restore();
    // les habitants, derrière la vitre
    for (const a of S.aliens) drawAlien(ctx, S, a, ox2 * .6, oy2 * .6);
    // soucoupe et rayon
    if (S.ufo) drawUfo(ctx, S);
    S.put(S.layers.dome, ox2, oy2);
    // bocaux d'échantillons : de petites créatures lumineuses
    if (!S.compact) { const jx = S.W * .5 - 140 * S.u; for (let i = 0; i < 3; i++) { const x = jx + i * 46 * S.u + 17 * S.u + ox2, y = S.deck - 30 * S.u + Math.sin(t * 1.5 + i) * 6 * S.u + oy2, col = [[95, 242, 255], [255, 95, 200], [160, 255, 120]][i]; VK.glow(ctx, x, y, 22 * S.u, col, .55); ctx.fillStyle = rgba(lighten(col, .4)); ctx.beginPath(); ctx.ellipse(x, y, 6 * S.u, 5 * S.u, Math.sin(t * 2 + i) * .3, 0, 6.3); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(x - 2 * S.u, y - 1 * S.u, 1 * S.u, 0, 6.3); ctx.arc(x + 2 * S.u, y - 1 * S.u, 1 * S.u, 0, 6.3); ctx.fill(); } }
    // écrans de console
    ctx.save(); ctx.translate(ox2, oy2);
    for (const sc of S.screens) { ctx.strokeStyle = 'rgba(95,242,255,.85)'; ctx.lineWidth = 1.4 * u; ctx.beginPath(); for (let i = 0; i <= 30; i++) { const x = sc.x + 6 * u + i * (sc.w - 12 * u) / 30, y = sc.y + sc.h / 2 + Math.sin(i * .6 + t * 4 + sc.x) * sc.h * .3 * Math.sin(t + i * .2); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); VK.glow(ctx, sc.x + sc.w / 2, sc.y + sc.h / 2, sc.w * .6, [95, 242, 255], .2); }
    ctx.restore();
    // le professeur (sauf s'il est à bord de la soucoupe…)
    const s = S.sci;
    if (!s.gone) VK.scientist(ctx, { x: s.x, foot: S.floor - s.lift, sc: S.sc, dir: s.dir, phase: s.phase, walk: s.mode === 'walk', pose: s.pose, rot: s.lift > 0 ? Math.sin(S.t * 3) * .3 : 0, bub: s.bub, float: s.lift > 0 });
    S.put(S.layers.glass);
  },
  hit(S, x, y) {
    const { u } = S;
    for (const a of S.aliens) if (a.k > .3 && Math.abs(x - a.x) < 40 * u * a.s && y > a.base - 90 * u * a.s * a.k && y < a.base) return 'alien';
    if (Math.abs(x - S.sci.x) < 22 * S.sc && y > S.floor - 140 * S.sc - S.sci.lift && !S.sci.gone) return 'sci';
    if (y < S.hz && y > S.TOP * .2) return 'glass';
    return null;
  },
  click(S, x, y, h) {
    const { u } = S;
    if (h === 'alien') { const a = S.aliens.find(a => Math.abs(x - a.x) < 40 * u * a.s); if (a) { a.state = 'duck'; a.fast = true; } }
    else if (h === 'sci') { S.sci.bub = pick(['Bonjour ?', '!', '👽 ?']); S.sci.bubT = 1.6; S.sci.pose = 'wave'; S.sci.timer = 1.5; S.sci.mode = 'act'; }
    else if (h === 'glass') { // on tapote la vitre : quelqu'un vient voir
      const near = S.spots.reduce((b, sx) => Math.abs(sx - x) < Math.abs(b - x) ? sx : b, S.spots[0]);
      if (!S.aliens.find(a => a.x === near)) spawnAlien(S, near, true);
    }
  },
  accent(S, col) { for (const p of S.plants.slice(0, 6)) p.col = col; },
  event(S, type) { type === 'storm' ? startStorm(S) : startBeam(S); },
  secret(S) { S.party = true; S.partyT = 8; S.nextAlien = 0; VK.say('ufo', 'start'); }
});

/* ---------- habitants ---------- */
function spawnAlien(S, x, waveNow) {
  const free = S.spots.filter(sx => !S.aliens.find(a => a.x === sx)); if (!free.length) return;
  const sx = x != null ? x : pick(free);
  const tone = pick([[143, 216, 138], [150, 190, 255], [200, 160, 255], [120, 220, 200]]);
  S.aliens.push({ x: sx, base: S.hz, s: rnd(.85, 1.2) * (S.compact ? .7 : 1), k: 0, state: 'rise', t: 0, stay: rnd(3, 7), tap: 0, wave: waveNow ? 1.6 : 0, col: tone, seed: rnd(0, 3), antenna: Math.random() < .6, eyes: Math.random() < .2 ? 3 : 2 });
}
function drawAlien(ctx, S, a, ox, oy) {
  const { u } = S, s = a.s * u, x = a.x + ox, base = a.base + oy, k = a.k;
  const hy = base - 70 * s * k + (a.tap > 0 ? Math.sin(a.tap * 30) * 2 * s : 0);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 80 * s, base - 160 * s, 160 * s, 160 * s); ctx.clip();
  const c = a.col, dk = c.map(v => v * .65);
  // corps et tête
  ctx.fillStyle = rgba(dk); ctx.beginPath(); ctx.ellipse(x, hy + 60 * s, 26 * s, 30 * s, 0, 0, 6.3); ctx.fill();
  const g = ctx.createRadialGradient(x - 10 * s, hy - 12 * s, 4 * s, x, hy, 40 * s); g.addColorStop(0, rgba(lighten(c, .3))); g.addColorStop(1, rgba(dk));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, hy, 30 * s, 34 * s, 0, 0, 6.3); ctx.fill();
  if (a.antenna) { ctx.strokeStyle = rgba(dk); ctx.lineWidth = 3 * s; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + d * 10 * s, hy - 30 * s); ctx.quadraticCurveTo(x + d * 20 * s, hy - 52 * s, x + d * 16 * s, hy - 60 * s); ctx.stroke(); VK.glow(ctx, x + d * 16 * s, hy - 60 * s, 8 * s, [255, 240, 120], .7); ctx.fillStyle = '#fff6b0'; ctx.beginPath(); ctx.arc(x + d * 16 * s, hy - 60 * s, 3 * s, 0, 6.3); ctx.fill(); } }
  // yeux qui suivent le professeur
  const lookX = clamp((S.sci.x - x) / 400, -1, 1) * 3 * s, eyes = a.eyes === 3 ? [-14, 0, 14] : [-11, 11];
  for (const ex of eyes) {
    ctx.fillStyle = '#05080a'; ctx.beginPath(); ctx.ellipse(x + ex * s, hy - 2 * s, (a.eyes === 3 ? 6 : 9) * s, a.blink ? 1 * s : 13 * s, ex * .02, 0, 6.3); ctx.fill();
    if (!a.blink) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x + ex * s + lookX - 2 * s, hy - 7 * s, 2.5 * s, 0, 6.3); ctx.fill(); }
  }
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x, hy + 16 * s, 5 * s, .2, Math.PI - .2); ctx.stroke();
  // main contre la vitre, ou qui fait coucou
  const hx = x + 30 * s, hand = a.wave > 0 ? hy - 10 * s + Math.sin(a.wave * 14) * 6 * s : hy + 20 * s;
  ctx.fillStyle = rgba(c); ctx.beginPath(); ctx.ellipse(hx, hand, 9 * s, 11 * s, a.wave > 0 ? Math.sin(a.wave * 14) * .5 : 0, 0, 6.3); ctx.fill();
  for (let f = -1; f <= 1; f++) { ctx.beginPath(); ctx.ellipse(hx + f * 5 * s, hand - 12 * s, 2.6 * s, 6 * s, f * .3, 0, 6.3); ctx.fill(); }
  if (a.tap > 0) { ctx.strokeStyle = `rgba(255,255,255,${a.tap})`; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.arc(hx, hand - 14 * s, (1 - a.tap * 2) * 20 * s + 6 * s, 0, 6.3); ctx.stroke(); }
  ctx.restore();
  // buée sur la vitre
  VK.glow(ctx, x, hy + 18 * s, 22 * s, [220, 240, 255], .12 * k);
}
/* ---------- soucoupe et rayon tracteur ---------- */
function startBeam(S) { if (S.ufo) return; S.ufo = { x: -120 * S.u, y: S.TOP * .45, stage: 'in', t: 0 }; S.sci.bub = '?!'; S.sci.bubT = 2; VK.say('beam', 'start'); }
function startStorm(S) { if (S.ev) return; S.ev = { type: 'storm', t0: S.t }; S.dimT = .25; VK.say('storm', 'start'); }
function stepBeam(S, dt) {
  const f = S.ufo, s = S.sci, u = S.u; f.t += dt;
  if (f.stage === 'in') { f.x += (s.x - f.x) * Math.min(1, dt * 1.5); if (Math.abs(f.x - s.x) < 4 * u) { f.stage = 'beam'; f.t = 0; s.mode = 'act'; s.timer = 99; s.pose = 'cheer'; } }
  else if (f.stage === 'beam') { s.lift = Math.min(160 * u, s.lift + 50 * u * dt); if (s.lift >= 160 * u || f.t > 3.5) { s.gone = true; f.stage = 'away'; f.t = 0; } }
  else if (f.stage === 'away') { f.y -= 120 * u * dt; f.x += 160 * u * dt; if (f.t > 4) { f.stage = 'back'; f.t = 0; f.x = S.W + 120 * u; f.y = S.TOP * .45; } }
  else if (f.stage === 'back') { f.x += (s.x - f.x) * Math.min(1, dt * 1.5); if (Math.abs(f.x - s.x) < 4 * u) { f.stage = 'drop'; s.gone = false; } }
  else if (f.stage === 'drop') { s.lift = Math.max(0, s.lift - 70 * u * dt); if (s.lift <= 0) { f.stage = 'leave'; f.t = 0; s.pose = null; s.timer = 2; s.bub = '@_@'; s.bubT = 2.5; VK.say('beam', 'end'); } }
  else if (f.stage === 'leave') { f.y -= 160 * u * dt; if (f.y < -100 * u) S.ufo = null; }
}
function drawUfo(ctx, S) {
  const { u } = S, f = S.ufo, t = S.t;
  if (f.stage === 'beam' || f.stage === 'drop') {
    const g = ctx.createLinearGradient(0, f.y, 0, S.floor); g.addColorStop(0, 'rgba(160,255,190,.55)'); g.addColorStop(1, 'rgba(160,255,190,.08)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(f.x - 18 * u, f.y + 8 * u); ctx.lineTo(f.x + 18 * u, f.y + 8 * u); ctx.lineTo(f.x + 70 * u, S.floor); ctx.lineTo(f.x - 70 * u, S.floor); ctx.closePath(); ctx.fill();
  }
  VK.glow(ctx, f.x, f.y, 50 * u, [140, 255, 160], .45);
  ctx.fillStyle = metal(ctx, 0, f.y - 10 * u, 0, f.y + 10 * u, ['#eef3f8', '#a7b2bf', '#69737f', '#353b44']); ctx.beginPath(); ctx.ellipse(f.x, f.y, 46 * u, 11 * u, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = 'rgba(160,255,200,.75)'; ctx.beginPath(); ctx.ellipse(f.x, f.y - 7 * u, 18 * u, 14 * u, 0, Math.PI, 0); ctx.fill();
  for (let i = -3; i <= 3; i++) { ctx.fillStyle = Math.sin(t * 8 + i) > 0 ? '#ffe36b' : '#6bf0ff'; ctx.beginPath(); ctx.arc(f.x + i * 12 * u, f.y + 3 * u, 2.5 * u, 0, 6.3); ctx.fill(); }
}
/* ---------- le professeur ---------- */
function sciStep(S, dt) {
  const s = S.sci, u = S.u;
  if (s.bub && (s.bubT -= dt) <= 0) s.bub = null;
  if (S.ufo) return;
  if (s.mode === 'walk') { const sp = 60 * u, d = s.target - s.x; s.dir = d >= 0 ? 1 : -1; s.phase += dt * 7; if (Math.abs(d) < sp * dt) { s.x = s.target; s.mode = 'act'; s.pose = s.task; s.timer = rnd(2, 4.5); } else s.x += s.dir * sp * dt; }
  else if ((s.timer -= dt) <= 0) {
    s.pose = null;
    const watching = S.aliens.find(a => a.state === 'look');
    if (watching && Math.random() < .6) { s.target = clamp(watching.x - 60 * u, 30 * u, S.W - 30 * u); s.task = 'wave'; }
    else { s.target = rnd(S.compact ? 40 : S.SL, S.compact ? S.W - 40 : S.W - S.SR); s.task = pick(['notes', 'look', null]); }
    s.mode = 'walk';
  }
}
})();
