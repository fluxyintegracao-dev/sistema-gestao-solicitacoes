import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { baixarPdfSolicitacaoCompra, listarSolicitacoesCompra } from '../../../services/compras';
import { getMinhasObras } from '../../../services/obras';

function formatarData(data) {
  if (!data) {
    return '-';
  }

  const raw = String(data);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) {
    return '-';
  }

  return valor.toLocaleDateString('pt-BR');
}

function formatarStatus(status) {
  return String(status || '-')
    .replace(/_/g, ' ')
    .toUpperCase();
}

function classNameStatus(status) {
  const valor = String(status || '').toUpperCase();

  if (valor === 'ENVIADO' || valor === 'ABERTA') {
    return 'app-status-pill compra-status-pill compra-status-blue bg-blue-100 text-blue-700';
  }

  if (valor === 'FINALIZADA' || valor === 'ENCERRADO') {
    return 'app-status-pill compra-status-pill compra-status-muted bg-slate-100 text-slate-700';
  }

  return 'app-status-pill compra-status-pill compra-status-default bg-indigo-100 text-indigo-700';
}

export default function SolicitacoesCompra() {
  const navigate = useNavigate();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [obraId, setObraId] = useState('');
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');

  async function carregarObras() {
    try {
      const data = await getMinhasObras({ modo: 'CRIACAO' });
      setObras(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  }

  async function carregarSolicitacoes() {
    try {
      setLoading(true);
      const params = obraId ? { obra_id: obraId } : {};
      const data = await listarSolicitacoesCompra(params);
      setSolicitacoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar solicitacoes de compra');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarObras();
  }, []);

  useEffect(() => {
    carregarSolicitacoes();
  }, [obraId]);

  const solicitacoesFiltradas = useMemo(() => {
    const termo = String(busca || '').trim().toLowerCase();

    return solicitacoes.filter((solicitacao) => {
      const statusOk = !status || String(solicitacao.status || '').toUpperCase() === status;

      if (!statusOk) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const obraNome = String(solicitacao.obra?.nome || '').toLowerCase();
      const obraCodigo = String(solicitacao.obra?.codigo || '').toLowerCase();
      const solicitante = String(solicitacao.solicitante?.nome || '').toLowerCase();
      const codigo = `sc-${String(solicitacao.id || '').padStart(5, '0')}`.toLowerCase();

      return (
        obraNome.includes(termo) ||
        obraCodigo.includes(termo) ||
        solicitante.includes(termo) ||
        codigo.includes(termo)
      );
    });
  }, [busca, solicitacoes, status]);

  async function handleBaixarPdf(id) {
    try {
      const blob = await baixarPdfSolicitacaoCompra(id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao gerar PDF');
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Solicitacoes de Compra</h1>
            <p className="page-subtitle">
              Acompanhe as solicitacoes de compra criadas no modulo e gere o PDF quando necessario.
            </p>
          </div>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-toolbar app-toolbar-card rounded-xl p-3 md:p-4">
        <div className="text-sm text-gray-600 dark:text-slate-300">
          Registros disponiveis: <strong>{solicitacoesFiltradas.length}</strong>
        </div>
        <div className="app-page-actions">
          <button type="button" className="btn btn-outline" onClick={carregarSolicitacoes} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/solicitacoes-compra/nova')}>
            Nova solicitacao
          </button>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-filtros app-filters-card rounded-xl p-4 md:p-5">
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Filtros</p>
            <p className="sol-filtros-subtitle">
              Refine por obra, status e busca textual para localizar a solicitacao certa mais rapido.
            </p>
          </div>

          <div className="sol-filtros-meta">
            <div className="sol-filtros-soma">
              <span className="sol-filtros-soma-label">Total listado</span>
              <strong className="sol-filtros-soma-value">{solicitacoesFiltradas.length}</strong>
            </div>
          </div>
        </div>

        <div className="sol-filtros-grid">
          <label className="sol-filter-field">
            <span className="sol-filter-label">Obra</span>
            <select className="input" value={obraId} onChange={(event) => setObraId(event.target.value)}>
              <option value="">Todas</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.codigo ? `${obra.codigo} - ` : ''}
                  {obra.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="sol-filter-field">
            <span className="sol-filter-label">Status</span>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos</option>
              <option value="ENVIADO">Enviado</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </label>

          <label className="sol-filter-field md:col-span-2">
            <span className="sol-filter-label">Busca</span>
            <input
              className="input"
              placeholder="Codigo, obra ou solicitante"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="card sol-surface-card app-table-shell compras-solicitacoes-table-shell">
        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">Carregando...</div>
        ) : solicitacoesFiltradas.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">
            Nenhuma solicitacao de compra encontrada.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Obra</th>
                  <th>Solicitante</th>
                  <th>Itens</th>
                  <th>Fornecedores</th>
                  <th>Necessario para</th>
                  <th>Criada em</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoesFiltradas.map((solicitacao) => (
                  <tr key={solicitacao.id}>
                    <td className="font-mono text-sm font-semibold">
                      SC-{String(solicitacao.id).padStart(5, '0')}
                    </td>
                    <td>
                      <div className="grid gap-1">
                        <span className="font-medium">{solicitacao.obra?.nome || '-'}</span>
                        <span className="text-xs text-[var(--c-muted)]">{solicitacao.obra?.codigo || '-'}</span>
                      </div>
                    </td>
                    <td>{solicitacao.solicitante?.nome || '-'}</td>
                    <td>{(solicitacao.itens?.length || 0) + (solicitacao.itensManuais?.length || 0)}</td>
                    <td>{solicitacao.fornecedores?.length || 0}</td>
                    <td>{formatarData(solicitacao.necessario_para)}</td>
                    <td>{formatarData(solicitacao.createdAt)}</td>
                    <td>
                      <span className={classNameStatus(solicitacao.status)}>
                        {formatarStatus(solicitacao.status)}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => navigate(`/solicitacoes-compra/${solicitacao.id}`)}
                        >
                          Detalhes
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => handleBaixarPdf(solicitacao.id)}
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
