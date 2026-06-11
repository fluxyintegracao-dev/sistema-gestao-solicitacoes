const CNAB240_PAYMENT_SPEC = {
  name: 'CAIXA_CNAB240_PAGAMENTOS_DEBITO_AUTOMATICO',
  status: 'BOLETO_SEGMENTO_J_READY',
  layout: 'CNAB240',
  cnab: '240',
  bank: 'CAIXA',
  manual_reference: 'Leiaute_CNAB240_Pagamentos_e_Debito_Automatico',
  purpose: [
    'Pagamento de salarios',
    'Pagamento/credito a fornecedor',
    'Autopagamento',
    'Debito automatico'
  ],
  important_boundary: 'Este contrato e separado do CNAB240 de cobranca/boletos Caixa. Nao reutilizar segmentos P/Q/T/U.',
  file_flow: {
    remessa: 'Arquivo enviado pelo cliente para registrar transacoes a serem realizadas.',
    retorno: 'Arquivo retornado pela CAIXA com aceite, rejeicao, pagamentos efetuados e pagamentos nao efetuados.'
  },
  supported_payment_groups: [
    {
      key: 'CREDITO_CONTA_DOC_TED_OP_DEPOSITO_JUDICIAL',
      segments: ['A', 'B'],
      status: 'PLANNED'
    },
    {
      key: 'BOLETOS_E_PIX_QR_CODE',
      segments: ['J', 'J52'],
      status: 'PARTIAL_READY_BOLETO_J'
    },
    {
      key: 'CONCESSIONARIAS_E_TRIBUTOS',
      segments: ['O', 'W', 'N', 'B'],
      status: 'PLANNED'
    }
  ],
  supported_segments: [
    { code: 'A/B', name: 'Credito em conta, DOC, TED, OP e deposito judicial', status: 'PLANNED' },
    { code: 'J', name: 'Titulos de cobranca por codigo de barras/linha digitavel', status: 'READY' },
    { code: 'J52', name: 'Pix QR Code', status: 'PLANNED' },
    { code: 'O/W/N/B', name: 'Concessionarias, tributos e dados complementares', status: 'PLANNED' }
  ],
  implementation_guardrails: [
    'Geracao real liberada para titulos de cobranca por codigo de barras/linha digitavel quando houver convenio Caixa homologado.',
    'Remessa de pagamento deve ser gerada em modulo separado da remessa de cobranca.',
    'Retorno de pagamento deve gerar conciliacao/confirmacao sem duplicar baixa.',
    'Campos e codigos devem ser validados por tipo de compromisso e forma de lancamento.',
    'Um lote de servico deve conter somente transacoes de um unico tipo e uma unica forma de pagamento.',
    'Nao misturar Pix QR Code com outros tipos de pagamento no mesmo arquivo quando o banco exigir arquivo exclusivo.'
  ],
  guardrails: [
    'Geracao real liberada para segmento J de boletos com convenio Caixa homologado.',
    'Remessa de pagamento deve ser gerada em modulo separado da remessa de cobranca.',
    'Retorno de pagamento deve gerar conciliacao/confirmacao sem duplicar baixa.',
    'Um lote de servico deve conter somente transacoes de um unico tipo e uma unica forma de pagamento.'
  ]
};

function getCnab240PaymentSpec() {
  return CNAB240_PAYMENT_SPEC;
}

module.exports = {
  getCnab240PaymentSpec
};
