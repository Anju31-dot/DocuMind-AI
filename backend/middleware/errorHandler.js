/**
 * Global Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  console.error('[Error Details]:', err);

  // Multer specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File size limit exceeded. Maximum allowed PDF size is 15MB.'
    });
  }

  // API Key / Auth errors
  const errMessage = err.message || 'An unexpected server error occurred.';
  let statusCode = err.statusCode || (err.status ? err.status : 500);

  if (errMessage.includes('API_KEY_INVALID') || errMessage.includes('Incorrect API key') || errMessage.includes('API key not valid')) {
    statusCode = 401;
  } else if (errMessage.includes('quota') || errMessage.includes('RESOURCE_EXHAUSTED')) {
    statusCode = 429;
  }

  res.status(statusCode).json({
    success: false,
    error: errMessage,
    statusCode
  });
}

module.exports = errorHandler;
