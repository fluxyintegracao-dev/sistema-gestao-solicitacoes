module.exports = (sequelize, DataTypes) => sequelize.define(
  'Empreendimento',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    obra_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    codigo: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    nome: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    endereco: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    numero: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    bairro: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    cidade: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING(2),
      allowNull: true
    },
    cep: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'empreendimentos',
    timestamps: true
  }
);
