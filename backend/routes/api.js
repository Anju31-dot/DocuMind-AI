const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const config = require('../config');
const pdfService = require('../services/pdfService');
const chunkerService = require('../services/chunkerService');
const embeddingService = require('../services/embeddingService');
const vectorStore = require('../services/vectorStore');
const ragService = require('../services/ragService');
const {
  isPdfBuffer,
  validateApiKey,
  validateProvider,
  validateQueryInput,
  validateUploadInput
} = require('../middleware/validation');

function requestError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}

/**
 * Serve the generated sample PDF for quick 1-click portfolio demo
 */
router.get('/sample-document', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const samplePath = path.join(__dirname, '..', '..', 'sample_documents', 'DocuMind_AI_Internship_Report.pdf');

  if (fs.existsSync(samplePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="DocuMind_AI_Internship_Report.pdf"');
    fs.createReadStream(samplePath).pipe(res);
  } else {
    res.status(404).json({ success: false, error: 'Sample PDF not found.' });
  }
});

/**
 * Health check & status endpoint
 */
router.get('/health', (req, res) => {
  const activeDoc = vectorStore.getActiveDocument();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    configuredProviders: {
      gemini: !!config.GEMINI_API_KEY,
      openai: !!config.OPENAI_API_KEY,
      default: config.DEFAULT_PROVIDER
    },
    activeDocument: activeDoc ? {
      docId: activeDoc.docId,
      filename: activeDoc.filename,
      pageCount: activeDoc.pageCount,
      chunkCount: activeDoc.chunkCount,
      provider: activeDoc.provider,
      uploadedAt: activeDoc.uploadedAt
    } : null
  });
});

/**
 * Test API Key and connection
 */
router.post('/test-connection', async (req, res, next) => {
  let provider;
  let apiKey;
  try {
    provider = validateProvider(req.body?.provider, config.DEFAULT_PROVIDER || 'gemini');
    apiKey = validateApiKey(req.body?.apiKey) || (provider === 'gemini' ? config.GEMINI_API_KEY : config.OPENAI_API_KEY);
  } catch (error) {
    return next(error);
  }

  if (!apiKey) {
    return next(requestError(400, `No API key is configured for ${provider}.`));
  }

  try {
    // Test with a quick 1-word embedding
    const testVector = await embeddingService.generateEmbedding('hello', { provider, apiKey });
    return res.json({
      success: true,
      provider,
      dimensions: testVector.length,
      message: `Successfully connected to ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} API! (Vector dims: ${testVector.length})`
    });
  } catch (error) {
    return next(error);
  }
});


/**
 * PDF Upload and Indexing endpoint
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return next(requestError(400, 'No PDF file was uploaded. Please attach a valid PDF document.'));
    }

    const options = validateUploadInput(req.body, {
      provider: config.DEFAULT_PROVIDER || 'gemini',
      chunkSize: config.CHUNK_SIZE,
      chunkOverlap: config.CHUNK_OVERLAP
    });
    const { provider, chunkSize, chunkOverlap } = options;
    const apiKey = options.apiKey || (provider === 'gemini' ? config.GEMINI_API_KEY : config.OPENAI_API_KEY);

    if (!isPdfBuffer(req.file.buffer)) {
      return next(requestError(400, 'Uploaded file content is not a valid PDF.'));
    }

    if (!apiKey) {
      return next(requestError(400, `No API key is configured for ${provider}.`));
    }

    // 1. Extract text and preserve page numbers
    let extractionResult;
    try {
      extractionResult = await pdfService.extractTextWithPages(req.file.buffer);
    } catch (error) {
      return next(requestError(400, 'Unable to parse the uploaded PDF. Ensure it is a valid, unencrypted PDF document.'));
    }

    if (!extractionResult.pages || extractionResult.pages.length === 0 || !extractionResult.fullText.trim()) {
      return res.status(422).json({
        success: false,
        error: 'The uploaded PDF contains no extractable text. Scanned images without OCR cannot be processed.'
      });
    }

    // 2. Split text into chunks with page numbers preserved
    const docId = `doc_${Date.now()}`;
    const chunks = chunkerService.chunkDocumentPages(extractionResult.pages, docId, {
      chunkSize,
      overlap: chunkOverlap
    });

    if (chunks.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'No usable text chunks could be generated from the document.'
      });
    }

    // 3. Generate embeddings for all chunks in batches
    const chunkTexts = chunks.map(c => c.text);
    const embeddings = await embeddingService.generateBatchEmbeddings(chunkTexts, {
      provider,
      apiKey
    });

    // 4. Attach embeddings to chunks
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].embedding = embeddings[i];
    }

    // 5. Store in Vector Store
    const docMetadata = {
      docId,
      filename: req.file.originalname,
      fileSize: req.file.size,
      pageCount: extractionResult.numPages,
      provider,
      embeddingModel: provider === 'gemini' ? config.GEMINI_EMBED_MODEL : config.OPENAI_EMBED_MODEL
    };

    const indexedDoc = vectorStore.loadDocument(docMetadata, chunks);

    // Group chunks per page for stats
    const pagesSummary = extractionResult.pages.map(p => ({
      pageNumber: p.pageNumber,
      charCount: p.charCount,
      chunkCount: chunks.filter(c => c.pageNumber === p.pageNumber).length
    }));

    return res.status(200).json({
      success: true,
      message: 'Document successfully parsed, chunked, and indexed in vector store.',
      document: {
        docId: indexedDoc.docId,
        filename: indexedDoc.filename,
        fileSize: indexedDoc.fileSize,
        pageCount: indexedDoc.pageCount,
        chunkCount: indexedDoc.chunkCount,
        provider: indexedDoc.provider,
        uploadedAt: indexedDoc.uploadedAt,
        pagesSummary
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Question Answering (RAG query) endpoint
 */
router.post('/query', async (req, res, next) => {
  try {
    const activeDoc = vectorStore.getActiveDocument();
    const { question, provider, apiKey, topK } = validateQueryInput(
      req.body,
      activeDoc?.provider || config.DEFAULT_PROVIDER,
      config.TOP_K
    );

    if (!activeDoc) {
      return next(requestError(400, 'No active document indexed. Please upload a PDF before asking questions.'));
    }

    const result = await ragService.answerQuestion({
      question,
      provider,
      apiKey,
      topK
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get active document details
 */
router.get('/document', (req, res) => {
  const activeDoc = vectorStore.getActiveDocument();
  if (!activeDoc) {
    return res.json({ hasDocument: false, document: null });
  }

  res.json({
    hasDocument: true,
    document: activeDoc,
    stats: vectorStore.stats()
  });
});

/**
 * Inspect stored document chunks
 */
router.get('/chunks', (req, res) => {
  const offset = parseInt(req.query.offset, 10) || 0;
  const limit = parseInt(req.query.limit, 10) || 50;

  const chunkData = vectorStore.getChunks(offset, limit);
  res.json({
    success: true,
    ...chunkData
  });
});

/**
 * Clear active document from vector store
 */
router.delete('/document', (req, res) => {
  vectorStore.clear();
  res.json({
    success: true,
    message: 'Active document removed from vector store.'
  });
});

module.exports = router;
