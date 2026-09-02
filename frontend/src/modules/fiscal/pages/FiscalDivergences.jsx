import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TabelaPadrao, CelulaDupla } from '../../../components/padrao';
import { getFiscalCompanies, getFiscalDivergences } from '../services/fiscalApi';

const divergenceTypes = [
  ['supplier_mismatch', 'Fornecedor divergente'],
  ['value_mismatch', 'Valor divergente'],
  ['quantity_mismatch', 'Quantidade divergente'],
  ['item_mismatch', 'Item divergente'],
  ['missing_order', 'Sem pedido'],
  ['missing_receipt', 'Sem recebimento'],
  ['duplicate_invoice', 'Nota duplicada'],
  ['cancelled_document', 'Documento cancelado'],
  ['unknown_cost_center', 'Centro de custo indefinido'],
  ['unknown_financial_plan', 'Plano financeiro indefinido'],
  ['other', 'Outro']
];

const severityLabels = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  critical: 'Critica'
};

const statusLabels = {
  open: 'Aberta',
  resolved: 'Resolvida',
  ignored: 'Ignorada'
};

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

export default function FiscalDivergences() {
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({
    q: '',
    company_id: '',
    status: 'open',
    severity: '',
    divergence_type: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const [divergencesResult, companiesResult] = await Promise.all([
        getFiscalDivergences(nextFilters),
        getFiscalCompanies({ ativo: true })
      ]);
      setItems(divergencesResult?.data || []);
      setPagination(divergencesResult?.pagination || { total: 0, page: 1, pages: 1 });
      setCompanies(companiesResult?.data || []);
    } catch (err) {
      setError(err.message || 'Erro ao buscar divergencias fiscais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    load().finally(() => {
      if (!mounted) return;
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const submitFilters = async (event) => {
    event.preventDefault();
    await load(filters);
  };

  const clearFilters = async () => {
    const emptyFilters = {
      q: '',
      company_id: '',
      status: '',
      severity: '',
      divergence_type: ''
    };
    setFilters(emptyFilters);
    await load(emptyFilters);
  };

  return (
    <div className="fiscal-page space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fiscal</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Divergencias fiscais</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Visao centralizada das divergencias registradas nos documentos fiscais. Esta tela ainda nao altera pedidos, recebimentos ou financeiro.
          </p>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <form onSubmit={submitFilters} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <input
            className="input"
            placeholder="Busca por nota, fornecedor ou descricao"
            value={filters.q}
            onChange={(event) => updateFilter('q', event.target.value)}
          />
          <select className="input" value={filters.company_id} onChange={(event) => updateFilter('company_id', event.target.value)}>
            <option value="">Todas as empresas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.razao_social}</option>
            ))}
          </select>
          <select className="input" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">Todos os status</option>
            <option value="open">Aberta</option>
            <option value="resolved">Resolvida</option>
            <option value="ignored">Ignorada</option>
          </select>
          <select className="input" value={filters.severity} onChange={(event) => updateFilter('severity', event.target.value)}>
            <option value="">Todas as severidades</option>
            <option value="low">Baixa</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Critica</option>
          </select>
          <select className="input" value={filters.divergence_type} onChange={(event) => updateFilter('divergence_type', event.target.value)}>
            <option value="">Todos os tipos</option>
            {divergenceTypes.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={clearFilters}>Limpar</button>
          <button className="btn-primary" type="submit">Filtrar</button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {loading ? 'Carregando divergencias...' : `${pagination.total || 0} divergencia(s) encontrada(s)`}
        </div>
        <TabelaPadrao
          colunas={[
            {
              id: 'documento',
              titulo: 'Documento',
              tipo: 'codigo',
              noCard: 'titulo',
              render: (item) => {
                const documento = item.document || {};
                const company = documento.company || {};
                return (
                  <div>
                    <Link className="font-semibold text-slate-950 hover:text-blue-600 dark:text-white" to={`/fiscal/documentos/${documento.id}`}>
                      {documento.document_number || documento.access_key || `Documento ${documento.id}`}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(documento.emission_date)} - {formatMoney(documento.total_value)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{company.razao_social || '-'}</div>
                  </div>
                );
              }
            },
            {
              id: 'fornecedor',
              titulo: 'Fornecedor',
              tipo: 'identidade',
              render: (item) => (
                <CelulaDupla
                  principal={item.document?.issuer_name || '-'}
                  sub={item.document?.issuer_cnpj || '-'}
                />
              )
            },
            {
              id: 'tipo',
              titulo: 'Tipo',
              tipo: 'texto',
              render: (item) => divergenceTypes.find(([value]) => value === item.divergence_type)?.[1] || item.divergence_type
            },
            {
              id: 'severidade',
              titulo: 'Severidade',
              tipo: 'badge',
              render: (item) => severityLabels[item.severity] || item.severity
            },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'status',
              render: (item) => statusLabels[item.status] || item.status
            },
            {
              id: 'descricao',
              titulo: 'Descricao',
              tipo: 'texto',
              render: (item) => <div className="line-clamp-3">{item.description}</div>
            },
            {
              id: 'valores',
              titulo: 'Valores',
              tipo: 'texto',
              render: (item) => (
                <div className="text-xs text-slate-500">
                  <div>Esperado: {item.expected_value || '-'}</div>
                  <div>Encontrado: {item.actual_value || '-'}</div>
                </div>
              )
            }
          ]}
          itens={items}
          carregando={loading}
          vazio="Nenhuma divergencia fiscal encontrada."
          storageKey="tabela:divergencias-fiscais"
          rotuloRolagem="Divergencias fiscais"
        />      </div>
    </div>
  );
}
