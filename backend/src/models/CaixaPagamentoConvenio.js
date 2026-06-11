module.exports = (sequelize, DataTypes) => sequelize.define(
  'CaixaPagamentoConvenio',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    conta_bancaria_id: { type: DataTypes.INTEGER, allowNull: false },
    banco_codigo: { type: DataTypes.STRING(3), allowNull: false, defaultValue: '104' },
    banco_nome: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'CAIXA ECONOMICA FEDERAL' },
    agencia: { type: DataTypes.STRING(8), allowNull: false },
    agencia_dv: { type: DataTypes.STRING(2), allowNull: true },
    conta: { type: DataTypes.STRING(20), allowNull: false },
    conta_dv: { type: DataTypes.STRING(2), allowNull: true },
    convenio_codigo: { type: DataTypes.STRING(30), allowNull: false },
    convenio_nome: { type: DataTypes.STRING(160), allowNull: true },
    compromisso_codigo: { type: DataTypes.STRING(30), allowNull: true },
    compromisso_nome: { type: DataTypes.STRING(160), allowNull: true },
    empresa_nome: { type: DataTypes.STRING(160), allowNull: false },
    empresa_cpf_cnpj: { type: DataTypes.STRING(20), allowNull: false },
    layout_arquivo_versao: { type: DataTypes.STRING(3), allowNull: false, defaultValue: '080' },
    layout_lote_versao: { type: DataTypes.STRING(3), allowNull: false, defaultValue: '045' },
    ambiente: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'HOMOLOGACAO' },
    homologado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    numero_remessa_atual: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    criado_por: { type: DataTypes.INTEGER, allowNull: true },
    atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
  },
  {
    tableName: 'caixa_pagamento_convenios',
    timestamps: true
  }
);
