module.exports = (sequelize, DataTypes) => sequelize.define(
  'BoletoCaixaRemessaItem',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    remessa_id: { type: DataTypes.INTEGER, allowNull: false },
    boleto_id: { type: DataTypes.INTEGER, allowNull: false },
    titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: false },
    sequencial_lote: { type: DataTypes.INTEGER, allowNull: false },
    codigo_movimento_remessa: { type: DataTypes.STRING(2), allowNull: false, defaultValue: '01' },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'INCLUIDO' },
    erro_mensagem: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: 'boletos_caixa_remessa_itens',
    timestamps: true
  }
);
