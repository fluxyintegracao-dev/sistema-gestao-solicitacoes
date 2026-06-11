module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await queryInterface.createTable('caixa_pagamento_convenios', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'empresas_grupo', key: 'id' }
      },
      conta_bancaria_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'contas_bancarias', key: 'id' }
      },
      banco_codigo: { type: DataTypes.STRING(3), allowNull: false, defaultValue: '104' },
      banco_nome: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'CAIXA ECONOMICA FEDERAL' },
      agencia: { type: DataTypes.STRING(8), allowNull: false },
      agencia_dv: { type: DataTypes.STRING(2), allowNull: true },
      conta: { type: DataTypes.STRING(20), allowNull: false },
      conta_dv: { type: DataTypes.STRING(2), allowNull: true },
      convenio_codigo: { type: DataTypes.STRING(30), allowNull: false },
      convenio_nome: { type: DataTypes.STRING(160), allowNull: true },
      compromisso_codigo: { type: DataTypes.STRING(30), allowNull: true },
      compromisso_nome: { type: DataTypes.STRING(160), allowNull: true },
      empresa_nome: { type: DataTypes.STRING(160), allowNull: false },
      empresa_cpf_cnpj: { type: DataTypes.STRING(20), allowNull: false },
      layout_arquivo_versao: { type: DataTypes.STRING(3), allowNull: false, defaultValue: '080' },
      layout_lote_versao: { type: DataTypes.STRING(3), allowNull: false, defaultValue: '045' },
      ambiente: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'HOMOLOGACAO' },
      homologado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      numero_remessa_atual: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      criado_por: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      atualizado_por: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await queryInterface.createTable('caixa_pagamento_remessas', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      convenio_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'caixa_pagamento_convenios', key: 'id' }
      },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'empresas_grupo', key: 'id' }
      },
      conta_bancaria_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'contas_bancarias', key: 'id' }
      },
      numero_remessa: { type: DataTypes.INTEGER, allowNull: false },
      nome_arquivo: { type: DataTypes.STRING(160), allowNull: false },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'GERADA' },
      tipo_pagamento: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'BOLETO_CODIGO_BARRAS' },
      quantidade_titulos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      quantidade_registros: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      valor_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      data_pagamento: { type: DataTypes.DATEONLY, allowNull: false },
      cnab_hash: { type: DataTypes.STRING(128), allowNull: false },
      conteudo_cnab: { type: DataTypes.TEXT('medium'), allowNull: false },
      homologacao: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      gerado_por: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      gerado_em: { type: DataTypes.DATE, allowNull: true },
      enviado_em: { type: DataTypes.DATE, allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await queryInterface.createTable('caixa_pagamento_remessa_itens', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      remessa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'caixa_pagamento_remessas', key: 'id' },
        onDelete: 'CASCADE'
      },
      titulo_financeiro_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'titulos_financeiros', key: 'id' }
      },
      parceiro_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'parceiros', key: 'id' } },
      sequencial_lote: { type: DataTypes.INTEGER, allowNull: false },
      segmento: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'J' },
      codigo_barras: { type: DataTypes.STRING(60), allowNull: false },
      valor: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      data_pagamento: { type: DataTypes.DATEONLY, allowNull: false },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'GERADO' },
      erro_mensagem: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await sequelize.query('CREATE INDEX idx_caixa_pag_conv_empresa ON caixa_pagamento_convenios (empresa_id, ativo)');
    await sequelize.query('CREATE INDEX idx_caixa_pag_conv_conta ON caixa_pagamento_convenios (conta_bancaria_id)');
    await sequelize.query('CREATE INDEX idx_caixa_pag_remessa_status ON caixa_pagamento_remessas (status)');
    await sequelize.query('CREATE INDEX idx_caixa_pag_remessa_convenio ON caixa_pagamento_remessas (convenio_id, numero_remessa)');
    await sequelize.query('CREATE UNIQUE INDEX ux_caixa_pag_item_titulo_remessa ON caixa_pagamento_remessa_itens (remessa_id, titulo_financeiro_id)');
  },

  async down({ queryInterface }) {
    await queryInterface.dropTable('caixa_pagamento_remessa_itens');
    await queryInterface.dropTable('caixa_pagamento_remessas');
    await queryInterface.dropTable('caixa_pagamento_convenios');
  }
};
