'use strict';

const multer = require('multer');
const path = require('path');
const createSecureUpload = require('../../../config/createSecureUpload');

const storage = multer.memoryStorage();
const uploadMaxMb = Number(process.env.FISCAL_XML_UPLOAD_MAX_MB || 10);
const uploadMaxBytes = Math.max(1, uploadMaxMb) * 1024 * 1024;

const allowedMimeTypes = new Set([
  'application/xml',
  'text/xml',
  'application/octet-stream'
]);

const upload = multer({
  storage,
  limits: {
    fileSize: uploadMaxBytes
  },
  fileFilter(req, file, cb) {
    const extension = String(path.extname(file.originalname || '') || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();

    if (extension === '.xml' && (!mime || allowedMimeTypes.has(mime))) {
      cb(null, true);
      return;
    }

    cb(new Error('Somente XML fiscal e permitido nesta importacao.'));
  }
});

module.exports = createSecureUpload(upload, 'fiscal_xml');
