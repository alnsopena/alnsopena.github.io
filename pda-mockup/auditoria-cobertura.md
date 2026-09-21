# Auditoría de cobertura del mockup Comercial / PDA

Fecha de auditoría inicial: 14/09/2026. Resultado inicial: **cobertura parcial; no estaban aplicadas todas las correcciones**.

La entrega anterior es un prototipo navegable, no una implementación completa de todos los criterios. Tener los nueve tickets enlazados en doce tarjetas no demuestra que cada requisito esté implementado. Esta revisión no modifica el mockup, Cosmos ni Monday.

## Fuentes y método

- Consulta nueva por MCP al tablero 18429643827, Incidencias & Mejoras - Go Live: 124 ítems activos, cursor final nulo; 9 con ÁREA COMERCIAL.
- Leídos los 24 comentarios de esos nueve tickets y sus respuestas (0 respuestas devueltas). Ningún ticket alcanzó el límite de 100 comentarios de la consulta. Los duplicados archivados se consideran mediante los comentarios de consolidación de los principales; no se afirma haber releído sus adjuntos originales.
- Transcripción literal de la reunión del 11/09: `C:/Users/APENA/Desktop/comercial/Revisión de Cosmos Connect_ PDEAs y operaciones tramp - 2026-09-11.txt`.
- Correo de César incluido por el usuario y evidencia PDF revisada durante la construcción.
- Código actual `app.js`, `engine.js`, `styles.css`, registro QA anterior y pruebas aisladas del validador en `work/audit-mockup.cjs`. No se cambiaron los datos del navegador para estas pruebas.
- El archivo de notas Gemini en la ruta de Downloads facilitada anteriormente ya no estaba disponible en la última comprobación. No se presenta como releído en esta auditoría. Tampoco se afirma una nueva inspección visual de todos los adjuntos de Monday.

Las recomendaciones de los comentarios del 14/09 están explícitamente pendientes de validación de usuarios. Aquí se comprueba si el prototipo representa esas recomendaciones, no si son reglas de negocio aprobadas.

## Resultado por ticket

| Ticket | Representado en el mockup | Faltante / resultado |
|---|---|---|
| [12973280385 — Borradores y aprobación](https://cosmos-digital-transformation.monday.com/boards/18429643827/pulses/12973280385) | Borrador incompleto, TBN, particulares editables, roles separados, validación al aprobar. | **Parcial.** No hay búsqueda/precarga de otras naves. No están implementadas acciones Rechazar/Anular. El validador no comprueba carga definida ni confirmación del cliente. No existe derivación al responsable de maestros. |
| [13040783048 — Cliente provisional](https://cosmos-digital-transformation.monday.com/boards/18429643827/pulses/13040783048) | Nombre, dirección, contacto y correo; selección demostrativa de ZIM y registro provisional. | **Parcial.** Sin país/identificador tributario opcionales, advertencia de posibles duplicados, confirmación/derivación al maestro ni vínculo provisional–definitivo. Es posible aprobar con cliente provisional sin confirmar. |
| [13023081897 — Plantillas y cálculos](https://cosmos-digital-transformation.monday.com/boards/18429643827/pulses/13023081897) | Cantidad × tarifa, GRT, LOA × horas, IGV por concepto, activar/desactivar y total compartido. | **Parcial.** Sin mínimo tarifario por GRT, moneda por servicio/conversión, catálogo completo por terminal, carga de versión publicada ni control obligatorio de excepciones. Faltan 20/40 pies y lanchas de autoridades específicas. |
| [12973346018 — Guardar/editar/publicar plantilla](https://cosmos-digital-transformation.monday.com/boards/18429643827/pulses/12973346018) | Guarda una instantánea local y muestra número de versión. | **Parcial incluso como mockup.** No permite abrir/editar una versión guardada, publicarla de forma simulada, elegir su vigencia o generar una nueva PDA desde ella. No se puede dar por resuelto el error real del servidor. |
| [12973296249 — Idioma y formato PDF](https://cosmos-digital-transformation.monday.com/boards/18429643827/pulses/12973296249) | Encabezado corregido, ES/EN, conceptos traducidos, números alineados, sin “celular”, IGV desglosado. | **Parcial.** Idioma no persistido por PDA/cliente; arranca en español. Formato numérico fijo en-US, no configurado por idioma. Fecha de emisión fija. Falta aprobación visual del formato y verificación de paginación del PDF exportado. |
| [12973269738 — Descargar antes del envío](https://cosmos-digital-transformation.monday.com/boards/18429643827/pulses/12973269738) | Vista previa y botón Imprimir/guardar PDF antes de enviar, sin cambio de estado; motor compartido. | **Cubierto en interfaz y lógica básica; exportación pendiente de prueba.** No se verificó un archivo PDF final descargado y comparado con el resumen. |
| [12973269745 — Proveedor/provisiones](https://cosmos-digital-transformation.monday.com/boards/18429643827/pulses/12973269745) | Bloquea validar servicio sin proveedor y permite borrador sin él. Probado con/sin proveedor. | **Regla de interfaz cubierta.** Provisión y validación de proveedor real quedan fuera del prototipo y requieren integración/retest; no equivalen a incidencia resuelta en Cosmos. |
| [13040781818 — Filtros operativos](https://cosmos-digital-transformation.monday.com/boards/18429643827/pulses/13040781818) | Texto combinado, estado, servicio, puerto, creador, rangos por creación/ETA/ETD. | **Parcial.** Sin filtro/columna terminal, busca cliente solicitante pero no billTo, sin orden por fecha descendente. Fecha de creación incorrecta heredada en nuevas PDA y no visible con hora. Solo conserva un escenario de trabajo. |
| [13040760706 — Recargos](https://cosmos-digital-transformation.monday.com/boards/18429643827/pulses/13040760706) | Base, porcentaje, causa, proveedor/fuente e importe; se suma al documento. | **Parcial en fase 1.** Sin tipo/disparador estructurado, fecha/hora aplicable, importe fijo alternativo, aprobador/autorización ni explicación completa en documento. Bloquea aprobar cualquier PDA con recargo, incluso desactivado. Automatización de fase 2 correctamente pendiente. |

## Omisiones específicas de la reunión

1. **Contenedores:** cuatro conceptos genéricos no representan la distinción entre llenos/vacíos, embarque/descarga y 20/40 pies mencionada. Deben desglosarse o modelarse con dimensiones y cantidades independientes. Los importes de la transcripción caótica no deben tomarse como tarifas aprobadas.
2. **Autoridades y terminales:** APN y sanidad pueden añadirse manualmente; no está la lancha de autoridades específica ni una plantilla Callao/Paracas realmente diferenciada. La nomenclatura homologada —incluido el cuestionamiento de “Gantry Crane”— sigue sin catálogo ni identificadores de servicio.
3. **Tarifa mínima por GRT:** el motor solo multiplica; no contempla mínimo configurado ni su orden de aplicación. Ese orden también requiere validación funcional.
4. **Conceptos en soles:** la reunión menciona sanidad en soles. El mockup solo admite USD y el tipo de cambio es referencial, no convierte conceptos.
5. **Excepciones manuales:** cambiar una tarifa no exige motivo; el botón de motivo es opcional. El historial no registra valor anterior/nuevo ni autor/aprobador. La explicación por servicio no se traslada completa al documento.
6. **Fecha y hora de creación:** solicitadas explícitamente; no se muestran en resultados. Las nuevas PDA heredan `2026-09-09` de la muestra.
7. **Roles/facturación:** existen campos distintos a nivel de cabecera, pero no una asignación de gastos por servicio a un pagador diferente. La reunión describe esa excepción; su alcance debe cerrarse con Facturación.
8. **Una plantilla versus una PDA por atención:** se discutieron alternativas contradictorias sobre reutilización/asociación a viajes. La recomendación base por terminal está escrita, pero el prototipo no demuestra el recorrido de seleccionar una versión y asociar la PDA a una atención. No debe darse por acuerdo definitivo.
9. **Catálogos faltantes:** La Pampilla, Bayóvar/otros terminales y Chancay se mencionan como temas a confirmar; el prototipo solo ofrece ejemplos. La dependencia está documentada, pero no hay catálogo aprobado.

## Defectos confirmados por inspección y prueba aislada

- `approvalIssues()` devuelve `[]` con cliente marcado Provisional y carga “Por definir”, manteniendo los demás datos de ejemplo y un servicio válido. **El escenario puede superar la revisión sin cumplir los criterios recomendados.**
- Con un recargo desactivado, `approvalIssues()` sigue devolviendo el bloqueo de revisión externa: comprueba existencia de recargos y no su inclusión.
- El nuevo borrador se construye desde `sample()` y no reemplaza `created` ni `creator`; conserva `2026-09-09` y “Comercial”.
- `lang` es una variable independiente inicializada a `es`, fuera del objeto persistido.
- El listado no filtra terminal ni ordena fecha; su búsqueda textual usa `client`, no `billTo`.
- El motor `calc()` no tiene mínimo ni moneda por línea.

Estas comprobaciones son sobre el código del mockup, no sobre el sistema Cosmos real.

## Qué sí quedó bien representado

Guardar un borrador sin maestros completos; TBN; separar datos de nave y roles; último puerto referencial; cálculo básico consistente entre pantalla/documento; IGV incluido/adicional/exonerado/inafecto; encabezado DISBURSEMENT; salida ES/EN de la muestra; eliminación de “celular”; vista previa antes del envío; proveedor obligatorio al validar; prevención de duplicados exactos al añadir conceptos; notas explícitas de validación pendiente.

## Orden recomendado para completar el mockup

1. Corregir aprobación de cliente/carga y modelar confirmación o derivación del provisional, además de estados Rechazada/Anulada.
2. Completar mínimo tarifario, monedas, contenedores 20/40 y servicios de autoridades, conservando reglas/tarifas pendientes de validación.
3. Demostrar ciclo de plantilla: guardar, reabrir, editar, publicar versión simulada y usarla en otra PDA; historial de excepciones con antes/después y autorización.
4. Completar filtros, creación real y persistencia de idioma; completar ficha de recargo y aprobación manual simulada.
5. Exportar PDF de casos Liner/Tramp en ambos idiomas, comprobar totales/paginación y revisar el formato con Comercial.

**No corresponde afirmar “todas las correcciones aplicadas” ni cerrar los tickets con la evidencia actual.**

## Actualización posterior a las observaciones del mockup — 15/09/2026

Se incorporaron y verificaron visualmente en Chrome los siguientes ajustes:

- **Referencia:** se eliminó el subtítulo bajo el código; se muestran los nueve estados actuales y se marca `En Viaje`; se agregó `Duplicar` junto a `Historial`.
- **Información General:** se añadieron Tonelaje, Broker, Último Puerto, Facturar por cuenta de, Enviar liquidación a, Nombre del Capitán y Email del Capitán, además de los campos observados del documento.
- **Detalle:** se añadieron Tarifa Unitaria, Tarifa, Moneda, Cantidad, A/E, VAT, Total, Comentarios y Val. Ope.; los conceptos quedaron agrupados en las tres categorías solicitadas, con subtotales, resumen por categoría y total.
- **Propuesta:** se distinguen los campos obligatorios con `(*)` y se añadió la leyenda de alcance; la misma estructura de columnas y categorías se conserva en Servicios y cálculos.
- **Validación complementaria:** la revisión local ahora bloquea la aprobación simulada cuando el cliente es provisional, la carga está por definir o existe un recargo activo que requiere revisión; un recargo desactivado no bloquea por sí solo.
- **Verificación:** `node --check outputs/pda-mockup/app.js`, 11 pruebas del motor y recorrido visual de referencia, propuesta, detalle, TBN y revisión de aprobación.

Siguen pendientes para considerarlo resuelto en Cosmos —no solo en el prototipo—: integración con Datos Maestros, mínimo tarifario por GRT, monedas y conversión por línea, conceptos de contenedores 20/40 y autoridades, ciclo de publicación/edición de plantillas, descarga y paginación real del PDF, filtros completos y persistencia del idioma. Los puntos marcados como pendientes de validar requieren confirmación de Comercial, Agenciamiento y Facturación.

## Iteración de decisiones confirmadas — 17/09/2026

Se aplicaron al mockup las selecciones recibidas: modificar primero el prototipo y llevarlo a Monday después de validarlo; ocultar en la propuesta Tonelaje, Bandera, Código IMO y Nombre del Capitán; capturar observaciones únicamente en inglés; y usar `Creado`, `Aprobado` y `Anulado` como estados principales, mostrando el resto como flujo/subestado.

También quedaron representados: asociación habilitada solo después de aprobar; subtotales por categoría; Maestro de recargos con cálculo automático demostrativo y excepción manual; cantidades de contenedores 20/40 llenos/vacíos por carga/descarga; catálogo oficial con alias de homologación; y vista previa/descarga para cliente.

La implementación sigue siendo un prototipo local. No se actualizaron tickets ni se modificó Monday. Las reglas de negocio, catálogos, impuestos, recargos, autenticación y persistencia deben validarse antes de llevarlas al sistema real.

## Addendum de cierre — revisión específica de Plantilla PDA — 21/09/2026

Este addendum actualiza la sección anterior de Plantilla: se inspeccionó la referencia real en búsqueda, alta, consulta y edición antes de corregir la propuesta. El detalle comprobado fue `TPL2609000008 — LINEA ZIM - CALLAO - DPW`; se observaron 10 registros en el listado, nueve campos obligatorios, 17 servicios en tres categorías y los campos opcionales de cliente, armador, condición de pago y comentarios.

La propuesta ahora separa claramente referencia y propuesta; mantiene los nueve obligatorios; usa puerto-terminal dependiente; conserva opcionales; permite activar/desactivar conceptos; diferencia 20/40 pies, lleno/vacío y carga/descarga; muestra unidad, moneda, IGV, mínimo, recargo y comentario por servicio; agrupa categorías con subtotales; y bloquea la publicación cuando faltan tarifa, tratamiento tributario, fuente o confirmación del catálogo. El motor PDA comparte la misma lógica de cálculo y el flujo permite guardar borrador, publicar una versión simulada, consultar historial y generar una PDA local desde una versión publicada.

La comprobación visual final en Chrome validó navegación PDA ↔ PDA Plantilla, referencia con 10 resultados, propuesta, servicios, simulador y mensajes de bloqueo. Las pruebas automatizadas quedaron en **58 aprobadas**: 26 de Plantilla, 21 de flujos y 11 de motor.

La matriz detallada está en [matriz-validacion-plantilla.md](matriz-validacion-plantilla.md). No se modificó el portal real, Monday ni sus permisos. La fuente Gemini no estuvo disponible en la comprobación final; la cobertura se basa en los tickets MCP, la transcripción literal disponible y la inspección de referencia indicada arriba.

