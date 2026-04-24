const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    await sequelize.query('ALTER TABLE parceiros MODIFY COLUMN telefone VARCHAR(50) NULL');

    if (!(await tableExists(sequelize, 'rh_fechamentos'))) {
      await sequelize.query(`
        CREATE TABLE rh_fechamentos (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          apuracao_id INT NOT NULL,
          categoria_financeira_id INT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'FECHADO',
          data_fechamento DATE NOT NULL,
          data_vencimento DATE NOT NULL,
          total_titulos INT NOT NULL DEFAULT 0,
          total_valor DECIMAL(14,2) NOT NULL DEFAULT 0,
          observacoes TEXT NULL,
          resumo_json JSON NULL,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_rh_fechamentos_apuracao FOREIGN KEY (apuracao_id) REFERENCES rh_apuracoes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_rh_fechamentos_categoria FOREIGN KEY (categoria_financeira_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_fechamentos_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_fechamentos_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uq_rh_fechamentos_apuracao (apuracao_id),
          KEY idx_rh_fechamentos_status (status),
          KEY idx_rh_fechamentos_vencimento (data_vencimento)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'rh_fechamento_titulos'))) {
      await sequelize.query(`
        CREATE TABLE rh_fechamento_titulos (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          fechamento_id INT NOT NULL,
          apuracao_evento_id INT NOT NULL,
          titulo_financeiro_id INT NOT NULL,
          parceiro_id INT NOT NULL,
          valor_gerado DECIMAL(14,2) NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_rh_fechamento_titulos_fechamento FOREIGN KEY (fechamento_id) REFERENCES rh_fechamentos(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_rh_fechamento_titulos_item FOREIGN KEY (apuracao_evento_id) REFERENCES rh_apuracao_eventos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_rh_fechamento_titulos_titulo FOREIGN KEY (titulo_financeiro_id) REFERENCES titulos_financeiros(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_rh_fechamento_titulos_parceiro FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          UNIQUE KEY uq_rh_fechamento_titulos_item (apuracao_evento_id),
          UNIQUE KEY uq_rh_fechamento_titulos_titulo (titulo_financeiro_id),
          KEY idx_rh_fechamento_titulos_fechamento (fechamento_id),
          KEY idx_rh_fechamento_titulos_parceiro (parceiro_id)
        )
      `);
    }
  }
};
