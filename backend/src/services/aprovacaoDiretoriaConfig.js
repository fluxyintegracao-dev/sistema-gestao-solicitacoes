const { ConfiguracaoSistema } = require('../models');

const CHAVE_DIRETORIA_POR_CLASSIFICACAO_OBRA = 'DIRETORIA_POR_CLASSIFICACAO_OBRA';
const CHAVE_SETOR_DESTINO_APOS_APROVACAO_DIRETORIA = 'SETOR_DESTINO_APOS_APROVACAO_DIRETORIA';

function normalizarClassificacaoObra(valor) {
  const classificacao = String(valor || '').trim().toUpperCase();
  if (classificacao === 'PUBLICA' || classificacao === 'PRIVADA') {
    return classificacao;
  }
  return null;
}

function normalizarTokenSetor(valor) {
  const token = String(valor || '').trim().toUpperCase();
  return token || null;
}

function normalizarMapaDiretoriasPorClassificacao(raw = {}) {
  const diretorias = {};

  ['PUBLICA', 'PRIVADA'].forEach((classificacao) => {
    const token = normalizarTokenSetor(raw?.[classificacao]);
    if (token) {
      diretorias[classificacao] = token;
    }
  });

  return diretorias;
}

function normalizarMapaSetorDestinoAprovacao(raw = {}) {
  const destinos = {};

  Object.entries(raw || {}).forEach(([tipoId, setor]) => {
    const id = Number(tipoId);
    const token = normalizarTokenSetor(setor);

    if (!Number.isInteger(id) || id <= 0 || !token) {
      return;
    }

    destinos[String(id)] = token;
  });

  return destinos;
}

async function lerConfiguracaoJson(chave, fallback) {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave },
    order: [['id', 'DESC']]
  });

  if (!item?.valor) return fallback;

  try {
    return JSON.parse(item.valor);
  } catch {
    return fallback;
  }
}

async function obterConfiguracaoAprovacaoDiretoria() {
  const [diretoriasRaw, destinosRaw] = await Promise.all([
    lerConfiguracaoJson(CHAVE_DIRETORIA_POR_CLASSIFICACAO_OBRA, { diretorias: {} }),
    lerConfiguracaoJson(CHAVE_SETOR_DESTINO_APOS_APROVACAO_DIRETORIA, { destinos: {} })
  ]);

  return {
    diretoriasPorClassificacao: normalizarMapaDiretoriasPorClassificacao(diretoriasRaw?.diretorias),
    setoresDestinoPorTipo: normalizarMapaSetorDestinoAprovacao(destinosRaw?.destinos)
  };
}

function obterDiretoriaParaObra(obra, diretoriasPorClassificacao = {}) {
  const classificacao = normalizarClassificacaoObra(obra?.classificacao_obra);
  if (!classificacao) return null;
  return diretoriasPorClassificacao[classificacao] || null;
}

function obterSetorDestinoAprovacao(tipoSolicitacaoId, setoresDestinoPorTipo = {}) {
  const tipoId = Number(tipoSolicitacaoId);
  if (!Number.isInteger(tipoId) || tipoId <= 0) return null;
  return setoresDestinoPorTipo[String(tipoId)] || null;
}

module.exports = {
  CHAVE_DIRETORIA_POR_CLASSIFICACAO_OBRA,
  CHAVE_SETOR_DESTINO_APOS_APROVACAO_DIRETORIA,
  normalizarClassificacaoObra,
  normalizarTokenSetor,
  normalizarMapaDiretoriasPorClassificacao,
  normalizarMapaSetorDestinoAprovacao,
  obterConfiguracaoAprovacaoDiretoria,
  obterDiretoriaParaObra,
  obterSetorDestinoAprovacao
};
