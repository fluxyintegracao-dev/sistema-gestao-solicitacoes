const TIPO_CENTRO_CUSTO_OBRA = 'OBRA';
const TIPO_CENTRO_CUSTO_ADMINISTRATIVO = 'CENTRO_CUSTO';

const TIPOS_CENTRO_CUSTO = [
  TIPO_CENTRO_CUSTO_OBRA,
  TIPO_CENTRO_CUSTO_ADMINISTRATIVO
];

function normalizeTipoCentroCusto(value, fallback = TIPO_CENTRO_CUSTO_OBRA) {
  const normalized = String(value || '').trim().toUpperCase();
  return TIPOS_CENTRO_CUSTO.includes(normalized) ? normalized : fallback;
}

function isObraCentroCusto(value) {
  return normalizeTipoCentroCusto(value) === TIPO_CENTRO_CUSTO_OBRA;
}

module.exports = {
  TIPO_CENTRO_CUSTO_ADMINISTRATIVO,
  TIPO_CENTRO_CUSTO_OBRA,
  TIPOS_CENTRO_CUSTO,
  isObraCentroCusto,
  normalizeTipoCentroCusto
};
