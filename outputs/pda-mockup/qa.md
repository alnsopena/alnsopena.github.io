# Verificación del mockup — 14/09/2026

## Probado

- Sintaxis de `app.js` con Node `--check`.
- Motor numérico: pruebas reproducibles en `test-engine.cjs` (navegación, amarradero, IGV incluido/adicional, exonerado/inafecto, datos faltantes, negativos, exclusión y suma).
- Chrome: formulario de tres columnas y navegación visibles; captura revisada.
- Cambio de comisión a IGV incluido: pantalla muestra neto 350 y 63 de impuesto, manteniendo total 413.
- Vista previa toma los mismos valores; total global coincide con Servicios.
- Inglés: encabezado DISBURSEMENT, tipo de nave Container ship, conceptos, unidades, clasificaciones tributarias, totales y advertencias traducidos.
- Documento revisado visualmente: importes alineados, agrupación y desglose de totales.
- Crear PDA Tramp/TBN con particulares y cliente vacíos; guardar localmente sin bloqueo.
- Aprobar ese borrador presenta los campos faltantes, sin cambiar estado.
- Alta de CLIENTE DEMO como provisional; facturar a se conserva separado.
- Validación de servicio sin proveedor bloqueada; con proveedor de prueba muestra elegibilidad simulada.
- Añadir cuatro conceptos de carga/descarga de contenedores; repetir no duplica.
- Guardar una versión de plantilla conserva los conceptos y pendientes de la plantilla seleccionada.
- Recargo manual de prueba: 30% de 413 = 123.90, con causa, fuente y base congelada.

## No verificado / fuera de alcance

- Backend y flujos reales de Cosmos/Monday: no se modificaron.
- Provisiones, envío de correo, publicación real de plantillas, maestros oficiales.
- Validez contractual de tarifas o tributaria de cada concepto.
- Salida física de impresora y paginación final de todas las combinaciones de datos. Se incluye CSS A4 y botón de impresión; la vista previa HTML sí se verificó visualmente.
- Prueba visual en dispositivos móviles físicos. Se incluyen reglas responsive, pero la verificación visual se realizó en Chrome de escritorio.

Los datos de las pruebas son simulados. La interfaz marca recomendaciones pendientes de validar y no se presenta como sistema terminado de producción.

## Cierre de Plantilla PDA — 21/09/2026

- Inspección de referencia real, solo lectura: búsqueda, alta, consulta `TPL2609000008` y edición.
- Navegación Chrome del mockup: PDA → PDA Plantillas, Propuesta, Servicios y tarifas, Comprobar cálculos y regreso a PDA.
- PDA Plantillas: aparecen exactamente dos bases fijas —PDA Plantilla · Liner y PDA Plantilla · Tramp—; no existe alta de una tercera plantilla.
- Cambio Liner/Tramp: cada tarjeta mantiene su configuración, servicios y versiones independientes; el nombre, tipo y servicio de la plantilla no son editables.
- Versionado: editar una versión publicada crea un borrador sin reemplazar la publicada; “Crear PDA desde plantilla” genera una PDA nueva en estado Creado y conserva los datos preliminares y servicios.
- Entrada a PDA Plantillas: la pantalla inicial muestra únicamente las dos tarjetas Liner y Tramp, sin una plantilla seleccionada.
- Selección: al elegir una tarjeta aparece el detalle de esa plantilla con las acciones “Editar plantilla” y “Crear PDA desde plantilla”; al regresar y entrar nuevamente se restablece el selector inicial.
- Referencia: 10 registros visibles, filtros y detalle con nueve campos obligatorios.
- Propuesta: nueve obligatorios, campos opcionales, tres categorías, conceptos agrupados y APN opcional.
- Contenedores: ocho combinaciones independientes por tamaño, lleno/vacío y carga/descarga.
- Publicación: bloqueo visible por tarifa, IGV, catálogo y fuente de tarifa pendientes; no se inventan importes.
- Automatizado: 26 pruebas de Plantilla + 21 de flujos + 11 de motor = **58 aprobadas**.

No se guardó, editó, publicó ni eliminó información en el portal real. Las tarifas, mínimos, recargos, catálogos, permisos y reglas tributarias siguen sujetos a validación funcional y UAT.

