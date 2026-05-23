import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../../../components/ResizableTable';
import { getFiscalOperationalReport } from '../services/fiscalApi';

const DEFAULT_FILTERS = {
  company_id: '',
  data_inicio: '',
  data_fim: '',
  status: '',
  source: ''
};

const STATUS_OPTIONS = [
  ['discovered', 'Descoberto'],
  ['summary_received', 'Resumo recebido'],
  ['full_xml_available', 'XML disponivel'],
  ['xml_downloaded', 'XML baixado'],
  ['pending_link', 'Pendente de vinculo'],
  ['linked_to_order', 'Vinculado'],
  ['with_divergence', 'Com divergencia'],
  ['validated', 'Validado'],
  ['sent_to_finance', 'Enviado ao financeiro'],
  ['exported_to_accounting', 'Exportado'],
  ['cancelled', 'Cancelado'],
  ['ignored', 'Ignorado']
];

const SOURCE_OPTIONS = [
  ['sefaz_distribution', 'SEFAZ'],
  ['manual_upload', 'Upload manual'],
  ['batch_import', 'Importacao em lote']
];

const SIMPLE_COLUMNS = [
  { key: 'label', width: 260, minWidth: 160 },
  { key: 'total', width: 110, minWidth: 90 }
];

const DOCUMENT_COLUMNS = [
  { key: 'documento', width: 150, minWidth: 110 },
  { key: 'fornecedor', width: 260, minWidth: 180 },
  { key: 'empresa', width: 240, minWidth: 160 },
  { key: 'emissao', width: 120, minWidth: 100 },
  { key: 'valor', width: 150, minWidth: 120 },
  { key: 'status', width: 160, minWidth: 120 },
  { key: 'pendencias', width: 320, minWidth: 220 }
];

function readFilters(searchParams) {
  return {
    company_id: searchParams.get('company_id') || '',
    data_inicio: searchParams.get('data_inicio') || '',
    data_fim: searchParams.get('data_fim') || '',
    status: searchParams.get('status') || '',
    source: searchParams.get('source') || ''
  };
}

function buildSearchParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  return params;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
}

function statusLabel(value) {
  return STATUS_OPTIONS.find(([key]) => key === value)?.[1] || value || '-';
}

function sourceLabel(value) {
  return SOURCE_OPTIONS.find(([key]) => key === value)?.[1] || value || '-';
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar relatorio fiscal operacional';
  }
}

function MetricCard({ label, value, helper, tone = 'default' }) {
  const toneClass = {
    default: 'border-sky-100 bg-sky-50/60',
    success: 'border-emerald-100 bg-emerald-50/70',
    warning: 'border-amber-100 bg-amber-50/70',
    danger: 'border-rose-100 bg-rose-50/70'
  }[tone] || 'border-sky-100 bg-sky-50/60';

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <strong className="mt-2 block text-2xl font-bold text-slate-950">{value}</strong>
      {helper ? <span className="mt-1 block text-xs text-slate-500">{helper}</span> : null}
    </div>
  );
}

function SimpleTable({ title, rows, labelKey, labelFormatter, storageKey }) {
  return (
    <section className="sol-surface-card overflow-hidden rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {formatNumber(rows.length)} linhas
        </span>
      </div>
      <div className="sol-table-wrapper">
        <ResizableTable className="sol-table" columns={SIMPLE_COLUMNS} storageKey={storageKey}>
          <thead>
            <tr>
              <ResizableTh columnKey="label">Descricao</ResizableTh>
              <ResizableTh columnKey="total" className="text-right">Total</ResizableTh>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((item) => (
              <tr key={item[labelKey]}>
                <td className="font-semibold text-slate-900">{labelFormatter ? labelFormatter(item[labelKey]) : item[labelKey]}</td>
                <td className="text-right">{formatNumber(item.total)}</td>
              </tr>
            )) : (
              <tr><td colSpan={2}>Sem dados no periodo.</td></tr>
            )}
          </tbody>
        </ResizableTable>
      </div>
    </section>
  );
}

function RiskTags({ item }) {
  const tags = [];
  if (item.without_confirmed_link) tags.push(['Sem vinculo confirmado', 'bg-amber-100 text-amber-800']);
  if (item.open_divergences > 0) tags.push([`${item.open_divergences} divergencia(s) aberta(s)`, 'bg-rose-100 text-rose-800']);
  if (item.missing_xml) tags.push(['Sem XML', 'bg-slate-100 text-slate-700']);
  if (item.missing_danfe) tags.push(['Sem DANFE/PDF', 'bg-slate-100 text-slate-700']);

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(([label, className]) => (
        <span key={label} className={`rounded-full px-2 py-1 text-[11px] font-semibold ${className}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

export default function FiscalOperationalReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => readFilters(searchParams));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const nextFilters = readFilters(searchParams);
    setFilters(nextFilters);

    let active = true;
    async function loadReport() {
      try {
        setLoading(true);
        setError('');
        const data = await getFiscalOperationalReport(nextFilters);
        if (active) setReport(data);
      } catch (err) {
        console.error(err);
        if (active) {
          setReport(null);
          setError(extractErrorMessage(err));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const resumo = report?.resumo || {};
  const agrupamentos = report?.agrupamentos || {};
  const documents = report?.documentos_criticos || [];
  const companies = report?.empresas || [];
  const chartMax = useMemo(() => {
    const values = (agrupamentos.por_mes || []).map((item) => Number(item.total || 0));
    return Math.max(...values, 1);
  }, [agrupamentos.por_mes]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setSearchParams(buildSearchParams(filters));
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearchParams(new URLSearchParams());
  }

  return (
    <div className="fiscal-page space-y-6">
      <section className="rounded-lg border border-sky-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.97),_rgba(239,246,255,0.92))] p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Fiscal</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Relatorio Fiscal Operacional</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Documentos, vinculos confirmados, divergencias abertas e arquivos fiscais disponiveis por periodo de emissao.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary" to="/fiscal/relatorios">Relatorios</Link>
            <Link className="btn-primary" to="/fiscal/documentos">Documentos</Link>
          </div>
        </div>
      </section>

      <form onSubmit={applyFilters} className="sol-surface-card rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="field">
            <span>Empresa fiscal</span>
            <select className="input" value={filters.company_id} onChange={(event) => updateFilter('company_id', event.target.value)}>
              <option value="">Todas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.razao_social}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Data inicial</span>
            <input className="input" type="date" value={filters.data_inicio} onChange={(event) => updateFilter('data_inicio', event.target.value)} />
          </label>
          <label className="field">
            <span>Data final</span>
            <input className="input" type="date" value={filters.data_fim} onChange={(event) => updateFilter('data_fim', event.target.value)} />
          </label>
          <label className="field">
            <span>Status</span>
            <select className="input" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Todos</option>
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Origem</span>
            <select className="input" value={filters.source} onChange={(event) => updateFilter('source', event.target.value)}>
              <option value="">Todas</option>
              {SOURCE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" type="submit">{loading ? 'Atualizando...' : 'Atualizar relatorio'}</button>
          <button className="btn-secondary" type="button" onClick={clearFilters}>Limpar</button>
        </div>
      </form>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Documentos" value={formatNumber(resumo.documentos_total)} helper="No periodo filtrado" />
        <MetricCard label="Valor fiscal" value={formatMoney(resumo.valor_total)} helper="Soma dos XMLs filtrados" />
        <MetricCard label="Sem vinculo" value={formatNumber(resumo.documentos_sem_vinculo_confirmado)} helper="Sem vinculo confirmado/manual" tone={resumo.documentos_sem_vinculo_confirmado > 0 ? 'warning' : 'success'} />
        <MetricCard label="Divergencias abertas" value={formatNumber(resumo.divergencias_abertas)} helper={`${formatNumber(resumo.documentos_com_divergencia_aberta)} documento(s)`} tone={resumo.divergencias_abertas > 0 ? 'danger' : 'success'} />
        <MetricCard label="Validados" value={formatNumber(resumo.documentos_validados)} helper="Liberados fiscalmente" tone="success" />
        <MetricCard label="Pendentes" value={formatNumber(resumo.documentos_pendentes)} helper="Nao validados/ignorados/cancelados" tone={resumo.documentos_pendentes > 0 ? 'warning' : 'success'} />
        <MetricCard label="Sem XML" value={formatNumber(resumo.documentos_sem_xml)} helper="Arquivo XML ausente" tone={resumo.documentos_sem_xml > 0 ? 'warning' : 'success'} />
        <MetricCard label="Sem DANFE/PDF" value={formatNumber(resumo.documentos_sem_danfe)} helper="Sem arquivo visual" tone={resumo.documentos_sem_danfe > 0 ? 'warning' : 'success'} />
      </div>

      <section className="sol-surface-card rounded-lg p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Evolucao mensal de documentos</h2>
            <p className="text-sm text-slate-500">Quantidade por mes de emissao ou cadastro quando a emissao nao existe.</p>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-6">
          {(agrupamentos.por_mes || []).length ? agrupamentos.por_mes.map((item) => {
            const height = Math.max(8, Math.round((Number(item.total || 0) / chartMax) * 90));
            return (
              <div key={item.mes} className="rounded-lg border border-slate-100 bg-white p-3">
                <div className="flex h-24 items-end">
                  <div className="w-full rounded-t bg-sky-500" style={{ height: `${height}px` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{item.mes}</span>
                  <strong className="text-slate-950">{formatNumber(item.total)}</strong>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 md:col-span-6">Sem documentos no periodo.</div>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleTable title="Documentos por status" rows={agrupamentos.por_status || []} labelKey="status" labelFormatter={statusLabel} storageKey="fluxy.fiscal.operacional.status.columns" />
        <SimpleTable title="Documentos por empresa fiscal" rows={agrupamentos.por_empresa || []} labelKey="empresa" storageKey="fluxy.fiscal.operacional.empresas.columns" />
        <SimpleTable title="Documentos por fornecedor" rows={agrupamentos.por_fornecedor || []} labelKey="fornecedor" storageKey="fluxy.fiscal.operacional.fornecedores.columns" />
        <SimpleTable title="Divergencias por tipo" rows={agrupamentos.divergencias_por_tipo || []} labelKey="tipo" storageKey="fluxy.fiscal.operacional.divergenciasTipo.columns" />
        <SimpleTable title="Divergencias por severidade" rows={agrupamentos.divergencias_por_severidade || []} labelKey="severidade" storageKey="fluxy.fiscal.operacional.divergenciasSeveridade.columns" />
        <SimpleTable title="Documentos por origem" rows={agrupamentos.por_origem || []} labelKey="origem" labelFormatter={sourceLabel} storageKey="fluxy.fiscal.operacional.origens.columns" />
      </div>

      <section className="sol-surface-card rounded-lg p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Documentos que exigem acao</h2>
            <p className="text-sm text-slate-500">Itens com divergencia aberta, sem vinculo confirmado ou sem arquivo fiscal essencial.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {formatNumber(documents.length)} itens
          </span>
        </div>
        <div className="sol-table-wrapper">
          <ResizableTable className="sol-table" columns={DOCUMENT_COLUMNS} storageKey="fluxy.fiscal.operacional.documentosCriticos.columns">
            <thead>
              <tr>
                <ResizableTh columnKey="documento">Documento</ResizableTh>
                <ResizableTh columnKey="fornecedor">Fornecedor</ResizableTh>
                <ResizableTh columnKey="empresa">Empresa fiscal</ResizableTh>
                <ResizableTh columnKey="emissao">Emissao</ResizableTh>
                <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                <ResizableTh columnKey="status">Status</ResizableTh>
                <ResizableTh columnKey="pendencias">Pendencias</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}>Carregando...</td></tr>
              ) : documents.length === 0 ? (
                <tr><td colSpan={7}>Sem documentos pendentes no periodo.</td></tr>
              ) : documents.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link className="font-semibold text-blue-700 hover:underline" to={`/fiscal/documentos/${item.id}`}>
                      {item.document_number || `#${item.id}`}
                    </Link>
                  </td>
                  <td>
                    <div className="font-semibold text-slate-900">{item.issuer_name || item.issuer_cnpj || '-'}</div>
                    {item.issuer_cnpj ? <div className="text-xs text-slate-500">{item.issuer_cnpj}</div> : null}
                  </td>
                  <td>{item.company_name || '-'}</td>
                  <td>{formatDate(item.emission_date)}</td>
                  <td className="text-right">{formatMoney(item.total_value)}</td>
                  <td>{statusLabel(item.document_status)}</td>
                  <td><RiskTags item={item} /></td>
                </tr>
              ))}
            </tbody>
          </ResizableTable>
        </div>
      </section>
    </div>
  );
}
