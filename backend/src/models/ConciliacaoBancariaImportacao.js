module.exports = (sequelize, DataTypes) => sequelize.define(
  'ConciliacaoBancariaImportacao',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    conta_bancaria_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    arquivo_hash: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    arquivo_nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    total_lidos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    importados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    ignorados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'conciliacao_bancaria_importacoes',
    timestamps: true
  }
);
