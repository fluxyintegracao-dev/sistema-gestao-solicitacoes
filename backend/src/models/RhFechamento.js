module.exports = (sequelize, DataTypes) => sequelize.define(
  'RhFechamento',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    apuracao_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    categoria_financeira_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'FECHADO'
    },
    data_fechamento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    data_vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    total_titulos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_valor: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resumo_json: {
      type: DataTypes.JSON,
      allowNull: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    atualizado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'rh_fechamentos',
    timestamps: true
  }
);
