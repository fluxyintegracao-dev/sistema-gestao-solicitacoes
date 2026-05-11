module.exports = (sequelize, DataTypes) => sequelize.define(
  'CartaoFinanceiro',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    titular: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    bandeira: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    ultimos_digitos: {
      type: DataTypes.STRING(4),
      allowNull: false
    },
    conta_bancaria_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    dia_fechamento: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    dia_vencimento: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    observacoes: {
      type: DataTypes.TEXT,
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
    tableName: 'financeiro_cartoes',
    timestamps: true
  }
);
