const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

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

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const Sequelize = DataTypes;

    await addColumnIfMissing(queryInterface, sequelize, 'empresas_grupo', 'tipo_gerencial', {
      type: Sequelize.STRING(40),
      allowNull: false,
      defaultValue: 'OPERACIONAL'
    });
    await addColumnIfMissing(queryInterface, sequelize, 'empresas_grupo', 'empresa_caixa', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, sequelize, 'empresas_grupo', 'empresa_operacional', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'empresas_grupo', 'consolidar_no_grupo', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'empresas_grupo', 'elimina_intercompany', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await addIndexIfMissing(queryInterface, sequelize, 'empresas_grupo', ['tipo_gerencial'], 'idx_empresas_grupo_tipo_gerencial');
    await addIndexIfMissing(queryInterface, sequelize, 'empresas_grupo', ['consolidar_no_grupo'], 'idx_empresas_grupo_consolidar');
    await addIndexIfMissing(queryInterface, sequelize, 'empresas_grupo', ['empresa_caixa'], 'idx_empresas_grupo_empresa_caixa');

    if (await tableExists(sequelize, 'empresas_grupo')) {
      await sequelize.query(`
        UPDATE empresas_grupo
           SET tipo_gerencial = CASE
                 WHEN tipo_empresa = 'HOLDING' THEN 'HOLDING'
                 WHEN tipo_gerencial IS NULL OR tipo_gerencial = '' THEN 'OPERACIONAL'
                 ELSE tipo_gerencial
               END,
               empresa_operacional = CASE
                 WHEN tipo_empresa = 'HOLDING' THEN 0
                 ELSE empresa_operacional
               END,
               consolidar_no_grupo = COALESCE(consolidar_no_grupo, 1),
               elimina_intercompany = COALESCE(elimina_intercompany, 1),
               empresa_caixa = COALESCE(empresa_caixa, 0)
      `);
    }
  },

  async down({ queryInterface, sequelize }) {
    const removals = [
      ['empresas_grupo', 'elimina_intercompany'],
      ['empresas_grupo', 'consolidar_no_grupo'],
      ['empresas_grupo', 'empresa_operacional'],
      ['empresas_grupo', 'empresa_caixa'],
      ['empresas_grupo', 'tipo_gerencial']
    ];

    for (const [tableName, columnName] of removals) {
      if (await tableExists(sequelize, tableName) && await columnExists(sequelize, tableName, columnName)) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    }
  }
};
