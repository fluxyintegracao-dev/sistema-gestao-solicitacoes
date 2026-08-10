'use strict';

const {
  columnExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

async function addColumn(queryInterface, sequelize, table, column, definition) {
  if (await tableExists(sequelize, table) && !(await columnExists(sequelize, table, column))) {
    await queryInterface.addColumn(table, column, definition);
  }
}

async function addIndex(queryInterface, sequelize, table, fields, name, options = {}) {
  if (await tableExists(sequelize, table) && !(await indexExists(sequelize, table, name))) {
    await queryInterface.addIndex(table, fields, { name, ...options });
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await addColumn(queryInterface, sequelize, 'cheques_terceiros', 'empresa_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'empresas_grupo', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    await addColumn(queryInterface, sequelize, 'cheques_terceiros', 'obra_origem_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Obras', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await addColumn(queryInterface, sequelize, 'cheques_terceiros', 'movimento_entrada_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'movimentos_financeiros', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await addColumn(queryInterface, sequelize, 'cheques_terceiros', 'movimento_saida_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'movimentos_financeiros', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await addColumn(queryInterface, sequelize, 'cheques_terceiros', 'origem_tipo', {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'RECEBIMENTO_TITULO'
    });
    await addColumn(queryInterface, sequelize, 'cheques_terceiros', 'motivo_origem', {
      type: DataTypes.STRING(255),
      allowNull: true
    });
    await addColumn(queryInterface, sequelize, 'cheques_terceiros', 'data_entrada', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });
    await addColumn(queryInterface, sequelize, 'cheques_terceiros', 'data_saida', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });
    await addColumn(queryInterface, sequelize, 'cheques_terceiros', 'chave_importacao', {
      type: DataTypes.STRING(160),
      allowNull: true
    });

    if (!(await tableExists(sequelize, 'baixas_financeiras_grupos'))) {
      await queryInterface.createTable('baixas_financeiras_grupos', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        idempotency_key: { type: DataTypes.STRING(120), allowNull: false, unique: true },
        tipo: { type: DataTypes.STRING(20), allowNull: false },
        empresa_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'empresas_grupo', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE'
        },
        parceiro_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'parceiros', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE'
        },
        data_movimento: { type: DataTypes.DATEONLY, allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'CONFIRMADO' },
        valor_principal: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        valor_quitacao: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        observacoes: { type: DataTypes.TEXT, allowNull: true },
        criado_por: { type: DataTypes.INTEGER, allowNull: true },
        estornado_por: { type: DataTypes.INTEGER, allowNull: true },
        estornado_em: { type: DataTypes.DATE, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
    }

    if (!(await tableExists(sequelize, 'baixas_financeiras_componentes'))) {
      await queryInterface.createTable('baixas_financeiras_componentes', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        baixa_grupo_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'baixas_financeiras_grupos', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        forma_pagamento_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'financeiro_formas_pagamento', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        forma_recebimento: { type: DataTypes.STRING(30), allowNull: false },
        conta_bancaria_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'contas_bancarias', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE'
        },
        cartao_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'financeiro_cartoes', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        cheque_terceiro_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'cheques_terceiros', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE'
        },
        valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        juros: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        multa: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        desconto: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        valor_quitacao: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        documento_referencia: { type: DataTypes.STRING(120), allowNull: true },
        observacoes: { type: DataTypes.TEXT, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
    }

    if (!(await tableExists(sequelize, 'baixas_financeiras_alocacoes'))) {
      await queryInterface.createTable('baixas_financeiras_alocacoes', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        baixa_grupo_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'baixas_financeiras_grupos', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        componente_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'baixas_financeiras_componentes', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        titulo_financeiro_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'titulos_financeiros', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE'
        },
        movimento_financeiro_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'movimentos_financeiros', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
    }

    if (!(await tableExists(sequelize, 'cheques_terceiros_movimentos'))) {
      await queryInterface.createTable('cheques_terceiros_movimentos', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        cheque_terceiro_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'cheques_terceiros', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        tipo_evento: { type: DataTypes.STRING(40), allowNull: false },
        status_anterior: { type: DataTypes.STRING(30), allowNull: true },
        status_novo: { type: DataTypes.STRING(30), allowNull: false },
        empresa_origem_id: { type: DataTypes.INTEGER, allowNull: true },
        empresa_destino_id: { type: DataTypes.INTEGER, allowNull: true },
        titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: true },
        movimento_financeiro_id: { type: DataTypes.INTEGER, allowNull: true },
        baixa_grupo_id: { type: DataTypes.INTEGER, allowNull: true },
        valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        data_evento: { type: DataTypes.DATEONLY, allowNull: false },
        observacoes: { type: DataTypes.TEXT, allowNull: true },
        metadata_json: { type: DataTypes.JSON, allowNull: true },
        criado_por: { type: DataTypes.INTEGER, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
    }

    await addColumn(queryInterface, sequelize, 'movimentos_financeiros', 'baixa_grupo_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'baixas_financeiras_grupos', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    await addColumn(queryInterface, sequelize, 'movimentos_financeiros', 'baixa_componente_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'baixas_financeiras_componentes', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await addIndex(queryInterface, sequelize, 'cheques_terceiros', ['empresa_id', 'status'], 'idx_cheques_empresa_status');
    await addIndex(queryInterface, sequelize, 'cheques_terceiros', ['data_vencimento'], 'idx_cheques_vencimento');
    await addIndex(queryInterface, sequelize, 'cheques_terceiros', ['chave_importacao'], 'ux_cheques_chave_importacao', { unique: true });
    // A base pode conter saldos legados repetidos. A protecao de duplicidade dos
    // novos lancamentos fica no servico e na chave de importacao, sem impedir o
    // deploy por causa de registros historicos ja existentes.
    await addIndex(queryInterface, sequelize, 'cheques_terceiros', ['empresa_id', 'banco', 'agencia', 'conta', 'numero_cheque', 'valor'], 'idx_cheques_identidade');
    await addIndex(queryInterface, sequelize, 'baixas_financeiras_alocacoes', ['titulo_financeiro_id'], 'idx_baixa_alocacao_titulo');
    await addIndex(queryInterface, sequelize, 'movimentos_financeiros', ['baixa_grupo_id'], 'idx_movimentos_baixa_grupo');

    await sequelize.query(`
      UPDATE cheques_terceiros c
      LEFT JOIN titulos_financeiros t ON t.id = c.titulo_financeiro_id
      LEFT JOIN movimentos_financeiros m ON m.id = c.movimento_financeiro_id
      SET c.empresa_id = COALESCE(c.empresa_id, t.empresa_id, m.empresa_id),
          c.obra_origem_id = COALESCE(c.obra_origem_id, t.obra_id),
          c.movimento_entrada_id = CASE
            WHEN c.status = 'EM_CARTEIRA' THEN COALESCE(c.movimento_entrada_id, c.movimento_financeiro_id)
            ELSE c.movimento_entrada_id
          END,
          c.movimento_saida_id = CASE
            WHEN c.status = 'UTILIZADO' THEN COALESCE(c.movimento_saida_id, c.movimento_financeiro_id)
            ELSE c.movimento_saida_id
          END,
          c.data_entrada = COALESCE(c.data_entrada, t.data_quitacao, t.data_emissao),
          c.data_saida = CASE WHEN c.status = 'UTILIZADO' THEN COALESCE(c.data_saida, m.data_movimento) ELSE c.data_saida END
    `);
  },

  async down() {
    // Migration deliberadamente sem rollback destrutivo: preserva trilha financeira e de custodia.
  }
};
