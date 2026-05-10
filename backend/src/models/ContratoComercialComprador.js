module.exports = (sequelize, DataTypes) => sequelize.define(
  'ContratoComercialComprador',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contrato_comercial_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    parceiro_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ordem: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    principal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    percentual_participacao: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: true
    }
  },
  {
    tableName: 'contrato_comercial_compradores',
    timestamps: true
  }
);
