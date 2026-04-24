module.exports = (sequelize, DataTypes) => sequelize.define(
  'ContratoComercialEvento',
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
    tipo_evento: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    data_evento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    metadata_json: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'contratos_comerciais_eventos',
    timestamps: true
  }
);
