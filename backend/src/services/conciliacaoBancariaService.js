const crypto = require('crypto');
const { Op, fn, col } = require('sequelize');
const {
  ConciliacaoBancaria,
  ConciliacaoBancariaImportacao,
  ContaBancaria,
  CategoriaFinanceira,
  FaturaCartaoFinanceiro,
  CartaoFinanceiro,
  MovimentoFinanceiro,
  Parceiro,
  sequelize,
  TituloFinanceiro,
  TransferenciaFinanceira,
  User
} = require('../models');
const {
  canAccessFinanceiro,
  getFinanceiroObraScopeIds
} = require('./authorizationService');
const { registrarEventoSeguranca } = require('./securityLogService');
const { baixarFaturaCartao } = require('./faturaCartaoFinanceiroService');
const { obterSessaoAbertaParaConta } = require('./financeiroCaixaSessionHelper');
const { listarTarifasBancariasConfig } = require('./financeiroCadastroService');
const { criarTituloManualComBaixaAtomica } = require('./tituloFinanceiroService');
const { criarTransferenciaFinanceira } = require('./transferenciaFinanceiraService');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeConfigCode(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function parseInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw createHttpError(400, `${fieldName} invalido.`);
  }
  return normalized;
}

function normalizePositiveNumber(value, fallback = undefined) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return fallback;
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
    recursoTipo: 'CONCILIACAO_BANCARIA',
    recursoId: req.originalUrl,
    status: 'DENIED',
    descricao: 'Usuario sem permissao para acessar conciliacao bancaria'
  });

  throw createHttpError(403, 'Acesso negado para o modulo financeiro');
}

async function validarContaBancaria(contaBancariaId) {
  const conta = await ContaBancaria.findByPk(contaBancariaId);
  if (!conta || conta.ativo === false) {
    throw createHttpError(400, 'Conta bancaria invalida.');
  }
  return conta;
}

async function validarEmpresaConciliacaoComConta(conciliacao, { transaction = null } = {}) {
  const conta = await ContaBancaria.findByPk(conciliacao.conta_bancaria_id, { transaction });
  if (!conta || conta.ativo === false) {
    throw createHttpError(400, 'Conta bancaria da conciliacao invalida ou inativa.');
  }

  const empresaConciliacaoId = conciliacao.empresa_id ? Number(conciliacao.empresa_id) : null;
  const empresaContaId = conta.empresa_id ? Number(conta.empresa_id) : null;
  if (!empresaConciliacaoId) {
    throw createHttpError(400, 'Lancamento bancario sem empresa vinculada. Reimporte o OFX apos corrigir a conta bancaria.');
  }
  if (!empresaContaId) {
    throw createHttpError(400, 'Conta bancaria da conciliacao sem empresa vinculada.');
  }
  if (empresaConciliacaoId !== empresaContaId) {
    throw createHttpError(400, 'A empresa do lancamento bancario deve ser a mesma vinculada a conta bancaria.');
  }

  return { conta, empresaId: empresaConciliacaoId };
}

function decodeOfxBuffer(buffer) {
  const headerSnippet = buffer.toString('latin1', 0, Math.min(buffer.length, 2048));
  const encoding = (headerSnippet.match(/ENCODING:([^\r\n]+)/i)?.[1] || '').trim().toUpperCase();
  const charset = (headerSnippet.match(/CHARSET:([^\r\n]+)/i)?.[1] || '').trim().toUpperCase();

  if (encoding === 'UTF-8' || encoding === 'UNICODE') {
    return buffer.toString('utf8');
  }

  if (charset === '1252' || encoding === 'USASCII' || encoding === 'ASCII') {
    return buffer.toString('latin1');
  }

  const utf8Text = buffer.toString('utf8');
  if (/<OFX>|<STMTTRN>|<BANKTRANLIST>/i.test(utf8Text)) {
    return utf8Text;
  }

  return buffer.toString('latin1');
}

function extractTagValue(block, tagName) {
  const regex = new RegExp(`<${tagName}>([^<\\r\\n]*)`, 'i');
  const match = block.match(regex);
  return match ? String(match[1] || '').trim() : '';
}

function parseOfxDate(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 8) {
    return null;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function parseOfxAmount(value) {
  const raw = String(value || '').trim().replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return roundCurrency(parsed);
}

function buildStableTransactionId({
  fitId,
  dataMovimento,
  valor,
  documento,
  descricao,
  tipoMovimento
}) {
  return crypto
    .createHash('sha1')
    .update(`${fitId || ''}|${dataMovimento}|${valor}|${documento || ''}|${descricao || ''}|${tipoMovimento || ''}`)
    .digest('hex');
}

function normalizeOfxIdentifier(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  if (/^0+$/.test(normalized.replace(/\D/g, ''))) {
    return '';
  }

  return normalized;
}

function parseOfxTransactions(fileBuffer) {
  const rawText = decodeOfxBuffer(fileBuffer).replace(/\r/g, '\n');
  const normalizedText = rawText.replace(/>\s+</g, '><');
  const blocks = normalizedText.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi) || [];

  if (!blocks.length) {
    throw createHttpError(400, 'Nenhum lancamento OFX encontrado no arquivo.');
  }

  const occurrences = new Map();

  return blocks.map((block, index) => {
    const dataMovimento = parseOfxDate(extractTagValue(block, 'DTPOSTED'));
    const valor = parseOfxAmount(extractTagValue(block, 'TRNAMT'));
    const fitId = normalizeOfxIdentifier(extractTagValue(block, 'FITID'));
    const checknum = normalizeOfxIdentifier(extractTagValue(block, 'CHECKNUM'));
    const refnum = normalizeOfxIdentifier(extractTagValue(block, 'REFNUM'));
    const docnum = normalizeOfxIdentifier(extractTagValue(block, 'DOCNUM'));
    const name = String(extractTagValue(block, 'NAME') || '').trim();
    const memo = String(extractTagValue(block, 'MEMO') || '').trim();
    const nameAsDocument = normalizeOfxIdentifier(name);
    const documento = checknum || refnum || docnum || nameAsDocument || null;
    const descricao = [memo || null, name && name !== documento ? name : null]
      .filter(Boolean)
      .join(' - ')
      .slice(0, 255);
    const tipoMovimento = normalizeText(extractTagValue(block, 'TRNTYPE'));

    if (!dataMovimento || valor == null) {
      throw createHttpError(400, `Lancamento OFX invalido na posicao ${index + 1}.`);
    }

    const baseUid = buildStableTransactionId({
      fitId,
      dataMovimento,
      valor,
      documento,
      descricao: descricao || memo || name || 'Lancamento bancario',
      tipoMovimento
    });
    const occurrence = (occurrences.get(baseUid) || 0) + 1;
    occurrences.set(baseUid, occurrence);

    return {
      ofx_uid: occurrence === 1 ? baseUid : `${baseUid}:${occurrence}`,
      documento: documento || null,
      descricao_banco: descricao || memo || name || 'Lancamento bancario',
      valor,
      data_movimento: dataMovimento,
      tipo_movimento: tipoMovimento || null
    };
  });
}

function buildImportFingerprint(transacoes = []) {
  const payload = transacoes.map((item) => ({
    ofx_uid: item.ofx_uid,
    data_movimento: item.data_movimento,
    valor: item.valor,
    documento: item.documento || null,
    descricao_banco: item.descricao_banco || null
  }));

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

function getSignalByValue(value) {
  return Number(value || 0) >= 0 ? 'RECEBER' : 'PAGAR';
}

function subtractDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function calculateDiffDays(dateA, dateB) {
  const a = new Date(`${dateA}T00:00:00`);
  const b = new Date(`${dateB}T00:00:00`);
  const diff = Math.abs(a.getTime() - b.getTime());
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

function normalizeStatusFilter(status) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized || 'PENDENTE';
}

function normalizePageSize(value) {
  const allowed = new Set([25, 50, 100, 200, 500, 1000]);
  const parsed = Number(value || 100);
  if (!allowed.has(parsed)) {
    return 100;
  }
  return parsed;
}

function normalizeSearchLimit(value, fallback = 30) {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 200);
}

function buildConciliacaoInclude() {
  return [
    {
      model: ContaBancaria,
      as: 'contaBancaria',
      attributes: ['id', 'nome', 'banco', 'agencia', 'conta', 'empresa_id', 'tipo_operacional']
    },
    {
      model: TituloFinanceiro,
      as: 'titulo',
      attributes: ['id', 'tipo', 'descricao', 'numero_documento', 'obra_id'],
      include: [
        {
          model: Parceiro,
          as: 'parceiro',
          attributes: ['id', 'nome', 'cpf_cnpj']
        }
      ]
    },
    {
      model: MovimentoFinanceiro,
      as: 'movimento',
      attributes: ['id', 'tipo_movimento', 'valor', 'valor_quitacao', 'data_movimento', 'status', 'observacoes', 'documento_referencia'],
      include: [
        {
          model: ContaBancaria,
          as: 'contaBancaria',
          attributes: ['id', 'nome']
        }
      ]
    },
    {
      model: FaturaCartaoFinanceiro,
      as: 'faturaCartao',
      include: [
        {
          model: CartaoFinanceiro,
          as: 'cartao',
          attributes: ['id', 'nome', 'titular', 'bandeira', 'ultimos_digitos']
        }
      ]
    },
    {
      model: TransferenciaFinanceira,
      as: 'transferencia',
      include: [
        {
          model: ContaBancaria,
          as: 'contaOrigem',
          attributes: ['id', 'nome', 'banco', 'agencia', 'conta']
        },
        {
          model: ContaBancaria,
          as: 'contaDestino',
          attributes: ['id', 'nome', 'banco', 'agencia', 'conta']
        }
      ]
    },
    {
      model: User,
      as: 'confirmadoPor',
      attributes: ['id', 'nome', 'email']
    }
  ];
}

function buildConciliacaoWhere(filters = {}, { forcePending = false } = {}) {
  const where = {};
  const status = forcePending ? 'PENDENTE' : normalizeStatusFilter(filters.status);

  if (status !== 'TODOS') {
    where.status = status;
  }

  if (filters.conta_bancaria_id) {
    where.conta_bancaria_id = parseInteger(filters.conta_bancaria_id, 'Conta bancaria');
  }

  if (filters.data_inicial || filters.data_final) {
    where.data_movimento = {};
    if (filters.data_inicial) {
      where.data_movimento[Op.gte] = filters.data_inicial;
    }
    if (filters.data_final) {
      where.data_movimento[Op.lte] = filters.data_final;
    }
  }

  return where;
}

async function importOfx(req, payload = {}) {
  await assertFinanceAccess(req);

  if (!req.file?.buffer || !req.file?.originalname) {
    throw createHttpError(400, 'Arquivo OFX e obrigatorio.');
  }

  const contaBancariaId = parseInteger(payload.conta_bancaria_id, 'Conta bancaria');
  const contaBancaria = await validarContaBancaria(contaBancariaId);
  const empresaContaId = contaBancaria.empresa_id ? Number(contaBancaria.empresa_id) : null;
  if (!empresaContaId) {
    throw createHttpError(
      400,
      'A conta bancaria selecionada precisa estar vinculada a uma empresa antes de importar OFX.'
    );
  }

  const transacoes = parseOfxTransactions(req.file.buffer);
  const arquivoHash = buildImportFingerprint(transacoes);
  const importacaoExistente = await ConciliacaoBancariaImportacao.findOne({
    where: {
      conta_bancaria_id: contaBancariaId,
      arquivo_hash: arquivoHash
    },
    attributes: ['id', 'arquivo_nome', 'createdAt', 'importados', 'ignorados']
  });

  if (importacaoExistente) {
    throw createHttpError(
      409,
      `Este arquivo/remessa ja foi importado em ${new Date(importacaoExistente.createdAt).toLocaleString('pt-BR')}.`
    );
  }

  const batchSeen = new Set();
  const imported = [];
  const skipped = [];

  for (const transacao of transacoes) {
    const uniqueKey = `${contaBancariaId}:${transacao.ofx_uid}`;
    if (batchSeen.has(uniqueKey)) {
      skipped.push({
        ofx_uid: transacao.ofx_uid,
        motivo: 'Duplicado no arquivo importado'
      });
      continue;
    }
    batchSeen.add(uniqueKey);

    const existing = await ConciliacaoBancaria.findOne({
      where: {
        conta_bancaria_id: contaBancariaId,
        ofx_uid: transacao.ofx_uid
      },
      attributes: ['id', 'status']
    });

    if (existing) {
      skipped.push({
        id: existing.id,
        ofx_uid: transacao.ofx_uid,
        motivo: `Lancamento ja importado com status ${existing.status}`
      });
      continue;
    }

    const created = await ConciliacaoBancaria.create({
      conta_bancaria_id: contaBancariaId,
      empresa_id: empresaContaId,
      titulo_financeiro_id: null,
      movimento_financeiro_id: null,
      ofx_uid: transacao.ofx_uid,
      documento: transacao.documento,
      descricao_banco: transacao.descricao_banco,
      valor: transacao.valor,
      data_movimento: transacao.data_movimento,
      status: 'PENDENTE',
      confirmado_por: null,
      confirmado_em: null,
      criado_por: req.user?.id || null
    });

    imported.push(created);
  }

  if (imported.length === 0 && skipped.length === transacoes.length) {
    throw createHttpError(409, 'Todos os lancamentos deste arquivo ja foram importados anteriormente.');
  }

  const importacao = await ConciliacaoBancariaImportacao.create({
    conta_bancaria_id: contaBancariaId,
    empresa_id: empresaContaId,
    arquivo_hash: arquivoHash,
    arquivo_nome: req.file.originalname,
    total_lidos: transacoes.length,
    importados: imported.length,
    ignorados: skipped.length,
    criado_por: req.user?.id || null
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_OFX_IMPORTED',
    recursoTipo: 'CONCILIACAO_BANCARIA',
    recursoId: contaBancariaId,
    status: 'SUCCESS',
    descricao: 'Arquivo OFX importado para conciliacao bancaria',
    metadata: {
      conta_bancaria_id: contaBancariaId,
      importacao_id: importacao.id,
      arquivo_hash: arquivoHash,
      arquivo: req.file.originalname,
      importados: imported.length,
      ignorados: skipped.length
    }
  });

  return {
    importacao_id: importacao.id,
    conta_bancaria_id: contaBancariaId,
    arquivo: req.file.originalname,
    arquivo_hash: arquivoHash,
    importados: imported.length,
    ignorados: skipped.length,
    total_lidos: transacoes.length,
    itens_importados: imported.map((item) => ({
      id: item.id,
      data_movimento: item.data_movimento,
      valor: Number(item.valor || 0),
      descricao_banco: item.descricao_banco
    })),
    itens_ignorados: skipped
  };
}

async function buildTituloWhere(req, conciliacao) {
  const tituloWhere = {
    tipo: getSignalByValue(conciliacao.valor)
  };

  const obraIds = await getFinanceiroObraScopeIds(req.user);
  if (obraIds === null) {
    return tituloWhere;
  }

  if (!obraIds.length) {
    return null;
  }

  tituloWhere.obra_id = {
    [Op.in]: obraIds
  };

  return tituloWhere;
}

async function loadUnavailableMovementIds(movimentoIds = [], exceptConciliacaoId = null) {
  const ids = [...new Set(movimentoIds.map((item) => Number(item || 0)).filter(Boolean))];
  if (!ids.length) {
    return new Set();
  }

  const where = {
    movimento_financeiro_id: {
      [Op.in]: ids
    },
    status: 'CONCILIADO'
  };

  if (exceptConciliacaoId) {
    where.id = {
      [Op.ne]: Number(exceptConciliacaoId)
    };
  }

  const rows = await ConciliacaoBancaria.findAll({
    where,
    attributes: ['movimento_financeiro_id'],
    raw: true
  });

  return new Set(rows.map((item) => Number(item.movimento_financeiro_id || 0)).filter(Boolean));
}

async function queryMovimentoCandidates(req, conciliacao, searchFilters = {}) {
  const tituloWhere = await buildTituloWhere(req, conciliacao);
  if (!tituloWhere) {
    return [];
  }

  const defaultDateInitial = subtractDays(conciliacao.data_movimento, 5);
  const defaultDateFinal = addDays(conciliacao.data_movimento, 5);
  const valorBancoAbsoluto = Math.abs(Number(conciliacao.valor || 0));

  const dataInicial = searchFilters.data_inicial || defaultDateInitial;
  const dataFinal = searchFilters.data_final || defaultDateFinal;
  const valorInicial = normalizePositiveNumber(searchFilters.valor_inicial, valorBancoAbsoluto);
  const valorFinal = normalizePositiveNumber(searchFilters.valor_final, valorBancoAbsoluto);
  const documentoPesquisa = normalizeText(searchFilters.documento);
  const numeroDocumentoPesquisa = normalizeText(searchFilters.numero_documento);
  const limit = normalizeSearchLimit(searchFilters.limit, 40);

  const whereMovimento = {
    status: 'ATIVO',
    conta_bancaria_id: conciliacao.conta_bancaria_id,
    data_movimento: {
      [Op.between]: [dataInicial, dataFinal]
    }
  };

  const items = await MovimentoFinanceiro.findAll({
    where: whereMovimento,
    include: [
      {
        model: TituloFinanceiro,
        as: 'titulo',
        required: true,
        where: tituloWhere,
        attributes: ['id', 'tipo', 'descricao', 'numero_documento', 'obra_id'],
        include: [
          {
            model: Parceiro,
            as: 'parceiro',
            attributes: ['id', 'nome', 'cpf_cnpj']
          }
        ]
      },
      {
        model: ContaBancaria,
        as: 'contaBancaria',
        attributes: ['id', 'nome']
      }
    ],
    order: [['data_movimento', 'DESC'], ['createdAt', 'DESC']]
  });

  const unavailableIds = await loadUnavailableMovementIds(
    items.map((item) => item.id),
    conciliacao.id
  );

  const filtered = items.filter((item) => {
    if (unavailableIds.has(Number(item.id || 0))) {
      return false;
    }

    const movementValue = Math.abs(Number(item.valor_quitacao || 0));
    const lowerBound = Number(valorInicial || 0);
    const upperBound = Number(valorFinal || lowerBound);

    if (lowerBound === upperBound) {
      if (Math.abs(movementValue - lowerBound) > 0.1) {
        return false;
      }
    } else if (movementValue < lowerBound || movementValue > upperBound) {
      return false;
    }

    if (numeroDocumentoPesquisa) {
      const numeroDocumento = normalizeText(item.titulo?.numero_documento);
      if (!numeroDocumento || !numeroDocumento.includes(numeroDocumentoPesquisa)) {
        return false;
      }
    }

    if (documentoPesquisa) {
      const haystack = [
        item.titulo?.descricao,
        item.titulo?.numero_documento,
        item.titulo?.parceiro?.nome,
        item.observacoes
      ]
        .map((value) => normalizeText(value))
        .join(' ');

      if (!haystack.includes(documentoPesquisa)) {
        return false;
      }
    }

    return true;
  });

  return filtered.slice(0, limit);
}

function scoreSuggestion(conciliacao, movimento) {
  const motivos = [];
  let score = 0;
  const concValor = Math.abs(Number(conciliacao.valor || 0));
  const movValor = Math.abs(Number(movimento.valor_quitacao || 0));
  const diffValor = Math.abs(concValor - movValor);

  if (diffValor <= 0.01) {
    score += 50;
    motivos.push('Valor exato');
  } else if (diffValor <= 0.1) {
    score += 30;
    motivos.push('Valor muito proximo');
  }

  const diffDias = calculateDiffDays(conciliacao.data_movimento, movimento.data_movimento);
  if (diffDias === 0) {
    score += 30;
    motivos.push('Mesma data');
  } else if (diffDias <= 2) {
    score += 20;
    motivos.push('Data proxima');
  } else if (diffDias <= 5) {
    score += 10;
    motivos.push('Janela de conciliacao');
  }

  const documentoBanco = normalizeText(conciliacao.documento);
  const documentoTitulo = normalizeText(movimento.titulo?.numero_documento);
  if (documentoBanco && documentoTitulo && documentoBanco === documentoTitulo) {
    score += 25;
    motivos.push('Documento coincide');
  }

  const descricaoBanco = normalizeText(conciliacao.descricao_banco);
  const parceiroNome = normalizeText(movimento.titulo?.parceiro?.nome);
  if (
    descricaoBanco &&
    parceiroNome &&
    descricaoBanco.includes(parceiroNome.slice(0, Math.min(parceiroNome.length, 12)))
  ) {
    score += 15;
    motivos.push('Parceiro identificado');
  }

  return {
    score,
    motivos,
    diff_dias: diffDias,
    diff_valor: roundCurrency(diffValor)
  };
}

function serializeSuggestion(movimento, ranking) {
  return {
    movimento_financeiro_id: movimento.id,
    titulo_financeiro_id: movimento.titulo?.id || null,
    titulo_descricao: movimento.titulo?.descricao || `Titulo #${movimento.titulo?.id || '-'}`,
    tipo: movimento.titulo?.tipo || null,
    parceiro_nome: movimento.titulo?.parceiro?.nome || '-',
    documento: movimento.titulo?.numero_documento || null,
    data_movimento: movimento.data_movimento,
    valor_quitacao: Number(movimento.valor_quitacao || 0),
    conta_bancaria_nome: movimento.contaBancaria?.nome || '-',
    score: ranking.score,
    motivos: ranking.motivos,
    diff_dias: ranking.diff_dias,
    diff_valor: ranking.diff_valor
  };
}

async function analyzeSuggestions(req, conciliacao, options = {}) {
  const maxSuggestions = Math.max(Number(options.maxSuggestions || 3), 1);
  const candidates = await queryMovimentoCandidates(req, conciliacao, {
    limit: Math.max(maxSuggestions * 3, 20)
  });

  const ranked = candidates
    .map((item) => ({
      item,
      ranking: scoreSuggestion(conciliacao, item)
    }))
    .filter((entry) => entry.ranking.score > 0)
    .sort((a, b) => {
      if (b.ranking.score !== a.ranking.score) {
        return b.ranking.score - a.ranking.score;
      }

      const aDate = String(a.item.data_movimento || '');
      const bDate = String(b.item.data_movimento || '');
      if (bDate !== aDate) {
        return bDate.localeCompare(aDate);
      }

      return Number(b.item.id || 0) - Number(a.item.id || 0);
    });

  const sameDaySameValue = ranked.filter((entry) => (
    entry.ranking.diff_dias === 0 && entry.ranking.diff_valor <= 0.01
  ));

  const sameTopScore = ranked.length > 1 && ranked[0].ranking.score === ranked[1].ranking.score;
  const associacaoManualRecomendada = sameDaySameValue.length > 1 || sameTopScore;
  const sugestaoAutomatica = ranked.length > 0 && !associacaoManualRecomendada
    ? serializeSuggestion(ranked[0].item, ranked[0].ranking)
    : null;

  return {
    sugestoes: ranked.slice(0, maxSuggestions).map((entry) => serializeSuggestion(entry.item, entry.ranking)),
    sugestao_automatica: sugestaoAutomatica,
    total_candidatos: ranked.length,
    total_candidatos_exatos_mesmo_dia: sameDaySameValue.length,
    associacao_manual_recomendada: associacaoManualRecomendada,
    conciliacao_em_lote_disponivel: Boolean(sugestaoAutomatica)
  };
}

async function listarConciliacoes(req, filters = {}) {
  await assertFinanceAccess(req);

  const where = buildConciliacaoWhere(filters);
  const pageSize = normalizePageSize(filters.page_size);
  const currentPage = Math.max(Number(filters.page || 1), 1);
  const offset = (currentPage - 1) * pageSize;

  const agrupadosResumo = await ConciliacaoBancaria.findAll({
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'total'],
      [fn('SUM', col('valor')), 'valor_total'],
      [fn('SUM', fn('ABS', col('valor'))), 'valor_absoluto_total']
    ],
    where,
    group: ['status'],
    raw: true
  });

  const totalRegistros = await ConciliacaoBancaria.count({ where });

  const itens = await ConciliacaoBancaria.findAll({
    where,
    include: buildConciliacaoInclude(),
    order: [['data_movimento', 'DESC'], ['createdAt', 'DESC']],
    limit: pageSize,
    offset
  });

  const rows = await Promise.all(itens.map(async (item) => {
    const json = item.toJSON();
    const analise = String(item.status || '').toUpperCase() === 'PENDENTE'
      ? await analyzeSuggestions(req, item)
      : {
          sugestoes: [],
          sugestao_automatica: null,
          total_candidatos: 0,
          total_candidatos_exatos_mesmo_dia: 0,
          associacao_manual_recomendada: false,
          conciliacao_em_lote_disponivel: false
        };

    return {
      id: json.id,
      conta_bancaria_id: json.conta_bancaria_id,
      conta_bancaria_nome: json.contaBancaria?.nome || '-',
      ofx_uid: json.ofx_uid,
      documento: json.documento,
      descricao_banco: json.descricao_banco,
      valor: Number(json.valor || 0),
      data_movimento: json.data_movimento,
      status: json.status,
      confirmado_em: json.confirmado_em,
      confirmado_por: json.confirmadoPor
        ? {
            id: json.confirmadoPor.id,
            nome: json.confirmadoPor.nome,
            email: json.confirmadoPor.email
          }
        : null,
      titulo: json.titulo
        ? {
            id: json.titulo.id,
            tipo: json.titulo.tipo,
            descricao: json.titulo.descricao,
            numero_documento: json.titulo.numero_documento,
            parceiro_nome: json.titulo.parceiro?.nome || '-'
          }
        : null,
      movimento: json.movimento
        ? {
            id: json.movimento.id,
            tipo_movimento: json.movimento.tipo_movimento,
            valor: Number(json.movimento.valor || 0),
            valor_quitacao: Number(json.movimento.valor_quitacao || 0),
            data_movimento: json.movimento.data_movimento,
            status: json.movimento.status,
            observacoes: json.movimento.observacoes || null,
            documento_referencia: json.movimento.documento_referencia || null
          }
        : null,
      fatura_cartao: json.faturaCartao
        ? {
            id: json.faturaCartao.id,
            competencia: json.faturaCartao.competencia,
            status: json.faturaCartao.status,
            valor_total: Number(json.faturaCartao.valor_total || 0),
            data_vencimento: json.faturaCartao.data_vencimento,
            cartao_nome: json.faturaCartao.cartao?.nome || '-',
            cartao_final: json.faturaCartao.cartao?.ultimos_digitos || null
          }
        : null,
      sugestoes: analise.sugestoes,
      sugestao_automatica: analise.sugestao_automatica,
      total_candidatos: analise.total_candidatos,
      total_candidatos_exatos_mesmo_dia: analise.total_candidatos_exatos_mesmo_dia,
      associacao_manual_recomendada: analise.associacao_manual_recomendada,
      conciliacao_em_lote_disponivel: analise.conciliacao_em_lote_disponivel
    };
  }));

  const resumo = agrupadosResumo.reduce((acc, item) => {
    const statusItem = String(item.status || '').toUpperCase();
    const total = Number(item.total || 0);
    const valor = Number(item.valor_total || 0);
    acc.total += total;
    acc.valor_total += valor;
    acc.valor_absoluto_total += Number(item.valor_absoluto_total || 0);
    if (statusItem === 'PENDENTE') acc.pendentes += total;
    if (statusItem === 'CONCILIADO') acc.conciliados += total;
    if (statusItem === 'IGNORADO') acc.ignorados += total;
    return acc;
  }, {
    total: 0,
    pendentes: 0,
    conciliados: 0,
    ignorados: 0,
    valor_total: 0,
    valor_absoluto_total: 0
  });

  resumo.valor_total = roundCurrency(resumo.valor_total);
  resumo.valor_absoluto_total = roundCurrency(resumo.valor_absoluto_total);

  return {
    resumo,
    meta: {
      total_disponivel: resumo.total,
      total_listado: rows.length,
      current_page: currentPage,
      page_size: pageSize,
      total_pages: Math.max(Math.ceil(totalRegistros / pageSize), 1)
    },
    itens: rows
  };
}

async function listarImportacoes(req, filters = {}) {
  await assertFinanceAccess(req);

  const where = {};
  if (filters.conta_bancaria_id) {
    where.conta_bancaria_id = parseInteger(filters.conta_bancaria_id, 'Conta bancaria');
  }

  if (filters.data_inicial || filters.data_final) {
    where.createdAt = {};
    if (filters.data_inicial) {
      where.createdAt[Op.gte] = new Date(`${filters.data_inicial}T00:00:00.000Z`);
    }
    if (filters.data_final) {
      where.createdAt[Op.lte] = new Date(`${filters.data_final}T23:59:59.999Z`);
    }
  }

  const limit = Math.min(Math.max(Number(filters.limit || 8), 1), 50);
  const itens = await ConciliacaoBancariaImportacao.findAll({
    where,
    include: [
      {
        model: ContaBancaria,
        as: 'contaBancaria',
        attributes: ['id', 'nome', 'banco', 'agencia', 'conta', 'empresa_id', 'tipo_operacional']
      },
      {
        model: User,
        as: 'criadoPor',
        attributes: ['id', 'nome', 'email']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit
  });

  const resumo = itens.reduce((acc, item) => {
    acc.total_importacoes += 1;
    acc.total_lidos += Number(item.total_lidos || 0);
    acc.total_importados += Number(item.importados || 0);
    acc.total_ignorados += Number(item.ignorados || 0);
    return acc;
  }, {
    total_importacoes: 0,
    total_lidos: 0,
    total_importados: 0,
    total_ignorados: 0
  });

  return {
    resumo,
    itens: itens.map((item) => ({
      id: item.id,
      conta_bancaria_id: item.conta_bancaria_id,
      conta_bancaria_nome: item.contaBancaria?.nome || '-',
      banco: item.contaBancaria?.banco || '-',
      arquivo_nome: item.arquivo_nome,
      arquivo_hash: item.arquivo_hash,
      total_lidos: Number(item.total_lidos || 0),
      importados: Number(item.importados || 0),
      ignorados: Number(item.ignorados || 0),
      criado_em: item.createdAt,
      criado_por: item.criadoPor
        ? {
            id: item.criadoPor.id,
            nome: item.criadoPor.nome,
            email: item.criadoPor.email
          }
        : null
    }))
  };
}

async function loadConciliacaoById(req, conciliacaoId) {
  await assertFinanceAccess(req);
  const conciliacao = await ConciliacaoBancaria.findByPk(conciliacaoId, {
    include: buildConciliacaoInclude()
  });

  if (!conciliacao) {
    throw createHttpError(404, 'Lancamento de conciliacao nao encontrado.');
  }

  return conciliacao;
}

async function resolveMovimentoForConciliacao(req, conciliacao, movimentoId) {
  const parsedMovimentoId = parseInteger(movimentoId, 'Movimento financeiro');
  const movimento = await MovimentoFinanceiro.findByPk(parsedMovimentoId, {
    include: [
      {
        model: TituloFinanceiro,
        as: 'titulo',
        include: [
          {
            model: Parceiro,
            as: 'parceiro',
            attributes: ['id', 'nome']
          }
        ]
      },
      {
        model: ContaBancaria,
        as: 'contaBancaria',
        attributes: ['id', 'nome']
      }
    ]
  });

  if (!movimento) {
    throw createHttpError(
      400,
      'O movimento selecionado nao existe ou nao esta mais disponivel para conciliacao. Atualize as sugestoes e tente novamente.'
    );
  }

  if (String(movimento.status || '').toUpperCase() !== 'ATIVO') {
    throw createHttpError(400, 'Somente movimentos ativos podem ser conciliados.');
  }

  const obraIds = await getFinanceiroObraScopeIds(req.user);
  if (obraIds !== null && (!obraIds.length || !obraIds.includes(Number(movimento.titulo?.obra_id || 0)))) {
    throw createHttpError(403, 'Acesso negado para o titulo vinculado a este movimento.');
  }

  if (Number(movimento.conta_bancaria_id || 0) !== Number(conciliacao.conta_bancaria_id || 0)) {
    throw createHttpError(400, 'O movimento selecionado pertence a outra conta bancaria.');
  }

  const empresaConciliacaoId = conciliacao.empresa_id ? Number(conciliacao.empresa_id) : null;
  const empresaMovimentoId = movimento.empresa_id ? Number(movimento.empresa_id) : null;
  if (!empresaConciliacaoId) {
    throw createHttpError(400, 'Lancamento bancario sem empresa vinculada. Reimporte o OFX apos corrigir a conta bancaria.');
  }
  if (!empresaMovimentoId) {
    throw createHttpError(400, 'Movimento financeiro sem empresa vinculada. Corrija o movimento antes de conciliar.');
  }
  if (empresaConciliacaoId !== empresaMovimentoId) {
    throw createHttpError(400, 'A empresa do movimento financeiro deve ser a mesma empresa do lancamento bancario.');
  }

  if (String(movimento.titulo?.tipo || '').toUpperCase() !== getSignalByValue(conciliacao.valor)) {
    throw createHttpError(400, 'O tipo do titulo nao e compativel com o sinal do lancamento bancario.');
  }

  const valorConciliacao = Math.abs(Number(conciliacao.valor || 0));
  const valorMovimento = Math.abs(Number(movimento.valor_quitacao || 0));
  if (Math.abs(valorConciliacao - valorMovimento) > 0.1) {
    throw createHttpError(400, 'O valor do movimento nao confere com o lancamento bancario importado.');
  }

  const jaConciliado = await ConciliacaoBancaria.findOne({
    where: {
      movimento_financeiro_id: movimento.id,
      status: 'CONCILIADO',
      id: {
        [Op.ne]: conciliacao.id
      }
    },
    attributes: ['id']
  });

  if (jaConciliado) {
    throw createHttpError(400, 'Este movimento financeiro ja foi usado em outra conciliacao.');
  }

  return movimento;
}

async function listarFaturasAssociacao(req, conciliacaoId, filters = {}) {
  const conciliacao = await loadConciliacaoById(req, conciliacaoId);
  const valorBancoAbsoluto = Math.abs(Number(conciliacao.valor || 0));
  const valorInicial = normalizePositiveNumber(filters.valor_inicial, valorBancoAbsoluto);
  const valorFinal = normalizePositiveNumber(filters.valor_final, valorBancoAbsoluto);
  const dataInicial = filters.data_inicial || subtractDays(conciliacao.data_movimento, 7);
  const dataFinal = filters.data_final || addDays(conciliacao.data_movimento, 7);
  const limit = normalizeSearchLimit(filters.limit, 30);

  const faturas = await FaturaCartaoFinanceiro.findAll({
    where: {
      status: {
        [Op.in]: ['ABERTA', 'FECHADA', 'PARCIAL']
      },
      data_vencimento: {
        [Op.between]: [dataInicial, dataFinal]
      }
    },
    include: [
      {
        model: CartaoFinanceiro,
        as: 'cartao',
        attributes: ['id', 'nome', 'titular', 'bandeira', 'ultimos_digitos']
      },
      {
        model: TituloFinanceiro,
        as: 'titulos',
        attributes: ['id'],
        required: false
      }
    ],
    order: [['data_vencimento', 'DESC'], ['id', 'DESC']]
  });

  const lower = Number(valorInicial || 0);
  const upper = Number(valorFinal || lower);
  const search = normalizeText(filters.documento || filters.busca || '');
  const itens = faturas
    .filter((fatura) => {
      const valor = Math.abs(Number(fatura.valor_total || 0));
      if (lower === upper) return Math.abs(valor - lower) <= 0.1;
      return valor >= lower && valor <= upper;
    })
    .filter((fatura) => {
      if (!search) return true;
      const haystack = normalizeText([
        fatura.competencia,
        fatura.cartao?.nome,
        fatura.cartao?.titular,
        fatura.cartao?.bandeira,
        fatura.cartao?.ultimos_digitos
      ].filter(Boolean).join(' '));
      return haystack.includes(search);
    })
    .slice(0, limit)
    .map((fatura) => ({
      id: fatura.id,
      fatura_cartao_id: fatura.id,
      cartao: fatura.cartao
        ? {
            id: fatura.cartao.id,
            nome: fatura.cartao.nome,
            titular: fatura.cartao.titular,
            bandeira: fatura.cartao.bandeira,
            ultimos_digitos: fatura.cartao.ultimos_digitos
          }
        : null,
      cartao_nome: fatura.cartao?.nome || '-',
      cartao_final: fatura.cartao?.ultimos_digitos || null,
      competencia: fatura.competencia,
      status: fatura.status,
      data_fechamento: fatura.data_fechamento,
      data_vencimento: fatura.data_vencimento,
      valor_total: Number(fatura.valor_total || 0),
      total_titulos: Array.isArray(fatura.titulos) ? fatura.titulos.length : 0,
      diff_valor: roundCurrency(Math.abs(Math.abs(Number(fatura.valor_total || 0)) - valorBancoAbsoluto)),
      diff_dias: calculateDiffDays(conciliacao.data_movimento, fatura.data_vencimento)
    }));

  return {
    conciliacao: {
      id: conciliacao.id,
      conta_bancaria_id: conciliacao.conta_bancaria_id,
      conta_bancaria_nome: conciliacao.contaBancaria?.nome || '-',
      data_movimento: conciliacao.data_movimento,
      valor: Number(conciliacao.valor || 0),
      documento: conciliacao.documento,
      descricao_banco: conciliacao.descricao_banco
    },
    meta: { total: itens.length, limit },
    itens
  };
}

async function confirmarConciliacaoFatura(req, conciliacaoId, payload = {}) {
  await assertFinanceAccess(req);
  const transaction = await sequelize.transaction();
  try {
    const conciliacao = await ConciliacaoBancaria.findByPk(conciliacaoId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!conciliacao) throw createHttpError(404, 'Lancamento de conciliacao nao encontrado.');
    if (String(conciliacao.status || '').toUpperCase() !== 'PENDENTE') {
      throw createHttpError(400, 'Somente conciliacoes pendentes podem ser confirmadas.');
    }

    const faturaId = parseInteger(payload.fatura_cartao_id, 'Fatura de cartao');
    const fatura = await FaturaCartaoFinanceiro.findByPk(faturaId, { transaction });
    if (!fatura) throw createHttpError(400, 'Fatura de cartao invalida.');

    const valorConciliacao = Math.abs(Number(conciliacao.valor || 0));
    const valorFatura = Math.abs(Number(fatura.valor_total || 0));
    if (Math.abs(valorConciliacao - valorFatura) > 0.1) {
      throw createHttpError(400, 'O valor da fatura nao confere com o lancamento bancario.');
    }

    await baixarFaturaCartao(req, fatura.id, {
      conta_bancaria_id: conciliacao.conta_bancaria_id,
      data_movimento: conciliacao.data_movimento,
      observacoes: `Baixa conciliada pelo lancamento bancario #${conciliacao.id}`
    }, { transaction });

    await conciliacao.update({
      fatura_cartao_id: fatura.id,
      movimento_financeiro_id: null,
      titulo_financeiro_id: null,
      status: 'CONCILIADO',
      confirmado_por: req.user?.id || null,
      confirmado_em: new Date()
    }, { transaction });

    await fatura.update({
      conciliacao_bancaria_id: conciliacao.id
    }, { transaction });

    await transaction.commit();

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_BANK_RECONCILED_CARD_STATEMENT',
      recursoTipo: 'CONCILIACAO_BANCARIA',
      recursoId: conciliacao.id,
      status: 'SUCCESS',
      descricao: 'Lancamento bancario conciliado com fatura de cartao',
      metadata: {
        fatura_cartao_id: fatura.id,
        valor_fatura: valorFatura
      }
    });

    return loadConciliacaoById(req, conciliacao.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function confirmarConciliacaoTransferencia(req, conciliacaoId, payload = {}) {
  await assertFinanceAccess(req);
  const transaction = await sequelize.transaction();

  try {
    const conciliacao = await ConciliacaoBancaria.findByPk(conciliacaoId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!conciliacao) throw createHttpError(404, 'Lancamento de conciliacao nao encontrado.');
    if (String(conciliacao.status || '').toUpperCase() !== 'PENDENTE') {
      throw createHttpError(400, 'Somente conciliacoes pendentes podem ser confirmadas.');
    }

    const contaAtualId = parseInteger(conciliacao.conta_bancaria_id, 'Conta do lancamento bancario');
    const contaContraparteId = parseInteger(payload.conta_contraparte_id, 'Conta contraparte');
    if (contaAtualId === contaContraparteId) {
      throw createHttpError(400, 'A conta contraparte deve ser diferente da conta do lancamento bancario.');
    }
    await validarEmpresaConciliacaoComConta(conciliacao, { transaction });

    const valor = roundCurrency(Math.abs(Number(conciliacao.valor || 0)));
    if (valor <= 0) {
      throw createHttpError(400, 'Valor do lancamento bancario invalido para transferencia.');
    }

    const isSaidaDaContaAtual = Number(conciliacao.valor || 0) < 0;
    const payloadTransferencia = {
      conta_origem_id: isSaidaDaContaAtual ? contaAtualId : contaContraparteId,
      conta_destino_id: isSaidaDaContaAtual ? contaContraparteId : contaAtualId,
      tipo_transferencia: payload.tipo_transferencia,
      data_transferencia: conciliacao.data_movimento,
      valor,
      descricao: payload.descricao || `Transferencia conciliada pelo lancamento bancario #${conciliacao.id}`,
      tipo_intercompany: payload.tipo_intercompany || null,
      motivo_intercompany: payload.motivo_intercompany || null,
      elimina_consolidado: payload.elimina_consolidado === false ? false : true,
      conciliacao_origem_id: isSaidaDaContaAtual ? conciliacao.id : null,
      conciliacao_destino_id: isSaidaDaContaAtual ? null : conciliacao.id
    };

    const { transferencia, afterCommit } = await criarTransferenciaFinanceira(
      req,
      payloadTransferencia,
      { transaction }
    );

    await conciliacao.update({
      transferencia_financeira_id: transferencia.id,
      movimento_financeiro_id: null,
      titulo_financeiro_id: null,
      fatura_cartao_id: null,
      status: 'CONCILIADO',
      confirmado_por: req.user?.id || null,
      confirmado_em: new Date()
    }, { transaction });

    await transaction.commit();
    if (afterCommit) await afterCommit();

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_BANK_RECONCILED_TRANSFER',
      recursoTipo: 'CONCILIACAO_BANCARIA',
      recursoId: conciliacao.id,
      status: 'SUCCESS',
      descricao: 'Lancamento bancario conciliado como transferencia entre contas',
      metadata: {
        transferencia_financeira_id: transferencia.id,
        conta_origem_id: payloadTransferencia.conta_origem_id,
        conta_destino_id: payloadTransferencia.conta_destino_id,
        empresa_origem_id: transferencia.empresa_origem_id,
        empresa_destino_id: transferencia.empresa_destino_id,
        tipo_intercompany: transferencia.tipo_intercompany,
        elimina_consolidado: transferencia.elimina_consolidado,
        valor
      }
    });

    return loadConciliacaoById(req, conciliacao.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function confirmarConciliacaoTarifa(req, conciliacaoId, payload = {}) {
  await assertFinanceAccess(req);

  const codigoTarifa = normalizeConfigCode(payload.codigo);
  if (!codigoTarifa) {
    throw createHttpError(400, 'Selecione a tarifa bancaria.');
  }

  const atalhos = await listarTarifasBancariasConfig(req);
  const tarifa = atalhos.find((item) => normalizeConfigCode(item.codigo) === codigoTarifa && item.ativo !== false);
  if (!tarifa) {
    throw createHttpError(400, 'Tarifa bancaria inativa ou nao configurada.');
  }

  const transaction = await sequelize.transaction();
  try {
    const conciliacao = await ConciliacaoBancaria.findByPk(conciliacaoId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!conciliacao) throw createHttpError(404, 'Lancamento de conciliacao nao encontrado.');
    if (String(conciliacao.status || '').toUpperCase() !== 'PENDENTE') {
      throw createHttpError(400, 'Somente conciliacoes pendentes podem ser confirmadas.');
    }

    const valorBanco = Number(conciliacao.valor || 0);
    if (valorBanco >= 0) {
      throw createHttpError(400, 'Tarifas bancarias devem ser conciliadas em lancamentos de saida da conta.');
    }

    const { conta, empresaId: empresaConciliacaoId } = await validarEmpresaConciliacaoComConta(conciliacao, { transaction });

    const valor = roundCurrency(Math.abs(valorBanco));
    if (valor <= 0) {
      throw createHttpError(400, 'Valor do lancamento bancario invalido para tarifa.');
    }
    const categoriaId = Number(tarifa.categoria_financeira_id || 0);
    if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
      throw createHttpError(400, 'Configure uma categoria financeira para este atalho de tarifa bancaria antes de conciliar.');
    }
    const categoria = await CategoriaFinanceira.findByPk(categoriaId, { transaction });
    if (!categoria) {
      throw createHttpError(400, 'Categoria financeira configurada para a tarifa bancaria nao foi encontrada.');
    }
    const tipoCategoria = String(categoria.tipo || '').trim().toUpperCase();
    if (!['PAGAR', 'AMBOS'].includes(tipoCategoria)) {
      throw createHttpError(400, 'Categoria financeira da tarifa bancaria deve ser do tipo PAGAR ou AMBOS.');
    }
    if (categoria.ativo === false) {
      throw createHttpError(400, 'Categoria financeira da tarifa bancaria esta inativa.');
    }
    if (categoria.considera_dre === false || !String(categoria.dre_grupo || '').trim()) {
      throw createHttpError(400, 'Categoria financeira da tarifa bancaria precisa estar classificada para DRE.');
    }
    const classificacaoGerencial = String(categoria.classificacao_gerencial || '').trim().toUpperCase();
    if (['ENDIVIDAMENTO', 'INVESTIMENTO', 'PATRIMONIAL', 'INTERCOMPANY', 'TRANSFERENCIA_INTERNA'].includes(classificacaoGerencial)) {
      throw createHttpError(400, 'Categoria financeira da tarifa bancaria nao pode ser endividamento, investimento, patrimonial, entre empresas ou transferencia interna.');
    }

    const sessao = await obterSessaoAbertaParaConta(conta, conciliacao.data_movimento, { transaction });
    const descricao = String(payload.descricao || conciliacao.descricao_banco || tarifa.nome || '').trim().slice(0, 255);
    const movimento = await MovimentoFinanceiro.create({
      titulo_financeiro_id: null,
      categoria_financeira_id: categoria.id,
      conta_bancaria_id: conta.id,
      empresa_id: empresaConciliacaoId,
      caixa_sessao_id: sessao?.id || null,
      tipo_movimento: 'TARIFA_BANCARIA',
      status: 'ATIVO',
      valor,
      juros: 0,
      multa: 0,
      desconto: 0,
      valor_quitacao: valor,
      data_movimento: conciliacao.data_movimento,
      documento_referencia: conciliacao.documento || tarifa.codigo,
      observacoes: `[${tarifa.codigo}] ${descricao || tarifa.nome}`,
      criado_por: req.user?.id || null
    }, { transaction });

    await conciliacao.update({
      transferencia_financeira_id: null,
      movimento_financeiro_id: movimento.id,
      titulo_financeiro_id: null,
      fatura_cartao_id: null,
      caixa_sessao_id: sessao?.id || null,
      status: 'CONCILIADO',
      confirmado_por: req.user?.id || null,
      confirmado_em: new Date()
    }, { transaction });

    await transaction.commit();

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_BANK_RECONCILED_FEE',
      recursoTipo: 'CONCILIACAO_BANCARIA',
      recursoId: conciliacao.id,
      status: 'SUCCESS',
      descricao: 'Lancamento bancario conciliado como tarifa bancaria',
      metadata: {
        movimento_financeiro_id: movimento.id,
        conta_bancaria_id: conta.id,
        categoria_financeira_id: categoria.id,
        codigo_tarifa: tarifa.codigo,
        valor
      }
    });

    return loadConciliacaoById(req, conciliacao.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function finalizarConciliacao(req, conciliacao, movimento, { batch = false } = {}) {
  await conciliacao.update({
    movimento_financeiro_id: movimento.id,
    titulo_financeiro_id: movimento.titulo?.id || null,
    status: 'CONCILIADO',
    confirmado_por: req.user?.id || null,
    confirmado_em: new Date()
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: batch ? 'FINANCIAL_BANK_RECONCILED_BATCH' : 'FINANCIAL_BANK_RECONCILED',
    recursoTipo: 'CONCILIACAO_BANCARIA',
    recursoId: conciliacao.id,
    status: 'SUCCESS',
    descricao: batch
      ? 'Lancamento bancario conciliado em lote a partir de sugestao'
      : 'Lancamento bancario conciliado manualmente',
    metadata: {
      movimento_financeiro_id: movimento.id,
      titulo_financeiro_id: movimento.titulo?.id || null
    }
  });
}

async function confirmarConciliacao(req, conciliacaoId, payload = {}) {
  const conciliacao = await loadConciliacaoById(req, conciliacaoId);
  if (String(conciliacao.status || '').toUpperCase() !== 'PENDENTE') {
    throw createHttpError(400, 'Somente conciliacoes pendentes podem ser confirmadas.');
  }

  const movimento = await resolveMovimentoForConciliacao(req, conciliacao, payload.movimento_financeiro_id);
  await finalizarConciliacao(req, conciliacao, movimento);

  return loadConciliacaoById(req, conciliacao.id);
}

async function criarTituloEConciliar(req, conciliacaoId, payload = {}) {
  await assertFinanceAccess(req);

  const transaction = await sequelize.transaction();
  try {
    const conciliacao = await ConciliacaoBancaria.findByPk(conciliacaoId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!conciliacao) {
      throw createHttpError(404, 'Lancamento de conciliacao nao encontrado.');
    }

    if (String(conciliacao.status || '').toUpperCase() !== 'PENDENTE') {
      throw createHttpError(400, 'Somente conciliacoes pendentes podem receber criacao rapida de titulo.');
    }

    const tipoEsperado = getSignalByValue(conciliacao.valor);
    const tipoPayload = String(payload.tipo || '').trim().toUpperCase();
    if (tipoPayload && tipoPayload !== tipoEsperado) {
      throw createHttpError(400, 'O tipo do titulo nao e compativel com o sinal do lancamento bancario.');
    }

    const valorConciliacao = roundCurrency(Math.abs(Number(conciliacao.valor || 0)));
    const valorPayload = roundCurrency(payload.valor);
    if (Math.abs(valorPayload - valorConciliacao) > 0.1) {
      throw createHttpError(400, 'O valor informado deve ser igual ao valor do lancamento bancario para este fluxo rapido.');
    }

    const contaConciliacaoId = Number(conciliacao.conta_bancaria_id || 0);
    const contaPayloadId = Number(payload.conta_bancaria_id || 0);
    if (contaPayloadId && contaPayloadId !== contaConciliacaoId) {
      throw createHttpError(400, 'A conta bancaria do titulo rapido deve ser a mesma conta do lancamento conciliado.');
    }

    const { titulo, movimento, afterCommit } = await criarTituloManualComBaixaAtomica(
      req,
      {
        ...payload,
        tipo: tipoEsperado,
        valor: valorConciliacao,
        conta_bancaria_id: contaConciliacaoId
      },
      { transaction }
    );

    await conciliacao.update({
      movimento_financeiro_id: movimento.id,
      titulo_financeiro_id: titulo.id,
      status: 'CONCILIADO',
      confirmado_por: req.user?.id || null,
      confirmado_em: new Date()
    }, { transaction });

    await transaction.commit();

    if (afterCommit) {
      await afterCommit();
    }

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_BANK_RECONCILED',
      recursoTipo: 'CONCILIACAO_BANCARIA',
      recursoId: conciliacao.id,
      status: 'SUCCESS',
      descricao: 'Lancamento bancario conciliado manualmente via criacao rapida de titulo',
      metadata: {
        movimento_financeiro_id: movimento.id,
        titulo_financeiro_id: titulo.id
      }
    });

    return {
      conciliacao: await loadConciliacaoById(req, conciliacao.id),
      titulo_financeiro_id: titulo.id,
      movimento_financeiro_id: movimento.id
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function conciliarSugeridos(req, filters = {}) {
  await assertFinanceAccess(req);

  const where = buildConciliacaoWhere(filters, { forcePending: true });
  const conciliacoes = await ConciliacaoBancaria.findAll({
    where,
    order: [['data_movimento', 'DESC'], ['createdAt', 'DESC']]
  });

  const resumo = {
    total_avaliadas: conciliacoes.length,
    total_conciliadas: 0,
    sem_sugestao: 0,
    associacao_manual: 0,
    falhas: 0
  };
  const erros = [];

  for (const conciliacao of conciliacoes) {
    const analise = await analyzeSuggestions(req, conciliacao, { maxSuggestions: 5 });

    if (!analise.sugestoes.length) {
      resumo.sem_sugestao += 1;
      continue;
    }

    if (!analise.conciliacao_em_lote_disponivel || !analise.sugestao_automatica) {
      resumo.associacao_manual += 1;
      continue;
    }

    try {
      const movimento = await resolveMovimentoForConciliacao(
        req,
        conciliacao,
        analise.sugestao_automatica.movimento_financeiro_id
      );
      await finalizarConciliacao(req, conciliacao, movimento, { batch: true });
      resumo.total_conciliadas += 1;
    } catch (error) {
      resumo.falhas += 1;
      erros.push({
        conciliacao_id: conciliacao.id,
        mensagem: error?.message || 'Erro ao conciliar em lote'
      });
    }
  }

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_BANK_RECONCILIATION_BATCH_EXECUTED',
    recursoTipo: 'CONCILIACAO_BANCARIA',
    recursoId: where.conta_bancaria_id || 'FILTRO',
    status: 'SUCCESS',
    descricao: 'Execucao de conciliacao em lote por sugestoes',
    metadata: resumo
  });

  return {
    resumo,
    erros
  };
}

async function listarMovimentosAssociacao(req, conciliacaoId, filters = {}) {
  const conciliacao = await loadConciliacaoById(req, conciliacaoId);

  const items = await queryMovimentoCandidates(req, conciliacao, filters);
  const ranked = items
    .map((item) => ({
      item,
      ranking: scoreSuggestion(conciliacao, item)
    }))
    .sort((a, b) => {
      if (b.ranking.score !== a.ranking.score) {
        return b.ranking.score - a.ranking.score;
      }
      return String(b.item.data_movimento || '').localeCompare(String(a.item.data_movimento || ''));
    });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_BANK_RECONCILIATION_SEARCH',
    recursoTipo: 'CONCILIACAO_BANCARIA',
    recursoId: conciliacao.id,
    status: 'SUCCESS',
    descricao: 'Consulta de movimentos para associacao manual na conciliacao bancaria',
    metadata: {
      total_encontrados: ranked.length
    }
  });

  return {
    conciliacao: {
      id: conciliacao.id,
      conta_bancaria_id: conciliacao.conta_bancaria_id,
      conta_bancaria_nome: conciliacao.contaBancaria?.nome || '-',
      data_movimento: conciliacao.data_movimento,
      valor: Number(conciliacao.valor || 0),
      documento: conciliacao.documento,
      descricao_banco: conciliacao.descricao_banco
    },
    meta: {
      total: ranked.length,
      limit: normalizeSearchLimit(filters.limit, 30)
    },
    itens: ranked.map((entry) => serializeSuggestion(entry.item, entry.ranking))
  };
}

async function ignorarConciliacao(req, conciliacaoId) {
  const conciliacao = await loadConciliacaoById(req, conciliacaoId);
  if (String(conciliacao.status || '').toUpperCase() !== 'PENDENTE') {
    throw createHttpError(400, 'Somente conciliacoes pendentes podem ser ignoradas.');
  }

  await conciliacao.update({
    status: 'IGNORADO',
    confirmado_por: req.user?.id || null,
    confirmado_em: new Date()
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_BANK_RECONCILIATION_IGNORED',
    recursoTipo: 'CONCILIACAO_BANCARIA',
    recursoId: conciliacao.id,
    status: 'SUCCESS',
    descricao: 'Lancamento bancario marcado como ignorado'
  });

  return loadConciliacaoById(req, conciliacao.id);
}

module.exports = {
  conciliarSugeridos,
  confirmarConciliacao,
  confirmarConciliacaoFatura,
  confirmarConciliacaoTarifa,
  confirmarConciliacaoTransferencia,
  criarTituloEConciliar,
  ignorarConciliacao,
  importOfx,
  listarImportacoes,
  listarConciliacoes,
  listarFaturasAssociacao,
  listarMovimentosAssociacao,
  parseOfxTransactions
};
