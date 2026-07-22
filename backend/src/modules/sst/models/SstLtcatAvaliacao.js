'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstLtcatAvaliacao', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ltcat_id: { type: DataTypes.INTEGER, allowNull: false },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  ambiente: { type: DataTypes.STRING(180), allowNull: false },
  agente: { type: DataTypes.STRING(180), allowNull: false },
  tipo_agente: { type: DataTypes.STRING(60), allowNull: true },
  metodologia: { type: DataTypes.STRING(180), allowNull: true },
  unidade_medida: { type: DataTypes.STRING(40), allowNull: true },
  valor_medido: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  limite_tolerancia: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  nivel_acao: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
  resultado: { type: DataTypes.STRING(60), allowNull: true },
  data_avaliacao: { type: DataTypes.DATEONLY, allowNull: true },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_ltcat_avaliacoes',
  timestamps: true
});
