module.exports = (sequelize, DataTypes) => {
  const Setor = sequelize.define(
    'Setor',
    {
      nome: {
        type: DataTypes.STRING,
        allowNull: false
      },

    codigo: {
      type: DataTypes.STRING,
      allowNull: false
    },

      ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },

      eh_setor_obra: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },

      eh_setor_financeiro: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },

      eh_setor_compras: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },

      eh_setor_geo: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },

      eh_setor_administrativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      tableName: 'setores',
      timestamps: true
    }
  );

  return Setor;
};
