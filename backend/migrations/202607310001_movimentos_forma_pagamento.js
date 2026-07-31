'use strict';

const {
  columnExists,
  foreignKeyExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

const TABLE = 'movimentos_financeiros';
const COLUMN = 'forma_pagamento_id';
const INDEX = 'idx_movimentos_financeiros_forma_pagamento';
const FOREIGN_KEY = 'fk_movimentos_financeiros_forma_pagamento';

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, TABLE))) return;

    if (!(await columnExists(sequelize, TABLE, COLUMN))) {
      await queryInterface.addColumn(TABLE, COLUMN, {
        type: DataTypes.INTEGER,
        allowNull: true
      });
    }
    if (!(await indexExists(sequelize, TABLE, INDEX))) {
      await queryInterface.addIndex(TABLE, [COLUMN], { name: INDEX });
    }
    if (
      await tableExists(sequelize, 'financeiro_formas_pagamento')
      && !(await foreignKeyExists(sequelize, TABLE, FOREIGN_KEY))
    ) {
      await queryInterface.addConstraint(TABLE, {
        fields: [COLUMN],
        type: 'foreign key',
        name: FOREIGN_KEY,
        references: { table: 'financeiro_formas_pagamento', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down({ queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, TABLE))) return;
    if (await foreignKeyExists(sequelize, TABLE, FOREIGN_KEY)) {
      await queryInterface.removeConstraint(TABLE, FOREIGN_KEY);
    }
    if (await indexExists(sequelize, TABLE, INDEX)) {
      await queryInterface.removeIndex(TABLE, INDEX);
    }
    if (await columnExists(sequelize, TABLE, COLUMN)) {
      await queryInterface.removeColumn(TABLE, COLUMN);
    }
  }
};
