'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstTreinamento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
  codigo: { type: DataTypes.STRING(40), allowNull: true },
  nome: { type: DataTypes.STRING(160), allowNull: false },
  data_inicio: { type: DataTypes.DATEONLY, allowNull: true },
  data_fim: { type: DataTypes.DATEONLY, allowNull: true },
  validade: { type: DataTypes.DATEONLY, allowNull: true },
  instrutor: { type: DataTypes.STRING(160), allowNull: true },
  carga_horaria: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
  certificado_url: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'VALIDO' },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_treinamentos',
  timestamps: true
});
