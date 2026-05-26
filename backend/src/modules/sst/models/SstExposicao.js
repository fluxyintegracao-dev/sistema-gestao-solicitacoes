'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstExposicao', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
  ambiente_id: { type: DataTypes.INTEGER, allowNull: true },
  risco_id: { type: DataTypes.INTEGER, allowNull: true },
  agente_nocivo_id: { type: DataTypes.INTEGER, allowNull: true },
  data_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  data_fim: { type: DataTypes.DATEONLY, allowNull: true },
  atividade_desempenhada: { type: DataTypes.TEXT, allowNull: true },
  codigo_agente_nocivo: { type: DataTypes.STRING(30), allowNull: true },
  descricao_agente_nocivo: { type: DataTypes.STRING(180), allowNull: true },
  intensidade: { type: DataTypes.STRING(60), allowNull: true },
  unidade_medida: { type: DataTypes.STRING(30), allowNull: true },
  tecnica_medicao: { type: DataTypes.STRING(160), allowNull: true },
  limite_tolerancia: { type: DataTypes.STRING(80), allowNull: true },
  utiliza_epc: { type: DataTypes.BOOLEAN, allowNull: true },
  epc_eficaz: { type: DataTypes.BOOLEAN, allowNull: true },
  utiliza_epi: { type: DataTypes.BOOLEAN, allowNull: true },
  epi_eficaz: { type: DataTypes.BOOLEAN, allowNull: true },
  epi_ca: { type: DataTypes.STRING(60), allowNull: true },
  responsavel_tecnico_nome: { type: DataTypes.STRING(160), allowNull: true },
  responsavel_tecnico_cpf: { type: DataTypes.STRING(14), allowNull: true },
  responsavel_tecnico_registro: { type: DataTypes.STRING(40), allowNull: true },
  responsavel_tecnico_orgao: { type: DataTypes.STRING(40), allowNull: true },
  responsavel_tecnico_uf: { type: DataTypes.STRING(2), allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ATIVA' },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_exposicoes',
  timestamps: true
});
