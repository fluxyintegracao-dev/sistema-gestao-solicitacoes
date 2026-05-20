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

async function addForeignKeyIfMissing(queryInterface, sequelize, tableName, field, reference, name, onDelete = 'SET NULL') {
  if (
    await tableExists(sequelize, tableName) &&
    await columnExists(sequelize, tableName, field) &&
    !(await foreignKeyExists(sequelize, tableName, name))
  ) {
    await queryInterface.addConstraint(tableName, {
      fields: [field],
      type: 'foreign key',
      name,
      references: reference,
      onDelete,
      onUpdate: 'CASCADE'
    });
  }
}

async function removeForeignKeyIfExists(queryInterface, sequelize, tableName, name) {
  if (await tableExists(sequelize, tableName) && await foreignKeyExists(sequelize, tableName, name)) {
    await queryInterface.removeConstraint(tableName, name);
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const Sequelize = DataTypes;

    await addColumnIfMissing(queryInterface, sequelize, 'empresas_grupo', 'tipo_empresa', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'OPERACIONAL'
    });

    await addColumnIfMissing(queryInterface, sequelize, 'empresas_grupo', 'holding_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addIndexIfMissing(queryInterface, sequelize, 'empresas_grupo', ['tipo_empresa'], 'idx_empresas_grupo_tipo_empresa');
    await addIndexIfMissing(queryInterface, sequelize, 'empresas_grupo', ['holding_id'], 'idx_empresas_grupo_holding_id');

    await addForeignKeyIfMissing(
      queryInterface,
      sequelize,
      'empresas_grupo',
      'holding_id',
      { table: 'empresas_grupo', field: 'id' },
      'fk_empresas_grupo_holding',
      'SET NULL'
    );

    await addColumnIfMissing(queryInterface, sequelize, 'Obras', 'empresa_grupo_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'obras', 'empresa_grupo_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addIndexIfMissing(queryInterface, sequelize, 'Obras', ['empresa_grupo_id'], 'idx_obras_empresa_grupo_id');
    await addIndexIfMissing(queryInterface, sequelize, 'obras', ['empresa_grupo_id'], 'idx_obras_empresa_grupo_id');

    await addForeignKeyIfMissing(
      queryInterface,
      sequelize,
      'Obras',
      'empresa_grupo_id',
      { table: 'empresas_grupo', field: 'id' },
      'fk_obras_empresa_grupo',
      'SET NULL'
    );
    await addForeignKeyIfMissing(
      queryInterface,
      sequelize,
      'obras',
      'empresa_grupo_id',
      { table: 'empresas_grupo', field: 'id' },
      'fk_obras_lower_empresa_grupo',
      'SET NULL'
    );

    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'competencia_data', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'considera_dre', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'intercompany', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, sequelize, 'titulos_financeiros', 'empresa_contraparte_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addIndexIfMissing(queryInterface, sequelize, 'titulos_financeiros', ['competencia_data'], 'idx_titulos_competencia_data');
    await addIndexIfMissing(queryInterface, sequelize, 'titulos_financeiros', ['considera_dre'], 'idx_titulos_considera_dre');
    await addIndexIfMissing(queryInterface, sequelize, 'titulos_financeiros', ['intercompany'], 'idx_titulos_intercompany');
    await addIndexIfMissing(queryInterface, sequelize, 'titulos_financeiros', ['empresa_contraparte_id'], 'idx_titulos_empresa_contraparte');

    await addForeignKeyIfMissing(
      queryInterface,
      sequelize,
      'titulos_financeiros',
      'empresa_contraparte_id',
      { table: 'empresas_grupo', field: 'id' },
      'fk_titulos_empresa_contraparte',
      'SET NULL'
    );

    await addColumnIfMissing(queryInterface, sequelize, 'categorias_financeiras', 'dre_grupo', {
      type: Sequelize.STRING(80),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'categorias_financeiras', 'dre_subgrupo', {
      type: Sequelize.STRING(120),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'categorias_financeiras', 'dre_ordem', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'categorias_financeiras', 'considera_dre', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await addIndexIfMissing(queryInterface, sequelize, 'categorias_financeiras', ['dre_grupo'], 'idx_categorias_financeiras_dre_grupo');
    await addIndexIfMissing(queryInterface, sequelize, 'categorias_financeiras', ['considera_dre'], 'idx_categorias_financeiras_considera_dre');
  },

  async down({ queryInterface, sequelize }) {
    await removeForeignKeyIfExists(queryInterface, sequelize, 'titulos_financeiros', 'fk_titulos_empresa_contraparte');
    await removeForeignKeyIfExists(queryInterface, sequelize, 'Obras', 'fk_obras_empresa_grupo');
    await removeForeignKeyIfExists(queryInterface, sequelize, 'obras', 'fk_obras_lower_empresa_grupo');
    await removeForeignKeyIfExists(queryInterface, sequelize, 'empresas_grupo', 'fk_empresas_grupo_holding');

    const removals = [
      ['categorias_financeiras', 'considera_dre'],
      ['categorias_financeiras', 'dre_ordem'],
      ['categorias_financeiras', 'dre_subgrupo'],
      ['categorias_financeiras', 'dre_grupo'],
      ['titulos_financeiros', 'empresa_contraparte_id'],
      ['titulos_financeiros', 'intercompany'],
      ['titulos_financeiros', 'considera_dre'],
      ['titulos_financeiros', 'competencia_data'],
      ['Obras', 'empresa_grupo_id'],
      ['obras', 'empresa_grupo_id'],
      ['empresas_grupo', 'holding_id'],
      ['empresas_grupo', 'tipo_empresa']
    ];

    for (const [tableName, columnName] of removals) {
      if (await tableExists(sequelize, tableName) && await columnExists(sequelize, tableName, columnName)) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    }
  }
};
