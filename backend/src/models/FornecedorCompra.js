module.exports = (sequelize, DataTypes) => {
  const FornecedorCompra = sequelize.define(
    'FornecedorCompra',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      parceiro_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false
      },
      cnpj: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      whatsapp: {
        type: DataTypes.STRING,
        allowNull: true
      },
      contato: {
        type: DataTypes.STRING,
        allowNull: true
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      categoria_insumos: {
        type: DataTypes.JSON,
        allowNull: true
      },
      cidade: {
        type: DataTypes.STRING(150),
        allowNull: true
      },
      estado: {
        type: DataTypes.STRING(2),
        allowNull: true
      },
      cep: {
        type: DataTypes.STRING(10),
        allowNull: true
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'fornecedores_compra',
      timestamps: true
    }
  );

  return FornecedorCompra;
};
