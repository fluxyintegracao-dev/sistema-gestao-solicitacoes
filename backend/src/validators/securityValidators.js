const {
  ensureAllowedKeys,
  ValidationError,
  sanitizeString
} = require('../middlewares/validation');
const {
  PASSWORD_POLICY_MESSAGE,
  validateStrongPassword
} = require('../services/passwordPolicyService');

function validateLoginBody(body = {}) {
  ensureAllowedKeys(body, ['email', 'senha'], 'Login');

  const email = sanitizeString(body.email, 'Email', {
    required: true,
    max: 160,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
  }).toLowerCase();

  const senha = sanitizeString(body.senha, 'Senha', {
    required: true,
    max: 120
  });

  return { email, senha };
}

function validateMfaLoginBody(body = {}) {
  ensureAllowedKeys(body, ['challenge_token', 'codigo'], 'Login com MFA');

  const challengeToken = sanitizeString(body.challenge_token, 'Challenge MFA', {
    required: true,
    max: 2048
  });

  const codigo = sanitizeString(body.codigo, 'Codigo MFA', {
    required: true,
    max: 12,
    pattern: /^\d{6}$/
  });

  return {
    challenge_token: challengeToken,
    codigo
  };
}

function validateMfaCodeBody(body = {}) {
  ensureAllowedKeys(body, ['codigo'], 'Codigo MFA');

  const codigo = sanitizeString(body.codigo, 'Codigo MFA', {
    required: true,
    max: 12,
    pattern: /^\d{6}$/
  });

  return { codigo };
}

function validatePasswordChangeBody(body = {}) {
  ensureAllowedKeys(body, ['senha_atual', 'senha_nova'], 'Alteracao de senha');

  const senhaAtual = sanitizeString(body.senha_atual, 'Senha atual', {
    required: true,
    max: 120
  });
  const senhaNova = sanitizeString(body.senha_nova, 'Senha nova', {
    required: true,
    max: 120
  });

  if (senhaNova.length < 8) {
    throw new ValidationError('Senha nova deve ter pelo menos 8 caracteres.');
  }

  const policy = validateStrongPassword(senhaNova);
  if (!policy.ok) {
    throw new ValidationError(PASSWORD_POLICY_MESSAGE);
  }

  return {
    senha_atual: senhaAtual,
    senha_nova: senhaNova
  };
}

function validateForgotPasswordBody(body = {}) {
  ensureAllowedKeys(body, ['email'], 'Recuperacao de senha');

  const email = sanitizeString(body.email, 'Email', {
    required: true,
    max: 160,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
  }).toLowerCase();

  return { email };
}

function validateResetPasswordBody(body = {}) {
  ensureAllowedKeys(body, ['token', 'senha'], 'Definicao de senha');

  const token = sanitizeString(body.token, 'Token', {
    required: true,
    max: 256
  });

  const senha = sanitizeString(body.senha, 'Senha', {
    required: true,
    max: 120
  });

  const policy = validateStrongPassword(senha);
  if (!policy.ok) {
    throw new ValidationError(PASSWORD_POLICY_MESSAGE);
  }

  return { token, senha };
}

function validatePresignQuery(query = {}) {
  ensureAllowedKeys(query, ['url', 'key'], 'Consulta de arquivo');

  if (query.url && query.key) {
    throw new ValidationError('Informe url ou key, nunca ambos.');
  }

  const alvo = sanitizeString(query.url || query.key, 'Arquivo', {
    required: true,
    max: 2048
  });

  return {
    ...query,
    url: query.url ? alvo : undefined,
    key: query.key ? alvo : undefined
  };
}

function validateNumericIdParam(paramName, label) {
  return (params = {}) => {
    ensureAllowedKeys(params, [paramName], label || 'Parametros');

    const rawValue = sanitizeString(params[paramName], label || paramName, {
      required: true,
      max: 20,
      pattern: /^\d+$/
    });

    return {
      ...params,
      [paramName]: rawValue
    };
  };
}

module.exports = {
  validateLoginBody,
  validateForgotPasswordBody,
  validateMfaCodeBody,
  validateMfaLoginBody,
  validateNumericIdParam,
  validatePasswordChangeBody,
  validateResetPasswordBody,
  validatePresignQuery
};
