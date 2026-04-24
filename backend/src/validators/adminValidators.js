const {
  ensureAllowedKeys,
  ValidationError,
  sanitizeString
} = require('../middlewares/validation');

const SETOR_CAPABILITY_FIELDS = [
  'eh_setor_obra',
  'eh_setor_financeiro',
  'eh_setor_compras',
  'eh_setor_geo',
  'eh_setor_administrativo'
];

function sanitizeOptionalString(value, label, max) {
  return sanitizeString(value, label, { required: false, max });
}

function sanitizeRequiredString(value, label, max) {
  return sanitizeString(value, label, { required: true, max });
}

function sanitizeInteger(value, label, { required = false, min = null, max = null } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ValidationError(`${label} e obrigatorio.`);
    }
    return undefined;
  }

  const numero = Number(value);
  if (!Number.isInteger(numero)) {
    throw new ValidationError(`${label} invalido.`);
  }

  if (min !== null && numero < min) {
    throw new ValidationError(`${label} abaixo do minimo permitido.`);
  }

  if (max !== null && numero > max) {
    throw new ValidationError(`${label} acima do maximo permitido.`);
  }

  return numero;
}

function sanitizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function validateCargoCreateBody(body = {}) {
  ensureAllowedKeys(body, ['nome', 'codigo'], 'Cargo');

  const nome = sanitizeRequiredString(body.nome, 'Nome do cargo', 120);
  const codigo = sanitizeOptionalString(body.codigo, 'Codigo do cargo', 60);

  return { nome, codigo };
}

function validateCargoUpdateBody(body = {}) {
  ensureAllowedKeys(body, ['nome', 'codigo'], 'Cargo');

  const nome = sanitizeOptionalString(body.nome, 'Nome do cargo', 120);
  const codigo = sanitizeOptionalString(body.codigo, 'Codigo do cargo', 60);

  if (!nome && !codigo) {
    throw new ValidationError('Informe ao menos um campo para atualizar o cargo.');
  }

  return { nome, codigo };
}

function validateSetorCreateBody(body = {}) {
  ensureAllowedKeys(body, ['nome', 'codigo', ...SETOR_CAPABILITY_FIELDS], 'Setor');

  const payload = {
    nome: sanitizeRequiredString(body.nome, 'Nome do setor', 120),
    codigo: sanitizeRequiredString(body.codigo, 'Codigo do setor', 80)
  };

  SETOR_CAPABILITY_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      payload[field] = sanitizeBoolean(body[field]);
    }
  });

  return payload;
}

function validateSetorUpdateBody(body = {}) {
  ensureAllowedKeys(body, ['nome', 'codigo', ...SETOR_CAPABILITY_FIELDS], 'Setor');

  const payload = {};
  const nome = sanitizeOptionalString(body.nome, 'Nome do setor', 120);
  const codigo = sanitizeOptionalString(body.codigo, 'Codigo do setor', 80);

  if (nome) payload.nome = nome;
  if (codigo) payload.codigo = codigo;

  SETOR_CAPABILITY_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      payload[field] = sanitizeBoolean(body[field]);
    }
  });

  if (Object.keys(payload).length === 0) {
    throw new ValidationError('Informe ao menos um campo para atualizar o setor.');
  }

  return payload;
}

function validateStatusSetorQuery(query = {}) {
  ensureAllowedKeys(query, ['setor'], 'Consulta de status por setor');

  const setor = sanitizeOptionalString(query.setor, 'Setor', 120);
  return setor ? { setor } : {};
}

function validateStatusSetorCreateBody(body = {}) {
  ensureAllowedKeys(body, ['setor', 'nome', 'ordem'], 'Status por setor');

  return {
    setor: sanitizeRequiredString(body.setor, 'Setor', 120),
    nome: sanitizeRequiredString(body.nome, 'Nome do status', 120),
    ordem: sanitizeInteger(body.ordem, 'Ordem', { required: true, min: 0, max: 9999 })
  };
}

function validateStatusSetorUpdateBody(body = {}) {
  ensureAllowedKeys(body, ['nome', 'ordem'], 'Status por setor');

  const payload = {};
  const nome = sanitizeOptionalString(body.nome, 'Nome do status', 120);
  const ordem = sanitizeInteger(body.ordem, 'Ordem', { required: false, min: 0, max: 9999 });

  if (nome) payload.nome = nome;
  if (ordem !== undefined) payload.ordem = ordem;

  if (Object.keys(payload).length === 0) {
    throw new ValidationError('Informe ao menos um campo para atualizar o status.');
  }

  return payload;
}

function validateSetorPermissaoBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['setor_id', 'setor', 'usuario_pode_assumir', 'usuario_pode_atribuir', 'modo_recebimento'],
    'Permissao de setor'
  );

  const setorId = sanitizeInteger(body.setor_id, 'Setor', { required: false, min: 1 });
  const setor = sanitizeOptionalString(body.setor, 'Setor', 120);

  if (!setorId && !setor) {
    throw new ValidationError('Informe setor_id ou setor para salvar a permissao.');
  }

  const payload = {
    usuario_pode_assumir: sanitizeBoolean(body.usuario_pode_assumir),
    usuario_pode_atribuir: sanitizeBoolean(body.usuario_pode_atribuir)
  };

  if (setorId) payload.setor_id = setorId;
  if (setor) payload.setor = setor;

  if (body.modo_recebimento !== undefined && body.modo_recebimento !== null && String(body.modo_recebimento).trim() !== '') {
    const modoRecebimento = sanitizeRequiredString(body.modo_recebimento, 'Modo de recebimento', 40).toUpperCase();
    if (!['ADMIN_PRIMEIRO', 'TODOS_VISIVEIS'].includes(modoRecebimento)) {
      throw new ValidationError('Modo de recebimento invalido.');
    }
    payload.modo_recebimento = modoRecebimento;
  }

  return payload;
}

module.exports = {
  validateCargoCreateBody,
  validateCargoUpdateBody,
  validateSetorCreateBody,
  validateSetorPermissaoBody,
  validateSetorUpdateBody,
  validateStatusSetorCreateBody,
  validateStatusSetorQuery,
  validateStatusSetorUpdateBody
};
