import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiGlobe, FiTrash2, FiRefreshCw, FiMenu, FiX,
  FiMessageSquare
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import Sidebar from '../components/Sidebar';
import ScrapePanel from '../components/ScrapePanel';
import ChatMessage, { TypingIndicator } from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import { useChat, useScrape, useHistory } from '../hooks/useChat';
import '../styles/chat.css';
import '../styles/components.css';

function WelcomeScreen() {
  return (
    <div className="chat-welcome">
      <div className="welcome-icon">🌐</div>
      <h2 className="welcome-title">Chat with Any Website</h2>
      <p className="welcome-subtitle">
        Enter a URL above to scrape website content, then ask questions about it.<br></br>
        It scrapes Maximum of 30 Web Pages.
      </p>
    </div>
  );
}

function ChatApp({ onBack }) {
  const [activeSession, setActiveSession] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const { messages, isLoading, sendMessage, clearMessages, loadHistory } = useChat();
  const { scrapeStatus, scrapeResult, scrapeError, scrape, reset: resetScrape } = useScrape();
  const { sessions, fetchSessions, deleteSession, addSession } = useHistory();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Handle scrape success — create new session
  useEffect(() => {
    if (scrapeStatus === 'success' && scrapeResult) {
      const session = {
        id: scrapeResult.sessionId,
        url: scrapeResult.stats.url,
        title: scrapeResult.stats.title,
        pageCount: scrapeResult.stats.pagesScraped,
        chunkCount: scrapeResult.stats.chunksCreated,
        messageCount: 0,
        createdAt: new Date().toISOString()
      };
      setActiveSession(session);
      addSession(session);
      clearMessages();
    }
  }, [scrapeStatus, scrapeResult]);

  const handleScrape = useCallback(async (url, depth) => {
    const result = await scrape(url, depth);
    return result;
  }, [scrape]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !activeSession) return;
    const msg = inputValue.trim();
    setInputValue('');
    await sendMessage(msg, activeSession.id);
    // Update session message count
    addSession({ ...activeSession, messageCount: messages.length + 2 });
  }, [inputValue, activeSession, sendMessage, messages.length, addSession]);

  const handleSelectSession = useCallback(async (session) => {
    setActiveSession(session);
    setSidebarOpen(false);
    clearMessages();
    // Load history
    try {
      const { historyAPI } = await import('../services/api');
      const result = await historyAPI.getSessionHistory(session.id);
      if (result.history) loadHistory(result.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, [clearMessages, loadHistory]);

  const handleNewChat = useCallback(() => {
    setActiveSession(null);
    clearMessages();
    resetScrape();
    setSidebarOpen(false);
  }, [clearMessages, resetScrape]);

  const handleDeleteSession = useCallback(async (sessionId) => {
    await deleteSession(sessionId);
    if (activeSession?.id === sessionId) {
      handleNewChat();
    }
  }, [deleteSession, activeSession, handleNewChat]);

  const handleClearChat = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  const getHostname = (url) => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url || 'WebRAG'; }
  };

  const showSuggestions = activeSession && messages.length === 0 && !isLoading;

  return (
    <div className="chat-app">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <FiX /> : <FiMenu />}
      </button>

      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSession?.id}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        className={sidebarOpen ? 'open' : ''}
      />

      {/* Main content */}
      <main className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-header-icon">
              {activeSession ? <FiGlobe /> : <HiSparkles />}
            </div>
            <div>
              <div className="chat-header-title">
                {activeSession ? (activeSession.title || getHostname(activeSession.url)) : 'WebRAG Chat'}
              </div>
              {activeSession && (
                <div className="chat-header-url">{getHostname(activeSession.url)}</div>
              )}
            </div>
          </div>

          <div className="chat-header-actions">
            {messages.length > 0 && (
              <button className="btn-icon" onClick={handleClearChat} title="Clear chat">
                <FiTrash2 />
              </button>
            )}
            <button className="btn-icon" onClick={() => fetchSessions()} title="Refresh sessions">
              <FiRefreshCw />
            </button>
          </div>
        </div>

        {/* Scrape panel */}
        <ScrapePanel
          onScrape={handleScrape}
          scrapeStatus={scrapeStatus}
          scrapeResult={scrapeResult}
          scrapeError={scrapeError}
        />

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && !isLoading ? (
            <WelcomeScreen />
          ) : (
            <>
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isLoading={isLoading}
          disabled={!activeSession}
          showSuggestions={showSuggestions}
        />
      </main>
    </div>
  );
}

export default ChatApp;
