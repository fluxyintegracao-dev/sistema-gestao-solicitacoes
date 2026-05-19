import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fiscal</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Divergencias fiscais</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Visao centralizada das divergencias registradas nos documentos fiscais. Esta tela ainda nao altera pedidos, recebimentos ou financeiro.
          </p>
        </div>
        <Link className="btn-secondary" to="/fiscal/documentos">Voltar para documentos</Link>
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
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40">
            <tr>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Severidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Descricao</th>
              <th className="px-4 py-3">Valores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={7}>Carregando divergencias...</td></tr>
            ) : items.length ? items.map((item) => {
              const document = item.document || {};
              const company = document.company || {};
              const typeLabel = divergenceTypes.find(([value]) => value === item.divergence_type)?.[1] || item.divergence_type;
              return (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-slate-950 hover:text-blue-600 dark:text-white" to={`/fiscal/documentos/${document.id}`}>
                      {document.document_number || document.access_key || `Documento ${document.id}`}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(document.emission_date)} - {formatMoney(document.total_value)}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{company.razao_social || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <div className="font-medium text-slate-950 dark:text-white">{document.issuer_name || '-'}</div>
                    <div className="text-xs text-slate-500">{document.issuer_cnpj || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{typeLabel}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{severityLabels[item.severity] || item.severity}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{statusLabels[item.status] || item.status}</td>
                  <td className="max-w-[320px] px-4 py-3 text-slate-600 dark:text-slate-300">
                    <div className="line-clamp-3">{item.description}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div>Esperado: {item.expected_value || '-'}</div>
                    <div>Encontrado: {item.actual_value || '-'}</div>
                  </td>
                </tr>
              );
            }) : (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={7}>Nenhuma divergencia fiscal encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
