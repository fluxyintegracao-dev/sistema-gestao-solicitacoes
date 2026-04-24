const { Sequelize } = require('sequelize');

async function tableExists(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch {
    return false;
  }
}

async function columnExists(queryInterface, tableName, columnName) {
  try {
    const desc = await queryInterface.describeTable(tableName);
    return Object.prototype.hasOwnProperty.call(desc, columnName);
  } catch {
    return false;
  }
}

module.exports = {
  async up(queryInterface, DataTypes) {
    // --- conversas_internas: novos campos para modelo chat ---
    if (await tableExists(queryInterface, 'conversas_internas')) {
      if (!(await columnExists(queryInterface, 'conversas_internas', 'is_group'))) {
        await queryInterface.addColumn('conversas_internas', 'is_group', {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
      }
      if (!(await columnExists(queryInterface, 'conversas_internas', 'setor_id'))) {
        await queryInterface.addColumn('conversas_internas', 'setor_id', {
          type: DataTypes.INTEGER,
          allowNull: true
        });
      }
      if (!(await columnExists(queryInterface, 'conversas_internas', 'last_message_at'))) {
        await queryInterface.addColumn('conversas_internas', 'last_message_at', {
          type: DataTypes.DATE,
          allowNull: true
        });
      }
      if (!(await columnExists(queryInterface, 'conversas_internas', 'last_message_preview'))) {
        await queryInterface.addColumn('conversas_internas', 'last_message_preview', {
          type: DataTypes.STRING(500),
          allowNull: true
        });
      }

      // Torna destinatario_id nullable para suportar grupos
      await queryInterface.changeColumn('conversas_internas', 'destinatario_id', {
        type: DataTypes.INTEGER,
        allowNull: true
      });

      // Indice para lista ordenada por atividade
      try {
        await queryInterface.addIndex('conversas_internas', ['last_message_at'], {
          name: 'idx_ci_last_message_at'
        });
      } catch { /* indice ja existe */ }

      try {
        await queryInterface.addIndex('conversas_internas', ['setor_id', 'is_group'], {
          name: 'idx_ci_setor_grupo'
        });
      } catch { /* indice ja existe */ }
    }

    // --- conversas_internas_participantes: campo de leitura ---
    if (await tableExists(queryInterface, 'conversas_internas_participantes')) {
      if (!(await columnExists(queryInterface, 'conversas_internas_participantes', 'lida_em'))) {
        await queryInterface.addColumn('conversas_internas_participantes', 'lida_em', {
          type: DataTypes.DATE,
          allowNull: true
        });
      }
    }

    // Backfill last_message_at e last_message_preview para conversas existentes
    if (await tableExists(queryInterface, 'conversas_internas')) {
      await queryInterface.sequelize.query(`
        UPDATE conversas_internas ci
        JOIN (
          SELECT conversa_id,
                 MAX(createdAt) AS ultimo_at,
                 SUBSTRING(
                   (SELECT mensagem FROM conversas_internas_mensagens m2
                    WHERE m2.conversa_id = m.conversa_id
                    ORDER BY createdAt DESC LIMIT 1),
                 1, 200
                 ) AS preview
          FROM conversas_internas_mensagens m
          GROUP BY conversa_id
        ) msg ON msg.conversa_id = ci.id
        SET ci.last_message_at = msg.ultimo_at,
            ci.last_message_preview = msg.preview
        WHERE ci.last_message_at IS NULL
      `);
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'conversas_internas')) {
      for (const col of ['is_group', 'setor_id', 'last_message_at', 'last_message_preview']) {
        if (await columnExists(queryInterface, 'conversas_internas', col)) {
          await queryInterface.removeColumn('conversas_internas', col);
        }
      }
      try { await queryInterface.removeIndex('conversas_internas', 'idx_ci_last_message_at'); } catch {}
      try { await queryInterface.removeIndex('conversas_internas', 'idx_ci_setor_grupo'); } catch {}
    }
    if (await tableExists(queryInterface, 'conversas_internas_participantes')) {
      if (await columnExists(queryInterface, 'conversas_internas_participantes', 'lida_em')) {
        await queryInterface.removeColumn('conversas_internas_participantes', 'lida_em');
      }
    }
  }
};
