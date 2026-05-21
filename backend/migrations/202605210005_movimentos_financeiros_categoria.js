const { columnExists, foreignKeyExists, indexExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const tableName = 'movimentos_financeiros';
    const Sequelize = DataTypes;

    if (await tableExists(sequelize, tableName) && !(await columnExists(sequelize, tableName, 'categoria_financeira_id'))) {
      await queryInterface.addColumn(tableName, 'categoria_financeira_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: 'fatura_cartao_id'
      });
    }

    if (await tableExists(sequelize, tableName) && !(await indexExists(sequelize, tableName, 'idx_movimentos_categoria_financeira'))) {
      await queryInterface.addIndex(tableName, ['categoria_financeira_id'], {
        name: 'idx_movimentos_categoria_financeira'
      });
    }

    if (
      await tableExists(sequelize, tableName) &&
      await columnExists(sequelize, tableName, 'categoria_financeira_id') &&
      !(await foreignKeyExists(sequelize, tableName, 'fk_movimentos_categoria_financeira'))
    ) {
      await queryInterface.addConstraint(tableName, {
        fields: ['categoria_financeira_id'],
        type: 'foreign key',
        name: 'fk_movimentos_categoria_financeira',
        references: {
          table: 'categorias_financeiras',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down({ queryInterface, sequelize }) {
    const tableName = 'movimentos_financeiros';

    if (await tableExists(sequelize, tableName) && await foreignKeyExists(sequelize, tableName, 'fk_movimentos_categoria_financeira')) {
      await queryInterface.removeConstraint(tableName, 'fk_movimentos_categoria_financeira');
    }

    if (await tableExists(sequelize, tableName) && await indexExists(sequelize, tableName, 'idx_movimentos_categoria_financeira')) {
      await queryInterface.removeIndex(tableName, 'idx_movimentos_categoria_financeira');
    }

    if (await tableExists(sequelize, tableName) && await columnExists(sequelize, tableName, 'categoria_financeira_id')) {
      await queryInterface.removeColumn(tableName, 'categoria_financeira_id');
    }
  }
};
