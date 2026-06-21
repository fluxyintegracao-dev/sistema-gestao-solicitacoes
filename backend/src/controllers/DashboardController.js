const {
  ConciliacaoBancaria,
  ContaBancaria,
  MovimentoFinanceiro,
  Obra,
  Parceiro,
  Setor,
  Solicitacao,
  TituloFinanceiro,
  Sequelize
} = require('../models');
const {
  canAccessFinanceiro,
  getFinanceiroObraScopeIds,
  isAdministrador,
  userHasAreaPermission,
  userHasConfiguredAreaPermissions
} = require('../services/authorizationService');

const { Op } = Sequelize;

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    inicio: getLocalDateString(start),
    fim: getLocalDateString(end)
  };
}

function parseGroupedTotal(rows = [], key = 'tipo') {
  return rows.reduce((acc, item) => {
    const groupKey = String(item[key] || '').trim().toUpperCase();
    acc[groupKey] = {
      total: Number(item.get ? item.get('total') : item.total || 0),
      valor: Number(item.get ? item.get('valor_total') : item.valor_total || 0)
    };
    return acc;
  }, {});
}

async function resolveUserArea(req) {
  let areaUsuario = req.user?.area || null;
  let setorAtual = null;

  if (!areaUsuario && req.user?.setor_id) {
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
    areaUsuario = setorAtual?.codigo || setorAtual?.nome || null;
  } else if (!setorAtual && req.user?.setor_id) {
    setorAtual = await Setor.findByPk(req.user.setor_id, {
      attributes: ['id', 'codigo', 'nome']
    });
  }

  return {
    areaUsuario: areaUsuario ? String(areaUsuario).trim().toUpperCase() : null,
    setorAtual
  };
}

async function buildSolicitacoesResumo({ req, isAdmin, isSuperadmin, areaUsuario, setorAtual }) {
  if (!isSuperadmin && !isAdmin) {
    return {
      enabled: false,
      total: 0,
      porStatus: [],
      porArea: [],
      valoresPorStatus: []
    };
  }

  const tokensSetor = [
    areaUsuario,
    setorAtual?.codigo,
    setorAtual?.nome
  ]
    .filter(Boolean)
    .map((item) => String(item).trim().toUpperCase());

  const isSetorDiretoria = tokensSetor.includes('DIRETORIA');
  const whereBase = { cancelada: false };

  if (isAdmin && !isSetorDiretoria) {
    if (!areaUsuario) {
      return {
        enabled: false,
        total: 0,
        porStatus: [],
        porArea: [],
        valoresPorStatus: []
      };
    }

    const setoresPermitidos = [];
    if (areaUsuario) setoresPermitidos.push(areaUsuario);
    if (setorAtual?.codigo) setoresPermitidos.push(setorAtual.codigo);
    if (setorAtual?.nome) setoresPermitidos.push(setorAtual.nome);
    if (setorAtual?.id) setoresPermitidos.push(String(setorAtual.id));

    whereBase.area_responsavel = { [Op.in]: Array.from(new Set(setoresPermitidos.filter(Boolean))) };
  }

  const [total, porStatus, porAreaRaw, valoresPorStatus, setores] = await Promise.all([
    Solicitacao.count({ where: whereBase }),
    Solicitacao.findAll({
      attributes: [
        'status_global',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']
      ],
      where: whereBase,
      group: ['status_global']
    }),
    Solicitacao.findAll({
      attributes: [
        'area_responsavel',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']
      ],
      where: whereBase,
      group: ['area_responsavel']
    }),
    Solicitacao.findAll({
      attributes: [
        'status_global',
        [Sequelize.fn('SUM', Sequelize.col('valor')), 'valor_total']
      ],
      where: {
        ...whereBase,
        valor: { [Op.not]: null }
      },
      group: ['status_global']
    }),
    Setor.findAll({
      attributes: ['codigo', 'nome']
    })
  ]);

  const mapaSetores = new Map();
  setores.forEach((item) => {
    if (item.codigo) mapaSetores.set(String(item.codigo).toUpperCase(), item.nome);
    if (item.nome) mapaSetores.set(String(item.nome).toUpperCase(), item.nome);
  });

  const porArea = porAreaRaw.map((item) => {
    const area = String(item.area_responsavel || '').toUpperCase();
    return {
      area_responsavel: mapaSetores.get(area) || item.area_responsavel,
      total: item.get('total')
    };
  });

  return {
    enabled: true,
    total,
    porStatus,
    porArea,
    valoresPorStatus
  };
}

async function buildFinanceiroResumo({ req, isSuperadmin, hasFinanceAccess }) {
  if (!isSuperadmin && !hasFinanceAccess) {
    return {
      enabled: false,
      total_pagar_aberto: 0,
      total_receber_aberto: 0,
      quantidade_pagar_aberto: 0,
      quantidade_receber_aberto: 0,
      pagar_vencido: 0,
      receber_vencido: 0,
      quantidade_pagar_vencido: 0,
      quantidade_receber_vencido: 0,
      movimentado_mes_pagar: 0,
      movimentado_mes_receber: 0,
      conciliacao_pendente_quantidade: 0,
      conciliacao_pendente_valor: 0,
      conciliacaoPorConta: [],
      conciliacaoPendenciasRecentes: [],
      porObra: [],
      porParceiro: [],
      proximosVencimentos: []
    };
  }

  const obraIds = isSuperadmin ? null : await getFinanceiroObraScopeIds(req.user);
  if (obraIds && obraIds.length === 0) {
    return {
      enabled: true,
      total_pagar_aberto: 0,
      total_receber_aberto: 0,
      quantidade_pagar_aberto: 0,
      quantidade_receber_aberto: 0,
      pagar_vencido: 0,
      receber_vencido: 0,
      quantidade_pagar_vencido: 0,
      quantidade_receber_vencido: 0,
      movimentado_mes_pagar: 0,
      movimentado_mes_receber: 0,
      conciliacao_pendente_quantidade: 0,
      conciliacao_pendente_valor: 0,
      conciliacaoPorConta: [],
      conciliacaoPendenciasRecentes: [],
      porObra: [],
      porParceiro: [],
      proximosVencimentos: []
    };
  }

  const hoje = getLocalDateString();
  const { inicio, fim } = getCurrentMonthRange();

  const whereAbertos = {
    status: { [Op.in]: ['ABERTO', 'PARCIAL'] }
  };

  if (obraIds) {
    whereAbertos.obra_id = { [Op.in]: obraIds };
  }

  const whereVencidos = {
    ...whereAbertos,
    data_vencimento: { [Op.lt]: hoje }
  };

  const whereMovimentosMes = {
    status: 'ATIVO',
    data_movimento: {
      [Op.between]: [inicio, fim]
    }
  };

  const tituloIncludeWhere = obraIds ? { obra_id: { [Op.in]: obraIds } } : undefined;

  const [
    agrupadosAbertos,
    agrupadosVencidos,
    agrupadosMovimentadosMes,
    agrupadosPorObra,
    agrupadosPorParceiro,
    proximosVencimentos,
    pendenciasConciliacaoResumo,
    pendenciasConciliacaoPorConta,
    pendenciasConciliacaoRecentes
  ] = await Promise.all([
    TituloFinanceiro.findAll({
      attributes: [
        'tipo',
        [Sequelize.fn('COUNT', Sequelize.col('TituloFinanceiro.id')), 'total'],
        [Sequelize.fn('SUM', Sequelize.col('valor_saldo')), 'valor_total']
      ],
      where: whereAbertos,
      group: ['tipo']
    }),
    TituloFinanceiro.findAll({
      attributes: [
        'tipo',
        [Sequelize.fn('COUNT', Sequelize.col('TituloFinanceiro.id')), 'total'],
        [Sequelize.fn('SUM', Sequelize.col('valor_saldo')), 'valor_total']
      ],
      where: whereVencidos,
      group: ['tipo']
    }),
    MovimentoFinanceiro.findAll({
      attributes: [
        [Sequelize.col('titulo.tipo'), 'tipo'],
        [Sequelize.fn('COUNT', Sequelize.col('MovimentoFinanceiro.id')), 'total'],
        [Sequelize.fn('SUM', Sequelize.col('valor_quitacao')), 'valor_total']
      ],
      include: [
        {
          model: TituloFinanceiro,
          as: 'titulo',
          attributes: [],
          required: true,
          where: tituloIncludeWhere
        }
      ],
      where: whereMovimentosMes,
      group: [Sequelize.col('titulo.tipo')]
    }),
    TituloFinanceiro.findAll({
      attributes: [
        'obra_id',
        'tipo',
        [Sequelize.fn('SUM', Sequelize.col('valor_saldo')), 'valor_total']
      ],
      include: [
        {
          model: Obra,
          as: 'obra',
          attributes: ['id', 'nome'],
          required: true
        }
      ],
      where: whereAbertos,
      group: ['obra_id', 'tipo', 'obra.id', 'obra.nome']
    }),
    TituloFinanceiro.findAll({
      attributes: [
        'parceiro_id',
        'tipo',
        [Sequelize.fn('SUM', Sequelize.col('valor_saldo')), 'valor_total']
      ],
      include: [
        {
          model: Parceiro,
          as: 'parceiro',
          attributes: ['id', 'nome'],
          required: true
        }
      ],
      where: whereAbertos,
      group: ['parceiro_id', 'tipo', 'parceiro.id', 'parceiro.nome']
    }),
    TituloFinanceiro.findAll({
      include: [
        {
          model: Obra,
          as: 'obra',
          attributes: ['id', 'nome']
        },
        {
          model: Parceiro,
          as: 'parceiro',
          attributes: ['id', 'nome']
        }
      ],
      where: whereAbertos,
      order: [['data_vencimento', 'ASC'], ['createdAt', 'ASC']],
      limit: 8
    }),
    ConciliacaoBancaria.findOne({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('ConciliacaoBancaria.id')), 'total'],
        [Sequelize.fn('SUM', Sequelize.fn('ABS', Sequelize.col('valor'))), 'valor_total']
      ],
      where: {
        status: 'PENDENTE'
      },
      raw: true
    }),
    ConciliacaoBancaria.findAll({
      attributes: [
        'conta_bancaria_id',
        [Sequelize.fn('COUNT', Sequelize.col('ConciliacaoBancaria.id')), 'total'],
        [Sequelize.fn('SUM', Sequelize.fn('ABS', Sequelize.col('valor'))), 'valor_total']
      ],
      include: [
        {
          model: ContaBancaria,
          as: 'contaBancaria',
          attributes: ['id', 'nome'],
          required: false
        }
      ],
      where: {
        status: 'PENDENTE'
      },
      group: ['conta_bancaria_id', 'contaBancaria.id', 'contaBancaria.nome']
    }),
    ConciliacaoBancaria.findAll({
      include: [
        {
          model: ContaBancaria,
          as: 'contaBancaria',
          attributes: ['id', 'nome']
        }
      ],
      where: {
        status: 'PENDENTE'
      },
      order: [['data_movimento', 'DESC'], ['createdAt', 'DESC']],
      limit: 6
    })
  ]);

  const abertos = parseGroupedTotal(agrupadosAbertos);
  const vencidos = parseGroupedTotal(agrupadosVencidos);
  const movimentadosMes = parseGroupedTotal(agrupadosMovimentadosMes);

  const porObraMap = new Map();
  agrupadosPorObra.forEach((item) => {
    const obraId = Number(item.obra_id);
    const current = porObraMap.get(obraId) || {
      obra_id: obraId,
      obra_nome: item.obra?.nome || `Obra ${obraId}`,
      pagar_aberto: 0,
      receber_aberto: 0
    };

    if (String(item.tipo || '').toUpperCase() === 'PAGAR') {
      current.pagar_aberto += Number(item.get('valor_total') || 0);
    } else {
      current.receber_aberto += Number(item.get('valor_total') || 0);
    }

    porObraMap.set(obraId, current);
  });

  const porParceiroMap = new Map();
  agrupadosPorParceiro.forEach((item) => {
    const parceiroId = Number(item.parceiro_id);
    const current = porParceiroMap.get(parceiroId) || {
      parceiro_id: parceiroId,
      parceiro_nome: item.parceiro?.nome || `Parceiro ${parceiroId}`,
      pagar_aberto: 0,
      receber_aberto: 0
    };

    if (String(item.tipo || '').toUpperCase() === 'PAGAR') {
      current.pagar_aberto += Number(item.get('valor_total') || 0);
    } else {
      current.receber_aberto += Number(item.get('valor_total') || 0);
    }

    porParceiroMap.set(parceiroId, current);
  });

  const porObra = Array.from(porObraMap.values())
    .map((item) => ({
      ...item,
      saldo_projetado: item.receber_aberto - item.pagar_aberto
    }))
    .sort((a, b) => (Math.abs(b.saldo_projetado) - Math.abs(a.saldo_projetado)))
    .slice(0, 6);

  const porParceiro = Array.from(porParceiroMap.values())
    .map((item) => ({
      ...item,
      exposicao_total: item.pagar_aberto + item.receber_aberto
    }))
    .sort((a, b) => (b.exposicao_total - a.exposicao_total))
    .slice(0, 6);

  const conciliacaoPorConta = pendenciasConciliacaoPorConta
    .map((item) => ({
      conta_bancaria_id: Number(item.conta_bancaria_id || 0),
      conta_bancaria_nome: item.contaBancaria?.nome || 'Conta nao identificada',
      pendentes: Number(item.get('total') || 0),
      valor_total: Number(item.get('valor_total') || 0)
    }))
    .sort((a, b) => b.pendentes - a.pendentes)
    .slice(0, 6);

  return {
    enabled: true,
    total_pagar_aberto: abertos.PAGAR?.valor || 0,
    total_receber_aberto: abertos.RECEBER?.valor || 0,
    quantidade_pagar_aberto: abertos.PAGAR?.total || 0,
    quantidade_receber_aberto: abertos.RECEBER?.total || 0,
    pagar_vencido: vencidos.PAGAR?.valor || 0,
    receber_vencido: vencidos.RECEBER?.valor || 0,
    quantidade_pagar_vencido: vencidos.PAGAR?.total || 0,
    quantidade_receber_vencido: vencidos.RECEBER?.total || 0,
    movimentado_mes_pagar: movimentadosMes.PAGAR?.valor || 0,
    movimentado_mes_receber: movimentadosMes.RECEBER?.valor || 0,
    conciliacao_pendente_quantidade: Number(pendenciasConciliacaoResumo?.total || 0),
    conciliacao_pendente_valor: Number(pendenciasConciliacaoResumo?.valor_total || 0),
    conciliacaoPorConta,
    conciliacaoPendenciasRecentes: pendenciasConciliacaoRecentes.map((item) => ({
      id: item.id,
      conta_bancaria_nome: item.contaBancaria?.nome || '-',
      descricao_banco: item.descricao_banco,
      documento: item.documento,
      data_movimento: item.data_movimento,
      valor: Number(item.valor || 0)
    })),
    porObra,
    porParceiro,
    proximosVencimentos: proximosVencimentos.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      status: item.status,
      descricao: item.descricao,
      data_vencimento: item.data_vencimento,
      valor_saldo: Number(item.valor_saldo || 0),
      obra_nome: item.obra?.nome || '-',
      parceiro_nome: item.parceiro?.nome || '-'
    }))
  };
}

module.exports = {
  async executivo(req, res) {
    try {
      const perfil = String(req.user?.perfil || '').trim().toUpperCase();
      const isAdmin = perfil === 'ADMIN';
      const isAdministradorPerfil = isAdministrador(req.user);
      const isSuperadmin = perfil === 'SUPERADMIN';
      const hasFinanceAccess = await canAccessFinanceiro(req.user);
      const hasDashboardPermission = await userHasAreaPermission(req.user, ['painel.dashboard.visualizar']);
      const hasConfiguredDashboardPermission = await userHasConfiguredAreaPermissions(req.user);

      if (hasConfiguredDashboardPermission && !hasDashboardPermission) {
        return res.status(403).json({ error: 'Acesso negado para o dashboard do painel' });
      }

      if (!hasConfiguredDashboardPermission && !isSuperadmin && !isAdmin && !isAdministradorPerfil && !hasFinanceAccess) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { areaUsuario, setorAtual } = await resolveUserArea(req);
      const [solicitacoesResumo, financeiroResumo] = await Promise.all([
        buildSolicitacoesResumo({
          req,
          isAdmin: isAdmin || isAdministradorPerfil,
          isSuperadmin,
          areaUsuario,
          setorAtual
        }),
        buildFinanceiroResumo({
          req,
          isSuperadmin,
          hasFinanceAccess
        })
      ]);

      return res.json({
        total: solicitacoesResumo.total,
        porStatus: solicitacoesResumo.porStatus,
        porArea: solicitacoesResumo.porArea,
        valoresPorStatus: solicitacoesResumo.valoresPorStatus,
        financeiro: financeiroResumo,
        visao: {
          solicitacoes: solicitacoesResumo.enabled,
          financeiro: financeiroResumo.enabled
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao carregar dashboard'
      });
    }
  }
};
