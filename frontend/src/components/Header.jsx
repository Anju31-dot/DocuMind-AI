import React from 'react';
import { BookOpen, Settings, Layers, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Header({ 
  backendOnline, 
  activeDoc, 
  onOpenSettings, 
  onOpenChunks,
  activeProvider
}) {
  return (
    <header className="app-header" id="app-header">
      <div className="brand-section">
        <div className="brand-logo-badge" id="brand-logo">
          <BookOpen size={24} />
        </div>
        <div className="brand-titles">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1>DocuMind AI</h1>
            <span className="portfolio-tag">Internship Portfolio</span>
          </div>
          <p>
            RAG-Based Document Assistant
            <span style={{ color: 'var(--text-subtle)' }}>•</span>
            <span>Vector Search & Context Grounding</span>
          </p>
        </div>
      </div>

      <div className="header-actions">
        {/* Backend Connectivity Status */}
        <div className="status-pill" id="backend-status-pill" title="Backend Server Connectivity">
          <span className={`status-dot ${backendOnline ? 'active' : ''}`} />
          <span>{backendOnline ? 'API Connected' : 'Connecting...'}</span>
        </div>

        {/* Active Document Indicator */}
        {activeDoc && (
          <button 
            className="icon-btn" 
            id="btn-inspect-chunks-header"
            onClick={onOpenChunks}
            title="Inspect Vector Store Chunks"
          >
            <Layers size={15} style={{ color: '#818cf8' }} />
            <span>Chunks ({activeDoc.chunkCount})</span>
          </button>
        )}

        {/* Settings button */}
        <button 
          className="icon-btn" 
          id="btn-open-settings"
          onClick={onOpenSettings}
          title="Configure API Provider & Settings"
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}
