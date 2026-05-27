'use strict';

const { Op } = require('sequelize');
const { Empreendimento, UnidadeComercial } = require('../../../models');

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeSituacao(value) {
  const situacao = String(value || 'DISPONIVEL').trim().toUpperCase();
  if (['VENDIDO', 'VENDIDA'].includes(situacao)) return 'VENDIDO';
  if (['RESERVADO', 'RESERVADA'].includes(situacao)) return 'RESERVADO';
  if (['BLOQUEADO', 'BLOQUEADA'].includes(situacao)) return 'BLOQUEADO';
  return 'DISPONIVEL';
}

function isSoldUnit(unit = {}) {
  return normalizeSituacao(unit.situacao) === 'VENDIDO';
}

function getPublicUnitPrice(unit = {}) {
  return toNumberOrNull(unit.valor_base_venda) ?? toNumberOrNull(unit.valor_tabela);
}

function normalizeSearch(value) {
  return String(value || '').trim();
}

function parsePositiveInteger(value, fallback = null) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function buildEmpreendimentoWhere(query = {}) {
  const where = { ativo: true };
  const q = normalizeSearch(query.q);

  if (q) {
    where[Op.or] = [
      { nome: { [Op.like]: `%${q}%` } },
      { codigo: { [Op.like]: `%${q}%` } },
      { cidade: { [Op.like]: `%${q}%` } },
      { bairro: { [Op.like]: `%${q}%` } }
    ];
  }

  return where;
}

function serializePublicUnidade(unit = {}) {
  const plain = typeof unit.get === 'function' ? unit.get({ plain: true }) : unit;

  return {
    id_publico: String(plain.id),
    core_id: plain.id,
    codigo: plain.codigo,
    nome: plain.nome || plain.codigo,
    empreendimento_id: plain.empreendimento_id,
    empreendimento_nome: plain.empreendimento?.nome || null,
    bloco: plain.bloco,
    torre: plain.torre,
    pavimento: plain.pavimento,
    tipologia: plain.tipologia,
    situacao: normalizeSituacao(plain.situacao),
    status_comercial: normalizeSituacao(plain.situacao),
    preco: getPublicUnitPrice(plain),
    valor_a_partir_de: getPublicUnitPrice(plain),
    area_privativa: toNumberOrNull(plain.metragem_privativa),
    synced_at: new Date().toISOString()
  };
}

function serializePublicEmpreendimento(emp = {}) {
  const plain = typeof emp.get === 'function' ? emp.get({ plain: true }) : emp;
  const unidades = plain.unidadesComerciais || [];
  const disponiveis = unidades.filter((unit) => normalizeSituacao(unit.situacao) === 'DISPONIVEL');
  const precos = unidades
    .filter((unit) => !isSoldUnit(unit))
    .map(getPublicUnitPrice)
    .filter((value) => value !== null && value > 0);
  const areas = unidades
    .map((unit) => toNumberOrNull(unit.metragem_privativa))
    .filter((value) => value !== null && value > 0);

  return {
    id_publico: String(plain.id),
    core_id: plain.id,
    codigo: plain.codigo,
    slug: plain.codigo ? String(plain.codigo).trim().toLowerCase() : String(plain.id),
    nome: plain.nome,
    descricao: plain.descricao,
    cidade: plain.cidade,
    estado: plain.estado,
    bairro: plain.bairro,
    endereco_publico: [plain.bairro, plain.cidade, plain.estado].filter(Boolean).join(', ') || null,
    status_comercial: 'PUBLICAVEL',
    obra_id: plain.obra_id,
    unidades_total: unidades.length,
    unidades_disponiveis: disponiveis.length,
    preco_min: precos.length ? Math.min(...precos) : null,
    preco_max: precos.length ? Math.max(...precos) : null,
    area_privativa_min: areas.length ? Math.min(...areas) : null,
    area_privativa_max: areas.length ? Math.max(...areas) : null,
    tipologias: [...new Set(unidades.map((unit) => unit.tipologia).filter(Boolean))],
    synced_at: new Date().toISOString()
  };
}

async function listarEmpreendimentosPublicos(query = {}) {
  const empreendimentos = await Empreendimento.findAll({
    where: buildEmpreendimentoWhere(query),
    attributes: ['id', 'obra_id', 'codigo', 'nome', 'descricao', 'bairro', 'cidade', 'estado', 'ativo'],
    include: [
      {
        model: UnidadeComercial,
        as: 'unidadesComerciais',
        where: { ativo: true },
        required: false,
        attributes: [
          'id',
          'empreendimento_id',
          'codigo',
          'nome',
          'bloco',
          'torre',
          'pavimento',
          'tipologia',
          'metragem_privativa',
          'valor_tabela',
          'valor_base_venda',
          'situacao'
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  return empreendimentos.map(serializePublicEmpreendimento);
}

async function listarUnidadesPublicas(query = {}) {
  const where = { ativo: true };

  const empreendimentoId = parsePositiveInteger(query.empreendimento_id);
  if (empreendimentoId) {
    where.empreendimento_id = empreendimentoId;
  }

  if (query.situacao || query.status_comercial) {
    where.situacao = normalizeSituacao(query.situacao || query.status_comercial);
  }

  const q = normalizeSearch(query.q);
  if (q) {
    where[Op.or] = [
      { codigo: { [Op.like]: `%${q}%` } },
      { nome: { [Op.like]: `%${q}%` } },
      { bloco: { [Op.like]: `%${q}%` } },
      { torre: { [Op.like]: `%${q}%` } },
      { tipologia: { [Op.like]: `%${q}%` } }
    ];
  }

  const unidades = await UnidadeComercial.findAll({
    where,
    attributes: [
      'id',
      'empreendimento_id',
      'codigo',
      'nome',
      'bloco',
      'torre',
      'pavimento',
      'tipologia',
      'metragem_privativa',
      'valor_tabela',
      'valor_base_venda',
      'situacao'
    ],
    include: [
      {
        model: Empreendimento,
        as: 'empreendimento',
        where: { ativo: true },
        required: true,
        attributes: ['id', 'codigo', 'nome', 'cidade', 'estado']
      }
    ],
    order: [
      ['empreendimento_id', 'ASC'],
      ['torre', 'ASC'],
      ['pavimento', 'ASC'],
      ['codigo', 'ASC']
    ],
    limit: Math.min(parsePositiveInteger(query.limit, 500), 1000)
  });

  return unidades.map(serializePublicUnidade);
}

async function listarMapaUnidadesPublico(query = {}) {
  const unidades = await listarUnidadesPublicas(query);
  const grupos = new Map();

  for (const unidade of unidades) {
    const key = `${unidade.empreendimento_id || 'sem-empreendimento'}:${unidade.torre || unidade.bloco || 'geral'}`;
    if (!grupos.has(key)) {
      grupos.set(key, {
        empreendimento_id: unidade.empreendimento_id,
        empreendimento_nome: unidade.empreendimento_nome,
        bloco: unidade.bloco,
        torre: unidade.torre,
        unidades: []
      });
    }

    grupos.get(key).unidades.push({
      id_publico: unidade.id_publico,
      codigo: unidade.codigo,
      pavimento: unidade.pavimento,
      tipologia: unidade.tipologia,
      status_comercial: unidade.status_comercial,
      valor_a_partir_de: unidade.valor_a_partir_de,
      area_privativa: unidade.area_privativa
    });
  }

  return Array.from(grupos.values());
}

async function simularComercialNaoOficial(payload = {}) {
  const unidadeId = Number(payload.unidade_id || payload.unidade_core_id || 0);
  const prazoMeses = Number(payload.prazo_meses || 0);
  const valorEntrada = Number(payload.valor_entrada || 0);

  if (!Number.isInteger(unidadeId) || unidadeId <= 0) {
    const error = new Error('Informe uma unidade valida para simulacao.');
    error.statusCode = 422;
    throw error;
  }

  if (!Number.isInteger(prazoMeses) || prazoMeses <= 0) {
    const error = new Error('Informe prazo_meses maior que zero.');
    error.statusCode = 422;
    throw error;
  }

  const unidade = await UnidadeComercial.findOne({
    where: { id: unidadeId, ativo: true },
    attributes: ['id', 'empreendimento_id', 'codigo', 'nome', 'valor_tabela', 'valor_base_venda', 'situacao'],
    include: [
      {
        model: Empreendimento,
        as: 'empreendimento',
        where: { ativo: true },
        required: true,
        attributes: ['id', 'nome', 'codigo']
      }
    ]
  });

  if (!unidade) {
    const error = new Error('Unidade nao encontrada ou nao publicavel.');
    error.statusCode = 404;
    throw error;
  }

  const valorReferencia = getPublicUnitPrice(unidade);
  if (!valorReferencia || valorReferencia <= 0) {
    const error = new Error('Unidade sem valor publicavel para simulacao.');
    error.statusCode = 422;
    throw error;
  }

  const saldoSimulado = Math.max(valorReferencia - Math.max(valorEntrada, 0), 0);

  return {
    nao_oficial: true,
    gera_proposta: false,
    aprova_credito: false,
    unidade: serializePublicUnidade(unidade),
    tipo: String(payload.tipo || 'SIMPLES').trim().toUpperCase(),
    valor_referencia: valorReferencia,
    valor_entrada: Math.max(valorEntrada, 0),
    prazo_meses: prazoMeses,
    saldo_simulado: saldoSimulado,
    parcela_base_sem_juros: Math.round((saldoSimulado / prazoMeses + Number.EPSILON) * 100) / 100,
    observacao: 'Simulacao comercial preliminar. Nao substitui proposta, analise de credito, contrato ou aprovacao financeira oficial.'
  };
}

module.exports = {
  listarEmpreendimentosPublicos,
  listarUnidadesPublicas,
  listarMapaUnidadesPublico,
  simularComercialNaoOficial,
  normalizeSituacao,
  getPublicUnitPrice
};
