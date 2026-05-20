const {
  columnExists,
  foreignKeyExists,
  indexExists
} = require('../src/database/schemaUtils');

async function dropForeignKeysForColumn(sequelize, tableName, columnName, referencedTableName = null) {
  const referencedFilter = referencedTableName
    ? `AND REFERENCED_TABLE_NAME = ${sequelize.escape(referencedTableName)}`
    : '';

  const [rows] = await sequelize.query(`
    SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ${sequelize.escape(tableName)}
       AND COLUMN_NAME = ${sequelize.escape(columnName)}
       AND REFERENCED_TABLE_NAME IS NOT NULL
       ${referencedFilter}
  `);

  for (const row of rows || []) {
    const constraintName = String(row.CONSTRAINT_NAME || '').replace(/`/g, '``');
    if (constraintName) {
      await sequelize.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${constraintName}\``);
    }
  }
}

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'Obras', 'tipo_centro_custo'))) {
      await sequelize.query(`
        ALTER TABLE Obras
        ADD COLUMN tipo_centro_custo VARCHAR(30) NOT NULL DEFAULT 'OBRA'
        COMMENT 'OBRA quando o cadastro representa obra executiva; CENTRO_CUSTO para areas administrativas ou centros nao construtivos'
      `);
    }

    if (!(await indexExists(sequelize, 'Obras', 'idx_obras_tipo_centro_custo'))) {
      await sequelize.query('CREATE INDEX idx_obras_tipo_centro_custo ON Obras (tipo_centro_custo)');
    }

    if (!(await columnExists(sequelize, 'titulos_financeiros', 'apropriacao_id'))) {
      await sequelize.query(`
        ALTER TABLE titulos_financeiros
        ADD COLUMN apropriacao_id INT NULL AFTER obra_id
      `);
    }

    if (!(await indexExists(sequelize, 'titulos_financeiros', 'idx_titulos_financeiros_apropriacao_id'))) {
      await sequelize.query('CREATE INDEX idx_titulos_financeiros_apropriacao_id ON titulos_financeiros (apropriacao_id)');
    }

    if (!(await foreignKeyExists(sequelize, 'titulos_financeiros', 'fk_titulos_financeiros_apropriacao'))) {
      await sequelize.query(`
        ALTER TABLE titulos_financeiros
        ADD CONSTRAINT fk_titulos_financeiros_apropriacao
        FOREIGN KEY (apropriacao_id) REFERENCES apropriacoes(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
      `);
    }

    if (!(await columnExists(sequelize, 'fiscal_document_links', 'apropriacao_id'))) {
      await sequelize.query(`
        ALTER TABLE fiscal_document_links
        ADD COLUMN apropriacao_id INT NULL AFTER centro_custo_id
      `);
    }

    await sequelize.query(`
      UPDATE fiscal_document_links link
      JOIN apropriacoes apropriacao ON apropriacao.id = link.centro_custo_id
         SET link.apropriacao_id = link.centro_custo_id,
             link.centro_custo_id = COALESCE(link.obra_id, apropriacao.obra_id)
       WHERE link.centro_custo_id IS NOT NULL
    `);

    await dropForeignKeysForColumn(sequelize, 'fiscal_document_links', 'centro_custo_id', 'apropriacoes');

    if (!(await indexExists(sequelize, 'fiscal_document_links', 'idx_fiscal_document_links_centro_custo_id'))) {
      await sequelize.query('CREATE INDEX idx_fiscal_document_links_centro_custo_id ON fiscal_document_links (centro_custo_id)');
    }

    if (!(await indexExists(sequelize, 'fiscal_document_links', 'idx_fiscal_document_links_apropriacao_id'))) {
      await sequelize.query('CREATE INDEX idx_fiscal_document_links_apropriacao_id ON fiscal_document_links (apropriacao_id)');
    }

    if (!(await foreignKeyExists(sequelize, 'fiscal_document_links', 'fk_fiscal_document_links_apropriacao'))) {
      await sequelize.query(`
        ALTER TABLE fiscal_document_links
        ADD CONSTRAINT fk_fiscal_document_links_apropriacao
        FOREIGN KEY (apropriacao_id) REFERENCES apropriacoes(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'fiscal_document_links', 'fk_fiscal_document_links_centro_custo'))) {
      await sequelize.query(`
        ALTER TABLE fiscal_document_links
        ADD CONSTRAINT fk_fiscal_document_links_centro_custo
        FOREIGN KEY (centro_custo_id) REFERENCES Obras(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
      `);
    }
  }
};
