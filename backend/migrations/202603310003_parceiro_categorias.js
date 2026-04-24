const {
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'parceiro_categorias'))) {
      await sequelize.query(`
        CREATE TABLE parceiro_categorias (
          id INT NOT NULL AUTO_INCREMENT,
          nome VARCHAR(120) NOT NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'parceiro_categoria_itens'))) {
      await sequelize.query(`
        CREATE TABLE parceiro_categoria_itens (
          id INT NOT NULL AUTO_INCREMENT,
          parceiro_id INT NOT NULL,
          parceiro_categoria_id INT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT fk_parceiro_categoria_itens_parceiro
            FOREIGN KEY (parceiro_id)
            REFERENCES parceiros(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE,
          CONSTRAINT fk_parceiro_categoria_itens_categoria
            FOREIGN KEY (parceiro_categoria_id)
            REFERENCES parceiro_categorias(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `);
    }

    if (!(await indexExists(sequelize, 'parceiro_categoria_itens', 'ux_parceiro_categoria_itens'))) {
      await sequelize.query(`
        CREATE UNIQUE INDEX ux_parceiro_categoria_itens
          ON parceiro_categoria_itens (parceiro_id, parceiro_categoria_id)
      `);
    }
  }
};
