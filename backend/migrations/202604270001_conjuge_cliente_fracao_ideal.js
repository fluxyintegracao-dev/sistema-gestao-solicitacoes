const { columnExists, foreignKeyExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize, DataTypes, queryInterface }) {
    if (await tableExists(sequelize, 'parceiros')) {
      if (!(await columnExists(sequelize, 'parceiros', 'conjuge_parceiro_id'))) {
        await queryInterface.addColumn('parceiros', 'conjuge_parceiro_id', {
          type: DataTypes.INTEGER,
          allowNull: true
        });
      }

      if (!(await foreignKeyExists(sequelize, 'parceiros', 'fk_parceiros_conjuge_parceiro'))) {
        await queryInterface.addConstraint('parceiros', {
          fields: ['conjuge_parceiro_id'],
          type: 'foreign key',
          name: 'fk_parceiros_conjuge_parceiro',
          references: {
            table: 'parceiros',
            field: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        });
      }
    }

    if (
      (await tableExists(sequelize, 'unidades_comerciais')) &&
      !(await columnExists(sequelize, 'unidades_comerciais', 'fracao_ideal'))
    ) {
      await queryInterface.addColumn('unidades_comerciais', 'fracao_ideal', {
        type: DataTypes.DECIMAL(12, 6),
        allowNull: true,
        after: 'metragem_privativa'
      });
    }
  },

  async down({ sequelize, queryInterface }) {
    if (await tableExists(sequelize, 'parceiros')) {
      if (await foreignKeyExists(sequelize, 'parceiros', 'fk_parceiros_conjuge_parceiro')) {
        await queryInterface.removeConstraint('parceiros', 'fk_parceiros_conjuge_parceiro');
      }

      if (await columnExists(sequelize, 'parceiros', 'conjuge_parceiro_id')) {
        await queryInterface.removeColumn('parceiros', 'conjuge_parceiro_id');
      }
    }

    if (
      (await tableExists(sequelize, 'unidades_comerciais')) &&
      (await columnExists(sequelize, 'unidades_comerciais', 'fracao_ideal'))
    ) {
      await queryInterface.removeColumn('unidades_comerciais', 'fracao_ideal');
    }
  }
};
