module.exports = (sequelize, DataTypes) => sequelize.define(
  'BoletoCaixaConvenio',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    conta_bancaria_id: { type: DataTypes.INTEGER, allowNull: true },
    banco_codigo: { type: DataTypes.STRING(3), allowNull: false, defaultValue: '104' },
    banco_nome: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'CAIXA ECONOMICA FEDERAL' },
    agencia: { type: DataTypes.STRING(5), allowNull: false },
    agencia_dv: { type: DataTypes.STRING(2), allowNull: true },
    conta: { type: DataTypes.STRING(12), allowNull: true },
    conta_dv: { type: DataTypes.STRING(2), allowNull: true },
    agencia_conta_dv: { type: DataTypes.STRING(2), allowNull: true },
    codigo_beneficiario: { type: DataTypes.STRING(7), allowNull: false },
    beneficiario_nome: { type: DataTypes.STRING(160), allowNull: false },
    beneficiario_cpf_cnpj: { type: DataTypes.STRING(20), allowNull: false },
    beneficiario_endereco: { type: DataTypes.STRING(255), allowNull: true },
    carteira_codigo: { type: DataTypes.STRING(2), allowNull: false, defaultValue: '1' },
    modalidade_nosso_numero: { type: DataTypes.STRING(2), allowNull: false, defaultValue: '14' },
    layout_arquivo_versao: { type: DataTypes.STRING(3), allowNull: false, defaultValue: '081' },
    layout_lote_versao: { type: DataTypes.STRING(3), allowNull: false, defaultValue: '067' },
    tipo_emissao_boleto: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'BENEFICIARIO' },
    tipo_entrega_boleto: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'BENEFICIARIO' },
    ambiente: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'TESTE' },
    homologado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    numero_remessa_atual: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    local_pagamento: { type: DataTypes.STRING(255), allowNull: true },
    instrucao_padrao: { type: DataTypes.TEXT, allowNull: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    criado_por: { type: DataTypes.INTEGER, allowNull: true },
    atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
  },
  {
    tableName: 'boletos_caixa_convenios',
    timestamps: true
  }
);
