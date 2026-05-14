const { ConfiguracaoSistema } = require('../models');

const CHAVE_NOVA_SOLICITACAO_CAMPOS = 'NOVA_SOLICITACAO_CAMPOS_POR_TIPO';

const CAMPOS_NOVA_SOLICITACAO = [
  {
    id: 'obra',
    label: 'Obra',
    descricao: 'Vincula a solicitacao a uma obra.',
    fixo: true,
    visivelPadrao: true,
    obrigatorioPadrao: true
  },
  {
    id: 'area_responsavel',
    label: 'Area responsavel',
    descricao: 'Define o setor que recebe a solicitacao.',
    fixo: true,
    visivelPadrao: true,
    obrigatorioPadrao: true
  },
  {
    id: 'credor',
    label: 'Credor',
    descricao: 'Pessoa ou empresa vinculada como credor.',
    visivelPadrao: true,
    obrigatorioPadrao: false
  },
  {
    id: 'apropriacao_principal',
    label: 'Apropriacao principal',
    descricao: 'Apropriacao da solicitacao na obra.',
    visivelPadrao: (behavior, contexto) => Boolean(contexto?.apropriacoesDisponiveis && (behavior.mostrar_apropriacao_principal || contexto?.solicitacaoCompra)),
    obrigatorioPadrao: (behavior) => Boolean(behavior.exige_apropriacao_principal)
  },
  {
    id: 'subtipo',
    label: 'Subtipo',
    descricao: 'Subtipo de contrato ou classificacao complementar.',
    visivelPadrao: (behavior) => Boolean(behavior.mostrar_subtipo),
    obrigatorioPadrao: (behavior) => Boolean(behavior.exige_subtipo)
  },
  {
    id: 'contrato',
    label: 'Contrato',
    descricao: 'Referencia e contrato vinculado.',
    visivelPadrao: (behavior) => Boolean(behavior.mostrar_contrato),
    obrigatorioPadrao: (behavior) => Boolean(behavior.exige_contrato)
  },
  {
    id: 'valor',
    label: 'Valor',
    descricao: 'Valor da solicitacao.',
    visivelPadrao: (behavior) => Boolean(behavior.mostrar_valor),
    obrigatorioPadrao: (behavior) => Boolean(behavior.exige_valor)
  },
  {
    id: 'data_vencimento',
    label: 'Data de vencimento',
    descricao: 'Prazo ou vencimento esperado.',
    visivelPadrao: true,
    obrigatorioPadrao: true
  },
  {
    id: 'periodo_medicao',
    label: 'Periodo de medicao',
    descricao: 'Data inicial e final da medicao.',
    visivelPadrao: (behavior) => Boolean(behavior.mostrar_periodo_medicao || behavior.exige_periodo_medicao),
    obrigatorioPadrao: (behavior) => Boolean(behavior.exige_periodo_medicao)
  },
  {
    id: 'ref_contrato_abertura',
    label: 'Ref. contrato abertura',
    descricao: 'Referencia usada para abertura de contrato.',
    visivelPadrao: (behavior) => Boolean(
      behavior.mostrar_ref_contrato_abertura ||
      behavior.exige_ref_contrato_abertura ||
      behavior.mostrar_itens_apropriacao ||
      behavior.exige_itens_apropriacao
    ),
    obrigatorioPadrao: (behavior) => Boolean(behavior.exige_ref_contrato_abertura)
  },
  {
    id: 'itens_apropriacao',
    label: 'Itens de apropriacao',
    descricao: 'Itens de apropriacao usados na abertura de contrato.',
    visivelPadrao: (behavior) => Boolean(
      behavior.mostrar_itens_apropriacao ||
      behavior.exige_itens_apropriacao ||
      behavior.mostrar_ref_contrato_abertura ||
      behavior.exige_ref_contrato_abertura
    ),
    obrigatorioPadrao: (behavior) => Boolean(behavior.exige_itens_apropriacao)
  },
  {
    id: 'descricao',
    label: 'Descricao',
    descricao: 'Descricao textual da solicitacao.',
    visivelPadrao: (behavior) => behavior.mostrar_descricao !== false,
    obrigatorioPadrao: (behavior) => Boolean(behavior.exige_descricao)
  },
  {
    id: 'anexos',
    label: 'Anexos',
    descricao: 'Arquivos anexados na abertura da solicitacao.',
    visivelPadrao: true,
    obrigatorioPadrao: false,
    permiteObrigatorio: false
  }
];

function parseJsonOrDefault(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function boolOrDefault(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return Boolean(fallback);
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'sim', 's'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'n'].includes(normalized)) return false;
  return Boolean(fallback);
}

function valorPadraoCampo(definicao, prop, behavior, contexto) {
  const valor = definicao[prop];
  if (typeof valor === 'function') return Boolean(valor(behavior || {}, contexto || {}));
  return Boolean(valor);
}

function normalizarConfigCampos(raw) {
  const regrasRaw = raw?.regras && typeof raw.regras === 'object' ? raw.regras : {};
  const regras = {};
  const idsValidos = new Set(CAMPOS_NOVA_SOLICITACAO.map((campo) => campo.id));

  Object.entries(regrasRaw).forEach(([tipoId, regraTipo]) => {
    const tipoKey = String(tipoId || '').trim();
    if (!tipoKey) return;
    const camposRaw = regraTipo?.campos && typeof regraTipo.campos === 'object' ? regraTipo.campos : {};
    const campos = {};

    Object.entries(camposRaw).forEach(([campoId, regraCampo]) => {
      if (!idsValidos.has(campoId)) return;
      const definicao = CAMPOS_NOVA_SOLICITACAO.find((campo) => campo.id === campoId);
      if (definicao?.fixo) return;
      const visivel = boolOrDefault(regraCampo?.visivel, true);
      campos[campoId] = {
        visivel,
        obrigatorio: definicao?.permiteObrigatorio === false
          ? false
          : (visivel ? boolOrDefault(regraCampo?.obrigatorio, false) : false)
      };
    });

    regras[tipoKey] = { campos };
  });

  return { regras };
}

async function obterConfigCamposNovaSolicitacao() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_NOVA_SOLICITACAO_CAMPOS },
    order: [['id', 'DESC']]
  });

  return normalizarConfigCampos(parseJsonOrDefault(item?.valor, { regras: {} }));
}

async function salvarConfigCamposNovaSolicitacao(payload) {
  const config = normalizarConfigCampos(payload);
  const valor = JSON.stringify(config);
  const existente = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_NOVA_SOLICITACAO_CAMPOS },
    order: [['id', 'DESC']]
  });

  if (existente) {
    await existente.update({ valor });
  } else {
    await ConfiguracaoSistema.create({
      chave: CHAVE_NOVA_SOLICITACAO_CAMPOS,
      valor
    });
  }

  return config;
}

function resolverCamposNovaSolicitacao(comportamentoTipo, config, tipoId, contexto = {}) {
  const behavior = comportamentoTipo || {};
  const solicitacaoCompra = !behavior.mostrar_apropriacao_principal && !behavior.mostrar_valor;
  const contextoNormalizado = {
    apropriacoesDisponiveis: contexto.apropriacoesDisponiveis !== false,
    solicitacaoCompra
  };
  const regrasTipo = config?.regras?.[String(tipoId || '')]?.campos || {};
  const campos = {};

  CAMPOS_NOVA_SOLICITACAO.forEach((definicao) => {
    const visivelPadrao = valorPadraoCampo(definicao, 'visivelPadrao', behavior, contextoNormalizado);
    const obrigatorioPadrao = valorPadraoCampo(definicao, 'obrigatorioPadrao', behavior, contextoNormalizado);
    const regra = regrasTipo[definicao.id];

    let visivel = definicao.fixo ? true : boolOrDefault(regra?.visivel, visivelPadrao);
    let obrigatorio = definicao.fixo ? true : boolOrDefault(regra?.obrigatorio, obrigatorioPadrao);

    if (!visivel) {
      obrigatorio = false;
    }
    if (definicao.permiteObrigatorio === false) {
      obrigatorio = false;
    }

    campos[definicao.id] = {
      id: definicao.id,
      label: definicao.label,
      descricao: definicao.descricao,
      fixo: Boolean(definicao.fixo),
      visivel,
      obrigatorio,
      visivel_padrao: visivelPadrao,
      obrigatorio_padrao: obrigatorioPadrao
    };
  });

  return campos;
}

function montarPayloadConfigCampos(config) {
  return {
    campos_disponiveis: CAMPOS_NOVA_SOLICITACAO.map((campo) => ({
      id: campo.id,
      label: campo.label,
      descricao: campo.descricao,
      fixo: Boolean(campo.fixo),
      permite_obrigatorio: campo.permiteObrigatorio !== false
    })),
    regras: normalizarConfigCampos(config).regras
  };
}

module.exports = {
  CAMPOS_NOVA_SOLICITACAO,
  CHAVE_NOVA_SOLICITACAO_CAMPOS,
  montarPayloadConfigCampos,
  obterConfigCamposNovaSolicitacao,
  resolverCamposNovaSolicitacao,
  salvarConfigCamposNovaSolicitacao
};
