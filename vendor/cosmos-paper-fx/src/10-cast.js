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
