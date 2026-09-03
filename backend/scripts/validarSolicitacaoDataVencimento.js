const assert = require('assert');
const {
  validateSolicitacaoCreateBody,
  validateSolicitacaoDataVencimentoBody
} = require('../src/validators/operationalValidators');
const {
  FINALIDADES_DATA_SOLICITACAO,
  normalizeTipoSolicitacaoBehavior,
  obterRotuloDataSolicitacao,
  serializeTipoSolicitacaoBehavior
} = require('../src/services/tipoSolicitacaoBehaviorService');

function formatDateOnly(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function buildPayload(dataVencimento) {
  return {
    obra_id: 1,
    tipo_solicitacao_id: 1,
    area_responsavel: 'FINANCEIRO',
    descricao: 'Solicitacao de teste',
    data_vencimento: dataVencimento
  };
}

function run() {
  const now = Date.now();
  const past = formatDateOnly(new Date(now - (3 * 24 * 60 * 60 * 1000)));
  const today = formatDateOnly(new Date(now));
  const future = formatDateOnly(new Date(now + (3 * 24 * 60 * 60 * 1000)));

  assert.throws(
    () => validateSolicitacaoCreateBody(buildPayload(past)),
    /nao pode ser anterior a data atual/i
  );
  assert.strictEqual(validateSolicitacaoCreateBody(buildPayload(today)).data_vencimento, today);
  assert.strictEqual(validateSolicitacaoCreateBody(buildPayload(future)).data_vencimento, future);

  assert.throws(
    () => validateSolicitacaoDataVencimentoBody({ data_vencimento: past }),
    /nao pode ser anterior a data atual/i
  );
  assert.strictEqual(
    validateSolicitacaoDataVencimentoBody({ data_vencimento: future }).data_vencimento,
    future
  );

  const comportamentoPadrao = normalizeTipoSolicitacaoBehavior({ comportamento: null });
  assert.strictEqual(
    comportamentoPadrao.finalidade_data_vencimento,
    FINALIDADES_DATA_SOLICITACAO.RESPOSTA
  );
  assert.strictEqual(obterRotuloDataSolicitacao(comportamentoPadrao), 'Data de Resposta');

  const comportamentoPagamento = normalizeTipoSolicitacaoBehavior({
    comportamento: { finalidade_data_vencimento: 'pagamento' }
  });
  assert.strictEqual(
    comportamentoPagamento.finalidade_data_vencimento,
    FINALIDADES_DATA_SOLICITACAO.PAGAMENTO
  );
  assert.strictEqual(obterRotuloDataSolicitacao(comportamentoPagamento), 'Data de Pagamento');
  assert.strictEqual(
    obterRotuloDataSolicitacao(comportamentoPagamento, { recargaCartao: true }),
    'Data prevista para recarga'
  );
  assert.strictEqual(
    JSON.parse(serializeTipoSolicitacaoBehavior(comportamentoPagamento)).finalidade_data_vencimento,
    FINALIDADES_DATA_SOLICITACAO.PAGAMENTO
  );

  console.log('Validacao de vencimento de solicitacoes concluida com sucesso.');
}

run();
