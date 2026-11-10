/**
 * Vector Store - In-memory vector similarity index.
 * Stores document chunks, embeddings, and a BM25 index for hybrid retrieval.
 */
const { buildBm25Index, reciprocalRankFusion, searchBm25 } = require('./retrievalService');

class VectorStore {
  constructor() {
    this.activeDocument = null; // { docId, filename, fileSize, pageCount, chunkCount, uploadedAt, provider }
    this.chunks = []; // Array of { chunkId, docId, pageNumber, chunkIndex, text, charCount, tokenEstimate, embedding }
    this.bm25Index = null;
  }

  /**
   * Calculates cosine similarity between two vectors.
   * 
   * @param {Array<number>} vecA
   * @param {Array<number>} vecB
   * @returns {number} Value between -1.0 and 1.0 (typically 0.0 to 1.0 for embeddings)
   */
  static cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      const a = vecA[i];
      const b = vecB[i];
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Sets the active document and stores chunks with their embeddings.
   * 
   * @param {object} docMetadata
   * @param {Array<object>} chunks - Chunks with text and embedding arrays
   */
  loadDocument(docMetadata, chunks) {
    const embeddingDimensions = chunks[0]?.embedding?.length;
    if (!embeddingDimensions || chunks.some(chunk =>
      !Array.isArray(chunk.embedding) || chunk.embedding.length !== embeddingDimensions
    )) {
      const error = new Error('Document chunks have missing or inconsistent embedding dimensions.');
      error.statusCode = 422;
      error.publicMessage = error.message;
      throw error;
    }

    const storedChunks = chunks.map(chunk => ({
      chunkId: chunk.chunkId,
      docId: chunk.docId,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      charCount: chunk.charCount,
      tokenEstimate: chunk.tokenEstimate,
      embedding: chunk.embedding
    }));
    const bm25Index = buildBm25Index(storedChunks);

    this.activeDocument = {
      docId: docMetadata.docId,
      filename: docMetadata.filename,
      fileSize: docMetadata.fileSize,
      pageCount: docMetadata.pageCount,
      chunkCount: chunks.length,
      uploadedAt: new Date().toISOString(),
      provider: docMetadata.provider || 'gemini',
      embeddingModel: docMetadata.embeddingModel || 'default'
    };

    this.chunks = storedChunks;
    this.bm25Index = bm25Index;

    return this.activeDocument;
  }

  /**
   * Searches for top-k chunks most similar to the query embedding.
   * 
   * @param {Array<number>} queryEmbedding - Embedding of the user question
   * @param {number} topK - Number of results to return (default 4)
   * @param {number} minThreshold - Minimum similarity score (default 0.0)
   * @returns {Array<object>} - Ranked results with similarity scores
   */
  search(queryEmbedding, topK = 4, minThreshold = 0.0) {
    if (!queryEmbedding || this.chunks.length === 0) {
      return [];
    }

    const expectedDimensions = this.chunks[0].embedding.length;
    if (queryEmbedding.length !== expectedDimensions) {
      const error = new Error(
        `Query embedding dimension mismatch: expected ${expectedDimensions}, received ${queryEmbedding.length}. Re-index the document with the selected embedding provider.`
      );
      error.statusCode = 409;
      error.publicMessage = error.message;
      throw error;
    }

    // Compute similarity for all indexed chunks
    const scoredChunks = this.chunks.map(chunk => {
      const similarity = VectorStore.cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        chunkId: chunk.chunkId,
        docId: chunk.docId,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        charCount: chunk.charCount,
        similarity: parseFloat(similarity.toFixed(4)),
        similarityScore: similarity,
        relevancePercent: Math.max(0, Math.min(100, Math.round(similarity * 100)))
      };
    });

    // Sort descending by similarity score
    scoredChunks.sort((a, b) => b.similarityScore - a.similarityScore);

    // Filter by threshold if requested
    const filtered = scoredChunks.filter(c => c.similarityScore >= minThreshold);

    return filtered.slice(0, topK);
  }

  searchHybrid(query, queryEmbedding, candidateLimit = 16, minThreshold = 0.0) {
    const semanticResults = this.search(queryEmbedding, candidateLimit, minThreshold);
    const keywordResults = searchBm25(this.bm25Index, query, candidateLimit).map(chunk => {
      const similarityScore = VectorStore.cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        ...chunk,
        similarityScore,
        similarity: parseFloat(similarityScore.toFixed(4)),
        relevancePercent: Math.max(0, Math.min(100, Math.round(similarityScore * 100))),
        similarityThresholdMet: similarityScore >= minThreshold
      };
    });
    const fusedResults = reciprocalRankFusion(
      [semanticResults, keywordResults],
      candidateLimit
    );

    return {
      semanticResults,
      keywordResults,
      fusedResults
    };
  }

  /**
   * Returns current active document info.
   */
  getActiveDocument() {
    return this.activeDocument;
  }

  /**
   * Returns stored chunks (excluding embedding vectors for light payload).
   */
  getChunks(offset = 0, limit = 50) {
    const total = this.chunks.length;
    const items = this.chunks.slice(offset, offset + limit).map(c => ({
      chunkId: c.chunkId,
      pageNumber: c.pageNumber,
      chunkIndex: c.chunkIndex,
      text: c.text,
      charCount: c.charCount,
      tokenEstimate: c.tokenEstimate
    }));

    return {
      total,
      offset,
      limit,
      chunks: items
    };
  }

  /**
   * Clears the current active document and vector store.
   */
  clear() {
    this.activeDocument = null;
    this.chunks = [];
    this.bm25Index = null;
  }

  /**
   * Store statistics.
   */
  stats() {
    return {
      hasDocument: this.activeDocument !== null,
      document: this.activeDocument,
      totalChunks: this.chunks.length,
      embeddingDimensions: this.chunks[0]?.embedding?.length || 0
    };
  }
}

// Singleton vector store instance
const vectorStoreInstance = new VectorStore();

module.exports = vectorStoreInstance;
module.exports.VectorStore = VectorStore;
