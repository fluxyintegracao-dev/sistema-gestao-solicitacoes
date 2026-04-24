function sanitizeControllerError(error, fallbackMessage, options = {}) {
  const fallback = String(fallbackMessage || 'Erro ao processar solicitacao').trim();
  const statusFromError = Number(error?.statusCode ?? error?.status);
  const status =
    Number.isInteger(statusFromError) && statusFromError >= 400 && statusFromError <= 599
      ? statusFromError
      : Number.isInteger(options.status)
        ? Number(options.status)
        : 500;

  const message = String(error?.message || '').trim();
  const exposeOperational = options.exposeOperational !== false;
  const shouldExposeMessage =
    exposeOperational &&
    status >= 400 &&
    status < 500 &&
    message &&
    !/select\s|insert\s|update\s|delete\s|from\s|where\s|join\s|sql|sequelize|mysql|mariadb|postgres|mongodb|stack|trace|\/src\/|\\src\\|enoent|econn|syntaxerror|referenceerror|typeerror/i.test(message);

  return {
    status,
    message: shouldExposeMessage ? message : fallback
  };
}

function responderErroController(res, error, fallbackMessage, options = {}) {
  const payload = sanitizeControllerError(error, fallbackMessage, options);
  return res.status(payload.status).json({ error: payload.message });
}

module.exports = {
  responderErroController,
  sanitizeControllerError
};
