const {
  Solicitacao,
  Historico,
  StatusArea,
  Apropriacao,
  Obra,
  User,
  TipoSolicitacao,
  EtapaSetor,
  Contrato,
  TipoSubContrato,
  Anexo,
  MensagemSetor,
  Parceiro,
  SetorPermissao,
  Setor,
  ConfiguracaoSistema,
  SolicitacaoVisibilidadeUsuario,
  Comprovante,
  TituloFinanceiro,
  SolicitacaoPagamento,
  Notificacao,
  NotificacaoDestinatario,
  LogExclusao,
  Sequelize,
  sequelize
} = require('../models');

const { Op } = require('sequelize');
const {
  criarNotificacao,
  obterDestinatariosCriacaoSetor
} = require('../services/notificacoes');
const { registrarEventoSeguranca } = require('../services/securityLogService');
const gerarCodigoSolicitacao = require('../services/solicitacao/gerarCodigo');
const { uploadToS3 } = require('../services/s3');
const { normalizeOriginalName } = require('../utils/fileName');
const {
  buildSetorComparisonTokens,
  findSetorByCapability,
  hasSetorCapability,
  isGeoToken: isGeoSetorToken,
  resolveSetorPersistenciaValue,
  resolveSetorReferencia,
  resolveUserSetor,
  userHasSetorCapability
} = require('../services/setorCapabilityService');
const {
  applyTipoSolicitacaoModuleAvailability,
  normalizeTipoSolicitacaoBehavior
} = require('../services/tipoSolicitacaoBehaviorService');
const { isModuleEnabled } = require('../services/moduleConfigService');
const {
  obterConfiguracaoAprovacaoDiretoria,
  obterDiretoriaParaObra,
  obterSetorDestinoAprovacao,
  normalizarClassificacaoObra,
  normalizarTokenSetor
} = require('../services/aprovacaoDiretoriaConfig');
const { obterTokensSetoresUsuario } = require('../services/usuariosSetores');
const {
  obterConfiguracaoTiposCompartilhados,
  obterConfiguracaoAutomacaoStatusSetor,
  obterTiposCompartilhadosParaTokens,
  obterAutomacaoStatusCorrespondente
} = require('../services/solicitacao/configuracoesVisibilidadeAutomacao');
const {
  publishSolicitacaoRealtimeEvent
} = require('../services/solicitacaoRealtimeService');
const {
  obterConfigCamposNovaSolicitacao,
  resolverCamposNovaSolicitacao
} = require('../services/novaSolicitacaoCamposConfig');

const CHAVE_AREAS_POR_SETOR_ORIGEM = 'AREAS_POR_SETOR_ORIGEM';
const CHAVE_SETORES_VISIVEIS_POR_USUARIO = 'SETORES_VISIVEIS_POR_USUARIO';
const CHAVE_TIPOS_SOLICITACAO_POR_SETOR = 'TIPOS_SOLICITACAO_POR_SETOR';
const CHAVE_SETORES_CRIACAO_TODAS_OBRAS = 'SETORES_CRIACAO_TODAS_OBRAS';
const DEFAULT_SOLICITACOES_PAGE_SIZE = 25;
const MAX_SOLICITACOES_PAGE_SIZE = 500;
/* =====================================================
   FUNCAO AUXILIAR - VISIBILIDADE
===================================================== */
async function garantirVisibilidade(solicitacaoId, usuarioId) {
  await SolicitacaoVisibilidadeUsuario.findOrCreate({
    where: {
      solicitacao_id: solicitacaoId,
      usuario_id: usuarioId
    },
    defaults: { oculto: false }
  });
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function isAllLimit(value) {
  return ['all', 'todos', 'todas'].includes(String(value || '').trim().toLowerCase());
}

async function montarResumoSolicitacoesLista(solicitacoes) {
  if (!Array.isArray(solicitacoes) || solicitacoes.length === 0) {
    return [];
  }

  const idsSolicitacoes = solicitacoes.map((item) => Number(item.id)).filter(Boolean);
  const ordemIds = new Map(idsSolicitacoes.map((id, index) => [id, index]));

  const [historicosResponsavel, historicosStatus] = await Promise.all([
    Historico.findAll({
      where: {
        solicitacao_id: { [Op.in]: idsSolicitacoes },
        usuario_responsavel_id: { [Op.ne]: null },
        acao: {
          [Op.in]: ['RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU']
        }
      },
      attributes: ['solicitacao_id', 'createdAt'],
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nome']
        }
      ],
      order: [
        ['solicitacao_id', 'ASC'],
        ['createdAt', 'DESC']
      ]
    }),
    Historico.findAll({
      where: {
        solicitacao_id: { [Op.in]: idsSolicitacoes },
        acao: 'STATUS_ALTERADO'
      },
      attributes: ['solicitacao_id', 'setor', 'createdAt'],
      order: [
        ['solicitacao_id', 'ASC'],
        ['createdAt', 'DESC']
      ]
    })
  ]);

  const responsavelPorSolicitacao = new Map();
  historicosResponsavel.forEach((item) => {
    const solicitacaoId = Number(item.solicitacao_id);
    if (!responsavelPorSolicitacao.has(solicitacaoId)) {
      responsavelPorSolicitacao.set(solicitacaoId, item.usuario?.nome || null);
    }
  });

  const setorStatusPorSolicitacao = new Map();
  historicosStatus.forEach((item) => {
    const solicitacaoId = Number(item.solicitacao_id);
    if (!setorStatusPorSolicitacao.has(solicitacaoId)) {
      setorStatusPorSolicitacao.set(solicitacaoId, item.setor || null);
    }
  });

  return solicitacoes
    .map((item) => {
      const solicitacao = item.toJSON();
      const resumoFinanceiro = calcularResumoFinanceiroSolicitacao(solicitacao);
      solicitacao.responsavel = responsavelPorSolicitacao.get(Number(item.id)) || null;
      solicitacao.setor_status_atual =
        setorStatusPorSolicitacao.get(Number(item.id)) || solicitacao.area_responsavel || null;
      solicitacao.valor_total = resumoFinanceiro.valorTotal;
      solicitacao.valor_pago_acumulado = resumoFinanceiro.valorPagoAcumulado;
      solicitacao.saldo_pagamento = resumoFinanceiro.saldoPagamento;
      solicitacao.valor_exibicao = resumoFinanceiro.valorExibicao;
      return solicitacao;
    })
    .sort((a, b) => (ordemIds.get(Number(a.id)) || 0) - (ordemIds.get(Number(b.id)) || 0));
}

function buildSolicitacaoResumoListaInclude() {
  return [
    {
      model: Obra,
      as: 'obra',
      attributes: ['id', 'nome', 'codigo']
    },
    {
      model: TipoSolicitacao,
      as: 'tipo',
      attributes: ['id', 'nome', 'codigo_interno', 'comportamento']
    },
    {
      model: Contrato,
      as: 'contrato',
      attributes: ['id', 'codigo', 'ref_contrato']
    },
    {
      model: Apropriacao,
      as: 'apropriacao',
      attributes: ['id', 'codigo', 'descricao', 'obra_id']
    },
    {
      model: Parceiro,
      as: 'parceiro',
      attributes: ['id', 'nome', 'cpf_cnpj']
    },
    {
      model: TipoSolicitacao,
      as: 'tipoMacroSolicitacao',
      attributes: ['id', 'nome', 'codigo_interno', 'comportamento']
    }
  ];
}

async function buscarResumoListaSolicitacaoPorId(id) {
  const solicitacao = await Solicitacao.findByPk(id, {
    include: buildSolicitacaoResumoListaInclude()
  });

  if (!solicitacao) {
    return null;
  }

  const resumo = await montarResumoSolicitacoesLista([solicitacao]);
  return Array.isArray(resumo) && resumo.length > 0 ? resumo[0] : null;
}

async function verificarAcessoDetalheSolicitacao(req, solicitacao) {
  const acessoObra = await validarAcessoObra(req, solicitacao);
  if (!acessoObra) {
    return {
      allowed: false,
      status: 403,
      error: 'Acesso negado. Vincule o usuario a obra para continuar.'
    };
  }

  const areaUsuario = await obterAreaUsuario(req);
  const tokensSetorUsuario = expandirTokensComAliasesGeo(
    await obterTokensSetorUsuario(req, areaUsuario)
  );
  const perfil = String(req.user?.perfil || '').trim().toUpperCase();
  const isSetorAdministrativo = tokensSetorUsuario.some(isAdministrativoToken);

  if (isSetorAdministrativo && perfil !== 'SUPERADMIN') {
    const itemCriadoPeloUsuario = Number(solicitacao.criado_por) === Number(req.user.id);
    const [historicoResponsavel, mencaoUsuario] = await Promise.all([
      Historico.findOne({
        where: {
          solicitacao_id: solicitacao.id,
          usuario_responsavel_id: req.user.id,
          acao: {
            [Op.in]: ['RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU']
          }
        },
        attributes: ['id']
      }),
      NotificacaoDestinatario.findOne({
        include: [
          {
            model: Notificacao,
            as: 'notificacao',
            required: true,
            where: {
              solicitacao_id: solicitacao.id,
              tipo: 'MENCAO_COMENTARIO'
            },
            attributes: ['id']
          }
        ],
        where: {
          usuario_id: req.user.id
        },
        attributes: ['id']
      })
    ]);

    if (!itemCriadoPeloUsuario && !historicoResponsavel && !mencaoUsuario) {
      return {
        allowed: false,
        status: 403,
        error: 'Acesso negado'
      };
    }
  }

  const isUsuarioGeo = await isUsuarioSetorGeo(req);
  if (isUsuarioGeo) {
    const solicitacaoDoSetorUsuario = setorPertenceAoUsuario(
      tokensSetorUsuario,
      solicitacao.area_responsavel
    );
    const modoRecebimentoGeo = await obterModoRecebimentoPorSetorETipo(
      tokensSetorUsuario,
      solicitacao.tipo_solicitacao_id
    );
    const itemCriadoPeloUsuario = Number(solicitacao.criado_por) === Number(req.user.id);
    const [historicoResponsavel, historicoInteracao] = await Promise.all([
      Historico.findOne({
        where: {
          solicitacao_id: solicitacao.id,
          usuario_responsavel_id: req.user.id,
          acao: {
            [Op.in]: ['RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU']
          }
        },
        attributes: ['id']
      }),
      Historico.findOne({
        where: {
          solicitacao_id: solicitacao.id,
          usuario_responsavel_id: req.user.id
        },
        attributes: ['id']
      })
    ]);

    let historicoSetorGeo = false;
    if (Array.isArray(solicitacao.historicos) && solicitacao.historicos.length > 0) {
      historicoSetorGeo = solicitacao.historicos.some((item) => {
        if (isGeoToken(item?.setor)) return true;
        if (String(item?.acao || '').toUpperCase() !== 'ENVIADA_SETOR') return false;
        const envio = parseObservacaoEnvioSetor(item?.observacao);
        return isGeoToken(envio?.origem) || isGeoToken(envio?.destino);
      });
    } else {
      const historicosGeo = await Historico.findAll({
        where: {
          solicitacao_id: solicitacao.id,
          [Op.or]: [
            { acao: 'ENVIADA_SETOR' },
            { setor: { [Op.in]: tokensSetorUsuario.filter(isGeoToken) } }
          ]
        },
        attributes: ['acao', 'setor', 'observacao']
      });

      historicoSetorGeo = historicosGeo.some((item) => {
        if (isGeoToken(item?.setor)) return true;
        if (String(item?.acao || '').toUpperCase() !== 'ENVIADA_SETOR') return false;
        const envio = parseObservacaoEnvioSetor(item?.observacao);
        return isGeoToken(envio?.origem) || isGeoToken(envio?.destino);
      });
    }

    const podeVerPeloModoRecebimento =
      solicitacaoDoSetorUsuario &&
      String(modoRecebimentoGeo || '').toUpperCase() === 'TODOS_VISIVEIS';

    if (
      !itemCriadoPeloUsuario &&
      !podeVerPeloModoRecebimento &&
      !historicoResponsavel &&
      !historicoInteracao &&
      !historicoSetorGeo
    ) {
      return {
        allowed: false,
        status: 403,
        error: 'Acesso negado'
      };
    }
  }

  return {
    allowed: true,
    areaUsuario,
    tokensSetorUsuario
  };
}

async function enviarSolicitacaoParaSetorInterno({
  req,
  solicitacao,
  setorDestino,
  usuarioId,
  permitirEnvioFluxoDiretoria = false
}) {
  const acessoObra = await validarAcessoObra(req, solicitacao);
  if (!acessoObra) {
    return { ok: false, status: 403, error: 'Acesso negado. Vincule o usuario a obra para continuar.' };
  }

  const perfil = String(req.user?.perfil || '').trim().toUpperCase();
  const usuarioLogado = await User.findByPk(req.user.id, {
    attributes: ['id', 'pode_enviar_qualquer_setor']
  });
  const podeEnviarQualquerSetor =
    perfil === 'SUPERADMIN' || Boolean(usuarioLogado?.pode_enviar_qualquer_setor);

  if (!podeEnviarQualquerSetor) {
    const areaUsuario = await obterAreaUsuario(req);
    const tokensSetorUsuario = expandirTokensComAliasesGeo(
      await obterTokensSetorUsuario(req, areaUsuario)
    );
    if (!setorPertenceAoUsuario(tokensSetorUsuario, solicitacao.area_responsavel)) {
      return { ok: false, status: 403, error: 'Voce so pode enviar solicitacoes que estejam no seu setor atual.' };
    }
  }

  const emFluxoDiretoria =
    solicitacao.fluxo_aprovacao_diretoria &&
    solicitacao.diretoria_fluxo_codigo &&
    setorPertenceAoUsuario([solicitacao.diretoria_fluxo_codigo], solicitacao.area_responsavel);
  if (emFluxoDiretoria && !permitirEnvioFluxoDiretoria) {
    return {
      ok: false,
      status: 409,
      error: 'Esta solicitacao precisa ser aprovada pela diretoria antes de seguir para a area responsavel.'
    };
  }

  const setorOrigem = solicitacao.area_responsavel;
  const setorOrigemRow = await resolveSetorReferencia(setorOrigem, {
    attributes: ['nome', 'codigo']
  });
  const setorDestinoRow = await resolveSetorReferencia(setorDestino, {
    attributes: ['nome', 'codigo']
  });
  const setorDestinoPersistido = resolveSetorPersistenciaValue(setorDestinoRow, setorDestino);

  const nomeOrigem = setorOrigemRow?.nome || setorOrigem;
  const nomeDestino = setorDestinoRow?.nome || setorDestinoPersistido;

  await solicitacao.update({
    area_responsavel: setorDestinoPersistido
  });

  await Historico.create({
    solicitacao_id: solicitacao.id,
    usuario_responsavel_id: usuarioId,
    setor: setorDestino,
    acao: 'ENVIADA_SETOR',
    observacao: `De ${setorOrigem} para ${setorDestino}`
  });

  await criarNotificacao({
    solicitacao_id: solicitacao.id,
    tipo: 'ENVIADA_SETOR',
        mensagem: `${req.user?.nome || 'Usuario'} enviou a solicitacao ${solicitacao.codigo} do setor ${nomeOrigem} para o setor ${nomeDestino}`,
        created_by: usuarioId,
        metadata: {
          setor_origem: setorOrigem,
          setor_destino: setorDestinoPersistido
        }
      });

  await publishSolicitacaoRealtimeEvent({
    action: 'SENT_TO_SECTOR',
    solicitacao,
    actor: {
      id: usuarioId,
      nome: req.user?.nome || null
    },
    metadata: {
      setor_origem: setorOrigem,
      setor_destino: setorDestinoPersistido
    }
  });

  return { ok: true };
}

async function obterAreaUsuario(req) {
  const setorAtual = await resolveUserSetor(req.user, {
    attributes: ['id', 'codigo', 'nome', 'eh_setor_obra', 'eh_setor_financeiro', 'eh_setor_compras', 'eh_setor_geo', 'eh_setor_administrativo']
  });
  const areaUsuario = resolveSetorPersistenciaValue(setorAtual, req.user?.area);
  if (!areaUsuario) return null;
  return String(areaUsuario).trim().toUpperCase();
}

async function obterTokensSetorUsuario(req, areaUsuario) {
  const setorAtual = await resolveUserSetor(req.user, {
    attributes: ['id', 'codigo', 'nome', 'eh_setor_obra', 'eh_setor_financeiro', 'eh_setor_compras', 'eh_setor_geo', 'eh_setor_administrativo']
  });
  const tokens = new Set(buildSetorComparisonTokens(setorAtual));
  if (areaUsuario) tokens.add(String(areaUsuario).trim().toUpperCase());
  if (req.user?.setor_id) tokens.add(String(req.user.setor_id).trim().toUpperCase());
  const tokensMultiSetor = await obterTokensSetoresUsuario(req.user, areaUsuario ? [areaUsuario] : []);
  tokensMultiSetor.forEach((token) => {
    if (token) tokens.add(String(token).trim().toUpperCase());
  });
  return Array.from(tokens).filter(Boolean);
}

async function lerConfiguracaoJson(chave, fallback) {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave },
    order: [['id', 'DESC']]
  });
  if (!item?.valor) return fallback;
  try {
    return JSON.parse(item.valor);
  } catch {
    return fallback;
  }
}

async function obterRegrasAreasPorSetorOrigem() {
  const data = await lerConfiguracaoJson(CHAVE_AREAS_POR_SETOR_ORIGEM, { regras: {} });
  const regrasRaw = data?.regras && typeof data.regras === 'object' ? data.regras : {};
  const regras = {};
  Object.entries(regrasRaw).forEach(([origem, destinos]) => {
    const key = String(origem || '').trim().toUpperCase();
    if (!key) return;
    regras[key] = Array.isArray(destinos)
      ? [...new Set(destinos.map(v => String(v || '').trim().toUpperCase()).filter(Boolean))]
      : [];
  });
  return regras;
}

async function obterSetoresVisiveisPorUsuario() {
  const data = await lerConfiguracaoJson(CHAVE_SETORES_VISIVEIS_POR_USUARIO, { regras: {} });
  const regrasRaw = data?.regras && typeof data.regras === 'object' ? data.regras : {};
  const regras = {};
  Object.entries(regrasRaw).forEach(([usuarioId, setores]) => {
    const key = String(usuarioId || '').trim();
    if (!key) return;
    regras[key] = Array.isArray(setores)
      ? [...new Set(setores.map(v => String(v || '').trim().toUpperCase()).filter(Boolean))]
      : [];
  });
  return regras;
}

async function obterTiposSolicitacaoPorSetorConfig() {
  const data = await lerConfiguracaoJson(CHAVE_TIPOS_SOLICITACAO_POR_SETOR, { regras: {} });
  const regrasRaw = data?.regras && typeof data.regras === 'object' ? data.regras : {};
  const regras = {};

  Object.entries(regrasRaw).forEach(([setor, config]) => {
    const key = String(setor || '').trim().toUpperCase();
    if (!key) return;

    const tipos = Array.isArray(config?.tipos)
      ? [...new Set(config.tipos.map(v => Number(v)).filter(v => Number.isInteger(v) && v > 0))]
      : [];

    const modosRaw = config?.modos && typeof config.modos === 'object' ? config.modos : {};
    const modos = {};
    Object.entries(modosRaw).forEach(([tipoId, modo]) => {
      const id = Number(tipoId);
      if (!Number.isInteger(id) || id <= 0) return;
      const modoNorm = String(modo || '').trim().toUpperCase();
      modos[String(id)] = modoNorm === 'ADMIN_PRIMEIRO' ? 'ADMIN_PRIMEIRO' : 'TODOS_VISIVEIS';
    });

    regras[key] = { tipos, modos };
  });

  return regras;
}

async function obterSetoresCriacaoTodasObras() {
  const data = await lerConfiguracaoJson(CHAVE_SETORES_CRIACAO_TODAS_OBRAS, { setores: [] });
  const lista = Array.isArray(data?.setores) ? data.setores : [];
  return [...new Set(
    lista
      .map(item => String(item || '').trim().toUpperCase())
      .filter(Boolean)
  )];
}

function normalizarTokenComparacao(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function isGeoToken(valor) {
  return isGeoSetorToken(valor);
}

function isAdministrativoToken(valor) {
  return normalizarTokenComparacao(valor) === 'ADMINISTRATIVO';
}

function expandirTokensComAliasesGeo(tokens = []) {
  const tokensLista = Array.isArray(tokens) ? tokens : [];
  const contemGeo = tokensLista.some(isGeoToken);
  if (!contemGeo) {
    return Array.from(new Set(tokensLista.filter(Boolean)));
  }

  return Array.from(new Set([
    ...tokensLista.filter(Boolean),
    'GEO',
    'GERENCIA DE PROCESSOS',
    'GERENCIA_PROCESSOS'
  ]));
}

function setorPertenceAoUsuario(tokensSetor = [], setorSolicitacao = null) {
  const setorNormalizado = normalizarTokenComparacao(setorSolicitacao);
  if (!setorNormalizado) return false;

  return (Array.isArray(tokensSetor) ? tokensSetor : []).some(token => {
    const tokenNormalizado = normalizarTokenComparacao(token);
    if (!tokenNormalizado) return false;
    if (tokenNormalizado === setorNormalizado) return true;
    return isGeoToken(tokenNormalizado) && isGeoToken(setorNormalizado);
  });
}

function obterClassificacaoDaObra(obra) {
  return normalizarClassificacaoObra(obra?.classificacao || obra?.classificacao_obra);
}

function usuarioPodeAtuarComoDiretoria(tokensSetor = [], diretoriaCodigo = null) {
  const diretoriaNormalizada = normalizarTokenComparacao(diretoriaCodigo);
  if (!diretoriaNormalizada) return false;
  return (Array.isArray(tokensSetor) ? tokensSetor : []).some((token) => (
    normalizarTokenComparacao(token) === diretoriaNormalizada
  ));
}

async function obterContextoAprovacaoDiretoria(solicitacao, obraCarregada = null) {
  const obra = obraCarregada || (
    solicitacao?.obra_id
      ? await Obra.findByPk(solicitacao.obra_id, {
        attributes: ['id', 'codigo', 'nome', 'classificacao']
      })
      : null
  );

  const configuracao = await obterConfiguracaoAprovacaoDiretoria();
  const diretoriaPersistida = normalizarTokenSetor(solicitacao?.diretoria_fluxo_codigo);
  const setorDestinoPersistido = normalizarTokenSetor(solicitacao?.setor_destino_pos_aprovacao);
  const setorDestinoConfigurado = obterSetorDestinoAprovacao(
    solicitacao?.tipo_solicitacao_id,
    configuracao.setoresDestinoPorTipo
  );

  return {
    obra,
    classificacaoObra: obterClassificacaoDaObra(obra),
    diretoriaEsperada:
      diretoriaPersistida ||
      obterDiretoriaParaObra(obra, configuracao.diretoriasPorClassificacao),
    setorDestinoAprovacao:
      setorDestinoPersistido ||
      setorDestinoConfigurado,
    diretoriasPorClassificacao: configuracao.diretoriasPorClassificacao,
    setoresDestinoPorTipo: configuracao.setoresDestinoPorTipo
  };
}

function solicitacaoUsaFluxoAprovacaoDiretoria(solicitacao, contextoAprovacao) {
  if (!solicitacao || !contextoAprovacao?.diretoriaEsperada) {
    return false;
  }

  if (!Boolean(Number(solicitacao.fluxo_aprovacao_diretoria))) {
    return false;
  }

  return setorPertenceAoUsuario(
    [contextoAprovacao.diretoriaEsperada],
    solicitacao.area_responsavel
  );
}

function calcularResumoFinanceiroSolicitacao(solicitacao) {
  const valorTotal = solicitacao?.valor === null || solicitacao?.valor === undefined
    ? null
    : Number(solicitacao.valor);
  const valorPagoAcumulado = Number(solicitacao?.valor_pago_acumulado || 0);

  if (valorTotal === null || Number.isNaN(valorTotal)) {
    return {
      valorTotal: null,
      valorPagoAcumulado: Number.isNaN(valorPagoAcumulado) ? 0 : Math.max(valorPagoAcumulado, 0),
      saldoPagamento: null,
      valorExibicao: null
    };
  }

  const pago = Number.isNaN(valorPagoAcumulado) ? 0 : Math.max(valorPagoAcumulado, 0);
  const saldoPagamento = Math.max(valorTotal - pago, 0);
  const statusAtual = String(solicitacao?.status_global || '').trim().toUpperCase();

  return {
    valorTotal,
    valorPagoAcumulado: pago,
    saldoPagamento,
    valorExibicao: statusAtual === 'PAGA' ? valorTotal : saldoPagamento
  };
}

function obterRegrasTipoPorTokensSetor(regrasConfig = {}, tokensSetor = []) {
  if (!Array.isArray(tokensSetor) || tokensSetor.length === 0) return null;
  for (const token of tokensSetor) {
    const key = String(token || '').trim().toUpperCase();
    if (regrasConfig[key]) return regrasConfig[key];
  }
  return null;
}

async function obterModoRecebimentoPorSetorETipo(tokensSetor = [], tipoSolicitacaoId = null) {
  const tipoId = Number(tipoSolicitacaoId);
  if (Number.isInteger(tipoId) && tipoId > 0) {
    const regrasTipos = await obterTiposSolicitacaoPorSetorConfig();
    const regraSetor = obterRegrasTipoPorTokensSetor(regrasTipos, tokensSetor);
    if (regraSetor?.modos && regraSetor.modos[String(tipoId)]) {
      return regraSetor.modos[String(tipoId)];
    }
  }
  return obterModoRecebimentoSetor(tokensSetor);
}

async function obterModoRecebimentoSetor(tokensSetor = []) {
  if (!Array.isArray(tokensSetor) || tokensSetor.length === 0) {
    return 'TODOS_VISIVEIS';
  }

  const permissoes = await SetorPermissao.findAll({
    where: {
      setor: { [Op.in]: tokensSetor }
    },
    attributes: ['setor', 'modo_recebimento']
  });

  for (const token of tokensSetor) {
    const item = permissoes.find(p => String(p.setor || '').toUpperCase() === String(token).toUpperCase());
    if (item?.modo_recebimento) {
      return String(item.modo_recebimento).toUpperCase();
    }
  }

  return 'TODOS_VISIVEIS';
}

async function isUsuarioSetorObra(req) {
  const perfil = String(req.user?.perfil || '').trim().toUpperCase();
  if (perfil !== 'USUARIO') return false;
  return userHasSetorCapability(req.user, 'eh_setor_obra');
}

async function isUsuarioSetorGeo(req) {
  const perfil = String(req.user?.perfil || '').trim().toUpperCase();
  if (perfil !== 'USUARIO') return false;
  return userHasSetorCapability(req.user, 'eh_setor_geo');
}

async function isSetorGeo(req) {
  return userHasSetorCapability(req.user, 'eh_setor_geo');
}

async function isSetorObraGeral(req) {
  return userHasSetorCapability(req.user, 'eh_setor_obra');
}

async function validarAcessoObra(req, solicitacao) {
  if (!solicitacao) return false;

  const perfil = String(req.user?.perfil || '').trim().toUpperCase();
  const isSuperadmin = perfil === 'SUPERADMIN';
  if (isSuperadmin) return true;

  const isSetorObra = await isUsuarioSetorObra(req);
  if (!isSetorObra) {
    return true;
  }

  if (!solicitacao.obra_id) {
    return false;
  }

  const { UsuarioObra } = require('../models');
  const vinculos = await UsuarioObra.findAll({
    where: { user_id: req.user.id },
    attributes: ['obra_id']
  });
  const obrasVinculadas = vinculos.map(v => v.obra_id);
  return obrasVinculadas.includes(solicitacao.obra_id);
}

async function registrarNegacaoSolicitacao(req, solicitacaoId, obraId, descricao) {
  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'AUTHZ_DENIED',
    recursoTipo: 'SOLICITACAO',
    recursoId: solicitacaoId || obraId,
    status: 'DENIED',
    descricao,
    metadata: {
      obra_id: obraId || null
    }
  });
}

function montarLiteralHistoricoSetoresEnvolvidos(tokens = []) {
  const tokensValidos = Array.from(
    new Set(
      (Array.isArray(tokens) ? tokens : [])
        .map(v => String(v || '').trim().toUpperCase())
        .filter(Boolean)
    )
  );

  if (tokensValidos.length === 0) return null;

  const inList = tokensValidos.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');

  const likes = tokensValidos
    .map(token => {
      const seguro = token.replace(/'/g, "''");
      return [
        `UPPER(COALESCE(h.observacao, '')) LIKE 'DE ${seguro} PARA %'`,
        `UPPER(COALESCE(h.observacao, '')) LIKE '% PARA ${seguro}'`
      ];
    })
    .flat()
    .join(' OR ');

  return Sequelize.literal(`(
    SELECT DISTINCT h.solicitacao_id
    FROM historicos h
    WHERE h.solicitacao_id = Solicitacao.id
      AND (
        UPPER(CAST(h.setor AS CHAR)) IN (${inList})
        OR (
          h.acao = 'ENVIADA_SETOR'
          AND (${likes})
        )
      )
  )`);
}

function parseObservacaoEnvioSetor(observacao) {
  const texto = String(observacao || '').trim();
  const match = texto.match(/^De\s+(.+?)\s+para\s+(.+)$/i);
  if (!match) return null;
  return {
    origem: String(match[1] || '').trim(),
    destino: String(match[2] || '').trim()
  };
}

module.exports = {

  // =====================================================
  // LISTAR SOLICITACOES
  // =====================================================
  async index(req, res) {
    try {
      const { id: usuarioId } = req.user;
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      let areaUsuario = req.user?.area || null;
      const {
        area,
        status,
        arquivadas,
        obra_id,
        obra_ids,
        codigo,
        codigo_contrato,
        numero_solicitacao,
        numero_sienge,
        responsavel,
        data_registro,
        data_vencimento,
        data_inicio,
        data_fim,
        valor_min,
        valor_max,
        tipo_macro_id,
        tipo_solicitacao_id,
        page,
        limit,
        apenas_obras
      } = req.query;
      const paginacaoSolicitada =
        req.query.page !== undefined || req.query.limit !== undefined;
      const listarTodasSolicitacoes = isAllLimit(limit);
      const apenasObrasSolicitadas = ['1', 'true', 'sim'].includes(
        String(apenas_obras || '').trim().toLowerCase()
      );
      const paginaAtual = parsePositiveInt(page, 1);
      const limitePorPagina = listarTodasSolicitacoes
        ? null
        : Math.min(
            parsePositiveInt(limit, DEFAULT_SOLICITACOES_PAGE_SIZE),
            MAX_SOLICITACOES_PAGE_SIZE
          );
      const offset = listarTodasSolicitacoes ? 0 : (paginaAtual - 1) * limitePorPagina;

      /* ===============================
        1) BUSCAR SOLICITACOES OCULTADAS
      =============================== */
      const listarArquivadas = ['1', 'true', 'sim'].includes(
        String(arquivadas || '').trim().toLowerCase()
      );

      const ocultadas = await SolicitacaoVisibilidadeUsuario.findAll({
        where: {
          usuario_id: usuarioId,
          oculto: true
        },
        attributes: ['solicitacao_id']
      });

      const idsOcultos = ocultadas.map(o => o.solicitacao_id);

      /* ===============================
        2) WHERE BASE
      =============================== */
      const where = {
        cancelada: false
      };

      if (listarArquivadas) {
        if (idsOcultos.length === 0) {
          if (!paginacaoSolicitada) {
            return res.json([]);
          }
          return res.json({
            items: [],
            meta: {
              page: paginaAtual,
              limit: listarTodasSolicitacoes ? 'all' : limitePorPagina,
              total: 0,
              total_pages: 0
            }
          });
        }
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ id: { [Op.in]: idsOcultos } });
      } else if (idsOcultos.length > 0) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ id: { [Op.notIn]: idsOcultos } });
      }

      /* ===============================
        3) REGRAS POR PERFIL
      =============================== */

      const { UsuarioObra } = require('../models');
      let setorAtual = null;
      if (req.user.setor_id) {
        const setorIdRaw = String(req.user.setor_id);
        setorAtual = await Setor.findOne({
          where: {
            [Op.or]: [
              { id: req.user.setor_id },
              { codigo: setorIdRaw },
              { nome: setorIdRaw }
            ]
          },
          attributes: ['id', 'codigo', 'nome']
        });
        if (!areaUsuario) {
          areaUsuario = setorAtual?.codigo || setorAtual?.nome || null;
        }
      }
      if (areaUsuario) {
        areaUsuario = String(areaUsuario).trim().toUpperCase();
      }
      const vinculos = await UsuarioObra.findAll({
        where: { user_id: usuarioId },
        attributes: ['obra_id']
      });
      const obrasVinculadas = vinculos.map(v => v.obra_id);

      const isSetorObra = await isSetorObraGeral(req);
      const isUsuarioGeo = await isUsuarioSetorGeo(req);

      const setorTokensBase = [
        setorAtual?.codigo,
        setorAtual?.nome,
        areaUsuario,
        req.user?.setor_id
      ]
        .filter(Boolean)
        .map(v => String(v).trim().toUpperCase());
      const setorTokens = expandirTokensComAliasesGeo(setorTokensBase);
      const adminGEO =
        perfil.startsWith('ADMIN') &&
        setorTokens.some(isGeoToken);
      const isSetorAdministrativo = setorTokens.some(isAdministrativoToken);
      const literalHistoricoSetorUsuario = montarLiteralHistoricoSetoresEnvolvidos(setorTokens);
      const regrasSetoresPorUsuario = await obterSetoresVisiveisPorUsuario();
      const setoresExtrasUsuario = regrasSetoresPorUsuario[String(usuarioId)] || [];
      const setoresVisiveisAoAtribuir = Array.from(new Set([
        ...setorTokens,
        ...setoresExtrasUsuario
      ]));
      const modoRecebimentoSetorUsuario = await obterModoRecebimentoSetor(setorTokens);
      const setorTodosVisiveis = modoRecebimentoSetorUsuario === 'TODOS_VISIVEIS';

      if (isSetorAdministrativo && perfil !== 'SUPERADMIN') {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({
          [Op.or]: [
            { criado_por: usuarioId },
            {
              id: {
                [Op.in]: Sequelize.literal(`(
                  SELECT solicitacao_id
                  FROM historicos
                  WHERE usuario_responsavel_id = ${usuarioId}
                    AND acao IN ('RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU')
                )`)
              }
            },
            {
              id: {
                [Op.in]: Sequelize.literal(`(
                  SELECT n.solicitacao_id
                  FROM notificacoes n
                  INNER JOIN notificacao_destinatarios nd ON nd.notificacao_id = n.id
                  WHERE nd.usuario_id = ${usuarioId}
                    AND n.tipo = 'MENCAO_COMENTARIO'
                )`)
              }
            }
          ]
        });
      }

      if (!isSetorAdministrativo && perfil !== 'SUPERADMIN' && adminGEO) {
        // ADMIN GEO ve solicitacoes do setor GEO/gerencia de processos
        // e tambem solicitacoes que ja passaram por esse setor.
        where[Op.and] = where[Op.and] || [];
        const tokensGeoUsuario = setorTokens.filter(isGeoToken);
        const literalHistoricoGeoUsuario = montarLiteralHistoricoSetoresEnvolvidos(tokensGeoUsuario);
        where[Op.and].push({
          [Op.or]: [
            { area_responsavel: { [Op.in]: tokensGeoUsuario } },
            literalHistoricoGeoUsuario ? {
              id: {
                [Op.in]: literalHistoricoGeoUsuario
              }
            } : null
          ].filter(Boolean)
        });
      }

      // Setor OBRA (ADMIN e USUARIO): ve apenas solicitacoes criadas por ele
      // e/ou das obras vinculadas ao usuario. Superadmin continua com visao global.
      if (!isSetorAdministrativo && isSetorObra && perfil !== 'SUPERADMIN') {
        const condicoesObra = [{ criado_por: usuarioId }];
        if (obrasVinculadas.length > 0) {
          condicoesObra.push({ obra_id: { [Op.in]: obrasVinculadas } });
        }
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ [Op.or]: condicoesObra });
      }

      // SUPERADMIN ve tudo; demais passam por regra de visibilidade
      if (perfil !== 'SUPERADMIN' && !isSetorAdministrativo && !adminGEO && !isSetorObra) {
        const condicoes = [];

        // Criador ve
        condicoes.push({ criado_por: usuarioId });

        // Setor atual ve
        const setoresPermitidos = [];
        if (areaUsuario) setoresPermitidos.push(areaUsuario);
        if (setorAtual?.codigo) setoresPermitidos.push(setorAtual.codigo);
        if (setorAtual?.nome) setoresPermitidos.push(setorAtual.nome);
        if (setorAtual?.id) setoresPermitidos.push(String(setorAtual.id));
        if (req.user.setor_id) setoresPermitidos.push(String(req.user.setor_id));
        const setoresUnicos = Array.from(new Set(setoresPermitidos.filter(Boolean)));
        if (setoresUnicos.length > 0) {
          condicoes.push({ area_responsavel: { [Op.in]: setoresUnicos } });
        }

        // Responsavel ve (respeita setores configurados para o usuario)
        condicoes.push({
          [Op.and]: [
            { area_responsavel: { [Op.in]: setoresVisiveisAoAtribuir } },
            {
              id: {
                [Op.in]: Sequelize.literal(`(
                  SELECT solicitacao_id
                  FROM historicos
                  WHERE usuario_responsavel_id = ${usuarioId}
                    AND acao IN ('RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU')
                )`)
              }
            }
          ]
        });

        // Qualquer interacao do usuario no historico (respeita setores configurados)
        condicoes.push({
          [Op.and]: [
            { area_responsavel: { [Op.in]: setoresVisiveisAoAtribuir } },
            {
              id: {
                [Op.in]: Sequelize.literal(`(
                  SELECT solicitacao_id
                  FROM historicos
                  WHERE usuario_responsavel_id = ${usuarioId}
                )`)
              }
            }
          ]
        });

        // Vinculo com obra ve
        if (obrasVinculadas.length > 0) {
          condicoes.push({ obra_id: { [Op.in]: obrasVinculadas } });
        }

        // Mantem visibilidade de solicitacoes que ja passaram pelo setor do usuario
        if (literalHistoricoSetorUsuario) {
          condicoes.push({
            id: { [Op.in]: literalHistoricoSetorUsuario }
          });
        }

        const regrasTiposCompartilhados = await obterConfiguracaoTiposCompartilhados();
        const compartilhamentos = obterTiposCompartilhadosParaTokens(setorTokens, regrasTiposCompartilhados);
        compartilhamentos.forEach((regra) => {
          if (regra?.setor_origem && Array.isArray(regra.tipos) && regra.tipos.length > 0) {
            condicoes.push({
              [Op.and]: [
                { area_responsavel: regra.setor_origem },
                { tipo_solicitacao_id: { [Op.in]: regra.tipos } }
              ]
            });
          }
        });

        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({ [Op.or]: condicoes });
      }

      /* ===============================
        4) FILTROS
      =============================== */

      if (area) {
        const areasSelecionadas = String(area)
          .split(',')
          .map(item => String(item || '').trim())
          .filter(Boolean);

        if (areasSelecionadas.length > 0) {
          const areaIdsNumericos = areasSelecionadas
            .map(item => Number(item))
            .filter(item => !Number.isNaN(item));

          const setoresFiltroRows = await Setor.findAll({
            where: {
              [Op.or]: [
                { codigo: { [Op.in]: areasSelecionadas } },
                { nome: { [Op.in]: areasSelecionadas } },
                ...(areaIdsNumericos.length > 0 ? [{ id: { [Op.in]: areaIdsNumericos } }] : [])
              ]
            },
            attributes: ['id', 'codigo', 'nome']
          });

          const valoresFiltroSetor = Array.from(new Set([
            ...areasSelecionadas,
            ...setoresFiltroRows.flatMap(setor => [
              setor?.codigo,
              setor?.nome,
              setor?.id != null ? String(setor.id) : null
            ])
          ]
            .filter(Boolean)
            .map(v => String(v).trim())));

          if (valoresFiltroSetor.length > 0) {
            where.area_responsavel = { [Op.in]: valoresFiltroSetor };
          } else {
            where.area_responsavel = { [Op.in]: areasSelecionadas };
          }
        }
      }
      if (status) {
        const statusSelecionados = String(status)
          .split(',')
          .map(item => String(item || '').trim())
          .filter(Boolean);

        if (statusSelecionados.length > 0) {
          const condicoesStatus = statusSelecionados.map(statusFiltro => {
            const statusSemAcento = statusFiltro
              .toUpperCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');
            const statusComUnderscore = statusSemAcento.replace(/\s+/g, '_');
            const statusComEspaco = statusSemAcento.replace(/_/g, ' ');
            const statusSemSeparador = statusSemAcento.replace(/[\s_]+/g, '');

            return {
              [Op.or]: [
                { status_global: statusComUnderscore },
                { status_global: statusComEspaco },
                Sequelize.where(
                  Sequelize.fn(
                    'REPLACE',
                    Sequelize.fn(
                      'REPLACE',
                      Sequelize.fn('UPPER', Sequelize.col('status_global')),
                      '_',
                      ''
                    ),
                    ' ',
                    ''
                  ),
                  statusSemSeparador
                )
              ]
            };
          });

          where[Op.and] = where[Op.and] || [];
          where[Op.and].push({ [Op.or]: condicoesStatus });
        }
      }
      if (obra_id) {
        const idNum = Number(obra_id);
        if (!Number.isNaN(idNum) && idNum > 0) {
          where.obra_id = idNum;
        }
      }
      if (obra_ids) {
        const ids = String(obra_ids)
          .split(',')
          .map(id => Number(id))
          .filter(id => !Number.isNaN(id) && id > 0);
        if (ids.length > 0) {
          where.obra_id = { [Op.in]: ids };
        } else {
          where.obra_id = -1;
        }
      }

      if (isSetorObra) {
        const filtroAtual = where.obra_id;
        if (filtroAtual) {
          if (typeof filtroAtual === 'number') {
            if (!obrasVinculadas.includes(filtroAtual)) {
              where.obra_id = -1;
            }
          } else if (filtroAtual[Op.in]) {
            const idsFiltrados = filtroAtual[Op.in].filter(id => obrasVinculadas.includes(id));
            where.obra_id = idsFiltrados.length > 0 ? { [Op.in]: idsFiltrados } : -1;
          }
        } else {
          where.obra_id = { [Op.in]: obrasVinculadas };
        }
      }
      if (tipo_macro_id) {
        const tipoMacroNum = Number(tipo_macro_id);
        if (!Number.isNaN(tipoMacroNum) && tipoMacroNum > 0) {
          where.tipo_macro_id = tipoMacroNum;
        }
      }
      if (tipo_solicitacao_id) {
        const tiposSelecionados = String(tipo_solicitacao_id)
          .split(',')
          .map(id => Number(id))
          .filter(id => !Number.isNaN(id) && id > 0);

        if (tiposSelecionados.length > 1) {
          where.tipo_solicitacao_id = { [Op.in]: tiposSelecionados };
        } else if (tiposSelecionados.length === 1) {
          where.tipo_solicitacao_id = tiposSelecionados[0];
        }
      }
      if (codigo) {
        const codigoFiltro = String(codigo).trim();
        if (codigoFiltro) {
          where.codigo = {
            [Op.like]: `%${codigoFiltro}%`
          };
        }
      }
      if (codigo_contrato) {
        const codigoContratoFiltro = String(codigo_contrato).trim();
        if (codigoContratoFiltro) {
          where.codigo_contrato = {
            [Op.like]: `%${codigoContratoFiltro}%`
          };
        }
      }
      const numeroSiengeFiltroBruto = String(numero_sienge || numero_solicitacao || '').trim();
      if (numeroSiengeFiltroBruto) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({
          [Op.or]: [
            { numero_sienge: { [Op.like]: `%${numeroSiengeFiltroBruto}%` } },
            { numero_pedido: { [Op.like]: `%${numeroSiengeFiltroBruto}%` } }
          ]
        });
      }
      if (valor_min !== undefined && valor_min !== null && String(valor_min).trim() !== '') {
        const min = Number(valor_min);
        if (!Number.isNaN(min)) {
          where.valor = { ...(where.valor || {}), [Op.gte]: min };
        }
      }
      if (valor_max !== undefined && valor_max !== null && String(valor_max).trim() !== '') {
        const max = Number(valor_max);
        if (!Number.isNaN(max)) {
          where.valor = { ...(where.valor || {}), [Op.lte]: max };
        }
      }
      if (data_registro) {
        const dataRegistroStr = String(data_registro).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dataRegistroStr)) {
          where.createdAt = {
            [Op.gte]: new Date(`${dataRegistroStr}T00:00:00`),
            [Op.lte]: new Date(`${dataRegistroStr}T23:59:59.999`)
          };
        }
      } else if (data_inicio || data_fim) {
        const intervaloData = {};
        if (data_inicio) {
          const dataInicioStr = String(data_inicio).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(dataInicioStr)) {
            intervaloData[Op.gte] = new Date(`${dataInicioStr}T00:00:00`);
          }
        }
        if (data_fim) {
          const dataFimStr = String(data_fim).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(dataFimStr)) {
            intervaloData[Op.lte] = new Date(`${dataFimStr}T23:59:59.999`);
          }
        }
        if (Object.keys(intervaloData).length > 0) {
          where.createdAt = intervaloData;
        }
      }

      if (data_vencimento) {
        const dataVencimentoStr = String(data_vencimento).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dataVencimentoStr)) {
          where[Op.and] = where[Op.and] || [];
          where[Op.and].push(
            Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('Solicitacao.data_vencimento')),
              dataVencimentoStr
            )
          );
        }
      }

      if (responsavel) {
        const responsavelFiltro = String(responsavel).trim();
        if (responsavelFiltro) {
          const responsaveisSelecionados = responsavelFiltro
            .split(',')
            .map(item => String(item || '').trim())
            .filter(Boolean);

          where[Op.and] = where[Op.and] || [];

          if (responsaveisSelecionados.length > 1) {
            const valoresIn = responsaveisSelecionados
              .map(item => `'${item.replace(/'/g, "''").toUpperCase()}'`)
              .join(', ');

            where[Op.and].push(
              Sequelize.literal(`EXISTS (
                SELECT 1
                FROM historicos h
                INNER JOIN users u ON u.id = h.usuario_responsavel_id
                WHERE h.solicitacao_id = Solicitacao.id
                  AND h.acao IN ('RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU')
                  AND h.createdAt = (
                    SELECT MAX(h2.createdAt)
                    FROM historicos h2
                    WHERE h2.solicitacao_id = Solicitacao.id
                      AND h2.acao IN ('RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU')
                  )
                  AND UPPER(u.nome) IN (${valoresIn})
              )`)
            );
          } else {
            const filtroEscapado = responsaveisSelecionados[0].replace(/'/g, "''");
            where[Op.and].push(
              Sequelize.literal(`EXISTS (
                SELECT 1
                FROM historicos h
                INNER JOIN users u ON u.id = h.usuario_responsavel_id
                WHERE h.solicitacao_id = Solicitacao.id
                  AND h.acao IN ('RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU')
                  AND h.createdAt = (
                    SELECT MAX(h2.createdAt)
                    FROM historicos h2
                    WHERE h2.solicitacao_id = Solicitacao.id
                      AND h2.acao IN ('RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU')
                  )
                  AND UPPER(u.nome) LIKE UPPER('%${filtroEscapado}%')
              )`)
            );
          }
        }
      }
      /* ===============================
        5) CONSULTA
      =============================== */

      const includeBase = buildSolicitacaoResumoListaInclude();

      let resultado = [];
      let totalRegistros = 0;

      const listarObrasDistinct = async (obraIds) => {
        const idsValidos = Array.from(new Set((obraIds || [])
          .map(id => Number(id))
          .filter(id => !Number.isNaN(id) && id > 0)));

        if (idsValidos.length === 0) {
          return [];
        }

        const obras = await Obra.findAll({
          where: { id: { [Op.in]: idsValidos } },
          attributes: ['id', 'nome', 'codigo'],
          order: [['nome', 'ASC']]
        });

        return obras.map(obra => ({
          id: obra.id,
          nome: obra.nome,
          codigo: obra.codigo
        }));
      };

      const usuarioComRegraMistaPorTipo =
        perfil === 'USUARIO' &&
        !adminGEO &&
        !isSetorObra;

      if (usuarioComRegraMistaPorTipo) {
        const solicitacoesFiltro = await Solicitacao.findAll({
          where,
          attributes: ['id', 'obra_id', 'area_responsavel', 'tipo_solicitacao_id', 'criado_por', 'createdAt'],
          order: [['createdAt', 'DESC']]
        });
        let resultadoFiltro = solicitacoesFiltro.map(item => item.toJSON());

        if (isSetorObra) {
          resultadoFiltro = resultadoFiltro.filter(item => obrasVinculadas.includes(item.obra_id));
        }

        const idsResultado = resultadoFiltro.map(item => item.id);
        const historicosUsuario = idsResultado.length > 0
          ? await Historico.findAll({
              where: {
                solicitacao_id: { [Op.in]: idsResultado },
                usuario_responsavel_id: usuarioId,
                acao: { [Op.in]: ['RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU'] }
              },
              attributes: ['solicitacao_id']
            })
          : [];
        const idsComInteracaoUsuario = new Set(
          historicosUsuario.map(h => Number(h.solicitacao_id))
        );

        const regrasTiposPorSetor = await obterTiposSolicitacaoPorSetorConfig();
        const setoresUsuarioUpper = new Set(setorTokens.map(t => String(t || '').toUpperCase()));

        resultadoFiltro = resultadoFiltro.filter(item => {
          const areaItem = String(item.area_responsavel || '').trim().toUpperCase();
          const tipoId = Number(item.tipo_solicitacao_id);
          const itemEhDoSetorUsuario = setoresUsuarioUpper.has(areaItem);
          const itemCriadoPeloUsuario = Number(item.criado_por) === Number(usuarioId);
          const itemComInteracaoUsuario = idsComInteracaoUsuario.has(Number(item.id));

          if (!itemEhDoSetorUsuario) return true;
          if (itemCriadoPeloUsuario || itemComInteracaoUsuario) return true;

          const regraTipo = obterRegrasTipoPorTokensSetor(regrasTiposPorSetor, [areaItem]);
          let modoPorTipo = null;
          if (regraTipo?.modos && Number.isInteger(tipoId) && tipoId > 0) {
            modoPorTipo = regraTipo.modos[String(tipoId)] || null;
          }

          const modoEfetivo = String(modoPorTipo || (setorTodosVisiveis ? 'TODOS_VISIVEIS' : 'ADMIN_PRIMEIRO')).toUpperCase();
          return modoEfetivo === 'TODOS_VISIVEIS';
        });

        totalRegistros = resultadoFiltro.length;

        if (apenasObrasSolicitadas) {
          const obraIdsVisiveis = resultadoFiltro.map(item => Number(item.obra_id));
          return res.json(await listarObrasDistinct(obraIdsVisiveis));
        }

        const idsPagina = (paginacaoSolicitada && !listarTodasSolicitacoes
          ? resultadoFiltro.slice(offset, offset + limitePorPagina)
          : resultadoFiltro
        ).map(item => Number(item.id));

        if (idsPagina.length > 0) {
          const ordemPagina = new Map(idsPagina.map((id, index) => [id, index]));
          const solicitacoesPagina = await Solicitacao.findAll({
            where: { id: { [Op.in]: idsPagina } },
            include: includeBase
          });
          resultado = await montarResumoSolicitacoesLista(solicitacoesPagina);
          resultado.sort(
            (a, b) =>
              (ordemPagina.get(Number(a.id)) || 0) -
              (ordemPagina.get(Number(b.id)) || 0)
          );
        }
      } else {
        if (apenasObrasSolicitadas) {
          const solicitacoesComObra = await Solicitacao.findAll({
            where,
            attributes: ['obra_id']
          });

          let obraIdsVisiveis = solicitacoesComObra.map(item => Number(item.obra_id));
          if (isSetorObra) {
            obraIdsVisiveis = obraIdsVisiveis.filter(id => obrasVinculadas.includes(id));
          }

          return res.json(await listarObrasDistinct(obraIdsVisiveis));
        }

        totalRegistros = await Solicitacao.count({ where });
        const solicitacoes = await Solicitacao.findAll({
          where,
          include: includeBase,
          order: [['createdAt', 'DESC']],
          ...(paginacaoSolicitada && !listarTodasSolicitacoes
            ? { limit: limitePorPagina, offset }
            : {})
        });
        resultado = await montarResumoSolicitacoesLista(solicitacoes);

        if (isSetorObra) {
          resultado = resultado.filter(item => obrasVinculadas.includes(item.obra_id));
          if (!paginacaoSolicitada) {
            totalRegistros = resultado.length;
          }
        }
      }

      if (!paginacaoSolicitada) {
        return res.json(resultado);
      }

      return res.json({
        items: resultado,
        meta: {
          page: paginaAtual,
          limit: listarTodasSolicitacoes ? 'all' : limitePorPagina,
          total: totalRegistros,
          total_pages: listarTodasSolicitacoes
            ? (totalRegistros > 0 ? 1 : 0)
            : (totalRegistros > 0
                ? Math.ceil(totalRegistros / limitePorPagina)
                : 0)
        }
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar solicitacoes' });
    }
  },

  async obrasVisiveis(req, res) {
    return module.exports.index(
      {
        ...req,
        query: {
          ...req.query,
          apenas_obras: '1'
        }
      },
      res
    );
  },

  // =====================================================
  // CRIAR SOLICITACAO
  // =====================================================
  async create(req, res) {
    try {
      const {
        obra_id,
        tipo_solicitacao_id,
        tipo_macro_id,
        tipo_sub_id,
        descricao,
        valor,
        parceiro_id,
        apropriacao_id,
        area_responsavel,
        diretoria_fluxo_codigo,
        codigo_contrato,
        contrato_id,
        data_vencimento,
        data_inicio_medicao,
        data_fim_medicao,
        itens_apropriacao,
        ref_contrato_abertura
      } = req.body;

      if (!obra_id || !tipo_solicitacao_id || !area_responsavel) {
        return res.status(400).json({
          error: 'Campos obrigatorios nao informados'
        });
      }

      const setorDestinoSelecionado = await resolveSetorReferencia(area_responsavel, {
        attributes: ['id', 'nome', 'codigo', 'eh_setor_obra', 'eh_setor_financeiro', 'eh_setor_compras', 'eh_setor_geo', 'eh_setor_administrativo']
      });
      if (!setorDestinoSelecionado) {
        return res.status(400).json({
          error: 'Setor responsavel nao encontrado no cadastro.'
        });
      }
      const areaResponsavelPersistida = resolveSetorPersistenciaValue(setorDestinoSelecionado, area_responsavel);

      const obraSelecionada = await Obra.findByPk(obra_id, {
        attributes: ['id', 'codigo', 'nome', 'classificacao']
      });
      if (!obraSelecionada) {
        return res.status(400).json({ error: 'Obra informada nao foi encontrada.' });
      }

      const configAprovacaoDiretoria = await obterConfiguracaoAprovacaoDiretoria();
      const diretoriaConfiguradaObra = obterDiretoriaParaObra(
        obraSelecionada,
        configAprovacaoDiretoria.diretoriasPorClassificacao
      );
      const diretoriaSolicitada = normalizarTokenSetor(diretoria_fluxo_codigo);
      const diretoriaFluxoCodigo = diretoriaConfiguradaObra || diretoriaSolicitada;
      if (diretoriaSolicitada && diretoriaConfiguradaObra && diretoriaSolicitada !== diretoriaConfiguradaObra) {
        return res.status(400).json({
          error: 'Diretoria de aprovacao nao corresponde a classificacao da obra selecionada.'
        });
      }
      const usarFluxoDiretoria = Boolean(diretoriaFluxoCodigo);

      const regrasAreasPorSetor = await obterRegrasAreasPorSetorOrigem();
      const areaUsuario = await obterAreaUsuario(req);
      const tokensSetorUsuario = await obterTokensSetorUsuario(req, areaUsuario);
      const perfilUsuario = String(req.user?.perfil || '').trim().toUpperCase();
      const setoresCriacaoTodasObras = await obterSetoresCriacaoTodasObras();
      const podeCriarEmTodasObras = tokensSetorUsuario.some(token =>
        setoresCriacaoTodasObras.includes(String(token || '').trim().toUpperCase())
      );

      if (perfilUsuario !== 'SUPERADMIN' && !podeCriarEmTodasObras) {
        const { UsuarioObra } = require('../models');
        const vinculo = await UsuarioObra.findOne({
          where: {
            user_id: req.user.id,
            obra_id
          },
          attributes: ['id']
        });
        if (!vinculo) {
          return res.status(403).json({
            error: 'Acesso negado. Usuario nao vinculado a obra selecionada.'
          });
        }
      }

      const destinosPermitidos = new Set();
      tokensSetorUsuario.forEach(token => {
        const lista = regrasAreasPorSetor[String(token || '').toUpperCase()] || [];
        lista.forEach(item => destinosPermitidos.add(String(item || '').toUpperCase()));
      });

      if (destinosPermitidos.size > 0) {
        const destino = String(areaResponsavelPersistida || '').trim().toUpperCase();
        if (!destinosPermitidos.has(destino)) {
          return res.status(403).json({
            error: 'Area responsavel nao permitida para o seu setor.'
          });
        }
      }

      const tipoSelecionado = await TipoSolicitacao.findByPk(tipo_solicitacao_id);
      if (!tipoSelecionado) {
        return res.status(400).json({
          error: 'Tipo de solicitacao nao encontrado.'
        });
      }
      const tiposPorSetorConfig = await obterTiposSolicitacaoPorSetorConfig();
      const regraTiposSetorDestino = obterRegrasTipoPorTokensSetor(
        tiposPorSetorConfig,
        buildSetorComparisonTokens(setorDestinoSelecionado)
      );
      if (regraTiposSetorDestino && Array.isArray(regraTiposSetorDestino.tipos) && regraTiposSetorDestino.tipos.length > 0) {
        const tipoIdNum = Number(tipo_solicitacao_id);
        if (!regraTiposSetorDestino.tipos.includes(tipoIdNum)) {
          return res.status(403).json({
            error: 'Tipo de solicitacao nao permitido para o setor selecionado.'
          });
        }
      }
      const comportamentoBase = normalizeTipoSolicitacaoBehavior(tipoSelecionado);
      const [contratosDisponiveis, apropriacoesDisponiveis] = await Promise.all([
        isModuleEnabled('CONTRATOS'),
        isModuleEnabled('OBRAS')
      ]);
      const comportamentoTipo = applyTipoSolicitacaoModuleAvailability(comportamentoBase, {
        contratos: contratosDisponiveis,
        apropriacoes: apropriacoesDisponiveis
      });
      const configCamposNovaSolicitacao = await obterConfigCamposNovaSolicitacao();
      const camposNovaSolicitacao = resolverCamposNovaSolicitacao(
        comportamentoTipo,
        configCamposNovaSolicitacao,
        tipo_solicitacao_id,
        { apropriacoesDisponiveis }
      );
      const campoVisivel = (campo) => camposNovaSolicitacao?.[campo]?.visivel !== false;
      const campoObrigatorio = (campo) => Boolean(camposNovaSolicitacao?.[campo]?.obrigatorio);

      if (campoObrigatorio('valor') && (valor === '' || valor === null || valor === undefined)) {
        return res.status(400).json({
          error: 'Para continuar, informe o valor da solicitacao.'
        });
      }

      if (campoObrigatorio('descricao') && !descricao) {
        return res.status(400).json({
          error: 'Campos obrigatorios nao informados'
        });
      }

      if (campoObrigatorio('subtipo') && !tipo_sub_id) {
        return res.status(400).json({
          error: 'Para continuar, selecione o subtipo.'
        });
      }
      if (campoObrigatorio('periodo_medicao') && (!data_inicio_medicao || !data_fim_medicao)) {
        return res.status(400).json({
          error: 'Para Medicao, informe data inicial e data final.'
        });
      }
      if (campoObrigatorio('data_vencimento') && !data_vencimento) {
        return res.status(400).json({
          error: 'Informe a data de vencimento.'
        });
      }
      if (campoVisivel('data_vencimento') && data_vencimento) {
        const vencimentoStr = String(data_vencimento).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimentoStr)) {
          return res.status(400).json({
            error: 'Data de vencimento invalida. Use o formato YYYY-MM-DD.'
          });
        }

        const agora = new Date();
        const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;

        if (vencimentoStr < hojeStr) {
          return res.status(400).json({
            error: 'A data de vencimento nao pode ser menor que a data atual.'
          });
        }
      }
      if (campoObrigatorio('contrato') && !contrato_id) {
        return res.status(400).json({
          error: 'Selecione um contrato.'
        });
      }
      if (campoObrigatorio('itens_apropriacao') && !itens_apropriacao) {
        return res.status(400).json({
          error: 'Para Abertura de Contrato, informe os itens de apropriacao.'
        });
      }
      if (campoObrigatorio('ref_contrato_abertura') && !ref_contrato_abertura) {
        return res.status(400).json({
          error: 'Para Abertura de Contrato, informe a ref do contrato.'
        });
      }
      if (campoObrigatorio('credor') && !parceiro_id) {
        return res.status(400).json({
          error: 'Selecione o credor da solicitacao.'
        });
      }

      let apropriacao = null;
      if (campoVisivel('apropriacao_principal') && apropriacao_id !== undefined && apropriacao_id !== null && apropriacao_id !== '') {
        apropriacao = await Apropriacao.findByPk(Number(apropriacao_id), {
          attributes: ['id', 'obra_id', 'codigo', 'descricao']
        });

        if (!apropriacao) {
          return res.status(400).json({
            error: 'Apropriacao informada nao foi encontrada.'
          });
        }

        if (Number(apropriacao.obra_id) !== Number(obra_id)) {
          return res.status(400).json({
            error: 'A apropriacao selecionada nao pertence a obra informada.'
          });
        }
      }

      if (campoObrigatorio('apropriacao_principal') && !apropriacao) {
        return res.status(400).json({
          error: 'Selecione a apropriacao principal da solicitacao.'
        });
      }

      const usuarioId = req.user.id;
      const usuario = await User.findByPk(usuarioId);
      let parceiro = null;

      if (campoVisivel('credor') && parceiro_id !== undefined && parceiro_id !== null && parceiro_id !== '') {
        parceiro = await Parceiro.findByPk(Number(parceiro_id), {
          attributes: ['id', 'nome', 'cpf_cnpj', 'fornecedor', 'ativo']
        });

        if (!parceiro) {
          return res.status(400).json({
            error: 'Credor informado nao foi encontrado.'
          });
        }

        if (parceiro.ativo === false || parceiro.fornecedor !== true) {
          return res.status(400).json({
            error: 'Selecione uma pessoa cadastrada como credor ativo.'
          });
        }
      }

      const valorPersistido = !campoVisivel('valor')
        ? null
        : (valor === '' || valor === undefined ? null : valor);

      const codigo = await gerarCodigoSolicitacao();

      const solicitacao = await Solicitacao.create({
        codigo,
        obra_id,
        parceiro_id: parceiro?.id || null,
        apropriacao_id: apropriacao?.id || null,
        tipo_solicitacao_id,
        tipo_macro_id: tipo_macro_id || null,
        tipo_sub_id: campoVisivel('subtipo') ? (tipo_sub_id || null) : null,
        descricao: campoVisivel('descricao') ? descricao : '',
        valor: valorPersistido,
        area_responsavel: usarFluxoDiretoria ? diretoriaFluxoCodigo : areaResponsavelPersistida,
        fluxo_aprovacao_diretoria: usarFluxoDiretoria,
        diretoria_fluxo_codigo: usarFluxoDiretoria ? diretoriaFluxoCodigo : null,
        setor_destino_pos_aprovacao: usarFluxoDiretoria ? areaResponsavelPersistida : null,
        codigo_contrato: campoVisivel('contrato') ? codigo_contrato : null,
        contrato_id: campoVisivel('contrato') ? (contrato_id || null) : null,
        data_vencimento: campoVisivel('data_vencimento') ? (data_vencimento || null) : null,
        data_inicio_medicao: campoVisivel('periodo_medicao') ? (data_inicio_medicao || null) : null,
        data_fim_medicao: campoVisivel('periodo_medicao') ? (data_fim_medicao || null) : null,
        criado_por: usuarioId,
        status_global: 'PENDENTE'
      });

      await registrarEventoSeguranca({
        req,
        usuarioId,
        tipoEvento: 'SOLICITACAO_CREATED',
        recursoTipo: 'SOLICITACAO',
        recursoId: solicitacao.id,
        status: 'SUCCESS',
        descricao: 'Solicitacao criada',
        metadata: {
          obra_id,
          tipo_solicitacao_id,
          area_responsavel: usarFluxoDiretoria ? diretoriaFluxoCodigo : areaResponsavelPersistida,
          setor_destino_pos_aprovacao: usarFluxoDiretoria ? areaResponsavelPersistida : null,
          diretoria_fluxo_codigo: usarFluxoDiretoria ? diretoriaFluxoCodigo : null,
          parceiro_id: parceiro?.id || null,
          apropriacao_id: apropriacao?.id || null
        }
      });

      const itensTexto = campoVisivel('itens_apropriacao') && itens_apropriacao
        ? `Itens de apropriacao: ${String(itens_apropriacao).trim()}`
        : null;
      const apropriacaoTexto = apropriacao
        ? `Apropriacao principal: ${String(apropriacao.codigo || apropriacao.descricao || apropriacao.id).trim()}`
        : null;
      const refTexto = campoVisivel('ref_contrato_abertura') && ref_contrato_abertura
        ? `Ref. do contrato: ${String(ref_contrato_abertura).trim()}`
        : null;
      const descricaoHistorico = [apropriacaoTexto, itensTexto, refTexto].filter(Boolean).join(' | ') || null;
      const metadata = {};
      if (apropriacao) {
        metadata.apropriacao_id = apropriacao.id;
        metadata.apropriacao_codigo = apropriacao.codigo;
      }
      if (campoVisivel('itens_apropriacao') && itens_apropriacao) {
        metadata.itens_apropriacao = String(itens_apropriacao).trim();
      }
      if (campoVisivel('ref_contrato_abertura') && ref_contrato_abertura) {
        metadata.ref_contrato_abertura = String(ref_contrato_abertura).trim();
      }
      if (usarFluxoDiretoria) {
        metadata.fluxo_aprovacao_diretoria = true;
        metadata.diretoria_fluxo_codigo = diretoriaFluxoCodigo;
        metadata.setor_destino_pos_aprovacao = areaResponsavelPersistida;
      }

      await Historico.create({
        solicitacao_id: solicitacao.id,
        usuario_responsavel_id: usuarioId,
        setor: usarFluxoDiretoria ? diretoriaFluxoCodigo : areaUsuario,
        acao: 'SOLICITACAO_CRIADA',
        status_novo: 'PENDENTE',
        descricao: descricaoHistorico,
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null
      });

      const destinatariosCriacao = await obterDestinatariosCriacaoSetor(solicitacao);

      await criarNotificacao({
        solicitacao_id: solicitacao.id,
        tipo: 'SOLICITACAO_CRIADA',
        mensagem: `${usuario?.nome || 'Usuario'} criou a solicitacao ${codigo}`,
        created_by: usuarioId,
        destinatarios: destinatariosCriacao,
        usarDestinatariosInformados: true
      });

      // Criador ja enxerga
      await garantirVisibilidade(solicitacao.id, usuarioId);

      await publishSolicitacaoRealtimeEvent({
        action: 'CREATED',
        solicitacao,
        actor: {
          id: usuarioId,
          nome: usuario?.nome || req.user?.nome || null
        }
      });

      return res.status(201).json(solicitacao);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar solicitacao' });
    }
  },

  // =====================================================
  // RESUMO LEVE PARA A LISTA
  // =====================================================
  async resumoLista(req, res) {
    try {
      const { id } = req.params;

      const solicitacao = await Solicitacao.findByPk(id, {
        attributes: [
          'id',
          'criado_por',
          'obra_id',
          'tipo_solicitacao_id',
          'area_responsavel'
        ]
      });

      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acesso = await verificarAcessoDetalheSolicitacao(req, solicitacao);
      if (!acesso.allowed) {
        return res.status(acesso.status || 403).json({ error: acesso.error || 'Acesso negado' });
      }

      const resumo = await buscarResumoListaSolicitacaoPorId(id);
      if (!resumo) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      return res.json(resumo);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar resumo da solicitacao' });
    }
  },

  // =====================================================
  // DETALHE
  // =====================================================
  async show(req, res) {
    try {
      const { id } = req.params;

      const solicitacao = await Solicitacao.findByPk(id, {
        include: [
          // OBRA
          {
            model: Obra,
            as: 'obra',
            attributes: ['id', 'nome', 'codigo']
          },
          // TIPO DE SOLICITACAO
          {
            model: TipoSolicitacao,
            as: 'tipo',
            attributes: ['id', 'nome', 'codigo_interno', 'comportamento']
          },
          // TIPOS MACRO/SUB DA SOLICITACAO
          {
            model: TipoSolicitacao,
            as: 'tipoMacroSolicitacao',
            attributes: ['id', 'nome', 'codigo_interno', 'comportamento']
          },
          {
            model: TipoSubContrato,
            as: 'tipoSubSolicitacao',
            attributes: ['id', 'nome']
          },
          // CONTRATO
          {
            model: Contrato,
            as: 'contrato',
            include: [
              {
                model: TipoSolicitacao,
                as: 'tipoMacro',
                attributes: ['id', 'nome']
              },
              {
                model: TipoSubContrato,
                as: 'tipoSub',
                attributes: ['id', 'nome']
              }
            ]
          },
          {
            model: Apropriacao,
            as: 'apropriacao',
            attributes: ['id', 'codigo', 'descricao', 'obra_id']
          },
          {
            model: Parceiro,
            as: 'parceiro',
            attributes: ['id', 'nome', 'cpf_cnpj', 'telefone', 'email']
          },
          // HISTORICO
          {
            model: Historico,
            as: 'historicos',
            include: [
              {
                model: User,
                as: 'usuario',
                attributes: ['id', 'nome']
              }
            ]
          },
          {
            model: SolicitacaoPagamento,
            as: 'pagamentos',
            required: false,
            include: [
              {
                model: User,
                as: 'criadoPor',
                attributes: ['id', 'nome']
              }
            ]
          }
        ],
        order: [
          [{ model: Historico, as: 'historicos' }, 'createdAt', 'DESC']
        ]
      });

      if (!solicitacao) {
        return res.status(404).json({
          error: 'Solicitacao nao encontrada'
        });
      }

      const acesso = await verificarAcessoDetalheSolicitacao(req, solicitacao);
      if (!acesso.allowed) {
        return res.status(acesso.status || 403).json({ error: acesso.error || 'Acesso negado' });
      }
      const tokensSetorUsuario = acesso.tokensSetorUsuario || [];

      const contextoAprovacaoDiretoria = await obterContextoAprovacaoDiretoria(
        solicitacao,
        solicitacao.obra
      );
      const usaFluxoAprovacaoDiretoria = solicitacaoUsaFluxoAprovacaoDiretoria(
        solicitacao,
        contextoAprovacaoDiretoria
      );
      const podeAprovarDiretoria =
        usaFluxoAprovacaoDiretoria &&
        (
          String(req.user?.perfil || '').trim().toUpperCase() === 'SUPERADMIN' ||
          setorPertenceAoUsuario(tokensSetorUsuario, solicitacao.area_responsavel)
        );

      const payload = solicitacao.toJSON ? solicitacao.toJSON() : solicitacao;
      const resumoFinanceiro = calcularResumoFinanceiroSolicitacao(payload);
      payload.valor_total = resumoFinanceiro.valorTotal;
      payload.valor_pago_acumulado = resumoFinanceiro.valorPagoAcumulado;
      payload.saldo_pagamento = resumoFinanceiro.saldoPagamento;
      payload.valor_exibicao = resumoFinanceiro.valorExibicao;
      payload.pagamentos = (Array.isArray(payload.pagamentos) ? payload.pagamentos : [])
        .sort((a, b) => {
          const dataA = new Date(a?.data_pagamento || a?.createdAt || 0).getTime();
          const dataB = new Date(b?.data_pagamento || b?.createdAt || 0).getTime();
          return dataB - dataA;
        });
      payload.usa_fluxo_aprovacao_diretoria = usaFluxoAprovacaoDiretoria;
      payload.acao_aprovar_diretoria_disponivel = podeAprovarDiretoria;
      payload.setor_destino_aprovacao = contextoAprovacaoDiretoria.setorDestinoAprovacao || null;
      payload.diretoria_responsavel = contextoAprovacaoDiretoria.diretoriaEsperada || null;

      return res.json(payload);

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao buscar solicitacao'
      });
    }
  },

  // =====================================================
  // ATUALIZAR STATUS
  // =====================================================
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const usuarioId = req.user.id;
      const usuario = await User.findByPk(usuarioId);
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      const isSuperadmin = perfil === 'SUPERADMIN';
      const areaUsuario = await obterAreaUsuario(req);
      const isSetorObra = await isSetorObraGeral(req);

      const solicitacao = await Solicitacao.findByPk(id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      const statusAnterior = solicitacao.status_global;

      if (status === statusAnterior) {
        return res.sendStatus(204);
      }

      const setorAtual = solicitacao.area_responsavel;
      const setorValidacaoStatus = String(areaUsuario || setorAtual || '').trim();

      if (!isSuperadmin) {
        const setorAtualStr = setorValidacaoStatus;
        const whereSetor = {
          ativo: true
        };

        if (setorAtualStr) {
          const setorRow = await Setor.findOne({
            where: {
              [Op.or]: [
                { codigo: setorAtualStr },
                { nome: setorAtualStr },
                Sequelize.where(
                  Sequelize.fn('LOWER', Sequelize.col('codigo')),
                  setorAtualStr.toLowerCase()
                ),
                Sequelize.where(
                  Sequelize.fn('LOWER', Sequelize.col('nome')),
                  setorAtualStr.toLowerCase()
                )
              ]
            },
            attributes: ['codigo', 'nome']
          });

          const tokensSetor = [
            setorAtualStr,
            String(setorRow?.codigo || '').trim(),
            String(setorRow?.nome || '').trim()
          ].filter(Boolean);

          whereSetor.setor = { [Op.in]: tokensSetor };
        }

        const etapas = await EtapaSetor.findAll({
          where: whereSetor,
          attributes: ['nome']
        });

        if (etapas.length > 0) {
          const permitidos = etapas
            .map(e => String(e.nome || '').trim().toUpperCase())
            .filter(Boolean);
          const statusNovo = String(status || '').trim().toUpperCase();

          if (!permitidos.includes(statusNovo)) {
            return res.status(400).json({
              error: 'Status nao permitido para este setor'
            });
          }
        }
      }

      await solicitacao.update({ status_global: status });

      await Historico.create({
        solicitacao_id: id,
        usuario_responsavel_id: usuarioId,
        setor: setorValidacaoStatus || solicitacao.area_responsavel,
        acao: 'STATUS_ALTERADO',
        status_anterior: statusAnterior,
        status_novo: status,
        metadata: JSON.stringify({
          ator_id: usuarioId,
          ator_nome: usuario ? usuario.nome : null
        })
      });

      await criarNotificacao({
        solicitacao_id: id,
        tipo: 'STATUS_ALTERADO',
        mensagem: `${usuario?.nome || 'Usuario'} alterou status de ${statusAnterior} para ${status} na solicitacao ${solicitacao.codigo}`,
        created_by: usuarioId,
        metadata: {
          status_anterior: statusAnterior,
          status_novo: status
        }
      });

      let envioAutomaticoExecutado = false;

      if (isSetorObra) {
        const statusAnteriorNorm = normalizarTokenComparacao(statusAnterior);
        const statusNovoNorm = normalizarTokenComparacao(status);

        // Quando OBRA atende um ajuste, retorna automaticamente para o setor
        // que enviou a solicitacao para OBRA (ultimo envio para OBRA).
        const statusAjustePend = new Set(['PENDENTE_DE_AJUSTE', 'AGUARDANDO_AJUSTE']);
        if (statusAjustePend.has(statusAnteriorNorm) && statusNovoNorm === 'ATENDIDO') {
          const envios = await Historico.findAll({
            where: {
              solicitacao_id: id,
              acao: 'ENVIADA_SETOR'
            },
            attributes: ['observacao', 'createdAt'],
            order: [['createdAt', 'DESC']]
          });

          const setorAtualNorm = normalizarTokenComparacao(setorAtual);
          let setorRetorno = null;

          for (const envio of envios) {
            const parsed = parseObservacaoEnvioSetor(envio.observacao);
            if (!parsed) continue;
            const destinoNorm = normalizarTokenComparacao(parsed.destino);
            if (destinoNorm !== setorAtualNorm && destinoNorm !== 'OBRA') continue;
            const origemNorm = normalizarTokenComparacao(parsed.origem);
            if (!origemNorm || origemNorm === setorAtualNorm || origemNorm === 'OBRA') continue;
            setorRetorno = parsed.origem;
            break;
          }

          if (setorRetorno) {
            const envioAuto = await enviarSolicitacaoParaSetorInterno({
              req,
              solicitacao,
              setorDestino: setorRetorno,
              usuarioId,
              permitirEnvioFluxoDiretoria: true
            });

            if (!envioAuto.ok) {
              return res.status(envioAuto.status || 400).json({
                error: envioAuto.error || 'Erro ao retornar solicitacao para o setor anterior'
              });
            }
            envioAutomaticoExecutado = true;
          }
        }

        // Quando OBRA marca "Mercadoria Entregue", envia automaticamente para FINANCEIRO.
        if (!envioAutomaticoExecutado && statusNovoNorm === 'MERCADORIA_ENTREGUE') {
          const setorFinanceiro = await findSetorByCapability('eh_setor_financeiro', {
            attributes: ['codigo', 'nome']
          });
          if (!setorFinanceiro) {
            return res.status(400).json({
              error: 'Nenhum setor configurado como financeiro foi encontrado para o envio automatico.'
            });
          }

          const envioFinanceiro = await enviarSolicitacaoParaSetorInterno({
            req,
            solicitacao,
            setorDestino: resolveSetorPersistenciaValue(setorFinanceiro, 'FINANCEIRO'),
            usuarioId,
            permitirEnvioFluxoDiretoria: true
          });

          if (!envioFinanceiro.ok) {
            return res.status(envioFinanceiro.status || 400).json({
              error: envioFinanceiro.error || 'Erro ao enviar solicitacao automaticamente para FINANCEIRO'
            });
          }
          envioAutomaticoExecutado = true;
        }
      }

      if (!envioAutomaticoExecutado) {
        const automacoesStatus = await obterConfiguracaoAutomacaoStatusSetor();
        const automacao = obterAutomacaoStatusCorrespondente({
          tipoSolicitacaoId: solicitacao.tipo_solicitacao_id,
          status,
          regras: automacoesStatus
        });

        if (automacao?.setor_destino) {
          const envioAutomacao = await enviarSolicitacaoParaSetorInterno({
            req,
            solicitacao,
            setorDestino: automacao.setor_destino,
            usuarioId,
            permitirEnvioFluxoDiretoria: true
          });

          if (!envioAutomacao.ok) {
            return res.status(envioAutomacao.status || 400).json({
              error: envioAutomacao.error || 'Erro ao executar automacao de status por setor'
            });
          }
        }
      }

      await publishSolicitacaoRealtimeEvent({
        action: 'STATUS_UPDATED',
        solicitacao,
        actor: {
          id: usuarioId,
          nome: usuario?.nome || req.user?.nome || null
        },
        metadata: {
          status_anterior: statusAnterior,
          status_novo: status
        }
      });

      return res.sendStatus(204);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  },

  // =====================================================
  // ATUALIZAR NUMERO DO PEDIDO
  // =====================================================
  async atualizarNumeroPedido(req, res) {
    try {
      const { id } = req.params;
      const { numero_pedido } = req.body;
      const isGeo = await isSetorGeo(req);

      if (!isGeo) {
        return res.status(403).json({
          error: 'Apenas usuarios do setor configurado como GEO podem atualizar numero do pedido.'
        });
      }

      const solicitacao = await Solicitacao.findByPk(id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      const usuario = await User.findByPk(req.user.id);

      await solicitacao.update({
        numero_pedido: numero_pedido || null
      });

      await Historico.create({
        solicitacao_id: id,
        usuario_responsavel_id: req.user.id,
        setor: req.user.area,
        acao: 'NUMERO_PEDIDO_ATUALIZADO',
        descricao: numero_pedido ? `Nº no SIENGE: ${numero_pedido}` : 'Nº no SIENGE removido'
      });

      await criarNotificacao({
        solicitacao_id: id,
        tipo: 'NUMERO_PEDIDO_ATUALIZADO',
        mensagem: `${usuario?.nome || 'Usuario'} atualizou o Nº no SIENGE da solicitacao ${solicitacao.codigo}`,
        created_by: req.user.id
      });

      await publishSolicitacaoRealtimeEvent({
        action: 'PEDIDO_UPDATED',
        solicitacao,
        actor: {
          id: req.user.id,
          nome: usuario?.nome || req.user?.nome || null
        },
        metadata: {
          numero_pedido: numero_pedido || null
        }
      });

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar Nº no SIENGE' });
    }
  },

  // =====================================================
  // ATUALIZAR REF. DO CONTRATO (SETOR OBRA)
  // =====================================================
  async atualizarRefContrato(req, res) {
    try {
      const { id } = req.params;
      const { contrato_id } = req.body;

      const setorObra = await isSetorObraGeral(req);
      if (!setorObra) {
        return res.status(403).json({
          error: 'Apenas usuarios do setor configurado como OBRA podem atualizar a ref. do contrato.'
        });
      }

      const solicitacao = await Solicitacao.findByPk(id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      const contratoIdNum = Number(contrato_id);
      if (Number.isNaN(contratoIdNum) || contratoIdNum <= 0) {
        return res.status(400).json({ error: 'Contrato invalido.' });
      }

      const contrato = await Contrato.findByPk(contratoIdNum, {
        attributes: ['id', 'codigo', 'ref_contrato', 'obra_id']
      });

      if (!contrato) {
        return res.status(404).json({ error: 'Contrato nao encontrado.' });
      }

      if (Number(contrato.obra_id) !== Number(solicitacao.obra_id)) {
        return res.status(400).json({
          error: 'Selecione um contrato da mesma obra da solicitacao.'
        });
      }

      await solicitacao.update({
        contrato_id: contrato.id,
        codigo_contrato: contrato.codigo || null
      });

      await Historico.create({
        solicitacao_id: id,
        usuario_responsavel_id: req.user.id,
        setor: req.user.area,
        acao: 'REF_CONTRATO_ATUALIZADA',
        descricao: `Ref. do contrato atualizada para ${contrato.ref_contrato || '-'} (${contrato.codigo || '-'})`,
        metadata: JSON.stringify({
          contrato_id: contrato.id,
          contrato_codigo: contrato.codigo || null,
          ref_contrato: contrato.ref_contrato || null
        })
      });

      await publishSolicitacaoRealtimeEvent({
        action: 'REF_CONTRATO_UPDATED',
        solicitacao,
        actor: {
          id: req.user.id,
          nome: req.user?.nome || null
        },
        metadata: {
          contrato_id: contrato.id,
          contrato_codigo: contrato.codigo || null,
          ref_contrato: contrato.ref_contrato || null
        }
      });

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar ref. do contrato' });
    }
  },

  // =====================================================
  // ATUALIZAR VALOR DA SOLICITACAO (ADMIN GEO / SUPERADMIN)
  // =====================================================
  async atualizarValor(req, res) {
    try {
      const { id } = req.params;
      const { valor } = req.body;
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      const isGeo = await isSetorGeo(req);
      const podeEditar =
        perfil === 'SUPERADMIN' ||
        (perfil.startsWith('ADMIN') && isGeo);

      if (!podeEditar) {
        return res.status(403).json({
          error: 'Acesso negado para alterar valor.'
        });
      }

      const solicitacao = await Solicitacao.findByPk(id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      let novoValor = valor;
      if (novoValor === '' || novoValor === undefined) {
        novoValor = null;
      }
      if (novoValor !== null) {
        novoValor = Number(novoValor);
        if (Number.isNaN(novoValor)) {
          return res.status(400).json({ error: 'Valor invalido' });
        }
      }

      const valorAnterior = solicitacao.valor ?? null;

      await solicitacao.update({
        valor: novoValor
      });

      const usuario = await User.findByPk(req.user.id);

      await Historico.create({
        solicitacao_id: id,
        usuario_responsavel_id: req.user.id,
        setor: req.user.area,
        acao: 'VALOR_ATUALIZADO',
        descricao: `De ${valorAnterior ?? '-'} para ${novoValor ?? '-'}`,
        metadata: JSON.stringify({
          valor_anterior: valorAnterior,
          valor_novo: novoValor
        })
      });

      await criarNotificacao({
        solicitacao_id: id,
        tipo: 'VALOR_ATUALIZADO',
        mensagem: `${usuario?.nome || 'Usuario'} atualizou o valor da solicitacao ${solicitacao.codigo}`,
        created_by: req.user.id,
        metadata: {
          valor_anterior: valorAnterior,
          valor_novo: novoValor
        }
      });

      await publishSolicitacaoRealtimeEvent({
        action: 'VALOR_UPDATED',
        solicitacao,
        actor: {
          id: req.user.id,
          nome: usuario?.nome || req.user?.nome || null
        },
        metadata: {
          valor_anterior: valorAnterior,
          valor_novo: novoValor
        }
      });

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar valor' });
    }
  },

  async aprovarDiretoria(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.user.id;
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      const areaUsuario = await obterAreaUsuario(req);
      const tokensSetorUsuario = expandirTokensComAliasesGeo(
        await obterTokensSetorUsuario(req, areaUsuario)
      );

      const solicitacao = await Solicitacao.findByPk(id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      if (!solicitacao.fluxo_aprovacao_diretoria || !solicitacao.diretoria_fluxo_codigo) {
        return res.status(400).json({ error: 'Solicitacao nao possui fluxo de aprovacao por diretoria.' });
      }

      if (solicitacao.aprovada_diretoria_em) {
        return res.status(400).json({ error: 'Solicitacao ja foi aprovada pela diretoria.' });
      }

      if (!solicitacao.setor_destino_pos_aprovacao) {
        return res.status(400).json({ error: 'Setor destino apos aprovacao nao configurado.' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      const podeAprovar =
        perfil === 'SUPERADMIN' ||
        usuarioPodeAtuarComoDiretoria(tokensSetorUsuario, solicitacao.diretoria_fluxo_codigo);
      if (!podeAprovar) {
        return res.status(403).json({
          error: 'Apenas a diretoria configurada pode aprovar esta solicitacao.'
        });
      }

      if (!setorPertenceAoUsuario([solicitacao.diretoria_fluxo_codigo], solicitacao.area_responsavel)) {
        return res.status(400).json({
          error: 'A solicitacao nao esta mais na diretoria configurada.'
        });
      }

      const destino = solicitacao.setor_destino_pos_aprovacao;
      await solicitacao.update({
        area_responsavel: destino,
        aprovada_diretoria_por: usuarioId,
        aprovada_diretoria_em: new Date()
      });

      await Historico.create({
        solicitacao_id: solicitacao.id,
        usuario_responsavel_id: usuarioId,
        setor: solicitacao.diretoria_fluxo_codigo,
        acao: 'APROVADA_DIRETORIA',
        observacao: `Aprovada pela diretoria e enviada para ${destino}`,
        metadata: JSON.stringify({
          diretoria_fluxo_codigo: solicitacao.diretoria_fluxo_codigo,
          setor_destino_pos_aprovacao: destino
        })
      });

      await criarNotificacao({
        solicitacao_id: solicitacao.id,
        tipo: 'APROVADA_DIRETORIA',
        mensagem: `${req.user?.nome || 'Usuario'} aprovou a solicitacao ${solicitacao.codigo} pela diretoria`,
        created_by: usuarioId,
        metadata: {
          diretoria_fluxo_codigo: solicitacao.diretoria_fluxo_codigo,
          setor_destino_pos_aprovacao: destino
        }
      });

      await publishSolicitacaoRealtimeEvent({
        action: 'APPROVED_DIRETORIA',
        solicitacao,
        actor: {
          id: usuarioId,
          nome: req.user?.nome || null
        },
        metadata: {
          diretoria_fluxo_codigo: solicitacao.diretoria_fluxo_codigo,
          setor_destino_pos_aprovacao: destino
        }
      });

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao aprovar solicitacao pela diretoria' });
    }
  },

  async adicionarPagamento(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { valor, data_pagamento, observacao } = req.body || {};
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      const areaUsuario = await obterAreaUsuario(req);
      const tokensSetor = expandirTokensComAliasesGeo(
        await obterTokensSetorUsuario(req, areaUsuario)
      );
      const isFinanceiro = tokensSetor.some(token => normalizarTokenComparacao(token) === 'FINANCEIRO');
      const isSuperadmin = perfil === 'SUPERADMIN';

      if (!isFinanceiro && !isSuperadmin) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas o setor FINANCEIRO pode informar pagamentos.' });
      }

      const valorPagamento = Number(valor);
      if (!Number.isFinite(valorPagamento) || valorPagamento <= 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Informe um valor de pagamento valido.' });
      }

      const dataPagamento = String(data_pagamento || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Informe a data do pagamento no formato YYYY-MM-DD.' });
      }

      const solicitacao = await Solicitacao.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!solicitacao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        await transaction.rollback();
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      const valorTotal = solicitacao.valor == null ? null : Number(solicitacao.valor);
      if (valorTotal === null || Number.isNaN(valorTotal) || valorTotal <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'A solicitacao precisa ter um valor total valido antes de registrar pagamentos.'
        });
      }

      const valorPagoAtual = Number(solicitacao.valor_pago_acumulado || 0);
      const novoValorPago = Number((valorPagoAtual + valorPagamento).toFixed(2));
      if (novoValorPago - valorTotal > 0.009) {
        await transaction.rollback();
        return res.status(400).json({ error: 'O pagamento informado excede o valor total da solicitacao.' });
      }

      const pagamento = await SolicitacaoPagamento.create({
        solicitacao_id: solicitacao.id,
        valor: valorPagamento,
        data_pagamento: dataPagamento,
        observacao: observacao ? String(observacao).trim() : null,
        created_by: req.user.id
      }, { transaction });

      await solicitacao.update({
        valor_pago_acumulado: novoValorPago
      }, { transaction });

      await Historico.create({
        solicitacao_id: solicitacao.id,
        usuario_responsavel_id: req.user.id,
        setor: areaUsuario || req.user?.area || solicitacao.area_responsavel,
        acao: 'PAGAMENTO_INFORMADO',
        descricao: `Pagamento de ${valorPagamento.toFixed(2)} em ${dataPagamento}`,
        metadata: JSON.stringify({
          pagamento_id: pagamento.id,
          valor: valorPagamento,
          data_pagamento: dataPagamento,
          observacao: observacao ? String(observacao).trim() : null,
          valor_pago_acumulado: novoValorPago
        })
      }, { transaction });

      await transaction.commit();

      await publishSolicitacaoRealtimeEvent({
        action: 'PAYMENT_ADDED',
        solicitacaoId: solicitacao.id,
        actor: {
          id: req.user.id,
          nome: req.user?.nome || null
        },
        metadata: {
          pagamento_id: pagamento.id,
          valor: valorPagamento,
          data_pagamento: dataPagamento,
          valor_pago_acumulado: novoValorPago
        }
      });

      return res.status(201).json({
        id: pagamento.id,
        solicitacao_id: solicitacao.id,
        valor: valorPagamento,
        data_pagamento: dataPagamento,
        observacao: observacao ? String(observacao).trim() : null,
        valor_pago_acumulado: novoValorPago,
        saldo_pagamento: Math.max(valorTotal - novoValorPago, 0)
      });
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: 'Erro ao informar pagamento' });
    }
  },

  // =====================================================
  // ATRIBUIR RESPONSAVEL
  // =====================================================
  async atribuirResponsavel(req, res) {
    try {
      const { id } = req.params;
      const { usuario_responsavel_id } = req.body;

      const perfil = req.user.perfil;
      const areaUsuario = await obterAreaUsuario(req);
      const isSetorObra = await isUsuarioSetorObra(req);
      const tokensSetor = await obterTokensSetorUsuario(req, areaUsuario);
      const isUsuarioFinanceiro = await userHasSetorCapability(req.user, 'eh_setor_financeiro');

      if (isSetorObra) {
        return res.status(403).json({
          error: 'Setor OBRA nao pode atribuir responsaveis. Para seguir, solicite apoio ao responsavel do setor.'
        });
      }

      const solicitacao = await Solicitacao.findByPk(id);

      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      if (String(perfil || '').trim().toUpperCase() !== 'SUPERADMIN') {
        const tokensSetorUsuario = expandirTokensComAliasesGeo(tokensSetor);
        if (!setorPertenceAoUsuario(tokensSetorUsuario, solicitacao.area_responsavel)) {
          return res.status(403).json({
            error: 'Voce so pode assumir solicitacoes que estejam no seu setor atual.'
          });
        }
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      // REGRA PARA USUARIO
      if (perfil === 'USUARIO') {
        const modoRecebimento = await obterModoRecebimentoPorSetorETipo(
          tokensSetor,
          solicitacao.tipo_solicitacao_id
        );
        if (modoRecebimento !== 'TODOS_VISIVEIS') {
          return res.status(403).json({
            error: 'Seu setor esta configurado para recebimento via ADMIN primeiro.'
          });
        }

        let regra = null;
        if (tokensSetor.length > 0) {
          regra = await SetorPermissao.findOne({
            where: { setor: { [Op.in]: tokensSetor } }
          });
        }

        if (!regra || !regra.usuario_pode_atribuir) {
          if (!isUsuarioFinanceiro) {
            return res.status(403).json({
              error: 'Seu setor nao permite atribuir responsaveis'
            });
          }
        }
      }

      if (perfil === 'USUARIO') {
        if (isSetorObra) {
          return res.status(403).json({
            error: 'Setor OBRA nao pode atribuir responsaveis. Para seguir, solicite apoio ao responsavel do setor.'
          });
        }
      }

      const usuarioAcao = await User.findByPk(req.user.id);
      const usuarioResponsavel = await User.findByPk(usuario_responsavel_id);

      if (perfil === 'USUARIO') {
        if (!usuarioResponsavel || usuarioResponsavel.setor_id !== req.user.setor_id) {
          return res.status(403).json({
            error: 'Usuarios com perfil USUARIO so podem atribuir para pessoas do mesmo setor.'
          });
        }
      }
      if (req.user?.setor_id && usuarioResponsavel && usuarioResponsavel.setor_id !== req.user.setor_id) {
        return res.status(403).json({
          error: 'Atribuicoes devem ser para pessoas do mesmo setor.'
        });
      }

      const setorSolicitacao = await resolveSetorReferencia(solicitacao.area_responsavel, {
        attributes: ['id', 'nome', 'codigo', 'eh_setor_obra']
      });

      if (setorSolicitacao && hasSetorCapability(setorSolicitacao, 'eh_setor_obra')) {
        const { UsuarioObra } = require('../models');
        const vinculo = await UsuarioObra.findOne({
          where: { user_id: usuario_responsavel_id, obra_id: solicitacao.obra_id }
        });
        if (!vinculo) {
          return res.status(403).json({
            error: 'Para solicitacoes do setor OBRA, atribua apenas usuarios vinculados a mesma obra.'
          });
        }
      }

      await Historico.create({
        solicitacao_id: id,
        usuario_responsavel_id,
        setor: solicitacao.area_responsavel,
        acao: 'RESPONSAVEL_ATRIBUIDO',
        metadata: JSON.stringify({
          ator_id: req.user.id,
          ator_nome: usuarioAcao ? usuarioAcao.nome : null,
          responsavel_id: usuario_responsavel_id,
          responsavel_nome: usuarioResponsavel ? usuarioResponsavel.nome : null
        })
      });

      await criarNotificacao({
        solicitacao_id: id,
        tipo: 'RESPONSAVEL_ATRIBUIDO',
        mensagem: `${usuarioAcao?.nome || 'Usuario'} atribuiu responsavel na solicitacao ${solicitacao.codigo}`,
        created_by: req.user.id,
        metadata: {
          responsavel_id: usuario_responsavel_id,
          responsavel_nome: usuarioResponsavel ? usuarioResponsavel.nome : null
        }
      });

      await publishSolicitacaoRealtimeEvent({
        action: 'ASSIGNED',
        solicitacao,
        actor: {
          id: req.user.id,
          nome: usuarioAcao ? usuarioAcao.nome : (req.user?.nome || null)
        },
        metadata: {
          responsavel_id: usuario_responsavel_id,
          responsavel_nome: usuarioResponsavel ? usuarioResponsavel.nome : null
        }
      });

      return res.sendStatus(204);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atribuir responsavel' });
    }
  },

  // =====================================================
  // COMENTARIO
  // =====================================================
  async adicionarComentario(req, res) {
    try {
      const { id } = req.params;
      const { descricao, mencoes } = req.body;
      const usuario = await User.findByPk(req.user.id);

      if (!descricao?.trim()) {
        return res.status(400).json({ error: 'Comentario vazio' });
      }

      const solicitacao = await Solicitacao.findByPk(id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      await Historico.create({
        solicitacao_id: id,
        usuario_responsavel_id: req.user.id,
        setor: usuario.setor_id,
        acao: 'COMENTARIO',
        descricao
      });

      const mencoesRecebidas = Array.isArray(mencoes) ? mencoes : [];
      const idsMencionados = [
        ...new Set(
          mencoesRecebidas
            .map(item => Number(item))
            .filter(item => Number.isInteger(item) && item > 0 && item !== req.user.id)
        )
      ];

      if (idsMencionados.length > 0) {
        const usuariosMencionados = await User.findAll({
          where: {
            id: { [Op.in]: idsMencionados },
            ativo: true
          },
          attributes: ['id', 'nome']
        });

        for (const usuarioMencionado of usuariosMencionados) {
          await criarNotificacao({
            solicitacao_id: id,
            tipo: 'MENCAO_COMENTARIO',
            mensagem: `${usuario?.nome || 'Usuario'} mencionou você: "${descricao}"`,
            metadata: {
              comentario: descricao,
              mencionado_por: req.user.id
            },
            created_by: req.user.id,
            destinatarios: [usuarioMencionado.id],
            usarDestinatariosInformados: true
          });
        }
      }

      await publishSolicitacaoRealtimeEvent({
        action: 'COMMENT_ADDED',
        solicitacao,
        actor: {
          id: req.user.id,
          nome: usuario?.nome || req.user?.nome || null
        },
        extraUserIds: idsMencionados,
        metadata: {
          comentario: descricao
        }
      });

      return res.sendStatus(201);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao adicionar comentario' });
    }
  },

  // =====================================================
  // ARQUIVAR DA MINHA LISTA
  // =====================================================
  async ocultarDaMinhaLista(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.user.id;

      const solicitacao = await Solicitacao.findByPk(id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      const [linhasAfetadas] = await SolicitacaoVisibilidadeUsuario.update(
        { oculto: true },
        { where: { solicitacao_id: id, usuario_id: usuarioId } }
      );

      if (!linhasAfetadas) {
        await SolicitacaoVisibilidadeUsuario.create({
          solicitacao_id: id,
          usuario_id: usuarioId,
          oculto: true
        });
      }

      return res.sendStatus(204);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao ocultar solicitacao' });
    }
  },

  async arquivarEmMassa(req, res) {
    try {
      const usuarioId = req.user.id;
      const ids = Array.isArray(req.body?.solicitacao_ids)
        ? req.body.solicitacao_ids.map(Number).filter(id => Number.isInteger(id) && id > 0)
        : [];

      const idsUnicos = [...new Set(ids)];
      if (idsUnicos.length === 0) {
        return res.status(400).json({ error: 'Informe ao menos uma solicitacao.' });
      }

      const solicitacoes = await Solicitacao.findAll({
        where: { id: { [Op.in]: idsUnicos } }
      });

      const map = new Map(solicitacoes.map(s => [Number(s.id), s]));
      const resultado = { total: idsUnicos.length, sucesso: 0, erros: [] };

      for (const id of idsUnicos) {
        const solicitacao = map.get(Number(id));
        if (!solicitacao) {
          resultado.erros.push({ id, error: 'Solicitacao nao encontrada' });
          continue;
        }

        const acessoObra = await validarAcessoObra(req, solicitacao);
        if (!acessoObra) {
          resultado.erros.push({ id, error: 'Acesso negado a obra da solicitacao' });
          continue;
        }

        const [linhasAfetadas] = await SolicitacaoVisibilidadeUsuario.update(
          { oculto: true },
          { where: { solicitacao_id: id, usuario_id: usuarioId } }
        );
        if (!linhasAfetadas) {
          await SolicitacaoVisibilidadeUsuario.create({
            solicitacao_id: id,
            usuario_id: usuarioId,
            oculto: true
          });
        }
        resultado.sucesso += 1;
      }

      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao arquivar solicitacoes em massa' });
    }
  },

  async enviarParaSetorEmMassa(req, res) {
    try {
      const ids = Array.isArray(req.body?.solicitacao_ids)
        ? req.body.solicitacao_ids.map(Number).filter(id => Number.isInteger(id) && id > 0)
        : [];
      const idsUnicos = [...new Set(ids)];
      const setorDestino = String(req.body?.setor_destino || '').trim();
      const usuarioId = req.user.id;
      const isSetorObra = await isUsuarioSetorObra(req);

      if (isSetorObra) {
        return res.status(403).json({
          error: 'Setor OBRA nao pode enviar solicitacoes para outro setor. Para seguir, solicite apoio ao responsavel do setor.'
        });
      }
      if (!setorDestino) {
        return res.status(400).json({ error: 'Selecione um setor de destino.' });
      }
      if (idsUnicos.length === 0) {
        return res.status(400).json({ error: 'Informe ao menos uma solicitacao.' });
      }

      const solicitacoes = await Solicitacao.findAll({
        where: { id: { [Op.in]: idsUnicos } }
      });
      const map = new Map(solicitacoes.map(s => [Number(s.id), s]));
      const resultado = { total: idsUnicos.length, sucesso: 0, erros: [] };

      for (const id of idsUnicos) {
        const solicitacao = map.get(Number(id));
        if (!solicitacao) {
          resultado.erros.push({ id, error: 'Solicitacao nao encontrada' });
          continue;
        }

        const envio = await enviarSolicitacaoParaSetorInterno({
          req,
          solicitacao,
          setorDestino,
          usuarioId
        });
        if (!envio.ok) {
          resultado.erros.push({ id, error: envio.error || 'Erro ao enviar' });
          continue;
        }
        resultado.sucesso += 1;
      }

      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao enviar solicitacoes em massa' });
    }
  },

  async desarquivarDaMinhaLista(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.user.id;

      const solicitacao = await Solicitacao.findByPk(id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        await registrarNegacaoSolicitacao(
          req,
          solicitacao.id,
          solicitacao.obra_id,
          'Usuario tentou desarquivar solicitacao fora do seu escopo de obra'
        );
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      const [visibilidade] = await SolicitacaoVisibilidadeUsuario.findOrCreate({
        where: { solicitacao_id: id, usuario_id: usuarioId },
        defaults: { oculto: false }
      });
      if (visibilidade.oculto) {
        await visibilidade.update({ oculto: false });
      }

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao desarquivar solicitacao' });
    }
  },

  // =====================================================
  // EXCLUIR SOLICITACAO (SUPERADMIN / ADMIN GEO)
  // =====================================================
  async excluir(req, res) {
    try {
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      const isSuperadmin = perfil === 'SUPERADMIN';
      const isGeo = await isSetorGeo(req);
      const isAdminGeo = perfil.startsWith('ADMIN') && isGeo;

      if (!isSuperadmin && !isAdminGeo) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id } = req.params;
      const solicitacao = await Solicitacao.findByPk(id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        await registrarNegacaoSolicitacao(
          req,
          solicitacao.id,
          solicitacao.obra_id,
          'Usuario tentou excluir solicitacao fora do seu escopo de obra'
        );
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      const titulosVinculados = await TituloFinanceiro.count({
        where: {
          solicitacao_id: id
        }
      });

      if (titulosVinculados > 0) {
        return res.status(409).json({
          error: 'Nao e possivel excluir solicitacao com titulos financeiros vinculados.'
        });
      }

      const transaction = await Solicitacao.sequelize.transaction();
      try {
        const notificacoes = await Notificacao.findAll({
          where: { solicitacao_id: id },
          attributes: ['id'],
          transaction
        });
        const notificacaoIds = notificacoes.map(n => n.id);
        if (notificacaoIds.length > 0) {
          await NotificacaoDestinatario.destroy({
            where: { notificacao_id: { [Op.in]: notificacaoIds } },
            transaction
          });
        }

        await Promise.all([
          Notificacao.destroy({ where: { solicitacao_id: id }, transaction }),
          Historico.destroy({ where: { solicitacao_id: id }, transaction }),
          Anexo.destroy({ where: { solicitacao_id: id }, transaction }),
          MensagemSetor.destroy({ where: { solicitacao_id: id }, transaction }),
          StatusArea.destroy({ where: { solicitacao_id: id }, transaction }),
          Comprovante.destroy({ where: { solicitacao_id: id }, transaction }),
          SolicitacaoVisibilidadeUsuario.destroy({ where: { solicitacao_id: id }, transaction })
        ]);

        await LogExclusao.create({
          entidade: 'SOLICITACAO',
          entidade_id: Number(id),
          solicitacao_id: Number(id),
          usuario_id: req.user.id,
          perfil,
          setor: req.user.area || null,
          motivo: isSuperadmin ? 'Exclusao realizada por SUPERADMIN' : 'Exclusao realizada por ADMIN GEO',
          payload_json: JSON.stringify({
            codigo: solicitacao.codigo,
            obra_id: solicitacao.obra_id,
            area_responsavel: solicitacao.area_responsavel,
            valor: solicitacao.valor,
            status_global: solicitacao.status_global
          })
        }, { transaction });

        await Solicitacao.destroy({ where: { id }, transaction });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      await publishSolicitacaoRealtimeEvent({
        action: 'DELETED',
        solicitacao,
        actor: {
          id: req.user.id,
          nome: req.user?.nome || null
        },
        metadata: {
          deleted: true
        }
      });

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao excluir solicitacao' });
    }
  },

  // =====================================================
  // RESUMO
  // =====================================================
  async resumo(req, res) {
    try {
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      const isSuperadmin = perfil === 'SUPERADMIN';
      const isAdminGeo = perfil.startsWith('ADMIN') && await isSetorGeo(req);

      if (!isSuperadmin && !isAdminGeo) {
        await registrarEventoSeguranca({
          req,
          usuarioId: req.user?.id || null,
          tipoEvento: 'AUTHZ_DENIED',
          recursoTipo: 'SOLICITACAO',
          recursoId: 'RESUMO',
          status: 'DENIED',
          descricao: 'Usuario sem permissao para acessar resumo agregado de solicitacoes'
        });
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const dados = await Solicitacao.findAll({
        attributes: [
          'area_responsavel',
          'status_global',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']
        ],
        group: ['area_responsavel', 'status_global']
      });

      const resumo = {};

      dados.forEach(item => {
        const area = item.area_responsavel;
        const status = item.status_global;
        const total = Number(item.get('total'));

        if (!resumo[area]) resumo[area] = {};
        resumo[area][status] = total;
      });

      return res.json(resumo);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar resumo' });
    }
  },

  async upload(req, res) {
    const url = await uploadToS3(req.file, 'solicitacoes');
    const nomeArquivo = url.split('/').pop();
    const nomeOriginal = normalizeOriginalName(req.file.originalname);

    const anexo = await Anexo.create({
      solicitacao_id: req.params.id,
      nome_original: nomeOriginal,
      nome_arquivo: nomeArquivo,
      url
    });

    return res.json(anexo);
  },

  // =====================================================
  // ENVIAR PARA OUTRO SETOR
  // =====================================================
  async enviarParaSetor(req, res) {
    try {
      const { id } = req.params;
      const { setor_destino } = req.body;
      const usuarioId = req.user.id;
      const areaUsuario = await obterAreaUsuario(req);
      const isSetorObra = await isUsuarioSetorObra(req);

      if (isSetorObra) {
        return res.status(403).json({
          error: 'Setor OBRA nao pode enviar solicitacoes para outro setor. Para seguir, solicite apoio ao responsavel do setor.'
        });
      }

      const solicitacao = await Solicitacao.findByPk(id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const envio = await enviarSolicitacaoParaSetorInterno({
        req,
        solicitacao,
        setorDestino: setor_destino,
        usuarioId
      });
      if (!envio.ok) {
        return res.status(envio.status || 400).json({ error: envio.error || 'Erro ao enviar para setor' });
      }

      return res.sendStatus(204);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao enviar para setor' });
    }
  },

  // ASSUMIR SOLICITACAO
  async assumirSolicitacao(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = req.user.id;
      const perfil = req.user.perfil;
      const areaUsuario = await obterAreaUsuario(req);
      const isSetorObra = await isUsuarioSetorObra(req);
      const tokensSetor = await obterTokensSetorUsuario(req, areaUsuario);
      const isUsuarioFinanceiro = await userHasSetorCapability(req.user, 'eh_setor_financeiro');

      if (isSetorObra) {
        return res.status(403).json({
          error: 'Setor OBRA nao pode assumir solicitacoes. Para seguir, solicite apoio ao responsavel do setor.'
        });
      }

      const solicitacao = await Solicitacao.findByPk(id);

      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const acessoObra = await validarAcessoObra(req, solicitacao);
      if (!acessoObra) {
        return res.status(403).json({
          error: 'Acesso negado. Vincule o usuario a obra para continuar.'
        });
      }

      // REGRA PARA USUARIO
      if (perfil === 'USUARIO') {
        const modoRecebimento = await obterModoRecebimentoPorSetorETipo(
          tokensSetor,
          solicitacao.tipo_solicitacao_id
        );
        if (modoRecebimento !== 'TODOS_VISIVEIS') {
          return res.status(403).json({
            error: 'Seu setor esta configurado para recebimento via ADMIN primeiro.'
          });
        }

        let regra = null;
        if (tokensSetor.length > 0) {
          regra = await SetorPermissao.findOne({
            where: { setor: { [Op.in]: tokensSetor } }
          });
        }

        if (!regra || !regra.usuario_pode_assumir) {
          if (!isUsuarioFinanceiro) {
            return res.status(403).json({
              error: 'Seu setor nao permite assumir solicitacoes'
            });
          }
        }
      }

      if (perfil === 'USUARIO') {
        if (isSetorObra) {
          return res.status(403).json({
            error: 'Setor OBRA nao pode assumir solicitacoes. Para seguir, solicite apoio ao responsavel do setor.'
          });
        }
      }

      const usuarioAcao = await User.findByPk(usuarioId);

      await Historico.create({
        solicitacao_id: id,
        usuario_responsavel_id: usuarioId,
        setor: solicitacao.area_responsavel,
        acao: 'RESPONSAVEL_ASSUMIU',
        metadata: JSON.stringify({
          ator_id: usuarioId,
          ator_nome: usuarioAcao ? usuarioAcao.nome : null
        })
      });

      await criarNotificacao({
        solicitacao_id: id,
        tipo: 'RESPONSAVEL_ASSUMIU',
        mensagem: `${usuarioAcao?.nome || 'Usuario'} assumiu a solicitacao ${solicitacao.codigo}`,
        created_by: usuarioId
      });

      await publishSolicitacaoRealtimeEvent({
        action: 'ASSUMED',
        solicitacao,
        actor: {
          id: usuarioId,
          nome: usuarioAcao ? usuarioAcao.nome : (req.user?.nome || null)
        }
      });

      return res.sendStatus(204);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao assumir solicitacao' });
    }
  }
};
