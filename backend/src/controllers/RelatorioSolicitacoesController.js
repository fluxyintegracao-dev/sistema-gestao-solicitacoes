const { relatorioSolicitacoesOperacional } = require('../services/relatorioSolicitacoesService');

module.exports = {
  async operacional(req, res) {
    try {
      const relatorio = await relatorioSolicitacoesOperacional({
        user: req.user,
        periodo: req.query?.periodo,
        dataInicio: req.query?.data_inicio,
        dataFim: req.query?.data_fim,
        obraId: req.query?.obra_id,
        status: req.query?.status,
        area: req.query?.area
      });

      return res.json(relatorio);
    } catch (error) {
      console.error('Erro ao gerar relatorio operacional de solicitacoes:', error);
      return res.status(500).json({ error: 'Erro ao gerar relatorio operacional de solicitacoes' });
    }
  }
};
