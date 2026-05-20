const multer = require('multer');
const path = require('path');
const createSecureUpload = require('./createSecureUpload');

const storage = multer.memoryStorage();
const uploadMaxMb = Number(process.env.CNAB_UPLOAD_MAX_FILE_SIZE_MB || 5);
const uploadMaxBytes = Math.max(1, uploadMaxMb) * 1024 * 1024;

const extensoesPermitidas = new Set(['.ret', '.crt', '.txt', '.cnab', '.rem']);
const tiposPermitidos = new Set(['text/plain', 'application/octet-stream']);

const fileFilter = (req, file, cb) => {
  const extensaoArquivo = String(path.extname(file.originalname || '') || '').toLowerCase();
  const mimeNormalizado = String(file.mimetype || '').toLowerCase();
  const mimePermitido = !mimeNormalizado || tiposPermitidos.has(mimeNormalizado);

  if (mimePermitido && extensoesPermitidas.has(extensaoArquivo)) {
    cb(null, true);
    return;
  }

  cb(new Error('Arquivo CNAB invalido. Use arquivos .RET, .CRT, .REM, .CNAB ou .TXT.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: uploadMaxBytes
  }
});

module.exports = createSecureUpload(upload, 'documents');
