const {
  CartaoFinanceiro,
  CategoriaFinanceira,
  ContaBancaria,
  FormaPagamentoFinanceira
} = require('../models');
const {
  canAccessFinanceiro
} = require('./authorizationService');
const { registrarEventoSeguranca } = require('./securityLogService');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeTextField(value, { emptyAsNull = false } = {}) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return emptyAsNull ? null : '';
  }

  return normalized;
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
    descricao: 'Usuario sem permissao para acessar cadastros financeiros'
  });

  throw createHttpError(403, 'Acesso negado para o modulo financeiro');
}

function sanitizeContaPayload(payload = {}, { partial = false } = {}) {
  const data = {
    nome: sanitizeTextField(payload.nome),
    banco: sanitizeTextField(payload.banco, { emptyAsNull: true }),
    agencia: sanitizeTextField(payload.agencia, { emptyAsNull: true }),
    conta: sanitizeTextField(payload.conta, { emptyAsNull: true }),
    tipo_conta: sanitizeTextField(payload.tipo_conta, { emptyAsNull: true }),
    ativo: payload.ativo
  };

  if (!partial) {
    if (!String(data.nome || '').trim()) {
      throw createHttpError(400, 'Nome da conta bancaria e obrigatorio.');
    }
  }

  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
}

function sanitizeCategoriaPayload(payload = {}, { partial = false } = {}) {
  const data = {
    nome: sanitizeTextField(payload.nome),
    tipo: sanitizeTextField(payload.tipo),
    descricao: sanitizeTextField(payload.descricao, { emptyAsNull: true }),
    ativo: payload.ativo
  };

  if (!partial) {
    if (!String(data.nome || '').trim()) {
      throw createHttpError(400, 'Nome da categoria financeira e obrigatorio.');
    }
    if (!String(data.tipo || '').trim()) {
      throw createHttpError(400, 'Tipo da categoria financeira e obrigatorio.');
    }
  }

  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
}

function normalizeCodigo(value, fallback = '') {
  return String(value || fallback)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function sanitizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
}

function sanitizeFormaPagamentoPayload(payload = {}, { partial = false } = {}) {
  const nome = sanitizeTextField(payload.nome);
  const data = {
    nome,
    codigo: payload.codigo === undefined ? undefined : normalizeCodigo(payload.codigo, nome),
    tipo: payload.tipo === undefined ? undefined : normalizeCodigo(payload.tipo),
    permite_parcelamento: payload.permite_parcelamento === undefined ? undefined : sanitizeBoolean(payload.permite_parcelamento),
    gera_fatura: payload.gera_fatura === undefined ? undefined : sanitizeBoolean(payload.gera_fatura),
    gera_boleto: payload.gera_boleto === undefined ? undefined : sanitizeBoolean(payload.gera_boleto),
    exige_cartao: payload.exige_cartao === undefined ? undefined : sanitizeBoolean(payload.exige_cartao),
    exige_cheque: payload.exige_cheque === undefined ? undefined : sanitizeBoolean(payload.exige_cheque),
    ordem: payload.ordem === undefined ? undefined : Number(payload.ordem || 0),
    ativo: payload.ativo === undefined ? undefined : sanitizeBoolean(payload.ativo, true)
  };

  if (!partial) {
    if (!String(data.nome || '').trim()) throw createHttpError(400, 'Nome da forma de pagamento e obrigatorio.');
    data.codigo = data.codigo || normalizeCodigo(data.nome);
    data.tipo = data.tipo || data.codigo;
  }

  if (data.ordem !== undefined && (!Number.isInteger(data.ordem) || data.ordem < 0)) {
    throw createHttpError(400, 'Ordem da forma de pagamento invalida.');
  }

  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function sanitizeCartaoPayload(payload = {}, { partial = false } = {}) {
  const data = {
    nome: sanitizeTextField(payload.nome),
    titular: sanitizeTextField(payload.titular),
    bandeira: sanitizeTextField(payload.bandeira, { emptyAsNull: true }),
    ultimos_digitos: payload.ultimos_digitos === undefined ? undefined : String(payload.ultimos_digitos || '').replace(/\D/g, '').slice(-4),
    conta_bancaria_id: payload.conta_bancaria_id === undefined ? undefined : (payload.conta_bancaria_id ? Number(payload.conta_bancaria_id) : null),
    dia_fechamento: payload.dia_fechamento === undefined ? undefined : Number(payload.dia_fechamento),
    dia_vencimento: payload.dia_vencimento === undefined ? undefined : Number(payload.dia_vencimento),
    ativo: payload.ativo === undefined ? undefined : sanitizeBoolean(payload.ativo, true),
    observacoes: sanitizeTextField(payload.observacoes, { emptyAsNull: true })
  };

  if (!partial) {
    if (!String(data.nome || '').trim()) throw createHttpError(400, 'Nome do cartao e obrigatorio.');
    if (!String(data.titular || '').trim()) throw createHttpError(400, 'Titular do cartao e obrigatorio.');
    if (!String(data.ultimos_digitos || '').trim() || data.ultimos_digitos.length !== 4) {
      throw createHttpError(400, 'Informe os 4 ultimos digitos do cartao.');
    }
  }

  for (const field of ['dia_fechamento', 'dia_vencimento']) {
    if (data[field] !== undefined && (!Number.isInteger(data[field]) || data[field] < 1 || data[field] > 31)) {
      throw createHttpError(400, `${field === 'dia_fechamento' ? 'Dia de fechamento' : 'Dia de vencimento'} invalido.`);
    }
  }

  if (data.conta_bancaria_id !== undefined && data.conta_bancaria_id !== null && (!Number.isInteger(data.conta_bancaria_id) || data.conta_bancaria_id <= 0)) {
    throw createHttpError(400, 'Conta bancaria do cartao invalida.');
  }

  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

async function listarContasBancarias(req) {
  await assertFinanceAccess(req);

  return ContaBancaria.findAll({
    order: [['nome', 'ASC']]
  });
}

async function criarContaBancaria(req, payload = {}) {
  await assertFinanceAccess(req);
  const data = sanitizeContaPayload(payload);
  data.criado_por = req.user?.id || null;
  data.atualizado_por = req.user?.id || null;

  const conta = await ContaBancaria.create(data);

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_BANK_ACCOUNT_CREATED',
    recursoTipo: 'CONTA_BANCARIA',
    recursoId: conta.id,
    status: 'SUCCESS',
    descricao: 'Conta bancaria criada no modulo financeiro',
    metadata: {
      nome: conta.nome
    }
  });

  return conta;
}

async function atualizarContaBancaria(req, contaId, payload = {}) {
  await assertFinanceAccess(req);

  const conta = await ContaBancaria.findByPk(contaId);
  if (!conta) {
    throw createHttpError(404, 'Conta bancaria nao encontrada.');
  }

  const data = sanitizeContaPayload(payload, { partial: true });
  if (Object.keys(data).length === 0) {
    throw createHttpError(400, 'Nenhum campo valido informado para atualizar a conta bancaria.');
  }

  data.atualizado_por = req.user?.id || null;
  await conta.update(data);

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_BANK_ACCOUNT_UPDATED',
    recursoTipo: 'CONTA_BANCARIA',
    recursoId: conta.id,
    status: 'SUCCESS',
    descricao: 'Conta bancaria atualizada no modulo financeiro',
    metadata: {
      campos_alterados: Object.keys(data)
    }
  });

  return conta;
}

async function listarCategoriasFinanceiras(req) {
  await assertFinanceAccess(req);

  return CategoriaFinanceira.findAll({
    order: [['nome', 'ASC']]
  });
}

async function listarFormasPagamentoFinanceiras(req) {
  await assertFinanceAccess(req);

  return FormaPagamentoFinanceira.findAll({
    order: [['ordem', 'ASC'], ['nome', 'ASC']]
  });
}

async function criarFormaPagamentoFinanceira(req, payload = {}) {
  await assertFinanceAccess(req);
  const data = sanitizeFormaPagamentoPayload(payload);
  data.criado_por = req.user?.id || null;
  data.atualizado_por = req.user?.id || null;

  const forma = await FormaPagamentoFinanceira.create(data);

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_PAYMENT_METHOD_CREATED',
    recursoTipo: 'FORMA_PAGAMENTO_FINANCEIRA',
    recursoId: forma.id,
    status: 'SUCCESS',
    descricao: 'Forma de pagamento financeira criada',
    metadata: { codigo: forma.codigo, tipo: forma.tipo }
  });

  return forma;
}

async function atualizarFormaPagamentoFinanceira(req, formaId, payload = {}) {
  await assertFinanceAccess(req);

  const forma = await FormaPagamentoFinanceira.findByPk(formaId);
  if (!forma) throw createHttpError(404, 'Forma de pagamento nao encontrada.');

  const data = sanitizeFormaPagamentoPayload(payload, { partial: true });
  if (Object.keys(data).length === 0) {
    throw createHttpError(400, 'Nenhum campo valido informado para atualizar a forma de pagamento.');
  }

  data.atualizado_por = req.user?.id || null;
  await forma.update(data);
  return forma;
}

async function listarCartoesFinanceiros(req) {
  await assertFinanceAccess(req);

  return CartaoFinanceiro.findAll({
    include: [{ model: ContaBancaria, as: 'contaBancaria', attributes: ['id', 'nome', 'banco', 'agencia', 'conta'] }],
    order: [['nome', 'ASC']]
  });
}

async function criarCartaoFinanceiro(req, payload = {}) {
  await assertFinanceAccess(req);
  const data = sanitizeCartaoPayload(payload);
  data.criado_por = req.user?.id || null;
  data.atualizado_por = req.user?.id || null;

  const cartao = await CartaoFinanceiro.create(data);
  return CartaoFinanceiro.findByPk(cartao.id, {
    include: [{ model: ContaBancaria, as: 'contaBancaria', attributes: ['id', 'nome', 'banco', 'agencia', 'conta'] }]
  });
}

async function atualizarCartaoFinanceiro(req, cartaoId, payload = {}) {
  await assertFinanceAccess(req);

  const cartao = await CartaoFinanceiro.findByPk(cartaoId);
  if (!cartao) throw createHttpError(404, 'Cartao nao encontrado.');

  const data = sanitizeCartaoPayload(payload, { partial: true });
  if (Object.keys(data).length === 0) {
    throw createHttpError(400, 'Nenhum campo valido informado para atualizar o cartao.');
  }

  data.atualizado_por = req.user?.id || null;
  await cartao.update(data);
  return CartaoFinanceiro.findByPk(cartao.id, {
    include: [{ model: ContaBancaria, as: 'contaBancaria', attributes: ['id', 'nome', 'banco', 'agencia', 'conta'] }]
  });
}

async function criarCategoriaFinanceira(req, payload = {}) {
  await assertFinanceAccess(req);
  const data = sanitizeCategoriaPayload(payload);
  data.criado_por = req.user?.id || null;
  data.atualizado_por = req.user?.id || null;

  const categoria = await CategoriaFinanceira.create(data);

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_CATEGORY_CREATED',
    recursoTipo: 'CATEGORIA_FINANCEIRA',
    recursoId: categoria.id,
    status: 'SUCCESS',
    descricao: 'Categoria financeira criada',
    metadata: {
      nome: categoria.nome,
      tipo: categoria.tipo
    }
  });

  return categoria;
}

async function atualizarCategoriaFinanceira(req, categoriaId, payload = {}) {
  await assertFinanceAccess(req);

  const categoria = await CategoriaFinanceira.findByPk(categoriaId);
  if (!categoria) {
    throw createHttpError(404, 'Categoria financeira nao encontrada.');
  }

  const data = sanitizeCategoriaPayload(payload, { partial: true });
  if (Object.keys(data).length === 0) {
    throw createHttpError(400, 'Nenhum campo valido informado para atualizar a categoria financeira.');
  }

  data.atualizado_por = req.user?.id || null;
  await categoria.update(data);

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_CATEGORY_UPDATED',
    recursoTipo: 'CATEGORIA_FINANCEIRA',
    recursoId: categoria.id,
    status: 'SUCCESS',
    descricao: 'Categoria financeira atualizada',
    metadata: {
      campos_alterados: Object.keys(data)
    }
  });

  return categoria;
}

module.exports = {
  atualizarCartaoFinanceiro,
  atualizarCategoriaFinanceira,
  atualizarContaBancaria,
  atualizarFormaPagamentoFinanceira,
  criarCartaoFinanceiro,
  criarCategoriaFinanceira,
  criarContaBancaria,
  criarFormaPagamentoFinanceira,
  listarCartoesFinanceiros,
  listarCategoriasFinanceiras,
  listarContasBancarias,
  listarFormasPagamentoFinanceiras
};
