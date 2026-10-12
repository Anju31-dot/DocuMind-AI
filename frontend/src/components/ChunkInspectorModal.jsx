import React, { useState, useEffect } from 'react';
import { X, Layers, Search, FileText, CheckCircle2 } from 'lucide-react';
import { fetchChunks } from '../services/api';

export default function ChunkInspectorModal({ isOpen, onClose, activeDoc }) {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPage, setSelectedPage] = useState('all');

  useEffect(() => {
    if (isOpen && activeDoc) {
      loadChunks();
    }
  }, [isOpen, activeDoc]);

  const loadChunks = async () => {
    try {
      setLoading(true);
      const data = await fetchChunks(0, 100);
      if (data && data.chunks) {
        setChunks(data.chunks);
      }
    } catch (err) {
      console.error('Failed to load chunks:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter chunks
  const filteredChunks = chunks.filter((chunk) => {
    const matchesPage = selectedPage === 'all' || String(chunk.pageNumber) === String(selectedPage);
    const matchesSearch = !searchTerm || chunk.text.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPage && matchesSearch;
  });

  // Extract unique pages
  const uniquePages = Array.from(new Set(chunks.map((c) => c.pageNumber))).sort((a, b) => a - b);

  return (
    <div className="modal-overlay" id="chunks-modal-overlay">
      <div className="modal-content" style={{ maxWidth: '780px' }} id="chunks-modal-content">
        <div className="modal-header">
          <div className="modal-title">
            <Layers size={20} style={{ color: 'var(--accent-primary)' }} />
            <span>Document Chunks Inspector ({chunks.length} total)</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="btn-close-chunks">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Controls Bar: Search & Page filter */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2rem' }}
                placeholder="Search text across indexed chunks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                size={14}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
              />
            </div>

            <select
              className="form-select"
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="all">All Pages ({chunks.length})</option>
              {uniquePages.map((pageNum) => (
                <option key={pageNum} value={pageNum}>
                  Page {pageNum} ({chunks.filter((c) => c.pageNumber === pageNum).length})
                </option>
              ))}
            </select>
          </div>

          {/* Chunks List */}
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading indexed chunks...
            </div>
          ) : filteredChunks.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-subtle)' }}>
              No chunks match the current search filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredChunks.map((chunk, idx) => (
                <div className="chunk-item-card" key={chunk.chunkId || idx}>
                  <div className="chunk-item-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="page-badge">
                        Page {chunk.pageNumber}
                      </span>
                      <code style={{ fontSize: '0.72rem', color: '#a5b4fc' }}>
                        {chunk.chunkId}
                      </code>
                    </div>
                    <span>
                      {chunk.charCount} characters • ~{chunk.tokenEstimate} tokens
                    </span>
                  </div>
                  <div className="chunk-text-box">
                    {chunk.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginRight: 'auto' }}>
            Showing {filteredChunks.length} of {chunks.length} chunks
          </span>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
