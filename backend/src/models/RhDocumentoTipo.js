module.exports = (sequelize, DataTypes) => sequelize.define(
  'RhDocumentoTipo',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    nome: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    tipo_vinculo: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    obrigatorio: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    exige_validade: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'rh_documentos_tipos',
    timestamps: true
  }
);
