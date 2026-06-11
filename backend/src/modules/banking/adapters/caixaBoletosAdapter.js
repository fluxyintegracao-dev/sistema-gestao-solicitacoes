const {
  BoletoCaixaConvenio,
  BoletoCaixaOcorrencia,
  BoletoCaixaRemessa,
  BoletoCaixaRetorno,
  sequelize
} = require('../../../models');
const { buildStatusCounters, sumCounters, toNumber } = require('../services/bankingUtils');

async function countByStatus(model) {
  const rows = await model.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true
  });
  return buildStatusCounters(rows);
}

async function getCaixaBoletosSnapshot() {
  const [convenios, remessaStatus, retornoStatus, ocorrenciaRows, recentRemessas, recentRetornos, recentOcorrencias] = await Promise.all([
    BoletoCaixaConvenio.findAll({
      attributes: ['id', 'empresa_id', 'conta_bancaria_id', 'banco_nome', 'agencia', 'conta', 'codigo_beneficiario', 'ambiente', 'homologado', 'ativo', 'updatedAt'],
      order: [['ativo', 'DESC'], ['id', 'DESC']]
    }),
    countByStatus(BoletoCaixaRemessa),
    countByStatus(BoletoCaixaRetorno),
    BoletoCaixaOcorrencia.findAll({
      attributes: ['status_aplicacao', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status_aplicacao'],
      raw: true
    }),
    BoletoCaixaRemessa.findAll({
      attributes: ['id', 'empresa_id', 'convenio_id', 'numero_remessa', 'nome_arquivo', 'status', 'quantidade_boletos', 'valor_total', 'homologacao', 'gerado_em', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 8
    }),
    BoletoCaixaRetorno.findAll({
      attributes: ['id', 'empresa_id', 'convenio_id', 'remessa_id', 'nome_arquivo', 'status', 'quantidade_ocorrencias', 'valor_liquidado', 'processado_em', 'erro_mensagem', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 8
    }),
    BoletoCaixaOcorrencia.findAll({
      attributes: ['id', 'retorno_id', 'boleto_id', 'titulo_financeiro_id', 'movimento_financeiro_id', 'codigo_movimento', 'descricao_movimento', 'valor_pago', 'valor_tarifa', 'status_aplicacao', 'erro_mensagem', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 8
    })
  ]);

  const ocorrenciaStatus = buildStatusCounters(ocorrenciaRows, 'status_aplicacao');

  return {
    source: 'CAIXA_BOLETOS_CNAB240',
    contracts: {
      service: 'COBRANCA',
      cnab: '240',
      segments: ['P', 'Q', 'T', 'U'],
      protected_from_payment_cnab: true
    },
    totals: {
      convenios: convenios.length,
      convenios_ativos: convenios.filter((item) => item.ativo).length,
      convenios_homologados: convenios.filter((item) => item.homologado).length,
      remessas: Object.values(remessaStatus).reduce((sum, value) => sum + toNumber(value), 0),
      retornos: Object.values(retornoStatus).reduce((sum, value) => sum + toNumber(value), 0),
      ocorrencias_pendentes: sumCounters(ocorrenciaStatus, ['PENDENTE']),
      ocorrencias_erro: sumCounters(ocorrenciaStatus, ['ERRO'])
    },
    remessas: {
      status: remessaStatus,
      recent: recentRemessas.map((item) => item.toJSON())
    },
    retornos: {
      status: retornoStatus,
      recent: recentRetornos.map((item) => item.toJSON())
    },
    ocorrencias: {
      status: ocorrenciaStatus,
      recent: recentOcorrencias.map((item) => item.toJSON())
    },
    convenios: convenios.map((item) => item.toJSON())
  };
}

module.exports = {
  getCaixaBoletosSnapshot
};
