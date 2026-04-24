const { columnExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize, DataTypes, queryInterface }) {
    const hasValorOrcado = await columnExists(sequelize, 'apropriacoes', 'valor_orcado');

    if (!hasValorOrcado) {
      await queryInterface.addColumn('apropriacoes', 'valor_orcado', {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      });
    }
  }
};
