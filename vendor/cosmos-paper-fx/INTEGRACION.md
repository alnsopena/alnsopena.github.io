# COSMOS Paper FX · Guía de integración (para Codex)

Capa de animación reactiva para el Portafolio Ejecutivo de IT de COSMOS. Un personaje guía (Cosmo, un contenedor con placa-cara) vive en la esquina inferior derecha sobre un muelle de papel y reacciona a lo que hace el usuario. Además hay viñetas que se pintan dentro de la web (grúa en la ficha de proyecto, estado vacío, mar en calma) y una bienvenida breve que se sobrepone sin bloquear.

- Canvas 2D puro. Sin dependencias, sin imágenes, sin IA en tiempo de ejecución.
- 17 KB gzip (`dist/cosmos-paper-fx.min.js`).
- La web funciona igual si el script no carga, se desactiva o el usuario pide menos movimiento.

## 1. Archivos

| Ruta | Qué es |
|---|---|
| `dist/cosmos-paper-fx.js` | Motor listo para usar (legible). |
| `dist/cosmos-paper-fx.min.js` | Misma versión minificada para producción. |
| `src/00-core.js` | Paleta, utilidades, pincel (`Pen`) y textura de papel. |
| `src/10-cast.js` | Personajes y utilería: Cosmo, mini contenedores, grúa, buque, gaviotas, olas, sello, papelitos. |
| `src/20-runtime.js` | Estados de ánimo, acciones, bucle de dibujo, dock, globo de texto, API pública. |
| `src/30-scenes.js` | Bienvenida, viñetas y el mapa de eventos. |
| `build.sh` | Une `src/` en `dist/` y minifica. |
| `demo/index.html` | Portal propuesta v8 con la integración funcionando. |
| `demo/portal-adapter.js` | **Referencia de integración**: cómo conectar cada función del portal con un evento. |
| `demo/demo-panel.js` | Panel "Probar animaciones" para QA. No va a producción. |
| `character-sheet.html` | Hoja de personajes y reglas de estilo, dibujada con el mismo motor. |

## 2. Instalación

Al final del `<body>`, después del script principal del portal:

```html
<script src="assets/js/cosmos-paper-fx.min.js" defer></script>
<script src="assets/js/portal-fx.js" defer></script>  <!-- tu adaptador, basado en demo/portal-adapter.js -->
```

Si el portal tiene su propia bienvenida (`.brand-intro` / `show-intro`), quítala: la bienvenida de papel la reemplaza.

## 3. Crear la instancia

```js
const fx = CosmosFx.create({
  dock: { right: 22, bottom: 22, size: 84 },          // size = ancho de Cosmo en px
  dockMobile: { right: 10, bottom: 78, size: 58 },    // < 800 px: queda sobre la barra inferior de 64 px
  intro: 'session',                                    // 'session' | 'always' | 'never'
  motion: 'auto',                                      // 'auto' respeta prefers-reduced-motion; 'reduce' fuerza modo quieto
  peekAfter: 9, sleepAfter: 75,                        // segundos: se asoma / se duerme
  onCosmoClick: () => ({ text: '16 proyectos activos · 4 requieren atención', mood: 'happy' }),
  label: 'Cosmo: ver resumen de la cartera',
  announce: false                                      // true: el globo se anuncia a lectores de pantalla
});
```

| Opción | Por defecto | Nota |
|---|---|---|
| `dock` / `dockMobile` | ver arriba | `mobileBelow: 800` define el corte. |
| `zIndex` | 60 | Por encima del header (50) y de la barra móvil. Los `<dialog>` modales quedan siempre encima. |
| `enabled` | true | Se recuerda en `localStorage` (`cosmos-fx`). |
| `fps` / `idleFps` | 30 / 8 | En reposo total el bucle se detiene (0 fps). |
| `storageKey` | `cosmos-fx` | Clave para preferencias e intro por sesión. |

## 4. API

| Método | Uso |
|---|---|
| `fx.emit(evento, datos)` | Dispara una reacción. Ver tabla de eventos. |
| `fx.say(texto, { ms })` | Globo de papel sobre Cosmo. Máximo una línea o dos. |
| `fx.lookAt(elemento o {x, y}, segundos)` | Cosmo mira un elemento. |
| `fx.mood(nombre, segundos)` | Cambia el ánimo; vuelve a `normal` al terminar (0 = no vuelve). |
| `fx.vignette(slot, tipo, opciones)` | Pinta una viñeta dentro de un contenedor. Devuelve un objeto con `destroy()`. |
| `fx.setEnabled(bool)` / `fx.isEnabled()` | Interruptor del usuario (persistente). |
| `fx.setVisible(bool)` | Oculta sin guardar preferencia (modo comité, impresión). |
| `fx.setMotion('auto' \| 'reduce')` | Forzar modo quieto. |
| `fx.stats()` | `{ frames, avgMs, maxMs, running, vignettes, layers }` para QA. |
| `fx.destroy()` | Limpia listeners, canvas y DOM. |
| `CosmosFx.draw` | Funciones de dibujo sin estado (Pen, cosmo, box, crane, ship, waves, emote…) para piezas estáticas. |
| `CosmosFx.statusColor(etiqueta)` | Color semántico para estatus, situación de plazo o prioridad. |

### Eventos

| Evento | Datos | Reacción |
|---|---|---|
| `intro` | `{ policy? }` | Papel que sube, buque, Cosmo salta a su muelle. 3 s, no bloquea, se salta con clic, Enter, Espacio o Esc. No corre con movimiento reducido. |
| `status` | `{ block, risk, text }` | Resumen al entrar: bandera roja si hay bloqueos, ámbar si hay riesgos, saludo si todo está bien. |
| `view` | `{}` | Asiente al cambiar de módulo. |
| `filter` | `{ el, value? , color? }` | Lupa + papelitos en `el`. Si pasas `value` (p. ej. "En Proceso", "Vencido", "Critical ⚠️") salta un mini contenedor de ese color. |
| `filter:clear` | `{ el }` | Se sacude y vuelan papelitos. |
| `empty` | `{ el }` | Viñeta de estado vacío en `el` + gesto de duda. |
| `project` | `{ el, status, onDark? }` | Viñeta de grúa en `el` (encabezado de la ficha). |
| `alert` | `{ level: 'risk' \| 'block', text? }` | Bandera ámbar o roja. |
| `success` | `{ text? }` | Sello de visto bueno. |
| `celebrate` | `{ el?, count }` | Lluvia de mini contenedores (máx. 16). |
| `theme` | `{}` | Salto corto al cambiar de tema. El color se adapta solo (observa `data-theme` y `prefers-color-scheme`). |
| `busy:start` / `busy:end` | `{}` | Malabares con contenedores mientras algo carga. Úsalo si agregan refresco en vivo desde monday. |
| `hover` | `{ el, mood? }` | Mira el elemento y opcionalmente cambia el ánimo. |
| `wave` | `{}` | Saludo. |

Reacciones automáticas sin eventos: sigue el cursor con los ojos, sube si el cursor se acerca, saluda al pasar el mouse sobre él, se agarra con scroll brusco, se asoma a los 9 s sin eventos (solo ojos sobre el muelle) y se duerme a los 75 s sin actividad.

## 5. Slots de viñetas

La viñeta llena el contenedor que le pases (`position:absolute; inset:0`). El portal decide dónde y de qué tamaño:

```css
.cfx-slot-crane{position:absolute;right:62px;top:0;bottom:0;width:min(230px,38%);pointer-events:none}
.dialog-head h2,.dialog-head .dialog-meta{max-width:calc(100% - min(230px,38%) - 8px)}
.cfx-slot-empty{position:relative;width:100%;max-width:420px;height:112px}
.cfx-slot-calma{position:relative;height:62px;margin:-6px 0 10px}
@media (max-width:800px){.cfx-slot-crane{right:54px;top:4px;bottom:auto;height:98px;width:36%}}
```

Si el nodo sale del DOM (por un re-render), la viñeta se destruye sola.

## 6. Mapeo con el portal

La forma más segura es envolver funciones existentes para que la reacción corra **después** de la función original (ver `demo/portal-adapter.js`):

```js
const after = (name, fn) => { const o = window[name]; if (typeof o !== 'function') return;
  window[name] = function () { const r = o.apply(this, arguments); try { fn.apply(this, arguments); } catch (e) {} return r; }; };
```

| Función del portal | Evento |
|---|---|
| `go(v)` | `view` |
| `setFilter(k, v)` | `filter` con `value` si `k` es status, priority, schedule o issue; `filter:clear` si `v` es vacío |
| `clearFilters()` | `filter:clear` |
| `setExecutivePreset(v)` | `filter` / `filter:clear` |
| `openProject(id)` | crear `.cfx-slot-crane` en `.dialog-head` y `project` con el estatus |
| `copyViewLink()` | `success` |
| `setTheme()` | `theme` |
| `toggleFullscreen()` | `fx.setVisible(!modoComite)` |
| `render()` | revisar `.empty` de filtros → `empty`; `.weekly-card.is-quiet` → viñeta `calma` |
| carga inicial | `intro` y luego `status` (a los 3,3 s si hubo intro, 0,7 s si no) |

Si Codex reescribe el portal con otra arquitectura (componentes, eventos propios), basta con llamar `fx.emit(...)` en los mismos momentos. El motor no lee el DOM del portal ni los datos de monday.

## 7. Reglas de uso

- Cosmo **acompaña**, no informa: el dato siempre está en la web. Los globos solo resumen (máx. ~80 caracteres).
- Una reacción por acción del usuario. No encadenar `alert` en cada render: solo al entrar (`status`) o al pasar el mouse por un bloqueo.
- No mostrar Cosmo en modo comité ni en impresión (`setVisible(false)`; la impresión ya lo oculta por CSS).
- Ofrecer siempre el interruptor "Animaciones" (header y hoja "Más" en móvil).

## 8. Accesibilidad

- `prefers-reduced-motion`: sin bienvenida, sin desplazamientos ni hervor de línea; los cambios de ánimo se muestran como pose fija. El globo y los estados siguen funcionando.
- `prefers-reduced-transparency`, alto contraste y modo oscuro: el motor ajusta sombras y bordes.
- La capa es `aria-hidden` salvo el botón de Cosmo cuando existe `onCosmoClick` (tiene `aria-label`).
- El área clicable sigue solo la parte visible de Cosmo: nunca queda un área invisible encima del contenido.
- `announce: true` convierte el globo en `role="status"`. Déjalo en `false` si el portal ya anuncia resultados.

## 9. Rendimiento (medido en la demo, 1440×900, Chromium headless)

| Métrica | Valor |
|---|---|
| Dibujo promedio por cuadro | 1,2 a 1,4 ms |
| Peor cuadro (bienvenida a pantalla completa) | ~22 ms |
| En reposo (asomado) | bucle detenido, 0 ms |
| Tamaño | 46 KB minificado, 17 KB gzip |

El bucle solo corre mientras hay algo que animar, baja a 8 fps cuando Cosmo está despierto y quieto, y se detiene con la pestaña oculta.

## 10. Personalizar

- **Colores:** `K.PAL` y `K.STATUS` en `src/00-core.js`.
- **Nuevo ánimo:** agrega una entrada a `MOODS` en `src/20-runtime.js` (`eyes`, `mouth`, `brows`, `emote`, `blush`, `hat`).
- **Nueva acción:** agrega a `ACTIONS` una función pura `lt => ({ dy, sq, rot, aL, aR, prop })` con su `dur`.
- **Nueva viñeta:** agrega a `VIGS` en `src/30-scenes.js` con `len` y `draw(pen, lt, w, h, T, blink)`.
- Ejecuta `./build.sh` y revisa `character-sheet.html`.

## 11. Checklist de QA

- [ ] Primera visita: la bienvenida dura 3 s, no bloquea clics y se salta con Esc.
- [ ] Recarga en la misma sesión: sin bienvenida.
- [ ] Filtro por leyenda: lupa + mini contenedor del color correcto.
- [ ] Búsqueda sin resultados: viñeta de pallet vacío.
- [ ] Ficha de proyecto: la grúa no tapa el título ni el botón cerrar (escritorio y móvil).
- [ ] Modo oscuro: Cosmo con borde crema, globo oscuro.
- [ ] Móvil: Cosmo sobre la barra inferior, no tapa botones.
- [ ] Movimiento reducido: todo quieto, sin errores.
- [ ] Interruptor "Animaciones" apaga y recuerda la preferencia.
- [ ] `fx.stats().running === false` tras 10 s sin interacción.
- [ ] Consola sin errores.

## 12. Prompt sugerido para Codex

> Integra COSMOS Paper FX en el portal. Copia `dist/cosmos-paper-fx.min.js` a `assets/js/`. Crea `assets/js/portal-fx.js` tomando como base `demo/portal-adapter.js`, adaptado a los nombres de funciones y componentes actuales del portal. No modifiques la lógica de indicadores ni la conexión con monday. Quita la bienvenida anterior. Agrega los slots CSS de la sección 5, el interruptor "Animaciones" en el header y en la hoja "Más", y oculta la capa en modo comité. Verifica con la checklist de la sección 11.
