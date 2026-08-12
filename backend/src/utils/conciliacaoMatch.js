'use strict';

function toAbsoluteCents(value) {
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized)) {
    return null;
  }
  return Math.round(Math.abs(normalized) * 100);
}

function toSignedCents(value) {
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized)) {
    return null;
  }
  return Math.round(normalized * 100);
}

function normalizeDateOnly(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const normalized = String(value || '').trim();
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function hasSameConciliacaoDate(bankDate, movementDate) {
  const normalizedBankDate = normalizeDateOnly(bankDate);
  const normalizedMovementDate = normalizeDateOnly(movementDate);
  return Boolean(normalizedBankDate && normalizedMovementDate && normalizedBankDate === normalizedMovementDate);
}

function hasSameConciliacaoValue(bankValue, movementValue) {
  const bankCents = toAbsoluteCents(bankValue);
  const movementCents = toAbsoluteCents(movementValue);
  return bankCents !== null && movementCents !== null && bankCents === movementCents;
}

function isExactConciliacaoMatch({ bankDate, bankValue, movementDate, movementValue }) {
  return hasSameConciliacaoDate(bankDate, movementDate)
    && hasSameConciliacaoValue(bankValue, movementValue);
}

function isExactOppositeBankTransfer({ currentDate, currentValue, counterpartDate, counterpartValue }) {
  const currentCents = toSignedCents(currentValue);
  const counterpartCents = toSignedCents(counterpartValue);
  return hasSameConciliacaoDate(currentDate, counterpartDate)
    && currentCents !== null
    && counterpartCents !== null
    && currentCents !== 0
    && currentCents === -counterpartCents;
}

module.exports = {
  hasSameConciliacaoDate,
  hasSameConciliacaoValue,
  isExactOppositeBankTransfer,
  isExactConciliacaoMatch,
  normalizeDateOnly,
  toAbsoluteCents,
  toSignedCents
};
