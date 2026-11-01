(() => {
  'use strict';
  const frame = document.getElementById('operationalDashboard');
  const screen = document.getElementById('screenDashboard');
  let previousOverflow = null;
  let scheduled = false;
  const mobile = () => window.matchMedia('(max-width: 700px)').matches;
  function sendChanges() {
    if (frame.hasAttribute('src')) frame.contentWindow.postMessage({type:'cosmos-dashboard-changes',enabled:document.body.classList.contains('chg-on')},location.origin);
  }

  function unlockPage() {
    if (previousOverflow !== null) {
      document.body.style.overflow = previousOverflow;
      previousOverflow = null;
    }
  }

  function reportViewport() {
    if (scheduled || !frame.hasAttribute('src')) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const rect = frame.getBoundingClientRect();
      const top = Math.max(0, -rect.top);
      const bottom = Math.min(rect.height, window.innerHeight - rect.top);
      frame.contentWindow.postMessage({
        type: 'cosmos-dashboard-viewport', top, height: Math.max(0, bottom - top),
      }, location.origin);
    });
  }

  window.openOperationalDashboard = function () {
    document.getElementById('ccDropdown').classList.remove('show');
    document.getElementById('stepsNav').style.display = 'none';
    if (!frame.hasAttribute('src')) {
      const url = new URL(frame.dataset.src,location.href);
      const site = new URLSearchParams(location.search).get('sede');
      if (site === 'paita') url.searchParams.set('sede',site);
      if (new URLSearchParams(location.search).get('fecha') === 'real') url.searchParams.set('fecha','real');
      frame.setAttribute('src',url.href);
    }
    showScreen('screenDashboard');
    history.replaceState(null, '', location.pathname + location.search + '#dashboard');
    reportViewport();
    sendChanges();
  };

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (mobile() && data?.type === 'cosmos-dashboard-height' && Number.isFinite(data.height) && data.height > 0 && data.height < 20000) {
      frame.style.height = `${Math.ceil(data.height) + 2}px`;
      reportViewport();
    }
    if(data?.type === 'cosmos-dashboard-ready') sendChanges();
    if(data?.type === 'cosmos-dashboard-set-changes' && typeof data.enabled === 'boolean') {
      if(document.body.classList.contains('chg-on') !== data.enabled) toggleChg();
      sendChanges();
    }
    if (data?.type === 'cosmos-dashboard-overlay' && typeof data.open === 'boolean') {
      if (data.open && screen.classList.contains('active')) {
        if (previousOverflow === null) previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      } else unlockPage();
      reportViewport();
    }
  });
  window.addEventListener('scroll', reportViewport, { passive: true });
  window.addEventListener('resize', () => { if(!mobile()) frame.style.height='100%'; reportViewport(); }, { passive: true });
  frame.addEventListener('load', () => { reportViewport(); sendChanges(); });
  new MutationObserver(sendChanges).observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('storage',(event)=>{
    if(event.key === 'pdaChg' && document.body.classList.contains('chg-on') !== (event.newValue !== '0')) toggleChg();
  });

  const mobileButton = document.createElement('button');
  mobileButton.type = 'button';
  mobileButton.className = 'dashboard-mobile-link';
  mobileButton.textContent = 'Dashboard';
  mobileButton.addEventListener('click', () => {
    if (screen.classList.contains('active')) {
      if (state.categoryType) backToLanding();
      else showScreen('screenType');
    }
    else openOperationalDashboard();
  });
  document.getElementById('ccPagebar').append(mobileButton);
  window.addEventListener('cosmos:pda-screen', (event) => {
    const active = event.detail === 'screenDashboard';
    document.body.classList.toggle('operational-dashboard-active',active);
    if(active&&!mobile()) frame.style.height='100%';
    mobileButton.textContent = active ? 'Volver a PDA' : 'Dashboard';
    if (!active) unlockPage();
    else reportViewport();
  });
  if (location.hash === '#dashboard') openOperationalDashboard();
})();
