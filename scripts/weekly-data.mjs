import { createHash } from 'node:crypto';

export const TIME_ZONE = 'America/Lima';
export const TRACKED_COLUMNS = [
  'status', 'color_mkzzg1vp', 'multiple_person_mm087pe3', 'color_mm6kg2n5',
  'numeric_mkzrc075', 'date_mkzrb4nr', 'date_mm6zv2hs', 'date_mm6d8mx',
  'color_mm6zdfgs', 'color_mm6zq06e', 'text_mm7fvxjn',
];

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function zonedParts(instant) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(instant)
    .filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, Number(value)]));
  return { year: parts.year, month: parts.month, day: parts.day,
    hour: parts.hour, minute: parts.minute, second: parts.second };
}

function pad(value) { return String(value).padStart(2, '0'); }

function dateKey(year, month, day) { return `${year}-${pad(month)}-${pad(day)}`; }

function localToUtc({ year, month, day, hour = 9, minute = 0, second = 0 }) {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = desired;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(new Date(guess));
    const observed = Date.UTC(actual.year, actual.month - 1, actual.day,
      actual.hour, actual.minute, actual.second);
    const correction = desired - observed;
    if (!correction) return new Date(guess).toISOString();
    guess += correction;
  }
  throw new Error(`No se pudo calcular ${TIME_ZONE} para ${dateKey(year, month, day)}`);
}

function shiftLocalDate(year, month, day, days) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate() };
}

export function limaDateTime(instantInput) {
  const instant = new Date(instantInput);
  if (Number.isNaN(instant.getTime())) throw new Error('Fecha de corte inválida');
  const p = zonedParts(instant);
  const localAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offsetMinutes = Math.round((localAsUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(offsetMinutes);
  return `${dateKey(p.year, p.month, p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
    + `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

// La semana ejecutiva empieza el lunes a las 09:00 de Lima. El lunes antes de
// esa hora sigue perteneciendo al corte previo; esto evita relevar la línea base
// antes de construir la PPT de la semana concluida.
export function businessWeek(instantInput) {
  const instant = new Date(instantInput);
  if (Number.isNaN(instant.getTime())) throw new Error('Fecha de corte inválida');
  const p = zonedParts(instant);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  let monday = shiftLocalDate(p.year, p.month, p.day, -daysSinceMonday);
  if (daysSinceMonday === 0 && p.hour < 9) {
    monday = shiftLocalDate(monday.year, monday.month, monday.day, -7);
  }
  const next = shiftLocalDate(monday.year, monday.month, monday.day, 7);
  // Los logros del parte cubren la última semana civil cerrada (lunes 00:00
  // a lunes 00:00 de Lima), aunque la referencia técnica se renueve a las 09:00.
  // El lunes antes de las 09:00 ya terminó la semana inmediatamente anterior.
  const reportingEnd = shiftLocalDate(p.year, p.month, p.day, -daysSinceMonday);
  const reportingStart = shiftLocalDate(reportingEnd.year, reportingEnd.month, reportingEnd.day, -7);
  return {
    key: dateKey(monday.year, monday.month, monday.day),
    start_at_utc: localToUtc(monday),
    end_at_utc: localToUtc(next),
    reporting_week: {
      key: dateKey(reportingStart.year, reportingStart.month, reportingStart.day),
      start_at_utc: localToUtc({ ...reportingStart, hour: 0 }),
      end_at_utc: localToUtc({ ...reportingEnd, hour: 0 }),
    },
  };
}

export function parseActivityTimestamp(value) {
  const text = String(value ?? '');
  if (/^\d{17}$/.test(text)) {
    // Contrato confirmado en get_board_activity: 10 000 ticks por milisegundo.
    return new Date(Number(BigInt(text) / 10000n)).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const instant = new Date(text);
    if (!Number.isNaN(instant.getTime())) return instant.toISOString();
  }
  throw new Error(`Marca temporal de actividad desconocida: ${text.slice(0, 40)}`);
}

function parsePayload(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') throw new Error('Payload de actividad no reconocido');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Payload de actividad sin objeto JSON');
  }
  return parsed;
}

function valueText(value) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value).trim();
  if (value.label && typeof value.label === 'object' && value.label.text != null) {
    return String(value.label.text).trim();
  }
  for (const key of ['value', 'label', 'name', 'text', 'date']) {
    if (typeof value[key] === 'string' || typeof value[key] === 'number') {
      return String(value[key]).trim();
    }
  }
  return JSON.stringify(value);
}

export function normalizeActivity(rawEntries, board, itemIds = null) {
  if (!Array.isArray(rawEntries)) throw new Error('La actividad de monday no es una lista');
  const allowedIds = itemIds ? new Set([...itemIds].map(String)) : null;
  const normalized = rawEntries.map((entry) => {
    const payload = parsePayload(entry.data);
    const at = parseActivityTimestamp(entry.created_at);
    const rawId = payload.action_record_uuid ?? entry.id;
    const id = rawId == null
      ? createHash('sha256').update(JSON.stringify(entry)).digest('hex').slice(0, 24)
      : String(rawId);
    const itemId = payload.pulse_id ?? payload.parent_item_id ?? null;
    return {
      id, at_utc: at, at_lima: limaDateTime(at),
      item_id: itemId == null ? null : String(itemId),
      item_name: payload.pulse_name ?? null, user_id: entry.user_id == null ? null : String(entry.user_id),
      board_id: String(payload.board_id ?? board.id), event: String(entry.event ?? ''),
      entity: String(entry.entity ?? ''), column_id: payload.column_id ?? null,
      column_title: payload.column_title ?? null,
      before: payload.previous_value ?? null, after: payload.value ?? null,
      before_text: valueText(payload.previous_value), after_text: valueText(payload.value),
      is_undo: Boolean(payload.is_undo_action), classification: 'other',
      in_current_inventory: itemId == null ? false : (allowedIds?.has(String(itemId)) ?? true),
    };
  });

  const structuralByColumn = new Map();
  for (const event of normalized) {
    if (event.entity !== 'board' && !/^(create|delete|update|change)_column(?!_value)/.test(event.event)) continue;
    if (!event.column_id) continue;
    const times = structuralByColumn.get(event.column_id) ?? [];
    times.push(new Date(event.at_utc).getTime());
    structuralByColumn.set(event.column_id, times);
  }
  for (const event of normalized) {
    const { event: kind, entity } = event;
    if (entity === 'board' || /^(create|delete|update|change)_column(?!_value)/.test(kind)) {
      event.classification = 'structure';
    } else if (/^board_view|view_changed/.test(kind)) {
      event.classification = 'view_only';
    } else if (/^batch_|bulk_/.test(kind)) {
      event.classification = 'backfill';
    } else if (event.is_undo) {
      event.classification = 'undo';
    } else if (kind === 'update_column_value' || kind === 'update_name') {
      if (event.before_text === event.after_text) {
        event.classification = 'no_change';
      } else if (!event.in_current_inventory) {
        event.classification = 'outside_inventory';
      } else {
        const nearStructure = (structuralByColumn.get(event.column_id) ?? [])
          .some((when) => Math.abs(new Date(event.at_utc).getTime() - when) <= 48 * 3600_000);
        event.classification = !event.before_text && nearStructure ? 'backfill' : 'business_change';
      }
    } else if (/^create_pulse|^move_pulse|^delete_pulse/.test(kind)) {
      event.classification = event.in_current_inventory ? 'business_change' : 'outside_inventory';
    }
  }
  return [...new Map(normalized.map((event) => [event.id, event])).values()]
    .sort((left, right) => left.at_utc.localeCompare(right.at_utc) || left.id.localeCompare(right.id));
}

// get_board_activity no expone cursor/página. Se pagina por tiempo y se divide
// cualquier ventana con >=100 registros, muy por debajo del límite observado.
// Una ventana no divisible falla explícitamente: nunca se afirma cobertura parcial.
export async function getActivityPages(client, boardId, fromUtc, toUtc, depth = 0) {
  const fromMs = new Date(fromUtc).getTime();
  const toMs = new Date(toUtc).getTime();
  if (!(fromMs < toMs)) throw new Error('Ventana de actividad inválida');
  const result = await client.callTool('get_board_activity', {
    boardId: Number(boardId), fromDate: new Date(fromMs).toISOString(),
    toDate: new Date(toMs).toISOString(), includeData: true,
  });
  if (!Array.isArray(result.data)) throw new Error(`Actividad de ${boardId} sin lista data`);
  if (result.data.length >= 100) {
    if (depth >= 20 || toMs - fromMs <= 1000) {
      throw new Error(`Actividad de ${boardId} puede estar truncada: ${result.data.length} registros en ${fromUtc}–${toUtc}`);
    }
    const middle = fromMs + Math.floor((toMs - fromMs) / 2);
    const left = await getActivityPages(client, boardId,
      new Date(fromMs).toISOString(), new Date(middle).toISOString(), depth + 1);
    const right = await getActivityPages(client, boardId,
      new Date(middle).toISOString(), new Date(toMs).toISOString(), depth + 1);
    return [...left, ...right];
  }
  // Filtrar de forma local porque los límites de la herramienta pueden ser inclusivos.
  return result.data.filter((entry) => {
    const when = new Date(parseActivityTimestamp(entry.created_at)).getTime();
    return when >= fromMs && when < toMs;
  });
}

export function buildBaseline(snapshot, extractedAt = snapshot.extracted_at_utc) {
  const week = businessWeek(extractedAt);
  const liveColumns = new Set((snapshot.board?.columns ?? []).map((column) => column.id));
  const columns = TRACKED_COLUMNS.filter((id) => liveColumns.has(id));
  return {
    week_key: week.key, cut_id: `${snapshot.board_id}:${extractedAt}`,
    extracted_at_utc: extractedAt,
    items: (snapshot.items ?? []).map((item) => ({
      id: String(item.id), name: item.name,
      column_values: Object.fromEntries(columns.map((id) => [id, item.column_values?.[id] ?? null])),
    })),
  };
}

export function compareBaseline(previous, current) {
  if (!previous?.items || !current?.items) return [];
  const old = new Map(previous.items.map((item) => [String(item.id), item]));
  const priorColumns = new Set(previous.items.flatMap((item) => Object.keys(item.column_values ?? {})));
  const changes = [];
  for (const item of current.items) {
    const prior = old.get(String(item.id));
    if (!prior) {
      changes.push({ item_id: String(item.id), item_name: item.name,
        column_id: null, before: null, after: 'Nuevo proyecto', kind: 'new_item' });
      continue;
    }
    // Una columna eliminada o recién agregada no equivale a un avance del proyecto.
    for (const column of Object.keys(item.column_values ?? {}).filter((id) => priorColumns.has(id))) {
      const before = prior.column_values?.[column] ?? null;
      const after = item.column_values?.[column] ?? null;
      if (String(before ?? '') === String(after ?? '')) continue;
      changes.push({ item_id: String(item.id), item_name: item.name,
        column_id: column, before, after, kind: 'column_change' });
    }
    old.delete(String(item.id));
  }
  for (const item of old.values()) {
    changes.push({ item_id: String(item.id), item_name: item.name,
      column_id: null, before: 'En inventario', after: null, kind: 'removed_item' });
  }
  return changes;
}

export function buildWeeklyCut(snapshot, rawActivity, previousBaseline) {
  const extractedAt = snapshot.extracted_at_utc;
  const week = businessWeek(extractedAt);
  const rawItemsById = new Map((snapshot.raw_items ?? []).map((item) => [String(item.id), item]));
  const updatesById = new Map();
  for (const update of snapshot.updates ?? []) {
    if (!update.item_id) continue;
    const key = String(update.item_id);
    if (!updatesById.has(key)) updatesById.set(key, []);
    updatesById.get(key).push(update);
  }
  const allItemIds = new Set((snapshot.items ?? []).flatMap((item) => [
    String(item.id), ...(item.subitems ?? []).map((subitem) => String(subitem.id)),
  ]));
  const events = normalizeActivity(rawActivity, snapshot.board, allItemIds);
  const baseline = buildBaseline(snapshot, extractedAt);
  const projects = (snapshot.items ?? []).map((item) => ({
    id: String(item.id), name: item.name, group: item.group ?? null,
    column_values: item.column_values ?? {}, subitems: item.subitems ?? [],
    raw_item: rawItemsById.get(String(item.id)) ?? null,
    updates: updatesById.get(String(item.id)) ?? [],
  }));
  return {
    schema_version: 1, cut_id: `${snapshot.board_id}:${extractedAt}`,
    timezone: TIME_ZONE, extracted_at_utc: extractedAt,
    extracted_at_lima: limaDateTime(extractedAt),
    week: { key: week.key, start_at_utc: week.start_at_utc, end_at_utc: week.end_at_utc },
    reporting_week: week.reporting_week,
    board: snapshot.board, people_directory: snapshot.people_directory ?? [],
    inventory: { ...snapshot.inventory, activity_total: events.length,
      activity_business: events.filter((event) => event.classification === 'business_change').length,
      activity_excluded: events.filter((event) => event.classification !== 'business_change').length },
    projects,
    activity: {
      events,
      coverage: { complete: true, from_utc: week.reporting_week.start_at_utc,
        to_utc: extractedAt, warnings: [] },
    },
    weekly_baseline: baseline,
    previous_weekly_baseline: previousBaseline ?? null,
    weekly_changes: compareBaseline(previousBaseline, baseline),
  };
}
