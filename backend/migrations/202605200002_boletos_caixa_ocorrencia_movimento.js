const { columnExists, foreignKeyExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, options) {
  if (await tableExists(sequelize, tableName) && !(await indexExists(sequelize, tableName, options.name))) {
    await queryInterface.addIndex(tableName, fields, options);
  }
}

async function addForeignKeyIfPossible(queryInterface, sequelize, tableName, columnName, references, name, onDelete = 'SET NULL') {
  if (!(await tableExists(sequelize, tableName)) || !(await tableExists(sequelize, references.table))) {
    return;
  }

  if (!(await foreignKeyExists(sequelize, tableName, name))) {
    await queryInterface.addConstraint(tableName, {
      fields: [columnName],
      type: 'foreign key',
      name,
      references,
      onDelete,
      onUpdate: 'CASCADE'
    });
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    if (!(await tableExists(sequelize, 'boletos_caixa_ocorrencias'))) {
      return;
    }

    if (!(await columnExists(sequelize, 'boletos_caixa_ocorrencias', 'movimento_financeiro_id'))) {
      await queryInterface.addColumn('boletos_caixa_ocorrencias', 'movimento_financeiro_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        after: 'titulo_financeiro_id'
      });
    }

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'boletos_caixa_ocorrencias',
      ['movimento_financeiro_id'],
      { name: 'idx_boletos_caixa_ocorrencias_movimento' }
    );

    await addForeignKeyIfPossible(
      queryInterface,
      sequelize,
      'boletos_caixa_ocorrencias',
      'movimento_financeiro_id',
      { table: 'movimentos_financeiros', field: 'id' },
      'fk_boletos_caixa_ocorrencias_movimento'
    );
  },

  async down({ queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'boletos_caixa_ocorrencias'))) {
      return;
    }

    if (await foreignKeyExists(sequelize, 'boletos_caixa_ocorrencias', 'fk_boletos_caixa_ocorrencias_movimento')) {
      await queryInterface.removeConstraint('boletos_caixa_ocorrencias', 'fk_boletos_caixa_ocorrencias_movimento');
    }

    if (await columnExists(sequelize, 'boletos_caixa_ocorrencias', 'movimento_financeiro_id')) {
      await queryInterface.removeColumn('boletos_caixa_ocorrencias', 'movimento_financeiro_id');
    }
  }
};
