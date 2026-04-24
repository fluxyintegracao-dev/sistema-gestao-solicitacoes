const { Obra, ProvisaoFinanceiraSequencia } = require('../../models');

function normalizarCodigoObra(codigoObra) {
  return String(codigoObra || '').trim();
}

async function obterOuCriarSequenciaComLock({ obraId, transaction }) {
  let sequencia = await ProvisaoFinanceiraSequencia.findOne({
    where: { obra_id: obraId },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (sequencia) {
    return sequencia;
  }

  try {
    await ProvisaoFinanceiraSequencia.create({
      obra_id: obraId,
      ultimo_numero: 0
    }, { transaction });
  } catch (error) {
    // corrida de criacao; o select com lock abaixo resolve a consistencia
  }

  sequencia = await ProvisaoFinanceiraSequencia.findOne({
    where: { obra_id: obraId },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!sequencia) {
    throw new Error('Nao foi possivel inicializar a sequencia do provisionamento.');
  }

  return sequencia;
}

async function gerarCodigoProvisionamentoFinanceiro({ obraId, transaction }) {
  if (!transaction) {
    throw new Error('A geracao de codigo do provisionamento exige transaction ativa.');
  }

  const obra = await Obra.findByPk(obraId, {
    attributes: ['id', 'codigo'],
    transaction
  });

  if (!obra) {
    throw new Error('Obra nao encontrada para gerar o codigo da provisao.');
  }

  const codigoObra = normalizarCodigoObra(obra.codigo);
  if (!codigoObra) {
    throw new Error('A obra precisa ter codigo preenchido para gerar provisao.');
  }

  const sequencia = await obterOuCriarSequenciaComLock({
    obraId: obra.id,
    transaction
  });

  const proximoNumero = Number(sequencia.ultimo_numero || 0) + 1;
  await sequencia.update({ ultimo_numero: proximoNumero }, { transaction });

  return `PREV${codigoObra}-${proximoNumero}`;
}

module.exports = {
  gerarCodigoProvisionamentoFinanceiro
};
