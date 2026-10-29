(function () {
  'use strict';
  if (!window.PMORelatedSites || typeof projectRelatedSites !== 'function') return;
  const model = window.PMORelatedSites;
  const dialog = document.getElementById('project-web-dialog');
  if (!dialog) return;
  const frame = dialog.querySelector('iframe');
  const tabs = dialog.querySelector('[role="tablist"]');
  const title = dialog.querySelector('#project-web-title');
  const context = dialog.querySelector('.related-web-project');
  const open = dialog.querySelector('.related-web-open');
  const loading = dialog.querySelector('.related-web-loading');
  const panel = dialog.querySelector('.related-web-panel');
  const external = dialog.querySelector('.related-web-protected');
  let selection = null;
  function clearFrame() { frame.removeAttribute('src'); frame.title = ''; frame.hidden = true; panel.removeAttribute('aria-busy'); loading.hidden = true; }
  function activate(index, keepFrame) {
    const data = projectRelatedSites(selection.id);
    if (!data || !data.sites.length) { dialog.close(); return; }
    const n = Math.max(0, Math.min(index, data.sites.length - 1));
    const site = data.sites[n], previousUrl = selection.url;
    selection = { id: selection.id, index: n, url: site.url };
    title.textContent = site.label; context.textContent = data.name;
    open.href = site.url; open.setAttribute('aria-label', 'Abrir ' + site.label + ' en otra pestaña');
    tabs.innerHTML = data.sites.map((s, i) => '<button type="button" role="tab" id="related-web-tab-' + i + '" aria-controls="related-web-panel" aria-selected="' + (i === n) + '" tabindex="' + (i === n ? 0 : -1) + '" data-related-tab="' + i + '">' + model.escape(s.label) + '</button>').join('');
    tabs.hidden = data.sites.length < 2;
    panel.setAttribute('aria-labelledby', 'related-web-tab-' + n);
    external.hidden = !site.external;
    if (site.external) { clearFrame(); return; }
    if (keepFrame && previousUrl === site.url && frame.hasAttribute('src')) return;
    clearFrame(); frame.title = site.label + ' · ' + data.name; frame.hidden = false;
    loading.hidden = false; panel.setAttribute('aria-busy', 'true'); frame.src = site.url;
  }
  function show(id, index) {
    const data = projectRelatedSites(id);
    if (!data?.sites.length) return;
    selection = { id: String(id), index: Number(index) || 0, url: '' };
    activate(selection.index, false);
    if (!dialog.open) dialog.showModal();
  }
  function back() { if (dialog.open) dialog.close(); }
  frame.addEventListener('load', function () { loading.hidden = true; panel.removeAttribute('aria-busy'); });
  dialog.addEventListener('close', function () { clearFrame(); selection = null; tabs.innerHTML = ''; });
  dialog.addEventListener('click', function (event) {
    const tab = event.target.closest('[data-related-tab]');
    if (tab && selection) { activate(Number(tab.dataset.relatedTab), false); dialog.querySelector('[role="tab"][aria-selected="true"]')?.focus(); }
    if (event.target.closest('[data-related-close]') || event.target === dialog) back();
  });
  tabs.addEventListener('keydown', function (event) {
    if (!selection || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const count = projectRelatedSites(selection.id)?.sites.length ?? 0; if (!count) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (selection.index + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
    activate(next, false); dialog.querySelector('[role="tab"][aria-selected="true"]')?.focus();
  });
  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-related-open]');
    if (button) { show(button.dataset.relatedOpen, button.dataset.relatedIndex); return; }
    const shortcut = event.target.closest('[data-related-project]');
    if (!shortcut) return;
    openProject(shortcut.dataset.relatedProject);
    document.querySelector('[data-project-webs="' + CSS.escape(shortcut.dataset.relatedProject) + '"]')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
  window.addEventListener('portfolio:data-updated', function () {
    if (!selection || !dialog.open) return;
    const data = projectRelatedSites(selection.id);
    const index = data?.sites.findIndex(site => site.url === selection.url) ?? -1;
    if (!data?.sites.length) back(); else activate(index < 0 ? 0 : index, true);
  });
  window.PMORelatedPortal = Object.freeze({ show, back });
})();
