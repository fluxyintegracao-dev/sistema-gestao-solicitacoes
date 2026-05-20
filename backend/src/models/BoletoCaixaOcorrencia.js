module.exports = (sequelize, DataTypes) => sequelize.define(
  'BoletoCaixaOcorrencia',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    retorno_id: { type: DataTypes.INTEGER, allowNull: false },
    boleto_id: { type: DataTypes.INTEGER, allowNull: true },
    titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: true },
    nosso_numero_base: { type: DataTypes.STRING(20), allowNull: true },
    codigo_movimento: { type: DataTypes.STRING(2), allowNull: false },
    descricao_movimento: { type: DataTypes.STRING(160), allowNull: true },
    motivos: { type: DataTypes.TEXT, allowNull: true },
    segmento_t_json: { type: DataTypes.JSON, allowNull: true },
    segmento_u_json: { type: DataTypes.JSON, allowNull: true },
    data_ocorrencia: { type: DataTypes.DATEONLY, allowNull: true },
    data_credito: { type: DataTypes.DATEONLY, allowNull: true },
    valor_pago: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    valor_liquido: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    valor_tarifa: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    status_aplicacao: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PENDENTE' },
    erro_mensagem: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: 'boletos_caixa_ocorrencias',
    timestamps: true
  }
);
