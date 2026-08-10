'use strict';

const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    const table = 'baixas_financeiras_componentes';
    if (!(await tableExists(sequelize, table))) return;

    if (!(await columnExists(sequelize, table, 'empresa_id'))) {
      await queryInterface.addColumn(table, 'empresa_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'empresas_grupo', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });
    }

    await sequelize.query(`
      UPDATE baixas_financeiras_componentes c
      INNER JOIN baixas_financeiras_grupos g ON g.id = c.baixa_grupo_id
      LEFT JOIN contas_bancarias cb ON cb.id = c.conta_bancaria_id
      LEFT JOIN cheques_terceiros ch ON ch.id = c.cheque_terceiro_id
      LEFT JOIN financeiro_cartoes fc ON fc.id = c.cartao_id
      LEFT JOIN contas_bancarias cbc ON cbc.id = fc.conta_bancaria_id
      SET c.empresa_id = COALESCE(c.empresa_id, cb.empresa_id, ch.empresa_id, cbc.empresa_id, g.empresa_id)
      WHERE c.empresa_id IS NULL
    `);

    await queryInterface.changeColumn(table, 'empresa_id', {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'empresas_grupo', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    if (!(await indexExists(sequelize, table, 'idx_baixa_componente_empresa'))) {
      await queryInterface.addIndex(table, ['empresa_id'], { name: 'idx_baixa_componente_empresa' });
    }
  },

  async down() {
    // Sem rollback destrutivo: a empresa da fonte integra a trilha financeira da baixa.
  }
};
