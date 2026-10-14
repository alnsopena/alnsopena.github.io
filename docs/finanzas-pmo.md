# Seguimiento financiero PMO

Todos los proyectos usan los mismos campos del tablero de portafolio. La vista **Finanzas PMO** los muestra en orden y agrupados por responsable.

| Campo que alimenta el PM | Regla |
|---|---|
| Moneda | USD o PEN, según el sustento del proyecto. Se define una vez. |
| IGV en importes | Con IGV o Sin IGV. Presupuesto, pagos, pendientes y OPEX deben compartir la misma base. Si no se conoce, Por confirmar. |
| Presupuesto CAPEX | Presupuesto original aprobado. No sustituirlo por el gasto ni añadir OPEX. |
| CAPEX pagado | Acumulado efectivamente pagado: contrato base y adicionales clasificados como CAPEX. |
| CAPEX pendiente de pago | Saldo no pagado de obligaciones CAPEX aprobadas. Excluir pagos realizados y propuestas no aprobadas. |
| OPEX anual previsto | Gasto recurrente previsto para 12 meses de operación. No equivale al OPEX histórico acumulado. |

Cada semana el PM revisa principalmente pagado y pendiente. Al pagar una factura, aumenta pagado y reduce pendiente por el mismo importe. Ambos campos deben contener el dato confirmado; un vacío no equivale a cero.

**CAPEX registrado** se calcula como pagado + pendiente. **Exceso CAPEX** es el importe positivo por encima del presupuesto original. Estos campos no requieren carga manual. El presupuesto aún no registrado no se presenta como ahorro, y el CAPEX registrado no es una previsión del costo final.

La desviación manual anterior se conserva como referencia y queda oculta en esta vista. Sus diferencias se muestran en Pendiente de regularizar para revisar el sustento, sin sobrescribir importes.

El portal usa las mismas reglas en gráficos, fichas, Cosmo y componentes audiovisuales. Los gráficos de importes separan monedas y bases de IGV; no convierten monedas, no añaden o quitan IGV y no suman OPEX anual con CAPEX.

## Contrato de columnas

Tablero: 18396270726. Vista: 286526110.

| Campo | ID |
|---|---|
| Presupuesto CAPEX | numeric_mm6kwqt3 |
| CAPEX pagado | numeric_mm6j1jmr |
| CAPEX pendiente de pago | numeric_mm6jwj01 |
| OPEX anual previsto | numeric_mm6j8yx |
| Moneda | color_mm845zc0 |
| IGV en importes | color_mm84z1ng |
| CAPEX registrado | formula_mm84xghx |
| Exceso CAPEX | formula_mm84zqrv |
| Desviación anterior | numeric_mm6jzmtq |

Las fórmulas nativas usan COUNT para distinguir números ausentes de ceros confirmados, ROUND para centavos y muestran Por completar si faltan entradas. Los importes negativos requieren revisión. El modelo del portal vuelve a comprobar las entradas para no mostrar un total válido con datos incompletos.
