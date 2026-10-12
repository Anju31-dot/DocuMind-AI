import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, CheckCircle2 } from 'lucide-react';

export default function SourceCard({ source, index }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const relevanceColor = source.relevancePercent >= 70 ? 'high' : '';

  return (
    <div className="source-card" id={`source-card-${index}`}>
      <div 
        className="source-card-header" 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="page-badge">
            Page {source.pageNumber}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
            Chunk #{source.chunkIndex || index + 1}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className={`relevance-meter ${relevanceColor}`}>
            <span>{source.relevancePercent}% Match</span>
          </div>
          <button
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className="source-snippet">
        {isExpanded ? source.text : (
          source.text.length > 150 
            ? `${source.text.substring(0, 150)}...` 
            : source.text
        )}
      </div>
    </div>
  );
}
