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
