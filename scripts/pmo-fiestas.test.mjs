import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../portafolio-ejecutivo-it/assets/js/pmo-fiestas.js', import.meta.url), 'utf8');
const context = { module: { exports: {} }, Intl, Date, URLSearchParams, Math, Number, Array, Object };
vm.runInNewContext(source, context);
const { season, current, decorate } = context.module.exports;
const plain = value => value && { ...value };

test('se activa el 5 de diciembre a medianoche de Lima, no antes', () => {
  assert.equal(season(new Date('2026-12-05T04:59:59Z')), null);
  assert.deepEqual(plain(season(new Date('2026-12-05T05:00:00Z'))), { kind: 'navidad', year: 2027 });
});

test('pasa a Año Nuevo el 27 de diciembre', () => {
  assert.equal(season(new Date('2026-12-27T04:59:59Z')).kind, 'navidad');
  assert.deepEqual(plain(season(new Date('2026-12-27T05:00:00Z'))), { kind: 'anio-nuevo', year: 2027 });
});

test('el año que se celebra no cambia al cruzar el 1 de enero', () => {
  assert.deepEqual(plain(season(new Date('2026-12-31T23:00:00Z'))), { kind: 'anio-nuevo', year: 2027 });
  assert.deepEqual(plain(season(new Date('2027-01-02T12:00:00Z'))), { kind: 'anio-nuevo', year: 2027 });
});

test('se apaga al terminar el 5 de enero de Lima y vuelve cada año', () => {
  assert.equal(season(new Date('2027-01-06T04:59:59Z')).kind, 'anio-nuevo');
  assert.equal(season(new Date('2027-01-06T05:00:00Z')), null);
  assert.equal(season(new Date('2027-06-15T12:00:00Z')), null);
  assert.deepEqual(plain(season(new Date('2027-12-10T12:00:00Z'))), { kind: 'navidad', year: 2028 });
});

test('la vista previa fuerza o apaga el tema solo con el parámetro de la URL', () => {
  const november = new Date('2026-11-05T12:00:00Z'), december = new Date('2026-12-10T12:00:00Z');
  assert.equal(current(november, ''), null);
  assert.equal(current(november, '?fiestas=otra'), null);
  assert.deepEqual(plain(current(november, '?fiestas=navidad')), { kind: 'navidad', year: 2027 });
  assert.deepEqual(plain(current(november, '?fiestas=anio-nuevo')), { kind: 'anio-nuevo', year: 2027 });
  assert.equal(current(december, '?fiestas=no'), null);
});

test('fuera de temporada la escena queda intacta', () => {
  const scene = { draw() {}, _ship() {} }, { draw, _ship } = scene;
  decorate(scene, null);
  assert.equal(scene.draw, draw);
  assert.equal(scene._ship, _ship);
  assert.equal(scene.onShip, undefined);
});
