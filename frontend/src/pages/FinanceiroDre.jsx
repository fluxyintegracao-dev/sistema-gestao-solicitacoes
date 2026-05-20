import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import { getDreFinanceira } from '../services/financeiro';
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

export default function FinanceiroDre() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [empresas, setEmpresas] = useState([]);
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(true);
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
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getDreFinanceira({
      ...appliedFilters,
      excluir_intercompany: appliedFilters.excluir_intercompany ? 'true' : 'false'
    })
      .then((data) => {
        if (!active) return;
        setRelatorio(data || null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar DRE');
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

  const resumo = relatorio?.resumo || {};
  const resultadoPositivo = Number(resumo.resultado || 0) >= 0;

  return (
    <div className="page solicitacoes-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">DRE Gerencial</h1>
            <p className="page-subtitle">
              Resultado por competencia da Holding, empresas, obras e centros de custo.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/relatorios" className="btn btn-outline">
              Voltar aos relatorios
            </Link>
            <Link to="/financeiro/cadastros" className="btn btn-outline">
              Categorias DRE
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
            <select className="input w-full input-sm" value={filters.holding_id} onChange={(event) => updateFilter('holding_id', event.target.value)}>
              <option value="">Todas</option>
              {holdings.map((holding) => (
                <option key={holding.id} value={holding.id}>{holding.nome}</option>
              ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Empresa</span>
            <select className="input w-full input-sm" value={filters.empresa_id} onChange={(event) => updateFilter('empresa_id', event.target.value)}>
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
            <select className="input w-full input-sm" value={filters.obra_id} onChange={(event) => updateFilter('obra_id', event.target.value)}>
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
            Excluir movimentacoes intercompany
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar</button>
            <button type="submit" className="btn btn-primary btn-sm">Atualizar DRE</button>
          </div>
        </div>
      </form>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}

      <div className="app-summary-grid">
        <div className="app-summary-card">
          <span className="app-summary-label">Receitas</span>
          <strong className="app-summary-value">{formatCurrency(resumo.receitas)}</strong>
          <span className="app-summary-subvalue">Competencia do periodo</span>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Custos e despesas</span>
          <strong className="app-summary-value">{formatCurrency(resumo.despesas)}</strong>
          <span className="app-summary-subvalue">Valores que reduzem resultado</span>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Resultado</span>
          <strong className="app-summary-value" style={{ color: resultadoPositivo ? '#15803d' : '#b91c1c' }}>
            {formatCurrency(resumo.resultado)}
          </strong>
          <span className="app-summary-subvalue">{resultadoPositivo ? 'Gerando patrimonio' : 'Destruindo patrimonio'}</span>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Margem</span>
          <strong className="app-summary-value">{formatPercent(resumo.margem_resultado)}</strong>
          <span className="app-summary-subvalue">{resumo.empresas_com_movimento || 0} empresa(s) com movimento</span>
        </div>
      </div>

      {loading ? (
        <div className="app-empty-card">Carregando DRE...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr,1.2fr]">
          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">DRE por linha gerencial</h2>
              <p className="text-sm text-[var(--c-muted)]">
                {formatDate(relatorio?.filtro?.data_inicial)} ate {formatDate(relatorio?.filtro?.data_final)}
              </p>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Titulos</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {(relatorio?.linhas || []).length ? (relatorio.linhas.map((linha) => (
                    <tr key={linha.grupo}>
                      <td className="font-medium text-[var(--c-text)]">{linha.grupo}</td>
                      <td>{linha.titulos}</td>
                      <td className="font-semibold" style={{ color: Number(linha.valor || 0) >= 0 ? '#15803d' : '#b91c1c' }}>
                        {formatCurrency(linha.valor)}
                      </td>
                    </tr>
                  ))) : (
                    <tr><td colSpan={3} className="text-center text-[var(--c-muted)]">Nenhum titulo encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Resultado por empresa</h2>
              <p className="text-sm text-[var(--c-muted)]">Visao isolada para comparar empresas abaixo da Holding.</p>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Receitas</th>
                    <th>Custos/Despesas</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {(relatorio?.empresas || []).length ? (relatorio.empresas.map((empresa) => (
                    <tr key={empresa.empresa_id || 'sem-empresa'}>
                      <td className="font-medium text-[var(--c-text)]">{empresa.empresa_nome}</td>
                      <td>{formatCurrency(empresa.receitas)}</td>
                      <td>{formatCurrency(empresa.despesas)}</td>
                      <td className="font-semibold" style={{ color: Number(empresa.resultado || 0) >= 0 ? '#15803d' : '#b91c1c' }}>
                        {formatCurrency(empresa.resultado)}
                      </td>
                    </tr>
                  ))) : (
                    <tr><td colSpan={4} className="text-center text-[var(--c-muted)]">Nenhuma empresa com movimento.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
