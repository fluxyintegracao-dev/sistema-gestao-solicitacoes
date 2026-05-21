const { Op } = require('sequelize');
const {
  CaixaFinanceiroSessao,
  ContaBancaria,
  EmpresaGrupo,
  MovimentoFinanceiro,
  TituloFinanceiro,
  TransferenciaFinanceira,
  User
} = require('../models');
const { canAccessFinanceiro } = require('./authorizationService');
const { registrarEventoSeguranca } = require('./securityLogService');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function assertFinanceAccess(req) {
  const allowed = await canAccessFinanceiro(req.user);
  if (allowed) return;

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'AUTHZ_DENIED',
    recursoTipo: 'CAIXA_FINANCEIRO',
    recursoId: req.originalUrl,
    status: 'DENIED',
    descricao: 'Usuario sem permissao para acessar abertura e fechamento de caixa'
  });

  throw createHttpError(403, 'Acesso negado para o modulo financeiro');
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${fieldName} invalido.`);
  }
  return parsed;
}

function parseMoney(value, fieldName, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) {
      throw createHttpError(400, `${fieldName} e obrigatorio.`);
    }
    return null;
  }
  const raw = String(value).trim().replace(/[R$\s]/gi, '');
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw createHttpError(400, `${fieldName} invalido.`);
  }
  return roundCurrency(parsed);
}

function parseDate(value, fieldName, fallback = null) {
  const date = value || fallback;
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    throw createHttpError(400, `${fieldName} invalida.`);
  }
  return String(date);
}

function includeSessao() {
  return [
    {
      model: ContaBancaria,
      as: 'contaBancaria',
      attributes: ['id', 'nome', 'banco', 'agencia', 'conta', 'tipo_operacional', 'empresa_id']
    },
    {
      model: EmpresaGrupo,
      as: 'empresa',
      attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj']
    },
    {
      model: User,
      as: 'abertoPor',
      attributes: ['id', 'nome', 'email']
    },
    {
      model: User,
      as: 'fechadoPor',
      attributes: ['id', 'nome', 'email']
    }
  ];
}

async function carregarConta(contaBancariaId) {
  const id = parsePositiveInteger(contaBancariaId, 'Conta financeira');
  const conta = await ContaBancaria.findByPk(id, {
    include: [{ model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'codigo', 'nome'] }]
  });
  if (!conta || conta.ativo === false) {
    throw createHttpError(400, 'Conta financeira invalida ou inativa.');
  }
  if (!conta.empresa_id) {
    throw createHttpError(400, 'A conta financeira precisa estar vinculada a uma empresa do grupo antes de abrir caixa.');
  }
  return conta;
}

async function calcularResumoSessao(sessao) {
  const movimentos = await MovimentoFinanceiro.findAll({
    where: {
      conta_bancaria_id: sessao.conta_bancaria_id,
      status: 'ATIVO',
      data_movimento: {
        [Op.gte]: sessao.data_abertura,
        [Op.lte]: sessao.data_fechamento || today()
      }
    },
    include: [
      {
        model: TituloFinanceiro,
        as: 'titulo',
        attributes: ['id', 'tipo']
      }
    ]
  });

  let totalEntradas = 0;
  let totalSaidas = 0;

  for (const movimento of movimentos) {
    const valor = roundCurrency(movimento.valor_quitacao || movimento.valor || 0);
    if (String(movimento.titulo?.tipo || '').toUpperCase() === 'RECEBER') {
      totalEntradas = roundCurrency(totalEntradas + valor);
    } else {
      totalSaidas = roundCurrency(totalSaidas + valor);
    }
  }

  const transferencias = await TransferenciaFinanceira.findAll({
    where: {
      status: 'ATIVA',
      data_transferencia: {
        [Op.gte]: sessao.data_abertura,
        [Op.lte]: sessao.data_fechamento || today()
      },
      [Op.or]: [
        { conta_origem_id: sessao.conta_bancaria_id },
        { conta_destino_id: sessao.conta_bancaria_id }
      ]
    }
  });

  for (const transferencia of transferencias) {
    const valor = roundCurrency(transferencia.valor || 0);
    if (Number(transferencia.conta_destino_id) === Number(sessao.conta_bancaria_id)) {
      totalEntradas = roundCurrency(totalEntradas + valor);
    }
    if (Number(transferencia.conta_origem_id) === Number(sessao.conta_bancaria_id)) {
      totalSaidas = roundCurrency(totalSaidas + valor);
    }
  }

  const saldoAbertura = roundCurrency(sessao.saldo_abertura || 0);
  const saldoSistema = roundCurrency(saldoAbertura + totalEntradas - totalSaidas);

  return {
    total_entradas: totalEntradas,
    total_saidas: totalSaidas,
    saldo_sistema: saldoSistema,
    quantidade_movimentos: movimentos.length,
    quantidade_transferencias: transferencias.length
  };
}

async function listarSessoesCaixa(req, filters = {}) {
  await assertFinanceAccess(req);
  const where = {};

  if (filters.conta_bancaria_id) {
    where.conta_bancaria_id = parsePositiveInteger(filters.conta_bancaria_id, 'Conta financeira');
  }
  if (filters.empresa_id) {
    where.empresa_id = parsePositiveInteger(filters.empresa_id, 'Empresa do grupo');
  }
  if (filters.status) {
    const status = String(filters.status || '').trim().toUpperCase();
    if (!['ABERTO', 'FECHADO', 'TODOS'].includes(status)) {
      throw createHttpError(400, 'Status do caixa invalido.');
    }
    if (status !== 'TODOS') where.status = status;
  }

  const sessoes = await CaixaFinanceiroSessao.findAll({
    where,
    include: includeSessao(),
    order: [['data_abertura', 'DESC'], ['id', 'DESC']],
    limit: Math.min(Math.max(Number(filters.limit || 50), 1), 200)
  });

  return Promise.all(sessoes.map(async (sessao) => {
    if (sessao.status === 'ABERTO') {
      const resumo = await calcularResumoSessao(sessao);
      sessao.setDataValue('resumo_atual', resumo);
    }
    return sessao;
  }));
}

async function abrirSessaoCaixa(req, payload = {}) {
  await assertFinanceAccess(req);
  const conta = await carregarConta(payload.conta_bancaria_id);

  const aberto = await CaixaFinanceiroSessao.findOne({
    where: {
      conta_bancaria_id: conta.id,
      status: 'ABERTO'
    }
  });

  if (aberto) {
    throw createHttpError(409, 'Ja existe um caixa aberto para esta conta.');
  }

  const ultimaFechada = await CaixaFinanceiroSessao.findOne({
    where: {
      conta_bancaria_id: conta.id,
      status: 'FECHADO'
    },
    order: [['data_fechamento', 'DESC'], ['id', 'DESC']]
  });

  const saldoPadrao = ultimaFechada
    ? roundCurrency(ultimaFechada.saldo_informado ?? ultimaFechada.saldo_sistema)
    : roundCurrency(conta.saldo_inicial || 0);
  const saldoAbertura = parseMoney(payload.saldo_abertura, 'Saldo de abertura') ?? saldoPadrao;
  const dataAbertura = parseDate(payload.data_abertura, 'Data de abertura', today());

  const sessao = await CaixaFinanceiroSessao.create({
    empresa_id: Number(conta.empresa_id),
    conta_bancaria_id: conta.id,
    data_abertura: dataAbertura,
    status: 'ABERTO',
    saldo_abertura: saldoAbertura,
    saldo_sistema: saldoAbertura,
    observacoes_abertura: payload.observacoes || null,
    aberto_por: req.user?.id || null
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_CASH_SESSION_OPENED',
    recursoTipo: 'CAIXA_FINANCEIRO',
    recursoId: sessao.id,
    status: 'SUCCESS',
    descricao: 'Sessao de caixa aberta',
    metadata: {
      conta_bancaria_id: conta.id,
      empresa_id: Number(conta.empresa_id),
      saldo_abertura: saldoAbertura
    }
  });

  return CaixaFinanceiroSessao.findByPk(sessao.id, { include: includeSessao() });
}

async function fecharSessaoCaixa(req, sessaoId, payload = {}) {
  await assertFinanceAccess(req);
  const sessao = await CaixaFinanceiroSessao.findByPk(parsePositiveInteger(sessaoId, 'Caixa'), {
    include: includeSessao()
  });

  if (!sessao) {
    throw createHttpError(404, 'Caixa nao encontrado.');
  }
  if (sessao.status !== 'ABERTO') {
    throw createHttpError(400, 'Apenas caixas abertos podem ser fechados.');
  }

  const dataFechamento = parseDate(payload.data_fechamento, 'Data de fechamento', today());
  if (dataFechamento < sessao.data_abertura) {
    throw createHttpError(400, 'Data de fechamento nao pode ser anterior a data de abertura.');
  }

  sessao.data_fechamento = dataFechamento;
  const resumo = await calcularResumoSessao(sessao);
  const saldoInformado = parseMoney(payload.saldo_informado, 'Saldo informado', { required: true });
  const diferenca = roundCurrency(saldoInformado - resumo.saldo_sistema);

  await sessao.update({
    data_fechamento: dataFechamento,
    status: 'FECHADO',
    total_entradas: resumo.total_entradas,
    total_saidas: resumo.total_saidas,
    saldo_sistema: resumo.saldo_sistema,
    saldo_informado: saldoInformado,
    diferenca,
    observacoes_fechamento: payload.observacoes || null,
    fechado_por: req.user?.id || null,
    fechado_em: new Date()
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_CASH_SESSION_CLOSED',
    recursoTipo: 'CAIXA_FINANCEIRO',
    recursoId: sessao.id,
    status: 'SUCCESS',
    descricao: 'Sessao de caixa fechada',
    metadata: {
      conta_bancaria_id: sessao.conta_bancaria_id,
      empresa_id: sessao.empresa_id || null,
      saldo_sistema: resumo.saldo_sistema,
      saldo_informado: saldoInformado,
      diferenca
    }
  });

  return CaixaFinanceiroSessao.findByPk(sessao.id, { include: includeSessao() });
}

async function obterResumoSessaoCaixa(req, sessaoId) {
  await assertFinanceAccess(req);
  const sessao = await CaixaFinanceiroSessao.findByPk(parsePositiveInteger(sessaoId, 'Caixa'), {
    include: includeSessao()
  });
  if (!sessao) {
    throw createHttpError(404, 'Caixa nao encontrado.');
  }
  const resumo = await calcularResumoSessao(sessao);
  sessao.setDataValue('resumo_atual', resumo);
  return sessao;
}

module.exports = {
  abrirSessaoCaixa,
  fecharSessaoCaixa,
  listarSessoesCaixa,
  obterResumoSessaoCaixa
};
