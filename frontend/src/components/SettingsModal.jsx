import React, { useState } from 'react';
import { X, Settings, Key, Sliders, CheckCircle2, Info, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { testConnection } from '../services/api';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  activeDoc,
  onSaveSettings,
  serverStatus
}) {
  const [provider, setProvider] = useState(settings.provider || 'gemini');
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [topK, setTopK] = useState(settings.topK || 4);
  const [chunkSize, setChunkSize] = useState(settings.chunkSize || 600);
  const [chunkOverlap, setChunkOverlap] = useState(settings.chunkOverlap || 120);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const selectedProvider = activeDoc?.provider || provider;

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection({
        provider: selectedProvider,
        apiKey: apiKey.trim()
      });
      setTestResult({ success: true, message: res.message });
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveSettings({
      provider: selectedProvider,
      apiKey: apiKey.trim(),
      topK: parseInt(topK, 10),
      chunkSize: parseInt(chunkSize, 10),
      chunkOverlap: parseInt(chunkOverlap, 10)
    });
    onClose();
  };

  const hasServerGemini = serverStatus?.configuredProviders?.gemini;
  const hasServerOpenAI = serverStatus?.configuredProviders?.openai;

  return (
    <div className="modal-overlay" id="settings-modal-overlay">
      <div className="modal-content" id="settings-modal-content">
        <div className="modal-header">
          <div className="modal-title">
            <Settings size={20} style={{ color: 'var(--accent-primary)' }} />
            <span>RAG Pipeline Configuration</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="btn-close-settings">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Provider Selection */}
          <div className="form-group">
            <label className="form-label" htmlFor="select-provider">
              LLM & Embedding Provider
            </label>
            <select
              id="select-provider"
              className="form-select"
              value={selectedProvider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={Boolean(activeDoc)}
            >
              <option value="gemini">Google Gemini (text-embedding-004 & gemini-1.5-flash)</option>
              <option value="openai">OpenAI (text-embedding-3-small & gpt-4o-mini)</option>
            </select>
            <span className="form-helper">
              {activeDoc
                ? `This document is indexed with ${selectedProvider}. Clear and re-index it before switching providers.`
                : 'Google Gemini offers generous free tier access via Google AI Studio.'}
            </span>
          </div>

          {/* API Key */}
          <div className="form-group">
            <label className="form-label" htmlFor="input-api-key" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>API Key ({selectedProvider.toUpperCase()})</span>
              <span style={{ color: (selectedProvider === 'gemini' ? hasServerGemini : hasServerOpenAI) ? 'var(--success)' : 'var(--text-subtle)' }}>
                {(selectedProvider === 'gemini' ? hasServerGemini : hasServerOpenAI)
                  ? '✓ Backend .env configured'
                  : 'Optional if set in backend/.env'}
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-api-key"
                type="password"
                className="form-input"
                style={{ width: '100%' }}
                placeholder={
                  (selectedProvider === 'gemini' ? hasServerGemini : hasServerOpenAI)
                    ? '•••••••••••••••••••• (using backend .env key)'
                    : `Enter your ${selectedProvider.toUpperCase()}_API_KEY here`
                }
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
              <span className="form-helper">
                {selectedProvider === 'gemini' ? (
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                  >
                    <span>Get free Google Gemini API key</span>
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                  >
                    <span>Get OpenAI API key</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </span>

              <button
                type="button"
                className="icon-btn"
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? <Loader2 size={12} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={12} />}
                <span>{testing ? 'Testing...' : 'Test Key'}</span>
              </button>
            </div>

            {testResult && (
              <div 
                style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: testResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                  border: `1px solid ${testResult.success ? 'var(--success-border)' : 'var(--danger-border)'}`,
                  color: testResult.success ? '#6ee7b7' : '#fca5a5'
                }}
              >
                {testResult.success ? <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> : <AlertCircle size={14} style={{ flexShrink: 0 }} />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>


          {/* Top-K Chunks Slider */}
          <div className="form-group">
            <label className="form-label" htmlFor="input-top-k" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Top-K Context Chunks to Retrieve</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>{topK} Chunks</span>
            </label>
            <input
              id="input-top-k"
              type="range"
              min="1"
              max="8"
              step="1"
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            <span className="form-helper">
              Controls how many high-similarity excerpts are retrieved for LLM grounding.
            </span>
          </div>

          {/* Chunking Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="input-chunk-size">
                Chunk Size (chars)
              </label>
              <input
                id="input-chunk-size"
                type="number"
                className="form-input"
                value={chunkSize}
                onChange={(e) => setChunkSize(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-chunk-overlap">
                Chunk Overlap (chars)
              </label>
              <input
                id="input-chunk-overlap"
                type="number"
                className="form-input"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(e.target.value)}
              />
            </div>
          </div>

          <div style={{ 
            background: 'rgba(99, 102, 241, 0.08)', 
            border: '1px solid rgba(99, 102, 241, 0.2)', 
            borderRadius: 'var(--radius-sm)', 
            padding: '0.75rem', 
            fontSize: '0.75rem',
            color: '#c7d2fe',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              API keys stay in memory for this browser session and are not saved in browser storage. Requests send the key to this backend, which uses it with the selected AI provider.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-settings">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
