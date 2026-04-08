const {
  sequelize,
  ProvisaoFinanceiraPermissao,
  ProvisaoFinanceiraPermissaoObra,
  Obra
} = require('../models');
const {
  ESCOPOS_VALIDOS,
  PERFIS_VALIDOS,
  normalizarEscopoTipo,
  normalizarPerfil,
  normalizarBoolean,
  normalizarIdInteiro
} = require('../services/provisaoFinanceira/permissoes');

function normalizarListaIds(lista) {
  if (!Array.isArray(lista)) return [];

  return [...new Set(
    lista
      .map((item) => normalizarIdInteiro(item))
      .filter(Boolean)
  )];
}

function serializarRegra(regra) {
  return {
    id: regra.id,
    escopo_tipo: regra.escopo_tipo,
    escopo_valor: regra.escopo_valor,
    pode_acessar: Boolean(regra.pode_acessar),
    pode_criar: Boolean(regra.pode_criar),
    pode_aprovar: Boolean(regra.pode_aprovar),
    pode_dashboard_global: Boolean(regra.pode_dashboard_global),
    ativo: regra.ativo !== false,
    obra_ids: Array.isArray(regra.obras)
      ? regra.obras
          .map((item) => Number(item?.obra_id))
          .filter((item) => Number.isInteger(item) && item > 0)
      : [],
    obras: Array.isArray(regra.obras)
      ? regra.obras
          .filter((item) => item?.obra)
          .map((item) => ({
            id: item.obra.id,
            codigo: item.obra.codigo,
            nome: item.obra.nome,
            ativo: item.obra.ativo !== false
          }))
      : []
  };
}

function validarEscopoValor(escopoTipo, escopoValor, indice) {
  if (escopoTipo === 'PERFIL') {
    const perfil = normalizarPerfil(escopoValor);
    if (!PERFIS_VALIDOS.has(perfil)) {
      throw new Error(`Regra ${indice}: perfil invalido para o modulo.`);
    }
    return perfil;
  }

  const id = normalizarIdInteiro(escopoValor);
  if (!id) {
    throw new Error(`Regra ${indice}: informe um identificador valido para o escopo selecionado.`);
  }

  return String(id);
}

function normalizarRegraEntrada(regra, indice) {
  const escopoTipo = normalizarEscopoTipo(regra?.escopo_tipo);
  if (!ESCOPOS_VALIDOS.has(escopoTipo)) {
    throw new Error(`Regra ${indice}: escopo_tipo invalido.`);
  }

  const escopoValor = validarEscopoValor(escopoTipo, regra?.escopo_valor, indice);
  const podeCriar = normalizarBoolean(regra?.pode_criar);
  const podeAprovar = normalizarBoolean(regra?.pode_aprovar);
  const podeDashboardGlobal = normalizarBoolean(regra?.pode_dashboard_global);
  const podeAcessar =
    normalizarBoolean(regra?.pode_acessar) ||
    podeCriar ||
    podeAprovar ||
    podeDashboardGlobal;

  if (!podeAcessar && !podeCriar && !podeAprovar && !podeDashboardGlobal) {
    throw new Error(`Regra ${indice}: selecione ao menos uma permissao.`);
  }

  return {
    escopo_tipo: escopoTipo,
    escopo_valor: escopoValor,
    pode_acessar: podeAcessar,
    pode_criar: podeCriar,
    pode_aprovar: podeAprovar,
    pode_dashboard_global: podeDashboardGlobal,
    ativo: regra?.ativo !== false,
    obra_ids: normalizarListaIds(regra?.obra_ids)
  };
}

module.exports = {
  async getPermissoes(req, res) {
    try {
      const regras = await ProvisaoFinanceiraPermissao.findAll({
        include: [
          {
            model: ProvisaoFinanceiraPermissaoObra,
            as: 'obras',
            attributes: ['id', 'obra_id'],
            include: [
              {
                model: Obra,
                as: 'obra',
                attributes: ['id', 'codigo', 'nome', 'ativo']
              }
            ]
          }
        ],
        order: [
          ['escopo_tipo', 'ASC'],
          ['escopo_valor', 'ASC'],
          [{ model: ProvisaoFinanceiraPermissaoObra, as: 'obras' }, 'obra_id', 'ASC']
        ]
      });

      return res.json({
        regras: regras.map(serializarRegra),
        escopos_validos: Array.from(ESCOPOS_VALIDOS),
        perfis_validos: Array.from(PERFIS_VALIDOS)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao buscar configuracao do modulo de provisionamento financeiro'
      });
    }
  },

  async updatePermissoes(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const regrasEntrada = Array.isArray(req.body?.regras) ? req.body.regras : [];
      const regrasNormalizadas = regrasEntrada.map((regra, indice) =>
        normalizarRegraEntrada(regra, indice + 1)
      );

      const obraIds = [...new Set(
        regrasNormalizadas.flatMap((regra) => regra.obra_ids)
      )];

      if (obraIds.length > 0) {
        const obrasValidas = await Obra.findAll({
          where: { id: obraIds },
          attributes: ['id'],
          transaction
        });

        const idsValidos = new Set(obrasValidas.map((obra) => Number(obra.id)));
        const idsInvalidos = obraIds.filter((obraId) => !idsValidos.has(obraId));

        if (idsInvalidos.length > 0) {
          throw new Error(`Obra(s) invalida(s) para o modulo: ${idsInvalidos.join(', ')}`);
        }
      }

      await ProvisaoFinanceiraPermissaoObra.destroy({
        where: {},
        transaction
      });

      await ProvisaoFinanceiraPermissao.destroy({
        where: {},
        transaction
      });

      for (const regra of regrasNormalizadas) {
        const permissao = await ProvisaoFinanceiraPermissao.create({
          escopo_tipo: regra.escopo_tipo,
          escopo_valor: regra.escopo_valor,
          pode_acessar: regra.pode_acessar,
          pode_criar: regra.pode_criar,
          pode_aprovar: regra.pode_aprovar,
          pode_dashboard_global: regra.pode_dashboard_global,
          ativo: regra.ativo
        }, { transaction });

        if (regra.obra_ids.length > 0) {
          await ProvisaoFinanceiraPermissaoObra.bulkCreate(
            regra.obra_ids.map((obraId) => ({
              permissao_id: permissao.id,
              obra_id: obraId
            })),
            { transaction }
          );
        }
      }

      await transaction.commit();
      return res.json({ ok: true });
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(400).json({
        error: error.message || 'Erro ao salvar configuracao do modulo de provisionamento financeiro'
      });
    }
  }
};
