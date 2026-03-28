-- Indices de performance para comunicacao interna e notificacoes.
-- Execute este arquivo manualmente no MySQL/RDS em janela controlada.

SET @schema_name = DATABASE();

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @schema_name
        AND table_name = 'conversas_internas'
        AND index_name = 'idx_conversas_internas_criador_updated'
    ),
    'SELECT 1',
    'CREATE INDEX idx_conversas_internas_criador_updated ON conversas_internas (criado_por_id, updatedAt)'
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
        AND table_name = 'conversas_internas'
        AND index_name = 'idx_conversas_internas_destinatario_updated'
    ),
    'SELECT 1',
    'CREATE INDEX idx_conversas_internas_destinatario_updated ON conversas_internas (destinatario_id, updatedAt)'
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
        AND table_name = 'conversas_internas_mensagens'
        AND index_name = 'idx_conversas_mensagens_conversa_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_conversas_mensagens_conversa_created ON conversas_internas_mensagens (conversa_id, createdAt)'
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
        AND table_name = 'conversas_internas_anexos'
        AND index_name = 'idx_conversas_anexos_conversa'
    ),
    'SELECT 1',
    'CREATE INDEX idx_conversas_anexos_conversa ON conversas_internas_anexos (conversa_id)'
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
        AND table_name = 'conversas_internas_anexos'
        AND index_name = 'idx_conversas_anexos_mensagem'
    ),
    'SELECT 1',
    'CREATE INDEX idx_conversas_anexos_mensagem ON conversas_internas_anexos (mensagem_id)'
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
        AND table_name = 'conversas_internas_participantes'
        AND index_name = 'idx_conversas_participantes_usuario_conversa'
    ),
    'SELECT 1',
    'CREATE INDEX idx_conversas_participantes_usuario_conversa ON conversas_internas_participantes (usuario_id, conversa_id)'
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
        AND table_name = 'conversas_internas_participantes'
        AND index_name = 'idx_conversas_participantes_conversa_usuario'
    ),
    'SELECT 1',
    'CREATE INDEX idx_conversas_participantes_conversa_usuario ON conversas_internas_participantes (conversa_id, usuario_id)'
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
        AND table_name = 'conversas_internas_arquivo_usuario'
        AND index_name = 'idx_conversas_arquivo_usuario_usuario_conversa'
    ),
    'SELECT 1',
    'CREATE INDEX idx_conversas_arquivo_usuario_usuario_conversa ON conversas_internas_arquivo_usuario (usuario_id, conversa_id)'
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
        AND table_name = 'notificacao_destinatarios'
        AND index_name = 'idx_notificacao_destinatarios_usuario_lida_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_notificacao_destinatarios_usuario_lida_created ON notificacao_destinatarios (usuario_id, lida_em, createdAt)'
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
        AND table_name = 'notificacao_destinatarios'
        AND index_name = 'idx_notificacao_destinatarios_notificacao'
    ),
    'SELECT 1',
    'CREATE INDEX idx_notificacao_destinatarios_notificacao ON notificacao_destinatarios (notificacao_id)'
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
        AND table_name = 'notificacoes'
        AND index_name = 'idx_notificacoes_tipo_solicitacao_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_notificacoes_tipo_solicitacao_created ON notificacoes (tipo, solicitacao_id, createdAt)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;