const { columnExists, indexExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'titulos_financeiros', 'forma_cobranca'))) {
      await sequelize.query(`
        ALTER TABLE titulos_financeiros
        ADD COLUMN forma_cobranca VARCHAR(30) NULL
        AFTER numero_documento
      `);
    }

    if (!(await columnExists(sequelize, 'titulos_financeiros', 'status_cobranca'))) {
      await sequelize.query(`
        ALTER TABLE titulos_financeiros
        ADD COLUMN status_cobranca VARCHAR(30) NOT NULL DEFAULT 'NAO_APLICAVEL'
        AFTER forma_cobranca
      `);
    }

    if (!(await columnExists(sequelize, 'titulos_financeiros', 'banco_cobranca'))) {
      await sequelize.query(`
        ALTER TABLE titulos_financeiros
        ADD COLUMN banco_cobranca VARCHAR(120) NULL
        AFTER status_cobranca
      `);
    }

    if (!(await columnExists(sequelize, 'titulos_financeiros', 'nosso_numero'))) {
      await sequelize.query(`
        ALTER TABLE titulos_financeiros
        ADD COLUMN nosso_numero VARCHAR(120) NULL
        AFTER banco_cobranca
      `);
    }

    if (!(await columnExists(sequelize, 'titulos_financeiros', 'linha_digitavel'))) {
      await sequelize.query(`
        ALTER TABLE titulos_financeiros
        ADD COLUMN linha_digitavel VARCHAR(255) NULL
        AFTER nosso_numero
      `);
    }

    if (!(await columnExists(sequelize, 'titulos_financeiros', 'codigo_barras'))) {
      await sequelize.query(`
        ALTER TABLE titulos_financeiros
        ADD COLUMN codigo_barras VARCHAR(255) NULL
        AFTER linha_digitavel
      `);
    }

    if (!(await columnExists(sequelize, 'titulos_financeiros', 'identificador_externo'))) {
      await sequelize.query(`
        ALTER TABLE titulos_financeiros
        ADD COLUMN identificador_externo VARCHAR(120) NULL
        AFTER codigo_barras
      `);
    }

    if (!(await columnExists(sequelize, 'titulos_financeiros', 'boleto_emitido_em'))) {
      await sequelize.query(`
        ALTER TABLE titulos_financeiros
        ADD COLUMN boleto_emitido_em DATE NULL
        AFTER identificador_externo
      `);
    }

    if (!(await indexExists(sequelize, 'titulos_financeiros', 'idx_titulos_financeiros_status_cobranca'))) {
      await sequelize.query(`
        CREATE INDEX idx_titulos_financeiros_status_cobranca
        ON titulos_financeiros (status_cobranca)
      `);
    }

    if (!(await indexExists(sequelize, 'titulos_financeiros', 'idx_titulos_financeiros_nosso_numero'))) {
      await sequelize.query(`
        CREATE INDEX idx_titulos_financeiros_nosso_numero
        ON titulos_financeiros (nosso_numero)
      `);
    }

    if (!(await indexExists(sequelize, 'titulos_financeiros', 'idx_titulos_financeiros_identificador_externo'))) {
      await sequelize.query(`
        CREATE INDEX idx_titulos_financeiros_identificador_externo
        ON titulos_financeiros (identificador_externo)
      `);
    }
  },

  async down({ sequelize }) {
    if (await indexExists(sequelize, 'titulos_financeiros', 'idx_titulos_financeiros_identificador_externo')) {
      await sequelize.query('DROP INDEX idx_titulos_financeiros_identificador_externo ON titulos_financeiros');
    }

    if (await indexExists(sequelize, 'titulos_financeiros', 'idx_titulos_financeiros_nosso_numero')) {
      await sequelize.query('DROP INDEX idx_titulos_financeiros_nosso_numero ON titulos_financeiros');
    }

    if (await indexExists(sequelize, 'titulos_financeiros', 'idx_titulos_financeiros_status_cobranca')) {
      await sequelize.query('DROP INDEX idx_titulos_financeiros_status_cobranca ON titulos_financeiros');
    }

    if (await columnExists(sequelize, 'titulos_financeiros', 'boleto_emitido_em')) {
      await sequelize.query('ALTER TABLE titulos_financeiros DROP COLUMN boleto_emitido_em');
    }

    if (await columnExists(sequelize, 'titulos_financeiros', 'identificador_externo')) {
      await sequelize.query('ALTER TABLE titulos_financeiros DROP COLUMN identificador_externo');
    }

    if (await columnExists(sequelize, 'titulos_financeiros', 'codigo_barras')) {
      await sequelize.query('ALTER TABLE titulos_financeiros DROP COLUMN codigo_barras');
    }

    if (await columnExists(sequelize, 'titulos_financeiros', 'linha_digitavel')) {
      await sequelize.query('ALTER TABLE titulos_financeiros DROP COLUMN linha_digitavel');
    }

    if (await columnExists(sequelize, 'titulos_financeiros', 'nosso_numero')) {
      await sequelize.query('ALTER TABLE titulos_financeiros DROP COLUMN nosso_numero');
    }

    if (await columnExists(sequelize, 'titulos_financeiros', 'banco_cobranca')) {
      await sequelize.query('ALTER TABLE titulos_financeiros DROP COLUMN banco_cobranca');
    }

    if (await columnExists(sequelize, 'titulos_financeiros', 'status_cobranca')) {
      await sequelize.query('ALTER TABLE titulos_financeiros DROP COLUMN status_cobranca');
    }

    if (await columnExists(sequelize, 'titulos_financeiros', 'forma_cobranca')) {
      await sequelize.query('ALTER TABLE titulos_financeiros DROP COLUMN forma_cobranca');
    }
  }
};
