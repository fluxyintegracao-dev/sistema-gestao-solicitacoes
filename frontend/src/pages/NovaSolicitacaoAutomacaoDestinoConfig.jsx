import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import {
  getAutomacaoDestinoNovaSolicitacao,
  getTiposSolicitacaoPorSetor,
  salvarAutomacaoDestinoNovaSolicitacao
} from '../services/configuracoesSistema';
import {
  DESTINO_NOVA_SOLICITACAO_COMPRA,
  normalizarAreaAutomacaoDestino,
  normalizarConfigAutomacaoDestinoNovaSolicitacao
} from '../utils/novaSolicitacaoAutomacaoDestino';

export default function NovaSolicitacaoAutomacaoDestinoConfig() {
  const [setores, setSetores] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [tiposPorSetorConfig, setTiposPorSetorConfig] = useState({});
  const [destinosDisponiveis, setDestinosDisponiveis] = useState([]);
  const [areaSelecionada, setAreaSelecionada] = useState('');
  const [tipoSelecionadoId, setTipoSelecionadoId] = useState('');
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
          getAutomacaoDestinoNovaSolicitacao()
        ]);
        const listaSetores = Array.isArray(setoresData) ? setoresData : [];
        const listaTipos = Array.isArray(tiposData) ? tiposData.filter((tipo) => tipo?.ativo !== false) : [];
        const regrasTiposPorSetor = tiposPorSetorData?.regras && typeof tiposPorSetorData.regras === 'object'
          ? tiposPorSetorData.regras
          : {};
        const configNormalizada = normalizarConfigAutomacaoDestinoNovaSolicitacao(configData);
        const primeiraArea = listaSetores.find((setor) => setor?.codigo)?.codigo || '';
        const tiposPrimeiraArea = filtrarTiposPorArea(listaTipos, regrasTiposPorSetor, primeiraArea);

        setSetores(listaSetores);
        setTipos(listaTipos);
        setTiposPorSetorConfig(regrasTiposPorSetor);
        setDestinosDisponiveis(configNormalizada.destinos_disponiveis);
        setRegras(configNormalizada.regras);
        setAreaSelecionada(primeiraArea);
        setTipoSelecionadoId(tiposPrimeiraArea[0]?.id ? String(tiposPrimeiraArea[0].id) : '');
      } catch (error) {
        console.error(error);
        alert(error.message || 'Erro ao carregar automacao da nova solicitacao');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function filtrarTiposPorArea(listaTipos, regrasTiposPorSetor, area) {
    const areaKey = normalizarAreaAutomacaoDestino(area);
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

  const destinoCompra = destinosDisponiveis.find((destino) => destino.id === DESTINO_NOVA_SOLICITACAO_COMPRA);
  const areaKey = normalizarAreaAutomacaoDestino(areaSelecionada);
  const regraAtual = regras?.[areaKey]?.tipos?.[String(tipoSelecionadoId)] || null;
  const automacaoAtiva = Boolean(regraAtual?.ativo && regraAtual?.destino);

  function atualizarRegra(ativar) {
    if (!areaSelecionada || !tipoSelecionadoId) return;

    setRegras((prev) => {
      const next = { ...prev };
      const tiposArea = { ...(next[areaKey]?.tipos || {}) };

      if (!ativar) {
        delete tiposArea[String(tipoSelecionadoId)];
        next[areaKey] = { tipos: tiposArea };
        return next;
      }

      tiposArea[String(tipoSelecionadoId)] = {
        ativo: true,
        destino: DESTINO_NOVA_SOLICITACAO_COMPRA,
        rota: destinoCompra?.rota || '/solicitacoes-compra/nova',
        preservar_obra: true,
        preservar_solicitante: true
      };
      next[areaKey] = { tipos: tiposArea };
      return next;
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      const data = await salvarAutomacaoDestinoNovaSolicitacao({ regras });
      const configNormalizada = normalizarConfigAutomacaoDestinoNovaSolicitacao(data);
      setDestinosDisponiveis(configNormalizada.destinos_disponiveis);
      setRegras(configNormalizada.regras);
      alert('Automacao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar automacao.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <div className="card">Carregando automacao da nova solicitacao...</div>;
  }

  return (
    <div className="config-page solicitacoes-page space-y-5 md:space-y-6">
      <header className="config-page-header">
        <div className="config-page-header-row">
          <div>
            <h1 className="config-page-title">Automacao da Nova Solicitacao</h1>
            <p className="config-page-subtitle">
              Defina quando a escolha de area e tipo deve levar o usuario automaticamente para outra tela operacional.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar automacao'}
          </button>
        </div>
      </header>

      <section className="config-summary-card">
        <div>
          <p className="config-summary-kicker">Redirecionamento por tipo</p>
          <h2 className="config-summary-title">Abertura guiada para modulos especificos</h2>
          <p className="config-summary-copy">
            Ao selecionar uma regra ativa, a tela Nova Solicitacao redireciona o usuario preservando a obra escolhida e usando o usuario logado como solicitante.
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

          {tiposDaArea.length === 0 && (
            <p className="text-xs text-[var(--c-muted)]">
              Nenhum tipo ativo encontrado para esta area.
            </p>
          )}
        </section>

        <section className="card space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--c-muted)]">Destino automatico</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--c-text)]">
              {destinoCompra?.label || 'Nova Solicitacao de Compra'}
            </h2>
            <p className="mt-1 text-sm text-[var(--c-muted)]">
              {destinoCompra?.descricao || 'Redireciona para o modulo de compras com a obra selecionada.'}
            </p>
          </div>

          <label className="flex items-start gap-3 rounded border border-[var(--c-border)] p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={automacaoAtiva}
              disabled={!tipoSelecionadoId || !destinoCompra}
              onChange={(event) => atualizarRegra(event.target.checked)}
            />
            <span>
              <span className="font-semibold text-[var(--c-text)]">
                Redirecionar este tipo para Solicitação de Compra
              </span>
              <span className="mt-1 block text-xs text-[var(--c-muted)]">
                Quando o usuario selecionar obra, area e este tipo, ele sera levado para {destinoCompra?.rota || '/solicitacoes-compra/nova'}.
              </span>
            </span>
          </label>

          {automacaoAtiva && (
            <div className="rounded border border-[var(--c-border)] bg-[var(--c-surface-muted,#f8fafc)] p-3 text-sm">
              <div className="font-semibold text-[var(--c-text)]">Regra ativa</div>
              <div className="mt-1 text-[var(--c-muted)]">
                A obra selecionada sera enviada por parametro e o solicitante sera o usuario logado na tela de compra.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
