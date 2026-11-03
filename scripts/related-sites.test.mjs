import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const context = { module: { exports: {} }, URL };
vm.runInNewContext(fs.readFileSync(new URL('portafolio-ejecutivo-it/assets/js/related-sites.js', root), 'utf8'), context);
const model = context.module.exports;
const board = { columns: [{ id: model.columnId, title: 'Webs relacionadas', type: 'long_text' }] };
const item = value => ({ id: '11041978965', name: 'Cosmos Connect', column_values: { [model.columnId]: value } });
test('one, multiple and later-edited monday links are read without mutating business data', () => {
  const data = item('Incidencias | https://example.com/\nPruebas | https://example.com/pruebas'), original = JSON.stringify(data);
  const result = model.project(data, board);
  assert.equal(result.sites.length, 2); assert.equal(result.sites[1].label, 'Pruebas'); assert.equal(JSON.stringify(data), original);
  data.column_values[model.columnId] = 'Otro recurso | https://example.org/';
  assert.equal(model.project(data, board).sites[0].host, 'example.org');
  assert.equal(model.project(data, board).sites.length, 1);
});
test('handles monday display text, typed long text, serialized raw values and renamed column IDs', () => {
  for (const value of ['Sitio | https://example.com/', { text: 'Sitio | https://example.com/' }, JSON.stringify({ text: 'Sitio | https://example.com/', changed_at: '2026-10-29' })]) assert.equal(model.project(item(value), board).sites[0].label, 'Sitio');
  assert.equal(model.project({ column_values: { replacement: 'Web | https://example.com' } }, { columns: [{ id: 'replacement', title: 'Webs relacionadas' }] }).sites.length, 1);
  assert.equal(model.project({ id: 'old' }, { columns: [] }).sites.length, 0);
});
test('deduplicates canonical URLs, retains distinct views and never manufactures a missing URL', () => {
  const result = model.parse('Primera | https://example.com\nDuplicada | https://example.com/\nVista | https://example.com/#vista\nSin dirección');
  assert.equal(result.sites.length, 2); assert.equal(result.ignored, 1);
  assert.equal(model.parse('https://example.com').sites[0].label, 'example.com');
});
test('rejects unsafe protocols, credentials and local-only URLs including normalized loopback forms', () => {
  for (const s of ['javascript:alert(1)', 'data:text/html,hello', 'file:///C:/x', 'http://127.0.0.1:8765/', 'https://localhost/', 'https://127.0.0.1/', 'https://127.1/', 'https://2130706433/', 'https://0.0.0.0/', 'https://[::1]/', 'https://x.localhost/', 'https://user:password@example.com/', 'https://example.com/\nnext', 'https://example.com/\u0000']) assert.equal(model.safeUrl(s), null, s);
  assert.equal(model.parse('No es web | ftp://example.com').sites.length, 0);
  assert.equal(model.safeUrl('https://example.com/a?x=1&y=2').protocol, 'https:');
});
test('protected Connect app keeps its existing login in a separate tab, and any site can opt out of embedding', () => {
  const connect = model.parse('Incidencias | https://cosmos-monday-proxy.alonsostef2006.workers.dev/').sites[0];
  assert.equal(connect.external, true);
  assert.equal(model.parse('Manual | https://example.com/ | pestaña').sites[0].external, true);
  assert.equal(model.parse('Manual | https://example.com/').sites[0].external, false);
  const markup = model.markup(item('Incidencias | ' + connect.url), board);
  assert.match(markup, /target="_blank" rel="noopener noreferrer"/); assert.doesNotMatch(markup, /data-related-open=/);
});
test('escapes labels, IDs and URLs; hides empty projects and distinguishes internal view from opening a new tab', () => {
  const data = item('<img src=x onerror=alert(1)> | https://example.com/?a=1&b=2');
  const markup = model.markup(data, board);
  assert.match(markup, /&lt;img/); assert.doesNotMatch(markup, /<img/); assert.match(markup, /a=1&amp;b=2/);
  assert.match(markup, /Ver aquí/); assert.match(markup, /Abrir ↗/);
  for (const v of ['', null, '{}', { personsAndTeams: [] }, 'http://localhost']) assert.equal(model.markup(item(v), board), '');
  assert.match(model.shortcut(data, board), /data-related-project="11041978965"/);
  assert.equal(model.shortcut(item(''), board), '');
});
test('integration lazy-loads frames, provides keyboard tabs and refreshes from the shared cut without a separate data connection', () => {
  const html = fs.readFileSync(new URL('portafolio-ejecutivo-it/index.html', root), 'utf8');
  assert.match(html, /projectWebsMarkup\(i\)/); assert.match(html, /projectWebsShortcut\(i\)/);
  const iframe = html.match(/<iframe class="related-web-frame"[^>]+>/)[0];
  assert.doesNotMatch(iframe, /\ssrc=/); assert.match(iframe, /sandbox=/); assert.match(iframe, /referrerpolicy="no-referrer"/);
  const controller = fs.readFileSync(new URL('portafolio-ejecutivo-it/assets/js/portal-related-sites.js', root), 'utf8');
  assert.match(controller, /portfolio:data-updated/); assert.match(controller, /clearFrame\(\)/);
  assert.match(controller, /ArrowLeft/); assert.match(controller, /aria-selected/);
  assert.match(controller.trim(), /\}\)\(\);$/);
  assert.doesNotMatch(controller, /MONDAY_MCP_TOKEN|DASHBOARD_PASSWORD|fetch\(/);
});

test('an open view follows the new monday cut, keeps an unchanged page loaded, and unloads on return or link removal', () => {
  const element = () => ({ hidden: false, textContent: '', innerHTML: '', attributes: {}, listeners: {},
    setAttribute(k, v) { this.attributes[k] = String(v); }, removeAttribute(k) { delete this.attributes[k]; },
    hasAttribute(k) { return Object.hasOwn(this.attributes, k); },
    addEventListener(k, fn) { this.listeners[k] = fn; } });
  const frame = element(), tabs = element(), title = element(), contextLabel = element(), externalLink = element(), loading = element(), panel = element(), protectedNote = element();
  let loads = 0;
  Object.defineProperty(frame, 'src', {set(value) { this.attributes.src = value; loads++; }});
  const nodes = { 'iframe': frame, '[role="tablist"]': tabs, '#project-web-title': title, '.related-web-project': contextLabel,
    '.related-web-open': externalLink, '.related-web-loading': loading, '.related-web-panel': panel, '.related-web-protected': protectedNote };
  const dialog = Object.assign(element(), { open: false, querySelector: selector => nodes[selector],
    showModal() { this.open = true; }, close() { this.open = false; this.listeners.close(); } });
  const handlers = {}, window = { PMORelatedSites: model, addEventListener: (name, fn) => { handlers[name] = fn; } };
  let data = { id: 'p1', name: 'Proyecto', ...model.parse('Primera | https://example.com/a\nSegunda | https://example.com/b') };
  vm.runInNewContext(fs.readFileSync(new URL('portafolio-ejecutivo-it/assets/js/portal-related-sites.js', root), 'utf8'), {
    window, document: { getElementById: () => dialog, addEventListener() {} }, projectRelatedSites: () => data
  });
  assert.equal(loads, 0);
  window.PMORelatedPortal.show('p1', 1);
  assert.equal(frame.attributes.src, 'https://example.com/b'); assert.equal(loads, 1); assert.equal(dialog.open, true);
  data = { ...data, ...model.parse('Nuevo nombre | https://example.com/b\nPrimera | https://example.com/a') };
  handlers['portfolio:data-updated']();
  assert.equal(title.textContent, 'Nuevo nombre'); assert.equal(loads, 1); assert.equal(externalLink.href, 'https://example.com/b');
  data = { ...data, ...model.parse('Reemplazo | https://example.com/c') };
  handlers['portfolio:data-updated']();
  assert.equal(frame.attributes.src, 'https://example.com/c'); assert.equal(loads, 2);
  window.PMORelatedPortal.back();
  assert.equal(dialog.open, false); assert.equal(frame.attributes.src, undefined);
  window.PMORelatedPortal.show('p1', 0);
  data = { ...data, sites: [] }; handlers['portfolio:data-updated']();
  assert.equal(dialog.open, false); assert.equal(frame.attributes.src, undefined);
});

const driveBoard = { columns: [{ id: model.driveColumnId, title: 'Carpeta de Drive', type: 'link' }] };
const driveItem = value => ({ id: 'p1', name: 'Proyecto <seguro>', column_values: { [model.driveColumnId]: value } });
test('Drive link reads typed values, serialized values and raw API URL behind a display label', () => {
  const url = 'https://drive.google.com/drive/folders/verified_ID?resourcekey=keep_me';
  for (const value of [{ url, text: 'Carpeta' }, JSON.stringify({ url, text: 'Carpeta' }), url, 'Carpeta - ' + url]) assert.equal(model.drive(driveItem(value), driveBoard).url, url);
  const raw = [{ id: 'p1', column_values: [{ id: model.driveColumnId, value: JSON.stringify({ url, text: 'Carpeta' }) }] }];
  assert.equal(model.drive(driveItem('Carpeta'), driveBoard, raw).url, url);
  const renamed = { columns: [{ id: 'replacement', title: 'Carpeta de Drive' }] };
  assert.equal(model.drive({ id: 'p1', column_values: { replacement: { url } } }, renamed).url, url);
  assert.equal(model.drive(driveItem('Carpeta'), driveBoard, [{ id: 'p1', column_values: {} }]), null);
});
test('Drive access is hidden when empty, reflects edits and clearing, and preserves the existing websites', () => {
  const raw = [{ id: 'p1', column_values: [{ id: model.driveColumnId, value: JSON.stringify({ url: 'https://drive.google.com/drive/folders/old_ID' }) }] }];
  for (const value of [null, '', undefined]) { assert.equal(model.driveMarkup(driveItem(value), driveBoard, raw), ''); assert.equal(model.driveShortcut(driveItem(value), driveBoard, raw), ''); }
  const data = driveItem({ url: 'https://drive.google.com/drive/u/0/folders/first_ID' });
  assert.match(model.driveMarkup(data, driveBoard), /Abrir carpeta de Drive ↗/);
  data.column_values[model.driveColumnId] = { url: 'https://drive.google.com/open?id=second_ID' };
  assert.match(model.driveShortcut(data, driveBoard), /id=second_ID/);
  assert.match(model.driveMarkup(data, driveBoard), /target="_blank" rel="noopener noreferrer"/);
  assert.match(model.driveMarkup(data, driveBoard), /Proyecto &lt;seguro&gt;/);
  assert.doesNotMatch(model.driveMarkup(data, driveBoard), /iframe|data-related-open/);
  const both = item('Incidencias | https://example.com/'); both.column_values[model.driveColumnId] = data.column_values[model.driveColumnId];
  assert.equal(model.project(both, { columns: [...board.columns, ...driveBoard.columns] }).sites.length, 1);
});
test('Drive access never substitutes another host, a file, an unsafe URL or an ungrounded parent folder', () => {
  for (const url of ['javascript:alert(1)', 'https://drive.google.com.evil.test/drive/folders/x', 'https://example.com/folder', 'https://drive.google.com/file/d/x/view', 'https://drive.google.com/drive/my-drive', 'https://user:password@drive.google.com/drive/folders/x']) assert.equal(model.drive(driveItem({url}), driveBoard), null);
  assert.equal(model.drive({ id: 'old' }, { columns: [] }), null);
  const html = fs.readFileSync(new URL('portafolio-ejecutivo-it/index.html', root), 'utf8');
  assert.match(html, /projectDriveMarkup\(i\)/); assert.match(html, /projectDriveShortcut\(i\)/);
  assert.match(html, /driveMarkup\(item,D\.board,D\.raw_items\)/);
});
