-- Adiciona campo unidade_sigla_manual e torna unidade_id nullable
-- para permitir unidades digitadas manualmente em itens de insumos cadastrados

SET @schema_name = DATABASE();

-- Verifica se a coluna unidade_sigla_manual já existe
SET @has_unidade_manual = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'solicitacao_compra_itens'
    AND COLUMN_NAME = 'unidade_sigla_manual'
);

-- Adiciona coluna unidade_sigla_manual se não existir
SET @sql = IF(
  @has_unidade_manual = 0,
  'ALTER TABLE solicitacao_compra_itens ADD COLUMN unidade_sigla_manual VARCHAR(50) NULL AFTER unidade_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Torna unidade_id nullable
ALTER TABLE solicitacao_compra_itens MODIFY COLUMN unidade_id INT NULL;

-- Adiciona coluna arquivo_url se não existir
SET @has_arquivo_url = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'solicitacao_compra_itens'
    AND COLUMN_NAME = 'arquivo_url'
);

SET @sql = IF(
  @has_arquivo_url = 0,
  'ALTER TABLE solicitacao_compra_itens ADD COLUMN arquivo_url TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adiciona coluna arquivo_nome_original se não existir
SET @has_arquivo_nome = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'solicitacao_compra_itens'
    AND COLUMN_NAME = 'arquivo_nome_original'
);

SET @sql = IF(
  @has_arquivo_nome = 0,
  'ALTER TABLE solicitacao_compra_itens ADD COLUMN arquivo_nome_original VARCHAR(255) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adiciona as mesmas colunas na tabela de itens manuais se não existirem
SET @has_arquivo_url_manual = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'solicitacao_compra_itens_manuais'
    AND COLUMN_NAME = 'arquivo_url'
);

SET @sql = IF(
  @has_arquivo_url_manual = 0,
  'ALTER TABLE solicitacao_compra_itens_manuais ADD COLUMN arquivo_url TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_arquivo_nome_manual = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'solicitacao_compra_itens_manuais'
    AND COLUMN_NAME = 'arquivo_nome_original'
);

SET @sql = IF(
  @has_arquivo_nome_manual = 0,
  'ALTER TABLE solicitacao_compra_itens_manuais ADD COLUMN arquivo_nome_original VARCHAR(255) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
