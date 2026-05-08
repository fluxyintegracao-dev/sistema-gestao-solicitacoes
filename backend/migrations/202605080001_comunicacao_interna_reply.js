'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('conversas_internas_mensagens', 'citacao_id', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'conversas_internas_mensagens', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('conversas_internas_mensagens', 'citacao_id');
  }
};
