import React, { useState } from 'react';
import { User, Bot, Copy, Check, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import SourceCard from './SourceCard';

export default function MessageItem({ message, index }) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(true);

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isUser = message.sender === 'user';

  // Helper to format simple markdown elements (bold, bullets, paragraphs)
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;

    const lines = rawText.split('\n');
    const elements = [];
    let currentList = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`}>
            {currentList.map((li, i) => (
              <li key={i}>{formatInline(li)}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        currentList.push(trimmed.substring(2));
      } else if (/^\d+\.\s/.test(trimmed)) {
        currentList.push(trimmed.replace(/^\d+\.\s/, ''));
      } else {
        flushList();
        if (trimmed.length > 0) {
          elements.push(
            <p key={`p-${idx}`}>
              {formatInline(trimmed)}
            </p>
          );
        }
      }
    });

    flushList();
    return elements;
  };

  const formatInline = (text) => {
    // Regex for bold **text**, page citations [Page X], and `code`
    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    // Replace bold **...**
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(<strong key={`b-${keyIdx++}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`} id={`message-${index}`}>
      <div className={`avatar-badge ${isUser ? 'user' : 'assistant'}`}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
        <div className="message-content">
          {isUser ? (
            <p>{message.text}</p>
          ) : (
            <div className="markdown-body">
              {/* Insufficient Information Banner */}
              {message.isSupported === false && (
                <div className="grounding-alert warning" style={{ marginBottom: '0.75rem' }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>Insufficient information was found in the uploaded document.</span>
                </div>
              )}

              {message.isSupported === true && (
                <div className="grounding-alert verified" style={{ marginBottom: '0.75rem' }}>
                  <CheckCircle size={14} style={{ flexShrink: 0 }} />
                  <span>Answer grounded in document excerpts</span>
                </div>
              )}

              {renderFormattedText(message.text)}

              {/* Sources Section */}
              {message.sources && message.sources.length > 0 && (
                <div className="sources-container">
                  <button
                    className="sources-toggle-btn"
                    onClick={() => setShowSources(!showSources)}
                  >
                    <span>Source References ({message.sources.length} retrieved)</span>
                    {showSources ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {showSources && (
                    <div className="sources-grid">
                      {message.sources.map((src, srcIdx) => (
                        <SourceCard key={src.chunkId || srcIdx} source={src} index={srcIdx} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {!isUser && (
          <div className="message-actions-bar">
            <button className="action-pill-btn" onClick={handleCopy} title="Copy Answer">
              {copied ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            {message.timingMs && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginLeft: 'auto' }}>
                {message.timingMs}ms
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
