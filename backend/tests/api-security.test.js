const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const app = require('../app');
const config = require('../config');
const embeddingService = require('../services/embeddingService');
const vectorStore = require('../services/vectorStore');

let server;
let baseUrl;

async function startServer() {
  if (!server) {
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  }
  return baseUrl;
}

async function postJson(path, body, headers = {}) {
  const url = await startServer();
  return fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

function loadTestDocument() {
  vectorStore.clear();
  vectorStore.loadDocument({ docId: 'security-test', provider: 'gemini' }, [{
    chunkId: 'security-chunk',
    embedding: [1, 0],
    text: 'Test content.'
  }]);
}

after(async () => {
  vectorStore.clear();
  if (server) {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});

test('rejects invalid providers and malformed API keys with 400 responses', async () => {
  const invalidProvider = await postJson('/api/test-connection', {
    provider: 'unsupported-provider',
    apiKey: 'not-a-real-key'
  });
  assert.equal(invalidProvider.status, 400);
  assert.match((await invalidProvider.json()).error, /Provider must be either/);

  const invalidKey = await postJson('/api/test-connection', {
    provider: 'gemini',
    apiKey: { secret: 'not-a-string' }
  });
  assert.equal(invalidKey.status, 400);
  assert.match((await invalidKey.json()).error, /API key must be a string/);
});

test('validates question and topK before attempting model calls', async () => {
  loadTestDocument();

  const invalidQuestion = await postJson('/api/query', {
    question: '   ',
    topK: 4
  });
  assert.equal(invalidQuestion.status, 400);
  assert.match((await invalidQuestion.json()).error, /Question must contain/);

  const invalidTopK = await postJson('/api/query', {
    question: 'A valid question?',
    topK: 9
  });
  assert.equal(invalidTopK.status, 400);
  assert.match((await invalidTopK.json()).error, /topK must be an integer between 1 and 8/);

  const invalidProvider = await postJson('/api/query', {
    question: 'A valid question?',
    provider: 'invalid'
  });
  assert.equal(invalidProvider.status, 400);
});

test('validates upload chunk settings and rejects non-PDF content despite PDF metadata', async () => {
  const url = await startServer();
  const invalidSettings = new FormData();
  invalidSettings.append('file', new Blob(['not a PDF']), 'report.pdf');
  invalidSettings.append('provider', 'gemini');
  invalidSettings.append('chunkSize', '0');
  invalidSettings.append('apiKey', 'test-key');

  const invalidSettingsResponse = await fetch(`${url}/api/upload`, {
    method: 'POST',
    body: invalidSettings
  });
  assert.equal(invalidSettingsResponse.status, 400);
  assert.match((await invalidSettingsResponse.json()).error, /chunkSize must be an integer/);

  const invalidPdf = new FormData();
  invalidPdf.append('file', new Blob(['not a PDF'], { type: 'application/octet-stream' }), 'report.txt');
  invalidPdf.append('provider', 'gemini');
  invalidPdf.append('apiKey', 'test-key');

  const invalidPdfResponse = await fetch(`${url}/api/upload`, {
    method: 'POST',
    body: invalidPdf
  });
  assert.equal(invalidPdfResponse.status, 400);
  assert.match((await invalidPdfResponse.json()).error, /content is not a valid PDF/);

  const invalidOverlap = new FormData();
  invalidOverlap.append('file', new Blob(['not a PDF']), 'report.pdf');
  invalidOverlap.append('chunkSize', '100');
  invalidOverlap.append('chunkOverlap', '100');

  const invalidOverlapResponse = await fetch(`${url}/api/upload`, {
    method: 'POST',
    body: invalidOverlap
  });
  assert.equal(invalidOverlapResponse.status, 400);
  assert.match((await invalidOverlapResponse.json()).error, /chunkOverlap must be less than chunkSize/);
});

test('preserves the 15 MB upload limit', () => {
  assert.equal(config.MAX_FILE_SIZE_BYTES, 15 * 1024 * 1024);
});

test('allows configured local Vite origin and omits CORS access for unlisted origins', async () => {
  const url = await startServer();

  const allowed = await fetch(`${url}/api/health`, {
    headers: { Origin: 'http://localhost:5173' }
  });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');

  const denied = await fetch(`${url}/api/health`, {
    headers: { Origin: 'https://unlisted.example' }
  });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('does not return or log provider error details or API keys', async () => {
  const originalGenerateEmbedding = embeddingService.generateEmbedding;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  const capturedLogs = [];
  const secret = 'test-secret-provider-key-123';
  const sensitiveQuestion = 'private user question not for logs';
  embeddingService.generateEmbedding = async () => {
    throw new Error(`Provider rejected credential ${secret}`);
  };
  console.error = (...args) => capturedLogs.push(args.join(' '));
  console.log = (...args) => capturedLogs.push(args.join(' '));

  try {
    const response = await postJson('/api/test-connection', {
      provider: 'gemini',
      apiKey: secret
    });
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.equal(body.error, 'An unexpected error occurred. Please try again later.');
    assert.equal(JSON.stringify(body).includes(secret), false);
    assert.equal(capturedLogs.join('\n').includes(secret), false);
    assert.equal(capturedLogs.join('\n').includes('Provider rejected credential'), false);

    loadTestDocument();
    const queryResponse = await postJson('/api/query', {
      question: sensitiveQuestion,
      provider: 'gemini',
      apiKey: secret,
      topK: 1
    });
    assert.equal(queryResponse.status, 500);
    assert.equal(capturedLogs.join('\n').includes(secret), false);
    assert.equal(capturedLogs.join('\n').includes(sensitiveQuestion), false);
  } finally {
    embeddingService.generateEmbedding = originalGenerateEmbedding;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  }
});
