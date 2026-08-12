module.exports = (sequelize, DataTypes) => sequelize.define('BaixaFinanceiraComponente', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  baixa_grupo_id: { type: DataTypes.INTEGER, allowNull: false },
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
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
  cheque_numero: { type: DataTypes.STRING(60), allowNull: true },
  cheque_emitente: { type: DataTypes.STRING(160), allowNull: true },
  cheque_titular_documento: { type: DataTypes.STRING(40), allowNull: true },
  cheque_banco: { type: DataTypes.STRING(120), allowNull: true },
  cheque_agencia: { type: DataTypes.STRING(40), allowNull: true },
  cheque_conta: { type: DataTypes.STRING(60), allowNull: true },
  cheque_data_emissao: { type: DataTypes.DATEONLY, allowNull: true },
  cheque_data_vencimento: { type: DataTypes.DATEONLY, allowNull: true },
  observacoes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'baixas_financeiras_componentes',
  timestamps: true
});
