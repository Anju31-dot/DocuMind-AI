import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import ProcessingProgress from './components/ProcessingProgress';
import DocumentInfoBar from './components/DocumentInfoBar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import ChunkInspectorModal from './components/ChunkInspectorModal';
import { 
  fetchHealth, 
  fetchActiveDocument, 
  uploadDocument, 
  queryDocument, 
  deleteActiveDocument 
} from './services/api';
import { Cpu, ShieldCheck, Database, Layers } from 'lucide-react';

export default function App() {
  const [backendOnline, setBackendOnline] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState(1);
  const [uploadError, setUploadError] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [isQuerying, setIsQuerying] = useState(false);

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChunksOpen, setIsChunksOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('documind_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      provider: 'gemini',
      apiKey: '',
      topK: 4,
      chunkSize: 600,
      chunkOverlap: 120
    };
  });

  // Check health and existing document on mount
  useEffect(() => {
    checkHealthAndDoc();
    const interval = setInterval(checkHealthAndDoc, 15000);
    return () => clearInterval(interval);
  }, []);

  const checkHealthAndDoc = async () => {
    try {
      const health = await fetchHealth();
      setBackendOnline(true);
      setServerStatus(health);

      const docData = await fetchActiveDocument();
      if (docData && docData.hasDocument) {
        setActiveDoc(docData.document);
      } else {
        setActiveDoc(null);
      }
    } catch (err) {
      setBackendOnline(false);
      console.warn('Backend offline or health check failed:', err.message);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('documind_settings', JSON.stringify(newSettings));
    showToast('Settings updated successfully.', 'success');
  };

  // Upload handler with staged progress animation
  const handleUpload = async (file) => {
    setUploadError(null);
    setIsUploading(true);
    setUploadStage(1);

    // Staged visual increments
    const stageTimer1 = setTimeout(() => setUploadStage(2), 500);
    const stageTimer2 = setTimeout(() => setUploadStage(3), 1200);
    const stageTimer3 = setTimeout(() => setUploadStage(4), 2200);

    try {
      const result = await uploadDocument(file, {
        provider: settings.provider,
        apiKey: settings.apiKey,
        chunkSize: settings.chunkSize,
        chunkOverlap: settings.chunkOverlap
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setUploadStage(5);

      setActiveDoc(result.document);
      setMessages([]); // Reset chat history for new document
      showToast(`Document "${result.document.filename}" indexed into ${result.document.chunkCount} chunks!`, 'success');
    } catch (err) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setUploadError(err.message || 'Failed to upload and parse PDF.');
      showToast(err.message || 'Upload error occurred.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Quick load sample PDF
  const handleLoadSample = async () => {
    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadStage(1);

      // Fetch the sample file from backend
      const res = await fetch('/api/sample-document');
      if (!res.ok) {
        throw new Error('Could not fetch sample PDF from server.');
      }

      const blob = await res.blob();
      const sampleFile = new File([blob], 'DocuMind_AI_Internship_Report.pdf', { type: 'application/pdf' });
      await handleUpload(sampleFile);
    } catch (err) {
      setUploadError(err.message);
      showToast(err.message, 'error');
      setIsUploading(false);
    }
  };

  // Clear loaded document
  const handleResetDocument = async () => {
    try {
      await deleteActiveDocument();
      setActiveDoc(null);
      setMessages([]);
      showToast('Document cleared from vector memory.', 'info');
    } catch (err) {
      showToast('Failed to reset document: ' + err.message, 'error');
    }
  };

  // Ask question (RAG query)
  const handleSendMessage = async (questionText) => {
    if (!activeDoc) {
      showToast('Please upload a PDF document before asking questions.', 'error');
      return;
    }

    // Add user question to messages immediately
    const userMsg = { sender: 'user', text: questionText };
    setMessages((prev) => [...prev, userMsg]);
    setIsQuerying(true);

    try {
      const response = await queryDocument(questionText, {
        provider: settings.provider || activeDoc.provider,
        apiKey: settings.apiKey,
        topK: settings.topK
      });

      const assistantMsg = {
        sender: 'assistant',
        text: response.answer,
        isSupported: response.isSupported,
        sources: response.sources || [],
        timingMs: response.timingMs
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        sender: 'assistant',
        text: `Error processing query: ${err.message}. Please verify your API key or backend status.`,
        isSupported: false,
        sources: []
      };
      setMessages((prev) => [...prev, errorMsg]);
      showToast(err.message, 'error');
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header
        backendOnline={backendOnline}
        activeDoc={activeDoc}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenChunks={() => setIsChunksOpen(true)}
        activeProvider={settings.provider}
      />

      {/* Main Grid: Left Controls + Right Chat */}
      <main className="dashboard-grid">
        {/* Left Column: Upload & Document Status */}
        <aside className="sidebar-panel">
          {activeDoc ? (
            <DocumentInfoBar
              document={activeDoc}
              onReset={handleResetDocument}
              onInspectChunks={() => setIsChunksOpen(true)}
            />
          ) : (
            <UploadZone
              onUpload={handleUpload}
              isUploading={isUploading}
              onLoadSample={handleLoadSample}
              errorMessage={uploadError}
            />
          )}

          {isUploading && (
            <ProcessingProgress currentStage={uploadStage} />
          )}

          {/* RAG Pipeline Specs Summary Info Box */}
          <div className="rag-specs-box">
            <div className="specs-title">
              <Cpu size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>RAG Pipeline Architecture</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>• <strong>PDF Parser:</strong> Page-aware text extraction</li>
              <li>• <strong>Chunking:</strong> Recursive with boundary detection</li>
              <li>• <strong>Vector Store:</strong> Cosine similarity index</li>
              <li>• <strong>Grounding:</strong> Strict prompt constraints & source citations</li>
              <li>• <strong>Hallucination Defense:</strong> Zero speculation outside excerpts</li>
            </ul>
          </div>
        </aside>

        {/* Right Column: Chat & Conversation */}
        <section className="chat-panel-container">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isQuerying}
            onClearChat={() => setMessages([])}
            hasActiveDoc={!!activeDoc}
          />
        </section>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        serverStatus={serverStatus}
      />

      {/* Chunks Inspector Modal */}
      <ChunkInspectorModal
        isOpen={isChunksOpen}
        onClose={() => setIsChunksOpen(false)}
        activeDoc={activeDoc}
      />

      {/* Toast Alert Banner */}
      {toast && (
        <div className={`toast-banner ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
