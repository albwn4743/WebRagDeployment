const DEFAULT_ORIGIN = 'http://localhost:5173';

async function load() {
  const { panelAppOrigin } = await chrome.storage.sync.get('panelAppOrigin');
  document.getElementById('origin').value =
    panelAppOrigin || DEFAULT_ORIGIN;
}

document.getElementById('save').addEventListener('click', async () => {
  const status = document.getElementById('status');
  let v = document.getElementById('origin').value.trim().replace(/\/$/, '');
  if (!v) v = DEFAULT_ORIGIN;
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      status.textContent = 'Use http:// or https://';
      return;
    }
  } catch {
    status.textContent = 'Invalid URL';
    return;
  }
  await chrome.storage.sync.set({ panelAppOrigin: v });
  status.textContent = 'Saved. Reload the side panel if it is already open.';
});

load();
