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
