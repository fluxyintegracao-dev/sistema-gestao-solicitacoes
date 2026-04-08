const { Op } = require('sequelize');
const {
  ProvisaoFinanceiraPermissao,
  ProvisaoFinanceiraPermissaoObra
} = require('../../models');

const PERFIS_VALIDOS = new Set(['SUPERADMIN', 'ADMIN', 'USUARIO']);
const ESCOPOS_VALIDOS = new Set(['USUARIO', 'SETOR', 'PERFIL']);

function normalizarEscopoTipo(valor) {
  return String(valor || '').trim().toUpperCase();
}

function normalizarPerfil(valor) {
  return String(valor || '').trim().toUpperCase();
}

function normalizarBoolean(valor) {
  return Boolean(valor);
}

function normalizarIdInteiro(valor) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) return null;
  return numero;
}

function obterChavesEscopoUsuario(user) {
  const perfil = normalizarPerfil(user?.perfil);
  const usuarioId = normalizarIdInteiro(user?.id);
  const setorId = normalizarIdInteiro(user?.setor_id);

  return {
    perfil,
    usuarioId: usuarioId ? String(usuarioId) : null,
    setorId: setorId ? String(setorId) : null
  };
}

function agruparObrasPorAcao(regras, campoAcao) {
  const regrasAtivas = Array.isArray(regras)
    ? regras.filter(regra => normalizarBoolean(regra?.[campoAcao]))
    : [];

  if (regrasAtivas.length === 0) {
    return {
      habilitado: false,
      obras: []
    };
  }

  const possuiRegraGlobal = regrasAtivas.some(regra => !Array.isArray(regra?.obras) || regra.obras.length === 0);
  if (possuiRegraGlobal) {
    return {
      habilitado: true,
      obras: null
    };
  }

  const obraIds = new Set();
  regrasAtivas.forEach((regra) => {
    (Array.isArray(regra.obras) ? regra.obras : []).forEach((item) => {
      const obraId = normalizarIdInteiro(item?.obra_id || item?.obra?.id || item?.obra_id);
      if (obraId) {
        obraIds.add(obraId);
      }
    });
  });

  return {
    habilitado: obraIds.size > 0,
    obras: Array.from(obraIds)
  };
}

async function resolverPermissoesProvisionamentoFinanceiro(user) {
  const perfil = normalizarPerfil(user?.perfil);
  if (perfil === 'SUPERADMIN') {
    return {
      superadmin: true,
      pode_acessar: true,
      pode_criar: true,
      pode_aprovar: true,
      pode_dashboard_global: true,
      obras_acesso: null,
      obras_criacao: null,
      obras_aprovacao: null
    };
  }

  const chavesEscopo = obterChavesEscopoUsuario(user);
  const condicoes = [];

  if (chavesEscopo.usuarioId) {
    condicoes.push({
      escopo_tipo: 'USUARIO',
      escopo_valor: chavesEscopo.usuarioId
    });
  }

  if (chavesEscopo.setorId) {
    condicoes.push({
      escopo_tipo: 'SETOR',
      escopo_valor: chavesEscopo.setorId
    });
  }

  if (chavesEscopo.perfil) {
    condicoes.push({
      escopo_tipo: 'PERFIL',
      escopo_valor: chavesEscopo.perfil
    });
  }

  if (condicoes.length === 0) {
    return {
      superadmin: false,
      pode_acessar: false,
      pode_criar: false,
      pode_aprovar: false,
      pode_dashboard_global: false,
      obras_acesso: [],
      obras_criacao: [],
      obras_aprovacao: []
    };
  }

  const regras = await ProvisaoFinanceiraPermissao.findAll({
    where: {
      ativo: true,
      [Op.or]: condicoes
    },
    include: [
      {
        model: ProvisaoFinanceiraPermissaoObra,
        as: 'obras',
        attributes: ['id', 'obra_id']
      }
    ],
    order: [['id', 'ASC']]
  });

  const acesso = agruparObrasPorAcao(regras, 'pode_acessar');
  const criacao = agruparObrasPorAcao(regras, 'pode_criar');
  const aprovacao = agruparObrasPorAcao(regras, 'pode_aprovar');
  const podeDashboardGlobal = regras.some(regra => normalizarBoolean(regra?.pode_dashboard_global));

  return {
    superadmin: false,
    pode_acessar: acesso.habilitado,
    pode_criar: criacao.habilitado,
    pode_aprovar: aprovacao.habilitado,
    pode_dashboard_global: podeDashboardGlobal,
    obras_acesso: acesso.obras,
    obras_criacao: criacao.obras,
    obras_aprovacao: aprovacao.obras
  };
}

function usuarioPodeAtuarNaObra({ permissoes, obraId, acao }) {
  const obraIdNormalizado = normalizarIdInteiro(obraId);
  if (!obraIdNormalizado) return false;

  const campoHabilitado = {
    acessar: 'pode_acessar',
    criar: 'pode_criar',
    aprovar: 'pode_aprovar'
  }[acao];

  const campoObras = {
    acessar: 'obras_acesso',
    criar: 'obras_criacao',
    aprovar: 'obras_aprovacao'
  }[acao];

  if (!campoHabilitado || !campoObras) return false;
  if (!permissoes?.[campoHabilitado]) return false;

  const obrasPermitidas = permissoes[campoObras];
  if (obrasPermitidas === null) return true;
  return Array.isArray(obrasPermitidas) && obrasPermitidas.includes(obraIdNormalizado);
}

module.exports = {
  ESCOPOS_VALIDOS,
  PERFIS_VALIDOS,
  normalizarEscopoTipo,
  normalizarPerfil,
  normalizarBoolean,
  normalizarIdInteiro,
  resolverPermissoesProvisionamentoFinanceiro,
  usuarioPodeAtuarNaObra
};
