chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('panelAppOrigin', (data) => {
    if (!data.panelAppOrigin) {
      chrome.storage.sync.set({ panelAppOrigin: 'http://localhost:5173' });
    }
  });
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_ACTIVE_PAGE_URL') return;

  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.url) {
      sendResponse({ url: '', title: '', reason: 'no-tab' });
      return;
    }
    const u = tab.url;
    if (!/^https?:\/\//i.test(u)) {
      sendResponse({
        url: '',
        title: tab.title || '',
        reason: 'restricted',
      });
      return;
    }
    sendResponse({ url: u, title: tab.title || '' });
  });

  return true;
});
