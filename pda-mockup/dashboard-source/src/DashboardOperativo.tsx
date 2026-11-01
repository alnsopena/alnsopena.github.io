"use client";
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { writeManualRecords, type ManualRecords } from './manual-storage';
import { EVENT_KEYS, EVENT_CONFIG, RANGE_CONFIG, formatDateTime, formatTableDate, getPresentation,
  getIndicatorTitle, selectVessels, summarize, type RangeKey, type EventKey, type Vessel, type DashboardOptions } from './dashboard-model';
import { useDashboardRuntime } from './use-dashboard-runtime';
import { useChanges } from './use-changes';
import { OperationalTable } from './OperationalTable';
import { TvDashboard } from './TvDashboard';
import { makeTvUrl } from './dashboard-model';
import { DashboardClock, useDashboardTime } from './DashboardClock';
import { todayLabel } from './dashboard-clock';
type EditorSource =
  | "Historia"
  | "Reunión"
  | "Ambas"
  | "Solicitud actual"
  | "Decisión del mockup";

type EditorNote = {
  id: number;
  title: string;
  source: EditorSource;
  origin: string;
  rationale: string;
  implementation: string;
};

const EDITOR_NOTES: EditorNote[] = [
  {
    id: 1,
    title: "Cabecera del portal COSMOS",
    source: "Solicitud actual",
    origin:
      "Punto 2 y foto 2: reemplazar la cabecera que decía COSMOS SION por la cabecera del portal COSMOS.",
    rationale:
      "Ubica el dashboard dentro del ecosistema visual del portal y conserva contexto de sede, fecha, navegación y usuario.",
    implementation:
      "Cabecera blanca de dos niveles con marca COSMOS, sede Callao, fecha/hora PET, usuario y menú principal; Dashboard queda activo.",
  },
  {
    id: 2,
    title: "Azul del rango seleccionado",
    source: "Solicitud actual",
    origin:
      "Punto 3: el rango seleccionado debe usar exactamente el tono HEX #1c42b3.",
    rationale:
      "Un único color de selección mantiene consistencia con identidad visual indicada.",
    implementation:
      "Botón temporal activo con fondo #1c42b3 y texto blanco, tanto en Hoy como al cambiar de rango.",
  },
  {
    id: 3,
    title: "Tres rangos temporales",
    source: "Ambas",
    origin:
      "Historia: sección Rangos temporales. Reunión: punto 8 sobre clasificación por arrival y sailing.",
    rationale:
      "Permite concentrar monitoreo en naves recientes, presentes o próximas sin agregar filtros avanzados.",
    implementation:
      "Últimas 2 semanas, Hoy 5 de agosto y Próximas 2 semanas; solo uno puede estar activo y actualiza grilla y KPIs sin recarga.",
  },
  {
    id: 4,
    title: "Clasificación por eventos clave",
    source: "Reunión",
    origin:
      "Punto 8: sailing pasa a dos semanas hacia atrás; arrival aparece en Hoy; sin arrival pasa a Próximas.",
    rationale:
      "La nave se ubica según avance operativo real y no únicamente por una fecha calendario genérica.",
    implementation:
      "Sailing registrado → Últimas; arrival sin sailing → Hoy; sin arrival → Próximas.",
  },
  {
    id: 5,
    title: "Cuatro KPIs operativos",
    source: "Historia",
    origin:
      "Historia: criterio de aceptación de KPIs y regla de recálculo según rango visible.",
    rationale:
      "Entrega lectura ejecutiva inmediata antes de revisar detalle por nave.",
    implementation:
      "Naves visibles, eventos vencidos, eventos por vencer y eventos en plazo se recalculan al cambiar el rango.",
  },
  {
    id: 6,
    title: "KPIs con color completo",
    source: "Solicitud actual",
    origin:
      "Punto 1 y foto 1: usar colores enteros en las tarjetas de vencidos, por vencer y en plazo.",
    rationale:
      "Refuerza lectura rápida del nivel de atención requerido.",
    implementation:
      "Fondos sólidos rojo, amarillo y verde; tarjeta de naves permanece neutra y blanca.",
  },
  {
    id: 7,
    title: "Vista única y grilla consolidada",
    source: "Ambas",
    origin:
      "Historia: Vista única y Grilla. Coincidencia documentada: Vista consolidada para priorizar sin revisar múltiples pantallas.",
    rationale:
      "Centraliza nave, viaje, tiempos y cinco hitos críticos en una sola superficie operativa.",
    implementation:
      "Una grilla, sin pestañas ni timeline adicional, con todas las columnas operativas requeridas.",
  },
  {
    id: 8,
    title: "Semáforo por plazo",
    source: "Ambas",
    origin:
      "Historia: criterio de semáforo. Reunión: puntos 1, 2 y 3 sobre pendiente, fecha límite y fecha transmitida.",
    rationale:
      "Evita interpretar todo pendiente como vencido y reserva rojo para incumplimiento real.",
    implementation:
      "Sin transmisión se compara ahora contra límite; con transmisión se compara transmisión contra límite. Verde = holgura/cumplimiento, amarillo = riesgo, rojo = vencido/tardío.",
  },
  {
    id: 9,
    title: "Ejecución separada del color",
    source: "Reunión",
    origin:
      "Punto 4: agregar check, ícono o dimensión visual para indicar evento ejecutado.",
    rationale:
      "Distingue un evento pendiente de otro ejecutado tardíamente, aunque ambos puedan requerir atención.",
    implementation:
      "Indicador con check = ejecutado; círculo hueco = pendiente. El color continúa representando plazo.",
  },
  {
    id: 10,
    title: "Naves en operación y alerta ETA/ETD",
    source: "Reunión",
    origin:
      "Punto 5: eventos de naves en operación en verde, salvo estimado desactualizado que genere alerta.",
    rationale:
      "Reduce falsos vencidos durante operación y mantiene visible una anomalía de estimación.",
    implementation:
      "Estado operativo fuerza verde; una ETA/ETD vencida resalta fila y muestra Estimado vencido.",
  },
  {
    id: 11,
    title: "Naves sin agente marítimo",
    source: "Reunión",
    origin:
      "Punto 6: naves sin agente marítimo no deben mostrar colores de semáforo.",
    rationale:
      "Evita atribuir cumplimiento o incumplimiento cuando no existe responsable marítimo asignado.",
    implementation:
      "Etiqueta Sin agente marítimo e indicadores neutrales grises, sin rojo, amarillo ni verde.",
  },
  {
    id: 12,
    title: "Registro manual de manifiesto",
    source: "Reunión",
    origin:
      "Punto 7: registrar manifiesto con fecha, hora y check confirmado cuando falle transmisión automática, por ejemplo ingreso SDA.",
    rationale:
      "Cubre contingencia operativa sin convertir toda la vista en un módulo de mantenimiento.",
    implementation:
      "Modal de manifiesto con nave/viaje, fecha, hora y confirmación. Se guarda como Registro manual / SDA. Excepción explícita frente a la historia, que plantea consulta sin cargas manuales.",
  },
  {
    id: 13,
    title: "Detalle y trazabilidad del evento",
    source: "Decisión del mockup",
    origin:
      "Documento de trazabilidad, sección Interacciones disponibles: seleccionar evento abre estado, límite, transmisión, confirmación, fuente y regla.",
    rationale:
      "Permite entender por qué un indicador tiene determinado color y forma sin saturar la grilla.",
    implementation:
      "Cada indicador abre panel lateral con cálculo completo y fuente del dato.",
  },
  {
    id: 14,
    title: "Fórmulas de fechas límite",
    source: "Historia",
    origin:
      "Historia: reglas de cálculo para manifiesto, aviso de llegada y término de descarga.",
    rationale:
      "Hace reproducible el semáforo con reglas operativas verificables.",
    implementation:
      "Manifiesto = ETA − 7 días; aviso = ATA/amarre + 1 hora; término de descarga = fin + 6 horas.",
  },
  {
    id: 15,
    title: "Umbrales pendientes de COSMOS",
    source: "Historia",
    origin:
      "Documento de trazabilidad: Autorización de Carga y Término de Embarque no tienen reglas cerradas en la historia.",
    rationale:
      "Se pueden visualizar ambos hitos sin presentar como definitiva una regla aún no validada.",
    implementation:
      "Ambos usan umbrales de demostración y el pie identifica explícitamente el pendiente de validación COSMOS.",
  },
  {
    id: 16,
    title: "Alcance informativo",
    source: "Historia",
    origin:
      "Historia: naturaleza informativa, alcance operativo y filtros. No incluye módulos documentarios, comerciales, financieros ni filtros avanzados.",
    rationale:
      "Mantiene foco del ticket en monitoreo diario de naves e hitos críticos.",
    implementation:
      "Vista de consulta con tres rangos. Única excepción de escritura: manifiesto manual acordado en reunión.",
  },
  {
    id: 17,
    title: "Datos demo e integración SION",
    source: "Historia",
    origin:
      "Documento de trazabilidad: siguiente fase reemplaza datos demostrativos por fechas oficiales de Viaje / Tiempos de Arribo y Zarpe de SION.",
    rationale:
      "Separa validación de experiencia y reglas del trabajo posterior de integración.",
    implementation:
      "Mockup identifica datos demostrativos; la integración oficial queda como siguiente fase sin alterar reglas visuales.",
  },
];

function EditorPins({
  ids,
  onSelect,
}: {
  ids: number[];
  onSelect: (id: number) => void;
}) {
  return (
    <div className="editor-pins" aria-label="Comentarios del editor">
      {ids.map((id) => (
        <button
          className="editor-pin"
          key={id}
          onClick={() => onSelect(id)}
          title={`Comentario ${id}: ${EDITOR_NOTES[id - 1]?.title ?? "Nota"}`}
          type="button"
        >
          <span aria-hidden="true">i</span>
          <small>{id}</small>
        </button>
      ))}
    </div>
  );
}

export default function DashboardOperativo({
  editorMode = false,
  embedded = false,
  options,
}: {
  editorMode?: boolean;
  embedded?: boolean;
  options: DashboardOptions;
}) {
  const runtime = useDashboardRuntime(options);
  const dashboardNow = useDashboardTime(options.clock, runtime.state.data?.cut);
  const { enabled: changesEnabled, toggle: toggleChanges } = useChanges(embedded, options.tv);
  const range = runtime.state.range;
  const setRange = runtime.setRange;
  const vessels = runtime.state.data?.vessels ?? [];
  const setVessels = runtime.setVessels;
  const [storageMessage, setStorageMessage] = useState('');
  const [selectedCell, setSelectedCell] = useState<{
    vesselId: string;
    eventKey: EventKey;
  } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualVesselId, setManualVesselId] = useState("");
  const [manualDate, setManualDate] = useState("2026-08-05");
  const [manualTime, setManualTime] = useState("10:30");
  const [manualConfirmed, setManualConfirmed] = useState(true);
  const [toast, setToast] = useState("");
  const [editorPanelOpen, setEditorPanelOpen] = useState(editorMode);
  const [activeEditorNoteId, setActiveEditorNoteId] = useState<number | null>(null);

  useEffect(() => {
    const overlayOpen = manualOpen || Boolean(selectedCell);
    if (embedded) parent.postMessage({ type: "cosmos-dashboard-overlay", open: overlayOpen }, location.origin);
    if (!overlayOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        setManualOpen(false);
        setSelectedCell(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      if (embedded) parent.postMessage({ type: "cosmos-dashboard-overlay", open: false }, location.origin);
    };
  }, [manualOpen, selectedCell, embedded]);

  const visibleVessels = useMemo(() => selectVessels(runtime.state.data, options.site, range), [runtime.state.data, options.site, range]);
  const summary = useMemo(() => summarize(visibleVessels), [visibleVessels]);
  const selectedDetail = useMemo(() => {
    if (!selectedCell) return null;
    const vessel = vessels.find((item) => item.id === selectedCell.vesselId);
    if (!vessel) return null;
    const currentEvent = vessel.events[selectedCell.eventKey];
    return {
      vessel,
      key: selectedCell.eventKey,
      currentEvent,
      presentation: getPresentation(vessel, currentEvent),
    };
  }, [selectedCell, vessels]);

  const openManualRegistration = (preferredVesselId?: string) => {
    const fallback =
      visibleVessels.find((vessel) => vessel.agent)?.id ?? vessels[0]?.id ?? "";
    const id = preferredVesselId ?? fallback;
    setManualVesselId(id);
    const saved = vessels.find(v => v.id === id)?.events.manifest;
    setManualDate(saved?.transmittedAt?.slice(0, 10) ?? '2026-08-05');
    setManualTime(saved?.transmittedAt?.slice(11, 16) ?? '10:30');
    setManualConfirmed(saved?.confirmed !== false);
    setManualOpen(true);
    setSelectedCell(null);
  };

  const handleManualSubmit = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (!manualVesselId || !manualDate || !manualTime) return;

    const transmittedAt = `${manualDate}T${manualTime}:00-05:00`;
    const nextVessels = vessels.map((vessel) =>
        vessel.id === manualVesselId
          ? {
              ...vessel,
              events: {
                ...vessel.events,
                manifest: {
                  ...vessel.events.manifest,
                  transmittedAt,
                  confirmed: manualConfirmed,
                  manual: true,
                  source: "Registro manual / SDA",
                },
              },
            }
          : vessel,
      );
    const records: ManualRecords = {};
    for (const vessel of nextVessels) {
      const manifest = vessel.events.manifest;
      if (manifest.manual && manifest.transmittedAt) {
        records[vessel.id] = { transmittedAt: manifest.transmittedAt, confirmed: manifest.confirmed !== false };
      }
    }
    try {
      writeManualRecords(window.localStorage, records);
    } catch {
      setStorageMessage("No se pudo guardar en este navegador. El registro sigue abierto para que puedas reintentar; no se confirmó el guardado.");
      return;
    }
    setVessels(nextVessels);
    setStorageMessage("");
    const vesselName = vessels.find((item) => item.id === manualVesselId)?.name;
    setToast(
      manualConfirmed
        ? `Manifiesto de ${vesselName} registrado y confirmado.`
        : `Manifiesto de ${vesselName} guardado sin confirmar.`,
    );
    setManualOpen(false);
    window.setTimeout(() => setToast(""), 4200);
  };

  const openEditorNote = (id: number) => {
    setActiveEditorNoteId(id);
    setEditorPanelOpen(true);
  };

  const activeEditorNote =
    activeEditorNoteId === null
      ? null
      : EDITOR_NOTES.find((note) => note.id === activeEditorNoteId) ?? null;

  if (options.tv) return <TvDashboard options={options} state={runtime.state} vessels={visibleVessels} summary={summary} now={dashboardNow} />;

  return (
    <main className={editorMode ? 'dashboard-shell desktop-dashboard editor-mode' : 'dashboard-shell desktop-dashboard'}>
      <div className="dashboard-tools">
        <span>{options.site === 'paita' ? 'Paita' : 'Callao'} · Vista operativa</span>
        <DashboardClock now={dashboardNow} updatedAt={runtime.state.updatedAt} error={runtime.state.error}/>
        <div>
          <a className="tv-launch secondary-action" data-chg="NUEVO" data-change-id="tv" href={makeTvUrl(options, range)} target="_blank" rel="noopener">Modo TV</a>
          <button className="cc-btn chg-btn" onClick={toggleChanges} type="button" aria-pressed={changesEnabled}>Cambios vs Connect: {changesEnabled ? 'sí' : 'no'}</button>
        </div>
      </div>
      <div className="demo-notice" role="note">
        <strong>Datos demostrativos, corte 05/08/2026</strong>
        <span>Los registros manuales se guardan en este navegador y se conservan al recargar. No se sincronizan con COSMOS.</span>
      </div>
      {(storageMessage || runtime.state.error) && <p className="storage-warning" role="alert">{storageMessage || runtime.state.error}</p>}

      <section className="hero-panel editor-anchor" aria-labelledby="dashboard-title">
        <div className="hero-copy">

          <h1 id="dashboard-title">Vista Operativa de Naves y Eventos Críticos</h1>
          <p>
            Seguimiento diario de naves y eventos operativos críticos
          </p>
        </div>

        <div className="range-tabs" data-chg="CAMBIADO" data-change-id="rangos" role="tablist" aria-label="Rango temporal">
          {(Object.keys(RANGE_CONFIG) as RangeKey[]).map((key) => (
            <button
              className={range === key ? "range-tab is-active" : "range-tab"}
              key={key}
              onClick={() => {
                setRange(key);
                setSelectedCell(null);
              }}
              role="tab"
              title={RANGE_CONFIG[key].description}
              aria-selected={range === key}
              type="button"
            >
              <span>{key==='today'?todayLabel(dashboardNow):RANGE_CONFIG[key].label}</span>
              <small>{RANGE_CONFIG[key].eyebrow}</small>
            </button>
          ))}
        </div>

        <div className="range-context">
          <span className="context-icon" aria-hidden="true">
            i
          </span>
          <span>{RANGE_CONFIG[range].description}</span>
        </div>
        {editorMode && <EditorPins ids={[2, 3, 4]} onSelect={openEditorNote} />}
      </section>

      <section className="kpi-grid editor-anchor" aria-label="Indicadores del rango activo">
        <article className="kpi-card kpi-neutral" data-chg="CAMBIADO" data-change-id="conteo">
          <div>
            <span>{range === "today" ? "Naves Activas Hoy" : "Naves en el rango"}</span>
            <strong>{visibleVessels.length}</strong>
          </div>
          <p>
            {summary.alerts > 0
              ? `${summary.alerts} con estimado desactualizado`
              : "Sin alertas de estimado"}
          </p>
        </article>
        <article className="kpi-card kpi-red">
          <div>
            <span>Eventos Vencidos</span>
            <strong>{summary.red}</strong>
          </div>
          <p>Plazo incumplido</p>
        </article>
        <article className="kpi-card kpi-yellow">
          <div>
            <span>Eventos por Vencer</span>
            <strong>{summary.yellow}</strong>
          </div>
          <p>Dentro de ventana de riesgo</p>
        </article>
        <article className="kpi-card kpi-green">
          <div>
            <span>Eventos en Plazo</span>
            <strong>{summary.green}</strong>
          </div>
          <p>Ejecutados o con holgura</p>
        </article>
        {editorMode && <EditorPins ids={[5, 6]} onSelect={openEditorNote} />}
      </section>

      <section className="events-panel editor-anchor" aria-labelledby="events-title">
        <div className="panel-heading">
          <div>

            <h2 id="events-title">Eventos Operativos Críticos</h2>
            <p className="panel-summary" data-chg="NUEVO" data-change-id="resumen">
              {summary.executed} ejecutados · {summary.pending} pendientes ·{" "}
              {summary.neutral} sin semáforo
            </p>
          </div>
          <div className="panel-actions editor-anchor">
            <button
              className="primary-action" data-chg="NUEVO" data-change-id="registro" disabled={!visibleVessels.length}
              onClick={() => openManualRegistration()}
              type="button"
            >
              <span aria-hidden="true">+</span>
              Registrar manifiesto
            </button>
            {editorMode && <EditorPins ids={[12]} onSelect={openEditorNote} />}
          </div>
        </div>

        <div className="legend editor-anchor" aria-label="Leyenda de estados">
          <div className="legend-group">
            <span className="legend-title">Plazo</span>
            <span><i className="legend-color red" />Vencido / Fuera de Plazo</span>
            <span><i className="legend-color yellow" />Próximo a Vencer</span>
            <span><i className="legend-color green" />En Plazo</span>
          <span><i className="legend-color neutral" />Sin información</span></div>
          <div className="legend-divider" aria-hidden="true" />
          <div className="legend-group">
            <span className="legend-title" data-chg="NUEVO" data-change-id="ejecucion">Ejecución</span>
            <span><i className="legend-shape executed">✓</i>Ejecutado</span>
            <span><i className="legend-shape pending" />Pendiente</span>
            <span><i className="legend-shape no-agent">-</i>Sin agente</span>
          </div>
          {editorMode && <EditorPins ids={[8, 9]} onSelect={openEditorNote} />}
        </div>

        <div className="table-frame editor-anchor">
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Grilla de naves con cabecera fija">
            <OperationalTable vessels={visibleVessels} onSelect={(vesselId, eventKey) => setSelectedCell({vesselId, eventKey})} />

          </div>
          <div className="table-footer">
            <span>
              Mostrando {visibleVessels.length} naves · Datos demostrativos
            </span>
            <span data-chg="CAMBIADO" data-change-id="calculos">Cálculo de plazos y excepciones: validar con desarrollo</span>
          </div>
          {editorMode && (
            <EditorPins ids={[10, 11, 13, 14, 15]} onSelect={openEditorNote} />
          )}
        </div>
        {editorMode && <EditorPins ids={[7, 16]} onSelect={openEditorNote} />}
      </section>

      <footer className="dashboard-footer editor-anchor">
        <span>Mockup funcional · PECMO100-371</span>
        <span>
          Autorización de carga y término de embarque: umbrales de demostración
          pendientes de validación COSMOS.
        </span>
        {editorMode && <EditorPins ids={[17]} onSelect={openEditorNote} />}
      </footer>

      {editorMode && (
        <>
          <button
            className="editor-toggle"
            onClick={() => {
              if (editorPanelOpen) {
                setEditorPanelOpen(false);
              } else {
                setActiveEditorNoteId(null);
                setEditorPanelOpen(true);
              }
            }}
            aria-expanded={editorPanelOpen}
            aria-controls="editor-panel"
            type="button"
          >
            <span aria-hidden="true">i</span>
            Comentarios del editor
            <strong>{EDITOR_NOTES.length}</strong>
          </button>

          {editorPanelOpen && (
            <aside className="editor-panel" id="editor-panel" aria-label="Comentarios del editor">
              <div className="editor-panel-header">
                <div>
                  <p>PECMO100-371</p>
                  <h2>{activeEditorNote ? `Nota ${activeEditorNote.id}` : "Comentarios del editor"}</h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setEditorPanelOpen(false)}
                  aria-label="Cerrar comentarios del editor"
                  type="button"
                >
                  ×
                </button>
              </div>

              {activeEditorNote ? (
                <div className="editor-note-detail">
                  <button
                    className="editor-back"
                    onClick={() => setActiveEditorNoteId(null)}
                    type="button"
                  >
                    ← Ver todas las notas
                  </button>
                  <span className="editor-source" data-source={activeEditorNote.source}>
                    {activeEditorNote.source}
                  </span>
                  <h3>{activeEditorNote.title}</h3>

                  <section>
                    <span>Origen explícito</span>
                    <p>{activeEditorNote.origin}</p>
                  </section>
                  <section>
                    <span>Por qué está así</span>
                    <p>{activeEditorNote.rationale}</p>
                  </section>
                  <section>
                    <span>Aplicación en el mockup</span>
                    <p>{activeEditorNote.implementation}</p>
                  </section>
                </div>
              ) : (
                <div className="editor-note-index">
                  <p className="editor-index-intro">
                    Cada botón abre origen, justificación y aplicación. Etiquetas distinguen Historia, Reunión, ambas fuentes y decisiones posteriores.
                  </p>
                  {EDITOR_NOTES.map((note) => (
                    <button
                      className="editor-note-card"
                      key={note.id}
                      onClick={() => setActiveEditorNoteId(note.id)}
                      type="button"
                    >
                      <span className="editor-note-number">{note.id}</span>
                      <span className="editor-note-card-copy">
                        <strong>{note.title}</strong>
                        <small className="editor-source" data-source={note.source}>
                          {note.source}
                        </small>
                      </span>
                      <span aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              )}
            </aside>
          )}
        </>
      )}

      {selectedDetail && (
        <div
          className="drawer-backdrop"
          onMouseDown={(mouseEvent) => {
            if (mouseEvent.currentTarget === mouseEvent.target) {
              setSelectedCell(null);
            }
          }}
        >
          <aside
            className="event-drawer" data-chg="NUEVO" data-change-id="detalle"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <div className="drawer-header">
              <div>
                <p className="section-kicker">Detalle de evento</p>
                <h2 id="drawer-title">{EVENT_CONFIG[selectedDetail.key].label}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedCell(null)}
                aria-label="Cerrar detalle"
                autoFocus
                type="button"
              >
                ×
              </button>
            </div>

            <div className="drawer-vessel">
              <div>
                <span>Nave</span>
                <strong>{selectedDetail.vessel.name}</strong>
              </div>
              <div>
                <span>Viaje</span>
                <strong>{selectedDetail.vessel.voyage}</strong>
              </div>
            </div>

            <div className={`detail-status ${selectedDetail.presentation.color}`}>
              <span
                className={`status-indicator ${selectedDetail.presentation.color} ${
                  selectedDetail.presentation.executed ? "executed" : "pending"
                }`}
                aria-hidden="true"
              >
                {selectedDetail.presentation.color === "neutral"
                  ? "-"
                  : selectedDetail.presentation.executed
                    ? "✓"
                    : ""}
              </span>
              <div>
                <span>{selectedDetail.presentation.stateLabel}</span>
                <strong>{selectedDetail.presentation.timingLabel}</strong>
              </div>
            </div>

            <dl className="detail-list">
              <div>
                <dt>Fecha límite</dt>
                <dd>{formatDateTime(selectedDetail.currentEvent.deadline)}</dd>
              </div>
              <div>
                <dt>Fecha de transmisión</dt>
                <dd>
                  {formatDateTime(selectedDetail.currentEvent.transmittedAt)}
                  {selectedDetail.currentEvent.manual && (
                    <span className="manual-tag">Manual</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Confirmado</dt>
                <dd>
                  {selectedDetail.currentEvent.transmittedAt
                    ? selectedDetail.currentEvent.confirmed === false
                      ? "No"
                      : "Sí"
                    : "No aplica"}
                </dd>
              </div>
              <div>
                <dt>Fuente</dt>
                <dd>{selectedDetail.currentEvent.source ?? "SION"}</dd>
              </div>
            </dl>

            <div className="rule-box" data-chg="CAMBIADO" data-change-id="calculos">
              <span>Regla aplicada</span>
              <strong>{EVENT_CONFIG[selectedDetail.key].rule}</strong>
              <p>{selectedDetail.presentation.detail}</p>
            </div>

            {selectedDetail.key === "manifest" && selectedDetail.vessel.agent && (
              <button
                className="primary-action full-width"
                onClick={() =>
                  openManualRegistration(selectedDetail.vessel.id)
                }
                type="button"
              >
                Registrar o corregir manualmente
              </button>
            )}
          </aside>
        </div>
      )}

      {manualOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(mouseEvent) => {
            if (mouseEvent.currentTarget === mouseEvent.target) {
              setManualOpen(false);
            }
          }}
        >
          <section
            className="manual-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-title"
            aria-describedby="manual-description"
          >
            <div className="drawer-header">
              <div>
                <p className="section-kicker">Contingencia SDA</p>
                <h2 id="manual-title">Registro manual de manifiesto</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setManualOpen(false)}
                aria-label="Cerrar registro manual"
                autoFocus
                type="button"
              >
                ×
              </button>
            </div>

            <p className="modal-intro" id="manual-description">
              Registra fecha y hora cuando la transmisión automática no estuvo
              disponible. El check define si el evento se considera ejecutado.
            </p>

            <form onSubmit={handleManualSubmit}>
              {storageMessage && <p className="storage-warning" role="alert">{storageMessage}</p>}
              <label className="field full-field">
                <span>Nave / viaje</span>
                <select
                  value={manualVesselId}
                  onChange={(changeEvent) =>
                    setManualVesselId(changeEvent.target.value)
                  }
                  required
                >
                  {visibleVessels.map((vessel) => (
                    <option key={vessel.id} value={vessel.id}>
                      {vessel.name} · {vessel.voyage}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>Fecha de transmisión</span>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(changeEvent) => setManualDate(changeEvent.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Hora de transmisión</span>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(changeEvent) => setManualTime(changeEvent.target.value)}
                    required
                  />
                </label>
              </div>

              <label className="confirm-check">
                <input
                  type="checkbox"
                  checked={manualConfirmed}
                  onChange={(changeEvent) =>
                    setManualConfirmed(changeEvent.target.checked)
                  }
                />
                <span className="custom-check" aria-hidden="true">✓</span>
                <span>
                  <strong>Confirmar transmisión</strong>
                  <small>
                    Marcado: evento ejecutado. Sin marcar: registro pendiente de
                    validación.
                  </small>
                </span>
              </label>

              <div className="modal-actions">
                <button
                  className="secondary-action"
                  onClick={() => setManualOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button className="primary-action" type="submit">
                  Guardar registro
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          {toast}
        </div>
      )}
    </main>
  );
}
