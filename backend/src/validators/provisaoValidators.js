const {
  ensureAllowedKeys,
  ValidationError,
  sanitizeString
} = require('../middlewares/validation');

const STATUS_PROVISAO = ['PREVISTO', 'EM_ANALISE', 'APROVADO', 'CANCELADO', 'REALIZADO'];
const PRIORIDADES_PROVISAO = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
const MODOS_PROVISIONAMENTO = ['INFORMATIVO', 'CONTROLADO', 'INTEGRADO'];

function isBlank(value) {
  return value == null || String(value).trim() === '';
}

function parseOptionalText(value, fieldName, max, { required = false } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  return sanitizeString(value, fieldName, { required, max });
}

function parseInteger(value, fieldName, { required = false, min = 1 } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  const normalized = String(value).trim();
  if (!/^-?\d+$/.test(normalized)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  return parsed;
}

function parseDecimal(value, fieldName, { required = false, min = 0 } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  const raw = String(value).trim().replace(/[R$\s]/gi, '');
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < min) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  return parsed;
}

function parseDateOnly(value, fieldName, { required = false } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  const normalized = sanitizeString(value, fieldName, {
    required: true,
    max: 10,
    pattern: /^\d{4}-\d{2}-\d{2}$/
  });

  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  return normalized;
}

function parseEnum(value, fieldName, allowedValues = [], { required = false } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  const normalized = String(value || '').trim().toUpperCase();
  if (!allowedValues.includes(normalized)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  return normalized;
}

function parseBoolean(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'sim', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'no'].includes(normalized)) return false;
  throw new ValidationError(`${fieldName} invalido.`);
}

function parseIdArray(value, fieldName) {
  if (value === undefined || value === null || value === '') return undefined;
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} deve ser uma lista.`);
  }

  return [...new Set(value.map((item) => parseInteger(item, fieldName, { required: true })))];
}

function validateProvisaoCategoriaQuery(query = {}) {
  ensureAllowedKeys(query, ['incluir_inativas'], 'Consulta de categorias macro');

  return {
    incluir_inativas: parseBoolean(query.incluir_inativas, 'Incluir inativas')
  };
}

function validateProvisaoCategoriaCreateBody(body = {}) {
  ensureAllowedKeys(body, ['nome', 'descricao', 'ordem_exibicao', 'ativo'], 'Categoria macro');

  return {
    nome: parseOptionalText(body.nome, 'Nome', 160, { required: true }),
    descricao: parseOptionalText(body.descricao, 'Descricao', 4000),
    ordem_exibicao: parseInteger(body.ordem_exibicao, 'Ordem de exibicao', { min: 1 }),
    ativo: parseBoolean(body.ativo, 'Ativo')
  };
}

function validateProvisaoCategoriaUpdateBody(body = {}) {
  ensureAllowedKeys(body, ['nome', 'descricao', 'ordem_exibicao', 'ativo'], 'Atualizacao de categoria macro');

  const payload = {
    nome: parseOptionalText(body.nome, 'Nome', 160),
    descricao: parseOptionalText(body.descricao, 'Descricao', 4000),
    ordem_exibicao: parseInteger(body.ordem_exibicao, 'Ordem de exibicao', { min: 1 }),
    ativo: parseBoolean(body.ativo, 'Ativo')
  };

  const normalized = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(normalized).length) {
    throw new ValidationError('Nenhum campo valido informado para atualizar a categoria macro.');
  }

  return normalized;
}

function validateProvisaoFinanceiraQuery(query = {}) {
  ensureAllowedKeys(
    query,
    [
      'obra_id',
      'categoria_macro_id',
      'usuario_criacao_id',
      'status',
      'prioridade',
      'busca',
      'fornecedor',
      'data_inicial',
      'data_final',
      'valor_minimo',
      'valor_maximo',
      'sort_by',
      'sort_dir',
      'page',
      'limit'
    ],
    'Consulta de provisionamentos'
  );

  return {
    obra_id: parseInteger(query.obra_id, 'Obra'),
    categoria_macro_id: parseInteger(query.categoria_macro_id, 'Categoria macro'),
    usuario_criacao_id: parseInteger(query.usuario_criacao_id, 'Criador'),
    status: parseEnum(query.status, 'Status', STATUS_PROVISAO),
    prioridade: parseEnum(query.prioridade, 'Prioridade', PRIORIDADES_PROVISAO),
    busca: parseOptionalText(query.busca, 'Busca', 160),
    fornecedor: parseOptionalText(query.fornecedor, 'Fornecedor', 160),
    data_inicial: parseDateOnly(query.data_inicial, 'Data inicial'),
    data_final: parseDateOnly(query.data_final, 'Data final'),
    valor_minimo: parseDecimal(query.valor_minimo, 'Valor minimo', { min: 0 }),
    valor_maximo: parseDecimal(query.valor_maximo, 'Valor maximo', { min: 0 }),
    sort_by: parseOptionalText(query.sort_by, 'Ordenacao', 60),
    sort_dir: parseOptionalText(query.sort_dir, 'Direcao da ordenacao', 4),
    page: parseInteger(query.page, 'Pagina', { min: 1 }),
    limit: parseInteger(query.limit, 'Limite', { min: 1 })
  };
}

function validateProvisaoFinanceiraCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'obra_id',
      'categoria_macro_id',
      'item_macro',
      'descricao',
      'fornecedor_id',
      'fornecedor_texto',
      'data_prevista_desembolso',
      'valor_previsto',
      'comentario',
      'prioridade'
    ],
    'Provisionamento financeiro'
  );

  return {
    obra_id: parseInteger(body.obra_id, 'Obra', { required: true }),
    categoria_macro_id: parseInteger(body.categoria_macro_id, 'Categoria macro'),
    item_macro: parseOptionalText(body.item_macro, 'Item macro', 160),
    descricao: parseOptionalText(body.descricao, 'Descricao', 5000, { required: true }),
    fornecedor_id: parseInteger(body.fornecedor_id, 'Fornecedor'),
    fornecedor_texto: parseOptionalText(body.fornecedor_texto, 'Fornecedor em texto', 180),
    data_prevista_desembolso: parseDateOnly(body.data_prevista_desembolso, 'Data prevista de desembolso', { required: true }),
    valor_previsto: parseDecimal(body.valor_previsto, 'Valor previsto', { required: true, min: 0.01 }),
    comentario: parseOptionalText(body.comentario, 'Comentario', 4000),
    prioridade: parseEnum(body.prioridade, 'Prioridade', PRIORIDADES_PROVISAO)
  };
}

function validateProvisaoFinanceiraUpdateBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'categoria_macro_id',
      'item_macro',
      'descricao',
      'fornecedor_id',
      'fornecedor_texto',
      'data_prevista_desembolso',
      'valor_previsto',
      'comentario',
      'prioridade'
    ],
    'Atualizacao de provisionamento financeiro'
  );

  const payload = {
    categoria_macro_id: parseInteger(body.categoria_macro_id, 'Categoria macro'),
    item_macro: parseOptionalText(body.item_macro, 'Item macro', 160),
    descricao: parseOptionalText(body.descricao, 'Descricao', 5000),
    fornecedor_id: parseInteger(body.fornecedor_id, 'Fornecedor'),
    fornecedor_texto: parseOptionalText(body.fornecedor_texto, 'Fornecedor em texto', 180),
    data_prevista_desembolso: parseDateOnly(body.data_prevista_desembolso, 'Data prevista de desembolso'),
    valor_previsto: parseDecimal(body.valor_previsto, 'Valor previsto', { min: 0.01 }),
    comentario: parseOptionalText(body.comentario, 'Comentario', 4000),
    prioridade: parseEnum(body.prioridade, 'Prioridade', PRIORIDADES_PROVISAO)
  };

  const normalized = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(normalized).length) {
    throw new ValidationError('Nenhum campo valido informado para atualizar a provisao financeira.');
  }

  return normalized;
}

function validateProvisaoComentarioBody(body = {}) {
  ensureAllowedKeys(body, ['comentario'], 'Comentario do provisionamento');

  return {
    comentario: parseOptionalText(body.comentario, 'Comentario', 4000, { required: true })
  };
}

function validateProvisaoStatusBody(body = {}) {
  ensureAllowedKeys(body, ['comentario'], 'Acao de status do provisionamento');

  return {
    comentario: parseOptionalText(body.comentario, 'Comentario', 4000)
  };
}

function validateProvisaoDashboardQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'categoria_macro_id', 'status', 'prioridade', 'data_inicial', 'data_final'],
    'Consulta do dashboard de provisionamento'
  );

  return {
    obra_id: parseInteger(query.obra_id, 'Obra'),
    categoria_macro_id: parseInteger(query.categoria_macro_id, 'Categoria macro'),
    status: parseEnum(query.status, 'Status', STATUS_PROVISAO),
    prioridade: parseEnum(query.prioridade, 'Prioridade', PRIORIDADES_PROVISAO),
    data_inicial: parseDateOnly(query.data_inicial, 'Data inicial'),
    data_final: parseDateOnly(query.data_final, 'Data final')
  };
}

function validateProvisaoIdParams(params = {}) {
  ensureAllowedKeys(params, ['id'], 'Parametros do provisionamento');

  return {
    id: String(parseInteger(params.id, 'Provisionamento financeiro', { required: true }))
  };
}

function validateProvisaoAnexoLinkParams(params = {}) {
  ensureAllowedKeys(params, ['anexoId'], 'Parametros do anexo do provisionamento');

  return {
    anexoId: String(parseInteger(params.anexoId, 'Anexo do provisionamento', { required: true }))
  };
}

function validateProvisionamentoFluxoConfigBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'modo_operacional',
      'aprovacao_ativa',
      'controle_vencimento_ativo',
      'integracao_solicitacoes_ativa',
      'exigir_provisao_na_solicitacao',
      'bloquear_solicitacao_sem_provisao',
      'validar_saldo_provisao',
      'somente_provisoes_aprovadas',
      'permitir_multiplas_provisoes_por_solicitacao',
      'tipos_solicitacao_exigem_provisao'
    ],
    'Configuracao do fluxo de provisionamento'
  );

  return {
    modo_operacional: parseEnum(body.modo_operacional, 'Modo operacional', MODOS_PROVISIONAMENTO),
    aprovacao_ativa: parseBoolean(body.aprovacao_ativa, 'Aprovacao ativa'),
    controle_vencimento_ativo: parseBoolean(body.controle_vencimento_ativo, 'Controle de vencimento ativo'),
    integracao_solicitacoes_ativa: parseBoolean(body.integracao_solicitacoes_ativa, 'Integracao com solicitacoes ativa'),
    exigir_provisao_na_solicitacao: parseBoolean(body.exigir_provisao_na_solicitacao, 'Exigir provisao na solicitacao'),
    bloquear_solicitacao_sem_provisao: parseBoolean(body.bloquear_solicitacao_sem_provisao, 'Bloquear solicitacao sem provisao'),
    validar_saldo_provisao: parseBoolean(body.validar_saldo_provisao, 'Validar saldo da provisao'),
    somente_provisoes_aprovadas: parseBoolean(body.somente_provisoes_aprovadas, 'Somente provisoes aprovadas'),
    permitir_multiplas_provisoes_por_solicitacao: parseBoolean(body.permitir_multiplas_provisoes_por_solicitacao, 'Permitir multiplas provisoes por solicitacao'),
    tipos_solicitacao_exigem_provisao: parseIdArray(body.tipos_solicitacao_exigem_provisao, 'Tipos de solicitacao')
  };
}

module.exports = {
  validateProvisionamentoFluxoConfigBody,
  validateProvisaoAnexoLinkParams,
  validateProvisaoCategoriaCreateBody,
  validateProvisaoCategoriaQuery,
  validateProvisaoCategoriaUpdateBody,
  validateProvisaoComentarioBody,
  validateProvisaoDashboardQuery,
  validateProvisaoFinanceiraCreateBody,
  validateProvisaoFinanceiraQuery,
  validateProvisaoFinanceiraUpdateBody,
  validateProvisaoIdParams,
  validateProvisaoStatusBody
};
