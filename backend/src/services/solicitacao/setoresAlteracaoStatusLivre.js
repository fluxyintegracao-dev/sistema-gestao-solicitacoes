const { ConfiguracaoSistema, Setor } = require('../../models');

const CHAVE_SETORES_ALTERACAO_STATUS_LIVRE = 'SETORES_ALTERACAO_STATUS_LIVRE';

const TOKENS_GEO_EQUIVALENTES = new Set([
  'GEO',
  'GERENCIA_DE_PROCESSOS',
  'GERENCIAS_DE_PROCESSOS',
  'GERENCIA_PROCESSOS',
  'GERENCIAS_PROCESSOS'
]);

function parseJsonOrDefault(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizarTokenSetor(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function normalizarListaSetores(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(
    lista
      .map(normalizarTokenSetor)
      .filter(Boolean)
  )];
}

function tokensSaoEquivalentes(tokenA, tokenB) {
  if (!tokenA || !tokenB) return false;
  if (tokenA === tokenB) return true;
  return TOKENS_GEO_EQUIVALENTES.has(tokenA) && TOKENS_GEO_EQUIVALENTES.has(tokenB);
}

async function obterConfiguracaoSetoresAlteracaoStatusLivre() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_SETORES_ALTERACAO_STATUS_LIVRE },
    order: [['id', 'DESC']]
  });

  const data = parseJsonOrDefault(item?.valor, { setores: [] });
  return {
    setores: normalizarListaSetores(data?.setores)
  };
}

async function salvarConfiguracaoSetoresAlteracaoStatusLivre(setores) {
  const payload = {
    setores: normalizarListaSetores(setores)
  };
  const valor = JSON.stringify(payload);

  const existente = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_SETORES_ALTERACAO_STATUS_LIVRE },
    order: [['id', 'DESC']]
  });

  if (existente) {
    await existente.update({ valor });
  } else {
    await ConfiguracaoSistema.create({
      chave: CHAVE_SETORES_ALTERACAO_STATUS_LIVRE,
      valor
    });
  }

  return payload;
}

async function obterTokensSetoresAlteracaoStatusLivre() {
  const { setores } = await obterConfiguracaoSetoresAlteracaoStatusLivre();
  const tokens = new Set(setores);

  if (setores.length === 0) {
    return [];
  }

  const setoresDb = await Setor.findAll({
    attributes: ['id', 'codigo', 'nome']
  });

  setoresDb.forEach((setor) => {
    const id = normalizarTokenSetor(setor.id);
    const codigo = normalizarTokenSetor(setor.codigo);
    const nome = normalizarTokenSetor(setor.nome);
    const selecionado = setores.some((token) =>
      tokensSaoEquivalentes(token, id) ||
      tokensSaoEquivalentes(token, codigo) ||
      tokensSaoEquivalentes(token, nome)
    );

    if (selecionado) {
      if (id) tokens.add(id);
      if (codigo) tokens.add(codigo);
      if (nome) tokens.add(nome);
    }
  });

  return Array.from(tokens);
}

function setorTemAlteracaoStatusLivre(setor, tokensLiberados = []) {
  const setorNormalizado = normalizarTokenSetor(setor);
  if (!setorNormalizado) return false;

  return (Array.isArray(tokensLiberados) ? tokensLiberados : [])
    .map(normalizarTokenSetor)
    .some((token) => tokensSaoEquivalentes(token, setorNormalizado));
}

module.exports = {
  CHAVE_SETORES_ALTERACAO_STATUS_LIVRE,
  normalizarTokenSetor,
  normalizarListaSetores,
  obterConfiguracaoSetoresAlteracaoStatusLivre,
  salvarConfiguracaoSetoresAlteracaoStatusLivre,
  obterTokensSetoresAlteracaoStatusLivre,
  setorTemAlteracaoStatusLivre
};
