module.exports = (sequelize, DataTypes) => sequelize.define('ChequeTerceiroMovimento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cheque_terceiro_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo_evento: { type: DataTypes.STRING(40), allowNull: false },
  status_anterior: { type: DataTypes.STRING(30), allowNull: true },
  status_novo: { type: DataTypes.STRING(30), allowNull: false },
  empresa_origem_id: { type: DataTypes.INTEGER, allowNull: true },
  empresa_destino_id: { type: DataTypes.INTEGER, allowNull: true },
  titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: true },
  movimento_financeiro_id: { type: DataTypes.INTEGER, allowNull: true },
  baixa_grupo_id: { type: DataTypes.INTEGER, allowNull: true },
  valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  data_evento: { type: DataTypes.DATEONLY, allowNull: false },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  metadata_json: { type: DataTypes.JSON, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'cheques_terceiros_movimentos',
  timestamps: true
});
