/* Layout option for Paper FX's existing desk. Data, sorting and hit testing stay in Paper FX. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PMODispatchLayout = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function lines(ctx, value, width, font) {
    ctx.save(); ctx.font = font;
    const result = [];
    for (const paragraph of String(value || '').split(/\r?\n/)) {
      let line = '';
      for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
        const candidate = line ? line + ' ' + word : word;
        if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
        if (line) result.push(line);
        line = '';
        for (const char of word) {
          if (line && ctx.measureText(line + char).width > width) { result.push(line); line = ''; }
          line += char;
        }
      }
      result.push(line);
    }
    ctx.restore();
    return result.length ? result : [''];
  }
  function metrics(scene, width) {
    const items = scene.items || [], mobile = width < 600;
    const columns = mobile ? 1 : Math.min(Math.max(1, items.length), width < 900 ? 2 : 4);
    const step = (width - 24) / columns, cardWidth = Math.min(250, step - 22);
    const heights = {}, actions = {}, dateOffsets = {}, positions = {};
    let top = 24;
    for (let row = 0; row < items.length; row += columns) {
      let rowHeight = 0;
      for (let column = 0; column < columns && row + column < items.length; column++) {
        const project = items[row + column], id = String(project.id);
        const titleLines = lines(scene.ctx, project.name, cardWidth - 22, '800 14px Figtree, "Segoe UI", sans-serif').length;
        actions[id] = lines(scene.ctx, project.actionOwner || 'Sin acción registrada', cardWidth - 22, '600 12px Figtree, "Segoe UI", sans-serif');
        heights[id] = 120 + 17 * titleLines + 16 * actions[id].length;
        dateOffsets[id] = 70 + 17 * titleLines;
        positions[id] = { x: 12 + step * (column + .5), y: top + heights[id] / 2, a: 0 };
        rowHeight = Math.max(rowHeight, heights[id]);
      }
      top += rowHeight + 26;
    }
    return { mobile, cardWidth, heights, actions, dateOffsets, positions, height: items.length ? top : 260 };
  }
  function height(scene, width) { return metrics(scene, width).height; }
  function layout(scene) {
    const m = metrics(scene, scene.w);
    scene.tools = 0; scene.mob = m.mobile;
    scene.card = { w: m.cardWidth, h: 150 };
    scene.pos = m.positions; scene.detailHeights = m.heights;
    scene.detailActions = m.actions; scene.detailDateOffsets = m.dateOffsets;
  }
  function draw(scene, pen, project, left, top, width, contentY, palette) {
    const ctx = pen.ctx, id = String(project.id);
    // This slot follows the existing title, reasons and sponsor/PM lines.
    scene.detailDateOffsets[id] = contentY - top + 25;
    pen.line([[left + 11, contentY + 43], [left + width - 11, contentY + 43]], { unit: 1, sw: .8, curv: 0, col: palette.inkSoft });
    ctx.save(); ctx.globalAlpha = pen.alpha; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = palette.inkSoft; ctx.font = '800 10.5px Figtree, "Segoe UI", sans-serif';
    ctx.fillText('Acción:', left + 11, contentY + 57);
    ctx.fillStyle = palette.navy3; ctx.font = '600 12px Figtree, "Segoe UI", sans-serif';
    (scene.detailActions[id] || []).forEach((text, index) => ctx.fillText(text, left + 11, contentY + 73 + index * 16));
    ctx.restore();
  }
  return { lines, metrics, height, layout, draw };
});
