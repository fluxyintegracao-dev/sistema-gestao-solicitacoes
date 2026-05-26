'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstEpiEntrega', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
  epi_nome: { type: DataTypes.STRING(160), allowNull: false },
  ca: { type: DataTypes.STRING(60), allowNull: true },
  quantidade: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 1 },
  entrega_em: { type: DataTypes.DATEONLY, allowNull: false },
  validade: { type: DataTypes.DATEONLY, allowNull: true },
  assinatura_url: { type: DataTypes.TEXT, allowNull: true },
  comprovante_url: { type: DataTypes.TEXT, allowNull: true },
  obrigatorio: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  funcao_alvo: { type: DataTypes.STRING(120), allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ENTREGUE' },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_epi_entregas',
  timestamps: true
});
