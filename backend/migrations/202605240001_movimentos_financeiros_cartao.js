const { columnExists, foreignKeyExists, indexExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const tableName = 'movimentos_financeiros';
    const Sequelize = DataTypes;

    if (await tableExists(sequelize, tableName) && !(await columnExists(sequelize, tableName, 'cartao_id'))) {
      await queryInterface.addColumn(tableName, 'cartao_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: 'fatura_cartao_id'
      });
    }

    if (await tableExists(sequelize, tableName) && !(await indexExists(sequelize, tableName, 'idx_movimentos_cartao'))) {
      await queryInterface.addIndex(tableName, ['cartao_id'], {
        name: 'idx_movimentos_cartao'
      });
    }

    if (
      await tableExists(sequelize, tableName) &&
      await columnExists(sequelize, tableName, 'cartao_id') &&
      !(await foreignKeyExists(sequelize, tableName, 'fk_movimentos_cartao'))
    ) {
      await queryInterface.addConstraint(tableName, {
        fields: ['cartao_id'],
        type: 'foreign key',
        name: 'fk_movimentos_cartao',
        references: {
          table: 'financeiro_cartoes',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down({ queryInterface, sequelize }) {
    const tableName = 'movimentos_financeiros';

    if (await tableExists(sequelize, tableName) && await foreignKeyExists(sequelize, tableName, 'fk_movimentos_cartao')) {
      await queryInterface.removeConstraint(tableName, 'fk_movimentos_cartao');
    }

    if (await tableExists(sequelize, tableName) && await indexExists(sequelize, tableName, 'idx_movimentos_cartao')) {
      await queryInterface.removeIndex(tableName, 'idx_movimentos_cartao');
    }

    if (await tableExists(sequelize, tableName) && await columnExists(sequelize, tableName, 'cartao_id')) {
      await queryInterface.removeColumn(tableName, 'cartao_id');
    }
  }
};
