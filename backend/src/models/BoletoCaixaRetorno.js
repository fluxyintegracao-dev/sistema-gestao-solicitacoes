module.exports = (sequelize, DataTypes) => sequelize.define(
  'BoletoCaixaRetorno',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    convenio_id: { type: DataTypes.INTEGER, allowNull: false },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    remessa_id: { type: DataTypes.INTEGER, allowNull: true },
    nome_arquivo: { type: DataTypes.STRING(160), allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'IMPORTADO' },
    arquivo_hash: { type: DataTypes.STRING(128), allowNull: false },
    arquivo_storage_key: { type: DataTypes.STRING(500), allowNull: true },
    quantidade_registros: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    quantidade_ocorrencias: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    valor_liquidado: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    processado_por: { type: DataTypes.INTEGER, allowNull: true },
    processado_em: { type: DataTypes.DATE, allowNull: true },
    erro_mensagem: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: 'boletos_caixa_retornos',
    timestamps: true
  }
);
