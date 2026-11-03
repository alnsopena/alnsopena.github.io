# Adaptaciones de COSMOS Paper FX 2.5.0

Origen: `cosmos-paper-fx-2.5.0-escenas.zip`, entregado el 30 de septiembre de 2026.

El motor se copió de `dist/cosmos-paper-fx.min.js`. Después se corrigieron textos del bundle que atribuían a Monday un responsable de decisión que el tablero actual no registra. La escena de Riesgos recibe la **Acción** real de Monday y la muestra como tal; sin acción, indica «sin acción registrada». La voz y Comité guiado ya no afirman que falta un responsable de decisión en Monday. Comité guiado conserva sus campos de acta, pero explica que Responsable y Fecha compromiso permanecen en el acta y no se sincronizan con Monday.

El adaptador `pmo-art.js` conserva las escenas de Riesgos, Portafolio, Cronograma y Mi muelle. En Finanzas se adaptó el frasco con grúa para mostrar **cantidad de proyectos con dato por campo**, igual que el gráfico original. El ZIP sumaba importes con símbolo `$` y pedía una columna de Beneficios proyectados que ya no existe; el portal actual deja los importes por proyecto porque Monday no identifica la moneda. Los gráficos originales siguen disponibles mediante «Ver gráficos».

El nuevo módulo interno «PPT semanal» recibe un ícono animado en `pmo-icons.js`; `pmo-art.js` no monta escenas en él y destruye la escena anterior al cambiar de módulo.

Comité guiado se adapta desde `pmo-av.js`, sin tocar su lógica: recibe las decisiones en el orden de Riesgos y decisiones (`attentionOrder`), suma las diapositivas «Esta semana» (inversión y actualizaciones) y «Entregas» (entregas del año y próximas 90 días), y reescribe indicadores, motivos (`attentionWhy`), prioridad, Fin Plan con días de atraso, acción registrada, voz y acta con el mismo modelo del Resumen (`resumenModel` en `index.html`). `CosmosFx.voiceScript` lista esas frases para la voz pregenerada. En el bundle solo cambió, con `scripts/patch-paper-fx-labels.mjs`, el grupo «Project managers» del selector de Mi muelle, que ahora dice «PM».
