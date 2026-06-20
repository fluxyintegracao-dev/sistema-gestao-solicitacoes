const { columnExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const tableName = 'solicitacoes';

    await addColumnIfMissing(queryInterface, sequelize, tableName, 'financeiro_pendencia_prazo', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, sequelize, tableName, 'financeiro_pendencia_tipo', {
      type: DataTypes.STRING(80),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, tableName, 'financeiro_pendencia_observacao', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, tableName, 'financeiro_pendencia_marcado_por', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, tableName, 'financeiro_pendencia_marcado_em', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, tableName, 'financeiro_pendencia_regularizado_por', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, tableName, 'financeiro_pendencia_regularizado_em', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  async down() {
    // Preserva dados de auditoria. Reversao manual apenas se for estritamente necessario.
  }
};
