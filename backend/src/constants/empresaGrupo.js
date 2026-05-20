const TIPO_EMPRESA_HOLDING = 'HOLDING';
const TIPO_EMPRESA_OPERACIONAL = 'OPERACIONAL';

const TIPOS_EMPRESA_GRUPO = [
  TIPO_EMPRESA_HOLDING,
  TIPO_EMPRESA_OPERACIONAL
];

function normalizeTipoEmpresaGrupo(value) {
  const normalized = String(value || TIPO_EMPRESA_OPERACIONAL).trim().toUpperCase();
  return TIPOS_EMPRESA_GRUPO.includes(normalized)
    ? normalized
    : TIPO_EMPRESA_OPERACIONAL;
}

module.exports = {
  TIPO_EMPRESA_HOLDING,
  TIPO_EMPRESA_OPERACIONAL,
  TIPOS_EMPRESA_GRUPO,
  normalizeTipoEmpresaGrupo
};
