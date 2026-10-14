import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(new URL('../portafolio-ejecutivo-it/assets/js/finance-model.js', import.meta.url), 'utf8'), context);
const finance = context.module.exports;
const C = { capex: 'budget', capexExecuted: 'paid', capexCommitted: 'pending', opexAnnual: 'annual', currency: 'currency', taxBasis: 'tax', legacyBudgetDeviation: 'legacy' };
const project = values => finance.project({ column_values: values }, C);

test('Connect includes all registered CAPEX, separates historical/annual OPEX and preserves the baseline', () => {
  const f = project({ budget: '380000', paid: '401640', pending: '85600', annual: '109500', currency: 'USD', tax: 'Por confirmar' });
  assert.equal(f.registered, 487240);
  assert.equal(f.excess, 107240);
  assert.equal(f.capex, 380000);
  assert.equal(f.opexAnnual, 109500);
  assert.equal(f.taxBasis, null);
  assert.ok(Math.abs(f.excessPercent - 28.221052631578947) < 1e-10);
  assert.equal(finance.money(f.registered, f), 'US$ 487,240');
});
test('Paying an outstanding invoice moves the amount and does not double count the contract', () => {
  const before = project({ budget: 10000, paid: 4000, pending: 7000 });
  const after = project({ budget: 10000, paid: 6000, pending: 5000 });
  assert.equal(after.registered, before.registered);
  assert.equal(after.excess, before.excess);
});
test('Missing inputs never become a zero total or an assertion of no excess', () => {
  for (const values of [{ budget: 10000, paid: 4000 }, { budget: 10000, pending: 7000 }, {}]) {
    const f = project(values);
    assert.equal(f.registered, null);
    assert.equal(f.excess, null);
    assert.equal(finance.money(f.registered, f), 'Sin dato');
  }
  const withoutBudget = project({ paid: 100, pending: 20 });
  assert.equal(withoutBudget.registered, 120);
  assert.equal(withoutBudget.excess, null);
});
test('Confirmed zeros are valid and unused budget is not presented as savings', () => {
  const f = project({ budget: 23550, paid: 0, pending: 0, annual: 3466 });
  assert.equal(f.registered, 0);
  assert.equal(f.excess, 0);
  assert.equal(f.unregisteredBudget, 23550);
  assert.equal(finance.money(0, f), '0');
});
test('Currency and tax are not guessed or converted', () => {
  const usd = project({ paid: 100, pending: 20, currency: 'USD', tax: 'Sin IGV' });
  const pen = project({ paid: 100, pending: 20, currency: 'PEN', tax: 'Con IGV' });
  const unknown = project({ paid: 100, pending: 20, currency: 'Por confirmar', tax: 'Por confirmar' });
  assert.equal(usd.registered, pen.registered);
  assert.equal(finance.money(120, usd), 'US$ 120');
  assert.equal(finance.money(120, pen), 'S/ 120');
  assert.equal(finance.money(120, unknown), '120');
  assert.equal(unknown.currency, null);
  assert.equal(unknown.taxBasis, null);
});
test('Zero baseline does not generate Infinity percentages', () => {
  const f = project({ budget: 0, paid: 100, pending: 20 });
  assert.equal(f.excess, 120);
  assert.equal(f.registeredPercent, null);
  assert.equal(f.excessPercent, null);
});
test('Invalid negative source amounts cannot generate a valid registered total', () => {
  const f = project({ budget: 100, paid: -10, pending: 20 });
  assert.equal(f.registered, null);
  assert.equal(f.excess, null);
  assert.equal(f.invalidFields[0], 'capexExecuted');
});
test('Totals use cents and ignore obsolete manually reported deviations', () => {
  const f = project({ budget: .2, paid: .1, pending: .2, legacy: 999 });
  assert.equal(f.registered, .3);
  assert.equal(f.excess, .1);
  assert.equal(f.legacyDeviation, 999);
});
