'use strict';

const { SstGovernanceLog } = require('../../../models');

async function registrarGovernanceLogSst(payload = {}, usuario_id = null) {
  return SstGovernanceLog.create({
    acao: payload.acao,
    entidade: payload.entidade || null,
    entidade_id: payload.entidade_id || null,
    criticidade: payload.criticidade || 'BAIXA',
    empresa_id: payload.empresa_id || null,
    obra_id: payload.obra_id || null,
    usuario_id: payload.usuario_id || usuario_id || null,
    mensagem: payload.mensagem || null,
    payload_json: payload.payload_json ? JSON.stringify(payload.payload_json) : null,
    criado_por: usuario_id,
    atualizado_por: usuario_id
  });
}

async function gerarResumoGovernancaSst() {
  const [total, recentes, porAcao] = await Promise.all([
    SstGovernanceLog.count(),
    SstGovernanceLog.findAll({ order: [['createdAt', 'DESC']], limit: 30 }),
    SstGovernanceLog.findAll({
      attributes: [
        'acao',
        [SstGovernanceLog.sequelize.fn('COUNT', SstGovernanceLog.sequelize.col('acao')), 'total']
      ],
      group: ['acao'],
      raw: true
    })
  ]);

  return {
    total,
    por_acao: porAcao.reduce((acc, row) => {
      acc[row.acao || 'SEM_ACAO'] = Number(row.total || 0);
      return acc;
    }, {}),
    recentes
  };
}

module.exports = {
  gerarResumoGovernancaSst,
  registrarGovernanceLogSst
};
