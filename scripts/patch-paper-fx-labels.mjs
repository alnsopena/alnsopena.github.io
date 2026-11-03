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
  // Mi muelle picker: the portal names the role "PM" everywhere ("Todos los PM").
  ['<optgroup label="Project managers">', '<optgroup label="PM">'],
  // The portal counts the year's closures as "Entregados <año>": port ship sign, KPIs, Mi muelle, passport and voice say the same.
  ['l+" ejecutados "+o.totals.year', 'l+" entregados "+o.totals.year'],
  ['"ejecutados "+i.year,e.ok', '"entregados "+i.year,e.ok'],
  ['" ejecutados en "+i.year+"."', '" entregados en "+i.year+"."'],
  ['" ejecutado"+(1===o.closedYear.length?"":"s")+" en "', '" entregado"+(1===o.closedYear.length?"":"s")+" en "'],
  ['"ejecutados en "+e.year,"#3F8F6B"', '"entregados en "+e.year,"#3F8F6B"'],
  ['", ejecutado "+(t.closedLabel', '", entregado "+(t.closedLabel'],
  ['u?"ejecutados":"ejecutados "+(h.year||"")', 'u?"entregados":"entregados "+(h.year||"")'],
  ['" con riesgo. Este año se ejecutaron "', '" con riesgo. Este año se entregaron "'],
];
for (const [before, after] of replacements) {
  if (!source.includes(before) && !source.includes(after)) throw new Error('Texto de Paper FX no encontrado: ' + before);
  source = source.replaceAll(before, after);
}
// Port dock: the only behavior hook. CosmosFx.draw is a copy of the internal pen kit, so the container a dock
// item is drawn with cannot be swapped from outside. scene.boxFor(item) may return another painter with the same
// signature as draw.box (pmo-puerto.js: short container for quick wins); without it the engine draws as before.
const dockBox = ['k.box(t,c,h-m,n.u,{col:nt(e.status,a),', '(this.boxFor&&this.boxFor(e)||k.box)(t,c,h-m,n.u,{col:nt(e.status,a),'];
if (!source.includes(dockBox[0]) && !source.includes(dockBox[1])) throw new Error('Contenedor del muelle de Paper FX no encontrado');
source = source.replaceAll(dockBox[0], dockBox[1]);
// Port berth plates (desktop and mobile) count containers as "proyectos"; scene.countLabel(items) may name the
// mix instead (pmo-puerto.js: "N iniciativas", or "N proyectos" / "N quick wins" when there is a single kind).
for (const [before, after] of [
  ['ot(t,l?l+(1===l?" proyecto":" proyectos"):"libre"', 'ot(t,l?this.countLabel?this.countLabel(this.byPhase[s]||[]):l+(1===l?" proyecto":" proyectos"):"libre"'],
  ['ot(t,d?d+(1===d?" proyecto":" proyectos"):n.sub||"libre"', 'ot(t,d?this.countLabel?this.countLabel(this.byPhase[s]||[]):d+(1===d?" proyecto":" proyectos"):n.sub||"libre"'],
]) {
  if (!source.includes(before) && !source.includes(after)) throw new Error('Rótulo de fase del puerto de Paper FX no encontrado: ' + before);
  source = source.replaceAll(before, after);
}
fs.writeFileSync(file, source);
