'use strict';

const { indexExists, tableExists } = require('../src/database/schemaUtils');

async function createTableIfMissing(queryInterface, sequelize, tableName, definition) {
  if (!(await tableExists(sequelize, tableName))) {
    await queryInterface.createTable(tableName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name) {
  if (await tableExists(sequelize, tableName) && !(await indexExists(sequelize, tableName, name))) {
    await queryInterface.addIndex(tableName, fields, { name });
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await createTableIfMissing(queryInterface, sequelize, 'treinamento_conteudos', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tipo: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'GUIA' },
      modulo: { type: DataTypes.STRING(60), allowNull: true },
      publico_alvo: { type: DataTypes.STRING(120), allowNull: true },
      titulo: { type: DataTypes.STRING(180), allowNull: false },
      pergunta: { type: DataTypes.TEXT, allowNull: true },
      resposta: { type: DataTypes.TEXT, allowNull: true },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      conteudo: { type: DataTypes.TEXT('long'), allowNull: true },
      tags_json: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'RASCUNHO' },
      ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      video_url: { type: DataTypes.TEXT, allowNull: true },
      video_s3_key: { type: DataTypes.TEXT, allowNull: true },
      documento_url: { type: DataTypes.TEXT, allowNull: true },
      documento_s3_key: { type: DataTypes.TEXT, allowNull: true },
      thumbnail_url: { type: DataTypes.TEXT, allowNull: true },
      duracao_minutos: { type: DataTypes.INTEGER, allowNull: true },
      publicado_em: { type: DataTypes.DATE, allowNull: true },
      publicado_por: { type: DataTypes.INTEGER, allowNull: true },
      criado_por: { type: DataTypes.INTEGER, allowNull: true },
      atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, sequelize, 'treinamento_leituras_usuario', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      conteudo_id: { type: DataTypes.INTEGER, allowNull: false },
      usuario_id: { type: DataTypes.INTEGER, allowNull: false },
      concluido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      visualizado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      concluido_em: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await addIndexIfMissing(queryInterface, sequelize, 'treinamento_conteudos', ['tipo'], 'idx_treinamento_conteudos_tipo');
    await addIndexIfMissing(queryInterface, sequelize, 'treinamento_conteudos', ['modulo'], 'idx_treinamento_conteudos_modulo');
    await addIndexIfMissing(queryInterface, sequelize, 'treinamento_conteudos', ['status'], 'idx_treinamento_conteudos_status');
    await addIndexIfMissing(queryInterface, sequelize, 'treinamento_conteudos', ['ordem'], 'idx_treinamento_conteudos_ordem');
    await addIndexIfMissing(queryInterface, sequelize, 'treinamento_leituras_usuario', ['usuario_id'], 'idx_treinamento_leituras_usuario');
    await addIndexIfMissing(queryInterface, sequelize, 'treinamento_leituras_usuario', ['conteudo_id'], 'idx_treinamento_leituras_conteudo');
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'treinamento_leituras_usuario',
      ['conteudo_id', 'usuario_id'],
      'idx_treinamento_leituras_conteudo_usuario'
    );
  },

  async down({ queryInterface }) {
    await queryInterface.dropTable('treinamento_leituras_usuario');
    await queryInterface.dropTable('treinamento_conteudos');
  }
};
