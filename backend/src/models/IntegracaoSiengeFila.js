module.exports = (sequelize, DataTypes) => sequelize.define(
  'IntegracaoSiengeFila',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titulo_financeiro_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    origem_modulo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'FINANCEIRO'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDENTE'
    },
    tentativas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    enviado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ultimo_erro: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payload_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },
    response_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },
    external_title_id: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    external_creditor_id: {
      type: DataTypes.STRING(120),
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
    tableName: 'sienge_integracao_fila',
    timestamps: true
  }
);
