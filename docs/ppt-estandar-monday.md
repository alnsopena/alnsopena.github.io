# PPT semanal: formato estándar

La presentación usa el formato de referencia entregado el 27/10/2026. Su diseño se conserva como objetos editables en `tools/weekly-ppt/formato-estandar.pptx`, sin los datos históricos de ejemplo. El renderizador rellena sus elementos y duplica la ficha para los proyectos de la selección PMO. No utiliza IA durante la generación ni necesita PowerPoint instalado en GitHub.

## Estructura

1. Portada con el corte de Lima y la condición de borrador revisado o por revisar.
2. Resumen tabular de la misma selección PMO. Si excede 12 proyectos, continúa en otra lámina. Los conteos corresponden a toda la selección, no a todo el tablero.
3. Una ficha por proyecto: estado y riesgo actuales, fase, avance, CAPEX aprobado, CAPEX pagado y OPEX anual. Comparación de avance, hitos, situación, decisión, riesgo y próximas acciones.
4. Hasta un anexo por proyecto, si existen actividades tipificadas con fechas suficientes. Se muestran hasta ocho; el detalle completo se conserva en las notas.
5. Guía común para el equipo.

Se conservan las ocho fases de monday y sus estados actuales. No existe una clasificación nueva de Salud. Fin Plan representa el Go-Live; Fin Real del proyecto sigue siendo el cierre efectivo y no se interpreta como una fecha futura.

## Alimentación en el proyecto

Los cuatro campos creados son:

| Campo | ID | Qué registrar |
|---|---|---|
| Área usuaria | `text_mm8hmzer` | Área que utiliza la solución |
| Decisión gerencial | `long_text_mm8hgt22` | Decisión concreta. Escribir «Ninguna esta semana» solo cuando el PM lo haya confirmado |
| Quién decide | `text_mm8hqgv` | Persona o área con autoridad para decidir |
| Fecha límite decisión | `date_mm8he39` | Fecha acordada para resolverla |

No se trasladaron valores de Sponsor, PM ni Responsable de mitigación a esos campos. Tampoco se dividió automáticamente el texto de «Acción / decisión requerida»: esa columna continúa alimentando la mitigación y el flujo actual del portal.

Los demás datos reutilizan las columnas existentes:

| Dato | ID |
|---|---|
| Estatus | `status` |
| Fase Actual | `color_mm6kg2n5` |
| Riesgo / Bloqueo | `color_mm6zdfgs` |
| Riesgos | `text_mm7fvxjn` |
| Acción / decisión requerida | `long_text_mm6zs5rc` |
| Responsable de mitigación | `multiple_person_mm89w189` |
| PM | `multiple_person_mm087pe3` |
| Proveedor | `text_mm6b5rqp` |
| Inicio | `date_mkzt74dd` |
| Go-Live / Fin Plan | `date_mkzrb4nr` |
| Avance real y plan | `numeric_mkzrc075`, `numeric_mm7nz991` |
| CAPEX aprobado | `numeric_mm6kwqt3` |
| CAPEX pagado | `numeric_mm6j1jmr` |
| OPEX anual previsto | `numeric_mm6j8yx` |
| Moneda | `color_mm845zc0` |

«Ejecutado» en la PPT es el CAPEX pagado, conforme a la descripción de esa columna, y su porcentaje sobre el presupuesto. No suma el CAPEX comprometido ni el OPEX. El porcentaje puede superar 100%. No se convierten ni se suman monedas distintas. Un cero confirmado se conserva; un vacío se presenta «Por definir».

La situación actual es la última entrada o respuesta de la bitácora del proyecto o sus subelementos que exista al corte. No se usa Riesgos como situación. El texto visible se abrevia sin generar conclusiones, y la bitácora completa queda en notas con su fecha y fuente.

## Alimentación en subelementos

Se agregaron solo tres columnas al tablero de subelementos `18397995230`:

| Campo | ID | Uso |
|---|---|---|
| Tipo de registro | `color_mm8hx11b` | Hito, Acción o Actividad |
| Cronograma base | `timerange_mm8hpnfz` | Inicio y fin aprobados, que se conservan al reprogramar |
| Fin real | `date_mm8h67vm` | Fecha efectiva de finalización, solo hechos ocurridos |

Se reutilizan `Name`, `Owner` (`person`), `Estado` (`status`), `Inicio Py` (`date_mm5esvwt`) y `Fin Py Estimado` (`date_mm5ennwx`).

- **Hito:** nombre breve, Tipo Hito, Cronograma base con la misma fecha al inicio y al fin, Fin Py Estimado para la previsión vigente. Al completarlo, Estado Listo y Fin real. La ficha muestra hasta cuatro hitos y Go-Live. El fin real de Go-Live se toma solo de un hito explícito de salida a producción, no del cierre del proyecto.
- **Acción:** nombre con el compromiso, Tipo Acción, Owner, Fin Py Estimado y Estado. La ficha muestra hasta cuatro acciones que no estén Listo.
- **Actividad:** Tipo Actividad, cronograma base y previsión vigente en Inicio Py y Fin Py Estimado. Alimenta el anexo; se distingue la base, el período previsto y el punto de fin real.

Una fecha real posterior al corte o sin Estado Listo no se presenta como completada y genera una observación en `latest-qa.json`. Los subelementos históricos sin Tipo de registro no se convierten automáticamente en hitos, acciones ni actividades.

Las barras Programado y Real comparan los porcentajes registrados al corte. Su diferencia se expresa en puntos porcentuales. Los días de desviación de un hito usan fechas comparables de ese mismo hito y distinguen previsto de real. No se estima el avance con una recta entre Inicio y Fin Plan.

## Operación y entrega

Se mantienen el mismo corte de monday para web y PPT, la programación del lunes a las 09:00 de Lima, la regeneración a pedido, el cifrado y la entrega a Borradores automáticos. Una PPT ya generada conserva su corte; la web puede tener uno posterior. Las regeneraciones usan un nuevo nombre y nunca modifican las PPT finales.

`latest-qa.json` registra faltantes, fechas incoherentes, registros completados sin fecha real y cantidades que superan la capacidad visible. Los detalles completos y sus fuentes quedan en notas de cada ficha. No se inventan acciones, responsables, logros, moneda ni ausencia de decisiones para completar la plantilla.

El mapa de IDs está en `tools/weekly-ppt/field-map.json`. Las columnas nuevas se dejaron vacías para que cada PM registre los datos reales.

La descripción de Fin Plan ya identifica el Go-Live. monday denegó con 403 la actualización de la descripción heredada de Fin Real; su propietario debe corregir ese texto. La lógica sigue usando la definición confirmada de cierre efectivo y ningún valor de fechas cambió.
