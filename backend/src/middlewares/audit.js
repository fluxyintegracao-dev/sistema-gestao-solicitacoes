const { registrarEventoSeguranca } = require('../services/securityLogService');

function auditSuccess({
  eventType,
  resourceType,
  description,
  resourceIdResolver,
  metadataResolver
}) {
  return (req, res, next) => {
    let handled = false;

    const finalize = () => {
      if (handled) {
        return;
      }
      handled = true;

      if (res.statusCode >= 200 && res.statusCode < 400) {
        void registrarEventoSeguranca({
          req,
          usuarioId: req.user?.id || null,
          tipoEvento: eventType,
          recursoTipo: resourceType,
          recursoId: typeof resourceIdResolver === 'function'
            ? resourceIdResolver(req, res)
            : null,
          status: 'SUCCESS',
          descricao: description,
          metadata: typeof metadataResolver === 'function'
            ? metadataResolver(req, res)
            : null
        });
      }
    };

    res.on('finish', finalize);
    res.on('close', finalize);
    next();
  };
}

module.exports = {
  auditSuccess
};
