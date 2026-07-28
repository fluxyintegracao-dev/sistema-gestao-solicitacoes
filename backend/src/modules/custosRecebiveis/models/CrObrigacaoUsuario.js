'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrObrigacaoUsuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: false },
  competencia: {
    type: DataTypes.STRING(7),
    allowNull: false,
    validate: { is: /^\d{4}-(0[1-9]|1[0-2])$/ }
  },
  tipo: { type: DataTypes.ENUM('CUSTO_PREVISTO', 'RECEITA_PREVISTA', 'MEDICAO_CONSOLIDADA'), allowNull: false },
  prazo_em: { type: DataTypes.DATE, allowNull: false },
  situacao: { type: DataTypes.ENUM('PENDENTE', 'CUMPRIDA', 'VENCIDA', 'DISPENSADA'), allowNull: false, defaultValue: 'PENDENTE' },
  cumprida_em: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'cr_obrigacoes_usuario',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_obrigacoes_usuario_obra_competencia_tipo', unique: true, fields: ['user_id', 'obra_id', 'competencia', 'tipo'] },
    { name: 'idx_cr_obrigacoes_situacao_prazo', fields: ['situacao', 'prazo_em'] }
  ]
});
