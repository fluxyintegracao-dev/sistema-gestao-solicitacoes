'use strict';

const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    if (!(await tableExists(queryInterface.sequelize, 'governanca_snapshots'))) {
      await queryInterface.createTable('governanca_snapshots', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        data_referencia: { type: DataTypes.DATEONLY, allowNull: false },
        usuarios_ativos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        processos_abertos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        processos_concluidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        documentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        modulos_ativos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        empresas_ativas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        obras_ativas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        metricas_json: { type: DataTypes.TEXT('long'), allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    if (!(await indexExists(queryInterface.sequelize, 'governanca_snapshots', 'uk_governanca_snapshots_data'))) {
      await queryInterface.addIndex('governanca_snapshots', ['data_referencia'], {
        name: 'uk_governanca_snapshots_data',
        unique: true
      });
    }

    if (!(await tableExists(queryInterface.sequelize, 'governanca_access_logs'))) {
      await queryInterface.createTable('governanca_access_logs', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        usuario_id: { type: DataTypes.INTEGER, allowNull: true },
        acao: { type: DataTypes.STRING(120), allowNull: false },
        ip: { type: DataTypes.STRING(80), allowNull: true },
        user_agent: { type: DataTypes.STRING(500), allowNull: true },
        contexto_json: { type: DataTypes.TEXT('long'), allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    if (!(await columnExists(queryInterface.sequelize, 'governanca_access_logs', 'usuario_id'))) {
      await queryInterface.addColumn('governanca_access_logs', 'usuario_id', {
        type: DataTypes.INTEGER,
        allowNull: true
      });
    }

    const indexes = [
      ['idx_governanca_access_logs_usuario', ['usuario_id']],
      ['idx_governanca_access_logs_acao', ['acao']],
      ['idx_governanca_access_logs_created', ['createdAt']]
    ];

    for (const [name, fields] of indexes) {
      if (!(await indexExists(queryInterface.sequelize, 'governanca_access_logs', name))) {
        await queryInterface.addIndex('governanca_access_logs', fields, { name });
      }
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface.sequelize, 'governanca_access_logs')) {
      await queryInterface.dropTable('governanca_access_logs');
    }
    if (await tableExists(queryInterface.sequelize, 'governanca_snapshots')) {
      await queryInterface.dropTable('governanca_snapshots');
    }
  }
};
