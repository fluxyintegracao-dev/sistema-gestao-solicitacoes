const {
  columnExists,
  foreignKeyExists,
  indexExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'contratos_comerciais', 'corretor_parceiro_id'))) {
      await sequelize.query(`
        ALTER TABLE contratos_comerciais
        ADD COLUMN corretor_parceiro_id INT NULL AFTER parceiro_id
      `);
    }

    if (!(await columnExists(sequelize, 'contratos_comerciais', 'categoria_financeira_comissao_id'))) {
      await sequelize.query(`
        ALTER TABLE contratos_comerciais
        ADD COLUMN categoria_financeira_comissao_id INT NULL AFTER categoria_financeira_id
      `);
    }

    if (!(await columnExists(sequelize, 'contratos_comerciais', 'titulo_financeiro_comissao_id'))) {
      await sequelize.query(`
        ALTER TABLE contratos_comerciais
        ADD COLUMN titulo_financeiro_comissao_id INT NULL AFTER categoria_financeira_comissao_id
      `);
    }

    if (!(await indexExists(sequelize, 'contratos_comerciais', 'idx_contratos_comerciais_corretor'))) {
      await sequelize.query(`
        CREATE INDEX idx_contratos_comerciais_corretor
        ON contratos_comerciais (corretor_parceiro_id)
      `);
    }

    if (!(await indexExists(sequelize, 'contratos_comerciais', 'idx_contratos_comerciais_categoria_comissao'))) {
      await sequelize.query(`
        CREATE INDEX idx_contratos_comerciais_categoria_comissao
        ON contratos_comerciais (categoria_financeira_comissao_id)
      `);
    }

    if (!(await indexExists(sequelize, 'contratos_comerciais', 'idx_contratos_comerciais_titulo_comissao'))) {
      await sequelize.query(`
        CREATE INDEX idx_contratos_comerciais_titulo_comissao
        ON contratos_comerciais (titulo_financeiro_comissao_id)
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'contratos_comerciais', 'fk_contratos_comerciais_corretor_parceiro'))) {
      await sequelize.query(`
        ALTER TABLE contratos_comerciais
        ADD CONSTRAINT fk_contratos_comerciais_corretor_parceiro
        FOREIGN KEY (corretor_parceiro_id) REFERENCES parceiros(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'contratos_comerciais', 'fk_contratos_comerciais_categoria_comissao'))) {
      await sequelize.query(`
        ALTER TABLE contratos_comerciais
        ADD CONSTRAINT fk_contratos_comerciais_categoria_comissao
        FOREIGN KEY (categoria_financeira_comissao_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'contratos_comerciais', 'fk_contratos_comerciais_titulo_comissao'))) {
      await sequelize.query(`
        ALTER TABLE contratos_comerciais
        ADD CONSTRAINT fk_contratos_comerciais_titulo_comissao
        FOREIGN KEY (titulo_financeiro_comissao_id) REFERENCES titulos_financeiros(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }
  }
};
