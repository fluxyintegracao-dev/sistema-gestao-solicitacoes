const crypto = require('crypto');
const {
  Sequelize,
  sequelize,
  FinanceiroDdaBoleto,
  FinanceiroDdaEvento,
  FinanceiroDdaSincronizacao,
  TituloFinanceiro,
  Parceiro,
  EmpresaGrupo,
  PaymentAccount,
  User
} = require('../models');

const { Op } = Sequelize;
const STATUS_ATIVOS_TITULO = ['ABERTO', 'PARCIAL', 'PENDENTE'];

function createHttpError(statusCode, message, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function documentFingerprint(documento = {}) {
  const provider = normalizeText(documento.provider || 'BB').toUpperCase();
  const externalId = normalizeText(documento.provider_document_id);
  if (externalId) return sha256(`${provider}|${externalId}`);
  return sha256([
    provider,
    digits(documento.codigo_barras || documento.linha_digitavel),
    digits(documento.beneficiario_documento),
    documento.data_vencimento || '',
    money(documento.valor_atual ?? documento.valor_original).toFixed(2)
  ].join('|'));
}

function exactIdentifiers(documento = {}) {
  return [digits(documento.codigo_barras), digits(documento.linha_digitavel)].filter(Boolean);
}

function titleInclude() {
  return [
    { model: Parceiro, as: 'parceiro', attributes: ['id', 'nome', 'cpf_cnpj'] },
    { model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'codigo', 'nome', 'razao_social'] }
  ];
}

function boletoInclude({ detail = false } = {}) {
  const includes = [
    { model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'codigo', 'nome', 'razao_social'] },
    { model: PaymentAccount, as: 'paymentAccount', attributes: ['id', 'apelido', 'banco_codigo', 'agencia', 'conta'] },
    { model: TituloFinanceiro, as: 'titulo', include: titleInclude() },
    { model: TituloFinanceiro, as: 'tituloSugerido', include: titleInclude() }
  ];
  if (detail) {
    includes.push({
      model: FinanceiroDdaEvento,
      as: 'eventos',
      separate: true,
      order: [['createdAt', 'DESC']]
    });
  }
  return includes;
}

async function recordEvent({ boletoId = null, sincronizacaoId = null, tipo, anterior = null, novo = null, usuarioId = null, detalhe = null, dedupeKey = null, transaction = null }) {
  const key = dedupeKey || sha256(`${tipo}|${boletoId || ''}|${sincronizacaoId || ''}|${usuarioId || ''}|${Date.now()}|${crypto.randomUUID()}`);
  return FinanceiroDdaEvento.create({
    boleto_id: boletoId,
    sincronizacao_id: sincronizacaoId,
    tipo_evento: tipo,
    status_anterior: anterior,
    status_novo: novo,
    usuario_id: usuarioId,
    detalhe_json: detalhe ? JSON.stringify(detalhe) : null,
    dedupe_key: key.slice(0, 120)
  }, { transaction });
}

async function titleCandidates(documento, { transaction = null, limit = 20 } = {}) {
  const identifiers = exactIdentifiers(documento);
  const identifierWhere = identifiers.length
    ? {
        [Op.or]: identifiers.flatMap(value => [
          sequelize.where(sequelize.fn('REPLACE', sequelize.col('linha_digitavel'), ' ', ''), value),
          sequelize.where(sequelize.fn('REPLACE', sequelize.col('codigo_barras'), ' ', ''), value)
        ])
      }
    : null;

  if (identifierWhere) {
    const byIdentifier = await TituloFinanceiro.findAll({
      where: {
        tipo: 'PAGAR',
        status: { [Op.in]: STATUS_ATIVOS_TITULO },
        ...identifierWhere
      },
      include: titleInclude(),
      limit,
      order: [['data_vencimento', 'ASC'], ['id', 'ASC']],
      transaction
    });
    if (byIdentifier.length) return { source: 'IDENTIFICADOR', items: byIdentifier };
  }

  const documentoBeneficiario = digits(documento.beneficiario_documento);
  if (!documentoBeneficiario || !documento.data_vencimento) return { source: 'SEM_CHAVE', items: [] };

  const where = {
    tipo: 'PAGAR',
    status: { [Op.in]: STATUS_ATIVOS_TITULO },
    data_vencimento: documento.data_vencimento,
    valor_saldo: money(documento.valor_atual)
  };
  if (documento.empresa_id) where.empresa_id = documento.empresa_id;

  const items = await TituloFinanceiro.findAll({
    where,
    include: [{
      model: Parceiro,
      as: 'parceiro',
      required: true,
      where: sequelize.where(
        sequelize.fn('REPLACE', sequelize.fn('REPLACE', sequelize.fn('REPLACE', sequelize.col('parceiro.cpf_cnpj'), '.', ''), '/', ''), '-', ''),
        documentoBeneficiario
      ),
      attributes: ['id', 'nome', 'cpf_cnpj']
    }, { model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'codigo', 'nome', 'razao_social'] }],
    limit,
    order: [['id', 'ASC']],
    transaction
  });
  return { source: 'DOCUMENTO_VALOR_VENCIMENTO', items };
}

async function resolveMatch(documento, options = {}) {
  const result = await titleCandidates(documento, options);
  if (result.items.length === 1) {
    const title = result.items[0];
    const valueOk = money(title.valor_saldo) === money(documento.valor_atual);
    const dueDateOk = String(title.data_vencimento) === String(documento.data_vencimento);
    if (result.source === 'IDENTIFICADOR' && (!valueOk || !dueDateOk)) {
      return { status: 'DIVERGENTE', titulo_sugerido_id: title.id, candidates: result.items, source: result.source };
    }
    return { status: 'MATCH_EXATO', titulo_sugerido_id: title.id, candidates: result.items, source: result.source };
  }
  if (result.items.length > 1) {
    return { status: 'AMBIGUO', titulo_sugerido_id: null, candidates: result.items, source: result.source };
  }
  return { status: 'SEM_TITULO', titulo_sugerido_id: null, candidates: [], source: result.source };
}

function normalizeProviderDocument(raw = {}, defaults = {}) {
  const provider = normalizeText(raw.provider || defaults.provider || 'BB').toUpperCase();
  const providerDocumentId = normalizeText(raw.provider_document_id || raw.id);
  const value = money(raw.valor_atual ?? raw.valor_original);
  if (!providerDocumentId) throw createHttpError(422, 'Documento DDA sem identificador do provider.');
  if (!raw.data_vencimento || value <= 0) throw createHttpError(422, 'Documento DDA sem vencimento ou valor valido.');
  const normalized = {
    provider,
    provider_document_id: providerDocumentId,
    empresa_id: raw.empresa_id || defaults.empresa_id || null,
    payment_account_id: raw.payment_account_id || defaults.payment_account_id || null,
    sincronizacao_id: defaults.sincronizacao_id || raw.sincronizacao_id || null,
    beneficiario_nome: normalizeText(raw.beneficiario_nome) || null,
    beneficiario_documento: digits(raw.beneficiario_documento) || null,
    pagador_nome: normalizeText(raw.pagador_nome) || null,
    pagador_documento: digits(raw.pagador_documento) || null,
    banco_codigo: digits(raw.banco_codigo) || null,
    banco_nome: normalizeText(raw.banco_nome) || null,
    nosso_numero: normalizeText(raw.nosso_numero) || null,
    linha_digitavel: normalizeText(raw.linha_digitavel) || null,
    codigo_barras: normalizeText(raw.codigo_barras) || null,
    data_emissao: raw.data_emissao || null,
    data_vencimento: raw.data_vencimento,
    valor_original: money(raw.valor_original ?? value),
    valor_atual: value,
    provider_status: normalizeText(raw.provider_status || raw.status) || null,
    ultima_consulta_em: new Date(),
    raw_payload_json: JSON.stringify(raw),
    payload_hash: sha256(stableJson(raw))
  };
  normalized.fingerprint = documentFingerprint(normalized);
  return normalized;
}

async function upsertProviderDocuments(documents = [], defaults = {}, userId = null) {
  const counters = { recebidos: documents.length, novos: 0, atualizados: 0, erros: 0 };
  await sequelize.transaction(async transaction => {
    for (const raw of documents) {
      try {
        const data = normalizeProviderDocument(raw, defaults);
        let boleto = await FinanceiroDdaBoleto.findOne({
          where: { provider: data.provider, provider_document_id: data.provider_document_id },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        const isNew = !boleto;
        const priorStatus = boleto?.status || null;
        if (!boleto) {
          boleto = await FinanceiroDdaBoleto.create(data, { transaction });
          counters.novos += 1;
        } else {
          await boleto.update(data, { transaction });
          counters.atualizados += 1;
        }

        if (!['VINCULADO', 'IGNORADO'].includes(boleto.status)) {
          const match = await resolveMatch(boleto, { transaction });
          await boleto.update({ status: match.status, titulo_sugerido_id: match.titulo_sugerido_id }, { transaction });
          await recordEvent({
            boletoId: boleto.id,
            sincronizacaoId: defaults.sincronizacao_id || null,
            tipo: isNew ? 'DOCUMENTO_RECEBIDO' : 'DOCUMENTO_ATUALIZADO',
            anterior: priorStatus,
            novo: match.status,
            usuarioId: userId,
            detalhe: { origem_match: match.source, candidatos: match.candidates.map(item => item.id) },
            dedupeKey: sha256(`${boleto.id}|${data.payload_hash}|${match.status}`),
            transaction
          });
        }
      } catch (error) {
        counters.erros += 1;
      }
    }
  });
  return counters;
}

async function sincronizar({ empresa_id = null, payment_account_id = null, request_id = null }, user) {
  const sync = await FinanceiroDdaSincronizacao.create({
    provider: 'BB',
    empresa_id,
    payment_account_id,
    modo: 'ESTRUTURAL',
    status: 'BLOQUEADA_CONFIGURACAO',
    request_id: request_id || crypto.randomUUID(),
    total_erros: 1,
    erro_codigo: 'BB_DDA_NAO_HOMOLOGADO',
    erro_mensagem: 'O adapter DDA ainda nao foi configurado com os endpoints e escopos liberados na aplicacao BB existente.',
    iniciado_em: new Date(),
    finalizado_em: new Date(),
    criado_por: user?.id || null
  });
  await recordEvent({
    sincronizacaoId: sync.id,
    tipo: 'SINCRONIZACAO_BLOQUEADA',
    usuarioId: user?.id || null,
    detalhe: { motivo: sync.erro_codigo },
    dedupeKey: `dda-sync-blocked:${sync.id}`
  });
  throw createHttpError(
    503,
    'Estrutura DDA pronta, mas a consulta real ao Banco do Brasil esta bloqueada ate a configuracao do adapter com os endpoints e escopos da aplicacao BB existente.',
    'BB_DDA_NAO_HOMOLOGADO'
  );
}

async function resumo(query = {}) {
  const where = {};
  if (query.empresa_id) where.empresa_id = query.empresa_id;
  if (query.data_inicio || query.data_fim) {
    where.data_vencimento = {};
    if (query.data_inicio) where.data_vencimento[Op.gte] = query.data_inicio;
    if (query.data_fim) where.data_vencimento[Op.lte] = query.data_fim;
  }
  const rows = await FinanceiroDdaBoleto.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'quantidade'], [sequelize.fn('SUM', sequelize.col('valor_atual')), 'valor']],
    where,
    group: ['status'],
    raw: true
  });
  const byStatus = Object.fromEntries(rows.map(row => [row.status, { quantidade: Number(row.quantidade || 0), valor: money(row.valor) }]));
  return {
    total: rows.reduce((sum, row) => sum + Number(row.quantidade || 0), 0),
    valor_total: money(rows.reduce((sum, row) => sum + Number(row.valor || 0), 0)),
    por_status: byStatus,
    integracao: { provider: 'BB', habilitada: false, motivo: 'BB_DDA_NAO_HOMOLOGADO' }
  };
}

async function listar(query = {}) {
  const where = {};
  if (query.empresa_id) where.empresa_id = query.empresa_id;
  if (query.status) where.status = query.status;
  if (query.data_inicio || query.data_fim) {
    where.data_vencimento = {};
    if (query.data_inicio) where.data_vencimento[Op.gte] = query.data_inicio;
    if (query.data_fim) where.data_vencimento[Op.lte] = query.data_fim;
  }
  if (query.q) {
    where[Op.or] = [
      { beneficiario_nome: { [Op.like]: `%${query.q}%` } },
      { beneficiario_documento: { [Op.like]: `%${digits(query.q)}%` } },
      { nosso_numero: { [Op.like]: `%${query.q}%` } },
      { linha_digitavel: { [Op.like]: `%${query.q}%` } }
    ];
  }
  const { count, rows } = await FinanceiroDdaBoleto.findAndCountAll({
    where,
    include: boletoInclude(),
    distinct: true,
    order: [['data_vencimento', 'ASC'], ['id', 'DESC']],
    limit: query.limit || 25,
    offset: ((query.page || 1) - 1) * (query.limit || 25)
  });
  return { rows, total: count, page: query.page || 1, limit: query.limit || 25 };
}

async function loadBoleto(id, options = {}) {
  const boleto = await FinanceiroDdaBoleto.findByPk(id, { include: boletoInclude({ detail: options.detail }), transaction: options.transaction, lock: options.lock });
  if (!boleto) throw createHttpError(404, 'Boleto DDA nao encontrado.');
  return boleto;
}

async function detalhe(id) {
  return loadBoleto(id, { detail: true });
}

async function candidatos(id) {
  const boleto = await loadBoleto(id);
  const result = await titleCandidates(boleto, { limit: 50 });
  return { origem: result.source, rows: result.items };
}

async function reprocessarMatch(id, user) {
  return sequelize.transaction(async transaction => {
    const boleto = await loadBoleto(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (boleto.status === 'VINCULADO') throw createHttpError(409, 'Boleto DDA ja vinculado.');
    const anterior = boleto.status;
    const match = await resolveMatch(boleto, { transaction });
    await boleto.update({ status: match.status, titulo_sugerido_id: match.titulo_sugerido_id, ignorado_em: null, ignorado_por: null, ignorado_motivo: null }, { transaction });
    await recordEvent({ boletoId: boleto.id, tipo: 'MATCH_REPROCESSADO', anterior, novo: match.status, usuarioId: user?.id, detalhe: { origem_match: match.source, candidatos: match.candidates.map(item => item.id) }, transaction });
    return boleto.reload({ include: boletoInclude(), transaction });
  });
}

async function vincular(id, tituloId, user, origem = 'MANUAL') {
  if (!tituloId) throw createHttpError(400, 'Titulo obrigatorio.');
  return sequelize.transaction(async transaction => {
    const boleto = await loadBoleto(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (boleto.status === 'VINCULADO') {
      if (Number(boleto.titulo_financeiro_id) === Number(tituloId)) return boleto;
      throw createHttpError(409, 'Boleto DDA ja vinculado a outro titulo.');
    }
    const titulo = await TituloFinanceiro.findOne({
      where: { id: tituloId, tipo: 'PAGAR', status: { [Op.in]: STATUS_ATIVOS_TITULO } },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!titulo) throw createHttpError(422, 'Titulo a pagar inexistente ou sem saldo elegivel.');
    if (boleto.empresa_id && titulo.empresa_id && Number(boleto.empresa_id) !== Number(titulo.empresa_id)) {
      throw createHttpError(422, 'Empresa do boleto DDA difere da empresa do titulo.');
    }
    const anterior = boleto.status;
    await boleto.update({
      status: 'VINCULADO',
      titulo_financeiro_id: titulo.id,
      titulo_sugerido_id: titulo.id,
      vinculado_em: new Date(),
      vinculado_por: user?.id || null,
      ignorado_em: null,
      ignorado_por: null,
      ignorado_motivo: null
    }, { transaction });
    const titlePatch = {};
    if (!titulo.linha_digitavel && boleto.linha_digitavel) titlePatch.linha_digitavel = boleto.linha_digitavel;
    if (!titulo.codigo_barras && boleto.codigo_barras) titlePatch.codigo_barras = boleto.codigo_barras;
    if (!titulo.nosso_numero && boleto.nosso_numero) titlePatch.nosso_numero = boleto.nosso_numero;
    if (!titulo.banco_cobranca && boleto.banco_nome) titlePatch.banco_cobranca = boleto.banco_nome;
    if (Object.keys(titlePatch).length) await titulo.update(titlePatch, { transaction });
    await recordEvent({ boletoId: boleto.id, tipo: 'TITULO_VINCULADO', anterior, novo: 'VINCULADO', usuarioId: user?.id, detalhe: { titulo_id: titulo.id, origem }, transaction });
    return boleto.reload({ include: boletoInclude(), transaction });
  });
}

async function confirmarSugestao(id, user) {
  const boleto = await loadBoleto(id);
  if (boleto.status !== 'MATCH_EXATO' || !boleto.titulo_sugerido_id) {
    throw createHttpError(409, 'Boleto DDA nao possui sugestao exata para confirmar.');
  }
  return vincular(id, boleto.titulo_sugerido_id, user, 'SUGESTAO_EXATA_CONFIRMADA');
}

async function ignorar(id, motivo, user) {
  return sequelize.transaction(async transaction => {
    const boleto = await loadBoleto(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (boleto.status === 'VINCULADO') throw createHttpError(409, 'Boleto vinculado nao pode ser ignorado.');
    const anterior = boleto.status;
    await boleto.update({ status: 'IGNORADO', ignorado_em: new Date(), ignorado_por: user?.id || null, ignorado_motivo: motivo, titulo_sugerido_id: null }, { transaction });
    await recordEvent({ boletoId: boleto.id, tipo: 'DOCUMENTO_IGNORADO', anterior, novo: 'IGNORADO', usuarioId: user?.id, detalhe: { motivo }, transaction });
    return boleto.reload({ include: boletoInclude(), transaction });
  });
}

async function sincronizacoes(query = {}) {
  const where = {};
  if (query.empresa_id) where.empresa_id = query.empresa_id;
  return FinanceiroDdaSincronizacao.findAll({
    where,
    include: [
      { model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'codigo', 'nome', 'razao_social'], required: false },
      { model: User, as: 'criadoPor', attributes: ['id', 'nome'], required: false }
    ],
    limit: query.limit || 25,
    order: [['iniciado_em', 'DESC']]
  });
}

module.exports = {
  candidatos,
  confirmarSugestao,
  detalhe,
  documentFingerprint,
  ignorar,
  listar,
  normalizeProviderDocument,
  reprocessarMatch,
  resolveMatch,
  resumo,
  sincronizacoes,
  sincronizar,
  upsertProviderDocuments,
  vincular
};
