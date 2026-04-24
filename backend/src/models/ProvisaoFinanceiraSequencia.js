module.exports = (sequelize, DataTypes) => sequelize.define(
  'ProvisaoFinanceiraSequencia',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    obra_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    ultimo_numero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'provisao_financeira_sequencias',
    timestamps: true
  }
);
