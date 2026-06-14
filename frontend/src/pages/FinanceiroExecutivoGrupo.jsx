import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { useUiVisibility } from '../hooks/useUiVisibility';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import {
  getRelatorioGrupoConsolidado,
  getResultadoObras
} from '../services/financeiro';

const DEFAULT_FILTERS = {
  periodo: 'MES_ATUAL',
  holding_id: '',
  excluir_intercompany: true
};

const EMPRESAS_CAIXA_COLUMNS = [
  { key: 'empresa', width: 250, minWidth: 180 },
  { key: 'entradas', width: 150, minWidth: 120 },
  { key: 'saidas', width: 150, minWidth: 120 },
  { key: 'saldo', width: 140, minWidth: 115 }
];

const RESULTADO_COLUMNS = [
  { key: 'nome', width: 220, minWidth: 160 },
  { key: 'resultado', width: 150, minWidth: 120 }
];

const INTERCOMPANY_COLUMNS = [
  { key: 'relacao', width: 280, minWidth: 180 },
  { key: 'valor', width: 140, minWidth: 115 }
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function metricColor(value) {
  return Number(value || 0) >= 0 ? '#15803d' : '#b91c1c';
}

function severityClass(severidade) {
  const normalized = String(severidade || '').toUpperCase();
  if (normalized === 'CRITICA') return 'bg-rose-100 text-rose-800';
  if (normalized === 'ALTA') return 'bg-amber-100 text-amber-800';
  if (normalized === 'MEDIA') return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-700';
}

function getFluxoPiso(serie = []) {
  if (!Array.isArray(serie) || serie.length === 0) return 0;
  return serie.reduce((min, item) => Math.min(min, Number(item.saldo_previsto || 0)), 0);
}

function Metric({ label, value, detail, color }) {
  return (
    <div className="app-summary-card">
      <span className="app-summary-label">{label}</span>
      <strong className="app-summary-value" style={{ color: color || 'var(--c-text)' }}>
        {value}
      </strong>
      {detail ? <span className="app-summary-subvalue">{detail}</span> : null}
    </div>
  );
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

export default function FinanceiroExecutivoGrupo() {
  const { isVisible } = useUiVisibility();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [empresas, setEmpresas] = useState([]);
  const [painel, setPainel] = useState(null);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getEmpresasGrupo({ ativo: true })
      .then((data) => {
        if (!active) return;
        setEmpresas(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!active) return;
        setEmpresas([]);
      })
      .finally(() => {
        if (active) setLoadingEmpresas(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const commonParams = {
      periodo: appliedFilters.periodo,
      holding_id: appliedFilters.holding_id,
      excluir_intercompany: appliedFilters.excluir_intercompany ? 'true' : 'false'
    };

    Promise.allSettled([
      getRelatorioGrupoConsolidado(commonParams),
      getResultadoObras()
    ])
      .then(([painelResult, obrasResult]) => {
        if (!active) return;

        setPainel(painelResult.status === 'fulfilled' ? painelResult.value : null);
        setObras(obrasResult.status === 'fulfilled' && Array.isArray(obrasResult.value) ? obrasResult.value : []);

        const failed = [painelResult, obrasResult].find((item) => item.status === 'rejected');
        setError(failed?.reason?.message || '');
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

  const executivoResumo = painel?.resumo || {};
  const dre = painel?.fontes?.dre || null;
  const fluxo = painel?.fontes?.fluxo || null;
  const intercompany = painel?.fontes?.intercompany || null;
  const empresasFluxo = Array.isArray(fluxo?.empresas) ? fluxo.empresas : [];
  const empresasDre = Array.isArray(dre?.empresas) ? dre.empresas : [];
  const relacoesIntercompany = Array.isArray(intercompany?.relacoes) ? intercompany.relacoes : [];
  const riscos = Array.isArray(painel?.riscos) ? painel.riscos : [];
  const dataInicial = painel?.filtro?.data_inicial || dre?.filtro?.data_inicial || fluxo?.filtro?.data_inicial || intercompany?.filtro?.data_inicial;
  const dataFinal = painel?.filtro?.data_final || dre?.filtro?.data_final || fluxo?.filtro?.data_final || intercompany?.filtro?.data_final;
  const periodoTexto = dataInicial && dataFinal ? `${formatDate(dataInicial)} ate ${formatDate(dataFinal)}` : '';
  const pisoCaixaPrevisto = executivoResumo.piso_caixa_previsto ?? getFluxoPiso(fluxo?.serie);
  const necessidadeCaixa = executivoResumo.necessidade_futura_caixa ?? Math.max(0, Math.abs(Math.min(0, pisoCaixaPrevisto)));
  const lucroLiquido = executivoResumo.lucro_prejuizo_liquido ?? dre?.resumo?.lucro_prejuizo_liquido ?? dre?.resumo?.resultado;

  const topEmpresasCaixa = empresasFluxo.slice(0, 6);
  const topEmpresasResultado = empresasDre
    .slice()
    .sort((a, b) => Number(a.resultado || 0) - Number(b.resultado || 0))
    .slice(0, 6);
  const topObras = obras
    .map((obra) => ({
      ...obra,
      resultado_caixa: Number(obra?.receber?.recebido || 0) - Number(obra?.pagar?.executado || 0)
    }))
    .sort((a, b) => Number(a.resultado_caixa || 0) - Number(b.resultado_caixa || 0))
    .slice(0, 6);

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value
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
            <h1 className="text-xl font-semibold md:text-2xl">Grupo Consolidado</h1>
            <p className="page-subtitle">
              Painel executivo com DRE, caixa, movimentos entre empresas e obras em uma unica leitura.
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
        <div className="grid gap-3 md:grid-cols-3">
          <label className="app-filter-field">
            <span className="app-filter-label">Periodo</span>
            <select className="input w-full input-sm" value={filters.periodo} onChange={(event) => updateFilter('periodo', event.target.value)}>
              <option value="MES_ATUAL">Mes atual</option>
              <option value="PROXIMO_MES">Proximo mes</option>
              <option value="HOJE">Hoje</option>
              <option value="30_DIAS">30 dias</option>
              <option value="90_DIAS">90 dias</option>
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Holding</span>
            <select className="input w-full input-sm" value={filters.holding_id} disabled={loadingEmpresas} onChange={(event) => updateFilter('holding_id', event.target.value)}>
              <option value="">Todas</option>
              {holdings.map((holding) => (
                <option key={holding.id} value={holding.id}>{holding.nome}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text)]">
            <input type="checkbox" checked={filters.excluir_intercompany} onChange={(event) => updateFilter('excluir_intercompany', event.target.checked)} />
            Eliminar entre empresas no consolidado
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--c-muted)]">
            {periodoTexto || 'Use esta tela como porta de entrada executiva. Os detalhes ficam nos relatorios vinculados.'}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar</button>
            <button type="submit" className="btn btn-primary btn-sm">Atualizar painel</button>
          </div>
        </div>
      </form>

      {error ? (
        <div className="app-alert app-alert--warning">
          Parte dos dados nao foi carregada: {error}
        </div>
      ) : null}

      {isVisible('financeiro.grupo_consolidado.metricas') ? (
        <div className="app-summary-grid">
          <Metric
            label="Caixa consolidado realizado"
            value={formatCurrency(executivoResumo.caixa_realizado)}
            detail={`${fluxo?.resumo?.movimentos_realizados || 0} baixa(s) no periodo`}
            color={metricColor(executivoResumo.caixa_realizado)}
          />
          <Metric
            label="EBITDA"
            value={formatCurrency(executivoResumo.ebitda)}
            detail={`Margem ${formatPercent(executivoResumo.margem_ebitda)}`}
            color={metricColor(executivoResumo.ebitda)}
          />
          <Metric
            label="Lucro/Prejuizo liquido"
            value={formatCurrency(lucroLiquido)}
            detail={Number(lucroLiquido || 0) >= 0 ? 'Geracao patrimonial' : 'Consumo patrimonial'}
            color={metricColor(lucroLiquido)}
          />
          <Metric
            label="Necessidade futura de caixa"
            value={formatCurrency(necessidadeCaixa)}
            detail={`Piso previsto ${formatCurrency(pisoCaixaPrevisto)}`}
            color={necessidadeCaixa > 0 ? '#b91c1c' : '#15803d'}
          />
          <Metric
            label="Entre Empresas eliminado"
            value={formatCurrency(executivoResumo.intercompany_eliminado)}
            detail={`${intercompany?.resumo?.relacoes_empresas || 0} relacao(oes) entre empresas`}
          />
          <Metric
            label="Endividamento aberto"
            value={formatCurrency(executivoResumo.endividamento_aberto)}
            detail={`${painel?.fontes?.endividamento?.resumo?.titulos || 0} titulo(s) classificados`}
            color={Number(executivoResumo.endividamento_aberto || 0) > 0 ? '#b91c1c' : '#15803d'}
          />
          <Metric
            label="Saldo previsto"
            value={formatCurrency(executivoResumo.saldo_previsto)}
            detail="Entradas previstas menos saidas previstas"
            color={metricColor(executivoResumo.saldo_previsto)}
          />
          <Metric
            label="Pendencias de consistencia"
            value={String(executivoResumo.pendencias_dados || 0)}
            detail={`${executivoResumo.pendencias_criticas || 0} critica(s), ${executivoResumo.pendencias_altas || 0} alta(s)`}
            color={Number(executivoResumo.pendencias_criticas || 0) > 0 ? '#b91c1c' : Number(executivoResumo.pendencias_altas || 0) > 0 ? '#b45309' : '#15803d'}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="app-empty-card">Carregando painel executivo...</div>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-3">
            {isVisible('financeiro.grupo_consolidado.caixa_empresas') ? (
            <div className="card sol-surface-card app-table-shell xl:col-span-2">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Empresas por caixa realizado</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Usa a empresa informada na baixa financeira.
                </p>
              </div>
              <div className="table-wrapper">
                <ResizableTable
                  columns={EMPRESAS_CAIXA_COLUMNS}
                  storageKey="fluxy.financeiro.grupoConsolidado.empresasCaixa.columnWidths"
                  className="table"
                >
                  <thead>
                    <tr>
                      <ResizableTh columnKey="empresa">Empresa</ResizableTh>
                      <ResizableTh columnKey="entradas" className="text-right">Entradas</ResizableTh>
                      <ResizableTh columnKey="saidas" className="text-right">Saidas</ResizableTh>
                      <ResizableTh columnKey="saldo" className="text-right">Saldo</ResizableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {topEmpresasCaixa.length === 0 ? (
                      <EmptyRow colSpan={4} message="Nenhuma empresa com movimento realizado no periodo." />
                    ) : (
                      topEmpresasCaixa.map((empresa) => (
                        <tr key={empresa.empresa_id || empresa.empresa_nome}>
                          <td className="font-semibold text-[var(--c-text)]">{empresa.empresa_nome}</td>
                          <td className="text-right">{formatCurrency(empresa.entradas_realizadas)}</td>
                          <td className="text-right">{formatCurrency(empresa.saidas_realizadas)}</td>
                          <td className="text-right font-semibold" style={{ color: metricColor(empresa.saldo_realizado) }}>
                            {formatCurrency(empresa.saldo_realizado)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </ResizableTable>
              </div>
            </div>
            ) : null}

            {isVisible('financeiro.grupo_consolidado.riscos') ? (
            <div className="card sol-surface-card">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Leitura executiva</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Riscos calculados pelo backend com base nos dados reais cadastrados.
                </p>
              </div>
              <div className="space-y-3 p-4 text-sm text-[var(--c-text)]">
                {riscos.length === 0 ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                    Nenhum risco executivo automatico encontrado para os filtros atuais. Ainda assim, valide a DRE e o diagnostico antes de fechamento oficial.
                  </div>
                ) : (
                  riscos.slice(0, 5).map((risco) => (
                    <div key={risco.codigo} className="rounded-lg border border-[var(--c-border)] p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <strong>{risco.titulo}</strong>
                        <span className={`app-status-pill ${severityClass(risco.severidade)}`}>{risco.severidade}</span>
                      </div>
                      <p className="text-[var(--c-muted)]">{risco.descricao}</p>
                      {risco.valor !== null && risco.valor !== undefined ? (
                        <p className="mt-2 font-semibold text-[var(--c-text)]">
                          {typeof risco.valor === 'number' ? formatCurrency(risco.valor) : risco.valor}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-[var(--c-muted)]">{risco.acao_recomendada}</p>
                      {risco.rota ? (
                        <Link to={risco.rota} className="mt-3 inline-flex text-xs font-semibold text-[var(--c-primary)]">
                          Abrir detalhe
                        </Link>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
            ) : null}
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            {isVisible('financeiro.grupo_consolidado.resultado_empresas') ? (
            <div className="card sol-surface-card app-table-shell">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Resultado por empresa</h2>
                <p className="text-sm text-[var(--c-muted)]">Ordenado pelas empresas com menor resultado liquido.</p>
              </div>
              <div className="table-wrapper">
                <ResizableTable
                  columns={RESULTADO_COLUMNS}
                  storageKey="fluxy.financeiro.grupoConsolidado.resultadoEmpresas.columnWidths"
                  className="table"
                >
                  <thead>
                    <tr>
                      <ResizableTh columnKey="nome">Empresa</ResizableTh>
                      <ResizableTh columnKey="resultado" className="text-right">Resultado</ResizableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {topEmpresasResultado.length === 0 ? (
                      <EmptyRow colSpan={2} message="Nenhuma empresa na DRE do periodo." />
                    ) : (
                      topEmpresasResultado.map((empresa) => (
                        <tr key={empresa.empresa_id || empresa.empresa_nome}>
                          <td className="font-semibold text-[var(--c-text)]">{empresa.empresa_nome}</td>
                          <td className="text-right font-semibold" style={{ color: metricColor(empresa.resultado) }}>
                            {formatCurrency(empresa.resultado)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </ResizableTable>
              </div>
            </div>
            ) : null}

            {isVisible('financeiro.grupo_consolidado.resultado_obras') ? (
            <div className="card sol-surface-card app-table-shell">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Obras por caixa</h2>
                <p className="text-sm text-[var(--c-muted)]">Recebido menos executado na base atual de obras.</p>
              </div>
              <div className="table-wrapper">
                <ResizableTable
                  columns={RESULTADO_COLUMNS}
                  storageKey="fluxy.financeiro.grupoConsolidado.resultadoObras.columnWidths"
                  className="table"
                >
                  <thead>
                    <tr>
                      <ResizableTh columnKey="nome">Obra</ResizableTh>
                      <ResizableTh columnKey="resultado" className="text-right">Resultado</ResizableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {topObras.length === 0 ? (
                      <EmptyRow colSpan={2} message="Nenhuma obra encontrada." />
                    ) : (
                      topObras.map((obra) => (
                        <tr key={obra.id}>
                          <td className="font-semibold text-[var(--c-text)]">{obra.nome}</td>
                          <td className="text-right font-semibold" style={{ color: metricColor(obra.resultado_caixa) }}>
                            {formatCurrency(obra.resultado_caixa)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </ResizableTable>
              </div>
            </div>
            ) : null}

            {isVisible('financeiro.grupo_consolidado.intercompany') ? (
            <div className="card sol-surface-card app-table-shell">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Maiores relacoes internas</h2>
                <p className="text-sm text-[var(--c-muted)]">Origem e destino de movimentos entre empresas.</p>
              </div>
              <div className="table-wrapper">
                <ResizableTable
                  columns={INTERCOMPANY_COLUMNS}
                  storageKey="fluxy.financeiro.grupoConsolidado.intercompany.columnWidths"
                  className="table"
                >
                  <thead>
                    <tr>
                      <ResizableTh columnKey="relacao">Relacao</ResizableTh>
                      <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {relacoesIntercompany.slice(0, 6).length === 0 ? (
                      <EmptyRow colSpan={2} message="Nenhuma relacao entre empresas no periodo." />
                    ) : (
                      relacoesIntercompany.slice(0, 6).map((relacao) => (
                        <tr key={`${relacao.empresa_origem_id || 'origem'}-${relacao.empresa_destino_id || 'destino'}`}>
                          <td className="font-semibold text-[var(--c-text)]">
                            {relacao.empresa_origem_nome}{' -> '}{relacao.empresa_destino_nome}
                          </td>
                          <td className="text-right">{formatCurrency(relacao.valor_realizado || relacao.valor_previsto)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </ResizableTable>
              </div>
            </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
