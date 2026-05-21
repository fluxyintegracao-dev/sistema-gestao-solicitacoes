const { columnExists, foreignKeyExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (await tableExists(sequelize, tableName) && !(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name) {
  if (await tableExists(sequelize, tableName) && !(await indexExists(sequelize, tableName, name))) {
    await queryInterface.addIndex(tableName, fields, { name });
  }
}

async function addForeignKeyIfMissing(queryInterface, sequelize, tableName, field, name) {
  if (
    await tableExists(sequelize, tableName) &&
    await columnExists(sequelize, tableName, field) &&
    !(await foreignKeyExists(sequelize, tableName, name))
  ) {
    await queryInterface.addConstraint(tableName, {
      fields: [field],
      type: 'foreign key',
      name,
      references: { table: 'empresas_grupo', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  }
}

async function addIntercompanyColumns(queryInterface, sequelize, Sequelize, tableName) {
  await addColumnIfMissing(queryInterface, sequelize, tableName, 'intercompany_group_id', {
    type: Sequelize.STRING(80),
    allowNull: true
  });
  await addColumnIfMissing(queryInterface, sequelize, tableName, 'empresa_origem_id', {
    type: Sequelize.INTEGER,
    allowNull: true
  });
  await addColumnIfMissing(queryInterface, sequelize, tableName, 'empresa_destino_id', {
    type: Sequelize.INTEGER,
    allowNull: true
  });
  await addColumnIfMissing(queryInterface, sequelize, tableName, 'tipo_intercompany', {
    type: Sequelize.STRING(40),
    allowNull: true
  });
  await addColumnIfMissing(queryInterface, sequelize, tableName, 'motivo_intercompany', {
    type: Sequelize.STRING(255),
    allowNull: true
  });
  await addColumnIfMissing(queryInterface, sequelize, tableName, 'elimina_consolidado', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });
  await addColumnIfMissing(queryInterface, sequelize, tableName, 'transferencia_interna', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  await addIndexIfMissing(queryInterface, sequelize, tableName, ['intercompany_group_id'], `idx_${tableName}_intercompany_group`);
  await addIndexIfMissing(queryInterface, sequelize, tableName, ['empresa_origem_id'], `idx_${tableName}_empresa_origem`);
  await addIndexIfMissing(queryInterface, sequelize, tableName, ['empresa_destino_id'], `idx_${tableName}_empresa_destino`);
  await addIndexIfMissing(queryInterface, sequelize, tableName, ['tipo_intercompany'], `idx_${tableName}_tipo_intercompany`);
  await addIndexIfMissing(queryInterface, sequelize, tableName, ['elimina_consolidado'], `idx_${tableName}_elimina_consolidado`);

  await addForeignKeyIfMissing(queryInterface, sequelize, tableName, 'empresa_origem_id', `fk_${tableName}_empresa_origem`);
  await addForeignKeyIfMissing(queryInterface, sequelize, tableName, 'empresa_destino_id', `fk_${tableName}_empresa_destino`);
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const Sequelize = DataTypes;

    await addIntercompanyColumns(queryInterface, sequelize, Sequelize, 'titulos_financeiros');
    await addIntercompanyColumns(queryInterface, sequelize, Sequelize, 'movimentos_financeiros');

    if (await tableExists(sequelize, 'titulos_financeiros')) {
      await sequelize.query(`
        UPDATE titulos_financeiros
           SET elimina_consolidado = CASE WHEN intercompany = 1 THEN 1 ELSE elimina_consolidado END,
               transferencia_interna = CASE WHEN intercompany = 1 THEN 1 ELSE transferencia_interna END
         WHERE intercompany = 1
      `);
    }
  },

  async down({ queryInterface, sequelize }) {
    const tables = ['movimentos_financeiros', 'titulos_financeiros'];

    for (const tableName of tables) {
      for (const constraintName of [`fk_${tableName}_empresa_destino`, `fk_${tableName}_empresa_origem`]) {
        if (await tableExists(sequelize, tableName) && await foreignKeyExists(sequelize, tableName, constraintName)) {
          await queryInterface.removeConstraint(tableName, constraintName);
        }
      }

      for (const columnName of [
        'transferencia_interna',
        'elimina_consolidado',
        'motivo_intercompany',
        'tipo_intercompany',
        'empresa_destino_id',
        'empresa_origem_id',
        'intercompany_group_id'
      ]) {
        if (await tableExists(sequelize, tableName) && await columnExists(sequelize, tableName, columnName)) {
          await queryInterface.removeColumn(tableName, columnName);
        }
      }
    }
  }
};
