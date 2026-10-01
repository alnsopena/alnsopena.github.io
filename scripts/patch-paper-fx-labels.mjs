import fs from 'node:fs';

// The bundled Paper FX library renders the same monday updates in the weekly
// video, spoken briefing and office screen. Keep its public copy in sync with
// the portal's current-week bitácora semantics without touching its behavior.
const file = new URL('../portafolio-ejecutivo-it/assets/js/cosmos-paper-fx.min.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
const voiceOld = '"Esta semana hubo "+s(o.length,"logro","logros")+". Destaca "';
const voiceIntermediate = '"Esta semana se registraron "+s(o.length,"actualización","actualizaciones")+" de proyectos. La más reciente: "';
const voiceNew = '"Actualizaciones de esta semana: "+o.length+". La más reciente: "';
if (source.includes(voiceOld)) source = source.replaceAll(voiceOld, voiceNew);
else if (source.includes(voiceIntermediate)) source = source.replaceAll(voiceIntermediate, voiceNew);
else if (!source.includes(voiceNew)) throw new Error('Texto de voz de Paper FX no encontrado');
const replacements = [
  ['Logros de la semana', 'Actualizaciones de esta semana'],
  ['Muestra la cartera, los logros y los cierres de la semana.', 'Muestra la cartera, las actualizaciones y los cierres de la semana.'],
  ['" avance registrado":" avances registrados"', '" proyecto actualizado":" proyectos actualizados"'],
];
for (const [before, after] of replacements) {
  if (!source.includes(before) && !source.includes(after)) throw new Error('Texto de Paper FX no encontrado: ' + before);
  source = source.replaceAll(before, after);
}
fs.writeFileSync(file, source);
