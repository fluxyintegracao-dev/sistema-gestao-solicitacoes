const { Apropriacao, Obra, sequelize } = require('../src/models');

const OBRA_ID = 4;
const CODIGO_OBRA = '8';
const CORRECOES = [
  { id: 202, codigo: '00.005', anterior: 155.84, corrigido: 155838.32 },
  { id: 204, codigo: '00.007', anterior: 375.19, corrigido: 375193.00 },
  { id: 205, codigo: '00.008', anterior: 297.53, corrigido: 297543.83 },
  { id: 207, codigo: '00.010', anterior: 103.72, corrigido: 103718.49 },
  { id: 208, codigo: '00.011', anterior: 798.69, corrigido: 798688.00 },
  { id: 210, codigo: '00.013', anterior: 352.50, corrigido: 352502.00 },
  { id: 211, codigo: '00.014', anterior: 104.74, corrigido: 104739.18 },
  { id: 215, codigo: '00.018', anterior: 408.13, corrigido: 408125.93 },
  { id: 216, codigo: '00.019', anterior: 277.66, corrigido: 277657.23 },
  { id: 218, codigo: '00.021', anterior: 142.11, corrigido: 142112.11 },
  { id: 219, codigo: '00.022', anterior: 297.34, corrigido: 297336.00 },
  { id: 220, codigo: '00.023', anterior: 6.85, corrigido: 6847.42 },
  { id: 221, codigo: '00.024', anterior: 282.27, corrigido: 282268.48 },
  { id: 222, codigo: '00.025', anterior: 108.71, corrigido: 108711.57 }
];

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function total(items, field) {
  return roundMoney(items.reduce((sum, item) => sum + Number(item[field] || 0), 0));
}

async function carregarCorrecao(transaction) {
  const obra = await Obra.findByPk(OBRA_ID, { transaction, lock: transaction.LOCK.UPDATE });
  if (!obra || String(obra.codigo || '').trim() !== CODIGO_OBRA) {
    throw new Error(`A obra esperada (${OBRA_ID}, codigo ${CODIGO_OBRA}) nao foi encontrada.`);
  }

  const registros = await Apropriacao.findAll({
    where: { obra_id: OBRA_ID, id: CORRECOES.map((item) => item.id), ativo: true },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  if (registros.length !== CORRECOES.length) {
    throw new Error('A estrutura atual da obra diverge da auditoria; nenhuma alteracao foi aplicada.');
  }

  const porId = new Map(registros.map((item) => [Number(item.id), item]));
  return CORRECOES.map((correcao) => {
    const registro = porId.get(correcao.id);
    if (!registro
      || registro.codigo !== correcao.codigo
      || roundMoney(registro.valor_orcado) !== correcao.anterior) {
      throw new Error(`Apropriacao ${correcao.id}/${correcao.codigo} diverge do valor auditado; nenhuma alteracao foi aplicada.`);
    }
    return { ...correcao, descricao: registro.descricao, registro };
  });
}

async function executar() {
  const aplicar = process.argv.includes('--apply');
  await sequelize.authenticate();
  try {
    const resultado = await sequelize.transaction(async (transaction) => {
      const correcoes = await carregarCorrecao(transaction);
      const resumo = {
        obra_id: OBRA_ID,
        codigo_obra: CODIGO_OBRA,
        aplicado: aplicar,
        quantidade: correcoes.length,
        total_anterior: total(correcoes, 'anterior'),
        total_corrigido: total(correcoes, 'corrigido'),
        diferenca: roundMoney(total(correcoes, 'corrigido') - total(correcoes, 'anterior')),
        correcoes: correcoes.map(({ registro, ...item }) => item)
      };

      if (aplicar) {
        for (const item of correcoes) {
          await item.registro.update({ valor_orcado: item.corrigido }, { transaction });
        }
      }
      return resumo;
    });
    console.log(JSON.stringify(resultado, null, 2));
  } finally {
    await sequelize.close();
  }
}

executar().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
