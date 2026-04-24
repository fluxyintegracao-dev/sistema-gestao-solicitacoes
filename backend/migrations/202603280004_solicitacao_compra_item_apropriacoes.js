const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'solicitacao_compra_item_apropriacoes'))) {
      await sequelize.query(`
        CREATE TABLE solicitacao_compra_item_apropriacoes (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          solicitacao_compra_item_id INT NOT NULL,
          apropriacao_id INT NOT NULL,
          quantidade_apropriada DECIMAL(12,4) NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_sc_item_aprop_item FOREIGN KEY (solicitacao_compra_item_id) REFERENCES solicitacao_compra_itens(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_sc_item_aprop_aprop FOREIGN KEY (apropriacao_id) REFERENCES apropriacoes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          UNIQUE KEY uq_sc_item_aprop_item_aprop (solicitacao_compra_item_id, apropriacao_id),
          KEY idx_sc_item_aprop_item (solicitacao_compra_item_id),
          KEY idx_sc_item_aprop_aprop (apropriacao_id)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'solicitacao_compra_item_manual_apropriacoes'))) {
      await sequelize.query(`
        CREATE TABLE solicitacao_compra_item_manual_apropriacoes (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          solicitacao_compra_item_manual_id INT NOT NULL,
          apropriacao_id INT NOT NULL,
          quantidade_apropriada DECIMAL(12,4) NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_sc_item_man_aprop_item FOREIGN KEY (solicitacao_compra_item_manual_id) REFERENCES solicitacao_compra_itens_manuais(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_sc_item_man_aprop_aprop FOREIGN KEY (apropriacao_id) REFERENCES apropriacoes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          UNIQUE KEY uq_sc_item_man_aprop_item_aprop (solicitacao_compra_item_manual_id, apropriacao_id),
          KEY idx_sc_item_man_aprop_item (solicitacao_compra_item_manual_id),
          KEY idx_sc_item_man_aprop_aprop (apropriacao_id)
        )
      `);
    }

    await sequelize.query(`
      INSERT INTO solicitacao_compra_item_apropriacoes (
        solicitacao_compra_item_id,
        apropriacao_id,
        quantidade_apropriada,
        createdAt,
        updatedAt
      )
      SELECT
        item.id,
        item.apropriacao_id,
        item.quantidade,
        COALESCE(item.createdAt, NOW()),
        COALESCE(item.updatedAt, NOW())
      FROM solicitacao_compra_itens item
      LEFT JOIN solicitacao_compra_item_apropriacoes rateio
        ON rateio.solicitacao_compra_item_id = item.id
       AND rateio.apropriacao_id = item.apropriacao_id
      WHERE item.apropriacao_id IS NOT NULL
        AND rateio.id IS NULL
    `);

    await sequelize.query(`
      INSERT INTO solicitacao_compra_item_manual_apropriacoes (
        solicitacao_compra_item_manual_id,
        apropriacao_id,
        quantidade_apropriada,
        createdAt,
        updatedAt
      )
      SELECT
        item.id,
        item.apropriacao_id,
        item.quantidade,
        COALESCE(item.createdAt, NOW()),
        COALESCE(item.updatedAt, NOW())
      FROM solicitacao_compra_itens_manuais item
      LEFT JOIN solicitacao_compra_item_manual_apropriacoes rateio
        ON rateio.solicitacao_compra_item_manual_id = item.id
       AND rateio.apropriacao_id = item.apropriacao_id
      WHERE item.apropriacao_id IS NOT NULL
        AND rateio.id IS NULL
    `);
  }
};
