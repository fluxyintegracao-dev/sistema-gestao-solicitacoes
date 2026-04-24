module.exports = (sequelize, DataTypes) => sequelize.define(
  'IntegracaoSiengeConfig',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    base_url_override: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    endpoint_titulos: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    documento_padrao_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    indexador_padrao_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    auto_vincular_credor_busca_exata: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    auto_cadastrar_credor_quando_ausente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    timeout_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20000
    },
    max_tentativas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    payload_defaults_json: {
      type: DataTypes.JSON,
      allowNull: true
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
    tableName: 'sienge_integracao_config',
    timestamps: true
  }
);
