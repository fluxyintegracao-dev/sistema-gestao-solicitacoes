import { useEffect, useMemo, useState } from 'react';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import { getTiposSubContrato } from '../services/tiposSubContrato';
import { getSetores } from '../services/setores';
import { getCamposNovaSolicitacao, getTiposSolicitacaoPorSetor, salvarCamposNovaSolicitacao } from '../services/configuracoesSistema';
import { useAuth } from '../contexts/AuthContext';
import { hasEnabledModule } from '../utils/acessoProduto';
import { applyTipoSolicitacaoModuleAvailability, getTipoSolicitacaoBehavior } from '../utils/tipoSolicitacao';
import {
  CAMPOS_NOVA_SOLICITACAO,
  OPCOES_NOVA_SOLICITACAO,
  normalizarConfigCamposNovaSolicitacao,
  normalizarAreaNovaSolicitacao,
  obterOpcoesNovaSolicitacaoFrontend,
  resolverCamposNovaSolicitacaoFrontend
} from '../utils/novaSolicitacaoCampos';

export default function NovaSolicitacaoCamposConfig() {
  const { user } = useAuth();
  const moduloContratosHabilitado = hasEnabledModule(user, 'CONTRATOS');
  const moduloApropriacoesHabilitado = hasEnabledModule(user, 'OBRAS');
  const [setores, setSetores] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [tiposPorSetorConfig, setTiposPorSetorConfig] = useState({});
  const [areaSelecionada, setAreaSelecionada] = useState('');
  const [tipoSelecionadoId, setTipoSelecionadoId] = useState('');
  // Escopo de contratos 3.1-3.3: os subtipos do mesmo tipo pedem campos diferentes. A regra do
  // subtipo grava sob `tipo:subtipo` e tem precedencia; sem subtipo escolhido, edita-se o tipo,
  // que segue valendo como padrao para os subtipos sem regra propria.
  const [subtipos, setSubtipos] = useState([]);
  const [subtipoSelecionadoId, setSubtipoSelecionadoId] = useState('');
  const [regras, setRegras] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [setoresData, tiposData, tiposPorSetorData, configData] = await Promise.all([
          getSetores(),
          getTiposSolicitacao(),
          getTiposSolicitacaoPorSetor(),
          getCamposNovaSolicitacao()
        ]);
        const listaSetores = Array.isArray(setoresData) ? setoresData : [];
        const listaTipos = Array.isArray(tiposData) ? tiposData.filter((tipo) => tipo?.ativo !== false) : [];
        const regrasTiposPorSetor = tiposPorSetorData?.regras && typeof tiposPorSetorData.regras === 'object'
          ? tiposPorSetorData.regras
          : {};
        const primeiraArea = listaSetores.find((setor) => setor?.codigo)?.codigo || '';
        const tiposPrimeiraArea = filtrarTiposPorArea(listaTipos, regrasTiposPorSetor, primeiraArea);
        setSetores(listaSetores);
        setTipos(listaTipos);
        setTiposPorSetorConfig(regrasTiposPorSetor);
        setAreaSelecionada(primeiraArea);
        setTipoSelecionadoId(tiposPrimeiraArea[0]?.id ? String(tiposPrimeiraArea[0].id) : '');
        setRegras(normalizarConfigCamposNovaSolicitacao(configData).regras);
      } catch (error) {
        console.error(error);
        alert(error.message || 'Erro ao carregar configuracao dos campos');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function filtrarTiposPorArea(listaTipos, regrasTiposPorSetor, area) {
    const areaKey = normalizarAreaNovaSolicitacao(area);
    const tiposAtivos = Array.isArray(listaTipos)
      ? listaTipos.filter((tipo) => tipo?.ativo !== false)
      : [];
    const tiposPermitidos = Array.isArray(regrasTiposPorSetor?.[areaKey]?.tipos)
      ? regrasTiposPorSetor[areaKey].tipos.map(Number).filter(Number.isFinite)
      : [];

    if (tiposPermitidos.length === 0) {
      return tiposAtivos;
    }

    const idsPermitidos = new Set(tiposPermitidos);
    return tiposAtivos.filter((tipo) => idsPermitidos.has(Number(tipo.id)));
  }

  const tiposDaArea = useMemo(
    () => filtrarTiposPorArea(tipos, tiposPorSetorConfig, areaSelecionada),
    [tipos, tiposPorSetorConfig, areaSelecionada]
  );

  useEffect(() => {
    if (!areaSelecionada) return;
    if (tiposDaArea.some((tipo) => String(tipo.id) === String(tipoSelecionadoId))) return;
    setTipoSelecionadoId(tiposDaArea[0]?.id ? String(tiposDaArea[0].id) : '');
  }, [areaSelecionada, tipoSelecionadoId, tiposDaArea]);

  const tipoSelecionado = useMemo(
    () => tiposDaArea.find((tipo) => String(tipo.id) === String(tipoSelecionadoId)) || null,
    [tiposDaArea, tipoSelecionadoId]
  );

  const comportamentoTipo = useMemo(() => {
    const comportamentoBase = getTipoSolicitacaoBehavior(tipoSelecionado);
    return applyTipoSolicitacaoModuleAvailability(comportamentoBase, {
      contratos: moduloContratosHabilitado,
      apropriacoes: moduloApropriacoesHabilitado
    });
  }, [tipoSelecionado, moduloContratosHabilitado, moduloApropriacoesHabilitado]);
  const camposControladosPelaApropriacaoAutomatica = useMemo(
    () => new Set(
      comportamentoTipo.usa_apropriacao_automatica_obra
        ? ['contrato', 'apropriacao_principal', 'apropriacoes_contrato']
        : []
    ),
    [comportamentoTipo.usa_apropriacao_automatica_obra]
  );
  const camposDisponiveis = useMemo(
    () => CAMPOS_NOVA_SOLICITACAO.filter(
      (campo) => (
        (!campo.somenteFluxoContratoNovo || comportamentoTipo.usa_fluxo_contrato_novo) &&
        (!campo.excetoFluxoContratoNovo || !comportamentoTipo.usa_fluxo_contrato_novo)
      )
    ),
    [comportamentoTipo.usa_fluxo_contrato_novo]
  );

  // Carrega os subtipos do tipo escolhido; trocar de tipo zera a selecao de subtipo.
  useEffect(() => {
    setSubtipoSelecionadoId('');
    if (!tipoSelecionadoId) { setSubtipos([]); return; }
    let cancelado = false;
    getTiposSubContrato({ tipo_macro_id: tipoSelecionadoId })
      // So subtipo ATIVO, como faz a Nova Solicitacao. O endpoint devolve os inativos tambem, e
      // sem este filtro daria para configurar campos de um subtipo que ninguem consegue escolher
      // — configuracao que nunca teria efeito, e que o proximo leitor acharia que tem.
      .then((lista) => {
        if (cancelado) return;
        setSubtipos(Array.isArray(lista) ? lista.filter((item) => item?.ativo !== false) : []);
      })
      .catch(() => { if (!cancelado) setSubtipos([]); });
    return () => { cancelado = true; };
  }, [tipoSelecionadoId]);

  // A chave que esta sendo editada: o subtipo quando escolhido, senao o tipo.
  const chaveRegraSelecionada = subtipoSelecionadoId
    ? `${tipoSelecionadoId}:${subtipoSelecionadoId}`
    : String(tipoSelecionadoId || '');

  const camposResolvidos = useMemo(() => (
    resolverCamposNovaSolicitacaoFrontend(
      comportamentoTipo,
      { regras },
      tipoSelecionadoId,
      {
        apropriacoesDisponiveis: moduloApropriacoesHabilitado,
        areaResponsavel: areaSelecionada,
        tipoSubId: subtipoSelecionadoId
      }
    )
  ), [comportamentoTipo, regras, tipoSelecionadoId, subtipoSelecionadoId, areaSelecionada, moduloApropriacoesHabilitado]);
  const opcoesTipo = useMemo(() => (
    obterOpcoesNovaSolicitacaoFrontend({ regras }, tipoSelecionadoId, areaSelecionada)
  ), [regras, tipoSelecionadoId, areaSelecionada]);

  function atualizarCampo(campoId, patch) {
    const definicao = CAMPOS_NOVA_SOLICITACAO.find((campo) => campo.id === campoId);
    if (definicao?.fixo || camposControladosPelaApropriacaoAutomatica.has(campoId) || !chaveRegraSelecionada || !areaSelecionada) return;
    const areaKey = normalizarAreaNovaSolicitacao(areaSelecionada);

    setRegras((prev) => {
      const atualTiposArea = prev[areaKey]?.tipos || {};
      const atualRegraTipo = atualTiposArea[chaveRegraSelecionada] || {};
      const atualTipo = atualRegraTipo.campos || {};
      const atualCampo = atualTipo[campoId] || {
        visivel: camposResolvidos[campoId]?.visivel_padrao ?? true,
        obrigatorio: camposResolvidos[campoId]?.obrigatorio_padrao ?? false
      };
      const proximoCampo = {
        ...atualCampo,
        ...patch
      };

      if (proximoCampo.visivel === false) {
        proximoCampo.obrigatorio = false;
      }

      return {
        ...prev,
        [areaKey]: {
          tipos: {
            ...atualTiposArea,
            [chaveRegraSelecionada]: {
              opcoes: atualRegraTipo.opcoes || {},
              campos: {
                ...atualTipo,
                [campoId]: proximoCampo
              }
            }
          }
        }
      };
    });
  }

  function atualizarOpcao(opcaoId, valor) {
    if (!chaveRegraSelecionada || !areaSelecionada) return;
    const areaKey = normalizarAreaNovaSolicitacao(areaSelecionada);

    setRegras((prev) => {
      const atualTiposArea = prev[areaKey]?.tipos || {};
      const atualTipo = atualTiposArea[chaveRegraSelecionada] || {};

      return {
        ...prev,
        [areaKey]: {
          tipos: {
            ...atualTiposArea,
            [chaveRegraSelecionada]: {
              campos: atualTipo.campos || {},
              opcoes: {
                ...(atualTipo.opcoes || {}),
                [opcaoId]: Boolean(valor)
              }
            }
          }
        }
      };
    });
  }

  function restaurarPadraoTipo() {
    if (!tipoSelecionadoId || !areaSelecionada) return;
    const areaKey = normalizarAreaNovaSolicitacao(areaSelecionada);
    setRegras((prev) => {
      const next = { ...prev };
      const tiposArea = { ...(next[areaKey]?.tipos || {}) };
      delete tiposArea[String(tipoSelecionadoId)];
      next[areaKey] = { tipos: tiposArea };
      return next;
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      const data = await salvarCamposNovaSolicitacao({ regras });
      setRegras(normalizarConfigCamposNovaSolicitacao(data).regras);
      alert('Configuracao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar configuracao.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <div className="card">Carregando configuracao dos campos...</div>;
  }

  return (
    <div className="config-page solicitacoes-page space-y-5 md:space-y-6">
      <header className="config-page-header">
        <div className="config-page-header-row">
          <div>
            <h1 className="config-page-title">Campos da Nova Solicitacao</h1>
            <p className="config-page-subtitle">
              Defina, por area e tipo, quais campos aparecem e quais ficam obrigatorios na abertura da solicitacao.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar configuracao'}
          </button>
        </div>
      </header>

      <section className="config-summary-card">
        <div>
          <p className="config-summary-kicker">Regra por area e tipo</p>
          <h2 className="config-summary-title">O formulario muda conforme a area e o tipo selecionados</h2>
          <p className="config-summary-copy">
            Obra e area responsavel continuam fixas para preservar o fluxo operacional. Os demais campos podem ser exibidos, ocultados ou exigidos por tipo.
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="card space-y-3">
          <label className="grid gap-2 text-sm">
            Area responsavel
            <select
              className="input input-sm"
              value={areaSelecionada}
              onChange={(event) => setAreaSelecionada(event.target.value)}
            >
              {setores.map((setor) => (
                <option key={setor.id} value={setor.codigo}>{setor.nome}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            Tipo de solicitacao
            <select
              className="input input-sm"
              value={tipoSelecionadoId}
              onChange={(event) => setTipoSelecionadoId(event.target.value)}
              disabled={!areaSelecionada || tiposDaArea.length === 0}
            >
              {tiposDaArea.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
              ))}
            </select>
          </label>
          {subtipos.length > 0 && (
            <label className="grid gap-2 text-sm">
              Subtipo
              <select
                className="input input-sm"
                value={subtipoSelecionadoId}
                onChange={(event) => setSubtipoSelecionadoId(event.target.value)}
              >
                {/* Vazio = editar o tipo, que vale como padrao para os subtipos sem regra propria. */}
                <option value="">Todos (regra do tipo)</option>
                {subtipos.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.nome}</option>
                ))}
              </select>
              <span className="text-xs text-[var(--c-muted)]">
                {subtipoSelecionadoId
                  ? 'Editando a regra deste subtipo. Ela tem precedencia sobre a do tipo.'
                  : 'Editando a regra do tipo. Vale para os subtipos que nao tiverem regra propria.'}
              </span>
            </label>
          )}
          {tiposDaArea.length === 0 && (
            <p className="text-xs text-[var(--c-muted)]">
              Nenhum tipo ativo encontrado para esta area.
            </p>
          )}
          <button
            type="button"
            className="btn btn-outline btn-sm w-full"
            onClick={restaurarPadraoTipo}
            disabled={!areaSelecionada || !tipoSelecionadoId}
          >
            Restaurar padrao deste tipo
          </button>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-[var(--c-border)] px-4 py-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[var(--c-text)]">Regras operacionais deste tipo</h3>
              <p className="mt-1 text-xs text-[var(--c-muted)]">
                Ajustes que mudam a validacao do fluxo sem alterar a visibilidade dos campos.
              </p>
            </div>
            <div className="grid gap-3">
              {OPCOES_NOVA_SOLICITACAO.map((opcao) => (
                <label
                  key={opcao.id}
                  className="flex items-start gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-muted)] px-3 py-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(opcoesTipo[opcao.id])}
                    disabled={!areaSelecionada || !tipoSelecionadoId}
                    onChange={(event) => atualizarOpcao(opcao.id, event.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--c-text)]">{opcao.label}</span>
                    <span className="mt-1 block text-xs text-[var(--c-muted)]">{opcao.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--c-border)] text-left text-xs uppercase tracking-[0.08em] text-[var(--c-muted)]">
                  <th className="px-3 py-3">Campo</th>
                  <th className="px-3 py-3">Aparece</th>
                  <th className="px-3 py-3">Obrigatorio</th>
                  <th className="px-3 py-3">Padrao atual</th>
                </tr>
              </thead>
              <tbody>
                {camposDisponiveis.map((campo) => {
                  const resolvido = camposResolvidos[campo.id] || {};
                  const controladoAutomaticamente = camposControladosPelaApropriacaoAutomatica.has(campo.id);
                  const labelCampo = campo.id === 'descricao' && comportamentoTipo.usa_fluxo_contrato_novo
                    ? 'Titulo do contrato'
                    : campo.label;
                  return (
                    <tr key={campo.id} className="border-b border-[var(--c-border)] last:border-0">
                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold text-[var(--c-text)]">{labelCampo}</div>
                        <div className="mt-1 text-xs text-[var(--c-muted)]">{campo.descricao}</div>
                        {campo.somenteFluxoContratoNovo && (
                          <span className="mt-2 inline-flex rounded-full border border-[var(--c-border)] px-2 py-0.5 text-[11px] text-[var(--c-muted)]">
                            Campo do novo fluxo de contrato
                          </span>
                        )}
                        {campo.fixo && (
                          <span className="mt-2 inline-flex rounded-full border border-[var(--c-border)] px-2 py-0.5 text-[11px] text-[var(--c-muted)]">
                            Campo estrutural
                          </span>
                        )}
                        {controladoAutomaticamente && (
                          <span className="mt-2 inline-flex rounded-full border border-[var(--c-border)] px-2 py-0.5 text-[11px] text-[var(--c-muted)]">
                            Controlado pela apropriacao automatica
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={Boolean(resolvido.visivel)}
                          disabled={campo.fixo || controladoAutomaticamente}
                          onChange={(event) => atualizarCampo(campo.id, { visivel: event.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={Boolean(resolvido.obrigatorio)}
                          disabled={campo.fixo || controladoAutomaticamente || campo.permiteObrigatorio === false || !resolvido.visivel}
                          onChange={(event) => atualizarCampo(campo.id, { obrigatorio: event.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-[var(--c-muted)]">
                        {resolvido.visivel_padrao ? 'Visivel' : 'Oculto'} / {resolvido.obrigatorio_padrao ? 'Obrigatorio' : 'Opcional'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
