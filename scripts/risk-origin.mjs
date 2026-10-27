// Additive snapshot field. Keep all original project values intact.
export const RISK_ORIGIN_COLUMN = 'color_mm8hkhwx';
export function withRiskOrigin(item) {
  const value = item.column_values?.[RISK_ORIGIN_COLUMN];
  return { ...item, origenRiesgo: typeof value === 'string' ? value.trim() : '' };
}
