import { useEffect, useMemo, useState } from 'react';
import {
  cancelarLotePrioridadeDiretoria,
  criarLotePrioridadeDiretoria,
  excluirLotePrioridadeDiretoria,
  finalizarLotePrioridadeDiretoria,
  getLotePrioridadeDiretoria,
  getPrioridadesDiretoriaContexto,
  getSolicitacoesDisponiveisPrioridadeDiretoria,
  listarLotesPrioridadeDiretoria
} from '../services/prioridadesDiretoria';

function formatarValor(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '-';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataHora(valor) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleString('pt-BR');
}

function formatarData(valor) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleDateString('pt-BR');
}

function BadgeStatus({ status }) {
  const valor = String(status || '').trim().toUpperCase();
  const classes = {
    ABERTO: 'bg-amber-100 text-amber-800 border-amber-200',
    FINALIZADO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CANCELADO: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classes[valor] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {valor || '-'}
    </span>
  );
}

export default function PrioridadesDiretoria() {
  const [contexto, setContexto] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [loteSelecionadoId, setLoteSelecionadoId] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [solicitacoesDisponiveis, setSolicitacoesDisponiveis] = useState([]);
  const [obrasDisponiveis, setObrasDisponiveis] = useState([]);
  const [selecionadasIds, setSelecionadasIds] = useState([]);
  const [selecionadasCache, setSelecionadasCache] = useState({});
  const [buscaDisponiveis, setBuscaDisponiveis] = useState('');
  const [filtroObraId, setFiltroObraId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [loadingDisponiveis, setLoadingDisponiveis] = useState(false);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [formNovoLote, setFormNovoLote] = useState({
    classificacao_alvo: '',
    valor_disponivel: '',
    observacao: ''
  });

  const diretoriasDisponiveis = contexto?.diretorias_disponiveis || [];
  const permissoes = contexto?.permissoes || {};

  useEffect(() => {
    carregarInicial();
  }, []);

  useEffect(() => {
    if (!formNovoLote.classificacao_alvo && diretoriasDisponiveis.length > 0) {
      setFormNovoLote((atual) => ({
        ...atual,
        classificacao_alvo: diretoriasDisponiveis[0].classificacao
      }));
    }
  }, [diretoriasDisponiveis, formNovoLote.classificacao_alvo]);

  useEffect(() => {
    if (!contexto?.permissoes) return;
    carregarLotes();
  }, [filtroStatus, contexto?.permissoes]);

  useEffect(() => {
    if (!loteSelecionadoId) {
      setDetalhe(null);
      setSolicitacoesDisponiveis([]);
      setObrasDisponiveis([]);
      setSelecionadasIds([]);
      setSelecionadasCache({});
      setBuscaDisponiveis('');
      setFiltroObraId('');
      return;
    }
    carregarDetalheLote(loteSelecionadoId);
  }, [loteSelecionadoId]);

  useEffect(() => {
    if (!detalhe?.id || detalhe.status !== 'ABERTO' || !detalhe.pode_finalizar) {
      setSolicitacoesDisponiveis([]);
      setObrasDisponiveis([]);
      setSelecionadasIds([]);
      setSelecionadasCache({});
      setBuscaDisponiveis('');
      setFiltroObraId('');
      return;
    }

    const timeout = setTimeout(() => {
      carregarSolicitacoesDisponiveis(detalhe.id, buscaDisponiveis, filtroObraId);
    }, 250);

    return () => clearTimeout(timeout);
  }, [detalhe?.id, detalhe?.status, detalhe?.pode_finalizar, buscaDisponiveis, filtroObraId]);

  const mapaDisponiveis = useMemo(() => {
    const mapa = new Map();
    (solicitacoesDisponiveis || []).forEach((item) => mapa.set(Number(item.id), item));
    return mapa;
  }, [solicitacoesDisponiveis]);

  const solicitacoesSelecionadas = useMemo(() => (
    selecionadasIds
      .map((id) => selecionadasCache[String(id)] || mapaDisponiveis.get(Number(id)))
      .filter(Boolean)
  ), [selecionadasIds, selecionadasCache, mapaDisponiveis]);

  const selecionadasVisiveisCount = useMemo(() => (
    solicitacoesDisponiveis.filter((item) => selecionadasIds.includes(Number(item.id))).length
  ), [solicitacoesDisponiveis, selecionadasIds]);

  const totalSelecionado = useMemo(() => (
    solicitacoesSelecionadas.reduce((total, item) => total + Number(item.valor_prioridade || 0), 0)
  ), [solicitacoesSelecionadas]);

  const resumoLote = useMemo(() => {
    const valorDisponivel = Number(detalhe?.valor_disponivel || 0);
    const valorUtilizadoBase = Number(detalhe?.valor_utilizado || 0);
    const itensBase = Number(detalhe?.itens?.length || detalhe?.itens_count || 0);
    const abertoComSelecao = detalhe?.status === 'ABERTO' && detalhe?.pode_finalizar;

    const valorUtilizadoProjetado = abertoComSelecao
      ? valorUtilizadoBase + totalSelecionado
      : valorUtilizadoBase;
    const saldoProjetado = Math.max(valorDisponivel - valorUtilizadoProjetado, 0);
    const itensProjetados = abertoComSelecao
      ? itensBase + solicitacoesSelecionadas.length
      : itensBase;

    return {
      valorDisponivel,
      valorUtilizadoBase,
      valorUtilizadoProjetado,
      saldoProjetado,
      itensBase,
      itensProjetados,
      possuiPrevia: abertoComSelecao && solicitacoesSelecionadas.length > 0
    };
  }, [
    detalhe?.valor_disponivel,
    detalhe?.valor_utilizado,
    detalhe?.itens,
    detalhe?.itens_count,
    detalhe?.status,
    detalhe?.pode_finalizar,
    solicitacoesSelecionadas.length,
    totalSelecionado
  ]);

  const excedeuLimite = resumoLote.valorUtilizadoProjetado > resumoLote.valorDisponivel;

  async function carregarInicial() {
    try {
      setLoading(true);
      const data = await getPrioridadesDiretoriaContexto();
      setContexto(data);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar modulo de prioridades');
    } finally {
      setLoading(false);
    }
  }

  async function carregarLotes() {
    try {
      const data = await listarLotesPrioridadeDiretoria(
        filtroStatus ? { status: filtroStatus } : {}
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      setLotes(items);

      setLoteSelecionadoId((atual) => {
        if (atual && items.some((item) => Number(item.id) === Number(atual))) {
          return atual;
        }
        return items[0]?.id || null;
      });
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar lotes de prioridade');
    }
  }

  async function carregarDetalheLote(id) {
    try {
      setLoadingDetalhe(true);
      const data = await getLotePrioridadeDiretoria(id);
      setDetalhe(data?.item || null);
      if (data?.item?.status !== 'ABERTO') {
        setSolicitacoesDisponiveis([]);
        setObrasDisponiveis([]);
        setSelecionadasIds([]);
        setSelecionadasCache({});
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar detalhe do lote');
    } finally {
      setLoadingDetalhe(false);
    }
  }

  async function carregarSolicitacoesDisponiveis(id, busca = '', obraId = '') {
    try {
      setLoadingDisponiveis(true);
      const params = {};
      if (busca) params.busca = busca;
      if (obraId) params.obra_id = obraId;
      const data = await getSolicitacoesDisponiveisPrioridadeDiretoria(id, params);
      const items = Array.isArray(data?.items) ? data.items : [];
      const obras = Array.isArray(data?.obras) ? data.obras : [];
      setSolicitacoesDisponiveis(items);
      setObrasDisponiveis(obras);
      setSelecionadasCache((atual) => {
        const proximo = { ...atual };
        items.forEach((item) => {
          if (selecionadasIds.includes(Number(item.id))) {
            proximo[String(item.id)] = item;
          }
        });
        return proximo;
      });
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar solicitacoes disponiveis');
    } finally {
      setLoadingDisponiveis(false);
    }
  }

  function atualizarCampoNovoLote(campo, valor) {
    setFormNovoLote((atual) => ({ ...atual, [campo]: valor }));
  }

  async function criarLote(event) {
    event.preventDefault();
    try {
      setSalvandoLote(true);
      await criarLotePrioridadeDiretoria({
        classificacao_alvo: formNovoLote.classificacao_alvo,
        valor_disponivel: Number(formNovoLote.valor_disponivel),
        observacao: formNovoLote.observacao
      });
      setFormNovoLote({
        classificacao_alvo: diretoriasDisponiveis[0]?.classificacao || '',
        valor_disponivel: '',
        observacao: ''
      });
      await carregarLotes();
      alert('Lote de prioridade criado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao criar lote de prioridade');
    } finally {
      setSalvandoLote(false);
    }
  }

  function alternarSolicitacao(id) {
    setSelecionadasIds((atual) => {
      const numeroId = Number(id);
      if (atual.includes(numeroId)) {
        setSelecionadasCache((cacheAtual) => {
          const proximo = { ...cacheAtual };
          delete proximo[String(numeroId)];
          return proximo;
        });
        return atual.filter((item) => Number(item) !== numeroId);
      }
      const itemSelecionado = mapaDisponiveis.get(numeroId);
      if (itemSelecionado) {
        setSelecionadasCache((cacheAtual) => ({
          ...cacheAtual,
          [String(numeroId)]: itemSelecionado
        }));
      }
      return [...atual, numeroId];
    });
  }

  async function finalizarLote() {
    if (!detalhe?.id || solicitacoesSelecionadas.length === 0) {
      alert('Selecione ao menos uma solicitacao.');
      return;
    }
    if (excedeuLimite) {
      alert('O total selecionado excede o valor disponivel do lote.');
      return;
    }
    if (!window.confirm(`Finalizar lote com ${solicitacoesSelecionadas.length} solicitacao(oes)?`)) {
      return;
    }

    try {
      setFinalizando(true);
      await finalizarLotePrioridadeDiretoria(detalhe.id, {
        solicitacao_ids: selecionadasIds
      });
      await carregarLotes();
      await carregarDetalheLote(detalhe.id);
      setSelecionadasIds([]);
      alert('Lote finalizado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao finalizar lote');
    } finally {
      setFinalizando(false);
    }
  }

  async function cancelarLote() {
    if (!detalhe?.id) return;
    if (!window.confirm('Cancelar este lote de prioridade?')) {
      return;
    }

    try {
      setCancelando(true);
      await cancelarLotePrioridadeDiretoria(detalhe.id);
      await carregarLotes();
      await carregarDetalheLote(detalhe.id);
      alert('Lote cancelado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao cancelar lote');
    } finally {
      setCancelando(false);
    }
  }

  async function excluirLote() {
    if (!detalhe?.id) return;
    if (!window.confirm('Excluir este lote de prioridade? Esta acao nao podera ser desfeita.')) {
      return;
    }

    try {
      setExcluindo(true);
      await excluirLotePrioridadeDiretoria(detalhe.id);
      setDetalhe(null);
      setLoteSelecionadoId(null);
      setSolicitacoesDisponiveis([]);
      setObrasDisponiveis([]);
      setSelecionadasIds([]);
      setSelecionadasCache({});
      await carregarLotes();
      alert('Lote excluido com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao excluir lote');
    } finally {
      setExcluindo(false);
    }
  }

  if (loading) {
    return <p>Carregando modulo de prioridades...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Prioridades da Diretoria</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          DIR_ADMIN solicita lotes de prioridade. Diretorias publicas e privadas autorizam solicitacoes dentro do limite aprovado.
        </p>
      </div>

      {permissoes.pode_solicitar_lote && (
        <form onSubmit={criarLote} className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-medium">Solicitar prioridade</h2>
            <span className="text-sm text-gray-500">Criacao de lote por DIR_ADMIN</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="grid gap-1 text-sm">
              Diretoria alvo
              <select
                className="input"
                value={formNovoLote.classificacao_alvo}
                onChange={(event) => atualizarCampoNovoLote('classificacao_alvo', event.target.value)}
              >
                <option value="">Selecione</option>
                {diretoriasDisponiveis.map((item) => (
                  <option key={item.classificacao} value={item.classificacao}>
                    {item.classificacao} - {item.diretoria_label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              Valor disponivel
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={formNovoLote.valor_disponivel}
                onChange={(event) => atualizarCampoNovoLote('valor_disponivel', event.target.value)}
                placeholder="0,00"
              />
            </label>

            <label className="grid gap-1 text-sm md:col-span-1">
              Observacao
              <input
                className="input"
                value={formNovoLote.observacao}
                onChange={(event) => atualizarCampoNovoLote('observacao', event.target.value)}
                placeholder="Contexto do lote"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={salvandoLote}>
              {salvandoLote ? 'Salvando...' : 'Criar lote'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-medium">Lotes</h2>
            <select
              className="input max-w-[180px]"
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="ABERTO">Abertos</option>
              <option value="FINALIZADO">Finalizados</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>

          <div className="space-y-2.5">
            {lotes.length === 0 && (
              <p className="text-sm text-gray-500">Nenhum lote encontrado.</p>
            )}

            {lotes.map((lote) => (
              <button
                key={lote.id}
                type="button"
                onClick={() => setLoteSelecionadoId(lote.id)}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  Number(loteSelecionadoId) === Number(lote.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Lote #{lote.id}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lote.classificacao_alvo} - {lote.diretoria_alvo_codigo}
                    </p>
                  </div>
                  <BadgeStatus status={lote.status} />
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-xs">
                  <div>
                    <span className="text-gray-500">Disponivel</span>
                    <p className="font-medium">{formatarValor(lote.valor_disponivel)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Utilizado</span>
                    <p className="font-medium">{formatarValor(lote.valor_utilizado)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Itens</span>
                    <p className="font-medium">{lote.itens_count || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Criado em</span>
                    <p className="font-medium">{formatarDataHora(lote.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 space-y-4 min-h-[420px]">
          {!loteSelecionadoId && <p className="text-sm text-gray-500">Selecione um lote para visualizar os detalhes.</p>}

          {loadingDetalhe && <p>Carregando lote...</p>}

          {!loadingDetalhe && detalhe && (
            <>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Lote #{detalhe.id}</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {detalhe.classificacao_alvo} - {detalhe.diretoria_alvo_codigo}
                  </p>
                  {detalhe.observacao && (
                    <p className="text-sm text-gray-700 mt-2">{detalhe.observacao}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <BadgeStatus status={detalhe.status} />
                  {detalhe.pode_excluir && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={excluirLote}
                      disabled={excluindo}
                    >
                      {excluindo ? 'Excluindo...' : 'Excluir lote'}
                    </button>
                  )}
                  {detalhe.pode_cancelar && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={cancelarLote}
                      disabled={cancelando}
                    >
                      {cancelando ? 'Cancelando...' : 'Cancelar lote'}
                    </button>
                  )}
                </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <ResumoCard label="Valor disponivel" value={formatarValor(resumoLote.valorDisponivel)} />
                <ResumoCard
                  label="Valor utilizado"
                  value={formatarValor(resumoLote.valorUtilizadoProjetado)}
                  helper={resumoLote.possuiPrevia ? `Base ${formatarValor(resumoLote.valorUtilizadoBase)} + selecao ${formatarValor(totalSelecionado)}` : null}
                  destaque={resumoLote.possuiPrevia}
                />
                <ResumoCard
                  label="Saldo"
                  value={formatarValor(resumoLote.saldoProjetado)}
                  helper={resumoLote.possuiPrevia ? 'Saldo projetado com a selecao atual' : null}
                  destaque={resumoLote.possuiPrevia}
                />
                <ResumoCard
                  label="Itens autorizados"
                  value={String(resumoLote.itensProjetados)}
                  helper={resumoLote.possuiPrevia ? `Atual ${resumoLote.itensBase} + selecao ${solicitacoesSelecionadas.length}` : null}
                />
              </div>

              {detalhe.status === 'ABERTO' && detalhe.pode_finalizar && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(220px,1.2fr)_minmax(220px,0.9fr)_minmax(240px,0.8fr)] gap-3">
                    <input
                      className="input"
                      value={buscaDisponiveis}
                      onChange={(event) => setBuscaDisponiveis(event.target.value)}
                      placeholder="Buscar por codigo, SIENGE, descricao, obra ou tipo"
                    />
                    <select
                      className="input"
                      value={filtroObraId}
                      onChange={(event) => setFiltroObraId(event.target.value)}
                    >
                      <option value="">Todas as obras</option>
                      {obrasDisponiveis.map((obra) => (
                        <option key={obra.id} value={obra.id}>
                          {obra.nome}
                        </option>
                      ))}
                    </select>
                    <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-50">
                      <span className="text-gray-600">Selecionadas:</span> <strong>{solicitacoesSelecionadas.length}</strong>
                      <span className="text-gray-400 mx-1.5">|</span>
                      <span className="text-gray-600">Total:</span> <strong>{formatarValor(totalSelecionado)}</strong>
                      {solicitacoesSelecionadas.length > selecionadasVisiveisCount && (
                        <>
                          <span className="text-gray-400 mx-1.5">|</span>
                          <span className="text-gray-600">Fora do filtro:</span> <strong>{solicitacoesSelecionadas.length - selecionadasVisiveisCount}</strong>
                        </>
                      )}
                    </div>
                  </div>

                  {excedeuLimite && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                      O total selecionado excede o limite disponivel do lote.
                    </div>
                  )}

                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2.5 w-12">Sel.</th>
                          <th className="text-left px-3 py-2.5">Codigo</th>
                          <th className="text-left px-3 py-2.5">Obra</th>
                          <th className="text-left px-3 py-2.5">Tipo</th>
                          <th className="text-left px-3 py-2.5">Vencimento</th>
                          <th className="text-right px-3 py-2.5">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingDisponiveis && (
                          <tr>
                            <td className="px-3 py-2.5" colSpan={6}>Carregando solicitacoes elegiveis...</td>
                          </tr>
                        )}

                        {!loadingDisponiveis && solicitacoesDisponiveis.length === 0 && (
                          <tr>
                            <td className="px-3 py-2.5 text-gray-500" colSpan={6}>
                              Nenhuma solicitacao elegivel encontrada para este lote.
                            </td>
                          </tr>
                        )}

                        {!loadingDisponiveis && solicitacoesDisponiveis.map((item) => {
                          const checked = selecionadasIds.includes(Number(item.id));
                          return (
                            <tr key={item.id} className="border-t">
                              <td className="px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => alternarSolicitacao(item.id)}
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-medium">{item.codigo || `#${item.id}`}</div>
                                <div className="text-xs text-gray-500">{item.numero_sienge || '-'}</div>
                              </td>
                              <td className="px-3 py-2.5">{item.obra?.nome || '-'}</td>
                              <td className="px-3 py-2.5">{item.tipo?.nome || '-'}</td>
                              <td className="px-3 py-2.5">{formatarData(item.data_vencimento)}</td>
                              <td className="px-3 py-2.5 text-right font-medium">{formatarValor(item.valor_prioridade)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={finalizarLote}
                      disabled={finalizando || solicitacoesSelecionadas.length === 0 || excedeuLimite}
                    >
                      {finalizando ? 'Finalizando...' : 'Finalizar lote'}
                    </button>
                  </div>
                </div>
              )}

              {detalhe.status === 'ABERTO' && !detalhe.pode_finalizar && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                  Este lote ainda esta aberto. Apenas a diretoria alvo ou o SUPERADMIN podem selecionar e finalizar as solicitacoes.
                </div>
              )}

              {detalhe.status !== 'ABERTO' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-medium">Solicitacoes autorizadas</h3>
                    <span className="text-sm text-gray-500">
                      Finalizado em {formatarDataHora(detalhe.finalizado_em)}
                    </span>
                  </div>

                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2.5">Codigo</th>
                          <th className="text-left px-3 py-2.5">Obra</th>
                          <th className="text-left px-3 py-2.5">Tipo</th>
                          <th className="text-left px-3 py-2.5">Autorizado em</th>
                          <th className="text-right px-3 py-2.5">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detalhe.itens || []).length === 0 && (
                          <tr>
                            <td className="px-3 py-2.5 text-gray-500" colSpan={5}>
                              Nenhuma solicitacao foi vinculada a este lote.
                            </td>
                          </tr>
                        )}

                        {(detalhe.itens || []).map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-3 py-2.5">
                              <div className="font-medium">{item.solicitacao?.codigo || `#${item.solicitacao?.id || '-'}`}</div>
                              <div className="text-xs text-gray-500">{item.solicitacao?.numero_sienge || '-'}</div>
                            </td>
                            <td className="px-3 py-2.5">{item.solicitacao?.obra?.nome || '-'}</td>
                            <td className="px-3 py-2.5">{item.solicitacao?.tipo?.nome || '-'}</td>
                            <td className="px-3 py-2.5">{formatarDataHora(item.autorizado_em)}</td>
                            <td className="px-3 py-2.5 text-right font-medium">{formatarValor(item.valor_considerado)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumoCard({ label, value, helper = null, destaque = false }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${destaque ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200 bg-gray-50'}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-base font-semibold mt-1">{value}</p>
      {helper && <p className="text-[11px] text-gray-500 mt-1 leading-4">{helper}</p>}
    </div>
  );
}
