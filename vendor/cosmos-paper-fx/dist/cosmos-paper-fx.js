/*!
 * COSMOS Paper FX v1.0.0
 * Capa de animación reactiva en estilo "papel pintado" para el Portafolio Ejecutivo de IT.
 * Canvas 2D, sin dependencias, sin IA en tiempo de ejecución.
 * Estilo: lavado plano + tinta que "hierve" a 12 fps + grano de papel + sombra de papel recortado.
 */
(function (global) {
  'use strict';

  // ------------------------------------------------------------------ paleta
  // Marca: navy #021E2F / #00293B / #003D53, arena #CBA785. El resto son tonos portuarios armonizados.
  const PAL = {
    paper: '#F5EFE4', paperDk: '#E6DCCB', cream: '#FFF8EC',
    ink: '#162631', inkSoft: '#3A4E5B',
    navy: '#021E2F', navy2: '#00293B', navy3: '#003D53', steel: '#4F7A8B',
    sea1: '#A9C7CF', sea2: '#5E8FA3', sea3: '#2F6275', foam: '#EEF5F3',
    sand: '#CBA785', sandDk: '#A9825F', sandLt: '#E8D6C1',
    rust: '#C2633F', ok: '#2F755F', okLt: '#6FAE92', warn: '#D69A3C', danger: '#B2493A',
    violet: '#6E5C83', blush: '#E59A86', sky: '#DDE9EC', gold: '#E9C46A'
  };
  // Colores por estatus del portafolio (mismo mapa semántico que el portal v8).
  const STATUS = {
    'cerrado': PAL.ok, 'en proceso': PAL.navy3, 'planificado': PAL.sand, 'propuesto': PAL.violet,
    'riesgo': PAL.warn, 'bloqueo': PAL.danger, 'default': PAL.steel
  };
  Object.assign(STATUS, { // situación de plazo y prioridad (mismo criterio semántico del portal)
    'vencido': PAL.danger, 'forecast retrasado': PAL.warn, 'en fecha': PAL.ok, 'sin forecast': PAL.steel, 'sin fin plan': '#9AA7AD',
    'critical': PAL.danger, 'high': PAL.warn, 'medium': PAL.navy3, 'low': PAL.steel, 'bloqueos': PAL.danger, 'riesgos': PAL.warn
  });
  const statusColor = s => {
    const k = String(s || '').toLowerCase().replace(/[^a-záéíóúñ ]/g, '').trim();
    if (STATUS[k]) return STATUS[k];
    for (const key of ['critical', 'high', 'medium', 'low']) if (k.includes(key)) return STATUS[key];
    return STATUS.default;
  };

  // ------------------------------------------------------------------ utilidades
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = x => Math.pow(clamp(x), 3);
  const backOut = (x, s = 1.7) => { x = clamp(x) - 1; return 1 + (s + 1) * x * x * x + s * x * x; };
  const elasticOut = x => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (TAU / 3)) + 1; };
  const bump = x => Math.sin(clamp(x) * Math.PI);          // 0 → 1 → 0
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function mix(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = s => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, clamp(k)));
    return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
  }
  function rgba(hex, a) {
    const p = parseInt(hex.slice(1), 16);
    return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${a})`;
  }
  // PRNG determinista (mulberry32) para que el "hervor" de la tinta sea estable dentro de cada cuadro.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------------ textura de papel (se crea una vez)
  let GRAIN = null;
  function grainCanvas() {
    if (GRAIN) return GRAIN;
    const s = 192, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d'), img = g.createImageData(s, s), r = rng(7);
    // ruido de valor suave + motas de pigmento
    const cell = 12, grid = [];
    for (let y = 0; y <= s / cell; y++) { grid[y] = []; for (let x = 0; x <= s / cell; x++) grid[y][x] = r(); }
    const at = (x, y) => grid[y % (s / cell)][x % (s / cell)];
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = ease(gx - x0), fy = ease(gy - y0);
      const v = lerp(lerp(at(x0, y0), at(x0 + 1, y0), fx), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), fx), fy);
      const speck = r() < .035 ? r() * .6 : 0;
      const n = clamp(.72 + v * .28 - speck + (r() - .5) * .12);
      const i = (y * s + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(n * 255); img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); GRAIN = c; return c;
  }

  // ------------------------------------------------------------------ Pen: el pincel
  // Cada Pen envuelve un contexto 2D. `boil` cambia 12 veces por segundo y reinicia el azar de la línea,
  // por eso el contorno "respira" como animación dibujada a mano; el relleno se mueve menos que la tinta.
  class Pen {
    constructor(ctx, o = {}) {
      this.ctx = ctx; this.scale = o.scale || 1; this.onDark = !!o.onDark; this.boil = 0; this.n = 0;
      this.seed = o.seed || 1; this.jitter = o.jitter ?? 1; this.static = !!o.static;
      this.pattern = null;
    }
    frame(time, reduced) {
      this.boil = (this.static || reduced) ? 0 : Math.floor(time * 12); this.n = 0;
    }
    r() { // azar por forma y por cuadro de hervor
      this.n++; const f = rng((this.boil * 9973 + this.n * 131 + this.seed * 7919) >>> 0);
      return f;
    }
    tex() {
      if (!this.pattern) this.pattern = this.ctx.createPattern(grainCanvas(), 'repeat');
      return this.pattern;
    }
    // Traza una ruta suave (o poligonal) a partir de puntos.
    path(pts, curv, close = true) {
      const c = this.ctx; c.beginPath();
      if (!curv || pts.length < 3) {
        c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
        if (close) c.closePath(); return;
      }
      const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (close) {
        let m = mid(pts[n - 1], pts[0]); c.moveTo(m[0], m[1]);
        for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; m = mid(p, q); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
        c.closePath();
      } else {
        c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
        c.lineTo(pts[n - 1][0], pts[n - 1][1]);
      }
    }
    wob(pts, amt) {
      if (!amt || this.jitter === 0) return pts;
      const r = this.r(), a = amt * this.jitter;
      return pts.map(p => [p[0] + (r() * 2 - 1) * a, p[1] + (r() * 2 - 1) * a]);
    }
    // Forma pintada: sombra de papel recortado + lavado + textura + borde de pigmento + tinta.
    shape(pts, o = {}) {
      const c = this.ctx, s = o.unit || this.scale, curv = o.curv ?? 0;
      const fillPts = this.wob(pts, (o.j ?? .45) * s * .35);
      if (o.shadow !== false && o.fill) {
        c.save(); c.translate(s * (o.sdx ?? .9), s * (o.sdy ?? 1.2));
        this.path(fillPts, curv); c.fillStyle = this.onDark ? 'rgba(0,0,0,.38)' : rgba(PAL.ink, o.shadowA ?? .16); c.fill(); c.restore();
      }
      if (o.fill) {
        this.path(fillPts, curv); c.fillStyle = o.fill; c.globalAlpha = o.alpha ?? 1; c.fill();
        if (o.tex !== 0 || o.pool || o.edge !== 0) {
          c.save(); c.clip();
          if (o.pool) { // charco de luz arriba (acuarela)
            const b = bbox(fillPts); const g = c.createLinearGradient(0, b.y, 0, b.y + b.h);
            g.addColorStop(0, rgba(o.pool, .55)); g.addColorStop(.55, rgba(o.pool, 0)); c.fillStyle = g; c.fillRect(b.x, b.y, b.w, b.h);
          }
          if (o.settle) { // pigmento asentado abajo
            const b = bbox(fillPts); const g = c.createLinearGradient(0, b.y, 0, b.y + b.h);
            g.addColorStop(.55, rgba(o.settle, 0)); g.addColorStop(1, rgba(o.settle, .35)); c.fillStyle = g; c.fillRect(b.x, b.y, b.w, b.h);
          }
          if (o.tex !== 0) { c.globalCompositeOperation = 'multiply'; c.globalAlpha = (o.tex ?? .22) * (o.alpha ?? 1); c.fillStyle = this.tex(); c.fillRect(-4000, -4000, 8000, 8000); c.globalCompositeOperation = 'source-over'; }
          if (o.edge !== 0) { // borde de pigmento: la acuarela se oscurece donde se seca
            c.globalAlpha = (o.edge ?? .3) * (o.alpha ?? 1); this.path(fillPts, curv); c.lineWidth = s * 1.6; c.strokeStyle = mix(o.fill, PAL.ink, .45); c.stroke();
          }
          c.restore();
        }
        c.globalAlpha = 1;
      }
      if (o.ink !== null) {
        const inkCol = o.ink || PAL.ink, sw = (o.sw ?? 1) * s * .42, ip = this.wob(pts, (o.j ?? .45) * s * .55);
        c.lineJoin = 'round'; c.lineCap = 'round';
        if (this.onDark && o.rim !== false) { this.path(ip, curv); c.strokeStyle = rgba(PAL.cream, .38); c.lineWidth = sw + s * .9; c.stroke(); }
        this.path(ip, curv); c.strokeStyle = inkCol; c.globalAlpha = (o.alpha ?? 1) * .92; c.lineWidth = sw; c.stroke();
        // pasada seca: segunda línea más fina y desfasada, da borde de pincel
        const dry = this.wob(pts, (o.j ?? .45) * s * .8); this.path(dry, curv); c.globalAlpha = (o.alpha ?? 1) * .35; c.lineWidth = sw * .55; c.stroke();
        c.globalAlpha = 1;
      }
    }
    line(pts, o = {}) {
      const c = this.ctx, s = o.unit || this.scale, sw = (o.sw ?? 1) * s * .42, p = this.wob(pts, (o.j ?? .4) * s * .5);
      c.lineJoin = 'round'; c.lineCap = 'round';
      if (this.onDark && o.rim !== false) { this.path(p, o.curv ?? .5, false); c.strokeStyle = rgba(PAL.cream, .35); c.lineWidth = sw + s * .9; c.stroke(); }
      this.path(p, o.curv ?? .5, false); c.strokeStyle = o.col || PAL.ink; c.globalAlpha = o.alpha ?? .92; c.lineWidth = sw; c.stroke(); c.globalAlpha = 1;
    }
    dot(x, y, r, col = PAL.ink, a = 1) { const c = this.ctx; c.beginPath(); c.ellipse(x, y, r, r, 0, 0, TAU); c.fillStyle = col; c.globalAlpha = a; c.fill(); c.globalAlpha = 1; }
  }
  function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }

  // ------------------------------------------------------------------ geometría
  function rr(x, y, w, h, r, n = 4) { // rectángulo redondeado como lista de puntos
    r = Math.min(r, w / 2, h / 2); const p = [];
    const corner = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
    return p;
  }
  function ell(cx, cy, rx, ry, n = 20, rot = 0) { const p = []; for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
  function star(cx, cy, r, inner = .4, n = 4, rot = -Math.PI / 2) { const p = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, q = i % 2 ? r * inner : r; p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return p; }
  function waveStrip(x0, x1, y, amp, len, phase, bottom, step = 16) { // franja de ola (motivo tri-onda del logo)
    const p = []; for (let x = x0; x <= x1 + step; x += step) p.push([x, y + Math.sin((x / len + phase) * TAU) * amp]);
    p.push([x1 + step, bottom], [x0, bottom]); return p;
  }

  const K = { PAL, STATUS, statusColor, TAU, clamp, lerp, seg, ease, easeOut, easeIn, backOut, elasticOut, bump, hash, mix, rgba, rng, Pen, rr, ell, star, waveStrip, bbox, grainCanvas };
  // =================================================================== ELENCO
  // Todas las funciones dibujan en coordenadas de pantalla (px CSS) sobre un Pen.
  // Unidades: `u` = unidad del personaje. Cosmo mide 10u de ancho y 8.2u de alto con patas.
  const C = K.PAL;

  // ------------------------------------------------------------------ caras
  function eyes(p, u, o) {
    const c = p.ctx, S = u * .6, type = o.eyes || 'dot', lx = (o.lookX || 0) * u * .38, ly = (o.lookY || 0) * u * .3;
    const blink = clamp(o.blink || 0), squint = clamp(o.squint || 0);
    for (const side of [-1, 1]) {
      const ex = side * 1.3 * u + lx, ey = -5.15 * u + ly;
      if (type === 'arc') {
        p.line([[ex - .55 * u, ey + .25 * u], [ex, ey - .35 * u], [ex + .55 * u, ey + .25 * u]], { unit: S, sw: 1.25 });
      } else if (type === 'closed') {
        p.line([[ex - .55 * u, ey], [ex, ey + .22 * u], [ex + .55 * u, ey]], { unit: S, sw: 1.1 });
      } else if (type === 'star') {
        p.shape(K.star(ex, ey, .78 * u, .42, 4, -Math.PI / 2 + (o.t || 0) * 1.5), { unit: S * .7, fill: C.gold, sw: .8, shadow: false, tex: 0, edge: 0 });
      } else if (type === 'x') {
        p.line([[ex - .45 * u, ey - .45 * u], [ex + .45 * u, ey + .45 * u]], { unit: S, sw: 1.1, curv: 0 });
        p.line([[ex + .45 * u, ey - .45 * u], [ex - .45 * u, ey + .45 * u]], { unit: S, sw: 1.1, curv: 0 });
      } else {
        const big = type === 'wide' ? 1.3 : 1, nar = type === 'narrow' ? .42 : 1;
        const ry = Math.max(.07 * u, .62 * u * big * nar * (1 - blink) * (1 - squint * .85)), rx = .42 * u * big;
        c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, K.TAU); c.fillStyle = C.ink; c.fill();
        if (ry > .3 * u) p.dot(ex - rx * .35, ey - ry * .45, .15 * u * big, C.cream, .95);
      }
    }
    // cejas
    if (o.brows) {
      for (const side of [-1, 1]) {
        const bx = side * 1.35 * u + lx * .6, by = -6.25 * u + ly * .5;
        const tilt = o.brows === 'worried' ? -side * .28 : o.brows === 'focus' ? side * .22 : o.brows === 'up' ? 0 : 0;
        const lift = o.brows === 'up' ? -.2 * u : 0;
        p.line([[bx - .5 * u, by + lift - tilt * u], [bx + .5 * u, by + lift + tilt * u]], { unit: S, sw: .95, curv: 0 });
      }
    }
  }
  function mouth(p, u, o) {
    const m = o.mouth || 'smile', S = u * .6, my = -3.85 * u + (o.lookY || 0) * u * .12, mx = (o.lookX || 0) * u * .2;
    if (m === 'smile') p.line([[mx - .6 * u, my - .15 * u], [mx, my + .25 * u], [mx + .6 * u, my - .15 * u]], { unit: S, sw: 1 });
    else if (m === 'small') p.line([[mx - .3 * u, my - .05 * u], [mx, my + .12 * u], [mx + .3 * u, my - .05 * u]], { unit: S, sw: .9 });
    else if (m === 'flat') p.line([[mx - .45 * u, my], [mx + .45 * u, my + .02 * u]], { unit: S, sw: .95, curv: 0 });
    else if (m === 'side') p.line([[mx - .2 * u, my + .1 * u], [mx + .5 * u, my - .15 * u]], { unit: S, sw: .95, curv: 0 });
    else if (m === 'wobble') p.line([[mx - .6 * u, my], [mx - .3 * u, my - .15 * u], [mx, my + .05 * u], [mx + .3 * u, my - .15 * u], [mx + .6 * u, my]], { unit: S, sw: .9, curv: .3 });
    else if (m === 'O') p.shape(K.ell(mx, my, .36 * u, .44 * u, 14), { unit: S * .6, fill: '#5A2A2A', sw: 1, shadow: false, tex: 0, edge: 0 });
    else { // open / grin: boca abierta con lengua
      const w = m === 'grin' ? .95 : .7;
      const pts = [[mx - w * u, my - .2 * u], [mx + w * u, my - .2 * u], [mx + w * .7 * u, my + .35 * u], [mx, my + .55 * u], [mx - w * .7 * u, my + .35 * u]];
      p.shape(pts, { unit: S * .6, fill: '#5A2A2A', sw: 1.1, shadow: false, tex: 0, edge: 0, curv: .35 });
      p.shape(K.ell(mx, my + .32 * u, w * .45 * u, .15 * u, 10), { unit: S * .5, fill: C.blush, ink: null, shadow: false, tex: 0, edge: 0 });
    }
  }

  // ------------------------------------------------------------------ Cosmo: el contenedor guía
  function cosmo(p, x, y, u, o = {}) {
    const c = p.ctx, S = u * .6, sq = (o.sq || 0), body = o.col || C.navy3;
    const dk = K.mix(body, C.ink, .45), lt = K.mix(body, '#FFFFFF', .28);
    if (!o.noShadow) {
      const f = 1 - Math.min(.6, Math.abs(o.dy || 0) * .07);
      c.beginPath(); c.ellipse(x + (o.dx || 0) * u, y + u * .08, 5.3 * u * f, .75 * u * f, 0, 0, K.TAU);
      c.fillStyle = p.onDark ? 'rgba(0,0,0,.3)' : K.rgba(C.ink, .13 * f + .03); c.fill();
    }
    c.save();
    c.translate(x + (o.dx || 0) * u, y + (o.dy || 0) * u);
    if (o.rot) c.rotate(o.rot);
    c.scale((o.flip ? -1 : 1) * (1 + sq * .5) * (o.sx ?? 1), (1 - sq * .6) * (o.sy ?? 1));

    // patas
    if (!o.noLegs) for (const side of [-1, 1]) {
      let lift = 0; if (o.walk != null) lift = Math.max(0, Math.sin((o.walk + (side > 0 ? .5 : 0)) * K.TAU)) * .8;
      p.shape(K.rr(side * 2.5 * u - .4 * u, -2.2 * u, .8 * u, 1.85 * u - lift * u, .3 * u), { unit: S, fill: dk, sw: .8, shadow: false, tex: .15, edge: .1, j: .25 });
      p.shape(K.ell(side * 2.75 * u, -.38 * u - lift * u, 1 * u, .45 * u, 14), { unit: S, fill: C.sand, sw: .85, sdx: .3, sdy: .3, pool: C.sandLt, j: .25 });
    }
    const arm = (side, a) => {
      const sx = side * 5.3 * u, sy = -4.7 * u, L = 3.3 * u;
      const dxv = side * Math.cos(a), dyv = -Math.sin(a);
      const hx = sx + dxv * L, hy = sy + dyv * L;
      // codo: el brazo se curva hacia abajo como un fideo
      const mx = sx + dxv * L * .5 + side * .15 * u, my = sy + dyv * L * .5 + .45 * u;
      const pts = p.wob([[sx, sy], [mx, my], [hx, hy]], S * .12);
      const c2 = p.ctx; c2.lineCap = 'round'; c2.lineJoin = 'round';
      const tr = () => { c2.beginPath(); c2.moveTo(pts[0][0], pts[0][1]); c2.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); };
      if (p.onDark) { tr(); c2.strokeStyle = K.rgba(C.cream, .35); c2.lineWidth = u * 1.15; c2.stroke(); }
      tr(); c2.strokeStyle = C.ink; c2.lineWidth = u * .92; c2.stroke();
      tr(); c2.strokeStyle = body; c2.lineWidth = u * .56; c2.stroke();
      p.shape(K.ell(hx, hy, .72 * u, .68 * u, 14), { unit: S, fill: C.cream, sw: .85, sdx: .25, sdy: .3, tex: .08, j: .15 });
      return [hx, hy, a];
    };
    // cuerpo: proporción de contenedor (más largo que alto)
    const bodyPts = K.rr(-5.5 * u, -7.9 * u, 11 * u, 6 * u, .65 * u, 3);
    p.shape(bodyPts, { unit: S, fill: body, pool: lt, settle: dk, sw: 1.15, sdx: .7, sdy: .9, edge: .3 });
    // corrugado del contenedor
    for (let rx = -4.9; rx <= 4.95; rx += .82) p.line([[rx * u, -7 * u], [rx * u, -2.35 * u]], { unit: S, sw: .55, col: K.mix(body, C.ink, .5), curv: 0, alpha: .55, rim: false, j: .2 });
    // riel superior arena (marca) y esquineros
    p.shape(K.rr(-5.5 * u, -7.9 * u, 11 * u, .78 * u, .55 * u, 3), { unit: S, fill: C.sand, pool: C.sandLt, sw: .85, shadow: false, edge: .2, j: .3 });
    for (const [cx, cy] of [[-5.5, -7.9], [4.7, -7.9], [-5.5, -2.7], [4.7, -2.7]]) p.shape(K.rr(cx * u, cy * u, .8 * u, .8 * u, .15 * u, 2), { unit: S * .8, fill: dk, sw: .6, shadow: false, tex: 0, edge: 0, j: .15 });
    if (u >= 11) { // emblema tri-onda sobre el riel
      for (let i = 0; i < 3; i++) p.line([[-1.1 * u, -7.62 * u + i * .2 * u], [-.55 * u, -7.78 * u + i * .2 * u], [0, -7.62 * u + i * .2 * u], [.55 * u, -7.46 * u + i * .2 * u], [1.1 * u, -7.62 * u + i * .2 * u]], { unit: S * .45, sw: .8, col: C.navy, alpha: .75, rim: false, j: .1 });
    }
    // placa-cara crema (etiqueta de embarque)
    p.shape(K.rr(-3.05 * u, -6.75 * u, 6.1 * u, 3.85 * u, .75 * u, 3), { unit: S, fill: C.cream, sw: .85, sdx: .35, sdy: .45, shadowA: .22, tex: .12, edge: .12, j: .3 });
    if (o.blush) for (const side of [-1, 1]) { c.beginPath(); c.ellipse(side * 2.2 * u, -4.2 * u, .55 * u, .3 * u, 0, 0, K.TAU); c.fillStyle = K.rgba(C.blush, .55 * o.blush); c.fill(); }
    eyes(p, u, o); mouth(p, u, o);
    const hl = arm(-1, o.aL ?? -1.25), hr = arm(1, o.aR ?? -1.25);
    if (o.propR) o.propR(p, hr[0], hr[1], u, 1);
    if (o.propL) o.propL(p, hl[0], hl[1], u, -1);
    if (o.hat) hat(p, u, o.hat);
    c.restore();
  }
  function hat(p, u, type) {
    const S = u * .6;
    if (type === 'hard') { // casco de obra, para "en proceso"
      p.shape([[-3.2 * u, -7.8 * u], [-2.6 * u, -9.6 * u], [0, -10.3 * u], [2.6 * u, -9.6 * u], [3.2 * u, -7.8 * u]], { unit: S, fill: C.gold, pool: C.cream, sw: .9, curv: .5 });
      p.shape(K.rr(-3.9 * u, -8.15 * u, 7.8 * u, .6 * u, .3 * u), { unit: S, fill: C.gold, sw: .8, shadow: false });
    } else if (type === 'night') { // gorro de dormir que cae hacia un lado
      p.shape([[-4.2 * u, -7.7 * u], [-3.2 * u, -9.4 * u], [-1 * u, -10.6 * u], [1.8 * u, -11.2 * u], [4.3 * u, -11.6 * u], [3.4 * u, -10.3 * u], [3.9 * u, -8.8 * u], [4.3 * u, -7.7 * u]], { unit: S, fill: C.sea2, pool: C.sea1, sw: .9, curv: .5, j: .3 });
      p.shape(K.rr(-4.5 * u, -8.2 * u, 9 * u, .9 * u, .45 * u), { unit: S, fill: C.cream, sw: .8, shadow: false, j: .2 });
      p.shape(K.ell(4.5 * u, -11.7 * u, .75 * u, .75 * u, 12), { unit: S, fill: C.cream, sw: .8, shadow: false, j: .2 });
    }
  }

  // ------------------------------------------------------------------ utilería
  const PROPS = {
    lupa(p, x, y, u, side, t = 0) {
      const S = u * .6, lx = x + side * 1.2 * u, ly = y - 2.4 * u + Math.sin(t * 6) * .15 * u;
      p.line([[x, y], [lx - side * .9 * u, ly + 1.1 * u]], { unit: S, sw: 2.4, col: C.sandDk, curv: 0, j: .15 });
      p.shape(K.ell(lx, ly, 1.6 * u, 1.6 * u, 20), { unit: S, fill: C.sky, alpha: .75, sw: 1.4, shadow: false, tex: 0, j: .15 });
      p.line([[lx - .8 * u, ly - .6 * u], [lx - .2 * u, ly - 1.05 * u]], { unit: S, sw: .9, col: C.cream, rim: false, j: .1 });
    },
    sello(p, x, y, u) {
      const S = u * .6;
      p.shape(K.rr(x - .45 * u, y - 2.2 * u, .9 * u, 1.7 * u, .4 * u), { unit: S, fill: C.navy3, sw: .8, shadow: false });
      p.shape(K.rr(x - 1.2 * u, y - .6 * u, 2.4 * u, .9 * u, .2 * u), { unit: S, fill: C.sand, sw: .85, shadow: false });
    },
    bandera(color) {
      return (p, x, y, u, side) => {
        const S = u * .6, top = y - 5 * u;
        p.line([[x, y + .3 * u], [x, top]], { unit: S, sw: 1.1, curv: 0 });
        p.shape([[x, top], [x + side * 2.6 * u, top + .7 * u], [x, top + 1.5 * u]], { unit: S, fill: color, sw: .9, shadow: false });
      };
    }
  };

  // ------------------------------------------------------------------ emotes (reacciones junto a la cabeza)
  function glyph(p, txt, x, y, size, fill, rot = 0, a = 1) {
    const c = p.ctx; c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = a;
    c.font = `800 ${size}px Figtree, "Segoe UI", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = size * .16; c.strokeStyle = C.ink; c.strokeText(txt, 0, 0); c.fillStyle = fill; c.fillText(txt, 0, 0);
    c.restore();
  }
  function emote(p, x, y, u, type, k, t) {
    if (!type || k <= 0) return;
    const S = u * .6, sc = K.backOut(k), c = p.ctx;
    c.save(); c.translate(x, y); c.scale(sc, sc);
    if (type === 'sweat') {
      const dy = (t * 1.2 % 1) * 1.2 * u;
      p.shape([[0, -1.1 * u + dy], [.55 * u, .1 * u + dy], [0, .6 * u + dy], [-.55 * u, .1 * u + dy]], { unit: S * .7, fill: C.sea1, pool: C.foam, sw: .8, curv: .6, shadow: false });
    } else if (type === 'spark') {
      for (let i = 0; i < 3; i++) {
        const tw = .6 + .4 * Math.sin(t * 7 + i * 2.1), px = [-1.4, .9, 1.9][i] * u, py = [.2, -1.3, .6][i] * u;
        p.shape(K.star(px, py, (.9 - i * .18) * u * tw, .34, 4), { unit: S * .6, fill: i === 1 ? C.gold : C.cream, sw: .8, shadow: false, tex: 0, edge: 0 });
      }
    } else if (type === 'bang') {
      p.shape(K.star(0, 0, 1.9 * u, .62, 8, t * .5), { unit: S * .7, fill: C.cream, sw: .8, shadow: false, tex: 0, edge: 0 });
      glyph(p, '!', 0, .1 * u, 2.4 * u, C.danger, .12);
    } else if (type === 'q') {
      glyph(p, '?', 0, 0, 2.6 * u, C.sand, -.12 + Math.sin(t * 3) * .1);
    } else if (type === 'zzz') {
      for (let i = 0; i < 3; i++) { const f = (t * .5 + i / 3) % 1; glyph(p, 'z', (i * .7 + f * 1.2) * u, -f * 3 * u, (1 + i * .3) * u, C.sea1, -.2, bumpA(f)); }
    } else if (type === 'check') {
      p.shape(K.ell(0, 0, 1.3 * u, 1.3 * u, 18), { unit: S * .7, fill: C.ok, pool: C.okLt, sw: .9, shadow: false });
      p.line([[-.6 * u, 0], [-.15 * u, .5 * u], [.65 * u, -.5 * u]], { unit: S * .8, sw: 1.8, col: C.cream, curv: 0, rim: false });
    } else if (type === 'heart') {
      const hp = []; for (let i = 0; i < 24; i++) { const a = i / 24 * K.TAU; hp.push([16 * Math.pow(Math.sin(a), 3) * .07 * u, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * .07 * u]); }
      p.shape(hp, { unit: S * .7, fill: C.rust, pool: C.blush, sw: .9, shadow: false, curv: .3 });
    }
    c.restore();
  }
  const bumpA = f => f < .15 ? f / .15 : f > .75 ? (1 - f) / .25 : 1;

  // ------------------------------------------------------------------ mini contenedor (elenco de apoyo)
  function box(p, x, y, u, o = {}) {
    const c = p.ctx, S = u * .6, col = o.col || C.steel, dk = K.mix(col, C.ink, .45);
    if (!o.noShadow) { c.beginPath(); c.ellipse(x, y + u * .05, 3.1 * u, .45 * u, 0, 0, K.TAU); c.fillStyle = K.rgba(C.ink, .12); c.fill(); }
    c.save(); c.translate(x + (o.dx || 0) * u, y + (o.dy || 0) * u); if (o.rot) c.rotate(o.rot);
    const sq = o.sq || 0; c.scale(1 + sq * .5, 1 - sq * .6);
    p.shape(K.rr(-3 * u, -3.6 * u, 6 * u, 3.6 * u, .45 * u, 2), { unit: S, fill: col, pool: K.mix(col, '#FFFFFF', .3), settle: dk, sw: 1, edge: .25 });
    for (const rx of [-2.3, -1.5, 1.5, 2.3]) p.line([[rx * u, -3.1 * u], [rx * u, -.5 * u]], { unit: S * .8, sw: .55, col: dk, curv: 0, alpha: .6, rim: false });
    if (o.face !== false) {
      p.shape(K.rr(-1.15 * u, -2.95 * u, 2.3 * u, 2.2 * u, .4 * u, 2), { unit: S * .7, fill: C.cream, sw: .7, shadow: false, tex: 0, edge: 0 });
      const bl = clamp(o.blink || 0);
      for (const s of [-1, 1]) {
        if (o.eyes === 'arc') p.line([[s * .45 * u - .28 * u, -2.05 * u], [s * .45 * u, -2.35 * u], [s * .45 * u + .28 * u, -2.05 * u]], { unit: S * .6, sw: 1.1 });
        else { c.beginPath(); c.ellipse(s * .45 * u + (o.lookX || 0) * .15 * u, -2.15 * u, .18 * u, Math.max(.04 * u, .28 * u * (1 - bl)), 0, 0, K.TAU); c.fillStyle = C.ink; c.fill(); }
      }
      p.line([[-.3 * u, -1.5 * u], [0, -1.3 * u], [.3 * u, -1.5 * u]], { unit: S * .6, sw: .9 });
    }
    c.restore();
  }

  // ------------------------------------------------------------------ grúa pórtico (STS)
  function crane(p, x, y, h, o = {}) {
    const S = Math.max(1.6, h * .028), top = y - h * .74, boomY = y - h * .8;
    const legR = x, legL = x - h * .44, col = o.col || C.sand, dk = C.sandDk, lw = h * .038;
    // bogies (ruedas sobre el riel)
    for (const lx of [legL, legR]) p.shape(K.rr(lx - lw * 1.8, y - lw * 1.1, lw * 3.6, lw * 1.1, lw * .4), { unit: S, fill: C.navy3, sw: .8, j: .2 });
    // patas
    for (const lx of [legL, legR]) p.shape([[lx - lw, y - lw], [lx - lw * .7, top], [lx + lw * .7, top], [lx + lw, y - lw]], { unit: S, fill: col, pool: C.sandLt, settle: dk, sw: .95, j: .25 });
    // viga de portal y travesaño con diagonal
    p.shape(K.rr(legL - lw, top - lw * 1.2, legR - legL + lw * 2, lw * 1.7, lw * .3), { unit: S, fill: col, pool: C.sandLt, sw: .95, j: .25 });
    p.shape(K.rr(legL, y - h * .34, legR - legL, lw * .9, lw * .2), { unit: S, fill: col, sw: .8, shadow: false, j: .2 });
    p.line([[legL + lw * .5, y - h * .34], [legR - lw * .5, top]], { unit: S, sw: .9, col: dk, curv: 0, j: .2 });
    // pluma con celosía
    const bx0 = o.boomLeft ?? (legL - h * 1.05), bx1 = legR + h * .22, bh = h * .07;
    p.shape(K.rr(bx0, boomY - bh * .6, bx1 - bx0, bh, bh * .25), { unit: S, fill: col, pool: C.sandLt, settle: dk, sw: .95, j: .25 });
    for (let xx = bx0 + bh * .6, k = 0; xx < bx1 - bh * .5; xx += bh * 1.05, k++) p.line([[xx, boomY - bh * .45], [xx + bh * .5, boomY + bh * .3]], { unit: S * .7, sw: .6, col: dk, curv: 0, alpha: .75, rim: false, j: .15 });
    // torre y tensores
    const apexX = legR - h * .05, apexY = y - h * 1.04;
    p.shape([[apexX - lw * .9, boomY - bh * .55], [apexX - lw * .35, apexY], [apexX + lw * .35, apexY], [apexX + lw * .9, boomY - bh * .55]], { unit: S, fill: col, sw: .85, j: .2 });
    p.line([[apexX, apexY], [bx0 + bh, boomY - bh * .6]], { unit: S * .7, sw: .65, curv: 0, j: .15 });
    p.line([[apexX, apexY], [bx1 - bh * .3, boomY - bh * .6]], { unit: S * .7, sw: .65, curv: 0, j: .15 });
    p.dot(apexX, apexY - lw * .3, lw * .45, C.rust);
    // cabina del operador colgada bajo la pluma
    p.shape(K.rr(legL - h * .19, boomY + bh * .4, h * .13, h * .1, h * .02), { unit: S, fill: C.cream, settle: C.paperDk, sw: .85, j: .2 });
    p.shape(K.rr(legL - h * .175, boomY + bh * .55, h * .1, h * .045, h * .01), { unit: S * .6, fill: C.sea1, sw: .5, shadow: false, tex: 0, j: .1 });
    // carro y cable
    const tx = o.trolleyX ?? (legL - h * .5), cable = o.cable ?? h * .3;
    p.shape(K.rr(tx - h * .065, boomY - bh * .15, h * .13, h * .055, h * .015), { unit: S, fill: C.navy3, sw: .8, shadow: false, j: .15 });
    p.line([[tx - h * .025, boomY + bh * .4], [tx - h * .025, boomY + cable]], { unit: S * .6, sw: .6, curv: 0, j: .1 });
    p.line([[tx + h * .025, boomY + bh * .4], [tx + h * .025, boomY + cable]], { unit: S * .6, sw: .6, curv: 0, j: .1 });
    p.shape(K.rr(tx - h * .15, boomY + cable, h * .3, h * .035, h * .01), { unit: S, fill: C.navy3, sw: .8, shadow: false, j: .15 });
    return { hookX: tx, hookY: boomY + cable + h * .035 };
  }

  // ------------------------------------------------------------------ barco portacontenedores
  function ship(p, x, y, L, o = {}) {
    const S = Math.max(1.6, L * .012), c = p.ctx, H = L * .16;
    c.save(); c.translate(x, y); if (o.rot) c.rotate(o.rot);
    // contenedores en cubierta (colores por estatus)
    const cols = o.cargo || [C.ok, C.navy3, C.sand, C.violet, C.steel, C.rust, C.navy3, C.sand];
    const bw = L * .085, bh = L * .052, x0 = -L * .3;
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
      const k = (i * 3 + r * 5) % cols.length, bx = x0 + i * (bw + L * .006), by = -H * .55 - (r + 1) * bh;
      if (r === 1 && (i === 5)) continue;
      p.shape(K.rr(bx, by, bw, bh, L * .006), { unit: S, fill: cols[k], pool: K.mix(cols[k], '#FFFFFF', .3), sw: .8, sdx: .4, sdy: .4, edge: .2 });
      p.line([[bx + bw * .3, by + bh * .2], [bx + bw * .3, by + bh * .8]], { unit: S * .6, sw: .5, col: K.mix(cols[k], C.ink, .5), curv: 0, rim: false });
      p.line([[bx + bw * .7, by + bh * .2], [bx + bw * .7, by + bh * .8]], { unit: S * .6, sw: .5, col: K.mix(cols[k], C.ink, .5), curv: 0, rim: false });
    }
    // superestructura (puente) a popa
    p.shape(K.rr(-L * .47, -H * .55 - L * .2, L * .13, L * .2, L * .01), { unit: S, fill: C.cream, pool: '#FFFFFF', settle: C.paperDk, sw: .9 });
    for (let i = 0; i < 3; i++) p.shape(K.rr(-L * .455 + i * L * .038, -H * .55 - L * .185, L * .028, L * .025, L * .004), { unit: S * .6, fill: C.sea3, ink: null, shadow: false, tex: 0, edge: 0 });
    // chimenea con tri-onda
    p.shape([[-L * .44, -H * .55 - L * .2], [-L * .43, -H * .55 - L * .28], [-L * .37, -H * .55 - L * .28], [-L * .365, -H * .55 - L * .2]], { unit: S, fill: C.sand, sw: .85 });
    for (let i = 0; i < 2; i++) p.line([[-L * .432, -H * .55 - L * (.245 - i * .02)], [-L * .40, -H * .55 - L * (.26 - i * .02)], [-L * .37, -H * .55 - L * (.245 - i * .02)]], { unit: S * .6, sw: .8, col: C.navy, rim: false });
    // casco
    const hull = [[-L * .5, -H * .6], [L * .44, -H * .6], [L * .5, -H * .85], [L * .46, H * .1], [L * .38, H * .45], [-L * .46, H * .45], [-L * .5, H * .05]];
    p.shape(hull, { unit: S, fill: C.navy2, pool: C.navy3, sw: 1.1, curv: .12, edge: .3 });
    p.shape([[-L * .49, -H * .12], [L * .47, -H * .12], [L * .465, H * .02], [-L * .495, H * .02]], { unit: S * .7, fill: C.sand, ink: null, shadow: false, tex: .1, edge: 0 });
    // nombre del buque: el isotipo tri-onda en crema
    for (let i = 0; i < 3; i++) p.line([[L * .22, -H * .38 + i * H * .09], [L * .25, -H * .45 + i * H * .09], [L * .28, -H * .38 + i * H * .09]], { unit: S * .6, sw: .9, col: C.cream, rim: false });
    c.restore();
    return { deckX: x - L * .02, deckY: y - H * .55 - 2 * bh };
  }

  // ------------------------------------------------------------------ gaviota, olas, papelitos, sello
  function gull(p, x, y, s, flap) {
    const a = Math.sin(flap * K.TAU) * .5;
    p.line([[x - s, y - s * a], [x - s * .45, y - s * .35], [x, y], [x + s * .45, y - s * .35], [x + s, y - s * a]], { unit: Math.max(1.2, s * .18), sw: 1.4, curv: .4 });
  }
  function waves(p, x0, x1, y, h, t, rise = 1, layers = [0, 1, 2]) {
    // tres franjas como el isotipo de COSMOS: atrás clara, medio, adelante profunda
    const cols = [C.sea1, C.sea2, C.sea3];
    for (const i of layers) {
      const yy = y + i * h * .26 + (1 - rise) * h * 1.3, amp = h * (.09 - i * .015), len = 260 - i * 50;
      const pts = K.waveStrip(x0 - 40, x1 + 40, yy, amp, len, t * (.18 + i * .07) + i * .33, y + h * 2.2, 22);
      p.shape(pts, { unit: 2.2, fill: cols[i], pool: K.mix(cols[i], '#FFFFFF', .35), sw: .9, sdx: 0, sdy: -1.6, shadowA: .12, edge: .25 });
      // espuma
      const foam = []; for (let x = x0; x <= x1; x += 22) foam.push([x, yy + Math.sin((x / len + t * (.18 + i * .07) + i * .33) * K.TAU) * amp - 2]);
      p.line(foam, { unit: 2, sw: .9, col: C.foam, alpha: .7, rim: false });
    }
  }
  function confetti(p, x, y, lt, i, col, u) {
    const r = K.hash(i), vx = (r - .5) * 260, vy = -260 - K.hash(i + 9) * 240, g = 720;
    const px = x + vx * lt, py = y + vy * lt + g * lt * lt * .5, rot = lt * (4 + r * 8) * (r > .5 ? 1 : -1);
    const c = p.ctx; c.save(); c.translate(px, py); c.rotate(rot); c.scale(Math.cos(lt * 9 + i), 1);
    p.shape(K.rr(-u * .7, -u * .4, u * 1.4, u * .8, u * .1), { unit: u * .4, fill: col, sw: .6, shadow: false, tex: 0, edge: 0 });
    c.restore();
  }
  function stampMark(p, x, y, u, k, a) {
    const c = p.ctx; c.save(); c.translate(x, y); c.rotate(-.14); const sc = 1.25 - K.easeOut(k) * .25; c.scale(sc, sc); c.globalAlpha = a;
    const S = u * .6;
    p.shape(K.rr(-3 * u, -1.6 * u, 6 * u, 3.2 * u, .7 * u), { unit: S, fill: null, ink: C.rust, sw: 1.8, shadow: false });
    p.line([[-1.2 * u, 0], [-.3 * u, .9 * u], [1.3 * u, -.8 * u]], { unit: S, sw: 2.2, col: C.rust, curv: 0, rim: false });
    c.restore(); c.globalAlpha = 1;
  }

  const CAST = { cosmo, box, crane, ship, gull, waves, confetti, stampMark, emote, glyph, PROPS, hat };
  // =================================================================== RUNTIME
  const now = () => performance.now() / 1000;
  const reducedMQ = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const darkNow = () => {
    const d = document.documentElement.getAttribute('data-theme');
    if (d === 'dark') return true; if (d === 'light') return false;
    try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  };

  const MOODS = {
    normal: { eyes: 'dot', mouth: 'smile' },
    happy: { eyes: 'arc', mouth: 'open', blush: 1 },
    focus: { eyes: 'narrow', mouth: 'flat', brows: 'focus' },
    worried: { eyes: 'dot', mouth: 'wobble', brows: 'worried', emote: 'sweat' },
    alarm: { eyes: 'wide', mouth: 'O', brows: 'up', emote: 'bang' },
    sleepy: { eyes: 'closed', mouth: 'small', emote: 'zzz', hat: 'night' },
    proud: { eyes: 'star', mouth: 'grin', emote: 'spark', blush: .6 },
    doubt: { eyes: 'dot', mouth: 'side', emote: 'q', lookX: .5, lookY: -.8 },
    love: { eyes: 'arc', mouth: 'smile', emote: 'heart', blush: 1 },
    done: { eyes: 'arc', mouth: 'grin', emote: 'check', blush: .5 }
  };

  // Acciones: funciones puras del tiempo local → ajustes de pose. Duración en segundos.
  const ACTIONS = {
    hop: { dur: .62, f: lt => ({ sq: .18 * bump(seg(lt, 0, .14)) + .2 * bump(seg(lt, .48, .62)) - .12 * bump(seg(lt, .14, .48)), dy: -1.9 * bump(seg(lt, .14, .5)), aL: -1.05 + .9 * bump(seg(lt, .1, .55)), aR: -1.05 + .9 * bump(seg(lt, .1, .55)) }) },
    land: { dur: .5, f: lt => ({ sq: .28 * (1 - elasticOut(seg(lt, 0, .5))), aL: -.4, aR: -.4 }) },
    nod: { dur: .7, f: lt => ({ dy: -.5 * Math.abs(Math.sin(seg(lt, 0, .7) * Math.PI * 2)), sq: .06 * Math.sin(lt * 18) * (1 - seg(lt, 0, .7)) }) },
    wave: { dur: 1.4, f: lt => ({ aR: 1.15 + .42 * Math.sin(lt * 13), aL: -1.1, rot: -.04 * bump(seg(lt, 0, 1.4)), dy: -.15 * bump(seg(lt, 0, 1.4)) }) },
    cheer: { dur: 1.6, f: lt => { const h = Math.abs(Math.sin(lt * Math.PI * 2.4)); return { aL: 1.25 + .25 * Math.sin(lt * 16), aR: 1.25 + .25 * Math.sin(lt * 16 + 1), dy: -1.5 * h * (1 - seg(lt, 1.2, 1.6)), sq: .12 * (1 - h) * (1 - seg(lt, 1.2, 1.6)) }; } },
    point: { dur: 1.3, f: lt => ({ aR: .1 + .08 * Math.sin(lt * 10), aL: -1.1, rot: -.07 * bump(seg(lt, 0, 1.3)), dx: .3 * bump(seg(lt, 0, 1.3)) }) },
    shrug: { dur: 1.2, f: lt => { const k = bump(seg(lt, .05, 1.1)); return { aL: -1.05 + 1.35 * k, aR: -1.05 + 1.35 * k, dy: -.35 * k, sq: -.05 * k }; } },
    stamp: { dur: 1.05, f: lt => { const up = seg(lt, 0, .45), hit = seg(lt, .45, .56); return { aR: -1.05 + 2.4 * easeOut(up) - 2.9 * easeOut(hit) + .9 * seg(lt, .7, 1.05), sq: .22 * bump(seg(lt, .54, .8)), dy: -.4 * bump(up) , prop: 'sello' }; } },
    search: { dur: 1.9, f: lt => ({ aR: .15 + .1 * Math.sin(lt * 5), dx: .7 * Math.sin(lt * 3.2) * bump(seg(lt, 0, 1.9)), lookX: Math.sin(lt * 3.2), lookY: .3, prop: 'lupa', rot: .03 * Math.sin(lt * 3.2) }) },
    shake: { dur: .75, f: lt => ({ rot: Math.sin(lt * 42) * .1 * (1 - seg(lt, 0, .75)), sq: .05 * Math.sin(lt * 30) * (1 - seg(lt, 0, .75)), aL: -.3, aR: -.3 }) },
    hold: { dur: .9, f: lt => ({ aL: 1.35, aR: 1.35, sq: .08 * bump(seg(lt, 0, .9)), eyes: 'closed', mouth: 'wobble' }) },
    flag: { dur: 2.2, f: lt => ({ aR: .9 + .08 * Math.sin(lt * 7), aL: -1.1, prop: 'flag', dy: -.2 * bump(seg(lt, 0, .5)) }) },
    juggle: { dur: 1e9, f: lt => ({ aL: .2 + .5 * Math.sin(lt * 8), aR: .2 + .5 * Math.sin(lt * 8 + Math.PI), dy: -.12 * Math.abs(Math.sin(lt * 8)), juggle: lt }) }
  };

  const CSS = `
.cfx-root{position:fixed;inset:0;pointer-events:none;z-index:var(--cfx-z,60);contain:layout style}
.cfx-root[hidden]{display:none!important}
.cfx-dock{position:fixed;right:var(--cfx-right,20px);bottom:var(--cfx-bottom,20px);pointer-events:none}
.cfx-dock canvas,.cfx-full,.cfx-vig{display:block;pointer-events:none}
.cfx-full{position:fixed;inset:0}
.cfx-hit{position:absolute;border:0;padding:0;margin:0;background:transparent;border-radius:14px;pointer-events:auto;cursor:pointer}
.cfx-hit:focus-visible{outline:2px solid #1f6f94;outline-offset:2px}
.cfx-bubble{position:fixed;right:var(--cfx-bright,40px);bottom:var(--cfx-bbottom,150px);max-width:min(280px,70vw);padding:10px 14px 11px;
 font:600 13.5px/1.4 Figtree,"Segoe UI",system-ui,sans-serif;color:#162631;background:#FFF8EC;border:1.6px solid #162631;
 border-radius:14px 16px 13px 15px/15px 13px 16px 14px;box-shadow:3px 4px 0 rgba(22,38,49,.16);pointer-events:none;
 opacity:0;transform:translateY(6px) scale(.96);transform-origin:90% 100%;transition:opacity .18s ease,transform .24s cubic-bezier(.2,0,0,1)}
.cfx-bubble.on{opacity:1;transform:none}
.cfx-bubble::after{content:"";position:absolute;right:26px;bottom:-9px;width:14px;height:14px;background:inherit;border-right:1.6px solid #162631;border-bottom:1.6px solid #162631;transform:rotate(40deg) skewX(-8deg);border-radius:0 0 4px 0}
.cfx-dark .cfx-bubble{color:#E9EFF2;background:#0C2735;border-color:#CBA785;box-shadow:3px 4px 0 rgba(0,0,0,.4)}
.cfx-dark .cfx-bubble::after{border-color:#CBA785}
.cfx-vig{position:absolute;pointer-events:none}
@media (prefers-reduced-motion:reduce){.cfx-bubble{transition:none}}
@media print{.cfx-root,.cfx-vig{display:none!important}}`;

  function injectCSS() {
    if (document.getElementById('cfx-style')) return;
    const s = document.createElement('style'); s.id = 'cfx-style'; s.textContent = CSS; document.head.appendChild(s);
  }
  function sizeCanvas(cv, w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
  }

  const DEFAULTS = {
    dock: { right: 20, bottom: 20, size: 84 },       // size = ancho de Cosmo en px
    dockMobile: { right: 12, bottom: 84, size: 62 }, // en móvil queda sobre la barra inferior
    mobileBelow: 800,
    zIndex: 60,
    enabled: true,
    motion: 'auto',                   // 'auto' respeta prefers-reduced-motion; 'reduce' fuerza modo quieto
    intro: 'session',                 // 'session' = una vez por sesión, 'always', 'never'
    peekAfter: 9,                     // s sin eventos → Cosmo se asoma (solo ojos)
    sleepAfter: 75,                   // s sin interacción → duerme
    idleFps: 8, fps: 30,
    announce: false,                  // true: el globo de texto se anuncia a lectores de pantalla
    storageKey: 'cosmos-fx',
    onCosmoClick: null,               // () => 'texto' | {text, mood}
    label: 'Cosmo, asistente animado del portafolio'
  };

  class CosmosFx {
    constructor(opts = {}) {
      this.o = Object.assign({}, DEFAULTS, opts, { dock: Object.assign({}, DEFAULTS.dock, opts.dock), dockMobile: Object.assign({}, DEFAULTS.dockMobile, opts.dockMobile) });
      this.listeners = []; this.vigs = new Set(); this.clips = []; this.raf = 0; this.animUntil = 0; this.lastDraw = 0; this.t0 = now();
      this.cz = { mood: 'normal', moodAt: -9, prev: 'normal', revertAt: 0, action: null, actionAt: 0, peek: 0, peekFrom: 0, peekTo: 0, peekAt: -9,
        look: { x: 0, y: 0 }, goal: { x: 0, y: 0 }, buddies: [], lookOverrideUntil: 0, blinkAt: 0, lastEvent: now(), lastInput: now(), hidden: false, asleep: false, flagCol: K.PAL.danger };
      this.enabled = this._stored('enabled', this.o.enabled);
      this.reduced = this.o.motion === 'reduce' || (this.o.motion === 'auto' && reducedMQ());
      this.dark = darkNow();
      injectCSS(); this._build(); this._bind();
      if (!this.enabled) this.root.hidden = true;
      this._scheduleBlink(); this.request(1.2);
    }
    // ------------------------------------------------------------ utilidades internas
    _stored(k, def) { try { const v = JSON.parse(localStorage.getItem(this.o.storageKey) || '{}'); return k in v ? v[k] : def; } catch (e) { return def; } }
    _store(k, val) { try { const v = JSON.parse(localStorage.getItem(this.o.storageKey) || '{}'); v[k] = val; localStorage.setItem(this.o.storageKey, JSON.stringify(v)); } catch (e) { } }
    _on(target, ev, fn, opt) { target.addEventListener(ev, fn, opt); this.listeners.push([target, ev, fn, opt]); }
    t() { return now() - this.t0; }
    _dockCfg() { return (window.innerWidth < this.o.mobileBelow) ? this.o.dockMobile : this.o.dock; }

    _build() {
      const r = this.root = document.createElement('div'); r.className = 'cfx-root' + (this.dark ? ' cfx-dark' : ''); r.setAttribute('aria-hidden', 'true');
      r.style.setProperty('--cfx-z', this.o.zIndex);
      const d = this.dockEl = document.createElement('div'); d.className = 'cfx-dock';
      this.dockCv = document.createElement('canvas'); d.appendChild(this.dockCv);
      const hit = this.hit = document.createElement('button'); hit.type = 'button'; hit.className = 'cfx-hit';
      if (this.o.onCosmoClick) { hit.setAttribute('aria-label', this.o.label); r.removeAttribute('aria-hidden'); } else { hit.tabIndex = -1; hit.setAttribute('aria-hidden', 'true'); }
      d.appendChild(hit);
      const b = this.bubble = document.createElement('div'); b.className = 'cfx-bubble';
      if (this.o.announce) { b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite'); }
      r.appendChild(d); r.appendChild(b); document.body.appendChild(r);
      this._layout();
    }
    _layout() {
      const cfg = this._dockCfg(), size = cfg.size; this.u = size / 10;
      this.dw = Math.round(size * 2.1); this.dh = Math.round(size * 1.62);
      this.dockEl.style.setProperty('--cfx-right', cfg.right + 'px'); this.dockEl.style.setProperty('--cfx-bottom', cfg.bottom + 'px');
      this.dctx = sizeCanvas(this.dockCv, this.dw, this.dh);
      this.dpen = new K.Pen(this.dctx, { scale: 1, onDark: this.dark, seed: 3 });
      this.groundY = this.dh - this.u * 1.25; this.cx = this.dw / 2;
      Object.assign(this.hit.style, { left: (this.cx - 5.8 * this.u) + 'px', width: (11.6 * this.u) + 'px' }); this._hitPeek = -1;
      this.bubble.style.setProperty('--cfx-bright', (cfg.right + this.dw * .2) + 'px');
      this.bubble.style.setProperty('--cfx-bbottom', (cfg.bottom + this.dh - this.u * 1.2) + 'px');
      if (this.full) this._sizeFull();
      this.request(.2);
    }
    _bind() {
      const input = () => { const c = this.cz; c.lastInput = now(); if (c.asleep) this._wake(); };
      let lastMove = 0;
      this._on(window, 'pointermove', e => {
        const tm = performance.now(); if (tm - lastMove < 40) return; lastMove = tm;
        input(); if (!this.enabled) return;
        const r = this.dockCv.getBoundingClientRect(), hx = r.left + this.cx, hy = r.top + this.groundY - 5 * this.u;
        const dx = e.clientX - hx, dy = e.clientY - hy, dist = Math.hypot(dx, dy);
        if (now() > this.cz.lookOverrideUntil) this.cz.goal = { x: K.clamp(dx / 260, -1, 1), y: K.clamp(dy / 220, -1, 1) };
        if (dist < 170 && this.cz.peek > .5 && !this.cz.hidden) this._peek(0);
        this.request(.5, true);
      }, { passive: true });
      this._on(window, 'keydown', e => { input(); if (this.full && this.introRunning && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) this._endIntro(); });
      this._on(window, 'pointerdown', () => { input(); if (this.introRunning) this._endIntro(); }, { passive: true });
      let lastY = window.scrollY, lastT = now();
      this._on(window, 'scroll', () => {
        input(); const t = now(), v = Math.abs(window.scrollY - lastY) / Math.max(.016, t - lastT); lastY = window.scrollY; lastT = t;
        if (v > 2600 && !this.cz.action && this.cz.peek < .5) this._act('hold');
      }, { passive: true });
      this._on(window, 'resize', () => this._layout());
      this._on(document, 'visibilitychange', () => { if (document.hidden) this._stop(); else this.request(.5); });
      this._on(this.hit, 'pointerenter', () => { if (!this.enabled) return; this._peek(0); this.mood('happy', 1.6); if (!this.cz.action) this._act('wave'); });
      this._on(this.hit, 'click', () => {
        this._act('hop');
        const res = this.o.onCosmoClick ? this.o.onCosmoClick() : null;
        if (res) { const r = typeof res === 'string' ? { text: res } : res; if (r.mood) this.mood(r.mood, 2.4); if (r.text) this.say(r.text, r); }
        else this.mood(['happy', 'proud', 'love'][Math.floor(Math.random() * 3)], 1.8);
      });
      const mo = new MutationObserver(() => this._theme()); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] }); this.mo = mo;
      try { const mq = matchMedia('(prefers-color-scheme: dark)'); const f = () => this._theme(); mq.addEventListener('change', f); this.listeners.push([mq, 'change', f]); } catch (e) { }
      try { const mq = matchMedia('(prefers-reduced-motion: reduce)'); const f = () => { if (this.o.motion === 'auto') { this.reduced = mq.matches; this.request(.2); } }; mq.addEventListener('change', f); this.listeners.push([mq, 'change', f]); } catch (e) { }
    }
    _theme() {
      const d = darkNow(); if (d === this.dark) return; this.dark = d; this.root.classList.toggle('cfx-dark', d);
      this.dpen.onDark = d; for (const v of this.vigs) v.pen.onDark = v.opts.onDark ?? d; this.request(.4);
    }

    // ------------------------------------------------------------ estado de Cosmo
    mood(m, secs = 2.2) {
      if (!MOODS[m]) return this; const c = this.cz, t = now();
      if (c.mood !== m) { c.prev = c.mood; c.mood = m; c.moodAt = t; }
      c.revertAt = secs ? t + secs : 0; c.lastEvent = t; this._peek(0); this.request(Math.min(3, (secs || 1.5)) + .5);
      return this;
    }
    _act(name, extra = {}) {
      if (!ACTIONS[name]) return; const c = this.cz, t = now();
      const delay = c.peek > .3 ? .28 : 0;
      c.action = name; c.actionAt = t + delay; c.actionExtra = extra; c.lastEvent = t; this._peek(0);
      this.request(Math.min(4, ACTIONS[name].dur) + delay + .3);
    }
    _peek(to) {
      const c = this.cz, t = now(); if (c.peekTo === to) return;
      c.peekFrom = this._peekVal(t); c.peekTo = to; c.peekAt = t; this.request(.6);
    }
    _peekVal(t) { const c = this.cz, k = K.ease(K.seg(t, c.peekAt, c.peekAt + .35)); return K.lerp(c.peekFrom, c.peekTo, k); }
    _wake() { const c = this.cz; c.asleep = false; c.mood = 'alarm'; c.moodAt = now(); c.revertAt = now() + .7; this._peek(0); this.request(1.2); }
    _scheduleBlink() {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = setTimeout(() => { this.cz.blinkAt = now(); this.request(.25); this._scheduleBlink(); }, 2600 + Math.random() * 3400);
    }

    // ------------------------------------------------------------ bucle de dibujo
    request(secs = .5, soft = false) {
      if (!this.enabled || document.hidden) return;
      const until = now() + secs; if (until > this.animUntil) this.animUntil = until;
      if (!this.raf) this.raf = requestAnimationFrame(ts => this._tick());
    }
    _stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
    _tick() {
      this.raf = 0; const t = now(), c = this.cz;
      // ¿hay que seguir dibujando?
      const up = this._peekVal(t) < .5 && !c.asleep && !c.hidden;
      const active = t < this.animUntil || this.clips.length || [...this.vigs].some(v => v.busy(t)) || (c.action && ACTIONS[c.action].dur > 50);
      const fps = active ? (this.reduced ? 6 : this.o.fps) : (up && !this.reduced ? this.o.idleFps : 0);
      if (t - this.lastDraw >= (fps ? 1 / fps : 0) - .004) { this._draw(t); this.lastDraw = t; }
      this._housekeeping(t);
      if (fps && this.enabled && !document.hidden) this.raf = requestAnimationFrame(() => this._tick());
    }
    _housekeeping(t) {
      const c = this.cz;
      if (c.revertAt && t > c.revertAt) { c.prev = c.mood; c.mood = 'normal'; c.moodAt = t; c.revertAt = 0; this.request(.6); }
      if (c.action && t > c.actionAt + ACTIONS[c.action].dur) { c.action = null; this.request(.3); }
      if (!c.action && !c.revertAt && c.peekTo === 0 && t - c.lastEvent > this.o.peekAfter && !c.hidden) this._peek(1);
      if (!c.asleep && t - c.lastInput > this.o.sleepAfter) { c.asleep = true; c.prev = c.mood; c.mood = 'sleepy'; c.moodAt = t; this._peek(1); this.request(1); }
    }
    _draw(t) {
      const T = this.t(), t0 = performance.now(); this._drawn = (this._drawn || 0) + 1;
      if (this.enabled) this._drawDock(t, T);
      if (this.full) this._drawFull(t, T);
      for (const v of this.vigs) { if (!v.el.isConnected) { v.destroy(); continue; } v.draw(t, this.reduced); }
      const ms = performance.now() - t0; this._ms = this._ms == null ? ms : this._ms * .9 + ms * .1; this._msMax = Math.max(this._msMax || 0, ms);
    }
    stats() { return { frames: this._drawn || 0, avgMs: +(this._ms || 0).toFixed(2), maxMs: +(this._msMax || 0).toFixed(2), running: !!this.raf, vignettes: this.vigs.size, layers: this.clips.length }; }
    _pose(t, T) {
      const c = this.cz, M = MOODS[c.mood] || MOODS.normal, age = t - c.moodAt, red = this.reduced;
      // cambio de ánimo: los ojos se cierran, el cuerpo hace un "take" y aparece el emote
      let squint = 0, take = 0;
      if (!red && age < .16) { squint = 1 - age / .16; take = -.12 * Math.sin(age / .16 * Math.PI); }
      if (!red && age >= .16 && age < .42) take = .1 * Math.sin((age - .16) / .26 * Math.PI) * (1 - (age - .16) / .26);
      const blinkAge = t - c.blinkAt, blink = blinkAge >= 0 && blinkAge < .16 ? Math.sin(blinkAge / .16 * Math.PI) : 0;
      const dt = Math.min(.1, t - (this._lastPoseT || t)); this._lastPoseT = t;
      const kk = 1 - Math.exp(-dt * 9); c.look.x += (c.goal.x - c.look.x) * kk; c.look.y += (c.goal.y - c.look.y) * kk;
      const pose = Object.assign({ aL: -1.25, aR: -1.25, dy: 0, sq: 0, rot: 0, dx: 0 }, M, {
        squint, blink, t: T, lookX: M.lookX ?? c.look.x, lookY: M.lookY ?? c.look.y,
        emoteK: M.emote ? (red ? 1 : K.seg(age, .06, .32)) : 0
      });
      if (!red) { pose.dy += -.1 * Math.sin(T * 2.1); pose.aL += .05 * Math.sin(T * 1.7); pose.aR += .05 * Math.sin(T * 1.7 + 1.3); }
      pose.sq += take;
      if (c.action) {
        const A = ACTIONS[c.action], lt = t - c.actionAt;
        if (lt >= 0) { const d = red ? A.f(Math.min(A.dur, 50) * .5) : A.f(lt); for (const k in d) { if (typeof d[k] === 'number' && ['dy', 'sq', 'rot', 'dx'].includes(k)) pose[k] += d[k]; else pose[k] = d[k]; } }
      }
      return pose;
    }
    _drawDock(t, T) {
      const ctx = this.dctx, p = this.dpen, u = this.u, c = this.cz;
      ctx.clearRect(0, 0, this.dw, this.dh);
      p.frame(T, this.reduced);
      const peek = this.reduced ? (c.peekTo) : this._peekVal(t);
      // el área clicable sigue a la parte visible de Cosmo (nunca tapa contenido con un área invisible)
      const hp = Math.round(peek * 20) / 20; if (hp !== this._hitPeek) { this._hitPeek = hp; const top = this.groundY - (8.3 - hp * 4.7) * u; Object.assign(this.hit.style, { top: top + 'px', height: Math.max(0, this.groundY - top) + 'px', display: c.hidden ? 'none' : '' }); }
      if (c.hidden !== this._hitHidden) { this._hitHidden = c.hidden; this.hit.style.display = c.hidden ? 'none' : ''; }
      // muelle de papel donde vive Cosmo
      const gy = this.groundY, qx = this.cx - 9.9 * u;
      if (!c.hidden) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, this.dw, gy + u * .15); ctx.clip();
        const pose = this._pose(t, T); pose.dy += peek * 4.7;
        if (pose.prop === 'lupa') pose.propR = (pp, x, y, uu, s) => CAST.PROPS.lupa(pp, x, y, uu, s, T);
        if (pose.prop === 'sello') pose.propR = CAST.PROPS.sello;
        if (pose.prop === 'flag') pose.propR = CAST.PROPS.bandera(c.flagCol);
        CAST.cosmo(p, this.cx, gy, u, Object.assign({ noShadow: peek > .3 }, pose));
        if (pose.juggle != null) { // malabares con mini contenedores (estado "ocupado")
          const cols = [K.PAL.ok, K.PAL.sand, K.PAL.violet];
          for (let i = 0; i < 3; i++) { const ph = (pose.juggle * 1.1 + i / 3) % 1, x = this.cx + Math.cos(ph * K.TAU) * 4.2 * u, y = gy - 9.2 * u - Math.abs(Math.sin(ph * Math.PI)) * 3.2 * u; CAST.box(p, x, y, u * .38, { col: cols[i], rot: ph * 6, noShadow: true, face: false }); }
        }
        // compañeros: mini contenedores del color filtrado que saltan al muelle
        c.buddies = c.buddies.filter(b => t - b.at < 3.2);
        c.buddies.forEach((b, i) => {
          const lt = t - b.at, inK = this.reduced ? 1 : K.backOut(K.seg(lt, 0, .35)), outK = this.reduced ? 0 : K.easeIn(K.seg(lt, 2.7, 3.2));
          const bx = this.cx - (8 + i * 3.6) * u, hopY = this.reduced ? 0 : -Math.abs(Math.sin(lt * 7)) * 1.2 * (1 - K.seg(lt, .8, 1.6));
          CAST.box(p, bx, gy + (1 - inK) * 4 * u + outK * 4.5 * u, u * .55, { col: b.col, dy: hopY, eyes: lt > .4 && lt < 1.4 ? 'arc' : 'dot', blink: c.blinkAt && t - c.blinkAt < .16 ? .9 : 0, lookX: .8 });
        });
        ctx.restore();
        // emote por encima del recorte (aunque Cosmo esté asomado)
        const head = gy - (8.4 - (pose.dy || 0)) * u;
        CAST.emote(p, this.cx + 5.4 * u, Math.min(head, gy - 3 * u) - .6 * u, u, pose.emote, pose.emoteK, T);
      }
      // borde del muelle
      p.shape(K.rr(qx, gy, 16.1 * u, 1.05 * u, .35 * u, 2), { unit: u * .55, fill: this.dark ? '#18394A' : K.PAL.paperDk, pool: this.dark ? '#24495B' : K.PAL.cream, sw: .9, sdx: .5, sdy: .6 });
      const bq = this.cx + 7.1 * u; p.shape([[bq - .7 * u, gy + .05 * u], [bq - .65 * u, gy - .9 * u], [bq - .5 * u, gy - 1.3 * u], [bq + .45 * u, gy - 1.3 * u], [bq + .6 * u, gy - .9 * u], [bq + .65 * u, gy + .05 * u]], { unit: u * .5, fill: K.PAL.sand, pool: K.PAL.sandLt, sw: .9, curv: .3 });
    }

    // ------------------------------------------------------------ capa completa (intro, celebraciones)
    _sizeFull() { this.fw = window.innerWidth; this.fh = window.innerHeight; this.fctx = sizeCanvas(this.full, this.fw, this.fh); this.fpen = new K.Pen(this.fctx, { seed: 11, onDark: false }); }
    _ensureFull() { if (this.full) return; this.full = document.createElement('canvas'); this.full.className = 'cfx-full'; this.root.insertBefore(this.full, this.root.firstChild); this._sizeFull(); }
    _clip(dur, draw, onEnd) { this._ensureFull(); const clip = { start: now(), dur, draw, onEnd }; this.clips.push(clip); this.request(dur + .1); return clip; }
    _drawFull(t, T) {
      const ctx = this.fctx; ctx.clearRect(0, 0, this.fw, this.fh); this.fpen.frame(T, this.reduced);
      this.clips = this.clips.filter(cl => { const lt = t - cl.start; if (lt > cl.dur) { cl.onEnd && cl.onEnd(); return false; } cl.draw(this.fpen, lt, T); return true; });
      if (!this.clips.length) { this.full.remove(); this.full = null; }
    }
    _dockPoint() { const r = this.dockCv.getBoundingClientRect(); return { x: r.left + this.cx, y: r.top + this.groundY }; }

    // ------------------------------------------------------------ API pública
    emit(name, d = {}) {
      if (!this.enabled) return this;
      const h = HANDLERS[name]; if (h) h.call(this, d); return this;
    }
    say(text, o = {}) {
      if (!this.enabled || !text) return this;
      const b = this.bubble; b.textContent = text; b.classList.add('on');
      clearTimeout(this.sayTimer); this.sayTimer = setTimeout(() => b.classList.remove('on'), o.ms || (2600 + text.length * 45));
      this._peek(0); this.cz.lastEvent = now(); this.request(.4); return this;
    }
    lookAt(target, secs = 1.5) {
      const r = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      const x = r ? r.left + r.width / 2 : target.x, y = r ? r.top + r.height / 2 : target.y, d = this._dockPoint();
      this.cz.goal = { x: K.clamp((x - d.x) / 260, -1, 1), y: K.clamp((y - (d.y - 5 * this.u)) / 220, -1, 1) };
      this.cz.lookOverrideUntil = now() + secs; this.request(.6); return this;
    }
    vignette(el, type, opts = {}) {
      if (!this.enabled || !el || !VIGS[type]) return null;
      for (const v of this.vigs) if (v.el === el && v.type === type) v.destroy();
      const v = new Vignette(this, el, type, opts); this.vigs.add(v); this.request(v.len + .2); return v;
    }
    setEnabled(on) {
      this.enabled = !!on; this._store('enabled', this.enabled); this.root.hidden = !on;
      if (!on) { this._stop(); for (const v of [...this.vigs]) v.destroy(); this.clips = []; if (this.full) { this.full.remove(); this.full = null; } }
      else this.request(1); return this;
    }
    isEnabled() { return this.enabled; }
    setVisible(on) { this.visible = !!on; this.root.style.visibility = on ? '' : 'hidden'; if (on) this.request(.5); return this; }
    setMotion(m) { this.o.motion = m; this.reduced = m === 'reduce' || (m === 'auto' && reducedMQ()); this.request(.3); return this; }
    destroy() {
      this._stop(); clearTimeout(this.blinkTimer); clearTimeout(this.sayTimer);
      for (const [tg, ev, fn, op] of this.listeners) try { tg.removeEventListener(ev, fn, op); } catch (e) { }
      this.mo && this.mo.disconnect(); for (const v of [...this.vigs]) v.destroy(); this.root.remove();
    }
    // Dibujo estático para hojas de personaje y pruebas (sin estado)
    static get draw() { return Object.assign({ Pen: K.Pen, PAL: K.PAL, MOODS, ACTIONS }, CAST); }
  }
  // =================================================================== ESCENAS Y EVENTOS
  const P = K.PAL;
  const CONF_COLS = [P.ok, P.navy3, P.sand, P.violet, P.steel, P.rust, P.gold];

  // ------------------------------------------------------------------ intro: el muelle sube, llega el barco, Cosmo salta a su esquina
  function drawIntro(p, lt, T) {
    const fx = this, W = fx.fw, H = fx.fh, c = fx.cz, u = fx.u;
    const B = K.clamp(H * .28, 170, 280);
    const rise = K.backOut(K.seg(lt, 0, .5), 1.2), fall = K.easeIn(K.seg(lt, 2.5, 2.95));
    const bandY = H - B * rise + B * 1.15 * fall;
    p.onDark = fx.dark;
    // papel rasgado que sube desde abajo
    const torn = []; let i = 0; for (let x = -20; x <= W + 40; x += 26, i++) torn.push([x, bandY + (K.hash(i) - .5) * 12]);
    torn.push([W + 40, H + 40], [-20, H + 40]);
    p.shape(torn, { unit: 2, fill: fx.dark ? '#0C2735' : P.paper, pool: fx.dark ? '#133446' : P.cream, sw: .8, sdx: 0, sdy: -2.5, tex: .3, edge: .15, j: .2 });
    // sol de papel
    const sunY = bandY + B * .34 - 18 * K.easeOut(K.seg(lt, .2, 1.2));
    p.shape(K.ell(W * .82, sunY, B * .15, B * .15, 26), { unit: 2, fill: P.sand, pool: P.cream, sw: .9, shadow: false });
    // grúas del puerto en el horizonte (silueta de papel, sin tinta)
    for (let g = 0; g < 4; g++) {
      const gx = W * (.58 + g * .1), gh = B * (.32 - (g % 2) * .06), gb = bandY + B * .52 + 4, cc = fx.dark ? '#18394A' : P.paperDk;
      p.shape([[gx - gh * .22, gb], [gx - gh * .2, gb - gh], [gx - gh * .15, gb - gh], [gx - gh * .13, gb]], { unit: 1.5, fill: cc, ink: null, shadow: false, tex: .2, edge: 0 });
      p.shape([[gx + gh * .05, gb], [gx + gh * .07, gb - gh], [gx + gh * .12, gb - gh], [gx + gh * .14, gb]], { unit: 1.5, fill: cc, ink: null, shadow: false, tex: .2, edge: 0 });
      p.shape(K.rr(gx - gh * .75, gb - gh * 1.08, gh * 1.1, gh * .1, 2), { unit: 1.5, fill: cc, ink: null, shadow: false, tex: .2, edge: 0 });
    }
    // gaviotas
    for (let g = 0; g < 2; g++) CAST.gull(p, W * 1.05 - lt * W * .32 - g * 90, bandY + B * .12 - g * 26 + Math.sin(T * 3 + g) * 5, 11 - g * 2, T * 2.3 + g * .4);
    // mar (capa trasera), barco, mar (capas delanteras)
    const seaY = bandY + B * .5, seaH = B * .36;
    CAST.waves(p, 0, W, seaY, seaH, T, 1, [0]);
    const L = K.clamp(W * .3, 240, 420);
    const sx = K.lerp(-L * .7, W * .44, K.easeOut(K.seg(lt, .08, 1.45))) + W * .8 * K.easeIn(K.seg(lt, 2.05, 3.0));
    const sy = seaY + seaH * .18 + Math.sin(T * 2.4) * 3, rot = Math.sin(T * 1.9) * .018;
    const deck = CAST.ship(p, sx, sy, L, { rot });
    // Cosmo viaja en cubierta y salta a su muelle
    if (!fx._introHanded) {
      const dp = fx._dockPoint(), jump = K.seg(lt, 1.6, 2.15);
      let x = deck.deckX + L * .12, y = deck.deckY, pose = { eyes: 'arc', mouth: 'open', blush: 1, aL: -.8, aR: 1.1 + .4 * Math.sin(T * 12), t: T, lookX: .6 };
      if (lt > 1.42 && lt < 1.6) pose = Object.assign(pose, { sq: .22 * K.bump(K.seg(lt, 1.42, 1.6)), aR: -.6, aL: -.6 });
      if (jump > 0) {
        const k = K.easeOut(jump);
        x = K.lerp(x, dp.x, jump); y = K.lerp(y, dp.y, k) - Math.sin(jump * Math.PI) * 150;
        pose = Object.assign(pose, { aL: 1.3, aR: 1.3, rot: K.lerp(-.5, 0, jump), sq: -.12 * K.bump(jump), eyes: 'star' });
      }
      CAST.cosmo(p, x, y, u, Object.assign({ noShadow: jump > 0 }, pose));
      if (jump >= 1) fx._endIntro(true);
    }
    CAST.waves(p, 0, W, seaY, seaH, T, 1, [1, 2]);
  }

  // ------------------------------------------------------------------ viñetas (se pintan dentro de un contenedor que da el host)
  const VIGS = {
    // Grúa pórtico que deposita un contenedor del color del estatus: para el encabezado de la ficha de proyecto.
    crane: {
      len: 2.2, onDark: true,
      draw(p, lt, w, h, T, blink) {
        const gy = h - 6, ch = h * .92; let col = K.statusColor(this.opts.status); if (this.pen.onDark && col === P.navy3) col = '#3F7E99';
        const bu = h * .058, boomY = gy - ch * .8;
        const tx = K.lerp(w * .92, w * .36, K.easeOut(K.seg(lt, 0, .6)));
        const landCable = gy - 3.6 * bu - boomY - ch * .035;
        const cable = K.lerp(ch * .14, landCable, K.ease(K.seg(lt, .45, 1.05))) - K.lerp(0, landCable - ch * .14, K.ease(K.seg(lt, 1.4, 1.9)));
        const hook = CAST.crane(p, w - w * .08, gy, ch, { trolleyX: tx, cable: Math.max(ch * .1, cable), boomLeft: w * .06 });
        const landed = lt >= 1.05, sq = landed ? .28 * (1 - K.elasticOut(K.seg(lt, 1.05, 1.6))) : 0;
        const by = landed ? gy : hook.hookY + 3.6 * bu, bx = landed ? w * .36 : tx;
        const happy = lt > 1.3 && lt < 1.95;
        CAST.box(p, bx, by, bu, { col, sq, rot: landed ? 0 : Math.sin(T * 3) * .04, eyes: happy ? 'arc' : 'dot', blink: lt < 1.2 ? 1 : blink, noShadow: !landed });
        if (lt > 1.05 && lt < 1.6) for (let i = 0; i < 4; i++) { // polvo al aterrizar
          const k = K.seg(lt, 1.05, 1.6), s = i < 2 ? -1 : 1, dx = s * (3.3 + k * 3 + (i % 2) * 1.2) * bu;
          p.shape(K.ell(bx + dx, gy - .6 * bu - k * bu, (1 - k) * 1.1 * bu + .2, (1 - k) * .8 * bu + .2, 10), { unit: 1.4, fill: P.cream, alpha: 1 - k, sw: .6, shadow: false, tex: 0, edge: 0 });
        }
        if (lt > 1.35 && lt < 2.1) CAST.emote(p, bx + 3.6 * bu, by - 4.8 * bu, bu, 'spark', K.seg(lt, 1.35, 1.55) * (1 - K.seg(lt, 1.85, 2.1)), T);
      }
    },
    // Estado vacío: Cosmo revisa un pallet vacío con la lupa y se encoge de hombros.
    empty: {
      len: 3.8,
      draw(p, lt, w, h, T, blink) {
        const gy = h - 12, cx = w / 2, u = Math.min(h * .07, 7.5);
        p.line([[cx - 170, gy], [cx + 170, gy]], { unit: 1.6, sw: .9, col: P.sandDk, curv: 0 });
        // pallet
        for (let i = 0; i < 3; i++) p.shape(K.rr(cx + 38 + i * 26, gy - 16, 22, 5, 1.5), { unit: 1.6, fill: P.sand, pool: P.sandLt, sw: .8, shadow: i === 0 });
        p.shape(K.rr(cx + 36, gy - 11, 78, 6, 1.5), { unit: 1.6, fill: P.sandDk, sw: .8, shadow: false });
        for (let i = 0; i < 3; i++) p.shape(K.rr(cx + 40 + i * 30, gy - 5, 10, 5, 1), { unit: 1.4, fill: P.sandDk, sw: .7, shadow: false });
        // bola de papel que rueda
        const bk = K.seg(lt, .5, 2.9); if (bk > 0 && bk < 1) {
          const bx = K.lerp(cx - 200, cx + 210, bk), r = 7; const c = p.ctx; c.save(); c.translate(bx, gy - r - Math.abs(Math.sin(bk * 14)) * 4); c.rotate(bk * 18);
          p.shape(K.ell(0, 0, r, r * .92, 9), { unit: 1.4, fill: P.paperDk, sw: .8, shadow: false }); p.line([[-4, -2], [2, 1], [-1, 4]], { unit: 1.2, sw: .7 }); c.restore();
        }
        const walk = K.seg(lt, 0, .9), x = K.lerp(cx - 150, cx - 30, K.easeOut(walk));
        let pose = { t: T, blink, aL: -1.25, aR: -1.25, lookX: .8, lookY: .2 };
        if (lt < .9) pose.walk = lt * 2.2;
        else if (lt < 2.5) { const a = ACTIONS.search.f(lt - .9); pose = Object.assign(pose, a, { eyes: 'narrow', brows: 'focus', mouth: 'flat', propR: (pp, hx, hy, uu, s) => CAST.PROPS.lupa(pp, hx, hy, uu, s, T) }); }
        else if (lt < 3.7) { pose = Object.assign(pose, ACTIONS.shrug.f(lt - 2.5), MOODS.doubt); }
        else pose = Object.assign(pose, { eyes: 'dot', mouth: 'small', lookX: .7 });
        CAST.cosmo(p, x + (pose.dx || 0) * u, gy, u, Object.assign({}, pose, { dx: 0 }));
        if (lt > 2.55) CAST.emote(p, x + 5.2 * u, gy - 9.2 * u, u, 'q', this.reduced ? 1 : K.seg(lt, 2.55, 2.8), T);
      }
    },
    // Mar en calma: para "Sin variaciones" en los cambios semanales.
    calma: {
      len: 8,
      draw(p, lt, w, h, T) {
        const L = Math.min(120, w * .28), k = this.reduced ? 0 : 1, bx = w * .5 + Math.sin(T * .5) * 14 * k, by = h * .56 + Math.sin(T * 1.3) * 1.6 * k;
        CAST.waves(p, 0, w, h * .52, h * .5, T * .5, 1, [0]);
        CAST.ship(p, bx, by, L, { rot: Math.sin(T * 1.1) * .02 * k });
        CAST.waves(p, 0, w, h * .52, h * .5, T * .5, 1, [1, 2]);
        CAST.gull(p, w * .78 + Math.sin(T * .7) * 10, h * .2, 7, T * 1.6);
      }
    }
  };

  class Vignette {
    constructor(fx, el, type, opts) {
      this.fx = fx; this.el = el; this.type = type; this.opts = opts; this.def = VIGS[type]; this.start = now(); this.len = this.def.len;
      this.cv = document.createElement('canvas'); this.cv.className = 'cfx-vig'; this.cv.setAttribute('aria-hidden', 'true');
      if (getComputedStyle(el).position === 'static') { el.style.position = 'relative'; this.restorePos = true; }
      Object.assign(this.cv.style, { inset: '0' });
      el.insertBefore(this.cv, el.firstChild);
      this.pen = new K.Pen(null, { onDark: opts.onDark ?? this.def.onDark ?? fx.dark, seed: 5 + Math.floor(Math.random() * 99) });
      this._size();
      if ('ResizeObserver' in window) { this.ro = new ResizeObserver(() => { this._size(); fx.request(.1); }); this.ro.observe(el); }
    }
    _size() { const r = this.el.getBoundingClientRect(); this.w = Math.max(40, r.width); this.h = Math.max(30, r.height); this.ctx = sizeCanvas(this.cv, this.w, this.h); this.pen.ctx = this.ctx; this.pen.pattern = null; }
    busy(t) { return t - this.start < this.len; }
    draw(t, reduced) {
      const lt = reduced ? this.len + 1 : t - this.start, T = this.fx.t(), settled = lt > this.len;
      this.reduced = reduced; this.ctx.clearRect(0, 0, this.w, this.h); this.pen.frame(settled ? 0 : T, reduced || settled);
      const ba = t - this.fx.cz.blinkAt - .12, blink = ba >= 0 && ba < .16 ? Math.sin(ba / .16 * Math.PI) : 0;
      this.def.draw.call(this, this.pen, lt, this.w, this.h, settled ? (reduced ? 0 : T) : T, blink);
    }
    destroy() { this.cv.remove(); this.ro && this.ro.disconnect(); if (this.restorePos) this.el.style.position = ''; this.fx.vigs.delete(this); }
  }

  // ------------------------------------------------------------------ efectos breves en la capa completa
  function centerOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function poof(fx, pt, n = 6, dur = .75) {
    if (fx.reduced) return;
    const seed = Math.floor(Math.random() * 999);
    fx._clip(dur, (p, lt) => { const a = 1 - K.seg(lt, dur * .55, dur); p.ctx.globalAlpha = a; for (let i = 0; i < n; i++) CAST.confetti(p, pt.x, pt.y, lt * .8, seed + i, CONF_COLS[i % CONF_COLS.length], 3.6); p.ctx.globalAlpha = 1; });
  }

  const HANDLERS = {
    intro(d) {
      const pol = d.policy || this.o.intro; if (pol === 'never') return;
      if (pol === 'session') { try { const k = this.o.storageKey + '-intro'; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { } }
      if (this.reduced) { this.mood('happy', 1.6); return; }
      this.cz.hidden = true; this._introHanded = false; this.introRunning = true;
      this.introClip = this._clip(3.0, (p, lt, T) => drawIntro.call(this, p, lt, T), () => { this.introRunning = false; });
    },
    view() { this._act('nod'); this.mood('happy', 1.1); },
    filter(d) {
      this._act('search'); this.mood('focus', 1.9); if (d.el) poof(this, centerOf(d.el), 5);
      if (d.value || d.color) { const col = d.color || K.statusColor(d.value); this.cz.buddies = [{ col, at: now() }]; }
    },
    'filter:clear'(d) { this._act('shake'); this.mood('happy', 1.1); poof(this, d.el ? centerOf(d.el) : this._dockPoint(), 7); },
    empty(d) { if (d.el) this.vignette(d.el, 'empty', d); this._act('shrug'); this.mood('doubt', 1.8); },
    project(d) { if (d.el) this.vignette(d.el, 'crane', { status: d.status, onDark: d.onDark ?? true }); this._act('point'); this.mood('happy', 1.3); },
    alert(d) {
      if (d.level === 'block') { this.cz.flagCol = P.danger; this._act('flag'); this.mood('alarm', 2.6); }
      else { this.cz.flagCol = P.warn; this._act('flag'); this.mood('worried', 2.6); }
      if (d.text) this.say(d.text);
    },
    success(d) {
      this._act('stamp'); this.mood('done', 1.7);
      if (!this.reduced) { const dp = this._dockPoint(), u = this.u; this._clip(1.5, (p, lt) => { if (lt > .52) CAST.stampMark(p, dp.x - 9 * u, dp.y - 3.2 * u, u * .9, K.seg(lt, .52, .7), 1 - K.seg(lt, 1.1, 1.5)); }); }
      if (d.text) this.say(d.text, { ms: 1800 });
    },
    celebrate(d) {
      this._act('cheer'); this.mood('proud', 2.2);
      if (this.reduced) return;
      const o = d.el ? centerOf(d.el) : (() => { const q = this._dockPoint(); return { x: q.x, y: q.y - 8 * this.u }; })();
      const n = K.clamp(d.count || 9, 4, 16), seed = Math.floor(Math.random() * 999);
      this._clip(1.9, (p, lt) => { p.ctx.globalAlpha = 1 - K.seg(lt, 1.4, 1.9); for (let i = 0; i < n; i++) CAST.confetti(p, o.x, o.y, lt, seed + i, CONF_COLS[i % CONF_COLS.length], 6.5); p.ctx.globalAlpha = 1; });
    },
    theme() { this._act('hop'); },
    'busy:start'() { const c = this.cz; c.action = 'juggle'; c.actionAt = now(); c.lastEvent = now(); this.mood('focus', 0); this._peek(0); this.request(1); },
    'busy:end'() { const c = this.cz; if (c.action === 'juggle') c.action = null; this.mood('done', 1.4); },
    status(d) {
      if (d.block) HANDLERS.alert.call(this, { level: 'block' });
      else if (d.risk) HANDLERS.alert.call(this, { level: 'risk' });
      else { this._act('wave'); this.mood('happy', 1.6); }
      if (d.text) this.say(d.text);
    },
    hover(d) { if (d.el) this.lookAt(d.el, d.secs || 1.6); if (d.mood) this.mood(d.mood, 1.2); },
    wave() { this._act('wave'); this.mood('happy', 1.4); }
  };

  CosmosFx.prototype._endIntro = function (handoff) {
    if (this._introHanded) return; this._introHanded = true;
    if (!handoff) { this.clips = this.clips.filter(c => c !== this.introClip); this.introRunning = false; }
    this.cz.hidden = false; this._act('land'); this.mood('happy', 1.8);
    setTimeout(() => this._act('wave'), 520);
  };

  // ------------------------------------------------------------------ exportación
  const API = {
    version: '1.0.0',
    create: o => new CosmosFx(o),
    draw: CosmosFx.draw,
    moods: Object.keys(MOODS), actions: Object.keys(ACTIONS), events: Object.keys(HANDLERS), vignettes: Object.keys(VIGS),
    STATUS: K.STATUS, statusColor: K.statusColor
  };
  global.CosmosFx = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
