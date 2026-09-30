# Despacho PMO de la PPT semanal

Esta web app privada de Google Apps Script permite que PMO pulse **Generar nuevo borrador** sin abrir GitHub ni encender el PC de Alonso. El servidor de Apps Script llama al `workflow_dispatch` existente con `generate_ppt=true`. El código no lee monday ni entrega archivos: usa el mismo generador de GitHub Actions que la web. La entrega a Drive la resuelve el proceso del repositorio; la respuesta de este botón solo confirma que GitHub aceptó la solicitud, no que la PPT haya terminado.

## Publicación

1. Crear un proyecto **independiente** en [Apps Script](https://script.google.com/), bajo una cuenta de Google Workspace de COSMOS. El proyecto debe permanecer bajo control de PMO; no conceder permisos de **editor** del script a usuarios de la web.
2. Copiar `Code.gs` y `Index.html` en archivos del mismo nombre dentro del editor. Activar «Mostrar archivo de manifiesto `appsscript.json`» en Configuración y reemplazarlo con el archivo de esta carpeta.
3. Crear en GitHub un **fine-grained personal access token** limitado al repositorio `alnsopena/alnsopena.github.io`, con solo permiso de repositorio **Actions: Read and write** y una caducidad definida. El propietario deberá renovarlo antes de que expire. No añadir permiso Contents: write ni guardar el token en el repositorio, el HTML o el portal.
4. En Configuración del proyecto → Propiedades de secuencia de comandos, poner `GITHUB_DISPATCH_TOKEN` al valor del token y `PMO_ALLOWED_EMAILS` a una lista explícita de correos de PMO separados por comas, por ejemplo `persona1@cosmos.com.pe,persona2@cosmos.com.pe`. No añadir correos genéricos ni patrones comodín. El dominio permitido en `Code.gs` es `cosmos.com.pe`; ajustarlo únicamente si la identidad real de Google Workspace usa otro dominio corporativo.
5. **Implementar → Nueva implementación → Aplicación web**: «Ejecutar como yo» (cuenta propietaria) y acceso «Cualquier usuario de COSMOS» / «Usuarios del dominio». Autorizar los permisos de identidad de correo y solicitud externa. Copiar la URL pública del despliegue que termina en `/exec`. Si Google no ofrece el acceso de dominio por política de Workspace, no abrirla a «Cualquiera» como atajo.
6. Abrir la URL con una cuenta PMO incluida en `PMO_ALLOWED_EMAILS` y probar el botón. Después, comprobar que GitHub muestra un run nuevo en [Publicar Portafolio Ejecutivo IT](https://github.com/alnsopena/alnsopena.github.io/actions/workflows/publicar-portafolio.yml). Probar también con una cuenta COSMOS fuera de la lista: debe ver acceso restringido y no generar un run. Si el dominio no entrega el correo activo a Apps Script, el código **deniega** la ejecución; se requiere revisar con administración de Workspace o desplegar como «usuario que accede», en cuyo caso cada PMO debe autorizar la app.

El portal puede seguir mostrando el enlace actual a GitHub Actions hasta completar estas pruebas. Luego se configura la **URL pública no secreta** de la web app en la variable de repositorio `COSMOS_PPT_DISPATCH_URL`, que alimenta `assets/ppt-config.json`; el botón de PMO abrirá esa URL sin editar `index.html`. Solo aceptar URL HTTPS de `script.google.com/macros/s/.../exec`. El PAT **nunca** va en esa variable ni en el archivo público.

## Operación y límites

- El usuario necesita sesión corporativa de Google y debe estar en la lista PMO. Una persona con acceso al portal pero sin autorización PMO no puede lanzar el workflow.
- Dos clics en menos de 90 segundos no generan dos borradores. El servidor vuelve a comprobar identidad y allowlist en cada solicitud, aunque la página ya esté abierta.
- El botón ofrece enlaces a [Borradores automáticos](https://drive.google.com/drive/folders/1GP2-M5Uc_BQCy4YsST0joWoqRhwFjoVD) y a [Estatus semanal / finales](https://drive.google.com/drive/folders/12eFLOouq6IvpvJ37wkNXYX0BHQilHyiD). Los permisos de esas carpetas siguen siendo los de Drive.
- Apps Script y GitHub Actions operan sin Codex ni consumo de tokens de Codex. Pueden aplicarse cuotas y límites propios de Google o GitHub. Una solicitud aceptada puede fallar después por monday, generación, cifrado o entrega; revisar el run y el archivo final.
- Revocar de inmediato el PAT en GitHub si se sospecha exposición. Aunque Script Properties no se publican al navegador, quienes tengan permiso de **editor** sobre el proyecto Apps Script pueden leer/modificar el código y acceder a la credencial.

Validación local sin credenciales: `node --test tools/weekly-ppt/apps-script-dispatch/test-dispatch.mjs`. No hay prueba real de Workspace/Apps Script hasta que se despliegue bajo el dominio y se configure el token.
