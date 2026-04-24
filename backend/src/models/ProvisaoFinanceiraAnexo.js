module.exports = (sequelize, DataTypes) => sequelize.define(
  'ProvisaoFinanceiraAnexo',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    provisao_financeira_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nome_original: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    caminho_arquivo: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'ANEXO'
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    area_origem: {
      type: DataTypes.STRING(80),
      allowNull: true
    }
  },
  {
    tableName: 'provisao_financeira_anexos',
    timestamps: true
  }
);
