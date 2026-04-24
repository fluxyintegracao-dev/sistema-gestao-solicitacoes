const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'conciliacao_bancaria_importacoes'))) {
      await sequelize.query(`
        CREATE TABLE conciliacao_bancaria_importacoes (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          conta_bancaria_id INT NOT NULL,
          arquivo_hash VARCHAR(64) NOT NULL,
          arquivo_nome VARCHAR(255) NOT NULL,
          total_lidos INT NOT NULL DEFAULT 0,
          importados INT NOT NULL DEFAULT 0,
          ignorados INT NOT NULL DEFAULT 0,
          criado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_conciliacao_importacoes_conta FOREIGN KEY (conta_bancaria_id) REFERENCES contas_bancarias(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_conciliacao_importacoes_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uk_conciliacao_importacoes_hash (conta_bancaria_id, arquivo_hash),
          KEY idx_conciliacao_importacoes_conta (conta_bancaria_id),
          KEY idx_conciliacao_importacoes_createdAt (createdAt)
        )
      `);
    }
  }
};
