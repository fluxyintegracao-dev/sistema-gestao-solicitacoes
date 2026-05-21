import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import {
  getDreFinanceira,
  getRelatorioEndividamentoFinanceiro,
  getRelatorioFluxoConsolidado,
  getRelatorioIntercompanyFinanceiro,
  getResultadoObras
} from '../services/financeiro';

const DEFAULT_FILTERS = {
  periodo: 'MES_ATUAL',
  holding_id: '',
  excluir_intercompany: true
};

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
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [empresas, setEmpresas] = useState([]);
  const [dre, setDre] = useState(null);
  const [fluxo, setFluxo] = useState(null);
  const [intercompany, setIntercompany] = useState(null);
  const [endividamento, setEndividamento] = useState(null);
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
      getDreFinanceira(commonParams),
      getRelatorioFluxoConsolidado(commonParams),
      getRelatorioIntercompanyFinanceiro({
        periodo: appliedFilters.periodo,
        holding_id: appliedFilters.holding_id,
        elimina_consolidado: appliedFilters.excluir_intercompany ? 'true' : ''
      }),
      getRelatorioEndividamentoFinanceiro(commonParams),
      getResultadoObras()
    ])
      .then(([dreResult, fluxoResult, intercompanyResult, endividamentoResult, obrasResult]) => {
        if (!active) return;

        setDre(dreResult.status === 'fulfilled' ? dreResult.value : null);
        setFluxo(fluxoResult.status === 'fulfilled' ? fluxoResult.value : null);
        setIntercompany(intercompanyResult.status === 'fulfilled' ? intercompanyResult.value : null);
        setEndividamento(endividamentoResult.status === 'fulfilled' ? endividamentoResult.value : null);
        setObras(obrasResult.status === 'fulfilled' && Array.isArray(obrasResult.value) ? obrasResult.value : []);

        const failed = [dreResult, fluxoResult, intercompanyResult, endividamentoResult, obrasResult].find((item) => item.status === 'rejected');
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

  const dreResumo = dre?.resumo || {};
  const fluxoResumo = fluxo?.resumo || {};
  const intercompanyResumo = intercompany?.resumo || {};
  const endividamentoResumo = endividamento?.resumo || {};
  const empresasFluxo = Array.isArray(fluxo?.empresas) ? fluxo.empresas : [];
  const empresasDre = Array.isArray(dre?.empresas) ? dre.empresas : [];
  const relacoesIntercompany = Array.isArray(intercompany?.relacoes) ? intercompany.relacoes : [];
  const dataInicial = dre?.filtro?.data_inicial || fluxo?.filtro?.data_inicial || intercompany?.filtro?.data_inicial;
  const dataFinal = dre?.filtro?.data_final || fluxo?.filtro?.data_final || intercompany?.filtro?.data_final;
  const periodoTexto = dataInicial && dataFinal ? `${formatDate(dataInicial)} ate ${formatDate(dataFinal)}` : '';
  const pisoCaixaPrevisto = getFluxoPiso(fluxo?.serie);
  const necessidadeCaixa = Math.max(0, Math.abs(Math.min(0, pisoCaixaPrevisto)));
  const lucroLiquido = dreResumo.lucro_prejuizo_liquido ?? dreResumo.resultado;

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
              Painel executivo com DRE, caixa, intercompany e obras em uma unica leitura.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/relatorios/fluxo-consolidado" className="btn btn-outline">
              Fluxo Consolidado
            </Link>
            <Link to="/financeiro/relatorios/dre" className="btn btn-outline">
              DRE
            </Link>
            <Link to="/financeiro/relatorios/intercompany" className="btn btn-outline">
              Intercompany
            </Link>
            <Link to="/financeiro/relatorios/endividamento" className="btn btn-outline">
              Endividamento
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
            Eliminar intercompany no consolidado
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

      <div className="app-summary-grid">
        <Metric
          label="Caixa consolidado realizado"
          value={formatCurrency(fluxoResumo.saldo_realizado)}
          detail={`${fluxoResumo.movimentos_realizados || 0} baixa(s) no periodo`}
          color={metricColor(fluxoResumo.saldo_realizado)}
        />
        <Metric
          label="EBITDA"
          value={formatCurrency(dreResumo.ebitda)}
          detail={`Margem ${formatPercent(dreResumo.margem_ebitda)}`}
          color={metricColor(dreResumo.ebitda)}
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
          label="Intercompany eliminado"
          value={formatCurrency(intercompanyResumo.valor_eliminado_consolidado)}
          detail={`${intercompanyResumo.relacoes_empresas || 0} relacao(oes) entre empresas`}
        />
        <Metric
          label="Endividamento aberto"
          value={formatCurrency(endividamentoResumo.saldo_total)}
          detail={`${endividamentoResumo.titulos || 0} titulo(s) classificados`}
          color={Number(endividamentoResumo.saldo_total || 0) > 0 ? '#b91c1c' : '#15803d'}
        />
        <Metric
          label="Saldo previsto"
          value={formatCurrency(fluxoResumo.saldo_previsto)}
          detail="Entradas previstas menos saidas previstas"
          color={metricColor(fluxoResumo.saldo_previsto)}
        />
      </div>

      {loading ? (
        <div className="app-empty-card">Carregando painel executivo...</div>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-3">
            <div className="card sol-surface-card app-table-shell xl:col-span-2">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Empresas por caixa realizado</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Usa a empresa informada na baixa financeira.
                </p>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Entradas</th>
                      <th>Saidas</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEmpresasCaixa.length === 0 ? (
                      <EmptyRow colSpan={4} message="Nenhuma empresa com movimento realizado no periodo." />
                    ) : (
                      topEmpresasCaixa.map((empresa) => (
                        <tr key={empresa.empresa_id || empresa.empresa_nome}>
                          <td className="font-semibold text-[var(--c-text)]">{empresa.empresa_nome}</td>
                          <td>{formatCurrency(empresa.entradas_realizadas)}</td>
                          <td>{formatCurrency(empresa.saidas_realizadas)}</td>
                          <td className="font-semibold" style={{ color: metricColor(empresa.saldo_realizado) }}>
                            {formatCurrency(empresa.saldo_realizado)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card sol-surface-card">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Leitura executiva</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Sinais que pedem atencao na reuniao de diretoria.
                </p>
              </div>
              <div className="space-y-3 p-4 text-sm text-[var(--c-text)]">
                <div className="rounded-lg border border-[var(--c-border)] p-3">
                  <strong>Resultado:</strong>{' '}
                  {Number(lucroLiquido || 0) >= 0
                    ? 'o periodo esta gerando patrimonio na visao DRE.'
                    : 'o periodo esta consumindo patrimonio na visao DRE.'}
                </div>
                <div className="rounded-lg border border-[var(--c-border)] p-3">
                  <strong>Caixa:</strong>{' '}
                  {necessidadeCaixa > 0
                    ? `ha necessidade minima projetada de ${formatCurrency(necessidadeCaixa)}.`
                    : 'nao ha piso negativo no fluxo previsto do periodo.'}
                </div>
                <div className="rounded-lg border border-[var(--c-border)] p-3">
                  <strong>Intercompany:</strong>{' '}
                  {Number(intercompanyResumo.valor_eliminado_consolidado || 0) > 0
                    ? 'existem movimentos internos eliminados da visao consolidada.'
                    : 'nao ha valor intercompany eliminado para os filtros atuais.'}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="card sol-surface-card app-table-shell">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Resultado por empresa</h2>
                <p className="text-sm text-[var(--c-muted)]">Ordenado pelas empresas com menor resultado liquido.</p>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEmpresasResultado.length === 0 ? (
                      <EmptyRow colSpan={2} message="Nenhuma empresa na DRE do periodo." />
                    ) : (
                      topEmpresasResultado.map((empresa) => (
                        <tr key={empresa.empresa_id || empresa.empresa_nome}>
                          <td className="font-semibold text-[var(--c-text)]">{empresa.empresa_nome}</td>
                          <td className="font-semibold" style={{ color: metricColor(empresa.resultado) }}>
                            {formatCurrency(empresa.resultado)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card sol-surface-card app-table-shell">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Obras por caixa</h2>
                <p className="text-sm text-[var(--c-muted)]">Recebido menos executado na base atual de obras.</p>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Obra</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topObras.length === 0 ? (
                      <EmptyRow colSpan={2} message="Nenhuma obra encontrada." />
                    ) : (
                      topObras.map((obra) => (
                        <tr key={obra.id}>
                          <td className="font-semibold text-[var(--c-text)]">{obra.nome}</td>
                          <td className="font-semibold" style={{ color: metricColor(obra.resultado_caixa) }}>
                            {formatCurrency(obra.resultado_caixa)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card sol-surface-card app-table-shell">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Maiores relacoes internas</h2>
                <p className="text-sm text-[var(--c-muted)]">Origem e destino de movimentos intercompany.</p>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Relacao</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relacoesIntercompany.slice(0, 6).length === 0 ? (
                      <EmptyRow colSpan={2} message="Nenhuma relacao intercompany no periodo." />
                    ) : (
                      relacoesIntercompany.slice(0, 6).map((relacao) => (
                        <tr key={`${relacao.empresa_origem_id || 'origem'}-${relacao.empresa_destino_id || 'destino'}`}>
                          <td className="font-semibold text-[var(--c-text)]">
                            {relacao.empresa_origem_nome}{' -> '}{relacao.empresa_destino_nome}
                          </td>
                          <td>{formatCurrency(relacao.valor_realizado || relacao.valor_previsto)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
