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

  const isNumericValue = typeof value === 'number';
  const raw = String(value).trim().replace(/[R$\s]/gi, '');
  let normalized = raw;

  if (brazilianFormat) {
    if (isNumericValue) {
      normalized = raw;
    } else if (raw.includes(',')) {
      const scalePattern = scale == null ? '\\d+' : `\\d{1,${scale}}`;
      const brazilianDecimalPattern = new RegExp(
        `^(?:\\d+|\\d{1,3}(?:\\.\\d{3})+)(?:,${scalePattern})?$`
      );
      if (!brazilianDecimalPattern.test(raw)) {
        throw new ValidationError(`${fieldName} invalido.`);
      }
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) {
      normalized = raw.replace(/\./g, '');
    } else if (/^\d+(?:\.\d+)?$/.test(raw)) {
      normalized = raw;
    } else {
      throw new ValidationError(`${fieldName} invalido.`);
    }
  } else if (raw.includes(',')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  }

  if (scale != null) {
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

function validateContratoRelatorioOperacionalQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'ref', 'codigo', 'ativo', 'data_inicio', 'data_fim'],
    'Relatorio operacional de contratos'
  );

  const dataInicio = parseDateOnly(query.data_inicio, 'Data inicial');
  const dataFim = parseDateOnly(query.data_fim, 'Data final');

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw new ValidationError('Data inicial nao pode ser maior que a data final.');
  }

  return {
    obra_id: parseInteger(query.obra_id, 'Obra'),
    ref: parseOptionalText(query.ref, 'Referencia', 255),
    codigo: parseOptionalText(query.codigo, 'Codigo', 255),
    ativo: parseBoolean(query.ativo, 'Ativo'),
    data_inicio: dataInicio,
    data_fim: dataFim
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
      'ajuste_pago',
      'apropriacoes',
      'credores'
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
    ajuste_pago: parseDecimal(body.ajuste_pago, 'Ajuste pago', { min: 0 }),
    apropriacoes: Array.isArray(body.apropriacoes) ? body.apropriacoes : undefined,
    credores: Array.isArray(body.credores) ? body.credores : undefined
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
      'ajuste_pago',
      'apropriacoes',
      'credores'
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
    ajuste_pago: parseDecimal(body.ajuste_pago, 'Ajuste pago', { min: 0 }),
    apropriacoes: Array.isArray(body.apropriacoes) ? body.apropriacoes : undefined,
    credores: Array.isArray(body.credores) ? body.credores : undefined
  };
}

function validateCompraQuery(query = {}) {
  ensureAllowedKeys(query, ['obra_id', 'contexto'], 'Consulta de compras');
  const contexto = parseOptionalText(query.contexto, 'Contexto', 40);
  const contextoNormalizado = contexto ? String(contexto).trim().toLowerCase() : undefined;
  if (contextoNormalizado && !['delegacao'].includes(contextoNormalizado)) {
    throw new ValidationError('Contexto de consulta invalido.');
  }

  return {
    obra_id: parseInteger(query.obra_id, 'Obra'),
    contexto: contextoNormalizado
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

  function validateCompraDiretaCreateBody(body = {}) {
    ensureAllowedKeys(
      body,
      [
        'obra_id',
        'tipo_solicitacao_id',
        'parceiro_id',
        'necessario_para',
        'observacoes',
        'dados_pagamento',
        'link_geral',
        'itens',
        'origem',
        'forma_pagamento_ids',
        'desconto_total',
        'anexos_cabecalho'
      ],
      'Compra direta'
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

    if (body.anexos_cabecalho !== undefined && !Array.isArray(body.anexos_cabecalho)) {
      throw new ValidationError('Anexos da compra direta invalidos.');
    }

    const formaPagamentoIds = parseIdArray(body.forma_pagamento_ids, 'Forma de pagamento', {
      required: true,
      maxItems: 20
    });

    return {
      obra_id: parseInteger(body.obra_id, 'Obra', { required: true }),
      tipo_solicitacao_id: parseInteger(body.tipo_solicitacao_id, 'Tipo de solicitacao', { positiveOnly: true }),
      parceiro_id: parseInteger(body.parceiro_id, 'Credor', { positiveOnly: true }),
      necessario_para: parseDateOnly(body.necessario_para, 'Necessario para'),
      observacoes: parseOptionalText(body.observacoes, 'Observacoes', 5000),
      dados_pagamento: parseOptionalText(body.dados_pagamento, 'Dados para pagamento', 1500),
      link_geral: parseOptionalUrl(body.link_geral, 'Link geral'),
      origem: 'COMPRA_DIRETA',
      forma_pagamento_ids: formaPagamentoIds,
      desconto_total: parseDecimal(body.desconto_total, 'Desconto concedido', { min: 0, scale: 2 }) || 0,
      anexos_cabecalho: body.anexos_cabecalho || [],
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
  ensureAllowedKeys(body, ['fornecedores', 'itens'], 'Envio para fornecedores');

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
      ['fornecedor_id', 'parceiro_id', 'nome', 'cnpj', 'documento', 'email', 'whatsapp', 'contato'],
      `Fornecedor ${index + 1}`
    );

    const fornecedorId = parseInteger(entry.fornecedor_id, 'Fornecedor', { positiveOnly: true });
    const parceiroId = parseInteger(entry.parceiro_id, 'Parceiro', { positiveOnly: true });
    const nome = parseOptionalText(entry.nome, 'Nome do fornecedor', 255);
    const cnpj = parseOptionalText(entry.cnpj || entry.documento, 'CPF/CNPJ do fornecedor', 30);
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
      cnpj,
      email,
      whatsapp,
      contato
    };
  });

  let itens = null;
  if (body.itens !== undefined) {
    if (!Array.isArray(body.itens) || body.itens.length === 0) {
      throw new ValidationError('Selecione ao menos um item para cotacao.');
    }

    if (body.itens.length > 500) {
      throw new ValidationError('Quantidade de itens excede o limite permitido.');
    }

    itens = body.itens.map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new ValidationError(`Item ${index + 1} invalido.`);
      }

      ensureAllowedKeys(
        entry,
        ['item_tipo', 'item_referencia_id', 'solicitacao_compra_item_id', 'solicitacao_compra_item_manual_id'],
        `Item ${index + 1}`
      );

      const itemTipo = parseOptionalText(entry.item_tipo, 'Tipo do item', 20, { required: true }).toUpperCase();
      if (!['CADASTRADO', 'MANUAL'].includes(itemTipo)) {
        throw new ValidationError(`Tipo do item ${index + 1} invalido.`);
      }

      const referenciaInformada =
        entry.item_referencia_id ||
        (itemTipo === 'CADASTRADO' ? entry.solicitacao_compra_item_id : entry.solicitacao_compra_item_manual_id);

      return {
        item_tipo: itemTipo,
        item_referencia_id: parseInteger(referenciaInformada, `Item ${index + 1}`, { required: true, positiveOnly: true })
      };
    });
  }

  return {
    fornecedores,
    itens
  };
}

function validateCompraCotacaoCancelBody(body = {}) {
  ensureAllowedKeys(body, ['motivo'], 'Cancelamento da cotacao');

  return {
    motivo: parseOptionalText(body.motivo, 'Motivo do cancelamento', 5000, { required: true })
  };
}

function validateCompraCotacaoRespostaInternaParams(params = {}) {
  ensureAllowedKeys(params, ['id', 'cotacaoId'], 'Cotacao da solicitacao de compra');
  return {
    id: parseInteger(params.id, 'Solicitacao de compra', { required: true, positiveOnly: true }),
    cotacaoId: parseInteger(params.cotacaoId, 'Cotacao', { required: true, positiveOnly: true })
  };
}

function validateCompraCotacaoRespostaInternaBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'itens',
      'valor_minimo_pedido',
      'desconto_total',
      'condicao_pagamento',
      'prazo_entrega',
      'observacao_resposta',
      'finalizar'
    ],
    'Resposta interna da cotacao'
  );

  if (!Array.isArray(body.itens) || body.itens.length === 0) {
    throw new ValidationError('Informe ao menos um item da resposta.');
  }
  if (body.itens.length > 500) {
    throw new ValidationError('Quantidade de itens da resposta excede o limite permitido.');
  }

  const itens = body.itens.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ValidationError(`Item ${index + 1} da resposta invalido.`);
    }

    ensureAllowedKeys(
      entry,
      [
        'item_tipo',
        'item_referencia_id',
        'status_disponibilidade',
        'disponivel',
        'preco',
        'prazo',
        'data_chegada',
        'observacao',
        'quantidade_minima_item'
      ],
      `Item ${index + 1} da resposta`
    );

    const itemTipo = parseOptionalText(entry.item_tipo, 'Tipo do item', 20, { required: true }).toUpperCase();
    if (!['CADASTRADO', 'MANUAL'].includes(itemTipo)) {
      throw new ValidationError(`Tipo do item ${index + 1} invalido.`);
    }

    const statusDisponibilidade = parseOptionalText(
      entry.status_disponibilidade || (entry.disponivel === false ? 'NAO_TEM' : 'DISPONIVEL'),
      'Disponibilidade',
      20,
      { required: true }
    ).toUpperCase();
    if (!['DISPONIVEL', 'NAO_TEM', 'PARA_CHEGAR'].includes(statusDisponibilidade)) {
      throw new ValidationError(`Disponibilidade do item ${index + 1} invalida.`);
    }

    return {
      item_tipo: itemTipo,
      item_referencia_id: parseInteger(entry.item_referencia_id, `Item ${index + 1}`, {
        required: true,
        positiveOnly: true
      }),
      status_disponibilidade: statusDisponibilidade,
      disponivel: statusDisponibilidade !== 'NAO_TEM',
      preco: parseDecimal(entry.preco, `Preco do item ${index + 1}`, {
        min: 0,
        scale: 10,
        brazilianFormat: true
      }),
      prazo: parseOptionalText(entry.prazo, `Prazo do item ${index + 1}`, 120),
      data_chegada: parseDateOnly(entry.data_chegada, `Data de chegada do item ${index + 1}`),
      observacao: parseOptionalText(entry.observacao, `Observacao do item ${index + 1}`, 5000),
      quantidade_minima_item: parseDecimal(
        entry.quantidade_minima_item,
        `Quantidade minima do item ${index + 1}`,
        { min: 0, scale: 3, brazilianFormat: true }
      )
    };
  });

  return {
    itens,
    valor_minimo_pedido: parseDecimal(body.valor_minimo_pedido, 'Valor minimo do pedido', {
      min: 0,
      scale: 2,
      brazilianFormat: true
    }),
    desconto_total: parseDecimal(body.desconto_total, 'Desconto concedido', {
      min: 0,
      scale: 2,
      brazilianFormat: true
    }) || 0,
    condicao_pagamento: parseOptionalText(body.condicao_pagamento, 'Condicao de pagamento', 5000),
    prazo_entrega: parseOptionalText(body.prazo_entrega, 'Prazo de entrega', 120),
    observacao_resposta: parseOptionalText(body.observacao_resposta, 'Observacao da resposta', 5000),
    finalizar: body.finalizar !== false
  };
}

function validateCompraEncerrarBody(body = {}) {
  ensureAllowedKeys(body, ['vencedores', 'alocacoes'], 'Encerramento da cotacao');

  const entradas = Array.isArray(body.alocacoes) && body.alocacoes.length
    ? body.alocacoes
    : body.vencedores;

  if (!Array.isArray(entradas) || entradas.length === 0) {
    throw new ValidationError('Selecione ao menos um vencedor.');
  }

  if (entradas.length > 500) {
    throw new ValidationError('Quantidade de vencedores excede o limite permitido.');
  }

  return {
    vencedores: entradas.map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new ValidationError(`Vencedor ${index + 1} invalido.`);
      }

      ensureAllowedKeys(
        entry,
        ['resposta_item_id', 'quantidade', 'quantidade_alocada', 'quantidade_pedido'],
        `Vencedor ${index + 1}`
      );

      return {
        resposta_item_id: parseInteger(entry.resposta_item_id, 'Resposta vencedora', {
          required: true
        }),
        quantidade_alocada: parseDecimal(
          entry.quantidade_alocada ?? entry.quantidade ?? entry.quantidade_pedido,
          'Quantidade alocada',
          { min: 0, scale: 3, brazilianFormat: true }
        )
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

function validateCompraRelatorioComprasFornecedorQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'data_inicio', 'data_fim'],
    'Consulta do relatorio de compras por fornecedor'
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

function validateCompraRelatorioComprasDiretasQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'data_inicio', 'data_fim', 'solicitante_id', 'parceiro_id', 'status', 'q', 'item', 'limit'],
    'Consulta do relatorio de compras diretas'
  );

  const dataInicio = parseDateOnly(query.data_inicio, 'Data inicial');
  const dataFim = parseDateOnly(query.data_fim, 'Data final');

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw new ValidationError('Data inicial nao pode ser maior que a data final.');
  }

  const limit = parseInteger(query.limit, 'Limite');
  if (limit && (limit < 1 || limit > 5000)) {
    throw new ValidationError('Limite deve estar entre 1 e 5000.');
  }

  return {
    obra_id: parseInteger(query.obra_id, 'Obra'),
    data_inicio: dataInicio,
    data_fim: dataFim,
    solicitante_id: parseInteger(query.solicitante_id, 'Solicitante'),
    parceiro_id: parseInteger(query.parceiro_id, 'Credor'),
    status: parseOptionalText(query.status, 'Status', 80),
    q: parseOptionalText(query.q, 'Busca geral', 160),
    item: parseOptionalText(query.item, 'Item', 160),
    limit
  };
}

function validateCompraRelatorioPrecosInsumosQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'data_inicio', 'data_fim'],
    'Consulta do relatorio de precos por insumo e fornecedor'
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

function validateCompraRelatorioEvolucaoQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'data_inicio', 'data_fim'],
    'Consulta do relatorio de evolucao mensal de compras'
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

function validateCompraRelatorioCicloQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'data_inicio', 'data_fim'],
    'Consulta do relatorio de ciclo de compras'
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

function validateCompraRelatorioDemandaPedidosQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'data_inicio', 'data_fim'],
    'Consulta do relatorio de demanda e pedidos de compras'
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

function validateCompraRelatorioCategoriasInsumosQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'data_inicio', 'data_fim'],
    'Consulta do relatorio de compras por categoria e insumo'
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

function validateCompraRelatorioPendenciasCotacoesQuery(query = {}) {
  ensureAllowedKeys(
    query,
    ['obra_id', 'data_inicio', 'data_fim'],
    'Consulta do relatorio de pendencias de cotacoes'
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

function validateCompraPedidoReabrirBody(body = {}) {
  ensureAllowedKeys(body, ['motivo'], 'Reabertura de pedido para cotacao');

  return {
    motivo: parseOptionalText(body.motivo, 'Motivo da reabertura', 1000, { required: true })
  };
}

function validateCompraPedidoStatusBatchBody(body = {}) {
  ensureAllowedKeys(body, ['pedido_ids', 'status'], 'Atualizacao em lote de pedidos');

  if (!Array.isArray(body.pedido_ids) || body.pedido_ids.length === 0) {
    throw new ValidationError('Selecione ao menos um pedido.');
  }

  if (body.pedido_ids.length > 100) {
    throw new ValidationError('Quantidade de pedidos excede o limite permitido.');
  }

  return {
    pedido_ids: body.pedido_ids.map((id) => parseInteger(id, 'Pedido', { required: true })),
    status: parseOptionalText(body.status, 'Status do pedido', 40, { required: true })
  };
}

function validateCompraSolicitacaoItemQuantidadeParams(params = {}) {
  return {
    id: parseInteger(params.id, 'Solicitacao de compra', { required: true }),
    itemId: parseInteger(params.itemId, 'Item da solicitacao de compra', { required: true })
  };
}

function validateCompraSolicitacaoItemQuantidadeBody(body = {}) {
  ensureAllowedKeys(body, ['item_tipo', 'quantidade', 'motivo'], 'Atualizacao de quantidade do item da solicitacao de compra');

  const itemTipo = parseOptionalText(body.item_tipo, 'Tipo do item', 20, { required: true }).toUpperCase();
  if (!['CADASTRADO', 'MANUAL'].includes(itemTipo)) {
    throw new ValidationError('Tipo do item invalido.');
  }

  return {
    item_tipo: itemTipo,
    quantidade: parseDecimal(body.quantidade, 'Quantidade', { required: true, min: 0.01 }),
    motivo: parseOptionalText(body.motivo, 'Motivo da alteracao', 1000, { required: true })
  };
}

function validateCompraSolicitacaoItemApropriacoesBody(body = {}) {
  ensureAllowedKeys(body, ['item_tipo', 'apropriacao_id', 'apropriacoes', 'motivo'], 'Atualizacao de apropriacoes do item da solicitacao de compra');

  const itemTipo = parseOptionalText(body.item_tipo, 'Tipo do item', 20, { required: true }).toUpperCase();
  if (!['CADASTRADO', 'MANUAL'].includes(itemTipo)) {
    throw new ValidationError('Tipo do item invalido.');
  }

  if (!Array.isArray(body.apropriacoes) && !body.apropriacao_id) {
    throw new ValidationError('Informe ao menos uma apropriacao para o item.');
  }

  return {
    item_tipo: itemTipo,
    apropriacao_id: parseInteger(body.apropriacao_id, 'Apropriacao', { required: false }),
    apropriacoes: Array.isArray(body.apropriacoes) ? body.apropriacoes : undefined,
    motivo: parseOptionalText(body.motivo, 'Motivo da alteracao', 1000, { required: true })
  };
}

function validateCompraSolicitacaoInativarMassaBody(body = {}) {
  ensureAllowedKeys(body, ['solicitacao_ids'], 'Inativacao em massa de solicitacoes de compra');

  return {
    solicitacao_ids: parseIdArray(body.solicitacao_ids, 'Solicitacoes de compra', {
      required: true,
      maxItems: 100
    })
  };
}

function validateCompraSolicitacaoEncaminharComprasMassaBody(body = {}) {
  ensureAllowedKeys(body, ['solicitacao_ids'], 'Encaminhamento em massa de solicitacoes de compra');

  return {
    solicitacao_ids: parseIdArray(body.solicitacao_ids, 'Solicitacoes de compra', {
      required: true,
      maxItems: 100
    })
  };
}

function validateCompraPedidoCancelBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'motivo',
      'itens',
      'item_ids',
      'cancelar_cotacao',
      'cancelar_solicitacao_compra',
      'cancelar_solicitacao_principal'
    ],
    'Cancelamento do pedido'
  );

  return {
    motivo: parseOptionalText(body.motivo, 'Motivo', 5000),
    itens: Array.isArray(body.itens) ? body.itens : undefined,
    item_ids: Array.isArray(body.item_ids) ? body.item_ids : undefined,
    cancelar_cotacao: body.cancelar_cotacao === true,
    cancelar_solicitacao_compra: body.cancelar_solicitacao_compra === true,
    cancelar_solicitacao_principal: body.cancelar_solicitacao_principal === true
  };
}

function validateCompraSolicitacaoCancelBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'motivo',
      'cancelar_cotacao',
      'cancelar_solicitacao_principal'
    ],
    'Cancelamento da solicitacao de compra'
  );

  return {
    motivo: parseOptionalText(body.motivo, 'Motivo', 5000, { required: true }),
    cancelar_cotacao: body.cancelar_cotacao === true,
    cancelar_solicitacao_principal: body.cancelar_solicitacao_principal === true
  };
}

function validateCompraPedidoRemanejarBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['resposta_item_id_destino', 'quantidade', 'motivo'],
    'Remanejamento de item do pedido'
  );

  return {
    resposta_item_id_destino: parseInteger(body.resposta_item_id_destino, 'Resposta de destino', {
      required: true
    }),
    quantidade: parseDecimal(body.quantidade, 'Quantidade remanejada', {
      min: 0,
      scale: 3,
      brazilianFormat: true,
      required: true
    }),
    motivo: parseOptionalText(body.motivo, 'Motivo', 5000)
  };
}

function validateCompraPedidoComentarioBody(body = {}) {
  ensureAllowedKeys(body, ['comentario'], 'Comentario do pedido');

  return {
    comentario: parseOptionalText(body.comentario, 'Comentario', 5000, { required: true })
  };
}

function validateCompraCotacaoComentarioBody(body = {}) {
  ensureAllowedKeys(body, ['comentario'], 'Comentario da cotacao');

  return {
    comentario: parseOptionalText(body.comentario, 'Comentario', 5000, { required: true })
  };
}

function validateCompraPedidoEspelhoBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['arquivo_url', 'arquivo_nome', 'arquivo_nome_original'],
    'Espelho do pedido'
  );

  return {
    arquivo_url: parseOptionalText(body.arquivo_url, 'Arquivo', 1000, { required: true }),
    arquivo_nome: parseOptionalText(body.arquivo_nome, 'Nome do arquivo', 255),
    arquivo_nome_original: parseOptionalText(body.arquivo_nome_original, 'Nome do arquivo', 255)
  };
}

function validateCompraPedidoFreteBody(body = {}) {
  ensureAllowedKeys(
    body,
    [
      'tipo',
      'momento',
      'criterio_rateio',
      'valor_total',
      'data_vencimento',
      'fornecedor_compra_id',
      'parceiro_id',
      'novo_fornecedor',
      'dados_pagamento',
      'observacoes'
    ],
    'Frete do pedido'
  );

  const tipo = parseOptionalText(body.tipo, 'Tipo de frete', 30, { required: true })?.toUpperCase();
  const momento = parseOptionalText(body.momento, 'Momento do frete', 30)?.toUpperCase() || 'FECHAMENTO';
  const criterioRateio = parseOptionalText(body.criterio_rateio, 'Criterio de rateio', 30)?.toUpperCase() || 'VALOR_ITENS';
  const novoFornecedor = body.novo_fornecedor && typeof body.novo_fornecedor === 'object'
    ? {
        nome: parseOptionalText(body.novo_fornecedor.nome, 'Nome do fornecedor', 160),
        cpf_cnpj: parseOptionalText(body.novo_fornecedor.cpf_cnpj, 'CPF/CNPJ do fornecedor', 32),
        whatsapp: parseOptionalText(body.novo_fornecedor.whatsapp, 'WhatsApp do fornecedor', 32),
        telefone: parseOptionalText(body.novo_fornecedor.telefone, 'Telefone do fornecedor', 32),
        email: parseOptionalText(body.novo_fornecedor.email, 'Email do fornecedor', 160),
        contato: parseOptionalText(body.novo_fornecedor.contato, 'Contato do fornecedor', 160),
        observacoes: parseOptionalText(body.novo_fornecedor.observacoes, 'Observacoes do fornecedor', 1000)
      }
    : undefined;

  if (!['EMBUTIDO', 'TERCEIRO'].includes(tipo)) {
    throw new ValidationError('Tipo de frete invalido.');
  }
  if (!['FECHAMENTO', 'POSTERIOR'].includes(momento)) {
    throw new ValidationError('Momento do frete invalido.');
  }
  if (!['VALOR_ITENS'].includes(criterioRateio)) {
    throw new ValidationError('Criterio de rateio invalido.');
  }

  const dadosPagamento = body.dados_pagamento && typeof body.dados_pagamento === 'object'
    ? {
        pix: parseOptionalText(body.dados_pagamento.pix, 'PIX', 180),
        tipo_chave_pix: parseOptionalText(body.dados_pagamento.tipo_chave_pix, 'Tipo da chave PIX', 30),
        banco: parseOptionalText(body.dados_pagamento.banco, 'Banco', 120),
        agencia: parseOptionalText(body.dados_pagamento.agencia, 'Agencia', 60),
        conta: parseOptionalText(body.dados_pagamento.conta, 'Conta', 80),
        favorecido: parseOptionalText(body.dados_pagamento.favorecido, 'Favorecido', 160),
        documento: parseOptionalText(body.dados_pagamento.documento, 'Documento', 60),
        observacoes: parseOptionalText(body.dados_pagamento.observacoes, 'Observacoes de pagamento', 1000)
      }
    : parseOptionalText(body.dados_pagamento, 'Dados de pagamento', 1000);

  return {
    tipo,
    momento,
    criterio_rateio: criterioRateio,
    valor_total: parseDecimal(body.valor_total, 'Valor do frete', { required: true, min: 0.01 }),
    data_vencimento: parseDateOnly(body.data_vencimento, 'Data de vencimento'),
    fornecedor_compra_id: parseInteger(body.fornecedor_compra_id, 'Fornecedor'),
    parceiro_id: parseInteger(body.parceiro_id, 'Credor'),
    novo_fornecedor: novoFornecedor,
    dados_pagamento: dadosPagamento,
    observacoes: parseOptionalText(body.observacoes, 'Observacoes', 5000)
  };
}

function validateCompraPedidoFreteCancelBody(body = {}) {
  ensureAllowedKeys(body, ['motivo'], 'Cancelamento do frete do pedido');

  return {
    motivo: parseOptionalText(body.motivo, 'Motivo do cancelamento', 1000, { required: true })
  };
}

function validateCompraDelegacaoBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['responsavel_id', 'prazo_compra', 'motivo_atraso', 'motivo_delegacao_vencida'],
    'Delegacao da solicitacao de compra'
  );

  return {
    responsavel_id: parseInteger(body.responsavel_id, 'Responsavel'),
    prazo_compra: parseDateOnly(body.prazo_compra, 'Prazo de compra'),
    motivo_atraso: parseOptionalText(body.motivo_atraso, 'Motivo do atraso', 5000),
    motivo_delegacao_vencida: parseOptionalText(
      body.motivo_delegacao_vencida,
      'Motivo da delegacao com prazo vencido',
      5000
    )
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

function validateCompraPedidoFreteParams(params = {}) {
  ensureAllowedKeys(params, ['id', 'freteId'], 'Parametros do frete do pedido');

  return {
    id: parseInteger(params.id, 'Pedido', { required: true }),
    freteId: parseInteger(params.freteId, 'Frete do pedido', { required: true })
  };
}

function validateSolicitacaoPedidoCompraPdfParams(params = {}) {
  ensureAllowedKeys(params, ['id', 'pedidoId'], 'Parametros do PDF do pedido');

  return {
    id: parseInteger(params.id, 'Solicitacao', { required: true }),
    pedidoId: parseInteger(params.pedidoId, 'Pedido de compra', { required: true })
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
      'data_demissao',
      'data_inicio_medicao',
      'data_fim_medicao',
      'itens_apropriacao',
      'ref_contrato_abertura',
      'apropriacoes_rateio'
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
    data_demissao: parseDateOnly(body.data_demissao, 'Data de demissao'),
    data_inicio_medicao: parseDateOnly(body.data_inicio_medicao, 'Data inicial da medicao'),
    data_fim_medicao: parseDateOnly(body.data_fim_medicao, 'Data final da medicao'),
    itens_apropriacao: parseOptionalText(body.itens_apropriacao, 'Itens de apropriacao', 5000),
    ref_contrato_abertura: parseOptionalText(body.ref_contrato_abertura, 'Ref. do contrato', 255),
    apropriacoes_rateio: Array.isArray(body.apropriacoes_rateio) ? body.apropriacoes_rateio : undefined
  };
}

function validateSolicitacaoStatusBody(body = {}) {
  ensureAllowedKeys(body, ['status'], 'Atualizacao de status');

  return {
    status: parseOptionalText(body.status, 'Status', 120, { required: true })
  };
}

function validateSolicitacaoApropriacoesBody(body = {}) {
  ensureAllowedKeys(body, ['apropriacao_id', 'apropriacoes_rateio', 'motivo'], 'Atualizacao de apropriacoes da solicitacao');

  return {
    apropriacao_id: parseInteger(body.apropriacao_id, 'Apropriacao', { required: false }),
    apropriacoes_rateio: Array.isArray(body.apropriacoes_rateio) ? body.apropriacoes_rateio : undefined,
    motivo: parseOptionalText(body.motivo, 'Motivo da alteracao', 1000, { required: true })
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

function validateSolicitacaoDataVencimentoBody(body = {}) {
  ensureAllowedKeys(body, ['data_vencimento'], 'Atualizacao de data de vencimento');

  return {
    data_vencimento: parseDateOnly(body.data_vencimento, 'Data de vencimento')
  };
}

function validateSolicitacaoCredorBody(body = {}) {
  ensureAllowedKeys(body, ['parceiro_id'], 'Atualizacao de credor');

  return {
    parceiro_id: isBlank(body.parceiro_id)
      ? null
      : parseInteger(body.parceiro_id, 'Credor', { positiveOnly: true })
  };
}

function validateSolicitacaoCredorCreateBody(body = {}) {
  ensureAllowedKeys(
    body,
    ['nome', 'cpf_cnpj', 'telefone', 'email'],
    'Cadastro de credor da solicitacao'
  );

  return {
    nome: sanitizeString(body.nome, 'Nome do credor', { required: true, max: 255 }),
    cpf_cnpj: sanitizeString(body.cpf_cnpj, 'CPF/CNPJ', { required: true, max: 32 }),
    telefone: sanitizeString(body.telefone, 'Telefone', { required: true, max: 32 }),
    email: sanitizeString(body.email, 'Email', { max: 255 })
  };
}

function validateSolicitacaoResponsavelBody(body = {}) {
  ensureAllowedKeys(body, ['usuario_responsavel_id', 'prazo_compra'], 'Atribuicao de responsavel');

  return {
    usuario_responsavel_id: parseInteger(body.usuario_responsavel_id, 'Responsavel', { required: true }),
    prazo_compra: parseDateOnly(body.prazo_compra, 'Prazo de compra')
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
    validateCompraDiretaCreateBody,
  validateCompraEncerrarBody,
  validateCompraCotacaoCancelBody,
  validateCompraCotacaoRespostaInternaBody,
  validateCompraCotacaoRespostaInternaParams,
  validateCompraEnviarBody,
  validateCompraIntegrarBody,
  validateCompraPedidoCreateBody,
  validateCompraPedidoFreteParams,
  validateCompraPedidoItemAddBody,
  validateCompraPedidoItemParams,
  validateSolicitacaoPedidoCompraPdfParams,
  validateCompraPedidoCancelBody,
  validateCompraSolicitacaoCancelBody,
  validateCompraPedidoComentarioBody,
  validateCompraCotacaoComentarioBody,
  validateCompraPedidoEspelhoBody,
  validateCompraPedidoFreteCancelBody,
  validateCompraPedidoFreteBody,
  validateCompraPedidoRemanejarBody,
  validateCompraPedidoReabrirBody,
  validateCompraPedidoStatusBody,
  validateCompraPedidoStatusBatchBody,
  validateCompraSolicitacaoItemQuantidadeBody,
  validateCompraSolicitacaoItemQuantidadeParams,
  validateCompraSolicitacaoItemApropriacoesBody,
  validateCompraSolicitacaoInativarMassaBody,
  validateCompraSolicitacaoEncaminharComprasMassaBody,
  validateCompraPedidoItemUpdateBody,
  validateCompraDelegacaoBody,
  validateCompraPedidoAuditoriaQuery,
  validateCompraPedidoQuery,
  validateCompraQuery,
  validateCompraRelatorioCategoriasInsumosQuery,
  validateCompraRelatorioCicloQuery,
  validateCompraRelatorioComprasDiretasQuery,
  validateCompraRelatorioComprasFornecedorQuery,
  validateCompraRelatorioDemandaPedidosQuery,
  validateCompraRelatorioEconomiaCotacoesQuery,
  validateCompraRelatorioEvolucaoQuery,
  validateCompraRelatorioFornecedoresQuery,
  validateCompraRelatorioPendenciasCotacoesQuery,
  validateCompraRelatorioPrecosInsumosQuery,
  validateContratoCreateBody,
  validateContratoQuery,
  validateContratoRelatorioOperacionalQuery,
  validateContratoUpdateBody,
  validateSolicitacaoArquivarMassaBody,
  validateSolicitacaoComentarioBody,
  validateSolicitacaoCreateBody,
  validateSolicitacaoApropriacoesBody,
  validateSolicitacaoCredorCreateBody,
  validateSolicitacaoCredorBody,
  validateSolicitacaoDataVencimentoBody,
  validateSolicitacaoEnviarSetorBody,
  validateSolicitacaoEnviarSetorMassaBody,
  validateSolicitacaoPedidoBody,
  validateSolicitacaoRefContratoBody,
  validateSolicitacaoResponsavelBody,
  validateSolicitacaoStatusBody,
  validateSolicitacaoValorBody
};
