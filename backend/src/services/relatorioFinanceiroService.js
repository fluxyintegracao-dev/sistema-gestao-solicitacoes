const { Op, col, where: sequelizeWhere } = require('sequelize');
const {
  CategoriaFinanceira,
  ContaBancaria,
  EmpresaGrupo,
  MovimentoFinanceiro,
  Obra,
  Parceiro,
  User,
  TituloFinanceiro
} = require('../models');
const {
  canAccessFinanceiro,
  getFinanceiroObraScopeIds
} = require('./authorizationService');
const { registrarEventoSeguranca } = require('./securityLogService');
const { isCategoriaRedutora } = require('../constants/dreCategorias');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDateOnly(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateOnly(dateString) {
  const [year, month, day] = String(dateString || '')
    .split('-')
    .map((value) => Number(value));

  return new Date(year, (month || 1) - 1, day || 1);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function diffInDays(start, end) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000));
}

function formatBucketLabel(date, agrupamento) {
  if (agrupamento === 'MES') {
    return `${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

function getHoje() {
  return toDateOnly(new Date());
}

function getPeriodoDescricao(periodo, inicio, fim) {
  switch (periodo) {
    case 'HOJE':
      return 'Hoje';
    case '7_DIAS':
      return 'Proximos 7 dias';
    case '30_DIAS':
      return 'Proximos 30 dias';
    case '90_DIAS':
      return 'Proximos 90 dias';
    case 'MES_ATUAL':
      return 'Mes atual';
    case 'PROXIMO_MES':
      return 'Proximo mes';
    default:
      return `${inicio} ate ${fim}`;
  }
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
    recursoTipo: 'FINANCEIRO_RELATORIO',
    recursoId: req.originalUrl,
    status: 'DENIED',
    descricao: 'Usuario sem permissao para acessar relatorios financeiros'
  });

  throw createHttpError(403, 'Acesso negado para o modulo financeiro');
}

async function resolveObraScope(req, obraId) {
  await assertFinanceAccess(req);

  const obrasPermitidas = await getFinanceiroObraScopeIds(req.user);
  if (obrasPermitidas === null) {
    return obraId ? { obra_id: Number(obraId) } : {};
  }

  if (!obrasPermitidas.length) {
    if (obraId) {
      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'AUTHZ_DENIED',
        recursoTipo: 'FINANCEIRO_RELATORIO',
        recursoId: String(obraId),
        status: 'DENIED',
        descricao: 'Usuario tentou acessar relatorio financeiro sem vinculo de obra',
        metadata: {
          obra_id: Number(obraId) || null
        }
      });
      throw createHttpError(403, 'Acesso negado para esta obra');
    }

    return null;
  }

  if (obraId) {
    const obraIdNumber = Number(obraId);
    if (!obrasPermitidas.includes(obraIdNumber)) {
      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'AUTHZ_DENIED',
        recursoTipo: 'FINANCEIRO_RELATORIO',
        recursoId: String(obraIdNumber),
        status: 'DENIED',
        descricao: 'Usuario tentou acessar relatorio financeiro fora do seu escopo de obra',
        metadata: {
          obra_id: obraIdNumber
        }
      });
      throw createHttpError(403, 'Acesso negado para esta obra');
    }

    return { obra_id: obraIdNumber };
  }

  return {
    obra_id: {
      [Op.in]: obrasPermitidas
    }
  };
}

function resolvePeriodo(filters = {}) {
  const hoje = parseDateOnly(getHoje());
  const preset = String(filters.periodo || '').trim().toUpperCase();
  const hasCustomDates = Boolean(filters.data_inicial && filters.data_final);
  const periodo = hasCustomDates ? 'PERSONALIZADO' : (preset || 'MES_ATUAL');
  let inicio;
  let fim;

  if (periodo === 'PERSONALIZADO') {
    if (!filters.data_inicial || !filters.data_final) {
      throw createHttpError(400, 'Informe data inicial e data final para o periodo personalizado.');
    }

    inicio = parseDateOnly(filters.data_inicial);
    fim = parseDateOnly(filters.data_final);
  } else if (periodo === 'HOJE') {
    inicio = hoje;
    fim = hoje;
  } else if (periodo === '7_DIAS') {
    inicio = hoje;
    fim = addDays(hoje, 6);
  } else if (periodo === '30_DIAS') {
    inicio = hoje;
    fim = addDays(hoje, 29);
  } else if (periodo === '90_DIAS') {
    inicio = hoje;
    fim = addDays(hoje, 89);
  } else if (periodo === 'PROXIMO_MES') {
    inicio = startOfMonth(addMonths(hoje, 1));
    fim = endOfMonth(inicio);
  } else {
    inicio = startOfMonth(hoje);
    fim = endOfMonth(hoje);
  }

  const intervaloDias = diffInDays(inicio, fim);
  if (intervaloDias < 0) {
    throw createHttpError(400, 'Data inicial nao pode ser maior que a data final.');
  }

  if (intervaloDias > 366) {
    throw createHttpError(400, 'O periodo maximo do relatorio deve ser de ate 366 dias.');
  }

  const agrupamento = intervaloDias > 62 ? 'MES' : 'DIA';

  return {
    periodo,
    data_inicial: toDateOnly(inicio),
    data_final: toDateOnly(fim),
    descricao: getPeriodoDescricao(periodo, toDateOnly(inicio), toDateOnly(fim)),
    agrupamento
  };
}

function createBuckets(periodo) {
  const buckets = [];
  const start = parseDateOnly(periodo.data_inicial);
  const end = parseDateOnly(periodo.data_final);

  if (periodo.agrupamento === 'MES') {
    let cursor = startOfMonth(start);
    const endCursor = startOfMonth(end);

    while (cursor <= endCursor) {
      const key = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`;
      buckets.push({
        key,
        referencia: key,
        label: formatBucketLabel(cursor, 'MES'),
        entradas_previstas: 0,
        saidas_previstas: 0,
        saldo_previsto: 0,
        saldo_previsto_acumulado: 0,
        entradas_realizadas: 0,
        saidas_realizadas: 0,
        juros_realizados: 0,
        multa_realizada: 0,
        desconto_realizado: 0,
        saldo_realizado: 0,
        saldo_realizado_acumulado: 0
      });
      cursor = addMonths(cursor, 1);
    }

    return buckets;
  }

  let cursor = start;
  while (cursor <= end) {
    const key = toDateOnly(cursor);
    buckets.push({
      key,
      referencia: key,
      label: formatBucketLabel(cursor, 'DIA'),
      entradas_previstas: 0,
      saidas_previstas: 0,
      saldo_previsto: 0,
      saldo_previsto_acumulado: 0,
      entradas_realizadas: 0,
      saidas_realizadas: 0,
      juros_realizados: 0,
      multa_realizada: 0,
      desconto_realizado: 0,
      saldo_realizado: 0,
      saldo_realizado_acumulado: 0
    });
    cursor = addDays(cursor, 1);
  }

  return buckets;
}

function getBucketKey(dateString, agrupamento) {
  if (agrupamento === 'MES') {
    const date = parseDateOnly(dateString);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  return String(dateString);
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

async function carregarTitulosPrevistos(periodo, obraWhere) {
  if (obraWhere === null) {
    return [];
  }

  const where = {
    status: {
      [Op.in]: ['ABERTO', 'PARCIAL']
    },
    valor_saldo: {
      [Op.gt]: 0
    },
    data_vencimento: {
      [Op.between]: [periodo.data_inicial, periodo.data_final]
    },
    ...obraWhere
  };

  return TituloFinanceiro.findAll({
    attributes: ['id', 'tipo', 'data_vencimento', 'valor_saldo'],
    where,
    raw: true
  });
}

async function carregarMovimentosRealizados(periodo, obraWhere) {
  if (obraWhere === null) {
    return [];
  }

  const tituloWhere = obraWhere && obraWhere.obra_id ? { obra_id: obraWhere.obra_id } : undefined;

  return MovimentoFinanceiro.findAll({
    attributes: ['id', 'data_movimento', 'valor_quitacao', 'juros', 'multa', 'desconto'],
    where: {
      status: 'ATIVO',
      data_movimento: {
        [Op.between]: [periodo.data_inicial, periodo.data_final]
      }
    },
    include: [
      {
        model: TituloFinanceiro,
        as: 'titulo',
        attributes: ['id', 'tipo'],
        required: true,
        where: tituloWhere
      }
    ],
    raw: false
  });
}

function acumularSerie({ buckets, previstos, realizados, agrupamento }) {
  const bucketsMap = new Map(buckets.map((item) => [item.key, item]));

  previstos.forEach((item) => {
    const key = getBucketKey(item.data_vencimento, agrupamento);
    const bucket = bucketsMap.get(key);
    if (!bucket) {
      return;
    }

    const valor = roundCurrency(item.valor_saldo);
    if (String(item.tipo || '').toUpperCase() === 'RECEBER') {
      bucket.entradas_previstas = roundCurrency(bucket.entradas_previstas + valor);
    } else {
      bucket.saidas_previstas = roundCurrency(bucket.saidas_previstas + valor);
    }
  });

  realizados.forEach((item) => {
    const key = getBucketKey(item.data_movimento, agrupamento);
    const bucket = bucketsMap.get(key);
    if (!bucket) {
      return;
    }

    const valor = roundCurrency(item.valor_quitacao);
    const juros = roundCurrency(item.juros);
    const multa = roundCurrency(item.multa);
    const desconto = roundCurrency(item.desconto);
    if (String(item.titulo?.tipo || '').toUpperCase() === 'RECEBER') {
      bucket.entradas_realizadas = roundCurrency(bucket.entradas_realizadas + valor);
    } else {
      bucket.saidas_realizadas = roundCurrency(bucket.saidas_realizadas + valor);
    }

    bucket.juros_realizados = roundCurrency(bucket.juros_realizados + juros);
    bucket.multa_realizada = roundCurrency(bucket.multa_realizada + multa);
    bucket.desconto_realizado = roundCurrency(bucket.desconto_realizado + desconto);
  });

  let saldoPrevistoAcumulado = 0;
  let saldoRealizadoAcumulado = 0;

  buckets.forEach((bucket) => {
    bucket.saldo_previsto = roundCurrency(bucket.entradas_previstas - bucket.saidas_previstas);
    bucket.saldo_realizado = roundCurrency(bucket.entradas_realizadas - bucket.saidas_realizadas);
    saldoPrevistoAcumulado = roundCurrency(saldoPrevistoAcumulado + bucket.saldo_previsto);
    saldoRealizadoAcumulado = roundCurrency(saldoRealizadoAcumulado + bucket.saldo_realizado);
    bucket.saldo_previsto_acumulado = saldoPrevistoAcumulado;
    bucket.saldo_realizado_acumulado = saldoRealizadoAcumulado;
  });

  return buckets;
}

function montarResumo({ previstos, realizados, serie }) {
  const resumo = {
    entradas_previstas: 0,
    saidas_previstas: 0,
    saldo_previsto: 0,
    entradas_realizadas: 0,
    saidas_realizadas: 0,
    juros_realizados: 0,
    multa_realizada: 0,
    desconto_realizado: 0,
    saldo_realizado: 0,
    titulos_previstos: previstos.length,
    movimentos_realizados: realizados.length
  };

  serie.forEach((item) => {
    resumo.entradas_previstas = roundCurrency(resumo.entradas_previstas + item.entradas_previstas);
    resumo.saidas_previstas = roundCurrency(resumo.saidas_previstas + item.saidas_previstas);
    resumo.entradas_realizadas = roundCurrency(resumo.entradas_realizadas + item.entradas_realizadas);
    resumo.saidas_realizadas = roundCurrency(resumo.saidas_realizadas + item.saidas_realizadas);
    resumo.juros_realizados = roundCurrency(resumo.juros_realizados + item.juros_realizados);
    resumo.multa_realizada = roundCurrency(resumo.multa_realizada + item.multa_realizada);
    resumo.desconto_realizado = roundCurrency(resumo.desconto_realizado + item.desconto_realizado);
  });

  resumo.saldo_previsto = roundCurrency(resumo.entradas_previstas - resumo.saidas_previstas);
  resumo.saldo_realizado = roundCurrency(resumo.entradas_realizadas - resumo.saidas_realizadas);
  resumo.variacao_realizado_vs_previsto = roundCurrency(resumo.saldo_realizado - resumo.saldo_previsto);

  return resumo;
}

async function gerarRelatorioFluxoCaixa(req, filters = {}) {
  const periodo = resolvePeriodo(filters);
  const obraWhere = await resolveObraScope(req, filters.obra_id);
  const [previstos, realizados] = await Promise.all([
    carregarTitulosPrevistos(periodo, obraWhere),
    carregarMovimentosRealizados(periodo, obraWhere)
  ]);

  const serie = acumularSerie({
    buckets: createBuckets(periodo),
    previstos,
    realizados,
    agrupamento: periodo.agrupamento
  });

  return {
    filtro: {
      periodo: periodo.periodo,
      descricao: periodo.descricao,
      data_inicial: periodo.data_inicial,
      data_final: periodo.data_final,
      agrupamento: periodo.agrupamento,
      obra_id: filters.obra_id ? Number(filters.obra_id) : null
    },
    resumo: montarResumo({
      previstos,
      realizados,
      serie
    }),
    serie
  };
}

async function gerarRelatorioAnalitico(req, filters = {}) {
  const obraWhere = await resolveObraScope(req, filters.obra_id);
  if (obraWhere === null) {
    return {
      filtros: filters,
      resumo: {
        quantidade_linhas: 0,
        titulos: 0,
        movimentos: 0,
        total_original: 0,
        total_saldo: 0,
        total_baixado: 0,
        total_quitacao: 0,
        total_juros: 0,
        total_multa: 0,
        total_desconto: 0
      },
      linhas: []
    };
  }

  const tituloWhere = {
    ...obraWhere
  };
  const movimentoWhere = {};

  if (filters.tipo) {
    tituloWhere.tipo = filters.tipo;
  }
  if (filters.status_titulo) {
    tituloWhere.status = filters.status_titulo;
  }
  if (filters.parceiro_id) {
    tituloWhere.parceiro_id = Number(filters.parceiro_id);
  }
  if (filters.categoria_financeira_id) {
    tituloWhere.categoria_financeira_id = Number(filters.categoria_financeira_id);
  }
  if (filters.vencimento_inicial || filters.vencimento_final) {
    tituloWhere.data_vencimento = {};
    if (filters.vencimento_inicial) {
      tituloWhere.data_vencimento[Op.gte] = filters.vencimento_inicial;
    }
    if (filters.vencimento_final) {
      tituloWhere.data_vencimento[Op.lte] = filters.vencimento_final;
    }
  }
  if (filters.q) {
    const term = String(filters.q).trim();
    tituloWhere[Op.or] = [
      { codigo: { [Op.like]: `%${term}%` } },
      { descricao: { [Op.like]: `%${term}%` } },
      { numero_documento: { [Op.like]: `%${term}%` } },
      { '$parceiro.nome$': { [Op.like]: `%${term}%` } },
      { '$parceiro.cpf_cnpj$': { [Op.like]: `%${term}%` } },
      { '$obra.nome$': { [Op.like]: `%${term}%` } },
      { '$obra.codigo$': { [Op.like]: `%${term}%` } }
    ];
  }

  const statusMovimento = String(filters.status_movimento || 'TODOS').toUpperCase();
  const buscarSemBaixa = statusMovimento === 'SEM_BAIXA';
  if (statusMovimento && !['TODOS', 'SEM_BAIXA'].includes(statusMovimento)) {
    movimentoWhere.status = statusMovimento;
  }
  if (filters.conta_bancaria_id) {
    movimentoWhere.conta_bancaria_id = Number(filters.conta_bancaria_id);
  }
  if (filters.data_inicial || filters.data_final) {
    movimentoWhere.data_movimento = {};
    if (filters.data_inicial) {
      movimentoWhere.data_movimento[Op.gte] = filters.data_inicial;
    }
    if (filters.data_final) {
      movimentoWhere.data_movimento[Op.lte] = filters.data_final;
    }
  }

  const hasMovimentoFilter = Object.keys(movimentoWhere).length > 0;
  const titulos = await TituloFinanceiro.findAll({
    where: tituloWhere,
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'nome', 'codigo']
      },
      {
        model: Parceiro,
        as: 'parceiro',
        attributes: ['id', 'nome', 'cpf_cnpj']
      },
      {
        model: CategoriaFinanceira,
        as: 'categoriaFinanceira',
        attributes: ['id', 'nome', 'tipo']
      },
      {
        model: MovimentoFinanceiro,
        as: 'movimentos',
        required: hasMovimentoFilter && !buscarSemBaixa,
        where: hasMovimentoFilter && !buscarSemBaixa ? movimentoWhere : undefined,
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
          }
        ]
      }
    ],
    order: [
      ['data_vencimento', 'ASC'],
      ['createdAt', 'DESC'],
      [{ model: MovimentoFinanceiro, as: 'movimentos' }, 'data_movimento', 'DESC']
    ],
    limit: Number(filters.limit || 500),
    subQuery: false
  });

  const linhas = [];
  const tituloIds = new Set();
  let movimentos = 0;
  let totalOriginal = 0;
  let totalSaldo = 0;
  let totalBaixado = 0;
  let totalQuitacao = 0;
  let totalJuros = 0;
  let totalMulta = 0;
  let totalDesconto = 0;

  titulos.forEach((tituloInstance) => {
    const titulo = typeof tituloInstance.toJSON === 'function' ? tituloInstance.toJSON() : tituloInstance;
    const movimentosOriginais = Array.isArray(titulo.movimentos) ? titulo.movimentos : [];
    if (buscarSemBaixa && movimentosOriginais.length > 0) {
      return;
    }

    const movimentosFiltrados = movimentosOriginais.filter((movimento) => {
      if (buscarSemBaixa) return false;
      if (!hasMovimentoFilter) return true;
      if (movimentoWhere.status && String(movimento.status || '').toUpperCase() !== movimentoWhere.status) return false;
      if (movimentoWhere.conta_bancaria_id && Number(movimento.conta_bancaria_id) !== Number(movimentoWhere.conta_bancaria_id)) return false;
      if (movimentoWhere.data_movimento?.[Op.gte] && movimento.data_movimento < movimentoWhere.data_movimento[Op.gte]) return false;
      if (movimentoWhere.data_movimento?.[Op.lte] && movimento.data_movimento > movimentoWhere.data_movimento[Op.lte]) return false;
      return true;
    });

    tituloIds.add(titulo.id);
    totalOriginal = roundCurrency(totalOriginal + Number(titulo.valor_original || 0));
    totalSaldo = roundCurrency(totalSaldo + Number(titulo.valor_saldo || 0));
    totalBaixado = roundCurrency(totalBaixado + Number(titulo.valor_baixado || 0));

    if (!movimentosFiltrados.length) {
      if (hasMovimentoFilter && !buscarSemBaixa) {
        return;
      }

      linhas.push({
        id: `titulo-${titulo.id}`,
        titulo_id: titulo.id,
        titulo_codigo: titulo.codigo,
        tipo: titulo.tipo,
        status_titulo: titulo.status,
        numero_documento: titulo.numero_documento,
        descricao: titulo.descricao,
        parceiro_nome: titulo.parceiro?.nome || null,
        parceiro_cpf_cnpj: titulo.parceiro?.cpf_cnpj || null,
        obra_nome: titulo.obra?.nome || null,
        obra_codigo: titulo.obra?.codigo || null,
        categoria_nome: titulo.categoriaFinanceira?.nome || null,
        data_emissao: titulo.data_emissao,
        data_vencimento: titulo.data_vencimento,
        data_movimento: null,
        conta_bancaria_nome: null,
        valor_original: Number(titulo.valor_original || 0),
        valor_saldo: Number(titulo.valor_saldo || 0),
        valor_baixado: Number(titulo.valor_baixado || 0),
        movimento_id: null,
        status_movimento: 'SEM_BAIXA',
        valor_movimento: 0,
        juros: 0,
        multa: 0,
        desconto: 0,
        valor_quitacao: 0,
        usuario_baixa: null,
        origem: titulo.solicitacao_id ? 'SOLICITACAO' : 'MANUAL'
      });
      return;
    }

    movimentosFiltrados.forEach((movimento) => {
      movimentos += 1;
      totalQuitacao = roundCurrency(totalQuitacao + Number(movimento.valor_quitacao || 0));
      totalJuros = roundCurrency(totalJuros + Number(movimento.juros || 0));
      totalMulta = roundCurrency(totalMulta + Number(movimento.multa || 0));
      totalDesconto = roundCurrency(totalDesconto + Number(movimento.desconto || 0));

      linhas.push({
        id: `movimento-${movimento.id}`,
        titulo_id: titulo.id,
        titulo_codigo: titulo.codigo,
        tipo: titulo.tipo,
        status_titulo: titulo.status,
        numero_documento: titulo.numero_documento,
        descricao: titulo.descricao,
        parceiro_nome: titulo.parceiro?.nome || null,
        parceiro_cpf_cnpj: titulo.parceiro?.cpf_cnpj || null,
        obra_nome: titulo.obra?.nome || null,
        obra_codigo: titulo.obra?.codigo || null,
        categoria_nome: titulo.categoriaFinanceira?.nome || null,
        data_emissao: titulo.data_emissao,
        data_vencimento: titulo.data_vencimento,
        data_movimento: movimento.data_movimento,
        conta_bancaria_nome: movimento.contaBancaria?.nome || null,
        valor_original: Number(titulo.valor_original || 0),
        valor_saldo: Number(titulo.valor_saldo || 0),
        valor_baixado: Number(titulo.valor_baixado || 0),
        movimento_id: movimento.id,
        status_movimento: movimento.status,
        valor_movimento: Number(movimento.valor || 0),
        juros: Number(movimento.juros || 0),
        multa: Number(movimento.multa || 0),
        desconto: Number(movimento.desconto || 0),
        valor_quitacao: Number(movimento.valor_quitacao || 0),
        usuario_baixa: movimento.criadoPor?.nome || null,
        origem: titulo.solicitacao_id ? 'SOLICITACAO' : 'MANUAL'
      });
    });
  });

  return {
    filtros: filters,
    resumo: {
      quantidade_linhas: linhas.length,
      titulos: tituloIds.size,
      movimentos,
      total_original: totalOriginal,
      total_saldo: totalSaldo,
      total_baixado: totalBaixado,
      total_quitacao: totalQuitacao,
      total_juros: totalJuros,
      total_multa: totalMulta,
      total_desconto: totalDesconto
    },
    linhas
  };
}

function getCompetenciaWhere(periodo) {
  return {
    [Op.or]: [
      { competencia_data: { [Op.between]: [periodo.data_inicial, periodo.data_final] } },
      {
        competencia_data: null,
        data_emissao: { [Op.between]: [periodo.data_inicial, periodo.data_final] }
      },
      {
        competencia_data: null,
        data_emissao: null,
        data_compra: { [Op.between]: [periodo.data_inicial, periodo.data_final] }
      },
      {
        competencia_data: null,
        data_emissao: null,
        data_compra: null,
        data_vencimento: { [Op.between]: [periodo.data_inicial, periodo.data_final] }
      }
    ]
  };
}

function getEmpresaIdsDaHolding(empresas = [], holdingId = null) {
  if (!holdingId) return null;

  const id = Number(holdingId);
  const ids = new Set([id]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const empresa of empresas) {
      if (empresa.holding_id && ids.has(Number(empresa.holding_id)) && !ids.has(Number(empresa.id))) {
        ids.add(Number(empresa.id));
        changed = true;
      }
    }
  }

  return Array.from(ids);
}

function getObraIncludeWhereFromTituloScope(tituloScope) {
  if (!tituloScope || !tituloScope.obra_id) {
    return {};
  }

  return {
    id: tituloScope.obra_id
  };
}

function emptyDreSummary() {
  const demonstrativo = buildDreDemonstrativo([]);

  return {
    resumo: {
      receitas: 0,
      despesas: 0,
      resultado: 0,
      margem_resultado: null,
      ...demonstrativo.metricas,
      empresas_com_movimento: 0,
      titulos_considerados: 0
    },
    linhas: [],
    demonstrativo: demonstrativo.linhas,
    empresas: []
  };
}

function getLinhaDre(titulo) {
  const categoria = titulo.categoriaFinanceira;
  const tipo = String(titulo.tipo || '').toUpperCase();
  const grupoCategoria = String(categoria?.dre_grupo || '').trim();

  if (grupoCategoria) {
    return {
      grupo: grupoCategoria,
      subgrupo: categoria?.dre_subgrupo || null,
      ordem: categoria?.dre_ordem ?? 999,
      considera_dre: categoria?.considera_dre !== false
    };
  }

  return tipo === 'RECEBER'
    ? { grupo: 'Receitas nao classificadas', subgrupo: null, ordem: 900, considera_dre: true }
    : { grupo: 'Custos e despesas nao classificados', subgrupo: null, ordem: 910, considera_dre: true };
}

function addToMap(map, key, seed, amount) {
  if (!map.has(key)) {
    map.set(key, { ...seed, valor: 0, titulos: 0 });
  }
  const item = map.get(key);
  item.valor += amount;
  item.titulos += 1;
  return item;
}

const DRE_NATUREZA_POR_GRUPO = {
  'Receita operacional bruta': 'receita_bruta',
  'Deducoes da receita bruta': 'deducoes_receita',
  'Custos das obras e servicos': 'custos',
  'Custos com pessoal': 'custos',
  'Custos com frota e equipamentos': 'custos',
  'Despesas comerciais': 'despesas_operacionais',
  'Despesas administrativas': 'despesas_operacionais',
  'Outras receitas operacionais': 'outras_operacionais',
  'Outras despesas operacionais': 'outras_operacionais',
  'Outras despesas': 'outras_operacionais',
  'Deducoes de custos e despesas': 'outras_operacionais',
  'Depreciacao e amortizacao': 'depreciacao_amortizacao',
  'Resultado financeiro': 'resultado_financeiro',
  'Impostos sobre o resultado': 'impostos_resultado',
  'Tributos e contribuicoes': 'outras_operacionais',
  'Receitas nao classificadas': 'outras_operacionais',
  'Custos e despesas nao classificados': 'outras_operacionais'
};

function getDreNatureza(linha = {}) {
  return DRE_NATUREZA_POR_GRUPO[String(linha.grupo || '').trim()] || 'outras_operacionais';
}

function sumDreNatureza(totais, naturezas = []) {
  return roundCurrency(naturezas.reduce((sum, natureza) => sum + Number(totais[natureza] || 0), 0));
}

function buildDreRow({ codigo, label, valor, tipo = 'grupo', ordem }) {
  return {
    codigo,
    label,
    valor: roundCurrency(valor),
    tipo,
    ordem
  };
}

function buildDreDemonstrativo(linhas = []) {
  const totais = {
    receita_bruta: 0,
    deducoes_receita: 0,
    custos: 0,
    despesas_operacionais: 0,
    outras_operacionais: 0,
    depreciacao_amortizacao: 0,
    resultado_financeiro: 0,
    impostos_resultado: 0
  };

  for (const linha of linhas) {
    const natureza = getDreNatureza(linha);
    totais[natureza] = roundCurrency(Number(totais[natureza] || 0) + Number(linha.valor || 0));
  }

  const receitaBruta = sumDreNatureza(totais, ['receita_bruta']);
  const deducoesReceita = sumDreNatureza(totais, ['deducoes_receita']);
  const receitaLiquida = roundCurrency(receitaBruta + deducoesReceita);
  const custos = sumDreNatureza(totais, ['custos']);
  const lucroBruto = roundCurrency(receitaLiquida + custos);
  const despesasOperacionais = sumDreNatureza(totais, ['despesas_operacionais']);
  const outrasOperacionais = sumDreNatureza(totais, ['outras_operacionais']);
  const ebitda = roundCurrency(lucroBruto + despesasOperacionais + outrasOperacionais);
  const depreciacaoAmortizacao = sumDreNatureza(totais, ['depreciacao_amortizacao']);
  const ebit = roundCurrency(ebitda + depreciacaoAmortizacao);
  const resultadoFinanceiro = sumDreNatureza(totais, ['resultado_financeiro']);
  const resultadoAntesImpostos = roundCurrency(ebit + resultadoFinanceiro);
  const impostosResultado = sumDreNatureza(totais, ['impostos_resultado']);
  const lucroPrejuizoLiquido = roundCurrency(resultadoAntesImpostos + impostosResultado);
  const margemEbitda = receitaLiquida > 0 ? Number(((ebitda / receitaLiquida) * 100).toFixed(2)) : null;
  const margemLiquida = receitaLiquida > 0 ? Number(((lucroPrejuizoLiquido / receitaLiquida) * 100).toFixed(2)) : null;

  return {
    linhas: [
      buildDreRow({ codigo: 'receita_bruta', label: 'Receita operacional bruta', valor: receitaBruta, ordem: 100 }),
      buildDreRow({ codigo: 'deducoes_receita', label: '(-) Deducoes da receita bruta', valor: deducoesReceita, ordem: 120 }),
      buildDreRow({ codigo: 'receita_liquida', label: '= Receita liquida', valor: receitaLiquida, tipo: 'subtotal', ordem: 190 }),
      buildDreRow({ codigo: 'custos', label: '(-) Custos diretos e operacionais', valor: custos, ordem: 200 }),
      buildDreRow({ codigo: 'lucro_bruto', label: '= Lucro bruto', valor: lucroBruto, tipo: 'subtotal', ordem: 290 }),
      buildDreRow({ codigo: 'despesas_operacionais', label: '(-) Despesas operacionais', valor: despesasOperacionais, ordem: 400 }),
      buildDreRow({ codigo: 'outras_operacionais', label: '+/- Outras receitas e despesas operacionais', valor: outrasOperacionais, ordem: 650 }),
      buildDreRow({ codigo: 'ebitda', label: '= EBITDA', valor: ebitda, tipo: 'subtotal', ordem: 690 }),
      buildDreRow({ codigo: 'depreciacao_amortizacao', label: '(-) Depreciacao e amortizacao', valor: depreciacaoAmortizacao, ordem: 695 }),
      buildDreRow({ codigo: 'ebit', label: '= Resultado operacional (EBIT)', valor: ebit, tipo: 'subtotal', ordem: 699 }),
      buildDreRow({ codigo: 'resultado_financeiro', label: '+/- Resultado financeiro', valor: resultadoFinanceiro, ordem: 700 }),
      buildDreRow({ codigo: 'resultado_antes_impostos', label: '= Resultado antes de IRPJ/CSLL', valor: resultadoAntesImpostos, tipo: 'subtotal', ordem: 790 }),
      buildDreRow({ codigo: 'impostos_resultado', label: '(-) IRPJ e CSLL', valor: impostosResultado, ordem: 850 }),
      buildDreRow({ codigo: 'lucro_prejuizo_liquido', label: '= Lucro/Prejuizo liquido', valor: lucroPrejuizoLiquido, tipo: 'total', ordem: 990 })
    ],
    metricas: {
      receita_bruta: receitaBruta,
      deducoes_receita: deducoesReceita,
      receita_liquida: receitaLiquida,
      custos,
      lucro_bruto: lucroBruto,
      despesas_operacionais: despesasOperacionais,
      outras_operacionais: outrasOperacionais,
      ebitda,
      depreciacao_amortizacao: depreciacaoAmortizacao,
      ebit,
      resultado_financeiro: resultadoFinanceiro,
      resultado_antes_impostos: resultadoAntesImpostos,
      impostos_resultado: impostosResultado,
      lucro_prejuizo_liquido: lucroPrejuizoLiquido,
      margem_ebitda: margemEbitda,
      margem_liquida: margemLiquida
    }
  };
}

function sortDreLinhas(linhas = []) {
  return Array.from(linhas).sort((a, b) => (
    Number(a.ordem || 999) - Number(b.ordem || 999) ||
    String(a.grupo).localeCompare(String(b.grupo)) ||
    String(a.subgrupo || '').localeCompare(String(b.subgrupo || ''))
  ));
}

function summarizeDreRows(titulos = [], empresas = []) {
  const empresasById = new Map(empresas.map((empresa) => [Number(empresa.id), empresa]));
  const linhasMap = new Map();
  const empresasMap = new Map();
  const empresaLinhasMaps = new Map();

  for (const titulo of titulos) {
    const linha = getLinhaDre(titulo);
    if (!linha.considera_dre || titulo.considera_dre === false) continue;

    const tipo = String(titulo.tipo || '').toUpperCase();
    const rawValue = Number(titulo.valor_original || 0);
    const baseSignedValue = tipo === 'RECEBER' ? rawValue : -rawValue;
    const signedValue = isCategoriaRedutora(titulo.categoriaFinanceira)
      ? baseSignedValue * -1
      : baseSignedValue;
    const empresaId = titulo.empresa_id ? Number(titulo.empresa_id) : null;
    const empresa = empresaId ? empresasById.get(empresaId) : null;
    const empresaKey = empresaId ? String(empresaId) : 'SEM_EMPRESA';

    const linhaKey = `${linha.grupo}::${linha.subgrupo || ''}`;
    addToMap(linhasMap, linhaKey, {
      linha_key: linhaKey,
      grupo: linha.grupo,
      subgrupo: linha.subgrupo,
      ordem: linha.ordem
    }, signedValue);

    if (!empresaLinhasMaps.has(empresaKey)) {
      empresaLinhasMaps.set(empresaKey, new Map());
    }
    addToMap(empresaLinhasMaps.get(empresaKey), linhaKey, {
      linha_key: linhaKey,
      grupo: linha.grupo,
      subgrupo: linha.subgrupo,
      ordem: linha.ordem
    }, signedValue);

    const empresaResumo = addToMap(empresasMap, empresaKey, {
      empresa_id: empresaId,
      empresa_nome: empresa?.nome || 'Sem empresa vinculada',
      tipo_empresa: empresa?.tipo_empresa || null,
      tipo_gerencial: empresa?.tipo_gerencial || null,
      empresa_caixa: empresa?.empresa_caixa === true,
      empresa_operacional: empresa?.empresa_operacional !== false,
      consolidar_no_grupo: empresa?.consolidar_no_grupo !== false,
      holding_id: empresa?.holding_id || null,
      receitas: 0,
      despesas: 0,
      resultado: 0
    }, 0);

    if (signedValue >= 0) {
      empresaResumo.receitas += signedValue;
    } else {
      empresaResumo.despesas += Math.abs(signedValue);
    }
    empresaResumo.resultado += signedValue;
  }

  const linhas = sortDreLinhas(linhasMap.values());

  const empresasResumo = Array.from(empresasMap.entries())
    .map(([empresaKey, empresaResumo]) => {
      const empresaLinhas = sortDreLinhas((empresaLinhasMaps.get(empresaKey) || new Map()).values());
      const empresaDre = buildDreDemonstrativo(empresaLinhas);

      return {
        ...empresaResumo,
        receitas: roundCurrency(empresaResumo.receitas),
        despesas: roundCurrency(empresaResumo.despesas),
        resultado: empresaDre.metricas.lucro_prejuizo_liquido,
        margem_resultado: empresaDre.metricas.margem_liquida,
        ...empresaDre.metricas,
        linhas: empresaLinhas,
        demonstrativo: empresaDre.linhas
      };
    })
    .sort((a, b) => String(a.empresa_nome).localeCompare(String(b.empresa_nome)));

  const receitas = empresasResumo.reduce((sum, item) => sum + Number(item.receitas || 0), 0);
  const despesas = empresasResumo.reduce((sum, item) => sum + Number(item.despesas || 0), 0);
  const demonstrativo = buildDreDemonstrativo(linhas);
  const resultado = demonstrativo.metricas.lucro_prejuizo_liquido;

  return {
    resumo: {
      receitas: roundCurrency(receitas),
      despesas: roundCurrency(despesas),
      resultado,
      margem_resultado: demonstrativo.metricas.margem_liquida,
      ...demonstrativo.metricas,
      empresas_com_movimento: empresasResumo.length,
      titulos_considerados: titulos.length
    },
    linhas,
    demonstrativo: demonstrativo.linhas,
    empresas: empresasResumo
  };
}

async function gerarDreGerencial(req, filters = {}) {
  await assertFinanceAccess(req);

  const periodo = resolvePeriodo(filters);
  const obraScopeWhere = await resolveObraScope(req, filters.obra_id);
  const empresas = await EmpresaGrupo.findAll({
    attributes: [
      'id',
      'codigo',
      'nome',
      'razao_social',
      'cnpj',
      'tipo_empresa',
      'tipo_gerencial',
      'empresa_caixa',
      'empresa_operacional',
      'consolidar_no_grupo',
      'elimina_intercompany',
      'holding_id',
      'ativo'
    ],
    order: [['tipo_empresa', 'ASC'], ['nome', 'ASC']]
  });
  const empresaIdsHolding = getEmpresaIdsDaHolding(empresas, filters.holding_id);

  if (obraScopeWhere === null) {
    return {
      filtro: {
        periodo: periodo.periodo,
        descricao: periodo.descricao,
        data_inicial: periodo.data_inicial,
        data_final: periodo.data_final,
        empresa_id: filters.empresa_id ? Number(filters.empresa_id) : null,
        holding_id: filters.holding_id ? Number(filters.holding_id) : null,
        obra_id: filters.obra_id ? Number(filters.obra_id) : null,
        excluir_intercompany: filters.excluir_intercompany !== false
      },
      ...emptyDreSummary()
    };
  }

  const tituloWhere = {
    considera_dre: true,
    ...obraScopeWhere,
    [Op.and]: [getCompetenciaWhere(periodo)]
  };

  if (filters.empresa_id) {
    tituloWhere.empresa_id = Number(filters.empresa_id);
  } else if (empresaIdsHolding) {
    tituloWhere.empresa_id = { [Op.in]: empresaIdsHolding };
  }

  if (filters.excluir_intercompany !== false) {
    tituloWhere[Op.and].push({
      [Op.or]: [
        { intercompany: false },
        { elimina_consolidado: false }
      ]
    });
  }

  const titulos = await TituloFinanceiro.findAll({
    where: tituloWhere,
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'codigo', 'nome', 'tipo_centro_custo', 'empresa_grupo_id'],
        required: false
      },
      {
        model: EmpresaGrupo,
        as: 'empresa',
        attributes: [
          'id',
          'codigo',
          'nome',
          'razao_social',
          'cnpj',
          'tipo_empresa',
          'tipo_gerencial',
          'empresa_caixa',
          'empresa_operacional',
          'consolidar_no_grupo',
          'holding_id'
        ],
        required: false
      },
      {
        model: CategoriaFinanceira,
        as: 'categoriaFinanceira',
        attributes: ['id', 'nome', 'tipo', 'dre_grupo', 'dre_subgrupo', 'dre_ordem', 'considera_dre'],
        required: false
      }
    ],
    order: [['data_emissao', 'ASC'], ['data_vencimento', 'ASC']]
  });

  const summary = summarizeDreRows(titulos, empresas);

  return {
    filtro: {
      periodo: periodo.periodo,
      descricao: periodo.descricao,
      data_inicial: periodo.data_inicial,
      data_final: periodo.data_final,
      empresa_id: filters.empresa_id ? Number(filters.empresa_id) : null,
      holding_id: filters.holding_id ? Number(filters.holding_id) : null,
      obra_id: filters.obra_id ? Number(filters.obra_id) : null,
      excluir_intercompany: filters.excluir_intercompany !== false
    },
    ...summary
  };
}

function getEmpresaNome(empresa) {
  return empresa?.nome || empresa?.razao_social || 'Sem empresa';
}

function getIntercompanyTituloValor(titulo) {
  return roundCurrency(titulo.valor_original || titulo.valor_saldo || 0);
}

function getIntercompanyMovimentoValor(movimento) {
  return roundCurrency(movimento.valor_quitacao || movimento.valor || 0);
}

function addIntercompanyResumo(map, key, seed, previsto, realizado, count = 1) {
  if (!map.has(key)) {
    map.set(key, {
      ...seed,
      valor_previsto: 0,
      valor_realizado: 0,
      titulos: 0
    });
  }

  const item = map.get(key);
  item.valor_previsto = roundCurrency(item.valor_previsto + Number(previsto || 0));
  item.valor_realizado = roundCurrency(item.valor_realizado + Number(realizado || 0));
  item.titulos += count;

  return item;
}

function mapIntercompanyTitulo(titulo) {
  const item = toPlain(titulo);
  const movimentos = Array.isArray(item.movimentos) ? item.movimentos : [];
  const valorRealizado = roundCurrency(movimentos.reduce((sum, movimento) => (
    sum + getIntercompanyMovimentoValor(movimento)
  ), 0));

  return {
    id: item.id,
    codigo: item.codigo,
    tipo: item.tipo,
    status: item.status,
    descricao: item.descricao,
    numero_documento: item.numero_documento,
    data_emissao: item.data_emissao,
    data_vencimento: item.data_vencimento,
    competencia_data: item.competencia_data,
    valor_previsto: getIntercompanyTituloValor(item),
    valor_realizado: valorRealizado,
    valor_saldo: roundCurrency(item.valor_saldo || 0),
    intercompany_group_id: item.intercompany_group_id,
    tipo_intercompany: item.tipo_intercompany,
    motivo_intercompany: item.motivo_intercompany,
    elimina_consolidado: item.elimina_consolidado === true,
    transferencia_interna: item.transferencia_interna === true,
    empresa_origem_id: item.empresa_origem_id,
    empresa_origem_nome: getEmpresaNome(item.empresaOrigem),
    empresa_destino_id: item.empresa_destino_id,
    empresa_destino_nome: getEmpresaNome(item.empresaDestino),
    empresa_titulo_id: item.empresa_id,
    empresa_titulo_nome: getEmpresaNome(item.empresa),
    parceiro_id: item.parceiro_id,
    parceiro_nome: item.parceiro?.nome || item.parceiro?.razao_social || null,
    categoria_id: item.categoria_financeira_id,
    categoria_nome: item.categoriaFinanceira?.nome || null,
    obra_id: item.obra_id,
    obra_nome: item.obra?.nome || null,
    movimentos: movimentos.map((movimento) => ({
      id: movimento.id,
      data_movimento: movimento.data_movimento,
      status: movimento.status,
      valor_quitacao: getIntercompanyMovimentoValor(movimento),
      empresa_id: movimento.empresa_id,
      conta_bancaria_id: movimento.conta_bancaria_id
    }))
  };
}

function summarizeIntercompany(titulos = []) {
  const porTipo = new Map();
  const porOrigem = new Map();
  const porDestino = new Map();
  const relacoes = new Map();
  const grupos = new Map();

  const resumo = {
    titulos: titulos.length,
    valor_previsto: 0,
    valor_realizado: 0,
    valor_eliminado_consolidado: 0,
    valor_nao_eliminado_consolidado: 0,
    transferencias_internas: 0,
    grupos_intercompany: 0,
    relacoes_empresas: 0
  };

  for (const titulo of titulos) {
    const previsto = getIntercompanyTituloValor(titulo);
    const movimentos = Array.isArray(titulo.movimentos) ? titulo.movimentos : [];
    const realizado = roundCurrency(movimentos.reduce((sum, movimento) => (
      sum + getIntercompanyMovimentoValor(movimento)
    ), 0));
    const tipo = titulo.tipo_intercompany || 'SEM_TIPO';
    const origemId = titulo.empresa_origem_id || null;
    const destinoId = titulo.empresa_destino_id || null;
    const origemNome = getEmpresaNome(titulo.empresaOrigem);
    const destinoNome = getEmpresaNome(titulo.empresaDestino);
    const relacaoKey = `${origemId || 'SEM_ORIGEM'}:${destinoId || 'SEM_DESTINO'}`;

    resumo.valor_previsto = roundCurrency(resumo.valor_previsto + previsto);
    resumo.valor_realizado = roundCurrency(resumo.valor_realizado + realizado);
    if (titulo.elimina_consolidado === true) {
      resumo.valor_eliminado_consolidado = roundCurrency(resumo.valor_eliminado_consolidado + previsto);
    } else {
      resumo.valor_nao_eliminado_consolidado = roundCurrency(resumo.valor_nao_eliminado_consolidado + previsto);
    }
    if (titulo.transferencia_interna === true) {
      resumo.transferencias_internas += 1;
    }
    if (titulo.intercompany_group_id) {
      grupos.set(titulo.intercompany_group_id, true);
    }

    addIntercompanyResumo(porTipo, tipo, {
      tipo_intercompany: tipo
    }, previsto, realizado);

    addIntercompanyResumo(porOrigem, String(origemId || 'SEM_ORIGEM'), {
      empresa_id: origemId,
      empresa_nome: origemNome
    }, previsto, realizado);

    addIntercompanyResumo(porDestino, String(destinoId || 'SEM_DESTINO'), {
      empresa_id: destinoId,
      empresa_nome: destinoNome
    }, previsto, realizado);

    addIntercompanyResumo(relacoes, relacaoKey, {
      empresa_origem_id: origemId,
      empresa_origem_nome: origemNome,
      empresa_destino_id: destinoId,
      empresa_destino_nome: destinoNome
    }, previsto, realizado);
  }

  resumo.grupos_intercompany = grupos.size;
  resumo.relacoes_empresas = relacoes.size;

  const sortByValue = (items) => Array.from(items.values())
    .map((item) => ({
      ...item,
      valor_previsto: roundCurrency(item.valor_previsto),
      valor_realizado: roundCurrency(item.valor_realizado)
    }))
    .sort((a, b) => Number(b.valor_previsto || 0) - Number(a.valor_previsto || 0));

  return {
    resumo,
    por_tipo: sortByValue(porTipo),
    por_origem: sortByValue(porOrigem),
    por_destino: sortByValue(porDestino),
    relacoes: sortByValue(relacoes)
  };
}

async function gerarRelatorioIntercompany(req, filters = {}) {
  await assertFinanceAccess(req);

  const periodo = resolvePeriodo(filters);
  const empresas = await EmpresaGrupo.findAll({
    attributes: ['id', 'codigo', 'nome', 'razao_social', 'tipo_empresa', 'tipo_gerencial', 'holding_id'],
    order: [['tipo_empresa', 'ASC'], ['nome', 'ASC']]
  });
  const empresaIdsHolding = getEmpresaIdsDaHolding(empresas, filters.holding_id);
  const andConditions = [getCompetenciaWhere(periodo)];

  if (filters.empresa_id) {
    const empresaId = Number(filters.empresa_id);
    andConditions.push({
      [Op.or]: [
        { empresa_id: empresaId },
        { empresa_origem_id: empresaId },
        { empresa_destino_id: empresaId }
      ]
    });
  } else if (empresaIdsHolding) {
    andConditions.push({
      [Op.or]: [
        { empresa_id: { [Op.in]: empresaIdsHolding } },
        { empresa_origem_id: { [Op.in]: empresaIdsHolding } },
        { empresa_destino_id: { [Op.in]: empresaIdsHolding } }
      ]
    });
  }

  const where = {
    intercompany: true,
    [Op.and]: andConditions
  };

  if (filters.tipo_intercompany) {
    where.tipo_intercompany = filters.tipo_intercompany;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.elimina_consolidado !== undefined) {
    where.elimina_consolidado = filters.elimina_consolidado;
  }

  const titulos = await TituloFinanceiro.findAll({
    where,
    include: [
      {
        model: EmpresaGrupo,
        as: 'empresa',
        attributes: ['id', 'codigo', 'nome', 'razao_social', 'tipo_empresa', 'tipo_gerencial', 'holding_id'],
        required: false
      },
      {
        model: EmpresaGrupo,
        as: 'empresaOrigem',
        attributes: ['id', 'codigo', 'nome', 'razao_social', 'tipo_empresa', 'tipo_gerencial', 'holding_id'],
        required: false
      },
      {
        model: EmpresaGrupo,
        as: 'empresaDestino',
        attributes: ['id', 'codigo', 'nome', 'razao_social', 'tipo_empresa', 'tipo_gerencial', 'holding_id'],
        required: false
      },
      {
        model: Parceiro,
        as: 'parceiro',
        attributes: ['id', 'nome', 'razao_social'],
        required: false
      },
      {
        model: CategoriaFinanceira,
        as: 'categoriaFinanceira',
        attributes: ['id', 'nome', 'tipo', 'dre_grupo', 'dre_subgrupo'],
        required: false
      },
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'codigo', 'nome', 'tipo_centro_custo'],
        required: false
      },
      {
        model: MovimentoFinanceiro,
        as: 'movimentos',
        attributes: ['id', 'data_movimento', 'status', 'valor_quitacao', 'empresa_id', 'conta_bancaria_id'],
        required: false,
        where: {
          status: 'ATIVO',
          data_movimento: {
            [Op.between]: [periodo.data_inicial, periodo.data_final]
          }
        }
      }
    ],
    order: [['competencia_data', 'ASC'], ['data_vencimento', 'ASC'], ['id', 'ASC']],
    limit: filters.limit || 1000
  });

  return {
    filtro: {
      periodo: periodo.periodo,
      descricao: periodo.descricao,
      data_inicial: periodo.data_inicial,
      data_final: periodo.data_final,
      holding_id: filters.holding_id ? Number(filters.holding_id) : null,
      empresa_id: filters.empresa_id ? Number(filters.empresa_id) : null,
      tipo_intercompany: filters.tipo_intercompany || null,
      status: filters.status || null,
      elimina_consolidado: filters.elimina_consolidado ?? null,
      limit: filters.limit || 1000
    },
    ...summarizeIntercompany(titulos),
    titulos: titulos.map(mapIntercompanyTitulo)
  };
}

function toPlain(model) {
  return model?.get ? model.get({ plain: true }) : model;
}

function buildTituloDiagnosticoWhere(scopeWhere = {}, extraWhere = {}) {
  return {
    considera_dre: true,
    ...scopeWhere,
    ...extraWhere
  };
}

function getTituloDiagnosticoInclude(extraIncludes = []) {
  const hasCategoriaOverride = extraIncludes.some((include) => include?.as === 'categoriaFinanceira');

  return [
    {
      model: Obra,
      as: 'obra',
      attributes: ['id', 'codigo', 'nome', 'tipo_centro_custo', 'empresa_grupo_id'],
      required: true
    },
    {
      model: EmpresaGrupo,
      as: 'empresa',
      attributes: ['id', 'codigo', 'nome', 'tipo_empresa', 'holding_id'],
      required: false
    },
    !hasCategoriaOverride
      ? {
          model: CategoriaFinanceira,
          as: 'categoriaFinanceira',
          attributes: ['id', 'nome', 'tipo', 'dre_grupo', 'dre_subgrupo', 'dre_ordem', 'considera_dre'],
          required: false
        }
      : null,
    ...extraIncludes
  ].filter(Boolean);
}

function mapTituloDiagnostico(titulo) {
  const item = toPlain(titulo);
  return {
    id: item.id,
    codigo: item.codigo,
    tipo: item.tipo,
    status: item.status,
    descricao: item.descricao,
    valor_original: Number(item.valor_original || 0),
    data_emissao: item.data_emissao,
    data_vencimento: item.data_vencimento,
    competencia_data: item.competencia_data,
    empresa_id: item.empresa_id,
    empresa_nome: item.empresa?.nome || null,
    intercompany: item.intercompany,
    empresa_contraparte_id: item.empresa_contraparte_id,
    empresa_origem_id: item.empresa_origem_id,
    empresa_destino_id: item.empresa_destino_id,
    tipo_intercompany: item.tipo_intercompany,
    obra_id: item.obra_id,
    obra_nome: item.obra?.nome || null,
    obra_empresa_grupo_id: item.obra?.empresa_grupo_id || null,
    categoria_id: item.categoria_financeira_id,
    categoria_nome: item.categoriaFinanceira?.nome || null
  };
}

function mapObraDiagnostico(obra) {
  const item = toPlain(obra);
  return {
    id: item.id,
    codigo: item.codigo,
    nome: item.nome,
    tipo_centro_custo: item.tipo_centro_custo,
    empresa_grupo_id: item.empresa_grupo_id,
    empresa_nome: item.empresaGrupo?.nome || null
  };
}

function mapEmpresaDiagnostico(empresa) {
  const item = toPlain(empresa);
  return {
    id: item.id,
    codigo: item.codigo,
    nome: item.nome,
    tipo_empresa: item.tipo_empresa,
    tipo_gerencial: item.tipo_gerencial,
    empresa_caixa: item.empresa_caixa,
    empresa_operacional: item.empresa_operacional,
    consolidar_no_grupo: item.consolidar_no_grupo,
    holding_id: item.holding_id,
    holding_nome: item.holding?.nome || null
  };
}

function mapCategoriaDiagnostico(categoria) {
  const item = toPlain(categoria);
  return {
    id: item.id,
    nome: item.nome,
    tipo: item.tipo,
    dre_grupo: item.dre_grupo,
    dre_subgrupo: item.dre_subgrupo,
    dre_ordem: item.dre_ordem,
    considera_dre: item.considera_dre
  };
}

function buildDiagnosticoItem({ codigo, titulo, severidade, descricao, total, acao, exemplos }) {
  return {
    codigo,
    titulo,
    severidade,
    descricao,
    total: Number(total || 0),
    acao_recomendada: acao,
    exemplos: exemplos || []
  };
}

async function countTitulosDiagnostico(scopeWhere, extraWhere = {}, extraIncludes = []) {
  return TituloFinanceiro.count({
    where: buildTituloDiagnosticoWhere(scopeWhere, extraWhere),
    include: getTituloDiagnosticoInclude(extraIncludes),
    distinct: true
  });
}

async function sampleTitulosDiagnostico(scopeWhere, extraWhere = {}, extraIncludes = []) {
  const titulos = await TituloFinanceiro.findAll({
    where: buildTituloDiagnosticoWhere(scopeWhere, extraWhere),
    include: getTituloDiagnosticoInclude(extraIncludes),
    order: [['id', 'DESC']],
    limit: 8
  });

  return titulos.map(mapTituloDiagnostico);
}

async function gerarDiagnosticoDre(req) {
  await assertFinanceAccess(req);

  const obraScopeWhere = await resolveObraScope(req);
  const tituloScopeWhere = obraScopeWhere || { id: -1 };
  const obraIncludeWhere = obraScopeWhere === null ? { id: -1 } : getObraIncludeWhereFromTituloScope(obraScopeWhere);
  const categoriaSemGrupoWhere = {
    ativo: true,
    considera_dre: true,
    [Op.or]: [{ dre_grupo: null }, { dre_grupo: '' }]
  };

  const [
    totalTitulosDre,
    totalEmpresas,
    totalHoldings,
    totalEmpresasCaixa,
    totalEmpresasOperacionaisSemHolding,
    totalObrasSemEmpresa,
    totalCategoriasSemDre,
    empresasOperacionaisSemHolding,
    obrasSemEmpresa,
    categoriasSemDre,
    titulosSemEmpresa,
    titulosSemCompetencia,
    titulosSemCategoria,
    titulosCategoriaSemDre,
    titulosEmpresaDivergente,
    titulosIntercompanyInconsistente
  ] = await Promise.all([
    countTitulosDiagnostico(tituloScopeWhere),
    EmpresaGrupo.count({ where: { ativo: true } }),
    EmpresaGrupo.count({ where: { ativo: true, tipo_empresa: 'HOLDING' } }),
    EmpresaGrupo.count({ where: { ativo: true, empresa_caixa: true } }),
    EmpresaGrupo.count({
      where: {
        ativo: true,
        tipo_empresa: { [Op.ne]: 'HOLDING' },
        holding_id: null
      }
    }),
    Obra.count({
      where: {
        ativo: true,
        empresa_grupo_id: null,
        ...obraIncludeWhere
      }
    }),
    CategoriaFinanceira.count({ where: categoriaSemGrupoWhere }),
    EmpresaGrupo.findAll({
      where: {
        ativo: true,
        tipo_empresa: { [Op.ne]: 'HOLDING' },
        holding_id: null
      },
      include: [{ model: EmpresaGrupo, as: 'holding', attributes: ['id', 'nome'], required: false }],
      order: [['nome', 'ASC']],
      limit: 8
    }),
    Obra.findAll({
      where: {
        ativo: true,
        empresa_grupo_id: null,
        ...obraIncludeWhere
      },
      include: [{ model: EmpresaGrupo, as: 'empresaGrupo', attributes: ['id', 'nome'], required: false }],
      order: [['nome', 'ASC']],
      limit: 8
    }),
    CategoriaFinanceira.findAll({
      where: categoriaSemGrupoWhere,
      order: [['tipo', 'ASC'], ['nome', 'ASC']],
      limit: 8
    }),
    countTitulosDiagnostico(tituloScopeWhere, { empresa_id: null }),
    countTitulosDiagnostico(tituloScopeWhere, { competencia_data: null }),
    countTitulosDiagnostico(tituloScopeWhere, { categoria_financeira_id: null }),
    countTitulosDiagnostico(tituloScopeWhere, {}, [
      {
        model: CategoriaFinanceira,
        as: 'categoriaFinanceira',
        attributes: ['id', 'nome', 'tipo', 'dre_grupo', 'dre_subgrupo', 'dre_ordem', 'considera_dre'],
        where: categoriaSemGrupoWhere,
        required: true
      }
    ]),
    TituloFinanceiro.count({
      where: {
        considera_dre: true,
        ...tituloScopeWhere,
        empresa_id: { [Op.ne]: null },
        [Op.and]: sequelizeWhere(col('TituloFinanceiro.empresa_id'), Op.ne, col('obra.empresa_grupo_id'))
      },
      include: [
        {
          model: Obra,
          as: 'obra',
          attributes: [],
          where: {
            empresa_grupo_id: { [Op.ne]: null }
          },
          required: true
        }
      ],
      distinct: true
    }),
    countTitulosDiagnostico(tituloScopeWhere, {
      [Op.or]: [
        { intercompany: true, empresa_contraparte_id: null },
        { intercompany: true, empresa_origem_id: null },
        { intercompany: true, empresa_destino_id: null },
        { intercompany: true, tipo_intercompany: null },
        { intercompany: true, tipo_intercompany: '' },
        { intercompany: false, empresa_contraparte_id: { [Op.ne]: null } }
      ]
    })
  ]);

  const [
    exemplosTitulosSemEmpresa,
    exemplosTitulosSemCompetencia,
    exemplosTitulosSemCategoria,
    exemplosTitulosCategoriaSemDre,
    exemplosEmpresaDivergente,
    exemplosIntercompany
  ] = await Promise.all([
    sampleTitulosDiagnostico(tituloScopeWhere, { empresa_id: null }),
    sampleTitulosDiagnostico(tituloScopeWhere, { competencia_data: null }),
    sampleTitulosDiagnostico(tituloScopeWhere, { categoria_financeira_id: null }),
    sampleTitulosDiagnostico(tituloScopeWhere, {}, [
      {
        model: CategoriaFinanceira,
        as: 'categoriaFinanceira',
        attributes: ['id', 'nome', 'tipo', 'dre_grupo', 'dre_subgrupo', 'dre_ordem', 'considera_dre'],
        where: categoriaSemGrupoWhere,
        required: true
      }
    ]),
    TituloFinanceiro.findAll({
      where: {
        considera_dre: true,
        ...tituloScopeWhere,
        empresa_id: { [Op.ne]: null },
        [Op.and]: sequelizeWhere(col('TituloFinanceiro.empresa_id'), Op.ne, col('obra.empresa_grupo_id'))
      },
      include: getTituloDiagnosticoInclude(),
      order: [['id', 'DESC']],
      limit: 8
    }).then((items) => items.map(mapTituloDiagnostico)),
    sampleTitulosDiagnostico(tituloScopeWhere, {
      [Op.or]: [
        { intercompany: true, empresa_contraparte_id: null },
        { intercompany: true, empresa_origem_id: null },
        { intercompany: true, empresa_destino_id: null },
        { intercompany: true, tipo_intercompany: null },
        { intercompany: true, tipo_intercompany: '' },
        { intercompany: false, empresa_contraparte_id: { [Op.ne]: null } }
      ]
    })
  ]);

  const itens = [
    buildDiagnosticoItem({
      codigo: 'EMPRESAS_SEM_HOLDING',
      titulo: 'Empresas operacionais sem holding',
      severidade: 'ALTA',
      descricao: 'Empresas operacionais sem holding deixam o consolidado da Holding incompleto.',
      total: totalEmpresasOperacionaisSemHolding,
      acao: 'Cadastre a Holding e vincule cada empresa operacional em Empresas do Grupo.',
      exemplos: empresasOperacionaisSemHolding.map(mapEmpresaDiagnostico)
    }),
    buildDiagnosticoItem({
      codigo: 'SEM_EMPRESA_CAIXA',
      titulo: 'Nenhuma empresa marcada como caixa/tesouraria',
      severidade: 'MEDIA',
      descricao: 'A visao consolidada de caixa precisa saber qual empresa centraliza ou suporta capital do grupo.',
      total: totalEmpresasCaixa > 0 ? 0 : 1,
      acao: 'Marque a empresa caixa/tesouraria em Empresas do Grupo quando existir uma concentradora de caixa.',
      exemplos: []
    }),
    buildDiagnosticoItem({
      codigo: 'OBRAS_SEM_EMPRESA',
      titulo: 'Obras/Centros de custo sem empresa',
      severidade: 'ALTA',
      descricao: 'Obras e centros de custo precisam apontar para a empresa operacional correta.',
      total: totalObrasSemEmpresa,
      acao: 'Edite o cadastro de Obras/Centros de Custo e informe a empresa do grupo.',
      exemplos: obrasSemEmpresa.map(mapObraDiagnostico)
    }),
    buildDiagnosticoItem({
      codigo: 'CATEGORIAS_SEM_DRE',
      titulo: 'Categorias financeiras sem grupo DRE',
      severidade: 'ALTA',
      descricao: 'Categorias sem grupo DRE geram linhas nao classificadas no resultado.',
      total: totalCategoriasSemDre,
      acao: 'Classifique cada categoria em Cadastros Financeiros com grupo, subgrupo e ordem DRE.',
      exemplos: categoriasSemDre.map(mapCategoriaDiagnostico)
    }),
    buildDiagnosticoItem({
      codigo: 'TITULOS_SEM_EMPRESA',
      titulo: 'Titulos sem empresa',
      severidade: 'CRITICA',
      descricao: 'Titulos sem empresa nao sustentam DRE isolada por empresa nem consolidado confiavel.',
      total: titulosSemEmpresa,
      acao: 'Vincule a empresa do grupo no titulo ou corrija a obra/centro de custo para herdar a empresa.',
      exemplos: exemplosTitulosSemEmpresa
    }),
    buildDiagnosticoItem({
      codigo: 'TITULOS_SEM_COMPETENCIA',
      titulo: 'Titulos sem competencia DRE',
      severidade: 'ALTA',
      descricao: 'A DRE por competencia usa fallback de emissao/compra/vencimento quando a competencia nao esta definida.',
      total: titulosSemCompetencia,
      acao: 'Informe competencia_data nos titulos importados/criados, preferencialmente pelo mes economico correto.',
      exemplos: exemplosTitulosSemCompetencia
    }),
    buildDiagnosticoItem({
      codigo: 'TITULOS_SEM_CATEGORIA',
      titulo: 'Titulos sem categoria financeira',
      severidade: 'ALTA',
      descricao: 'Sem categoria, o titulo entra em linhas genericas da DRE.',
      total: titulosSemCategoria,
      acao: 'Classifique o titulo com uma categoria financeira apropriada.',
      exemplos: exemplosTitulosSemCategoria
    }),
    buildDiagnosticoItem({
      codigo: 'TITULOS_CATEGORIA_SEM_DRE',
      titulo: 'Titulos com categoria sem grupo DRE',
      severidade: 'ALTA',
      descricao: 'A categoria existe, mas nao informa onde o valor deve entrar na DRE.',
      total: titulosCategoriaSemDre,
      acao: 'Complete a classificacao DRE das categorias financeiras usadas nesses titulos.',
      exemplos: exemplosTitulosCategoriaSemDre
    }),
    buildDiagnosticoItem({
      codigo: 'EMPRESA_DIFERE_OBRA',
      titulo: 'Empresa do titulo diferente da empresa da obra/centro',
      severidade: 'MEDIA',
      descricao: 'Divergencias entre titulo e obra podem distorcer resultado por empresa e por centro de custo.',
      total: titulosEmpresaDivergente,
      acao: 'Revise se o titulo ou a obra/centro de custo estao vinculados a empresa correta.',
      exemplos: exemplosEmpresaDivergente
    }),
    buildDiagnosticoItem({
      codigo: 'INTERCOMPANY_INCONSISTENTE',
      titulo: 'Intercompany inconsistente',
      severidade: 'MEDIA',
      descricao: 'Transacoes entre empresas precisam de origem, destino, tipo, flag e contraparte consistentes para consolidacao.',
      total: titulosIntercompanyInconsistente,
      acao: 'Marque intercompany apenas quando houver origem e destino reais, informe o tipo e a contraparte do grupo.',
      exemplos: exemplosIntercompany
    })
  ];

  const totalCriticas = itens
    .filter((item) => item.severidade === 'CRITICA')
    .reduce((sum, item) => sum + item.total, 0);
  const totalAltas = itens
    .filter((item) => item.severidade === 'ALTA')
    .reduce((sum, item) => sum + item.total, 0);
  const totalMedias = itens
    .filter((item) => item.severidade === 'MEDIA')
    .reduce((sum, item) => sum + item.total, 0);
  const totalPendencias = totalCriticas + totalAltas + totalMedias;

  return {
    gerado_em: new Date().toISOString(),
    resumo: {
      status: totalCriticas > 0 ? 'CRITICO' : totalAltas > 0 ? 'ATENCAO' : totalPendencias > 0 ? 'REVISAR' : 'OK',
      total_pendencias: totalPendencias,
      pendencias_criticas: totalCriticas,
      pendencias_altas: totalAltas,
      pendencias_medias: totalMedias,
      total_titulos_dre: totalTitulosDre,
      total_empresas: totalEmpresas,
      total_holdings: totalHoldings,
      total_empresas_caixa: totalEmpresasCaixa
    },
    itens
  };
}

module.exports = {
  gerarRelatorioAnalitico,
  gerarRelatorioFluxoCaixa,
  gerarRelatorioIntercompany,
  gerarDreGerencial,
  gerarDiagnosticoDre
};
