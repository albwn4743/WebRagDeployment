const DEFAULT_ORIGIN = 'http://localhost:5173';

function setWarn(text) {
  const el = document.getElementById('sp-warn');
  if (!text) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = text;
}

function panelPath(origin) {
  const o = origin.replace(/\/$/, '');
  return `${o}/panel-float`;
}

async function getOrigin() {
  const { panelAppOrigin } = await chrome.storage.sync.get('panelAppOrigin');
  const raw = (panelAppOrigin || DEFAULT_ORIGIN).trim();
  return raw.replace(/\/$/, '');
}

async function applyActiveTab() {
  const origin = await getOrigin();
  const frame = document.getElementById('sp-frame');
  const tabLabel = document.getElementById('sp-tab');

  const res = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_PAGE_URL' });

  if (res.reason === 'restricted' || !res.url) {
    tabLabel.textContent = res.title || '(no page)';
    tabLabel.title = '';
    setWarn(
      res.reason === 'restricted'
        ? 'This tab cannot be scraped (Chrome internal or special URL). Open a normal website, then click “Use this tab”.'
        : 'No active tab URL. Focus a browser tab with a website and try again.'
    );
    frame.src = panelPath(origin);
    return;
  }

  setWarn('');
  tabLabel.textContent = res.title || res.url;
  tabLabel.title = res.url;
  const u = encodeURIComponent(res.url);
  frame.src = `${panelPath(origin)}?url=${u}`;
}

document.getElementById('sp-use-tab').addEventListener('click', () => {
  applyActiveTab();
});

applyActiveTab();
