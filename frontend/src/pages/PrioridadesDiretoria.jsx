import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

function moeda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '-';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function data(valor) {
  if (!valor) return '-';
  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
}

function statusClass(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'FINALIZADO') return 'badge badge-success';
  if (value === 'CANCELADO') return 'badge badge-danger';
  return 'badge badge-warning';
}

export default function PrioridadesDiretoria() {
  const [contexto, setContexto] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [loteDetalhe, setLoteDetalhe] = useState(null);
  const [disponiveis, setDisponiveis] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [operando, setOperando] = useState(false);
  const [form, setForm] = useState({
    classificacao_alvo: '',
    valor_disponivel: '',
    observacao: ''
  });

  const diretoriasDisponiveis = contexto?.diretorias_disponiveis || [];
  const podeSolicitarLote = Boolean(contexto?.permissoes?.pode_solicitar_lote);

  useEffect(() => {
    async function carregarBase() {
      try {
        setLoading(true);
        const [ctx, lotesData] = await Promise.all([
          getPrioridadesDiretoriaContexto(),
          listarLotesPrioridadeDiretoria()
        ]);
        setContexto(ctx);
        setLotes(Array.isArray(lotesData?.items) ? lotesData.items : []);
        const primeira = Array.isArray(ctx?.diretorias_disponiveis) ? ctx.diretorias_disponiveis[0] : null;
        if (primeira) {
          setForm(prev => ({ ...prev, classificacao_alvo: primeira.classificacao }));
        }
      } catch (error) {
        console.error(error);
        alert(error?.message || 'Erro ao carregar prioridades da diretoria.');
      } finally {
        setLoading(false);
      }
    }

    carregarBase();
  }, []);

  async function recarregarLotes(filtro = statusFiltro) {
    const data = await listarLotesPrioridadeDiretoria(filtro ? { status: filtro } : {});
    setLotes(Array.isArray(data?.items) ? data.items : []);
  }

  async function criarLote() {
    const valor = Number(form.valor_disponivel);
    if (!form.classificacao_alvo) {
      alert('Selecione a diretoria alvo.');
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      alert('Informe um valor disponivel valido.');
      return;
    }

    try {
      setOperando(true);
      await criarLotePrioridadeDiretoria({
        classificacao_alvo: form.classificacao_alvo,
        valor_disponivel: valor,
        observacao: form.observacao
      });
      setForm(prev => ({ ...prev, valor_disponivel: '', observacao: '' }));
      await recarregarLotes();
      alert('Lote criado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao criar lote.');
    } finally {
      setOperando(false);
    }
  }

  async function abrirLote(id) {
    try {
      setOperando(true);
      const detalheData = await getLotePrioridadeDiretoria(id);
      const detalhe = detalheData?.item || null;
      setLoteDetalhe(detalhe);
      setSelecionados(new Set());

      if (detalhe?.status === 'ABERTO') {
        const disponiveisData = await getSolicitacoesDisponiveisPrioridadeDiretoria(id, busca ? { busca } : {});
        setDisponiveis(Array.isArray(disponiveisData?.items) ? disponiveisData.items : []);
      } else {
        setDisponiveis([]);
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao abrir lote.');
    } finally {
      setOperando(false);
    }
  }

  async function buscarDisponiveis() {
    if (!loteDetalhe?.id) return;
    const dataDisponiveis = await getSolicitacoesDisponiveisPrioridadeDiretoria(
      loteDetalhe.id,
      busca ? { busca } : {}
    );
    setDisponiveis(Array.isArray(dataDisponiveis?.items) ? dataDisponiveis.items : []);
  }

  function alternarSolicitacao(id) {
    const key = String(id);
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const selecionadas = useMemo(() => (
    disponiveis.filter(item => selecionados.has(String(item.id)))
  ), [disponiveis, selecionados]);

  const valorSelecionado = selecionadas.reduce((total, item) => total + Number(item.valor_prioridade || 0), 0);

  async function finalizarLote() {
    if (!loteDetalhe?.id) return;
    const solicitacaoIds = Array.from(selecionados).map(Number).filter(Boolean);
    if (solicitacaoIds.length === 0) {
      alert('Selecione ao menos uma solicitacao.');
      return;
    }
    if (!window.confirm(`Finalizar lote com ${solicitacaoIds.length} solicitacao(oes)?`)) {
      return;
    }

    try {
      setOperando(true);
      const dataLote = await finalizarLotePrioridadeDiretoria(loteDetalhe.id, { solicitacao_ids: solicitacaoIds });
      setLoteDetalhe(dataLote?.item || null);
      setDisponiveis([]);
      setSelecionados(new Set());
      await recarregarLotes();
      alert('Lote finalizado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao finalizar lote.');
    } finally {
      setOperando(false);
    }
  }

  async function cancelarLote(lote) {
    if (!window.confirm('Cancelar este lote de prioridade?')) return;
    try {
      setOperando(true);
      await cancelarLotePrioridadeDiretoria(lote.id);
      if (loteDetalhe?.id === lote.id) setLoteDetalhe(null);
      await recarregarLotes();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao cancelar lote.');
    } finally {
      setOperando(false);
    }
  }

  async function excluirLote(lote) {
    if (!window.confirm('Excluir este lote? Esta acao nao podera ser desfeita.')) return;
    try {
      setOperando(true);
      await excluirLotePrioridadeDiretoria(lote.id);
      if (loteDetalhe?.id === lote.id) setLoteDetalhe(null);
      await recarregarLotes();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao excluir lote.');
    } finally {
      setOperando(false);
    }
  }

  async function trocarStatusFiltro(valor) {
    setStatusFiltro(valor);
    try {
      setOperando(true);
      await recarregarLotes(valor);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao filtrar lotes.');
    } finally {
      setOperando(false);
    }
  }

  if (loading) return <p>Carregando prioridades...</p>;

  return (
    <div className="page max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Prioridades Diretoria</h1>
          <p className="page-subtitle">
            DIR_ADMIN solicita lotes de prioridade. A diretoria alvo autoriza quais solicitacoes entram no lote.
          </p>
        </div>
        <select className="input w-full md:w-56" value={statusFiltro} onChange={event => trocarStatusFiltro(event.target.value)}>
          <option value="">Todos os status</option>
          <option value="ABERTO">Abertos</option>
          <option value="FINALIZADO">Finalizados</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
      </div>

      {podeSolicitarLote && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Solicitar lote</h2>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_1fr_auto] gap-3 items-end">
            <label className="form-field">
              <span className="form-label">Diretoria alvo</span>
              <select className="input" value={form.classificacao_alvo} onChange={event => setForm(prev => ({ ...prev, classificacao_alvo: event.target.value }))}>
                <option value="">Selecione</option>
                {diretoriasDisponiveis.map(item => (
                  <option key={item.classificacao} value={item.classificacao}>
                    {item.classificacao} - {item.diretoria_label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-label">Valor disponivel</span>
              <input className="input" type="number" step="0.01" min="0" value={form.valor_disponivel} onChange={event => setForm(prev => ({ ...prev, valor_disponivel: event.target.value }))} />
            </label>
            <label className="form-field">
              <span className="form-label">Observacao</span>
              <input className="input" value={form.observacao} onChange={event => setForm(prev => ({ ...prev, observacao: event.target.value }))} />
            </label>
            <button type="button" className="btn btn-primary" onClick={criarLote} disabled={operando}>Criar lote</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Lotes</h2>
          <div className="space-y-2">
            {lotes.map(lote => (
              <button key={lote.id} type="button" className={`w-full rounded-2xl border p-4 text-left transition ${loteDetalhe?.id === lote.id ? 'border-[var(--c-primary)] bg-[var(--c-primary-soft)]' : 'border-[var(--c-border)] bg-[var(--c-card)]'}`} onClick={() => abrirLote(lote.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--c-text)]">Lote #{lote.id} - {lote.classificacao_alvo}</p>
                    <p className="text-xs text-[var(--c-muted)]">{lote.diretoria_alvo_codigo} | {data(lote.createdAt)}</p>
                  </div>
                  <span className={statusClass(lote.status)}>{lote.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--c-muted)]">
                  <span>Limite<br /><strong>{moeda(lote.valor_disponivel)}</strong></span>
                  <span>Usado<br /><strong>{moeda(lote.valor_utilizado)}</strong></span>
                  <span>Itens<br /><strong>{lote.itens_count || 0}</strong></span>
                </div>
              </button>
            ))}
            {lotes.length === 0 && <p className="text-sm text-[var(--c-muted)]">Nenhum lote encontrado.</p>}
          </div>
        </div>

        <div className="card space-y-4">
          {!loteDetalhe ? (
            <p className="text-sm text-[var(--c-muted)]">Selecione um lote para visualizar as solicitacoes.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--c-text)]">Lote #{loteDetalhe.id}</h2>
                  <p className="text-sm text-[var(--c-muted)]">
                    {loteDetalhe.classificacao_alvo} - {loteDetalhe.diretoria_alvo_codigo} | Saldo {moeda(loteDetalhe.saldo_disponivel)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {loteDetalhe.pode_cancelar && <button type="button" className="btn btn-outline btn-sm" onClick={() => cancelarLote(loteDetalhe)}>Cancelar</button>}
                  {loteDetalhe.pode_excluir && <button type="button" className="btn btn-outline btn-sm" onClick={() => excluirLote(loteDetalhe)}>Excluir</button>}
                </div>
              </div>

              {loteDetalhe.status === 'ABERTO' && (
                <div className="rounded-2xl border border-[var(--c-border)] p-4 space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end">
                    <label className="form-field flex-1">
                      <span className="form-label">Buscar solicitacao elegivel</span>
                      <input className="input" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Codigo, obra, descricao ou tipo" />
                    </label>
                    <button type="button" className="btn btn-outline" onClick={buscarDisponiveis}>Buscar</button>
                    {loteDetalhe.pode_finalizar && (
                      <button type="button" className="btn btn-primary" onClick={finalizarLote} disabled={operando}>
                        Finalizar selecionadas
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[var(--c-muted)]">
                    Selecionadas: <strong>{selecionados.size}</strong> | Valor: <strong>{moeda(valorSelecionado)}</strong>
                  </p>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-[var(--c-border)]">
                <table className="table table-sm min-w-full">
                  <thead>
                    <tr>
                      {loteDetalhe.status === 'ABERTO' && <th className="w-10"></th>}
                      <th>Solicitacao</th>
                      <th>Obra</th>
                      <th>Vencimento</th>
                      <th className="text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loteDetalhe.status === 'ABERTO' ? disponiveis : (loteDetalhe.itens || []).map(item => item.solicitacao).filter(Boolean)).map(item => (
                      <tr key={item.id}>
                        {loteDetalhe.status === 'ABERTO' && (
                          <td>
                            <input type="checkbox" checked={selecionados.has(String(item.id))} onChange={() => alternarSolicitacao(item.id)} />
                          </td>
                        )}
                        <td>
                          <Link className="font-semibold text-[var(--c-primary)]" to={`/solicitacoes/${item.id}`}>
                            {item.codigo || `#${item.id}`}
                          </Link>
                          <p className="text-xs text-[var(--c-muted)]">{item.tipo?.nome || '-'}</p>
                        </td>
                        <td>{item.obra?.nome || '-'}</td>
                        <td>{data(item.data_vencimento)}</td>
                        <td className="text-right font-semibold">{moeda(item.valor_prioridade)}</td>
                      </tr>
                    ))}
                    {(loteDetalhe.status === 'ABERTO' ? disponiveis.length === 0 : !loteDetalhe.itens?.length) && (
                      <tr>
                        <td colSpan={loteDetalhe.status === 'ABERTO' ? 5 : 4} className="text-center text-[var(--c-muted)] py-8">
                          Nenhuma solicitacao encontrada para este lote.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
