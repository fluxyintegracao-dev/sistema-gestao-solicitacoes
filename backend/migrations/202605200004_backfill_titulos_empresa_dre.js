const { columnExists, tableExists } = require('../src/database/schemaUtils');

async function canUseTable(sequelize, tableName, columns = []) {
  if (!(await tableExists(sequelize, tableName))) return false;

  for (const column of columns) {
    if (!(await columnExists(sequelize, tableName, column))) {
      return false;
    }
  }

  return true;
}

async function backfillEmpresaFromMovimentos(sequelize) {
  const canUseTitulos = await canUseTable(sequelize, 'titulos_financeiros', ['id', 'empresa_id']);
  const canUseMovimentos = await canUseTable(sequelize, 'movimentos_financeiros', [
    'titulo_financeiro_id',
    'empresa_id',
    'tipo_movimento',
    'status'
  ]);

  if (!canUseTitulos || !canUseMovimentos) return;

  await sequelize.query(
    `UPDATE titulos_financeiros tf
        JOIN (
          SELECT titulo_financeiro_id, MIN(empresa_id) AS empresa_id
            FROM movimentos_financeiros
           WHERE titulo_financeiro_id IS NOT NULL
             AND empresa_id IS NOT NULL
             AND tipo_movimento = 'BAIXA'
             AND status = 'ATIVO'
           GROUP BY titulo_financeiro_id
        ) mv ON mv.titulo_financeiro_id = tf.id
        SET tf.empresa_id = mv.empresa_id,
            tf.updatedAt = CURRENT_TIMESTAMP
      WHERE tf.empresa_id IS NULL`
  );
}

async function backfillEmpresaFromObras(sequelize, obrasTableName) {
  const canUseTitulos = await canUseTable(sequelize, 'titulos_financeiros', ['obra_id', 'empresa_id']);
  const canUseObras = await canUseTable(sequelize, obrasTableName, ['id', 'empresa_grupo_id']);

  if (!canUseTitulos || !canUseObras) return;

  await sequelize.query(
    `UPDATE titulos_financeiros tf
        JOIN \`${obrasTableName}\` o ON o.id = tf.obra_id
        SET tf.empresa_id = o.empresa_grupo_id,
            tf.updatedAt = CURRENT_TIMESTAMP
      WHERE tf.empresa_id IS NULL
        AND o.empresa_grupo_id IS NOT NULL`
  );
}

module.exports = {
  async up({ sequelize }) {
    await backfillEmpresaFromMovimentos(sequelize);
    await backfillEmpresaFromObras(sequelize, 'Obras');
    await backfillEmpresaFromObras(sequelize, 'obras');
  },

  async down() {
    // Backfill operacional: nao removemos empresa_id para nao apagar vinculos corrigidos.
  }
};
