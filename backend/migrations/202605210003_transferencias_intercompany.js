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

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const tableName = 'transferencias_financeiras';
    const Sequelize = DataTypes;

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
      defaultValue: true
    });
    await addColumnIfMissing(queryInterface, sequelize, tableName, 'transferencia_interna', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await addIndexIfMissing(queryInterface, sequelize, tableName, ['intercompany_group_id'], 'idx_transferencias_intercompany_group');
    await addIndexIfMissing(queryInterface, sequelize, tableName, ['empresa_origem_id'], 'idx_transferencias_empresa_origem');
    await addIndexIfMissing(queryInterface, sequelize, tableName, ['empresa_destino_id'], 'idx_transferencias_empresa_destino');
    await addIndexIfMissing(queryInterface, sequelize, tableName, ['tipo_intercompany'], 'idx_transferencias_tipo_intercompany');
    await addIndexIfMissing(queryInterface, sequelize, tableName, ['elimina_consolidado'], 'idx_transferencias_elimina_consolidado');

    await addForeignKeyIfMissing(queryInterface, sequelize, tableName, 'empresa_origem_id', 'fk_transferencias_empresa_origem');
    await addForeignKeyIfMissing(queryInterface, sequelize, tableName, 'empresa_destino_id', 'fk_transferencias_empresa_destino');

    if (await tableExists(sequelize, tableName)) {
      await sequelize.query(`
        UPDATE transferencias_financeiras
           SET empresa_origem_id = COALESCE(empresa_origem_id, empresa_id),
               empresa_destino_id = COALESCE(empresa_destino_id, empresa_id),
               transferencia_interna = 1,
               elimina_consolidado = 1
         WHERE empresa_id IS NOT NULL
      `);
    }
  },

  async down({ queryInterface, sequelize }) {
    const tableName = 'transferencias_financeiras';

    for (const constraintName of ['fk_transferencias_empresa_destino', 'fk_transferencias_empresa_origem']) {
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
};
