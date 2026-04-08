module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProvisaoFinanceira', {
    codigo: {
      type: DataTypes.STRING,
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
      type: DataTypes.STRING,
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
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'previsto'
    },
    prioridade: {
      type: DataTypes.STRING,
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
  }, {
    tableName: 'provisoes_financeiras',
    timestamps: true,
    paranoid: true
  });
};
