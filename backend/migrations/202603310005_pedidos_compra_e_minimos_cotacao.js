const {
  columnExists,
  foreignKeyExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'solicitacao_compra_fornecedores', 'valor_minimo_pedido'))) {
      await sequelize.query(`
        ALTER TABLE solicitacao_compra_fornecedores
        ADD COLUMN valor_minimo_pedido DECIMAL(12, 2) NULL
        AFTER prazo_resposta
      `);
    }

    if (!(await columnExists(sequelize, 'solicitacao_compra_resposta_itens', 'quantidade_minima_item'))) {
      await sequelize.query(`
        ALTER TABLE solicitacao_compra_resposta_itens
        ADD COLUMN quantidade_minima_item DECIMAL(14, 3) NULL
        AFTER observacao
      `);
    }

    if (!(await tableExists(sequelize, 'pedido_compras'))) {
      await sequelize.query(`
        CREATE TABLE pedido_compras (
          id INT NOT NULL AUTO_INCREMENT,
          solicitacao_compra_id INT NOT NULL,
          obra_id INT NOT NULL,
          fornecedor_compra_id INT NOT NULL,
          criado_por INT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'ABERTO',
          origem VARCHAR(40) NOT NULL DEFAULT 'COTACAO',
          valor_total DECIMAL(14, 2) NOT NULL DEFAULT 0,
          valor_minimo_pedido DECIMAL(12, 2) NULL,
          atingiu_pedido_minimo TINYINT(1) NOT NULL DEFAULT 1,
          observacoes TEXT NULL,
          encerrado_em DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        )
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compras', 'fk_pedido_compra_solicitacao'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compras
        ADD CONSTRAINT fk_pedido_compra_solicitacao
          FOREIGN KEY (solicitacao_compra_id)
          REFERENCES solicitacao_compras(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compras', 'fk_pedido_compra_obra'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compras
        ADD CONSTRAINT fk_pedido_compra_obra
          FOREIGN KEY (obra_id)
          REFERENCES obras(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compras', 'fk_pedido_compra_fornecedor'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compras
        ADD CONSTRAINT fk_pedido_compra_fornecedor
          FOREIGN KEY (fornecedor_compra_id)
          REFERENCES fornecedores_compra(id)
          ON DELETE RESTRICT
          ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compras', 'fk_pedido_compra_usuario'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compras
        ADD CONSTRAINT fk_pedido_compra_usuario
          FOREIGN KEY (criado_por)
          REFERENCES users(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
      `);
    }

    if (!(await indexExists(sequelize, 'pedido_compras', 'idx_pedido_compra_solicitacao_fornecedor'))) {
      await sequelize.query(`
        CREATE INDEX idx_pedido_compra_solicitacao_fornecedor
          ON pedido_compras (solicitacao_compra_id, fornecedor_compra_id)
      `);
    }

    if (!(await tableExists(sequelize, 'pedido_compra_itens'))) {
      await sequelize.query(`
        CREATE TABLE pedido_compra_itens (
          id INT NOT NULL AUTO_INCREMENT,
          pedido_compra_id INT NOT NULL,
          resposta_item_id INT NULL,
          item_tipo VARCHAR(40) NOT NULL,
          solicitacao_compra_item_id INT NULL,
          solicitacao_compra_item_manual_id INT NULL,
          descricao VARCHAR(255) NOT NULL,
          unidade VARCHAR(50) NULL,
          quantidade_solicitada DECIMAL(14, 3) NOT NULL DEFAULT 0,
          quantidade_minima_item DECIMAL(14, 3) NULL,
          quantidade_pedido DECIMAL(14, 3) NOT NULL DEFAULT 0,
          preco_unitario DECIMAL(14, 2) NOT NULL DEFAULT 0,
          valor_total DECIMAL(14, 2) NOT NULL DEFAULT 0,
          removido TINYINT(1) NOT NULL DEFAULT 0,
          origem VARCHAR(40) NOT NULL DEFAULT 'COTACAO',
          observacoes TEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        )
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compra_itens', 'fk_pedido_compra_item_pedido'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compra_itens
        ADD CONSTRAINT fk_pedido_compra_item_pedido
          FOREIGN KEY (pedido_compra_id)
          REFERENCES pedido_compras(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compra_itens', 'fk_pedido_compra_item_resposta'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compra_itens
        ADD CONSTRAINT fk_pedido_compra_item_resposta
          FOREIGN KEY (resposta_item_id)
          REFERENCES solicitacao_compra_resposta_itens(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compra_itens', 'fk_pedido_compra_item_cadastrado'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compra_itens
        ADD CONSTRAINT fk_pedido_compra_item_cadastrado
          FOREIGN KEY (solicitacao_compra_item_id)
          REFERENCES solicitacao_compra_itens(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compra_itens', 'fk_pedido_compra_item_manual'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compra_itens
        ADD CONSTRAINT fk_pedido_compra_item_manual
          FOREIGN KEY (solicitacao_compra_item_manual_id)
          REFERENCES solicitacao_compra_itens_manuais(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
      `);
    }

    if (!(await indexExists(sequelize, 'pedido_compra_itens', 'idx_pedido_compra_itens_pedido'))) {
      await sequelize.query(`
        CREATE INDEX idx_pedido_compra_itens_pedido
          ON pedido_compra_itens (pedido_compra_id)
      `);
    }

    if (!(await tableExists(sequelize, 'pedido_compra_item_logs'))) {
      await sequelize.query(`
        CREATE TABLE pedido_compra_item_logs (
          id INT NOT NULL AUTO_INCREMENT,
          pedido_compra_id INT NOT NULL,
          pedido_compra_item_id INT NOT NULL,
          usuario_id INT NULL,
          acao VARCHAR(60) NOT NULL,
          descricao TEXT NOT NULL,
          dados_anteriores LONGTEXT NULL,
          dados_novos LONGTEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        )
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compra_item_logs', 'fk_pedido_compra_item_log_pedido'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compra_item_logs
        ADD CONSTRAINT fk_pedido_compra_item_log_pedido
          FOREIGN KEY (pedido_compra_id)
          REFERENCES pedido_compras(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compra_item_logs', 'fk_pedido_compra_item_log_item'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compra_item_logs
        ADD CONSTRAINT fk_pedido_compra_item_log_item
          FOREIGN KEY (pedido_compra_item_id)
          REFERENCES pedido_compra_itens(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'pedido_compra_item_logs', 'fk_pedido_compra_item_log_usuario'))) {
      await sequelize.query(`
        ALTER TABLE pedido_compra_item_logs
        ADD CONSTRAINT fk_pedido_compra_item_log_usuario
          FOREIGN KEY (usuario_id)
          REFERENCES users(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
      `);
    }

    if (!(await indexExists(sequelize, 'pedido_compra_item_logs', 'idx_pedido_compra_item_logs_item'))) {
      await sequelize.query(`
        CREATE INDEX idx_pedido_compra_item_logs_item
          ON pedido_compra_item_logs (pedido_compra_item_id, createdAt)
      `);
    }
  }
};
