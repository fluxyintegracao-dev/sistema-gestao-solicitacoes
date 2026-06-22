const { columnExists, foreignKeyExists, indexExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const tabelaExiste = await tableExists(sequelize, 'apropriacoes');

    if (!tabelaExiste) {
      return;
    }

    if (!(await columnExists(sequelize, 'apropriacoes', 'somadora'))) {
      await queryInterface.addColumn('apropriacoes', 'somadora', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!(await columnExists(sequelize, 'apropriacoes', 'apropriacao_pai_id'))) {
      await queryInterface.addColumn('apropriacoes', 'apropriacao_pai_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (!(await indexExists(sequelize, 'apropriacoes', 'idx_apropriacoes_pai'))) {
      await queryInterface.addIndex('apropriacoes', ['apropriacao_pai_id'], {
        name: 'idx_apropriacoes_pai'
      });
    }

    if (!(await foreignKeyExists(sequelize, 'apropriacoes', 'fk_apropriacoes_pai'))) {
      await queryInterface.addConstraint('apropriacoes', {
        fields: ['apropriacao_pai_id'],
        type: 'foreign key',
        name: 'fk_apropriacoes_pai',
        references: {
          table: 'apropriacoes',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const tabelaExiste = await tableExists(sequelize, 'apropriacoes');

    if (!tabelaExiste) {
      return;
    }

    if (await foreignKeyExists(sequelize, 'apropriacoes', 'fk_apropriacoes_pai')) {
      await queryInterface.removeConstraint('apropriacoes', 'fk_apropriacoes_pai');
    }

    if (await indexExists(sequelize, 'apropriacoes', 'idx_apropriacoes_pai')) {
      await queryInterface.removeIndex('apropriacoes', 'idx_apropriacoes_pai');
    }

    if (await columnExists(sequelize, 'apropriacoes', 'apropriacao_pai_id')) {
      await queryInterface.removeColumn('apropriacoes', 'apropriacao_pai_id');
    }

    if (await columnExists(sequelize, 'apropriacoes', 'somadora')) {
      await queryInterface.removeColumn('apropriacoes', 'somadora');
    }
  }
};
