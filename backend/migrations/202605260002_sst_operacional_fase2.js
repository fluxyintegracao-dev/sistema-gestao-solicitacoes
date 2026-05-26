'use strict';

const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (await tableExists(sequelize, tableName) && !(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
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

async function createTableIfMissing(queryInterface, sequelize, tableName, definition) {
  if (!(await tableExists(sequelize, tableName))) {
    await queryInterface.createTable(tableName, definition);
  }
}

function auditColumns(DataTypes) {
  return {
    criado_por: { type: DataTypes.INTEGER, allowNull: true },
    atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  };
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await addColumnIfMissing(queryInterface, sequelize, 'sst_aso', 'uf_crm', { type: DataTypes.STRING(2), allowNull: true });

    await addColumnIfMissing(queryInterface, sequelize, 'sst_exames', 'aso_id', { type: DataTypes.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_exames', 'documento_url', { type: DataTypes.TEXT, allowNull: true });

    await addColumnIfMissing(queryInterface, sequelize, 'sst_treinamentos', 'obrigatorio', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_treinamentos', 'funcao_alvo', { type: DataTypes.STRING(120), allowNull: true });

    await addColumnIfMissing(queryInterface, sequelize, 'sst_epi_entregas', 'obrigatorio', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_epi_entregas', 'funcao_alvo', { type: DataTypes.STRING(120), allowNull: true });

    await addColumnIfMissing(queryInterface, sequelize, 'sst_acidentes', 'agente_causador', { type: DataTypes.STRING(160), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_acidentes', 'situacao_geradora', { type: DataTypes.STRING(160), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_acidentes', 'parte_corpo', { type: DataTypes.STRING(160), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_acidentes', 'cid', { type: DataTypes.STRING(20), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_acidentes', 'fotos_url', { type: DataTypes.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_acidentes', 'acoes_corretivas', { type: DataTypes.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_acidentes', 'responsavel_id', { type: DataTypes.INTEGER, allowNull: true });

    await createTableIfMissing(queryInterface, sequelize, 'sst_regras_conformidade', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: false },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      codigo: { type: DataTypes.STRING(80), allowNull: false },
      nome: { type: DataTypes.STRING(160), allowNull: false },
      tipo_regra: { type: DataTypes.STRING(60), allowNull: false },
      funcao_alvo: { type: DataTypes.STRING(120), allowNull: true },
      treinamento_codigo: { type: DataTypes.STRING(40), allowNull: true },
      epi_nome: { type: DataTypes.STRING(160), allowNull: true },
      severidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ALERTA' },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      parametros_json: { type: DataTypes.TEXT('long'), allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await addIndexIfMissing(queryInterface, sequelize, 'sst_exames', ['aso_id'], 'idx_sst_exames_aso');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_acidentes', ['responsavel_id'], 'idx_sst_acidentes_responsavel');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_regras_conformidade', ['empresa_id'], 'idx_sst_regras_empresa');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_regras_conformidade', ['codigo'], 'idx_sst_regras_codigo');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_regras_conformidade', ['tipo_regra'], 'idx_sst_regras_tipo');
  },

  async down({ queryInterface, sequelize }) {
    if (await tableExists(sequelize, 'sst_regras_conformidade')) {
      await queryInterface.dropTable('sst_regras_conformidade');
    }
  }
};
