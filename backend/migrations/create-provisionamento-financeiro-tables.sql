-- Base inicial do modulo de Provisionamento Financeiro.
-- Execute em janela controlada no MySQL/RDS antes da liberacao do modulo.

CREATE TABLE IF NOT EXISTS `provisao_categorias_macro` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `descricao` TEXT NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `ordem_exibicao` INT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `provisoes_financeiras` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(255) NOT NULL,
  `obra_id` INT NOT NULL,
  `categoria_macro_id` INT NOT NULL,
  `descricao` TEXT NOT NULL,
  `fornecedor_id` INT NULL,
  `fornecedor_texto` VARCHAR(255) NULL,
  `data_prevista_desembolso` DATE NOT NULL,
  `valor_previsto` DECIMAL(15,2) NOT NULL,
  `comentario` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'previsto',
  `prioridade` VARCHAR(30) NULL,
  `usuario_criacao_id` INT NOT NULL,
  `usuario_atualizacao_id` INT NULL,
  `aprovado_por_id` INT NULL,
  `aprovado_em` DATETIME NULL,
  `cancelado_por_id` INT NULL,
  `cancelado_em` DATETIME NULL,
  `realizado_em` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provisoes_financeiras_codigo` (`codigo`),
  CONSTRAINT `fk_provisoes_financeiras_obra`
    FOREIGN KEY (`obra_id`) REFERENCES `Obras`(`id`),
  CONSTRAINT `fk_provisoes_financeiras_categoria`
    FOREIGN KEY (`categoria_macro_id`) REFERENCES `provisao_categorias_macro`(`id`),
  CONSTRAINT `fk_provisoes_financeiras_usuario_criacao`
    FOREIGN KEY (`usuario_criacao_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_provisoes_financeiras_usuario_atualizacao`
    FOREIGN KEY (`usuario_atualizacao_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_provisoes_financeiras_aprovado_por`
    FOREIGN KEY (`aprovado_por_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_provisoes_financeiras_cancelado_por`
    FOREIGN KEY (`cancelado_por_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `provisao_financeira_historico` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `provisao_financeira_id` INT NOT NULL,
  `usuario_id` INT NULL,
  `acao` VARCHAR(100) NOT NULL,
  `status_anterior` VARCHAR(30) NULL,
  `status_novo` VARCHAR(30) NULL,
  `descricao` TEXT NULL,
  `comentario` TEXT NULL,
  `dados_antes_json` LONGTEXT NULL,
  `dados_depois_json` LONGTEXT NULL,
  `metadata_json` LONGTEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_provisao_financeira_historico_provisao`
    FOREIGN KEY (`provisao_financeira_id`) REFERENCES `provisoes_financeiras`(`id`),
  CONSTRAINT `fk_provisao_financeira_historico_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `provisao_financeira_anexos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `provisao_financeira_id` INT NOT NULL,
  `nome_original` VARCHAR(255) NOT NULL,
  `caminho_arquivo` VARCHAR(500) NOT NULL,
  `tipo` VARCHAR(50) NOT NULL DEFAULT 'ANEXO',
  `uploaded_by` INT NOT NULL,
  `area_origem` VARCHAR(100) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_provisao_financeira_anexos_provisao`
    FOREIGN KEY (`provisao_financeira_id`) REFERENCES `provisoes_financeiras`(`id`),
  CONSTRAINT `fk_provisao_financeira_anexos_usuario`
    FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `provisao_financeira_permissoes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `escopo_tipo` VARCHAR(20) NOT NULL,
  `escopo_valor` VARCHAR(100) NOT NULL,
  `pode_acessar` TINYINT(1) NOT NULL DEFAULT 0,
  `pode_criar` TINYINT(1) NOT NULL DEFAULT 0,
  `pode_aprovar` TINYINT(1) NOT NULL DEFAULT 0,
  `pode_dashboard_global` TINYINT(1) NOT NULL DEFAULT 0,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `provisao_financeira_permissao_obras` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `permissao_id` INT NOT NULL,
  `obra_id` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_provisao_financeira_permissao_obras_permissao`
    FOREIGN KEY (`permissao_id`) REFERENCES `provisao_financeira_permissoes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_provisao_financeira_permissao_obras_obra`
    FOREIGN KEY (`obra_id`) REFERENCES `Obras`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `provisao_financeira_sequencias` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `obra_id` INT NOT NULL,
  `ultimo_numero` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provisao_financeira_sequencias_obra` (`obra_id`),
  CONSTRAINT `fk_provisao_financeira_sequencias_obra`
    FOREIGN KEY (`obra_id`) REFERENCES `Obras`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @schema_name = DATABASE();

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'provisoes_financeiras'
        AND index_name = 'idx_provisoes_financeiras_obra_data'
    ),
    'SELECT 1',
    'CREATE INDEX idx_provisoes_financeiras_obra_data ON provisoes_financeiras (obra_id, data_prevista_desembolso)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'provisoes_financeiras'
        AND index_name = 'idx_provisoes_financeiras_status_data'
    ),
    'SELECT 1',
    'CREATE INDEX idx_provisoes_financeiras_status_data ON provisoes_financeiras (status, data_prevista_desembolso)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'provisoes_financeiras'
        AND index_name = 'idx_provisoes_financeiras_categoria_data'
    ),
    'SELECT 1',
    'CREATE INDEX idx_provisoes_financeiras_categoria_data ON provisoes_financeiras (categoria_macro_id, data_prevista_desembolso)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'provisoes_financeiras'
        AND index_name = 'idx_provisoes_financeiras_usuario_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_provisoes_financeiras_usuario_created ON provisoes_financeiras (usuario_criacao_id, createdAt)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'provisoes_financeiras'
        AND index_name = 'idx_provisoes_financeiras_valor'
    ),
    'SELECT 1',
    'CREATE INDEX idx_provisoes_financeiras_valor ON provisoes_financeiras (valor_previsto)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'provisao_financeira_historico'
        AND index_name = 'idx_provisao_financeira_historico_provisao_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_provisao_financeira_historico_provisao_created ON provisao_financeira_historico (provisao_financeira_id, createdAt)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'provisao_financeira_anexos'
        AND index_name = 'idx_provisao_financeira_anexos_provisao_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_provisao_financeira_anexos_provisao_created ON provisao_financeira_anexos (provisao_financeira_id, createdAt)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
