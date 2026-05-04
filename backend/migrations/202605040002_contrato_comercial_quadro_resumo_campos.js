const {
  columnExists,
  tableExists
} = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (await columnExists(sequelize, tableName, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function removeColumnIfExists(queryInterface, sequelize, tableName, columnName) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (!(await columnExists(sequelize, tableName, columnName))) return;
  await queryInterface.removeColumn(tableName, columnName);
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais', 'possui_vaga_garagem', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais', 'quantidade_vagas_garagem', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais', 'vagas_garagem_posicao', {
      type: DataTypes.STRING(255),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais', 'local_assinatura', {
      type: DataTypes.STRING(160),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais', 'data_assinatura', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais_parcelas', 'reajuste_tipo', {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: 'FIXA'
    });
  },

  async down({ queryInterface, sequelize }) {
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais_parcelas', 'reajuste_tipo');
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais', 'data_assinatura');
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais', 'local_assinatura');
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais', 'vagas_garagem_posicao');
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais', 'quantidade_vagas_garagem');
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais', 'possui_vaga_garagem');
  }
};
