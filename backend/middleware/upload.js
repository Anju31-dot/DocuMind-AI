const multer = require('multer');
const path = require('path');
const config = require('../config');

// Store file in memory buffer for direct processing
const storage = multer.memoryStorage();

// File filter: accept only PDF files
const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';

  if (isPdfMime || isPdfExt) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only PDF documents are supported.');
    error.statusCode = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE_BYTES // 15MB default
  },
  fileFilter: fileFilter
});

module.exports = upload;
