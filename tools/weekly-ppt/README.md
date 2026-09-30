# Borrador semanal de portafolio

El generador lee el corte privado `_build/weekly-cut.json` producido por la misma lectura de monday que publica la web. No consulta monday por su cuenta. El resultado siempre se guarda como **Borrador**, con fecha y hora de Lima en el nombre; nunca edita la versión final del equipo. La PPT conserva su corte al descargarse; el enlace «Consultar estado actual» abre la web para ver datos posteriores.

## Selección para comité

Edite `selection.json` antes de regenerar:

- `pinned_project_ids`: proyectos que PMO decide incluir, en orden. Use los IDs de monday, no nombres.
- `excluded_project_ids`: proyectos que PMO decide omitir de las sugerencias automáticas.
- `maximum_projects`: tope de fichas. Los proyectos fijados tienen precedencia.
- `reviewed_reporting_week`: lunes de la semana de logros revisada por PMO en formato `AAAA-MM-DD`, por ejemplo `2026-09-21`. Si está vacío o no coincide, la PPT indica que la selección es sugerida y está pendiente de revisión.
- `include_recently_closed`: permite incluir cierres de la semana si el tablero registra Fin Real dentro del corte.

Cuando no hay suficientes proyectos fijados, el generador sugiere activos según bloqueo/riesgo, decisión registrada, fin próximo y actividad reciente. La selección nunca se atribuye a una aprobación humana sin `reviewed_reporting_week` coincidente. La PPT usa solamente campos que existen en el esquema actual de monday y evita totales financieros mientras el tablero no registre moneda por proyecto.

## Ejecución

`node scripts/generate-weekly-ppt.mjs --input _build/weekly-cut.json --output-dir _build/weekly-ppt`

El archivo `latest-path.txt` contiene la ruta absoluta del borrador para el paso privado de distribución. Guarde una copia editada por PMO en una carpeta o nombre de versión **Final**. Las regeneraciones solo escriben nuevos archivos **Borrador**.

## Publicación semanal y entrega privada

El workflow `.github/workflows/publicar-portafolio.yml` actualiza la web cada hora y lanza el borrador los lunes a las 09:00 de Lima. En GitHub, **Actions → Publicar Portafolio Ejecutivo IT → Run workflow** genera otro borrador con `generate_ppt=true`. El registro de Actions muestra si el corte, la bitácora, la PPT y la carga a Drive terminaron. GitHub puede retrasar el inicio de una programación; la hora real del corte aparece en la portada.

La carpeta entregada por Alonso es `Estatus semanal` (`12eFLOouq6IvpvJ37wkNXYX0BHQilHyiD`). Dentro de ella se crearon `Borradores automáticos` y `Finales PMO`. El cargador busca la primera carpeta por nombre y solo añade PPTX allí; no toca `Finales PMO`. El borrador y el corte detallado se guardan en `_build/` durante la ejecución, fuera de GitHub Pages y del repositorio.

Para completar la carga automática, TI debe habilitar una cuenta de servicio de Google con acceso de escritura a la unidad compartida/carpeta y configurar su JSON en el **secret** del repositorio `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`. No registrar la credencial en Git, el chat, la PPT ni un archivo de la carpeta compartida. Si falta el secret, la web sigue publicándose y Actions indica que la PPT se generó pero no se entregó a Drive. Esta integración no consume cuota de Codex por ejecución.

Antes de guardar un **FINAL**, PMO revisa la selección, el texto cualitativo, las fechas, las decisiones y los campos marcados «Por completar en monday». Un ajuste de estado, avance o fecha se hace primero en monday y luego se regenera el borrador. Las notas de cada ficha conservan el texto íntegro y la fuente para facilitar la revisión.
