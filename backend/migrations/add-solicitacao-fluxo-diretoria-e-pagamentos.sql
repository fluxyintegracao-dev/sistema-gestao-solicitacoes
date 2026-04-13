SET @db_name = DATABASE();

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'solicitacoes'
    AND COLUMN_NAME = 'fluxo_aprovacao_diretoria'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `solicitacoes` ADD COLUMN `fluxo_aprovacao_diretoria` TINYINT(1) NOT NULL DEFAULT 0 AFTER `cancelada`',
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
    AND COLUMN_NAME = 'diretoria_fluxo_codigo'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `solicitacoes` ADD COLUMN `diretoria_fluxo_codigo` VARCHAR(120) NULL AFTER `fluxo_aprovacao_diretoria`',
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
    AND COLUMN_NAME = 'setor_destino_pos_aprovacao'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `solicitacoes` ADD COLUMN `setor_destino_pos_aprovacao` VARCHAR(120) NULL AFTER `diretoria_fluxo_codigo`',
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
    AND COLUMN_NAME = 'valor_pago_acumulado'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `solicitacoes` ADD COLUMN `valor_pago_acumulado` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `valor`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `solicitacao_pagamentos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `solicitacao_id` INT NOT NULL,
  `valor` DECIMAL(12,2) NOT NULL,
  `data_pagamento` DATE NOT NULL,
  `observacao` TEXT NULL,
  `created_by` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_solicitacao_pagamentos_solicitacao` (`solicitacao_id`),
  KEY `idx_solicitacao_pagamentos_data` (`data_pagamento`),
  KEY `idx_solicitacao_pagamentos_created_by` (`created_by`),
  CONSTRAINT `fk_solicitacao_pagamentos_solicitacao`
    FOREIGN KEY (`solicitacao_id`) REFERENCES `solicitacoes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitacao_pagamentos_usuario`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'solicitacoes'
    AND INDEX_NAME = 'idx_solicitacoes_fluxo_diretoria'
);

SET @sql = IF(
  @index_exists = 0,
  'CREATE INDEX `idx_solicitacoes_fluxo_diretoria` ON `solicitacoes` (`fluxo_aprovacao_diretoria`, `diretoria_fluxo_codigo`, `obra_id`)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
