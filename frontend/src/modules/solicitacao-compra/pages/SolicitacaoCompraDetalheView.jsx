import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { baixarPdfSolicitacaoCompra, obterSolicitacaoCompra } from '../../../services/compras';

function formatarData(data) {
  if (!data) return '-';
  const raw = String(data);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const valor = new Date(data);
  return Number.isNaN(valor.getTime()) ? '-' : valor.toLocaleDateString('pt-BR');
}

function formatarStatus(status) {
  return String(status || '-').replace(/_/g, ' ').toUpperCase();
}

function statusClass(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'ENCERRADO') return 'app-status-pill bg-slate-100 text-slate-700';
  if (value === 'AGUARDANDO_DIRETORIA') return 'app-status-pill bg-amber-100 text-amber-700';
  return 'app-status-pill bg-blue-100 text-blue-700';
}

function statusCotacaoClass(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'RESPONDIDO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (value === 'VISUALIZADO') return 'app-status-pill bg-amber-100 text-amber-700';
  if (value === 'CANCELADO') return 'app-status-pill bg-slate-100 text-slate-700';
  return 'app-status-pill bg-blue-100 text-blue-700';
}

export default function SolicitacaoCompraDetalheView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [solicitacao, setSolicitacao] = useState(null);
  const [loading, setLoading] = useState(false);
  const [baixando, setBaixando] = useState(false);

  async function carregar() {
    try {
      setLoading(true);
      const data = await obterSolicitacaoCompra(id);
      setSolicitacao(data || null);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar solicitacao de compra');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [id]);

  const itensCombinados = useMemo(() => {
    const itens = (solicitacao?.itens || []).map((item) => ({
      tipo: 'CADASTRADO',
      nome: item.insumo?.nome || '-',
      unidade: item.unidade?.sigla || '-',
      quantidade: item.quantidade,
      especificacao: item.especificacao || '-',
      apropriacao: item.apropriacao?.codigo || '-',
      necessario_para: item.necessario_para,
      link_produto: item.link_produto || ''
    }));

    const manuais = (solicitacao?.itensManuais || []).map((item) => ({
      tipo: 'MANUAL',
      nome: item.nome_manual || '-',
      unidade: item.unidade_sigla_manual || '-',
      quantidade: item.quantidade,
      especificacao: item.especificacao || '-',
      apropriacao: item.apropriacao?.codigo || '-',
      necessario_para: item.necessario_para,
      link_produto: item.link_produto || ''
    }));

    return [...itens, ...manuais];
  }, [solicitacao]);

  const resumoCotacao = useMemo(() => {
    const fornecedores = Array.isArray(solicitacao?.fornecedores) ? solicitacao.fornecedores : [];
    return {
      total: fornecedores.length,
      respondidos: fornecedores.filter((item) => String(item.status || '').toUpperCase() === 'RESPONDIDO').length,
      visualizados: fornecedores.filter((item) => String(item.status || '').toUpperCase() === 'VISUALIZADO').length,
      enviados: fornecedores.filter((item) => String(item.status || '').toUpperCase() === 'ENVIADO').length
    };
  }, [solicitacao]);

  async function handleAbrirPdf() {
    try {
      setBaixando(true);
      const blob = await baixarPdfSolicitacaoCompra(id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao abrir PDF');
    } finally {
      setBaixando(false);
    }
  }

  if (loading) {
    return (
      <div className="page solicitacoes-page">
        <div className="app-empty-card sol-surface-card">Carregando...</div>
      </div>
    );
  }

  if (!solicitacao) {
    return (
      <div className="page solicitacoes-page">
        <div className="app-empty-card sol-surface-card">Solicitacao de compra nao encontrada.</div>
      </div>
    );
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Detalhe da Solicitacao de Compra</h1>
            <p className="page-subtitle">
              SC-{String(solicitacao.id).padStart(5, '0')} - dados, itens e vinculos operacionais da solicitacao.
            </p>
          </div>
          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/solicitacoes-compra')}>
              Voltar
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(`/solicitacoes-compra/${id}/cotacao`)}>
              Gerenciar cotacao
            </button>
            <button type="button" className="btn btn-primary" onClick={handleAbrirPdf} disabled={baixando}>
              {baixando ? 'Abrindo PDF...' : 'Abrir PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <div className="card sol-surface-card">
            <div className="card-header">
              <h2 className="font-semibold">Dados gerais</h2>
            </div>
            <div className="grid gap-4 text-sm">
              <div>
                <div className="text-[var(--c-muted)]">Status</div>
                <div className="font-semibold">
                  <span className={statusClass(solicitacao.status)}>{formatarStatus(solicitacao.status)}</span>
                </div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Obra</div>
                <div className="font-semibold">{solicitacao.obra?.nome || '-'}</div>
                <div className="text-[var(--c-muted)]">{solicitacao.obra?.codigo || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Solicitante</div>
                <div className="font-semibold">{solicitacao.solicitante?.nome || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Necessario para</div>
                <div className="font-semibold">{formatarData(solicitacao.necessario_para)}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Criada em</div>
                <div className="font-semibold">{formatarData(solicitacao.createdAt)}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Solicitacao principal</div>
                {solicitacao.solicitacaoPrincipal ? (
                  <button
                    type="button"
                    className="text-left font-semibold text-blue-600 hover:underline"
                    onClick={() => navigate(`/solicitacoes/${solicitacao.solicitacaoPrincipal.id}`)}
                  >
                    {solicitacao.solicitacaoPrincipal.codigo || `ID ${solicitacao.solicitacaoPrincipal.id}`}
                  </button>
                ) : (
                  <div className="font-semibold">-</div>
                )}
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Observacoes</div>
                <div className="whitespace-pre-wrap">{solicitacao.observacoes || '-'}</div>
              </div>
            </div>
          </div>

          <div className="card sol-surface-card">
            <div className="card-header">
              <h2 className="font-semibold">Cotacao</h2>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[var(--c-border)] px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">Fornecedores</div>
                  <div className="mt-1 text-xl font-semibold text-[var(--c-text)]">{resumoCotacao.total}</div>
                </div>
                <div className="rounded-xl border border-[var(--c-border)] px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">Respondidos</div>
                  <div className="mt-1 text-xl font-semibold text-[var(--c-text)]">{resumoCotacao.respondidos}</div>
                </div>
              </div>
              <div className="text-xs text-[var(--c-muted)]">
                Enviados: {resumoCotacao.enviados} - Visualizados: {resumoCotacao.visualizados}
              </div>
              <button type="button" className="btn btn-primary w-full" onClick={() => navigate(`/solicitacoes-compra/${id}/cotacao`)}>
                Abrir gestao da cotacao
              </button>
            </div>
          </div>
        </div>

        <div className="card sol-surface-card">
          <div className="card-header flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Itens</h2>
            <span className="text-sm text-[var(--c-muted)]">{itensCombinados.length} item(ns)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tipo</th>
                  <th>Insumo</th>
                  <th>Unidade</th>
                  <th>Quantidade</th>
                  <th>Especificacao</th>
                  <th>Apropriacao</th>
                  <th>Necessario para</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {itensCombinados.map((item, index) => (
                  <tr key={`${item.tipo}-${index}`}>
                    <td>{index + 1}</td>
                    <td>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.tipo === 'MANUAL' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className={item.tipo === 'MANUAL' ? 'font-semibold text-red-700' : ''}>{item.nome}</td>
                    <td>{item.unidade}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.especificacao}</td>
                    <td>{item.apropriacao}</td>
                    <td>{formatarData(item.necessario_para)}</td>
                    <td className="max-w-[220px] break-all">{item.link_produto || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {Array.isArray(solicitacao.fornecedores) && solicitacao.fornecedores.length > 0 && (
        <div className="mt-4 card sol-surface-card">
          <div className="card-header flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Fornecedores vinculados</h2>
            <span className="text-sm text-[var(--c-muted)]">{solicitacao.fornecedores.length} cotacao(oes)</span>
          </div>
          <div className="app-table-shell overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Status</th>
                  <th>Enviado em</th>
                  <th>Respondido em</th>
                  <th>Prazo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {solicitacao.fornecedores.map((cotacao) => (
                  <tr key={cotacao.id}>
                    <td className="font-medium">{cotacao.fornecedor?.nome || '-'}</td>
                    <td><span className={statusCotacaoClass(cotacao.status)}>{formatarStatus(cotacao.status)}</span></td>
                    <td>{formatarData(cotacao.enviado_em)}</td>
                    <td>{formatarData(cotacao.respondido_em)}</td>
                    <td>{formatarData(cotacao.prazo_resposta)}</td>
                    <td className="text-right">
                      <button type="button" className="btn btn-xs btn-outline" onClick={() => navigate(`/solicitacoes-compra/${id}/cotacao`)}>
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
