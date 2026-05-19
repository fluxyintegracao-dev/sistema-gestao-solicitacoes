'use strict';

const multer = require('multer');
const path = require('path');
const createSecureUpload = require('../../../config/createSecureUpload');

const allowedExtensions = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
const allowedMimeTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.FISCAL_FILE_UPLOAD_MAX_MB || 15) * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    const extension = String(path.extname(file.originalname || '') || '').toLowerCase();
    const mimeType = String(file.mimetype || '').split(';')[0].trim().toLowerCase();

    if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(mimeType)) {
      return callback(new Error('Arquivo fiscal permitido apenas em PDF, PNG ou JPG.'));
    }

    return callback(null, true);
  }
});

module.exports = createSecureUpload(upload, 'fiscal_file');
