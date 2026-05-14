import './panelFloat.css';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HiSparkles } from 'react-icons/hi2';
import {
  FiX,
  FiGlobe,
  FiSend,
  FiLoader,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { panelScrape, panelScrapeStatus, panelChatStream } from './panelApi';

function readUrlFromQuery() {
  try {
    const p = new URLSearchParams(window.location.search).get('url');
    return p ? decodeURIComponent(p) : '';
  } catch {
    return '';
  }
}

export default function PanelFloatApp() {
  const [open, setOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState(() => readUrlFromQuery());
  const [manualUrl, setManualUrl] = useState(() => readUrlFromQuery());
  const [sessionId, setSessionId] = useState(null);
  const [scrapeState, setScrapeState] = useState('idle');
  const [scrapeError, setScrapeError] = useState(null);
  const [pageTitle, setPageTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const queryHandled = useRef(false);

  const runScrape = useCallback(async (url) => {
    let u = (url || '').trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    setScrapeState('loading');
    setScrapeError(null);
    try {
      const { sessionId: sid } = await panelScrape(u, null);
      setSessionId(sid);
      await new Promise((resolve, reject) => {
        const iv = setInterval(async () => {
          try {
            const st = await panelScrapeStatus(sid);
            if (st.status === 'success') {
              clearInterval(iv);
              setScrapeState('success');
              setPageTitle(st.stats?.title || u);
              resolve();
            } else if (st.status === 'failed') {
              clearInterval(iv);
              setScrapeState('error');
              setScrapeError(st.error || 'Scrape failed');
              reject(new Error(st.error));
            }
          } catch (err) {
            clearInterval(iv);
            setScrapeState('error');
            setScrapeError(err.message);
            reject(err);
          }
        }, 2000);
      });
    } catch (e) {
      setScrapeState('error');
      setScrapeError(e.message);
    }
  }, []);

  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data;
      if (d && d.type === 'WEBRAG_PANEL_SET_URL' && typeof d.url === 'string') {
        setTargetUrl(d.url);
        setManualUrl(d.url);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    if (queryHandled.current) return;
    const q = readUrlFromQuery().trim();
    if (!q) return;
    queryHandled.current = true;
    setManualUrl(q);
    setTargetUrl(q);
    setOpen(true);
    runScrape(q);
  }, [runScrape]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || scrapeState !== 'success') return;
    const text = input.trim();
    setInput('');
    const uid = Date.now();
    setMessages((m) => [
      ...m,
      { id: uid, role: 'user', content: text },
      { id: uid + 1, role: 'assistant', content: '' },
    ]);
    setSending(true);
    try {
      await panelChatStream(text, sessionId, (full) => {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === uid + 1 ? { ...msg, content: full } : msg
          )
        );
      });
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === uid + 1
            ? { ...msg, content: `Error: ${e.message}`, isError: true }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  const handleRetryScrape = () => {
    setSessionId(null);
    setMessages([]);
    setScrapeState('idle');
    setScrapeError(null);
    const u = manualUrl.trim() || targetUrl.trim();
    if (u) runScrape(u);
  };

  return (
    <div className="pfloat-root">
      {!open && (
        <button
          type="button"
          className="pfloat-fab"
          aria-label="Open assistant"
          onClick={() => setOpen(true)}
        >
          <HiSparkles />
        </button>
      )}

      {open && (
        <>
          <button
            type="button"
            className="pfloat-backdrop"
            aria-label="Close panel"
            onClick={() => setOpen(false)}
          />
          <aside className="pfloat-panel" role="dialog" aria-modal="true">
            <header className="pfloat-head">
              <div className="pfloat-head-title">
                <HiSparkles />
                <span>Page assistant</span>
              </div>
              <button
                type="button"
                className="pfloat-iconbtn"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <FiX />
              </button>
            </header>

            <div className="pfloat-perm">
              The backend fetches this URL with your server (Playwright). Only
              scrape sites you are allowed to use.
            </div>

            <div className="pfloat-urlrow">
              <FiGlobe className="pfloat-url-ico" />
              <input
                className="pfloat-input"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://…"
                disabled={scrapeState === 'loading'}
                spellCheck={false}
              />
              <button
                type="button"
                className="pfloat-btn pfloat-btn-primary"
                disabled={scrapeState === 'loading' || !manualUrl.trim()}
                onClick={() => runScrape(manualUrl)}
              >
                {scrapeState === 'loading' ? (
                  <>
                    <FiLoader className="pfloat-spin" /> Scraping…
                  </>
                ) : (
                  'Scrape'
                )}
              </button>
            </div>

            {scrapeState === 'success' && (
              <div className="pfloat-status pfloat-ok">
                <FiCheck /> Ready · {pageTitle}
              </div>
            )}
            {scrapeState === 'error' && scrapeError && (
              <div className="pfloat-status pfloat-err">
                <FiAlertCircle /> {scrapeError}
                <button
                  type="button"
                  className="pfloat-linkbtn"
                  onClick={handleRetryScrape}
                >
                  Retry
                </button>
              </div>
            )}

            <div className="pfloat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`pfloat-msg pfloat-msg-${msg.role}`}
                >
                  {msg.role === 'user' ? (
                    <div className="pfloat-msg-user">
                      <div className="pfloat-bubble-user">{msg.content}</div>
                    </div>
                  ) : (
                    <div
                      className={`pfloat-bubble-ai ${msg.isError ? 'pfloat-errbubble' : ''}`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || (sending ? '…' : '')}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className="pfloat-foot">
              <textarea
                className="pfloat-ta"
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  scrapeState === 'success'
                    ? 'Ask about this page…'
                    : 'Scrape first…'
                }
                disabled={scrapeState !== 'success' || sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                type="button"
                className="pfloat-send"
                disabled={
                  scrapeState !== 'success' || !input.trim() || sending
                }
                onClick={handleSend}
                aria-label="Send"
              >
                <FiSend />
              </button>
            </footer>
          </aside>
        </>
      )}
    </div>
  );
}
