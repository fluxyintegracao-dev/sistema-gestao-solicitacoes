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
const {
  usuarioTemAcessoPrioridadeDiretoria
} = require('../services/prioridadeDiretoriaAcesso');
const {
  obterTokensSetoresUsuario: obterTokensSetoresUsuarioComVinculos
} = require('../services/usuariosSetores');
const { criarNotificacao } = require('../services/notificacoes');

const STATUS_LOTE = {
  ABERTO: 'ABERTO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO'
};

const TIPO_LOTE = {
  DIR_ADMIN: 'DIR_ADMIN',
  SOLICITACAO_DIRETORIA: 'SOLICITACAO_DIRETORIA'
};

const DIRETORIA_ADMIN_CODIGO = 'DIR_ADMIN';
const DIRETORIA_ADMIN_NOME = 'DIRETORIA ADMINISTRATIVA';
const SETOR_FINANCEIRO_CODIGO = 'FINANCEIRO';

function normalizarStatusLote(valor) {
  const status = String(valor || '').trim().toUpperCase();
  return Object.values(STATUS_LOTE).includes(status) ? status : null;
}

function formatarNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function calcularResumoPagamentoSolicitacao(solicitacao) {
  const valorTotal = Number(solicitacao?.valor);
  const valorPagoAcumulado = Number(solicitacao?.valor_pago_acumulado || 0);
  const statusAtual = String(solicitacao?.status_global || '').trim().toUpperCase();

  if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
    return {
      valorTotal: null,
      valorPagoAcumulado: Number.isFinite(valorPagoAcumulado) ? Math.max(valorPagoAcumulado, 0) : 0,
      saldoPagamento: null,
      valorExibicao: null
    };
  }

  const valorPagoNormalizado = Number.isFinite(valorPagoAcumulado)
    ? Math.max(valorPagoAcumulado, 0)
    : 0;
  const saldoPagamento = Math.max(valorTotal - valorPagoNormalizado, 0);
  const valorExibicao = statusAtual === 'PAGA' ? valorTotal : saldoPagamento;

  return {
    valorTotal,
    valorPagoAcumulado: valorPagoNormalizado,
    saldoPagamento,
    valorExibicao
  };
}

async function obterAreaUsuario(req) {
  let areaUsuario = req.user?.area || null;

  if (!areaUsuario && req.user?.setor_id) {
    const setorIdRaw = String(req.user.setor_id);
    const setorAtual = await Setor.findOne({
      where: {
        [Op.or]: [
          { id: req.user.setor_id },
          { codigo: setorIdRaw },
          { nome: setorIdRaw }
        ]
      },
      attributes: ['id', 'codigo', 'nome']
    });
    areaUsuario = setorAtual?.codigo || setorAtual?.nome || null;
  }

  return normalizarTokenSetor(areaUsuario);
}

async function obterTokensSetorUsuario(req, areaUsuario) {
  const tokens = await obterTokensSetoresUsuarioComVinculos(
    req.user,
    areaUsuario ? [areaUsuario] : []
  );
  return Array.from(
    new Set(tokens.map(normalizarTokenSetor).filter(Boolean))
  );
}

function usuarioPertenceAoSetor(tokensUsuario = [], tokenSetor = null) {
  const token = normalizarTokenSetor(tokenSetor);
  if (!token) return false;
  return (Array.isArray(tokensUsuario) ? tokensUsuario : []).includes(token);
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

async function obterPermissoesPrioridade(req) {
  const configuracao = await obterConfiguracaoAprovacaoDiretoria();
  const perfil = String(req.user?.perfil || '').trim().toUpperCase();
  const areaUsuario = await obterAreaUsuario(req);
  const tokensUsuario = await obterTokensSetorUsuario(req, areaUsuario);
  const isSuperadmin = perfil === 'SUPERADMIN';
  const isDirAdmin = isSuperadmin || usuarioPertenceAoSetor(tokensUsuario, DIRETORIA_ADMIN_CODIGO);
  const isLeitorConfigurado = await usuarioTemAcessoPrioridadeDiretoria(req.user?.id);
  const classificacoesOperaveis = ['PUBLICA', 'PRIVADA'].filter((classificacao) => {
    const diretoriaConfigurada = configuracao?.diretoriasPorClassificacao?.[classificacao];
    return diretoriaConfigurada && usuarioPertenceAoSetor(tokensUsuario, diretoriaConfigurada);
  });

  return {
    configuracao,
    perfil,
    areaUsuario,
    tokensUsuario,
    isSuperadmin,
    isDirAdmin,
    isLeitorConfigurado,
    podeSolicitarLote: isDirAdmin,
    classificacoesOperaveis,
    podeAcessarModulo: isDirAdmin || classificacoesOperaveis.length > 0 || isLeitorConfigurado
  };
}

function usuarioPodeVisualizarLote(permissoes, lote) {
  if (permissoes?.isSuperadmin || permissoes?.isDirAdmin) return true;
  if (Array.isArray(permissoes?.classificacoesOperaveis) && permissoes.classificacoesOperaveis.length > 0) {
    return permisssoesTemClassificacao(permissoes, lote?.classificacao_alvo);
  }
  if (permissoes?.isLeitorConfigurado) return true;
  return permisssoesTemClassificacao(permissoes, lote?.classificacao_alvo);
}

function permisssoesTemClassificacao(permissoes, classificacao) {
  const valor = normalizarClassificacaoObra(classificacao);
  return Boolean(valor && Array.isArray(permissoes?.classificacoesOperaveis) && permissoes.classificacoesOperaveis.includes(valor));
}

function usuarioPodeFinalizarLote(permissoes, lote) {
  if (permissoes?.isSuperadmin) return true;
  if (String(lote?.tipo_lote || TIPO_LOTE.DIR_ADMIN).toUpperCase() === TIPO_LOTE.SOLICITACAO_DIRETORIA) {
    return Boolean(permissoes?.isDirAdmin);
  }
  return permisssoesTemClassificacao(permissoes, lote?.classificacao_alvo);
}

function obterDiretoriaCriadora(permissoes, classificacaoSolicitada = null) {
  const classificacoes = Array.isArray(permissoes?.classificacoesOperaveis)
    ? permissoes.classificacoesOperaveis
    : [];
  const classificacaoNormalizada = normalizarClassificacaoObra(classificacaoSolicitada);
  const classificacao = classificacaoNormalizada || classificacoes[0] || null;

  if (!classificacao || !classificacoes.includes(classificacao)) {
    return null;
  }

  const codigo = permissoes?.configuracao?.diretoriasPorClassificacao?.[classificacao] || null;
  if (!codigo) return null;

  return {
    classificacao,
    codigo,
    nome: codigo
  };
}

function serializarDiretoriasDisponiveis(configuracao, setoresDb = []) {
  const mapaSetores = new Map();
  (Array.isArray(setoresDb) ? setoresDb : []).forEach((setor) => {
    const codigo = normalizarTokenSetor(setor?.codigo);
    const nome = normalizarTokenSetor(setor?.nome);
    if (codigo) mapaSetores.set(codigo, setor);
    if (nome) mapaSetores.set(nome, setor);
  });

  return ['PUBLICA', 'PRIVADA']
    .map((classificacao) => {
      const codigo = configuracao?.diretoriasPorClassificacao?.[classificacao];
      if (!codigo) return null;

      const setor = mapaSetores.get(normalizarTokenSetor(codigo));
      return {
        classificacao,
        diretoria_codigo: codigo,
        diretoria_nome: setor?.nome || codigo,
        diretoria_label: setor?.nome ? `${setor.nome} (${codigo})` : codigo
      };
    })
    .filter(Boolean);
}

function serializarLote(lote, resumoItens = null) {
  const valorDisponivel = formatarNumero(lote?.valor_disponivel);
  const valorUtilizado = formatarNumero(
    resumoItens?.valor_utilizado != null ? resumoItens.valor_utilizado : lote?.valor_utilizado
  );
  const itensCount = Number(resumoItens?.itens_count || 0);

  return {
    id: lote.id,
    classificacao_alvo: lote.classificacao_alvo,
    diretoria_alvo_codigo: lote.diretoria_alvo_codigo,
    tipo_lote: lote.tipo_lote || TIPO_LOTE.DIR_ADMIN,
    setor_criador_codigo: lote.setor_criador_codigo || DIRETORIA_ADMIN_CODIGO,
    setor_criador_nome: lote.setor_criador_nome || (lote.setor_criador_codigo === DIRETORIA_ADMIN_CODIGO ? DIRETORIA_ADMIN_NOME : lote.setor_criador_codigo) || DIRETORIA_ADMIN_NOME,
    valor_disponivel: valorDisponivel,
    valor_utilizado: valorUtilizado,
    saldo_disponivel: Math.max(valorDisponivel - valorUtilizado, 0),
    itens_count: itensCount,
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

function normalizarSolicitacaoIds(lista) {
  return Array.from(
    new Set((Array.isArray(lista) ? lista : [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0))
  );
}

function serializarSolicitacaoPrioridade(solicitacao) {
  const resumoPagamento = calcularResumoPagamentoSolicitacao(solicitacao);
  return {
    id: solicitacao.id,
    codigo: solicitacao.codigo,
    numero_sienge: solicitacao.numero_sienge,
    descricao: solicitacao.descricao,
    status_global: solicitacao.status_global,
    area_responsavel: solicitacao.area_responsavel,
    data_vencimento: solicitacao.data_vencimento,
    createdAt: solicitacao.createdAt,
    obra: solicitacao.obra
      ? {
          id: solicitacao.obra.id,
          nome: solicitacao.obra.nome,
          codigo: solicitacao.obra.codigo,
          classificacao_obra: solicitacao.obra.classificacao_obra
        }
      : null,
    tipo: solicitacao.tipo
      ? {
          id: solicitacao.tipo.id,
          nome: solicitacao.tipo.nome
        }
      : null,
    valor_total: resumoPagamento.valorTotal,
    valor_pago_acumulado: resumoPagamento.valorPagoAcumulado,
    saldo_pagamento: resumoPagamento.saldoPagamento,
    valor_prioridade: resumoPagamento.valorExibicao,
    prioridade_diretoria_ativa: Boolean(solicitacao.prioridade_diretoria_ativa),
    prioridade_diretoria_lote_id: solicitacao.prioridade_diretoria_lote_id || null
  };
}

async function carregarResumoItensPorLote(loteIds = []) {
  const ids = Array.from(new Set((Array.isArray(loteIds) ? loteIds : []).map(Number).filter(id => Number.isInteger(id) && id > 0)));
  if (ids.length === 0) return new Map();

  const itens = await PrioridadeLoteItem.findAll({
    where: {
      lote_id: { [Op.in]: ids }
    },
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
      {
        model: User,
        as: 'solicitadoPor',
        attributes: ['id', 'nome', 'email']
      },
      {
        model: User,
        as: 'finalizadoPor',
        attributes: ['id', 'nome', 'email']
      },
      {
        model: PrioridadeLoteItem,
        as: 'itens',
        required: false,
        include: [
          {
            model: Solicitacao,
            as: 'solicitacao',
            include: [
              {
                model: Obra,
                as: 'obra',
                attributes: ['id', 'nome', 'codigo', 'classificacao_obra']
              },
              {
                model: TipoSolicitacao,
                as: 'tipo',
                attributes: ['id', 'nome']
              }
            ]
          },
          {
            model: User,
            as: 'autorizadoPor',
            attributes: ['id', 'nome']
          }
        ]
      }
    ],
    order: [[{ model: PrioridadeLoteItem, as: 'itens' }, 'id', 'ASC']]
  });
}

async function listarSolicitacoesElegiveisParaLote(lote, busca = '', solicitacaoIds = null, obraId = null, options = {}) {
  const condicaoSolicitacaoAprovadaNoFluxo = {
    [Op.and]: [
      { fluxo_aprovacao_diretoria: true },
      { diretoria_fluxo_codigo: lote.diretoria_alvo_codigo },
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
          {
            area_responsavel: {
              [Op.ne]: lote.diretoria_alvo_codigo
            }
          },
          Sequelize.where(
            Sequelize.fn('UPPER', Sequelize.col('status_global')),
            { [Op.eq]: 'APROVADA' }
          )
        ]
      }
    ]
  };

  const condicaoSolicitacaoLegadaSemFluxo = {
    [Op.or]: [
      { fluxo_aprovacao_diretoria: false },
      { fluxo_aprovacao_diretoria: null }
    ]
  };

  const condicoes = [
    { cancelada: false },
    { prioridade_diretoria_ativa: false },
    Sequelize.where(
      Sequelize.fn('UPPER', Sequelize.col('status_global')),
      { [Op.ne]: 'PAGA' }
    ),
    Sequelize.where(
      Sequelize.fn('UPPER', Sequelize.fn('TRIM', Sequelize.col('area_responsavel'))),
      { [Op.eq]: SETOR_FINANCEIRO_CODIGO }
    ),
    {
      [Op.or]: [
        condicaoSolicitacaoAprovadaNoFluxo,
        condicaoSolicitacaoLegadaSemFluxo
      ]
    }
  ];

  const idsFiltrados = Array.from(
    new Set((Array.isArray(solicitacaoIds) ? solicitacaoIds : []).map(Number).filter((id) => Number.isInteger(id) && id > 0))
  );
  if (idsFiltrados.length > 0) {
    condicoes.push({ id: { [Op.in]: idsFiltrados } });
  }

  const obraIdNormalizado = Number(obraId);
  if (Number.isInteger(obraIdNormalizado) && obraIdNormalizado > 0) {
    condicoes.push({ obra_id: obraIdNormalizado });
  }

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
    where: {
      [Op.and]: condicoes
    },
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'nome', 'codigo', 'classificacao_obra'],
        required: true,
        where: lote.classificacao_alvo
          ? { classificacao_obra: lote.classificacao_alvo }
          : undefined
      },
      {
        model: TipoSolicitacao,
        as: 'tipo',
        attributes: ['id', 'nome'],
        required: false
      }
    ],
    order: [
      ['data_vencimento', 'ASC'],
      ['createdAt', 'DESC']
    ],
    transaction: options.transaction
  });

  return rows
    .map(serializarSolicitacaoPrioridade)
    .filter((item) => Number(item.valor_prioridade) > 0);
}

async function sincronizarItensLote({
  lote,
  solicitacaoIds,
  usuarioId,
  transaction
}) {
  const idsSelecionados = normalizarSolicitacaoIds(solicitacaoIds);

  if (idsSelecionados.length === 0) {
    await PrioridadeLoteItem.destroy({
      where: { lote_id: lote.id },
      transaction
    });
    return {
      solicitacoesSelecionadas: [],
      valorUtilizado: 0
    };
  }

  const solicitacoesSelecionadas = await listarSolicitacoesElegiveisParaLote(
    lote,
    '',
    idsSelecionados,
    null,
    { transaction }
  );

  if (solicitacoesSelecionadas.length !== idsSelecionados.length) {
    const error = new Error('Uma ou mais solicitacoes selecionadas nao estao elegiveis para prioridade.');
    error.status = 400;
    throw error;
  }

  const agora = new Date();
  const mapaSolicitacoes = new Map(
    solicitacoesSelecionadas.map((item) => [Number(item.id), item])
  );

  await PrioridadeLoteItem.destroy({
    where: {
      lote_id: lote.id,
      solicitacao_id: { [Op.notIn]: idsSelecionados }
    },
    transaction
  });

  for (const solicitacaoId of idsSelecionados) {
    const item = mapaSolicitacoes.get(Number(solicitacaoId));
    const [registro, criado] = await PrioridadeLoteItem.findOrCreate({
      where: {
        lote_id: lote.id,
        solicitacao_id: solicitacaoId
      },
      defaults: {
        valor_considerado: item.valor_prioridade,
        autorizado_por: usuarioId,
        autorizado_em: agora
      },
      transaction
    });

    if (!criado) {
      await registro.update({
        valor_considerado: item.valor_prioridade,
        autorizado_por: usuarioId,
        autorizado_em: agora
      }, { transaction });
    }
  }

  return {
    solicitacoesSelecionadas,
    valorUtilizado: solicitacoesSelecionadas.reduce(
      (total, item) => total + formatarNumero(item.valor_prioridade),
      0
    )
  };
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
          pode_acessar_modulo: permissoes.podeAcessarModulo,
          acesso_visualizacao_configurado: permissoes.isLeitorConfigurado,
          is_superadmin: permissoes.isSuperadmin,
          is_dir_admin: permissoes.isDirAdmin
        },
        diretorias_disponiveis: serializarDiretoriasDisponiveis(permissoes.configuracao, diretoriasDb)
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
      if (status) {
        where.status = status;
      }

      if (
        !permissoes.isSuperadmin &&
        !permissoes.isDirAdmin &&
        Array.isArray(permissoes.classificacoesOperaveis) &&
        permissoes.classificacoesOperaveis.length > 0
      ) {
        where.classificacao_alvo = {
          [Op.in]: permissoes.classificacoesOperaveis
        };
      }

      const lotes = await PrioridadeLote.findAll({
        where,
        include: [
          {
            model: User,
            as: 'solicitadoPor',
            attributes: ['id', 'nome']
          },
          {
            model: User,
            as: 'finalizadoPor',
            attributes: ['id', 'nome']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const resumoItens = await carregarResumoItensPorLote(lotes.map((lote) => lote.id));

      return res.json({
        items: lotes.map((lote) => ({
          ...serializarLote(lote, resumoItens.get(Number(lote.id))),
          pode_finalizar: usuarioPodeFinalizarLote(permissoes, lote) && lote.status === STATUS_LOTE.ABERTO,
          pode_cancelar: (permissoes.isSuperadmin || permissoes.isDirAdmin) && lote.status === STATUS_LOTE.ABERTO,
          pode_excluir: Boolean(permissoes.isSuperadmin),
          pode_reabrir: Boolean(permissoes.isSuperadmin) && lote.status === STATUS_LOTE.FINALIZADO
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
        return res.status(403).json({ error: 'Apenas a Diretoria Administrativa pode solicitar lotes de prioridade.' });
      }

      const classificacaoAlvo = normalizarClassificacaoObra(req.body?.classificacao_alvo);
      const valorDisponivel = Number(req.body?.valor_disponivel);
      const observacao = String(req.body?.observacao || '').trim();

      if (!classificacaoAlvo) {
        return res.status(400).json({ error: 'Informe a diretoria alvo do lote.' });
      }

      if (!Number.isFinite(valorDisponivel) || valorDisponivel <= 0) {
        return res.status(400).json({ error: 'Informe um valor disponivel valido para o lote.' });
      }

      const diretoriaAlvoCodigo =
        permissoes.configuracao?.diretoriasPorClassificacao?.[classificacaoAlvo] || null;

      if (!diretoriaAlvoCodigo) {
        return res.status(400).json({
          error: `Nao existe diretoria configurada para a classificacao ${classificacaoAlvo}.`
        });
      }

      const lote = await PrioridadeLote.create({
        classificacao_alvo: classificacaoAlvo,
        diretoria_alvo_codigo: diretoriaAlvoCodigo,
        tipo_lote: TIPO_LOTE.DIR_ADMIN,
        setor_criador_codigo: DIRETORIA_ADMIN_CODIGO,
        setor_criador_nome: DIRETORIA_ADMIN_NOME,
        valor_disponivel: valorDisponivel,
        valor_utilizado: 0,
        status: STATUS_LOTE.ABERTO,
        observacao: observacao || null,
        solicitado_por: req.user.id
      });

      const detalhe = await carregarLoteDetalhe(lote.id);

      return res.status(201).json({
        item: {
          ...serializarLote(detalhe),
          pode_finalizar: usuarioPodeFinalizarLote(permissoes, detalhe),
          pode_cancelar: true,
          pode_excluir: Boolean(permissoes.isSuperadmin),
          pode_reabrir: false
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar lote de prioridade.' });
    }
  },

  async solicitarUrgencia(req, res) {
    const transaction = await PrioridadeLote.sequelize.transaction();
    let transactionFinalizada = false;

    try {
      const permissoes = await obterPermissoesPrioridade(req);
      const diretoriaCriadora = obterDiretoriaCriadora(permissoes, req.body?.classificacao_alvo);

      if (!diretoriaCriadora) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas DIR_OBRAS_PUBLICAS ou DIR_OBRAS_PRIVADAS podem solicitar prioridade para o financeiro.' });
      }

      const solicitacaoIds = normalizarSolicitacaoIds(req.body?.solicitacao_ids);
      const observacao = String(req.body?.observacao || '').trim();

      if (solicitacaoIds.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Selecione ao menos uma solicitacao para solicitar prioridade.' });
      }

      const lote = await PrioridadeLote.create({
        classificacao_alvo: diretoriaCriadora.classificacao,
        diretoria_alvo_codigo: diretoriaCriadora.codigo,
        tipo_lote: TIPO_LOTE.SOLICITACAO_DIRETORIA,
        setor_criador_codigo: diretoriaCriadora.codigo,
        setor_criador_nome: diretoriaCriadora.nome,
        valor_disponivel: 1,
        valor_utilizado: 0,
        status: STATUS_LOTE.ABERTO,
        observacao: observacao || 'Solicitacao de prioridade enviada pela diretoria para aprovacao da Diretoria Administrativa.',
        solicitado_por: req.user.id
      }, { transaction });

      let resultadoSincronizacao;
      try {
        resultadoSincronizacao = await sincronizarItensLote({
          lote,
          solicitacaoIds,
          usuarioId: req.user.id,
          transaction
        });
      } catch (error) {
        await transaction.rollback();
        return res.status(error.status || 400).json({
          error: error.message || 'Erro ao criar lote de prioridade solicitado pela diretoria.'
        });
      }

      await lote.update({
        valor_disponivel: resultadoSincronizacao.valorUtilizado,
        valor_utilizado: resultadoSincronizacao.valorUtilizado
      }, { transaction });

      await Historico.bulkCreate(
        resultadoSincronizacao.solicitacoesSelecionadas.map((item) => ({
          solicitacao_id: item.id,
          usuario_responsavel_id: req.user.id,
          setor: diretoriaCriadora.codigo,
          acao: 'PRIORIDADE_DIRETORIA_SOLICITADA',
          observacao: `Solicitada prioridade para aprovacao da Diretoria Administrativa no lote #${lote.id}`
        })),
        { transaction }
      );

      await transaction.commit();
      transactionFinalizada = true;

      const detalhe = await carregarLoteDetalhe(lote.id);

      return res.status(201).json({
        item: {
          ...serializarLote(detalhe),
          itens: (Array.isArray(detalhe.itens) ? detalhe.itens : []).map((item) => ({
            id: item.id,
            valor_considerado: formatarNumero(item.valor_considerado),
            autorizado_em: item.autorizado_em,
            autorizado_por: item.autorizado_por,
            autorizado_por_nome: item?.autorizadoPor?.nome || '-',
            solicitacao: item.solicitacao ? serializarSolicitacaoPrioridade(item.solicitacao) : null
          })),
          pode_finalizar: false,
          pode_cancelar: false,
          pode_excluir: Boolean(permissoes.isSuperadmin),
          pode_reabrir: false
        }
      });
    } catch (error) {
      if (!transactionFinalizada) {
        await transaction.rollback();
      }
      console.error(error);
      return res.status(500).json({ error: 'Erro ao solicitar prioridade para o financeiro.' });
    }
  },

  async show(req, res) {
    try {
      const permissoes = await obterPermissoesPrioridade(req);
      if (!permissoes.podeAcessarModulo) {
        return res.status(403).json({ error: 'Acesso negado ao modulo de prioridades.' });
      }

      const lote = await carregarLoteDetalhe(req.params.id);
      if (!lote) {
        return res.status(404).json({ error: 'Lote de prioridade nao encontrado.' });
      }

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
          pode_cancelar: (permissoes.isSuperadmin || permissoes.isDirAdmin) && lote.status === STATUS_LOTE.ABERTO,
          pode_excluir: Boolean(permissoes.isSuperadmin),
          pode_reabrir: Boolean(permissoes.isSuperadmin) && lote.status === STATUS_LOTE.FINALIZADO
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
      if (!lote) {
        return res.status(404).json({ error: 'Lote de prioridade nao encontrado.' });
      }

      if (!usuarioPodeVisualizarLote(permissoes, lote)) {
        return res.status(403).json({ error: 'Acesso negado a este lote de prioridade.' });
      }

      const acessoSomenteLeitura =
        permissoes.isLeitorConfigurado &&
        !permissoes.isSuperadmin &&
        !permissoes.isDirAdmin &&
        !permisssoesTemClassificacao(permissoes, lote?.classificacao_alvo);
      if (acessoSomenteLeitura && !usuarioPodeFinalizarLote(permissoes, lote)) {
        return res.status(403).json({ error: 'Acesso apenas para leitura dos lotes de prioridade.' });
      }

      const items = lote.status === STATUS_LOTE.ABERTO
        ? await listarSolicitacoesElegiveisParaLote(
            lote,
            req.query?.busca,
            null,
            req.query?.obra_id
          )
        : [];

      const obrasBase = lote.status === STATUS_LOTE.ABERTO
        ? await listarSolicitacoesElegiveisParaLote(lote)
        : [];
      const obras = Array.from(
        new Map(
          obrasBase
            .filter((item) => item?.obra?.id && item?.obra?.nome)
            .map((item) => [
              String(item.obra.id),
              {
                id: item.obra.id,
                nome: item.obra.nome,
                codigo: item.obra.codigo || null
              }
            ])
        ).values()
      ).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));

      return res.json({ items, obras });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar solicitacoes disponiveis para prioridade.' });
    }
  },

  async finalizar(req, res) {
    const transaction = await PrioridadeLote.sequelize.transaction();
    let transactionFinalizada = false;

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

      const solicitacaoIds = normalizarSolicitacaoIds(req.body?.solicitacao_ids);

      if (solicitacaoIds.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Selecione ao menos uma solicitacao para o lote.' });
      }

      let resultadoSincronizacao;
      try {
        resultadoSincronizacao = await sincronizarItensLote({
          lote,
          solicitacaoIds,
          usuarioId: req.user.id,
          transaction
        });
      } catch (error) {
        await transaction.rollback();
        return res.status(error.status || 400).json({
          error: error.message || 'Erro ao sincronizar solicitacoes do lote.'
        });
      }

      const { solicitacoesSelecionadas, valorUtilizado } = resultadoSincronizacao;
      const valorDisponivel = formatarNumero(lote.valor_disponivel);
      const isSolicitacaoDiretoria =
        String(lote.tipo_lote || TIPO_LOTE.DIR_ADMIN).toUpperCase() === TIPO_LOTE.SOLICITACAO_DIRETORIA;

      if (!isSolicitacaoDiretoria && valorUtilizado > valorDisponivel) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'O valor total das solicitacoes selecionadas excede o limite disponivel do lote.'
        });
      }

      const agora = new Date();

      await Solicitacao.update(
        {
          prioridade_diretoria_ativa: true,
          prioridade_diretoria_em: agora,
          prioridade_diretoria_lote_id: lote.id
        },
        {
          where: {
            id: { [Op.in]: solicitacoesSelecionadas.map((item) => item.id) }
          },
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

      await lote.update(
        {
          status: STATUS_LOTE.FINALIZADO,
          valor_disponivel: isSolicitacaoDiretoria ? valorUtilizado : lote.valor_disponivel,
          valor_utilizado: valorUtilizado,
          finalizado_por: req.user.id,
          finalizado_em: agora
        },
        { transaction }
      );

      await transaction.commit();
      transactionFinalizada = true;

      try {
        await Promise.all(
          solicitacoesSelecionadas.map((item) =>
            criarNotificacao({
              solicitacao_id: item.id,
              tipo: 'PRIORIDADE_DIRETORIA_AUTORIZADA',
              mensagem: `Solicitacao ${item.codigo || item.id} autorizada em lote de prioridade`,
              metadata: {
                prioridade_lote_id: lote.id
              },
              created_by: req.user.id
            })
          )
        );
      } catch (notificationError) {
        console.error('Erro ao notificar prioridade da diretoria:', notificationError);
      }

      const detalhe = await carregarLoteDetalhe(lote.id);

      return res.json({
        item: {
          ...serializarLote(detalhe),
          itens: (Array.isArray(detalhe.itens) ? detalhe.itens : []).map((item) => ({
            id: item.id,
            valor_considerado: formatarNumero(item.valor_considerado),
            autorizado_em: item.autorizado_em,
            autorizado_por_nome: item?.autorizadoPor?.nome || '-',
            solicitacao: item.solicitacao ? serializarSolicitacaoPrioridade(item.solicitacao) : null
          })),
          pode_finalizar: false,
          pode_cancelar: false,
          pode_reabrir: Boolean(permissoes.isSuperadmin)
        }
      });
    } catch (error) {
      if (!transactionFinalizada) {
        await transaction.rollback();
      }
      console.error(error);
      return res.status(500).json({ error: 'Erro ao finalizar lote de prioridade.' });
    }
  },

  async salvarSelecao(req, res) {
    const transaction = await PrioridadeLote.sequelize.transaction();
    let transactionFinalizada = false;

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
        return res.status(403).json({ error: 'Apenas a diretoria alvo pode salvar a selecao deste lote.' });
      }

      if (String(lote.status || '').toUpperCase() !== STATUS_LOTE.ABERTO) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Somente lotes abertos podem ter selecao salva.' });
      }

      let resultadoSincronizacao;
      try {
        resultadoSincronizacao = await sincronizarItensLote({
          lote,
          solicitacaoIds: req.body?.solicitacao_ids,
          usuarioId: req.user.id,
          transaction
        });
      } catch (error) {
        await transaction.rollback();
        return res.status(error.status || 400).json({
          error: error.message || 'Erro ao salvar selecao do lote.'
        });
      }

      const valorDisponivel = formatarNumero(lote.valor_disponivel);
      const isSolicitacaoDiretoria =
        String(lote.tipo_lote || TIPO_LOTE.DIR_ADMIN).toUpperCase() === TIPO_LOTE.SOLICITACAO_DIRETORIA;
      if (!isSolicitacaoDiretoria && resultadoSincronizacao.valorUtilizado > valorDisponivel) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'O valor total das solicitacoes selecionadas excede o limite disponivel do lote.'
        });
      }

      await lote.update({
        valor_disponivel: isSolicitacaoDiretoria ? resultadoSincronizacao.valorUtilizado : lote.valor_disponivel,
        valor_utilizado: resultadoSincronizacao.valorUtilizado
      }, { transaction });

      await transaction.commit();
      transactionFinalizada = true;

      const detalhe = await carregarLoteDetalhe(lote.id);
      return res.json({
        item: {
          ...serializarLote(detalhe),
          itens: (Array.isArray(detalhe.itens) ? detalhe.itens : []).map((item) => ({
            id: item.id,
            valor_considerado: formatarNumero(item.valor_considerado),
            autorizado_em: item.autorizado_em,
            autorizado_por: item.autorizado_por,
            autorizado_por_nome: item?.autorizadoPor?.nome || '-',
            solicitacao: item.solicitacao ? serializarSolicitacaoPrioridade(item.solicitacao) : null
          })),
          pode_finalizar: usuarioPodeFinalizarLote(permissoes, detalhe) && detalhe.status === STATUS_LOTE.ABERTO,
          pode_cancelar: (permissoes.isSuperadmin || permissoes.isDirAdmin) && detalhe.status === STATUS_LOTE.ABERTO,
          pode_excluir: Boolean(permissoes.isSuperadmin),
          pode_reabrir: false
        }
      });
    } catch (error) {
      if (!transactionFinalizada) {
        await transaction.rollback();
      }
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar selecao do lote de prioridade.' });
    }
  },

  async reabrir(req, res) {
    const transaction = await PrioridadeLote.sequelize.transaction();
    let transactionFinalizada = false;

    try {
      const permissoes = await obterPermissoesPrioridade(req);
      if (!permissoes.isSuperadmin) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas SUPERADMIN pode reabrir lotes finalizados.' });
      }

      const lote = await PrioridadeLote.findByPk(req.params.id, { transaction });
      if (!lote) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Lote de prioridade nao encontrado.' });
      }

      if (String(lote.status || '').toUpperCase() !== STATUS_LOTE.FINALIZADO) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Apenas lotes finalizados podem ser reabertos.' });
      }

      const itens = await PrioridadeLoteItem.findAll({
        where: { lote_id: lote.id },
        attributes: ['solicitacao_id', 'valor_considerado'],
        transaction
      });
      const solicitacaoIds = itens
        .map((item) => Number(item.solicitacao_id))
        .filter((id) => Number.isInteger(id) && id > 0);

      if (solicitacaoIds.length > 0) {
        await Solicitacao.update(
          {
            prioridade_diretoria_ativa: false,
            prioridade_diretoria_em: null,
            prioridade_diretoria_lote_id: null
          },
          {
            where: {
              id: { [Op.in]: solicitacaoIds },
              prioridade_diretoria_lote_id: lote.id
            },
            transaction
          }
        );

        await Historico.bulkCreate(
          solicitacaoIds.map((solicitacaoId) => ({
            solicitacao_id: solicitacaoId,
            usuario_responsavel_id: req.user.id,
            setor: lote.diretoria_alvo_codigo,
            acao: 'PRIORIDADE_DIRETORIA_REABERTA',
            observacao: `Lote de prioridade #${lote.id} reaberto pelo SUPERADMIN`
          })),
          { transaction }
        );
      }

      const valorUtilizado = itens.reduce(
        (total, item) => total + formatarNumero(item.valor_considerado),
        0
      );

      await lote.update({
        status: STATUS_LOTE.ABERTO,
        valor_utilizado: valorUtilizado,
        finalizado_por: null,
        finalizado_em: null
      }, { transaction });

      await transaction.commit();
      transactionFinalizada = true;

      const detalhe = await carregarLoteDetalhe(lote.id);
      return res.json({
        item: {
          ...serializarLote(detalhe),
          itens: (Array.isArray(detalhe.itens) ? detalhe.itens : []).map((item) => ({
            id: item.id,
            valor_considerado: formatarNumero(item.valor_considerado),
            autorizado_em: item.autorizado_em,
            autorizado_por: item.autorizado_por,
            autorizado_por_nome: item?.autorizadoPor?.nome || '-',
            solicitacao: item.solicitacao ? serializarSolicitacaoPrioridade(item.solicitacao) : null
          })),
          pode_finalizar: usuarioPodeFinalizarLote(permissoes, detalhe) && detalhe.status === STATUS_LOTE.ABERTO,
          pode_cancelar: true,
          pode_excluir: true,
          pode_reabrir: false
        }
      });
    } catch (error) {
      if (!transactionFinalizada) {
        await transaction.rollback();
      }
      console.error(error);
      return res.status(500).json({ error: 'Erro ao reabrir lote de prioridade.' });
    }
  },

  async cancelar(req, res) {
    const transaction = await PrioridadeLote.sequelize.transaction();
    let transactionFinalizada = false;

    try {
      const permissoes = await obterPermissoesPrioridade(req);
      if (!permissoes.isSuperadmin && !permissoes.isDirAdmin) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas a Diretoria Administrativa pode cancelar lotes.' });
      }

      const lote = await PrioridadeLote.findByPk(req.params.id, { transaction });
      if (!lote) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Lote de prioridade nao encontrado.' });
      }

      if (String(lote.status || '').toUpperCase() !== STATUS_LOTE.ABERTO) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Apenas lotes abertos podem ser cancelados.' });
      }

      await Solicitacao.update(
        {
          prioridade_diretoria_ativa: false,
          prioridade_diretoria_em: null,
          prioridade_diretoria_lote_id: null
        },
        {
          where: { prioridade_diretoria_lote_id: lote.id },
          transaction
        }
      );

      await PrioridadeLoteItem.destroy({
        where: { lote_id: lote.id },
        transaction
      });

      await lote.update({
        status: STATUS_LOTE.CANCELADO,
        valor_utilizado: 0
      }, { transaction });
      await transaction.commit();
      transactionFinalizada = true;
      return res.sendStatus(204);
    } catch (error) {
      if (!transactionFinalizada) {
        await transaction.rollback();
      }
      console.error(error);
      return res.status(500).json({ error: 'Erro ao cancelar lote de prioridade.' });
    }
  },

  async excluir(req, res) {
    const transaction = await PrioridadeLote.sequelize.transaction();

    try {
      const permissoes = await obterPermissoesPrioridade(req);
      if (!permissoes.isSuperadmin) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas SUPERADMIN pode excluir lotes.' });
      }

      const lote = await PrioridadeLote.findByPk(req.params.id, { transaction });
      if (!lote) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Lote de prioridade nao encontrado.' });
      }

      const itensCount = await PrioridadeLoteItem.count({
        where: { lote_id: lote.id },
        transaction
      });

      if (itensCount > 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Nao e possivel excluir um lote que ja possui solicitacoes autorizadas. Preserve a trilha de auditoria.'
        });
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
