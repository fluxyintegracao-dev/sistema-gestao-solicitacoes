'use strict';

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const description = await queryInterface.describeTable(tableName).catch(() => ({}));
  if (!description[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function removeColumnIfExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName).catch(() => ({}));
  if (description[columnName]) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

async function addIndexIfMissing(queryInterface, tableName, fields, name, options = {}) {
  const indexes = await queryInterface.showIndex(tableName).catch(() => []);
  if (!indexes.some((index) => index.name === name)) {
    await queryInterface.addIndex(tableName, fields, { name, ...options });
  }
}

module.exports = {
  async up({ DataTypes, queryInterface }) {
    const money = { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 };
    const quantity = { type: DataTypes.DECIMAL(14, 3), allowNull: true };

    await addColumnIfMissing(queryInterface, 'solicitacao_compra_resposta_itens', 'quantidade_disponivel', quantity);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_resposta_itens', 'ipi_valor', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_resposta_itens', 'icms_valor', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_resposta_itens', 'st_valor', money);

    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fornecedores', 'prazo_entrega_dias', { type: DataTypes.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fornecedores', 'prazo_entrega_tipo', { type: DataTypes.STRING(20), allowNull: true });
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fornecedores', 'difal_valor', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fornecedores', 'frete_tipo', { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'SEM_FRETE' });
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fornecedores', 'frete_valor', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fornecedores', 'frete_data_vencimento', { type: DataTypes.DATEONLY, allowNull: true });
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fornecedores', 'frete_transportador_nome', { type: DataTypes.STRING(255), allowNull: true });
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fornecedores', 'frete_transportador_cpf_cnpj', { type: DataTypes.STRING(30), allowNull: true });

    await addColumnIfMissing(queryInterface, 'solicitacao_compra_alocacoes', 'ipi_rateado', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_alocacoes', 'icms_rateado', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_alocacoes', 'st_rateado', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_alocacoes', 'difal_rateado', money);

    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fechamentos', 'quantidade_excedente', { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 });
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fechamentos', 'justificativa_excedente', { type: DataTypes.TEXT, allowNull: true });

    await addColumnIfMissing(queryInterface, 'pedido_compras', 'valor_mercadorias', money);
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'valor_tributos', money);
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'difal_total', money);
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'prazo_entrega_dias', { type: DataTypes.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'prazo_entrega_tipo', { type: DataTypes.STRING(20), allowNull: true });
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'frete_tipo_cotacao', { type: DataTypes.STRING(20), allowNull: true });
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'frete_valor_cotacao', money);
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'frete_data_vencimento', { type: DataTypes.DATEONLY, allowNull: true });
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'frete_transportador_nome', { type: DataTypes.STRING(255), allowNull: true });
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'frete_transportador_cpf_cnpj', { type: DataTypes.STRING(30), allowNull: true });

    await addColumnIfMissing(queryInterface, 'pedido_compra_itens', 'valor_mercadoria', money);
    await addColumnIfMissing(queryInterface, 'pedido_compra_itens', 'ipi_valor', money);
    await addColumnIfMissing(queryInterface, 'pedido_compra_itens', 'icms_valor', money);
    await addColumnIfMissing(queryInterface, 'pedido_compra_itens', 'st_valor', money);
    await addColumnIfMissing(queryInterface, 'pedido_compra_itens', 'difal_rateado', money);

    await addColumnIfMissing(queryInterface, 'pedido_compra_fretes', 'origem_cotacao_fornecedor_id', { type: DataTypes.INTEGER, allowNull: true });
    await addIndexIfMissing(
      queryInterface,
      'pedido_compra_fretes',
      ['origem_cotacao_fornecedor_id'],
      'uniq_pedido_compra_frete_origem_cotacao',
      { unique: true }
    );
  },

  async down({ queryInterface }) {
    const indexes = await queryInterface.showIndex('pedido_compra_fretes').catch(() => []);
    if (indexes.some((index) => index.name === 'uniq_pedido_compra_frete_origem_cotacao')) {
      await queryInterface.removeIndex('pedido_compra_fretes', 'uniq_pedido_compra_frete_origem_cotacao');
    }

    const columns = [
      ['pedido_compra_fretes', 'origem_cotacao_fornecedor_id'],
      ['pedido_compra_itens', 'difal_rateado'],
      ['pedido_compra_itens', 'st_valor'],
      ['pedido_compra_itens', 'icms_valor'],
      ['pedido_compra_itens', 'ipi_valor'],
      ['pedido_compra_itens', 'valor_mercadoria'],
      ['pedido_compras', 'frete_transportador_cpf_cnpj'],
      ['pedido_compras', 'frete_transportador_nome'],
      ['pedido_compras', 'frete_data_vencimento'],
      ['pedido_compras', 'frete_valor_cotacao'],
      ['pedido_compras', 'frete_tipo_cotacao'],
      ['pedido_compras', 'prazo_entrega_tipo'],
      ['pedido_compras', 'prazo_entrega_dias'],
      ['pedido_compras', 'difal_total'],
      ['pedido_compras', 'valor_tributos'],
      ['pedido_compras', 'valor_mercadorias'],
      ['solicitacao_compra_fechamentos', 'justificativa_excedente'],
      ['solicitacao_compra_fechamentos', 'quantidade_excedente'],
      ['solicitacao_compra_alocacoes', 'difal_rateado'],
      ['solicitacao_compra_alocacoes', 'st_rateado'],
      ['solicitacao_compra_alocacoes', 'icms_rateado'],
      ['solicitacao_compra_alocacoes', 'ipi_rateado'],
      ['solicitacao_compra_fornecedores', 'frete_transportador_cpf_cnpj'],
      ['solicitacao_compra_fornecedores', 'frete_transportador_nome'],
      ['solicitacao_compra_fornecedores', 'frete_data_vencimento'],
      ['solicitacao_compra_fornecedores', 'frete_valor'],
      ['solicitacao_compra_fornecedores', 'frete_tipo'],
      ['solicitacao_compra_fornecedores', 'difal_valor'],
      ['solicitacao_compra_fornecedores', 'prazo_entrega_tipo'],
      ['solicitacao_compra_fornecedores', 'prazo_entrega_dias'],
      ['solicitacao_compra_resposta_itens', 'st_valor'],
      ['solicitacao_compra_resposta_itens', 'icms_valor'],
      ['solicitacao_compra_resposta_itens', 'ipi_valor'],
      ['solicitacao_compra_resposta_itens', 'quantidade_disponivel']
    ];
    for (const [tableName, columnName] of columns) {
      await removeColumnIfExists(queryInterface, tableName, columnName);
    }
  }
};
