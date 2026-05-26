'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstRecomendacaoOperacional', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_recomendacao: { type: DataTypes.STRING(80), allowNull: false },
  criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
  titulo: { type: DataTypes.STRING(180), allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: false },
  acao_sugerida: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ABERTA' },
  origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
  origem_id: { type: DataTypes.INTEGER, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_recomendacoes_operacionais',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['tipo_recomendacao'] },
    { fields: ['criticidade'] },
    { fields: ['status'] }
  ]
});
