# Sincronización del portafolio con Monday

El botón **Actualizar datos** abre la conexión privada existente de Google Workspace. La identidad y la lista `PMO_ALLOWED_EMAILS` se comprueban en el servidor en cada solicitud. No se añaden permisos ni se entregan tokens al navegador.

El servicio envía `generate_ppt=false` y un UUID a `publicar-portafolio.yml`. Esa ejecución se llama `PMO SYNC <uuid>`, consulta Monday y publica un nuevo corte. El panel del portafolio distingue conexión, espera, consulta, publicación y carga. Solo finaliza cuando el servidor confirma que la ejecución terminó correctamente, incluida su verificación pública, y el cliente carga el snapshot que acredita ese UUID, el run y su intento. Un corte visible durante una ejecución que luego falla no permite anunciar éxito.

## Componentes

- Cliente: `portafolio-ejecutivo-it/assets/js/monday-sync.js` y `assets/css/monday-sync.css`.
- Backend compartido existente: `tools/weekly-ppt/apps-script-dispatch/Code.gs`, `Sync.gs` y `Sync.html`. La ruta normal de ese servicio sigue atendiendo la PPT existente. La ruta `?mode=sync&request_id=<uuid>` atiende exclusivamente la sincronización de datos.
- El workflow añade `publication.request_id`, `publication.run_id` y `publication.run_attempt` al snapshot. Son referencias públicas, no credenciales.

El cliente y el marco de Google intercambian mensajes con origen explícito y un UUID aleatorio por solicitud. Abrir una URL del servicio no inicia por sí solo el workflow: necesita el mensaje de inicio del origen del portafolio o una pulsación explícita del usuario autorizado. Si Google pierde la referencia a la pestaña de origen, la vista segura ofrece el botón manual; el portafolio continúa comprobando el corte solicitado.

La espera queda guardada en `sessionStorage` y puede recuperarse después de recargar. Los errores conservan el corte anterior. Tras diez minutos sin confirmación, el panel informa de demora y permite seguir comprobando la misma solicitud. Si el navegador bloquea la ventana corporativa, el panel permite abrirla manualmente.

## Despliegue

El proyecto corporativo existente mantiene su URL `/exec`, sus propiedades y su manifiesto de permisos. Se actualiza su versión con el `Code.gs` y el `Sync.gs` indicados arriba (también pueden concatenarse en el archivo `Código.gs` del editor) y se añade el HTML `Sync`. No se modifica `Index.html`, el acceso de dominio ni la lista de usuarios autorizados. Nunca copiar las propiedades secretas al repositorio.

La configuración pública ya entrega `dispatch_url` mediante `assets/ppt-config.json`; solo contiene la URL no secreta del servicio. El nuevo flujo reutiliza esa URL y no genera archivos PowerPoint.

## Verificación

`node --test scripts/monday-sync.test.mjs tools/weekly-ppt/apps-script-dispatch/test-dispatch.mjs`

Verificar también el recorrido real desde el botón: cuenta autorizada, ejecución `PMO SYNC`, paso de espera a publicación, nuevo UUID en el corte y panel finalizado con la fecha aplicada. Probar que los filtros y la ficha abiertos se conservan. No declarar terminada la sincronización al recibir solamente la confirmación del despacho.
