const {
  ensureAllowedKeys,
  ValidationError,
  sanitizeString
} = require('../middlewares/validation');

const COMERCIAL_FORMA_RECEBIMENTO = [
  'DINHEIRO',
  'PIX',
  'CARTAO',
  'TRANSFERENCIA',
  'BOLETO',
  'CHEQUE',
  'PERMUTA',
  'BENS',
  'OUTROS'
];

const UNIDADE_STATUS = [
  'DISPONIVEL',
  'RESERVADA',
  'VENDIDA',
  'DISTRATADA',
  'BLOQUEADA'
];

const CONTRATO_STATUS = [
  'RASCUNHO',
  'ATIVO',
  'INADIMPLENTE',
  'QUITADO',
  'DISTRATADO',
  'CANCELADO'
];

const TABELA_PRECO_STATUS = [
  'RASCUNHO',
  'ATIVA',
  'ARQUIVADA'
];

const PARCELA_TIPOS = [
  'ENTRADA',
  'PARCELA',
  'INTERMEDIARIA',
  'CHAVES',
  'BALAO',
  'OUTRA'
];

function isBlank(value) {
  return value == null || String(value).trim() === '';
}

function parseInteger(value, fieldName, { required = false, positiveOnly = true } = {}) {
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
  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  if (positiveOnly && parsed <= 0) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  return parsed;
}

function parseDecimal(value, fieldName, { required = false, min = null } = {}) {
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

  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  if (min != null && parsed < min) {
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

function parseCodigoUnidade(value, { required = false } = {}) {
  if (isBlank(value)) {
    if (required) throw new ValidationError('Codigo e obrigatorio.');
    return undefined;
  }
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    throw new ValidationError('Codigo deve ser um numero inteiro positivo.');
  }
  const num = Number(normalized);
  if (!Number.isInteger(num) || num <= 0) {
    throw new ValidationError('Codigo deve ser um numero inteiro positivo.');
  }
  return normalized;
}

function parseOptionalText(value, fieldName, max, { required = false } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  return sanitizeString(value, fieldName, {
    required,
    max
  });
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
  if (['true', '1', 'sim'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'nao', 'não'].includes(normalized)) {
    return false;
  }

  throw new ValidationError(`${fieldName} invalido.`);
}

function validateComercialEmpreendimentoQuery(query = {}) {
  ensureAllowedKeys(query, ['q', 'ativo', 'obra_id'], 'Consulta de empreendimentos');

  return {
    q: parseOptionalText(query.q, 'Busca', 120),
    ativo: parseBoolean(query.ativo, 'Ativo'),
    obra_id: parseInteger(query.obra_id, 'Obra')
  };
}

function validateComercialEmpreendimentoCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['obra_id', 'codigo', 'nome', 'descricao', 'endereco', 'numero', 'bairro', 'cidade', 'estado', 'cep', 'ativo'],
    'Empreendimento'
  );

  return {
    obra_id: parseInteger(body.obra_id, 'Obra'),
    codigo: parseOptionalText(body.codigo, 'Codigo', 60),
    nome: parseOptionalText(body.nome, 'Nome', 160, { required: true }),
    descricao: parseOptionalText(body.descricao, 'Descricao', 255),
    endereco: parseOptionalText(body.endereco, 'Endereco', 255),
    numero: parseOptionalText(body.numero, 'Numero', 60),
    bairro: parseOptionalText(body.bairro, 'Bairro', 120),
    cidade: parseOptionalText(body.cidade, 'Cidade', 120),
    estado: parseOptionalText(body.estado, 'Estado', 2),
    cep: parseOptionalText(body.cep, 'CEP', 20),
    ativo: parseBoolean(body.ativo, 'Ativo')
  };
}

function validateComercialEmpreendimentoUpdateBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['obra_id', 'codigo', 'nome', 'descricao', 'endereco', 'numero', 'bairro', 'cidade', 'estado', 'cep', 'ativo'],
    'Empreendimento'
  );

  const data = Object.fromEntries(
    Object.entries({
      obra_id: parseInteger(body.obra_id, 'Obra'),
      codigo: parseOptionalText(body.codigo, 'Codigo', 60),
      nome: parseOptionalText(body.nome, 'Nome', 160),
      descricao: parseOptionalText(body.descricao, 'Descricao', 255),
      endereco: parseOptionalText(body.endereco, 'Endereco', 255),
      numero: parseOptionalText(body.numero, 'Numero', 60),
      bairro: parseOptionalText(body.bairro, 'Bairro', 120),
      cidade: parseOptionalText(body.cidade, 'Cidade', 120),
      estado: parseOptionalText(body.estado, 'Estado', 2),
      cep: parseOptionalText(body.cep, 'CEP', 20),
      ativo: parseBoolean(body.ativo, 'Ativo')
    }).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(data).length) {
    throw new ValidationError('Nenhum campo valido informado para atualizar o empreendimento.');
  }
  return data;
}

function validateComercialUnidadeQuery(query = {}) {
  ensureAllowedKeys(query, ['q', 'ativo', 'empreendimento_id', 'situacao'], 'Consulta de unidades comerciais');

  return {
    q: parseOptionalText(query.q, 'Busca', 120),
    ativo: parseBoolean(query.ativo, 'Ativo'),
    empreendimento_id: parseInteger(query.empreendimento_id, 'Empreendimento'),
    situacao: parseEnum(query.situacao, 'Situacao', UNIDADE_STATUS)
  };
}

function validateComercialUnidadeCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'empreendimento_id',
      'parceiro_reserva_id',
      'codigo',
      'nome',
      'bloco',
      'torre',
      'pavimento',
      'tipologia',
      'metragem_privativa',
      'fracao_ideal',
      'valor_tabela',
      'valor_base_venda',
      'situacao',
      'reservado_ate',
      'observacoes',
      'ativo'
    ],
    'Unidade comercial'
  );

  return {
    empreendimento_id: parseInteger(body.empreendimento_id, 'Empreendimento', { required: true }),
    parceiro_reserva_id: parseInteger(body.parceiro_reserva_id, 'Parceiro da reserva'),
    codigo: parseCodigoUnidade(body.codigo, { required: true }),
    nome: parseOptionalText(body.nome, 'Nome', 160),
    bloco: parseOptionalText(body.bloco, 'Bloco', 60),
    torre: parseOptionalText(body.torre, 'Torre', 60),
    pavimento: parseOptionalText(body.pavimento, 'Pavimento', 60),
    tipologia: parseOptionalText(body.tipologia, 'Tipologia', 80),
    metragem_privativa: parseDecimal(body.metragem_privativa, 'Metragem privativa', { min: 0 }),
    fracao_ideal: parseDecimal(body.fracao_ideal, 'Fracao ideal', { min: 0 }),
    valor_tabela: parseDecimal(body.valor_tabela, 'Valor tabela', { min: 0 }),
    valor_base_venda: parseDecimal(body.valor_base_venda, 'Valor base de venda', { min: 0 }),
    situacao: parseEnum(body.situacao, 'Situacao', UNIDADE_STATUS),
    reservado_ate: parseDateOnly(body.reservado_ate, 'Reservado ate'),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000),
    ativo: parseBoolean(body.ativo, 'Ativo')
  };
}

function validateComercialUnidadeUpdateBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'empreendimento_id',
      'parceiro_reserva_id',
      'codigo',
      'nome',
      'bloco',
      'torre',
      'pavimento',
      'tipologia',
      'metragem_privativa',
      'fracao_ideal',
      'valor_tabela',
      'valor_base_venda',
      'situacao',
      'reservado_ate',
      'observacoes',
      'ativo'
    ],
    'Unidade comercial'
  );

  const data = Object.fromEntries(
    Object.entries({
      empreendimento_id: parseInteger(body.empreendimento_id, 'Empreendimento'),
      parceiro_reserva_id: parseInteger(body.parceiro_reserva_id, 'Parceiro da reserva'),
      codigo: parseCodigoUnidade(body.codigo),
      nome: parseOptionalText(body.nome, 'Nome', 160),
      bloco: parseOptionalText(body.bloco, 'Bloco', 60),
      torre: parseOptionalText(body.torre, 'Torre', 60),
      pavimento: parseOptionalText(body.pavimento, 'Pavimento', 60),
      tipologia: parseOptionalText(body.tipologia, 'Tipologia', 80),
      metragem_privativa: parseDecimal(body.metragem_privativa, 'Metragem privativa', { min: 0 }),
      fracao_ideal: parseDecimal(body.fracao_ideal, 'Fracao ideal', { min: 0 }),
      valor_tabela: parseDecimal(body.valor_tabela, 'Valor tabela', { min: 0 }),
      valor_base_venda: parseDecimal(body.valor_base_venda, 'Valor base de venda', { min: 0 }),
      situacao: parseEnum(body.situacao, 'Situacao', UNIDADE_STATUS),
      reservado_ate: parseDateOnly(body.reservado_ate, 'Reservado ate'),
      observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000),
      ativo: parseBoolean(body.ativo, 'Ativo')
    }).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(data).length) {
    throw new ValidationError('Nenhum campo valido informado para atualizar a unidade comercial.');
  }
  return data;
}

function normalizeParcelas(parcelas) {
  if (!Array.isArray(parcelas) || parcelas.length === 0) {
    throw new ValidationError('Informe ao menos uma parcela para o contrato comercial.');
  }

  return parcelas.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new ValidationError(`Parcela ${index + 1} invalida.`);
    }

    ensureAllowedKeys(
      item,
      ['sequencia', 'descricao', 'tipo_parcela', 'forma_recebimento_prevista', 'data_vencimento', 'valor', 'observacoes'],
      `Parcela ${index + 1}`
    );

    return {
      sequencia: index + 1,
      descricao: parseOptionalText(item.descricao, `Descricao da parcela ${index + 1}`, 160, { required: true }),
      tipo_parcela: parseEnum(item.tipo_parcela, `Tipo da parcela ${index + 1}`, PARCELA_TIPOS) || 'PARCELA',
      forma_recebimento_prevista: parseEnum(
        item.forma_recebimento_prevista,
        `Forma de recebimento prevista da parcela ${index + 1}`,
        COMERCIAL_FORMA_RECEBIMENTO
      ),
      data_vencimento: parseDateOnly(item.data_vencimento, `Vencimento da parcela ${index + 1}`, { required: true }),
      valor: parseDecimal(item.valor, `Valor da parcela ${index + 1}`, { required: true, min: 0.01 }),
      observacoes: parseOptionalText(item.observacoes, `Observacoes da parcela ${index + 1}`, 1000)
    };
  });
}

function normalizeTabelaPrecoItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new ValidationError('Informe ao menos um item para a tabela de preco.');
  }

  return itens.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new ValidationError(`Item ${index + 1} da tabela de preco invalido.`);
    }

    ensureAllowedKeys(
      item,
      ['unidade_comercial_id', 'valor_tabela', 'valor_minimo', 'observacoes'],
      `Item ${index + 1} da tabela de preco`
    );

    return {
      unidade_comercial_id: parseInteger(item.unidade_comercial_id, `Unidade do item ${index + 1}`, { required: true }),
      valor_tabela: parseDecimal(item.valor_tabela, `Valor tabela do item ${index + 1}`, { required: true, min: 0.01 }),
      valor_minimo: parseDecimal(item.valor_minimo, `Valor minimo do item ${index + 1}`, { min: 0 }),
      observacoes: parseOptionalText(item.observacoes, `Observacoes do item ${index + 1}`, 1000)
    };
  });
}

function validateComercialContratoQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['q', 'status', 'empreendimento_id', 'unidade_comercial_id', 'parceiro_id'],
    'Consulta de contratos comerciais'
  );

  return {
    q: parseOptionalText(query.q, 'Busca', 120),
    status: parseEnum(query.status, 'Status', CONTRATO_STATUS),
    empreendimento_id: parseInteger(query.empreendimento_id, 'Empreendimento'),
    unidade_comercial_id: parseInteger(query.unidade_comercial_id, 'Unidade comercial'),
    parceiro_id: parseInteger(query.parceiro_id, 'Cliente')
  };
}

function validateComercialTabelaPrecoQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['q', 'empreendimento_id', 'status'],
    'Consulta de tabelas de preco'
  );

  return {
    q: parseOptionalText(query.q, 'Busca', 120),
    empreendimento_id: parseInteger(query.empreendimento_id, 'Empreendimento'),
    status: parseEnum(query.status, 'Status da tabela', TABELA_PRECO_STATUS)
  };
}

function validateComercialTabelaPrecoCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['empreendimento_id', 'codigo', 'nome', 'status', 'vigencia_inicio', 'vigencia_fim', 'observacoes', 'itens'],
    'Tabela de preco'
  );

  return {
    empreendimento_id: parseInteger(body.empreendimento_id, 'Empreendimento', { required: true }),
    codigo: parseOptionalText(body.codigo, 'Codigo', 60),
    nome: parseOptionalText(body.nome, 'Nome', 160, { required: true }),
    status: parseEnum(body.status, 'Status da tabela', TABELA_PRECO_STATUS) || 'RASCUNHO',
    vigencia_inicio: parseDateOnly(body.vigencia_inicio, 'Vigencia inicial'),
    vigencia_fim: parseDateOnly(body.vigencia_fim, 'Vigencia final'),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000),
    itens: normalizeTabelaPrecoItens(body.itens)
  };
}

function validateComercialTabelaPrecoUpdateBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['codigo', 'nome', 'status', 'vigencia_inicio', 'vigencia_fim', 'observacoes', 'itens'],
    'Atualizacao de tabela de preco'
  );

  const payload = {
    codigo: parseOptionalText(body.codigo, 'Codigo', 60),
    nome: parseOptionalText(body.nome, 'Nome', 160),
    status: parseEnum(body.status, 'Status da tabela', TABELA_PRECO_STATUS),
    vigencia_inicio: parseDateOnly(body.vigencia_inicio, 'Vigencia inicial'),
    vigencia_fim: parseDateOnly(body.vigencia_fim, 'Vigencia final'),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000),
    itens: Object.prototype.hasOwnProperty.call(body, 'itens') ? normalizeTabelaPrecoItens(body.itens) : undefined
  };

  const normalized = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(normalized).length) {
    throw new ValidationError('Nenhum campo valido informado para atualizar a tabela de preco.');
  }

  return normalized;
}

function validateComercialContratoCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'empreendimento_id',
      'unidade_comercial_id',
      'parceiro_id',
      'corretor_parceiro_id',
      'obra_id',
      'categoria_financeira_id',
      'categoria_financeira_comissao_id',
      'numero',
      'status',
      'data_contrato',
      'valor_total',
      'valor_entrada',
      'desconto_concedido',
      'indice_reajuste',
      'corretor_nome',
      'comissao_percentual',
      'observacoes',
      'parcelas'
    ],
    'Contrato comercial'
  );

  return {
    empreendimento_id: parseInteger(body.empreendimento_id, 'Empreendimento', { required: true }),
    unidade_comercial_id: parseInteger(body.unidade_comercial_id, 'Unidade comercial', { required: true }),
    parceiro_id: parseInteger(body.parceiro_id, 'Cliente', { required: true }),
    corretor_parceiro_id: Object.prototype.hasOwnProperty.call(body, 'corretor_parceiro_id')
      ? (parseInteger(body.corretor_parceiro_id, 'Corretor') ?? null)
      : undefined,
    obra_id: parseInteger(body.obra_id, 'Obra', { required: true }),
    categoria_financeira_id: parseInteger(body.categoria_financeira_id, 'Categoria financeira'),
    categoria_financeira_comissao_id: Object.prototype.hasOwnProperty.call(body, 'categoria_financeira_comissao_id')
      ? (parseInteger(body.categoria_financeira_comissao_id, 'Categoria financeira da comissao') ?? null)
      : undefined,
    numero: parseOptionalText(body.numero, 'Numero do contrato', 120, { required: true }),
    status: parseEnum(body.status, 'Status', CONTRATO_STATUS) || 'ATIVO',
    data_contrato: parseDateOnly(body.data_contrato, 'Data do contrato', { required: true }),
    valor_total: parseDecimal(body.valor_total, 'Valor total', { min: 0.01 }),
    valor_entrada: parseDecimal(body.valor_entrada, 'Valor de entrada', { min: 0 }),
    desconto_concedido: parseDecimal(body.desconto_concedido, 'Desconto concedido', { min: 0 }),
    indice_reajuste: parseOptionalText(body.indice_reajuste, 'Indice de reajuste', 60),
    corretor_nome: parseOptionalText(body.corretor_nome, 'Corretor', 160),
    comissao_percentual: parseDecimal(body.comissao_percentual, 'Comissao percentual', { min: 0 }),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000),
    parcelas: normalizeParcelas(body.parcelas)
  };
}

function validateComercialContratoUpdateBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'status',
      'categoria_financeira_id',
      'corretor_parceiro_id',
      'categoria_financeira_comissao_id',
      'desconto_concedido',
      'indice_reajuste',
      'corretor_nome',
      'comissao_percentual',
      'observacoes'
    ],
    'Atualizacao de contrato comercial'
  );

  const payload = {
    status: parseEnum(body.status, 'Status', CONTRATO_STATUS),
    categoria_financeira_id: parseInteger(body.categoria_financeira_id, 'Categoria financeira'),
    corretor_parceiro_id: Object.prototype.hasOwnProperty.call(body, 'corretor_parceiro_id')
      ? (parseInteger(body.corretor_parceiro_id, 'Corretor') ?? null)
      : undefined,
    categoria_financeira_comissao_id: Object.prototype.hasOwnProperty.call(body, 'categoria_financeira_comissao_id')
      ? (parseInteger(body.categoria_financeira_comissao_id, 'Categoria financeira da comissao') ?? null)
      : undefined,
    desconto_concedido: parseDecimal(body.desconto_concedido, 'Desconto concedido', { min: 0 }),
    indice_reajuste: parseOptionalText(body.indice_reajuste, 'Indice de reajuste', 60),
    corretor_nome: parseOptionalText(body.corretor_nome, 'Corretor', 160),
    comissao_percentual: parseDecimal(body.comissao_percentual, 'Comissao percentual', { min: 0 }),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000)
  };

  const normalized = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(normalized).length) {
    throw new ValidationError('Nenhum campo valido informado para atualizar o contrato comercial.');
  }

  return normalized;
}

function validateComercialContratoDistratoBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['data_distrato', 'motivo_distrato', 'observacoes'],
    'Distrato de contrato comercial'
  );

  return {
    data_distrato: parseDateOnly(body.data_distrato, 'Data do distrato', { required: true }),
    motivo_distrato: parseOptionalText(body.motivo_distrato, 'Motivo do distrato', 255, { required: true }),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000)
  };
}

function validateComercialContratoTrocaUnidadeBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['unidade_comercial_destino_id', 'novo_valor_total', 'data_efetiva', 'observacoes'],
    'Troca de unidade do contrato comercial'
  );

  return {
    unidade_comercial_destino_id: parseInteger(body.unidade_comercial_destino_id, 'Nova unidade', { required: true }),
    novo_valor_total: parseDecimal(body.novo_valor_total, 'Novo valor total', { min: 0.01 }),
    data_efetiva: parseDateOnly(body.data_efetiva, 'Data efetiva'),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000)
  };
}

module.exports = {
  COMERCIAL_FORMA_RECEBIMENTO,
  CONTRATO_STATUS,
  PARCELA_TIPOS,
  TABELA_PRECO_STATUS,
  UNIDADE_STATUS,
  validateComercialContratoDistratoBody,
  validateComercialContratoCreateBody,
  validateComercialContratoQuery,
  validateComercialContratoTrocaUnidadeBody,
  validateComercialContratoUpdateBody,
  validateComercialEmpreendimentoCreateBody,
  validateComercialEmpreendimentoQuery,
  validateComercialEmpreendimentoUpdateBody,
  validateComercialTabelaPrecoCreateBody,
  validateComercialTabelaPrecoQuery,
  validateComercialTabelaPrecoUpdateBody,
  validateComercialUnidadeCreateBody,
  validateComercialUnidadeQuery,
  validateComercialUnidadeUpdateBody
};
