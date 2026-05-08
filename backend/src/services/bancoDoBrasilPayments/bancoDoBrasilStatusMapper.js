const REQUEST_STATUS_MAP = {
  1: 'PROCESSANDO_BANCO',
  2: 'PROCESSANDO_BANCO',
  3: 'REJEITADO_BANCO',
  4: 'ENVIADO_AO_BANCO',
  5: 'PROCESSANDO_BANCO',
  6: 'CONFIRMADO_BANCO',
  7: 'REJEITADO_BANCO',
  8: 'PROCESSANDO_BANCO',
  9: 'PROCESSANDO_BANCO',
  10: 'PROCESSANDO_BANCO'
};

const PAYMENT_STATUS_MAP = {
  AGENDADO: 'PROCESSANDO_BANCO',
  CANCELADO: 'CANCELADO',
  CONSISTENTE: 'PROCESSANDO_BANCO',
  DEVOLVIDO: 'REJEITADO_BANCO',
  INCONSISTENTE: 'REJEITADO_BANCO',
  PAGO: 'AGUARDANDO_CONFIRMACAO_BAIXA',
  PENDENTE: 'PROCESSANDO_BANCO',
  REJEITADO: 'REJEITADO_BANCO',
  VENCIDO: 'REJEITADO_BANCO',
  DEBITADO: 'PROCESSANDO_BANCO'
};

function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function mapRequestStatus(value) {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && REQUEST_STATUS_MAP[numeric]) return REQUEST_STATUS_MAP[numeric];
  return mapPaymentStatus(value);
}

function mapPaymentStatus(value) {
  return PAYMENT_STATUS_MAP[normalizeStatus(value)] || 'PROCESSANDO_BANCO';
}

function isBankConfirmed(value) {
  return mapPaymentStatus(value) === 'AGUARDANDO_CONFIRMACAO_BAIXA' || mapRequestStatus(value) === 'CONFIRMADO_BANCO';
}

function isBankRejected(value) {
  return ['REJEITADO_BANCO', 'CANCELADO'].includes(mapPaymentStatus(value)) || mapRequestStatus(value) === 'REJEITADO_BANCO';
}

module.exports = {
  mapPaymentStatus,
  mapRequestStatus,
  isBankConfirmed,
  isBankRejected
};
