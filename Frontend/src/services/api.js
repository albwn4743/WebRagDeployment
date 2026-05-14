import axios from 'axios';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
});


api.interceptors.request.use(
  config => config,
  error => Promise.reject(error)
);

api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    throw new Error(message);
  }
);


export const scrapeAPI = {
  scrape: (url, depth = 1, sessionId = null) =>
    api.post('/scrape', { url, depth, sessionId }),

  getSession: (sessionId) =>
    api.get(`/scrape/${sessionId}`),
};


export const chatAPI = {
  send: (message, sessionId) =>
    api.post('/chat', { message, sessionId }),

  sendStream: async (message, sessionId, onChunk) => {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId })
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      if (onChunk) onChunk(fullText);
    }
    
    return fullText;
  }
};

// ── History API ──
export const historyAPI = {
  getSessions: () =>
    api.get('/history'),

  getSessionHistory: (sessionId) =>
    api.get(`/history/${sessionId}`),

  deleteSession: (sessionId) =>
    api.delete(`/chat/${sessionId}`),

  clearHistory: (sessionId) =>
    api.delete(`/chat/${sessionId}/history`),
};

export default api;
