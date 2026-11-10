const PROVIDERS = new Set(['gemini', 'openai']);

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.publicMessage = message;
  return error;
}

function validateProvider(value, fallback) {
  const provider = value === undefined ? fallback : value;
  if (typeof provider !== 'string' || !PROVIDERS.has(provider.trim().toLowerCase())) {
    throw validationError('Provider must be either "gemini" or "openai".');
  }
  return provider.trim().toLowerCase();
}

function parseInteger(value, name, { min, max, fallback }) {
  if (value === undefined) return fallback;

  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : NaN;

  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw validationError(`${name} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function validateApiKey(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 4096) {
    throw validationError('API key must be a string no longer than 4096 characters.');
  }
  return value.trim() || undefined;
}

function validateQueryInput(body, fallbackProvider, defaultTopK) {
  const question = body?.question;
  if (typeof question !== 'string' || question.trim().length === 0 || question.length > 4000) {
    throw validationError('Question must contain between 1 and 4000 characters.');
  }

  return {
    question: question.trim(),
    provider: validateProvider(body.provider, fallbackProvider),
    apiKey: validateApiKey(body.apiKey),
    topK: parseInteger(body.topK, 'topK', { min: 1, max: 8, fallback: defaultTopK })
  };
}

function validateUploadInput(body, defaults) {
  const provider = validateProvider(body?.provider, defaults.provider);
  const chunkSize = parseInteger(body?.chunkSize, 'chunkSize', {
    min: 1,
    max: 10000,
    fallback: defaults.chunkSize
  });
  const chunkOverlap = parseInteger(body?.chunkOverlap, 'chunkOverlap', {
    min: 0,
    max: 10000,
    fallback: defaults.chunkOverlap
  });
  if (chunkOverlap >= chunkSize) {
    throw validationError('chunkOverlap must be less than chunkSize.');
  }

  return {
    provider,
    apiKey: validateApiKey(body?.apiKey),
    chunkSize,
    chunkOverlap
  };
}

function isPdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return false;
  return buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'));
}

module.exports = {
  isPdfBuffer,
  validateApiKey,
  validateProvider,
  validateQueryInput,
  validateUploadInput
};
