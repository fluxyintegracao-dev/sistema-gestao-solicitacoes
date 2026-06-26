const { indexExists, tableExists } = require('../src/database/schemaUtils');

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name, options = {}) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (await indexExists(sequelize, tableName, name)) return;
  await queryInterface.addIndex(tableName, fields, { name, ...options });
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'solicitacao_compra_fornecedor_itens'))) {
      await queryInterface.createTable('solicitacao_compra_fornecedor_itens', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        solicitacao_compra_fornecedor_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'solicitacao_compra_fornecedores',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        item_tipo: {
          type: DataTypes.STRING(20),
          allowNull: false
        },
        solicitacao_compra_item_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'solicitacao_compra_itens',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        solicitacao_compra_item_manual_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'solicitacao_compra_itens_manuais',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compra_fornecedor_itens',
      ['solicitacao_compra_fornecedor_id'],
      'idx_sc_fornecedor_itens_fornecedor'
    );

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compra_fornecedor_itens',
      ['solicitacao_compra_fornecedor_id', 'item_tipo', 'solicitacao_compra_item_id', 'solicitacao_compra_item_manual_id'],
      'uniq_sc_fornecedor_itens_item',
      { unique: true }
    );
  },

  async down() {}
};
