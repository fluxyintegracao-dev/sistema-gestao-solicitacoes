'use strict';

const {
  columnExists,
  foreignKeyExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

const TABLE = 'conciliacoes_bancarias';

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, TABLE))) return;

    const columns = [
      ['evento_bancario_tipo', { type: DataTypes.STRING(40), after: 'resolucao_tipo' }],
      ['estorno_status', { type: DataTypes.STRING(30), after: 'evento_bancario_tipo' }],
      ['estorno_conciliacao_origem_id', { type: DataTypes.INTEGER, after: 'estorno_status' }],
      ['estorno_candidatos', { type: DataTypes.INTEGER, after: 'estorno_conciliacao_origem_id' }],
      ['estorno_avaliado_em', { type: DataTypes.DATE, after: 'estorno_candidatos' }]
    ];

    for (const [name, definition] of columns) {
      if (!(await columnExists(sequelize, TABLE, name))) {
        await queryInterface.addColumn(TABLE, name, {
          type: definition.type,
          allowNull: true,
          after: definition.after
        });
      }
    }

    if (!(await indexExists(sequelize, TABLE, 'idx_conciliacao_estorno_alerta'))) {
      await queryInterface.addIndex(TABLE, ['estorno_status', 'data_movimento'], {
        name: 'idx_conciliacao_estorno_alerta'
      });
    }
    if (!(await indexExists(sequelize, TABLE, 'idx_conciliacao_estorno_origem'))) {
      await queryInterface.addIndex(TABLE, ['estorno_conciliacao_origem_id'], {
        name: 'idx_conciliacao_estorno_origem'
      });
    }
    if (!(await foreignKeyExists(sequelize, TABLE, 'fk_conciliacao_estorno_origem'))) {
      await queryInterface.addConstraint(TABLE, {
        fields: ['estorno_conciliacao_origem_id'],
        type: 'foreign key',
        name: 'fk_conciliacao_estorno_origem',
        references: { table: TABLE, field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });
    }
  },

  async down() {
    // Sem rollback destrutivo: os campos preservam a trilha de estornos bancarios.
  }
};
