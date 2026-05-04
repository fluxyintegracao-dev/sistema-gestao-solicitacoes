const { Op } = require('sequelize');
const {
  ContaBancaria,
  sequelize,
  CategoriaFinanceira,
  Historico,
  IntegracaoSiengeFila,
  MovimentoFinanceiro,
  Obra,
  Parceiro,
  SecurityEventLog,
  Solicitacao,
  TipoSolicitacao,
  TituloFinanceiro,
  User
} = require('../models');
const {
  canAccessFinanceiro,
  getFinanceiroObraScopeIds
} = require('./authorizationService');
const { registrarEventoSeguranca } = require('./securityLogService');

const FORMAS_COBRANCA = ['BOLETO', 'PIX', 'OUTROS'];
const STATUS_COBRANCA = ['NAO_APLICAVEL', 'PENDENTE_EMISSAO', 'EMITIDO', 'PAGO_BANCO', 'CONCILIADO', 'CANCELADO'];

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function getHoje() {
  return new Date().toISOString().slice(0, 10);
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function normalizarTipoTitulo(value) {
  return String(value || 'PAGAR').trim().toUpperCase();
}

function normalizarFormaRecebimento(value) {
  return value ? String(value || '').trim().toUpperCase() : null;
}

function normalizarFormaCobranca(value) {
  if (!value) return null;
  const normalized = String(value || '').trim().toUpperCase();
  return FORMAS_COBRANCA.includes(normalized) ? normalized : null;
}

function normalizarStatusCobranca(value) {
  if (!value) return null;
  const normalized = String(value || '').trim().toUpperCase();
  return STATUS_COBRANCA.includes(normalized) ? normalized : null;
}

function getStatusCobrancaInicial(tipo, formaCobranca, statusCobranca = null) {
  if (String(tipo || '').toUpperCase() !== 'RECEBER') {
    return 'NAO_APLICAVEL';
  }

  if (statusCobranca) {
    return statusCobranca;
  }

  return formaCobranca ? 'PENDENTE_EMISSAO' : 'NAO_APLICAVEL';
}

function buildCobrancaFields(payload = {}, tipo) {
  if (String(tipo || '').toUpperCase() !== 'RECEBER') {
    return {
      forma_cobranca: null,
      status_cobranca: 'NAO_APLICAVEL',
      banco_cobranca: null,
      nosso_numero: null,
      linha_digitavel: null,
      codigo_barras: null,
      identificador_externo: null,
      boleto_emitido_em: null
    };
  }

  const formaCobranca = normalizarFormaCobranca(payload.forma_cobranca);
  const statusCobranca = getStatusCobrancaInicial(
    tipo,
    formaCobranca,
    normalizarStatusCobranca(payload.status_cobranca)
  );

  return {
    forma_cobranca: formaCobranca,
    status_cobranca: statusCobranca,
    banco_cobranca: payload.banco_cobranca || null,
    nosso_numero: payload.nosso_numero || null,
    linha_digitavel: payload.linha_digitavel || null,
    codigo_barras: payload.codigo_barras || null,
    identificador_externo: payload.identificador_externo || null,
    boleto_emitido_em: payload.boleto_emitido_em || null
  };
}

function buildUpdatedCobrancaFields(titulo, payload = {}) {
  if (String(titulo?.tipo || '').toUpperCase() !== 'RECEBER') {
    throw createHttpError(400, 'Somente titulos a receber podem receber dados de cobranca.');
  }

  const formaCobranca = payload.forma_cobranca !== undefined
    ? normalizarFormaCobranca(payload.forma_cobranca)
    : normalizarFormaCobranca(titulo.forma_cobranca);

  let statusCobranca = payload.status_cobranca !== undefined
    ? normalizarStatusCobranca(payload.status_cobranca)
    : normalizarStatusCobranca(titulo.status_cobranca);

  if (!statusCobranca) {
    statusCobranca = getStatusCobrancaInicial(titulo.tipo, formaCobranca);
  }

  if (statusCobranca !== 'NAO_APLICAVEL' && !formaCobranca) {
    throw createHttpError(400, 'Informe a forma de cobranca antes de definir o status da cobranca.');
  }

  return {
    forma_cobranca: formaCobranca,
    status_cobranca: statusCobranca,
    banco_cobranca: payload.banco_cobranca !== undefined ? payload.banco_cobranca : titulo.banco_cobranca,
    nosso_numero: payload.nosso_numero !== undefined ? payload.nosso_numero : titulo.nosso_numero,
    linha_digitavel: payload.linha_digitavel !== undefined ? payload.linha_digitavel : titulo.linha_digitavel,
    codigo_barras: payload.codigo_barras !== undefined ? payload.codigo_barras : titulo.codigo_barras,
    identificador_externo: payload.identificador_externo !== undefined ? payload.identificador_externo : titulo.identificador_externo,
    boleto_emitido_em: payload.boleto_emitido_em !== undefined ? payload.boleto_emitido_em : titulo.boleto_emitido_em
  };
}

function sugestaoTipoTitulo(solicitacao) {
  const tipoNome = String(solicitacao?.tipo?.nome || '').trim().toUpperCase();
  const areaResponsavel = String(solicitacao?.area_responsavel || '').trim().toUpperCase();

  if (tipoNome.includes('COMPRA') || areaResponsavel === 'COMPRAS') {
    return 'PAGAR';
  }

  return 'RECEBER';
}

function descricaoPadraoTitulo(solicitacao) {
  const codigo = String(solicitacao?.codigo || '').trim();
  const tipoNome = String(solicitacao?.tipo?.nome || '').trim();
  const descricao = String(solicitacao?.descricao || '').trim();
  const partes = [codigo, tipoNome].filter(Boolean);
  const prefixo = partes.join(' - ');

  if (!prefixo && !descricao) {
    return 'Titulo financeiro gerado por solicitacao';
  }

  if (!descricao) {
    return prefixo;
  }

  return `${prefixo}: ${descricao}`.slice(0, 255);
}

function descricaoPadraoTituloManual(tipo) {
  return tipo === 'RECEBER'
    ? 'Titulo financeiro manual de recebimento'
    : 'Titulo financeiro manual de pagamento';
}

function getSetorUsuario(req) {
  return req.user?.setor?.codigo || req.user?.area || req.user?.setor?.nome || 'FINANCEIRO';
}

async function assertFinanceAccess(req) {
  const allowed = await canAccessFinanceiro(req.user);
  if (allowed) {
    return;
  }

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'AUTHZ_DENIED',
    recursoTipo: 'FINANCEIRO',
    recursoId: req.originalUrl,
    status: 'DENIED',
    descricao: 'Usuario sem permissao para acessar rotas do modulo financeiro'
  });

  throw createHttpError(403, 'Acesso negado para o modulo financeiro');
}

async function assertObraScope(req, obraId, resourceType, resourceId, description) {
  const obrasPermitidas = await getFinanceiroObraScopeIds(req.user);
  if (obrasPermitidas === null) {
    return;
  }

  if (obrasPermitidas.length > 0 && obrasPermitidas.includes(Number(obraId))) {
    return;
  }

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'AUTHZ_DENIED',
    recursoTipo: resourceType,
    recursoId: resourceId != null ? String(resourceId) : String(obraId),
    status: 'DENIED',
    descricao: description,
    metadata: {
      obra_id: Number(obraId) || null
    }
  });

  throw createHttpError(403, 'Acesso negado para esta obra');
}

function buildTituloInclude({ includeMovimentos = false } = {}) {
  const include = [
    {
      model: Obra,
      as: 'obra',
      attributes: ['id', 'nome', 'codigo']
    },
    {
      model: Parceiro,
      as: 'parceiro',
      attributes: ['id', 'nome', 'cpf_cnpj', 'telefone', 'email']
    },
    {
      model: Solicitacao,
      as: 'solicitacao',
      attributes: ['id', 'codigo', 'descricao', 'status_global', 'area_responsavel']
    },
    {
      model: CategoriaFinanceira,
      as: 'categoriaFinanceira',
      attributes: ['id', 'nome', 'tipo']
    },
    {
      model: User,
      as: 'criadoPor',
      attributes: ['id', 'nome', 'email']
    },
    {
      model: IntegracaoSiengeFila,
      as: 'integracaoSienge',
      attributes: [
        'id',
        'origem_modulo',
        'status',
        'tentativas',
        'enviado_em',
        'ultimo_erro',
        'external_title_id',
        'updatedAt'
      ]
    }
  ];

  if (includeMovimentos) {
    include.push({
      model: MovimentoFinanceiro,
      as: 'movimentos',
      include: [
        {
          model: ContaBancaria,
          as: 'contaBancaria',
          attributes: ['id', 'nome', 'banco', 'agencia', 'conta']
        },
        {
          model: User,
          as: 'criadoPor',
          attributes: ['id', 'nome', 'email']
        },
        {
          model: User,
          as: 'estornadoPor',
          attributes: ['id', 'nome', 'email']
        }
      ],
      separate: true,
      order: [['data_movimento', 'DESC'], ['createdAt', 'DESC']]
    });
  }

  return include;
}

async function carregarSolicitacaoFinanceira(req, solicitacaoId) {
  const solicitacao = await Solicitacao.findByPk(solicitacaoId, {
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'nome', 'codigo']
      },
      {
        model: Parceiro,
        as: 'parceiro',
        attributes: ['id', 'nome', 'cpf_cnpj', 'telefone', 'email', 'ativo']
      },
      {
        model: TipoSolicitacao,
        as: 'tipo',
        attributes: ['id', 'nome']
      }
    ]
  });

  if (!solicitacao) {
    throw createHttpError(404, 'Solicitacao nao encontrada');
  }

  await assertObraScope(
    req,
    solicitacao.obra_id,
    'SOLICITACAO',
    solicitacao.id,
    'Usuario tentou acessar titulo financeiro de solicitacao fora do seu escopo de obra'
  );

  return solicitacao;
}

async function validarCategoriaFinanceira(categoriaId, tipoTitulo) {
  if (!categoriaId) {
    return null;
  }

  const categoria = await CategoriaFinanceira.findByPk(categoriaId);
  if (!categoria || categoria.ativo === false) {
    throw createHttpError(400, 'Categoria financeira invalida.');
  }

  const tipoCategoria = String(categoria.tipo || '').trim().toUpperCase();
  if (tipoCategoria && tipoCategoria !== 'AMBOS' && tipoCategoria !== tipoTitulo) {
    throw createHttpError(400, 'Categoria financeira incompativel com o tipo do titulo.');
  }

  return categoria;
}

async function validarParceiro(parceiroId) {
  const parceiro = await Parceiro.findByPk(parceiroId);
  if (!parceiro || parceiro.ativo === false) {
    throw createHttpError(400, 'Parceiro invalido.');
  }
  return parceiro;
}

function validarCompatibilidadeParceiroTitulo(parceiro, tipoTitulo) {
  const tipo = normalizarTipoTitulo(tipoTitulo);
  if (tipo === 'PAGAR' && parceiro.fornecedor === false && parceiro.corretor === false) {
    throw createHttpError(400, 'O parceiro selecionado nao esta marcado como fornecedor ou corretor.');
  }

  if (tipo === 'RECEBER' && parceiro.cliente === false) {
    throw createHttpError(400, 'O parceiro selecionado nao esta marcado como cliente.');
  }
}

async function validarObraTitulo(req, obraId) {
  const obra = await Obra.findByPk(obraId, {
    attributes: ['id', 'nome', 'codigo']
  });

  if (!obra) {
    throw createHttpError(400, 'Obra invalida.');
  }

  await assertObraScope(
    req,
    obra.id,
    'TITULO_FINANCEIRO',
    obra.id,
    'Usuario tentou criar ou acessar titulo financeiro de obra fora do seu escopo'
  );

  return obra;
}

async function validarContaBancaria(contaBancariaId) {
  if (!contaBancariaId) {
    return null;
  }
  const conta = await ContaBancaria.findByPk(contaBancariaId);
  if (!conta || conta.ativo === false) {
    throw createHttpError(400, 'Conta bancaria invalida.');
  }
  return conta;
}

async function carregarTituloPorId(req, tituloId, { includeMovimentos = false } = {}) {
  await assertFinanceAccess(req);

  const titulo = await TituloFinanceiro.findByPk(tituloId, {
    include: buildTituloInclude({ includeMovimentos })
  });

  if (!titulo) {
    throw createHttpError(404, 'Titulo financeiro nao encontrado');
  }

  await assertObraScope(
    req,
    titulo.obra_id,
    'TITULO_FINANCEIRO',
    titulo.id,
    'Usuario tentou acessar titulo financeiro fora do seu escopo de obra'
  );

  return titulo;
}

async function listarTitulos(req, filters = {}) {
  await assertFinanceAccess(req);

  const where = {};
  const obraFiltro = Number(filters.obra_id);
  const obrasPermitidas = await getFinanceiroObraScopeIds(req.user);

  if (obrasPermitidas === null) {
    if (obraFiltro) {
      where.obra_id = obraFiltro;
    }
  } else if (obrasPermitidas.length > 0) {
    if (obraFiltro && !obrasPermitidas.includes(obraFiltro)) {
      await assertObraScope(
        req,
        obraFiltro,
        'TITULO_FINANCEIRO',
        null,
        'Usuario tentou listar titulos financeiros de obra fora do seu escopo'
      );
    }

    where.obra_id = obraFiltro || { [Op.in]: obrasPermitidas };
  } else {
    if (obraFiltro) {
      await assertObraScope(
        req,
        obraFiltro,
        'TITULO_FINANCEIRO',
        null,
        'Usuario tentou listar titulos financeiros sem vinculo de obra'
      );
    }
    return [];
  }

  if (filters.tipo) {
    where.tipo = filters.tipo;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.codigo) {
    where.codigo = { [Op.like]: `%${filters.codigo}%` };
  }
  if (filters.numero_documento) {
    where.numero_documento = { [Op.like]: `%${filters.numero_documento}%` };
  }
  if (filters.descricao) {
    where.descricao = { [Op.like]: `%${filters.descricao}%` };
  }
  if (filters.parceiro_id) {
    where.parceiro_id = Number(filters.parceiro_id);
  }
  if (filters.categoria_financeira_id) {
    where.categoria_financeira_id = Number(filters.categoria_financeira_id);
  }
  if (filters.solicitacao_id) {
    where.solicitacao_id = Number(filters.solicitacao_id);
  }
  if (filters.data_emissao_inicial || filters.data_emissao_final) {
    where.data_emissao = {};
    if (filters.data_emissao_inicial) {
      where.data_emissao[Op.gte] = filters.data_emissao_inicial;
    }
    if (filters.data_emissao_final) {
      where.data_emissao[Op.lte] = filters.data_emissao_final;
    }
  }
  if (filters.vencimento_inicial || filters.vencimento_final) {
    where.data_vencimento = {};
    if (filters.vencimento_inicial) {
      where.data_vencimento[Op.gte] = filters.vencimento_inicial;
    }
    if (filters.vencimento_final) {
      where.data_vencimento[Op.lte] = filters.vencimento_final;
    }
  }
  if (filters.q) {
    const term = String(filters.q).trim();
    where[Op.or] = [
      { codigo: { [Op.like]: `%${term}%` } },
      { descricao: { [Op.like]: `%${term}%` } },
      { numero_documento: { [Op.like]: `%${term}%` } },
      { '$parceiro.nome$': { [Op.like]: `%${term}%` } },
      { '$parceiro.cpf_cnpj$': { [Op.like]: `%${term}%` } },
      { '$obra.nome$': { [Op.like]: `%${term}%` } },
      { '$obra.codigo$': { [Op.like]: `%${term}%` } },
      { '$solicitacao.codigo$': { [Op.like]: `%${term}%` } }
    ];
  }

  return TituloFinanceiro.findAll({
    where,
    include: buildTituloInclude(),
    order: [
      ['data_vencimento', 'ASC'],
      ['createdAt', 'DESC']
    ]
  });
}

async function listarTitulosPorSolicitacao(req, solicitacaoId) {
  await assertFinanceAccess(req);
  const solicitacao = await carregarSolicitacaoFinanceira(req, solicitacaoId);

  return TituloFinanceiro.findAll({
    where: {
      solicitacao_id: solicitacao.id
    },
    include: buildTituloInclude(),
    order: [
      ['data_vencimento', 'ASC'],
      ['createdAt', 'DESC']
    ]
  });
}

async function criarTituloPorSolicitacao(req, solicitacaoId, payload = {}) {
  await assertFinanceAccess(req);
  const solicitacao = await carregarSolicitacaoFinanceira(req, solicitacaoId);

  const tipo = normalizarTipoTitulo(payload.tipo || sugestaoTipoTitulo(solicitacao));
  if (!['PAGAR', 'RECEBER'].includes(tipo)) {
    throw createHttpError(400, 'Tipo de titulo invalido.');
  }

  const parceiroId = Number(payload.parceiro_id || solicitacao.parceiro_id);
  if (!Number.isInteger(parceiroId) || parceiroId <= 0) {
    throw createHttpError(400, 'Parceiro e obrigatorio para gerar o titulo.');
  }

  const valorOriginal = Number(payload.valor != null ? payload.valor : solicitacao.valor);
  if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
    throw createHttpError(400, 'Valor invalido para gerar o titulo.');
  }

  const dataVencimento = payload.data_vencimento || solicitacao.data_vencimento;
  if (!dataVencimento) {
    throw createHttpError(400, 'Data de vencimento e obrigatoria para gerar o titulo.');
  }

  await Promise.all([
    validarParceiro(parceiroId),
    validarCategoriaFinanceira(payload.categoria_financeira_id, tipo)
  ]);

  const tituloPayload = {
    solicitacao_id: solicitacao.id,
    obra_id: solicitacao.obra_id,
    parceiro_id: parceiroId,
    categoria_financeira_id: payload.categoria_financeira_id || null,
    tipo,
    status: 'ABERTO',
    descricao: String(payload.descricao || descricaoPadraoTitulo(solicitacao)).slice(0, 255),
    numero_documento: payload.numero_documento || null,
    valor_original: valorOriginal,
    valor_saldo: valorOriginal,
    valor_baixado: 0,
    data_emissao: payload.data_emissao || getHoje(),
    data_vencimento: dataVencimento,
    data_quitacao: null,
    observacoes: payload.observacoes || null,
    ...buildCobrancaFields(payload, tipo),
    criado_por: req.user?.id || null,
    atualizado_por: req.user?.id || null
  };

  const transaction = await sequelize.transaction();
  try {
    const titulo = await TituloFinanceiro.create(tituloPayload, { transaction });

    await Historico.create({
      solicitacao_id: solicitacao.id,
      usuario_responsavel_id: req.user?.id || null,
      setor: getSetorUsuario(req),
      acao: 'TITULO_FINANCEIRO_CRIADO',
      observacao: `${tipo} gerado no valor de ${formatCurrency(valorOriginal)} com vencimento em ${dataVencimento}`
    }, { transaction });

    await transaction.commit();

    const tituloCompleto = await carregarTituloPorId(req, titulo.id);

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_TITLE_CREATED',
      recursoTipo: 'TITULO_FINANCEIRO',
      recursoId: titulo.id,
      status: 'SUCCESS',
      descricao: 'Titulo financeiro gerado a partir da solicitacao',
      metadata: {
        solicitacao_id: solicitacao.id,
        obra_id: solicitacao.obra_id,
        parceiro_id: parceiroId,
        tipo,
        valor_original: valorOriginal
      }
    });

    return tituloCompleto;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function criarTituloManual(req, payload = {}) {
  await assertFinanceAccess(req);

  const tipo = normalizarTipoTitulo(payload.tipo || 'PAGAR');
  if (!['PAGAR', 'RECEBER'].includes(tipo)) {
    throw createHttpError(400, 'Tipo de titulo invalido.');
  }

  const obraId = Number(payload.obra_id);
  if (!Number.isInteger(obraId) || obraId <= 0) {
    throw createHttpError(400, 'Obra e obrigatoria para criar o titulo.');
  }

  const parceiroId = Number(payload.parceiro_id);
  if (!Number.isInteger(parceiroId) || parceiroId <= 0) {
    throw createHttpError(400, 'Parceiro e obrigatorio para criar o titulo.');
  }

  const valorOriginal = Number(payload.valor);
  if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
    throw createHttpError(400, 'Valor invalido para criar o titulo.');
  }

  const dataVencimento = payload.data_vencimento;
  if (!dataVencimento) {
    throw createHttpError(400, 'Data de vencimento e obrigatoria para criar o titulo.');
  }

  const descricao = String(payload.descricao || '').trim();
  if (!descricao) {
    throw createHttpError(400, 'Descricao e obrigatoria para criar o titulo manual.');
  }

  const [obra, parceiro] = await Promise.all([
    validarObraTitulo(req, obraId),
    validarParceiro(parceiroId),
    validarCategoriaFinanceira(payload.categoria_financeira_id, tipo)
  ]);

  validarCompatibilidadeParceiroTitulo(parceiro, tipo);

  const titulo = await TituloFinanceiro.create({
    solicitacao_id: null,
    obra_id: obra.id,
    parceiro_id: parceiro.id,
    categoria_financeira_id: payload.categoria_financeira_id || null,
    tipo,
    status: 'ABERTO',
    descricao: descricao.slice(0, 255) || descricaoPadraoTituloManual(tipo),
    numero_documento: payload.numero_documento || null,
    valor_original: roundCurrency(valorOriginal),
    valor_saldo: roundCurrency(valorOriginal),
    valor_baixado: 0,
    data_emissao: payload.data_emissao || getHoje(),
    data_vencimento: dataVencimento,
    data_quitacao: null,
    observacoes: payload.observacoes || null,
    ...buildCobrancaFields(payload, tipo),
    criado_por: req.user?.id || null,
    atualizado_por: req.user?.id || null
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_TITLE_CREATED',
    recursoTipo: 'TITULO_FINANCEIRO',
    recursoId: titulo.id,
    status: 'SUCCESS',
    descricao: 'Titulo financeiro criado manualmente',
    metadata: {
      origem: 'MANUAL',
      obra_id: obra.id,
      parceiro_id: parceiro.id,
      tipo,
      valor_original: roundCurrency(valorOriginal)
    }
  });

  return carregarTituloPorId(req, titulo.id);
}

async function criarTituloManualComBaixaAtomica(req, payload = {}, { transaction: externalTransaction = null } = {}) {
  await assertFinanceAccess(req);

  const tipo = normalizarTipoTitulo(payload.tipo || 'PAGAR');
  if (!['PAGAR', 'RECEBER'].includes(tipo)) {
    throw createHttpError(400, 'Tipo de titulo invalido.');
  }

  const obraId = Number(payload.obra_id);
  if (!Number.isInteger(obraId) || obraId <= 0) {
    throw createHttpError(400, 'Obra e obrigatoria para criar o titulo.');
  }

  const parceiroId = Number(payload.parceiro_id);
  if (!Number.isInteger(parceiroId) || parceiroId <= 0) {
    throw createHttpError(400, 'Parceiro e obrigatorio para criar o titulo.');
  }

  const valorOriginal = Number(payload.valor);
  if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
    throw createHttpError(400, 'Valor invalido para criar o titulo.');
  }

  const dataVencimento = payload.data_vencimento;
  if (!dataVencimento) {
    throw createHttpError(400, 'Data de vencimento e obrigatoria para criar o titulo.');
  }

  const dataMovimento = payload.data_movimento;
  if (!dataMovimento) {
    throw createHttpError(400, 'Data do movimento e obrigatoria para registrar a baixa.');
  }

  const descricao = String(payload.descricao || '').trim();
  if (!descricao) {
    throw createHttpError(400, 'Descricao e obrigatoria para criar o titulo manual.');
  }

  const contaBancariaId = Number(payload.conta_bancaria_id);
  if (!Number.isInteger(contaBancariaId) || contaBancariaId <= 0) {
    throw createHttpError(400, 'Conta bancaria e obrigatoria para registrar a baixa.');
  }

  const [obra, parceiro, categoria, conta] = await Promise.all([
    validarObraTitulo(req, obraId),
    validarParceiro(parceiroId),
    validarCategoriaFinanceira(payload.categoria_financeira_id, tipo),
    validarContaBancaria(contaBancariaId)
  ]);

  validarCompatibilidadeParceiroTitulo(parceiro, tipo);

  const valorBaixa = roundCurrency(payload.valor);
  const juros = roundCurrency(payload.juros || 0);
  const multa = roundCurrency(payload.multa || 0);
  const desconto = roundCurrency(payload.desconto || 0);
  const valorQuitacao = roundCurrency(valorBaixa + juros + multa - desconto);

  if (valorBaixa <= 0) {
    throw createHttpError(400, 'Valor da baixa deve ser maior que zero.');
  }

  if (valorQuitacao <= 0) {
    throw createHttpError(400, 'Valor final da quitacao deve ser maior que zero.');
  }

  const formaRecebimento = normalizarFormaRecebimento(payload.forma_recebimento);
  const ownTransaction = !externalTransaction;
  const transaction = externalTransaction || await sequelize.transaction();

  try {
    const titulo = await TituloFinanceiro.create({
      solicitacao_id: null,
      obra_id: obra.id,
      parceiro_id: parceiro.id,
      categoria_financeira_id: categoria?.id || null,
      tipo,
      status: 'ABERTO',
      descricao: descricao.slice(0, 255) || descricaoPadraoTituloManual(tipo),
      numero_documento: payload.numero_documento || null,
      valor_original: roundCurrency(valorOriginal),
      valor_saldo: roundCurrency(valorOriginal),
      valor_baixado: 0,
      data_emissao: payload.data_emissao || getHoje(),
      data_vencimento: dataVencimento,
      data_quitacao: null,
      observacoes: payload.observacoes || null,
      ...buildCobrancaFields(payload, tipo),
      criado_por: req.user?.id || null,
      atualizado_por: req.user?.id || null
    }, { transaction });

    const novoValorBaixado = roundCurrency(Number(titulo.valor_baixado || 0) + valorBaixa);
    const novoEstado = calcularStatusTitulo({
      valorOriginal: Number(titulo.valor_original || 0),
      valorBaixado: novoValorBaixado
    });

    const movimento = await MovimentoFinanceiro.create({
      titulo_financeiro_id: titulo.id,
      conta_bancaria_id: conta.id,
      forma_recebimento: formaRecebimento,
      tipo_permuta: payload.tipo_permuta || null,
      categoria_bem: payload.categoria_bem || null,
      descricao_bem: payload.descricao_bem || null,
      valor_referencia_bem: payload.valor_referencia_bem ?? null,
      documento_referencia: payload.documento_referencia || null,
      tipo_movimento: 'BAIXA',
      status: 'ATIVO',
      valor: valorBaixa,
      juros,
      multa,
      desconto,
      valor_quitacao: valorQuitacao,
      data_movimento: dataMovimento,
      observacoes: payload.observacoes || null,
      criado_por: req.user?.id || null
    }, { transaction });

    await titulo.update({
      valor_baixado: novoValorBaixado,
      valor_saldo: novoEstado.valor_saldo,
      status: novoEstado.status,
      data_quitacao: novoEstado.status === 'QUITADO' ? dataMovimento : null,
      status_cobranca: titulo.forma_cobranca ? 'CONCILIADO' : titulo.status_cobranca,
      atualizado_por: req.user?.id || null
    }, { transaction });

    const afterCommit = async () => {
      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'FINANCIAL_TITLE_CREATED',
        recursoTipo: 'TITULO_FINANCEIRO',
        recursoId: titulo.id,
        status: 'SUCCESS',
        descricao: 'Titulo financeiro criado manualmente',
        metadata: {
          origem: 'MANUAL_CONCILIACAO',
          obra_id: obra.id,
          parceiro_id: parceiro.id,
          tipo,
          valor_original: roundCurrency(valorOriginal)
        }
      });

      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'FINANCIAL_TITLE_SETTLED',
        recursoTipo: 'TITULO_FINANCEIRO',
        recursoId: titulo.id,
        status: 'SUCCESS',
        descricao: 'Baixa financeira registrada no titulo',
        metadata: {
          movimento_id: movimento.id,
          conta_bancaria_id: conta.id,
          forma_recebimento: formaRecebimento,
          tipo_permuta: payload.tipo_permuta || null,
          categoria_bem: payload.categoria_bem || null,
          valor: valorBaixa,
          juros,
          multa,
          desconto,
          valor_quitacao: valorQuitacao
        }
      });
    };

    if (ownTransaction) {
      await transaction.commit();
      await afterCommit();
    }

    return {
      titulo,
      movimento,
      afterCommit: ownTransaction ? null : afterCommit
    };
  } catch (error) {
    if (ownTransaction) {
      await transaction.rollback();
    }
    throw error;
  }
}

function calcularStatusTitulo({ valorOriginal, valorBaixado }) {
  const saldo = roundCurrency(valorOriginal - valorBaixado);
  if (saldo <= 0) {
    return {
      status: 'QUITADO',
      valor_saldo: 0
    };
  }

  if (valorBaixado > 0) {
    return {
      status: 'PARCIAL',
      valor_saldo: saldo
    };
  }

  return {
    status: 'ABERTO',
    valor_saldo: saldo
  };
}

async function baixarTitulo(req, tituloId, payload = {}) {
  const titulo = await carregarTituloPorId(req, tituloId, { includeMovimentos: false });
  const statusAtual = String(titulo.status || '').trim().toUpperCase();

  if (!['ABERTO', 'PARCIAL'].includes(statusAtual)) {
    throw createHttpError(400, 'Somente titulos em aberto ou parcial podem receber baixa.');
  }

  const valorBaixa = roundCurrency(payload.valor);
  const juros = roundCurrency(payload.juros || 0);
  const multa = roundCurrency(payload.multa || 0);
  const desconto = roundCurrency(payload.desconto || 0);
  const valorQuitacao = roundCurrency(valorBaixa + juros + multa - desconto);
  const saldoAtual = roundCurrency(titulo.valor_saldo);

  if (valorBaixa <= 0) {
    throw createHttpError(400, 'Valor da baixa deve ser maior que zero.');
  }

  if (valorBaixa > saldoAtual) {
    throw createHttpError(400, 'Valor da baixa nao pode ser maior que o saldo do titulo.');
  }

  if (valorQuitacao <= 0) {
    throw createHttpError(400, 'Valor final da quitacao deve ser maior que zero.');
  }

  const formaRecebimento = normalizarFormaRecebimento(payload.forma_recebimento);
  const conta = await validarContaBancaria(payload.conta_bancaria_id);
  const novoValorBaixado = roundCurrency(Number(titulo.valor_baixado || 0) + valorBaixa);
  const novoEstado = calcularStatusTitulo({
    valorOriginal: Number(titulo.valor_original || 0),
    valorBaixado: novoValorBaixado
  });

  const transaction = await sequelize.transaction();
  try {
    const movimento = await MovimentoFinanceiro.create({
      titulo_financeiro_id: titulo.id,
      conta_bancaria_id: conta?.id || null,
      forma_recebimento: formaRecebimento,
      tipo_permuta: payload.tipo_permuta || null,
      categoria_bem: payload.categoria_bem || null,
      descricao_bem: payload.descricao_bem || null,
      valor_referencia_bem: payload.valor_referencia_bem ?? null,
      documento_referencia: payload.documento_referencia || null,
      tipo_movimento: 'BAIXA',
      status: 'ATIVO',
      valor: valorBaixa,
      juros,
      multa,
      desconto,
      valor_quitacao: valorQuitacao,
      data_movimento: payload.data_movimento,
      observacoes: payload.observacoes || null,
      criado_por: req.user?.id || null
    }, { transaction });

    await titulo.update({
      valor_baixado: novoValorBaixado,
      valor_saldo: novoEstado.valor_saldo,
      status: novoEstado.status,
      data_quitacao: novoEstado.status === 'QUITADO' ? payload.data_movimento : null,
      status_cobranca: titulo.forma_cobranca ? 'CONCILIADO' : titulo.status_cobranca,
      atualizado_por: req.user?.id || null
    }, { transaction });

    if (titulo.solicitacao_id) {
      await Historico.create({
        solicitacao_id: titulo.solicitacao_id,
        usuario_responsavel_id: req.user?.id || null,
        setor: getSetorUsuario(req),
        acao: 'TITULO_FINANCEIRO_BAIXADO',
        observacao: `Baixa de ${formatCurrency(valorBaixa)} registrada no titulo financeiro #${titulo.id}`
      }, { transaction });
    }

    await transaction.commit();

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_TITLE_SETTLED',
      recursoTipo: 'TITULO_FINANCEIRO',
      recursoId: titulo.id,
      status: 'SUCCESS',
      descricao: 'Baixa financeira registrada no titulo',
      metadata: {
        movimento_id: movimento.id,
        conta_bancaria_id: conta?.id || null,
        forma_recebimento: formaRecebimento,
        tipo_permuta: payload.tipo_permuta || null,
        categoria_bem: payload.categoria_bem || null,
        valor: valorBaixa,
        juros,
        multa,
        desconto,
        valor_quitacao: valorQuitacao
      }
    });

    const tituloCompleto = await carregarTituloPorId(req, titulo.id, { includeMovimentos: true });
    const tituloJson = typeof tituloCompleto?.toJSON === 'function'
      ? tituloCompleto.toJSON()
      : tituloCompleto;
    const movimentoGerado = Array.isArray(tituloJson?.movimentos)
      ? tituloJson.movimentos.find((item) => Number(item?.id) === Number(movimento.id))
      : null;

    return {
      ...tituloJson,
      movimento_financeiro_id: movimento.id,
      movimento: movimentoGerado || {
        id: movimento.id,
        tipo_movimento: movimento.tipo_movimento,
        status: movimento.status,
        conta_bancaria_id: movimento.conta_bancaria_id,
        valor: movimento.valor,
        valor_quitacao: movimento.valor_quitacao,
        data_movimento: movimento.data_movimento
      }
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function estornarMovimentoTitulo(req, tituloId, movimentoId, payload = {}) {
  const titulo = await carregarTituloPorId(req, tituloId, { includeMovimentos: false });
  const movimento = await MovimentoFinanceiro.findOne({
    where: {
      id: movimentoId,
      titulo_financeiro_id: titulo.id
    }
  });

  if (!movimento) {
    throw createHttpError(404, 'Movimento financeiro nao encontrado.');
  }

  if (String(movimento.tipo_movimento || '').toUpperCase() !== 'BAIXA') {
    throw createHttpError(400, 'Somente baixas podem ser estornadas.');
  }

  if (String(movimento.status || '').toUpperCase() !== 'ATIVO') {
    throw createHttpError(400, 'Esta baixa ja foi estornada.');
  }

  const novoValorBaixado = roundCurrency(Number(titulo.valor_baixado || 0) - Number(movimento.valor || 0));
  const valorBaixadoNormalizado = novoValorBaixado < 0 ? 0 : novoValorBaixado;
  const novoEstado = calcularStatusTitulo({
    valorOriginal: Number(titulo.valor_original || 0),
    valorBaixado: valorBaixadoNormalizado
  });

  const transaction = await sequelize.transaction();
  try {
    await movimento.update({
      status: 'ESTORNADO',
      observacoes: payload.observacoes
        ? `${String(movimento.observacoes || '').trim()}\nEstorno: ${payload.observacoes}`.trim()
        : movimento.observacoes,
      estornado_por: req.user?.id || null,
      estornado_em: new Date()
    }, { transaction });

    await titulo.update({
      valor_baixado: valorBaixadoNormalizado,
      valor_saldo: novoEstado.valor_saldo,
      status: novoEstado.status,
      data_quitacao: novoEstado.status === 'QUITADO' ? titulo.data_quitacao : null,
      status_cobranca: titulo.forma_cobranca ? 'EMITIDO' : titulo.status_cobranca,
      atualizado_por: req.user?.id || null
    }, { transaction });

    if (titulo.solicitacao_id) {
      await Historico.create({
        solicitacao_id: titulo.solicitacao_id,
        usuario_responsavel_id: req.user?.id || null,
        setor: getSetorUsuario(req),
        acao: 'TITULO_FINANCEIRO_ESTORNADO',
        observacao: `Estorno da baixa ${movimento.id} registrado no titulo financeiro #${titulo.id}`
      }, { transaction });
    }

    await transaction.commit();

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_TITLE_REVERSAL',
      recursoTipo: 'TITULO_FINANCEIRO',
      recursoId: titulo.id,
      status: 'SUCCESS',
      descricao: 'Baixa financeira estornada',
      metadata: {
        movimento_id: movimento.id,
        valor_estornado: Number(movimento.valor || 0)
      }
    });

    return carregarTituloPorId(req, titulo.id, { includeMovimentos: true });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function atualizarCobrancaTitulo(req, tituloId, payload = {}) {
  const titulo = await carregarTituloPorId(req, tituloId, { includeMovimentos: false });
  const cobranca = buildUpdatedCobrancaFields(titulo, payload);

  await titulo.update({
    ...cobranca,
    atualizado_por: req.user?.id || null
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_COLLECTION_UPDATED',
    recursoTipo: 'TITULO_FINANCEIRO',
    recursoId: titulo.id,
    status: 'SUCCESS',
    descricao: 'Dados de cobranca atualizados no titulo financeiro',
    metadata: {
      forma_cobranca: cobranca.forma_cobranca,
      status_cobranca: cobranca.status_cobranca,
      banco_cobranca: cobranca.banco_cobranca,
      nosso_numero: cobranca.nosso_numero,
      identificador_externo: cobranca.identificador_externo,
      boleto_emitido_em: cobranca.boleto_emitido_em
    }
  });

  return carregarTituloPorId(req, titulo.id, { includeMovimentos: true });
}

function normalizarLabelEventoAuditoria(tipoEvento) {
  switch (String(tipoEvento || '').trim().toUpperCase()) {
    case 'FINANCIAL_TITLE_CREATED':
      return 'Titulo criado';
    case 'FINANCIAL_COLLECTION_UPDATED':
      return 'Cobranca atualizada';
    case 'FINANCIAL_TITLE_SETTLED':
      return 'Baixa registrada';
    case 'FINANCIAL_TITLE_REVERSAL':
      return 'Baixa estornada';
    default:
      return String(tipoEvento || 'Evento financeiro')
        .trim()
        .replace(/_/g, ' ')
        .toLowerCase();
  }
}

async function listarAuditoriaTitulo(req, tituloId) {
  const titulo = await carregarTituloPorId(req, tituloId, { includeMovimentos: false });

  const eventos = await SecurityEventLog.findAll({
    where: {
      recurso_tipo: 'TITULO_FINANCEIRO',
      recurso_id: String(titulo.id)
    },
    include: [
      {
        model: User,
        as: 'usuario',
        attributes: ['id', 'nome', 'email']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  return eventos.map((evento) => ({
    id: evento.id,
    tipo_evento: evento.tipo_evento,
    label: normalizarLabelEventoAuditoria(evento.tipo_evento),
    status: evento.status,
    descricao: evento.descricao,
    criado_em: evento.createdAt,
    usuario: evento.usuario
      ? {
          id: evento.usuario.id,
          nome: evento.usuario.nome,
          email: evento.usuario.email
        }
      : null,
    metadata: evento.metadata || null
  }));
}

module.exports = {
  atualizarCobrancaTitulo,
  baixarTitulo,
  carregarTituloPorId,
  criarTituloManual,
  criarTituloManualComBaixaAtomica,
  criarTituloPorSolicitacao,
  estornarMovimentoTitulo,
  listarAuditoriaTitulo,
  listarTitulos,
  listarTitulosPorSolicitacao
};
