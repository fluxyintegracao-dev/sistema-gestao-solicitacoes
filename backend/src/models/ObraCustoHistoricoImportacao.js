module.exports = (sequelize, DataTypes) => sequelize.define(
  'ObraCustoHistoricoImportacao',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    arquivo_hash: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    arquivo_nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'CONFIRMADA'
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
    duplicados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    erros: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    valor_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'obra_custo_historico_importacoes',
    timestamps: true
  }
);
