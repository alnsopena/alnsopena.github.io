/* Panel de pruebas (solo para la demo y QA). Dispara cada evento de COSMOS Paper FX. */
(function () {
  const fx = window.cosmosFx; if (!fx) return;
  const ev = [
    ['Bienvenida', () => { try { sessionStorage.removeItem('cosmos-fx-intro'); } catch (e) {} fx.emit('intro', { policy: 'always' }); }],
    ['Cambio de módulo', () => fx.emit('view')],
    ['Filtrar', () => fx.emit('filter', { el: document.querySelector('.module-filters, .executive-toolbar') })],
    ['Limpiar filtros', () => fx.emit('filter:clear', { el: document.querySelector('.module-filters, .executive-toolbar') })],
    ['Riesgo', () => fx.emit('alert', { level: 'risk' })],
    ['Bloqueo', () => fx.emit('alert', { level: 'block' })],
    ['Acción lista', () => fx.emit('success', { text: 'Enlace copiado' })],
    ['Celebrar', () => fx.emit('celebrate', { count: 14 })],
    ['Ocupado', () => fx.emit('busy:start')],
    ['Listo', () => fx.emit('busy:end')],
    ['Decir algo', () => fx.say('Hay 4 proyectos que requieren atención esta semana.')],
    ['Dormir', () => { fx.cz.lastInput = -1e9; fx.request(1); }]
  ];
  const box = document.createElement('div');
  box.innerHTML = '<details style="position:fixed;left:12px;bottom:12px;z-index:70;background:var(--surface,#fff);color:var(--text,#021e2f);border:1px solid var(--line,#dfe5e8);border-radius:12px;box-shadow:0 12px 28px -16px rgba(2,30,47,.4);font:600 12.5px Figtree,sans-serif;max-width:300px"><summary style="cursor:pointer;padding:9px 12px">Probar animaciones</summary><div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 10px 10px"></div><div class="fxstat" style="padding:0 12px 10px;font-weight:500;color:var(--text-3,#566873)"></div></details>';
  const wrap = box.querySelector('div');
  ev.forEach(([l, f]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.style.cssText = 'height:30px;padding:0 10px;border:1px solid var(--line-strong,#c5cfd4);border-radius:8px;background:var(--surface,#fff);color:inherit;font:inherit;cursor:pointer'; b.onclick = f; wrap.appendChild(b); });
  document.body.appendChild(box);
  setInterval(() => { const s = fx.stats(); box.querySelector('.fxstat').textContent = 'Dibujo: ' + s.avgMs + ' ms promedio · ' + (s.running ? 'animando' : 'en reposo'); }, 1000);
  if (window.matchMedia('(max-width:800px)').matches) box.querySelector('details').style.bottom = '84px';
})();
