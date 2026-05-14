import { useState, useCallback, useRef } from 'react';
import { scrapeAPI, chatAPI, historyAPI } from '../services/api';

// ── useScrape hook ──
export function useScrape() {
  const [scrapeStatus, setScrapeStatus] = useState(null);
  const [scrapeResult, setScrapeResult] = useState(null);
  const [scrapeError, setScrapeError] = useState(null);

  const scrape = useCallback(async (url, sessionId = null) => {
    setScrapeStatus('loading');
    setScrapeError(null);
    setScrapeResult(null);

    try {
      const initial = await scrapeAPI.scrape(url, sessionId);
      const sid = initial.sessionId;

      return new Promise((resolve) => {
        const interval = setInterval(async () => {
          try {
            const statusResult = await scrapeAPI.getSession(sid);
            if (statusResult.status === 'success') {
              clearInterval(interval);
              setScrapeStatus('success');
              setScrapeResult(statusResult);
              resolve(statusResult);
            } else if (statusResult.status === 'failed') {
              clearInterval(interval);
              setScrapeStatus('error');
              setScrapeError(statusResult.error || 'Scraping failed');
              resolve(null);
            }
            // If status is 'scraping', continue polling
          } catch (e) {
            clearInterval(interval);
            setScrapeStatus('error');
            setScrapeError(e.message);
            resolve(null);
          }
        }, 2000);
      });
    } catch (err) {
      setScrapeStatus('error');
      setScrapeError(err.message);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setScrapeStatus(null);
    setScrapeResult(null);
    setScrapeError(null);
  }, []);

  return { scrapeStatus, scrapeResult, scrapeError, scrape, reset };
}

// ── useChat hook ──
export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (content, sessionId) => {
    if (!content.trim() || !sessionId) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const aiMsgId = Date.now() + 1;
      const initialAiMsg = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        model: 'llama-3.1-8b-instant',
        sources: [],
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, initialAiMsg]);
      setIsLoading(false); // Hide spinner since stream is starting

      const fullContent = await chatAPI.sendStream(content, sessionId, (currentText) => {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId ? { ...msg, content: currentText } : msg
        ));
      });

      return { ...initialAiMsg, content: fullContent };
    } catch (err) {
      setError(err.message);
      const errMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ Error: ${err.message}`,
        isError: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const loadHistory = useCallback((history) => {
    const formatted = history.map((msg, i) => ({
      id: i,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
    setMessages(formatted);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages, loadHistory };
}

// ── useHistory hook ──
export function useHistory() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await historyAPI.getSessions();
      setSessions(result.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await historyAPI.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      return true;
    } catch (err) {
      console.error('Failed to delete session:', err);
      return false;
    }
  }, []);

  const addSession = useCallback((session) => {
    setSessions(prev => {
      const exists = prev.find(s => s.id === session.id);
      if (exists) return prev.map(s => s.id === session.id ? { ...s, ...session } : s);
      return [session, ...prev];
    });
  }, []);

  return { sessions, isLoading, fetchSessions, deleteSession, addSession };
}
