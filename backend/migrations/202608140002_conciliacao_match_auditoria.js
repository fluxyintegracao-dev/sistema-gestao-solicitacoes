'use strict';

const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

const TABLE = 'conciliacoes_bancarias';

const COLUMNS = {
  match_inicial_tipo: { type: 'STRING', length: 30, after: 'status' },
  match_inicial_candidatos: { type: 'INTEGER', after: 'match_inicial_tipo' },
  match_inicial_movimento_id: { type: 'INTEGER', after: 'match_inicial_candidatos' },
  match_inicial_avaliado_em: { type: 'DATE', after: 'match_inicial_movimento_id' },
  resolucao_tipo: { type: 'STRING', length: 40, after: 'match_inicial_avaliado_em' }
};

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, TABLE))) return;

    for (const [name, definition] of Object.entries(COLUMNS)) {
      if (await columnExists(sequelize, TABLE, name)) continue;
      const type = definition.type === 'STRING'
        ? DataTypes.STRING(definition.length)
        : DataTypes[definition.type];
      await queryInterface.addColumn(TABLE, name, {
        type,
        allowNull: true,
        after: definition.after
      });
    }

    if (!(await indexExists(sequelize, TABLE, 'idx_conciliacao_match_inicial'))) {
      await queryInterface.addIndex(TABLE, ['match_inicial_tipo', 'createdAt'], {
        name: 'idx_conciliacao_match_inicial'
      });
    }
    if (!(await indexExists(sequelize, TABLE, 'idx_conciliacao_resolucao'))) {
      await queryInterface.addIndex(TABLE, ['resolucao_tipo', 'confirmado_em'], {
        name: 'idx_conciliacao_resolucao'
      });
    }
  },

  async down() {
    // Sem rollback destrutivo: os campos preservam a fotografia historica do match OFX.
  }
};
