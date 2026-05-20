module.exports = (sequelize, DataTypes) => sequelize.define(
  'BoletoCaixaRemessa',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    convenio_id: { type: DataTypes.INTEGER, allowNull: false },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    numero_remessa: { type: DataTypes.INTEGER, allowNull: false },
    nome_arquivo: { type: DataTypes.STRING(160), allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'GERADA' },
    quantidade_boletos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    quantidade_registros: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    valor_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    cnab_hash: { type: DataTypes.STRING(128), allowNull: false },
    arquivo_storage_key: { type: DataTypes.STRING(500), allowNull: true },
    homologacao: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    gerado_por: { type: DataTypes.INTEGER, allowNull: true },
    gerado_em: { type: DataTypes.DATE, allowNull: true },
    enviado_em: { type: DataTypes.DATE, allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: 'boletos_caixa_remessas',
    timestamps: true
  }
);
