const {
  columnExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

async function addColumnIfMissing(sequelize, tableName, columnName, definition) {
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  }
}

async function createIndexIfMissing(sequelize, tableName, indexName, columns) {
  if (!(await indexExists(sequelize, tableName, indexName))) {
    await sequelize.query(`CREATE INDEX \`${indexName}\` ON \`${tableName}\` (${columns})`);
  }
}

module.exports = {
  async up({ sequelize }) {
    await addColumnIfMissing(
      sequelize,
      'solicitacoes',
      'fluxo_aprovacao_diretoria',
      'TINYINT(1) NOT NULL DEFAULT 0'
    );
    await addColumnIfMissing(
      sequelize,
      'solicitacoes',
      'diretoria_fluxo_codigo',
      'VARCHAR(120) NULL DEFAULT NULL'
    );
    await addColumnIfMissing(
      sequelize,
      'solicitacoes',
      'setor_destino_pos_aprovacao',
      'VARCHAR(120) NULL DEFAULT NULL'
    );
    await addColumnIfMissing(
      sequelize,
      'solicitacoes',
      'aprovada_diretoria_por',
      'INT NULL DEFAULT NULL'
    );
    await addColumnIfMissing(
      sequelize,
      'solicitacoes',
      'aprovada_diretoria_em',
      'DATETIME NULL DEFAULT NULL'
    );
    await addColumnIfMissing(
      sequelize,
      'solicitacoes',
      'prioridade_diretoria_ativa',
      'TINYINT(1) NOT NULL DEFAULT 0'
    );
    await addColumnIfMissing(
      sequelize,
      'solicitacoes',
      'prioridade_diretoria_em',
      'DATETIME NULL DEFAULT NULL'
    );
    await addColumnIfMissing(
      sequelize,
      'solicitacoes',
      'prioridade_diretoria_lote_id',
      'INT NULL DEFAULT NULL'
    );
    await addColumnIfMissing(
      sequelize,
      'solicitacoes',
      'valor_pago_acumulado',
      'DECIMAL(14,2) NOT NULL DEFAULT 0'
    );
    await addColumnIfMissing(
      sequelize,
      'users',
      'pode_enviar_qualquer_setor',
      'TINYINT(1) NOT NULL DEFAULT 0'
    );

    if (
      (await columnExists(sequelize, 'Obras', 'classificacao_obra')) &&
      (await columnExists(sequelize, 'Obras', 'classificacao'))
    ) {
      await sequelize.query(`
        UPDATE \`Obras\`
           SET \`classificacao\` = \`classificacao_obra\`
         WHERE (\`classificacao\` IS NULL OR \`classificacao\` = '')
           AND \`classificacao_obra\` IS NOT NULL
      `);
    }

    if (!(await tableExists(sequelize, 'usuario_setores'))) {
      await sequelize.query(`
        CREATE TABLE \`usuario_setores\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`user_id\` INT NOT NULL,
          \`setor_id\` INT NOT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`usuario_setores_user_setor_unique\` (\`user_id\`, \`setor_id\`),
          KEY \`idx_usuario_setores_user\` (\`user_id\`),
          KEY \`idx_usuario_setores_setor\` (\`setor_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    if (!(await tableExists(sequelize, 'solicitacao_pagamentos'))) {
      await sequelize.query(`
        CREATE TABLE \`solicitacao_pagamentos\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`solicitacao_id\` INT NOT NULL,
          \`valor\` DECIMAL(14,2) NOT NULL,
          \`data_pagamento\` DATE NOT NULL,
          \`observacao\` TEXT NULL,
          \`created_by\` INT NOT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_solicitacao_pagamentos_solicitacao\` (\`solicitacao_id\`),
          KEY \`idx_solicitacao_pagamentos_created_by\` (\`created_by\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    if (!(await tableExists(sequelize, 'prioridade_lotes'))) {
      await sequelize.query(`
        CREATE TABLE \`prioridade_lotes\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`classificacao_alvo\` VARCHAR(20) NOT NULL,
          \`diretoria_alvo_codigo\` VARCHAR(120) NOT NULL,
          \`valor_disponivel\` DECIMAL(14,2) NOT NULL,
          \`valor_utilizado\` DECIMAL(14,2) NOT NULL DEFAULT 0,
          \`status\` VARCHAR(30) NOT NULL DEFAULT 'ABERTO',
          \`observacao\` TEXT NULL,
          \`solicitado_por\` INT NOT NULL,
          \`finalizado_por\` INT NULL,
          \`finalizado_em\` DATETIME NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_prioridade_lotes_status\` (\`status\`),
          KEY \`idx_prioridade_lotes_classificacao\` (\`classificacao_alvo\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    if (!(await tableExists(sequelize, 'prioridade_lote_itens'))) {
      await sequelize.query(`
        CREATE TABLE \`prioridade_lote_itens\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`lote_id\` INT NOT NULL,
          \`solicitacao_id\` INT NOT NULL,
          \`valor_considerado\` DECIMAL(14,2) NOT NULL,
          \`autorizado_por\` INT NOT NULL,
          \`autorizado_em\` DATETIME NOT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`prioridade_lote_itens_lote_solicitacao_unique\` (\`lote_id\`, \`solicitacao_id\`),
          KEY \`idx_prioridade_lote_itens_solicitacao\` (\`solicitacao_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    await createIndexIfMissing(
      sequelize,
      'solicitacoes',
      'idx_solicitacoes_fluxo_diretoria',
      '`fluxo_aprovacao_diretoria`, `diretoria_fluxo_codigo`'
    );
    await createIndexIfMissing(
      sequelize,
      'solicitacoes',
      'idx_solicitacoes_prioridade_diretoria',
      '`prioridade_diretoria_ativa`, `prioridade_diretoria_lote_id`'
    );
  }
};
