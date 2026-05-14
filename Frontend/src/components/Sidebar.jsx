import React from 'react';
import { FiPlus, FiGlobe, FiTrash2, FiMessageSquare, FiInfo } from 'react-icons/fi';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';

function Sidebar({ sessions, activeSessionId, onNewChat, onSelectSession, onDeleteSession }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getHostname = (url) => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌐</div>
          <span className="sidebar-logo-text">Web<span>RAG</span></span>
        </div>
        <button className="btn-new-chat" onClick={onNewChat}>
          <FiPlus /> New Chat
        </button>
      </div>

      <div className="sidebar-section-label">Scraped Websites</div>

      <div className="sidebar-history">
        {sessions.length === 0 ? (
          <div className="history-empty">
            <HiOutlineChatBubbleLeftRight />
            No sessions yet.<br />Scrape a website to get started.
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              className={`history-item ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(session)}
            >
              <div className="history-item-icon">
                <FiGlobe />
              </div>
              <div className="history-item-info">
                <div className="history-item-title">
                  {session.title || getHostname(session.url)}
                </div>
                <div className="history-item-meta">
                  {session.messageCount} msgs · {formatDate(session.createdAt)}
                </div>
              </div>
              <button
                className="history-item-delete"
                onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                title="Delete session"
              >
                <FiTrash2 />
              </button>
            </div>
          ))
        )}
      </div>

      {/* <div className="sidebar-footer">
        <div className="sidebar-footer-info">
          <FiInfo />
          <span>Add your Anthropic API key in backend <code>.env</code> for AI responses</span>
        </div>
      </div> */}
    </aside>
  );
}

export default Sidebar;
