module.exports = (sequelize, DataTypes) => {
  const Obra = sequelize.define('Obra', {
    codigo: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    cidade: {
      type: DataTypes.STRING,
      allowNull: true
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    tipo_centro_custo: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'OBRA'
    },
    classificacao: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null
    },
    vgv: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
      defaultValue: null
    },
    planilha_geral: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
      defaultValue: null
    },
    margem_custo_esperada: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null
    }
  });

  return Obra;
};
