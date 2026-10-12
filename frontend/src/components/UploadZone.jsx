import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function UploadZone({ 
  onUpload, 
  isUploading, 
  onLoadSample, 
  errorMessage 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState(null);
  const fileInputRef = useRef(null);

  const validateAndSetFile = (file) => {
    setLocalError(null);
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setLocalError('Only PDF documents are supported (.pdf).');
      setSelectedFile(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setLocalError('File size exceeds the 15MB limit. Please upload a smaller document.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleConfirmUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="panel-card" id="upload-panel-card">
      <div className="panel-header">
        <h3 className="panel-title">
          <UploadCloud size={18} style={{ color: 'var(--accent-primary)' }} />
          <span>Upload Document</span>
        </h3>
      </div>

      <div
        className={`dropzone ${dragActive ? 'drag-active' : ''}`}
        id="pdf-dropzone"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleChange}
          disabled={isUploading}
          id="pdf-file-input"
        />

        <div className="dropzone-icon">
          <FileText size={26} />
        </div>

        <p className="dropzone-title">
          {selectedFile ? selectedFile.name : 'Choose a PDF or drag & drop'}
        </p>
        <p className="dropzone-desc">
          {selectedFile
            ? `${formatFileSize(selectedFile.size)} • Click to change file`
            : 'Extract text, chunk pages & generate embeddings'}
        </p>

        <span className="dropzone-limits">
          Max file size: 15MB • PDF Only
        </span>
      </div>

      {/* Selected File action bar */}
      {selectedFile && !isUploading && (
        <div style={{ marginTop: '0.85rem' }}>
          <button
            className="btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            id="btn-process-upload"
            onClick={handleConfirmUpload}
          >
            <Sparkles size={16} />
            <span>Process & Index PDF</span>
          </button>
        </div>
      )}

      {/* Error Banners */}
      {(localError || errorMessage) && (
        <div 
          style={{ 
            marginTop: '0.75rem', 
            padding: '0.65rem 0.85rem', 
            borderRadius: 'var(--radius-sm)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: '#fca5a5',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          id="upload-error-banner"
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{localError || errorMessage}</span>
        </div>
      )}

      {/* Quick Demo Sample Document Box */}
      <div className="sample-doc-box">
        <button
          className="btn-sample"
          id="btn-load-sample-doc"
          onClick={onLoadSample}
          disabled={isUploading}
          title="Load pre-built 3-page Internship Report PDF"
        >
          <Sparkles size={15} />
          <span>Load Sample Internship Report (Demo)</span>
        </button>
      </div>
    </div>
  );
}
