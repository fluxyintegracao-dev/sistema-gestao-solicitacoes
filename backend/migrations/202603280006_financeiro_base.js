const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'contas_bancarias'))) {
      await sequelize.query(`
        CREATE TABLE contas_bancarias (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(120) NOT NULL,
          banco VARCHAR(120) NULL,
          agencia VARCHAR(40) NULL,
          conta VARCHAR(60) NULL,
          tipo_conta VARCHAR(40) NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_contas_bancarias_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_contas_bancarias_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_contas_bancarias_nome (nome),
          KEY idx_contas_bancarias_ativo (ativo)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'categorias_financeiras'))) {
      await sequelize.query(`
        CREATE TABLE categorias_financeiras (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(120) NOT NULL,
          tipo VARCHAR(20) NOT NULL DEFAULT 'AMBOS',
          descricao VARCHAR(255) NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_categorias_financeiras_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_categorias_financeiras_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_categorias_financeiras_tipo (tipo),
          KEY idx_categorias_financeiras_ativo (ativo)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'titulos_financeiros'))) {
      await sequelize.query(`
        CREATE TABLE titulos_financeiros (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          solicitacao_id INT NULL,
          obra_id INT NOT NULL,
          parceiro_id INT NOT NULL,
          categoria_financeira_id INT NULL,
          tipo VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'ABERTO',
          descricao VARCHAR(255) NOT NULL,
          numero_documento VARCHAR(120) NULL,
          valor_original DECIMAL(14,2) NOT NULL,
          valor_saldo DECIMAL(14,2) NOT NULL,
          valor_baixado DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          data_emissao DATE NULL,
          data_vencimento DATE NOT NULL,
          data_quitacao DATE NULL,
          observacoes TEXT NULL,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_titulos_financeiros_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_titulos_financeiros_obra FOREIGN KEY (obra_id) REFERENCES Obras(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_titulos_financeiros_parceiro FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_titulos_financeiros_categoria FOREIGN KEY (categoria_financeira_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_titulos_financeiros_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_titulos_financeiros_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_titulos_financeiros_tipo_status (tipo, status),
          KEY idx_titulos_financeiros_vencimento (data_vencimento),
          KEY idx_titulos_financeiros_obra (obra_id),
          KEY idx_titulos_financeiros_parceiro (parceiro_id),
          KEY idx_titulos_financeiros_solicitacao (solicitacao_id)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'movimentos_financeiros'))) {
      await sequelize.query(`
        CREATE TABLE movimentos_financeiros (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          titulo_financeiro_id INT NOT NULL,
          conta_bancaria_id INT NULL,
          tipo_movimento VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
          valor DECIMAL(14,2) NOT NULL,
          juros DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          desconto DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          valor_quitacao DECIMAL(14,2) NOT NULL,
          data_movimento DATE NOT NULL,
          observacoes TEXT NULL,
          criado_por INT NULL,
          estornado_por INT NULL,
          estornado_em DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_movimentos_financeiros_titulo FOREIGN KEY (titulo_financeiro_id) REFERENCES titulos_financeiros(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_movimentos_financeiros_conta FOREIGN KEY (conta_bancaria_id) REFERENCES contas_bancarias(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_movimentos_financeiros_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_movimentos_financeiros_estornado_por FOREIGN KEY (estornado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_movimentos_financeiros_titulo (titulo_financeiro_id),
          KEY idx_movimentos_financeiros_data (data_movimento),
          KEY idx_movimentos_financeiros_tipo (tipo_movimento)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'conciliacoes_bancarias'))) {
      await sequelize.query(`
        CREATE TABLE conciliacoes_bancarias (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          conta_bancaria_id INT NULL,
          titulo_financeiro_id INT NULL,
          movimento_financeiro_id INT NULL,
          ofx_uid VARCHAR(255) NULL,
          documento VARCHAR(120) NULL,
          descricao_banco VARCHAR(255) NULL,
          valor DECIMAL(14,2) NOT NULL,
          data_movimento DATE NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
          confirmado_por INT NULL,
          confirmado_em DATETIME NULL,
          criado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_conciliacoes_bancarias_conta FOREIGN KEY (conta_bancaria_id) REFERENCES contas_bancarias(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_conciliacoes_bancarias_titulo FOREIGN KEY (titulo_financeiro_id) REFERENCES titulos_financeiros(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_conciliacoes_bancarias_movimento FOREIGN KEY (movimento_financeiro_id) REFERENCES movimentos_financeiros(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_conciliacoes_bancarias_confirmado_por FOREIGN KEY (confirmado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_conciliacoes_bancarias_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_conciliacoes_bancarias_status (status),
          KEY idx_conciliacoes_bancarias_data (data_movimento),
          KEY idx_conciliacoes_bancarias_ofx_uid (ofx_uid)
        )
      `);
    }
  }
};
