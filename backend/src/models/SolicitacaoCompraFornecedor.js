module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompraFornecedor = sequelize.define(
    'SolicitacaoCompraFornecedor',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      solicitacao_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      fornecedor_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ENVIADO'
      },
      enviado_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      visualizado_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      respondido_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      prazo_resposta: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      prazo_entrega: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      prazo_entrega_dias: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      prazo_entrega_tipo: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      valor_minimo_pedido: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
      },
      desconto_total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      difal_valor: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      frete_tipo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'SEM_FRETE'
      },
      frete_modo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'GLOBAL'
      },
      frete_valor: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      frete_data_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      frete_transportador_nome: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      frete_transportador_cpf_cnpj: {
        type: DataTypes.STRING(30),
        allowNull: true
      },
      condicao_pagamento: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      observacao_resposta: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      pdf_resposta_url: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      arquivos_resposta: {
        type: DataTypes.JSON,
        allowNull: true
      }
    },
    {
      tableName: 'solicitacao_compra_fornecedores',
      timestamps: true
    }
  );

  return SolicitacaoCompraFornecedor;
};
