const { Op } = require('sequelize');
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

function summarizeDreRows(titulos = [], empresas = []) {
  const empresasById = new Map(empresas.map((empresa) => [Number(empresa.id), empresa]));
  const linhasMap = new Map();
  const empresasMap = new Map();

  for (const titulo of titulos) {
    const linha = getLinhaDre(titulo);
    if (!linha.considera_dre || titulo.considera_dre === false) continue;

    const tipo = String(titulo.tipo || '').toUpperCase();
    const rawValue = Number(titulo.valor_original || 0);
    const signedValue = tipo === 'RECEBER' ? rawValue : -rawValue;
    const empresaId = titulo.empresa_id ? Number(titulo.empresa_id) : null;
    const empresa = empresaId ? empresasById.get(empresaId) : null;
    const empresaKey = empresaId ? String(empresaId) : 'SEM_EMPRESA';

    addToMap(linhasMap, linha.grupo, {
      grupo: linha.grupo,
      ordem: linha.ordem
    }, signedValue);

    const empresaResumo = addToMap(empresasMap, empresaKey, {
      empresa_id: empresaId,
      empresa_nome: empresa?.nome || 'Sem empresa vinculada',
      tipo_empresa: empresa?.tipo_empresa || null,
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

  const linhas = Array.from(linhasMap.values())
    .sort((a, b) => Number(a.ordem || 999) - Number(b.ordem || 999) || String(a.grupo).localeCompare(String(b.grupo)));

  const empresasResumo = Array.from(empresasMap.values())
    .sort((a, b) => String(a.empresa_nome).localeCompare(String(b.empresa_nome)));

  const receitas = empresasResumo.reduce((sum, item) => sum + Number(item.receitas || 0), 0);
  const despesas = empresasResumo.reduce((sum, item) => sum + Number(item.despesas || 0), 0);
  const resultado = receitas - despesas;

  return {
    resumo: {
      receitas,
      despesas,
      resultado,
      margem_resultado: receitas > 0 ? Number(((resultado / receitas) * 100).toFixed(2)) : null,
      empresas_com_movimento: empresasResumo.length,
      titulos_considerados: titulos.length
    },
    linhas,
    empresas: empresasResumo
  };
}

async function gerarDreGerencial(req, filters = {}) {
  await assertFinanceAccess(req);

  const periodo = resolvePeriodo(filters);
  const obraWhere = await resolveObraScope(req, filters.obra_id);
  const empresas = await EmpresaGrupo.findAll({
    attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj', 'tipo_empresa', 'holding_id', 'ativo'],
    order: [['tipo_empresa', 'ASC'], ['nome', 'ASC']]
  });
  const empresaIdsHolding = getEmpresaIdsDaHolding(empresas, filters.holding_id);

  const tituloWhere = {
    considera_dre: true,
    ...getCompetenciaWhere(periodo)
  };

  if (filters.empresa_id) {
    tituloWhere.empresa_id = Number(filters.empresa_id);
  } else if (empresaIdsHolding) {
    tituloWhere.empresa_id = { [Op.in]: empresaIdsHolding };
  }

  if (filters.excluir_intercompany !== false) {
    tituloWhere.intercompany = false;
  }

  const titulos = await TituloFinanceiro.findAll({
    where: tituloWhere,
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'codigo', 'nome', 'tipo_centro_custo', 'empresa_grupo_id'],
        where: obraWhere,
        required: true
      },
      {
        model: EmpresaGrupo,
        as: 'empresa',
        attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj', 'tipo_empresa', 'holding_id'],
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

module.exports = {
  gerarRelatorioAnalitico,
  gerarRelatorioFluxoCaixa,
  gerarDreGerencial
};
