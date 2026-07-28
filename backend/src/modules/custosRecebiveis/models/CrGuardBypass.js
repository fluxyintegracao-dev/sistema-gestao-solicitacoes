'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrGuardBypass', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  motivo: { type: DataTypes.TEXT, allowNull: false },
  concedido_por: { type: DataTypes.INTEGER, allowNull: false },
  concedido_em: { type: DataTypes.DATE, allowNull: false },
  expira_em: { type: DataTypes.DATE, allowNull: false },
  revogado_por: { type: DataTypes.INTEGER, allowNull: true },
  revogado_em: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'cr_guard_bypass',
  timestamps: true,
  indexes: [
    { name: 'idx_cr_guard_bypass_escopo_expiracao', fields: ['user_id', 'obra_id', 'expira_em'] }
  ],
  validate: {
    concessaoValida() {
      if (Number(this.user_id) === Number(this.concedido_por)) {
        throw new Error('Bypass nao pode ser concedido pelo proprio usuario');
      }
      if (this.expira_em && this.concedido_em && this.expira_em <= this.concedido_em) {
        throw new Error('expira_em deve ser posterior a concedido_em');
      }
    }
  }
});
