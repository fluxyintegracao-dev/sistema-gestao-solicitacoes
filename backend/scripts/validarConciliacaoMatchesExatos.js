'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  hasSameConciliacaoDate,
  hasSameConciliacaoValue,
  isExactConciliacaoMatch
} = require('../src/utils/conciliacaoMatch');
const {
  validateFinanceConciliacaoCorrigirContaBody,
  validateFinanceConciliacaoEstornoTransferenciaBody,
  validateFinanceRelatorioConciliacaoQuery
} = require('../src/validators/financialValidators');
const {
  ALL_PERMISSION_KEYS
} = require('../src/constants/moduloPermissoes');

assert.strictEqual(hasSameConciliacaoDate('2026-07-06', '2026-07-06'), true);
assert.strictEqual(hasSameConciliacaoDate('2026-07-06', '2026-07-10'), false);

assert.strictEqual(hasSameConciliacaoValue(-1436.16, 1436.16), true);
assert.strictEqual(hasSameConciliacaoValue(-1436.16, 1436.17), false);
assert.strictEqual(hasSameConciliacaoValue(-26007.30, 1436.16), false);

assert.strictEqual(isExactConciliacaoMatch({
  bankDate: '2026-07-06',
  bankValue: -1436.16,
  movementDate: '2026-07-06',
  movementValue: 1436.16
}), true);

assert.strictEqual(isExactConciliacaoMatch({
  bankDate: '2026-07-06',
  bankValue: -26007.30,
  movementDate: '2026-07-06',
  movementValue: 1436.16
}), false);

assert.strictEqual(isExactConciliacaoMatch({
  bankDate: '2026-07-06',
  bankValue: -1436.16,
  movementDate: '2026-07-10',
  movementValue: 1436.16
}), false);

const serviceSource = fs.readFileSync(
  path.resolve(__dirname, '../src/services/conciliacaoBancariaService.js'),
  'utf8'
);
const loadByIdSource = serviceSource.match(
  /async function loadConciliacaoById[\s\S]*?\n}\n\nasync function resolveMovimentoForConciliacao/
)?.[0] || '';

assert(
  /ConciliacaoBancaria\.findOne\(\{[\s\S]*?deleted_at: null[\s\S]*?}\);/.test(loadByIdSource),
  'A conciliacao deve ser localizada antes de carregar relacionamentos opcionais.'
);
assert(
  /conciliacao\.reload\(\{[\s\S]*?include: buildConciliacaoInclude\(\)/.test(loadByIdSource),
  'Os relacionamentos devem ser carregados somente depois que a conciliacao for localizada.'
);

const includeSource = serviceSource.match(
  /function buildConciliacaoInclude\(\)[\s\S]*?\n}\n\nfunction buildConciliacaoWhere/
)?.[0] || '';
assert(
  includeSource.includes("as: 'titulo',\n      required: false"),
  'O titulo ainda nao associado deve ser um relacionamento opcional.'
);

const suggestionAnalysisSource = serviceSource.match(
  /async function analyzeSuggestions[\s\S]*?\n}\n\nasync function listarConciliacoes/
)?.[0] || '';
assert(
  suggestionAnalysisSource.includes('const sugestoesVisiveis = associacaoManualRecomendada')
    && suggestionAnalysisSource.includes('? []'),
  'Matches ambiguos de mesma data e valor nao devem expor um titulo como sugestao; exigem associacao manual.'
);
assert(
  serviceSource.includes("as: 'categoriaFinanceira'")
    && serviceSource.includes('categoria_financeira_nome: movimento.titulo?.categoriaFinanceira?.nome || null'),
  'As sugestoes da conciliacao devem informar a categoria financeira do titulo.'
);

assert.deepStrictEqual(
  validateFinanceConciliacaoCorrigirContaBody({
    conta_bancaria_id: 12,
    motivo: 'OFX conciliado na conta incorreta.'
  }),
  {
    conta_bancaria_id: 12,
    motivo: 'OFX conciliado na conta incorreta.'
  }
);

assert.deepStrictEqual(
  validateFinanceConciliacaoEstornoTransferenciaBody({
    motivo: 'Transferencia conciliada na conta incorreta.'
  }),
  {
    motivo: 'Transferencia conciliada na conta incorreta.'
  }
);
assert.deepStrictEqual(
  validateFinanceRelatorioConciliacaoQuery({
    periodo: 'PERSONALIZADO',
    data_inicial: '2026-08-01',
    data_final: '2026-08-31',
    conta_bancaria_id: undefined,
    status: 'CONCILIADO',
    tipo_conciliacao: 'TRANSFERENCIA',
    natureza: 'SAIDA',
    busca: 'permuta entre empresas'
  }),
  {
    periodo: 'PERSONALIZADO',
    data_inicial: '2026-08-01',
    data_final: '2026-08-31',
    conta_bancaria_id: undefined,
    status: 'CONCILIADO',
    tipo_conciliacao: 'TRANSFERENCIA',
    natureza: 'SAIDA',
    busca: 'permuta entre empresas'
  }
);
assert(
  ALL_PERMISSION_KEYS.has('financeiro.conciliacao.estornar'),
  'O estorno de transferencia conciliada deve possuir permissao granular dedicada.'
);

const transferReversalSource = serviceSource.match(
  /async function estornarConciliacaoTransferencia[\s\S]*?\n}\n\nasync function corrigirContaConciliacao/
)?.[0] || '';
assert(
  transferReversalSource.includes('lock: transaction.LOCK.UPDATE')
    && transferReversalSource.includes("status: 'CANCELADA'")
    && transferReversalSource.includes("status: 'PENDENTE'"),
  'O estorno da transferencia deve bloquear, cancelar a transferencia e reabrir os OFX na mesma transacao.'
);
assert(
  transferReversalSource.includes('FINANCIAL_BANK_RECONCILIATION_TRANSFER_REVERSED'),
  'O estorno da transferencia conciliada deve gerar auditoria dedicada.'
);

const reopenSource = fs.readFileSync(
  path.resolve(__dirname, '../src/services/conciliacaoEstornoService.js'),
  'utf8'
);
assert(
  reopenSource.includes("status: 'PENDENTE'")
    && reopenSource.includes('titulo_financeiro_id: null')
    && reopenSource.includes('movimento_financeiro_id: null'),
  'O estorno deve reabrir a conciliacao e limpar somente os vinculos financeiros ativos.'
);
assert(
  reopenSource.includes('lock: transaction.LOCK.UPDATE'),
  'A reabertura da conciliacao deve bloquear os registros dentro da transacao do estorno.'
);

const titleServiceSource = fs.readFileSync(
  path.resolve(__dirname, '../src/services/tituloFinanceiroService.js'),
  'utf8'
);
const titleReversalSource = titleServiceSource.match(
  /async function estornarMovimentoTitulo[\s\S]*?\n}\n\nasync function atualizarCobrancaTitulo/
)?.[0] || '';
assert(
  titleReversalSource.indexOf('reabrirConciliacoesPorMovimentos') < titleReversalSource.indexOf('await transaction.commit()'),
  'A conciliacao deve ser reaberta antes do commit do estorno da baixa.'
);

const accountCorrectionSource = serviceSource.match(
  /async function corrigirContaConciliacao[\s\S]*?\n}\n\nasync function removerConciliacao/
)?.[0] || '';
assert(
  accountCorrectionSource.includes("status || '').toUpperCase() !== 'PENDENTE'")
    && accountCorrectionSource.includes('ainda possui vinculos financeiros'),
  'A troca de conta deve aceitar somente conciliacao pendente e sem vinculos financeiros.'
);
assert(
  accountCorrectionSource.includes('FINANCIAL_BANK_RECONCILIATION_ACCOUNT_CORRECTED'),
  'A troca de conta deve gerar evento de auditoria dedicado.'
);

console.log('Validacao de matches exatos da conciliacao concluida com sucesso.');
