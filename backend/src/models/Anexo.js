module.exports = (sequelize, DataTypes) => {
  const Anexo = sequelize.define('Anexo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    solicitacao_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    tipo: {
      type: DataTypes.STRING,
      allowNull: false
    },

    nome_original: {
      type: DataTypes.STRING,
      allowNull: false
    },

    caminho_arquivo: {
      type: DataTypes.STRING,
      allowNull: false
    },

    area_origem: {
      type: DataTypes.STRING,
      allowNull: false
    },

    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }

  }, {
    tableName: 'anexos',
    timestamps: true
  });

  return Anexo;
};
