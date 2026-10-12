import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, Trash2, HelpCircle } from 'lucide-react';
import MessageItem from './MessageItem';

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  onClearChat,
  hasActiveDoc,
  suggestedQuestions = []
}) {
  const [inputQuestion, setInputQuestion] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const defaultSuggestions = [
    'What is the core objective of this project?',
    'Explain the vector search methodology and similarity metric used.',
    'What hallucination guardrails are implemented?',
    'What are the security standards regarding secret API keys?'
  ];

  const questionsToShow = suggestedQuestions.length > 0 ? suggestedQuestions : defaultSuggestions;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputQuestion.trim() || isLoading || !hasActiveDoc) return;
    onSendMessage(inputQuestion.trim());
    setInputQuestion('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (question) => {
    if (hasActiveDoc && !isLoading) {
      onSendMessage(question);
    } else {
      setInputQuestion(question);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="chat-panel" id="chat-panel">
      {/* Chat Panel Header */}
      <div className="chat-header">
        <div className="chat-header-title">
          <Bot size={18} style={{ color: 'var(--accent-primary)' }} />
          <span>Interactive Document Chat</span>
        </div>

        {messages.length > 0 && (
          <button 
            className="icon-btn" 
            id="btn-clear-chat"
            onClick={onClearChat}
            title="Clear Chat History"
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Messages Stream Area */}
      <div className="messages-stream" id="messages-stream">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon-glow">
              <Sparkles size={32} />
            </div>
            <h2 className="welcome-title">Ask Questions About Your Document</h2>
            <p className="welcome-desc">
              DocuMind AI uses <strong>Retrieval-Augmented Generation (RAG)</strong> to answer questions
              directly grounded in your uploaded PDF. Source page numbers and similarity scores are shown with every answer.
            </p>

            <div className="suggested-prompts-label">Suggested Inquiries</div>
            <div className="prompt-chips-grid">
              {questionsToShow.map((q, idx) => (
                <button
                  key={idx}
                  className="prompt-chip"
                  id={`btn-suggested-query-${idx}`}
                  onClick={() => handleSuggestionClick(q)}
                  disabled={isLoading}
                >
                  <Sparkles size={14} style={{ color: '#818cf8', flexShrink: 0, marginTop: '2px' }} />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageItem key={index} message={msg} index={index} />
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="message-row assistant">
            <div className="avatar-badge assistant">
              <Bot size={18} />
            </div>
            <div className="typing-indicator-row">
              <div className="pulse-dots">
                <span className="pulse-dot" />
                <span className="pulse-dot" />
                <span className="pulse-dot" />
              </div>
              <span className="typing-text">Retrieving context & generating grounded answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="chat-input-area">
        <form className="chat-form" onSubmit={handleSubmit} id="chat-form">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            id="chat-query-input"
            placeholder={
              hasActiveDoc 
                ? "Ask anything about the uploaded document..." 
                : "Please upload or load a PDF document first..."
            }
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasActiveDoc || isLoading}
          />

          <button
            type="submit"
            className="send-btn"
            id="btn-send-query"
            disabled={!hasActiveDoc || isLoading || !inputQuestion.trim()}
            title="Send Question"
          >
            <Send size={16} />
          </button>
        </form>

        <div className="input-hints-bar">
          <span>
            {hasActiveDoc 
              ? 'Press Enter to submit • Strictly grounded in document' 
              : 'Upload a PDF to begin conversational retrieval'}
          </span>
          <span>Cosine Top-K Retrieval</span>
        </div>
      </div>
    </div>
  );
}
