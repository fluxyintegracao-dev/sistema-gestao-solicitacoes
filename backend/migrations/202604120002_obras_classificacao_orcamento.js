const { columnExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'Obras', 'classificacao'))) {
      await sequelize.query(`
        ALTER TABLE Obras
        ADD COLUMN classificacao VARCHAR(20) NULL DEFAULT NULL
      `);
    }

    if (!(await columnExists(sequelize, 'Obras', 'vgv'))) {
      await sequelize.query(`
        ALTER TABLE Obras
        ADD COLUMN vgv DECIMAL(14,2) NULL DEFAULT NULL
      `);
    }

    if (!(await columnExists(sequelize, 'Obras', 'planilha_geral'))) {
      await sequelize.query(`
        ALTER TABLE Obras
        ADD COLUMN planilha_geral DECIMAL(14,2) NULL DEFAULT NULL
      `);
    }

    if (!(await columnExists(sequelize, 'Obras', 'margem_custo_esperada'))) {
      await sequelize.query(`
        ALTER TABLE Obras
        ADD COLUMN margem_custo_esperada DECIMAL(5,2) NULL DEFAULT NULL
        COMMENT 'Percentual de 0 a 100. Orcamento = valor_referencia * (margem / 100)'
      `);
    }
  }
};
