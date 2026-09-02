import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TabelaPadrao } from '../components/padrao';
import { useUiVisibility } from '../hooks/useUiVisibility';
import { getObras } from '../services/obras';
import { getRhEmpresasGrupo, getRhRelatorioOperacional } from '../services/rhDp';

const DEFAULT_FILTERS = {
  periodo: 'MES_ATUAL',
  data_inicial: '',
  data_final: '',
  empresa_grupo_id: '',
  obra_id: '',
  tipo_vinculo: '',
  status: ''
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

function statusColor(value) {
  const normalized = String(value || '').toUpperCase();
  if (['ATIVO', 'CONFERIDO', 'VALIDO'].includes(normalized)) return 'text-emerald-700 bg-emerald-50';
  if (['A_VENCER', 'AFASTADO'].includes(normalized)) return 'text-amber-700 bg-amber-50';
  if (['VENCIDO', 'REJEITADO', 'INATIVO'].includes(normalized)) return 'text-rose-700 bg-rose-50';
  return 'text-slate-700 bg-slate-100';
}

function Metric({ label, value, detail, tone = 'default' }) {
  const color = {
    danger: '#b91c1c',
    warning: '#b45309',
    success: '#15803d',
    default: 'var(--c-text)'
  }[tone] || 'var(--c-text)';

  return (
    <div className="app-summary-card">
      <span className="app-summary-label">{label}</span>
      <strong className="app-summary-value" style={{ color }}>{value}</strong>
      {detail ? <span className="app-summary-subvalue">{detail}</span> : null}
    </div>
  );
}

function DistributionList({ title, rows, valueKey = 'total', formatter = (value) => value }) {
  const max = Math.max(...(rows || []).map((row) => Number(row[valueKey] || 0)), 0);

  return (
    <section className="card sol-surface-card p-4">
      <h2 className="text-base font-semibold text-[var(--c-text)]">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows?.length ? rows.slice(0, 8).map((row) => {
          const value = Number(row[valueKey] || 0);
          const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
          return (
            <div key={`${title}-${row.nome}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-[var(--c-text)]">{row.nome}</span>
                <span className="font-semibold text-[var(--c-text)]">{formatter(row[valueKey])}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--c-bg-subtle)]">
                <div className="h-full rounded-full bg-[var(--c-primary)]" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        }) : (
          <p className="text-sm text-[var(--c-muted)]">Sem dados para o recorte.</p>
        )}
      </div>
    </section>
  );
}

export default function RhDpRelatorioOperacional() {
  const { isVisible } = useUiVisibility();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [empresas, setEmpresas] = useState([]);
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getRhEmpresasGrupo({ ativo: true }),
      getObras({ ativo: true })
    ]).then(([empresasResult, obrasResult]) => {
      if (!active) return;
      setEmpresas(empresasResult.status === 'fulfilled' && Array.isArray(empresasResult.value) ? empresasResult.value : []);
      setObras(obrasResult.status === 'fulfilled' && Array.isArray(obrasResult.value) ? obrasResult.value : []);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getRhRelatorioOperacional(appliedFilters)
      .then((data) => {
        if (active) setRelatorio(data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Erro ao carregar relatorio RH/DP');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const resumo = relatorio?.resumo || {};
  const colaboradores = relatorio?.colaboradores || {};
  const documentos = relatorio?.documentos || {};
  const periodoTexto = relatorio?.filtro?.data_inicial && relatorio?.filtro?.data_final
    ? `${formatDate(relatorio.filtro.data_inicial)} ate ${formatDate(relatorio.filtro.data_final)}`
    : '';

  const docCriticos = useMemo(() => documentos.criticos || [], [documentos]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
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
    <div className="page solicitacoes-page rhdp-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Relatorio Operacional RH/DP</h1>
            <p className="page-subtitle">
              Colaboradores, documentos, apuracoes e fechamentos com base nos cadastros reais do modulo.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/rh-dp/colaboradores" className="btn btn-outline">Colaboradores</Link>
            <Link to="/rh-dp/documentos" className="btn btn-outline">Documentos</Link>
            <Link to="/rh-dp/apuracao" className="btn btn-outline">Apuracao</Link>
          </div>
        </div>
      </div>

      <form className="card sol-surface-card" onSubmit={aplicarFiltros}>
        <div className="grid gap-3 lg:grid-cols-6">
          <label className="app-filter-field">
            <span className="app-filter-label">Periodo</span>
            <select className="input input-sm" value={filters.periodo} onChange={(event) => updateFilter('periodo', event.target.value)}>
              <option value="MES_ATUAL">Mes atual</option>
              <option value="30_DIAS">30 dias</option>
              <option value="90_DIAS">90 dias</option>
              <option value="ANO_ATUAL">Ano atual</option>
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Data inicial</span>
            <input className="input input-sm" type="date" value={filters.data_inicial} onChange={(event) => updateFilter('data_inicial', event.target.value)} />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Data final</span>
            <input className="input input-sm" type="date" value={filters.data_final} onChange={(event) => updateFilter('data_final', event.target.value)} />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Empresa</span>
            <select className="input input-sm" value={filters.empresa_grupo_id} onChange={(event) => updateFilter('empresa_grupo_id', event.target.value)}>
              <option value="">Todas</option>
              {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Obra/Centro</span>
            <select className="input input-sm" value={filters.obra_id} onChange={(event) => updateFilter('obra_id', event.target.value)}>
              <option value="">Todos</option>
              {obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Status</span>
            <select className="input input-sm" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Todos</option>
              <option value="ATIVO">Ativo</option>
              <option value="AFASTADO">Afastado</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--c-muted)]">{periodoTexto || 'Use as datas para recorte personalizado.'}</span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar</button>
            <button type="submit" className="btn btn-primary btn-sm">Atualizar relatorio</button>
          </div>
        </div>
      </form>

      {error ? <div className="app-alert app-alert--warning">{error}</div> : null}

      {loading ? (
        <div className="app-empty-card">Carregando relatorio RH/DP...</div>
      ) : (
        <>
          {isVisible('rhdp.relatorio_operacional.metricas') ? (
          <div className="app-summary-grid">
            <Metric label="Colaboradores ativos" value={resumo.colaboradores_ativos || 0} detail={`${resumo.colaboradores_total || 0} no recorte`} tone="success" />
            <Metric label="Afastados" value={resumo.colaboradores_afastados || 0} detail="Status cadastral atual" tone={resumo.colaboradores_afastados > 0 ? 'warning' : 'default'} />
            <Metric label="Documentos vencidos" value={resumo.documentos_vencidos || 0} detail={`${resumo.documentos_a_vencer || 0} a vencer`} tone={resumo.documentos_vencidos > 0 ? 'danger' : 'success'} />
            <Metric label="Apuracoes no periodo" value={resumo.apuracoes_periodo || 0} detail={formatCurrency(resumo.total_liquido_apurado)} />
            <Metric label="Fechamentos no periodo" value={resumo.fechamentos_periodo || 0} detail={formatCurrency(resumo.total_fechado)} />
            <Metric label="Base mensal cadastrada" value={formatCurrency(resumo.base_mensal_cadastrada)} detail="Salario base ou valor contratual" />
          </div>
          ) : null}

          {isVisible('rhdp.relatorio_operacional.distribuicoes') ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <DistributionList title="Headcount por empresa" rows={colaboradores.por_empresa || []} />
            <DistributionList title="Headcount por obra/centro" rows={colaboradores.por_obra || []} />
            <DistributionList title="Base cadastrada por empresa" rows={colaboradores.base_cadastrada_por_empresa || []} valueKey="valor" formatter={formatCurrency} />
          </div>
          ) : null}

          {isVisible('rhdp.relatorio_operacional.colaboradores') ? (
          <section className="card sol-surface-card">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Colaboradores</h2>
              <p className="text-sm text-[var(--c-muted)]">Amostra operacional com a empresa, obra/centro e base cadastrada.</p>
            </div>
            <TabelaPadrao
              colunas={[
                {
                  id: 'nome',
                  titulo: 'Colaborador',
                  // R17: o NOME do colaborador é o que identifica a linha.
                  tipo: 'identidade',
                  noCard: 'titulo',
                  render: (item) => item.nome
                },
                {
                  id: 'empresa',
                  titulo: 'Empresa',
                  tipo: 'texto',
                  render: (item) => item.empresa_nome || '-'
                },
                {
                  id: 'obra',
                  titulo: 'Obra/Centro',
                  tipo: 'texto',
                  render: (item) => item.obra_nome || '-'
                },
                {
                  id: 'setor',
                  titulo: 'Setor',
                  tipo: 'texto',
                  render: (item) => item.setor_nome || '-'
                },
                {
                  id: 'tipo',
                  titulo: 'Vinculo',
                  tipo: 'badge',
                  render: (item) => item.tipo_vinculo || '-'
                },
                {
                  id: 'status',
                  titulo: 'Status',
                  tipo: 'status',
                  render: (item) => (
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColor(item.status)}`}>
                      {item.status || '-'}
                    </span>
                  )
                },
                {
                  id: 'base',
                  titulo: 'Base',
                  tipo: 'valor',
                  render: (item) => formatCurrency(item.salario_base || item.valor_contratual)
                }
              ]}
              itens={colaboradores.analitico || []}
              storageKey="tabela:rh-dp-relatorio-operacional:colaboradores"
              rotuloRolagem="Colaboradores"
              vazio="Nenhum colaborador encontrado."
            />
          </section>
          ) : null}

          {isVisible('rhdp.relatorio_operacional.documentos') ? (
          <section className="card sol-surface-card">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Documentos criticos</h2>
              <p className="text-sm text-[var(--c-muted)]">Documentos vencidos, a vencer ou rejeitados.</p>
            </div>
            <TabelaPadrao
              colunas={[
                {
                  id: 'colaborador',
                  titulo: 'Colaborador',
                  // R17: o documento crítico é lido pelo colaborador a que pertence.
                  tipo: 'identidade',
                  noCard: 'titulo',
                  render: (item) => item.colaborador_nome || '-'
                },
                {
                  id: 'documento',
                  titulo: 'Documento',
                  tipo: 'texto',
                  render: (item) => item.tipo_documento || item.nome_original || '-'
                },
                {
                  id: 'empresa',
                  titulo: 'Empresa',
                  tipo: 'texto',
                  render: (item) => item.empresa_nome || '-'
                },
                {
                  id: 'validade',
                  titulo: 'Validade',
                  tipo: 'data',
                  render: (item) => formatDate(item.validade)
                },
                {
                  id: 'status',
                  titulo: 'Status',
                  tipo: 'status',
                  render: (item) => (
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColor(item.validade_status || item.status)}`}>
                      {item.validade_status || item.status}
                    </span>
                  )
                }
              ]}
              itens={docCriticos}
              storageKey="tabela:rh-dp-relatorio-operacional:documentos"
              rotuloRolagem="Documentos criticos"
              vazio="Nenhum documento critico no recorte."
            />
          </section>
          ) : null}
        </>
      )}
    </div>
  );
}
