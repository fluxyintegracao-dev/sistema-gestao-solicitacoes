const { foreignKeyExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, options) {
  if (await tableExists(sequelize, tableName) && !(await indexExists(sequelize, tableName, options.name))) {
    await queryInterface.addIndex(tableName, fields, options);
  }
}

async function addForeignKeyIfPossible(queryInterface, sequelize, tableName, columnName, references, name, onDelete = 'SET NULL') {
  if (!(await tableExists(sequelize, tableName)) || !(await tableExists(sequelize, references.table))) {
    return;
  }

  if (!(await foreignKeyExists(sequelize, tableName, name))) {
    await queryInterface.addConstraint(tableName, {
      fields: [columnName],
      type: 'foreign key',
      name,
      references,
      onDelete,
      onUpdate: 'CASCADE'
    });
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const Sequelize = DataTypes;
    const timestampColumns = {
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    };

    if (!(await tableExists(sequelize, 'boletos_caixa_convenios'))) {
      await queryInterface.createTable('boletos_caixa_convenios', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        empresa_id: { type: Sequelize.INTEGER, allowNull: true },
        conta_bancaria_id: { type: Sequelize.INTEGER, allowNull: true },
        banco_codigo: { type: Sequelize.STRING(3), allowNull: false, defaultValue: '104' },
        banco_nome: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'CAIXA ECONOMICA FEDERAL' },
        agencia: { type: Sequelize.STRING(5), allowNull: false },
        agencia_dv: { type: Sequelize.STRING(2), allowNull: true },
        conta: { type: Sequelize.STRING(12), allowNull: true },
        conta_dv: { type: Sequelize.STRING(2), allowNull: true },
        agencia_conta_dv: { type: Sequelize.STRING(2), allowNull: true },
        codigo_beneficiario: { type: Sequelize.STRING(7), allowNull: false },
        beneficiario_nome: { type: Sequelize.STRING(160), allowNull: false },
        beneficiario_cpf_cnpj: { type: Sequelize.STRING(20), allowNull: false },
        beneficiario_endereco: { type: Sequelize.STRING(255), allowNull: true },
        carteira_codigo: { type: Sequelize.STRING(2), allowNull: false, defaultValue: '1' },
        modalidade_nosso_numero: { type: Sequelize.STRING(2), allowNull: false, defaultValue: '14' },
        layout_arquivo_versao: { type: Sequelize.STRING(3), allowNull: false, defaultValue: '081' },
        layout_lote_versao: { type: Sequelize.STRING(3), allowNull: false, defaultValue: '067' },
        tipo_emissao_boleto: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'BENEFICIARIO' },
        tipo_entrega_boleto: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'BENEFICIARIO' },
        ambiente: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'TESTE' },
        homologado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        numero_remessa_atual: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        local_pagamento: { type: Sequelize.STRING(255), allowNull: true },
        instrucao_padrao: { type: Sequelize.TEXT, allowNull: true },
        ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        criado_por: { type: Sequelize.INTEGER, allowNull: true },
        atualizado_por: { type: Sequelize.INTEGER, allowNull: true },
        ...timestampColumns
      });
    }

    if (!(await tableExists(sequelize, 'boletos_caixa'))) {
      await queryInterface.createTable('boletos_caixa', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        titulo_financeiro_id: { type: Sequelize.INTEGER, allowNull: false },
        convenio_id: { type: Sequelize.INTEGER, allowNull: false },
        empresa_id: { type: Sequelize.INTEGER, allowNull: true },
        parceiro_id: { type: Sequelize.INTEGER, allowNull: true },
        ambiente: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'TESTE' },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'GERADO' },
        status_bancario: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'NAO_REMETIDO' },
        nosso_numero: { type: Sequelize.STRING(30), allowNull: false },
        nosso_numero_base: { type: Sequelize.STRING(20), allowNull: false },
        linha_digitavel: { type: Sequelize.STRING(80), allowNull: false },
        codigo_barras: { type: Sequelize.STRING(44), allowNull: false },
        campo_livre: { type: Sequelize.STRING(25), allowNull: true },
        valor: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        data_emissao: { type: Sequelize.DATEONLY, allowNull: true },
        data_vencimento: { type: Sequelize.DATEONLY, allowNull: false },
        data_registro: { type: Sequelize.DATEONLY, allowNull: true },
        data_liquidacao: { type: Sequelize.DATEONLY, allowNull: true },
        data_baixa: { type: Sequelize.DATEONLY, allowNull: true },
        remessa_inclusao_id: { type: Sequelize.INTEGER, allowNull: true },
        retorno_confirmacao_id: { type: Sequelize.INTEGER, allowNull: true },
        retorno_liquidacao_id: { type: Sequelize.INTEGER, allowNull: true },
        ultimo_codigo_movimento: { type: Sequelize.STRING(10), allowNull: true },
        ultimo_motivo_ocorrencia: { type: Sequelize.STRING(255), allowNull: true },
        pdf_storage_key: { type: Sequelize.STRING(500), allowNull: true },
        criado_por: { type: Sequelize.INTEGER, allowNull: true },
        atualizado_por: { type: Sequelize.INTEGER, allowNull: true },
        ...timestampColumns
      });
    }

    if (!(await tableExists(sequelize, 'boletos_caixa_remessas'))) {
      await queryInterface.createTable('boletos_caixa_remessas', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        convenio_id: { type: Sequelize.INTEGER, allowNull: false },
        empresa_id: { type: Sequelize.INTEGER, allowNull: true },
        numero_remessa: { type: Sequelize.INTEGER, allowNull: false },
        nome_arquivo: { type: Sequelize.STRING(160), allowNull: false },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'GERADA' },
        quantidade_boletos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        quantidade_registros: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        valor_total: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        cnab_hash: { type: Sequelize.STRING(128), allowNull: false },
        arquivo_storage_key: { type: Sequelize.STRING(500), allowNull: true },
        homologacao: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        gerado_por: { type: Sequelize.INTEGER, allowNull: true },
        gerado_em: { type: Sequelize.DATE, allowNull: true },
        enviado_em: { type: Sequelize.DATE, allowNull: true },
        observacoes: { type: Sequelize.TEXT, allowNull: true },
        ...timestampColumns
      });
    }

    if (!(await tableExists(sequelize, 'boletos_caixa_remessa_itens'))) {
      await queryInterface.createTable('boletos_caixa_remessa_itens', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        remessa_id: { type: Sequelize.INTEGER, allowNull: false },
        boleto_id: { type: Sequelize.INTEGER, allowNull: false },
        titulo_financeiro_id: { type: Sequelize.INTEGER, allowNull: false },
        sequencial_lote: { type: Sequelize.INTEGER, allowNull: false },
        codigo_movimento_remessa: { type: Sequelize.STRING(2), allowNull: false, defaultValue: '01' },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'INCLUIDO' },
        erro_mensagem: { type: Sequelize.TEXT, allowNull: true },
        ...timestampColumns
      });
    }

    if (!(await tableExists(sequelize, 'boletos_caixa_retornos'))) {
      await queryInterface.createTable('boletos_caixa_retornos', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        convenio_id: { type: Sequelize.INTEGER, allowNull: false },
        empresa_id: { type: Sequelize.INTEGER, allowNull: true },
        remessa_id: { type: Sequelize.INTEGER, allowNull: true },
        nome_arquivo: { type: Sequelize.STRING(160), allowNull: false },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'IMPORTADO' },
        arquivo_hash: { type: Sequelize.STRING(128), allowNull: false },
        arquivo_storage_key: { type: Sequelize.STRING(500), allowNull: true },
        quantidade_registros: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        quantidade_ocorrencias: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        valor_liquidado: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        processado_por: { type: Sequelize.INTEGER, allowNull: true },
        processado_em: { type: Sequelize.DATE, allowNull: true },
        erro_mensagem: { type: Sequelize.TEXT, allowNull: true },
        ...timestampColumns
      });
    }

    if (!(await tableExists(sequelize, 'boletos_caixa_ocorrencias'))) {
      await queryInterface.createTable('boletos_caixa_ocorrencias', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        retorno_id: { type: Sequelize.INTEGER, allowNull: false },
        boleto_id: { type: Sequelize.INTEGER, allowNull: true },
        titulo_financeiro_id: { type: Sequelize.INTEGER, allowNull: true },
        nosso_numero_base: { type: Sequelize.STRING(20), allowNull: true },
        codigo_movimento: { type: Sequelize.STRING(2), allowNull: false },
        descricao_movimento: { type: Sequelize.STRING(160), allowNull: true },
        motivos: { type: Sequelize.TEXT, allowNull: true },
        segmento_t_json: { type: Sequelize.JSON, allowNull: true },
        segmento_u_json: { type: Sequelize.JSON, allowNull: true },
        data_ocorrencia: { type: Sequelize.DATEONLY, allowNull: true },
        data_credito: { type: Sequelize.DATEONLY, allowNull: true },
        valor_pago: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        valor_liquido: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        valor_tarifa: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        status_aplicacao: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'PENDENTE' },
        erro_mensagem: { type: Sequelize.TEXT, allowNull: true },
        ...timestampColumns
      });
    }

    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa_convenios', ['empresa_id'], { name: 'idx_boletos_caixa_convenios_empresa' });
    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa_convenios', ['ativo'], { name: 'idx_boletos_caixa_convenios_ativo' });
    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa', ['titulo_financeiro_id'], { name: 'idx_boletos_caixa_titulo' });
    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa', ['convenio_id', 'nosso_numero_base'], { name: 'uk_boletos_caixa_convenio_nosso_numero', unique: true });
    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa', ['status_bancario'], { name: 'idx_boletos_caixa_status_bancario' });
    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa_remessas', ['convenio_id', 'numero_remessa'], { name: 'uk_boletos_caixa_remessa_numero', unique: true });
    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa_remessas', ['cnab_hash'], { name: 'idx_boletos_caixa_remessas_hash' });
    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa_remessa_itens', ['remessa_id', 'boleto_id'], { name: 'uk_boletos_caixa_remessa_item', unique: true });
    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa_retornos', ['arquivo_hash'], { name: 'uk_boletos_caixa_retornos_hash', unique: true });
    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa_ocorrencias', ['retorno_id'], { name: 'idx_boletos_caixa_ocorrencias_retorno' });
    await addIndexIfMissing(queryInterface, sequelize, 'boletos_caixa_ocorrencias', ['boleto_id'], { name: 'idx_boletos_caixa_ocorrencias_boleto' });

    await addForeignKeyIfPossible(queryInterface, sequelize, 'boletos_caixa_convenios', 'empresa_id', { table: 'empresas_grupo', field: 'id' }, 'fk_boletos_caixa_convenios_empresa');
    await addForeignKeyIfPossible(queryInterface, sequelize, 'boletos_caixa_convenios', 'conta_bancaria_id', { table: 'contas_bancarias', field: 'id' }, 'fk_boletos_caixa_convenios_conta');
    await addForeignKeyIfPossible(queryInterface, sequelize, 'boletos_caixa', 'titulo_financeiro_id', { table: 'titulos_financeiros', field: 'id' }, 'fk_boletos_caixa_titulo', 'RESTRICT');
    await addForeignKeyIfPossible(queryInterface, sequelize, 'boletos_caixa', 'convenio_id', { table: 'boletos_caixa_convenios', field: 'id' }, 'fk_boletos_caixa_convenio', 'RESTRICT');
    await addForeignKeyIfPossible(queryInterface, sequelize, 'boletos_caixa_remessas', 'convenio_id', { table: 'boletos_caixa_convenios', field: 'id' }, 'fk_boletos_caixa_remessas_convenio', 'RESTRICT');
    await addForeignKeyIfPossible(queryInterface, sequelize, 'boletos_caixa_remessa_itens', 'remessa_id', { table: 'boletos_caixa_remessas', field: 'id' }, 'fk_boletos_caixa_remessa_itens_remessa', 'CASCADE');
    await addForeignKeyIfPossible(queryInterface, sequelize, 'boletos_caixa_remessa_itens', 'boleto_id', { table: 'boletos_caixa', field: 'id' }, 'fk_boletos_caixa_remessa_itens_boleto', 'RESTRICT');
    await addForeignKeyIfPossible(queryInterface, sequelize, 'boletos_caixa_retornos', 'convenio_id', { table: 'boletos_caixa_convenios', field: 'id' }, 'fk_boletos_caixa_retornos_convenio', 'RESTRICT');
    await addForeignKeyIfPossible(queryInterface, sequelize, 'boletos_caixa_ocorrencias', 'retorno_id', { table: 'boletos_caixa_retornos', field: 'id' }, 'fk_boletos_caixa_ocorrencias_retorno', 'CASCADE');
    await addForeignKeyIfPossible(queryInterface, sequelize, 'boletos_caixa_ocorrencias', 'boleto_id', { table: 'boletos_caixa', field: 'id' }, 'fk_boletos_caixa_ocorrencias_boleto');
  },

  async down({ queryInterface, sequelize }) {
    const tables = [
      'boletos_caixa_ocorrencias',
      'boletos_caixa_retornos',
      'boletos_caixa_remessa_itens',
      'boletos_caixa_remessas',
      'boletos_caixa',
      'boletos_caixa_convenios'
    ];

    for (const tableName of tables) {
      if (await tableExists(sequelize, tableName)) {
        await queryInterface.dropTable(tableName);
      }
    }
  }
};
