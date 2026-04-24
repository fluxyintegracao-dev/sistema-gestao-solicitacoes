const multer = require('multer');
const path = require('path');
const createSecureUpload = require('./createSecureUpload');

const storage = multer.memoryStorage();
const uploadMaxMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 10);
const uploadMaxBytes = Math.max(1, uploadMaxMb) * 1024 * 1024;

const tiposPermitidos = new Set([
  'application/x-ofx',
  'application/ofx',
  'application/octet-stream',
  'text/plain',
  'text/ofx'
]);

const extensoesPermitidas = new Set([
  '.ofx'
]);

const fileFilter = (req, file, cb) => {
  const extensaoArquivo = String(path.extname(file.originalname || '') || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();
  const mimePermitido = tiposPermitidos.has(mime) || !mime;
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

module.exports = createSecureUpload(upload, 'ofx');
