import { useEffect, useMemo, useState } from 'react';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import { getCamposNovaSolicitacao, salvarCamposNovaSolicitacao } from '../services/configuracoesSistema';
import { useAuth } from '../contexts/AuthContext';
import { hasEnabledModule } from '../utils/acessoProduto';
import { applyTipoSolicitacaoModuleAvailability, getTipoSolicitacaoBehavior } from '../utils/tipoSolicitacao';
import {
  CAMPOS_NOVA_SOLICITACAO,
  normalizarConfigCamposNovaSolicitacao,
  resolverCamposNovaSolicitacaoFrontend
} from '../utils/novaSolicitacaoCampos';

export default function NovaSolicitacaoCamposConfig() {
  const { user } = useAuth();
  const moduloContratosHabilitado = hasEnabledModule(user, 'CONTRATOS');
  const moduloApropriacoesHabilitado = hasEnabledModule(user, 'OBRAS');
  const [tipos, setTipos] = useState([]);
  const [tipoSelecionadoId, setTipoSelecionadoId] = useState('');
  const [regras, setRegras] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [tiposData, configData] = await Promise.all([
          getTiposSolicitacao(),
          getCamposNovaSolicitacao()
        ]);
        const listaTipos = Array.isArray(tiposData) ? tiposData.filter((tipo) => tipo?.ativo !== false) : [];
        setTipos(listaTipos);
        setTipoSelecionadoId(listaTipos[0]?.id ? String(listaTipos[0].id) : '');
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

  const tipoSelecionado = useMemo(
    () => tipos.find((tipo) => String(tipo.id) === String(tipoSelecionadoId)) || null,
    [tipos, tipoSelecionadoId]
  );

  const comportamentoTipo = useMemo(() => {
    const comportamentoBase = getTipoSolicitacaoBehavior(tipoSelecionado);
    return applyTipoSolicitacaoModuleAvailability(comportamentoBase, {
      contratos: moduloContratosHabilitado,
      apropriacoes: moduloApropriacoesHabilitado
    });
  }, [tipoSelecionado, moduloContratosHabilitado, moduloApropriacoesHabilitado]);

  const camposResolvidos = useMemo(() => (
    resolverCamposNovaSolicitacaoFrontend(
      comportamentoTipo,
      { regras },
      tipoSelecionadoId,
      { apropriacoesDisponiveis: moduloApropriacoesHabilitado }
    )
  ), [comportamentoTipo, regras, tipoSelecionadoId, moduloApropriacoesHabilitado]);

  function atualizarCampo(campoId, patch) {
    const definicao = CAMPOS_NOVA_SOLICITACAO.find((campo) => campo.id === campoId);
    if (definicao?.fixo || !tipoSelecionadoId) return;

    setRegras((prev) => {
      const atualTipo = prev[String(tipoSelecionadoId)]?.campos || {};
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
        [String(tipoSelecionadoId)]: {
          campos: {
            ...atualTipo,
            [campoId]: proximoCampo
          }
        }
      };
    });
  }

  function restaurarPadraoTipo() {
    if (!tipoSelecionadoId) return;
    setRegras((prev) => {
      const next = { ...prev };
      delete next[String(tipoSelecionadoId)];
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
              Defina, por tipo, quais campos aparecem e quais ficam obrigatorios na abertura da solicitacao.
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
          <p className="config-summary-kicker">Regra por tipo</p>
          <h2 className="config-summary-title">O formulario muda conforme o tipo selecionado</h2>
          <p className="config-summary-copy">
            Obra e area responsavel continuam fixas para preservar o fluxo operacional. Os demais campos podem ser exibidos, ocultados ou exigidos por tipo.
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="card space-y-3">
          <label className="grid gap-2 text-sm">
            Tipo de solicitacao
            <select
              className="input input-sm"
              value={tipoSelecionadoId}
              onChange={(event) => setTipoSelecionadoId(event.target.value)}
            >
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-outline btn-sm w-full"
            onClick={restaurarPadraoTipo}
            disabled={!tipoSelecionadoId}
          >
            Restaurar padrao deste tipo
          </button>
        </section>

        <section className="card overflow-hidden">
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
                {CAMPOS_NOVA_SOLICITACAO.map((campo) => {
                  const resolvido = camposResolvidos[campo.id] || {};
                  return (
                    <tr key={campo.id} className="border-b border-[var(--c-border)] last:border-0">
                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold text-[var(--c-text)]">{campo.label}</div>
                        <div className="mt-1 text-xs text-[var(--c-muted)]">{campo.descricao}</div>
                        {campo.fixo && (
                          <span className="mt-2 inline-flex rounded-full border border-[var(--c-border)] px-2 py-0.5 text-[11px] text-[var(--c-muted)]">
                            Campo estrutural
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={Boolean(resolvido.visivel)}
                          disabled={campo.fixo}
                          onChange={(event) => atualizarCampo(campo.id, { visivel: event.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={Boolean(resolvido.obrigatorio)}
                          disabled={campo.fixo || campo.permiteObrigatorio === false || !resolvido.visivel}
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
