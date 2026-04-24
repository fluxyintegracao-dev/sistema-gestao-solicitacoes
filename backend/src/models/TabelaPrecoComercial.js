module.exports = (sequelize, DataTypes) => sequelize.define(
  'TabelaPrecoComercial',
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
    codigo: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    nome: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'RASCUNHO'
    },
    vigencia_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    vigencia_fim: {
      type: DataTypes.DATEONLY,
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
    tableName: 'tabelas_precos_comerciais',
    timestamps: true
  }
);
