module.exports = (sequelize, DataTypes) => sequelize.define(
  'ContratoComercialDocumento',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contrato_comercial_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    modelo_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tipo_documento: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    nome: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'GERADO'
    },
    arquivo_docx_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    arquivo_pdf_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    d4sign_uuid_documento: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    d4sign_safe_uuid: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    d4sign_status: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    d4sign_enviado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    d4sign_finalizado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    d4sign_payload_json: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    erro: {
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
    tableName: 'contrato_comercial_documentos',
    timestamps: true
  }
);
