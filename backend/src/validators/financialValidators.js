const {
  ensureAllowedKeys,
  ValidationError,
  sanitizeString
} = require('../middlewares/validation');
const { COMERCIAL_FORMA_RECEBIMENTO } = require('./commercialValidators');
const { TIPOS_INTERCOMPANY } = require('../constants/intercompany');
const {
  CLASSIFICACOES_GERENCIAIS_FINANCEIRAS
} = require('../constants/categoriaFinanceiraGerencial');

const CATEGORIAS_BEM = ['VEICULO', 'IMOVEL', 'TERRENO', 'SERVICO', 'MATERIAL', 'CREDITO', 'OUTROS'];
const FORMAS_COBRANCA = ['BOLETO', 'PIX', 'OUTROS'];
const STATUS_COBRANCA = ['NAO_APLICAVEL', 'PENDENTE_EMISSAO', 'EMITIDO', 'PAGO_BANCO', 'CONCILIADO', 'CANCELADO'];
const CAMPOS_INTERCOMPANY_TITULO = [
  'intercompany_group_id',
  'empresa_origem_id',
  'empresa_destino_id',
  'tipo_intercompany',
  'motivo_intercompany',
  'elimina_consolidado',
  'transferencia_interna'
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

function parseNullableText(value, fieldName, max) {
  if (value === undefined) {
    return undefined;
  }
  if (isBlank(value)) {
    return null;
  }

  return sanitizeString(value, fieldName, {
    required: false,
    max
  });
}

function parseParcelasTitulo(value) {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new ValidationError('Parcelas devem ser enviadas em lista.');
  }

  return value.map((item, index) => {
    ensureAllowedKeys(
      item || {},
      [
        'valor',
        'data_vencimento',
        'numero_documento',
        'observacoes',
        'cheque_numero',
        'cheque_banco',
        'cheque_agencia',
        'cheque_conta',
        'cheque_emitente'
      ],
      `Parcela ${index + 1}`
    );

    return {
      valor: parseDecimal(item?.valor, `Valor da parcela ${index + 1}`, { min: 0.01 }),
      data_vencimento: parseDateOnly(item?.data_vencimento, `Vencimento da parcela ${index + 1}`),
      numero_documento: parseOptionalText(item?.numero_documento, `Documento da parcela ${index + 1}`, 120),
      observacoes: parseOptionalText(item?.observacoes, `Observacoes da parcela ${index + 1}`, 1000),
      cheque_numero: parseOptionalText(item?.cheque_numero, `Numero do cheque ${index + 1}`, 60),
      cheque_banco: parseOptionalText(item?.cheque_banco, `Banco do cheque ${index + 1}`, 120),
      cheque_agencia: parseOptionalText(item?.cheque_agencia, `Agencia do cheque ${index + 1}`, 40),
      cheque_conta: parseOptionalText(item?.cheque_conta, `Conta do cheque ${index + 1}`, 60),
      cheque_emitente: parseOptionalText(item?.cheque_emitente, `Emitente do cheque ${index + 1}`, 160)
    };
  });
}

function parsePagamentosTitulo(value) {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new ValidationError('Pagamentos devem ser enviados em lista.');
  }

  return value.map((item, index) => {
    ensureAllowedKeys(
      item || {},
      [
        'valor',
        'data_vencimento',
        'numero_documento',
        'observacoes',
        'forma_pagamento_id',
        'cartao_id',
        'quantidade_parcelas',
        'data_compra',
        'parcelas'
      ],
      `Pagamento ${index + 1}`
    );

    return {
      valor: parseDecimal(item?.valor, `Valor do pagamento ${index + 1}`, { min: 0.01 }),
      data_vencimento: parseDateOnly(item?.data_vencimento, `Vencimento do pagamento ${index + 1}`),
      numero_documento: parseOptionalText(item?.numero_documento, `Documento do pagamento ${index + 1}`, 120),
      observacoes: parseOptionalText(item?.observacoes, `Observacoes do pagamento ${index + 1}`, 1000),
      forma_pagamento_id: parseInteger(item?.forma_pagamento_id, `Forma de pagamento ${index + 1}`),
      cartao_id: parseInteger(item?.cartao_id, `Cartao ${index + 1}`),
      quantidade_parcelas: parseInteger(item?.quantidade_parcelas, `Quantidade de parcelas ${index + 1}`),
      data_compra: parseDateOnly(item?.data_compra, `Data da compra ${index + 1}`),
      parcelas: parseParcelasTitulo(item?.parcelas)
    };
  });
}

function parseEnum(value, fieldName, allowedValues = [], { required = false } = {}) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  const normalized = String(value).trim().toUpperCase();
  if (!allowedValues.includes(normalized)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  return normalized;
}

function parseNullableEnum(value, fieldName, allowedValues = []) {
  if (value === undefined) {
    return undefined;
  }
  if (isBlank(value)) {
    return null;
  }

  return parseEnum(value, fieldName, allowedValues, { required: false });
}

function parseNullableDateOnly(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }
  if (isBlank(value)) {
    return null;
  }

  return parseDateOnly(value, fieldName, { required: false });
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

function validateFinanceTituloQuery(query = {}) {
  ensureAllowedKeys(
    query,
    [
      'tipo',
      'status',
      'q',
      'codigo',
      'empresa_id',
      'obra_id',
      'apropriacao_id',
      'parceiro_id',
      'categoria_financeira_id',
      'solicitacao_id',
      'numero_documento',
      'descricao',
      'data_emissao_inicial',
      'data_emissao_final',
      'vencimento_inicial',
      'vencimento_final'
    ],
    'Consulta de titulos financeiros'
  );

  const dataEmissaoInicial = parseDateOnly(query.data_emissao_inicial, 'Emissao inicial');
  const dataEmissaoFinal = parseDateOnly(query.data_emissao_final, 'Emissao final');
  const vencimentoInicial = parseDateOnly(query.vencimento_inicial, 'Vencimento inicial');
  const vencimentoFinal = parseDateOnly(query.vencimento_final, 'Vencimento final');

  if (dataEmissaoInicial && dataEmissaoFinal && dataEmissaoInicial > dataEmissaoFinal) {
    throw new ValidationError('Emissao inicial nao pode ser maior que emissao final.');
  }

  if (vencimentoInicial && vencimentoFinal && vencimentoInicial > vencimentoFinal) {
    throw new ValidationError('Vencimento inicial nao pode ser maior que vencimento final.');
  }

  return {
    tipo: parseEnum(query.tipo, 'Tipo', ['PAGAR', 'RECEBER']),
    status: parseEnum(query.status, 'Status', ['ABERTO', 'PARCIAL', 'QUITADO', 'CANCELADO', 'ESTORNADO', 'ATIVA', 'CANCELADA']),
    q: parseOptionalText(query.q, 'Busca', 120),
    codigo: parseOptionalText(query.codigo, 'Codigo do titulo', 40),
    empresa_id: parseInteger(query.empresa_id, 'Empresa do grupo'),
    obra_id: parseInteger(query.obra_id, 'Obra'),
    parceiro_id: parseInteger(query.parceiro_id, 'Parceiro'),
    categoria_financeira_id: parseInteger(query.categoria_financeira_id, 'Categoria financeira'),
    solicitacao_id: parseInteger(query.solicitacao_id, 'Solicitacao'),
    numero_documento: parseOptionalText(query.numero_documento, 'Numero do documento', 120),
    descricao: parseOptionalText(query.descricao, 'Descricao', 120),
    data_emissao_inicial: dataEmissaoInicial,
    data_emissao_final: dataEmissaoFinal,
    vencimento_inicial: vencimentoInicial,
    vencimento_final: vencimentoFinal
  };
}

function validateFinanceFluxoCaixaQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['periodo', 'data_inicial', 'data_final', 'obra_id'],
    'Consulta de fluxo de caixa'
  );

  const dataInicial = parseDateOnly(query.data_inicial, 'Data inicial');
  const dataFinal = parseDateOnly(query.data_final, 'Data final');

  if ((dataInicial && !dataFinal) || (!dataInicial && dataFinal)) {
    throw new ValidationError('Informe data inicial e data final para o filtro personalizado.');
  }

  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    throw new ValidationError('Data inicial nao pode ser maior que a data final.');
  }

  return {
    periodo: parseEnum(
      query.periodo,
      'Periodo',
      ['HOJE', '7_DIAS', '30_DIAS', '90_DIAS', 'MES_ATUAL', 'PROXIMO_MES', 'PERSONALIZADO']
    ),
    data_inicial: dataInicial,
    data_final: dataFinal,
    obra_id: parseInteger(query.obra_id, 'Obra')
  };
}

function validateFinanceFluxoConsolidadoQuery(query = {}) {
  ensureAllowedKeys(
    query,
    [
      'periodo',
      'data_inicial',
      'data_final',
      'holding_id',
      'empresa_id',
      'obra_id',
      'excluir_intercompany'
    ],
    'Consulta de fluxo de caixa consolidado'
  );

  const base = validateFinanceFluxoCaixaQuery({
    periodo: query.periodo,
    data_inicial: query.data_inicial,
    data_final: query.data_final,
    obra_id: query.obra_id
  });

  return {
    ...base,
    holding_id: parseInteger(query.holding_id, 'Holding'),
    empresa_id: parseInteger(query.empresa_id, 'Empresa do grupo'),
    excluir_intercompany: parseBoolean(query.excluir_intercompany, 'Excluir intercompany')
  };
}

function validateFinanceDreQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['periodo', 'data_inicial', 'data_final', 'empresa_id', 'holding_id', 'obra_id', 'excluir_intercompany'],
    'Consulta de DRE'
  );

  const base = validateFinanceFluxoCaixaQuery({
    periodo: query.periodo,
    data_inicial: query.data_inicial,
    data_final: query.data_final,
    obra_id: query.obra_id
  });

  return {
    ...base,
    empresa_id: parseInteger(query.empresa_id, 'Empresa do grupo'),
    holding_id: parseInteger(query.holding_id, 'Holding'),
    excluir_intercompany: parseBoolean(query.excluir_intercompany, 'Excluir intercompany')
  };
}

function validateFinanceEndividamentoQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['periodo', 'data_inicial', 'data_final', 'empresa_id', 'holding_id', 'obra_id', 'excluir_intercompany', 'limit'],
    'Consulta de endividamento financeiro'
  );

  const base = validateFinanceFluxoCaixaQuery({
    periodo: query.periodo,
    data_inicial: query.data_inicial,
    data_final: query.data_final,
    obra_id: query.obra_id
  });
  const limit = parseInteger(query.limit, 'Limite');

  return {
    ...base,
    empresa_id: parseInteger(query.empresa_id, 'Empresa do grupo'),
    holding_id: parseInteger(query.holding_id, 'Holding'),
    excluir_intercompany: parseBoolean(query.excluir_intercompany, 'Excluir intercompany'),
    limit: limit ? Math.min(limit, 500) : undefined
  };
}

function validateFinanceIntercompanyQuery(query = {}) {
  ensureAllowedKeys(
    query,
    [
      'periodo',
      'data_inicial',
      'data_final',
      'holding_id',
      'empresa_id',
      'tipo_intercompany',
      'status',
      'elimina_consolidado',
      'limit'
    ],
    'Consulta de intercompany financeiro'
  );

  const base = validateFinanceFluxoCaixaQuery({
    periodo: query.periodo,
    data_inicial: query.data_inicial,
    data_final: query.data_final
  });
  const limit = parseInteger(query.limit, 'Limite');

  return {
    ...base,
    holding_id: parseInteger(query.holding_id, 'Holding'),
    empresa_id: parseInteger(query.empresa_id, 'Empresa do grupo'),
    tipo_intercompany: parseEnum(query.tipo_intercompany, 'Tipo intercompany', TIPOS_INTERCOMPANY),
    status: parseEnum(query.status, 'Status', ['ABERTO', 'PARCIAL', 'QUITADO', 'CANCELADO', 'ESTORNADO']),
    elimina_consolidado: parseBoolean(query.elimina_consolidado, 'Eliminar no consolidado'),
    limit: limit ? Math.min(limit, 1000) : undefined
  };
}

function validateFinanceBaixasQuery(query = {}) {
  ensureAllowedKeys(
    query,
    [
      'tipo',
      'status_movimento',
      'q',
      'obra_id',
      'parceiro_id',
      'categoria_financeira_id',
      'conta_bancaria_id',
      'data_inicial',
      'data_final',
      'limit'
    ],
    'Consulta de baixas financeiras'
  );

  const dataInicial = parseDateOnly(query.data_inicial, 'Data inicial');
  const dataFinal = parseDateOnly(query.data_final, 'Data final');

  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    throw new ValidationError('Data inicial nao pode ser maior que data final.');
  }

  const limit = parseInteger(query.limit, 'Limite');

  return {
    tipo: parseEnum(query.tipo, 'Tipo', ['PAGAR', 'RECEBER']),
    status_movimento: parseEnum(query.status_movimento, 'Status da baixa', ['ATIVO', 'ESTORNADO', 'TODOS']),
    q: parseOptionalText(query.q, 'Busca', 120),
    obra_id: parseInteger(query.obra_id, 'Obra'),
    parceiro_id: parseInteger(query.parceiro_id, 'Parceiro'),
    categoria_financeira_id: parseInteger(query.categoria_financeira_id, 'Categoria financeira'),
    conta_bancaria_id: parseInteger(query.conta_bancaria_id, 'Conta bancaria'),
    data_inicial: dataInicial,
    data_final: dataFinal,
    limit: limit ? Math.min(limit, 500) : undefined
  };
}

function validateFinanceRelatorioAnaliticoQuery(query = {}) {
  ensureAllowedKeys(
    query,
    [
      'tipo',
      'status_titulo',
      'status_movimento',
      'q',
      'obra_id',
      'parceiro_id',
      'categoria_financeira_id',
      'conta_bancaria_id',
      'data_inicial',
      'data_final',
      'vencimento_inicial',
      'vencimento_final',
      'limit'
    ],
    'Consulta de relatorio financeiro analitico'
  );

  const dataInicial = parseDateOnly(query.data_inicial, 'Data inicial');
  const dataFinal = parseDateOnly(query.data_final, 'Data final');
  const vencimentoInicial = parseDateOnly(query.vencimento_inicial, 'Vencimento inicial');
  const vencimentoFinal = parseDateOnly(query.vencimento_final, 'Vencimento final');

  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    throw new ValidationError('Data inicial nao pode ser maior que data final.');
  }

  if (vencimentoInicial && vencimentoFinal && vencimentoInicial > vencimentoFinal) {
    throw new ValidationError('Vencimento inicial nao pode ser maior que vencimento final.');
  }

  const limit = parseInteger(query.limit, 'Limite');

  return {
    tipo: parseEnum(query.tipo, 'Tipo', ['PAGAR', 'RECEBER']),
    status_titulo: parseEnum(query.status_titulo, 'Status do titulo', ['ABERTO', 'PARCIAL', 'QUITADO', 'CANCELADO', 'ESTORNADO']),
    status_movimento: parseEnum(query.status_movimento, 'Status da baixa', ['ATIVO', 'ESTORNADO', 'TODOS', 'SEM_BAIXA']),
    q: parseOptionalText(query.q, 'Busca', 120),
    obra_id: parseInteger(query.obra_id, 'Obra'),
    parceiro_id: parseInteger(query.parceiro_id, 'Parceiro'),
    categoria_financeira_id: parseInteger(query.categoria_financeira_id, 'Categoria financeira'),
    conta_bancaria_id: parseInteger(query.conta_bancaria_id, 'Conta bancaria'),
    data_inicial: dataInicial,
    data_final: dataFinal,
    vencimento_inicial: vencimentoInicial,
    vencimento_final: vencimentoFinal,
    limit: limit ? Math.min(limit, 1000) : undefined
  };
}

function validateFinanceConciliacaoQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['status', 'conta_bancaria_id', 'data_inicial', 'data_final', 'page', 'page_size'],
    'Consulta de conciliacao bancaria'
  );

  const dataInicial = parseDateOnly(query.data_inicial, 'Data inicial');
  const dataFinal = parseDateOnly(query.data_final, 'Data final');

  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    throw new ValidationError('Data inicial nao pode ser maior que a data final.');
  }

  return {
    status: parseEnum(query.status, 'Status', ['PENDENTE', 'CONCILIADO', 'IGNORADO', 'TODOS']),
    conta_bancaria_id: parseInteger(query.conta_bancaria_id, 'Conta bancaria'),
    data_inicial: dataInicial,
    data_final: dataFinal,
    page: parseInteger(query.page, 'Pagina'),
    page_size: parseInteger(query.page_size, 'Quantidade por pagina')
  };
}

function validateFinanceConciliacaoImportacoesQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['conta_bancaria_id', 'data_inicial', 'data_final', 'limit'],
    'Historico de importacoes OFX'
  );

  const dataInicial = parseDateOnly(query.data_inicial, 'Data inicial');
  const dataFinal = parseDateOnly(query.data_final, 'Data final');

  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    throw new ValidationError('Data inicial nao pode ser maior que a data final.');
  }

  return {
    conta_bancaria_id: parseInteger(query.conta_bancaria_id, 'Conta bancaria'),
    data_inicial: dataInicial,
    data_final: dataFinal,
    limit: parseInteger(query.limit, 'Limite')
  };
}

function validateFinanceConciliacaoImportBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['conta_bancaria_id'],
    'Importacao de OFX'
  );

  return {
    conta_bancaria_id: parseInteger(body.conta_bancaria_id, 'Conta bancaria', { required: true })
  };
}

function validateFinanceConciliacaoConfirmBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['movimento_financeiro_id'],
    'Confirmacao de conciliacao bancaria'
  );

  return {
    movimento_financeiro_id: parseInteger(body.movimento_financeiro_id, 'Movimento financeiro', { required: true })
  };
}

function validateFinanceConciliacaoTransferenciaBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['conta_contraparte_id', 'descricao', 'tipo_intercompany', 'motivo_intercompany', 'elimina_consolidado'],
    'Conciliacao bancaria por transferencia'
  );

  return {
    conta_contraparte_id: parseInteger(body.conta_contraparte_id, 'Conta contraparte', { required: true }),
    descricao: parseOptionalText(body.descricao, 'Descricao', 255),
    tipo_intercompany: parseEnum(body.tipo_intercompany, 'Tipo intercompany', TIPOS_INTERCOMPANY),
    motivo_intercompany: parseOptionalText(body.motivo_intercompany, 'Motivo intercompany', 255),
    elimina_consolidado: parseBoolean(body.elimina_consolidado, 'Eliminar no consolidado')
  };
}

function validateFinanceConciliacaoTarifaBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['codigo', 'descricao'],
    'Conciliacao bancaria por tarifa'
  );

  return {
    codigo: parseOptionalText(body.codigo, 'Codigo da tarifa', 80, { required: true }),
    descricao: parseOptionalText(body.descricao, 'Descricao', 255)
  };
}

function validateFinanceConciliacaoCriarTituloBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'tipo',
      'obra_id',
      'parceiro_id',
      'valor',
      'data_vencimento',
      'data_emissao',
      'descricao',
      'empresa_id',
      'categoria_financeira_id',
      'observacoes',
      'numero_documento',
      'conta_bancaria_id',
      'forma_recebimento',
      'tipo_permuta',
      'categoria_bem',
      'descricao_bem',
      'valor_referencia_bem',
      'documento_referencia',
      'juros',
      'multa',
      'desconto',
      'data_movimento'
    ],
    'Criacao rapida de titulo na conciliacao bancaria'
  );

  const formaRecebimento = parseEnum(
    body.forma_recebimento,
    'Forma de recebimento',
    COMERCIAL_FORMA_RECEBIMENTO
  );

  return {
    tipo: parseEnum(body.tipo, 'Tipo', ['PAGAR', 'RECEBER'], { required: true }),
    obra_id: parseInteger(body.obra_id, 'Obra', { required: true }),
    parceiro_id: parseInteger(body.parceiro_id, 'Parceiro', { required: true }),
    valor: parseDecimal(body.valor, 'Valor', { required: true, min: 0.01 }),
    data_vencimento: parseDateOnly(body.data_vencimento, 'Data de vencimento', { required: true }),
    data_emissao: parseDateOnly(body.data_emissao, 'Data de emissao'),
    descricao: parseOptionalText(body.descricao, 'Descricao', 255, { required: true }),
    empresa_id: parseInteger(body.empresa_id, 'Empresa pagadora', { required: true }),
    categoria_financeira_id: parseInteger(body.categoria_financeira_id, 'Categoria financeira'),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000),
    numero_documento: parseOptionalText(body.numero_documento, 'Numero do documento', 120),
    conta_bancaria_id: parseInteger(body.conta_bancaria_id, 'Conta bancaria', { required: true }),
    forma_recebimento: formaRecebimento,
    tipo_permuta: parseOptionalText(body.tipo_permuta, 'Tipo de permuta', 80),
    categoria_bem: parseEnum(body.categoria_bem, 'Categoria do bem', CATEGORIAS_BEM),
    descricao_bem: parseOptionalText(body.descricao_bem, 'Descricao do bem', 255),
    valor_referencia_bem: parseDecimal(body.valor_referencia_bem, 'Valor de referencia do bem', { min: 0 }),
    documento_referencia: parseOptionalText(body.documento_referencia, 'Documento de referencia', 120),
    juros: parseDecimal(body.juros, 'Juros', { min: 0 }),
    multa: parseDecimal(body.multa, 'Multa', { min: 0 }),
    desconto: parseDecimal(body.desconto, 'Desconto', { min: 0 }),
    data_movimento: parseDateOnly(body.data_movimento, 'Data do movimento', { required: true })
  };
}

function validateFinanceConciliacaoConciliarSugeridosBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['conta_bancaria_id', 'data_inicial', 'data_final', 'status'],
    'Conciliacao em lote por sugestoes'
  );

  const dataInicial = parseDateOnly(body.data_inicial, 'Data inicial');
  const dataFinal = parseDateOnly(body.data_final, 'Data final');

  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    throw new ValidationError('Data inicial nao pode ser maior que a data final.');
  }

  return {
    conta_bancaria_id: parseInteger(body.conta_bancaria_id, 'Conta bancaria'),
    data_inicial: dataInicial,
    data_final: dataFinal,
    status: parseEnum(body.status, 'Status', ['PENDENTE', 'TODOS'])
  };
}

function validateFinanceConciliacaoMovimentosQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['data_inicial', 'data_final', 'documento', 'numero_documento', 'valor_inicial', 'valor_final', 'limit'],
    'Consulta de movimentos para associacao manual'
  );

  const dataInicial = parseDateOnly(query.data_inicial, 'Data inicial');
  const dataFinal = parseDateOnly(query.data_final, 'Data final');
  const valorInicial = parseDecimal(query.valor_inicial, 'Valor inicial', { min: 0 });
  const valorFinal = parseDecimal(query.valor_final, 'Valor final', { min: 0 });

  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    throw new ValidationError('Data inicial nao pode ser maior que a data final.');
  }

  if (
    valorInicial !== undefined &&
    valorFinal !== undefined &&
    valorInicial > valorFinal
  ) {
    throw new ValidationError('Valor inicial nao pode ser maior que o valor final.');
  }

  return {
    data_inicial: dataInicial,
    data_final: dataFinal,
    documento: parseOptionalText(query.documento, 'Documento', 120),
    numero_documento: parseOptionalText(query.numero_documento, 'Numero do documento', 120),
    valor_inicial: valorInicial,
    valor_final: valorFinal,
    limit: parseInteger(query.limit, 'Limite')
  };
}

function validateFinanceTituloCreateFromSolicitacaoBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'tipo',
      'empresa_id',
      'parceiro_id',
      'valor',
      'data_vencimento',
      'data_emissao',
      'descricao',
      'categoria_financeira_id',
      'observacoes',
      'numero_documento',
      'forma_cobranca',
      'status_cobranca',
      'banco_cobranca',
      'nosso_numero',
      'linha_digitavel',
      'codigo_barras',
      'identificador_externo',
      'boleto_emitido_em',
      'forma_pagamento_id',
      'cartao_id',
      'quantidade_parcelas',
      'data_compra',
      'competencia_data',
      'considera_dre',
      'intercompany',
      'empresa_contraparte_id',
      ...CAMPOS_INTERCOMPANY_TITULO,
      'parcelas',
      'pagamentos'
    ],
    'Geracao de titulo financeiro'
  );

  return {
    tipo: parseEnum(body.tipo, 'Tipo', ['PAGAR', 'RECEBER']),
    empresa_id: parseInteger(body.empresa_id, 'Empresa do grupo', { required: true }),
    parceiro_id: parseInteger(body.parceiro_id, 'Parceiro'),
    valor: parseDecimal(body.valor, 'Valor', { min: 0.01 }),
    data_vencimento: parseDateOnly(body.data_vencimento, 'Data de vencimento'),
    data_emissao: parseDateOnly(body.data_emissao, 'Data de emissao'),
    descricao: parseOptionalText(body.descricao, 'Descricao', 255),
    categoria_financeira_id: parseInteger(body.categoria_financeira_id, 'Categoria financeira'),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000),
    numero_documento: parseOptionalText(body.numero_documento, 'Numero do documento', 120),
    forma_cobranca: parseEnum(body.forma_cobranca, 'Forma de cobranca', FORMAS_COBRANCA),
    status_cobranca: parseEnum(body.status_cobranca, 'Status da cobranca', STATUS_COBRANCA),
    banco_cobranca: parseOptionalText(body.banco_cobranca, 'Banco da cobranca', 120),
    nosso_numero: parseOptionalText(body.nosso_numero, 'Nosso numero', 120),
    linha_digitavel: parseOptionalText(body.linha_digitavel, 'Linha digitavel', 255),
    codigo_barras: parseOptionalText(body.codigo_barras, 'Codigo de barras', 255),
    identificador_externo: parseOptionalText(body.identificador_externo, 'Identificador externo', 120),
    boleto_emitido_em: parseDateOnly(body.boleto_emitido_em, 'Data de emissao do boleto'),
    forma_pagamento_id: parseInteger(body.forma_pagamento_id, 'Forma de pagamento'),
    cartao_id: parseInteger(body.cartao_id, 'Cartao'),
    quantidade_parcelas: parseInteger(body.quantidade_parcelas, 'Quantidade de parcelas'),
    data_compra: parseDateOnly(body.data_compra, 'Data da compra'),
    competencia_data: parseDateOnly(body.competencia_data, 'Data de competencia'),
    considera_dre: parseBoolean(body.considera_dre, 'Considera DRE'),
    intercompany: parseBoolean(body.intercompany, 'Intercompany'),
    empresa_contraparte_id: parseInteger(body.empresa_contraparte_id, 'Empresa contraparte'),
    intercompany_group_id: parseOptionalText(body.intercompany_group_id, 'Grupo intercompany', 80),
    empresa_origem_id: parseInteger(body.empresa_origem_id, 'Empresa origem'),
    empresa_destino_id: parseInteger(body.empresa_destino_id, 'Empresa destino'),
    tipo_intercompany: parseEnum(body.tipo_intercompany, 'Tipo intercompany', TIPOS_INTERCOMPANY),
    motivo_intercompany: parseOptionalText(body.motivo_intercompany, 'Motivo intercompany', 255),
    elimina_consolidado: parseBoolean(body.elimina_consolidado, 'Eliminar no consolidado'),
    transferencia_interna: parseBoolean(body.transferencia_interna, 'Transferencia interna'),
    parcelas: parseParcelasTitulo(body.parcelas),
    pagamentos: parsePagamentosTitulo(body.pagamentos)
  };
}

function validateFinanceTituloCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'tipo',
      'empresa_id',
      'obra_id',
      'apropriacao_id',
      'parceiro_id',
      'valor',
      'data_vencimento',
      'data_emissao',
      'descricao',
      'categoria_financeira_id',
      'observacoes',
      'numero_documento',
      'forma_cobranca',
      'status_cobranca',
      'banco_cobranca',
      'nosso_numero',
      'linha_digitavel',
      'codigo_barras',
      'identificador_externo',
      'boleto_emitido_em',
      'forma_pagamento_id',
      'cartao_id',
      'quantidade_parcelas',
      'data_compra',
      'competencia_data',
      'considera_dre',
      'intercompany',
      'empresa_contraparte_id',
      ...CAMPOS_INTERCOMPANY_TITULO,
      'parcelas',
      'pagamentos'
    ],
    'Criacao manual de titulo financeiro'
  );

  return {
    tipo: parseEnum(body.tipo, 'Tipo', ['PAGAR', 'RECEBER'], { required: true }),
    empresa_id: parseInteger(body.empresa_id, 'Empresa do grupo', { required: true }),
    obra_id: parseInteger(body.obra_id, 'Obra/Centro de custo', { required: true }),
    apropriacao_id: parseInteger(body.apropriacao_id, 'Apropriacao'),
    parceiro_id: parseInteger(body.parceiro_id, 'Parceiro', { required: true }),
    valor: parseDecimal(body.valor, 'Valor', { required: true, min: 0.01 }),
    data_vencimento: parseDateOnly(body.data_vencimento, 'Data de vencimento'),
    data_emissao: parseDateOnly(body.data_emissao, 'Data de emissao'),
    descricao: parseOptionalText(body.descricao, 'Descricao', 255, { required: true }),
    categoria_financeira_id: parseInteger(body.categoria_financeira_id, 'Categoria financeira'),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000),
    numero_documento: parseOptionalText(body.numero_documento, 'Numero do documento', 120),
    forma_cobranca: parseEnum(body.forma_cobranca, 'Forma de cobranca', FORMAS_COBRANCA),
    status_cobranca: parseEnum(body.status_cobranca, 'Status da cobranca', STATUS_COBRANCA),
    banco_cobranca: parseOptionalText(body.banco_cobranca, 'Banco da cobranca', 120),
    nosso_numero: parseOptionalText(body.nosso_numero, 'Nosso numero', 120),
    linha_digitavel: parseOptionalText(body.linha_digitavel, 'Linha digitavel', 255),
    codigo_barras: parseOptionalText(body.codigo_barras, 'Codigo de barras', 255),
    identificador_externo: parseOptionalText(body.identificador_externo, 'Identificador externo', 120),
    boleto_emitido_em: parseDateOnly(body.boleto_emitido_em, 'Data de emissao do boleto'),
    forma_pagamento_id: parseInteger(body.forma_pagamento_id, 'Forma de pagamento'),
    cartao_id: parseInteger(body.cartao_id, 'Cartao'),
    quantidade_parcelas: parseInteger(body.quantidade_parcelas, 'Quantidade de parcelas'),
    data_compra: parseDateOnly(body.data_compra, 'Data da compra'),
    competencia_data: parseDateOnly(body.competencia_data, 'Data de competencia'),
    considera_dre: parseBoolean(body.considera_dre, 'Considera DRE'),
    intercompany: parseBoolean(body.intercompany, 'Intercompany'),
    empresa_contraparte_id: parseInteger(body.empresa_contraparte_id, 'Empresa contraparte'),
    intercompany_group_id: parseOptionalText(body.intercompany_group_id, 'Grupo intercompany', 80),
    empresa_origem_id: parseInteger(body.empresa_origem_id, 'Empresa origem'),
    empresa_destino_id: parseInteger(body.empresa_destino_id, 'Empresa destino'),
    tipo_intercompany: parseEnum(body.tipo_intercompany, 'Tipo intercompany', TIPOS_INTERCOMPANY),
    motivo_intercompany: parseOptionalText(body.motivo_intercompany, 'Motivo intercompany', 255),
    elimina_consolidado: parseBoolean(body.elimina_consolidado, 'Eliminar no consolidado'),
    transferencia_interna: parseBoolean(body.transferencia_interna, 'Transferencia interna'),
    parcelas: parseParcelasTitulo(body.parcelas),
    pagamentos: parsePagamentosTitulo(body.pagamentos)
  };
}

function validateFinanceTituloCobrancaBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'forma_cobranca',
      'status_cobranca',
      'banco_cobranca',
      'nosso_numero',
      'linha_digitavel',
      'codigo_barras',
      'identificador_externo',
      'boleto_emitido_em'
    ],
    'Atualizacao de cobranca do titulo financeiro'
  );

  return {
    forma_cobranca: parseNullableEnum(body.forma_cobranca, 'Forma de cobranca', FORMAS_COBRANCA),
    status_cobranca: parseNullableEnum(body.status_cobranca, 'Status da cobranca', STATUS_COBRANCA),
    banco_cobranca: parseNullableText(body.banco_cobranca, 'Banco da cobranca', 120),
    nosso_numero: parseNullableText(body.nosso_numero, 'Nosso numero', 120),
    linha_digitavel: parseNullableText(body.linha_digitavel, 'Linha digitavel', 255),
    codigo_barras: parseNullableText(body.codigo_barras, 'Codigo de barras', 255),
    identificador_externo: parseNullableText(body.identificador_externo, 'Identificador externo', 120),
    boleto_emitido_em: parseNullableDateOnly(body.boleto_emitido_em, 'Data de emissao do boleto')
  };
}

function validateFinanceTituloMovimentoParams(params = {}) {
  const tituloId = parseInteger(params.id, 'Titulo financeiro', { required: true });
  const movimentoId = parseInteger(params.movimentoId, 'Movimento financeiro', { required: true });

  return {
    id: String(tituloId),
    movimentoId: String(movimentoId)
  };
}

function validateFinanceTituloBaixaBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'empresa_id',
      'conta_bancaria_id',
      'forma_recebimento',
      'tipo_permuta',
      'categoria_bem',
      'descricao_bem',
      'valor_referencia_bem',
      'documento_referencia',
      'valor',
      'juros',
      'multa',
      'desconto',
      'data_movimento',
      'observacoes',
      'intercompany',
      'tipo_intercompany',
      'motivo_intercompany',
      'elimina_consolidado',
      'transferencia_interna'
    ],
    'Baixa de titulo financeiro'
  );

  const formaRecebimento = parseEnum(
    body.forma_recebimento,
    'Forma de recebimento',
    COMERCIAL_FORMA_RECEBIMENTO
  );

  const contaBancariaId = parseInteger(body.conta_bancaria_id, 'Conta bancaria');
  const empresaId = parseInteger(body.empresa_id, 'Empresa pagadora', { required: true });
  const exigeContaBancaria = !formaRecebimento || !['DINHEIRO', 'CARTAO', 'PERMUTA', 'BENS', 'OUTROS'].includes(formaRecebimento);

  if (exigeContaBancaria && !contaBancariaId) {
    throw new ValidationError('Conta bancaria e obrigatoria para esta forma de recebimento.');
  }

  return {
    empresa_id: empresaId,
    conta_bancaria_id: contaBancariaId,
    forma_recebimento: formaRecebimento,
    tipo_permuta: parseOptionalText(body.tipo_permuta, 'Tipo de permuta', 80),
    categoria_bem: parseEnum(body.categoria_bem, 'Categoria do bem', CATEGORIAS_BEM),
    descricao_bem: parseOptionalText(body.descricao_bem, 'Descricao do bem', 255),
    valor_referencia_bem: parseDecimal(body.valor_referencia_bem, 'Valor de referencia do bem', { min: 0 }),
    documento_referencia: parseOptionalText(body.documento_referencia, 'Documento de referencia', 120),
    valor: parseDecimal(body.valor, 'Valor', { required: true, min: 0.01 }),
    juros: parseDecimal(body.juros, 'Juros', { min: 0 }),
    multa: parseDecimal(body.multa, 'Multa', { min: 0 }),
    desconto: parseDecimal(body.desconto, 'Desconto', { min: 0 }),
    data_movimento: parseDateOnly(body.data_movimento, 'Data do movimento', { required: true }),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000),
    intercompany: parseBoolean(body.intercompany, 'Intercompany'),
    tipo_intercompany: parseEnum(body.tipo_intercompany, 'Tipo intercompany', TIPOS_INTERCOMPANY),
    motivo_intercompany: parseOptionalText(body.motivo_intercompany, 'Motivo intercompany', 255),
    elimina_consolidado: parseBoolean(body.elimina_consolidado, 'Eliminar no consolidado'),
    transferencia_interna: parseBoolean(body.transferencia_interna, 'Transferencia interna')
  };
}

function validateFinanceTituloEstornoBody(body = {}) {
  ensureAllowedKeys(body, ['observacoes'], 'Estorno de baixa financeira');

  return {
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000)
  };
}

function validateFinanceBoletoTituloQuery(query = {}) {
  ensureAllowedKeys(
    query,
    [
      'q',
      'codigo',
      'empresa_id',
      'numero_documento',
      'obra_id',
      'empreendimento_id',
      'parceiro_id',
      'status_cobranca',
      'origem',
      'vencimento_inicial',
      'vencimento_final'
    ],
    'Consulta de boletos financeiros'
  );

  const vencimentoInicial = parseDateOnly(query.vencimento_inicial, 'Vencimento inicial');
  const vencimentoFinal = parseDateOnly(query.vencimento_final, 'Vencimento final');

  if (vencimentoInicial && vencimentoFinal && vencimentoInicial > vencimentoFinal) {
    throw new ValidationError('Vencimento inicial nao pode ser maior que vencimento final.');
  }

  return {
    q: parseOptionalText(query.q, 'Busca', 120),
    codigo: parseOptionalText(query.codigo, 'Codigo do titulo', 40),
    empresa_id: parseInteger(query.empresa_id, 'Empresa do grupo'),
    numero_documento: parseOptionalText(query.numero_documento, 'Numero do documento', 120),
    obra_id: parseInteger(query.obra_id, 'Obra'),
    empreendimento_id: parseInteger(query.empreendimento_id, 'Empreendimento'),
    parceiro_id: parseInteger(query.parceiro_id, 'Cliente'),
    status_cobranca: parseEnum(query.status_cobranca, 'Status da cobranca', STATUS_COBRANCA),
    origem: parseEnum(query.origem, 'Origem', ['COMERCIAL', 'MANUAL', 'TODOS']),
    vencimento_inicial: vencimentoInicial,
    vencimento_final: vencimentoFinal
  };
}

function validateFinanceCadastroContaBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'nome',
      'banco',
      'agencia',
      'conta',
      'tipo_conta',
      'empresa_id',
      'tipo_operacional',
      'exige_abertura_fechamento',
      'saldo_inicial',
      'ativo'
    ],
    'Conta bancaria'
  );

  return {
    nome: parseOptionalText(body.nome, 'Nome', 120),
    banco: parseOptionalText(body.banco, 'Banco', 120),
    agencia: parseOptionalText(body.agencia, 'Agencia', 40),
    conta: parseOptionalText(body.conta, 'Conta', 60),
    tipo_conta: parseOptionalText(body.tipo_conta, 'Tipo de conta', 40),
    empresa_id: parseInteger(body.empresa_id, 'Empresa do grupo'),
    tipo_operacional: parseEnum(body.tipo_operacional, 'Tipo operacional', ['BANCARIA', 'CAIXA_INTERNO']),
    exige_abertura_fechamento: parseBoolean(body.exige_abertura_fechamento, 'Exige abertura e fechamento'),
    saldo_inicial: parseDecimal(body.saldo_inicial, 'Saldo inicial'),
    ativo: parseBoolean(body.ativo, 'Ativo')
  };
}

function validateFinanceCadastroCategoriaBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['nome', 'tipo', 'descricao', 'dre_grupo', 'dre_subgrupo', 'dre_ordem', 'considera_dre', 'classificacao_gerencial', 'ativo'],
    'Categoria financeira'
  );

  return {
    nome: parseOptionalText(body.nome, 'Nome', 120),
    tipo: parseEnum(body.tipo, 'Tipo', ['PAGAR', 'RECEBER', 'AMBOS']),
    descricao: parseOptionalText(body.descricao, 'Descricao', 255),
    dre_grupo: parseOptionalText(body.dre_grupo, 'Grupo DRE', 80),
    dre_subgrupo: parseOptionalText(body.dre_subgrupo, 'Subgrupo DRE', 120),
    dre_ordem: parseInteger(body.dre_ordem, 'Ordem DRE'),
    considera_dre: parseBoolean(body.considera_dre, 'Considera DRE'),
    classificacao_gerencial: parseEnum(body.classificacao_gerencial, 'Classificacao gerencial', CLASSIFICACOES_GERENCIAIS_FINANCEIRAS),
    ativo: parseBoolean(body.ativo, 'Ativo')
  };
}

function validateFinanceCaixaQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['conta_bancaria_id', 'empresa_id', 'status', 'limit'],
    'Consulta de caixas financeiros'
  );

  return {
    conta_bancaria_id: parseInteger(query.conta_bancaria_id, 'Conta financeira'),
    empresa_id: parseInteger(query.empresa_id, 'Empresa do grupo'),
    status: parseEnum(query.status, 'Status', ['ABERTO', 'FECHADO', 'TODOS']),
    limit: parseInteger(query.limit, 'Limite')
  };
}

function validateFinanceCaixaAberturaBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['conta_bancaria_id', 'data_abertura', 'saldo_abertura', 'observacoes'],
    'Abertura de caixa'
  );

  return {
    conta_bancaria_id: parseInteger(body.conta_bancaria_id, 'Conta financeira', { required: true }),
    data_abertura: parseDateOnly(body.data_abertura, 'Data de abertura'),
    saldo_abertura: parseDecimal(body.saldo_abertura, 'Saldo de abertura'),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000)
  };
}

function validateFinanceCaixaFechamentoBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['data_fechamento', 'saldo_informado', 'observacoes'],
    'Fechamento de caixa'
  );

  return {
    data_fechamento: parseDateOnly(body.data_fechamento, 'Data de fechamento'),
    saldo_informado: parseDecimal(body.saldo_informado, 'Saldo informado', { required: true }),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000)
  };
}

function validateFinanceTransferenciaQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['empresa_id', 'conta_bancaria_id', 'status', 'data_inicial', 'data_final', 'limit'],
    'Consulta de transferencias financeiras'
  );

  const dataInicial = parseDateOnly(query.data_inicial, 'Data inicial');
  const dataFinal = parseDateOnly(query.data_final, 'Data final');

  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    throw new ValidationError('Data inicial nao pode ser maior que data final.');
  }

  return {
    empresa_id: parseInteger(query.empresa_id, 'Empresa do grupo'),
    conta_bancaria_id: parseInteger(query.conta_bancaria_id, 'Conta financeira'),
    status: parseEnum(query.status, 'Status', ['ATIVA', 'CANCELADA', 'TODOS']),
    data_inicial: dataInicial,
    data_final: dataFinal,
    limit: parseInteger(query.limit, 'Limite')
  };
}

function validateFinanceTransferenciaBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'empresa_id',
      'conta_origem_id',
      'conta_destino_id',
      'data_transferencia',
      'valor',
      'descricao',
      'tipo_intercompany',
      'motivo_intercompany',
      'elimina_consolidado'
    ],
    'Transferencia financeira'
  );

  return {
    empresa_id: parseInteger(body.empresa_id, 'Empresa do grupo'),
    conta_origem_id: parseInteger(body.conta_origem_id, 'Conta de origem', { required: true }),
    conta_destino_id: parseInteger(body.conta_destino_id, 'Conta de destino', { required: true }),
    data_transferencia: parseDateOnly(body.data_transferencia, 'Data da transferencia'),
    valor: parseDecimal(body.valor, 'Valor da transferencia', { required: true, min: 0.01 }),
    descricao: parseOptionalText(body.descricao, 'Descricao', 255),
    tipo_intercompany: parseEnum(body.tipo_intercompany, 'Tipo intercompany', TIPOS_INTERCOMPANY),
    motivo_intercompany: parseOptionalText(body.motivo_intercompany, 'Motivo intercompany', 255),
    elimina_consolidado: parseBoolean(body.elimina_consolidado, 'Eliminar no consolidado')
  };
}

function validateFinanceTransferenciaCancelBody(body = {}) {
  ensureAllowedKeys(body, ['observacoes'], 'Cancelamento de transferencia financeira');

  return {
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 4000)
  };
}

function validateFinanceTarifasBancariasConfigBody(body = {}) {
  ensureAllowedKeys(body, ['itens'], 'Configuracao de tarifas bancarias');
  if (!Array.isArray(body.itens)) {
    throw new ValidationError('Tarifas bancarias devem ser enviadas em lista.');
  }

  return {
    itens: body.itens.map((item, index) => {
      ensureAllowedKeys(
        item || {},
        ['codigo', 'nome', 'descricao', 'ativo'],
        `Tarifa bancaria ${index + 1}`
      );

      return {
        codigo: parseOptionalText(item?.codigo, `Codigo da tarifa ${index + 1}`, 80, { required: true }),
        nome: parseOptionalText(item?.nome, `Nome da tarifa ${index + 1}`, 80, { required: true }),
        descricao: parseOptionalText(item?.descricao, `Descricao da tarifa ${index + 1}`, 255),
        ativo: parseBoolean(item?.ativo, `Ativo da tarifa ${index + 1}`)
      };
    })
  };
}

module.exports = {
  FORMAS_COBRANCA,
  STATUS_COBRANCA,
  validateFinanceConciliacaoCriarTituloBody,
  validateFinanceConciliacaoConciliarSugeridosBody,
  validateFinanceConciliacaoConfirmBody,
  validateFinanceConciliacaoTarifaBody,
  validateFinanceConciliacaoTransferenciaBody,
  validateFinanceConciliacaoImportBody,
  validateFinanceConciliacaoImportacoesQuery,
  validateFinanceConciliacaoMovimentosQuery,
  validateFinanceConciliacaoQuery,
  validateFinanceCaixaAberturaBody,
  validateFinanceCaixaFechamentoBody,
  validateFinanceCaixaQuery,
  validateFinanceTransferenciaBody,
  validateFinanceTransferenciaCancelBody,
  validateFinanceTransferenciaQuery,
  validateFinanceTarifasBancariasConfigBody,
  validateFinanceCadastroCategoriaBody,
  validateFinanceCadastroContaBody,
  validateFinanceBoletoTituloQuery,
  validateFinanceBaixasQuery,
  validateFinanceDreQuery,
  validateFinanceEndividamentoQuery,
  validateFinanceFluxoCaixaQuery,
  validateFinanceFluxoConsolidadoQuery,
  validateFinanceIntercompanyQuery,
  validateFinanceRelatorioAnaliticoQuery,
  validateFinanceTituloBaixaBody,
  validateFinanceTituloCobrancaBody,
  validateFinanceTituloCreateBody,
  validateFinanceTituloCreateFromSolicitacaoBody,
  validateFinanceTituloEstornoBody,
  validateFinanceTituloMovimentoParams,
  validateFinanceTituloQuery
};
