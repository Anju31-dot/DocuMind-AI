const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const config = require('../config');

/**
 * Generates an embedding vector for a single string of text.
 * 
 * @param {string} text - Input text
 * @param {object} options - { provider, apiKey, model }
 * @returns {Promise<Array<number>>}
 */
async function generateEmbedding(text, options = {}) {
  const provider = (options.provider || config.DEFAULT_PROVIDER || 'gemini').toLowerCase();
  const apiKey = options.apiKey || (provider === 'gemini' ? config.GEMINI_API_KEY : config.OPENAI_API_KEY);

  if (!apiKey) {
    throw new Error(
      `Missing API Key for provider "${provider}". Please configure ${provider.toUpperCase()}_API_KEY in backend .env or provide it in request settings.`
    );
  }

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = options.model || config.GEMINI_EMBED_MODEL || 'text-embedding-004';
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.embedContent(text);
    if (!result || !result.embedding || !result.embedding.values) {
      throw new Error(`Failed to generate Gemini embedding with model "${modelName}".`);
    }
    return result.embedding.values;
  } else if (provider === 'openai') {
    const client = new OpenAI({ apiKey });
    const modelName = options.model || config.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

    const response = await client.embeddings.create({
      model: modelName,
      input: text
    });

    if (!response || !response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error(`Failed to generate OpenAI embedding with model "${modelName}".`);
    }
    return response.data[0].embedding;
  } else {
    throw new Error(`Unsupported embedding provider: "${provider}". Use "gemini" or "openai".`);
  }
}

/**
 * Generates embeddings in batches for an array of text chunks.
 * 
 * @param {Array<string>} texts - Array of chunk text strings
 * @param {object} options - { provider, apiKey, model, batchSize }
 * @returns {Promise<Array<Array<number>>>}
 */
async function generateBatchEmbeddings(texts, options = {}) {
  if (!texts || texts.length === 0) return [];

  const provider = (options.provider || config.DEFAULT_PROVIDER || 'gemini').toLowerCase();
  const apiKey = options.apiKey || (provider === 'gemini' ? config.GEMINI_API_KEY : config.OPENAI_API_KEY);
  const batchSize = options.batchSize || 10;

  if (!apiKey) {
    throw new Error(
      `Missing API Key for provider "${provider}". Please configure ${provider.toUpperCase()}_API_KEY in backend .env or provide it in request settings.`
    );
  }

  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const chunkBatch = texts.slice(i, i + batchSize);

    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = options.model || config.GEMINI_EMBED_MODEL || 'text-embedding-004';
      const model = genAI.getGenerativeModel({ model: modelName });

      // Gemini batchEmbedContents
      const requests = chunkBatch.map(text => ({
        content: { parts: [{ text }] }
      }));

      try {
        const result = await model.batchEmbedContents({ requests });
        if (result && result.embeddings) {
          for (const item of result.embeddings) {
            allEmbeddings.push(item.values);
          }
        } else {
          throw new Error('Gemini batchEmbedContents did not return expected embeddings array');
        }
      } catch (batchErr) {
        // Fallback to sequential individual embeds if batch fails
        console.warn(`[EmbeddingService] Batch embed warning, falling back to sequential for batch ${i}: ${batchErr.message}`);
        for (const singleText of chunkBatch) {
          const res = await model.embedContent(singleText);
          allEmbeddings.push(res.embedding.values);
        }
      }
    } else if (provider === 'openai') {
      const client = new OpenAI({ apiKey });
      const modelName = options.model || config.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

      const response = await client.embeddings.create({
        model: modelName,
        input: chunkBatch
      });

      for (const item of response.data) {
        allEmbeddings.push(item.embedding);
      }
    } else {
      throw new Error(`Unsupported provider: "${provider}".`);
    }
  }

  return allEmbeddings;
}

module.exports = {
  generateEmbedding,
  generateBatchEmbeddings
};
