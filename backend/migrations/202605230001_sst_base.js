'use strict';

const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function createTableIfMissing(queryInterface, sequelize, tableName, definition) {
  if (!(await tableExists(sequelize, tableName))) {
    await queryInterface.createTable(tableName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name) {
  if (await tableExists(sequelize, tableName) && !(await indexExists(sequelize, tableName, name))) {
    for (const field of fields) {
      if (!(await columnExists(sequelize, tableName, field))) {
        return;
      }
    }
    await queryInterface.addIndex(tableName, fields, { name });
  }
}

function baseColumns(DataTypes, { empresaRequired = true, obra = true, colaborador = false } = {}) {
  return {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: !empresaRequired },
    ...(obra ? { obra_id: { type: DataTypes.INTEGER, allowNull: true } } : {}),
    ...(colaborador ? { colaborador_id: { type: DataTypes.INTEGER, allowNull: true } } : {}),
    criado_por: { type: DataTypes.INTEGER, allowNull: true },
    atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  };
}

async function addDefaultIndexes(queryInterface, sequelize, tableName, extra = []) {
  await addIndexIfMissing(queryInterface, sequelize, tableName, ['empresa_id'], `idx_${tableName}_empresa`);
  await addIndexIfMissing(queryInterface, sequelize, tableName, ['obra_id'], `idx_${tableName}_obra`);
  for (const field of extra) {
    await addIndexIfMissing(queryInterface, sequelize, tableName, [field], `idx_${tableName}_${field}`);
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await createTableIfMissing(queryInterface, sequelize, 'sst_riscos', {
      ...baseColumns(DataTypes),
      setor_id: { type: DataTypes.INTEGER, allowNull: true },
      funcao_id: { type: DataTypes.INTEGER, allowNull: true },
      nome: { type: DataTypes.STRING(160), allowNull: false },
      categoria: { type: DataTypes.STRING(80), allowNull: true },
      severidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
      probabilidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_agentes_nocivos', {
      ...baseColumns(DataTypes),
      risco_id: { type: DataTypes.INTEGER, allowNull: true },
      tipo_agente: { type: DataTypes.STRING(80), allowNull: false },
      nome: { type: DataTypes.STRING(160), allowNull: false },
      intensidade: { type: DataTypes.STRING(60), allowNull: true },
      unidade: { type: DataTypes.STRING(30), allowNull: true },
      tecnica_avaliacao: { type: DataTypes.STRING(160), allowNull: true },
      limite_tolerancia: { type: DataTypes.STRING(80), allowNull: true },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_pgr', {
      ...baseColumns(DataTypes),
      responsavel: { type: DataTypes.STRING(160), allowNull: false },
      vigencia_inicio: { type: DataTypes.DATEONLY, allowNull: true },
      vigencia_fim: { type: DataTypes.DATEONLY, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ATIVO' },
      documento_url: { type: DataTypes.TEXT, allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_pcmso', {
      ...baseColumns(DataTypes),
      medico_responsavel: { type: DataTypes.STRING(160), allowNull: false },
      crm: { type: DataTypes.STRING(40), allowNull: true },
      vigencia_inicio: { type: DataTypes.DATEONLY, allowNull: true },
      vigencia_fim: { type: DataTypes.DATEONLY, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ATIVO' },
      documento_url: { type: DataTypes.TEXT, allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_aso', {
      ...baseColumns(DataTypes, { colaborador: true }),
      colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
      tipo_exame: { type: DataTypes.STRING(40), allowNull: false },
      apto: { type: DataTypes.BOOLEAN, allowNull: true },
      restricoes: { type: DataTypes.TEXT, allowNull: true },
      data_exame: { type: DataTypes.DATEONLY, allowNull: false },
      validade: { type: DataTypes.DATEONLY, allowNull: true },
      medico: { type: DataTypes.STRING(160), allowNull: true },
      crm: { type: DataTypes.STRING(40), allowNull: true },
      documento_url: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'VALIDO' },
      observacoes: { type: DataTypes.TEXT, allowNull: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_exames', {
      ...baseColumns(DataTypes, { colaborador: true }),
      colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
      tipo_exame: { type: DataTypes.STRING(40), allowNull: false },
      nome_exame: { type: DataTypes.STRING(160), allowNull: false },
      data_exame: { type: DataTypes.DATEONLY, allowNull: true },
      validade: { type: DataTypes.DATEONLY, allowNull: true },
      resultado: { type: DataTypes.STRING(80), allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PENDENTE' },
      documento_url: { type: DataTypes.TEXT, allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_epi_entregas', {
      ...baseColumns(DataTypes, { colaborador: true }),
      colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
      epi_nome: { type: DataTypes.STRING(160), allowNull: false },
      ca: { type: DataTypes.STRING(60), allowNull: true },
      quantidade: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 1 },
      entrega_em: { type: DataTypes.DATEONLY, allowNull: false },
      validade: { type: DataTypes.DATEONLY, allowNull: true },
      assinatura_url: { type: DataTypes.TEXT, allowNull: true },
      comprovante_url: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ENTREGUE' },
      observacoes: { type: DataTypes.TEXT, allowNull: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_treinamentos', {
      ...baseColumns(DataTypes, { colaborador: true }),
      colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
      codigo: { type: DataTypes.STRING(40), allowNull: true },
      nome: { type: DataTypes.STRING(160), allowNull: false },
      data_inicio: { type: DataTypes.DATEONLY, allowNull: true },
      data_fim: { type: DataTypes.DATEONLY, allowNull: true },
      validade: { type: DataTypes.DATEONLY, allowNull: true },
      instrutor: { type: DataTypes.STRING(160), allowNull: true },
      carga_horaria: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      certificado_url: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'VALIDO' },
      observacoes: { type: DataTypes.TEXT, allowNull: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_acidentes', {
      ...baseColumns(DataTypes, { colaborador: true }),
      tipo: { type: DataTypes.STRING(60), allowNull: false },
      gravidade: { type: DataTypes.STRING(40), allowNull: false },
      local: { type: DataTypes.STRING(180), allowNull: true },
      data_ocorrencia: { type: DataTypes.DATEONLY, allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: false },
      afastamento: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      dias_afastamento: { type: DataTypes.INTEGER, allowNull: true },
      cat_emitida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      cat_url: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'REGISTRADO' },
      observacoes: { type: DataTypes.TEXT, allowNull: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_documentos', {
      ...baseColumns(DataTypes, { colaborador: true }),
      tipo_documento: { type: DataTypes.STRING(60), allowNull: false },
      titulo: { type: DataTypes.STRING(180), allowNull: false },
      arquivo_url: { type: DataTypes.TEXT, allowNull: true },
      nome_original: { type: DataTypes.STRING(255), allowNull: true },
      mimetype: { type: DataTypes.STRING(120), allowNull: true },
      tamanho_bytes: { type: DataTypes.INTEGER, allowNull: true },
      validade: { type: DataTypes.DATEONLY, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ENVIADO' },
      observacoes: { type: DataTypes.TEXT, allowNull: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_eventos_esocial', {
      ...baseColumns(DataTypes, { colaborador: true }),
      tipo_evento: { type: DataTypes.STRING(20), allowNull: false },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PREPARADO' },
      xml_original: { type: DataTypes.TEXT('long'), allowNull: true },
      xml_assinado: { type: DataTypes.TEXT('long'), allowNull: true },
      protocolo: { type: DataTypes.STRING(120), allowNull: true },
      recibo: { type: DataTypes.STRING(120), allowNull: true },
      retorno: { type: DataTypes.TEXT('long'), allowNull: true },
      enviado_em: { type: DataTypes.DATE, allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true }
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_eventos_operacionais', {
      ...baseColumns(DataTypes, { empresaRequired: false, colaborador: true }),
      tipo_evento: { type: DataTypes.STRING(80), allowNull: false },
      severidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'INFO' },
      origem_tipo: { type: DataTypes.STRING(60), allowNull: true },
      origem_id: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ABERTO' },
      mensagem: { type: DataTypes.TEXT, allowNull: false },
      payload: { type: DataTypes.TEXT('long'), allowNull: true }
    });

    for (const tableName of [
      'sst_riscos',
      'sst_agentes_nocivos',
      'sst_pgr',
      'sst_pcmso',
      'sst_aso',
      'sst_exames',
      'sst_epi_entregas',
      'sst_treinamentos',
      'sst_acidentes',
      'sst_documentos',
      'sst_eventos_esocial',
      'sst_eventos_operacionais'
    ]) {
      await addDefaultIndexes(queryInterface, sequelize, tableName, [
        'colaborador_id',
        'status',
        'validade'
      ]);
    }

    await addIndexIfMissing(queryInterface, sequelize, 'sst_riscos', ['severidade'], 'idx_sst_riscos_severidade');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_acidentes', ['data_ocorrencia'], 'idx_sst_acidentes_data');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_eventos_operacionais', ['tipo_evento'], 'idx_sst_eventos_operacionais_tipo');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_eventos_esocial', ['tipo_evento'], 'idx_sst_eventos_esocial_tipo');
  },

  async down({ queryInterface, sequelize }) {
    for (const tableName of [
      'sst_eventos_operacionais',
      'sst_eventos_esocial',
      'sst_documentos',
      'sst_acidentes',
      'sst_treinamentos',
      'sst_epi_entregas',
      'sst_exames',
      'sst_aso',
      'sst_pcmso',
      'sst_pgr',
      'sst_agentes_nocivos',
      'sst_riscos'
    ]) {
      if (await tableExists(sequelize, tableName)) {
        await queryInterface.dropTable(tableName);
      }
    }
  }
};
