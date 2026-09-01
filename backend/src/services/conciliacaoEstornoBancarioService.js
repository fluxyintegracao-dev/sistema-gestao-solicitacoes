const PIX_KEYWORDS = ['PIX'];
const CHEQUE_KEYWORDS = ['CHEQUE', 'CHQ'];
const REVERSAL_KEYWORDS = [
  'REJEIT',
  'ESTORN',
  'DEVOL',
  'SUSTA',
  'PAGAMENTO NAO EFETIVADO',
  'PAGAMENTO NAO REALIZADO'
];

function normalizeBankText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function classifyBankReversal({ descricao_banco, valor } = {}) {
  const description = normalizeBankText(descricao_banco);
  const numericValue = Number(valor || 0);
  if (!description || !Number.isFinite(numericValue) || numericValue === 0) return null;
  if (!includesAny(description, REVERSAL_KEYWORDS)) return null;
  if (description.includes('TARIFA')) {
    return { tipo: 'ESTORNO_TARIFA_BANCARIA', janela_dias: 5 };
  }

  if (includesAny(description, PIX_KEYWORDS)) {
    return { tipo: 'PIX_REJEITADO', janela_dias: 2 };
  }
  if (includesAny(description, CHEQUE_KEYWORDS)) {
    return { tipo: 'CHEQUE_DEVOLVIDO', janela_dias: 30 };
  }
  return { tipo: 'ESTORNO_BANCARIO', janela_dias: 5 };
}

function datesWithinReversalWindow({ reversalDate, originalDate, windowDays }) {
  const reversal = new Date(`${reversalDate}T00:00:00.000Z`);
  const original = new Date(`${originalDate}T00:00:00.000Z`);
  if (Number.isNaN(reversal.getTime()) || Number.isNaN(original.getTime())) return false;
  const diffDays = Math.floor((reversal.getTime() - original.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= Number(windowDays || 0);
}

function hasOppositeExactAmount(currentValue, candidateValue) {
  const current = Math.round(Number(currentValue || 0) * 100);
  const candidate = Math.round(Number(candidateValue || 0) * 100);
  return current !== 0 && candidate !== 0 && current === -candidate;
}

function scoreReversalCandidate(reversal, candidate) {
  let score = 50;
  const reasons = ['Valor exato e sinal oposto'];
  if (String(reversal.data_movimento) === String(candidate.data_movimento)) {
    score += 25;
    reasons.push('Mesmo dia');
  }

  const reversalDocument = normalizeBankText(reversal.documento);
  const candidateDocument = normalizeBankText(candidate.documento);
  if (reversalDocument && candidateDocument && reversalDocument === candidateDocument) {
    score += 40;
    reasons.push('Documento bancario coincide');
  }

  const reversalDescription = normalizeBankText(reversal.descricao_banco);
  const candidateDescription = normalizeBankText(candidate.descricao_banco);
  if (reversalDescription.includes('PIX') && candidateDescription.includes('PIX')) {
    score += 10;
    reasons.push('Ambos identificados como PIX');
  }
  if (
    includesAny(reversalDescription, CHEQUE_KEYWORDS)
    && includesAny(candidateDescription, CHEQUE_KEYWORDS)
  ) {
    score += 10;
    reasons.push('Ambos identificados como cheque');
  }

  return { score, motivos: reasons };
}

module.exports = {
  classifyBankReversal,
  datesWithinReversalWindow,
  hasOppositeExactAmount,
  normalizeBankText,
  scoreReversalCandidate
};
