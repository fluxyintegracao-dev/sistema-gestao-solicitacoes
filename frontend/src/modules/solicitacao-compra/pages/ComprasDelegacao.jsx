import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  delegarSolicitacaoCompra,
  listarSolicitacoesCompra,
  listarUsuariosDelegacaoCompras
} from '../../../services/compras';
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

function normalizeStatus(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function isCompraAberta(status) {
  const normalized = normalizeStatus(status);
  return !['ENCERRADA', 'ENCERRADO', 'RECUSADA', 'CANCELADA'].includes(normalized);
}

function isPedidoCancelado(pedido) {
  return normalizeStatus(pedido?.status) === 'CANCELADO';
}

function isPedidoFechadoComFornecedor(pedido) {
  const normalized = normalizeStatus(pedido?.status);
  return (
    normalized === 'FECHADO_FORNECEDOR' ||
    (normalized.includes('FECHADO') && normalized.includes('FORNECEDOR'))
  );
}

function isCompraOcultaDelegacaoPorPedidos(solicitacao) {
  if (normalizeStatus(solicitacao?.status) === 'FECHAMENTO_PARCIAL') {
    return false;
  }
  const pedidos = Array.isArray(solicitacao?.pedidos) ? solicitacao.pedidos : [];
  const ativos = pedidos.filter((pedido) => !isPedidoCancelado(pedido));
  return ativos.length > 0 && ativos.every(isPedidoFechadoComFornecedor);
}

function renderMotivoRegistrado(label, motivo) {
  if (!String(motivo || '').trim()) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[var(--c-text)]">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--c-muted)]">
        {label}
      </span>
      <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{motivo}</p>
    </div>
  );
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
        podeGerenciarDelegacao ? listarUsuariosDelegacaoCompras() : Promise.resolve([])
      ]);
      const listaSolicitacoes = Array.isArray(dataSolicitacoes) ? dataSolicitacoes : [];
      setSolicitacoes(
        podeGerenciarDelegacao
          ? listaSolicitacoes
          : listaSolicitacoes.filter((solicitacao) => (
            Number(solicitacao.comprador_responsavel_id) === Number(user?.id)
          ))
      );
      setUsuarios(Array.isArray(dataUsuarios) ? dataUsuarios : []);
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
      .filter((solicitacao) => !isCompraOcultaDelegacaoPorPedidos(solicitacao))
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
    return {
      responsavel_id: solicitacao.comprador_responsavel_id || '',
      prazo_compra: solicitacao.prazo_compra || '',
      motivo_atraso: solicitacao.motivo_atraso || '',
      motivo_delegacao_vencida: solicitacao.motivo_delegacao_vencida || '',
      ...(edicoes[solicitacao.id] || {})
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
    const motivoObrigatorio = podeGerenciarDelegacao
      ? payload.motivo_delegacao_vencida
      : payload.motivo_atraso;

    if (
      podeGerenciarDelegacao
      && String(payload.responsavel_id || '').trim()
      && !usuarios.some((usuario) => Number(usuario.id) === Number(payload.responsavel_id))
    ) {
      alert('Selecione um usuario ativo vinculado ao setor de Compras ou remova o responsavel atual.');
      return;
    }

    if (prazoInfo.atrasado && !String(motivoObrigatorio || '').trim()) {
      alert(podeGerenciarDelegacao
        ? 'Informe o motivo para delegar com prazo ja vencido.'
        : 'Informe o motivo do atraso antes de salvar.');
      return;
    }

    try {
      setSalvandoId(solicitacao.id);
      await delegarSolicitacaoCompra(
        solicitacao.id,
        podeGerenciarDelegacao
          ? {
            responsavel_id: payload.responsavel_id,
            prazo_compra: payload.prazo_compra,
            motivo_delegacao_vencida: payload.motivo_delegacao_vencida
          }
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
          const responsavelSelecionadoId = Number(edicao.responsavel_id || 0);
          const responsavelSelecionadoElegivel = usuarios.some(
            (usuario) => Number(usuario.id) === responsavelSelecionadoId
          );
          const responsavelNaoListado = responsavelSelecionadoId > 0 && !responsavelSelecionadoElegivel;
          const responsavelForaCompras = podeGerenciarDelegacao && responsavelNaoListado;
          const responsavelForaComprasNome = solicitacao.compradorResponsavel?.nome
            || `Usuario #${responsavelSelecionadoId}`;

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
                    {responsavelNaoListado ? (
                      <option value={responsavelSelecionadoId} disabled>
                        {responsavelForaComprasNome}
                        {responsavelForaCompras ? ' - fora do setor de Compras (atribuicao anterior)' : ''}
                      </option>
                    ) : null}
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome} {usuario.setor ? `- ${usuario.setor}` : ''}
                      </option>
                    ))}
                  </select>
                  {responsavelForaCompras && podeGerenciarDelegacao ? (
                    <span className="text-xs font-normal text-amber-700">
                      A atribuicao anterior foi preservada. Selecione um usuario de Compras ou remova o responsavel antes de salvar.
                    </span>
                  ) : null}
                  {podeGerenciarDelegacao && !responsavelForaCompras ? (
                    <span className="text-xs font-normal text-[var(--c-muted)]">
                      Somente usuarios ativos vinculados ao setor de Compras.
                    </span>
                  ) : null}
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

              {(solicitacao.motivo_delegacao_vencida || solicitacao.motivo_atraso) ? (
                <div className="mt-3 grid gap-2">
                  {renderMotivoRegistrado(
                    'Motivo da delegacao com prazo vencido',
                    solicitacao.motivo_delegacao_vencida
                  )}
                  {renderMotivoRegistrado(
                    'Motivo informado pelo responsavel',
                    solicitacao.motivo_atraso
                  )}
                </div>
              ) : null}

              {prazoInfo.atrasado ? (
                <label className="mt-3 grid gap-2 text-sm font-medium">
                  {podeGerenciarDelegacao ? 'Motivo para delegar com prazo vencido' : 'Motivo do atraso'}
                  <textarea
                    className="input min-h-[90px]"
                    value={podeGerenciarDelegacao
                      ? (edicao.motivo_delegacao_vencida || '')
                      : (edicao.motivo_atraso || '')}
                    onChange={(event) => updateEdicao(
                      solicitacao.id,
                      podeGerenciarDelegacao
                        ? { motivo_delegacao_vencida: event.target.value }
                        : { motivo_atraso: event.target.value }
                    )}
                    placeholder={podeGerenciarDelegacao
                      ? 'Explique por que esta solicitacao esta sendo delegada com prazo ja vencido.'
                      : 'Explique o motivo do atraso antes de salvar.'}
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
