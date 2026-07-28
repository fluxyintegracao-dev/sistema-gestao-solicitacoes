'use strict';

const { Op } = require('sequelize');
const db = require('../../../models');
const { createBusinessError } = require('./planoMicroService');
const { resolverEscopoObras } = require('../policies/obraScopePolicy');
const { prazoCompetencia } = require('./obrigacaoService');

const VALID_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;
const CONTRACT_ACTIVE_STATUSES = ['RASCUNHO', 'ATIVO', 'INADIMPLENTE', 'QUITADO'];

function dependencies(overrides = {}) {
  return {
    sequelize: db.sequelize,
    Obra: db.Obra,
    CrPlanoObra: db.CrPlanoObra,
    CrPlanoItem: db.CrPlanoItem,
    CrCompetencia: db.CrCompetencia,
    CrPrevisaoCusto: db.CrPrevisaoCusto,
    CrPrevisaoReceita: db.CrPrevisaoReceita,
    CrMedicaoConsolidada: db.CrMedicaoConsolidada,
    CrRealizado: db.CrRealizado,
    CrReabertura: db.CrReabertura,
    CrAuditoria: db.CrAuditoria,
    ContratoComercial: db.ContratoComercial,
    ContratoComercialParcela: db.ContratoComercialParcela,
    TituloFinanceiro: db.TituloFinanceiro,
    MovimentoFinanceiro: db.MovimentoFinanceiro,
    User: db.User,
    resolverEscopoObras,
    ...overrides
  };
}

function plain(value) {
  return value?.toJSON ? value.toJSON() : { ...(value || {}) };
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value) {
  return Math.round((number(value) + Number.EPSILON) * 100) / 100;
}

function positiveId(value, label = 'Identificador') {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createBusinessError(400, 'CR_INVALID_ID', `${label} invalido.`);
  }
  return parsed;
}

function normalizeCompetencia(value) {
  const normalized = String(value || '').trim();
  if (!VALID_COMPETENCIA.test(normalized)) {
    throw createBusinessError(400, 'CR_COMPETENCIA_INVALIDA', 'Competencia invalida. Use AAAA-MM.');
  }
  return normalized;
}

function monthRange(competencia) {
  const [year, month] = normalizeCompetencia(competencia).split('-').map(Number);
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { first, nextMonth };
}

function normalizeText(value, maxLength = 2000) {
  return String(value || '').trim().slice(0, maxLength);
}

function serializeObra(value) {
  const item = plain(value);
  return {
    id: Number(item.id),
    codigo: item.codigo || null,
    nome: item.nome,
    classificacao: item.classificacao || null
  };
}

function serializeItem(value) {
  const item = plain(value);
  return {
    id: Number(item.id),
    codigo: item.codigo,
    descricao: item.descricao,
    unidade: item.unidade || null,
    quantidade_orcada: number(item.quantidade),
    custo_unitario_orcado: number(item.custo_unitario),
    valor_orcado: money(item.valor_total),
    etapa_macro_codigo: item.etapa_macro_codigo || null,
    somadora: Boolean(item.somadora),
    ordem: number(item.ordem)
  };
}

function serializeCompetencia(value) {
  if (!value) return null;
  const item = plain(value);
  return {
    id: Number(item.id),
    obra_id: Number(item.obra_id),
    competencia: item.competencia,
    estado: item.estado,
    plano_versao_snapshot: item.plano_versao_snapshot == null
      ? null
      : Number(item.plano_versao_snapshot),
    total_custo_previsto: money(item.total_custo_previsto),
    total_receita_prevista: money(item.total_receita_prevista),
    finalizado_por: item.finalizado_por ? Number(item.finalizado_por) : null,
    finalizado_em: item.finalizado_em || null,
    updatedAt: item.updatedAt || null
  };
}

function serializeReabertura(value) {
  if (!value) return null;
  const item = plain(value);
  return {
    id: Number(item.id),
    competencia_id: Number(item.competencia_id),
    motivo: item.motivo,
    situacao: item.situacao,
    solicitado_por: Number(item.solicitado_por),
    solicitante: item.solicitadoPor
      ? { id: Number(item.solicitadoPor.id), nome: item.solicitadoPor.nome }
      : null,
    aprovado_por: item.aprovado_por ? Number(item.aprovado_por) : null,
    decisor: item.aprovadoPor
      ? { id: Number(item.aprovadoPor.id), nome: item.aprovadoPor.nome }
      : null,
    aprovado_em: item.aprovado_em || null,
    expira_em: item.expira_em || null,
    createdAt: item.createdAt || null
  };
}

function isLeaf(item) {
  return !Boolean(plain(item).somadora);
}

function statusComparativo(previstoValue, realizadoValue) {
  const previsto = money(previstoValue);
  const realizado = money(realizadoValue);
  if (previsto === 0 && realizado === 0) return 'NEUTRO';
  if (previsto === 0 && realizado > 0) return 'SEM_PREVISAO';
  if (previsto > 0 && realizado === 0) return 'A_REALIZAR';
  if (realizado <= previsto) return 'DENTRO';
  return 'ESTOURO';
}

async function findObra(obraId, deps, options = {}) {
  const obra = await deps.Obra.findByPk(obraId, {
    attributes: ['id', 'codigo', 'nome', 'classificacao'],
    transaction: options.transaction,
    lock: options.lock
  });
  if (!obra) throw createBusinessError(404, 'CR_OBRA_NOT_FOUND', 'Obra nao encontrada.');
  return obra;
}

async function findPublishedPlan(obraId, deps, options = {}) {
  const plan = await deps.CrPlanoObra.findOne({
    where: { obra_id: obraId, situacao: 'PUBLICADA' },
    order: [['versao', 'DESC']],
    transaction: options.transaction,
    lock: options.lock
  });
  if (!plan) {
    throw createBusinessError(
      409,
      'CR_PLANO_PUBLICADO_REQUIRED',
      'Publique uma versao da estrutura micro antes de planejar a competencia.'
    );
  }
  return plan;
}

async function findPlanItems(planId, deps, options = {}) {
  const items = await deps.CrPlanoItem.findAll({
    where: { plano_id: planId },
    order: [['ordem', 'ASC'], ['codigo', 'ASC']],
    transaction: options.transaction
  });
  return items.filter(isLeaf);
}

async function findPrivateSources(obraId, competencia, deps, options = {}) {
  const { first, nextMonth } = monthRange(competencia);
  const rows = await deps.ContratoComercialParcela.findAll({
    where: {
      data_vencimento: {
        [Op.gte]: first,
        [Op.lt]: nextMonth
      }
    },
    include: [
      {
        model: deps.ContratoComercial,
        as: 'contrato',
        attributes: ['id', 'numero', 'obra_id', 'status'],
        where: {
          obra_id: obraId,
          status: { [Op.in]: CONTRACT_ACTIVE_STATUSES }
        },
        required: true
      },
      {
        model: deps.TituloFinanceiro,
        as: 'tituloFinanceiro',
        attributes: [
          'id',
          'codigo',
          'descricao',
          'tipo',
          'status',
          'valor_original',
          'data_vencimento'
        ],
        required: false
      }
    ],
    order: [['data_vencimento', 'ASC'], ['id', 'ASC']],
    transaction: options.transaction
  });

  return rows.map((row) => {
    const item = plain(row);
    const titulo = item.tituloFinanceiro ? plain(item.tituloFinanceiro) : null;
    const contrato = plain(item.contrato);
    const linkedTitleIsReceivable = titulo && String(titulo.tipo || '').toUpperCase() === 'RECEBER';
    return {
      key: linkedTitleIsReceivable ? `titulo:${titulo.id}` : `parcela:${item.id}`,
      origem_exibicao: linkedTitleIsReceivable ? 'TITULO' : 'PARCELA_CONTRATUAL',
      contrato_parcela_id: Number(item.id),
      titulo_financeiro_id: linkedTitleIsReceivable ? Number(titulo.id) : null,
      contrato: {
        id: Number(contrato.id),
        numero: contrato.numero
      },
      descricao: linkedTitleIsReceivable
        ? titulo.descricao
        : item.descricao,
      documento: linkedTitleIsReceivable ? titulo.codigo : null,
      data_prevista: linkedTitleIsReceivable
        ? titulo.data_vencimento
        : item.data_vencimento,
      valor_previsto: money(linkedTitleIsReceivable ? titulo.valor_original : item.valor_original)
    };
  });
}

async function findCompetencia(obraId, competencia, deps, options = {}) {
  return deps.CrCompetencia.findOne({
    where: { obra_id: obraId, competencia },
    transaction: options.transaction,
    lock: options.lock
  });
}

async function getOrCreateCompetencia(obraId, competencia, deps, transaction) {
  let record = await findCompetencia(obraId, competencia, deps, {
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  if (record) return record;
  try {
    record = await deps.CrCompetencia.create(
      { obra_id: obraId, competencia, estado: 'ABERTA' },
      { transaction }
    );
  } catch (error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    record = await findCompetencia(obraId, competencia, deps, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
  }
  return record;
}

async function assertEditable(competencia, deps, transaction) {
  if (!competencia) return;
  const expired = prazoCompetencia(competencia.competencia) <= new Date();
  if (competencia.estado === 'FINALIZADA' || expired) {
    const validReopening = await deps.CrReabertura.findOne({
      where: {
        competencia_id: competencia.id,
        situacao: 'APROVADA',
        expira_em: { [Op.gt]: new Date() }
      },
      order: [['aprovado_em', 'DESC']],
      transaction,
      lock: transaction?.LOCK?.UPDATE
    });
    if (validReopening) return;
    throw createBusinessError(
      409,
      expired ? 'CR_COMPETENCIA_VENCIDA' : 'CR_COMPETENCIA_IMUTAVEL',
      expired
        ? 'O prazo da competencia venceu. Solicite e aprove uma reabertura antes de editar.'
        : 'A competencia esta finalizada. Solicite e aprove uma reabertura antes de editar.'
    );
  }
  if (competencia.estado === 'REABERTA') {
    throw createBusinessError(
      409,
      'CR_REABERTURA_EXPIRADA',
      'A janela aprovada de reabertura expirou. Solicite uma nova reabertura.'
    );
  }
}

async function audit(deps, transaction, {
  obraId,
  competenciaId = null,
  userId,
  event,
  description,
  payload = null
}) {
  await deps.CrAuditoria.create({
    obra_id: obraId,
    competencia_id: competenciaId,
    usuario_id: userId || null,
    evento: event,
    descricao: description,
    payload_json: payload,
    origem: 'web'
  }, { transaction });
}

async function assertScope(user, obraId, deps) {
  const scope = await deps.resolverEscopoObras(user);
  if (!scope.todas && !scope.obraIds.includes(obraId)) {
    throw createBusinessError(403, 'CR_OBRA_FORA_ESCOPO', 'Acesso negado para esta obra.');
  }
}

async function obterPlanejamento(user, obraIdValue, competenciaValue, overrides = {}) {
  const deps = dependencies(overrides);
  const obraId = positiveId(obraIdValue, 'Obra');
  const competenciaCode = normalizeCompetencia(competenciaValue);
  await assertScope(user, obraId, deps);
  const [obra, plan, saved] = await Promise.all([
    findObra(obraId, deps),
    findPublishedPlan(obraId, deps),
    findCompetencia(obraId, competenciaCode, deps)
  ]);
  const items = await findPlanItems(plan.id, deps);
  const [costs, receipts, measurements, reopenings, privateSources] = await Promise.all([
    saved
      ? deps.CrPrevisaoCusto.findAll({ where: { competencia_id: saved.id } })
      : [],
    saved
      ? deps.CrPrevisaoReceita.findAll({ where: { competencia_id: saved.id } })
      : [],
    saved
      ? deps.CrMedicaoConsolidada.findAll({ where: { competencia_id: saved.id } })
      : [],
    saved
      ? deps.CrReabertura.findAll({
        where: { competencia_id: saved.id },
        include: [
          { model: deps.User, as: 'solicitadoPor', attributes: ['id', 'nome'], required: false },
          { model: deps.User, as: 'aprovadoPor', attributes: ['id', 'nome'], required: false }
        ],
        order: [['createdAt', 'DESC']]
      })
      : [],
    String(obra.classificacao).toUpperCase() === 'PRIVADA'
      ? findPrivateSources(obraId, competenciaCode, deps)
      : []
  ]);

  const costByItem = new Map(costs.map((value) => [Number(value.plano_item_id), plain(value)]));
  const receiptByItem = new Map(receipts
    .filter((value) => value.plano_item_id)
    .map((value) => [Number(value.plano_item_id), plain(value)]));
  const receiptByPrivateSource = new Map(receipts.map((value) => {
    const item = plain(value);
    const key = item.titulo_financeiro_id
      ? `titulo:${item.titulo_financeiro_id}`
      : `parcela:${item.contrato_parcela_id}`;
    return [key, item];
  }));
  const measurementByItem = new Map(
    measurements.map((value) => [Number(value.plano_item_id), plain(value)])
  );
  const validReopening = reopenings.some((item) => (
    item.situacao === 'APROVADA' && item.expira_em && new Date(item.expira_em) > new Date()
  ));
  const expired = prazoCompetencia(competenciaCode) <= new Date();

  const publicReceipts = items.map((value) => {
    const item = serializeItem(value);
    const savedReceipt = receiptByItem.get(item.id);
    return {
      plano_item_id: item.id,
      item,
      quantidade_prevista: number(savedReceipt?.quantidade_prevista),
      valor_previsto: money(savedReceipt?.valor_previsto),
      data_prevista: savedReceipt?.data_prevista || null
    };
  });

  return {
    obra: serializeObra(obra),
    plano: {
      id: Number(plan.id),
      versao: Number(plan.versao),
      total_micro: money(plan.total_micro)
    },
    competencia: saved
      ? serializeCompetencia(saved)
      : {
        id: null,
        obra_id: obraId,
        competencia: competenciaCode,
        estado: 'ABERTA',
        plano_versao_snapshot: null,
        total_custo_previsto: 0,
        total_receita_prevista: 0,
        finalizado_por: null,
        finalizado_em: null
      },
    custos: items.map((value) => {
      const item = serializeItem(value);
      const savedCost = costByItem.get(item.id);
      return {
        plano_item_id: item.id,
        item,
        quantidade: number(savedCost?.quantidade),
        custo_unitario: savedCost
          ? number(savedCost.custo_unitario)
          : item.custo_unitario_orcado,
        valor_previsto: money(savedCost?.valor_previsto),
        parceiro_id: savedCost?.parceiro_id ? Number(savedCost.parceiro_id) : null
      };
    }),
    recebiveis: String(obra.classificacao).toUpperCase() === 'PUBLICA'
      ? publicReceipts
      : privateSources.map((source) => ({
        ...source,
        confirmado: receiptByPrivateSource.has(source.key),
        valor_previsto: money(
          receiptByPrivateSource.get(source.key)?.valor_previsto ?? source.valor_previsto
        )
      })),
    medicoes: String(obra.classificacao).toUpperCase() === 'PUBLICA'
      ? items.map((value) => {
        const item = serializeItem(value);
        const savedMeasurement = measurementByItem.get(item.id);
        return {
          plano_item_id: item.id,
          item,
          quantidade_medida: number(savedMeasurement?.quantidade_medida),
          valor_medido: money(savedMeasurement?.valor_medido),
          data_medicao: savedMeasurement?.data_medicao || null,
          numero_medicao: savedMeasurement?.numero_medicao || null
        };
      })
      : [],
    reaberturas: reopenings.map(serializeReabertura),
    regras: {
      exige_medicao: String(obra.classificacao).toUpperCase() === 'PUBLICA',
      recebivel_origem: String(obra.classificacao).toUpperCase() === 'PUBLICA'
        ? 'MEDICAO'
        : 'CONTRATO',
      vencida: expired,
      exige_reabertura: Boolean((
        saved?.estado === 'FINALIZADA'
        || expired
        || saved?.estado === 'REABERTA'
      ) && !validReopening),
      editavel: ((!saved && !expired) || (
        saved
        &&
        saved.estado !== 'FINALIZADA'
        && saved.estado !== 'REABERTA'
        && !expired
      )) || validReopening
    }
  };
}

function validateCostRows(rows, allowedItems) {
  if (!Array.isArray(rows)) {
    throw createBusinessError(400, 'CR_CUSTOS_INVALIDOS', 'Informe a lista de custos previstos.');
  }
  const seen = new Set();
  return rows.map((row, index) => {
    const itemId = positiveId(row?.plano_item_id, `Item da linha ${index + 1}`);
    const planItem = allowedItems.get(itemId);
    if (!planItem || seen.has(itemId)) {
      throw createBusinessError(
        400,
        'CR_CUSTO_ITEM_INVALIDO',
        `Item invalido ou duplicado na linha ${index + 1}.`
      );
    }
    seen.add(itemId);
    const quantidade = number(row.quantidade, NaN);
    const unitCost = number(row.custo_unitario, NaN);
    if (!Number.isFinite(quantidade) || quantidade < 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      throw createBusinessError(
        400,
        'CR_CUSTO_VALOR_INVALIDO',
        `Quantidade e custo unitario devem ser positivos na linha ${index + 1}.`
      );
    }
    return {
      plano_item_id: itemId,
      etapa_macro_codigo: planItem.etapa_macro_codigo || null,
      quantidade,
      custo_unitario: unitCost,
      valor_previsto: money(quantidade * unitCost),
      parceiro_id: row.parceiro_id ? positiveId(row.parceiro_id, 'Parceiro') : null
    };
  });
}

async function salvarCustos(user, obraIdValue, competenciaValue, payload = {}, overrides = {}) {
  const deps = dependencies(overrides);
  const obraId = positiveId(obraIdValue, 'Obra');
  const competenciaCode = normalizeCompetencia(competenciaValue);
  await assertScope(user, obraId, deps);

  return deps.sequelize.transaction(async (transaction) => {
    await findObra(obraId, deps, { transaction, lock: transaction.LOCK.UPDATE });
    const plan = await findPublishedPlan(obraId, deps, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    const items = await findPlanItems(plan.id, deps, { transaction });
    const allowed = new Map(items.map((item) => [Number(item.id), plain(item)]));
    const rows = validateCostRows(payload.itens, allowed);
    const competencia = await getOrCreateCompetencia(obraId, competenciaCode, deps, transaction);
    await assertEditable(competencia, deps, transaction);

    await deps.CrPrevisaoCusto.destroy({
      where: { competencia_id: competencia.id },
      transaction
    });
    if (rows.length) {
      await deps.CrPrevisaoCusto.bulkCreate(
        rows.map((row) => ({ ...row, competencia_id: competencia.id })),
        { transaction }
      );
    }
    const total = money(rows.reduce((sum, row) => sum + row.valor_previsto, 0));
    await competencia.update({
      estado: competencia.estado === 'REABERTA' ? 'REABERTA' : 'EM_PREENCHIMENTO',
      total_custo_previsto: total
    }, { transaction });
    await audit(deps, transaction, {
      obraId,
      competenciaId: competencia.id,
      userId: user?.id,
      event: 'CR_PLANEJAMENTO_CUSTOS_SALVO',
      description: 'Custos previstos da competencia atualizados.',
      payload: { competencia: competenciaCode, quantidade_itens: rows.length, total }
    });
    return { competencia: serializeCompetencia(competencia), total };
  });
}

function validatePublicReceiptRows(rows, allowedItems) {
  if (!Array.isArray(rows)) {
    throw createBusinessError(400, 'CR_RECEBIVEIS_INVALIDOS', 'Informe a lista de recebiveis.');
  }
  const seen = new Set();
  return rows.map((row, index) => {
    const itemId = positiveId(row?.plano_item_id, `Item da linha ${index + 1}`);
    const planItem = allowedItems.get(itemId);
    if (!planItem || seen.has(itemId)) {
      throw createBusinessError(
        400,
        'CR_RECEBIVEL_ITEM_INVALIDO',
        `Item invalido ou duplicado na linha ${index + 1}.`
      );
    }
    seen.add(itemId);
    const quantity = number(row.quantidade_prevista, NaN);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw createBusinessError(
        400,
        'CR_RECEBIVEL_VALOR_INVALIDO',
        `Quantidade prevista invalida na linha ${index + 1}.`
      );
    }
    return {
      origem: 'MEDICAO',
      plano_item_id: itemId,
      contrato_parcela_id: null,
      titulo_financeiro_id: null,
      quantidade_prevista: quantity,
      valor_previsto: money(quantity * number(planItem.custo_unitario)),
      data_prevista: row.data_prevista || null
    };
  });
}

async function buildPrivateReceiptRows(obraId, competencia, rows, deps, transaction) {
  if (!Array.isArray(rows)) {
    throw createBusinessError(400, 'CR_RECEBIVEIS_INVALIDOS', 'Informe as origens confirmadas.');
  }
  const sources = await findPrivateSources(obraId, competencia, deps, { transaction });
  const allowed = new Map(sources.map((source) => [source.key, source]));
  const seen = new Set();
  return rows.map((row, index) => {
    const sourceKey = normalizeText(row?.key, 100);
    const source = allowed.get(sourceKey);
    if (!source || seen.has(sourceKey)) {
      throw createBusinessError(
        400,
        'CR_RECEBIVEL_ORIGEM_INVALIDA',
        `Origem contratual invalida ou duplicada na linha ${index + 1}.`
      );
    }
    seen.add(sourceKey);
    return {
      origem: 'CONTRATO',
      plano_item_id: null,
      contrato_parcela_id: source.contrato_parcela_id,
      titulo_financeiro_id: source.titulo_financeiro_id,
      quantidade_prevista: null,
      valor_previsto: source.valor_previsto,
      data_prevista: source.data_prevista
    };
  });
}

async function salvarRecebiveis(user, obraIdValue, competenciaValue, payload = {}, overrides = {}) {
  const deps = dependencies(overrides);
  const obraId = positiveId(obraIdValue, 'Obra');
  const competenciaCode = normalizeCompetencia(competenciaValue);
  await assertScope(user, obraId, deps);

  return deps.sequelize.transaction(async (transaction) => {
    const obra = await findObra(obraId, deps, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    const plan = await findPublishedPlan(obraId, deps, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    const items = await findPlanItems(plan.id, deps, { transaction });
    const allowed = new Map(items.map((item) => [Number(item.id), plain(item)]));
    const isPublic = String(obra.classificacao).toUpperCase() === 'PUBLICA';
    const rows = isPublic
      ? validatePublicReceiptRows(payload.itens, allowed)
      : await buildPrivateReceiptRows(
        obraId,
        competenciaCode,
        payload.itens,
        deps,
        transaction
      );
    const competencia = await getOrCreateCompetencia(obraId, competenciaCode, deps, transaction);
    await assertEditable(competencia, deps, transaction);

    await deps.CrPrevisaoReceita.destroy({
      where: { competencia_id: competencia.id },
      transaction
    });
    if (rows.length) {
      await deps.CrPrevisaoReceita.bulkCreate(
        rows.map((row) => ({ ...row, competencia_id: competencia.id })),
        { transaction, validate: true }
      );
    }
    const total = money(rows.reduce((sum, row) => sum + row.valor_previsto, 0));
    await competencia.update({
      estado: competencia.estado === 'REABERTA' ? 'REABERTA' : 'EM_PREENCHIMENTO',
      total_receita_prevista: total
    }, { transaction });
    await audit(deps, transaction, {
      obraId,
      competenciaId: competencia.id,
      userId: user?.id,
      event: 'CR_PLANEJAMENTO_RECEBIVEIS_SALVO',
      description: 'Recebiveis previstos da competencia atualizados.',
      payload: {
        competencia: competenciaCode,
        classificacao_obra: obra.classificacao,
        quantidade_itens: rows.length,
        total
      }
    });
    return { competencia: serializeCompetencia(competencia), total };
  });
}

async function finalizarCompetencia(
  user,
  obraIdValue,
  competenciaValue,
  payload = {},
  idempotencyKey = null,
  overrides = {}
) {
  const deps = dependencies(overrides);
  const obraId = positiveId(obraIdValue, 'Obra');
  const competenciaCode = normalizeCompetencia(competenciaValue);
  const key = normalizeText(idempotencyKey, 180);
  if (!key) {
    throw createBusinessError(
      400,
      'CR_IDEMPOTENCY_REQUIRED',
      'Idempotency-Key e obrigatoria para finalizar a competencia.'
    );
  }
  await assertScope(user, obraId, deps);

  return deps.sequelize.transaction(async (transaction) => {
    await findObra(obraId, deps, { transaction, lock: transaction.LOCK.UPDATE });
    const plan = await findPublishedPlan(obraId, deps, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    const competencia = await getOrCreateCompetencia(obraId, competenciaCode, deps, transaction);
    if (competencia.estado === 'FINALIZADA') {
      return { idempotente: true, competencia: serializeCompetencia(competencia) };
    }
    await assertEditable(competencia, deps, transaction);
    const [costs, receipts] = await Promise.all([
      deps.CrPrevisaoCusto.findAll({
        where: { competencia_id: competencia.id },
        transaction,
        lock: transaction.LOCK.UPDATE
      }),
      deps.CrPrevisaoReceita.findAll({
        where: { competencia_id: competencia.id },
        transaction,
        lock: transaction.LOCK.UPDATE
      })
    ]);
    const totalCosts = money(costs.reduce((sum, row) => sum + number(row.valor_previsto), 0));
    const totalReceipts = money(
      receipts.reduce((sum, row) => sum + number(row.valor_previsto), 0)
    );
    if (totalCosts === 0 && !normalizeText(payload.justificativa_sem_custos)) {
      throw createBusinessError(
        422,
        'CR_JUSTIFICATIVA_CUSTOS_REQUIRED',
        'Informe a justificativa para finalizar sem custos previstos.'
      );
    }
    if (totalReceipts === 0 && !normalizeText(payload.justificativa_sem_receitas)) {
      throw createBusinessError(
        422,
        'CR_JUSTIFICATIVA_RECEITAS_REQUIRED',
        'Informe a justificativa para finalizar sem recebiveis previstos.'
      );
    }
    await competencia.update({
      estado: 'FINALIZADA',
      plano_versao_snapshot: competencia.plano_versao_snapshot || plan.versao,
      finalizado_por: user?.id || null,
      finalizado_em: new Date(),
      total_custo_previsto: totalCosts,
      total_receita_prevista: totalReceipts
    }, { transaction });
    await audit(deps, transaction, {
      obraId,
      competenciaId: competencia.id,
      userId: user?.id,
      event: 'CR_COMPETENCIA_FINALIZADA',
      description: 'Competencia finalizada e congelada para edicao.',
      payload: {
        competencia: competenciaCode,
        idempotency_key: key,
        plano_versao_snapshot: Number(competencia.plano_versao_snapshot),
        total_custo_previsto: totalCosts,
        total_receita_prevista: totalReceipts,
        justificativa_sem_custos: normalizeText(payload.justificativa_sem_custos) || null,
        justificativa_sem_receitas: normalizeText(payload.justificativa_sem_receitas) || null
      }
    });
    return { idempotente: false, competencia: serializeCompetencia(competencia) };
  });
}

async function consolidarMedicao(user, obraIdValue, competenciaValue, payload = {}, overrides = {}) {
  const deps = dependencies(overrides);
  const obraId = positiveId(obraIdValue, 'Obra');
  const competenciaCode = normalizeCompetencia(competenciaValue);
  await assertScope(user, obraId, deps);

  return deps.sequelize.transaction(async (transaction) => {
    const obra = await findObra(obraId, deps, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (String(obra.classificacao).toUpperCase() !== 'PUBLICA') {
      throw createBusinessError(
        409,
        'CR_MEDICAO_APENAS_OBRA_PUBLICA',
        'Obras privadas usam recebiveis contratuais e nao possuem medicao.'
      );
    }
    const plan = await findPublishedPlan(obraId, deps, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    const items = await findPlanItems(plan.id, deps, { transaction });
    const allowed = new Map(items.map((item) => [Number(item.id), plain(item)]));
    if (!Array.isArray(payload.itens)) {
      throw createBusinessError(400, 'CR_MEDICAO_INVALIDA', 'Informe os itens da medicao.');
    }
    const seen = new Set();
    const rows = payload.itens.map((row, index) => {
      const itemId = positiveId(row?.plano_item_id, `Item da linha ${index + 1}`);
      const item = allowed.get(itemId);
      const quantity = number(row.quantidade_medida, NaN);
      if (!item || seen.has(itemId) || !Number.isFinite(quantity) || quantity < 0) {
        throw createBusinessError(
          400,
          'CR_MEDICAO_ITEM_INVALIDO',
          `Item ou quantidade invalida na linha ${index + 1}.`
        );
      }
      seen.add(itemId);
      return {
        plano_item_id: itemId,
        quantidade_medida: quantity,
        valor_medido: money(quantity * number(item.custo_unitario)),
        data_medicao: row.data_medicao || null,
        numero_medicao: normalizeText(row.numero_medicao, 80) || null,
        registrado_por: user?.id
      };
    });
    const competencia = await getOrCreateCompetencia(obraId, competenciaCode, deps, transaction);
    for (const row of rows) {
      const existing = await deps.CrMedicaoConsolidada.findOne({
        where: {
          competencia_id: competencia.id,
          plano_item_id: row.plano_item_id
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (existing) {
        await existing.update(row, { transaction });
      } else {
        await deps.CrMedicaoConsolidada.create({
          ...row,
          competencia_id: competencia.id
        }, { transaction });
      }
    }
    await audit(deps, transaction, {
      obraId,
      competenciaId: competencia.id,
      userId: user?.id,
      event: 'CR_MEDICAO_CONSOLIDADA',
      description: 'Medicao da competencia consolidada.',
      payload: {
        competencia: competenciaCode,
        quantidade_itens: rows.length,
        valor_total: money(rows.reduce((sum, row) => sum + row.valor_medido, 0))
      }
    });
    return {
      competencia: serializeCompetencia(competencia),
      quantidade_itens: rows.length,
      valor_total: money(rows.reduce((sum, row) => sum + row.valor_medido, 0))
    };
  });
}

async function buildComparison(obraId, competenciaCode, deps) {
  const plan = await findPublishedPlan(obraId, deps);
  const items = await findPlanItems(plan.id, deps);
  const competencia = await findCompetencia(obraId, competenciaCode, deps);
  const [costs, actuals] = await Promise.all([
    competencia
      ? deps.CrPrevisaoCusto.findAll({ where: { competencia_id: competencia.id } })
      : [],
    competencia
      ? deps.CrRealizado.findAll({
        where: {
          competencia_id: competencia.id,
          valor: { [Op.ne]: 0 },
          estado: { [Op.in]: ['COMPROMETIDO', 'INCORRIDO', 'BAIXA_ATIVA', 'NAO_MAPEADO'] }
        },
        include: [{
          model: deps.MovimentoFinanceiro,
          as: 'movimentoFinanceiro',
          attributes: [],
          required: true,
          where: { status: 'ATIVO' }
        }]
      })
      : []
  ]);
  const itemById = new Map(items.map((item) => [Number(item.id), serializeItem(item)]));
  const rows = new Map();
  costs.forEach((cost) => {
    const item = itemById.get(Number(cost.plano_item_id));
    if (!item) return;
    rows.set(item.id, {
      key: `item:${item.id}`,
      plano_item_id: item.id,
      etapa_macro_codigo: item.etapa_macro_codigo,
      codigo: item.codigo,
      descricao: item.descricao,
      previsto: money(cost.valor_previsto),
      realizado: 0
    });
  });
  actuals.forEach((actual) => {
    const itemId = actual.plano_item_id ? Number(actual.plano_item_id) : null;
    const item = itemId ? itemById.get(itemId) : null;
    const key = item ? `item:${item.id}` : `nao-mapeado:${actual.etapa_macro_codigo || 'sem-macro'}`;
    const current = rows.get(key) || {
      key,
      plano_item_id: item?.id || null,
      etapa_macro_codigo: item?.etapa_macro_codigo || actual.etapa_macro_codigo || null,
      codigo: item?.codigo || '-',
      descricao: item?.descricao || 'Movimento nao mapeado',
      previsto: 0,
      realizado: 0
    };
    current.realizado = money(current.realizado + number(actual.valor));
    rows.set(key, current);
  });
  const result = [...rows.values()].map((row) => {
    const delta = money(row.realizado - row.previsto);
    return {
      ...row,
      delta,
      percentual_execucao: row.previsto > 0
        ? Math.round((row.realizado / row.previsto) * 10000) / 100
        : null,
      estado: statusComparativo(row.previsto, row.realizado)
    };
  }).sort((a, b) => (
    String(a.etapa_macro_codigo || '').localeCompare(String(b.etapa_macro_codigo || ''))
    || String(a.codigo).localeCompare(String(b.codigo))
  ));
  return {
    competencia: serializeCompetencia(competencia),
    plano: { id: Number(plan.id), versao: Number(plan.versao) },
    linhas: result,
    resumo: {
      previsto: money(result.reduce((sum, row) => sum + row.previsto, 0)),
      realizado: money(result.reduce((sum, row) => sum + row.realizado, 0)),
      estouros: result.filter((row) => row.estado === 'ESTOURO').length,
      sem_previsao: result.filter((row) => row.estado === 'SEM_PREVISAO').length
    }
  };
}

async function obterComparativo(user, obraIdValue, competenciaValue, overrides = {}) {
  const deps = dependencies(overrides);
  const obraId = positiveId(obraIdValue, 'Obra');
  const competenciaCode = normalizeCompetencia(competenciaValue);
  await assertScope(user, obraId, deps);
  const obra = await findObra(obraId, deps);
  return {
    obra: serializeObra(obra),
    ...(await buildComparison(obraId, competenciaCode, deps))
  };
}

async function obterDashboard(user, competenciaValue, overrides = {}) {
  const deps = dependencies(overrides);
  const competenciaCode = normalizeCompetencia(competenciaValue);
  const scope = await deps.resolverEscopoObras(user);
  if (!scope.todas && scope.obraIds.length === 0) {
    return {
      competencia: competenciaCode,
      cards: { custo_previsto: 0, custo_realizado: 0 },
      macros: [],
      etapas: [],
      obras: []
    };
  }
  const obraWhere = { ativo: true, tipo_centro_custo: 'OBRA' };
  if (!scope.todas) obraWhere.id = { [Op.in]: scope.obraIds };
  const obras = await deps.Obra.findAll({
    where: obraWhere,
    attributes: ['id', 'codigo', 'nome', 'classificacao'],
    order: [['nome', 'ASC']]
  });
  const summaries = [];
  for (const obra of obras) {
    try {
      const comparison = await buildComparison(Number(obra.id), competenciaCode, deps);
      summaries.push({ obra: serializeObra(obra), comparison });
    } catch (error) {
      if (error?.code !== 'CR_PLANO_PUBLICADO_REQUIRED') throw error;
      summaries.push({
        obra: serializeObra(obra),
        comparison: {
          competencia: null,
          linhas: [],
          resumo: { previsto: 0, realizado: 0, estouros: 0, sem_previsao: 0 }
        }
      });
    }
  }
  const macroMap = new Map();
  summaries.forEach(({ comparison }) => {
    comparison.linhas.forEach((line) => {
      const key = line.etapa_macro_codigo || 'SEM_MACRO';
      const current = macroMap.get(key) || { codigo: key, previsto: 0, realizado: 0 };
      current.previsto = money(current.previsto + line.previsto);
      current.realizado = money(current.realizado + line.realizado);
      macroMap.set(key, current);
    });
  });
  const macros = [...macroMap.values()].map((row) => ({
    ...row,
    delta: money(row.realizado - row.previsto),
    percentual_execucao: row.previsto > 0
      ? Math.round((row.realizado / row.previsto) * 10000) / 100
      : null,
    estado: statusComparativo(row.previsto, row.realizado)
  }));
  return {
    competencia: competenciaCode,
    cards: {
      custo_previsto: money(macros.reduce((sum, row) => sum + row.previsto, 0)),
      custo_realizado: money(macros.reduce((sum, row) => sum + row.realizado, 0))
    },
    macros,
    etapas: summaries.map(({ obra, comparison }) => ({
      obra,
      estado_competencia: comparison.competencia?.estado || 'NAO_INICIADA',
      previsto: comparison.resumo.previsto,
      realizado: comparison.resumo.realizado,
      estouros: comparison.resumo.estouros,
      sem_previsao: comparison.resumo.sem_previsao
    })),
    obras: summaries.map(({ obra }) => obra)
  };
}

async function resolverObraIdPorCompetencia(competenciaIdValue, overrides = {}) {
  const deps = dependencies(overrides);
  const id = positiveId(competenciaIdValue, 'Competencia');
  const record = await deps.CrCompetencia.findByPk(id, { attributes: ['obra_id'] });
  return record ? Number(record.obra_id) : null;
}

async function resolverObraIdPorReabertura(reaberturaIdValue, overrides = {}) {
  const deps = dependencies(overrides);
  const id = positiveId(reaberturaIdValue, 'Reabertura');
  const record = await deps.CrReabertura.findByPk(id, {
    include: [{
      model: deps.CrCompetencia,
      as: 'competencia',
      attributes: ['obra_id'],
      required: true
    }]
  });
  return record?.competencia ? Number(record.competencia.obra_id) : null;
}

async function solicitarReabertura(user, competenciaIdValue, payload = {}, overrides = {}) {
  const deps = dependencies(overrides);
  const competenciaId = positiveId(competenciaIdValue, 'Competencia');
  const motivo = normalizeText(payload.motivo);
  if (motivo.length < 10) {
    throw createBusinessError(
      422,
      'CR_REABERTURA_MOTIVO_REQUIRED',
      'Informe um motivo com pelo menos 10 caracteres.'
    );
  }
  const obraId = await resolverObraIdPorCompetencia(competenciaId, overrides);
  if (!obraId) throw createBusinessError(404, 'CR_COMPETENCIA_NOT_FOUND', 'Competencia nao encontrada.');
  await assertScope(user, obraId, deps);

  return deps.sequelize.transaction(async (transaction) => {
    const competencia = await deps.CrCompetencia.findByPk(competenciaId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    const expired = competencia && prazoCompetencia(competencia.competencia) <= new Date();
    if (!competencia || (competencia.estado !== 'FINALIZADA' && !expired)) {
      throw createBusinessError(
        409,
        'CR_REABERTURA_ESTADO_INVALIDO',
        'Somente competencias finalizadas ou vencidas podem solicitar reabertura.'
      );
    }
    const existing = await deps.CrReabertura.findOne({
      where: { competencia_id: competenciaId, situacao: 'SOLICITADA' },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (existing) return { idempotente: true, reabertura: serializeReabertura(existing) };
    const record = await deps.CrReabertura.create({
      competencia_id: competenciaId,
      solicitado_por: user?.id,
      motivo,
      situacao: 'SOLICITADA'
    }, { transaction });
    await audit(deps, transaction, {
      obraId,
      competenciaId,
      userId: user?.id,
      event: 'CR_REABERTURA_SOLICITADA',
      description: 'Reabertura de competencia solicitada.',
      payload: { motivo }
    });
    return { idempotente: false, reabertura: serializeReabertura(record) };
  });
}

async function solicitarReaberturaPorObraCompetencia(
  user,
  obraIdValue,
  competenciaValue,
  payload = {},
  overrides = {}
) {
  const deps = dependencies(overrides);
  const obraId = positiveId(obraIdValue, 'Obra');
  const competenciaCode = normalizeCompetencia(competenciaValue);
  await assertScope(user, obraId, deps);
  const competencia = await deps.sequelize.transaction(async (transaction) => {
    await findObra(obraId, deps, { transaction, lock: transaction.LOCK.UPDATE });
    await findPublishedPlan(obraId, deps, { transaction, lock: transaction.LOCK.UPDATE });
    return getOrCreateCompetencia(obraId, competenciaCode, deps, transaction);
  });
  return solicitarReabertura(user, competencia.id, payload, overrides);
}

async function decidirReabertura(user, reaberturaIdValue, payload = {}, overrides = {}) {
  const deps = dependencies(overrides);
  const reaberturaId = positiveId(reaberturaIdValue, 'Reabertura');
  const decisao = String(payload.decisao || '').trim().toUpperCase();
  if (!['APROVADA', 'NEGADA'].includes(decisao)) {
    throw createBusinessError(400, 'CR_REABERTURA_DECISAO_INVALIDA', 'Decisao invalida.');
  }
  const expiraEm = decisao === 'APROVADA' ? new Date(payload.expira_em) : null;
  if (decisao === 'APROVADA' && (!payload.expira_em || Number.isNaN(expiraEm.getTime()) || expiraEm <= new Date())) {
    throw createBusinessError(
      422,
      'CR_REABERTURA_EXPIRACAO_INVALIDA',
      'Informe uma data futura para o encerramento da reabertura.'
    );
  }
  const obraId = await resolverObraIdPorReabertura(reaberturaId, overrides);
  if (!obraId) throw createBusinessError(404, 'CR_REABERTURA_NOT_FOUND', 'Reabertura nao encontrada.');
  await assertScope(user, obraId, deps);

  return deps.sequelize.transaction(async (transaction) => {
    const record = await deps.CrReabertura.findByPk(reaberturaId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!record) throw createBusinessError(404, 'CR_REABERTURA_NOT_FOUND', 'Reabertura nao encontrada.');
    if (record.situacao !== 'SOLICITADA') {
      return { idempotente: true, reabertura: serializeReabertura(record) };
    }
    const competencia = await deps.CrCompetencia.findByPk(record.competencia_id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    await record.update({
      situacao: decisao,
      aprovado_por: user?.id,
      aprovado_em: new Date(),
      expira_em: expiraEm
    }, { transaction });
    if (decisao === 'APROVADA') {
      await competencia.update({ estado: 'REABERTA' }, { transaction });
    }
    await audit(deps, transaction, {
      obraId,
      competenciaId: competencia.id,
      userId: user?.id,
      event: decisao === 'APROVADA' ? 'CR_REABERTURA_APROVADA' : 'CR_REABERTURA_NEGADA',
      description: decisao === 'APROVADA'
        ? 'Janela temporaria de reabertura aprovada.'
        : 'Solicitacao de reabertura negada.',
      payload: {
        reabertura_id: reaberturaId,
        expira_em: expiraEm,
        observacao: normalizeText(payload.observacao) || null
      }
    });
    return { idempotente: false, reabertura: serializeReabertura(record) };
  });
}

module.exports = {
  CONTRACT_ACTIVE_STATUSES,
  consolidarMedicao,
  decidirReabertura,
  findPrivateSources,
  finalizarCompetencia,
  monthRange,
  normalizeCompetencia,
  obterComparativo,
  obterDashboard,
  obterPlanejamento,
  resolverObraIdPorCompetencia,
  resolverObraIdPorReabertura,
  salvarCustos,
  salvarRecebiveis,
  solicitarReabertura,
  solicitarReaberturaPorObraCompetencia,
  statusComparativo
};
