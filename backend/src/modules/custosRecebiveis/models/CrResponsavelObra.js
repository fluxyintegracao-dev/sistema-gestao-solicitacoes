'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrResponsavelObra', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  papel: { type: DataTypes.ENUM('RESPONSAVEL', 'SUBSTITUTO'), allowNull: false },
  competencia_inicial: {
    type: DataTypes.STRING(7),
    allowNull: false,
    validate: { is: /^\d{4}-(0[1-9]|1[0-2])$/ }
  },
  vigencia_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  vigencia_fim: { type: DataTypes.DATEONLY, allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'cr_responsaveis_obra',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_responsaveis_vigencia', unique: true, fields: ['obra_id', 'user_id', 'papel', 'vigencia_inicio'] },
    { name: 'idx_cr_responsaveis_usuario_ativo', fields: ['user_id', 'ativo'] }
  ],
  validate: {
    vigenciaValida() {
      if (this.vigencia_fim && this.vigencia_inicio && this.vigencia_fim < this.vigencia_inicio) {
        throw new Error('vigencia_fim deve ser igual ou posterior a vigencia_inicio');
      }
    }
  }
});
