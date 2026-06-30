import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { delegarSolicitacaoCompra, listarSolicitacoesCompra } from '../../../services/compras';
import { API_URL, authHeaders } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { canManageComprasDelegacao } from '../../../utils/acessoProduto';
import { formatarDataLocalPtBr, parseDateSmart } from '../../../utils/dateLocal';

function formatDate(value) {
  return formatarDataLocalPtBr(value);
}

function getPrazoInfo(solicitacao) {
  if (!solicitacao?.prazo_compra) {
    return { label: 'Sem prazo', className: 'app-status-pill bg-slate-100 text-slate-700', atrasado: false };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazo = parseDateSmart(solicitacao.prazo_compra);
  if (!prazo) {
    return { label: 'Sem prazo', className: 'app-status-pill bg-slate-100 text-slate-700', atrasado: false };
  }
  prazo.setHours(0, 0, 0, 0);
  const atrasado = prazo.getTime() < hoje.getTime();

  return atrasado
    ? { label: `Atrasado desde ${formatDate(solicitacao.prazo_compra)}`, className: 'app-status-pill bg-red-100 text-red-700', atrasado: true }
    : { label: `Prazo ${formatDate(solicitacao.prazo_compra)}`, className: 'app-status-pill bg-emerald-100 text-emerald-700', atrasado: false };
}

function isCompraAberta(status) {
  const normalized = String(status || '').toUpperCase();
  return !['ENCERRADA', 'RECUSADA', 'CANCELADA'].includes(normalized);
}

async function listarUsuariosParaDelegacao() {
  const res = await fetch(`${API_URL}/usuarios-lista`, {
    headers: authHeaders()
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Erro ao carregar usuarios para delegacao');
  }
  return Array.isArray(data) ? data : [];
}

export default function ComprasDelegacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const podeGerenciarDelegacao = canManageComprasDelegacao(user);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [edicoes, setEdicoes] = useState({});
  const [salvandoId, setSalvandoId] = useState(null);

  async function carregar() {
    try {
      setLoading(true);
      const [dataSolicitacoes, dataUsuarios] = await Promise.all([
        listarSolicitacoesCompra({ contexto: 'delegacao' }),
        listarUsuariosParaDelegacao()
      ]);
      const listaSolicitacoes = Array.isArray(dataSolicitacoes) ? dataSolicitacoes : [];
      setSolicitacoes(
        podeGerenciarDelegacao
          ? listaSolicitacoes
          : listaSolicitacoes.filter((solicitacao) => (
            Number(solicitacao.comprador_responsavel_id) === Number(user?.id)
          ))
      );
      setUsuarios((Array.isArray(dataUsuarios) ? dataUsuarios : []).filter((usuario) => usuario.ativo !== false));
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar painel de delegacao de compras');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [podeGerenciarDelegacao, user?.id]);

  const solicitacoesFiltradas = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    return solicitacoes
      .filter((solicitacao) => isCompraAberta(solicitacao.status))
      .filter((solicitacao) => {
        if (!termo) return true;
        return [
          `SC-${String(solicitacao.id).padStart(5, '0')}`,
          solicitacao.obra?.nome,
          solicitacao.solicitante?.nome,
          solicitacao.compradorResponsavel?.nome,
          solicitacao.status
        ].some((value) => String(value || '').toLowerCase().includes(termo));
      });
  }, [filtro, solicitacoes]);

  const resumo = useMemo(() => {
    return solicitacoesFiltradas.reduce(
      (acc, solicitacao) => {
        acc.total += 1;
        if (solicitacao.comprador_responsavel_id) acc.atribuidas += 1;
        if (getPrazoInfo(solicitacao).atrasado) acc.atrasadas += 1;
        return acc;
      },
      { total: 0, atribuidas: 0, atrasadas: 0 }
    );
  }, [solicitacoesFiltradas]);

  function getEdicao(solicitacao) {
    return edicoes[solicitacao.id] || {
      responsavel_id: solicitacao.comprador_responsavel_id || '',
      prazo_compra: solicitacao.prazo_compra || '',
      motivo_atraso: solicitacao.motivo_atraso || ''
    };
  }

  function updateEdicao(id, changes) {
    setEdicoes((atuais) => ({
      ...atuais,
      [id]: {
        ...(atuais[id] || {}),
        ...changes
      }
    }));
  }

  function abrirSolicitacao(event, solicitacao) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (salvandoId === solicitacao.id) {
      return;
    }

    navigate(`/solicitacoes-compra/${solicitacao.id}`);
  }

  async function salvarDelegacao(event, solicitacao) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (salvandoId === solicitacao.id) {
      return;
    }

    const payload = getEdicao(solicitacao);
    const prazoInfo = getPrazoInfo({ ...solicitacao, prazo_compra: payload.prazo_compra });

    if (prazoInfo.atrasado && !String(payload.motivo_atraso || '').trim()) {
      alert('Informe o motivo do atraso antes de salvar uma delegacao vencida.');
      return;
    }

    try {
      setSalvandoId(solicitacao.id);
      await delegarSolicitacaoCompra(
        solicitacao.id,
        podeGerenciarDelegacao
          ? payload
          : { motivo_atraso: payload.motivo_atraso }
      );
      await carregar();
      alert(podeGerenciarDelegacao ? 'Delegacao atualizada.' : 'Motivo do atraso registrado.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar delegacao');
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Delegacao de Compras</h1>
            <p className="page-subtitle">
              Acompanhe responsavel, prazo, status e motivo de atraso das solicitacoes de compra abertas.
            </p>
          </div>
          <button type="button" className="btn btn-outline" onClick={carregar} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      <div className="mt-4 app-summary-grid">
        <div className="app-summary-card">
          <span className="app-summary-label">Abertas</span>
          <strong className="app-summary-value">{resumo.total}</strong>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Atribuidas</span>
          <strong className="app-summary-value">{resumo.atribuidas}</strong>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Atrasadas</span>
          <strong className="app-summary-value">{resumo.atrasadas}</strong>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card solicitacoes-filtros app-filters-card">
        <label className="app-filter-field">
          <span className="app-filter-label">Buscar</span>
          <input
            className="input"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            placeholder="Solicitacao, obra, responsavel, solicitante ou status"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {solicitacoesFiltradas.map((solicitacao) => {
          const edicao = getEdicao(solicitacao);
          const prazoInfo = getPrazoInfo({ ...solicitacao, prazo_compra: edicao.prazo_compra });

          return (
            <div key={solicitacao.id} className="card sol-surface-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--c-text)]">
                    SC-{String(solicitacao.id).padStart(5, '0')}
                  </h2>
                  <p className="text-sm text-[var(--c-muted)]">
                    {solicitacao.obra?.nome || 'Sem obra'} · {solicitacao.solicitante?.nome || 'Sem solicitante'}
                  </p>
                </div>
                <span className={prazoInfo.className}>{prazoInfo.label}</span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Responsavel
                  <select
                    className="input"
                    value={edicao.responsavel_id}
                    onChange={(event) => updateEdicao(solicitacao.id, { responsavel_id: event.target.value })}
                    disabled={!podeGerenciarDelegacao}
                  >
                    <option value="">Sem responsavel</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome} {usuario.setor ? `- ${usuario.setor}` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Prazo para finalizar pedido
                  <input
                    className="input"
                    type="date"
                    value={edicao.prazo_compra || ''}
                    onChange={(event) => updateEdicao(solicitacao.id, { prazo_compra: event.target.value })}
                    disabled={!podeGerenciarDelegacao}
                  />
                </label>
              </div>

              {prazoInfo.atrasado ? (
                <label className="mt-3 grid gap-2 text-sm font-medium">
                  Motivo do atraso
                  <textarea
                    className="input min-h-[90px]"
                    value={edicao.motivo_atraso || ''}
                    onChange={(event) => updateEdicao(solicitacao.id, { motivo_atraso: event.target.value })}
                    placeholder="Explique o motivo do atraso antes de salvar."
                  />
                </label>
              ) : null}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={(event) => abrirSolicitacao(event, solicitacao)}
                  disabled={salvandoId === solicitacao.id}
                >
                  Abrir
                </button>
                {podeGerenciarDelegacao || prazoInfo.atrasado ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(event) => salvarDelegacao(event, solicitacao)}
                    disabled={salvandoId === solicitacao.id}
                  >
                    {salvandoId === solicitacao.id
                      ? 'Salvando...'
                      : (podeGerenciarDelegacao ? 'Salvar delegacao' : 'Salvar motivo')}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {!loading && solicitacoesFiltradas.length === 0 ? (
          <div className="app-empty-card xl:col-span-2">Nenhuma solicitacao de compra aberta encontrada.</div>
        ) : null}
      </div>
    </div>
  );
}
