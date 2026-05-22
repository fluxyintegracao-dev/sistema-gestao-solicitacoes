const {
  ensureAllowedKeys,
  ValidationError,
  sanitizeString
} = require('../middlewares/validation');

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

function parseDecimal(
  value,
  fieldName,
  { required = false, min = null, scale = null, brazilianFormat = false } = {}
) {
  if (isBlank(value)) {
    if (required) {
      throw new ValidationError(`${fieldName} e obrigatorio.`);
    }
    return undefined;
  }

  const raw = String(value).trim().replace(/[R$\s]/gi, '');
  let normalized = raw;

  if (brazilianFormat) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw)) {
      throw new ValidationError(`${fieldName} invalido.`);
    }

    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  }

  if (!brazilianFormat && scale != null) {
    const [, decimalPart = ''] = normalized.split('.');
    if (decimalPart.length > scale) {
      throw new ValidationError(`${fieldName} invalido.`);
    }
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  if (min != null && parsed < min) {
    throw new ValidationError(`${fieldName} invalido.`);
  }

  return parsed;
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

function parseOptionalUrl(value, fieldName) {
  if (isBlank(value)) {
    return undefined;
  }

  const normalized = sanitizeString(value, fieldName, {
    required: false,
    max: 500
  });

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('invalid');
    }
  } catch (error) {
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

function parseIdArray(value, fieldName, { required = false, maxItems = 500 } = {}) {
  const list = Array.isArray(value) ? value : [];

  if (required && list.length === 0) {
    throw new ValidationError(`${fieldName} e obrigatorio.`);
  }

  if (list.length > maxItems) {
    throw new ValidationError(`${fieldName} excede o limite permitido.`);
  }

  return [
    ...new Set(
      list.map((item) => parseInteger(item, fieldName, { required: true }))
    )
  ];
}

function validateContratoQuery(query = {}) {
  ensureAllowedKeys(query, ['obra_id', 'ref', 'codigo', 'modo'], 'Consulta de contratos');

  return {
    obra_id: parseInteger(query.obra_id, 'Obra'),
    ref: parseOptionalText(query.ref, 'Referencia', 255),
    codigo: parseOptionalText(query.codigo, 'Codigo', 255),
    modo: parseOptionalText(query.modo, 'Modo', 30)
  };
}

function validateContratoCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'obra_id',
      'codigo',
      'ref_contrato',
      'fornecedor',
      'descricao',
      'itens_apropriacao',
      'valor_total',
      'tipo_macro_id',
      'tipo_sub_id',
      'ajuste_solicitado',
      'ajuste_pago'
    ],
    'Contrato'
  );

  const refContrato = parseOptionalText(body.ref_contrato, 'Ref. do contrato', 255);
  const fornecedor = parseOptionalText(body.fornecedor, 'Fornecedor', 255);

  if (!refContrato && !fornecedor) {
    throw new ValidationError('Ref. do contrato e obrigatoria.');
  }

  return {
    obra_id: parseInteger(body.obra_id, 'Obra', { required: true }),
    codigo: parseOptionalText(body.codigo, 'Codigo', 255, { required: true }),
    ref_contrato: refContrato,
    fornecedor,
    descricao: parseOptionalText(body.descricao, 'Descricao', 5000),
    itens_apropriacao: parseOptionalText(body.itens_apropriacao, 'Itens de apropriacao', 5000),
    valor_total: parseDecimal(body.valor_total, 'Valor total', { required: true, min: 0 }),
    tipo_macro_id: parseInteger(body.tipo_macro_id, 'Tipo macro'),
    tipo_sub_id: parseInteger(body.tipo_sub_id, 'Tipo sub'),
    ajuste_solicitado: parseDecimal(body.ajuste_solicitado, 'Ajuste solicitado', { min: 0 }),
    ajuste_pago: parseDecimal(body.ajuste_pago, 'Ajuste pago', { min: 0 })
  };
}

function validateContratoUpdateBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'obra_id',
      'codigo',
      'ref_contrato',
      'fornecedor',
      'descricao',
      'itens_apropriacao',
      'valor_total',
      'tipo_macro_id',
      'tipo_sub_id',
      'ativo',
      'ajuste_solicitado',
      'ajuste_pago'
    ],
    'Atualizacao de contrato'
  );

  return {
    obra_id: parseInteger(body.obra_id, 'Obra'),
    codigo: parseOptionalText(body.codigo, 'Codigo', 255),
    ref_contrato: parseOptionalText(body.ref_contrato, 'Ref. do contrato', 255),
    fornecedor: parseOptionalText(body.fornecedor, 'Fornecedor', 255),
    descricao: parseOptionalText(body.descricao, 'Descricao', 5000),
    itens_apropriacao: parseOptionalText(body.itens_apropriacao, 'Itens de apropriacao', 5000),
    valor_total: parseDecimal(body.valor_total, 'Valor total', { min: 0 }),
    tipo_macro_id: parseInteger(body.tipo_macro_id, 'Tipo macro'),
    tipo_sub_id: parseInteger(body.tipo_sub_id, 'Tipo sub'),
    ativo: parseBoolean(body.ativo, 'Ativo'),
    ajuste_solicitado: parseDecimal(body.ajuste_solicitado, 'Ajuste solicitado', { min: 0 }),
    ajuste_pago: parseDecimal(body.ajuste_pago, 'Ajuste pago', { min: 0 })
  };
}

function validateCompraQuery(query = {}) {
  ensureAllowedKeys(query, ['obra_id'], 'Consulta de compras');

  return {
    obra_id: parseInteger(query.obra_id, 'Obra')
  };
}

function validateCompraCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['obra_id', 'necessario_para', 'observacoes', 'link_geral', 'itens'],
    'Solicitacao de compra'
  );

  if (!Array.isArray(body.itens) || body.itens.length === 0) {
    throw new ValidationError('Informe ao menos um item.');
  }

  if (body.itens.length > 300) {
    throw new ValidationError('Quantidade de itens excede o limite permitido.');
  }

  body.itens.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new ValidationError(`Item ${index + 1} invalido.`);
    }
  });

  return {
    obra_id: parseInteger(body.obra_id, 'Obra', { required: true }),
    necessario_para: parseDateOnly(body.necessario_para, 'Necessario para'),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 5000),
    link_geral: parseOptionalUrl(body.link_geral, 'Link geral'),
    itens: body.itens
  };
}

function validateCompraIntegrarBody(body = {}) {
  ensureAllowedKeys(body, ['numero_sienge'], 'Integracao da solicitacao de compra');

  return {
    numero_sienge: parseOptionalText(body.numero_sienge, 'Numero do Sienge', 120, { required: true })
  };
}

function validateCompraEnviarBody(body = {}) {
  ensureAllowedKeys(body, ['fornecedores'], 'Envio para fornecedores');

  if (!Array.isArray(body.fornecedores) || body.fornecedores.length === 0) {
    throw new ValidationError('Selecione ao menos um fornecedor.');
  }

  if (body.fornecedores.length > 100) {
    throw new ValidationError('Quantidade de fornecedores excede o limite permitido.');
  }

  const fornecedores = body.fornecedores.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ValidationError(`Fornecedor ${index + 1} invalido.`);
    }

    ensureAllowedKeys(
      entry,
      ['fornecedor_id', 'parceiro_id', 'nome', 'email', 'whatsapp', 'contato'],
      `Fornecedor ${index + 1}`
    );

    const fornecedorId = parseInteger(entry.fornecedor_id, 'Fornecedor', { positiveOnly: true });
    const parceiroId = parseInteger(entry.parceiro_id, 'Parceiro', { positiveOnly: true });
    const nome = parseOptionalText(entry.nome, 'Nome do fornecedor', 255);
    const email = parseOptionalText(entry.email, 'Email do fornecedor', 255);
    const whatsapp = parseOptionalText(entry.whatsapp, 'WhatsApp do fornecedor', 100);
    const contato = parseOptionalText(entry.contato, 'Contato do fornecedor', 255);

    if (!fornecedorId && !parceiroId && !nome) {
      throw new ValidationError(`Fornecedor ${index + 1} invalido.`);
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)) {
      throw new ValidationError(`Email do fornecedor ${index + 1} invalido.`);
    }

    return {
      fornecedor_id: fornecedorId,
      parceiro_id: parceiroId,
      nome,
      email,
      whatsapp,
      contato
    };
  });

  return {
    fornecedores
  };
}

function validateCompraEncerrarBody(body = {}) {
  ensureAllowedKeys(body, ['vencedores'], 'Encerramento da cotacao');

  if (!Array.isArray(body.vencedores) || body.vencedores.length === 0) {
    throw new ValidationError('Selecione ao menos um vencedor.');
  }

  if (body.vencedores.length > 500) {
    throw new ValidationError('Quantidade de vencedores excede o limite permitido.');
  }

  return {
    vencedores: body.vencedores.map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new ValidationError(`Vencedor ${index + 1} invalido.`);
      }

      ensureAllowedKeys(entry, ['resposta_item_id'], `Vencedor ${index + 1}`);

      return {
        resposta_item_id: parseInteger(entry.resposta_item_id, 'Resposta vencedora', {
          required: true
        })
      };
    })
  };
}

function validateCompraPedidoQuery(query = {}) {
  ensureAllowedKeys(query, ['obra_id', 'solicitacao_id', 'status', 'q'], 'Consulta de pedidos de compra');

  return {
    obra_id: parseInteger(query.obra_id, 'Obra'),
    solicitacao_id: parseInteger(query.solicitacao_id, 'Solicitacao de compra'),
    status: parseOptionalText(query.status, 'Status', 40),
    q: parseOptionalText(query.q, 'Busca', 120)
  };
}

function validateCompraPedidoAuditoriaQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'pedido_id', 'item_id', 'acao', 'q'],
    'Consulta de auditoria de pedidos de compra'
  );

  return {
    obra_id: parseInteger(query.obra_id, 'Obra'),
    pedido_id: parseInteger(query.pedido_id, 'Pedido de compra'),
    item_id: parseInteger(query.item_id, 'Item do pedido'),
    acao: parseOptionalText(query.acao, 'Acao', 60),
    q: parseOptionalText(query.q, 'Busca', 120)
  };
}

function validateCompraRelatorioFornecedoresQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'data_inicio', 'data_fim'],
    'Consulta do relatorio de fornecedores de compras'
  );

  const dataInicio = parseDateOnly(query.data_inicio, 'Data inicial');
  const dataFim = parseDateOnly(query.data_fim, 'Data final');

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw new ValidationError('Data inicial nao pode ser maior que a data final.');
  }

  return {
    obra_id: parseInteger(query.obra_id, 'Obra'),
    data_inicio: dataInicio,
    data_fim: dataFim
  };
}

function validateCompraRelatorioEconomiaCotacoesQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'data_inicio', 'data_fim'],
    'Consulta do relatorio de economia em cotacoes'
  );

  const dataInicio = parseDateOnly(query.data_inicio, 'Data inicial');
  const dataFim = parseDateOnly(query.data_fim, 'Data final');

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw new ValidationError('Data inicial nao pode ser maior que a data final.');
  }

  return {
    obra_id: parseInteger(query.obra_id, 'Obra'),
    data_inicio: dataInicio,
    data_fim: dataFim
  };
}

function validateCompraPedidoCreateBody(body = {}) {
  ensureAllowedKeys(body, ['fornecedor_compra_id'], 'Criacao de pedido de compra');

  return {
    fornecedor_compra_id: parseInteger(body.fornecedor_compra_id, 'Fornecedor', {
      required: true
    })
  };
}

function validateCompraPedidoItemAddBody(body = {}) {
  ensureAllowedKeys(body, ['resposta_item_id'], 'Inclusao de item no pedido');

  return {
    resposta_item_id: parseInteger(body.resposta_item_id, 'Resposta da cotacao', {
      required: true
    })
  };
}

function validateCompraPedidoStatusBody(body = {}) {
  ensureAllowedKeys(body, ['status'], 'Atualizacao de status do pedido');

  return {
    status: parseOptionalText(body.status, 'Status do pedido', 40, { required: true })
  };
}

function validateCompraPedidoItemUpdateBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['quantidade_pedido', 'preco_unitario', 'observacoes'],
    'Atualizacao de item do pedido'
  );

  if (
    body.quantidade_pedido === undefined &&
    body.preco_unitario === undefined &&
    body.observacoes === undefined
  ) {
    throw new ValidationError('Informe ao menos um campo para atualizar o item do pedido.');
  }

  return {
    quantidade_pedido: parseDecimal(body.quantidade_pedido, 'Quantidade do pedido', {
      min: 0,
      scale: 2,
      brazilianFormat: true
    }),
    preco_unitario: parseDecimal(body.preco_unitario, 'Preco unitario', { min: 0 }),
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 5000)
  };
}

function validateCompraPedidoItemParams(params = {}) {
  ensureAllowedKeys(params, ['id', 'itemId'], 'Parametros do item do pedido');

  return {
    id: parseInteger(params.id, 'Pedido', { required: true }),
    itemId: parseInteger(params.itemId, 'Item do pedido', { required: true })
  };
}

function validateSolicitacaoCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'obra_id',
      'tipo_solicitacao_id',
      'tipo_macro_id',
      'tipo_sub_id',
      'descricao',
      'valor',
      'parceiro_id',
      'apropriacao_id',
      'area_responsavel',
      'diretoria_fluxo_codigo',
      'codigo_contrato',
      'contrato_id',
      'data_vencimento',
      'data_inicio_medicao',
      'data_fim_medicao',
      'itens_apropriacao',
      'ref_contrato_abertura'
    ],
    'Solicitacao'
  );

  return {
    obra_id: parseInteger(body.obra_id, 'Obra', { required: true }),
    tipo_solicitacao_id: parseInteger(body.tipo_solicitacao_id, 'Tipo de solicitacao', { required: true }),
    tipo_macro_id: parseInteger(body.tipo_macro_id, 'Tipo macro'),
    tipo_sub_id: parseInteger(body.tipo_sub_id, 'Tipo sub'),
    descricao: body.descricao == null ? undefined : String(body.descricao),
    valor: body.valor === '' || body.valor == null ? undefined : parseDecimal(body.valor, 'Valor', { min: 0 }),
    parceiro_id: parseInteger(body.parceiro_id, 'Parceiro'),
    apropriacao_id: parseInteger(body.apropriacao_id, 'Apropriacao'),
    area_responsavel: parseOptionalText(body.area_responsavel, 'Area responsavel', 120, { required: true }),
    diretoria_fluxo_codigo: parseOptionalText(body.diretoria_fluxo_codigo, 'Diretoria de aprovacao', 120),
    codigo_contrato: parseOptionalText(body.codigo_contrato, 'Codigo do contrato', 255),
    contrato_id: parseInteger(body.contrato_id, 'Contrato'),
    data_vencimento: parseDateOnly(body.data_vencimento, 'Data de vencimento'),
    data_inicio_medicao: parseDateOnly(body.data_inicio_medicao, 'Data inicial da medicao'),
    data_fim_medicao: parseDateOnly(body.data_fim_medicao, 'Data final da medicao'),
    itens_apropriacao: parseOptionalText(body.itens_apropriacao, 'Itens de apropriacao', 5000),
    ref_contrato_abertura: parseOptionalText(body.ref_contrato_abertura, 'Ref. do contrato', 255)
  };
}

function validateSolicitacaoStatusBody(body = {}) {
  ensureAllowedKeys(body, ['status'], 'Atualizacao de status');

  return {
    status: parseOptionalText(body.status, 'Status', 120, { required: true })
  };
}

function validateSolicitacaoPedidoBody(body = {}) {
  ensureAllowedKeys(body, ['numero_pedido'], 'Atualizacao de pedido');

  return {
    numero_pedido: parseOptionalText(body.numero_pedido, 'Numero do pedido', 120)
  };
}

function validateSolicitacaoRefContratoBody(body = {}) {
  ensureAllowedKeys(body, ['contrato_id'], 'Atualizacao de contrato');

  return {
    contrato_id: parseInteger(body.contrato_id, 'Contrato', { required: true })
  };
}

function validateSolicitacaoValorBody(body = {}) {
  ensureAllowedKeys(body, ['valor'], 'Atualizacao de valor');

  return {
    valor: body.valor === '' || body.valor == null ? null : parseDecimal(body.valor, 'Valor', { min: 0 })
  };
}

function validateSolicitacaoResponsavelBody(body = {}) {
  ensureAllowedKeys(body, ['usuario_responsavel_id'], 'Atribuicao de responsavel');

  return {
    usuario_responsavel_id: parseInteger(body.usuario_responsavel_id, 'Responsavel', { required: true })
  };
}

function validateSolicitacaoComentarioBody(body = {}) {
  ensureAllowedKeys(body, ['descricao', 'mencoes'], 'Comentario');

  const mencoes = body.mencoes == null
    ? []
    : parseIdArray(body.mencoes, 'Mencoes', { maxItems: 50 });

  return {
    descricao: parseOptionalText(body.descricao, 'Comentario', 5000, { required: true }),
    mencoes
  };
}

function validateSolicitacaoArquivarMassaBody(body = {}) {
  ensureAllowedKeys(body, ['solicitacao_ids'], 'Arquivamento em massa');

  return {
    solicitacao_ids: parseIdArray(body.solicitacao_ids, 'Solicitacoes', {
      required: true,
      maxItems: 500
    })
  };
}

function validateSolicitacaoEnviarSetorBody(body = {}) {
  ensureAllowedKeys(body, ['setor_destino'], 'Envio de setor');

  return {
    setor_destino: parseOptionalText(body.setor_destino, 'Setor de destino', 120, {
      required: true
    })
  };
}

function validateSolicitacaoEnviarSetorMassaBody(body = {}) {
  ensureAllowedKeys(body, ['solicitacao_ids', 'setor_destino'], 'Envio em massa');

  return {
    solicitacao_ids: parseIdArray(body.solicitacao_ids, 'Solicitacoes', {
      required: true,
      maxItems: 500
    }),
    setor_destino: parseOptionalText(body.setor_destino, 'Setor de destino', 120, {
      required: true
    })
  };
}

module.exports = {
  validateCompraCreateBody,
  validateCompraEncerrarBody,
  validateCompraEnviarBody,
  validateCompraIntegrarBody,
  validateCompraPedidoCreateBody,
  validateCompraPedidoItemAddBody,
  validateCompraPedidoItemParams,
  validateCompraPedidoStatusBody,
  validateCompraPedidoItemUpdateBody,
  validateCompraPedidoAuditoriaQuery,
  validateCompraPedidoQuery,
  validateCompraQuery,
  validateCompraRelatorioEconomiaCotacoesQuery,
  validateCompraRelatorioFornecedoresQuery,
  validateContratoCreateBody,
  validateContratoQuery,
  validateContratoUpdateBody,
  validateSolicitacaoArquivarMassaBody,
  validateSolicitacaoComentarioBody,
  validateSolicitacaoCreateBody,
  validateSolicitacaoEnviarSetorBody,
  validateSolicitacaoEnviarSetorMassaBody,
  validateSolicitacaoPedidoBody,
  validateSolicitacaoRefContratoBody,
  validateSolicitacaoResponsavelBody,
  validateSolicitacaoStatusBody,
  validateSolicitacaoValorBody
};
