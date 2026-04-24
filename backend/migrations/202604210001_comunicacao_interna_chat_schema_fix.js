const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, indexName, fields) {
  if (!(await indexExists(sequelize, tableName, indexName))) {
    await queryInterface.addIndex(tableName, fields, { name: indexName });
  }
}

module.exports = {
  async up({ sequelize, DataTypes, queryInterface }) {
    if (!(await tableExists(sequelize, 'conversas_internas'))) {
      return;
    }

    await addColumnIfMissing(queryInterface, sequelize, 'conversas_internas', 'is_group', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, sequelize, 'conversas_internas', 'setor_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'conversas_internas', 'last_message_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'conversas_internas', 'last_message_preview', {
      type: DataTypes.STRING(500),
      allowNull: true
    });

    await queryInterface.changeColumn('conversas_internas', 'destinatario_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    if (await tableExists(sequelize, 'conversas_internas_participantes')) {
      await addColumnIfMissing(queryInterface, sequelize, 'conversas_internas_participantes', 'lida_em', {
        type: DataTypes.DATE,
        allowNull: true
      });

      await sequelize.query(`
        INSERT INTO conversas_internas_participantes
          (conversa_id, usuario_id, adicionado_por_id, lida_em, createdAt, updatedAt)
        SELECT ci.id, ci.criado_por_id, ci.criado_por_id, ci.updatedAt, NOW(), NOW()
          FROM conversas_internas ci
         WHERE ci.criado_por_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1
               FROM conversas_internas_participantes cip
              WHERE cip.conversa_id = ci.id
                AND cip.usuario_id = ci.criado_por_id
           )
      `);

      await sequelize.query(`
        INSERT INTO conversas_internas_participantes
          (conversa_id, usuario_id, adicionado_por_id, lida_em, createdAt, updatedAt)
        SELECT ci.id, ci.destinatario_id, ci.criado_por_id, NULL, NOW(), NOW()
          FROM conversas_internas ci
         WHERE ci.destinatario_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1
               FROM conversas_internas_participantes cip
              WHERE cip.conversa_id = ci.id
                AND cip.usuario_id = ci.destinatario_id
           )
      `);
    }

    if (await tableExists(sequelize, 'conversas_internas_mensagens')) {
      await sequelize.query(`
        UPDATE conversas_internas ci
        LEFT JOIN (
          SELECT m.conversa_id, MAX(m.id) AS ultima_mensagem_id
            FROM conversas_internas_mensagens m
           GROUP BY m.conversa_id
        ) ult ON ult.conversa_id = ci.id
        LEFT JOIN conversas_internas_mensagens msg ON msg.id = ult.ultima_mensagem_id
           SET ci.is_group = COALESCE(ci.is_group, 0),
               ci.last_message_at = COALESCE(ci.last_message_at, msg.createdAt, ci.updatedAt, ci.createdAt),
               ci.last_message_preview = COALESCE(ci.last_message_preview, SUBSTRING(msg.mensagem, 1, 200), ci.assunto)
         WHERE ci.last_message_at IS NULL
            OR ci.last_message_preview IS NULL
            OR ci.is_group IS NULL
      `);
    } else {
      await sequelize.query(`
        UPDATE conversas_internas
           SET is_group = COALESCE(is_group, 0),
               last_message_at = COALESCE(last_message_at, updatedAt, createdAt),
               last_message_preview = COALESCE(last_message_preview, assunto)
         WHERE last_message_at IS NULL
            OR last_message_preview IS NULL
            OR is_group IS NULL
      `);
    }

    await addIndexIfMissing(queryInterface, sequelize, 'conversas_internas', 'idx_ci_last_message_at', ['last_message_at']);
    await addIndexIfMissing(queryInterface, sequelize, 'conversas_internas', 'idx_ci_setor_grupo', ['setor_id', 'is_group']);
    await addIndexIfMissing(queryInterface, sequelize, 'conversas_internas', 'idx_ci_destinatario_last_message', ['destinatario_id', 'last_message_at']);
    await addIndexIfMissing(queryInterface, sequelize, 'conversas_internas', 'idx_ci_criador_last_message', ['criado_por_id', 'last_message_at']);

    if (await tableExists(sequelize, 'conversas_internas_mensagens')) {
      await addIndexIfMissing(queryInterface, sequelize, 'conversas_internas_mensagens', 'idx_ci_msg_conversa_id', ['conversa_id', 'id']);
      await addIndexIfMissing(queryInterface, sequelize, 'conversas_internas_mensagens', 'idx_ci_msg_conversa_created', ['conversa_id', 'createdAt']);
    }

    if (await tableExists(sequelize, 'conversas_internas_participantes')) {
      await addIndexIfMissing(queryInterface, sequelize, 'conversas_internas_participantes', 'idx_ci_part_usuario_conversa', ['usuario_id', 'conversa_id']);
      await addIndexIfMissing(queryInterface, sequelize, 'conversas_internas_participantes', 'idx_ci_part_conversa_usuario', ['conversa_id', 'usuario_id']);
    }

    if (await tableExists(sequelize, 'conversas_internas_arquivo_usuario')) {
      await addIndexIfMissing(queryInterface, sequelize, 'conversas_internas_arquivo_usuario', 'idx_ci_arq_usuario_conversa', ['usuario_id', 'conversa_id']);
    }
  },

  async down() {
    // Migration corretiva/idempotente. Nao remove colunas para preservar dados de chat.
  }
};
