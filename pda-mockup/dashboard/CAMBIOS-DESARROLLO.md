# Dashboard Operativo: cambios para desarrollo

Fecha: 01/11/2026, Lima. Rama: `feat/dashboard-v3`. Publicación v36 aprobada el 01/11/2026.

El prototipo representa el TO BE. Escritorio y TV reutilizan el mismo componente
React, modelo de naves, evaluación de eventos y endpoint. La estimación identifica
la capa afectada, no días: bajo = frontend; medio = dato existente nuevo en pantalla;
alto = lógica, contrato o backend nuevo, sujeto a validación.

La disponibilidad se verificó por interfaz, no por código ni esquema del backend.
`Por validar` no significa que el dato sea inexistente en todo Connect.

| # | Cambio | Tipo | Esfuerzo estimado | Requiere dato nuevo | Justificación de negocio |
|---|---|---|---|---|---|
| 1 | Título, subtítulo y nombres comunes de Connect | estético | bajo: solo frontend | No | Mantener referencias conocidas por usuarios y proveedor. |
| 2 | Orden y posición de los tres rangos en escritorio | estético | bajo: solo frontend | No | Reutilizar controles existentes. |
| 3 | KPIs compactos solo en escritorio; nombres y orden actuales | estético | bajo: solo frontend | No | TV tiene presentación propia. |
| 4 | Refresco visual del v3: tipografía, tarjetas, fondos y espaciado | estético | bajo: solo frontend | No | Coherencia visual. TV usa Figtree del manual. |
| 5 | Grilla oscura, filas alternadas, divisores y densidad de escritorio | estético | bajo: solo frontend | No | Reutilizar las diez columnas. |
| 6 | Cabecera sticky, altura disponible y mínimo ocho filas en laptop; un solo scroll de grilla | funcional | bajo: solo frontend | No | Consultar todas las naves sin doble scroll de escritorio. |
| 7 | Rangos por arrival/sailing y ventanas de 14 días, incluidos registros sin fechas asignados por la fuente | funcional | alto: validar lógica o backend | Por validar: arrival, sailing, ETA y rango sin fechas | **Validar con desarrollo, posible lógica nueva de backend.** Incluir naves sin información sin inventar fechas. |
| 8 | Conteo de naves y KPIs del conjunto completo del rango | funcional | medio: dato existente nuevo en pantalla | No si el endpoint expone el conjunto completo; validar paginación del servidor | Evitar contar solo la página visible. |
| 9 | Estado operativo debajo del nombre de nave | funcional | medio: dato existente nuevo en pantalla | Por validar: estado operativo en el contrato | Distinguir operación, espera y falta de información. |
| 10 | Fecha y hora de ETA/ATA, ETD y sailing | funcional | medio: dato existente nuevo en pantalla | Por validar: timestamps completos y zona horaria | Mantener precisión con los encabezados actuales. |
| 11 | Semáforo por límite/transmisión, confirmación y excepción de nave en operación | funcional | alto: validar lógica o backend | Por validar: límites, transmisión, ventanas de aviso y vigencia del estimado | **Validar con desarrollo, posible lógica nueva de backend.** No asumir equivalencia con la fórmula actual. |
| 12 | Ejecución: ejecutado, pendiente y sin agente, separada del color de plazo | funcional | alto: validar lógica o backend | Por validar: ejecución, confirmación y agente asignado | Distinguir ejecutado tarde de pendiente. |
| 13 | Gris Sin información con motivo sin fecha base / sin agente | funcional | medio: dato existente nuevo en pantalla | Por validar: motivo y agente marítimo | No atribuir cumplimiento sin datos o responsable. |
| 14 | Alerta por ETA/ETD desactualizada y conteo afectado | funcional | medio: dato existente nuevo en pantalla | No si existen ETA/ETD y estado; validar regla | Identificar estimados que requieren corrección. |
| 15 | Panel de detalle y trazabilidad | funcional | alto: validar contrato o backend | Por validar: límite, transmisión, confirmación y fuente; ver matriz inferior | Explicar cada color y ejecución. |
| 16 | Registrar manifiesto con fecha, hora y confirmación | funcional | alto: persistencia y auditoría reales | Sí en producción si no existe: registro manual, usuario, fecha de registro, historial y procedencia | Contingencia SDA. El mockup guarda solo en localStorage. |
| 17 | Resumen ejecutados, pendientes y sin información | funcional | bajo: solo frontend | No si existen estados de evento | Lectura rápida sin otra consulta. |
| 18 | Modo TV completo: marca, sedes, reloj, criticidad/ETA, páginas, rotación y refresco estable | nuevo modo | bajo: frontend sobre contrato validado | No adicional a los campos anteriores | Monitoreo a distancia, con todas las naves y clientes, incluidos vencidos y sin información. |
| 19 | Acceso de la PC dedicada y renovación de sesión o reconexión automática | funcional | alto: validar acceso y lógica de sesión | Por validar: acceso por sede y mecanismo permitido de renovación | Evitar un login permanente en TV. Definición de desarrollo/TI; el mockup no certifica sesiones de Connect. |
| 20 | Aviso demo, límites, notas editoriales y Cambios vs Connect | estético | bajo: solo frontend | No | Apoyo de revisión, sin marca morada; notas y marcas ocultas en TV. |

**Resumen: 20 cambios, 9 de esfuerzo bajo, 5 medio y 6 alto.** Las estimaciones de
datos/backend son provisionales hasta revisar el contrato con el proveedor.

## Campos del detalle frente a Connect actual

| Campo del ideal | Visible hoy en el dashboard actual | Disponibilidad para desarrollo |
|---|---|---|
| Nave / viaje | Sí, en la grilla | Reutilizar. |
| Fecha límite | No visible | Validar si existe o requiere nueva regla. |
| Fecha y hora transmitida | No visible | Validar SION/SDA y precisión horaria. |
| Confirmado | No visible | Validar estado equivalente o campo nuevo. |
| Fuente del evento | No visible | Validar procedencia automática/manual. |
| Regla aplicada | No visible | Puede ser metadato calculado; no implica un campo de base de datos. |
| Indicador Manual | No visible | Identificar procedencia de la contingencia. |

Se confirma **no visible en el dashboard actual**, no inexistencia en todo Connect.
El clic se probó en una muestra; no se inspeccionaron todos los eventos ni roles.

## Modo TV y actualización

- URL: `?modo=tv&sede=callao|paita&rango=hoy|ultimas|proximas&seg=15&tema=navy|claro`.
- `rotar=1` cambia de rango al terminar el ciclo. Por defecto conserva el rango.
- 12 filas por página en 1080p; `filas` admite 5 a 12. Se limita a 12 para conservar
  fecha, hora, estado y letra mínima de 20 px. `seg` admite 1 a 300.
- La composición tiene base 1920x1080 y se ajusta proporcionalmente a otras ventanas
  para poder revisarla completa. El mínimo de 20 px corresponde a la TV de 1080p.
- Orden por evento más crítico de la nave: vencido, por vencer, en plazo y sin
  información; luego ETA. Sin ETA al final de su grupo. No se filtran clientes,
  vencidos ni registros sin información; solo sede y rango.
- Navy es el tema predeterminado; `tema=claro` habilita la opción clara.
- Reloj en `America/Lima`, con día simulado del corte y hora actual corriendo.
  Escritorio y TV comparten reloj y fecha. `fecha=real` activa fecha real al integrar
  datos reales; se propaga desde el mockup al iframe y al enlace de TV. El parámetro
  cambia la presentación del reloj, no convierte el JSON de demostración en datos reales.
  El corte de cálculo permanece fijo para reproducir los casos del prototipo.
  Se oculta la fecha del portal solo mientras Dashboard está activo para evitar
  mezclar fecha real y simulada. Última actualización es la última lectura exitosa aplicada
  por el prototipo; no certifica frescura de SION/SDA.
- Se lee el mismo JSON cada **300000 ms**, con `cache: no-store`. Sin cambios, conserva
  página, filas y vencimiento del temporizador. Con cambios, espera al final del
  ciclo para aplicarlos. No hay salto dentro de la página ni reinicio por refresco.
- El dato nuevo puede esperar el remanente de un ciclo. Si falla la lectura,
  conserva los últimos datos y muestra actualización pendiente.
- La sesión y acceso de cada PC dedicada quedan para desarrollo/TI, cambio 19.

## Datos demostrativos y marca

- Corte de cálculo: **05/08/2026, 10:30 Lima**. Fecha visible: 05/08/2026,
  con hora de Lima corriendo. La lectura del archivo sigue ocurriendo cada cinco minutos.
- Callao: 179 registros de Hoy, siete de Últimas y siete de Próximas. Conserva los
  casos originales del v3. Paita: 48 de Hoy, cuatro de Últimas y seis de Próximas.
  Flotas ficticias independientes, sin nombres compartidos entre sedes en ningún rango.
- Hoy/Callao: 109 vencidos, 3 por vencer y 29 en plazo. Hoy/Paita: 21 vencidos,
  4 por vencer y 13 en plazo. Los registros manuales pueden modificar estos KPIs.
- Referencia Callao/Hoy observada el 01/11/2026: 179 filas, 895 eventos, 754 grises
  (84.25%) y 103 filas totalmente grises (57.54%). La demo reproduce esas proporciones.
  Conserva tres amarillos del v3 para mantener sus escenarios; no replica todos los
  conteos reales de colores.
- Paita tiene 202/240 eventos grises (84.17%) y volumen menor. No se midió su
  volumen ni distribución reales; es una simulación independiente para revisar el diseño.
- ATA y ETD variados: máximo dos naves por fecha/hora en cada sede y rango; fechas
  cronológicas, transmisiones anteriores al corte, estados y ejecución distribuidos
  entre los cinco hitos. Los registros sin fecha conservan el dato ausente.
- Navy oficial: **#021E2F, Pantone 296 C**, manual COSMOS, página 31.
  Complementarios: #00293B, #003D53 y #CBA785. Figtree es la tipografía principal
  del manual, aplicada en TV. Se conserva el logo vectorial del mockup.

## Marcas y persistencia

- Las etiquetas de revisión reservan espacio propio, sin superponerse a textos,
  KPIs, leyendas, fechas ni indicadores. La grilla usa altura flexible y cabecera
  sticky; el modo compacto se activa según el alto disponible, sin afectar otras pestañas.
- `--chg: #7C3AED`, contorno continuo y NUEVO/CAMBIADO para C/E. A/B y elementos de
  apoyo no llevan marca. Las columnas compartidas se señalan en su primera fila;
  las alertas específicas en su fila. TV se señala como un solo bloque en su acceso.
- Estado sincronizado con Ver PDA vía `postMessage`, validando origen y emisor,
  y clave `pdaChg`. No se cambia la función original de Ver PDA.
- No hay D funcionales confirmados. Se conserva `.chg-removed` sin inventar quitados
  ni mostrar panel vacío. Marcas y notas no se renderizan en TV y se ocultan al imprimir.
  El JSON no incluye etiquetas de revisión ni notas exportables.
- Los registros manuales usan `cosmos-dashboard-operativo-v3:manual:v1` en localStorage.
  Persisten al recargar en el mismo navegador/origen y se superponen a cada lectura.
  No se sincronizan entre dispositivos ni escriben en Connect. Borrar datos del
  navegador elimina los registros.
- Build estático en `dashboard/`, sin compilación obligatoria en GitHub Pages.
  Fuente y pruebas en `dashboard-source/`. No se publican credenciales.
