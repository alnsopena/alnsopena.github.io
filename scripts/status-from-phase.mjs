// Fase Actual is the only column PMs maintain; the status every module reads is derived here.
const PHASE_COLUMN = 'color_mm6kg2n5';
const STATUS_BY_PHASE = {
  Propuesta: 'Propuesto',
  'Evaluación': 'Propuesto',
  'Planificación': 'Planificado',
  'Ejecución': 'En Proceso',
  'Pruebas UAT': 'En Proceso',
  Despliegue: 'En Proceso',
  'Estabilización': 'En Proceso',
  'Stand by': 'Stand by',
  Cierre: 'Cerrado',
};

export const statusFromPhase = (phase) => STATUS_BY_PHASE[String(phase ?? '').trim()] ?? null;

// Without a known phase the monday value stays, so an empty or new label never hides a project.
export function withDerivedStatus(item) {
  const status = statusFromPhase(item.column_values?.[PHASE_COLUMN]);
  return status ? { ...item, column_values: { ...item.column_values, status } } : item;
}
