# Cosmos Connect · Mockup Comercial / PDA

Prototipo local para revisar definiciones; no modifica Cosmos ni Monday.

## Decisiones aplicadas en esta iteración

- El mockup presenta únicamente la propuesta comercial; la réplica visual de referencia no forma parte de esta versión.
- Observaciones de la PDA: captura en inglés y salida del documento siempre en inglés.
- Estado principal: **Creado**, **Aprobado** o **Anulado**. El ciclo operativo se muestra como `Creado → Enviado → Validado → Aprobado → Completado`, con la ruta de rechazo `Rechazado → Ajuste → Enviado → Validado → Aprobado → Completado`.
- La asociación a nave/viaje permanece deshabilitada hasta aprobar la PDA.
- Servicios agrupados por categoría con subtotal; contenedores 20/40 llenos/vacíos y carga/descarga con origen Agenciamiento.
- Recargos automáticos demostrativos mediante Maestro de recargos, con excepción manual controlada.
- El cliente dispone de vista previa y descarga PDF simulada; requiere autenticación en una implementación real.

## Abrir

Abrir `index.html` en Chrome (funciona sin internet) o acceder al servidor local `http://127.0.0.1:8766/` mientras esté activo. Para reiniciarlo desde esta carpeta:

```powershell
& 'C:\Users\APENA\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 8766 --bind 127.0.0.1
```

## Recorrido recomendado

1. Revisar la **Propuesta** y su flujo de estados de principio a fin.
2. Abrir **Servicios y cálculos**: verificar navegación y amarradero, cambiar el tratamiento de IGV de la comisión entre incluido y adicional.
3. Ver **Documento**, alternar Español/English y usar **Imprimir / guardar PDF**. La impresión no modifica el estado de la PDA.
4. **Nueva PDA / TBN**: guardar incompleta. Cliente provisional, proveedor y particulares no bloquean el borrador.
5. **PDA Plantilla**: revisar configuración, servicios por categoría, combinaciones de contenedores, simulador y validación antes de publicar.
6. Revisar **Recargos** y usar **Revisar para aprobar**. El cálculo automático y la aprobación son simulaciones locales.
7. Abrir **12 cambios y validaciones** para las decisiones de la reunión y enlaces a los nueve tickets.

## Cálculos verificados

- Navegación: `0.03 × 21,667 × 1 = 650.01`.
- Amarradero: `1.50 × 171.98 × 10 = 2,579.70`.
- Comisión 413 con IGV incluido: neto 350, IGV 63, total 413.
- Comisión 413 más IGV: neto 413, IGV 74.34, total 487.34.
- Neto del escenario corregido con impuestos pendientes: USD 7,376.59. No es un importe validado para cobrar.

La clasificación tributaria parte de **pendiente** por concepto. Se muestra un subtotal provisional sin IGV para esos conceptos y se bloquea la aprobación simulada. Se redondea a dos decimales por línea y se suman esos resultados; UI y documento usan `engine.js`.

## Evidencia y límites

La cobertura requisito por requisito, los 12 tickets de Comercial, las referencias de la reunión y las comprobaciones finales están en [matriz-validacion-plantilla.md](matriz-validacion-plantilla.md). La referencia real de Plantilla se inspeccionó en búsqueda, alta, consulta y edición en modo solo lectura; el mockup no escribe en el portal.

- Referencia de PDA Plantilla observada el 17/09/2026: consulta de 10 registros y detalle `TPL2609000008` (LINEA ZIM - CALLAO - DPW), con 17 servicios, tres categorías y nueve campos obligatorios. Las otras nueve fichas no se inspeccionaron; sus enlaces muestran ese límite. La réplica es de consulta y no ejecuta mantenimiento del portal. `flows.js` y `templates.css` deben acompañar al HTML.

- PDF suministrado PDA2026000035PECLL: total 6,726.61; navegación 0.03; amarradero 2,579.70. Imagen de su primera página incluida, sin modificación.
- Pantalla observada PDA35: total 4,811.89; navegación 650.01; amarradero 15.00. No se confirmó que el PDF y la pantalla fueran la misma versión. No se sobrescribe ninguna fuente.
- Transcripción de la reunión del 11/09 y matriz de triage de esta tarea. Las recomendaciones no se presentan como acuerdos definitivos.
- Los nombres ES/EN son propuestas para validar. Los datos bancarios se omiten en el nuevo documento; el PDF de referencia conserva sus datos originales.
- Catálogo limitado de demostración. Solo tarifas del PDF en la muestra; conceptos complementarios sin tarifa. Fórmulas y tratamiento de impuestos sujetos a validación del responsable.
- Se guarda un escenario de trabajo en localStorage de este navegador/origen; no hay base de datos ni sincronización. Cargar PDA35 conserva una copia anterior bajo `cosmos-pda-mockup-backup`. No se promete un gestor de múltiples PDA persistentes.
- Cliente provisional no crea un maestro; guardar plantilla no publica una versión real; aprobar, enviar y asociar son simulaciones. El Maestro de recargos y la descarga para cliente no están conectados a servicios reales.
- No incluye backend, autenticación, maestro oficial, cálculo tarifario certificado, provisiones o correo.

## Implementación y pruebas

Rediseño de propuesta: navegación sin la pestaña Validación operativa, seguimiento visual por pasos, leyenda de requisitos única, campos complementarios desplegables y contenedores compactos. `proposal.js` y `proposal.css` deben acompañar siempre al HTML cuando se comparte la carpeta.

Plantilla PDA: `template-model.js` contiene el modelo de nueve obligatorios, servicios/categorías, monedas, IGV, mínimos, recargos pendientes, contenedores por combinación y versiones; `template-module.js` y `template-module.css` contienen la propuesta navegable. `flows.js` conserva la referencia observada. La demo no equivale a publicación ni persistencia real.

HTML/CSS/JavaScript sin dependencias externas. `engine.js` es compatible con Node para pruebas de cálculo. Validado en Chrome: renderizado, cambio de idioma, IGV incluido, consistencia del documento y navegación de Plantilla. Ejecutar `node test-template.cjs`, `node test-flows.cjs` y `node test-engine.cjs` para repetir las 58 comprobaciones. Ver `qa.md` y `matriz-validacion-plantilla.md` para el registro completo.

