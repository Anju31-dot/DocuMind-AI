require('dotenv').config();

const configuredSimilarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin && origin !== '*');

module.exports = {
  PORT: process.env.PORT || 5000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  DEFAULT_PROVIDER: process.env.DEFAULT_PROVIDER || (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? 'gemini' : (process.env.OPENAI_API_KEY ? 'openai' : 'gemini')),
  GEMINI_EMBED_MODEL: process.env.GEMINI_EMBED_MODEL || 'text-embedding-004',
  GEMINI_CHAT_MODEL: process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash',
  OPENAI_EMBED_MODEL: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
  OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE, 10) || 600,
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP, 10) || 120,
  TOP_K: parseInt(process.env.TOP_K, 10) || 4,
  SIMILARITY_THRESHOLD: Number.isFinite(configuredSimilarityThreshold) ? configuredSimilarityThreshold : 0.25,
  ALLOWED_ORIGINS: allowedOrigins,
  MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024 // 15MB
};
