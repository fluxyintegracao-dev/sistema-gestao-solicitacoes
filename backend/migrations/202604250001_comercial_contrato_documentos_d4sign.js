const { indexExists, tableExists } = require('../src/database/schemaUtils');

async function addIndexIfMissing(queryInterface, sequelize, tableName, indexName, fields) {
  if (!(await indexExists(sequelize, tableName, indexName))) {
    await queryInterface.addIndex(tableName, fields, { name: indexName });
  }
}

module.exports = {
  async up({ sequelize, DataTypes, queryInterface }) {
    const hasContratos = await tableExists(sequelize, 'contratos_comerciais');
    const hasEmpreendimentos = await tableExists(sequelize, 'empreendimentos');

    if (!hasContratos || !hasEmpreendimentos) {
      return;
    }

    if (!(await tableExists(sequelize, 'contrato_comercial_modelos'))) {
      await queryInterface.createTable('contrato_comercial_modelos', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        empreendimento_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'empreendimentos',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        tipo_documento: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: 'CONTRATO'
        },
        nome: {
          type: DataTypes.STRING(160),
          allowNull: false
        },
        descricao: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        arquivo_url: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        arquivo_nome: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        arquivo_mime: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        variaveis_json: {
          type: DataTypes.TEXT('long'),
          allowNull: true
        },
        d4sign_safe_uuid: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        ativo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        criado_por: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        atualizado_por: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    if (!(await tableExists(sequelize, 'contrato_comercial_documentos'))) {
      await queryInterface.createTable('contrato_comercial_documentos', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        contrato_comercial_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'contratos_comerciais',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        modelo_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'contrato_comercial_modelos',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        tipo_documento: {
          type: DataTypes.STRING(30),
          allowNull: false
        },
        nome: {
          type: DataTypes.STRING(200),
          allowNull: false
        },
        status: {
          type: DataTypes.STRING(40),
          allowNull: false,
          defaultValue: 'GERADO'
        },
        arquivo_docx_url: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        arquivo_pdf_url: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        d4sign_uuid_documento: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        d4sign_safe_uuid: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        d4sign_status: {
          type: DataTypes.STRING(80),
          allowNull: true
        },
        d4sign_enviado_em: {
          type: DataTypes.DATE,
          allowNull: true
        },
        d4sign_finalizado_em: {
          type: DataTypes.DATE,
          allowNull: true
        },
        d4sign_payload_json: {
          type: DataTypes.TEXT('long'),
          allowNull: true
        },
        erro: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        criado_por: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        atualizado_por: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    await addIndexIfMissing(queryInterface, sequelize, 'contrato_comercial_modelos', 'idx_cc_modelos_empreendimento_tipo', ['empreendimento_id', 'tipo_documento']);
    await addIndexIfMissing(queryInterface, sequelize, 'contrato_comercial_modelos', 'idx_cc_modelos_ativo', ['ativo']);
    await addIndexIfMissing(queryInterface, sequelize, 'contrato_comercial_documentos', 'idx_cc_documentos_contrato', ['contrato_comercial_id']);
    await addIndexIfMissing(queryInterface, sequelize, 'contrato_comercial_documentos', 'idx_cc_documentos_status', ['status']);
    await addIndexIfMissing(queryInterface, sequelize, 'contrato_comercial_documentos', 'idx_cc_documentos_d4sign_uuid', ['d4sign_uuid_documento']);
  },

  async down() {
    // Migration aditiva. Nao remove tabelas para preservar documentos gerados e enviados.
  }
};
