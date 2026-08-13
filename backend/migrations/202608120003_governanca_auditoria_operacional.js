'use strict';

const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (await tableExists(sequelize, 'governanca_eventos_operacionais')) return;

    await queryInterface.createTable('governanca_eventos_operacionais', {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      evento_uuid: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      ocorrido_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      usuario_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      setor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'setores', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      perfil_snapshot: { type: DataTypes.STRING(80), allowNull: true },
      sessao_id: { type: DataTypes.STRING(80), allowNull: true },
      categoria: { type: DataTypes.STRING(40), allowNull: false },
      tipo_evento: { type: DataTypes.STRING(80), allowNull: false },
      modulo: { type: DataTypes.STRING(80), allowNull: false },
      pagina_chave: { type: DataTypes.STRING(120), allowNull: true },
      rota_padrao: { type: DataTypes.STRING(255), allowNull: true },
      recurso_tipo: { type: DataTypes.STRING(120), allowNull: true },
      recurso_id: { type: DataTypes.STRING(120), allowNull: true },
      recurso_codigo: { type: DataTypes.STRING(120), allowNull: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      acao_chave: { type: DataTypes.STRING(160), allowNull: true },
      resumo: { type: DataTypes.STRING(500), allowNull: false },
      resultado: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'SUCCESS' },
      origem: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'BACKEND' },
      request_id: { type: DataTypes.STRING(80), allowNull: true },
      ip_hash: { type: DataTypes.STRING(64), allowNull: true },
      user_agent_resumo: { type: DataTypes.STRING(160), allowNull: true },
      metadata_json: { type: DataTypes.TEXT('long'), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await Promise.all([
      queryInterface.addIndex('governanca_eventos_operacionais', ['ocorrido_em'], { name: 'gov_eventos_ocorrido' }),
      queryInterface.addIndex('governanca_eventos_operacionais', ['usuario_id', 'ocorrido_em'], { name: 'gov_eventos_usuario_data' }),
      queryInterface.addIndex('governanca_eventos_operacionais', ['setor_id', 'ocorrido_em'], { name: 'gov_eventos_setor_data' }),
      queryInterface.addIndex('governanca_eventos_operacionais', ['modulo', 'ocorrido_em'], { name: 'gov_eventos_modulo_data' }),
      queryInterface.addIndex('governanca_eventos_operacionais', ['tipo_evento', 'ocorrido_em'], { name: 'gov_eventos_tipo_data' }),
      queryInterface.addIndex('governanca_eventos_operacionais', ['recurso_tipo', 'recurso_id', 'ocorrido_em'], { name: 'gov_eventos_recurso_data' }),
      queryInterface.addIndex('governanca_eventos_operacionais', ['resultado', 'ocorrido_em'], { name: 'gov_eventos_resultado_data' })
    ]);
  },

  async down() {
    // Sem rollback destrutivo: a trilha de auditoria deve ser preservada.
  }
};
