const { ProvisaoFinanceiraHistorico } = require('../../models');

async function registrarHistoricoProvisionamento({
  provisao_financeira_id,
  usuario_id = null,
  acao,
  status_anterior = null,
  status_novo = null,
  descricao = null,
  comentario = null,
  dados_antes = null,
  dados_depois = null,
  metadata = null,
  transaction = undefined
}) {
  return ProvisaoFinanceiraHistorico.create({
    provisao_financeira_id,
    usuario_id,
    acao,
    status_anterior,
    status_novo,
    descricao,
    comentario,
    dados_antes_json: dados_antes,
    dados_depois_json: dados_depois,
    metadata_json: metadata
  }, { transaction });
}

module.exports = {
  registrarHistoricoProvisionamento
};
