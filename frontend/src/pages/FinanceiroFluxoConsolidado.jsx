import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import { getRelatorioFluxoConsolidado } from '../services/financeiro';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  periodo: 'MES_ATUAL',
  data_inicial: '',
  data_final: '',
  holding_id: '',
  empresa_id: '',
  obra_id: '',
  excluir_intercompany: true
};

const EMPRESAS_COLUMNS = [
  { key: 'empresa', width: 260, minWidth: 180 },
  { key: 'entradas_previstas', width: 170, minWidth: 140 },
  { key: 'saidas_previstas', width: 160, minWidth: 140 },
  { key: 'saldo_previsto', width: 150, minWidth: 130 },
  { key: 'entradas_realizadas', width: 175, minWidth: 145 },
  { key: 'saidas_realizadas', width: 165, minWidth: 140 },
  { key: 'saldo_realizado', width: 155, minWidth: 130 }
];

const OBRAS_COLUMNS = [
  { key: 'obra', width: 270, minWidth: 190 },
  { key: 'tipo', width: 130, minWidth: 100 },
  { key: 'entradas_previstas', width: 170, minWidth: 140 },
  { key: 'saidas_previstas', width: 160, minWidth: 140 },
  { key: 'saldo_previsto', width: 150, minWidth: 130 },
  { key: 'saldo_realizado', width: 155, minWidth: 130 }
];

const SERIE_COLUMNS = [
  { key: 'periodo', width: 150, minWidth: 120 },
  { key: 'entradas_previstas', width: 170, minWidth: 140 },
  { key: 'saidas_previstas', width: 160, minWidth: 140 },
  { key: 'saldo_previsto', width: 150, minWidth: 130 },
  { key: 'entradas_realizadas', width: 175, minWidth: 145 },
  { key: 'saidas_realizadas', width: 165, minWidth: 140 },
  { key: 'saldo_realizado', width: 155, minWidth: 130 }
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function Metric({ label, value, detail, positive = null }) {
  const color =
    positive == null
      ? 'var(--c-text)'
      : positive
        ? '#15803d'
        : '#b91c1c';

  return (
    <div className="app-summary-card">
      <span className="app-summary-label">{label}</span>
      <strong className="app-summary-value" style={{ color }}>
        {value}
      </strong>
      {detail ? <span className="app-summary-subvalue">{detail}</span> : null}
    </div>
  );
}

function severityClass(severidade) {
  const level = String(severidade || '').toUpperCase();
  if (level === 'ALTA') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (level === 'MEDIA') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-sky-200 bg-sky-50 text-sky-800';
}

function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center text-[var(--c-muted)]">
        {message}
      </td>
    </tr>
  );
}

export default function FinanceiroFluxoConsolidado() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [empresas, setEmpresas] = useState([]);
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([
      getEmpresasGrupo({ ativo: true }),
      getMinhasObras({ modo: 'FINANCEIRO', escopo: 'TODOS' })
    ])
      .then(([empresasData, obrasData]) => {
        if (!active) return;
        setEmpresas(Array.isArray(empresasData) ? empresasData : []);
        setObras(Array.isArray(obrasData) ? obrasData : []);
      })
      .catch(() => {
        if (!active) return;
        setEmpresas([]);
        setObras([]);
      })
      .finally(() => {
        if (active) setLoadingRefs(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getRelatorioFluxoConsolidado({
      ...appliedFilters,
      excluir_intercompany: appliedFilters.excluir_intercompany ? 'true' : 'false'
    })
      .then((data) => {
        if (!active) return;
        setRelatorio(data || null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar fluxo consolidado');
        setRelatorio(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const holdings = useMemo(
    () => empresas.filter((empresa) => String(empresa.tipo_empresa || '').toUpperCase() === 'HOLDING'),
    [empresas]
  );

  const empresasOperacionais = useMemo(
    () => empresas.filter((empresa) => String(empresa.tipo_empresa || 'OPERACIONAL').toUpperCase() !== 'HOLDING'),
    [empresas]
  );

  const resumo = relatorio?.resumo || {};
  const serie = Array.isArray(relatorio?.serie) ? relatorio.serie : [];
  const empresasResumo = Array.isArray(relatorio?.empresas) ? relatorio.empresas : [];
  const obrasResumo = Array.isArray(relatorio?.obras) ? relatorio.obras : [];
  const alertas = Array.isArray(relatorio?.alertas) ? relatorio.alertas : [];
  const periodoTexto = relatorio?.filtro?.data_inicial && relatorio?.filtro?.data_final
    ? `${formatDate(relatorio.filtro.data_inicial)} ate ${formatDate(relatorio.filtro.data_final)}`
    : '';

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === 'holding_id' ? { empresa_id: '' } : null)
    }));
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function limparFiltros() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="page solicitacoes-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Fluxo de Caixa Consolidado</h1>
            <p className="page-subtitle">
              Visao prevista e realizada por empresa, com eliminacao explicita de movimentos entre empresas.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/relatorios" className="btn btn-outline">
              Voltar para relatorios
            </Link>
          </div>
        </div>
      </div>

      <form className="card sol-surface-card" onSubmit={aplicarFiltros}>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="app-filter-field">
            <span className="app-filter-label">Periodo</span>
            <select className="input w-full input-sm" value={filters.periodo} onChange={(event) => updateFilter('periodo', event.target.value)}>
              <option value="MES_ATUAL">Mes atual</option>
              <option value="PROXIMO_MES">Proximo mes</option>
              <option value="HOJE">Hoje</option>
              <option value="7_DIAS">7 dias</option>
              <option value="30_DIAS">30 dias</option>
              <option value="90_DIAS">90 dias</option>
              <option value="PERSONALIZADO">Personalizado</option>
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Data inicial</span>
            <input className="input w-full input-sm" type="date" value={filters.data_inicial} disabled={filters.periodo !== 'PERSONALIZADO'} onChange={(event) => updateFilter('data_inicial', event.target.value)} />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Data final</span>
            <input className="input w-full input-sm" type="date" value={filters.data_final} disabled={filters.periodo !== 'PERSONALIZADO'} onChange={(event) => updateFilter('data_final', event.target.value)} />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Holding</span>
            <select className="input w-full input-sm" value={filters.holding_id} disabled={loadingRefs} onChange={(event) => updateFilter('holding_id', event.target.value)}>
              <option value="">Todas</option>
              {holdings.map((holding) => (
                <option key={holding.id} value={holding.id}>{holding.nome}</option>
              ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Empresa</span>
            <select className="input w-full input-sm" value={filters.empresa_id} disabled={loadingRefs} onChange={(event) => updateFilter('empresa_id', event.target.value)}>
              <option value="">Todas</option>
              {empresasOperacionais
                .filter((empresa) => !filters.holding_id || Number(empresa.holding_id) === Number(filters.holding_id))
                .map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Obra/Centro</span>
            <select className="input w-full input-sm" value={filters.obra_id} disabled={loadingRefs} onChange={(event) => updateFilter('obra_id', event.target.value)}>
              <option value="">Todos</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>{obra.nome}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
            <input type="checkbox" checked={filters.excluir_intercompany} onChange={(event) => updateFilter('excluir_intercompany', event.target.checked)} />
            Eliminar entre empresas no consolidado
          </label>
          <div className="flex items-center gap-2">
            {periodoTexto ? <span className="hidden text-xs text-[var(--c-muted)] md:inline">{periodoTexto}</span> : null}
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar</button>
            <button type="submit" className="btn btn-primary btn-sm">Atualizar fluxo</button>
          </div>
        </div>
      </form>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}

      <div className="app-summary-grid">
        <Metric label="Entradas previstas" value={formatCurrency(resumo.entradas_previstas)} detail={`${resumo.titulos_previstos || 0} titulo(s)`} />
        <Metric label="Saidas previstas" value={formatCurrency(resumo.saidas_previstas)} detail="Pagamentos em aberto" />
        <Metric label="Saldo previsto" value={formatCurrency(resumo.saldo_previsto)} detail="Receber menos pagar" positive={Number(resumo.saldo_previsto || 0) >= 0} />
        <Metric label="Saldo realizado" value={formatCurrency(resumo.saldo_realizado)} detail={`${resumo.movimentos_realizados || 0} baixa(s)`} positive={Number(resumo.saldo_realizado || 0) >= 0} />
        <Metric label="Necessidade futura" value={formatCurrency(resumo.necessidade_futura_caixa)} detail={resumo.pior_periodo_previsto?.label ? `Pior periodo: ${resumo.pior_periodo_previsto.label}` : 'Menor saldo previsto acumulado'} positive={Number(resumo.necessidade_futura_caixa || 0) === 0} />
        <Metric label="Entre Empresas previsto eliminado" value={formatCurrency(resumo.intercompany_previsto_eliminado)} detail={`${resumo.intercompany_titulos_eliminados || 0} titulo(s)`} />
        <Metric label="Entre Empresas realizado eliminado" value={formatCurrency(resumo.intercompany_realizado_eliminado)} detail={`${resumo.intercompany_movimentos_eliminados || 0} baixa(s)`} />
      </div>

      {loading ? (
        <div className="app-empty-card">Carregando fluxo consolidado...</div>
      ) : (
        <>
          <section className="card sol-surface-card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Alertas do fluxo</h2>
              <p className="text-sm text-[var(--c-muted)]">
                Alertas calculados com base no fluxo previsto e realizado do periodo filtrado.
              </p>
            </div>
            {alertas.length === 0 ? (
              <div className="app-empty-card">Nenhum alerta critico encontrado para os filtros atuais.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {alertas.map((alerta) => (
                  <div key={alerta.codigo} className={`rounded-lg border px-4 py-3 ${severityClass(alerta.severidade)}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold uppercase">{alerta.severidade}</span>
                        <h3 className="font-semibold">{alerta.titulo}</h3>
                      </div>
                      {alerta.valor != null ? <strong>{formatCurrency(alerta.valor)}</strong> : null}
                    </div>
                    <p className="mt-2 text-sm">{alerta.descricao}</p>
                    <p className="mt-2 text-xs font-semibold">{alerta.acao}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Resumo por empresa</h2>
              <p className="text-sm text-[var(--c-muted)]">
                Previsto usa a empresa do titulo. Realizado usa a empresa informada na baixa.
              </p>
            </div>
            <div className="table-wrapper">
              <ResizableTable
                columns={EMPRESAS_COLUMNS}
                storageKey="fluxy.financeiro.fluxoConsolidado.empresas.columnWidths"
                className="table"
              >
                <thead>
                  <tr>
                    <ResizableTh columnKey="empresa">Empresa</ResizableTh>
                    <ResizableTh columnKey="entradas_previstas" className="text-right">Entradas previstas</ResizableTh>
                    <ResizableTh columnKey="saidas_previstas" className="text-right">Saidas previstas</ResizableTh>
                    <ResizableTh columnKey="saldo_previsto" className="text-right">Saldo previsto</ResizableTh>
                    <ResizableTh columnKey="entradas_realizadas" className="text-right">Entradas realizadas</ResizableTh>
                    <ResizableTh columnKey="saidas_realizadas" className="text-right">Saidas realizadas</ResizableTh>
                    <ResizableTh columnKey="saldo_realizado" className="text-right">Saldo realizado</ResizableTh>
                  </tr>
                </thead>
                <tbody>
                  {empresasResumo.length === 0 ? (
                    <EmptyRow colSpan={7} message="Nenhum movimento encontrado para os filtros atuais." />
                  ) : (
                    empresasResumo.map((empresa) => (
                      <tr key={empresa.empresa_id || empresa.empresa_nome}>
                        <td className="font-semibold text-[var(--c-text)]">{empresa.empresa_nome}</td>
                        <td className="text-right">{formatCurrency(empresa.entradas_previstas)}</td>
                        <td className="text-right">{formatCurrency(empresa.saidas_previstas)}</td>
                        <td className="text-right font-medium" style={{ color: Number(empresa.saldo_previsto || 0) >= 0 ? '#15803d' : '#b91c1c' }}>
                          {formatCurrency(empresa.saldo_previsto)}
                        </td>
                        <td className="text-right">{formatCurrency(empresa.entradas_realizadas)}</td>
                        <td className="text-right">{formatCurrency(empresa.saidas_realizadas)}</td>
                        <td className="text-right font-medium" style={{ color: Number(empresa.saldo_realizado || 0) >= 0 ? '#15803d' : '#b91c1c' }}>
                          {formatCurrency(empresa.saldo_realizado)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </ResizableTable>
            </div>
          </section>

          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Resumo por obra/centro de custo</h2>
              <p className="text-sm text-[var(--c-muted)]">
                Identifica obras e centros que consomem ou geram caixa previsto no periodo.
              </p>
            </div>
            <div className="table-wrapper">
              <ResizableTable
                columns={OBRAS_COLUMNS}
                storageKey="fluxy.financeiro.fluxoConsolidado.obras.columnWidths"
                className="table"
              >
                <thead>
                  <tr>
                    <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                    <ResizableTh columnKey="tipo">Tipo</ResizableTh>
                    <ResizableTh columnKey="entradas_previstas" className="text-right">Entradas previstas</ResizableTh>
                    <ResizableTh columnKey="saidas_previstas" className="text-right">Saidas previstas</ResizableTh>
                    <ResizableTh columnKey="saldo_previsto" className="text-right">Saldo previsto</ResizableTh>
                    <ResizableTh columnKey="saldo_realizado" className="text-right">Saldo realizado</ResizableTh>
                  </tr>
                </thead>
                <tbody>
                  {obrasResumo.length === 0 ? (
                    <EmptyRow colSpan={6} message="Nenhuma obra ou centro de custo encontrado para os filtros atuais." />
                  ) : (
                    obrasResumo.map((obra) => (
                      <tr key={obra.obra_id || obra.obra_nome}>
                        <td>
                          <div className="font-semibold text-[var(--c-text)]">{obra.obra_nome}</div>
                          {obra.obra_codigo ? <div className="text-xs text-[var(--c-muted)]">{obra.obra_codigo}</div> : null}
                        </td>
                        <td>{obra.tipo_centro_custo || '-'}</td>
                        <td className="text-right">{formatCurrency(obra.entradas_previstas)}</td>
                        <td className="text-right">{formatCurrency(obra.saidas_previstas)}</td>
                        <td className="text-right font-medium" style={{ color: Number(obra.saldo_previsto || 0) >= 0 ? '#15803d' : '#b91c1c' }}>
                          {formatCurrency(obra.saldo_previsto)}
                        </td>
                        <td className="text-right font-medium" style={{ color: Number(obra.saldo_realizado || 0) >= 0 ? '#15803d' : '#b91c1c' }}>
                          {formatCurrency(obra.saldo_realizado)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </ResizableTable>
            </div>
          </section>

          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Serie consolidada</h2>
              <p className="text-sm text-[var(--c-muted)]">
                Acompanha entradas, saidas e saldos por periodo.
              </p>
            </div>
            <div className="table-wrapper">
              <ResizableTable
                columns={SERIE_COLUMNS}
                storageKey="fluxy.financeiro.fluxoConsolidado.serie.columnWidths"
                className="table"
              >
                <thead>
                  <tr>
                    <ResizableTh columnKey="periodo">Periodo</ResizableTh>
                    <ResizableTh columnKey="entradas_previstas" className="text-right">Entradas previstas</ResizableTh>
                    <ResizableTh columnKey="saidas_previstas" className="text-right">Saidas previstas</ResizableTh>
                    <ResizableTh columnKey="saldo_previsto" className="text-right">Saldo previsto</ResizableTh>
                    <ResizableTh columnKey="entradas_realizadas" className="text-right">Entradas realizadas</ResizableTh>
                    <ResizableTh columnKey="saidas_realizadas" className="text-right">Saidas realizadas</ResizableTh>
                    <ResizableTh columnKey="saldo_realizado" className="text-right">Saldo realizado</ResizableTh>
                  </tr>
                </thead>
                <tbody>
                  {serie.length === 0 ? (
                    <EmptyRow colSpan={7} message="Nenhum periodo encontrado." />
                  ) : (
                    serie.map((item) => (
                      <tr key={item.referencia}>
                        <td className="font-semibold text-[var(--c-text)]">{item.label}</td>
                        <td className="text-right">{formatCurrency(item.entradas_previstas)}</td>
                        <td className="text-right">{formatCurrency(item.saidas_previstas)}</td>
                        <td className="text-right">{formatCurrency(item.saldo_previsto)}</td>
                        <td className="text-right">{formatCurrency(item.entradas_realizadas)}</td>
                        <td className="text-right">{formatCurrency(item.saidas_realizadas)}</td>
                        <td className="text-right">{formatCurrency(item.saldo_realizado)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </ResizableTable>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
