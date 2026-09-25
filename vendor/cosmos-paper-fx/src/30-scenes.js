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
