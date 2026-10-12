import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function ProcessingProgress({ currentStage, stages = [] }) {
  const defaultStages = [
    { id: 1, label: 'Reading PDF & Extracting Pages' },
    { id: 2, label: 'Splitting into Chunks with Overlap' },
    { id: 3, label: 'Generating High-Dimensional Embeddings' },
    { id: 4, label: 'Indexing Chunks in Vector Store' }
  ];

  const activeStages = stages.length > 0 ? stages : defaultStages;

  return (
    <div className="pipeline-status-card" id="pipeline-status-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <Loader2 size={16} className="spin-icon" style={{ color: 'var(--accent-primary)', animation: 'spin 1.2s linear infinite' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>
          Processing Document Pipeline...
        </span>
      </div>

      <div className="pipeline-steps">
        {activeStages.map((step) => {
          const isDone = currentStage > step.id;
          const isActive = currentStage === step.id;

          return (
            <div 
              key={step.id} 
              className={`step-row ${isDone ? 'completed' : ''} ${isActive ? 'active' : ''}`}
            >
              <div className="step-indicator">
                {isDone ? <CheckCircle2 size={12} /> : step.id}
              </div>
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
