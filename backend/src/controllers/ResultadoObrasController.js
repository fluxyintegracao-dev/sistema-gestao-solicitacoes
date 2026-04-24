const { Obra, TituloFinanceiro } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

module.exports = {
  async index(req, res) {
    try {
      const obras = await Obra.findAll({
        where: { ativo: true },
        order: [['nome', 'ASC']]
      });

      const obraIds = obras.map(o => o.id);

      if (obraIds.length === 0) {
        return res.json([]);
      }

      // Aggregate titulos por obra_id e tipo
      const agregados = await TituloFinanceiro.findAll({
        attributes: [
          'obra_id',
          'tipo',
          [fn('SUM', col('valor_original')), 'total_valor_original'],
          [fn('SUM', col('valor_baixado')), 'total_valor_baixado'],
          [fn('SUM', col('valor_saldo')), 'total_valor_saldo'],
          [fn('COUNT', col('id')), 'quantidade']
        ],
        where: {
          obra_id: { [Op.in]: obraIds },
          status: { [Op.notIn]: ['CANCELADO', 'ESTORNADO'] }
        },
        group: ['obra_id', 'tipo'],
        raw: true
      });

      // Map agregados por obra_id
      const mapAgregados = {};
      for (const row of agregados) {
        const oId = row.obra_id;
        if (!mapAgregados[oId]) mapAgregados[oId] = {};
        mapAgregados[oId][row.tipo] = {
          total_valor_original: Number(row.total_valor_original || 0),
          total_valor_baixado: Number(row.total_valor_baixado || 0),
          total_valor_saldo: Number(row.total_valor_saldo || 0),
          quantidade: Number(row.quantidade || 0)
        };
      }

      const resultado = obras.map(obra => {
        const pagar = mapAgregados[obra.id]?.PAGAR || { total_valor_original: 0, total_valor_baixado: 0, total_valor_saldo: 0, quantidade: 0 };
        const receber = mapAgregados[obra.id]?.RECEBER || { total_valor_original: 0, total_valor_baixado: 0, total_valor_saldo: 0, quantidade: 0 };

        const classificacao = String(obra.classificacao || '').trim().toUpperCase();
        const margem = Number(obra.margem_custo_esperada || 0);

        let valorReferencia = 0;
        if (classificacao === 'PRIVADA') {
          valorReferencia = Number(obra.vgv || 0);
        } else if (classificacao === 'PUBLICA') {
          valorReferencia = Number(obra.planilha_geral || 0);
        }

        // Orçamento = valorReferencia - custo esperado = valorReferencia * (1 - margem/100)
        const orcamento = (valorReferencia > 0 && margem > 0) ? valorReferencia * (1 - margem / 100) : null;

        return {
          id: obra.id,
          codigo: obra.codigo,
          nome: obra.nome,
          cidade: obra.cidade,
          classificacao: obra.classificacao,
          vgv: obra.vgv != null ? Number(obra.vgv) : null,
          planilha_geral: obra.planilha_geral != null ? Number(obra.planilha_geral) : null,
          margem_custo_esperada: obra.margem_custo_esperada != null ? Number(obra.margem_custo_esperada) : null,
          orcamento,
          pagar: {
            total: pagar.total_valor_original,
            executado: pagar.total_valor_baixado,
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
      });

      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar resultado de obras' });
    }
  }
};
