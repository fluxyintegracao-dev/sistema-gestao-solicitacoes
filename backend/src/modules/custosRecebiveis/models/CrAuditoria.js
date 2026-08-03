'use strict';

const APPEND_ONLY_ERROR = 'A auditoria de Custos e Recebiveis e append-only';

module.exports = (sequelize, DataTypes) => sequelize.define('CrAuditoria', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  competencia_id: { type: DataTypes.INTEGER, allowNull: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  evento: { type: DataTypes.STRING(120), allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  payload_json: { type: DataTypes.JSON, allowNull: true },
  origem: { type: DataTypes.ENUM('web', 'job'), allowNull: false, defaultValue: 'web' },
  criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'cr_auditoria',
  timestamps: false,
  indexes: [
    { name: 'idx_cr_auditoria_obra_data', fields: ['obra_id', 'criado_em'] },
    { name: 'idx_cr_auditoria_competencia_data', fields: ['competencia_id', 'criado_em'] }
  ],
  hooks: {
    beforeUpdate() {
      throw new Error(APPEND_ONLY_ERROR);
    },
    beforeDestroy() {
      throw new Error(APPEND_ONLY_ERROR);
    },
    beforeBulkUpdate() {
      throw new Error(APPEND_ONLY_ERROR);
    },
    beforeBulkDestroy() {
      throw new Error(APPEND_ONLY_ERROR);
    }
  }
});
