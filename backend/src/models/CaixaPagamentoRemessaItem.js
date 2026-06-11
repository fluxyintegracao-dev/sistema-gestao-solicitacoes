module.exports = (sequelize, DataTypes) => sequelize.define(
  'CaixaPagamentoRemessaItem',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    remessa_id: { type: DataTypes.INTEGER, allowNull: false },
    titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: false },
    parceiro_id: { type: DataTypes.INTEGER, allowNull: true },
    sequencial_lote: { type: DataTypes.INTEGER, allowNull: false },
    segmento: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'J' },
    codigo_barras: { type: DataTypes.STRING(60), allowNull: false },
    valor: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    data_pagamento: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'GERADO' },
    erro_mensagem: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: 'caixa_pagamento_remessa_itens',
    timestamps: true
  }
);
