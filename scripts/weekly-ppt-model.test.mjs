import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { projectModel, projectFields, latestUpdate, numeric, timeline, milestoneDelay, paidRatio, money, chooseProjects, riskLevel, formatCut } from './weekly-ppt-model.mjs';
const map = JSON.parse(await readFile(new URL('../tools/weekly-ppt/field-map.json', import.meta.url)));
const ids = ['status', 'multiple_person_mm087pe3', 'color_mm6kg2n5', 'numeric_mkzrc075', 'numeric_mm7nz991', 'text_mm6b5rqp', 'date_mkzt74dd', 'date_mkzrb4nr', 'date_mm6d8mx', 'color_mm6zdfgs', 'text_mm7fvxjn', 'long_text_mm6zs5rc', 'multiple_person_mm89w189', 'color_mkzzg1vp', 'color_mm89s93s', 'numeric_mm6kwqt3', 'numeric_mm6j1jmr', 'numeric_mm6j8yx', 'color_mm845zc0', ...Object.values(map.project)];
function fixture() {
  const cut = { extracted_at_utc: '2026-10-28T04:30:00Z', reporting_week: { start_at_utc: '2026-10-19T05:00:00Z', end_at_utc: '2026-10-26T05:00:00Z' }, board: { columns: ids.map(id => ({ id })), subItemColumns: Object.values(map.subitem).map(id => ({ id })) }, projects: [] };
  const item = { id: '1', name: 'Connect', column_values: { status: 'En Proceso', color_mm6kg2n5: 'Ejecución', numeric_mkzrc075: '65', numeric_mm7nz991: '100', date_mkzrb4nr: '2027-01-18', date_mm6d8mx: '2026-10-20', text_mm7fvxjn: 'Un riesgo, no una actualización', color_mm6zdfgs: 'Riesgo / Alerta', numeric_mm6kwqt3: '380000', numeric_mm6j1jmr: '401640', numeric_mm6j8yx: '109500', color_mm845zc0: 'USD' }, subitems: [], updates: [] };
  cut.projects.push(item); return { cut, item };
}
test('Fin Plan is Go-Live, eight phases and current status are preserved without health inference', () => {
  const { item, cut } = fixture(), f = projectFields(item, cut, map);
  assert.equal(f.goLive, '2027-01-18'); assert.equal(f.actualFinish, '2026-10-20');
  assert.equal(f.phase, 'Ejecución'); assert.equal(f.status, 'En Proceso');
  assert.equal(f.progress, 65); assert.equal(f.plannedProgress, 100); assert.equal(f.health, undefined);
  assert.equal(formatCut(cut), '27/10/2026', 'cut date belongs to Lima');
});
test('latest bitacora includes replies, excludes future comments and never falls back to Riesgos', () => {
  const { item, cut } = fixture();
  assert.equal(projectModel(item, cut, map).situation, 'Por definir en bitácora');
  item.updates = [{ id: 'old', created_at: '2026-10-20T20:00:00Z', text_body: 'Anterior', replies: [{ id: 'reply', created_at: '2026-10-27T22:00:00Z', text_body: 'Último acuerdo' }] }, { id: 'future', created_at: '2026-10-28T10:00:00Z', text_body: 'Todavía no' }];
  assert.equal(latestUpdate(item, cut).id, 'reply');
  assert.match(projectModel(item, cut, map).situation, /Último acuerdo/);
  assert.doesNotMatch(projectModel(item, cut, map).situation, /Un riesgo/);
});
test('paid ratio uses only CAPEX paid, keeps zero and excess over 100%, and never converts currencies', () => {
  const { item, cut } = fixture(), f = projectFields(item, cut, map);
  assert.match(paidRatio(f), /105.7%/); assert.equal(numeric('0'), 0); assert.equal(numeric(''), null); assert.equal(numeric('-1'), null);
  assert.equal(money(null, 'USD'), 'Por definir'); assert.match(money(123, 'Por confirmar'), /moneda por definir/);
  assert.equal(paidRatio({ paid: 20, budget: 0 }), 'Porcentaje por definir');
  assert.equal(paidRatio({ paid: 0, budget: 100 }), '0% del CAPEX');
  assert.match(money(123, 'PEN'), /PEN$/);
});
test('unclassified historical subprojects do not become milestones or next actions', () => {
  const { item, cut } = fixture();
  item.subitems = [{ id: 'old', name: 'Facturación de un negocio', column_values: { person: 'PM', status: 'En curso', date_mm5ennwx: '2026-10-30' } }];
  const m = projectModel(item, cut, map); assert.equal(m.records.length, 0); assert.equal(m.milestones.length, 0); assert.equal(m.actions.length, 0);
});
test('typed subitems preserve baseline and separate forecast from completion, rejecting future actuals', () => {
  const { item, cut } = fixture(), k = map.subitem;
  item.subitems = [
    { id: 'm', name: 'UAT', column_values: { [k.kind]: 'Hito', [k.baseline]: '2026-10-20 - 2026-10-20', [k.forecast_finish]: '2026-11-02', [k.actual_finish]: '2026-11-02', status: 'En curso' } },
    { id: 'a', name: 'Enviar acta', column_values: { [k.kind]: 'Acción', person: 'Alonso', [k.forecast_finish]: '2026-10-29', status: 'En curso' } },
    { id: 'done', name: 'Kickoff', column_values: { [k.kind]: 'Hito', [k.baseline]: { from: '2026-10-15', to: '2026-10-15' }, [k.actual_finish]: '2026-10-16', status: 'Listo' } },
  ];
  const m = projectModel(item, cut, map);
  assert.equal(m.milestones[0].actualFinish, ''); assert.equal(m.milestones[0].baselineFinish, '2026-10-20');
  assert.match(milestoneDelay(m.milestones[0]), /Previsto: \+13 días/);
  assert.equal(milestoneDelay(m.milestones[1]), 'Real: +1 día');
  assert.equal(m.actions[0].owner, 'Alonso'); assert.equal(m.actions[0].forecastFinish, '2026-10-29');
  assert.equal(m.milestones[0].warnings.length, 2);
  assert.deepEqual(timeline('2026-10-15 - 2026-10-15'), { start: '2026-10-15', finish: '2026-10-15' });
});
test('a missing decision is not Ninguna and mitigation owner never defaults to PM', () => {
  const { item, cut } = fixture(); item.column_values.multiple_person_mm087pe3 = 'Alonso';
  let m = projectModel(item, cut, map); assert.equal(m.fields.mitigationOwner, ''); assert.equal(m.noDecision, false);
  assert.ok(m.missing.includes('Decisión gerencial'));
  item.column_values[map.project.decision] = 'Aprobar alcance';
  m = projectModel(item, cut, map); assert.ok(m.missing.includes('Quién decide')); assert.ok(m.missing.includes('Fecha límite decisión'));
  item.column_values[map.project.decision] = 'Ninguna esta semana';
  m = projectModel(item, cut, map); assert.equal(m.noDecision, true); assert.ok(!m.missing.includes('Quién decide'));
});
test('selection honors PMO exclusions and does not score Sin bloqueo as a blocker or include quick wins implicitly', () => {
  const { item, cut } = fixture(); item.column_values.color_mm89s93s = 'Proyecto';
  cut.projects.push({ id: 'qw', name: 'Quick win', column_values: { status: 'En Proceso', color_mm89s93s: 'Quick win', color_mm6zdfgs: 'Bloqueo crítico' } });
  assert.deepEqual(chooseProjects(cut, { maximum_projects: 8 }, map).map(i => i.id), ['1']);
  assert.deepEqual(chooseProjects(cut, { excluded_project_ids: ['1'] }, map), []);
  assert.equal(riskLevel('Sin bloqueo'), 'none'); assert.equal(riskLevel('Sin evaluar'), 'none');
  assert.throws(() => chooseProjects(cut, { pinned_project_ids: ['missing'] }, map));
});
