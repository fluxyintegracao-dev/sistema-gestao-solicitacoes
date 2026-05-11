const { columnExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (await tableExists(sequelize, tableName) && !(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function removeColumnIfExists(queryInterface, sequelize, tableName, columnName) {
  if (await tableExists(sequelize, tableName) && await columnExists(sequelize, tableName, columnName)) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const Sequelize = DataTypes;

    if (!(await tableExists(sequelize, 'financeiro_formas_pagamento'))) {
      await queryInterface.createTable('financeiro_formas_pagamento', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        nome: { type: Sequelize.STRING(120), allowNull: false },
        codigo: { type: Sequelize.STRING(60), allowNull: false, unique: true },
        tipo: { type: Sequelize.STRING(40), allowNull: false },
        permite_parcelamento: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        gera_fatura: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        gera_boleto: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        exige_cartao: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        exige_cheque: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        ordem: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        criado_por: { type: Sequelize.INTEGER, allowNull: true },
        atualizado_por: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      });
    }

    if (!(await tableExists(sequelize, 'financeiro_cartoes'))) {
      await queryInterface.createTable('financeiro_cartoes', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        nome: { type: Sequelize.STRING(120), allowNull: false },
        titular: { type: Sequelize.STRING(160), allowNull: false },
        bandeira: { type: Sequelize.STRING(60), allowNull: true },
        ultimos_digitos: { type: Sequelize.STRING(4), allowNull: false },
        conta_bancaria_id: { type: Sequelize.INTEGER, allowNull: true },
        dia_fechamento: { type: Sequelize.INTEGER, allowNull: false },
        dia_vencimento: { type: Sequelize.INTEGER, allowNull: false },
        ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        observacoes: { type: Sequelize.TEXT, allowNull: true },
        criado_por: { type: Sequelize.INTEGER, allowNull: true },
        atualizado_por: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      });
    }

    if (!(await tableExists(sequelize, 'financeiro_faturas_cartao'))) {
      await queryInterface.createTable('financeiro_faturas_cartao', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        cartao_id: { type: Sequelize.INTEGER, allowNull: false },
        competencia: { type: Sequelize.STRING(7), allowNull: false },
        data_inicio: { type: Sequelize.DATEONLY, allowNull: true },
        data_fechamento: { type: Sequelize.DATEONLY, allowNull: false },
        data_vencimento: { type: Sequelize.DATEONLY, allowNull: false },
        valor_total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ABERTA' },
        conta_bancaria_id: { type: Sequelize.INTEGER, allowNull: true },
        data_pagamento: { type: Sequelize.DATEONLY, allowNull: true },
        conciliacao_bancaria_id: { type: Sequelize.INTEGER, allowNull: true },
        observacoes: { type: Sequelize.TEXT, allowNull: true },
        pago_por: { type: Sequelize.INTEGER, allowNull: true },
        criado_por: { type: Sequelize.INTEGER, allowNull: true },
        atualizado_por: { type: Sequelize.INTEGER, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('financeiro_faturas_cartao', ['cartao_id', 'competencia'], {
        unique: true,
        name: 'financeiro_faturas_cartao_cartao_competencia_uidx'
      });
    }

    if (!(await tableExists(sequelize, 'financeiro_fatura_titulos'))) {
      await queryInterface.createTable('financeiro_fatura_titulos', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        fatura_cartao_id: { type: Sequelize.INTEGER, allowNull: false },
        titulo_financeiro_id: { type: Sequelize.INTEGER, allowNull: false, unique: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      });
    }

    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'forma_pagamento_id', { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'cartao_id', { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'fatura_cartao_id', { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'grupo_parcelamento_id', { type: Sequelize.STRING(80), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'numero_parcela', { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'total_parcelas', { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'data_compra', { type: Sequelize.DATEONLY, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'origem_titulo', { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'MANUAL' });
    await addColumnIfMissing(queryInterface, sequelize, 'movimentos_financeiros', 'fatura_cartao_id', { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'conciliacoes_bancarias', 'fatura_cartao_id', { type: Sequelize.INTEGER, allowNull: true });

    const now = new Date();
    await queryInterface.bulkInsert('financeiro_formas_pagamento', [
      { nome: 'Boleto', codigo: 'BOLETO', tipo: 'BOLETO', permite_parcelamento: true, gera_boleto: true, ordem: 10, ativo: true, createdAt: now, updatedAt: now },
      { nome: 'Pix', codigo: 'PIX', tipo: 'PIX', permite_parcelamento: false, ordem: 20, ativo: true, createdAt: now, updatedAt: now },
      { nome: 'Transferencia bancaria', codigo: 'TRANSFERENCIA', tipo: 'TRANSFERENCIA', permite_parcelamento: false, ordem: 30, ativo: true, createdAt: now, updatedAt: now },
      { nome: 'Cartao de credito', codigo: 'CARTAO_CREDITO', tipo: 'CARTAO_CREDITO', permite_parcelamento: true, gera_fatura: true, exige_cartao: true, ordem: 40, ativo: true, createdAt: now, updatedAt: now },
      { nome: 'Cartao de debito', codigo: 'CARTAO_DEBITO', tipo: 'CARTAO_DEBITO', permite_parcelamento: false, exige_cartao: true, ordem: 50, ativo: true, createdAt: now, updatedAt: now },
      { nome: 'Cheque', codigo: 'CHEQUE', tipo: 'CHEQUE', permite_parcelamento: true, exige_cheque: true, ordem: 60, ativo: true, createdAt: now, updatedAt: now },
      { nome: 'Dinheiro', codigo: 'DINHEIRO', tipo: 'DINHEIRO', permite_parcelamento: false, ordem: 70, ativo: true, createdAt: now, updatedAt: now },
      { nome: 'Outros', codigo: 'OUTROS', tipo: 'OUTROS', permite_parcelamento: true, ordem: 90, ativo: true, createdAt: now, updatedAt: now }
    ].map((item) => ({
      ...item,
      gera_fatura: Boolean(item.gera_fatura),
      gera_boleto: Boolean(item.gera_boleto),
      exige_cartao: Boolean(item.exige_cartao),
      exige_cheque: Boolean(item.exige_cheque)
    })), { ignoreDuplicates: true });
  },

  async down({ queryInterface, sequelize }) {

    await removeColumnIfExists(queryInterface, sequelize, 'conciliacoes_bancarias', 'fatura_cartao_id');
    await removeColumnIfExists(queryInterface, sequelize, 'movimentos_financeiros', 'fatura_cartao_id');
    await removeColumnIfExists(queryInterface, sequelize, 'titulos_financeiros', 'origem_titulo');
    await removeColumnIfExists(queryInterface, sequelize, 'titulos_financeiros', 'data_compra');
    await removeColumnIfExists(queryInterface, sequelize, 'titulos_financeiros', 'total_parcelas');
    await removeColumnIfExists(queryInterface, sequelize, 'titulos_financeiros', 'numero_parcela');
    await removeColumnIfExists(queryInterface, sequelize, 'titulos_financeiros', 'grupo_parcelamento_id');
    await removeColumnIfExists(queryInterface, sequelize, 'titulos_financeiros', 'fatura_cartao_id');
    await removeColumnIfExists(queryInterface, sequelize, 'titulos_financeiros', 'cartao_id');
    await removeColumnIfExists(queryInterface, sequelize, 'titulos_financeiros', 'forma_pagamento_id');

    if (await tableExists(sequelize, 'financeiro_fatura_titulos')) {
      await queryInterface.dropTable('financeiro_fatura_titulos');
    }
    if (await tableExists(sequelize, 'financeiro_faturas_cartao')) {
      await queryInterface.dropTable('financeiro_faturas_cartao');
    }
    if (await tableExists(sequelize, 'financeiro_cartoes')) {
      await queryInterface.dropTable('financeiro_cartoes');
    }
    if (await tableExists(sequelize, 'financeiro_formas_pagamento')) {
      await queryInterface.dropTable('financeiro_formas_pagamento');
    }
  }
};
