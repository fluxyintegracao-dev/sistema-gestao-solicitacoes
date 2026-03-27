module.exports = (sequelize, DataTypes) => {
  const FornecedorCompra = sequelize.define(
    'FornecedorCompra',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false
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
