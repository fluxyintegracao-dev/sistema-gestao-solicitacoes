-- Hardening do modulo de Provisionamento Financeiro.
-- Complementa indices para lookup de permissao, vinculos de obra e consultas
-- da listagem/dashboard em ambiente com crescimento de volume.

SET @schema_name = DATABASE();

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'provisao_financeira_permissoes'
        AND index_name = 'idx_pf_permissoes_ativo_escopo'
    ),
    'SELECT 1',
    'CREATE INDEX idx_pf_permissoes_ativo_escopo ON provisao_financeira_permissoes (ativo, escopo_tipo, escopo_valor)'
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
        AND table_name = 'provisao_financeira_permissao_obras'
        AND index_name = 'idx_pf_permissao_obras_permissao_obra'
    ),
    'SELECT 1',
    'CREATE INDEX idx_pf_permissao_obras_permissao_obra ON provisao_financeira_permissao_obras (permissao_id, obra_id)'
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
        AND table_name = 'usuarios_obras'
        AND index_name = 'idx_usuarios_obras_user_obra'
    ),
    'SELECT 1',
    'CREATE INDEX idx_usuarios_obras_user_obra ON usuarios_obras (user_id, obra_id)'
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
        AND index_name = 'idx_pf_deleted_obra_data'
    ),
    'SELECT 1',
    'CREATE INDEX idx_pf_deleted_obra_data ON provisoes_financeiras (deletedAt, obra_id, data_prevista_desembolso)'
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
        AND index_name = 'idx_pf_deleted_status_data'
    ),
    'SELECT 1',
    'CREATE INDEX idx_pf_deleted_status_data ON provisoes_financeiras (deletedAt, status, data_prevista_desembolso)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
