import assert from 'node:assert/strict';
import test from 'node:test';
import { MANUAL_STORAGE_KEY, readManualRecords, writeManualRecords } from '../src/manual-storage.ts';

test('manual records survive a new read without changing other PDA storage', () => {
  const entries = new Map([['pdaChg', '0']]);
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
  };
  const records = { vessel: { transmittedAt: '2026-08-05T09:15:00-05:00', confirmed: false } };
  writeManualRecords(storage, records);
  assert.deepEqual(readManualRecords(storage, ['vessel']), { records, warning: '' });
  assert.equal(entries.get('pdaChg'), '0');
  assert.equal(JSON.parse(entries.get(MANUAL_STORAGE_KEY)!).version, 1);
});

test('broken or incompatible storage falls back to demo with a visible warning', () => {
  for (const raw of ['{', '{"version":2,"records":{}}', '{"version":1,"records":{"vessel":{"transmittedAt":"bad","confirmed":true}}}']) {
    const restored = readManualRecords({ getItem: () => raw, setItem() {} }, ['vessel']);
    assert.deepEqual(restored.records, {});
    assert.ok(restored.warning);
  }
});

test('unavailable storage does not break dashboard loading', () => {
  const restored = readManualRecords({ getItem() { throw new Error('blocked'); }, setItem() {} }, ['vessel']);
  assert.deepEqual(restored.records, {});
  assert.ok(restored.warning);
});

test('failed persistence throws so the form cannot report a false successful save', () => {
  assert.throws(() => writeManualRecords({ getItem: () => null, setItem() { throw new Error('quota'); } }, {}), /quota/);
});

test('records from unknown vessels are ignored', () => {
  const storage = { getItem: () => JSON.stringify({ version: 1, records: { other: { transmittedAt: '2026-08-05T10:30:00-05:00', confirmed: true } } }), setItem() {} };
  assert.deepEqual(readManualRecords(storage, ['vessel']).records, {});
});
