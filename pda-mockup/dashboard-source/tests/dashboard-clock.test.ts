import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardDate, todayLabel, dateFormat, clockFormat } from '../src/dashboard-clock.ts';
import { parseOptions, makeTvUrl } from '../src/dashboard-model.ts';

test('desktop and TV simulate August 5 while the Lima clock keeps running',()=>{
 const real=new Date('2026-11-01T11:42:58-05:00');
 const demo=dashboardDate('demo',real);
 assert.equal(dateFormat.format(demo),'miércoles, 5 de agosto de 2026');
 assert.equal(clockFormat.format(demo),'11:42:58');
 assert.equal(clockFormat.format(dashboardDate('demo',new Date(real.getTime()+3000))),'11:43:01');
 assert.equal(todayLabel(demo),'HOY 5 de AGOSTO');
 assert.equal(dashboardDate('demo',new Date('2026-11-02T01:00:00Z')).toISOString().slice(0,10),'2026-08-06');
});
test('real date is an explicit opt-in, forwarded by the TV launch URL',()=>{
 const real=new Date('2026-11-01T11:42:58-05:00');
 assert.equal(dashboardDate('real',real).getTime(),real.getTime());
 assert.equal(parseOptions('').clock,'demo');
 const options=parseOptions('?fecha=real&modo=tv');
 assert.equal(options.clock,'real');assert.ok(makeTvUrl(options,'today').includes('fecha=real'));
 assert.equal(parseOptions('?modo=tv').theme,'navy');
 assert.equal(parseOptions('?modo=tv&tema=claro').theme,'claro');
});
