const { columnExists } = require('../src/database/schemaUtils');

async function addBooleanColumnIfMissing(queryInterface, sequelize, tableName, columnName) {
  if (await columnExists(sequelize, tableName, columnName)) {
    return;
  }

  await queryInterface.addColumn(tableName, columnName, {
    type: require('sequelize').BOOLEAN,
    allowNull: false,
    defaultValue: false
  });
}

async function addStringColumnIfMissing(queryInterface, sequelize, tableName, columnName, options = {}) {
  if (await columnExists(sequelize, tableName, columnName)) {
    return;
  }

  await queryInterface.addColumn(tableName, columnName, {
    type: options.type || require('sequelize').STRING,
    allowNull: options.allowNull !== false,
    defaultValue: options.defaultValue
  });
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function inferSetorFlags(setor) {
  const codigo = normalizeToken(setor?.codigo);
  const nome = normalizeToken(setor?.nome);
  const tokens = [codigo, nome].filter(Boolean);
  const has = (token) => tokens.includes(token);

  return {
    eh_setor_obra: has('OBRA'),
    eh_setor_financeiro: has('FINANCEIRO'),
    eh_setor_compras: has('COMPRAS'),
    eh_setor_geo: ['GEO', 'GERENCIA_DE_PROCESSOS', 'GERENCIA_PROCESSOS'].some(has),
    eh_setor_administrativo: has('ADMINISTRATIVO')
  };
}

function inferTipoConfig(tipo) {
  const nome = String(tipo?.nome || '').trim().toUpperCase();
  const nomeNormalizado = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const nomeToken = nomeNormalizado
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const base = {
    codigo_interno: nomeToken || null,
    comportamento: {
      mostrar_valor: true,
      exige_valor: true,
      mostrar_descricao: true,
      exige_descricao: true,
      mostrar_apropriacao_principal: true,
      exige_apropriacao_principal: true,
      mostrar_contrato: false,
      exige_contrato: false,
      mostrar_subtipo: false,
      exige_subtipo: false,
      mostrar_periodo_medicao: false,
      exige_periodo_medicao: false,
      mostrar_ref_contrato_abertura: false,
      exige_ref_contrato_abertura: false,
      mostrar_itens_apropriacao: false,
      exige_itens_apropriacao: false
    }
  };

  if (['SOLICITACAO DE COMPRA', 'OUTROS ASSUNTOS', 'PEDIDO DE CONTRATACAO'].includes(nomeNormalizado)) {
    base.comportamento.mostrar_valor = false;
    base.comportamento.exige_valor = false;
  }

  if (nomeNormalizado === 'SOLICITACAO DE COMPRA') {
    base.comportamento.mostrar_apropriacao_principal = false;
    base.comportamento.exige_apropriacao_principal = false;
  }

  if (nomeNormalizado === 'MEDICAO') {
    base.comportamento.exige_descricao = false;
    base.comportamento.mostrar_contrato = true;
    base.comportamento.exige_contrato = true;
    base.comportamento.mostrar_periodo_medicao = true;
    base.comportamento.exige_periodo_medicao = true;
  }

  if (nomeNormalizado === 'ADM LOCAL DE OBRA') {
    base.comportamento.mostrar_contrato = true;
    base.comportamento.exige_contrato = true;
    base.comportamento.mostrar_subtipo = true;
    base.comportamento.exige_subtipo = true;
  }

  if (nomeToken === 'LOCACAO_DE_MAQ_EQ') {
    base.comportamento.mostrar_contrato = true;
    base.comportamento.exige_contrato = true;
  }

  if (nomeNormalizado === 'ABERTURA DE CONTRATO') {
    base.comportamento.mostrar_ref_contrato_abertura = true;
    base.comportamento.exige_ref_contrato_abertura = true;
    base.comportamento.mostrar_itens_apropriacao = true;
    base.comportamento.exige_itens_apropriacao = true;
  }

  return base;
}

module.exports = {
  async up({ queryInterface, sequelize }) {
    const Sequelize = require('sequelize');

    await addBooleanColumnIfMissing(queryInterface, sequelize, 'setores', 'eh_setor_obra');
    await addBooleanColumnIfMissing(queryInterface, sequelize, 'setores', 'eh_setor_financeiro');
    await addBooleanColumnIfMissing(queryInterface, sequelize, 'setores', 'eh_setor_compras');
    await addBooleanColumnIfMissing(queryInterface, sequelize, 'setores', 'eh_setor_geo');
    await addBooleanColumnIfMissing(queryInterface, sequelize, 'setores', 'eh_setor_administrativo');

    await addStringColumnIfMissing(queryInterface, sequelize, 'tipo_solicitacao', 'codigo_interno', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });
    await addStringColumnIfMissing(queryInterface, sequelize, 'tipo_solicitacao', 'comportamento', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      defaultValue: null
    });

    const setores = await sequelize.query(
      'SELECT id, nome, codigo FROM setores',
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (const setor of setores || []) {
      const flags = inferSetorFlags(setor);
      await queryInterface.bulkUpdate(
        'setores',
        flags,
        { id: setor.id }
      );
    }

    const tipos = await sequelize.query(
      'SELECT id, nome FROM tipo_solicitacao',
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (const tipo of tipos || []) {
      const config = inferTipoConfig(tipo);
      await queryInterface.bulkUpdate(
        'tipo_solicitacao',
        {
          codigo_interno: config.codigo_interno,
          comportamento: JSON.stringify(config.comportamento)
        },
        { id: tipo.id }
      );
    }
  },

  async down({ queryInterface, sequelize }) {
    const removerColuna = async (tableName, columnName) => {
      if (await columnExists(sequelize, tableName, columnName)) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    };

    await removerColuna('tipo_solicitacao', 'comportamento');
    await removerColuna('tipo_solicitacao', 'codigo_interno');

    await removerColuna('setores', 'eh_setor_administrativo');
    await removerColuna('setores', 'eh_setor_geo');
    await removerColuna('setores', 'eh_setor_compras');
    await removerColuna('setores', 'eh_setor_financeiro');
    await removerColuna('setores', 'eh_setor_obra');
  }
};
