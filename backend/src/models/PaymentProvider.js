module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentProvider',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    ambiente: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'HOMOLOGACAO'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    config_ref: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    tableName: 'payment_providers',
    timestamps: true
  }
);
