/* Reglas financieras comunes a todos los proyectos. No convierte monedas ni IGV. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PMOFinance = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const amounts = ['capex', 'capexExecuted', 'capexCommitted', 'opexAnnual'];
  const cents = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const defaultVal = (item, id) => {
    const value = item?.column_values?.[id];
    return value === null || value === undefined || String(value).trim() === '' ? null : String(value).trim();
  };
  function project(item, C, helpers = {}) {
    const val = helpers.val || defaultVal;
    const num = helpers.num || ((i, id) => { const value = val(i, id), n = Number(value); return value === null || !Number.isFinite(n) ? null : n; });
    const values = Object.fromEntries(amounts.map(key => [key, num(item, C[key])]));
    const valid = key => values[key] !== null && values[key] >= 0;
    const rawCurrency = val(item, C.currency), rawTax = val(item, C.taxBasis);
    const currency = ['USD', 'PEN'].includes(rawCurrency) ? rawCurrency : null;
    const taxBasis = ['Sin IGV', 'Con IGV'].includes(rawTax) ? rawTax : null;
    const registered = valid('capexExecuted') && valid('capexCommitted') ? cents(values.capexExecuted + values.capexCommitted) : null;
    const excess = registered !== null && valid('capex') ? cents(Math.max(registered - values.capex, 0)) : null;
    return { ...values, currency, taxBasis, registered, excess,
      registeredPercent: registered !== null && values.capex > 0 ? registered / values.capex * 100 : null,
      excessPercent: excess !== null && values.capex > 0 ? excess / values.capex * 100 : null,
      unregisteredBudget: registered !== null && valid('capex') ? cents(Math.max(values.capex - registered, 0)) : null,
      legacyDeviation: num(item, C.legacyBudgetDeviation),
      invalidFields: amounts.filter(key => values[key] !== null && values[key] < 0),
    };
  }
  function money(value, financials, format = n => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(n)) {
    if (value === null || value === undefined || !Number.isFinite(value)) return 'Sin dato';
    return (financials.currency === 'USD' ? 'US$ ' : financials.currency === 'PEN' ? 'S/ ' : '') + format(value);
  }
  function lines(financials, format) {
    const fields = [['Presupuesto CAPEX original', 'capex'], ['CAPEX pagado', 'capexExecuted'], ['CAPEX pendiente de pago', 'capexCommitted'], ['CAPEX registrado', 'registered'], ['Exceso CAPEX registrado', 'excess'], ['OPEX anual previsto', 'opexAnnual']];
    return fields.map(([label, key]) => label + ': ' + money(financials[key], financials, format))
      .concat([financials.currency ? 'Moneda: ' + financials.currency : 'Moneda por confirmar', financials.taxBasis || 'IGV por confirmar']);
  }
  return { project, money, lines };
});
