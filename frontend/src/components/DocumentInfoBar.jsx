import React from 'react';
import { FileText, Layers, Trash2, ExternalLink, Cpu } from 'lucide-react';

export default function DocumentInfoBar({ 
  document, 
  onReset, 
  onInspectChunks 
}) {
  if (!document) return null;

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="panel-card" id="active-document-panel">
      <div className="panel-header" style={{ marginBottom: '0.75rem' }}>
        <h3 className="panel-title">
          <FileText size={18} style={{ color: 'var(--success)' }} />
          <span>Active Document</span>
        </h3>
        <span 
          style={{ 
            fontSize: '0.7rem', 
            background: 'var(--success-bg)', 
            color: '#6ee7b7', 
            border: '1px solid var(--success-border)',
            padding: '0.15rem 0.45rem',
            borderRadius: '999px',
            fontWeight: '600'
          }}
        >
          Indexed & Ready
        </span>
      </div>

      <div className="active-doc-card">
        <div className="doc-meta-header">
          <div className="doc-icon">
            <FileText size={20} />
          </div>
          <div className="doc-info-text">
            <div className="doc-filename" title={document.filename}>
              {document.filename}
            </div>
            <div className="doc-submeta">
              {formatFileSize(document.fileSize)} • Provider: {document.provider?.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="doc-stats-grid">
          <div className="stat-item">
            <span className="stat-value">{document.pageCount}</span>
            <span className="stat-label">Pages</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{document.chunkCount}</span>
            <span className="stat-label">Chunks</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">Cosine</span>
            <span className="stat-label">Metric</span>
          </div>
        </div>

        <div className="doc-actions-row">
          <button 
            className="btn-secondary" 
            id="btn-inspect-chunks-panel"
            onClick={onInspectChunks}
          >
            <Layers size={14} />
            <span>Inspect Chunks</span>
          </button>
          <button 
            className="btn-danger-outline" 
            id="btn-reset-document"
            onClick={onReset}
            title="Clear this document from vector memory"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
}
