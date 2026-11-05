/* Puerto del Resumen: temporada de Navidad y Año Nuevo, sobre la API pública de dibujo Paper FX.
   Se activa sola del 5 de diciembre al 5 de enero (hora de Lima). Fuera de esas fechas no dibuja nada. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const KINDS = ['navidad', 'anio-nuevo'];
  const RED = '#C23B33', RED_LT = '#E0675C', SNOW = '#FDFCF8', ICE = '#7FC4E0', LEAF = '#3FA27F';
  const LIMA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: 'numeric', day: 'numeric' });
  const limaDay = now => { const part = type => Number(LIMA.formatToParts(now).find(p => p.type === type).value); return { year: part('year'), month: part('month'), day: part('day') }; };
  // Same seeded noise on every frame, so flakes, drifts and bursts stay where they were.
  const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const easeOut = v => 1 - Math.pow(1 - v, 3);
  const rgba = (hex, alpha) => { const v = parseInt(hex.slice(1), 16); return 'rgba(' + (v >> 16 & 255) + ',' + (v >> 8 & 255) + ',' + (v & 255) + ',' + alpha + ')'; };
  const flat = { shadow: false, tex: 0, edge: 0 };

  // Christmas runs through the 26th; from the 27th the port is already waiting for the new year.
  function season(now = new Date()) {
    const { year, month, day } = limaDay(now), next = month === 12 ? year + 1 : year;
    if (month === 12 && day >= 5 && day <= 26) return { kind: 'navidad', year: next };
    if ((month === 12 && day >= 27) || (month === 1 && day <= 5)) return { kind: 'anio-nuevo', year: next };
    return null;
  }
  // ?fiestas=navidad or ?fiestas=anio-nuevo previews a theme out of season; ?fiestas=no turns it off.
  function current(now = new Date(), search = root.location?.search || '') {
    const forced = new URLSearchParams(search).get('fiestas');
    if (forced === 'no') return null;
    if (!KINDS.includes(forced)) return season(now);
    const { year, month } = limaDay(now);
    return { kind: forced, year: month === 1 ? year : year + 1 };
  }

  function bulb(ctx, x, y, r, color, level) {
    if (level > .05) { ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fillStyle = rgba(color, .28 * level); ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = color; ctx.globalAlpha = .55 + .45 * level; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = .6; ctx.strokeStyle = 'rgba(22,38,49,.7)'; ctx.stroke();
  }
  const glow = (t, i, quiet) => quiet ? 1 : .5 + .5 * Math.sin(t * 2.4 + i * 1.9);
  // A string of lights: one scallop per pair of anchors, a bulb every `gap` pixels.
  function festoon(pen, anchors, sag, t, quiet, colors, gap = 17) {
    const ctx = pen.ctx, path = [], bulbs = [];
    for (let s = 0; s + 1 < anchors.length; s++) {
      const [x0, y0] = anchors[s], [x1, y1] = anchors[s + 1], len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(4, Math.round(len / 9)), count = Math.max(1, Math.round(len / gap) - 1);
      const at = v => [x0 + (x1 - x0) * v, y0 + (y1 - y0) * v + sag * 4 * v * (1 - v)];
      for (let i = 0; i <= steps; i++) path.push(at(i / steps));
      for (let i = 1; i <= count; i++) bulbs.push(at(i / (count + 1)));
    }
    if (path.length < 2) return;
    pen.line(path, { unit: 1.2, sw: .8, curv: 0, alpha: .75, rim: false, j: .1 });
    bulbs.forEach(([x, y], i) => bulb(ctx, x, y + 2, 2.3, colors[i % colors.length], glow(t, i, quiet)));
  }
  function drift(pen, x0, x1, y, height, seed) {
    const pts = [[x0, y + 2], [x0, y]], step = 9;
    for (let x = x0 + step / 2, i = 0; x < x1; x += step, i++) pts.push([x, y - height * (.45 + .55 * hash(seed + i))]);
    pts.push([x1, y], [x1, y + 2]);
    pen.shape(pts, { unit: 1.1, fill: SNOW, sw: .6, curv: .5, j: .12, ...flat });
  }
  function santaHat(pen, x, y, u, dir, t) {
    const { rr, ell } = root.PMOPuerto, ctx = pen.ctx, unit = .6 * u, swing = .14 * Math.sin(t * 2.2 + x * .05);
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.rotate(-.12);
    pen.shape([[-1.2 * u, 0], [-.95 * u, -1.1 * u], [-.25 * u, -1.85 * u], [.7 * u, -2 * u], [1.6 * u, -1.45 * u], [1.05 * u, -1.15 * u], [1.2 * u, 0]], { unit, fill: RED, pool: RED_LT, sw: .85, curv: .5, j: .12, ...flat });
    pen.shape(ell(1.7 * u, (-1.35 + swing) * u, .42 * u, .42 * u, 10), { unit, fill: SNOW, sw: .7, j: .08, ...flat });
    pen.shape(rr(-1.5 * u, -.32 * u, 3 * u, .72 * u, .36 * u, 2), { unit, fill: SNOW, sw: .75, j: .1, ...flat });
    ctx.restore();
  }
  function partyHat(pen, x, y, u, seed, t) {
    const { ell } = root.PMOPuerto, pal = root.CosmosFx.draw.PAL, ctx = pen.ctx, unit = .6 * u, tones = [pal.gold, RED, LEAF, ICE], body = tones[seed % 4], band = tones[(seed + 1) % 4];
    ctx.save(); ctx.translate(x, y); ctx.rotate(.14 * (seed % 2 ? 1 : -1) + .04 * Math.sin(t * 2 + seed));
    pen.shape([[-1.15 * u, 0], [0, -2.5 * u], [1.15 * u, 0]], { unit, fill: body, sw: .85, j: .1, ...flat });
    for (const v of [.3, .62]) pen.line([[-1.15 * u * (1 - v), -2.5 * u * v], [1.15 * u * (1 - v), -2.5 * u * v]], { unit, sw: 1.3, col: band, curv: 0, alpha: 1, rim: false, j: .05 });
    pen.shape(ell(0, -2.6 * u, .38 * u, .38 * u, 10), { unit, fill: SNOW, sw: .7, j: .08, ...flat });
    ctx.restore();
  }
  // Wreath for the bridge: a ring of leaves, berries and a bow.
  function wreath(pen, x, y, r) {
    const { ell } = root.PMOPuerto, pal = root.CosmosFx.draw.PAL, ctx = pen.ctx;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; pen.shape(ell(x + Math.cos(a) * r, y + Math.sin(a) * r, r * .38, r * .3, 7), { unit: 1, fill: i % 2 ? pal.ok : LEAF, sw: .5, j: .08, ...flat }); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.max(1, r * .14), 0, TAU); ctx.fillStyle = RED; ctx.fill(); }
    for (const side of [-1, 1]) pen.shape([[x, y + r], [x + side * r * .6, y + r * .72], [x + side * r * .6, y + r * 1.28]], { unit: 1, fill: RED, sw: .6, j: .05, ...flat });
  }
  function star(x, y, r, spin = 0) { return Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + spin + i / 10 * TAU, d = i % 2 ? r * .45 : r; return [x + Math.cos(a) * d, y + Math.sin(a) * d]; }); }
  function tree(pen, x, y, height, t, quiet) {
    const { rr } = root.PMOPuerto, pal = root.CosmosFx.draw.PAL, ctx = pen.ctx, tier = height / 3.1, tiers = [[0, .56], [.24, .46], [.48, .34]];
    pen.shape(rr(x - height * .06, y - height * .12, height * .12, height * .13, 1), { unit: 1, fill: pal.sandDk, sw: .7, ...flat });
    tiers.forEach(([rise, half]) => {
      const base = y - height * .08 - rise * height, top = base - tier * 1.5;
      pen.shape([[x - half * height, base], [x, top], [x + half * height, base]], { unit: 1.2, fill: pal.ok, pool: LEAF, sw: .85, j: .15, ...flat });
      pen.line([[x - half * height + 2, base - 1], [x, base + 2], [x + half * height - 2, base - 1]], { unit: 1, sw: 1.1, col: SNOW, alpha: .9, rim: false, j: .1 });
    });
    const colors = [RED, pal.gold, ICE, SNOW];
    for (let i = 0; i < 11; i++) { const v = .12 + .8 * hash(i + 3), spread = (1 - v) * .46 * height, dx = (hash(i + 8) * 2 - 1) * spread; bulb(ctx, x + dx, y - height * .1 - v * height * .82, 1.9, colors[i % 4], glow(t, i, quiet)); }
    const tip = y - height * 1.06;
    ctx.beginPath(); ctx.arc(x, tip, height * .2, 0, TAU); ctx.fillStyle = rgba(pal.gold, .22 + .1 * glow(t * .6, 0, quiet)); ctx.fill();
    pen.shape(star(x, tip, height * .12, quiet ? 0 : .12 * Math.sin(t)), { unit: 1, fill: pal.gold, sw: .8, j: .08, ...flat });
  }
  function gift(pen, x, y, w, h, body) {
    const { rr } = root.PMOPuerto, pal = root.CosmosFx.draw.PAL;
    pen.shape(rr(x - w / 2, y - h, w, h, 1.5), { unit: 1, fill: body, sw: .8, ...flat });
    pen.line([[x, y - h], [x, y]], { unit: 1, sw: 1.6, col: pal.gold, curv: 0, alpha: 1, rim: false, j: .05 });
    pen.line([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2]], { unit: 1, sw: 1.6, col: pal.gold, curv: 0, alpha: 1, rim: false, j: .05 });
    for (const side of [-1, 1]) pen.shape([[x, y - h], [x + side * 5, y - h - 4], [x + side * 5, y - h + 1]], { unit: 1, fill: pal.gold, sw: .6, j: .05, ...flat });
  }
  // Marquee of the coming year, with the bulbs running around it.
  function marquee(pen, x, y, year, t, quiet) {
    const { rr } = root.PMOPuerto, pal = root.CosmosFx.draw.PAL, ctx = pen.ctx, w = 92, h = 38, left = x - w / 2, top = y - h;
    for (const side of [-1, 1]) pen.line([[x + side * 30, top + h], [x + side * 30, top + h + 4]], { unit: 1.2, sw: 1.4, curv: 0 });
    pen.shape(rr(left, top, w, h, 5, 2), { unit: 1.3, fill: pal.navy2, pool: pal.navy3, sw: 1, shadow: false, tex: 0, edge: 0 });
    ctx.font = '800 25px Figtree, "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = pal.gold; ctx.fillText(String(year), x, top + h / 2 + 1);
    const colors = [pal.gold, RED, LEAF, SNOW], dots = [];
    for (let i = 0; i <= 9; i++) dots.push([left + i * w / 9, top], [left + i * w / 9, top + h]);
    for (let i = 1; i < 4; i++) dots.push([left, top + i * h / 4], [left + w, top + i * h / 4]);
    dots.forEach(([bx, by], i) => bulb(ctx, bx, by, 1.8, colors[i % 4], quiet ? 1 : (Math.floor(t * 5) + i) % 3 ? .15 : 1));
  }
  function reindeer(pen, x, y, s, t, nose) {
    const { ell } = root.PMOPuerto, pal = root.CosmosFx.draw.PAL, ctx = pen.ctx, gallop = Math.sin(t * 9 + x * .1) * .5, fur = pal.sandDk;
    for (const [dx, phase] of [[-7, 1], [-4, -1], [6, -1], [9, 1]]) pen.line([[x + dx * s, y + 3 * s], [x + (dx + gallop * phase * 4) * s, y + 10 * s]], { unit: 1, sw: 2.2 * s, col: pal.inkSoft, curv: 0, alpha: 1, rim: false, j: .05 });
    pen.shape(ell(x, y, 11 * s, 5.2 * s, 12), { unit: 1, fill: fur, sw: .8, j: .1, ...flat });
    pen.shape([[x + 7 * s, y - 2 * s], [x + 12 * s, y - 10 * s], [x + 16 * s, y - 8 * s], [x + 11 * s, y + 2 * s]], { unit: 1, fill: fur, sw: .8, j: .1, ...flat });
    pen.shape(ell(x + 16 * s, y - 10 * s, 4.6 * s, 3 * s, 10), { unit: 1, fill: fur, sw: .8, j: .08, ...flat });
    for (const [a, b] of [[12, -7], [17, -6]]) {
      pen.line([[x + 13 * s, y - 12 * s], [x + a * s, y - 19 * s], [x + (a + b * .4) * s, y - 22 * s]], { unit: 1, sw: 1.4, col: pal.ink, curv: .3, alpha: 1, rim: false, j: .05 });
      pen.line([[x + (a + .4) * s, y - 17 * s], [x + (a + 4) * s, y - 19 * s]], { unit: 1, sw: 1.1, col: pal.ink, curv: 0, alpha: 1, rim: false, j: .05 });
    }
    ctx.beginPath(); ctx.arc(x + 14.6 * s, y - 11 * s, .8 * s, 0, TAU); ctx.fillStyle = pal.ink; ctx.fill();
    bulb(ctx, x + 20.4 * s, y - 10 * s, 1.7 * s, nose ? RED : pal.ink, nose ? .6 + .4 * Math.sin(t * 4) : 0);
  }
  // Ribbon that trails behind the sleigh or the gulls; right = the end tied to the rope.
  function ribbon(pen, right, y, text, t, quiet) {
    const pal = root.CosmosFx.draw.PAL, ctx = pen.ctx;
    ctx.font = '800 13px Figtree, "Segoe UI", sans-serif';
    const w = ctx.measureText(text).width + 34, h = 25, left = right - w, sway = x => quiet ? 0 : 2.4 * Math.sin(x * .05 + t * 3.4), top = [], bottom = [];
    for (let x = right; x >= left; x -= 12) { top.push([x, y - h / 2 + sway(x)]); bottom.unshift([x, y + h / 2 + sway(x)]); }
    pen.line([[right, y], [right + 22, y - 2]], { unit: 1, sw: 1, curv: 0, alpha: .9, rim: false, j: .05 });
    pen.shape([...top, [left - 7, y + sway(left)], ...bottom], { unit: 1.2, fill: pal.cream, sw: .9, sdx: .5, sdy: .9, tex: 0, edge: 0, j: .1 });
    ctx.fillStyle = RED; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, left + w / 2 - 2, y + 1 + sway(left + w / 2));
    return left;
  }
  function sleigh(pen, t, quiet) {
    const draw = root.CosmosFx.draw, pal = draw.PAL, u = 2.5, seat = -8;
    ribbon(pen, -48, -6, '¡Feliz Navidad!', t, quiet);
    pen.line([[-26, -9], [-48, -7]], { unit: 1, sw: 1, curv: 0, alpha: .9, rim: false, j: .05 });
    draw.box(pen, 13, -10, 2.2, { col: pal.ok, noShadow: true, eyes: 'arc' });
    draw.cosmo(pen, seat, -8, u, { noLegs: true, noShadow: true, eyes: 'arc', mouth: 'open', blush: 1, aL: -.5, aR: 1.1 + .25 * Math.sin(t * 7), t });
    santaHat(pen, seat, -8 - 7.9 * u + 1.4, 4.3, 1, t);
    pen.shape([[-24, -2], [-30, -17], [-23, -19], [-13, -9], [16, -9], [25, -17], [30, -15], [23, -2]], { unit: 1.3, fill: RED, pool: RED_LT, sw: 1, curv: .35, j: .12, ...flat });
    for (let i = 0; i < 4; i++) pen.shape(star(-13 + i * 9, -5.4, 1.9), { unit: .8, fill: pal.gold, ink: null, j: 0, ...flat });
    for (const px of [-14, 12]) pen.line([[px, -2], [px, 4]], { unit: 1, sw: 1.6, col: pal.gold, curv: 0, alpha: 1, rim: false, j: .05 });
    pen.line([[-30, 4], [24, 4], [34, 0], [31, -4]], { unit: 1.2, sw: 1.9, col: pal.gold, curv: .4, alpha: 1, rim: false, j: .08 });
    pen.line([[24, -8], [52, -6]], { unit: 1, sw: .9, col: pal.gold, curv: 0, alpha: 1, rim: false, j: .05 });
    reindeer(pen, 60, -6 + 2 * Math.sin(t * 5), .78, t, false);
    pen.line([[74, -11], [90, -8]], { unit: 1, sw: .9, col: pal.gold, curv: 0, alpha: 1, rim: false, j: .05 });
    reindeer(pen, 100, -8 + 2 * Math.sin(t * 5 + 1.4), .78, t, true);
  }
  // Pass across the sky every `every` seconds; the first one starts shortly after the scene opens.
  const flight = (scene, t, first, width, every = 36, crossing = 17) => {
    const left = -130, right = scene.w + width;
    if (scene.quiet) return left + (right - left) * .5;
    const p = ((t - first + every - 3) % every) / crossing;
    return p < 1 ? left + (right - left) * p : null;
  };

  function flakes(scene, pen, t, front) {
    const ctx = pen.ctx, { w, h } = scene, count = Math.round(w / (front ? 34 : 19)), span = h + 16;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const seed = i * 3.1 + (front ? 700 : 0), speed = (front ? 26 : 14) + 16 * hash(seed), r = (front ? 1.7 : 1) + 1.3 * hash(seed + 3);
      const y = (hash(seed + 1) * span + t * speed) % span - 8, x = hash(seed + 2) * w + 13 * Math.sin(t * .6 + seed);
      if (i % 5 === 0) {
        const arm = r * 2.3, spin = t * .5 + seed;
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(47,98,117,.28)';
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (let k = 0; k < 3; k++) { const dx = Math.cos(spin + k * TAU / 6) * arm, dy = Math.sin(spin + k * TAU / 6) * arm; ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); }
          ctx.stroke(); ctx.lineWidth = .9; ctx.strokeStyle = '#FFFFFF';
        }
      } else {
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.lineWidth = .5; ctx.strokeStyle = 'rgba(47,98,117,.32)'; ctx.stroke();
      }
    }
  }
  function confetti(scene, pen, t, front) {
    const pal = root.CosmosFx.draw.PAL, ctx = pen.ctx, { w, h } = scene, count = Math.round(w / (front ? 40 : 24)), span = h + 16, tones = [pal.gold, RED, LEAF, ICE, SNOW, pal.rust];
    for (let i = 0; i < count; i++) {
      const seed = i * 2.7 + (front ? 900 : 0), speed = 22 + 18 * hash(seed), size = 2.2 + 2 * hash(seed + 3);
      ctx.save();
      ctx.translate(hash(seed + 2) * w + 18 * Math.sin(t * .8 + seed), (hash(seed + 1) * span + t * speed) % span - 8);
      ctx.rotate(t * 1.4 + seed); ctx.scale(Math.cos(t * 3 + seed), 1);
      ctx.fillStyle = tones[i % tones.length]; ctx.fillRect(-size, -size * .55, size * 2, size * 1.1);
      ctx.restore();
    }
  }
  function burst(ctx, x, y, radius, age, seed) {
    const pal = root.CosmosFx.draw.PAL, tones = [pal.gold, RED_LT, '#6FD0A8', ICE, SNOW], a = tones[Math.floor(seed) % 5], b = tones[(Math.floor(seed) + 2) % 5], rays = 18, spread = easeOut(Math.min(1, age / 1.05)), fade = Math.max(0, 1 - age / 1.7), drop = 15 * age * age;
    ctx.lineCap = 'round';
    for (let i = 0; i < rays; i++) {
      const angle = i / rays * TAU + hash(seed), far = radius * spread * (i % 2 ? 1 : .74), dx = Math.cos(angle), dy = Math.sin(angle), color = i % 2 ? a : b;
      ctx.globalAlpha = fade * .8; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + dx * far * .68, y + dy * far * .68 + drop * .7); ctx.lineTo(x + dx * far, y + dy * far + drop); ctx.stroke();
      ctx.globalAlpha = fade; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + dx * far, y + dy * far + drop, 2, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function fireworks(scene, pen, t) {
    const ctx = pen.ctx, { w } = scene, floor = scene.mob ? scene.seaY - 10 : scene.quayY * .62, every = 1.15, climb = .55;
    const place = k => ({ x: w * (.05 + .9 * hash(k)), y: scene.mob ? floor - 40 * hash(k + .5) : floor * (.14 + .62 * hash(k + .5)), r: (scene.mob ? 28 : 42) + 30 * hash(k + .2) });
    if (scene.quiet) { [3, 8, 14, 21].forEach(k => { const p = place(k); burst(ctx, p.x, p.y, p.r, .95, k); }); return; }
    const last = Math.floor(t / every);
    for (let k = last - 2; k <= last; k++) {
      const age = t - k * every, p = place(k);
      if (age < climb) {
        const v = easeOut(age / climb), y = floor + 30 + (p.y - floor - 30) * v;
        ctx.strokeStyle = 'rgba(255,248,236,.75)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, y + 14); ctx.lineTo(p.x, y); ctx.stroke();
      } else burst(ctx, p.x, p.y, p.r, age - climb, k);
    }
  }

  // Dusk (Christmas) or night (New Year) over the sky only: it goes under the ship, the quay and the containers.
  function sky(scene, pen, theme) {
    if (scene.mob) return;
    const { rr, ell } = root.PMOPuerto, ctx = pen.ctx, { w, h } = scene, gradient = ctx.createLinearGradient(0, 0, 0, h * .66), stops = theme.kind === 'navidad' ? ['#A5BDCC', '#C9D8DF'] : ['#33506B', '#7F9AAD'];
    gradient.addColorStop(0, stops[0]); gradient.addColorStop(.55, stops[1]); gradient.addColorStop(1, '#FFFFFF');
    ctx.save(); pen.path(rr(0, 0, w, h, 14, 3), false); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h * .66); ctx.restore();
    // The engine's sun, turned into the moon of this sky.
    const x = .92 * w, y = .15 * h, r = .065 * h;
    pen.shape(ell(x, y, r, r, 22), { unit: 1.5, fill: '#F6EDD4', pool: SNOW, sw: .8, ...flat });
    for (const [dx, dy, size] of [[-.3, -.2, .2], [.25, .15, .14], [-.05, .45, .1]]) pen.shape(ell(x + dx * r, y + dy * r, size * r, size * r, 10), { unit: 1, fill: '#E6DAB8', ink: null, j: .05, ...flat });
  }
  const craneBeams = scene => scene.phases.map((phase, index) => (scene.byPhase[phase] || []).length ? scene.bx[index] : null).filter(Boolean).map(([x, width]) => ({ from: x + .02 * width, to: x + .92 * width, y: .22 * scene.quayY - 7 }));
  function beams(scene, pen, t, theme) {
    const pal = root.CosmosFx.draw.PAL, list = scene.mob ? [] : craneBeams(scene), anchors = [], quiet = scene.quiet, snow = theme.kind === 'navidad';
    list.forEach((beam, index) => {
      if (snow) drift(pen, beam.from, beam.to, beam.y + 1, 4.5, index * 13);
      const parts = Math.max(1, Math.round((beam.to - beam.from) / 62));
      for (let i = 0; i <= parts; i++) anchors.push([beam.from + (beam.to - beam.from) * i / parts, beam.y + 9]);
    });
    anchors.forEach(([x, y], index) => {
      if (index % 2 || !list.length) return;
      if (snow) {
        const drop = 13 + 12 * hash(index), swing = quiet ? 0 : 2.2 * Math.sin(t * 1.3 + index), color = [RED, pal.gold, LEAF, ICE][index / 2 % 4];
        pen.line([[x, y], [x + swing, y + drop]], { unit: 1, sw: .7, curv: 0, alpha: .8, rim: false, j: .05 });
        pen.shape(root.PMOPuerto.ell(x + swing, y + drop + 4.2, 4.4, 4.4, 12), { unit: 1, fill: color, pool: SNOW, sw: .7, j: .06, ...flat });
      } else {
        pen.shape([[x - 6, y], [x + 6, y], [x, y + 14]], { unit: 1, fill: [pal.gold, RED, LEAF, ICE][index / 2 % 4], sw: .7, j: .08, ...flat });
      }
    });
    festoon(pen, anchors, 11, t, quiet, [RED, pal.gold, LEAF, ICE]);
  }
  function back(scene, pen, time, theme) {
    const t = scene.quiet ? 0 : time;
    sky(scene, pen, theme);
    if (theme.kind === 'navidad') flakes(scene, pen, t, false); else { fireworks(scene, pen, t); confetti(scene, pen, t, false); }
    beams(scene, pen, t, theme);
  }
  // Only the containers on top of each stack dress up, so colors, flags and faces of the rest stay as they are.
  function topOfStack(scene) {
    const { isShort } = root.PMOPuerto;
    return scene.items.filter(item => {
      const at = scene.pos[item.id];
      return at && !scene.items.some(other => { const p = scene.pos[other.id]; return p && other !== item && Math.abs(p.x - at.x) < 2.4 * at.u && p.y < at.y - at.u && p.y > at.y - 5 * at.u; });
    }).map(item => ({ item, short: isShort(item), at: scene.cur[item.id] })).filter(entry => entry.at);
  }
  function dress(pen, x, y, u, index, flagged, theme, t) {
    if (theme.kind === 'navidad') santaHat(pen, x, y, u, flagged || index % 2 ? -1 : 1, t);
    else partyHat(pen, flagged ? x - .9 * u : x, y, u * .92, index, t);
  }
  function barge(scene, pen, t, theme) {
    if (scene.mob || !scene.bx?.length) return;
    const draw = root.CosmosFx.draw, pal = draw.PAL, ctx = pen.ctx, shore = scene.quayY + scene.faceH - 6, depth = 1.1 * (scene.h - shore), water = shore + 2 + .52 * depth;
    const x = scene.w * (.32 + (scene.quiet ? 0 : .2 * Math.sin(t * .05))), y = water - 4 + 1.6 * Math.sin(t * 1.5), rot = .022 * Math.sin(t * 1.1);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (theme.kind === 'navidad') {
      tree(pen, -14, -11, 46, t, scene.quiet);
      gift(pen, 24, -11, 15, 11, RED); gift(pen, 40, -11, 12, 9, pal.ok);
    } else marquee(pen, 0, -14, theme.year, t, scene.quiet);
    pen.shape([[-60, -12], [60, -12], [52, 11], [-52, 11]], { unit: 1.4, fill: pal.navy2, pool: pal.navy3, sw: 1, curv: .1, j: .15, ...flat });
    pen.line([[-58, -7], [58, -7]], { unit: 1.2, sw: 2, col: pal.sand, curv: 0, alpha: 1, rim: false, j: .1 });
    ctx.restore();
    draw.waves(pen, 0, scene.w, shore + 2, depth, scene.quiet ? 0 : .7 * t, 1, [2]);
  }
  function fly(scene, pen, t, first, theme) {
    if (scene.mob) return;
    const draw = root.CosmosFx.draw, ctx = pen.ctx, y = Math.max(46, .11 * scene.h) + (scene.quiet ? 0 : 5 * Math.sin(t * 1.4)), text = '¡Feliz ' + theme.year + '!';
    const x = flight(scene, t, first, theme.kind === 'navidad' ? 240 : 170);
    if (x == null) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(scene.quiet ? 0 : .025 * Math.sin(t * 1.1)); ctx.scale(1.15, 1.15);
    if (theme.kind === 'navidad') sleigh(pen, t, scene.quiet);
    else { ribbon(pen, 0, 0, text, t, scene.quiet); draw.gull(pen, 30, -2, 9, t * 2.1); draw.gull(pen, 52, -9, 8, t * 2.1 + .4); draw.gull(pen, 52, 6, 8, t * 2.1 + .8); }
    ctx.restore();
  }
  function front(scene, pen, time, first, theme) {
    const t = scene.quiet ? 0 : time, snow = theme.kind === 'navidad', tops = topOfStack(scene);
    if (snow && !scene.mob && scene.bx?.length) { const last = scene.bx[scene.bx.length - 1]; drift(pen, 8, last[0] + last[1] - 2, scene.quayY + 1, 4, 41); }
    tops.forEach(({ item, short, at }, index) => {
      const half = (short ? 1.9 : 3) * at.u, roof = at.y - 3.6 * at.u;
      if (snow) drift(pen, at.x - half * .94, at.x + half * .94, roof + 1, .75 * at.u, index * 7);
      dress(pen, at.x, roof + .3 * at.u, at.u * .92, index, !!item.risk && item.risk !== 'late', theme, t);
    });
    barge(scene, pen, t, theme);
    fly(scene, pen, t, first, theme);
    if (snow) flakes(scene, pen, t, true); else confetti(scene, pen, t, true);
  }
  // Lights from the funnel to the flagpole and down to bow and stern, drawn in the ship's own rotated frame.
  function dressShip(pen, ship, t, quiet, theme) {
    const pal = root.CosmosFx.draw.PAL, { size, pole, tops } = ship, snow = theme.kind === 'navidad', colors = [pal.gold, RED, ICE, LEAF];
    const funnel = [-.4 * size, -.368 * size], top = [pole, -.44 * size - 6];
    if (snow) { drift(pen, -.47 * size, -.34 * size, -.288 * size + 1, 3.4, 5); wreath(pen, -.405 * size, -.178 * size, .03 * size); }
    festoon(pen, [[-.5 * size, -.096 * size], funnel], 3, t, quiet, colors, 15);
    festoon(pen, [funnel, [-.2 * size, -.33 * size], [0, -.345 * size], [.2 * size, -.37 * size], top], 7, t, quiet, colors, 15);
    festoon(pen, [top, [.49 * size, -.14 * size]], 4, t, quiet, colors, 15);
    tops.forEach(({ x, y, u }, index) => dress(pen, x, y + .3 * u, u * .95, index, false, theme, t));
  }

  function decorate(scene, theme) {
    if (!theme || scene.fiestas) return scene;
    scene.fiestas = theme;
    const { _ship: ship, draw } = scene;
    let first = null, now = 0;
    scene._ship = function (pen, time) { now = this.quiet ? 0 : time; back(this, pen, time, theme); return ship.apply(this, arguments); };
    scene.onShip = (pen, at) => dressShip(pen, at, now, scene.quiet, theme);
    scene.draw = function (pen, since, time) {
      const result = draw.apply(this, arguments);
      if (first == null) first = time;
      front(this, pen, time, first, theme);
      return result;
    };
    return scene;
  }

  const api = { season, current, decorate };
  root.PMOFiestas = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
