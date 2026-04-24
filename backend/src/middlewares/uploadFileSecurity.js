const { registrarEventoSeguranca } = require('../services/securityLogService');
const { scanFileBufferIfEnabled } = require('../services/clamavService');
const {
  assertFileBinaryMatchesProfile,
  flattenUploadedFiles
} = require('../services/uploadBinaryValidationService');

function createUploadFileSecurity(profile = 'documents') {
  return async function uploadFileSecurity(req, res, next) {
    const files = flattenUploadedFiles(req);
    if (!files.length) {
      return next();
    }

    try {
      for (const file of files) {
        assertFileBinaryMatchesProfile(file, profile);
        await scanFileBufferIfEnabled(file);
      }

      return next();
    } catch (error) {
      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: error.code || 'UPLOAD_SECURITY_BLOCKED',
        recursoTipo: 'UPLOAD',
        recursoId: null,
        status: error.statusCode >= 500 ? 'ERROR' : 'DENIED',
        descricao: error.message,
        metadata: {
          profile,
          arquivos: files.map((file) => ({
            nome: file.originalname,
            mime: file.mimetype,
            tamanho: file.size
          })),
          detalhes: error.metadata || null
        }
      });
      return next(error);
    }
  };
}

module.exports = {
  createUploadFileSecurity
};
