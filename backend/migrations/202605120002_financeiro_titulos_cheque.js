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
    const tableName = 'titulos_financeiros';

    await addColumnIfMissing(queryInterface, sequelize, tableName, 'cheque_numero', {
      type: DataTypes.STRING(60),
      allowNull: true,
      after: 'numero_documento'
    });
    await addColumnIfMissing(queryInterface, sequelize, tableName, 'cheque_banco', {
      type: DataTypes.STRING(120),
      allowNull: true,
      after: 'cheque_numero'
    });
    await addColumnIfMissing(queryInterface, sequelize, tableName, 'cheque_agencia', {
      type: DataTypes.STRING(40),
      allowNull: true,
      after: 'cheque_banco'
    });
    await addColumnIfMissing(queryInterface, sequelize, tableName, 'cheque_conta', {
      type: DataTypes.STRING(60),
      allowNull: true,
      after: 'cheque_agencia'
    });
    await addColumnIfMissing(queryInterface, sequelize, tableName, 'cheque_emitente', {
      type: DataTypes.STRING(160),
      allowNull: true,
      after: 'cheque_conta'
    });
  },

  async down({ queryInterface, sequelize }) {
    const tableName = 'titulos_financeiros';
    await removeColumnIfExists(queryInterface, sequelize, tableName, 'cheque_emitente');
    await removeColumnIfExists(queryInterface, sequelize, tableName, 'cheque_conta');
    await removeColumnIfExists(queryInterface, sequelize, tableName, 'cheque_agencia');
    await removeColumnIfExists(queryInterface, sequelize, tableName, 'cheque_banco');
    await removeColumnIfExists(queryInterface, sequelize, tableName, 'cheque_numero');
  }
};
