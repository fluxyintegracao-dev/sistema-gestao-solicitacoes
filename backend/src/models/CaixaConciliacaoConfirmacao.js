module.exports = (sequelize, DataTypes) => sequelize.define(
  'CaixaConciliacaoConfirmacao',
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
    data_referencia: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    total_movimentos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_conciliados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_ignorados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    confirmado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    confirmado_em: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'financeiro_caixa_conciliacao_confirmacoes',
    timestamps: true
  }
);
