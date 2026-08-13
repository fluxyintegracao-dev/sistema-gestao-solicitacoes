'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('GovernancaEventoOperacional', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  evento_uuid: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  ocorrido_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  setor_id: { type: DataTypes.INTEGER, allowNull: true },
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
  metadata_json: { type: DataTypes.TEXT('long'), allowNull: true }
}, {
  tableName: 'governanca_eventos_operacionais',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['evento_uuid'] },
    { fields: ['ocorrido_em'] },
    { fields: ['usuario_id', 'ocorrido_em'] },
    { fields: ['setor_id', 'ocorrido_em'] },
    { fields: ['modulo', 'ocorrido_em'] },
    { fields: ['tipo_evento', 'ocorrido_em'] },
    { fields: ['recurso_tipo', 'recurso_id', 'ocorrido_em'] },
    { fields: ['resultado', 'ocorrido_em'] }
  ]
});
