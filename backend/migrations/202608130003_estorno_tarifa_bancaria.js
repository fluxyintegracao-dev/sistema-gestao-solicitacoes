'use strict';

const {
  columnExists,
  foreignKeyExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

const TABLE = 'movimentos_financeiros';
const COLUMN = 'movimento_origem_id';
const INDEX = 'idx_movimentos_financeiros_movimento_origem';
const FOREIGN_KEY = 'fk_movimentos_financeiros_movimento_origem';

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, TABLE))) return;

    if (!(await columnExists(sequelize, TABLE, COLUMN))) {
      await queryInterface.addColumn(TABLE, COLUMN, {
        type: DataTypes.INTEGER,
        allowNull: true,
        after: 'conciliacao_bancaria_id'
      });
    }

    if (!(await indexExists(sequelize, TABLE, INDEX))) {
      await queryInterface.addIndex(TABLE, [COLUMN], { name: INDEX });
    }

    if (!(await foreignKeyExists(sequelize, TABLE, FOREIGN_KEY))) {
      await queryInterface.addConstraint(TABLE, {
        fields: [COLUMN],
        type: 'foreign key',
        name: FOREIGN_KEY,
        references: { table: TABLE, field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });
    }
  },

  async down() {
    // Sem rollback destrutivo: o vinculo preserva a rastreabilidade financeira.
  }
};
