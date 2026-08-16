'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(backendRoot, '..');

function readBackend(relativePath) {
  return fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');
}

function readRepository(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function validateSchemaAndModels() {
  const migration = readBackend('migrations/202608160001_financeiro_dda_base.js');
  const models = readBackend('src/models/index.js');
  [
    'financeiro_dda_sincronizacoes',
    'financeiro_dda_boletos',
    'financeiro_dda_eventos',
    'provider_document_id',
    'fingerprint',
    'titulo_sugerido_id',
    'titulo_financeiro_id',
    'dedupe_key'
  ].forEach((contract) => assert(migration.includes(contract), `Contrato DDA ausente na migration: ${contract}`));
  ['FinanceiroDdaSincronizacao', 'FinanceiroDdaBoleto', 'FinanceiroDdaEvento']
    .forEach((contract) => assert(models.includes(contract), `Model DDA nao registrado: ${contract}`));
}

function validateMatchingAndSafety() {
  const service = readBackend('src/services/financeiroDdaService.js');
  [
    'MATCH_EXATO',
    'AMBIGUO',
    'DIVERGENTE',
    'SEM_TITULO',
    'SUGESTAO_EXATA_CONFIRMADA',
    "tipo: 'PAGAR'",
    'sequelize.transaction',
    'lock: transaction.LOCK.UPDATE',
    'Empresa do boleto DDA difere da empresa do titulo',
    'BB_DDA_NAO_HOMOLOGADO'
  ].forEach((contract) => assert(service.includes(contract), `Regra DDA ausente: ${contract}`));

  assert(service.includes("status !== 'MATCH_EXATO'"), 'Sugestao somente pode ser confirmada quando o match for exato.');
  assert(service.includes("status: 'BLOQUEADA_CONFIGURACAO'"), 'Consulta real deve permanecer bloqueada sem homologacao.');
  assert(!service.includes('gerarPagamento'), 'DDA nao pode disparar pagamento automaticamente.');
  assert(!service.includes('enviarLote'), 'DDA nao pode enviar lote bancario automaticamente.');
  assert(!service.includes('aprovarLote'), 'DDA nao pode aprovar lote bancario automaticamente.');
}

function validateRoutesPermissionsAndUi() {
  const routes = readBackend('src/routes.js');
  const permissions = readBackend('src/constants/moduloPermissoes.js');
  const authorization = readBackend('src/services/authorizationService.js');
  const app = readRepository('frontend/src/App.jsx');
  const layout = readRepository('frontend/src/layout/Layout.jsx');
  const page = readRepository('frontend/src/pages/FinanceiroDda.jsx');

  [
    '/financeiro/dda/resumo',
    '/financeiro/dda/boletos',
    '/financeiro/dda/boletos/:id/candidatos',
    '/financeiro/dda/boletos/:id/vincular',
    '/financeiro/dda/boletos/:id/confirmar-sugestao',
    '/financeiro/dda/boletos/:id/ignorar',
    '/financeiro/dda/sincronizar'
  ].forEach((contract) => assert(routes.includes(contract), `Rota DDA ausente: ${contract}`));

  [
    'financeiro.dda.visualizar',
    'financeiro.dda.sincronizar',
    'financeiro.dda.vincular',
    'financeiro.dda.ignorar',
    'financeiro.dda.auditar',
    'financeiro.dda.configurar'
  ].forEach((contract) => {
    assert(permissions.includes(contract), `Permissao DDA ausente: ${contract}`);
    assert(authorization.includes(contract), `Permissao DDA ausente no gate financeiro: ${contract}`);
  });

  assert(app.includes('path="financeiro/dda"'), 'Rota frontend DDA ausente.');
  assert(layout.includes("item('/financeiro/dda', 'DDA Bancario'"), 'Menu DDA ausente.');
  assert(page.includes('Integracao externa bloqueada'), 'Tela deve comunicar o bloqueio real da integracao.');
  assert(page.includes('Confirmar correspondencia exata'), 'Tela deve exigir confirmacao humana do match exato.');
  assert(page.includes('Escolher titulo'), 'Tela deve oferecer vinculo manual auditavel.');
}

validateSchemaAndModels();
validateMatchingAndSafety();
validateRoutesPermissionsAndUi();
console.log('Estrutura financeira DDA validada com sucesso.');
