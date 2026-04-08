module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProvisaoFinanceiraAnexo', {
    provisao_financeira_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nome_original: {
      type: DataTypes.STRING,
      allowNull: false
    },
    caminho_arquivo: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ANEXO'
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    area_origem: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'provisao_financeira_anexos',
    timestamps: true
  });
};
