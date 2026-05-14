import React, { useRef, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';

const SUGGESTED_QUESTIONS = [
  'What is this page about?',
  'Can you summarize this page?',
  'What are the important points mentioned here?',
  'Explain this content in simple words.'
];

function ChatInput({ value, onChange, onSend, isLoading, disabled, showSuggestions }) {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled && value.trim()) {
        onSend();
      }
    }
  };

  const canSend = value.trim() && !isLoading && !disabled;

  return (
    <div className="chat-input-area">
      {showSuggestions && (
        <div className="suggested-questions">
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              className="suggestion-btn"
              onClick={() => { onChange(q); setTimeout(onSend, 50); }}
              disabled={disabled}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="input-container">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Scrape a website to start chatting...' : 'Ask anything about the scraped website...'}
          disabled={isLoading || disabled}
          rows={1}
        />
        <div className="input-actions">
          <button
            className="btn-send"
            onClick={onSend}
            disabled={!canSend}
            title="Send message (Enter)"
          >
            <FiSend />
          </button>
        </div>
      </div>
      <div className="input-hint">
        Press Enter to send · Shift+Enter for new line
      </div>
    </div>
  );
}

export default ChatInput;
