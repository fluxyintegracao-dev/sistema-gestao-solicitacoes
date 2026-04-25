const { Op, Sequelize } = require('sequelize');
const {
  PrioridadeLote,
  PrioridadeLoteItem,
  Solicitacao,
  Historico,
  Obra,
  TipoSolicitacao,
  User,
  Setor
} = require('../models');
const {
  obterConfiguracaoAprovacaoDiretoria,
  normalizarClassificacaoObra,
  normalizarTokenSetor
} = require('../services/aprovacaoDiretoriaConfig');
const { obterTokensSetoresUsuario } = require('../services/usuariosSetores');
const { criarNotificacao } = require('../services/notificacoes');
const {
  canCancelPrioridadeDiretoriaLote,
  canCreatePrioridadeDiretoriaLote,
  canDeletePrioridadeDiretoriaLote,
  canFinalizePrioridadeDiretoriaLote,
  canViewPrioridadesDiretoria
} = require('../services/authorizationService');
const {
  MODO_ACESSO_TODOS,
  obterAcessoPrioridadeDiretoriaPorUsuario
} = require('../services/prioridadeDiretoriaAcesso');

const STATUS_LOTE = {
  ABERTO: 'ABERTO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO'
};

const DIRETORIA_ADMIN_CODIGO = 'DIR_ADMIN';

function normalizarStatusLote(valor) {
  const status = String(valor || '').trim().toUpperCase();
  return Object.values(STATUS_LOTE).includes(status) ? status : null;
}

function formatarNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function normalizarComparacao(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function usuarioPertenceAoSetor(tokensUsuario = [], tokenSetor = null) {
  const token = normalizarComparacao(tokenSetor);
  if (!token) return false;
  return (Array.isArray(tokensUsuario) ? tokensUsuario : []).some((item) => (
    normalizarComparacao(item) === token
  ));
}

function obterClassificacoesDisponiveis(configuracao) {
  return ['PUBLICA', 'PRIVADA'];
}

function normalizarClassificacoesPermitidas(lista, classificacoesDisponiveis = []) {
  const disponiveis = new Set(classificacoesDisponiveis);
  return [...new Set(
    (Array.isArray(lista) ? lista : [])
      .map(normalizarClassificacaoObra)
      .filter((classificacao) => classificacao && disponiveis.has(classificacao))
  )];
}

function resolverEscopoAcesso(acessoUsuario, classificacoesDisponiveis = []) {
  if (!acessoUsuario) return null;
  if (acessoUsuario.modo === MODO_ACESSO_TODOS) {
    return [...classificacoesDisponiveis];
  }
  return normalizarClassificacoesPermitidas(acessoUsuario.diretorias, classificacoesDisponiveis);
}

function todasClassificacoesPermitidas(classificacoes = [], classificacoesDisponiveis = []) {
  if (!classificacoesDisponiveis.length) return false;
  const atuais = new Set(classificacoes);
  return classificacoesDisponiveis.every((classificacao) => atuais.has(classificacao));
}

async function obterPermissoesPrioridade(req) {
  const configuracao = await obterConfiguracaoAprovacaoDiretoria();
  const perfil = String(req.user?.perfil || '').trim().toUpperCase();
  const tokensUsuario = await obterTokensSetoresUsuario(req.user, req.user?.area ? [req.user.area] : []);
  const isSuperadmin = perfil === 'SUPERADMIN';
  const isDirAdmin = isSuperadmin || usuarioPertenceAoSetor(tokensUsuario, DIRETORIA_ADMIN_CODIGO);
  const classificacoesDisponiveis = obterClassificacoesDisponiveis(configuracao);
  const classificacoesLegado = classificacoesDisponiveis.filter((classificacao) => {
    const diretoria = configuracao?.diretoriasPorClassificacao?.[classificacao];
    return diretoria && usuarioPertenceAoSetor(tokensUsuario, diretoria);
  });
  const acessoUsuario = await obterAcessoPrioridadeDiretoriaPorUsuario(req.user?.id);
  const escopoConfigurado = resolverEscopoAcesso(acessoUsuario, classificacoesDisponiveis);
  const temEscopoConfigurado = Array.isArray(escopoConfigurado) && escopoConfigurado.length > 0;
  const escopoPadrao = escopoConfigurado || (classificacoesLegado.length ? classificacoesLegado : classificacoesDisponiveis);

  const [
    podeVisualizarPermissao,
    podeCriarPermissao,
    podeFinalizarPermissao,
    podeCancelarPermissao,
    podeExcluirPermissao
  ] = await Promise.all([
    canViewPrioridadesDiretoria(req.user),
    canCreatePrioridadeDiretoriaLote(req.user),
    canFinalizePrioridadeDiretoriaLote(req.user),
    canCancelPrioridadeDiretoriaLote(req.user),
    canDeletePrioridadeDiretoriaLote(req.user)
  ]);

  const classificacoesOperaveis = isSuperadmin || isDirAdmin || podeVisualizarPermissao || temEscopoConfigurado
    ? escopoPadrao
    : classificacoesLegado;
  const classificacoesCriaveis = isSuperadmin || isDirAdmin || podeCriarPermissao ? escopoPadrao : [];
  const classificacoesFinalizaveis = isSuperadmin || podeFinalizarPermissao ? escopoPadrao : classificacoesLegado;
  const classificacoesCancelaveis = isSuperadmin || isDirAdmin || podeCancelarPermissao ? escopoPadrao : [];
  const classificacoesExcluiveis = isSuperadmin || podeExcluirPermissao ? escopoPadrao : [];

  return {
    configuracao,
    perfil,
    tokensUsuario,
    isSuperadmin,
    isDirAdmin,
    acessoUsuario,
    classificacoesDisponiveis,
    podeSolicitarLote: classificacoesCriaveis.length > 0,
    podeVisualizarTodasClassificacoes: classificacoesDisponiveis.length === 0
      ? (isSuperadmin || isDirAdmin || podeVisualizarPermissao || temEscopoConfigurado)
      : todasClassificacoesPermitidas(classificacoesOperaveis, classificacoesDisponiveis),
    classificacoesOperaveis,
    classificacoesCriaveis,
    classificacoesFinalizaveis,
    classificacoesCancelaveis,
    classificacoesExcluiveis,
    podeAcessarModulo: podeVisualizarPermissao || isDirAdmin || temEscopoConfigurado || classificacoesOperaveis.length > 0
  };
}

function permissoesTemClassificacao(permissoes, classificacao, campo = 'classificacoesOperaveis') {
  const valor = normalizarClassificacaoObra(classificacao);
  return Boolean(valor && permissoes?.[campo]?.includes(valor));
}

function usuarioPodeVisualizarLote(permissoes, lote) {
  return permissoesTemClassificacao(permissoes, lote?.classificacao_alvo);
}

function usuarioPodeFinalizarLote(permissoes, lote) {
  return permissoesTemClassificacao(permissoes, lote?.classificacao_alvo, 'classificacoesFinalizaveis');
}

function usuarioPodeCancelarLote(permissoes, lote) {
  return permissoesTemClassificacao(permissoes, lote?.classificacao_alvo, 'classificacoesCancelaveis');
}

function usuarioPodeExcluirLote(permissoes, lote) {
  return permissoesTemClassificacao(permissoes, lote?.classificacao_alvo, 'classificacoesExcluiveis');
}

function calcularResumoPagamentoSolicitacao(solicitacao) {
  const valorTotal = Number(solicitacao?.valor);
  const valorPagoAcumulado = Number(solicitacao?.valor_pago_acumulado || 0);
  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    return {
      valorTotal: null,
      valorPagoAcumulado: Number.isFinite(valorPagoAcumulado) ? Math.max(valorPagoAcumulado, 0) : 0,
      saldoPagamento: null,
      valorExibicao: null
    };
  }
  const pago = Number.isFinite(valorPagoAcumulado) ? Math.max(valorPagoAcumulado, 0) : 0;
  const saldo = Math.max(valorTotal - pago, 0);
  return {
    valorTotal,
    valorPagoAcumulado: pago,
    saldoPagamento: saldo,
    valorExibicao: String(solicitacao?.status_global || '').toUpperCase() === 'PAGA' ? valorTotal : saldo
  };
}

function serializarSolicitacaoPrioridade(solicitacao) {
  const resumo = calcularResumoPagamentoSolicitacao(solicitacao);
  return {
    id: solicitacao.id,
    codigo: solicitacao.codigo,
    numero_sienge: solicitacao.numero_sienge,
    descricao: solicitacao.descricao,
    status_global: solicitacao.status_global,
    area_responsavel: solicitacao.area_responsavel,
    data_vencimento: solicitacao.data_vencimento,
    createdAt: solicitacao.createdAt,
    obra: solicitacao.obra ? {
      id: solicitacao.obra.id,
      nome: solicitacao.obra.nome,
      codigo: solicitacao.obra.codigo,
      classificacao: solicitacao.obra.classificacao || solicitacao.obra.classificacao_obra || null
    } : null,
    tipo: solicitacao.tipo ? {
      id: solicitacao.tipo.id,
      nome: solicitacao.tipo.nome
    } : null,
    valor_total: resumo.valorTotal,
    valor_pago_acumulado: resumo.valorPagoAcumulado,
    saldo_pagamento: resumo.saldoPagamento,
    valor_prioridade: resumo.valorExibicao,
    prioridade_diretoria_ativa: Boolean(solicitacao.prioridade_diretoria_ativa),
    prioridade_diretoria_lote_id: solicitacao.prioridade_diretoria_lote_id || null
  };
}

function serializarLote(lote, resumoItens = null) {
  const valorDisponivel = formatarNumero(lote?.valor_disponivel);
  const valorUtilizado = formatarNumero(resumoItens?.valor_utilizado ?? lote?.valor_utilizado);
  return {
    id: lote.id,
    classificacao_alvo: lote.classificacao_alvo,
    diretoria_alvo_codigo: lote.diretoria_alvo_codigo,
    valor_disponivel: valorDisponivel,
    valor_utilizado: valorUtilizado,
    saldo_disponivel: Math.max(valorDisponivel - valorUtilizado, 0),
    itens_count: Number(resumoItens?.itens_count || 0),
    status: lote.status,
    observacao: lote.observacao || '',
    solicitado_por: lote.solicitado_por,
    solicitado_por_nome: lote?.solicitadoPor?.nome || '-',
    finalizado_por: lote.finalizado_por || null,
    finalizado_por_nome: lote?.finalizadoPor?.nome || null,
    finalizado_em: lote.finalizado_em || null,
    createdAt: lote.createdAt,
    updatedAt: lote.updatedAt
  };
}

async function carregarResumoItensPorLote(loteIds = []) {
  const ids = Array.from(new Set((Array.isArray(loteIds) ? loteIds : []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  if (ids.length === 0) return new Map();
  const itens = await PrioridadeLoteItem.findAll({
    where: { lote_id: { [Op.in]: ids } },
    attributes: ['lote_id', 'valor_considerado']
  });
  const mapa = new Map();
  itens.forEach((item) => {
    const chave = Number(item.lote_id);
    const atual = mapa.get(chave) || { itens_count: 0, valor_utilizado: 0 };
    atual.itens_count += 1;
    atual.valor_utilizado += formatarNumero(item.valor_considerado);
    mapa.set(chave, atual);
  });
  return mapa;
}

async function carregarLoteDetalhe(loteId) {
  return PrioridadeLote.findByPk(loteId, {
    include: [
      { model: User, as: 'solicitadoPor', attributes: ['id', 'nome', 'email'] },
      { model: User, as: 'finalizadoPor', attributes: ['id', 'nome', 'email'] },
      {
        model: PrioridadeLoteItem,
        as: 'itens',
        required: false,
        include: [
          {
            model: Solicitacao,
            as: 'solicitacao',
            include: [
              { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo', 'classificacao'] },
              { model: TipoSolicitacao, as: 'tipo', attributes: ['id', 'nome'] }
            ]
          },
          { model: User, as: 'autorizadoPor', attributes: ['id', 'nome'] }
        ]
      }
    ],
    order: [[{ model: PrioridadeLoteItem, as: 'itens' }, 'id', 'ASC']]
  });
}

async function listarSolicitacoesElegiveisParaLote(lote, busca = '', solicitacaoIds = null, obraId = null) {
  const condicoes = [
    { cancelada: false },
    { fluxo_aprovacao_diretoria: true },
    { diretoria_fluxo_codigo: lote.diretoria_alvo_codigo },
    { prioridade_diretoria_ativa: false },
    { status_global: { [Op.ne]: 'PAGA' } },
    {
      [Op.or]: [
        {
          id: {
            [Op.in]: Sequelize.literal(`(
              SELECT DISTINCT solicitacao_id
                FROM historicos
               WHERE acao = 'APROVADA_DIRETORIA'
            )`)
          }
        },
        { area_responsavel: { [Op.ne]: lote.diretoria_alvo_codigo } }
      ]
    }
  ];

  const idsFiltrados = Array.from(new Set((Array.isArray(solicitacaoIds) ? solicitacaoIds : []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  if (idsFiltrados.length > 0) condicoes.push({ id: { [Op.in]: idsFiltrados } });
  const obraIdNormalizado = Number(obraId);
  if (Number.isInteger(obraIdNormalizado) && obraIdNormalizado > 0) condicoes.push({ obra_id: obraIdNormalizado });

  const buscaNormalizada = String(busca || '').trim();
  if (buscaNormalizada) {
    condicoes.push({
      [Op.or]: [
        { codigo: { [Op.like]: `%${buscaNormalizada}%` } },
        { numero_sienge: { [Op.like]: `%${buscaNormalizada}%` } },
        { descricao: { [Op.like]: `%${buscaNormalizada}%` } },
        Sequelize.where(Sequelize.col('obra.nome'), { [Op.like]: `%${buscaNormalizada}%` }),
        Sequelize.where(Sequelize.col('tipo.nome'), { [Op.like]: `%${buscaNormalizada}%` })
      ]
    });
  }

  const rows = await Solicitacao.findAll({
    where: { [Op.and]: condicoes },
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'nome', 'codigo', 'classificacao'],
        required: true,
        where: lote.classificacao_alvo ? { classificacao: lote.classificacao_alvo } : undefined
      },
      { model: TipoSolicitacao, as: 'tipo', attributes: ['id', 'nome'], required: false }
    ],
    order: [['data_vencimento', 'ASC'], ['createdAt', 'DESC']]
  });

  return rows.map(serializarSolicitacaoPrioridade).filter((item) => Number(item.valor_prioridade) > 0);
}

async function obterSetoresPorTokens(tokens = []) {
  const lista = Array.from(new Set((Array.isArray(tokens) ? tokens : []).map(normalizarTokenSetor).filter(Boolean)));
  if (lista.length === 0) return [];
  return Setor.findAll({
    where: {
      [Op.or]: [
        { codigo: { [Op.in]: lista } },
        { nome: { [Op.in]: lista } }
      ]
    },
    attributes: ['id', 'codigo', 'nome']
  });
}

function serializarDiretoriasDisponiveis(configuracao, setoresDb = [], classificacoesPermitidas = []) {
  const mapaSetores = new Map();
  (Array.isArray(setoresDb) ? setoresDb : []).forEach((setor) => {
    const codigo = normalizarTokenSetor(setor?.codigo);
    const nome = normalizarTokenSetor(setor?.nome);
    if (codigo) mapaSetores.set(codigo, setor);
    if (nome) mapaSetores.set(nome, setor);
  });
  const permitidas = new Set(normalizarClassificacoesPermitidas(
    classificacoesPermitidas?.length ? classificacoesPermitidas : obterClassificacoesDisponiveis(configuracao),
    obterClassificacoesDisponiveis(configuracao)
  ));

  return ['PUBLICA', 'PRIVADA'].map((classificacao) => {
    if (!permitidas.has(classificacao)) return null;
    const codigo = configuracao?.diretoriasPorClassificacao?.[classificacao];
    if (!codigo) return null;
    const setor = mapaSetores.get(normalizarTokenSetor(codigo));
    return {
      classificacao,
      diretoria_codigo: codigo,
      diretoria_nome: setor?.nome || codigo,
      diretoria_label: setor?.nome ? `${setor.nome} (${codigo})` : codigo
    };
  }).filter(Boolean);
}

module.exports = {
  async contexto(req, res) {
    try {
      const permissoes = await obterPermissoesPrioridade(req);
      if (!permissoes.podeAcessarModulo) {
        return res.status(403).json({ error: 'Acesso negado ao modulo de prioridades.' });
      }
      const diretoriasTokens = Object.values(permissoes.configuracao?.diretoriasPorClassificacao || {});
      const diretoriasDb = await obterSetoresPorTokens(diretoriasTokens);
      return res.json({
        permissoes: {
          pode_solicitar_lote: permissoes.podeSolicitarLote,
          classificacoes_operaveis: permissoes.classificacoesOperaveis,
          classificacoes_criaveis: permissoes.classificacoesCriaveis,
          classificacoes_finalizaveis: permissoes.classificacoesFinalizaveis,
          classificacoes_cancelaveis: permissoes.classificacoesCancelaveis,
          classificacoes_excluiveis: permissoes.classificacoesExcluiveis,
          is_superadmin: permissoes.isSuperadmin,
          is_dir_admin: permissoes.isDirAdmin
        },
        diretorias_disponiveis: serializarDiretoriasDisponiveis(
          permissoes.configuracao,
          diretoriasDb,
          permissoes.podeSolicitarLote ? permissoes.classificacoesCriaveis : permissoes.classificacoesOperaveis
        )
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar contexto de prioridades.' });
    }
  },

  async index(req, res) {
    try {
      const permissoes = await obterPermissoesPrioridade(req);
      if (!permissoes.podeAcessarModulo) {
        return res.status(403).json({ error: 'Acesso negado ao modulo de prioridades.' });
      }
      const where = {};
      const status = normalizarStatusLote(req.query?.status);
      if (status) where.status = status;
      if (!permissoes.podeVisualizarTodasClassificacoes) {
        where.classificacao_alvo = { [Op.in]: permissoes.classificacoesOperaveis };
      }
      const lotes = await PrioridadeLote.findAll({
        where,
        include: [
          { model: User, as: 'solicitadoPor', attributes: ['id', 'nome'] },
          { model: User, as: 'finalizadoPor', attributes: ['id', 'nome'] }
        ],
        order: [['createdAt', 'DESC']]
      });
      const resumoItens = await carregarResumoItensPorLote(lotes.map((lote) => lote.id));
      return res.json({
        items: lotes.map((lote) => ({
          ...serializarLote(lote, resumoItens.get(Number(lote.id))),
          pode_finalizar: usuarioPodeFinalizarLote(permissoes, lote) && lote.status === STATUS_LOTE.ABERTO,
          pode_cancelar: usuarioPodeCancelarLote(permissoes, lote) && lote.status === STATUS_LOTE.ABERTO,
          pode_excluir: usuarioPodeExcluirLote(permissoes, lote)
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar lotes de prioridade.' });
    }
  },

  async create(req, res) {
    try {
      const permissoes = await obterPermissoesPrioridade(req);
      if (!permissoes.podeSolicitarLote) {
        return res.status(403).json({ error: 'Usuario sem permissao para solicitar lotes de prioridade.' });
      }
      const classificacaoAlvo = normalizarClassificacaoObra(req.body?.classificacao_alvo);
      const valorDisponivel = Number(req.body?.valor_disponivel);
      const observacao = String(req.body?.observacao || '').trim();
      if (!classificacaoAlvo) return res.status(400).json({ error: 'Informe a diretoria alvo do lote.' });
      if (!permissoes.classificacoesCriaveis.includes(classificacaoAlvo)) {
        return res.status(403).json({ error: 'Usuario sem permissao para criar lote nesta diretoria.' });
      }
      if (!Number.isFinite(valorDisponivel) || valorDisponivel <= 0) {
        return res.status(400).json({ error: 'Informe um valor disponivel valido para o lote.' });
      }
      const diretoriaAlvoCodigo = permissoes.configuracao?.diretoriasPorClassificacao?.[classificacaoAlvo] || null;
      if (!diretoriaAlvoCodigo) {
        return res.status(400).json({ error: `Nao existe diretoria configurada para a classificacao ${classificacaoAlvo}.` });
      }
      const lote = await PrioridadeLote.create({
        classificacao_alvo: classificacaoAlvo,
        diretoria_alvo_codigo: diretoriaAlvoCodigo,
        valor_disponivel: valorDisponivel,
        valor_utilizado: 0,
        status: STATUS_LOTE.ABERTO,
        observacao: observacao || null,
        solicitado_por: req.user.id
      });
      const detalhe = await carregarLoteDetalhe(lote.id);
      return res.status(201).json({ item: serializarLote(detalhe) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar lote de prioridade.' });
    }
  },

  async show(req, res) {
    try {
      const permissoes = await obterPermissoesPrioridade(req);
      if (!permissoes.podeAcessarModulo) {
        return res.status(403).json({ error: 'Acesso negado ao modulo de prioridades.' });
      }
      const lote = await carregarLoteDetalhe(req.params.id);
      if (!lote) return res.status(404).json({ error: 'Lote de prioridade nao encontrado.' });
      if (!usuarioPodeVisualizarLote(permissoes, lote)) {
        return res.status(403).json({ error: 'Acesso negado a este lote de prioridade.' });
      }
      return res.json({
        item: {
          ...serializarLote(lote),
          itens: (Array.isArray(lote.itens) ? lote.itens : []).map((item) => ({
            id: item.id,
            valor_considerado: formatarNumero(item.valor_considerado),
            autorizado_em: item.autorizado_em,
            autorizado_por: item.autorizado_por,
            autorizado_por_nome: item?.autorizadoPor?.nome || '-',
            solicitacao: item.solicitacao ? serializarSolicitacaoPrioridade(item.solicitacao) : null
          })),
          pode_finalizar: usuarioPodeFinalizarLote(permissoes, lote) && lote.status === STATUS_LOTE.ABERTO,
          pode_cancelar: usuarioPodeCancelarLote(permissoes, lote) && lote.status === STATUS_LOTE.ABERTO,
          pode_excluir: usuarioPodeExcluirLote(permissoes, lote)
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar lote de prioridade.' });
    }
  },

  async solicitacoesDisponiveis(req, res) {
    try {
      const permissoes = await obterPermissoesPrioridade(req);
      if (!permissoes.podeAcessarModulo) {
        return res.status(403).json({ error: 'Acesso negado ao modulo de prioridades.' });
      }
      const lote = await PrioridadeLote.findByPk(req.params.id);
      if (!lote) return res.status(404).json({ error: 'Lote de prioridade nao encontrado.' });
      if (!usuarioPodeVisualizarLote(permissoes, lote)) {
        return res.status(403).json({ error: 'Acesso negado a este lote de prioridade.' });
      }
      const items = lote.status === STATUS_LOTE.ABERTO
        ? await listarSolicitacoesElegiveisParaLote(lote, req.query?.busca, null, req.query?.obra_id)
        : [];
      return res.json({ items });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar solicitacoes disponiveis para prioridade.' });
    }
  },

  async finalizar(req, res) {
    const transaction = await PrioridadeLote.sequelize.transaction();
    try {
      const permissoes = await obterPermissoesPrioridade(req);
      if (!permissoes.podeAcessarModulo) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Acesso negado ao modulo de prioridades.' });
      }
      const lote = await PrioridadeLote.findByPk(req.params.id, { transaction });
      if (!lote) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Lote de prioridade nao encontrado.' });
      }
      if (!usuarioPodeFinalizarLote(permissoes, lote)) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas a diretoria alvo pode finalizar este lote.' });
      }
      if (String(lote.status || '').toUpperCase() !== STATUS_LOTE.ABERTO) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Somente lotes abertos podem ser finalizados.' });
      }
      const solicitacaoIds = Array.from(new Set((Array.isArray(req.body?.solicitacao_ids) ? req.body.solicitacao_ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
      if (solicitacaoIds.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Selecione ao menos uma solicitacao para o lote.' });
      }
      const solicitacoesSelecionadas = await listarSolicitacoesElegiveisParaLote(lote, '', solicitacaoIds);
      if (solicitacoesSelecionadas.length !== solicitacaoIds.length) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Uma ou mais solicitacoes selecionadas nao estao elegiveis para prioridade.' });
      }
      const valorUtilizado = solicitacoesSelecionadas.reduce((total, item) => total + formatarNumero(item.valor_prioridade), 0);
      const valorDisponivel = formatarNumero(lote.valor_disponivel);
      if (valorUtilizado > valorDisponivel) {
        await transaction.rollback();
        return res.status(400).json({ error: 'O valor total das solicitacoes selecionadas excede o limite disponivel do lote.' });
      }
      const agora = new Date();
      await PrioridadeLoteItem.bulkCreate(
        solicitacoesSelecionadas.map((item) => ({
          lote_id: lote.id,
          solicitacao_id: item.id,
          valor_considerado: item.valor_prioridade,
          autorizado_por: req.user.id,
          autorizado_em: agora
        })),
        { transaction }
      );
      await Solicitacao.update(
        {
          prioridade_diretoria_ativa: true,
          prioridade_diretoria_em: agora,
          prioridade_diretoria_lote_id: lote.id
        },
        {
          where: { id: { [Op.in]: solicitacoesSelecionadas.map((item) => item.id) } },
          transaction
        }
      );
      await Historico.bulkCreate(
        solicitacoesSelecionadas.map((item) => ({
          solicitacao_id: item.id,
          usuario_responsavel_id: req.user.id,
          setor: lote.diretoria_alvo_codigo,
          acao: 'PRIORIDADE_DIRETORIA_AUTORIZADA',
          observacao: `Autorizada no lote de prioridade #${lote.id}`
        })),
        { transaction }
      );
      await lote.update({
        status: STATUS_LOTE.FINALIZADO,
        valor_utilizado: valorUtilizado,
        finalizado_por: req.user.id,
        finalizado_em: agora
      }, { transaction });
      await transaction.commit();

      await Promise.allSettled(solicitacoesSelecionadas.map((item) => criarNotificacao({
        solicitacao_id: item.id,
        tipo: 'PRIORIDADE_DIRETORIA_AUTORIZADA',
        mensagem: `Solicitacao ${item.codigo || item.id} autorizada em lote de prioridade`,
        metadata: { prioridade_lote_id: lote.id },
        created_by: req.user.id
      })));

      const detalhe = await carregarLoteDetalhe(lote.id);
      return res.json({ item: serializarLote(detalhe) });
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: 'Erro ao finalizar lote de prioridade.' });
    }
  },

  async cancelar(req, res) {
    try {
      const permissoes = await obterPermissoesPrioridade(req);
      const lote = await PrioridadeLote.findByPk(req.params.id);
      if (!lote) return res.status(404).json({ error: 'Lote de prioridade nao encontrado.' });
      if (!usuarioPodeCancelarLote(permissoes, lote)) {
        return res.status(403).json({ error: 'Usuario sem permissao para cancelar este lote.' });
      }
      if (String(lote.status || '').toUpperCase() !== STATUS_LOTE.ABERTO) {
        return res.status(400).json({ error: 'Apenas lotes abertos podem ser cancelados.' });
      }
      const itensCount = await PrioridadeLoteItem.count({ where: { lote_id: lote.id } });
      if (itensCount > 0) {
        return res.status(400).json({ error: 'Nao e possivel cancelar um lote que ja possui itens autorizados.' });
      }
      await lote.update({ status: STATUS_LOTE.CANCELADO });
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao cancelar lote de prioridade.' });
    }
  },

  async excluir(req, res) {
    const transaction = await PrioridadeLote.sequelize.transaction();
    try {
      const permissoes = await obterPermissoesPrioridade(req);
      const lote = await PrioridadeLote.findByPk(req.params.id, { transaction });
      if (!lote) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Lote de prioridade nao encontrado.' });
      }
      if (!usuarioPodeExcluirLote(permissoes, lote)) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Usuario sem permissao para excluir este lote.' });
      }
      const itensCount = await PrioridadeLoteItem.count({ where: { lote_id: lote.id }, transaction });
      if (itensCount > 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Nao e possivel excluir um lote que ja possui solicitacoes autorizadas.' });
      }
      await lote.destroy({ transaction });
      await transaction.commit();
      return res.sendStatus(204);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: 'Erro ao excluir lote de prioridade.' });
    }
  }
};
