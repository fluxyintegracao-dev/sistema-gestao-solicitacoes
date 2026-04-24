module.exports = (sequelize, DataTypes) => sequelize.define(
  'ProvisaoFinanceira',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true
    },
    obra_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    categoria_macro_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    fornecedor_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    fornecedor_texto: {
      type: DataTypes.STRING(180),
      allowNull: true
    },
    data_prevista_desembolso: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    valor_previsto: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'previsto'
    },
    prioridade: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    usuario_criacao_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    usuario_atualizacao_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    aprovado_por_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    aprovado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelado_por_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cancelado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    realizado_em: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'provisoes_financeiras',
    timestamps: true,
    paranoid: true
  }
);
