import { useTheme } from '../contexts/ThemeContext';

function normalizarChaveStatus(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function buscarCorPorStatus(mapa = {}, status) {
  if (!mapa || typeof mapa !== 'object') return null;

  const originalUpper = String(status || '').trim().toUpperCase();
  const normalizado = normalizarChaveStatus(status);
  const variantes = new Set([
    originalUpper,
    normalizado,
    normalizado.replace(/_/g, ' '),
    normalizado.replace(/_/g, ''),
    originalUpper.replace(/\s+/g, '_')
  ]);

  for (const chave of variantes) {
    if (mapa[chave]) return mapa[chave];
  }

  const entradas = Object.entries(mapa);
  for (const [chave, cor] of entradas) {
    if (normalizarChaveStatus(chave) === normalizado) {
      return cor;
    }
  }

  return null;
}

export default function StatusBadge({ status, setor }) {
  const { tema } = useTheme();
  const setorKey = String(setor || '').trim().toUpperCase();

  const mapaSetor = tema?.status?.setores?.[setorKey] || null;
  const corSetor = buscarCorPorStatus(mapaSetor, status);
  const corGlobal = buscarCorPorStatus(tema?.status?.global || {}, status);
  const cor = corSetor || corGlobal || '#9ca3af';

  return (
    <span
      className="text-white px-2 py-1 rounded text-xs"
      style={{ backgroundColor: cor }}
    >
      {status}
    </span>
  );
}
