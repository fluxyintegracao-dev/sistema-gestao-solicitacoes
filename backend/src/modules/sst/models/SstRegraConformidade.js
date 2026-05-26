'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstRegraConformidade', {
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
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_regras_conformidade',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['codigo'] },
    { fields: ['tipo_regra'] }
  ]
});
