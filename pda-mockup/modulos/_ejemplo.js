/* Ejemplo mínimo de módulo (no se carga en el index; lo usa tests/e2e_marco.js).
   Copia este patrón en tu archivo de modulos/. Todo en memoria, datos de CC.datos. */
(function(){
  'use strict';
  const E = { f:{texto:''}, pagina:1, tam:10 };            // estado del módulo, en memoria
  const filas = () => CC.datos.filtrar(CC.datos.naves, E.f.texto, ['nombre','imo','bandera']);

  window.ejBuscar = () => { E.f.texto = document.getElementById('ejTexto').value; E.pagina = 1; CC.refrescar('screenEjemplo'); };
  window.ejLimpiar = () => { E.f.texto = ''; E.pagina = 1; CC.refrescar('screenEjemplo'); };
  window.ejPagina = (p, tam) => { if(tam) E.tam = tam; E.pagina = p; CC.refrescar('screenEjemplo'); };
  window.ejExportar = () => CC.exportarExcel('Naves_ejemplo', 'Naves', ['Nave','IMO','Bandera'], filas().map(n=>[n.nombre, n.imo, n.bandera]));
  window.ejAnular = nombre => CC.motivo('Anular nave', 'Anular', txt => CC.toast(`${nombre} anulada: ${txt}`, 'info'));

  CC.registrarPantalla({
    id: 'screenEjemplo',
    grupo: 'Agenciamiento',                 // grupo del menú (debe existir o se crea)
    opcion: 'Ejemplo',                      // si no existe en el menú se agrega al grupo
    propuesta: 'I-000',                     // opción nueva: se marca y se oculta con "Ver propuestas" apagado
    titulo: 'Consulta de Ejemplo',
    migas: ['Inicio', 'Ejemplo', 'Consulta de Ejemplo'],
    html: () => CC.filtros({
        id: 'ejF', titulo: 'Buscar Naves', cols: 3,
        campos: [CC.campo('Nave', `<input id="ejTexto" placeholder="Ingrese nombre o IMO" value="${CC.esc(E.f.texto)}">`)],
        buscar: 'ejBuscar()', limpiar: 'ejLimpiar()'
      })
      + CC.tablaResultados({
        id: 'ejRes', filas: filas(), pagina: E.pagina, tam: E.tam, fnPagina: 'ejPagina', exportar: 'ejExportar()',
        columnas: [
          {t:'Nave', k:'nombre'}, {t:'IMO', k:'imo'}, {t:'Bandera', k:'bandera'},
          {t:'Estado', v: () => CC.chipEstado('Activo')},
          {t:`Acción ${CC.marca('Agrega','HU-EJ-01','I-000')}`, v: n => `<button type="button" class="cc-btn" onclick="ejAnular('${CC.esc(n.nombre)}')">Anular</button>`}
        ]
      }),
    alAbrir: () => CC.toast('Pantalla de ejemplo abierta'),
    guia: [{t:'Consultar naves', steps:[
      {el:'#ejF', h:'Buscar', p:'Filtra por nombre o IMO.'},
      {el:'#ejRes', h:'Resultados', p:'Exporta a Excel o anula con motivo.'}]}]
  });
})();
