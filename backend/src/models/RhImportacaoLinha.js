module.exports = (sequelize, DataTypes) => sequelize.define(
  'RhImportacaoLinha',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    importacao_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    numero_linha: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    colaborador_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    matricula_ref: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    cpf_ref: {
      type: DataTypes.STRING(14),
      allowNull: true
    },
    nome_ref: {
      type: DataTypes.STRING(180),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'VALIDA'
    },
    payload_json: {
      type: DataTypes.JSON,
      allowNull: true
    },
    erro_mensagem: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'rh_importacao_linhas',
    timestamps: true
  }
);
