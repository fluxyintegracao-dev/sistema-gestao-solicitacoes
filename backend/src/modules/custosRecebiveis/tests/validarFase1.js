'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  MODEL_COLUMNS,
  normalizeCode,
  parseNonNegativeDecimal,
  validatePlanoMicroRows
} = require('../validators/planoMicroValidator');
const {
  DIVERGENCE_TOLERANCE_PCT,
  resolverObraIdPorPlano
} = require('../services/planoMicroService');

const moduleRoot = path.resolve(__dirname, '..');

function validateNormalization() {
  assert.strictEqual(normalizeCode(' 00.001 a '), '00.001 A');
  assert.deepStrictEqual(parseNonNegativeDecimal('1.234,56', 'Valor'), { value: 1234.56 });
  assert.deepStrictEqual(parseNonNegativeDecimal('1234.56', 'Valor'), { value: 1234.56 });
  assert(parseNonNegativeDecimal('-1', 'Valor').error);
}

function validateSuccessfulPreview() {
  const rows = [
    MODEL_COLUMNS,
    ['01', 'Estrutura', '', 0, 0, '', ''],
    ['01.001', 'Concreto', 'm3', 2, 10, 'M1', '01'],
    ['01.002', 'Aco', 'kg', 3, 10, 'M2', '01']
  ];
  const macros = [
    { id: 10, codigo: 'M1', descricao: 'Macro 1', valor_orcado: 20, somadora: false },
    { id: 11, codigo: 'M2', descricao: 'Macro 2', valor_orcado: 30, somadora: false }
  ];
  const result = validatePlanoMicroRows(rows, macros);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.summary.linhas_total, 3);
  assert.strictEqual(result.summary.linhas_validas, 3);
  assert.strictEqual(result.summary.linhas_rejeitadas, 0);
  assert.strictEqual(result.summary.total_micro, 50);
  assert.strictEqual(result.summary.total_macro_referencia, 50);
  assert.strictEqual(result.summary.divergencia_macro_pct, 0);
  assert.strictEqual(result.rows[0].somadora, true);
  assert.strictEqual(result.rows[1].apropriacao_id, 10);
  assert.strictEqual(result.warnings.length, 0);
}

function validateRejectedRows() {
  const duplicate = validatePlanoMicroRows([
    MODEL_COLUMNS,
    ['A', 'Item A', 'un', 1, 2, 'M1', ''],
    ['A', 'Item repetido', 'un', 1, 2, 'M1', '']
  ], [{ id: 1, codigo: 'M1', valor_orcado: 2 }]);
  assert.strictEqual(duplicate.summary.linhas_rejeitadas, 2);
  assert(duplicate.errors.every((error) => error.campo === 'codigo'));

  const hierarchy = validatePlanoMicroRows([
    MODEL_COLUMNS,
    ['A', 'Item A', 'un', 1, 2, 'M1', 'B'],
    ['B', 'Item B', 'un', 1, 2, 'M1', 'A'],
    ['C', 'Item C', 'un', 1, 2, 'INEXISTENTE', 'X']
  ], [{ id: 1, codigo: 'M1', valor_orcado: 4 }]);
  assert(hierarchy.errors.some((error) => error.mensagem.includes('ciclo')));
  assert(hierarchy.errors.some((error) => error.mensagem.includes('nao existe na mesma planilha')));
  assert(hierarchy.errors.some((error) => error.mensagem.includes('nao existe ou esta inativa')));

  const missingHeader = validatePlanoMicroRows([
    ['codigo', 'descricao'],
    ['A', 'Item A']
  ], []);
  assert(missingHeader.errors.some((error) => error.campo === 'quantidade'));
  assert(missingHeader.errors.some((error) => error.campo === 'etapa_macro_codigo'));
}

async function validatePlanScopeResolver() {
  assert.strictEqual(await resolverObraIdPorPlano(9, {
    CrPlanoObra: {
      async findByPk(id) {
        assert.strictEqual(id, 9);
        return { id: 9, obra_id: 27 };
      }
    }
  }), 27);
  assert.strictEqual(await resolverObraIdPorPlano(10, {
    CrPlanoObra: { async findByPk() { return null; } }
  }), null);
}

function validateRouteContracts() {
  const source = fs.readFileSync(path.join(moduleRoot, 'routes', 'index.js'), 'utf8');
  [
    "router.get(\n  '/obras'",
    "'/obras/:obraId/plano/modelo'",
    "'/obras/:obraId/plano'",
    "'/obras/:obraId/plano/importar/validar'",
    "'/obras/:obraId/plano/importar'",
    "'/planos/:planoId/publicar'"
  ].forEach((contract) => assert(source.includes(contract), `Rota ausente: ${contract}`));

  const moduleAccessIndex = source.indexOf(
    'router.use(\n  requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.MODULE_ACCESS)'
  );
  const importRouteStart = source.indexOf("'/obras/:obraId/plano/importar',");
  const permissionIndex = source.indexOf(
    'requireCustosRecebiveisPermission(CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_IMPORT)',
    importRouteStart
  );
  const scopeIndex = source.indexOf('requireCustosRecebiveisObraScope()', permissionIndex);
  const uploadIndex = source.indexOf("uploadComprovantes.single('file')", scopeIndex);
  assert(moduleAccessIndex >= 0 && moduleAccessIndex < importRouteStart);
  assert(importRouteStart >= 0 && permissionIndex > importRouteStart);
  assert(scopeIndex > permissionIndex, 'Escopo deve ser validado depois da permissao');
  assert(uploadIndex > scopeIndex, 'Upload so pode ser processado depois da validacao de escopo');
}

function validateIsolationAndTransactions() {
  const source = fs.readFileSync(path.join(moduleRoot, 'services', 'planoMicroService.js'), 'utf8');
  assert(source.includes('dependencies.sequelize.transaction'));
  assert(source.includes('arquivo_hash: validation.arquivo.hash'));
  assert(source.includes("situacao: 'SUBSTITUIDA'"));
  assert(source.includes("situacao: 'PUBLICADA'"));
  assert(source.includes("evento: 'PLANO_MICRO_IMPORTADO'"));
  assert(source.includes("evento: 'PLANO_MICRO_PUBLICADO'"));
  assert(!/Apropriacao\.(create|update|destroy|bulkCreate)/.test(source));
  assert(!/apropriacoes\s+(set|update|delete|insert)/i.test(source));
  assert.strictEqual(DIVERGENCE_TOLERANCE_PCT, 5);
}

async function run() {
  validateNormalization();
  validateSuccessfulPreview();
  validateRejectedRows();
  await validatePlanScopeResolver();
  validateRouteContracts();
  validateIsolationAndTransactions();
  console.log('Fase 1 de Custos e Recebiveis validada com sucesso.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
