module.exports = (sequelize, DataTypes) => sequelize.define(
  'ContaBancaria',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    banco: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    agencia: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    conta: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    tipo_conta: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    atualizado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'contas_bancarias',
    timestamps: true
  }
);
