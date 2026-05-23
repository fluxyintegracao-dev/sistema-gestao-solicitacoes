import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { getObras } from '../services/obras';
import { getContratosRelatorioOperacional } from '../services/contratos';

const GROUP_COLUMNS = [
  { key: 'label', width: 260, minWidth: 180 },
  { key: 'total', width: 90, minWidth: 80 },
  { key: 'ativos', width: 90, minWidth: 80 },
  { key: 'sem_anexo', width: 110, minWidth: 95 },
  { key: 'valor_total', width: 150, minWidth: 120 },
  { key: 'total_pago', width: 150, minWidth: 120 },
  { key: 'total_a_pagar', width: 150, minWidth: 120 }
];

const PENDENCIA_COLUMNS = [
  { key: 'contrato', width: 170, minWidth: 130 },
  { key: 'referencia', width: 240, minWidth: 160 },
  { key: 'obra', width: 260, minWidth: 180 },
  { key: 'empresa', width: 220, minWidth: 160 },
  { key: 'valor', width: 140, minWidth: 110 },
  { key: 'saldo', width: 140, minWidth: 110 },
  { key: 'pendencias', width: 360, minWidth: 220 }
];

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function number(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function monthLabel(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(String(value))) return value || '-';
  const [year, month] = String(value).split('-');
  return `${month}/${year}`;
}

function Card({ label, value, hint, tone = 'blue' }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50/70 text-blue-900',
    green: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-900',
    red: 'border-rose-200 bg-rose-50/70 text-rose-900',
    slate: 'border-slate-200 bg-slate-50/80 text-slate-950'
  };

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone] || tones.blue}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function GroupTable({ title, rows, storageKey, labelHeader = 'Descricao', formatLabel }) {
  return (
    <section className="card sol-surface-card app-table-shell">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <span className="text-xs text-slate-500">{number(rows.length)} linha(s)</span>
      </div>

      <div className="table-wrapper">
        <ResizableTable className="sol-table" columns={GROUP_COLUMNS} storageKey={storageKey}>
          <thead>
            <tr>
              <ResizableTh columnKey="label">{labelHeader}</ResizableTh>
              <ResizableTh columnKey="total" className="text-right">Contratos</ResizableTh>
              <ResizableTh columnKey="ativos" className="text-right">Ativos</ResizableTh>
              <ResizableTh columnKey="sem_anexo" className="text-right">Sem anexo</ResizableTh>
              <ResizableTh columnKey="valor_total" className="text-right">Valor</ResizableTh>
              <ResizableTh columnKey="total_pago" className="text-right">Pago</ResizableTh>
              <ResizableTh columnKey="total_a_pagar" className="text-right">A pagar</ResizableTh>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="7" className="px-3 py-6 text-center text-sm text-slate-500">
                  Nenhum dado encontrado para os filtros.
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`}>
                <td className="px-3 py-2 font-semibold text-slate-900">
                  {formatLabel ? formatLabel(row.label) : row.label}
                  {row.empresa && <div className="text-xs font-normal text-slate-500">{row.empresa}</div>}
                </td>
                <td className="px-3 py-2 text-right">{number(row.total)}</td>
                <td className="px-3 py-2 text-right">{number(row.ativos)}</td>
                <td className="px-3 py-2 text-right">{number(row.sem_anexo)}</td>
                <td className="px-3 py-2 text-right">{money(row.valor_total)}</td>
                <td className="px-3 py-2 text-right">{money(row.total_pago)}</td>
                <td className="px-3 py-2 text-right">{money(row.total_a_pagar)}</td>
              </tr>
            ))}
          </tbody>
        </ResizableTable>
      </div>
    </section>
  );
}

export default function ContratosRelatorioOperacional() {
  const [filtros, setFiltros] = useState({
    obra_id: '',
    ref: '',
    codigo: '',
    ativo: '',
    data_inicio: '',
    data_fim: ''
  });
  const [obras, setObras] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  async function carregar(params = filtros) {
    try {
      setLoading(true);
      setErro('');
      const response = await getContratosRelatorioOperacional(params);
      setData(response);
    } catch (error) {
      console.error(error);
      setErro(error?.message || 'Erro ao carregar relatorio de contratos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    getObras()
      .then((lista) => setObras(Array.isArray(lista) ? lista : []))
      .catch((error) => console.error(error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumo = data?.resumo || {};
  const maxMes = useMemo(() => {
    return Math.max(...(data?.por_mes_cadastro || []).map((item) => Number(item.total || 0)), 1);
  }, [data]);

  function onChange(event) {
    const { name, value } = event.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    await carregar(filtros);
  }

  async function limpar() {
    const limpo = { obra_id: '', ref: '', codigo: '', ativo: '', data_inicio: '', data_fim: '' };
    setFiltros(limpo);
    await carregar(limpo);
  }

  return (
    <div className="page solicitacoes-page">
      <div className="sol-page-header">
        <div>
          <p className="eyebrow">Contratos / Relatorios</p>
          <h1 className="page-title">Painel operacional de contratos</h1>
          <p className="page-subtitle">
            Valores, saldos, anexos e distribuicao dos contratos operacionais por obra, empresa do grupo e referencia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/contratos/relatorios" className="btn btn-outline">
            Voltar aos relatorios
          </Link>
          <Link to="/gestao-contratos" className="btn btn-primary">
            Gestao de contratos
          </Link>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card sol-surface-card rounded-xl p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="grid gap-1 text-sm">
            <span>Obra/Centro</span>
            <select name="obra_id" value={filtros.obra_id} onChange={onChange} className="input">
              <option value="">Todos</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.codigo ? `${obra.codigo} - ` : ''}{obra.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Status</span>
            <select name="ativo" value={filtros.ativo} onChange={onChange} className="input">
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Codigo</span>
            <input name="codigo" value={filtros.codigo} onChange={onChange} className="input" />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Referencia</span>
            <input name="ref" value={filtros.ref} onChange={onChange} className="input" />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Data inicial</span>
            <input name="data_inicio" type="date" value={filtros.data_inicio} onChange={onChange} className="input" />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Data final</span>
            <input name="data_fim" type="date" value={filtros.data_fim} onChange={onChange} className="input" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar relatorio'}
          </button>
          <button type="button" className="btn btn-outline" onClick={limpar} disabled={loading}>
            Limpar
          </button>
        </div>
      </form>

      {erro && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {erro}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card label="Contratos" value={number(resumo.total_contratos)} hint={`${number(resumo.ativos)} ativo(s)`} />
        <Card label="Valor contratado" value={money(resumo.valor_total)} hint="Valor cadastrado nos contratos" tone="green" />
        <Card label="A pagar" value={money(resumo.total_a_pagar)} hint="Solicitado menos pago no modulo" tone="amber" />
        <Card label="Sem anexo" value={number(resumo.sem_anexo)} hint="Pendencia documental explicita" tone={resumo.sem_anexo > 0 ? 'red' : 'slate'} />
        <Card label="Total solicitado" value={money(resumo.total_solicitado)} hint="Contrato + ajustes solicitados" />
        <Card label="Total pago" value={money(resumo.total_pago)} hint="Solicitacoes pagas + ajustes pagos" tone="green" />
        <Card label="Solicitacoes vinculadas" value={number(resumo.solicitacoes_vinculadas)} hint="Vinculos reais com solicitacoes" tone="slate" />
        <Card label="Inativos" value={number(resumo.inativos)} hint="Contratos marcados como inativos" tone="slate" />
      </div>

      <section className="card sol-surface-card rounded-xl p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">Cadastros por mes</h2>
          <p className="text-sm text-slate-500">Evolucao baseada na data real de cadastro do contrato.</p>
        </div>
        <div className="space-y-3">
          {(data?.por_mes_cadastro || []).length === 0 && (
            <p className="text-sm text-slate-500">Nenhum contrato no periodo.</p>
          )}
          {(data?.por_mes_cadastro || []).map((item) => (
            <div key={item.label} className="grid gap-2 md:grid-cols-[96px_minmax(0,1fr)_90px] md:items-center">
              <span className="text-sm font-semibold text-slate-700">{monthLabel(item.label)}</span>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.max((Number(item.total || 0) / maxMes) * 100, 4)}%` }}
                />
              </div>
              <span className="text-right text-sm font-semibold text-slate-900">{number(item.total)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <GroupTable
          title="Contratos por empresa do grupo"
          rows={data?.por_empresa || []}
          storageKey="fluxy.contratos.operacional.empresas.columns"
          labelHeader="Empresa"
        />
        <GroupTable
          title="Contratos por obra/centro"
          rows={data?.por_obra || []}
          storageKey="fluxy.contratos.operacional.obras.columns"
          labelHeader="Obra/Centro"
        />
        <GroupTable
          title="Contratos por referencia"
          rows={data?.por_referencia || []}
          storageKey="fluxy.contratos.operacional.referencias.columns"
          labelHeader="Referencia"
        />
        <GroupTable
          title="Contratos por status"
          rows={data?.por_status || []}
          storageKey="fluxy.contratos.operacional.status.columns"
          labelHeader="Status"
        />
      </div>

      <section className="card sol-surface-card app-table-shell">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Pendencias cadastrais</h2>
            <p className="text-sm text-slate-500">
              Apenas pendencias explicitas: sem anexo, sem empresa vinculada na obra/centro, sem referencia ou valor zerado.
            </p>
          </div>
          <span className="text-xs text-slate-500">{number(data?.pendencias_cadastrais?.length)} contrato(s)</span>
        </div>

        <div className="table-wrapper">
          <ResizableTable
            className="sol-table"
            columns={PENDENCIA_COLUMNS}
            storageKey="fluxy.contratos.operacional.pendencias.columns"
          >
            <thead>
              <tr>
                <ResizableTh columnKey="contrato">Contrato</ResizableTh>
                <ResizableTh columnKey="referencia">Referencia</ResizableTh>
                <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                <ResizableTh columnKey="empresa">Empresa</ResizableTh>
                <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                <ResizableTh columnKey="saldo" className="text-right">A pagar</ResizableTh>
                <ResizableTh columnKey="pendencias">Pendencias</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {(data?.pendencias_cadastrais || []).length === 0 && (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-center text-sm text-slate-500">
                    Nenhuma pendencia cadastral nos filtros atuais.
                  </td>
                </tr>
              )}
              {(data?.pendencias_cadastrais || []).map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{item.codigo}</td>
                  <td className="px-3 py-2">{item.referencia || '-'}</td>
                  <td className="px-3 py-2">{item.obra || '-'}</td>
                  <td className="px-3 py-2">{item.empresa || '-'}</td>
                  <td className="px-3 py-2 text-right">{money(item.valor_total)}</td>
                  <td className="px-3 py-2 text-right">{money(item.total_a_pagar)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(item.pendencias || []).map((pendencia) => (
                        <span key={pendencia} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          {pendencia}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </ResizableTable>
        </div>
      </section>
    </div>
  );
}
