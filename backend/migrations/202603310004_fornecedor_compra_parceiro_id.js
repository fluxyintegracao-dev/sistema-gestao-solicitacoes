const {
  columnExists,
  foreignKeyExists,
  indexExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'fornecedores_compra', 'parceiro_id'))) {
      await sequelize.query(`
        ALTER TABLE fornecedores_compra
        ADD COLUMN parceiro_id INT NULL
        AFTER id
      `);
    }

    if (!(await indexExists(sequelize, 'fornecedores_compra', 'idx_fornecedor_compra_parceiro_id'))) {
      await sequelize.query(`
        CREATE INDEX idx_fornecedor_compra_parceiro_id
          ON fornecedores_compra (parceiro_id)
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'fornecedores_compra', 'fk_fornecedor_compra_parceiro'))) {
      await sequelize.query(`
        ALTER TABLE fornecedores_compra
        ADD CONSTRAINT fk_fornecedor_compra_parceiro
          FOREIGN KEY (parceiro_id)
          REFERENCES parceiros(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
      `);
    }
  }
};
