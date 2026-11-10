/**
 * Global Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  // Multer specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File size limit exceeded. Maximum allowed PDF size is 15MB.'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request body is too large.'
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Request body contains invalid JSON.'
    });
  }

  const statusCode = Number.isInteger(err.statusCode) && err.publicMessage
    ? err.statusCode
    : 500;
  const message = err.publicMessage || 'An unexpected error occurred. Please try again later.';

  if (statusCode >= 500) {
    console.error('[Error]', {
      method: req.method,
      path: req.path,
      statusCode,
      errorCode: typeof err.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(err.code)
        ? err.code
        : 'UNCLASSIFIED'
    });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode
  });
}

module.exports = errorHandler;
