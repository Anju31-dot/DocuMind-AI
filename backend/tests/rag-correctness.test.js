const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const embeddingService = require('../services/embeddingService');
const ragService = require('../services/ragService');
const { VectorStore } = require('../services/vectorStore');
const vectorStore = require('../services/vectorStore');

const originalGenerateEmbedding = embeddingService.generateEmbedding;
const originalGetGenerativeModel = GoogleGenerativeAI.prototype.getGenerativeModel;
const originalThreshold = config.SIMILARITY_THRESHOLD;

function loadTestDocument(embedding = [1, 0], provider = 'gemini') {
  vectorStore.clear();
  vectorStore.loadDocument({
    docId: 'test-document',
    filename: 'test.pdf',
    pageCount: 1,
    provider
  }, [{
    chunkId: 'test-chunk',
    docId: 'test-document',
    pageNumber: 1,
    chunkIndex: 1,
    text: 'Relevant document text.',
    embedding
  }]);
}

afterEach(() => {
  embeddingService.generateEmbedding = originalGenerateEmbedding;
  GoogleGenerativeAI.prototype.getGenerativeModel = originalGetGenerativeModel;
  config.SIMILARITY_THRESHOLD = originalThreshold;
  vectorStore.clear();
});

test('rejects a query provider that differs from the indexed document provider', async () => {
  loadTestDocument();
  let embeddingRequested = false;
  embeddingService.generateEmbedding = async () => {
    embeddingRequested = true;
    return [1, 0];
  };

  await assert.rejects(
    ragService.answerQuestion({
      question: 'What does the document say?',
      provider: 'openai',
      apiKey: 'test-key'
    }),
    error => error.statusCode === 409 && /indexed with gemini/.test(error.message)
  );
  assert.equal(embeddingRequested, false);
});

test('reports query and indexed embedding dimension mismatches clearly', async () => {
  loadTestDocument([1, 0]);
  let requestedProvider;
  embeddingService.generateEmbedding = async (text, options) => {
    requestedProvider = options.provider;
    return [1, 0, 0];
  };

  await assert.rejects(
    ragService.answerQuestion({
      question: 'What does the document say?',
      provider: 'gemini',
      apiKey: 'test-key'
    }),
    error => error.statusCode === 409 && /expected 2, received 3/.test(error.message)
  );
  assert.equal(requestedProvider, 'gemini');
});

test('filters chunks below the configured similarity threshold before generation', async () => {
  loadTestDocument([1, 0]);
  config.SIMILARITY_THRESHOLD = 0.25;
  embeddingService.generateEmbedding = async () => [0, 1];

  let generationRequested = false;
  GoogleGenerativeAI.prototype.getGenerativeModel = () => {
    generationRequested = true;
    throw new Error('LLM generation must not run without relevant chunks.');
  };

  const result = await ragService.answerQuestion({
    question: 'What does the document say?',
    provider: 'gemini',
    apiKey: 'test-key'
  });

  assert.equal(generationRequested, false);
  assert.deepEqual(result.sources, []);
  assert.equal(result.isSupported, false);
  assert.match(result.answer, /No sufficiently relevant information/);
});

test('vector search returns only chunks meeting the minimum similarity threshold', () => {
  const store = new VectorStore();
  store.loadDocument({ docId: 'threshold-test', provider: 'gemini' }, [
    { chunkId: 'match', embedding: [1, 0] },
    { chunkId: 'weak-match', embedding: [0.1, 1] }
  ]);

  const results = store.search([1, 0], 4, 0.25);

  assert.deepEqual(results.map(chunk => chunk.chunkId), ['match']);
});

test('rejects inconsistent embedding dimensions when indexing a document', () => {
  const store = new VectorStore();

  assert.throws(() => store.loadDocument({ docId: 'invalid-test' }, [
    { chunkId: 'first', embedding: [1, 0] },
    { chunkId: 'second', embedding: [1, 0, 0] }
  ]), error => error.statusCode === 422 && /inconsistent embedding dimensions/.test(error.message));

  assert.equal(store.getActiveDocument(), null);
});
