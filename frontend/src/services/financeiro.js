import { API_URL, authHeaders } from './api';

async function parseJson(response, fallbackMessage) {
  const text = await response.text();
  if (!response.ok) {
    if (!text) {
      throw new Error(fallbackMessage);
    }

    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.error || fallbackMessage);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(text || fallbackMessage);
      }
      throw error;
    }
  }

  return text ? JSON.parse(text) : null;
}

export async function getTitulosFinanceiros(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  const url = query ? `${API_URL}/financeiro/titulos?${query}` : `${API_URL}/financeiro/titulos`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar titulos financeiros');
}

export async function getRelatorioFluxoCaixa(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  const url = query
    ? `${API_URL}/financeiro/relatorios/fluxo-caixa?${query}`
    : `${API_URL}/financeiro/relatorios/fluxo-caixa`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar relatorio de fluxo de caixa');
}

export async function getConciliacoesBancarias(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  const url = query
    ? `${API_URL}/financeiro/conciliacoes?${query}`
    : `${API_URL}/financeiro/conciliacoes`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar conciliacoes bancarias');
}

export async function getImportacoesConciliacao(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  const url = query
    ? `${API_URL}/financeiro/conciliacoes/importacoes?${query}`
    : `${API_URL}/financeiro/conciliacoes/importacoes`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar historico de importacoes OFX');
}

export async function importarOfxConciliacao(formData) {
  const response = await fetch(`${API_URL}/financeiro/conciliacoes/importar-ofx`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  return parseJson(response, 'Erro ao importar arquivo OFX');
}

export async function confirmarConciliacaoBancaria(id, data) {
  const response = await fetch(`${API_URL}/financeiro/conciliacoes/${id}/confirmar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao confirmar conciliacao bancaria');
}

export async function criarTituloConciliacaoBancaria(id, data) {
  const response = await fetch(`${API_URL}/financeiro/conciliacoes/${id}/criar-titulo`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao criar titulo rapido na conciliacao bancaria');
}

export async function conciliarSugestoesBancarias(data = {}) {
  const response = await fetch(`${API_URL}/financeiro/conciliacoes/conciliar-sugeridos`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao conciliar sugestoes em lote');
}

export async function ignorarConciliacaoBancaria(id) {
  const response = await fetch(`${API_URL}/financeiro/conciliacoes/${id}/ignorar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({})
  });

  return parseJson(response, 'Erro ao ignorar conciliacao bancaria');
}

export async function getMovimentosAssociacaoConciliacao(id, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  const url = query
    ? `${API_URL}/financeiro/conciliacoes/${id}/movimentos?${query}`
    : `${API_URL}/financeiro/conciliacoes/${id}/movimentos`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar movimentos para associacao manual');
}

export async function getTituloFinanceiroById(id) {
  const response = await fetch(`${API_URL}/financeiro/titulos/${id}`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar titulo financeiro');
}

export async function criarTituloFinanceiro(data) {
  const response = await fetch(`${API_URL}/financeiro/titulos`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao criar titulo financeiro');
}

export async function atualizarCobrancaTituloFinanceiro(id, data) {
  const response = await fetch(`${API_URL}/financeiro/titulos/${id}/cobranca`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao atualizar dados de cobranca do titulo');
}

export async function getBoletosConfig() {
  const response = await fetch(`${API_URL}/boletos/config`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar configuracao de boletos');
}

export async function getTitulosParaBoleto(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  const url = query ? `${API_URL}/boletos/titulos?${query}` : `${API_URL}/boletos/titulos`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar titulos para boleto');
}

export async function getBoletoTitulo(id) {
  const response = await fetch(`${API_URL}/boletos/titulos/${id}`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar boleto do titulo');
}

export async function gerarBoletoTitulo(id) {
  const response = await fetch(`${API_URL}/boletos/titulos/${id}/gerar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({})
  });

  return parseJson(response, 'Erro ao gerar boleto do titulo');
}

export async function gerarAmostraBoletoTitulo(id) {
  const response = await fetch(`${API_URL}/boletos/titulos/${id}/amostra`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({})
  });

  return parseJson(response, 'Erro ao gerar amostra de boleto');
}

export async function baixarPdfBoletoTitulo(id, { amostra = false } = {}) {
  const query = amostra ? '?amostra=1' : '';
  const response = await fetch(`${API_URL}/boletos/titulos/${id}/pdf${query}`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.error || 'Erro ao baixar PDF do boleto');
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(text || 'Erro ao baixar PDF do boleto');
      }
      throw error;
    }
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return {
    blob,
    filename: filenameMatch?.[1] || `boleto-${id}${amostra ? '-amostra' : ''}.pdf`
  };
}

export async function getTituloFinanceiroAuditoria(id) {
  const response = await fetch(`${API_URL}/financeiro/titulos/${id}/auditoria`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar auditoria do titulo financeiro');
}

export async function getTitulosFinanceirosPorSolicitacao(solicitacaoId) {
  const response = await fetch(`${API_URL}/solicitacoes/${solicitacaoId}/titulos-financeiros`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar titulos financeiros da solicitacao');
}

export async function gerarContaPorSolicitacao(solicitacaoId, data) {
  const response = await fetch(`${API_URL}/solicitacoes/${solicitacaoId}/gerar-conta`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao gerar conta pela solicitacao');
}

export async function baixarTituloFinanceiro(id, data) {
  const response = await fetch(`${API_URL}/financeiro/titulos/${id}/baixas`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao registrar baixa financeira');
}

export async function estornarMovimentoFinanceiro(tituloId, movimentoId, data = {}) {
  const response = await fetch(`${API_URL}/financeiro/titulos/${tituloId}/movimentos/${movimentoId}/estornar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao estornar baixa financeira');
}

export async function getContasBancarias() {
  const response = await fetch(`${API_URL}/financeiro/contas-bancarias`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar contas bancarias');
}

export async function criarContaBancaria(data) {
  const response = await fetch(`${API_URL}/financeiro/contas-bancarias`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao criar conta bancaria');
}

export async function atualizarContaBancaria(id, data) {
  const response = await fetch(`${API_URL}/financeiro/contas-bancarias/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao atualizar conta bancaria');
}

export async function getCategoriasFinanceiras() {
  const response = await fetch(`${API_URL}/financeiro/categorias`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar categorias financeiras');
}

export async function criarCategoriaFinanceira(data) {
  const response = await fetch(`${API_URL}/financeiro/categorias`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao criar categoria financeira');
}

export async function atualizarCategoriaFinanceira(id, data) {
  const response = await fetch(`${API_URL}/financeiro/categorias/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao atualizar categoria financeira');
}

export async function getResultadoObras() {
  const response = await fetch(`${API_URL}/financeiro/relatorios/resultado-obras`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar resultado de obras');
}

export async function getPaymentBeneficiaries(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  const url = query ? `${API_URL}/financeiro/favorecidos?${query}` : `${API_URL}/financeiro/favorecidos`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar favorecidos bancarios');
}

export async function criarPaymentBeneficiary(data) {
  const response = await fetch(`${API_URL}/financeiro/favorecidos`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao criar favorecido bancario');
}

export async function atualizarPaymentBeneficiary(id, data) {
  const response = await fetch(`${API_URL}/financeiro/favorecidos/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao atualizar favorecido bancario');
}

export async function getPaymentBeneficiaryAudit(id) {
  const response = await fetch(`${API_URL}/financeiro/favorecidos/${id}/auditoria`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar auditoria do favorecido');
}

export async function getPaymentEligibleTitulos(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  const url = query
    ? `${API_URL}/financeiro/pagamentos/titulos-elegiveis?${query}`
    : `${API_URL}/financeiro/pagamentos/titulos-elegiveis`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar titulos elegiveis para pagamento');
}

export async function getPaymentProviders() {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/providers`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar providers de pagamento');
}

export async function getPaymentAccounts() {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/accounts`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar contas pagadoras');
}

export async function criarPaymentAccount(data) {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/accounts`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao criar conta pagadora');
}

export async function atualizarPaymentAccount(id, data) {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/accounts/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao atualizar conta pagadora');
}

export async function criarPaymentBatch(data) {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/lotes`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao criar lote de pagamento');
}

export async function getPaymentBatches(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
  const url = query ? `${API_URL}/financeiro/pagamentos/lotes?${query}` : `${API_URL}/financeiro/pagamentos/lotes`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar lotes de pagamento');
}

export async function getPaymentBatch(id) {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/lotes/${id}`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar lote de pagamento');
}

export async function submeterPaymentBatch(id) {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/lotes/${id}/submeter-aprovacao`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({})
  });

  return parseJson(response, 'Erro ao submeter lote para aprovacao');
}

export async function aprovarPaymentBatch(id, data) {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/lotes/${id}/aprovar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao aprovar lote de pagamento');
}

export async function rejeitarPaymentBatch(id, data = {}) {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/lotes/${id}/rejeitar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao rejeitar lote de pagamento');
}

export async function enviarPaymentBatchBanco(id, data) {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/lotes/${id}/enviar-banco`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao enviar lote ao banco');
}

export async function simularRetornoPaymentBatch(id, data = {}) {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/lotes/${id}/simular-retorno-banco`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao simular retorno bancario');
}

export async function getPaymentsAwaitingBaixa() {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/aguardando-baixa`, {
    headers: authHeaders()
  });

  return parseJson(response, 'Erro ao buscar pagamentos aguardando baixa');
}

export async function confirmarBaixaPaymentIntent(id, data = {}) {
  const response = await fetch(`${API_URL}/financeiro/pagamentos/intents/${id}/confirmar-baixa`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });

  return parseJson(response, 'Erro ao confirmar baixa do pagamento');
}
