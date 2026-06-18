const { columnExists, foreignKeyExists, tableExists } = require('../src/database/schemaUtils');

async function getColumnForeignKeys(sequelize, tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [tableName, columnName] }
  );

  return rows || [];
}

async function alignEmpresaGrupoFk({
  queryInterface,
  sequelize,
  tableName,
  constraintName,
  columnName = 'empresa_grupo_id',
  onDelete = 'RESTRICT'
}) {
  if (
    !(await tableExists(sequelize, tableName)) ||
    !(await columnExists(sequelize, tableName, columnName)) ||
    !(await tableExists(sequelize, 'empresas_grupo'))
  ) {
    return;
  }

  const foreignKeys = await getColumnForeignKeys(sequelize, tableName, columnName);
  const hasCorrectFk = foreignKeys.some((fk) => fk.REFERENCED_TABLE_NAME === 'empresas_grupo');

  for (const fk of foreignKeys) {
    if (fk.REFERENCED_TABLE_NAME !== 'empresas_grupo') {
      await queryInterface.removeConstraint(tableName, fk.CONSTRAINT_NAME);
    }
  }

  if (!hasCorrectFk && !(await foreignKeyExists(sequelize, tableName, constraintName))) {
    await queryInterface.addConstraint(tableName, {
      fields: [columnName],
      type: 'foreign key',
      name: constraintName,
      references: {
        table: 'empresas_grupo',
        field: 'id'
      },
      onDelete,
      onUpdate: 'CASCADE'
    });
  }
}

module.exports = {
  async up({ queryInterface, sequelize }) {
    await alignEmpresaGrupoFk({
      queryInterface,
      sequelize,
      tableName: 'rh_colaboradores',
      constraintName: 'fk_rh_colaboradores_empresa_grupo'
    });

    await alignEmpresaGrupoFk({
      queryInterface,
      sequelize,
      tableName: 'rh_importacoes',
      constraintName: 'fk_rh_importacoes_empresa_grupo'
    });

    await alignEmpresaGrupoFk({
      queryInterface,
      sequelize,
      tableName: 'rh_apuracoes',
      constraintName: 'fk_rh_apuracoes_empresa_grupo'
    });
  }
};
