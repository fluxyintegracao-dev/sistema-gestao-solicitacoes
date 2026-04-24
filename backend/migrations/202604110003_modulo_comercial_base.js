const {
  columnExists,
  foreignKeyExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'empreendimentos'))) {
      await sequelize.query(`
        CREATE TABLE empreendimentos (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          obra_id INT NULL,
          codigo VARCHAR(60) NULL,
          nome VARCHAR(160) NOT NULL,
          descricao VARCHAR(255) NULL,
          endereco VARCHAR(255) NULL,
          numero VARCHAR(60) NULL,
          bairro VARCHAR(120) NULL,
          cidade VARCHAR(120) NULL,
          estado VARCHAR(2) NULL,
          cep VARCHAR(20) NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_empreendimentos_obra FOREIGN KEY (obra_id) REFERENCES Obras(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_empreendimentos_obra (obra_id),
          KEY idx_empreendimentos_nome (nome),
          KEY idx_empreendimentos_ativo (ativo)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'unidades_comerciais'))) {
      await sequelize.query(`
        CREATE TABLE unidades_comerciais (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          empreendimento_id INT NOT NULL,
          parceiro_reserva_id INT NULL,
          codigo VARCHAR(60) NOT NULL,
          nome VARCHAR(160) NULL,
          bloco VARCHAR(60) NULL,
          torre VARCHAR(60) NULL,
          pavimento VARCHAR(60) NULL,
          tipologia VARCHAR(80) NULL,
          metragem_privativa DECIMAL(12,2) NULL,
          valor_tabela DECIMAL(14,2) NULL,
          valor_base_venda DECIMAL(14,2) NULL,
          situacao VARCHAR(30) NOT NULL DEFAULT 'DISPONIVEL',
          reservado_ate DATE NULL,
          observacoes TEXT NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_unidades_comerciais_empreendimento FOREIGN KEY (empreendimento_id) REFERENCES empreendimentos(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_unidades_comerciais_parceiro_reserva FOREIGN KEY (parceiro_reserva_id) REFERENCES parceiros(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uk_unidades_comerciais_codigo (empreendimento_id, codigo),
          KEY idx_unidades_comerciais_situacao (situacao),
          KEY idx_unidades_comerciais_ativo (ativo)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'contratos_comerciais'))) {
      await sequelize.query(`
        CREATE TABLE contratos_comerciais (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          empreendimento_id INT NOT NULL,
          unidade_comercial_id INT NOT NULL,
          parceiro_id INT NOT NULL,
          obra_id INT NOT NULL,
          categoria_financeira_id INT NULL,
          numero VARCHAR(120) NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
          data_contrato DATE NOT NULL,
          valor_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          valor_entrada DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          desconto_concedido DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          indice_reajuste VARCHAR(60) NULL,
          corretor_nome VARCHAR(160) NULL,
          comissao_percentual DECIMAL(8,2) NULL,
          observacoes TEXT NULL,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_contratos_comerciais_empreendimento FOREIGN KEY (empreendimento_id) REFERENCES empreendimentos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_contratos_comerciais_unidade FOREIGN KEY (unidade_comercial_id) REFERENCES unidades_comerciais(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_contratos_comerciais_parceiro FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_contratos_comerciais_obra FOREIGN KEY (obra_id) REFERENCES Obras(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_contratos_comerciais_categoria_financeira FOREIGN KEY (categoria_financeira_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_contratos_comerciais_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_contratos_comerciais_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uk_contratos_comerciais_numero (numero),
          KEY idx_contratos_comerciais_status (status),
          KEY idx_contratos_comerciais_parceiro (parceiro_id),
          KEY idx_contratos_comerciais_unidade (unidade_comercial_id),
          KEY idx_contratos_comerciais_obra (obra_id)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'contratos_comerciais_parcelas'))) {
      await sequelize.query(`
        CREATE TABLE contratos_comerciais_parcelas (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          contrato_comercial_id INT NOT NULL,
          titulo_financeiro_id INT NULL,
          sequencia INT NOT NULL,
          tipo_parcela VARCHAR(30) NOT NULL DEFAULT 'PARCELA',
          descricao VARCHAR(160) NOT NULL,
          forma_recebimento_prevista VARCHAR(30) NULL,
          data_vencimento DATE NOT NULL,
          valor_original DECIMAL(14,2) NOT NULL,
          observacoes TEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_contratos_comerciais_parcelas_contrato FOREIGN KEY (contrato_comercial_id) REFERENCES contratos_comerciais(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_contratos_comerciais_parcelas_titulo FOREIGN KEY (titulo_financeiro_id) REFERENCES titulos_financeiros(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uk_contratos_comerciais_parcelas_sequencia (contrato_comercial_id, sequencia),
          KEY idx_contratos_comerciais_parcelas_vencimento (data_vencimento)
        )
      `);
    }

    if (!(await columnExists(sequelize, 'movimentos_financeiros', 'forma_recebimento'))) {
      await sequelize.query(`
        ALTER TABLE movimentos_financeiros
        ADD COLUMN forma_recebimento VARCHAR(30) NULL AFTER conta_bancaria_id
      `);
    }

    if (!(await columnExists(sequelize, 'movimentos_financeiros', 'tipo_permuta'))) {
      await sequelize.query(`
        ALTER TABLE movimentos_financeiros
        ADD COLUMN tipo_permuta VARCHAR(80) NULL AFTER forma_recebimento
      `);
    }

    if (!(await columnExists(sequelize, 'movimentos_financeiros', 'categoria_bem'))) {
      await sequelize.query(`
        ALTER TABLE movimentos_financeiros
        ADD COLUMN categoria_bem VARCHAR(30) NULL AFTER tipo_permuta
      `);
    }

    if (!(await columnExists(sequelize, 'movimentos_financeiros', 'descricao_bem'))) {
      await sequelize.query(`
        ALTER TABLE movimentos_financeiros
        ADD COLUMN descricao_bem VARCHAR(255) NULL AFTER categoria_bem
      `);
    }

    if (!(await columnExists(sequelize, 'movimentos_financeiros', 'valor_referencia_bem'))) {
      await sequelize.query(`
        ALTER TABLE movimentos_financeiros
        ADD COLUMN valor_referencia_bem DECIMAL(14,2) NULL AFTER descricao_bem
      `);
    }

    if (!(await columnExists(sequelize, 'movimentos_financeiros', 'documento_referencia'))) {
      await sequelize.query(`
        ALTER TABLE movimentos_financeiros
        ADD COLUMN documento_referencia VARCHAR(120) NULL AFTER valor_referencia_bem
      `);
    }

    if (!(await indexExists(sequelize, 'movimentos_financeiros', 'idx_movimentos_financeiros_forma_recebimento'))) {
      await sequelize.query(`
        CREATE INDEX idx_movimentos_financeiros_forma_recebimento
        ON movimentos_financeiros (forma_recebimento)
      `);
    }

    if (
      (await tableExists(sequelize, 'contratos_comerciais_parcelas')) &&
      !(await foreignKeyExists(sequelize, 'contratos_comerciais_parcelas', 'fk_contratos_comerciais_parcelas_titulo'))
    ) {
      await sequelize.query(`
        ALTER TABLE contratos_comerciais_parcelas
        ADD CONSTRAINT fk_contratos_comerciais_parcelas_titulo
        FOREIGN KEY (titulo_financeiro_id) REFERENCES titulos_financeiros(id) ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }
  }
};
