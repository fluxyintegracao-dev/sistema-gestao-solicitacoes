const { ContaBancaria, EmpresaGrupo, MovimentoFinanceiro, sequelize, Sequelize } = require('../../../models');
const { toNumber } = require('../services/bankingUtils');

async function getBankAccountsSnapshot() {
  const accounts = await ContaBancaria.findAll({
    attributes: ['id', 'nome', 'empresa_id', 'tipo_operacional', 'banco', 'agencia', 'conta', 'tipo_conta', 'saldo_inicial', 'ativo', 'updatedAt'],
    include: EmpresaGrupo
      ? [{ model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'nome', 'razao_social', 'cnpj'], required: false }]
      : [],
    order: [['ativo', 'DESC'], ['nome', 'ASC']]
  });

  const movementRows = await MovimentoFinanceiro.findAll({
    attributes: [
      'conta_bancaria_id',
      [sequelize.fn('SUM', sequelize.col('valor_quitacao')), 'total']
    ],
    where: { status: 'ATIVO' },
    group: ['conta_bancaria_id'],
    raw: true
  });

  const totalsByAccount = new Map(
    movementRows.map((row) => [String(row.conta_bancaria_id || ''), toNumber(row.total)])
  );

  const items = accounts.map((account) => {
    const json = account.toJSON();
    const saldoInicial = toNumber(json.saldo_inicial);
    const movimentos = totalsByAccount.get(String(json.id)) || 0;
    return {
      id: json.id,
      nome: json.nome,
      banco: json.banco,
      agencia: json.agencia,
      conta: json.conta,
      tipo_conta: json.tipo_conta,
      tipo_operacional: json.tipo_operacional,
      ativo: Boolean(json.ativo),
      empresa: json.empresa ? {
        id: json.empresa.id,
        nome: json.empresa.nome,
        razao_social: json.empresa.razao_social,
        cnpj: json.empresa.cnpj
      } : null,
      saldo_inicial: saldoInicial,
      total_movimentos: movimentos,
      saldo_operacional_estimado: saldoInicial + movimentos,
      updatedAt: json.updatedAt
    };
  });

  return {
    source: 'BANK_ACCOUNTS',
    totals: {
      total: items.length,
      active: items.filter((item) => item.ativo).length,
      inactive: items.filter((item) => !item.ativo).length,
      without_company: items.filter((item) => !item.empresa).length
    },
    items
  };
}

module.exports = {
  getBankAccountsSnapshot
};
