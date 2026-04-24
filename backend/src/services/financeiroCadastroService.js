const {
  CategoriaFinanceira,
  ContaBancaria
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
  atualizarCategoriaFinanceira,
  atualizarContaBancaria,
  criarCategoriaFinanceira,
  criarContaBancaria,
  listarCategoriasFinanceiras,
  listarContasBancarias
};
