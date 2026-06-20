const { columnExists, resolveTableName, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function createTableIfMissing(queryInterface, sequelize, tableName, definition) {
  if (!(await tableExists(sequelize, tableName))) {
    await queryInterface.createTable(tableName, definition);
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    const obraTable = await resolveTableName(sequelize, ['obras', 'Obras'], 'Obras');

    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'valor_bruto', {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'valor_impostos', {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    });

    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'valor_liquido', {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'possui_rateio', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await createTableIfMissing(queryInterface, sequelize, 'titulos_financeiros_rateios', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      titulo_financeiro_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'titulos_financeiros', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: obraTable, key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      apropriacao_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'apropriacoes', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      tipo_rateio: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PERCENTUAL' },
      percentual: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
      valor_rateio: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      criado_por: { type: DataTypes.INTEGER, allowNull: true },
      atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, sequelize, 'titulos_financeiros_impostos', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      titulo_financeiro_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'titulos_financeiros', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      tipo_imposto: { type: DataTypes.STRING(60), allowNull: false },
      descricao: { type: DataTypes.STRING(180), allowNull: true },
      natureza: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'RETENCAO' },
      base_calculo: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      aliquota: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
      valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      criado_por: { type: DataTypes.INTEGER, allowNull: true },
      atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, sequelize, 'cheques_terceiros', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: DataTypes.STRING(40), allowNull: true },
      titulo_financeiro_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'titulos_financeiros', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      movimento_financeiro_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'movimentos_financeiros', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      parceiro_entregou_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'parceiros', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      cliente_nome: { type: DataTypes.STRING(180), allowNull: true },
      titular_nome: { type: DataTypes.STRING(180), allowNull: true },
      titular_documento: { type: DataTypes.STRING(30), allowNull: true },
      banco: { type: DataTypes.STRING(80), allowNull: true },
      agencia: { type: DataTypes.STRING(30), allowNull: true },
      conta: { type: DataTypes.STRING(40), allowNull: true },
      numero_cheque: { type: DataTypes.STRING(60), allowNull: true },
      valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      data_emissao: { type: DataTypes.DATEONLY, allowNull: true },
      data_vencimento: { type: DataTypes.DATEONLY, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'EM_CARTEIRA' },
      arquivo_url: { type: DataTypes.TEXT, allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      criado_por: { type: DataTypes.INTEGER, allowNull: true },
      atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });
  }
};
