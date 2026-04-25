module.exports = (sequelize, DataTypes) => sequelize.define(
  'ContratoComercialModelo',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    empreendimento_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tipo_documento: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'CONTRATO'
    },
    nome: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    arquivo_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    arquivo_nome: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    arquivo_mime: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    variaveis_json: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    d4sign_safe_uuid: {
      type: DataTypes.STRING(120),
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
    tableName: 'contrato_comercial_modelos',
    timestamps: true
  }
);
