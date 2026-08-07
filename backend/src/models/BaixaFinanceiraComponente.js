module.exports = (sequelize, DataTypes) => sequelize.define('BaixaFinanceiraComponente', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  baixa_grupo_id: { type: DataTypes.INTEGER, allowNull: false },
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  forma_pagamento_id: { type: DataTypes.INTEGER, allowNull: true },
  forma_recebimento: { type: DataTypes.STRING(30), allowNull: false },
  conta_bancaria_id: { type: DataTypes.INTEGER, allowNull: true },
  cartao_id: { type: DataTypes.INTEGER, allowNull: true },
  cheque_terceiro_id: { type: DataTypes.INTEGER, allowNull: true },
  valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  juros: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  multa: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  desconto: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  valor_quitacao: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  documento_referencia: { type: DataTypes.STRING(120), allowNull: true },
  observacoes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'baixas_financeiras_componentes',
  timestamps: true
});
