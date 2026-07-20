const { indexExists, tableExists } = require('../src/database/schemaUtils');

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, options) {
  if (!(await indexExists(sequelize, tableName, options.name))) {
    await queryInterface.addIndex(tableName, fields, options);
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'financeiro_titulo_importacoes'))) {
      await queryInterface.createTable('financeiro_titulo_importacoes', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        codigo: { type: DataTypes.STRING(50), allowNull: false },
        template_version: { type: DataTypes.STRING(20), allowNull: false },
        arquivo_nome: { type: DataTypes.STRING(255), allowNull: false },
        arquivo_hash: { type: DataTypes.STRING(64), allowNull: false },
        idempotency_key: { type: DataTypes.STRING(180), allowNull: true },
        status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PREVIEW' },
        total_linhas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        total_titulos_logicos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        total_titulos_gerados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        total_erros: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        total_avisos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        valor_bruto: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        valor_impostos: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        valor_liquido: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        erros_json: { type: DataTypes.TEXT('long'), allowNull: true },
        avisos_json: { type: DataTypes.TEXT('long'), allowNull: true },
        falha_mensagem: { type: DataTypes.TEXT, allowNull: true },
        criado_por: { type: DataTypes.INTEGER, allowNull: false },
        confirmado_por: { type: DataTypes.INTEGER, allowNull: true },
        expira_em: { type: DataTypes.DATE, allowNull: false },
        confirmado_em: { type: DataTypes.DATE, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
    }

    if (!(await tableExists(sequelize, 'financeiro_titulo_importacao_linhas'))) {
      await queryInterface.createTable('financeiro_titulo_importacao_linhas', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        importacao_id: { type: DataTypes.INTEGER, allowNull: false },
        aba: { type: DataTypes.STRING(40), allowNull: false },
        numero_linha: { type: DataTypes.INTEGER, allowNull: false },
        chave_importacao: { type: DataTypes.STRING(120), allowNull: false },
        fingerprint: { type: DataTypes.STRING(64), allowNull: true },
        payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'VALIDO' },
        erros_json: { type: DataTypes.TEXT('long'), allowNull: true },
        avisos_json: { type: DataTypes.TEXT('long'), allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
    }

    if (!(await tableExists(sequelize, 'financeiro_titulo_importacao_resultados'))) {
      await queryInterface.createTable('financeiro_titulo_importacao_resultados', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        importacao_id: { type: DataTypes.INTEGER, allowNull: false },
        linha_id: { type: DataTypes.INTEGER, allowNull: false },
        titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: false },
        numero_parcela: { type: DataTypes.INTEGER, allowNull: true },
        valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
    }

    await addIndexIfMissing(queryInterface, sequelize, 'financeiro_titulo_importacoes', ['codigo'], {
      name: 'uk_fin_titulo_importacoes_codigo', unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, 'financeiro_titulo_importacoes', ['idempotency_key'], {
      name: 'uk_fin_titulo_importacoes_idempotency', unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, 'financeiro_titulo_importacoes', ['arquivo_hash', 'criado_por'], {
      name: 'idx_fin_titulo_importacoes_hash_usuario'
    });
    await addIndexIfMissing(queryInterface, sequelize, 'financeiro_titulo_importacoes', ['status', 'expira_em'], {
      name: 'idx_fin_titulo_importacoes_status_expira'
    });
    await addIndexIfMissing(queryInterface, sequelize, 'financeiro_titulo_importacao_linhas', ['importacao_id', 'aba', 'numero_linha'], {
      name: 'uk_fin_titulo_importacao_linha_numero', unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, 'financeiro_titulo_importacao_linhas', ['fingerprint'], {
      name: 'idx_fin_titulo_importacao_linhas_fingerprint'
    });
    await addIndexIfMissing(queryInterface, sequelize, 'financeiro_titulo_importacao_resultados', ['linha_id', 'titulo_financeiro_id'], {
      name: 'uk_fin_titulo_import_resultado_linha_titulo', unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, 'financeiro_titulo_importacao_resultados', ['importacao_id'], {
      name: 'idx_fin_titulo_import_resultados_importacao'
    });
  },

  async down() {
    // Migration aditiva. Remocao exige verificacao previa dos titulos importados.
  }
};
