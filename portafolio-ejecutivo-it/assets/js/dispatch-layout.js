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
  // Short card: the action keeps three lines and the full text stays in the project sheet (click on the card).
  const ACTION_LINES = 3, ACTION_FONT = '600 12px Figtree, "Segoe UI", sans-serif';
  // Solid paper and darker ribbons keep every text at 4.5:1 or more over the cork desk.
  const INK = { body: '#FFFDF8', hot: '#FFF6E2', title: '#162631', soft: '#3A4E5B', meta: '#4F5F69', action: '#003D53', alert: '#8E2F22', alertBg: '#FBE3DC', alertLine: '#B2493A', chip: '#E8F0F2' };
  const RIBBON = { block: '#A63F31', risk: '#8A5A10', late: '#9E4A2B' }, RIBBON_LABEL = { block: 'BLOQUEO', risk: 'RIESGO', late: 'FIN PLAN VENCIDO' };
  function clip(ctx, text, width, font) {
    ctx.save(); ctx.font = font;
    let value = String(text || '');
    if (ctx.measureText(value).width > width) { while (value && ctx.measureText(value + '…').width > width) value = value.slice(0, -1).trimEnd(); value += '…'; }
    ctx.restore();
    return value;
  }
  function actionText(project) { return project.actionText !== undefined ? project.actionText : project.actionOwner; }
  // Owner chip: a missing owner is an alert only when monday reports a risk or a block (same rule as the list).
  function ownerChip(project) {
    if (project.owner) return { text: 'Responsable: ' + project.owner, alert: false };
    return project.owner !== undefined && (project.risk === 'block' || project.risk === 'risk') ? { text: 'Sin responsable', alert: true } : null;
  }
  function metrics(scene, width) {
    const items = scene.items || [], mobile = width < 600;
    const columns = mobile ? 1 : Math.min(Math.max(1, items.length), width < 900 ? 2 : 4);
    const step = (width - 24) / columns, cardWidth = Math.min(250, step - 22);
    const heights = {}, actions = {}, more = {}, chips = {}, dateOffsets = {}, positions = {};
    let top = 24;
    for (let row = 0; row < items.length; row += columns) {
      let rowHeight = 0;
      const ids = [];
      for (let column = 0; column < columns && row + column < items.length; column++) {
        const project = items[row + column], id = String(project.id);
        const titleLines = lines(scene.ctx, project.name, cardWidth - 22, '800 14px Figtree, "Segoe UI", sans-serif').length;
        const all = lines(scene.ctx, actionText(project) || 'Sin acción registrada', cardWidth - 22, ACTION_FONT);
        actions[id] = all.slice(0, ACTION_LINES); more[id] = all.length > ACTION_LINES;
        if (more[id]) actions[id][ACTION_LINES - 1] = clip(scene.ctx, actions[id][ACTION_LINES - 1] + ' …', cardWidth - 22, ACTION_FONT);
        chips[id] = ownerChip(project);
        if (chips[id]) chips[id].text = clip(scene.ctx, chips[id].text, cardWidth - 40, '800 11px Figtree, "Segoe UI", sans-serif');
        let bottom = 44 + 17 * titleLines + 73 + 16 * (actions[id].length - 1);
        if (more[id]) bottom += 16;
        if (chips[id]) bottom += 30;
        heights[id] = bottom + 14;
        dateOffsets[id] = 70 + 17 * titleLines;
        rowHeight = Math.max(rowHeight, heights[id]);
        ids.push([id, column]);
      }
      // Cards of the same row share one height, so the desk reads as a grid.
      ids.forEach(([id, column]) => { heights[id] = rowHeight; positions[id] = { x: 12 + step * (column + .5), y: top + rowHeight / 2, a: 0 }; });
      top += rowHeight + 26;
    }
    return { mobile, cardWidth, heights, actions, more, chips, dateOffsets, positions, height: items.length ? top : 260 };
  }
  function height(scene, width) { return metrics(scene, width).height; }
  function layout(scene) {
    const m = metrics(scene, scene.w);
    scene.tools = 0; scene.mob = m.mobile;
    scene.card = { w: m.cardWidth, h: 150 };
    scene.pos = m.positions; scene.detailHeights = m.heights;
    scene.detailActions = m.actions; scene.detailMore = m.more; scene.detailChips = m.chips; scene.detailDateOffsets = m.dateOffsets;
  }
  function box(ctx, x, y, w, h, radii) {
    if (typeof ctx.beginPath === 'function') ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, radii); else if (typeof ctx.rect === 'function') ctx.rect(x, y, w, h);
  }
  function fill(ctx) { if (typeof ctx.fill === 'function') ctx.fill(); }
  function draw(scene, pen, project, left, top, width, contentY, palette) {
    const ctx = pen.ctx, id = String(project.id), cardHeight = scene.detailHeights?.[id] || scene.card?.h || 150;
    const hot = typeof scene.isHot === 'function' && scene.isHot(id), titleLines = Math.max(1, Math.round((contentY - top - 44) / 17));
    // This slot follows the title, reasons and sponsor/PM lines.
    scene.detailDateOffsets[id] = contentY - top + 25;
    ctx.save(); ctx.globalAlpha = pen.alpha; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // Solid paper over the textured card, then the same texts in high-contrast ink.
    ctx.fillStyle = hot ? INK.hot : INK.body; box(ctx, left + 1.2, top + 21, width - 2.4, cardHeight - 22.2, [0, 0, 3, 3]); fill(ctx);
    ctx.fillStyle = RIBBON[project.risk] || '#3E6576'; box(ctx, left + 1, top + 1, width - 2, 20.5, [3, 3, 0, 0]); fill(ctx);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '900 10px Figtree, "Segoe UI", sans-serif';
    ctx.fillText(RIBBON_LABEL[project.risk] || 'ATENCIÓN', left + 10, top + 15);
    ctx.textAlign = 'right'; ctx.font = '700 9.5px Figtree, "Segoe UI", sans-serif'; ctx.fillText('EXP. ' + id.slice(-4), left + width - 10, top + 15); ctx.textAlign = 'left';
    let size = 14, title = lines(ctx, project.name, width - 22, '800 14px Figtree, "Segoe UI", sans-serif');
    while (title.length > titleLines && size > 11) { size--; title = lines(ctx, project.name, width - 22, '800 ' + size + 'px Figtree, "Segoe UI", sans-serif'); }
    if (title.length > titleLines) { title = title.slice(0, titleLines); title[titleLines - 1] = clip(ctx, title[titleLines - 1] + ' …', width - 22, '800 ' + size + 'px Figtree, "Segoe UI", sans-serif'); }
    ctx.fillStyle = INK.title; ctx.font = '800 ' + size + 'px Figtree, "Segoe UI", sans-serif';
    title.forEach((text, index) => ctx.fillText(text, left + 11, top + 42 + 17 * index));
    const reasons = (project.reasons || []).map(text => String(text).replace(/^[^:]+:\s*/, '')).join(' · ');
    ctx.fillStyle = INK.soft; ctx.font = '600 11.5px Figtree, "Segoe UI", sans-serif';
    if (reasons) ctx.fillText(clip(ctx, reasons, width - 22, ctx.font), left + 11, contentY);
    const people = [project.sponsorName && 'Sponsor ' + String(project.sponsorName).split(' ')[0], project.pmFirst && 'PM ' + String(project.pmFirst).split(' ')[0]].filter(Boolean).join(' · ');
    ctx.fillStyle = INK.meta; ctx.font = '600 10.5px Figtree, "Segoe UI", sans-serif';
    if (people) ctx.fillText(clip(ctx, people, width - 22, ctx.font), left + 11, contentY + 15);
    ctx.restore();
    pen.line([[left + 11, contentY + 43], [left + width - 11, contentY + 43]], { unit: 1, sw: .8, curv: 0, col: palette.inkSoft });
    ctx.save(); ctx.globalAlpha = pen.alpha; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = palette.inkSoft; ctx.font = '800 10.5px Figtree, "Segoe UI", sans-serif';
    ctx.fillText('Acción:', left + 11, contentY + 57);
    const actions = scene.detailActions[id] || [];
    ctx.fillStyle = actionText(project) ? palette.navy3 : INK.meta; ctx.font = ACTION_FONT;
    actions.forEach((text, index) => ctx.fillText(text, left + 11, contentY + 73 + index * 16));
    let y = contentY + 73 + 16 * (actions.length - 1);
    if (scene.detailMore?.[id]) {
      y += 16; ctx.fillStyle = INK.action; ctx.font = '800 11.5px Figtree, "Segoe UI", sans-serif';
      const label = 'Ver más en la ficha ›'; ctx.fillText(label, left + 11, y);
      if (typeof ctx.fillRect === 'function') ctx.fillRect(left + 11, y + 2.5, ctx.measureText(label).width, 1);
    }
    const chip = scene.detailChips?.[id];
    if (chip) {
      const chipTop = y + 9; ctx.font = '800 11px Figtree, "Segoe UI", sans-serif';
      const chipWidth = Math.min(width - 22, ctx.measureText(chip.text).width + 18);
      ctx.fillStyle = chip.alert ? INK.alertBg : INK.chip; box(ctx, left + 11, chipTop, chipWidth, 20, 10); fill(ctx);
      if (chip.alert && typeof ctx.stroke === 'function') { ctx.strokeStyle = INK.alertLine; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = chip.alert ? INK.alert : INK.action; ctx.fillText(chip.text, left + 20, chipTop + 14);
    }
    ctx.restore();
  }
  return { lines, metrics, height, layout, draw };
});
