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

function auditColumns(DataTypes) {
  return {
    criado_por: { type: DataTypes.INTEGER, allowNull: true },
    atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  };
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await createTableIfMissing(queryInterface, sequelize, 'sst_ambientes_trabalho', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: false },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      setor_id: { type: DataTypes.INTEGER, allowNull: true },
      nome: { type: DataTypes.STRING(160), allowNull: false },
      tipo_ambiente: { type: DataTypes.STRING(60), allowNull: true },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      local_amb: { type: DataTypes.STRING(60), allowNull: true },
      esocial_tp_insc: { type: DataTypes.STRING(10), allowNull: true },
      esocial_nr_insc: { type: DataTypes.STRING(30), allowNull: true },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_exposicoes', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: false },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
      ambiente_id: { type: DataTypes.INTEGER, allowNull: true },
      risco_id: { type: DataTypes.INTEGER, allowNull: true },
      agente_nocivo_id: { type: DataTypes.INTEGER, allowNull: true },
      data_inicio: { type: DataTypes.DATEONLY, allowNull: false },
      data_fim: { type: DataTypes.DATEONLY, allowNull: true },
      atividade_desempenhada: { type: DataTypes.TEXT, allowNull: true },
      codigo_agente_nocivo: { type: DataTypes.STRING(30), allowNull: true },
      descricao_agente_nocivo: { type: DataTypes.STRING(180), allowNull: true },
      intensidade: { type: DataTypes.STRING(60), allowNull: true },
      unidade_medida: { type: DataTypes.STRING(30), allowNull: true },
      tecnica_medicao: { type: DataTypes.STRING(160), allowNull: true },
      limite_tolerancia: { type: DataTypes.STRING(80), allowNull: true },
      utiliza_epc: { type: DataTypes.BOOLEAN, allowNull: true },
      epc_eficaz: { type: DataTypes.BOOLEAN, allowNull: true },
      utiliza_epi: { type: DataTypes.BOOLEAN, allowNull: true },
      epi_eficaz: { type: DataTypes.BOOLEAN, allowNull: true },
      epi_ca: { type: DataTypes.STRING(60), allowNull: true },
      responsavel_tecnico_nome: { type: DataTypes.STRING(160), allowNull: true },
      responsavel_tecnico_cpf: { type: DataTypes.STRING(14), allowNull: true },
      responsavel_tecnico_registro: { type: DataTypes.STRING(40), allowNull: true },
      responsavel_tecnico_orgao: { type: DataTypes.STRING(40), allowNull: true },
      responsavel_tecnico_uf: { type: DataTypes.STRING(2), allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ATIVA' },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'esocial_layout_versions', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      layout_version: { type: DataTypes.STRING(20), allowNull: false },
      schema_version: { type: DataTypes.STRING(40), allowNull: true },
      source_package: { type: DataTypes.STRING(160), allowNull: true },
      namespace_base: { type: DataTypes.STRING(255), allowNull: true },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      metadados_json: { type: DataTypes.TEXT('long'), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, sequelize, 'esocial_lotes', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: false },
      layout_version_id: { type: DataTypes.INTEGER, allowNull: true },
      ambiente: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NAO_CONFIGURADO' },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'RASCUNHO' },
      protocolo: { type: DataTypes.STRING(120), allowNull: true },
      lote_identificador: { type: DataTypes.STRING(120), allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      enviado_em: { type: DataTypes.DATE, allowNull: true },
      processado_em: { type: DataTypes.DATE, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'esocial_eventos', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: false },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      layout_version_id: { type: DataTypes.INTEGER, allowNull: true },
      lote_id: { type: DataTypes.INTEGER, allowNull: true },
      origem_modulo: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'SST' },
      origem_tipo: { type: DataTypes.STRING(60), allowNull: true },
      origem_id: { type: DataTypes.INTEGER, allowNull: true },
      tipo_evento: { type: DataTypes.STRING(20), allowNull: false },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PREPARADO' },
      xml_original: { type: DataTypes.TEXT('long'), allowNull: true },
      xml_assinado: { type: DataTypes.TEXT('long'), allowNull: true },
      protocolo: { type: DataTypes.STRING(120), allowNull: true },
      recibo: { type: DataTypes.STRING(120), allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      validation_errors_json: { type: DataTypes.TEXT('long'), allowNull: true },
      transmission_blocked_reason: { type: DataTypes.TEXT, allowNull: true },
      preparado_em: { type: DataTypes.DATE, allowNull: true },
      enviado_em: { type: DataTypes.DATE, allowNull: true },
      processado_em: { type: DataTypes.DATE, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'esocial_retornos', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      evento_id: { type: DataTypes.INTEGER, allowNull: true },
      lote_id: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'RECEBIDO' },
      codigo: { type: DataTypes.STRING(60), allowNull: true },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      payload_xml: { type: DataTypes.TEXT('long'), allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      recebido_em: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await addIndexIfMissing(queryInterface, sequelize, 'sst_ambientes_trabalho', ['empresa_id'], 'idx_sst_ambientes_empresa');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_ambientes_trabalho', ['obra_id'], 'idx_sst_ambientes_obra');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_exposicoes', ['empresa_id'], 'idx_sst_exposicoes_empresa');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_exposicoes', ['colaborador_id'], 'idx_sst_exposicoes_colaborador');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_exposicoes', ['ambiente_id'], 'idx_sst_exposicoes_ambiente');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_exposicoes', ['data_inicio'], 'idx_sst_exposicoes_data_inicio');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_layout_versions', ['layout_version'], 'idx_esocial_layout_versions_layout');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_lotes', ['empresa_id'], 'idx_esocial_lotes_empresa');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_eventos', ['empresa_id'], 'idx_esocial_eventos_empresa');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_eventos', ['tipo_evento'], 'idx_esocial_eventos_tipo');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_eventos', ['origem_tipo', 'origem_id'], 'idx_esocial_eventos_origem');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_retornos', ['evento_id'], 'idx_esocial_retornos_evento');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_retornos', ['lote_id'], 'idx_esocial_retornos_lote');

    const [layoutS13] = await sequelize.query(
      "SELECT id FROM esocial_layout_versions WHERE layout_version = 'S-1.3' LIMIT 1"
    );

    if (!layoutS13.length) {
      await queryInterface.bulkInsert('esocial_layout_versions', [{
        layout_version: 'S-1.3',
        schema_version: 'v_s_01_03_00',
        source_package: '2026-04-27_esquemas_xsd_v_s_01_03_00',
        namespace_base: 'http://www.esocial.gov.br/schema/evt',
        ativo: true,
        metadados_json: JSON.stringify({
          sourcePath: 'SST ARQUIVOS/2026-04-27_esquemas_xsd_v_s_01_03_00',
          events: ['S-2210', 'S-2220', 'S-2240'],
          transmissionEnabled: false
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    }
  },

  async down({ queryInterface }) {
    await queryInterface.dropTable('esocial_retornos');
    await queryInterface.dropTable('esocial_eventos');
    await queryInterface.dropTable('esocial_lotes');
    await queryInterface.dropTable('esocial_layout_versions');
    await queryInterface.dropTable('sst_exposicoes');
    await queryInterface.dropTable('sst_ambientes_trabalho');
  }
};
