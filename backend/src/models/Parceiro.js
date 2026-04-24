module.exports = (sequelize, DataTypes) => {
  const Parceiro = sequelize.define(
    'Parceiro',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      cpf_cnpj: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
      },
      nome: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      telefone: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      endereco: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      numero: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      bairro: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      cep: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      municipio: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      estado: {
        type: DataTypes.STRING(2),
        allowNull: true
      },
      tipo_pessoa: {
        type: DataTypes.STRING(1),
        allowNull: false
      },
      cliente: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      fornecedor: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      corretor: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'parceiros',
      timestamps: true
    }
  );

  return Parceiro;
};
