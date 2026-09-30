import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { generateWeeklyPpt } from './generate-weekly-ppt.mjs';

test('genera borradores editables distintos y conserva la selección PMO sin tocar finales', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'cosmos-weekly-ppt-'));
  try {
    const input = path.join(directory, 'cut.json');
    const config = path.join(directory, 'selection.json');
    const outputDir = path.join(directory, 'drafts');
    const cut = {
      schema_version: 1, cut_id: '18396270726:2026-09-29T14:05:00.000Z',
      extracted_at_utc: '2026-09-29T14:05:00.000Z',
      extracted_at_lima: '2026-09-29T09:05:00-05:00',
      reporting_week: { key: '2026-09-21', start_at_utc: '2026-09-21T05:00:00.000Z', end_at_utc: '2026-09-28T05:00:00.000Z' },
      inventory: { projects: 2 },
      board: { id: '18396270726', columns: [
        { id: 'status', title: 'Estatus' }, { id: 'numeric_mkzrc075', title: '% Avance' },
        { id: 'color_mm6kg2n5', title: 'Fase Actual' }, { id: 'text_mm7fvxjn', title: 'Situación' },
        { id: 'color_mm6zdfgs', title: 'Riesgo / Bloqueo' },
      ] },
      projects: [
        { id: '111', name: 'Proyecto Alfa', column_values: {
          status: 'En Proceso', numeric_mkzrc075: '45', color_mm6kg2n5: 'Ejecución',
          text_mm7fvxjn: 'Piloto completado', color_mm6zdfgs: 'Riesgo / Alerta',
        }, updates: [{ created_at: '2026-09-24T20:00:00Z', text_body: 'Se completó el piloto.' }] },
        { id: '222', name: 'Proyecto Beta', column_values: { status: 'Cerrado' }, updates: [] },
      ],
      activity: { coverage: { complete: true }, events: [{ item_id: '111', at_utc: '2026-09-24T21:00:00Z',
        column_id: 'status', before_text: '', after_text: 'En Proceso', classification: 'business_change' }] },
    };
    await writeFile(input, JSON.stringify(cut));
    await writeFile(config, JSON.stringify({ maximum_projects: 3, pinned_project_ids: ['111'],
      excluded_project_ids: [], reviewed_reporting_week: '2026-09-21',
      reviewed_cut_id: cut.cut_id, include_recently_closed: false }));
    const first = await generateWeeklyPpt({ input, outputDir, config });
    const second = await generateWeeklyPpt({ input, outputDir, config });
    assert.equal(first.selection_reviewed_by_pmo, true);
    assert.equal(first.slide_count, 4);
    assert.deepEqual(first.projects.map((project) => project.id), ['111']);
    assert.equal(first.projects[0].movements, 1, 'la carga inicial no se debe mostrar como avance semanal');
    assert.notEqual(first.output, second.output);
    assert.match(first.output, /Borrador_20260929_0905/);
    assert.ok((await stat(first.output)).size > 10000);
    assert.equal((await readFile(first.output)).subarray(0, 2).toString(), 'PK');
    assert.equal((await readFile(path.join(outputDir, 'latest-path.txt'), 'utf8')).trim(), second.output);
    assert.equal(JSON.parse(await readFile(path.join(outputDir, 'latest-qa.json'), 'utf8')).cut_id, cut.cut_id);
    const changed = { ...cut, extracted_at_utc: '2026-09-29T14:06:00.000Z',
      cut_id: '18396270726:2026-09-29T14:06:00.000Z' };
    await writeFile(input, JSON.stringify(changed));
    const regenerated = await generateWeeklyPpt({ input, outputDir, config });
    assert.equal(regenerated.selection_reviewed_by_pmo, false, 'un corte nuevo requiere otra revisión PMO');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
