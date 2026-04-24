module.exports = (sequelize, DataTypes) => sequelize.define(
  'IntegracaoSiengeMapeamento',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    entidade_tipo: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    entidade_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    external_id: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    metadata_json: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: 'sienge_integracao_mapeamentos',
    timestamps: true
  }
);
