'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

function validateMigration() {
  const migration = read('migrations/202608070001_financeiro_carteira_cheques_baixa_composta.js');
  [
    'baixas_financeiras_grupos',
    'baixas_financeiras_componentes',
    'baixas_financeiras_alocacoes',
    'cheques_terceiros_movimentos',
    'baixa_grupo_id',
    'baixa_componente_id',
    'ux_cheques_chave_importacao'
  ].forEach((contract) => assert(migration.includes(contract), `Contrato ausente na migration: ${contract}`));
  assert(migration.includes('idx_cheques_identidade'));
  assert(!migration.includes("'ux_cheques_identidade'"), 'A migration nao pode falhar por duplicidades historicas.');
}

function validateSecurityAndTransactions() {
  const service = read('src/services/chequeTerceiroService.js');
  const titleService = read('src/services/tituloFinanceiroService.js');
  [
    'idempotency-key',
    'sequelize.transaction()',
    'lock: transaction.LOCK.UPDATE',
    'Mesmo credor',
    'mesma empresa',
    'O mesmo cheque nao pode ser usado em mais de uma operacao',
    'Cartao de credito com geracao de fatura deve usar a baixa simples',
    'deve ser utilizado integralmente',
    'estornarBaixaComposta',
    'Justificativa do estorno e obrigatoria',
    "status: 'EM_CARTEIRA'"
  ].forEach((contract) => assert(service.toLowerCase().includes(contract.toLowerCase()), `Protecao ausente: ${contract}`));
  assert(titleService.includes('baixa_grupo_id'));
  assert(titleService.includes('baixa_componente_id'));
  assert(titleService.includes('Estorne o grupo completo na tela de Baixas com Multiplas Fontes'));
  assert(titleService.includes("status: 'EM_CARTEIRA'"), 'Estorno deve devolver cheque utilizado para a carteira.');
  assert(service.includes('isValidCpfCnpj'), 'Cadastro de cheque deve validar CPF/CNPJ do titular.');
  assert(service.includes('normalizarCpfCnpj'), 'CPF/CNPJ do titular deve ser persistido sem mascara.');
}

function validateRoutesAndPermissions() {
  const routes = read('src/routes.js');
  const permissions = read('src/constants/moduloPermissoes.js');
  [
    '/financeiro/cheques-terceiros/modelo.xlsx',
    '/financeiro/cheques-terceiros/importacoes/preview',
    '/financeiro/cheques-terceiros/importacoes/confirmar',
    '/financeiro/baixas-compostas/preview',
    '/financeiro/baixas-compostas/confirmar',
    '/financeiro/baixas-compostas/:id/estornar'
  ].forEach((contract) => assert(routes.includes(contract), `Rota ausente: ${contract}`));
  [
    'financeiro.cheques.visualizar',
    'financeiro.cheques.cadastrar',
    'financeiro.cheques.importar',
    'financeiro.cheques.depositar',
    'financeiro.cheques.transferir',
    'financeiro.baixas_compostas.criar',
    'financeiro.baixas_compostas.confirmar',
    'financeiro.baixas_compostas.estornar'
  ].forEach((contract) => assert(permissions.includes(contract), `Permissao ausente: ${contract}`));
}

function validateFrontend() {
  const titles = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/pages/FinanceiroTitulos.jsx'), 'utf8');
  const modal = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/components/financeiro/BaixaCompostaModal.jsx'), 'utf8');
  const custody = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/pages/FinanceiroChequesTerceiros.jsx'), 'utf8');
  const holderAutocomplete = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/components/financeiro/TitularChequeAutocomplete.jsx'), 'utf8');
  assert(titles.includes('BaixaCompostaModal'));
  assert(titles.includes('Baixa com múltiplas fontes'));
  assert(modal.includes('crypto.randomUUID()'));
  assert(modal.includes('overflow-y-auto'), 'Modal composto deve permitir rolagem.');
  assert(custody.includes('Importar cheques'));
  assert(custody.includes('Confirmar importação'));
  assert(custody.includes('max-h-[52vh] overflow-auto'), 'Preview da importacao deve permitir rolagem.');
  assert(custody.includes('maskCpfCnpj'), 'Cadastro de cheque deve aplicar mascara de CPF/CNPJ.');
  assert(custody.includes('Informe um CPF ou CNPJ válido.'), 'Cadastro deve orientar documento invalido.');
  assert(!custody.includes("['data_emissao', 'Data de emissão'"), 'Data de emissao nao deve aparecer no cadastro de custodia.');
  assert(custody.includes('TitularChequeAutocomplete'), 'Cadastro deve usar a consulta de titulares cadastrados.');
  assert(holderAutocomplete.includes('buscarParceiros'), 'Autocomplete deve consultar o cadastro central de pessoas.');
  assert(holderAutocomplete.includes('Listar titulares cadastrados'), 'Campo deve oferecer lupa para listar titulares.');
  assert(holderAutocomplete.includes("limit: 'all'"), 'Modal deve listar todos os titulares ativos.');
}

validateMigration();
validateSecurityAndTransactions();
validateRoutesAndPermissions();
validateFrontend();
console.log('Carteira de cheques e baixa composta validadas com sucesso.');
