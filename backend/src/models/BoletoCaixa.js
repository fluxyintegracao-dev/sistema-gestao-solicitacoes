module.exports = (sequelize, DataTypes) => sequelize.define(
  'BoletoCaixa',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: false },
    convenio_id: { type: DataTypes.INTEGER, allowNull: false },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    parceiro_id: { type: DataTypes.INTEGER, allowNull: true },
    ambiente: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'TESTE' },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'GERADO' },
    status_bancario: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'NAO_REMETIDO' },
    nosso_numero: { type: DataTypes.STRING(30), allowNull: false },
    nosso_numero_base: { type: DataTypes.STRING(20), allowNull: false },
    linha_digitavel: { type: DataTypes.STRING(80), allowNull: false },
    codigo_barras: { type: DataTypes.STRING(44), allowNull: false },
    campo_livre: { type: DataTypes.STRING(25), allowNull: true },
    valor: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    data_emissao: { type: DataTypes.DATEONLY, allowNull: true },
    data_vencimento: { type: DataTypes.DATEONLY, allowNull: false },
    data_registro: { type: DataTypes.DATEONLY, allowNull: true },
    data_liquidacao: { type: DataTypes.DATEONLY, allowNull: true },
    data_baixa: { type: DataTypes.DATEONLY, allowNull: true },
    remessa_inclusao_id: { type: DataTypes.INTEGER, allowNull: true },
    retorno_confirmacao_id: { type: DataTypes.INTEGER, allowNull: true },
    retorno_liquidacao_id: { type: DataTypes.INTEGER, allowNull: true },
    ultimo_codigo_movimento: { type: DataTypes.STRING(10), allowNull: true },
    ultimo_motivo_ocorrencia: { type: DataTypes.STRING(255), allowNull: true },
    pdf_storage_key: { type: DataTypes.STRING(500), allowNull: true },
    criado_por: { type: DataTypes.INTEGER, allowNull: true },
    atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
  },
  {
    tableName: 'boletos_caixa',
    timestamps: true
  }
);
