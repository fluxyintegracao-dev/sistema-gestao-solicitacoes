import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  cancelarLotePrioridadeDiretoria,
  criarLotePrioridadeDiretoria,
  excluirLotePrioridadeDiretoria,
  finalizarLotePrioridadeDiretoria,
  getLotePrioridadeDiretoria,
  getPrioridadesDiretoriaContexto,
  getSolicitacoesDisponiveisPrioridadeDiretoria,
  listarLotesPrioridadeDiretoria,
  reabrirLotePrioridadeDiretoria,
  salvarRascunhoLotePrioridadeDiretoria
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

function tituloDoItem(item) {
  if (!item) return null;
  if (item.titulo) return item.titulo;
  if (item.solicitacao) return item.solicitacao;
  return item;
}

function titulosDoLote(lote) {
  return (Array.isArray(lote?.itens) ? lote.itens : [])
    .map(tituloDoItem)
    .filter(Boolean);
}

function mesclarItens(base = [], extras = []) {
  const mapa = new Map();
  [...(Array.isArray(extras) ? extras : []), ...(Array.isArray(base) ? base : [])].forEach((item) => {
    if (item?.id) mapa.set(String(item.id), item);
  });
  return Array.from(mapa.values());
}

function normalizarBusca(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function PrioridadesDiretoria() {
  const navigate = useNavigate();
  const [contexto, setContexto] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [loteDetalhe, setLoteDetalhe] = useState(null);
  const [disponiveis, setDisponiveis] = useState([]);
  const [obrasDisponiveis, setObrasDisponiveis] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [busca, setBusca] = useState('');
  const [filtroObraId, setFiltroObraId] = useState('');
  const [filtroItensLote, setFiltroItensLote] = useState('');
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
      const titulosSalvos = titulosDoLote(detalhe);
      setSelecionados(new Set(titulosSalvos.map(item => String(item.id))));

      if (detalhe?.status === 'ABERTO') {
        const params = {};
        if (busca) params.busca = busca;
        if (filtroObraId) params.obra_id = filtroObraId;
        const disponiveisData = await getSolicitacoesDisponiveisPrioridadeDiretoria(id, params);
        setObrasDisponiveis(Array.isArray(disponiveisData?.obras) ? disponiveisData.obras : []);
        setDisponiveis(mesclarItens(Array.isArray(disponiveisData?.items) ? disponiveisData.items : [], titulosSalvos));
      } else {
        setDisponiveis([]);
        setObrasDisponiveis([]);
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
    const params = {};
    if (busca) params.busca = busca;
    if (filtroObraId) params.obra_id = filtroObraId;
    const dataDisponiveis = await getSolicitacoesDisponiveisPrioridadeDiretoria(
      loteDetalhe.id,
      params
    );
    setObrasDisponiveis(Array.isArray(dataDisponiveis?.obras) ? dataDisponiveis.obras : []);
    setDisponiveis(mesclarItens(
      Array.isArray(dataDisponiveis?.items) ? dataDisponiveis.items : [],
      titulosDoLote(loteDetalhe)
    ));
  }

  function alternarTitulo(id) {
    const key = String(id);
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function abrirSolicitacao(id) {
    const solicitacaoId = Number(id);
    if (Number.isInteger(solicitacaoId) && solicitacaoId > 0) {
      navigate(`/solicitacoes/${solicitacaoId}`);
    }
  }

  const titulosExibidos = useMemo(() => (
    loteDetalhe?.status === 'ABERTO'
      ? mesclarItens(disponiveis, titulosDoLote(loteDetalhe))
      : titulosDoLote(loteDetalhe)
  ), [disponiveis, loteDetalhe]);

  const titulosVisiveis = useMemo(() => {
    const termo = normalizarBusca(filtroItensLote);
    if (!termo) return titulosExibidos;
    return titulosExibidos.filter((item) => {
      const texto = [
        item.codigo,
        item.descricao,
        item.obra?.nome,
        item.obra?.codigo,
        item.solicitacao?.codigo,
        item.solicitacao?.descricao,
        item.parceiro?.nome,
        item.status
      ].map(normalizarBusca).join(' ');
      return texto.includes(termo);
    });
  }, [titulosExibidos, filtroItensLote]);

  const selecionadas = useMemo(() => (
    titulosExibidos.filter(item => selecionados.has(String(item.id)))
  ), [titulosExibidos, selecionados]);

  const valorSelecionado = selecionadas.reduce((total, item) => total + Number(item.valor_prioridade || 0), 0);

  async function salvarSelecaoLote() {
    if (!loteDetalhe?.id) return;
    const tituloIds = Array.from(selecionados).map(Number).filter(Boolean);

    try {
      setOperando(true);
      const dataLote = await salvarRascunhoLotePrioridadeDiretoria(loteDetalhe.id, { titulo_ids: tituloIds });
      const detalhe = dataLote?.item || null;
      setLoteDetalhe(detalhe);
      const titulosSalvos = titulosDoLote(detalhe);
      setSelecionados(new Set(titulosSalvos.map(item => String(item.id))));
      setDisponiveis(mesclarItens(disponiveis, titulosSalvos));
      await recarregarLotes();
      alert('Selecao salva. Voce pode voltar depois para continuar este lote.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar selecao do lote.');
    } finally {
      setOperando(false);
    }
  }

  async function finalizarLote() {
    if (!loteDetalhe?.id) return;
    const tituloIds = Array.from(selecionados).map(Number).filter(Boolean);
    if (tituloIds.length === 0) {
      alert('Selecione ao menos um titulo.');
      return;
    }
    if (!window.confirm(`Finalizar lote com ${tituloIds.length} titulo(s)?`)) {
      return;
    }

    try {
      setOperando(true);
      const dataLote = await finalizarLotePrioridadeDiretoria(loteDetalhe.id, { titulo_ids: tituloIds });
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

  async function reabrirLote(lote) {
    if (!window.confirm('Reabrir este lote finalizado para edicao? As solicitacoes voltam como selecao salva ate a nova finalizacao.')) return;
    try {
      setOperando(true);
      const dataLote = await reabrirLotePrioridadeDiretoria(lote.id);
      const detalhe = dataLote?.item || null;
      setLoteDetalhe(detalhe);
      const titulosSalvos = titulosDoLote(detalhe);
      setSelecionados(new Set(titulosSalvos.map(item => String(item.id))));
      const params = {};
      if (busca) params.busca = busca;
      if (filtroObraId) params.obra_id = filtroObraId;
      const disponiveisData = await getSolicitacoesDisponiveisPrioridadeDiretoria(lote.id, params);
      setObrasDisponiveis(Array.isArray(disponiveisData?.obras) ? disponiveisData.obras : []);
      setDisponiveis(mesclarItens(Array.isArray(disponiveisData?.items) ? disponiveisData.items : [], titulosSalvos));
      await recarregarLotes();
      alert('Lote reaberto para edicao.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao reabrir lote.');
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
            Usuarios autorizados solicitam lotes de prioridade. A diretoria alvo autoriza quais titulos financeiros entram no lote.
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
            <p className="text-sm text-[var(--c-muted)]">Selecione um lote para visualizar os titulos.</p>
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
                  {loteDetalhe.pode_reabrir && <button type="button" className="btn btn-primary btn-sm" onClick={() => reabrirLote(loteDetalhe)} disabled={operando}>Reabrir lote</button>}
                  {loteDetalhe.pode_cancelar && <button type="button" className="btn btn-outline btn-sm" onClick={() => cancelarLote(loteDetalhe)}>Cancelar</button>}
                  {loteDetalhe.pode_excluir && <button type="button" className="btn btn-outline btn-sm" onClick={() => excluirLote(loteDetalhe)}>Excluir</button>}
                </div>
              </div>

              {loteDetalhe.status === 'ABERTO' && (
                <div className="rounded-2xl border border-[var(--c-border)] p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto_auto_auto] gap-2 md:items-end">
                    <label className="form-field flex-1">
                      <span className="form-label">Buscar titulo elegivel</span>
                      <input className="input" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Titulo, obra, credor ou solicitacao" />
                    </label>
                    <label className="form-field">
                      <span className="form-label">Obra</span>
                      <select className="input" value={filtroObraId} onChange={event => setFiltroObraId(event.target.value)}>
                        <option value="">Todas as obras</option>
                        {obrasDisponiveis.map((obra) => (
                          <option key={obra.id} value={obra.id}>
                            {obra.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="btn btn-outline" onClick={buscarDisponiveis}>Buscar</button>
                    {loteDetalhe.pode_salvar && (
                      <button type="button" className="btn btn-outline" onClick={salvarSelecaoLote} disabled={operando}>
                        Salvar selecao
                      </button>
                    )}
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

              <div className="rounded-2xl border border-[var(--c-border)] p-4">
                <label className="form-field">
                  <span className="form-label">Filtrar titulos do lote</span>
                  <input
                    className="input"
                    value={filtroItensLote}
                    onChange={event => setFiltroItensLote(event.target.value)}
                    placeholder="Titulo, obra, credor, solicitacao ou status"
                  />
                </label>
              </div>

              <div className="app-dense-table-wrapper">
                <table className="app-dense-data-table prioridade-titulos-table">
                  <colgroup>
                    {loteDetalhe.status === 'ABERTO' && <col className="app-dense-col-check" />}
                    <col className="app-dense-col-title" />
                    <col className="app-dense-col-title" />
                    <col className="app-dense-col-medium" />
                    <col className="app-dense-col-date" />
                    <col className="app-dense-col-money" />
                    <col className="app-dense-col-status" />
                  </colgroup>
                  <thead>
                    <tr>
                      {loteDetalhe.status === 'ABERTO' && <th className="w-10"></th>}
                      <th>Titulo</th>
                      <th>Solicitacao</th>
                      <th>Obra</th>
                      <th>Vencimento</th>
                      <th className="text-right">Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {titulosVisiveis.map(item => (
                      <tr
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => item.solicitacao?.id && abrirSolicitacao(item.solicitacao.id)}
                      >
                        {loteDetalhe.status === 'ABERTO' && (
                          <td>
                            <input
                              type="checkbox"
                              checked={selecionados.has(String(item.id))}
                              onClick={event => event.stopPropagation()}
                              onChange={() => alternarTitulo(item.id)}
                            />
                          </td>
                        )}
                        <td>
                          <span className="font-semibold text-[var(--c-primary)]">
                            {item.codigo || `#${item.id}`}
                          </span>
                          <p className="text-xs text-[var(--c-muted)]">{item.parceiro?.nome || item.descricao || '-'}</p>
                        </td>
                        <td>
                          {item.solicitacao ? (
                            <>
                              <span className="font-semibold">{item.solicitacao.codigo || `#${item.solicitacao.id}`}</span>
                              <p className="text-xs text-[var(--c-muted)]">{item.solicitacao.tipo?.nome || item.solicitacao.descricao || '-'}</p>
                            </>
                          ) : (
                            <span className="text-[var(--c-muted)]">Sem solicitacao</span>
                          )}
                        </td>
                        <td>{item.obra?.nome || '-'}</td>
                        <td>{data(item.data_vencimento)}</td>
                        <td className="text-right font-semibold">{moeda(item.valor_prioridade)}</td>
                        <td>
                          <span className="badge badge-neutral">
                            {item.status || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {titulosVisiveis.length === 0 && (
                      <tr>
                        <td colSpan={loteDetalhe.status === 'ABERTO' ? 7 : 6} className="text-center text-[var(--c-muted)] py-8">
                          Nenhum titulo encontrado para este lote.
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
