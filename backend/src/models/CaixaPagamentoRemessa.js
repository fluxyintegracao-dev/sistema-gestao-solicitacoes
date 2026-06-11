module.exports = (sequelize, DataTypes) => sequelize.define(
  'CaixaPagamentoRemessa',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    convenio_id: { type: DataTypes.INTEGER, allowNull: false },
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    conta_bancaria_id: { type: DataTypes.INTEGER, allowNull: false },
    numero_remessa: { type: DataTypes.INTEGER, allowNull: false },
    nome_arquivo: { type: DataTypes.STRING(160), allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'GERADA' },
    tipo_pagamento: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'BOLETO_CODIGO_BARRAS' },
    quantidade_titulos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    quantidade_registros: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    valor_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    data_pagamento: { type: DataTypes.DATEONLY, allowNull: false },
    cnab_hash: { type: DataTypes.STRING(128), allowNull: false },
    conteudo_cnab: { type: DataTypes.TEXT('medium'), allowNull: false },
    homologacao: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    gerado_por: { type: DataTypes.INTEGER, allowNull: true },
    gerado_em: { type: DataTypes.DATE, allowNull: true },
    enviado_em: { type: DataTypes.DATE, allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: 'caixa_pagamento_remessas',
    timestamps: true
  }
);
