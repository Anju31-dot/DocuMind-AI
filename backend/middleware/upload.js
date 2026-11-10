const multer = require('multer');
const config = require('../config');

// Store file in memory buffer for direct processing
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE_BYTES // 15MB default
  }
});

module.exports = upload;
