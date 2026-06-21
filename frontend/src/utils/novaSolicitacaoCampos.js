export const CAMPOS_NOVA_SOLICITACAO = [
  { id: 'obra', label: 'Obra', descricao: 'Vincula a solicitacao a uma obra.', fixo: true },
  { id: 'area_responsavel', label: 'Area responsavel', descricao: 'Define o setor que recebe a solicitacao.', fixo: true },
  { id: 'credor', label: 'Credor', descricao: 'Pessoa ou empresa vinculada como credor.' },
  { id: 'apropriacao_principal', label: 'Apropriacao principal', descricao: 'Apropriacao da solicitacao na obra.' },
  { id: 'subtipo', label: 'Subtipo', descricao: 'Subtipo de contrato ou classificacao complementar.' },
  { id: 'contrato', label: 'Contrato', descricao: 'Referencia e contrato vinculado.' },
  { id: 'valor', label: 'Valor', descricao: 'Valor da solicitacao.' },
  { id: 'data_vencimento', label: 'Data de vencimento', descricao: 'Prazo ou vencimento esperado.' },
  { id: 'data_demissao', label: 'Data de demissao', descricao: 'Data efetiva de desligamento do colaborador.' },
  { id: 'periodo_medicao', label: 'Periodo de medicao', descricao: 'Data inicial e final da medicao.' },
  { id: 'ref_contrato_abertura', label: 'Ref. contrato abertura', descricao: 'Referencia usada para abertura de contrato.' },
  { id: 'itens_apropriacao', label: 'Itens de apropriacao', descricao: 'Itens de apropriacao usados na abertura de contrato.' },
  { id: 'descricao', label: 'Descricao', descricao: 'Descricao textual da solicitacao.' },
  { id: 'anexos', label: 'Anexos', descricao: 'Arquivos anexados na abertura da solicitacao.', permiteObrigatorio: false }
];

function boolOrDefault(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return Boolean(fallback);
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'sim', 's'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'n'].includes(normalized)) return false;
  return Boolean(fallback);
}

export function normalizarAreaNovaSolicitacao(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function normalizarTipoKey(value) {
  return String(value || '').trim();
}

function obterRegraCampos(config, tipoId, areaResponsavel) {
  const tipoKey = normalizarTipoKey(tipoId);
  const areaKey = normalizarAreaNovaSolicitacao(areaResponsavel);

  return (
    config?.regras?.[areaKey]?.tipos?.[tipoKey]?.campos ||
    config?.regras?.__GLOBAL__?.tipos?.[tipoKey]?.campos ||
    config?.regras?.[tipoKey]?.campos ||
    {}
  );
}

function padraoCampo(id, behavior = {}, contexto = {}) {
  const solicitacaoCompra = !behavior.mostrar_apropriacao_principal && !behavior.mostrar_valor;
  const apropriacoesDisponiveis = contexto.apropriacoesDisponiveis !== false;

  switch (id) {
    case 'obra':
    case 'area_responsavel':
      return { visivel: true, obrigatorio: true };
    case 'credor':
      return { visivel: true, obrigatorio: false };
    case 'apropriacao_principal':
      return {
        visivel: Boolean(apropriacoesDisponiveis && behavior.mostrar_apropriacao_principal),
        obrigatorio: Boolean(behavior.exige_apropriacao_principal)
      };
    case 'subtipo':
      return { visivel: Boolean(behavior.mostrar_subtipo), obrigatorio: Boolean(behavior.exige_subtipo) };
    case 'contrato':
      return { visivel: Boolean(behavior.mostrar_contrato), obrigatorio: Boolean(behavior.exige_contrato) };
    case 'valor':
      return { visivel: Boolean(behavior.mostrar_valor), obrigatorio: Boolean(behavior.exige_valor) };
    case 'data_vencimento':
      return { visivel: true, obrigatorio: true };
    case 'data_demissao':
      return { visivel: false, obrigatorio: false };
    case 'periodo_medicao':
      return {
        visivel: Boolean(behavior.mostrar_periodo_medicao || behavior.exige_periodo_medicao),
        obrigatorio: Boolean(behavior.exige_periodo_medicao)
      };
    case 'ref_contrato_abertura':
      return {
        visivel: Boolean(
          behavior.mostrar_ref_contrato_abertura ||
          behavior.exige_ref_contrato_abertura ||
          behavior.mostrar_itens_apropriacao ||
          behavior.exige_itens_apropriacao
        ),
        obrigatorio: Boolean(behavior.exige_ref_contrato_abertura)
      };
    case 'itens_apropriacao':
      return {
        visivel: Boolean(
          behavior.mostrar_itens_apropriacao ||
          behavior.exige_itens_apropriacao ||
          behavior.mostrar_ref_contrato_abertura ||
          behavior.exige_ref_contrato_abertura
        ),
        obrigatorio: Boolean(behavior.exige_itens_apropriacao)
      };
    case 'descricao':
      return { visivel: behavior.mostrar_descricao !== false, obrigatorio: Boolean(behavior.exige_descricao) };
    case 'anexos':
      return { visivel: true, obrigatorio: false };
    default:
      return { visivel: true, obrigatorio: false };
  }
}

export function resolverCamposNovaSolicitacaoFrontend(behavior, config, tipoId, contexto = {}) {
  const regrasTipo = obterRegraCampos(config, tipoId, contexto.areaResponsavel);
  return CAMPOS_NOVA_SOLICITACAO.reduce((acc, campo) => {
    const padrao = padraoCampo(campo.id, behavior, contexto);
    const regra = regrasTipo[campo.id];
    const visivel = campo.fixo ? true : boolOrDefault(regra?.visivel, padrao.visivel);
    const obrigatorio = campo.permiteObrigatorio === false
      ? false
      : (campo.fixo ? true : (visivel ? boolOrDefault(regra?.obrigatorio, padrao.obrigatorio) : false));
    acc[campo.id] = {
      ...campo,
      visivel,
      obrigatorio,
      visivel_padrao: padrao.visivel,
      obrigatorio_padrao: padrao.obrigatorio
    };
    return acc;
  }, {});
}

export function normalizarConfigCamposNovaSolicitacao(config) {
  const regrasRaw = config?.regras && typeof config.regras === 'object' ? config.regras : {};
  const idsValidos = new Set(CAMPOS_NOVA_SOLICITACAO.map((campo) => campo.id));
  const regras = {};

  function normalizarCampos(camposRaw) {
    const campos = {};
    Object.entries(camposRaw && typeof camposRaw === 'object' ? camposRaw : {}).forEach(([campoId, regraCampo]) => {
      if (!idsValidos.has(campoId)) return;
      const visivel = boolOrDefault(regraCampo?.visivel, true);
      campos[campoId] = {
        visivel,
        obrigatorio: campoId === 'anexos' ? false : (visivel ? boolOrDefault(regraCampo?.obrigatorio, false) : false)
      };
    });
    return campos;
  }

  Object.entries(regrasRaw).forEach(([areaOuTipo, regraAreaOuTipo]) => {
    const areaKey = normalizarAreaNovaSolicitacao(areaOuTipo);
    if (!areaKey) return;

    if (regraAreaOuTipo?.tipos && typeof regraAreaOuTipo.tipos === 'object') {
      const tipos = {};
      Object.entries(regraAreaOuTipo.tipos).forEach(([tipoId, regraTipo]) => {
        const tipoKey = normalizarTipoKey(tipoId);
        if (!tipoKey) return;
        tipos[tipoKey] = {
          campos: normalizarCampos(regraTipo?.campos)
        };
      });

      regras[areaKey] = { tipos };
      return;
    }

    if (regraAreaOuTipo?.campos && typeof regraAreaOuTipo.campos === 'object') {
      const tipoKey = normalizarTipoKey(areaOuTipo);
      if (!tipoKey) return;
      if (!regras.__GLOBAL__) {
        regras.__GLOBAL__ = { tipos: {} };
      }
      regras.__GLOBAL__.tipos[tipoKey] = {
        campos: normalizarCampos(regraAreaOuTipo.campos)
      };
    }
  });

  return { regras };
}
