'use strict';

const multer = require('multer');

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.SST_UPLOAD_MAX_BYTES || 20 * 1024 * 1024)
  }
});
