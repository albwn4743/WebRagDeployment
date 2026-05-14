const envBase =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  'http://localhost:8000/api';

export function getApiBase() {
  return envBase.replace(/\/$/, '');
}

export async function panelScrape(url, sessionId = null) {
  const res = await fetch(`${getApiBase()}/panel/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, sessionId }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json();
}

export async function panelScrapeStatus(sessionId) {
  const res = await fetch(`${getApiBase()}/panel/scrape/${sessionId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function panelChatStream(message, sessionId, onChunk) {
  const res = await fetch(`${getApiBase()}/panel/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }
  return full;
}
