'use strict';

const { Op } = require('sequelize');
const db = require('../../../models');
const { createWorkbookBuffer } = require('../../../utils/excelWorkbook');
const { createBusinessError } = require('./planoMicroService');
const {
  obterComparativo,
  obterPlanejamento
} = require('./planejamentoService');
const { listarRealizados, monthRange, normalizeCompetencia } = require('./realizadoService');
const { resolverEscopoObras } = require('../policies/obraScopePolicy');

const REPORT_TYPES = Object.freeze({
  'medicao-recebiveis': 'Medicao e recebiveis',
  'custos-previstos': 'Custos planejados',
  comparativo: 'Comparativo',
  'custo-realizado': 'Custo realizado',
  'solicitacoes-titulos': 'Solicitacoes e titulos',
  'resumo-executivo': 'Resumo executivo'
});

function dependencies(overrides = {}) {
  return {
    Obra: db.Obra,
    TituloFinanceiro: db.TituloFinanceiro,
    Solicitacao: db.Solicitacao,
    Parceiro: db.Parceiro,
    resolverEscopoObras,
    obterPlanejamento,
    obterComparativo,
    listarRealizados,
    ...overrides
  };
}

function normalizeType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

function money(value) {
  const parsed = Number(value);
  return Math.round(((Number.isFinite(parsed) ? parsed : 0) + Number.EPSILON) * 100) / 100;
}

function csvSafe(value) {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  const protectedValue = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

function createCsvBuffer(rows) {
  const text = rows.map((row) => row.map(csvSafe).join(';')).join('\r\n');
  return Buffer.from(`\uFEFF${text}`, 'utf8');
}

function formatDate(value) {
  if (!value) return '';
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split('-');
  return year && month && day ? `${day}/${month}/${year}` : raw;
}

async function resolveWorks(user, obraIdValue, deps) {
  const scope = await deps.resolverEscopoObras(user);
  const obraId = Number(obraIdValue);
  if (Number.isInteger(obraId) && obraId > 0) {
    if (!scope.todas && !scope.obraIds.includes(obraId)) {
      throw createBusinessError(403, 'CR_FORA_DE_ESCOPO', 'A obra informada esta fora do seu escopo.');
    }
    const work = await deps.Obra.findByPk(obraId, {
      attributes: ['id', 'codigo', 'nome', 'classificacao']
    });
    if (!work) throw createBusinessError(404, 'CR_OBRA_NOT_FOUND', 'Obra nao encontrada.');
    return [work];
  }
  const where = { ativo: true, tipo_centro_custo: 'OBRA' };
  if (!scope.todas) {
    if (!scope.obraIds.length) return [];
    where.id = { [Op.in]: scope.obraIds };
  }
  return deps.Obra.findAll({
    where,
    attributes: ['id', 'codigo', 'nome', 'classificacao'],
    order: [['nome', 'ASC']]
  });
}

async function safePlanning(user, workId, competencia, deps) {
  try {
    return await deps.obterPlanejamento(user, workId, competencia);
  } catch (error) {
    if (error?.code === 'CR_PLANO_PUBLICADO_REQUIRED') return null;
    throw error;
  }
}

async function safeComparison(user, workId, competencia, deps) {
  try {
    return await deps.obterComparativo(user, workId, competencia);
  } catch (error) {
    if (error?.code === 'CR_PLANO_PUBLICADO_REQUIRED') return null;
    throw error;
  }
}

async function buildMeasurementsRows(user, works, competencia, deps) {
  const rows = [[
    'Obra',
    'Classificacao',
    'Competencia',
    'Origem',
    'Item/Documento',
    'Data',
    'Previsto (R$)',
    'Realizado/Medido (R$)'
  ]];
  for (const work of works) {
    const planning = await safePlanning(user, Number(work.id), competencia, deps);
    if (!planning) continue;
    if (String(work.classificacao || '').toUpperCase() === 'PUBLICA') {
      const measurementRows = new Map();
      planning.recebiveis.forEach((receipt) => {
        const key = receipt.previsao_custo_id
          ? `custo:${receipt.previsao_custo_id}`
          : `plano:${receipt.plano_item_id}`;
        measurementRows.set(key, { receipt, measurement: null });
      });
      planning.medicoes.forEach((measurement) => {
        const key = measurement.previsao_custo_id
          ? `custo:${measurement.previsao_custo_id}`
          : `plano:${measurement.plano_item_id}`;
        const current = measurementRows.get(key) || { receipt: null, measurement: null };
        current.measurement = measurement;
        measurementRows.set(key, current);
      });
      measurementRows.forEach(({ receipt, measurement }) => {
        const source = receipt || measurement;
        const item = receipt?.item || measurement?.item;
        rows.push([
          `${work.codigo || work.id} - ${work.nome}`,
          'PUBLICA',
          competencia,
          'MEDICAO',
          `${item?.codigo || ''} - ${item?.descricao || source?.descricao || ''}`.trim(),
          formatDate(measurement?.data_medicao || receipt?.data_prevista),
          money(receipt?.valor_previsto),
          money(measurement?.valor_medido)
        ]);
      });
    } else {
      planning.recebiveis.forEach((receipt) => rows.push([
        `${work.codigo || work.id} - ${work.nome}`,
        'PRIVADA',
        competencia,
        receipt.origem_exibicao || 'CONTRATO',
        receipt.documento || receipt.descricao || '',
        formatDate(receipt.data_prevista),
        money(receipt.valor_previsto),
        ''
      ]));
    }
  }
  return rows;
}

async function buildCostsRows(user, works, competencia, deps) {
  const rows = [[
    'Obra',
    'Competencia',
    'Macro',
    'Codigo micro',
    'Item micro',
    'Quantidade',
    'Custo unitario (R$)',
    'Custo planejado (R$)'
  ]];
  for (const work of works) {
    const planning = await safePlanning(user, Number(work.id), competencia, deps);
    if (!planning) continue;
    planning.custos.forEach((cost) => rows.push([
      `${work.codigo || work.id} - ${work.nome}`,
      competencia,
      cost.item?.etapa_macro_codigo || '',
      cost.item?.codigo || '',
      cost.item?.descricao || '',
      cost.quantidade,
      money(cost.custo_unitario),
      money(cost.valor_previsto)
    ]));
  }
  return rows;
}

async function buildComparisonRows(user, works, competencia, deps) {
  const rows = [[
    'Obra',
    'Competencia',
    'Macro',
    'Codigo micro',
    'Item micro',
    'Medicao prevista (R$)',
    'Medicao aprovada (R$)',
    'Glosa (R$)',
    'Aprovacao (%)',
    'Estado'
  ]];
  for (const work of works) {
    const comparison = await safeComparison(user, Number(work.id), competencia, deps);
    if (!comparison) continue;
    (comparison.linhas_medicao || []).forEach((line) => rows.push([
      `${work.codigo || work.id} - ${work.nome}`,
      competencia,
      line.etapa_macro_codigo || '',
      line.codigo || '',
      line.descricao || '',
      money(line.previsto),
      line.tem_aprovacao ? money(line.aprovado) : '',
      line.tem_aprovacao ? money(line.glosa) : '',
      line.percentual_aprovacao ?? '',
      line.estado
    ]));
  }
  return rows;
}

async function buildRealizedRows(user, works, competencia, deps) {
  const rows = [[
    'Obra',
    'Competencia',
    'Data da baixa',
    'Solicitacao',
    'Pedido',
    'Titulo',
    'Parceiro',
    'Macro',
    'Item micro',
    'Valor (R$)',
    'Estado'
  ]];
  for (const work of works) {
    const report = await deps.listarRealizados(user, Number(work.id), competencia);
    report.items.forEach((item) => rows.push([
      `${work.codigo || work.id} - ${work.nome}`,
      competencia,
      formatDate(item.data_movimento),
      item.solicitacao?.codigo || '',
      item.pedido?.codigo || '',
      item.titulo?.codigo || '',
      item.parceiro?.nome || '',
      item.etapa_macro_codigo || '',
      item.item_micro
        ? `${item.item_micro.codigo} - ${item.item_micro.descricao}`
        : '',
      money(item.valor),
      item.estado
    ]));
  }
  return rows;
}

async function buildRequestsTitlesRows(works, competencia, deps) {
  const rows = [[
    'Obra',
    'Competencia',
    'Solicitacao',
    'Titulo',
    'Descricao',
    'Parceiro',
    'Vencimento',
    'Valor original (R$)',
    'Saldo (R$)',
    'Status'
  ]];
  const { first, nextMonth } = monthRange(competencia);
  for (const work of works) {
    const titles = await deps.TituloFinanceiro.findAll({
      where: {
        obra_id: Number(work.id),
        tipo: 'PAGAR',
        data_vencimento: { [Op.gte]: first, [Op.lt]: nextMonth }
      },
      include: [
        {
          model: deps.Solicitacao,
          as: 'solicitacao',
          required: false,
          attributes: ['id', 'codigo']
        },
        {
          model: deps.Parceiro,
          as: 'parceiro',
          required: false,
          attributes: ['id', 'nome']
        }
      ],
      order: [['data_vencimento', 'ASC'], ['id', 'ASC']]
    });
    titles.forEach((titleValue) => {
      const title = titleValue.toJSON ? titleValue.toJSON() : titleValue;
      rows.push([
        `${work.codigo || work.id} - ${work.nome}`,
        competencia,
        title.solicitacao?.codigo || '',
        title.codigo || `#${title.id}`,
        title.descricao,
        title.parceiro?.nome || '',
        formatDate(title.data_vencimento),
        money(title.valor_original),
        money(title.valor_saldo),
        title.status
      ]);
    });
  }
  return rows;
}

async function buildExecutiveRows(user, works, competencia, deps) {
  const rows = [[
    'Obra',
    'Classificacao',
    'Competencia',
    'Custo planejado (R$)',
    'Custo realizado (R$)',
    'Desvio (R$)',
    'Nao mapeado (R$)',
    'Est estouros'
  ]];
  for (const work of works) {
    const [comparison, realized] = await Promise.all([
      safeComparison(user, Number(work.id), competencia, deps),
      deps.listarRealizados(user, Number(work.id), competencia)
    ]);
    rows.push([
      `${work.codigo || work.id} - ${work.nome}`,
      work.classificacao || '',
      competencia,
      money(comparison?.resumo?.previsto),
      money(realized.resumo.realizado),
      money(realized.resumo.realizado - money(comparison?.resumo?.previsto)),
      money(realized.resumo.nao_mapeado),
      Number(comparison?.resumo?.estouros || 0)
    ]);
  }
  return rows;
}

async function buildReportRows(type, user, works, competencia, deps) {
  switch (type) {
    case 'medicao-recebiveis':
      return buildMeasurementsRows(user, works, competencia, deps);
    case 'custos-previstos':
      return buildCostsRows(user, works, competencia, deps);
    case 'comparativo':
      return buildComparisonRows(user, works, competencia, deps);
    case 'custo-realizado':
      return buildRealizedRows(user, works, competencia, deps);
    case 'solicitacoes-titulos':
      return buildRequestsTitlesRows(works, competencia, deps);
    case 'resumo-executivo':
      return buildExecutiveRows(user, works, competencia, deps);
    default:
      throw createBusinessError(400, 'CR_EXPORTACAO_TIPO_INVALIDO', 'Tipo de exportacao invalido.');
  }
}

async function gerarExportacao(user, typeValue, query = {}, overrides = {}) {
  const deps = dependencies(overrides);
  const type = normalizeType(typeValue);
  if (!REPORT_TYPES[type]) {
    throw createBusinessError(400, 'CR_EXPORTACAO_TIPO_INVALIDO', 'Tipo de exportacao invalido.');
  }
  const competencia = normalizeCompetencia(query.competencia);
  const format = String(query.formato || 'xlsx').trim().toLowerCase();
  if (!['csv', 'xlsx'].includes(format)) {
    throw createBusinessError(400, 'CR_EXPORTACAO_FORMATO_INVALIDO', 'Use o formato csv ou xlsx.');
  }
  const works = await resolveWorks(user, query.obra_id, deps);
  const rows = await buildReportRows(type, user, works, competencia, deps);
  const buffer = format === 'csv'
    ? createCsvBuffer(rows)
    : await createWorkbookBuffer([{
      name: REPORT_TYPES[type],
      rows,
      columns: rows[0].map((header) => ({ width: Math.max(14, Math.min(36, String(header).length + 4)) }))
    }]);
  const extension = format;
  return {
    buffer,
    contentType: format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `custos-recebiveis-${type}-${competencia}.${extension}`,
    rows: Math.max(0, rows.length - 1),
    obras: works.length
  };
}

module.exports = {
  REPORT_TYPES,
  createCsvBuffer,
  gerarExportacao,
  normalizeType
};
