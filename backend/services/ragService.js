const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const config = require('../config');
const embeddingService = require('./embeddingService');
const vectorStore = require('./vectorStore');

/**
 * Executes the full RAG pipeline:
 * 1. Embed user query
 * 2. Retrieve top-k chunks from VectorStore
 * 3. Evaluate context relevance
 * 4. Generate answer using LLM strictly grounded on context
 * 5. Return answer with citations & page numbers
 */
async function answerQuestion({ question, provider, apiKey, topK = config.TOP_K }) {
  const startTime = Date.now();

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    throw new Error('Please provide a valid, non-empty question.');
  }

  const activeDoc = vectorStore.getActiveDocument();
  if (!activeDoc) {
    throw new Error('No document has been uploaded or indexed yet. Please upload a PDF first.');
  }

  const documentProvider = (activeDoc.provider || 'gemini').toLowerCase();
  const selectedProvider = (provider || documentProvider || config.DEFAULT_PROVIDER || 'gemini').toLowerCase();

  if (selectedProvider !== documentProvider) {
    const error = new Error(
      `The active document was indexed with ${documentProvider}. Clear and re-index the document before switching to ${selectedProvider}.`
    );
    error.statusCode = 409;
    error.publicMessage = error.message;
    throw error;
  }

  const effectiveKey = apiKey || (selectedProvider === 'gemini' ? config.GEMINI_API_KEY : config.OPENAI_API_KEY);

  if (!effectiveKey) {
    const error = new Error(`No API key is configured for ${selectedProvider}.`);
    error.statusCode = 400;
    error.publicMessage = error.message;
    throw error;
  }

  // 1. Generate Query Embedding
  const queryEmbedding = await embeddingService.generateEmbedding(question.trim(), {
    provider: selectedProvider,
    apiKey: effectiveKey
  });

  // 2. Retrieve top-k most similar chunks
  const retrievedChunks = vectorStore.search(queryEmbedding, topK, config.SIMILARITY_THRESHOLD);

  // If vector store returned no chunks
  if (retrievedChunks.length === 0) {
    return {
      answer: 'No sufficiently relevant information was found in the uploaded document to answer this question.',
      isSupported: false,
      sources: [],
      document: activeDoc,
      provider: selectedProvider,
      timingMs: Date.now() - startTime
    };
  }

  // Format retrieved context for prompt
  const contextExcerpts = retrievedChunks
    .map((chunk, idx) => `[Source ${idx + 1} | Page ${chunk.pageNumber}]:\n${chunk.text}`)
    .join('\n\n---\n\n');

  const systemInstruction = `You are DocuMind AI, an intelligent, rigorous document assistant for question answering.
Your objective is to provide truthful, accurate answers strictly grounded in the document excerpts provided below.

MANDATORY RULES:
1. Answer the question using ONLY the provided document excerpts.
2. If the excerpts DO NOT contain sufficient information to answer the question, or if the question asks about something not discussed in the document, respond EXACTLY with or include:
   "Insufficient information was found in the uploaded document to answer this question."
3. Do NOT make up facts, extrapolate, hallucinate, or use external knowledge not present in the excerpts.
4. Always cite the page number(s) (e.g., "[Page 2]" or "(Page 3)") when mentioning information from the excerpts.
5. Format your response cleanly using Markdown (use bold key points, bullet points for lists, and clear paragraphs).`;

  const userPrompt = `DOCUMENT EXCERPTS:
${contextExcerpts}

USER QUESTION:
${question.trim()}

Please provide a factual, grounded answer based strictly on the excerpts above:`;

  let answerText = '';

  // 3. Generate Answer using LLM
  if (selectedProvider === 'gemini') {
    const genAI = new GoogleGenerativeAI(effectiveKey);
    const chatModelName = config.GEMINI_CHAT_MODEL || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({
      model: chatModelName,
      systemInstruction: systemInstruction
    });

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    answerText = response.text();
  } else if (selectedProvider === 'openai') {
    const openai = new OpenAI({ apiKey: effectiveKey });
    const chatModelName = config.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model: chatModelName,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
    });

    answerText = completion.choices[0]?.message?.content || '';
  } else {
    throw new Error(`Unsupported LLM provider: "${selectedProvider}".`);
  }

  // Check if LLM determined insufficient info
  const insufficientKeywords = [
    'insufficient information',
    'not mentioned in the provided excerpts',
    'not enough information',
    'cannot be answered based on the provided'
  ];
  const isSupported = !insufficientKeywords.some(phrase =>
    answerText.toLowerCase().includes(phrase)
  );

  // Return clean response with source references
  return {
    answer: answerText.trim(),
    isSupported,
    sources: retrievedChunks.map(c => ({
      chunkId: c.chunkId,
      pageNumber: c.pageNumber,
      chunkIndex: c.chunkIndex,
      similarity: c.similarity,
      relevancePercent: c.relevancePercent,
      text: c.text
    })),
    document: {
      docId: activeDoc.docId,
      filename: activeDoc.filename,
      pageCount: activeDoc.pageCount,
      chunkCount: activeDoc.chunkCount
    },
    provider: selectedProvider,
    timingMs: Date.now() - startTime
  };
}

module.exports = {
  answerQuestion
};
