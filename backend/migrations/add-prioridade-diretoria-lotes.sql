SET @db_name = DATABASE();

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'solicitacoes'
    AND COLUMN_NAME = 'prioridade_diretoria_ativa'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `solicitacoes` ADD COLUMN `prioridade_diretoria_ativa` TINYINT(1) NOT NULL DEFAULT 0 AFTER `setor_destino_pos_aprovacao`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'solicitacoes'
    AND COLUMN_NAME = 'prioridade_diretoria_em'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `solicitacoes` ADD COLUMN `prioridade_diretoria_em` DATETIME NULL AFTER `prioridade_diretoria_ativa`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'solicitacoes'
    AND COLUMN_NAME = 'prioridade_diretoria_lote_id'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `solicitacoes` ADD COLUMN `prioridade_diretoria_lote_id` INT NULL AFTER `prioridade_diretoria_em`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `prioridade_lotes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `classificacao_alvo` ENUM('PUBLICA','PRIVADA') NOT NULL,
  `diretoria_alvo_codigo` VARCHAR(120) NOT NULL,
  `valor_disponivel` DECIMAL(12,2) NOT NULL,
  `valor_utilizado` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(30) NOT NULL DEFAULT 'ABERTO',
  `observacao` TEXT NULL,
  `solicitado_por` INT NOT NULL,
  `finalizado_por` INT NULL,
  `finalizado_em` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_prioridade_lotes_classificacao_status` (`classificacao_alvo`, `status`),
  KEY `idx_prioridade_lotes_diretoria` (`diretoria_alvo_codigo`),
  KEY `idx_prioridade_lotes_solicitado_por` (`solicitado_por`),
  CONSTRAINT `fk_prioridade_lotes_solicitado_por`
    FOREIGN KEY (`solicitado_por`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_prioridade_lotes_finalizado_por`
    FOREIGN KEY (`finalizado_por`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `prioridade_lote_itens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lote_id` INT NOT NULL,
  `solicitacao_id` INT NOT NULL,
  `valor_considerado` DECIMAL(12,2) NOT NULL,
  `autorizado_por` INT NOT NULL,
  `autorizado_em` DATETIME NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_prioridade_lote_item` (`lote_id`, `solicitacao_id`),
  KEY `idx_prioridade_lote_itens_solicitacao` (`solicitacao_id`),
  KEY `idx_prioridade_lote_itens_autorizado_por` (`autorizado_por`),
  CONSTRAINT `fk_prioridade_lote_itens_lote`
    FOREIGN KEY (`lote_id`) REFERENCES `prioridade_lotes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_prioridade_lote_itens_solicitacao`
    FOREIGN KEY (`solicitacao_id`) REFERENCES `solicitacoes` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_prioridade_lote_itens_autorizado_por`
    FOREIGN KEY (`autorizado_por`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'solicitacoes'
    AND INDEX_NAME = 'idx_solicitacoes_prioridade_diretoria'
);

SET @sql = IF(
  @index_exists = 0,
  'CREATE INDEX `idx_solicitacoes_prioridade_diretoria` ON `solicitacoes` (`prioridade_diretoria_ativa`, `diretoria_fluxo_codigo`, `obra_id`)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
