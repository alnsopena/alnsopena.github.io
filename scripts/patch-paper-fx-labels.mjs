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
// Mi muelle passport. Each entry lists the vendor text, any earlier patched text and, last, the current text.
const passport = [
  // Figures: the same labels on desktop and mobile, singular when the count is 1. pasaporte.figures (pmo-art.js) may
  // name them with the portal's vocabulary; a long label wraps inside its column instead of running into the next.
  ['Cifras del pasaporte', [
    'const C=[[h.active?h.active.length:0,"activos"],[h.done?h.done.length:0,u?"ejecutados":"ejecutados "+(h.year||"")],[h.decide||0,u?"por decidir":"esperan decisión"]]',
    'const C=[[h.active?h.active.length:0,"activos"],[h.done?h.done.length:0,u?"entregados":"entregados "+(h.year||"")],[h.decide||0,u?"por decidir":"esperan decisión"]]',
    'const C=h.figures||[[h.active?h.active.length:0,h.active&&1===h.active.length?"activo":"activos"],[h.done?h.done.length:0,(h.done&&1===h.done.length?"entregado":"entregados")+" en "+(h.year||"")],[h.decide||0,1===h.decide?"espera decisión":"esperan decisión"]]']],
  ['Rótulo de las cifras', [
    'f(t[1],s,d.y+(u?196:208),{size:10.5,w:700,col:r.inkSoft})',
    'Dt(l,t[1],(d.w-44)/3-8,"700 10.5px Figtree, sans-serif").forEach((x,k)=>f(x,s,d.y+(u?196:208)+13*k,{size:10.5,w:700,col:r.inkSoft}))']],
  // Stamp names: scene.stampLines(ctx, name, r) may return {ls, font, y, step} so a long name is not cut after two lines.
  ['Nombre del sello', [
    'a=Dt(e,Pt(c.name),1.5*i,o).slice(0,2);e.font=o,a.forEach((t,s)=>e.fillText(t,0,.08*-i+s*i*.24))',
    'a=this.stampLines&&this.stampLines(e,Pt(c.name),i)||{ls:Dt(e,Pt(c.name),1.5*i,o).slice(0,2),font:o,y:.08*-i,step:.24*i};e.font=a.font,a.ls.forEach((t,s)=>e.fillText(t,0,a.y+s*a.step))']],
  // Stamp inks: red is the portal's alert color, so that stamp is drawn in the action blue instead.
  ['Tinta de los sellos', [
    '$t=["#2F755F","#1F5E7A","#8E3B2F","#6E5C83","#9C7550"]',
    '$t=["#2F755F","#1F5E7A","#003D53","#6E5C83","#9C7550"]']],
  // Stamp tooltip and accessible label: "Entregado el 21 set. 2026", or "Entregado en 2026" when only the year is known.
  ['Tooltip del sello', [
    '"Ejecutado"+(t.closedLabel?" el "+et(t.closedLabel):"")',
    String.raw`"Entregado"+(t.closedLabel?(/^\d{4}$/.test(t.closedLabel)?" en ":" el ")+et(t.closedLabel):"")`]],
  ['Etiqueta accesible del sello', [
    '", entregado "+(t.closedLabel||"")',
    String.raw`", entregado "+(t.closedLabel?(/^\d{4}$/.test(t.closedLabel)?"en ":"el ")+t.closedLabel:"")`]],
];
for (const [label, versions] of passport) {
  const current = versions[versions.length - 1];
  for (const before of versions.slice(0, -1)) source = source.replaceAll(before, current);
  if (!source.includes(current)) throw new Error(label + ' de Paper FX no encontrado');
}
fs.writeFileSync(file, source);
