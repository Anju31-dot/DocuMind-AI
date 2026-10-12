/**
 * Frontend API client for DocuMind AI Backend
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return await res.json();
}

export async function testConnection(payload) {
  const res = await fetch(`${API_BASE}/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Connection test failed (${res.status})`);
  }
  return data;
}


export async function fetchActiveDocument() {
  const res = await fetch(`${API_BASE}/document`);
  if (!res.ok) throw new Error(`Failed to fetch document: ${res.statusText}`);
  return await res.json();
}

export async function uploadDocument(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);

  if (options.provider) formData.append('provider', options.provider);
  if (options.apiKey) formData.append('apiKey', options.apiKey);
  if (options.chunkSize) formData.append('chunkSize', options.chunkSize);
  if (options.chunkOverlap) formData.append('chunkOverlap', options.chunkOverlap);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Upload failed with status ${res.status}`);
  }

  return data;
}

export async function queryDocument(question, options = {}) {
  const payload = {
    question,
    provider: options.provider,
    apiKey: options.apiKey,
    topK: options.topK
  };

  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Query failed with status ${res.status}`);
  }

  return data;
}

export async function fetchChunks(offset = 0, limit = 50) {
  const res = await fetch(`${API_BASE}/chunks?offset=${offset}&limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch chunks: ${res.statusText}`);
  return await res.json();
}

export async function deleteActiveDocument() {
  const res = await fetch(`${API_BASE}/document`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`Failed to reset document: ${res.statusText}`);
  return await res.json();
}
