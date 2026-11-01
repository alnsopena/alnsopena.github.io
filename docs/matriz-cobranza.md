# Matriz de trazabilidad: módulo Cobranza

Corte: 01/11/2026. Fuentes: cert de Connect en solo lectura, Monday (6 tickets de alcance y 2 de contexto, con bitácora completa), HU en Notion y código del respaldo de Connect del 01/10/2026.

**Cómo leer "Cómo está hoy en Connect":**

- **[Observado]:** visto hoy en cert.
- **[Código]:** leído en el respaldo del 01/10. No se probó en cert, puede diferir.
- **[Bitácora]:** reportado en el ticket. No se reprodujo.
- **[Adjunto]:** visto en un archivo adjunto del ticket. En este levantamiento no se revisó ningún adjunto, por eso no hay filas con esta etiqueta.
- **[No verificado en Connect]:** no se pudo observar. No se da por hecho.

La columna PEN indica "Propuesta TI, por validar" cuando el ticket o la HU tiene el punto abierto. Ningún PEN de esta matriz está aprobado.

Capturas de Connect: carpeta `docs/capturas-connect/cobranza/` del proyecto, fuera de este repo (11 archivos). Tienen datos reales, por eso no se copian al mockup.

## 1. Hallazgos que cambian el alcance

1. **El renombre ya existe en buena parte.** Cert muestra el menú **Cobranzas**, la ruta "Inicio / Cobranzas / Validación de Pagos" y textos como "Decisión de Cobranzas" y "Monto registrado por Cobranzas". Del menú cuelga una sola opción: Validación de pagos. No hay menú Tesorería. La brecha real de I-158 es el singular "Cobranza", si se confirma, y los textos que aún dicen Tesorería. La ruta técnica sigue siendo `treasury-module`, y no es visible como texto de pantalla. Ver D2.
2. **"Observado" no existe como resultado.** El combo de la operación ofrece Pendiente de revisión, Aprobado, Aprobado con observaciones y Rechazado. I-158 pide comunicar "aprobado, rechazado u observado". Ver D3.
3. **La pantalla tiene tres niveles, no dos.** Listado de órdenes, Detalle de Orden de Pago (transferencias y liquidaciones) y modal Detalle de operación. Los campos que menciona el encargo están en el modal. Además existe **Nuevo Pago**, que ya muestra Monto total, Monto pagado y Saldo pendiente por orden.
4. **Ya existe un aviso manual a Cobranza por devolución.** Documentos Contables tiene el botón Notificar Devolución, con modal de Nave, Viaje, Puerto, Cliente, Saldo, Moneda (USD por defecto) y Motivo, y botón Enviar. El mockup lo deja como aviso simple. I-164 pide el aviso automático, así que lo de hoy es base, no algo que se reemplace sin decisión. Ver D7.
5. **No hay ningún reporte de provisiones vs documento visible.** El único "reporte" en todos los menús de esta sesión es Reporte de Comisiones por Pagar, ajeno a este alcance. La bitácora de I-181 dice que provisiones "ya existe en otro módulo", sin nombrarlo. Puede estar oculto por permisos de mi perfil. Ver sección 4 y D5.
6. **El crédito no vive hoy en el maestro.** El formulario Crear Socio solo tiene Condición de Pago con Contado y Crédito, sin días ni límite. El encargo pide un enlace a esa configuración, pero hoy no hay a qué enlazar. Revisé la cabecera general, no las demás pestañas. Ver D9.
7. **El mockup no tiene BL.** El encargo pide reutilizar BL de Facturación, pero el archivo no contiene ninguno. En cert, el hilo de una orden de pago pasa por liquidación tipo Documentación o Sobreestadía y BL asociado. Ver D6.
8. **Dos "números de operación" en la misma fila (solo observado).** En una orden revisada, la grilla muestra un Nº operación y el modal, para esa misma fila, otro Nº operación / referencia. No concluyo la causa. Es insumo de I-177.
9. **Una operación ya aprobada se puede reabrir en edición (solo observado).** El modal de una operación en estado Aprobado mantiene activos el monto, el resultado y el botón Confirmar. No lo confirmé, así que no sé qué pasa al guardar. Es insumo para definir el reverso (PEN-I158-02).

## 2. Matriz

### 2.1 Menú y navegación

| Pantalla | Elemento | Cómo está hoy en Connect | Cambio | Ticket | HU | PEN / por validar | Esfuerzo estimado para el dev |
|---|---|---|---|---|---|---|---|
| Menú | Nombre del módulo | [Observado] "Cobranzas" en menú y ruta de pantalla | Modificar: "Cobranza" en singular | I-158 | HU-FAC-11; el renombre solo está en bitácora del 15/10 | Propuesta TI, por validar. PEN-I158-05. Ver D2 | Bajo |
| Menú | Textos que aún dicen Tesorería | [Código] "Notificación enviada a Tesorería" y "Notificar a Tesorería" en Documentos Contables. [No verificado en Connect] asuntos y cuerpos de correo | Modificar: cambia los textos visibles. No toca la ruta técnica | I-158 | HU-FAC-11; bitácora del 15/10 | Propuesta TI, por validar. PEN-I158-05 (superficies afectadas) | Bajo |
| Menú | Opción Validación de pagos | [Observado] única opción de Cobranzas | Sin cambio | I-158 | HU-FAC-11 | Ninguno | Bajo |
| Menú | Opción Medios de pago | [Observado] no existe | Agregar | I-180 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-ABO-02 (dónde se consulta) | Bajo |
| Menú | Opción Reportes | [Observado] no existe en Cobranzas | Agregar | I-181 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-REP-03 | Bajo |

### 2.2 Validación de pagos: búsqueda y resultados

| Pantalla | Elemento | Cómo está hoy en Connect | Cambio | Ticket | HU | PEN / por validar | Esfuerzo estimado para el dev |
|---|---|---|---|---|---|---|---|
| Validación de Órdenes de Pagos | Filtros | [Observado] N° Orden Pago, Fecha de Registro, Método (Transferencia bancaria, ASBANC, Crédito), Moneda (Sol peruano, Dólar estadounidense), Estado (Creada, Pendiente de validación, Validada, Rechazado, Anulado). Buscar, Limpiar, + Nuevo | Sin cambio | I-177 | HU-FAC-11 | Ninguno | Bajo |
| Validación de Órdenes de Pagos | Consulta de pendientes | [Observado] Estado llega con Pendiente de validación por defecto y devuelve pendientes | Sin cambio: ya cubre lo pedido | I-177 | HU-FAC-11 | Ninguno | Bajo |
| Validación de Órdenes de Pagos | Columnas | [Observado] N° Orden, Fecha de Registro, Método, Condición, Estado, N° operaciones, Moneda, Monto total, Tiene Factura o Boleta (indicador y número), Acciones. Items por página | Sin cambio en las existentes | I-177 | HU-FAC-11 | Ninguno | Bajo |
| Validación de Órdenes de Pagos | Valores de Condición | [Observado] Contado y Crédito. [Código] sin CONTADO DOC ni CONTADO I | Modificar: suma CONTADO DOC y CONTADO I | I-178 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-CRE-01 (catálogo y códigos SAP) | Medio |
| Validación de Órdenes de Pagos | Saldo por orden | [Observado] la grilla no lo muestra. Sí aparece en Nuevo Pago | Agregar: columna Saldo pendiente | I-178 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-CRE-02 | Medio |
| Validación de Órdenes de Pagos | Exportar a Excel | [Observado] la pantalla no tiene exportación. Documentos Contables sí tiene Exportar. [No verificado en Connect] sus columnas: no descargué archivos | Agregar: Exportar con vista previa de estados de documentos emitidos | I-177 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-02. Ver D8 | Medio |
| Validación de Órdenes de Pagos | Aviso interno por constancia cargada | [Bitácora] el sistema no avisa. [No verificado en Connect] la carga de constancia desde el portal del cliente | Agregar: vista previa del aviso con pago, cliente y documento, y marca de nueva versión | I-158 | HU-FAC-11 | Propuesta TI, por validar. PEN-I158-01, PEN-JENNY-I158-01 | Medio |
| Nuevo Pago | Modal de órdenes disponibles | [Observado] filtros N° Orden Pago, Nro. Documento, Cliente, Estado. Columnas N° Orden, Nro. Documento, Cliente, Moneda, Monto total, Monto pagado, Saldo pendiente, Estado, Acción. Selección con casillas y Pagar. [Código] formulario Nuevo Pago, Transferencia | Sin cambio: se dibuja igual, sin marca | I-178, I-180 | Sin HU, bitácora Monday | Ninguno | Bajo |

### 2.3 Detalle de Orden de Pago

| Pantalla | Elemento | Cómo está hoy en Connect | Cambio | Ticket | HU | PEN / por validar | Esfuerzo estimado para el dev |
|---|---|---|---|---|---|---|---|
| Detalle de Orden de Pago | Detalle de transferencias asociadas | [Observado] Nº operación, Fecha de pago, Banco origen, Cuenta origen, Monto informado, Monto registrado, Monto aplicado, Estado, Validado por, Fecha validación, Voucher, Acciones | Agregar: operación confirmada, fecha efectiva y banco receptor. Lo actual queda como declarado | I-177 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-01, PEN-UAT122-04 | Medio |
| Detalle de Orden de Pago | Liquidaciones | [Observado] Nº liquidación, Tipo, BL asociado, Monto liquidación, Moneda, Estado liquidación (vistos: Pago confirmado, Pendiente de confirmación, Pago Pendiente) | Sin cambio. Es el estado de pago que consumen I-026 e I-098, ver sección 5 | I-177 | HU-FAC-11 | Ninguno | Bajo |
| Detalle de Orden de Pago | Enlace al documento contable | [Observado] el número solo aparece en la grilla. El detalle no lo muestra | Agregar: enlace al documento, para el hilo Documento contable, Pago, Validación, Aplicación | I-180 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-ABO-01 | Bajo |
| Detalle de Orden de Pago | Reverso de validación | [Observado] no existe. [Bitácora] hoy se anula la factura a mano en SAP y Connect | Agregar: acción Revertir validación con modal de motivo y efectos en Connect, SAP y documento | I-158 | HU-FAC-11 | Propuesta TI, por validar. PEN-I158-02, PEN-JENNY-I158-01. La HU no autoriza automatizar sin reglas | Alto |
| Detalle de Orden de Pago | Estado tras el reverso | [No verificado en Connect] no ejecuté cambios. Combo de estados sin valor de reverso | Agregar: estado Revertido y registro de quién, cuándo y motivo | I-158 | HU-FAC-11 | Propuesta TI, por validar. PEN-I158-02 | Medio |
| Detalle de Orden de Pago | Condición y saldo real | [Observado] Monto aplicado y Monto registrado, sin saldo de la orden ni condición | Agregar: Condición, Total, Conciliado y Saldo. Ejemplo CONTADO DOC: factura USD 300 = saldo anterior USD 100 + abono USD 200. Se cancela solo con los USD 300 conciliados | I-178 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-CRE-02 | Alto |
| Detalle de Orden de Pago | Nota CONTADO I | [No verificado en Connect] la condición no existe en los catálogos vistos | Agregar: nota de que el pago de Cosmos a la naviera no cancela la cuenta por cobrar del cliente | I-178 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-CRE-01, PEN-CRE-02 | Medio |
| Detalle de Orden de Pago | Referencia a la configuración de crédito | [Observado] Socio solo tiene Condición de Pago (Contado, Crédito). Sin días ni límite en la cabecera general | Agregar: referencia de solo lectura con enlace a Socio. No se construye la pantalla | I-178 | Sin HU, bitácora Monday. Dependencia HU-DM-01 | Propuesta TI, por validar. PEN-CRE-01. Ver D9 | Bajo |

### 2.4 Modal Detalle de operación

| Pantalla | Elemento | Cómo está hoy en Connect | Cambio | Ticket | HU | PEN / por validar | Esfuerzo estimado para el dev |
|---|---|---|---|---|---|---|---|
| Detalle de operación | Datos de la operación bancaria | [Observado] Nº operación / referencia, Moneda, Fecha de pago, Banco origen, solo lectura | Modificar: se rotulan como declarados por el cliente y se conservan como antecedente | I-177 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-01 | Bajo |
| Detalle de operación | Número de operación confirmado | [Observado] no existe. [Bitácora] hoy la referencia real va como texto en la observación | Agregar: campo propio | I-177, I-158 | HU-FAC-11 | Propuesta TI, por validar. PEN-UAT122-01, PEN-I158-02 | Medio |
| Detalle de operación | Fecha efectiva de pago | [Observado] solo la fecha declarada | Agregar: campo propio | I-177 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-01 | Medio |
| Detalle de operación | Banco de origen confirmado | [Observado] texto de solo lectura. [Código] Nuevo Pago sí usa desplegable de banco | Agregar: desplegable | I-177 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-04. Ver D4 | Medio |
| Detalle de operación | Banco receptor | [Observado] no existe | Agregar: desplegable, por ejemplo BCP a BBVA | I-177 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-04. Ver D4 | Medio |
| Detalle de operación | Monto registrado por Cobranzas | [Observado] campo editable | Sin cambio | I-177 | HU-FAC-11 | Ninguno | Bajo |
| Detalle de operación | Moneda | [Observado] texto de solo lectura, viene de la orden. [Código] Nuevo Pago la muestra como Moneda OP | Modificar: USD por defecto, con cambio puntual a PEN con aprobación de jefatura | I-177 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-06 | Alto |
| Detalle de operación | Resultado de la validación | [Observado] Pendiente de revisión, Aprobado, Aprobado con observaciones, Rechazado | Modificar: efecto de cada resultado sobre el pago, sin alterar las opciones hasta cerrar el punto | I-177, I-158 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-06. Ver D3 | Medio |
| Detalle de operación | Motivo / observación | [Código] obligatorio si el resultado no es Aprobado. [Observado] campo libre con placeholder | Modificar: muestra cuándo se exige. La operación ya no depende de esta nota | I-177 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-06 | Bajo |
| Detalle de operación | Corte de 20:00 e interbancarios | [Bitácora] desfase de fecha después de las 20:00 y en interbancarios. [No verificado en Connect] | Agregar: aviso informativo, sin regla automática | I-177 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-01 | Medio |
| Detalle de operación | Fecha de pago a SAP como vencimiento | [Bitácora] pedido en minuta. [No verificado en Connect] el mapeo actual | Agregar: nota de destino SAP. No sustituye la fecha | I-177 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-UAT122-05 | Alto |

### 2.5 Correo al cliente

| Pantalla | Elemento | Cómo está hoy en Connect | Cambio | Ticket | HU | PEN / por validar | Esfuerzo estimado para el dev |
|---|---|---|---|---|---|---|---|
| Detalle de operación | Vista previa de correo al confirmar | [Bitácora] evento no contemplado. [No verificado en Connect] no ejecuté Confirmar. [Observado] Plantilla Email existe en Data Maestra | Agregar: vista previa con orden, estado y motivo guardados, por cada resultado | I-158 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-I158-04. Depende de I-068 | Alto |
| Detalle de operación | Control de reenvío | [No verificado en Connect] | Agregar: indicador de enviado para evitar duplicados | I-158 | HU-FAC-11; solo en bitácora | Propuesta TI, por validar. PEN-I158-04 | Medio |

### 2.6 Medios de pago (consulta nueva)

| Pantalla | Elemento | Cómo está hoy en Connect | Cambio | Ticket | HU | PEN / por validar | Esfuerzo estimado para el dev |
|---|---|---|---|---|---|---|---|
| Medios de pago | Búsqueda por documento y socio | [Observado] no existe. [Bitácora] referencia en Blue Ship | Agregar | I-180 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-ABO-02 | Medio |
| Medios de pago | Documento principal y relacionados | [Observado] no existe | Agregar: cliente o socio, agencia, importe, estado | I-180 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-ABO-01 | Alto |
| Medios de pago | Pagos aplicados por medio de pago | [Observado] no existe. Cuenta origen y Monto aplicado están en otro detalle | Agregar: tipo, número de operación o documento, cuenta, banco, importe, importe aplicado, fecha de depósito, observaciones | I-180 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-ABO-01. Campos del ticket; la captura de referencia no se revisó | Medio |
| Medios de pago | Abono único vs distribuido | [Observado] no existe. [Bitácora] la aplicación entre socios no llega completa a SAP | Agregar: distingue uno o varios documentos o socios, sin duplicar el total. Ejemplo ficticio de dos socios | I-180 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-ABO-01, PEN-ABO-02 | Alto |
| Medios de pago | Parciales, anulaciones y reversiones | [No verificado en Connect] | Agregar: efecto en lectura. Solo consulta, no modifica aplicaciones | I-180 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-ABO-01, PEN-ABO-03 | Medio |

### 2.7 Reportes

Columnas y formato de todas estas vistas: Propuesta TI, por validar. Sin fuente confirmada.

| Pantalla | Elemento | Cómo está hoy en Connect | Cambio | Ticket | HU | PEN / por validar | Esfuerzo estimado para el dev |
|---|---|---|---|---|---|---|---|
| Reportes | BL/VB pendientes de cobro | [Observado] no existe en menús. [Bitácora] se consulta en Blue Ship | Agregar: filtro por códigos ZIM y DMFP, importe USD | I-181 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-REP-01, PEN-REP-02 | Medio |
| Reportes | Provisiones vs documento por cliente | [Observado] no hay reporte visible. Existe Consulta de Provisiones. [Código] enlace Ver Provisiones dentro de un documento originado en provisión. [Bitácora] "ya existe en otro módulo", sin nombre | Agregar: acceso con enlace a lo existente, y parámetros Serie, Número, Tipo de Documento y rango de fechas si se aprueba la vista | I-181 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-REP-02. Ver sección 4 y D5 | Medio |
| Reportes | Recaudación EPAY | [Observado] no existe en menús | Agregar: por día o rango | I-181 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-REP-01, PEN-I158-06 (límite con el reporte diario) | Medio |
| Reportes | Facturas con detracción | [Observado] no existe en menús. [Código] Documentos Contables sin campo de detracción | Agregar: por rango, para autodetracciones. Sin porcentaje, porque sigue sin aprobarse en I-115 | I-181 | Sin HU, bitácora Monday | Propuesta TI, por validar. PEN-REP-01. Relacionado I-115 | Medio |
| Reportes | Reporte diario de confirmaciones | [Bitácora] no existe. [Observado] no aparece en menús | Agregar: validaciones del periodo | I-158 | HU-FAC-11 | Propuesta TI, por validar. PEN-I158-03, PEN-I158-06, PEN-JENNY-I158-01. Ver D8 | Medio |

### 2.8 Aviso por saldos de liquidación

| Pantalla | Elemento | Cómo está hoy en Connect | Cambio | Ticket | HU | PEN / por validar | Esfuerzo estimado para el dev |
|---|---|---|---|---|---|---|---|
| Documentos Contables | Notificar Devolución | [Observado] modal manual con Nave, Viaje, Puerto, Cliente, Saldo, Moneda, Motivo, Enviar. No lo envié | Sin cambio funcional. Sigue en el mockup. Ver D7 | I-164 | HU-TI-01 | PEN-I164-02 | Bajo |
| Documentos Contables / Cobranza | Aviso automático de saldo | [Bitácora] "No se genera la alerta" en UAT-E2E-124, sin evidencia adjunta. [No verificado en Connect] no hay ejecución acreditada | Agregar: vista previa con documento, cliente, monto, moneda y tipo a cobrar o a devolver | I-164 | HU-TI-01 | Propuesta TI, por validar. PEN-JENNY-I164-01, PEN-I164-01, PEN-I164-02 | Medio |
| Cobranza | Consulta del aviso recibido | [No verificado en Connect] | Agregar: lista simple en Validación de pagos para contrastar con el documento | I-164 | HU-TI-01 | Propuesta TI, por validar. PEN-JENNY-I164-01 (destinatario y canal) | Medio |

## 3. Cobertura y reconciliación de los tickets

| Ticket | Monday | HU | Etapa en Monday | Estado Go Live | Filas | Observación |
|---|---|---|---|---|---|---|
| I-158 | 13053172344 | HU-FAC-11 | Reportado | Bloqueante | 11 | Reclasificado de No bloqueante por instrucción del 15/10 |
| I-177 | 13301592632 | HU-FAC-11 | Reportado | Bloqueante | 17 | Prueba UAT-E2E-122, resultado Insatisfactorio el 16/09 |
| I-180 | 13305999538 | Sin HU | Reportado | Bloqueante | 8 | PEN-ABO-03 pide vincular HU y evaluar viabilidad |
| I-181 | 13306017974 | Sin HU | Reportado | Bloqueante | 5 | PEN-REP-03 pide vincular HU |
| I-178 | 13306003629 | Sin HU | Reportado | Bloqueante | 6 | Área COBRANZA, FACTURACIÓN, ATC. Emisión y permisos van fuera de esta pantalla |
| I-164 | 13053611977 | HU-TI-01 | Reportado | Bloqueante | 3 | UAT-E2E-124 bloqueada, sin evidencia |

Una fila puede sumar a más de un ticket. **Conteo de filas de la matriz: 47.** Agregar 32, Modificar 7, Quitar 0 y 8 filas sin cambio, que se dibujan igual a Connect y sin marca.

**Contradicciones entre encargo, bitácora y HU:**

1. **Etapa.** Las bitácoras del 15/10 de I-158, I-177, I-178, I-180 e I-181 dicen "Pendiente de definición". La columna muestra **Reportado** en los seis, actualizada el 30/10. Ninguno está en una etapa que invalide el alcance, pero conviene alinear. Sin PEN cerrado, ninguno está listo para desarrollo.
2. **La HU-FAC-11 no recoge la ampliación.** Se editó por última vez el 12/10, se titula "Tesorería", su área es Facturación y solo tiene sección de I-158. No incluye I-177, ni el correo al cliente, ni el renombre, ni moneda ni estados. Por eso esas filas dicen "solo en bitácora". El encargo la presenta como sustento de I-177.
3. **"Aprobado con observaciones".** El encargo lo define con I-177, I-158 remite a I-177, e I-177 lo deja en "si aplica" (PEN-UAT122-06). La definición no existe aún.
4. **Revisión de Facturación del 12/10 en I-158.** Marcó "Ya no aplica" y pidió derivar a Cobranzas. La bitácora lo aplica como derivación, no como cierre, y el 15/10 amplió el alcance. Lo tomo vigente.
5. **Revisión de Facturación del 12/10 en I-164.** Pidió que Finanzas valide la necesidad y marcó "Solicito corrección". La columna Área sigue en COBRANZA. Por eso todo I-164 va como propuesta.
6. **Destinatario.** El encargo dice "aviso a Cobranza"; I-164 y HU-TI-01 dicen Tesorería. Lo trato como el mismo equipo, según PEN-I158-05, pero falta confirmarlo.
7. **Más PEN de los que indica el encargo.** Menciona solo PEN-JENNY-I158-01 y PEN-JENNY-I164-01. Los seis tickets tienen 25 pendientes abiertos, listados en la sección 6.
8. **Alcance sobre Facturación.** El encargo pide no tocar Facturación y a la vez conectar I-164 con Liquidación. Ver D7.
9. **Medios de pago.** El encargo la pone como sub-vista. El ticket dice "abrir el detalle de un documento" y PEN-ABO-02 deja abierta la ubicación. Sigo el encargo y sumo el enlace desde el detalle.

## 4. Provisiones vs documento por cliente

No cubre el requerimiento nada de lo que hay hoy:

- **Excel de Documentos Contables del mockup:** es una vista previa simulada (`fdExport`). Trae número, tipo, facturar a, fecha, moneda, total, RUC, servicio y usuario. No trae provisión, número de provisión ni estado.
- **Consulta de Provisiones del mockup:** muestra Número de Documento en Provisiones Generadas, pero esa columna es un cambio propuesto de I-014, no Connect de hoy. Busca por proveedor, no por cliente ni por serie y número de documento.
- **Documento del mockup:** guarda las provisiones vinculadas, pero las muestra documento por documento y no como reporte.
- **Connect:** el enlace Ver Provisiones [Código] muestra solo las provisiones del documento abierto. No hallé un reporte en los menús de esta sesión.

Falta el punto que pide PEN-REP-02: identificar el reporte que la reunión da por existente y comprobar la equivalencia.

## 5. Tickets de contexto (no se dibujan como cambio)

- **I-026 (12973331324), HU-ATC-09, Bloqueante, Reportado.** La confirmación de pago ASBANC no llega a Connect. En cert hay órdenes de método ASBANC en Pendiente de validación [Observado].
- **I-098 (13023086820), HU-ATC-12, Bloqueante, Reportado.** La liberación del BL exige pago confirmado [Bitácora]. El dato más cercano en pantalla es Estado liquidación: Pago confirmado [Observado]. Que sea exactamente el dato que consume es inferencia mía: [No verificado en Connect].

Solo se refleja en el mockup el Método ASBANC y el Estado liquidación, tal como están hoy.

## 6. PEN por validar

- I-158: PEN-I158-01, PEN-I158-02, PEN-I158-03, PEN-I158-04, PEN-I158-05, PEN-I158-06, PEN-JENNY-I158-01
- I-177: PEN-UAT122-01, PEN-UAT122-02, PEN-UAT122-03 (homologación para probar, no se dibuja), PEN-UAT122-04, PEN-UAT122-05, PEN-UAT122-06
- I-180: PEN-ABO-01, PEN-ABO-02, PEN-ABO-03
- I-181: PEN-REP-01, PEN-REP-02, PEN-REP-03
- I-178: PEN-CRE-01, PEN-CRE-02, PEN-CRE-03
- I-164: PEN-I164-01, PEN-I164-02, PEN-JENNY-I164-01

Los textos de estos PEN aún no están en `FAC_PEN`. Se agregan en la construcción, con su consulta y propuesta.

## 7. Decisiones que necesito antes de tocar el HTML

- **D1. Ubicación del menú.** El encargo pide menú lateral, pero el mockup usa barra superior (`ccMenu`, `CC_SUBMENU`) y ya tiene el botón Cobranzas. **Recomiendo** la barra superior, con Validación de pagos, Medios de pago y Reportes como opciones de ese menú, igual que Connect. Un menú lateral sería un rediseño que el proveedor no tiene por qué hacer.
- **D2. Nombre.** Connect dice Cobranzas y el ticket pide Cobranza. **Recomiendo** dibujar "Cobranza" con marca y PEN-I158-05, y mostrar en la marca que el valor actual es "Cobranzas". No lo presento como renombre desde Tesorería, porque eso ya no es cierto.
- **D3. Resultados de validación.** **Recomiendo** dejar las cuatro opciones de cert y no agregar "Observado". En el correo, "observado" se resuelve con Aprobado con observaciones, marcado PEN-UAT122-06.
- **D4. Bancos.** **Recomiendo** mostrar banco de origen y banco receptor por separado, sin decidir cuál va a conciliación y SAP (PEN-UAT122-04).
- **D5. Provisiones vs documento.** **Recomiendo** en Reportes una tarjeta que enlace a Consulta de Provisiones, marcada "Reutiliza, por validar equivalencia", sin vista nueva. Si con Cobranzas se confirma que no existe tal reporte, se agrega la vista con los parámetros del ticket. ¿Sabes en qué módulo está el que mencionó la reunión?
- **D6. Hilo de datos.** El mockup no tiene BL. **Recomiendo** crear BL y liquidaciones ficticios solo en los datos de Cobranza, enlazados a documentos que ya existen, como F005-00031011 y F005-00031014. Así no toco `fdSeed` ni `fpSeed`. El prefijo de serie sigue el del mockup, no el de cert.
- **D7. Excepción sobre Facturación.** I-164 necesita un punto de entrada. **Recomiendo** una sola excepción: que Notificar Devolución de Documentos Contables deje el aviso simple y abra el modal igual a Connect, con la vista previa del aviso automático marcada Propuesta TI. Lo demás de Facturación no se toca. Alternativa: dibujar el aviso solo dentro de Cobranza.
- **D8. Vistas extra en Reportes.** El encargo habla de cuatro reportes, pero hay dos más por ubicar: reporte diario (I-158) y Excel de estados (I-177). **Recomiendo** el reporte diario como quinta vista de Reportes, y Exportar con vista previa en Validación de pagos, dejando I-064 solo en Documentos Contables.
- **D9. Crédito.** Socio no tiene días ni límite hoy. **Recomiendo** mostrar en Cobranza "Condición de Pago: Crédito" con enlace al Socio y días y límite como "Por definir, PEN-CRE-01", sin agregar campos al maestro. La emisión de CONTADO DOC y CONTADO I en el documento queda fuera, salvo que la pidas.
- **D10. Etapa y HU.** ¿Corrijo algo en Monday o en Notion? **Recomiendo** no tocar nada desde esta tarea y que tú decidas si alineas etapa y HU-FAC-11. En las marcas pondría "HU-FAC-11, ampliación en Monday 15/10" donde la HU no lo recoge.

## 8. Limitaciones del levantamiento

- No usé Confirmar, Pagar, Enviar, Exportar, Descargar comprobante, Anular ni Guardar. Abrí y cerré sin guardar: Detalle de operación, Nuevo Pago, Notificar devolución y un documento contable.
- Abrí el formulario Crear Socio para leer Condición de Pago, y salí sin guardar. Revisé solo su cabecera general.
- Hice búsquedas con filtros de estado y método. Los filtros pueden quedar recordados en la sesión de Connect.
- Sin caso en cert para Aprobado con observaciones guardado, Anulado por dentro ni formulario Nuevo Pago, Transferencia: ese formulario es [Código]. No vi el combo de Condición de Pago del documento abierto, porque no desplegó opciones.
- Los menús vistos son los de mi perfil de sesión. Un reporte con permiso aparte no aparecería.
- La revisión en el código corresponde al respaldo del 01/10. Cert manda cuando difieren.
- El mockup usa el texto "Se quitó respecto a Connect actual" en `fRemoved`. Esta matriz no tiene filas Quitar: ningún ticket pide retirar un elemento de Cobranza. Si durante la construcción surge una, uso ese patrón.

**Adjuntos no revisados** (no se descargaron, no hay autorización para esta tarea):

- `Plantilla_Evidencia_UAT (1).docx`, en la bitácora de I-177, con dos capturas.
- `CONNECT REPORTES-VALIDACION.docx`: Word original con las capturas de Blue Ship Medios de Pago (imagen 5), de los parámetros de reportes y de validación (imagen 7). Citado en bitácora, sin archivo listado en los comentarios ni en la columna de archivos.
- Notas de reunión del 15/10/2026, citadas como fuente I-179, sin archivo listado.
- `CREACION DE NUEVAS CONDICIONES DE PAGO.eml`, citado en I-178, sin archivo listado.
