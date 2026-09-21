# Matriz de validación — PDA Plantilla / Comercial

Fecha de cierre de esta revisión: **21/09/2026**. Alcance: mockup local navegable; no se modificó Cosmos ni Monday.

## Fuentes consultadas

- Portal de referencia, solo lectura:
  - Búsqueda: `https://cert-internalportal.cosmos.com.pe/pda-module/pda-template/search`
  - Alta: `/pda-module/pda-template/create`
  - Consulta: `/pda-module/pda-template/view/8`
  - Edición: `/pda-module/pda-template/edit/8`
- Monday, tablero `18429643827`, 12 tickets con área Comercial y sus comentarios/respuestas, consultados por MCP. La lista y los comentarios se conservaron en `work/comercial-monday-2026-09-17.json`.
- Transcripción literal: `C:/Users/APENA/Desktop/comercial/Revisión de Cosmos Connect_ PDEAs y operaciones tramp - 2026-09-11.txt`.
- El archivo `Defectos de Cosmos Connect - Comercial - 2026_09_11 11_00 GMT-05_00 - Notas de Gemini.md` no estuvo disponible en la comprobación final; no se presenta como fuente releída.

## Diferencia entre referencia y propuesta

| Superficie | Evidencia observada | Tratamiento en el mockup |
|---|---|---|
| Referencia | Búsqueda con 10 registros, filtros básicos/avanzados, estados `BORRADOR/APROBADA`, detalle con nueve campos obligatorios y 17 servicios agrupados en tres categorías. | Réplica parcial de consulta y detalle, sin guardar ni ejecutar mantenimiento en el portal. |
| Propuesta | Campos obligatorios visibles, opcionales separados, catálogo puerto-terminal dependiente, servicios activables, tarifas/IGV pendientes y simulador de fórmulas. | Flujo local independiente, con validaciones antes de guardar/publicar y sin inventar tarifas. |

## Cobertura por requisito

| Requisito / ticket | Aplicación en la propuesta | Estado de evidencia |
|---|---|---|
| Nueve campos obligatorios de Plantilla — `12973346018`, `13023081897` | Nombre, puerto, terminal, tipo de nave, servicio, agenciamiento, operación, carga y moneda bloquean guardar si están vacíos. | **Cubierto en modelo y UI.** 9 pruebas específicas. |
| Cliente, armador, condición de pago y observaciones | Se conservan como opcionales; observaciones se capturan como texto del documento en inglés. | **Cubierto en UI.** No crea maestros reales. |
| Puerto-terminal dependiente — comentario `5545379298` | Terminal se carga según puerto observado; se bloquea una combinación incoherente. El catálogo se marca como limitado y dependiente de Datos Maestros. | **Cubierto en mockup; catálogo real pendiente.** |
| Servicios por categorías y homologación — `13023081897` | Comisión/otros, gastos portuarios y autoridades marítimas; 17 conceptos observados, APN opcional, alias EN/ES y códigos estables. | **Cubierto en mockup; homologación real pendiente.** |
| Contenedores 20/40, llenos/vacíos, carga/descarga — transcripción T559, T625, T661–675 | Cada combinación tiene su propio concepto y `containerKey`; la cantidad se toma solo de la combinación elegida desde Agenciamiento. | **Cubierto en modelo, UI y pruebas.** Tarifas de negocio pendientes. |
| Fórmulas GRT/LOA/hora/servicio | Simulador separado de la PDA: cantidad, tarifa, moneda, conversión explícita, IGV adicional/incluido/exonerado/inafecto y subtotal por categoría. | **Cubierto en motor y UI.** Reglas finales de mínimo aún por confirmar. |
| Mínimo por GRT y orden de aplicación — transcripción T753 | Existe configuración de mínimo por unidad/línea y el cálculo no inventa un orden no acordado. La publicación bloquea mínimos incompletos. | **Representado como pendiente de definición.** |
| Impuestos por concepto — ticket `12973296249`, transcripción T753/T607/T759/T811 | Tratamiento explícito por servicio; totales separan neto, IGV y total; PEN/USD no se mezclan sin tipo de cambio. | **Cubierto en modelo y documento.** Validación tributaria real pendiente. |
| Versiones y preservación — `12973346018`, comentario `5545270766` | Guardar borrador, publicar versión validada, conservar instantánea inmutable, mostrar historial y usar una versión publicada para generar una PDA local. | **Cubierto en modelo/UI local.** Sin persistencia ni publicación del backend real. |
| Tarifas y excepción con motivo — comentario `5545373259` | La tarifa, unidad, moneda, mínimo, recargo y comentario se configuran por servicio; la fuente de tarifa y confirmación del responsable son obligatorias para publicar. | **Cubierto como control local.** Aprobador y auditoría real pendientes. |
| Recargos — ticket `13040760706`, transcripción T1649–1709 | Campo de recargo y referencia al Maestro de recargos; las tasas 30/50/100% no se fijan como regla aprobada y una regla incompleta bloquea publicar. | **Pendiente de definición externa.** No se presenta cálculo automático como cerrado en Cosmos. |
| PDF, idioma y formato — ticket `12973296249` | Nombres ES/EN, documento en inglés para observaciones, desglose IGV, agrupación y descarga/impresión simulada desde la PDA. | **Cubierto en interfaz;** paginación/descarga final y aprobación de texto pendientes. |
| Borrador, aprobación y asociación — `12973280385`, `12973269738` | La propuesta PDA muestra `Creado → Enviado → Validado → Aprobado → Completado`; asociación permanece deshabilitada hasta aprobación. | **Cubierto en PDA mockup.** Backend, roles y transición real pendientes. |
| Cliente provisional y pendientes — `13040783048` | El formulario diferencia cliente solicitante/facturador y la revisión de aprobación bloquea datos pendientes definidos en la propuesta. | **Parcial.** Alta, duplicados y vínculo provisional-definitivo requieren maestro real. |
| Duplicados — `13053594686` | El modelo evita usar dos veces la misma solicitud de plantilla para generar PDA. | **Cubierto en prueba local;** causa y regla real aún deben confirmarse. |
| Visibilidad por rol — `13053563184` | Se muestra el alcance de la simulación y no se afirma resolver permisos. | **Fuera del mockup;** requiere UAT real. |
| Clientes múltiples/servicio — `13053148583` | No se fuerza una definición; el alcance queda documentado como decisión pendiente. | **Pendiente de definición funcional.** |
| Filtros operativos — `13040781818` | Pertenece principalmente al listado de PDA; no se presenta como resuelto por esta entrega de Plantilla. | **Fuera del alcance de Plantilla.** |
| Proveedor/provisiones — `12973269745` | No se mezcla con la configuración de Plantilla; permanece en el flujo PDA/Agenciamiento. | **Fuera del alcance de Plantilla.** |

## Comprobaciones ejecutadas

- `test-template.cjs`: **26 pruebas aprobadas**.
- `test-flows.cjs`: **21 comprobaciones aprobadas**.
- `test-engine.cjs`: **11 pruebas aprobadas**.
- Total automatizado: **58 comprobaciones aprobadas**.
- Verificación en Chrome sobre `http://127.0.0.1:8766/index.html`:
  - PDA → PDA Plantilla y regreso a PDA sin cruzar contextos.
  - Referencia visible con 10 registros y detalle de `TPL2609000008`.
  - Propuesta con nueve obligatorios, opcionales, servicios por categoría y 17 servicios activos.
  - Combinaciones de contenedores diferenciadas por tamaño, estado y operación.
  - Subtotales parciales por categoría y simulador de cálculos.
  - Publicación bloqueada con mensajes concretos para tarifa, IGV, catálogo y fuente de tarifas pendientes.

## Límites que deben quedar explícitos

Este resultado es un **mockup de definición**, no evidencia de que el sistema Cosmos haya sido corregido. No se escribieron datos en el portal ni en Monday. Quedan para una siguiente fase: catálogo oficial completo, reglas y aprobación de mínimos, tasas de recargo, impuestos definitivos, permisos por rol, persistencia/backend, publicación real de versiones, PDF final paginado y UAT.

