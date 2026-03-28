module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ArquivoModelo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pagina_codigo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    nome_original: {
      type: DataTypes.STRING,
      allowNull: false
    },
    arquivo_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    mimetype: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tamanho_bytes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    criado_por_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'arquivos_modelos',
    timestamps: true
  });
};
