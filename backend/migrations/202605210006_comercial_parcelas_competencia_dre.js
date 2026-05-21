const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (await tableExists(sequelize, tableName) && !(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name) {
  if (await tableExists(sequelize, tableName) && !(await indexExists(sequelize, tableName, name))) {
    await queryInterface.addIndex(tableName, fields, { name });
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais_parcelas', 'competencia_data', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'contratos_comerciais_parcelas',
      ['competencia_data'],
      'idx_contratos_comerciais_parcelas_competencia'
    );

    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais', 'competencia_comissao_data', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'contratos_comerciais',
      ['competencia_comissao_data'],
      'idx_contratos_comerciais_competencia_comissao'
    );
  },

  async down({ queryInterface, sequelize }) {
    if (
      await tableExists(sequelize, 'contratos_comerciais_parcelas')
      && await columnExists(sequelize, 'contratos_comerciais_parcelas', 'competencia_data')
    ) {
      await queryInterface.removeColumn('contratos_comerciais_parcelas', 'competencia_data');
    }

    if (
      await tableExists(sequelize, 'contratos_comerciais')
      && await columnExists(sequelize, 'contratos_comerciais', 'competencia_comissao_data')
    ) {
      await queryInterface.removeColumn('contratos_comerciais', 'competencia_comissao_data');
    }
  }
};
