const { Op } = require('sequelize');
const {
  Historico,
  Obra,
  Solicitacao,
  Setor,
  TipoSolicitacao,
  User,
  UsuarioObra
} = require('../models');
const {
  buildSetorComparisonTokens,
  resolveSetorPersistenciaValue,
  resolveUserSetor
} = require('./setorCapabilityService');
const { obterTokensSetoresUsuario } = require('./usuariosSetores');
const {
  normalizeSetorToken,
  obterSlaSolicitacoesPorSetor
} = require('./solicitacaoSlaConfig');

const STATUS_CONCLUIDOS = new Set([
  'PAGA',
  'PAGO',
  'CONCLUIDA',
  'CONCLUIDO',
  'FINALIZADA',
  'FINALIZADO',
  'ENCERRADA',
  'ENCERRADO'
]);

const STATUS_AJUSTE_CRIACAO = new Set([
  'PENDENTE_DE_AJUSTE',
  'AGUARDANDO_AJUSTE'
]);

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(start, end = new Date()) {
  const startedAt = toDate(start);
  const endedAt = toDate(end);
  if (!startedAt || !endedAt || endedAt < startedAt) return null;
  return Number(((endedAt.getTime() - startedAt.getTime()) / 864e5).toFixed(1));
}

function getPeriodRange({ periodo, dataInicio, dataFim }) {
  const today = new Date();
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  if (dataInicio || dataFim) {
    return {
      dataInicial: dataInicio ? new Date(`${dataInicio}T00:00:00.000`) : null,
      dataFinal: dataFim ? new Date(`${dataFim}T23:59:59.999`) : null
    };
  }

  const normalized = String(periodo || '30_DIAS').toUpperCase();
  if (normalized === 'HOJE') {
    return { dataInicial: startOfDay(today), dataFinal: endOfDay(today) };
  }
  if (normalized === 'MES_ATUAL') {
    return {
      dataInicial: new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0),
      dataFinal: endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    };
  }
  if (normalized === '90_DIAS') {
    const start = startOfDay(today);
    start.setDate(start.getDate() - 89);
    return { dataInicial: start, dataFinal: endOfDay(today) };
  }

  const start = startOfDay(today);
  start.setDate(start.getDate() - 29);
  return { dataInicial: start, dataFinal: endOfDay(today) };
}

function buildDateWhere(range) {
  const where = {};
  if (range.dataInicial || range.dataFinal) {
    where.createdAt = {};
    if (range.dataInicial) where.createdAt[Op.gte] = range.dataInicial;
    if (range.dataFinal) where.createdAt[Op.lte] = range.dataFinal;
  }
  return where;
}

function incrementMap(map, key, seed = {}) {
  const mapKey = key || 'NAO_INFORMADO';
  if (!map.has(mapKey)) {
    map.set(mapKey, { key: mapKey, total: 0, valor_total: 0, ...seed });
  }
  const item = map.get(mapKey);
  item.total += 1;
  return item;
}

function sortByTotalDesc(items) {
  return Array.from(items.values()).sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
}

function formatMonthKey(value) {
  const date = toDate(value);
  if (!date) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return 'Sem mes';
  const [year, month] = monthKey.split('-');
  return `${month}/${year}`;
}

function buildSetorLookup(setores = []) {
  const tokens = new Map();
  const labels = new Map();

  setores.forEach((setor) => {
    const codigo = normalizeSetorToken(setor?.codigo);
    if (!codigo) return;

    labels.set(codigo, {
      setor: codigo,
      setor_nome: setor?.nome || setor?.codigo || codigo
    });

    [setor?.codigo, setor?.nome, setor?.id].forEach((value) => {
      const token = normalizeSetorToken(value);
      if (token) tokens.set(token, codigo);
    });
  });

  return { tokens, labels };
}

function resolveSetorSlaKey(value, lookup) {
  const token = normalizeSetorToken(value);
  if (!token) return 'NAO_INFORMADO';
  return lookup.tokens.get(token) || token;
}

function sortSlaSetor(items) {
  return Array.from(items.values()).sort((a, b) => {
    const vencidasDiff = Number(b.vencidas || 0) - Number(a.vencidas || 0);
    if (vencidasDiff !== 0) return vencidasDiff;
    return Number(b.total || 0) - Number(a.total || 0);
  });
}

function sortHistoricosAsc(historicosItem = []) {
  return [...historicosItem].sort((a, b) => {
    const dateA = toDate(a.createdAt)?.getTime() || 0;
    const dateB = toDate(b.createdAt)?.getTime() || 0;
    return dateA - dateB;
  });
}

function getFirstHistorico(historicosItem = [], predicate) {
  return sortHistoricosAsc(historicosItem).find(predicate);
}

function getLatestResponsavel(historicosItem = []) {
  const latest = historicosItem.find((item) =>
    ['RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU', 'RESPONSAVEL_REMOVIDO'].includes(String(item.acao || '').toUpperCase())
  );
  if (!latest || String(latest.acao || '').toUpperCase() === 'RESPONSAVEL_REMOVIDO') {
    return null;
  }
  return latest.usuario ? latest : null;
}

function isConcluida(status) {
  return STATUS_CONCLUIDOS.has(normalizeToken(status));
}

function isStatusAjusteCriacao(status) {
  return STATUS_AJUSTE_CRIACAO.has(normalizeToken(status));
}

function addDuration(map, key, label, start, end) {
  const dias = diffDays(start, end);
  if (dias == null) return;
  if (!map.has(key)) {
    map.set(key, {
      key,
      label,
      amostras: 0,
      soma_dias: 0,
      maior_dias: 0
    });
  }
  const item = map.get(key);
  item.amostras += 1;
  item.soma_dias += dias;
  item.maior_dias = Math.max(item.maior_dias, dias);
}

function finalizeDurations(map) {
  return Array.from(map.values()).map((item) => ({
    key: item.key,
    label: item.label,
    amostras: item.amostras,
    media_dias: item.amostras > 0 ? Number((item.soma_dias / item.amostras).toFixed(1)) : 0,
    maior_dias: Number(item.maior_dias.toFixed(1))
  }));
}

async function getSolicitacaoScopeWhere(user) {
  const perfil = normalizeToken(user?.perfil);
  const isSuperadmin = perfil === 'SUPERADMIN';
  const isAdministrador = perfil === 'ADMINISTRADOR';

  const setorAtual = await resolveUserSetor(user, {
    attributes: ['id', 'codigo', 'nome', 'eh_setor_obra', 'eh_setor_geo']
  });
  const areaUsuario = resolveSetorPersistenciaValue(setorAtual, user?.area);
  const tokens = new Set(buildSetorComparisonTokens(setorAtual));
  if (areaUsuario) tokens.add(String(areaUsuario).trim().toUpperCase());
  if (user?.setor_id) tokens.add(String(user.setor_id).trim().toUpperCase());

  const tokensMultiSetor = await obterTokensSetoresUsuario(user, areaUsuario ? [areaUsuario] : []);
  tokensMultiSetor.forEach((token) => {
    if (token) tokens.add(String(token).trim().toUpperCase());
  });

  const tokenList = Array.from(tokens).filter(Boolean);
  const isAdminGeo =
    perfil === 'ADMIN' &&
    tokenList.some((token) => ['GEO', 'GERENCIA_PROCESSOS', 'GERENCIA_DE_PROCESSOS'].includes(normalizeToken(token)));

  if (isSuperadmin || isAdministrador || isAdminGeo) {
    return {};
  }

  const isSetorObra = Boolean(setorAtual?.eh_setor_obra);
  if (isSetorObra) {
    const vinculos = await UsuarioObra.findAll({
      where: { user_id: user.id },
      attributes: ['obra_id']
    });
    const obraIds = vinculos.map((item) => Number(item.obra_id)).filter(Boolean);
    return { obra_id: { [Op.in]: obraIds.length ? obraIds : [-1] } };
  }

  const areaTokens = tokenList.map((token) => String(token).trim().toUpperCase()).filter(Boolean);
  if (areaTokens.length) {
    return {
      [Op.or]: [
        { criado_por: user.id },
        { area_responsavel: { [Op.in]: areaTokens } }
      ]
    };
  }

  return { criado_por: user.id };
}

async function relatorioSolicitacoesOperacional({ user, periodo, dataInicio, dataFim, obraId, status, area } = {}) {
  const range = getPeriodRange({ periodo, dataInicio, dataFim });
  const scopeWhere = await getSolicitacaoScopeWhere(user);
  const where = {
    cancelada: false,
    ...buildDateWhere(range),
    ...scopeWhere
  };

  if (obraId) {
    where.obra_id = Number(obraId);
  }
  if (status) {
    where.status_global = String(status).trim().toUpperCase();
  }
  if (area) {
    where.area_responsavel = String(area).trim().toUpperCase();
  }

  const solicitacoes = await Solicitacao.findAll({
    where,
    attributes: [
      'id',
      'codigo',
      'descricao',
      'valor',
      'status_global',
      'area_responsavel',
      'obra_id',
      'tipo_solicitacao_id',
      'criado_por',
      'financeiro_pendencia_prazo',
      'financeiro_pendencia_tipo',
      'financeiro_pendencia_observacao',
      'financeiro_pendencia_marcado_em',
      'financeiro_pendencia_regularizado_em',
      'aprovada_diretoria_em',
      'createdAt',
      'updatedAt'
    ],
    include: [
      { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo', 'tipo_centro_custo'] },
      { model: TipoSolicitacao, as: 'tipo', attributes: ['id', 'nome', 'codigo_interno'] },
      { model: User, as: 'criador', attributes: ['id', 'nome'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const ids = solicitacoes.map((item) => Number(item.id)).filter(Boolean);
  const historicos = ids.length
    ? await Historico.findAll({
        where: { solicitacao_id: { [Op.in]: ids } },
        attributes: ['solicitacao_id', 'usuario_responsavel_id', 'acao', 'setor', 'status_novo', 'createdAt'],
        include: [
          { model: User, as: 'usuario', attributes: ['id', 'nome'] }
        ],
        order: [['createdAt', 'DESC']]
      })
    : [];
  const [slaConfig, setoresDb] = await Promise.all([
    obterSlaSolicitacoesPorSetor(),
    Setor.findAll({ attributes: ['id', 'codigo', 'nome', 'ativo'] })
  ]);
  const setorLookup = buildSetorLookup(setoresDb);
  const slaSetores = slaConfig?.setores && typeof slaConfig.setores === 'object'
    ? slaConfig.setores
    : {};
  const slaConfigurado = Object.values(slaSetores).some((regra) => regra?.ativo && Number(regra?.dias) > 0);

  const historicosPorSolicitacao = new Map();
  historicos.forEach((historico) => {
    const solicitacaoId = Number(historico.solicitacao_id);
    if (!historicosPorSolicitacao.has(solicitacaoId)) {
      historicosPorSolicitacao.set(solicitacaoId, []);
    }
    historicosPorSolicitacao.get(solicitacaoId).push(historico);
  });

  const statusMap = new Map();
  const setorMap = new Map();
  const obraMap = new Map();
  const tipoMap = new Map();
  const criadorMap = new Map();
  const acertividadeCriacaoMap = new Map();
  const pendenciasFinanceirasMap = new Map();
  const responsavelMap = new Map();
  const tempoEtapasMap = new Map();
  const agingSetorMap = new Map();
  const agingStatusMap = new Map();
  const evolucaoMensalMap = new Map();
  const setorStatusMap = new Map();
  const slaSetorMap = new Map();
  const setoresSemSlaMap = new Map();
  const now = new Date();
  const gargalos = [];
  const resumo = {
    total_solicitacoes: solicitacoes.length,
    abertas: 0,
    concluidas: 0,
    valor_total: 0,
    valor_aberto: 0,
    dias_abertas_total: 0,
    abertas_com_data: 0,
    maior_tempo_parado_dias: 0,
    criadas: solicitacoes.length,
    assumidas: 0,
    enviadas: 0,
    aprovadas_diretoria: 0
  };

  solicitacoes.forEach((solicitacao) => {
    const plain = solicitacao.get({ plain: true });
    const valor = toNumber(plain.valor);
    const concluida = isConcluida(plain.status_global);
    const historicosItem = historicosPorSolicitacao.get(Number(plain.id)) || [];
    const responsavelAtual = getLatestResponsavel(historicosItem);
    const primeiraAssuncao = getFirstHistorico(historicosItem, (item) =>
      ['RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU'].includes(String(item.acao || '').toUpperCase())
    );
    const primeiroEnvio = getFirstHistorico(historicosItem, (item) =>
      String(item.acao || '').toUpperCase() === 'ENVIADA_SETOR'
    );
    const ajustesCriacao = historicosItem.filter((item) =>
      String(item.acao || '').toUpperCase() === 'STATUS_ALTERADO' && isStatusAjusteCriacao(item.status_novo)
    );
    const historicoConclusao = getFirstHistorico(historicosItem, (item) =>
      String(item.acao || '').toUpperCase() === 'STATUS_ALTERADO' && isConcluida(item.status_novo)
    );
    const ultimaMovimentacao = historicosItem[0]?.createdAt || plain.updatedAt || plain.createdAt;
    const diasParada = concluida ? 0 : diffDays(ultimaMovimentacao, now);
    const diasAberta = concluida ? 0 : diffDays(plain.createdAt, now);
    const mesCriacao = formatMonthKey(plain.createdAt) || 'SEM_MES';
    const possuiPendenciaFinanceira = Boolean(plain.financeiro_pendencia_marcado_em || plain.financeiro_pendencia_prazo);

    resumo.valor_total += valor;
    const evolucao = incrementMap(evolucaoMensalMap, mesCriacao, {
      mes: mesCriacao,
      mes_label: formatMonthLabel(mesCriacao),
      abertas: 0,
      concluidas: 0
    });
    evolucao.valor_total = toNumber(evolucao.valor_total) + valor;
    if (concluida) {
      evolucao.concluidas += 1;
    } else {
      evolucao.abertas += 1;
    }

    const setorStatusKey = `${plain.area_responsavel || 'NAO_INFORMADO'}|${plain.status_global || 'NAO_INFORMADO'}`;
    const setorStatus = incrementMap(setorStatusMap, setorStatusKey, {
      setor: plain.area_responsavel,
      status: plain.status_global
    });
    setorStatus.valor_total = toNumber(setorStatus.valor_total) + valor;

    if (concluida) {
      resumo.concluidas += 1;
    } else {
      resumo.abertas += 1;
      resumo.valor_aberto += valor;
      if (diasAberta != null) {
        resumo.dias_abertas_total += diasAberta;
        resumo.abertas_com_data += 1;
      }
      if (diasParada != null) {
        resumo.maior_tempo_parado_dias = Math.max(resumo.maior_tempo_parado_dias, diasParada);
        const aging = incrementMap(agingSetorMap, plain.area_responsavel, { setor: plain.area_responsavel });
        aging.valor_aberto = toNumber(aging.valor_aberto) + valor;
        aging.soma_dias_parada = toNumber(aging.soma_dias_parada) + diasParada;
        aging.maior_dias_parada = Math.max(toNumber(aging.maior_dias_parada), diasParada);

        const agingStatus = incrementMap(agingStatusMap, plain.status_global, { status: plain.status_global });
        agingStatus.valor_aberto = toNumber(agingStatus.valor_aberto) + valor;
        agingStatus.soma_dias_parada = toNumber(agingStatus.soma_dias_parada) + diasParada;
        agingStatus.maior_dias_parada = Math.max(toNumber(agingStatus.maior_dias_parada), diasParada);

        const slaKey = resolveSetorSlaKey(plain.area_responsavel, setorLookup);
        const slaRegra = slaSetores[slaKey];
        const setorLabel = setorLookup.labels.get(slaKey) || {
          setor: slaKey,
          setor_nome: plain.area_responsavel || 'Nao informado'
        };

        if (slaRegra?.ativo && Number(slaRegra.dias) > 0) {
          const slaItem = incrementMap(slaSetorMap, slaKey, {
            ...setorLabel,
            sla_dias: Number(slaRegra.dias),
            vencidas: 0,
            no_prazo: 0,
            valor_vencido: 0,
            maior_dias_parada: 0
          });
          slaItem.maior_dias_parada = Math.max(toNumber(slaItem.maior_dias_parada), diasParada);
          if (diasParada > Number(slaRegra.dias)) {
            slaItem.vencidas += 1;
            slaItem.valor_vencido = toNumber(slaItem.valor_vencido) + valor;
          } else {
            slaItem.no_prazo += 1;
          }
        } else {
          const semSla = incrementMap(setoresSemSlaMap, slaKey, {
            ...setorLabel,
            valor_aberto: 0
          });
          semSla.valor_aberto = toNumber(semSla.valor_aberto) + valor;
        }
      }
    }

    addDuration(tempoEtapasMap, 'CRIACAO_ASSUNCAO', 'Criacao ate assuncao/atribuicao', plain.createdAt, primeiraAssuncao?.createdAt);
    addDuration(tempoEtapasMap, 'CRIACAO_PRIMEIRO_ENVIO', 'Criacao ate primeiro envio', plain.createdAt, primeiroEnvio?.createdAt);
    addDuration(tempoEtapasMap, 'CRIACAO_APROVACAO_DIRETORIA', 'Criacao ate aprovacao diretoria', plain.createdAt, plain.aprovada_diretoria_em);
    addDuration(
      tempoEtapasMap,
      'CRIACAO_CONCLUSAO',
      'Criacao ate conclusao',
      plain.createdAt,
      historicoConclusao?.createdAt || (concluida ? plain.updatedAt : null)
    );

    if (plain.aprovada_diretoria_em) {
      resumo.aprovadas_diretoria += 1;
    }
    if (historicosItem.some((item) => ['RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU'].includes(String(item.acao || '').toUpperCase()))) {
      resumo.assumidas += 1;
    }
    if (historicosItem.some((item) => String(item.acao || '').toUpperCase() === 'ENVIADA_SETOR')) {
      resumo.enviadas += 1;
    }

    incrementMap(statusMap, plain.status_global, { status: plain.status_global }).valor_total += valor;
    incrementMap(setorMap, plain.area_responsavel, { setor: plain.area_responsavel }).valor_total += valor;
    incrementMap(obraMap, plain.obra_id || 'SEM_OBRA', {
      obra_id: plain.obra_id || null,
      obra_nome: plain.obra?.nome || 'Sem obra/centro',
      obra_codigo: plain.obra?.codigo || null,
      tipo_centro_custo: plain.obra?.tipo_centro_custo || null
    }).valor_total += valor;
    incrementMap(tipoMap, plain.tipo_solicitacao_id || 'SEM_TIPO', {
      tipo_solicitacao_id: plain.tipo_solicitacao_id || null,
      tipo_nome: plain.tipo?.nome || 'Sem tipo'
    }).valor_total += valor;
    incrementMap(criadorMap, plain.criado_por || 'SEM_CRIADOR', {
      usuario_id: plain.criado_por || null,
      usuario_nome: plain.criador?.nome || 'Sem criador'
    }).valor_total += valor;

    const criadorKey = plain.criado_por || 'SEM_CRIADOR';
    if (!acertividadeCriacaoMap.has(criadorKey)) {
      acertividadeCriacaoMap.set(criadorKey, {
        key: criadorKey,
        usuario_id: plain.criado_por || null,
        usuario_nome: plain.criador?.nome || 'Sem criador',
        total_criadas: 0,
        solicitacoes_com_ajuste: 0,
        solicitacoes_com_ajuste_multissetor: 0,
        ajustes_por_setor_map: new Map()
      });
    }
    const acertividade = acertividadeCriacaoMap.get(criadorKey);
    acertividade.total_criadas += 1;
    if (ajustesCriacao.length > 0) {
      acertividade.solicitacoes_com_ajuste += 1;
      const setoresAjusteSolicitacao = new Set(
        ajustesCriacao.map((item) => normalizeToken(item.setor || 'NAO_INFORMADO')).filter(Boolean)
      );
      if (setoresAjusteSolicitacao.size > 1) {
        acertividade.solicitacoes_com_ajuste_multissetor += 1;
      }
      setoresAjusteSolicitacao.forEach((setorToken) => {
        const atual = acertividade.ajustes_por_setor_map.get(setorToken) || {
          setor: setorToken,
          total: 0
        };
        atual.total += 1;
        acertividade.ajustes_por_setor_map.set(setorToken, atual);
      });
    }

    if (possuiPendenciaFinanceira) {
      if (!pendenciasFinanceirasMap.has(criadorKey)) {
        pendenciasFinanceirasMap.set(criadorKey, {
          key: criadorKey,
          usuario_id: plain.criado_por || null,
          usuario_nome: plain.criador?.nome || 'Sem criador',
          total_marcadas: 0,
          abertas: 0,
          regularizadas: 0,
          soma_dias_regularizacao: 0,
          maior_dias_regularizacao: 0,
          tipos_map: new Map()
        });
      }
      const pendencia = pendenciasFinanceirasMap.get(criadorKey);
      pendencia.total_marcadas += 1;
      if (plain.financeiro_pendencia_regularizado_em) {
        pendencia.regularizadas += 1;
        const diasRegularizacao = diffDays(plain.financeiro_pendencia_marcado_em, plain.financeiro_pendencia_regularizado_em);
        if (diasRegularizacao != null) {
          pendencia.soma_dias_regularizacao += diasRegularizacao;
          pendencia.maior_dias_regularizacao = Math.max(pendencia.maior_dias_regularizacao, diasRegularizacao);
        }
      } else {
        pendencia.abertas += 1;
      }
      const tipoToken = normalizeToken(plain.financeiro_pendencia_tipo || 'NAO_INFORMADO');
      const tipoAtual = pendencia.tipos_map.get(tipoToken) || { tipo: tipoToken, total: 0 };
      tipoAtual.total += 1;
      pendencia.tipos_map.set(tipoToken, tipoAtual);
    }

    incrementMap(responsavelMap, responsavelAtual?.usuario_responsavel_id || 'SEM_RESPONSAVEL', {
      usuario_id: responsavelAtual?.usuario_responsavel_id || null,
      usuario_nome: responsavelAtual?.usuario?.nome || 'Sem responsavel'
    }).valor_total += valor;

    if (!concluida && Number(diasParada || 0) >= 3) {
      gargalos.push({
        id: plain.id,
        codigo: plain.codigo,
        descricao: plain.descricao,
        status: plain.status_global,
        setor: plain.area_responsavel,
        obra_nome: plain.obra?.nome || null,
        tipo_nome: plain.tipo?.nome || null,
        criado_por_nome: plain.criador?.nome || null,
        responsavel_nome: responsavelAtual?.usuario?.nome || null,
        criada_em: plain.createdAt,
        ultima_movimentacao_em: ultimaMovimentacao,
        dias_parada: diasParada,
        valor
      });
    }
  });

  const abertasComData = resumo.abertas_com_data || 0;
  const mediaDiasAbertas = abertasComData > 0 ? resumo.dias_abertas_total / abertasComData : 0;

  return {
    filtro: {
      periodo: periodo || '30_DIAS',
      data_inicial: range.dataInicial ? range.dataInicial.toISOString().slice(0, 10) : null,
      data_final: range.dataFinal ? range.dataFinal.toISOString().slice(0, 10) : null,
      obra_id: obraId || null,
      status: status || null,
      area: area || null
    },
    resumo: {
      total_solicitacoes: resumo.total_solicitacoes,
      abertas: resumo.abertas,
      concluidas: resumo.concluidas,
      valor_total: Number(resumo.valor_total.toFixed(2)),
      valor_aberto: Number(resumo.valor_aberto.toFixed(2)),
      media_dias_abertas: Number(mediaDiasAbertas.toFixed(1)),
      maior_tempo_parado_dias: Number(resumo.maior_tempo_parado_dias.toFixed(1)),
      criadas: resumo.criadas,
      assumidas: resumo.assumidas,
      enviadas: resumo.enviadas,
      aprovadas_diretoria: resumo.aprovadas_diretoria
    },
    por_status: sortByTotalDesc(statusMap),
    por_setor: sortByTotalDesc(setorMap),
    por_obra: sortByTotalDesc(obraMap).slice(0, 20),
    por_tipo: sortByTotalDesc(tipoMap).slice(0, 20),
    por_criador: sortByTotalDesc(criadorMap).slice(0, 20),
    acertividade_criacao: Array.from(acertividadeCriacaoMap.values())
      .map((item) => {
        const totalCriadas = Number(item.total_criadas || 0);
        const totalAjuste = Number(item.solicitacoes_com_ajuste || 0);
        const ajustesPorSetor = Array.from(item.ajustes_por_setor_map.values())
          .sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
        const totalOcorrenciasSetor = ajustesPorSetor.reduce(
          (sum, setor) => sum + Number(setor.total || 0),
          0
        );
        return {
          key: item.key,
          usuario_id: item.usuario_id,
          usuario_nome: item.usuario_nome,
          total_criadas: totalCriadas,
          solicitacoes_com_ajuste: totalAjuste,
          ocorrencias_setor_ajuste: totalOcorrenciasSetor,
          solicitacoes_com_ajuste_multissetor: Number(item.solicitacoes_com_ajuste_multissetor || 0),
          taxa_ajuste: totalCriadas > 0 ? Number(((totalAjuste / totalCriadas) * 100).toFixed(1)) : 0,
          taxa_acertividade: totalCriadas > 0 ? Number((((totalCriadas - totalAjuste) / totalCriadas) * 100).toFixed(1)) : 0,
          ajustes_por_setor: ajustesPorSetor
        };
      })
      .sort((a, b) => {
        const ajusteDiff = Number(b.solicitacoes_com_ajuste || 0) - Number(a.solicitacoes_com_ajuste || 0);
        if (ajusteDiff !== 0) return ajusteDiff;
        return Number(b.total_criadas || 0) - Number(a.total_criadas || 0);
      }),
    pendencias_financeiras_criador: Array.from(pendenciasFinanceirasMap.values())
      .map((item) => {
        const regularizadas = Number(item.regularizadas || 0);
        const tipos = Array.from(item.tipos_map.values()).sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
        return {
          key: item.key,
          usuario_id: item.usuario_id,
          usuario_nome: item.usuario_nome,
          total_marcadas: Number(item.total_marcadas || 0),
          abertas: Number(item.abertas || 0),
          regularizadas,
          media_dias_regularizacao: regularizadas > 0 ? Number((item.soma_dias_regularizacao / regularizadas).toFixed(1)) : 0,
          maior_dias_regularizacao: Number(item.maior_dias_regularizacao.toFixed(1)),
          tipos
        };
      })
      .sort((a, b) => {
        const abertasDiff = Number(b.abertas || 0) - Number(a.abertas || 0);
        if (abertasDiff !== 0) return abertasDiff;
        return Number(b.total_marcadas || 0) - Number(a.total_marcadas || 0);
      }),
    por_responsavel: sortByTotalDesc(responsavelMap).slice(0, 20),
    tempos_etapas: finalizeDurations(tempoEtapasMap),
    sla_configurado: slaConfigurado,
    sla_setor: sortSlaSetor(slaSetorMap)
      .map((item) => ({
        ...item,
        percentual_vencido: item.total > 0 ? Number(((Number(item.vencidas || 0) / item.total) * 100).toFixed(1)) : 0,
        valor_vencido: Number(toNumber(item.valor_vencido).toFixed(2)),
        maior_dias_parada: Number(toNumber(item.maior_dias_parada).toFixed(1))
      })),
    setores_sem_sla: sortByTotalDesc(setoresSemSlaMap)
      .map((item) => ({
        ...item,
        valor_aberto: Number(toNumber(item.valor_aberto).toFixed(2))
      })),
    evolucao_mensal: Array.from(evolucaoMensalMap.values())
      .map((item) => ({
        ...item,
        valor_total: Number(toNumber(item.valor_total).toFixed(2))
      }))
      .sort((a, b) => String(a.mes).localeCompare(String(b.mes))),
    setor_status: sortByTotalDesc(setorStatusMap)
      .map((item) => ({
        ...item,
        valor_total: Number(toNumber(item.valor_total).toFixed(2))
      })),
    aging_setor: sortByTotalDesc(agingSetorMap)
      .map((item) => ({
        ...item,
        valor_aberto: Number(toNumber(item.valor_aberto).toFixed(2)),
        media_dias_parada: item.total > 0 ? Number((toNumber(item.soma_dias_parada) / item.total).toFixed(1)) : 0,
        maior_dias_parada: Number(toNumber(item.maior_dias_parada).toFixed(1))
      })),
    aging_status: sortByTotalDesc(agingStatusMap)
      .map((item) => ({
        ...item,
        valor_aberto: Number(toNumber(item.valor_aberto).toFixed(2)),
        media_dias_parada: item.total > 0 ? Number((toNumber(item.soma_dias_parada) / item.total).toFixed(1)) : 0,
        maior_dias_parada: Number(toNumber(item.maior_dias_parada).toFixed(1))
      })),
    gargalos: gargalos
      .sort((a, b) => Number(b.dias_parada || 0) - Number(a.dias_parada || 0))
      .slice(0, 30)
  };
}

module.exports = {
  relatorioSolicitacoesOperacional
};
