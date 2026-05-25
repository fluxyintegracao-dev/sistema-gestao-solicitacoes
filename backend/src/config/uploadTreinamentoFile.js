const multer = require('multer');
const path = require('path');
const createSecureUpload = require('./createSecureUpload');

const storage = multer.memoryStorage();
const uploadMaxMb = Number(process.env.TREINAMENTO_UPLOAD_MAX_FILE_SIZE_MB || 250);
const uploadMaxBytes = Math.max(1, uploadMaxMb) * 1024 * 1024;

const tiposPermitidos = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'video/mp4',
  'video/webm',
  'application/octet-stream'
]);

const extensoesPermitidas = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
  '.png',
  '.jpg',
  '.jpeg',
  '.mp4',
  '.webm'
]);

const fileFilter = (req, file, cb) => {
  const extension = String(path.extname(file.originalname || '') || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();

  if (extensoesPermitidas.has(extension) && (!mime || tiposPermitidos.has(mime))) {
    cb(null, true);
    return;
  }

  cb(new Error('Tipo de arquivo nao permitido para treinamento'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: uploadMaxBytes
  }
});

module.exports = createSecureUpload(upload, 'training_media');
