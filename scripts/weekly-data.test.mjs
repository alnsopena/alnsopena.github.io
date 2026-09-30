import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  businessWeek, buildBaseline, buildWeeklyCut, compareBaseline, getActivityPages,
  limaDateTime, normalizeActivity, parseActivityTimestamp,
} from './weekly-data.mjs';

const ticks = (iso) => String(BigInt(Date.parse(iso)) * 10000n);

test('la semana ejecutiva releva el lunes 09:00 de Lima incluso en cambio de año', () => {
  const before = businessWeek('2027-01-04T13:59:59Z');
  const after = businessWeek('2027-01-04T14:00:00Z');
  assert.equal(before.key, '2026-12-28');
  assert.equal(after.key, '2027-01-04');
  assert.equal(before.reporting_week.key, '2026-12-28');
  assert.equal(after.reporting_week.key, '2026-12-28');
  assert.equal(after.reporting_week.start_at_utc, '2026-12-28T05:00:00.000Z');
  assert.equal(after.reporting_week.end_at_utc, '2027-01-04T05:00:00.000Z');
  assert.equal(limaDateTime('2026-09-29T20:46:51.675Z'), '2026-09-29T15:46:51-05:00');
  assert.equal(parseActivityTimestamp(ticks('2026-09-29T20:46:51Z')), '2026-09-29T20:46:51.000Z');
});

test('bitácora distingue estructura, carga inicial, vista y cambio de proyecto real', () => {
  const at = '2026-09-29T20:00:00Z';
  const raw = [
    { created_at: ticks(at), event: 'update_column_name', entity: 'board', user_id: '7',
      data: JSON.stringify({ board_id: 1, column_id: 'risk', previous_value: { name: 'Situación' }, value: { name: 'Riesgos' } }) },
    { created_at: ticks('2026-09-29T20:01:00Z'), event: 'update_column_value', entity: 'pulse', user_id: '7',
      data: JSON.stringify({ board_id: 1, pulse_id: 10, pulse_name: 'Cosmos Connect', column_id: 'risk',
        previous_value: null, value: { value: 'Sin riesgos' }, action_record_uuid: 'a' }) },
    { created_at: ticks('2026-09-29T20:02:00Z'), event: 'update_column_value', entity: 'pulse', user_id: '7',
      data: JSON.stringify({ board_id: 1, pulse_id: 10, pulse_name: 'Cosmos Connect', column_id: 'status',
        previous_value: { label: { text: 'Planificado' } }, value: { label: { text: 'En Proceso' } }, action_record_uuid: 'b' }) },
    { created_at: ticks('2026-09-29T20:03:00Z'), event: 'board_view_changed', entity: 'pulse', user_id: '7',
      data: JSON.stringify({ board_id: 1, pulse_id: 10 }) },
  ];
  const events = normalizeActivity(raw, { id: '1' }, new Set(['10']));
  assert.deepEqual(events.map((event) => event.classification),
    ['structure', 'backfill', 'business_change', 'view_only']);
  assert.equal(events[2].before_text, 'Planificado');
  assert.equal(events[2].after_text, 'En Proceso');
});

test('paginación temporal divide respuestas grandes y no duplica límites', async () => {
  const start = Date.parse('2026-09-28T14:00:00Z');
  const entries = Array.from({ length: 120 }, (_, index) => ({
    created_at: String(BigInt(start + index * 60_000) * 10000n),
    event: 'update_column_value', entity: 'pulse', data: '{}',
  }));
  let calls = 0;
  const client = { async callTool(_name, args) {
    calls += 1;
    const from = Date.parse(args.fromDate);
    const to = Date.parse(args.toDate);
    return { data: entries.filter((entry) => {
      const at = Number(BigInt(entry.created_at) / 10000n);
      return at >= from && at <= to;
    }) };
  } };
  const result = await getActivityPages(client, 1,
    '2026-09-28T14:00:00Z', '2026-09-28T16:00:00Z');
  assert.ok(calls > 1);
  assert.equal(result.length, 120);
  assert.equal(new Set(result.map((entry) => entry.created_at)).size, 120);
});

test('comparación semanal ignora columnas retiradas y recién incorporadas', () => {
  const earlier = { items: [{ id: '10', name: 'Proyecto', column_values: { status: 'Planificado', retired: 'X' } }] };
  const current = { items: [{ id: '10', name: 'Proyecto', column_values: { status: 'En Proceso', new_field: 'Y' } }] };
  assert.deepEqual(compareBaseline(earlier, current), [{
    item_id: '10', item_name: 'Proyecto', column_id: 'status',
    before: 'Planificado', after: 'En Proceso', kind: 'column_change',
  }]);
  const baseline = buildBaseline({
    board_id: '1', extracted_at_utc: '2026-09-29T20:00:00Z',
    board: { columns: [{ id: 'status' }] },
    items: [{ id: 10, name: 'Proyecto', column_values: { status: 'En Proceso' } }],
  });
  assert.equal(baseline.week_key, '2026-09-28');
  assert.deepEqual(baseline.items[0].column_values, { status: 'En Proceso' });
});

test('corte privado conserva el mismo ID de extracción para PPT y snapshot', () => {
  const snapshot = {
    board_id: '1', extracted_at_utc: '2026-09-29T20:00:00Z',
    board: { id: '1', columns: [{ id: 'status', title: 'Estatus' }] },
    people_directory: [{ id: '7', name: 'PM' }],
    inventory: { projects: 1, subitems: 0, updates: 1 },
    items: [{ id: '10', name: 'Proyecto', group: { title: 'Activos' },
      column_values: { status: 'En Proceso' }, subitems: [] }],
    raw_items: [{ id: '10', column_values: [{ id: 'status', text: 'En Proceso' }] }],
    updates: [{ id: 'u1', item_id: '10', text_body: 'Hito validado' }],
  };
  const cut = buildWeeklyCut(snapshot, [], null);
  assert.equal(cut.cut_id, '1:2026-09-29T20:00:00Z');
  assert.equal(cut.week.key, '2026-09-28');
  assert.equal(cut.reporting_week.key, '2026-09-21');
  assert.equal(cut.projects[0].raw_item.column_values[0].text, 'En Proceso');
  assert.equal(cut.projects[0].updates[0].id, 'u1');
  assert.equal(cut.activity.coverage.complete, true);
});
