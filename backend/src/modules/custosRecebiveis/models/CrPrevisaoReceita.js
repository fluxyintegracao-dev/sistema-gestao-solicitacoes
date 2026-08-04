'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrPrevisaoReceita', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  competencia_id: { type: DataTypes.INTEGER, allowNull: false },
  origem: { type: DataTypes.ENUM('MEDICAO', 'CONTRATO'), allowNull: false },
  plano_item_id: { type: DataTypes.INTEGER, allowNull: true },
  previsao_custo_id: { type: DataTypes.INTEGER, allowNull: true },
  contrato_parcela_id: { type: DataTypes.INTEGER, allowNull: true },
  titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: true },
  quantidade_prevista: { type: DataTypes.DECIMAL(18, 4), allowNull: true },
  valor_previsto: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
  data_prevista: { type: DataTypes.DATEONLY, allowNull: true }
}, {
  tableName: 'cr_previsoes_receita',
  timestamps: true,
  indexes: [
    { name: 'idx_cr_previsoes_receita_origem', fields: ['competencia_id', 'origem'] },
    { name: 'uq_cr_receitas_previsao_custo', unique: true, fields: ['competencia_id', 'previsao_custo_id', 'origem'] },
    { name: 'idx_cr_previsoes_receita_parcela', fields: ['contrato_parcela_id'] },
    { name: 'idx_cr_previsoes_receita_titulo', fields: ['titulo_financeiro_id'] }
  ],
  validate: {
    referenciaCompativelComOrigem() {
      if (this.origem === 'MEDICAO' && !this.plano_item_id && !this.previsao_custo_id) {
        throw new Error('Receita de medicao exige item do plano ou subitem de custo');
      }
      if (this.origem === 'CONTRATO' && !this.contrato_parcela_id && !this.titulo_financeiro_id) {
        throw new Error('Receita contratual exige parcela ou titulo financeiro');
      }
    }
  }
});
