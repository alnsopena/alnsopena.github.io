import { createRoot } from 'react-dom/client';
import DashboardOperativo from './DashboardOperativo';
import './globals.css';
import './embedded.css';
import './dashboard-modes.css';
import { parseOptions } from './dashboard-model';

const embedded = window.parent !== window;
const options = parseOptions(location.search);
document.documentElement.classList.toggle('is-embedded', embedded);
document.documentElement.classList.toggle('is-tv', options.tv);
const root = document.getElementById('root')!;
createRoot(root).render(<DashboardOperativo embedded={embedded} options={options} editorMode={!options.tv && new URLSearchParams(location.search).get('editor') === '1'} />);

if (embedded) {
  let scheduled = false;
  let lastHeight = 0;
  const reportHeight = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const height = Math.ceil(Math.max(root.getBoundingClientRect().height, root.scrollHeight));
      if (height > 0 && height !== lastHeight) {
        lastHeight = height;
        parent.postMessage({ type: 'cosmos-dashboard-height', height }, location.origin);
      }
    });
  };
  new ResizeObserver(reportHeight).observe(root);
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type !== 'cosmos-dashboard-viewport') return;
    const { top, height } = event.data;
    if (!Number.isFinite(top) || !Number.isFinite(height) || top < 0 || height < 0) return;
    root.style.setProperty('--embed-view-top', `${top}px`);
    root.style.setProperty('--embed-view-height', `${height}px`);
  });
  document.fonts.ready.then(reportHeight);
  window.addEventListener('resize', reportHeight, { passive: true });
  reportHeight();
}
