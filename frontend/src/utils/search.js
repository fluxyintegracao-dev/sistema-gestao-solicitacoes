const SEARCH_STOP_WORDS = new Set([
  'a',
  'o',
  'as',
  'os',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'para',
  'por',
  'com'
]);

export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getSearchTerms(value) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term && !SEARCH_STOP_WORDS.has(term));
}

function getTermVariants(term) {
  const variants = new Set([term]);

  if (term.length > 4 && term.endsWith('s')) {
    variants.add(term.slice(0, -1));
  }

  if (term.length > 4 && term.endsWith('ao')) {
    variants.add(`${term.slice(0, -2)}oes`);
  }

  if (term.length > 4 && term.endsWith('oes')) {
    variants.add(`${term.slice(0, -3)}ao`);
  }

  return [...variants];
}

export function textMatchesSearchTerms(fields, searchValue) {
  const terms = getSearchTerms(searchValue);
  if (!terms.length) return true;

  const text = normalizeSearchText(Array.isArray(fields) ? fields.filter(Boolean).join(' ') : fields);
  return terms.every((term) => getTermVariants(term).some((variant) => text.includes(variant)));
}
