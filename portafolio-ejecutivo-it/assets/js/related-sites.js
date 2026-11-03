/* Webs por proyecto: configuración de monday, sin consultas a una IA. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PMORelatedSites = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const columnId = 'long_text_mm8k6c9s';
  const driveColumnId = 'link_mm8r9xq2';
  // This existing app uses an authenticated session. Keep its login in its own
  // tab, without weakening cookies or changing the app's access settings.
  const separateTabHosts = new Set(['cosmos-monday-proxy.alonsostef2006.workers.dev']);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function text(value) {
    if (value && typeof value === 'object') return typeof value.text === 'string' ? value.text : '';
    const s = String(value ?? '');
    if (s.trim().startsWith('{')) { try { const v = JSON.parse(s); return typeof v.text === 'string' ? v.text : ''; } catch { return ''; } }
    return s;
  }
  function safeUrl(value) {
    const s = String(value ?? '').trim();
    if (!/^https:\/\//i.test(s) || /[\u0000-\u0020\u007f]/.test(s)) return null;
    try {
      const url = new URL(s), host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || url.username || url.password || !host || host === 'localhost' || host.endsWith('.localhost') || /^127\./.test(host) || host === '0.0.0.0' || host === '[::1]') return null;
      return url;
    } catch { return null; }
  }
  function parse(value) {
    const sites = [], seen = new Set();
    let ignored = 0;
    for (const raw of text(value).split(/\r?\n/)) {
      const line = raw.trim(); if (!line) continue;
      const separator = line.indexOf('|');
      const label = separator < 0 ? '' : line.slice(0, separator).trim();
      const parts = (separator < 0 ? line : line.slice(separator + 1)).split(/\s+\|\s+/);
      const url = safeUrl(parts[0]);
      if (!url) { ignored++; continue; }
      const mode = (parts[1] ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      if (mode && !['pestana', 'externa'].includes(mode)) { ignored++; continue; }
      if (seen.has(url.href)) continue;
      seen.add(url.href);
      sites.push({ label: label || url.hostname, url: url.href, host: url.hostname,
        external: separateTabHosts.has(url.hostname) || Boolean(mode) });
    }
    return { sites, ignored };
  }
  function project(item, board) {
    const columns = board?.columns ?? [];
    const column = columns.find(c => c.id === columnId) ?? columns.find(c => String(c.title ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === 'webs relacionadas');
    return parse(item?.column_values?.[column?.id ?? columnId]);
  }
  function markup(item, board) {
    const result = project(item, board);
    if (!result.sites.length) return '';
    const cards = result.sites.map((site, index) => '<li class="related-site"><div class="related-site-info"><strong>' + escape(site.label) + '</strong><span>' + escape(site.host) + '</span></div><div class="related-site-actions">'
      + (!site.external ? '<button type="button" class="related-site-view" data-related-open="' + escape(item.id) + '" data-related-index="' + index + '">Ver aquí</button>' : '')
      + '<a class="related-site-external" href="' + escape(site.url) + '" target="_blank" rel="noopener noreferrer" aria-label="Abrir ' + escape(site.label) + ' en otra pestaña">Abrir ↗</a></div></li>').join('');
    return '<section class="fieldgroup related-sites" data-project-webs="' + escape(item.id) + '" aria-label="Webs relacionadas"><h3>Webs relacionadas</h3><ul>' + cards + '</ul></section>';
  }
  function shortcut(item, board) {
    const n = project(item, board).sites.length;
    return n ? '<button type="button" class="related-sites-shortcut" data-related-project="' + escape(item.id) + '" aria-label="Webs relacionadas de ' + escape(item.name) + '">Webs <span>' + n + '</span> ↗</button>' : '';
  }
  function linkValue(value) {
    if (typeof value === 'string') {
      const s = value.trim();
      if (s.startsWith('{')) { try { return linkValue(JSON.parse(s)); } catch { return null; } }
      const display = s.match(/^(.*?) - (https:\/\/\S+)$/);
      if (display) return { url: display[2], text: display[1] };
      return /^https?:\/\//i.test(s) ? { url: s, text: '' } : null;
    }
    return value && typeof value === 'object' && typeof value.url === 'string' ? value : null;
  }
  function drive(item, board, rawItems) {
    const col = (board?.columns ?? []).find(c => c.id === driveColumnId)
      ?? (board?.columns ?? []).find(c => String(c.title ?? '').toLowerCase().trim() === 'carpeta de drive');
    const id = col?.id ?? driveColumnId, values = item?.column_values ?? {}, value = values[id];
    if (Object.hasOwn(values, id) && (value == null || value === '')) return null;
    let candidate = linkValue(value);
    if (!candidate) {
      const raw = (Array.isArray(rawItems) ? rawItems : []).find(r => String(r.id) === String(item?.id));
      const cell = (Array.isArray(raw?.column_values) ? raw.column_values : []).find(c => c.id === id);
      candidate = linkValue(cell?.value) ?? linkValue(cell?.text);
    }
    const url = safeUrl(candidate?.url);
    if (!url || url.hostname !== 'drive.google.com' ||
        !(/^\/drive\/(?:u\/\d+\/)?folders\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
          || (url.pathname === '/open' && /^[A-Za-z0-9_-]+$/.test(url.searchParams.get('id') ?? '')))) return null;
    return { url: url.href, label: typeof candidate.text === 'string' ? candidate.text : '' };
  }
  function driveLink(item, board, rawItems, compact) {
    const folder = drive(item, board, rawItems); if (!folder) return '';
    return '<a class="' + (compact ? 'related-sites-shortcut project-drive-shortcut' : 'related-site-external project-drive-link')
      + '" href="' + escape(folder.url) + '" target="_blank" rel="noopener noreferrer" aria-label="Abrir carpeta de Drive de ' + escape(item.name) + '">'
      + '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7V5h7l2 3h9v12H3Z"/></svg>'
      + (compact ? 'Drive ↗' : 'Abrir carpeta de Drive ↗') + '</a>';
  }
  function driveMarkup(item, board, rawItems) {
    const link = driveLink(item, board, rawItems, false);
    return link ? '<section class="fieldgroup project-drive" aria-label="Carpeta del proyecto"><h3>Carpeta del proyecto</h3>' + link + '</section>' : '';
  }
  return Object.freeze({ columnId, driveColumnId, safeUrl, parse, project, markup, shortcut, escape, drive, driveMarkup,
    driveShortcut: (item, board, rawItems) => driveLink(item, board, rawItems, true) });
});
