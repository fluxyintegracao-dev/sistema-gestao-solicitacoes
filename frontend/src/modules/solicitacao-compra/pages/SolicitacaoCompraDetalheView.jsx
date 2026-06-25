import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../../../components/ResizableTable';
import { baixarPdfSolicitacaoCompra, obterSolicitacaoCompra } from '../../../services/compras';
import { useSafeNavigateBack } from '../../../utils/navigation';

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

const itemTableColumns = [
  { key: 'indice', width: 64, minWidth: 56 },
  { key: 'tipo', width: 112, minWidth: 92 },
  { key: 'insumo', width: 220, minWidth: 160 },
  { key: 'unidade', width: 96, minWidth: 78 },
  { key: 'quantidade', width: 118, minWidth: 98 },
  { key: 'especificacao', width: 260, minWidth: 180 },
  { key: 'apropriacao', width: 140, minWidth: 110 },
  { key: 'necessario_para', width: 132, minWidth: 112 },
  { key: 'link', width: 280, minWidth: 140 }
];

export default function SolicitacaoCompraDetalheView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const navigateBack = useSafeNavigateBack('/solicitacoes-compra');
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
    <div className="page solicitacoes-page compra-detalhe-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Detalhe da Solicitacao de Compra</h1>
            <p className="page-subtitle">
              SC-{String(solicitacao.id).padStart(5, '0')} - dados, itens e vinculos operacionais da solicitacao.
            </p>
          </div>
          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigateBack('/solicitacoes-compra')}>
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

        <div className="compra-detalhe-summary-grid">
          <div className="compra-detalhe-summary-item">
            <span className="compra-detalhe-summary-label">Status</span>
            <strong>
              <span className={statusClass(solicitacao.status)}>{formatarStatus(solicitacao.status)}</span>
            </strong>
          </div>
          <div className="compra-detalhe-summary-item">
            <span className="compra-detalhe-summary-label">Obra</span>
            <strong>{solicitacao.obra?.nome || '-'}</strong>
            <small>{solicitacao.obra?.codigo || '-'}</small>
          </div>
          <div className="compra-detalhe-summary-item">
            <span className="compra-detalhe-summary-label">Solicitante</span>
            <strong>{solicitacao.solicitante?.nome || '-'}</strong>
          </div>
          <div className="compra-detalhe-summary-item">
            <span className="compra-detalhe-summary-label">Necessario para</span>
            <strong>{formatarData(solicitacao.necessario_para)}</strong>
          </div>
          <div className="compra-detalhe-summary-item">
            <span className="compra-detalhe-summary-label">Criada em</span>
            <strong>{formatarData(solicitacao.createdAt)}</strong>
          </div>
          <div className="compra-detalhe-summary-item">
            <span className="compra-detalhe-summary-label">Solicitacao principal</span>
            {solicitacao.solicitacaoPrincipal ? (
              <button
                type="button"
                className="compra-detalhe-link-button"
                onClick={() => navigate(`/solicitacoes/${solicitacao.solicitacaoPrincipal.id}`)}
              >
                {solicitacao.solicitacaoPrincipal.codigo || `ID ${solicitacao.solicitacaoPrincipal.id}`}
              </button>
            ) : (
              <strong>-</strong>
            )}
          </div>
          <div className="compra-detalhe-summary-item compra-detalhe-summary-wide">
            <span className="compra-detalhe-summary-label">Observacoes</span>
            <strong>{solicitacao.observacoes || '-'}</strong>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="card sol-surface-card compra-detalhe-itens-card">
          <div className="card-header flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Itens</h2>
            <span className="text-sm text-[var(--c-muted)]">{itensCombinados.length} item(ns)</span>
          </div>
          <div className="app-table-shell compra-detalhe-itens-shell overflow-x-auto">
            <ResizableTable
              columns={itemTableColumns}
              storageKey="fluxy.solicitacao-compra-detalhe.itens.columns.v1"
              className="table compra-detalhe-itens-table"
            >
              <thead>
                <tr>
                  <ResizableTh columnKey="indice">#</ResizableTh>
                  <ResizableTh columnKey="tipo">Tipo</ResizableTh>
                  <ResizableTh columnKey="insumo">Insumo</ResizableTh>
                  <ResizableTh columnKey="unidade">Unidade</ResizableTh>
                  <ResizableTh columnKey="quantidade">Quantidade</ResizableTh>
                  <ResizableTh columnKey="especificacao">Especificacao</ResizableTh>
                  <ResizableTh columnKey="apropriacao">Apropriacao</ResizableTh>
                  <ResizableTh columnKey="necessario_para">Necessario para</ResizableTh>
                  <ResizableTh columnKey="link">Link</ResizableTh>
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
                    <td>
                      {item.link_produto ? (
                        <a
                          className="compra-detalhe-link-cell"
                          href={item.link_produto}
                          target="_blank"
                          rel="noreferrer"
                          title={item.link_produto}
                        >
                          {item.link_produto}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
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

          <div className="card sol-surface-card compra-detalhe-support-card">
            <div className="card-header">
              <h2 className="font-semibold">Vinculos operacionais</h2>
            </div>
            <div className="grid gap-3 text-sm text-[var(--c-muted)]">
              <div className="rounded-xl border border-[var(--c-border)] px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.12em]">Solicitacao principal</div>
                <div className="mt-1 text-base font-semibold text-[var(--c-text)]">
                  {solicitacao.solicitacaoPrincipal?.codigo || '-'}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--c-border)] px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.12em]">PDF e cotacao</div>
                <div className="mt-1">Use os botoes do cabecalho para abrir o PDF ou gerenciar a cotacao desta compra.</div>
              </div>
            </div>
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
