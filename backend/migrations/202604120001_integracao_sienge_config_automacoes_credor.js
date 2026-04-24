const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'sienge_integracao_config'))) {
      return;
    }

    if (!(await columnExists(sequelize, 'sienge_integracao_config', 'auto_vincular_credor_busca_exata'))) {
      await sequelize.query(`
        ALTER TABLE sienge_integracao_config
        ADD COLUMN auto_vincular_credor_busca_exata TINYINT(1) NOT NULL DEFAULT 0
        AFTER indexador_padrao_id
      `);
    }

    if (!(await columnExists(sequelize, 'sienge_integracao_config', 'auto_cadastrar_credor_quando_ausente'))) {
      await sequelize.query(`
        ALTER TABLE sienge_integracao_config
        ADD COLUMN auto_cadastrar_credor_quando_ausente TINYINT(1) NOT NULL DEFAULT 0
        AFTER auto_vincular_credor_busca_exata
      `);
    }
  }
};
