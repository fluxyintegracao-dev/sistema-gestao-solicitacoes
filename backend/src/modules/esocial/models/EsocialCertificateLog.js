'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('EsocialCertificateLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  ambiente: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'restrita' },
  status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'REGISTRADO' },
  cert_type: { type: DataTypes.STRING(30), allowNull: true },
  cert_path_hash: { type: DataTypes.STRING(128), allowNull: true },
  subject: { type: DataTypes.STRING(255), allowNull: true },
  issuer: { type: DataTypes.STRING(255), allowNull: true },
  valid_from: { type: DataTypes.DATE, allowNull: true },
  valid_to: { type: DataTypes.DATE, allowNull: true },
  erro: { type: DataTypes.TEXT, allowNull: true },
  metadados_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'esocial_certificate_logs',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['status'] },
    { fields: ['ambiente'] },
    { fields: ['createdAt'] }
  ]
});
