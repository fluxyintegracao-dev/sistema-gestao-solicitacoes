SET @db_name = DATABASE();

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'Obras'
    AND COLUMN_NAME = 'classificacao_obra'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `Obras` ADD COLUMN `classificacao_obra` ENUM(''PUBLICA'',''PRIVADA'') NULL AFTER `cidade`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
