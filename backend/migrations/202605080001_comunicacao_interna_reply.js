'use strict';

module.exports = {
  async up({ queryInterface, DataTypes }) {
    await queryInterface.addColumn('conversas_internas_mensagens', 'citacao_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'conversas_internas_mensagens', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down({ queryInterface }) {
    await queryInterface.removeColumn('conversas_internas_mensagens', 'citacao_id');
  }
};
