const { Obra, TituloFinanceiro, Solicitacao } = require('../models');
const { Op, fn, col } = require('sequelize');
const { TIPO_CENTRO_CUSTO_OBRA } = require('../constants/centroCusto');

function emptyFinanceiro() {
  return {
    total_valor_original: 0,
    total_valor_baixado: 0,
    total_valor_saldo: 0,
    quantidade: 0
  };
}

module.exports = {
  async index(req, res) {
    try {
      const centros = await Obra.findAll({
        where: {
          ativo: true,
          tipo_centro_custo: { [Op.ne]: TIPO_CENTRO_CUSTO_OBRA }
        },
        order: [['nome', 'ASC']]
      });

      const centroIds = centros.map((centro) => centro.id);
      if (centroIds.length === 0) {
        return res.json([]);
      }

      const [agregadosFinanceiros, agregadosSolicitacoes] = await Promise.all([
        TituloFinanceiro.findAll({
          attributes: [
            'obra_id',
            'tipo',
            [fn('SUM', col('valor_original')), 'total_valor_original'],
            [fn('SUM', col('valor_baixado')), 'total_valor_baixado'],
            [fn('SUM', col('valor_saldo')), 'total_valor_saldo'],
            [fn('COUNT', col('id')), 'quantidade']
          ],
          where: {
            obra_id: { [Op.in]: centroIds },
            status: { [Op.notIn]: ['CANCELADO', 'ESTORNADO'] }
          },
          group: ['obra_id', 'tipo'],
          raw: true
        }),
        Solicitacao.findAll({
          attributes: [
            'obra_id',
            [fn('COUNT', col('id')), 'quantidade'],
            [fn('SUM', col('valor')), 'total_valor']
          ],
          where: {
            obra_id: { [Op.in]: centroIds }
          },
          group: ['obra_id'],
          raw: true
        })
      ]);

      const financeiroPorCentro = {};
      for (const row of agregadosFinanceiros) {
        const centroId = row.obra_id;
        if (!financeiroPorCentro[centroId]) financeiroPorCentro[centroId] = {};
        financeiroPorCentro[centroId][row.tipo] = {
          total_valor_original: Number(row.total_valor_original || 0),
          total_valor_baixado: Number(row.total_valor_baixado || 0),
          total_valor_saldo: Number(row.total_valor_saldo || 0),
          quantidade: Number(row.quantidade || 0)
        };
      }

      const solicitacoesPorCentro = {};
      for (const row of agregadosSolicitacoes) {
        solicitacoesPorCentro[row.obra_id] = {
          quantidade: Number(row.quantidade || 0),
          total_valor: Number(row.total_valor || 0)
        };
      }

      return res.json(centros.map((centro) => {
        const pagar = financeiroPorCentro[centro.id]?.PAGAR || emptyFinanceiro();
        const receber = financeiroPorCentro[centro.id]?.RECEBER || emptyFinanceiro();
        const solicitacoes = solicitacoesPorCentro[centro.id] || { quantidade: 0, total_valor: 0 };

        return {
          id: centro.id,
          codigo: centro.codigo,
          nome: centro.nome,
          cidade: centro.cidade,
          solicitacoes,
          pagar: {
            total: pagar.total_valor_original,
            pago: pagar.total_valor_baixado,
            saldo: pagar.total_valor_saldo,
            quantidade: pagar.quantidade
          },
          receber: {
            total: receber.total_valor_original,
            recebido: receber.total_valor_baixado,
            saldo: receber.total_valor_saldo,
            quantidade: receber.quantidade
          }
        };
      }));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar resultado por centro de custo' });
    }
  }
};
