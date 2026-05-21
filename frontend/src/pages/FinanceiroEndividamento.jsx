import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import { getRelatorioEndividamentoFinanceiro } from '../services/financeiro';
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

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function Metric({ label, value, detail, critical = false }) {
  return (
    <div className="app-summary-card">
      <span className="app-summary-label">{label}</span>
      <strong className="app-summary-value" style={{ color: critical ? '#b91c1c' : 'var(--c-text)' }}>
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

export default function FinanceiroEndividamento() {
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

    getRelatorioEndividamentoFinanceiro({
      ...appliedFilters,
      excluir_intercompany: appliedFilters.excluir_intercompany ? 'true' : 'false',
      limit: 500
    })
      .then((data) => {
        if (!active) return;
        setRelatorio(data || null);
      })
      .catch((err) => {
        if (!active) return;
        setRelatorio(null);
        setError(err?.message || 'Erro ao carregar endividamento gerencial');
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
  const empresasResumo = Array.isArray(relatorio?.empresas) ? relatorio.empresas : [];
  const categoriasResumo = Array.isArray(relatorio?.categorias) ? relatorio.categorias : [];
  const titulos = Array.isArray(relatorio?.titulos) ? relatorio.titulos : [];
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
            <h1 className="text-xl font-semibold md:text-2xl">Endividamento Gerencial</h1>
            <p className="page-subtitle">
              Titulos a pagar em aberto classificados explicitamente como endividamento.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/relatorios" className="btn btn-outline">
              Voltar aos relatorios
            </Link>
            <Link to="/financeiro/cadastros" className="btn btn-outline">
              Classificar categorias
            </Link>
            <Link to="/financeiro/relatorios/grupo-consolidado" className="btn btn-outline">
              Grupo Consolidado
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
            <span className="app-filter-label">Obra/Centro de custo</span>
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
            Eliminar intercompany no consolidado
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar</button>
            <button type="submit" className="btn btn-primary btn-sm">Atualizar relatorio</button>
          </div>
        </div>
      </form>

      {error ? <div className="app-alert app-alert--warning">{error}</div> : null}

      <div className="app-summary-grid">
        <Metric label="Endividamento aberto" value={formatCurrency(resumo.saldo_total)} detail={`${resumo.titulos || 0} titulo(s)`} critical={Number(resumo.saldo_total || 0) > 0} />
        <Metric label="Saldo vencido" value={formatCurrency(resumo.saldo_vencido)} detail="Titulos com vencimento anterior a hoje" critical={Number(resumo.saldo_vencido || 0) > 0} />
        <Metric label="Vence no periodo" value={formatCurrency(resumo.saldo_periodo)} detail={periodoTexto || 'Periodo selecionado'} />
        <Metric label="Vence em 30 dias" value={formatCurrency(resumo.saldo_30_dias)} detail="Compromisso de curto prazo" />
        <Metric label="Valor original" value={formatCurrency(resumo.valor_original_total)} detail="Principal classificado como divida" />
        <Metric label="Valor baixado" value={formatCurrency(resumo.valor_baixado_total)} detail="Amortizacao ja registrada" />
      </div>

      {loading ? (
        <div className="app-empty-card">Carregando endividamento...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Por empresa</h2>
              <p className="text-sm text-[var(--c-muted)]">Saldo aberto por empresa do titulo.</p>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Titulos</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {empresasResumo.length === 0 ? (
                    <EmptyRow colSpan={3} message="Nenhuma empresa com divida classificada." />
                  ) : (
                    empresasResumo.map((empresa) => (
                      <tr key={empresa.empresa_id || empresa.empresa_nome}>
                        <td className="font-semibold text-[var(--c-text)]">{empresa.empresa_nome}</td>
                        <td>{empresa.titulos}</td>
                        <td className="font-semibold">{formatCurrency(empresa.saldo_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Por categoria</h2>
              <p className="text-sm text-[var(--c-muted)]">Apenas categorias marcadas como Endividamento.</p>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Titulos</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {categoriasResumo.length === 0 ? (
                    <EmptyRow colSpan={3} message="Nenhuma categoria classificada como endividamento." />
                  ) : (
                    categoriasResumo.map((categoria) => (
                      <tr key={categoria.categoria_id || categoria.categoria_nome}>
                        <td className="font-semibold text-[var(--c-text)]">{categoria.categoria_nome}</td>
                        <td>{categoria.titulos}</td>
                        <td className="font-semibold">{formatCurrency(categoria.saldo_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card sol-surface-card app-table-shell xl:col-span-3">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Titulos classificados</h2>
              <p className="text-sm text-[var(--c-muted)]">
                A origem do numero e a classificacao gerencial da categoria financeira, sem leitura por texto livre.
              </p>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Titulo</th>
                    <th>Empresa</th>
                    <th>Categoria</th>
                    <th>Parceiro</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {titulos.length === 0 ? (
                    <EmptyRow colSpan={6} message="Nenhum titulo de endividamento encontrado para os filtros." />
                  ) : (
                    titulos.map((titulo) => (
                      <tr key={titulo.id}>
                        <td className={titulo.vencido ? 'font-semibold text-red-700' : ''}>{formatDate(titulo.data_vencimento)}</td>
                        <td>
                          <div className="font-semibold text-[var(--c-text)]">{titulo.codigo || `Titulo #${titulo.id}`}</div>
                          <div className="text-xs text-[var(--c-muted)]">{titulo.descricao || titulo.numero_documento || '-'}</div>
                        </td>
                        <td>{titulo.empresa_nome}</td>
                        <td>{titulo.categoria_nome}</td>
                        <td>{titulo.parceiro_nome || '-'}</td>
                        <td className="font-semibold">{formatCurrency(titulo.valor_saldo)}</td>
                      </tr>
                    ))
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
