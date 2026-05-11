module.exports = (sequelize, DataTypes) => sequelize.define(
  'FaturaCartaoTitulo',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fatura_cartao_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    titulo_financeiro_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    }
  },
  {
    tableName: 'financeiro_fatura_titulos',
    timestamps: true
  }
);
