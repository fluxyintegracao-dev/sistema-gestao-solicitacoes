module.exports = (sequelize, DataTypes) => sequelize.define(
  'SolicitacaoProvisao',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    solicitacao_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    provisao_financeira_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tipo_vinculo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'PLANEJADO'
    },
    origem: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'MANUAL'
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    usuario_vinculo_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'solicitacao_provisao',
    timestamps: true,
    paranoid: true
  }
);
