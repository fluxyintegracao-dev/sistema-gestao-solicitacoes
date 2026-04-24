const multer = require('multer');
const path = require('path');
const createSecureUpload = require('./createSecureUpload');

const storage = multer.memoryStorage();
const uploadMaxMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 10);
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
  'application/vnd.rar',
  'application/x-rar-compressed'
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
  '.rar'
]);

const fileFilter = (req, file, cb) => {
  const extensaoArquivo = String(path.extname(file.originalname || '') || '').toLowerCase();
  const mimeNormalizado = String(file.mimetype || '').toLowerCase();
  const mimePermitido =
    !mimeNormalizado ||
    mimeNormalizado === 'application/octet-stream' ||
    tiposPermitidos.has(mimeNormalizado);
  const extensaoPermitida = extensoesPermitidas.has(extensaoArquivo);

  if (mimePermitido && extensaoPermitida) {
    cb(null, true);
    return;
  }

  cb(new Error('Tipo de arquivo nao permitido'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: uploadMaxBytes
  }
});

module.exports = createSecureUpload(upload, 'documents');
