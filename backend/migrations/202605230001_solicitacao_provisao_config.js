const { indexExists, quoteIdentifier, resolveTableName, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    const tabelaSolicitacoes = await resolveTableName(sequelize, ['solicitacoes', 'Solicitacoes'], 'solicitacoes');
    const tabelaProvisoes = await resolveTableName(sequelize, ['provisoes_financeiras'], 'provisoes_financeiras');
    const tabelaUsers = await resolveTableName(sequelize, ['users', 'Users'], 'users');

    if (!(await tableExists(sequelize, 'solicitacao_provisao'))) {
      await sequelize.query(`
        CREATE TABLE solicitacao_provisao (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          solicitacao_id INT NOT NULL,
          provisao_financeira_id INT NOT NULL,
          tipo_vinculo VARCHAR(40) NOT NULL DEFAULT 'PLANEJADO',
          origem VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
          observacao TEXT NULL,
          usuario_vinculo_id INT NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deletedAt DATETIME NULL,
          CONSTRAINT fk_solicitacao_provisao_solicitacao
            FOREIGN KEY (solicitacao_id) REFERENCES ${quoteIdentifier(tabelaSolicitacoes)}(id)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_solicitacao_provisao_provisao
            FOREIGN KEY (provisao_financeira_id) REFERENCES ${quoteIdentifier(tabelaProvisoes)}(id)
            ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_solicitacao_provisao_usuario
            FOREIGN KEY (usuario_vinculo_id) REFERENCES ${quoteIdentifier(tabelaUsers)}(id)
            ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_solicitacao_provisao_solicitacao (solicitacao_id),
          KEY idx_solicitacao_provisao_provisao (provisao_financeira_id),
          KEY idx_solicitacao_provisao_ativo (ativo),
          KEY idx_solicitacao_provisao_deleted (deletedAt)
        )
      `);
    }

    if (!(await indexExists(sequelize, 'solicitacao_provisao', 'idx_solicitacao_provisao_solicitacao_ativo'))) {
      await sequelize.query(`
        CREATE INDEX idx_solicitacao_provisao_solicitacao_ativo
          ON solicitacao_provisao (solicitacao_id, ativo, deletedAt)
      `);
    }

    if (!(await indexExists(sequelize, 'solicitacao_provisao', 'idx_solicitacao_provisao_provisao_ativo'))) {
      await sequelize.query(`
        CREATE INDEX idx_solicitacao_provisao_provisao_ativo
          ON solicitacao_provisao (provisao_financeira_id, ativo, deletedAt)
      `);
    }

    await sequelize.query(`
      INSERT INTO configuracoes_sistema (chave, valor, createdAt, updatedAt)
      SELECT
        'PROVISIONAMENTO_FLUXO_CONFIG',
        '{"modo_operacional":"INFORMATIVO","aprovacao_ativa":false,"controle_vencimento_ativo":false,"integracao_solicitacoes_ativa":false,"exigir_provisao_na_solicitacao":false,"bloquear_solicitacao_sem_provisao":false,"validar_saldo_provisao":false,"somente_provisoes_aprovadas":false,"permitir_multiplas_provisoes_por_solicitacao":true,"tipos_solicitacao_exigem_provisao":[]}',
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1
          FROM configuracoes_sistema
         WHERE chave = 'PROVISIONAMENTO_FLUXO_CONFIG'
         LIMIT 1
      )
    `);
  }
};
