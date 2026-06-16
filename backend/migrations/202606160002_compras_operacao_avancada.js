const {
  columnExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, indexName) {
  if (!(await indexExists(sequelize, tableName, indexName))) {
    await queryInterface.addIndex(tableName, fields, { name: indexName });
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'solicitacao_compra_alocacoes'))) {
      await queryInterface.createTable('solicitacao_compra_alocacoes', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        solicitacao_compra_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        resposta_item_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        fornecedor_compra_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        item_tipo: {
          type: DataTypes.STRING(40),
          allowNull: false
        },
        solicitacao_compra_item_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        solicitacao_compra_item_manual_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        quantidade_alocada: {
          type: DataTypes.DECIMAL(14, 3),
          allowNull: false,
          defaultValue: 0
        },
        preco_unitario: {
          type: DataTypes.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0
        },
        valor_total: {
          type: DataTypes.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0
        },
        status: {
          type: DataTypes.STRING(40),
          allowNull: false,
          defaultValue: 'ATIVA'
        },
        status_financeiro: {
          type: DataTypes.STRING(40),
          allowNull: false,
          defaultValue: 'PREVISTO'
        },
        titulo_financeiro_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        valor_realizado: {
          type: DataTypes.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0
        },
        realizado_em: {
          type: DataTypes.DATE,
          allowNull: true
        },
        pedido_compra_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        pedido_compra_item_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        criado_por: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        cancelado_por: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        cancelado_em: {
          type: DataTypes.DATE,
          allowNull: true
        },
        motivo_cancelamento: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });
    }

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compra_alocacoes',
      ['solicitacao_compra_id', 'resposta_item_id'],
      'idx_compra_alocacoes_solicitacao_resposta'
    );

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compra_alocacoes',
      ['pedido_compra_id'],
      'idx_compra_alocacoes_pedido'
    );

    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compra_alocacoes', 'status_financeiro', {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'PREVISTO'
    });
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compra_alocacoes', 'titulo_financeiro_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compra_alocacoes', 'valor_realizado', {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    });
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compra_alocacoes', 'realizado_em', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compra_alocacoes',
      ['titulo_financeiro_id'],
      'idx_compra_alocacoes_titulo_financeiro'
    );

    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'atribuido_a', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'prazo_finalizacao', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'delegado_por', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'delegado_em', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'motivo_atraso', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'motivo_atraso_em', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'cancelado_por', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'cancelado_em', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'motivo_cancelamento', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'espelho_fornecedor_url', {
      type: DataTypes.STRING(1000),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'espelho_fornecedor_nome', {
      type: DataTypes.STRING(255),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'espelho_fornecedor_em', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compra_itens', 'quantidade_cancelada', {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false,
      defaultValue: 0
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compra_itens', 'cancelado_por', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compra_itens', 'cancelado_em', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compra_itens', 'motivo_cancelamento', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compras', 'comprador_responsavel_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compras', 'prazo_compra', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compras', 'delegado_por', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compras', 'delegado_em', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compras', 'motivo_atraso', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compras', 'motivo_atraso_em', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compras', 'valor_fechado', {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    });

    await addColumnIfMissing(queryInterface, sequelize, 'obras', 'cno', {
      type: DataTypes.STRING(40),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'obras', 'endereco_logradouro', {
      type: DataTypes.STRING(255),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'obras', 'endereco_numero', {
      type: DataTypes.STRING(50),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'obras', 'endereco_complemento', {
      type: DataTypes.STRING(120),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'obras', 'endereco_bairro', {
      type: DataTypes.STRING(120),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'obras', 'endereco_cep', {
      type: DataTypes.STRING(20),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'obras', 'endereco_uf', {
      type: DataTypes.STRING(2),
      allowNull: true
    });
  },

  async down() {
    // Migration operacional e aditiva. Rollback manual recomendado para evitar perda
    // acidental de historico de compras, alocacoes e delegacoes.
  }
};
