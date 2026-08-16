'use strict';

const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'financeiro_dda_sincronizacoes'))) {
      await queryInterface.createTable('financeiro_dda_sincronizacoes', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
        provider: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'BB' },
        empresa_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'empresas_grupo', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        payment_account_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'payment_accounts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        modo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ESTRUTURAL' },
        status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'INICIADA' },
        cursor_provider: { type: DataTypes.STRING(255), allowNull: true },
        request_id: { type: DataTypes.STRING(100), allowNull: true },
        total_recebidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        total_novos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        total_atualizados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        total_erros: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        erro_codigo: { type: DataTypes.STRING(80), allowNull: true },
        erro_mensagem: { type: DataTypes.STRING(500), allowNull: true },
        iniciado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        finalizado_em: { type: DataTypes.DATE, allowNull: true },
        criado_por: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
      await queryInterface.addIndex('financeiro_dda_sincronizacoes', ['empresa_id', 'iniciado_em'], { name: 'dda_sync_empresa_data' });
      await queryInterface.addIndex('financeiro_dda_sincronizacoes', ['status', 'iniciado_em'], { name: 'dda_sync_status_data' });
    }

    if (!(await tableExists(sequelize, 'financeiro_dda_boletos'))) {
      await queryInterface.createTable('financeiro_dda_boletos', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
        provider: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'BB' },
        provider_document_id: { type: DataTypes.STRING(160), allowNull: false },
        empresa_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'empresas_grupo', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        payment_account_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'payment_accounts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        sincronizacao_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'financeiro_dda_sincronizacoes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        beneficiario_nome: { type: DataTypes.STRING(255), allowNull: true },
        beneficiario_documento: { type: DataTypes.STRING(20), allowNull: true },
        pagador_nome: { type: DataTypes.STRING(255), allowNull: true },
        pagador_documento: { type: DataTypes.STRING(20), allowNull: true },
        banco_codigo: { type: DataTypes.STRING(10), allowNull: true },
        banco_nome: { type: DataTypes.STRING(120), allowNull: true },
        nosso_numero: { type: DataTypes.STRING(120), allowNull: true },
        linha_digitavel: { type: DataTypes.STRING(255), allowNull: true },
        codigo_barras: { type: DataTypes.STRING(255), allowNull: true },
        data_emissao: { type: DataTypes.DATEONLY, allowNull: true },
        data_vencimento: { type: DataTypes.DATEONLY, allowNull: false },
        valor_original: { type: DataTypes.DECIMAL(16, 2), allowNull: false },
        valor_atual: { type: DataTypes.DECIMAL(16, 2), allowNull: false },
        provider_status: { type: DataTypes.STRING(60), allowNull: true },
        status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NOVO' },
        titulo_sugerido_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'titulos_financeiros', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'titulos_financeiros', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        fingerprint: { type: DataTypes.STRING(64), allowNull: false, unique: true },
        payload_hash: { type: DataTypes.STRING(64), allowNull: false },
        raw_payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
        primeira_consulta_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        ultima_consulta_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        vinculado_em: { type: DataTypes.DATE, allowNull: true },
        vinculado_por: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        ignorado_em: { type: DataTypes.DATE, allowNull: true },
        ignorado_por: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        ignorado_motivo: { type: DataTypes.STRING(500), allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
      await queryInterface.addConstraint('financeiro_dda_boletos', {
        fields: ['provider', 'provider_document_id'],
        type: 'unique',
        name: 'dda_boleto_provider_documento_unique'
      });
      await queryInterface.addIndex('financeiro_dda_boletos', ['empresa_id', 'status', 'data_vencimento'], { name: 'dda_boleto_empresa_status_venc' });
      await queryInterface.addIndex('financeiro_dda_boletos', ['beneficiario_documento', 'valor_atual', 'data_vencimento'], { name: 'dda_boleto_match' });
      await queryInterface.addIndex('financeiro_dda_boletos', ['titulo_financeiro_id'], { name: 'dda_boleto_titulo' });
    }

    if (!(await tableExists(sequelize, 'financeiro_dda_eventos'))) {
      await queryInterface.createTable('financeiro_dda_eventos', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
        boleto_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'financeiro_dda_boletos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        sincronizacao_id: { type: DataTypes.BIGINT, allowNull: true, references: { model: 'financeiro_dda_sincronizacoes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        tipo_evento: { type: DataTypes.STRING(80), allowNull: false },
        status_anterior: { type: DataTypes.STRING(30), allowNull: true },
        status_novo: { type: DataTypes.STRING(30), allowNull: true },
        usuario_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        detalhe_json: { type: DataTypes.TEXT('long'), allowNull: true },
        dedupe_key: { type: DataTypes.STRING(120), allowNull: false, unique: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
      await queryInterface.addIndex('financeiro_dda_eventos', ['boleto_id', 'createdAt'], { name: 'dda_evento_boleto_data' });
      await queryInterface.addIndex('financeiro_dda_eventos', ['tipo_evento', 'createdAt'], { name: 'dda_evento_tipo_data' });
    }
  },

  async down() {
    // Sem rollback destrutivo: documentos e eventos DDA compoem trilha financeira.
  }
};
