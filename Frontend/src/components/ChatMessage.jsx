import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiCopy, FiCheck, FiChevronDown, FiChevronRight, FiLink } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { FiUser } from 'react-icons/fi';

function ChatMessage({ message }) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const isUser = message.role === 'user';
  const hasSources = message.sources && message.sources.length > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message ${isUser ? 'user' : 'ai'}`}>
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`}>
        {isUser ? <FiUser /> : <HiSparkles />}
      </div>

      {/* Content */}
      <div className="message-content">
        <div className={`message-bubble ${message.isError ? 'error-bubble' : ''}`}>
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="message-footer">
          <span className="message-time">{formatTime(message.timestamp)}</span>

          {!isUser && message.model && message.model !== 'keyword-retrieval' && (
            <span className="message-model-badge">{message.model?.replace('claude-', '')}</span>
          )}

          {!isUser && (
            <button
              className={`btn-copy ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              title="Copy response"
            >
              {copied ? <><FiCheck /> Copied</> : <><FiCopy /> Copy</>}
            </button>
          )}
        </div>

        {/* Sources */}
        {hasSources && (
          <div className="message-sources">
            <button
              className="sources-toggle"
              onClick={() => setShowSources(!showSources)}
            >
              {showSources ? <FiChevronDown /> : <FiChevronRight />}
              {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
            </button>

            {showSources && (
              <div className="sources-list">
                {message.sources.map((source, i) => (
                  <div key={i} className="source-item">
                    <FiLink />
                    <div className="source-info">
                      <div className="source-title">
                        {source.title || source.url}
                      </div>
                      {source.excerpt && (
                        <div className="source-excerpt">{source.excerpt}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Typing indicator component
export function TypingIndicator() {
  return (
    <div className="message ai">
      <div className="message-avatar ai-avatar">
        <HiSparkles />
      </div>
      <div className="message-content">
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
