# Borrador semanal de portafolio

El generador lee el corte privado `_build/weekly-cut.json` producido por la misma lectura de monday que publica la web. No consulta monday por su cuenta. El resultado siempre se guarda como **Borrador**, con fecha y hora de Lima en el nombre; nunca edita la versión final del equipo. La PPT conserva su corte al descargarse; el enlace «Consultar estado actual» abre la web para ver datos posteriores.

## Selección para comité

Edite `selection.json` antes de regenerar:

- `pinned_project_ids`: proyectos que PMO decide incluir, en orden. Use los IDs de monday, no nombres.
- `excluded_project_ids`: proyectos que PMO decide omitir de las sugerencias automáticas.
- `maximum_projects`: tope de fichas. Los proyectos fijados tienen precedencia.
- `reviewed_reporting_week`: lunes de la semana de logros revisada por PMO en formato `AAAA-MM-DD`, por ejemplo `2026-09-21`.
- `reviewed_cut_id`: ID exacto del corte aprobado, disponible en `latest-qa.json`. Ambos valores deben coincidir con el corte; una extracción posterior vuelve a marcar la selección como pendiente de revisión.
- `include_recently_closed`: permite incluir cierres de la semana si el tablero registra Fin Real dentro del corte.

Cuando no hay suficientes proyectos fijados, el generador sugiere activos según bloqueo/riesgo, decisión registrada, fin próximo y actividad reciente. La selección nunca se atribuye a una aprobación humana sin semana e ID de corte coincidentes. La PPT usa solamente campos que existen en el esquema actual de monday y evita totales financieros mientras el tablero no registre moneda por proyecto.

## Ejecución

`node scripts/generate-weekly-ppt.mjs --input _build/weekly-cut.json --output-dir _build/weekly-ppt`

El archivo `latest-path.txt` contiene la ruta absoluta del borrador para el paso de cifrado. Guarde una copia editada por PMO en una carpeta o nombre de versión **Final**. Las regeneraciones solo escriben nuevos archivos **Borrador**.

## Publicación semanal y entrega privada

El workflow `.github/workflows/publicar-portafolio.yml` actualiza la web cada hora y lanza el borrador los lunes a las 09:00 de Lima. En GitHub, **Actions → Publicar Portafolio Ejecutivo IT → Run workflow** genera otro borrador con `generate_ppt=true`. El registro de Actions muestra si el corte, la bitácora, la PPT y el artefacto cifrado terminaron. GitHub puede retrasar el inicio de una programación; la hora real del corte aparece en la portada.

La carpeta de destino es `Estatus semanal` (`12eFLOouq6IvpvJ37wkNXYX0BHQilHyiD`), dentro de `Borradores automáticos`. La copia editada por PMO va en `Finales PMO`. El borrador y el corte detallado se guardan en `_build/` durante la ejecución, fuera de GitHub Pages y del repositorio.

Para la entrega sin credenciales corporativas en GitHub, `scripts/encrypt-weekly-ppt.mjs` cifra el PPTX con el certificado **público** `delivery-certificate.pem`. Actions publica solo `<nombre-del-borrador>.pptx.cms` en el artefacto `weekly-ppt-encrypted`, con retención de 90 días. El formato es CMS EnvelopedData binario (DER), con AES-256; el cifrado usa [`openssl cms -encrypt -binary -aes256`](https://docs.openssl.org/master/man1/openssl-cms/). El archivo `.cms` no es una presentación editable hasta que se descifre.

La clave privada correspondiente se conserva únicamente en el almacén de certificados del usuario de Windows que ejecutará la tarea local. Esa tarea debe descargar el artefacto de una ejecución exitosa de `main`, descifrar sus bytes y guardar el `.pptx` en la ruta de Google Drive para escritorio que corresponda exactamente a `Estatus semanal/Borradores automáticos`. La ruta local debe verificarse en ese equipo; el ID web de la carpeta no equivale a una ruta `G:`. No subir la clave privada ni el PPTX sin cifrar al repositorio o a un artefacto. La copia en `G:` termina la entrega cuando Drive para escritorio confirma la sincronización; el equipo debe estar encendido, con sesión corporativa activa y permiso de escritura en esa carpeta. Si se trata de una unidad compartida, Google exige el rol [**Content manager** o **Manager**](https://support.google.com/a/users/answer/12380484?hl=en) para escribir mediante Drive para escritorio.

En el equipo de Alonso se registró la tarea de Windows `COSMOS PMO Weekly PPT Sync` mediante `scripts/install-weekly-ppt-task.ps1`. Se ejecuta al iniciar sesión y, de lunes a viernes, a las 09:45, 13:00 y 17:00. `scripts/sync-weekly-ppt-local.ps1` recupera los artefactos nuevos vigentes, conserva el PPTX intacto si ya existe, añade el ID del artefacto al nombre si hubiera una colisión, verifica SHA-256 y registra el resultado en `%LOCALAPPDATA%\CosmosWeeklyPpt\sync.log`. Para una comprobación manual: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/sync-weekly-ppt-local.ps1`. El PC no necesita estar encendido exactamente a las 09:00 del lunes: la siguiente ejecución recoge los borradores pendientes mientras no hayan expirado sus artefactos (90 días). Deben seguir disponibles la sesión de Windows, el certificado local y Google Drive para escritorio. Ni GitHub Actions ni la tarea local llaman a Codex o consumen tokens de Codex.

Antes de guardar un **FINAL**, PMO revisa la selección, el texto cualitativo, las fechas, las decisiones y los campos marcados «Por completar en monday». Un ajuste de estado, avance o fecha se hace primero en monday y luego se regenera el borrador. Las notas de cada ficha conservan el texto íntegro y la fuente para facilitar la revisión.
