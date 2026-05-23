'use strict';

const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function createTableIfMissing(queryInterface, sequelize, tableName, definition) {
  if (!(await tableExists(sequelize, tableName))) {
    await queryInterface.createTable(tableName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name) {
  if (await tableExists(sequelize, tableName) && !(await indexExists(sequelize, tableName, name))) {
    for (const field of fields) {
      if (!(await columnExists(sequelize, tableName, field))) return;
    }
    await queryInterface.addIndex(tableName, fields, { name });
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await createTableIfMissing(queryInterface, sequelize, 'sst_historicos', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      recurso: { type: DataTypes.STRING(60), allowNull: false },
      recurso_id: { type: DataTypes.INTEGER, allowNull: true },
      acao: { type: DataTypes.STRING(40), allowNull: false },
      resumo: { type: DataTypes.TEXT, allowNull: true },
      antes: { type: DataTypes.TEXT('long'), allowNull: true },
      depois: { type: DataTypes.TEXT('long'), allowNull: true },
      criado_por: { type: DataTypes.INTEGER, allowNull: true },
      atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await addIndexIfMissing(queryInterface, sequelize, 'sst_historicos', ['recurso', 'recurso_id'], 'idx_sst_historicos_recurso');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_historicos', ['empresa_id'], 'idx_sst_historicos_empresa');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_historicos', ['obra_id'], 'idx_sst_historicos_obra');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_historicos', ['colaborador_id'], 'idx_sst_historicos_colaborador');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_historicos', ['createdAt'], 'idx_sst_historicos_created_at');
  },

  async down({ queryInterface, sequelize }) {
    if (await tableExists(sequelize, 'sst_historicos')) {
      await queryInterface.dropTable('sst_historicos');
    }
  }
};
