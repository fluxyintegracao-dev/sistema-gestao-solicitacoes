'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  assertCompetenciaNovoMes,
  consolidarMedicao,
  finalizarCompetencia,
  findPrivateSources,
  monthRange,
  normalizeCompetencia,
  salvarCustos,
  statusComparativo
} = require('../services/planejamentoService');

const moduleRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(moduleRoot, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.resolve(backendRoot, relativePath), 'utf8');
}

function validateComparisonStates() {
  assert.strictEqual(statusComparativo(0, 0), 'NEUTRO');
  assert.strictEqual(statusComparativo(0, 10), 'SEM_PREVISAO');
  assert.strictEqual(statusComparativo(10, 0), 'A_REALIZAR');
  assert.strictEqual(statusComparativo(10, 10), 'DENTRO');
  assert.strictEqual(statusComparativo(10, 9.99), 'DENTRO');
  assert.strictEqual(statusComparativo(10, 10.01), 'ESTOURO');
}

function validateCompetenciaBoundaries() {
  assert.strictEqual(normalizeCompetencia('2026-08'), '2026-08');
  assert.deepStrictEqual(monthRange('2026-12'), {
    first: '2026-12-01',
    nextMonth: '2027-01-01'
  });
  assert.throws(() => normalizeCompetencia('08/2026'), /Competencia invalida/);
  assert.deepStrictEqual(
    assertCompetenciaNovoMes('2026-08', new Date('2026-07-15T12:00:00-03:00')),
    ['2026-07', '2026-08']
  );
  assert.throws(
    () => assertCompetenciaNovoMes('2026-09', new Date('2026-07-15T12:00:00-03:00')),
    /Novo mes permite somente/
  );
}

function validateBackendContracts() {
  const service = read('src/modules/custosRecebiveis/services/planejamentoService.js');
  const routes = read('src/modules/custosRecebiveis/routes/index.js');
  const controller = read('src/modules/custosRecebiveis/controllers/CustosRecebiveisController.js');

  [
    "'/dashboard'",
    "'/obras/:obraId/competencias'",
    "'/obras/:obraId/plano/itens'",
    "'/obras/:obraId/competencias/:competencia'",
    "'/obras/:obraId/competencias/:competencia/custos'",
    "'/obras/:obraId/competencias/:competencia/receitas'",
    "'/obras/:obraId/competencias/:competencia/finalizar'",
    "'/obras/:obraId/competencias/:competencia/medicao'",
    "'/obras/:obraId/comparativo'",
    "'/competencias/:competenciaId/reabertura'",
    "'/reaberturas/:reaberturaId/aprovar'"
  ].forEach((contract) => assert(routes.includes(contract), `Rota ausente: ${contract}`));

  [
    'DASHBOARD_VIEW',
    'PLANEJAMENTO_VIEW',
    'PLANEJAMENTO_COSTS',
    'PLANEJAMENTO_RECEIVABLES',
    'PLANEJAMENTO_FINISH',
    'MEDICAO_CONSOLIDATE',
    'COMPARATIVO_VIEW',
    'REOPEN_REQUEST',
    'REOPEN_APPROVE'
  ].forEach((permission) => assert(routes.includes(permission), `Permissao ausente: ${permission}`));

  assert(service.includes("estado === 'FINALIZADA'"));
  assert(service.includes('CR_COMPETENCIA_IMUTAVEL'));
  assert(service.includes("situacao: 'APROVADA'"));
  assert(service.includes("expira_em: { [Op.gt]: new Date() }"));
  assert(service.includes('Idempotency-Key e obrigatoria'));
  assert(service.includes('transaction.LOCK.UPDATE'));
  assert(service.includes("origem_exibicao: linkedTitleIsReceivable ? 'TITULO' : 'PARCELA_CONTRATUAL'"));
  assert(service.includes("String(obra.classificacao).toUpperCase() !== 'PUBLICA'"));
  assert(service.includes('CrAuditoria.create'));
  assert(!service.includes('Apropriacao.update'));
  assert(!service.includes('Apropriacao.destroy'));
  assert(controller.includes("req.get('Idempotency-Key')"));
}

function validateFrontendContracts() {
  const constants = read('../frontend/src/modules/custosRecebiveis/constants/custosRecebiveis.js');
  const page = read('../frontend/src/modules/custosRecebiveis/pages/CustosRecebiveis.jsx');
  const planning = read('../frontend/src/modules/custosRecebiveis/components/CrPlanejamentoView.jsx');
  const monthlyPlanning = read(
    '../frontend/src/modules/custosRecebiveis/components/CrPlanejamentoMensalView.jsx'
  );
  const dashboard = read('../frontend/src/modules/custosRecebiveis/components/CrDashboardView.jsx');
  const comparison = read('../frontend/src/modules/custosRecebiveis/components/CrComparativoView.jsx');

  ['visao-geral', 'planejamento', 'comparativo'].forEach((tab) => (
    assert(constants.includes(`id: '${tab}'`), `Aba ausente: ${tab}`)
  ));
  assert(page.includes('<CrDashboardView'));
  assert(page.includes('<CrPlanejamentoMensalView'));
  assert(page.includes('<CrComparativoView'));
  assert(planning.includes('Etapa {step} de {STEPS.length}'));
  assert(planning.includes('Parcela vinculada a título aparece uma única vez'));
  assert(planning.includes('Competência finalizada e imutável'));
  assert(planning.includes('disabled={Boolean(saving)}'));
  assert(planning.includes('Registrar medição aprovada'));
  assert(planning.includes('justificativa_glosa'));
  assert(monthlyPlanning.includes('Novo mês'));
  assert(monthlyPlanning.includes('Receita recebida'));
  assert(dashboard.includes('Previsto x realizado por macro'));
  assert(dashboard.includes('Status das etapas'));
  assert(comparison.includes('COMPARATIVO_ESTADO_LABELS'));
}

function transactionHarness() {
  return {
    transaction: async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } })
  };
}

function commonScope() {
  return async () => ({ todas: true, obraIds: null });
}

async function validatePrivateAntiDoubleCount() {
  const sources = await findPrivateSources(7, '2026-08', {
    ContratoComercialParcela: {
      findAll: async () => [{
        id: 91,
        descricao: 'Parcela 1',
        data_vencimento: '2026-08-10',
        valor_original: 1000,
        contrato: { id: 12, numero: 'CT-12', obra_id: 7, status: 'ATIVO' },
        tituloFinanceiro: {
          id: 33,
          codigo: 'REC-33',
          descricao: 'Titulo da parcela',
          tipo: 'RECEBER',
          valor_original: 1250,
          data_vencimento: '2026-08-12'
        }
      }]
    },
    ContratoComercial: {},
    TituloFinanceiro: {}
  });
  assert.strictEqual(sources.length, 1);
  assert.strictEqual(sources[0].key, 'titulo:33');
  assert.strictEqual(sources[0].origem_exibicao, 'TITULO');
  assert.strictEqual(sources[0].valor_previsto, 1250);
}

async function validateFinalizationIdempotency() {
  let writes = 0;
  const finalized = {
    id: 41,
    obra_id: 7,
    competencia: '2026-08',
    estado: 'FINALIZADA',
    total_custo_previsto: 100,
    total_receita_prevista: 200
  };
  const overrides = {
    sequelize: transactionHarness(),
    resolverEscopoObras: commonScope(),
    Obra: { findByPk: async () => ({ id: 7, nome: 'Obra', classificacao: 'PUBLICA' }) },
    CrPlanoObra: { findOne: async () => ({ id: 3, versao: 2, situacao: 'PUBLICADA' }) },
    CrCompetencia: {
      findOne: async () => finalized,
      create: async () => { writes += 1; }
    },
    CrAuditoria: { create: async () => { writes += 1; } }
  };
  const first = await finalizarCompetencia(
    { id: 1 },
    7,
    '2026-08',
    {},
    'same-key',
    overrides
  );
  const second = await finalizarCompetencia(
    { id: 1 },
    7,
    '2026-08',
    {},
    'same-key',
    overrides
  );
  assert.strictEqual(first.idempotente, true);
  assert.strictEqual(second.idempotente, true);
  assert.strictEqual(writes, 0);
}

async function validateFinalizedCompetencyIsImmutable() {
  let replacedRows = 0;
  const finalized = {
    id: 41,
    obra_id: 7,
    competencia: '2026-08',
    estado: 'FINALIZADA'
  };
  await assert.rejects(
    () => salvarCustos(
      { id: 1 },
      7,
      '2026-08',
      { itens: [] },
      {
        sequelize: transactionHarness(),
        resolverEscopoObras: commonScope(),
        Obra: { findByPk: async () => ({ id: 7, nome: 'Obra', classificacao: 'PUBLICA' }) },
        CrPlanoObra: { findOne: async () => ({ id: 3, versao: 2, situacao: 'PUBLICADA' }) },
        CrPlanoItem: { findAll: async () => [] },
        CrCompetencia: { findOne: async () => finalized },
        CrReabertura: { findOne: async () => null },
        CrPrevisaoCusto: {
          destroy: async () => { replacedRows += 1; },
          bulkCreate: async () => { replacedRows += 1; }
        }
      }
    ),
    (error) => error?.code === 'CR_COMPETENCIA_IMUTAVEL'
  );
  assert.strictEqual(replacedRows, 0);
}

async function validatePrivateWorkRejectsMeasurement() {
  await assert.rejects(
    () => consolidarMedicao(
      { id: 1 },
      7,
      '2026-08',
      { itens: [] },
      {
        sequelize: transactionHarness(),
        resolverEscopoObras: commonScope(),
        Obra: {
          findByPk: async () => ({ id: 7, nome: 'Obra privada', classificacao: 'PRIVADA' })
        }
      }
    ),
    (error) => error?.code === 'CR_MEDICAO_APENAS_OBRA_PUBLICA'
  );
}

async function validateApprovedMeasurementAndGlosa() {
  let createdMeasurement = null;
  let auditPayload = null;
  const competencia = {
    id: 41,
    obra_id: 7,
    competencia: '2026-08',
    estado: 'FINALIZADA',
    total_custo_previsto: 0,
    total_receita_prevista: 100
  };
  const overrides = {
    sequelize: transactionHarness(),
    resolverEscopoObras: commonScope(),
    Obra: {
      findByPk: async () => ({ id: 7, nome: 'Obra publica', classificacao: 'PUBLICA' })
    },
    CrPlanoObra: {
      findOne: async () => ({ id: 3, versao: 2, situacao: 'PUBLICADA' })
    },
    CrPlanoItem: {
      findAll: async () => [{
        id: 9,
        plano_id: 3,
        codigo: '01.01',
        descricao: 'Servico',
        somadora: false,
        custo_unitario: 10
      }]
    },
    CrCompetencia: { findOne: async () => competencia },
    CrPrevisaoReceita: {
      findAll: async () => [{
        competencia_id: 41,
        origem: 'MEDICAO',
        plano_item_id: 9,
        quantidade_prevista: 10,
        valor_previsto: 100
      }]
    },
    CrMedicaoConsolidada: {
      destroy: async () => 0,
      findOne: async () => null,
      create: async (payload) => {
        createdMeasurement = payload;
        return payload;
      }
    },
    CrAuditoria: {
      findOne: async () => null,
      create: async (payload) => {
        auditPayload = payload.payload_json;
      }
    }
  };
  const result = await consolidarMedicao(
    { id: 1 },
    7,
    '2026-08',
    {
      idempotency_key: 'medicao-1',
      itens: [{
        plano_item_id: 9,
        quantidade_medida: 6,
        valor_medido: 60,
        justificativa_glosa: 'Glosa registrada pelo orgao.'
      }]
    },
    overrides
  );
  assert.strictEqual(result.valor_total, 60);
  assert.strictEqual(result.valor_glosa, 40);
  assert.strictEqual(createdMeasurement.valor_glosa, 40);
  assert.strictEqual(auditPayload.idempotency_key, 'medicao-1');

  await assert.rejects(
    () => consolidarMedicao(
      { id: 1 },
      7,
      '2026-08',
      {
        idempotency_key: 'medicao-2',
        itens: [{
          plano_item_id: 9,
          quantidade_medida: 11,
          valor_medido: 110,
          justificativa_glosa: null
        }]
      },
      overrides
    ),
    (error) => error?.code === 'CR_MEDICAO_ACIMA_APRESENTADA'
  );
}

async function run() {
  validateComparisonStates();
  validateCompetenciaBoundaries();
  validateBackendContracts();
  validateFrontendContracts();
  await validatePrivateAntiDoubleCount();
  await validateFinalizationIdempotency();
  await validateFinalizedCompetencyIsImmutable();
  await validatePrivateWorkRejectsMeasurement();
  await validateApprovedMeasurementAndGlosa();
  console.log('Fase 2 de Custos e Recebiveis validada com sucesso.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
