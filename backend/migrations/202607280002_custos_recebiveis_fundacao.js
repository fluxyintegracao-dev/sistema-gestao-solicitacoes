'use strict';

const {
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

const TABLES = {
  planos: 'cr_planos_obra',
  itens: 'cr_plano_itens',
  vinculos: 'cr_plano_macro_vinculos',
  importacoes: 'cr_importacoes',
  competencias: 'cr_competencias',
  custos: 'cr_previsoes_custo',
  receitas: 'cr_previsoes_receita',
  medicoes: 'cr_medicoes_consolidadas',
  realizados: 'cr_realizados',
  responsaveis: 'cr_responsaveis_obra',
  obrigacoes: 'cr_obrigacoes_usuario',
  reaberturas: 'cr_reaberturas',
  bypass: 'cr_guard_bypass',
  auditoria: 'cr_auditoria'
};

function id(DataTypes) {
  return {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  };
}

function timestamps(DataTypes) {
  return {
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
  };
}

function internalReference(DataTypes, table, allowNull = false) {
  return {
    type: DataTypes.INTEGER,
    allowNull,
    references: { model: table, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: allowNull ? 'SET NULL' : 'CASCADE'
  };
}

async function createIfMissing(queryInterface, sequelize, tableName, columns) {
  if (!(await tableExists(sequelize, tableName))) {
    await queryInterface.createTable(tableName, columns);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, options) {
  if (!(await indexExists(sequelize, tableName, options.name))) {
    await queryInterface.addIndex(tableName, fields, options);
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await createIfMissing(queryInterface, sequelize, TABLES.planos, {
      id: id(DataTypes),
      obra_id: { type: DataTypes.INTEGER, allowNull: false },
      versao: { type: DataTypes.INTEGER, allowNull: false },
      situacao: {
        type: DataTypes.ENUM('RASCUNHO', 'PUBLICADA', 'SUBSTITUIDA'),
        allowNull: false,
        defaultValue: 'RASCUNHO'
      },
      motivo_versao: { type: DataTypes.TEXT, allowNull: true },
      total_micro: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
      divergencia_macro_pct: { type: DataTypes.DECIMAL(7, 4), allowNull: true },
      publicado_por: { type: DataTypes.INTEGER, allowNull: true },
      publicado_em: { type: DataTypes.DATE, allowNull: true },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.planos, ['obra_id', 'versao'], {
      name: 'uq_cr_planos_obra_versao',
      unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.planos, ['obra_id', 'situacao'], {
      name: 'idx_cr_planos_obra_situacao'
    });

    await createIfMissing(queryInterface, sequelize, TABLES.itens, {
      id: id(DataTypes),
      plano_id: internalReference(DataTypes, TABLES.planos),
      codigo: { type: DataTypes.STRING(80), allowNull: false },
      descricao: { type: DataTypes.STRING(500), allowNull: false },
      unidade: { type: DataTypes.STRING(30), allowNull: true },
      quantidade: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
      custo_unitario: { type: DataTypes.DECIMAL(16, 4), allowNull: false, defaultValue: 0 },
      valor_total: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
      etapa_macro_codigo: { type: DataTypes.STRING(80), allowNull: true },
      item_pai_id: internalReference(DataTypes, TABLES.itens, true),
      somadora: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.itens, ['plano_id', 'codigo'], {
      name: 'uq_cr_plano_itens_codigo',
      unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.itens, ['plano_id', 'etapa_macro_codigo'], {
      name: 'idx_cr_plano_itens_macro'
    });

    await createIfMissing(queryInterface, sequelize, TABLES.vinculos, {
      id: id(DataTypes),
      plano_item_id: internalReference(DataTypes, TABLES.itens),
      apropriacao_id: { type: DataTypes.INTEGER, allowNull: false },
      observacao: { type: DataTypes.TEXT, allowNull: true },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.vinculos, ['plano_item_id', 'apropriacao_id'], {
      name: 'uq_cr_plano_macro_vinculos',
      unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.vinculos, ['apropriacao_id'], {
      name: 'idx_cr_plano_macro_apropriacao'
    });

    await createIfMissing(queryInterface, sequelize, TABLES.importacoes, {
      id: id(DataTypes),
      obra_id: { type: DataTypes.INTEGER, allowNull: false },
      plano_id: internalReference(DataTypes, TABLES.planos, true),
      arquivo_nome: { type: DataTypes.STRING(255), allowNull: false },
      arquivo_hash: { type: DataTypes.STRING(128), allowNull: false },
      linhas_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      linhas_validas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      linhas_rejeitadas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      resultado_json: { type: DataTypes.JSON, allowNull: true },
      usuario_id: { type: DataTypes.INTEGER, allowNull: false },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.importacoes, ['obra_id', 'arquivo_hash'], {
      name: 'uq_cr_importacoes_obra_hash',
      unique: true
    });

    await createIfMissing(queryInterface, sequelize, TABLES.competencias, {
      id: id(DataTypes),
      obra_id: { type: DataTypes.INTEGER, allowNull: false },
      competencia: { type: DataTypes.STRING(7), allowNull: false },
      estado: {
        type: DataTypes.ENUM('ABERTA', 'EM_PREENCHIMENTO', 'FINALIZADA', 'REABERTA'),
        allowNull: false,
        defaultValue: 'ABERTA'
      },
      plano_versao_snapshot: { type: DataTypes.INTEGER, allowNull: true },
      finalizado_por: { type: DataTypes.INTEGER, allowNull: true },
      finalizado_em: { type: DataTypes.DATE, allowNull: true },
      total_custo_previsto: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
      total_receita_prevista: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.competencias, ['obra_id', 'competencia'], {
      name: 'uq_cr_competencias_obra_competencia',
      unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.competencias, ['estado', 'competencia'], {
      name: 'idx_cr_competencias_estado'
    });

    await createIfMissing(queryInterface, sequelize, TABLES.custos, {
      id: id(DataTypes),
      competencia_id: internalReference(DataTypes, TABLES.competencias),
      plano_item_id: internalReference(DataTypes, TABLES.itens),
      etapa_macro_codigo: { type: DataTypes.STRING(80), allowNull: true },
      quantidade: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
      custo_unitario: { type: DataTypes.DECIMAL(16, 4), allowNull: false, defaultValue: 0 },
      valor_previsto: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
      parceiro_id: { type: DataTypes.INTEGER, allowNull: true },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.custos, ['competencia_id', 'plano_item_id'], {
      name: 'uq_cr_previsoes_custo_item',
      unique: true
    });

    await createIfMissing(queryInterface, sequelize, TABLES.receitas, {
      id: id(DataTypes),
      competencia_id: internalReference(DataTypes, TABLES.competencias),
      origem: {
        type: DataTypes.ENUM('MEDICAO', 'CONTRATO'),
        allowNull: false
      },
      plano_item_id: internalReference(DataTypes, TABLES.itens, true),
      contrato_parcela_id: { type: DataTypes.INTEGER, allowNull: true },
      titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: true },
      quantidade_prevista: { type: DataTypes.DECIMAL(18, 4), allowNull: true },
      valor_previsto: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
      data_prevista: { type: DataTypes.DATEONLY, allowNull: true },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.receitas, ['competencia_id', 'origem'], {
      name: 'idx_cr_previsoes_receita_origem'
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.receitas, ['contrato_parcela_id'], {
      name: 'idx_cr_previsoes_receita_parcela'
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.receitas, ['titulo_financeiro_id'], {
      name: 'idx_cr_previsoes_receita_titulo'
    });

    await createIfMissing(queryInterface, sequelize, TABLES.medicoes, {
      id: id(DataTypes),
      competencia_id: internalReference(DataTypes, TABLES.competencias),
      plano_item_id: internalReference(DataTypes, TABLES.itens),
      quantidade_medida: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
      valor_medido: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
      data_medicao: { type: DataTypes.DATEONLY, allowNull: true },
      numero_medicao: { type: DataTypes.STRING(80), allowNull: true },
      registrado_por: { type: DataTypes.INTEGER, allowNull: false },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.medicoes, ['competencia_id', 'plano_item_id'], {
      name: 'uq_cr_medicoes_competencia_item',
      unique: true
    });

    await createIfMissing(queryInterface, sequelize, TABLES.realizados, {
      id: id(DataTypes),
      competencia_id: internalReference(DataTypes, TABLES.competencias),
      obra_id: { type: DataTypes.INTEGER, allowNull: false },
      etapa_macro_codigo: { type: DataTypes.STRING(80), allowNull: true },
      plano_item_id: internalReference(DataTypes, TABLES.itens, true),
      titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: true },
      movimento_financeiro_id: { type: DataTypes.INTEGER, allowNull: false },
      valor: { type: DataTypes.DECIMAL(16, 2), allowNull: false },
      estado: {
        type: DataTypes.ENUM('COMPROMETIDO', 'INCORRIDO', 'BAIXA_ATIVA', 'NAO_MAPEADO'),
        allowNull: false
      },
      processado_em: { type: DataTypes.DATE, allowNull: false },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.realizados, ['movimento_financeiro_id', 'plano_item_id'], {
      name: 'uq_cr_realizados_movimento_item',
      unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.realizados, ['obra_id', 'competencia_id', 'estado'], {
      name: 'idx_cr_realizados_obra_competencia_estado'
    });

    await createIfMissing(queryInterface, sequelize, TABLES.responsaveis, {
      id: id(DataTypes),
      obra_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      papel: {
        type: DataTypes.ENUM('RESPONSAVEL', 'SUBSTITUTO'),
        allowNull: false
      },
      competencia_inicial: { type: DataTypes.STRING(7), allowNull: false },
      vigencia_inicio: { type: DataTypes.DATEONLY, allowNull: false },
      vigencia_fim: { type: DataTypes.DATEONLY, allowNull: true },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.responsaveis, ['obra_id', 'user_id', 'papel', 'vigencia_inicio'], {
      name: 'uq_cr_responsaveis_vigencia',
      unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.responsaveis, ['user_id', 'ativo'], {
      name: 'idx_cr_responsaveis_usuario_ativo'
    });

    await createIfMissing(queryInterface, sequelize, TABLES.obrigacoes, {
      id: id(DataTypes),
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      obra_id: { type: DataTypes.INTEGER, allowNull: false },
      competencia: { type: DataTypes.STRING(7), allowNull: false },
      tipo: {
        type: DataTypes.ENUM('CUSTO_PREVISTO', 'RECEITA_PREVISTA', 'MEDICAO_CONSOLIDADA'),
        allowNull: false
      },
      prazo_em: { type: DataTypes.DATE, allowNull: false },
      situacao: {
        type: DataTypes.ENUM('PENDENTE', 'CUMPRIDA', 'VENCIDA', 'DISPENSADA'),
        allowNull: false,
        defaultValue: 'PENDENTE'
      },
      cumprida_em: { type: DataTypes.DATE, allowNull: true },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.obrigacoes, ['user_id', 'obra_id', 'competencia', 'tipo'], {
      name: 'uq_cr_obrigacoes_usuario_obra_competencia_tipo',
      unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.obrigacoes, ['situacao', 'prazo_em'], {
      name: 'idx_cr_obrigacoes_situacao_prazo'
    });

    await createIfMissing(queryInterface, sequelize, TABLES.reaberturas, {
      id: id(DataTypes),
      competencia_id: internalReference(DataTypes, TABLES.competencias),
      solicitado_por: { type: DataTypes.INTEGER, allowNull: false },
      motivo: { type: DataTypes.TEXT, allowNull: false },
      situacao: {
        type: DataTypes.ENUM('SOLICITADA', 'APROVADA', 'NEGADA'),
        allowNull: false,
        defaultValue: 'SOLICITADA'
      },
      aprovado_por: { type: DataTypes.INTEGER, allowNull: true },
      aprovado_em: { type: DataTypes.DATE, allowNull: true },
      expira_em: { type: DataTypes.DATE, allowNull: true },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.reaberturas, ['competencia_id', 'situacao'], {
      name: 'idx_cr_reaberturas_competencia_situacao'
    });

    await createIfMissing(queryInterface, sequelize, TABLES.bypass, {
      id: id(DataTypes),
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      motivo: { type: DataTypes.TEXT, allowNull: false },
      concedido_por: { type: DataTypes.INTEGER, allowNull: false },
      concedido_em: { type: DataTypes.DATE, allowNull: false },
      expira_em: { type: DataTypes.DATE, allowNull: false },
      revogado_por: { type: DataTypes.INTEGER, allowNull: true },
      revogado_em: { type: DataTypes.DATE, allowNull: true },
      ...timestamps(DataTypes)
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.bypass, ['user_id', 'obra_id', 'expira_em'], {
      name: 'idx_cr_guard_bypass_escopo_expiracao'
    });

    await createIfMissing(queryInterface, sequelize, TABLES.auditoria, {
      id: id(DataTypes),
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      competencia_id: { type: DataTypes.INTEGER, allowNull: true },
      usuario_id: { type: DataTypes.INTEGER, allowNull: true },
      evento: { type: DataTypes.STRING(120), allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      payload_json: { type: DataTypes.JSON, allowNull: true },
      origem: {
        type: DataTypes.ENUM('web', 'job'),
        allowNull: false,
        defaultValue: 'web'
      },
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.auditoria, ['obra_id', 'criado_em'], {
      name: 'idx_cr_auditoria_obra_data'
    });
    await addIndexIfMissing(queryInterface, sequelize, TABLES.auditoria, ['competencia_id', 'criado_em'], {
      name: 'idx_cr_auditoria_competencia_data'
    });
  },

  async down({ queryInterface, sequelize }) {
    const dropOrder = [
      TABLES.auditoria,
      TABLES.bypass,
      TABLES.reaberturas,
      TABLES.obrigacoes,
      TABLES.responsaveis,
      TABLES.realizados,
      TABLES.medicoes,
      TABLES.receitas,
      TABLES.custos,
      TABLES.competencias,
      TABLES.importacoes,
      TABLES.vinculos,
      TABLES.itens,
      TABLES.planos
    ];

    for (const tableName of dropOrder) {
      if (await tableExists(sequelize, tableName)) {
        await queryInterface.dropTable(tableName);
      }
    }
  }
};
