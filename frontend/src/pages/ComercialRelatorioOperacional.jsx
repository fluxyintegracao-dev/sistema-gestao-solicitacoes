import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TabelaPadrao } from '../components/padrao';
import { useUiVisibility } from '../hooks/useUiVisibility';
import { getEmpreendimentosComerciais, getRelatorioComercialOperacional } from '../services/comercial';
import { getObras } from '../services/obras';

const DEFAULT_FILTERS = {
  periodo: 'MES_ATUAL',
  data_inicial: '',
  data_final: '',
  empreendimento_id: '',
  obra_id: '',
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
  if (['ATIVO', 'QUITADO', 'VENDIDA'].includes(normalized)) return 'text-emerald-700 bg-emerald-50';
  if (['RESERVADA', 'INADIMPLENTE', 'RASCUNHO'].includes(normalized)) return 'text-amber-700 bg-amber-50';
  if (['DISTRATADO', 'CANCELADO', 'BLOQUEADA'].includes(normalized)) return 'text-rose-700 bg-rose-50';
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

export default function ComercialRelatorioOperacional() {
  const { isVisible } = useUiVisibility();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getEmpreendimentosComerciais({ ativo: true }),
      getObras({ ativo: true })
    ]).then(([empreendimentosResult, obrasResult]) => {
      if (!active) return;
      setEmpreendimentos(empreendimentosResult.status === 'fulfilled' && Array.isArray(empreendimentosResult.value) ? empreendimentosResult.value : []);
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
    getRelatorioComercialOperacional(appliedFilters)
      .then((data) => {
        if (active) setRelatorio(data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Erro ao carregar relatorio comercial');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const resumo = relatorio?.resumo || {};
  const contratos = relatorio?.contratos || {};
  const unidades = relatorio?.unidades || {};
  const periodoTexto = relatorio?.filtro?.data_inicial && relatorio?.filtro?.data_final
    ? `${formatDate(relatorio.filtro.data_inicial)} ate ${formatDate(relatorio.filtro.data_final)}`
    : '';

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
    <div className="page solicitacoes-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Relatorio Comercial Operacional</h1>
            <p className="page-subtitle">
              Contratos, unidades, estoque e documentos comerciais com leitura por empreendimento e obra.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/comercial/mapa-unidades" className="btn btn-outline">Mapa de unidades</Link>
            <Link to="/comercial/contratos" className="btn btn-outline">Contratos</Link>
            <Link to="/comercial/tabelas-preco" className="btn btn-outline">Tabelas</Link>
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
            <span className="app-filter-label">Empreendimento</span>
            <select className="input input-sm" value={filters.empreendimento_id} onChange={(event) => updateFilter('empreendimento_id', event.target.value)}>
              <option value="">Todos</option>
              {empreendimentos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
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
            <span className="app-filter-label">Status contrato</span>
            <select className="input input-sm" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Todos</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="ATIVO">Ativo</option>
              <option value="INADIMPLENTE">Inadimplente</option>
              <option value="QUITADO">Quitado</option>
              <option value="DISTRATADO">Distratado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--c-muted)]">{periodoTexto || 'Contratos filtrados pela data do contrato.'}</span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar</button>
            <button type="submit" className="btn btn-primary btn-sm">Atualizar relatorio</button>
          </div>
        </div>
      </form>

      {error ? <div className="app-alert app-alert--warning">{error}</div> : null}

      {loading ? (
        <div className="app-empty-card">Carregando relatorio comercial...</div>
      ) : (
        <>
          {isVisible('comercial.relatorio_operacional.metricas') ? (
          <div className="app-summary-grid">
            <Metric label="VGV carteira" value={formatCurrency(resumo.vgv_carteira)} detail={`${resumo.contratos_carteira || 0} contrato(s) ativo/quitado/inadimplente`} tone="success" />
            <Metric label="Contratos no periodo" value={resumo.contratos_periodo || 0} detail={`${resumo.contratos_distratados || 0} distrato(s)`} />
            <Metric label="Estoque disponivel" value={resumo.unidades_disponiveis || 0} detail={`${resumo.unidades_total || 0} unidade(s) cadastrada(s)`} />
            <Metric label="Reservadas" value={resumo.unidades_reservadas || 0} detail="Situacao cadastral atual" tone={resumo.unidades_reservadas > 0 ? 'warning' : 'default'} />
            <Metric label="Descontos concedidos" value={formatCurrency(resumo.descontos_concedidos)} detail="Contratos da carteira no recorte" tone={resumo.descontos_concedidos > 0 ? 'warning' : 'default'} />
            <Metric label="Comissao prevista" value={formatCurrency(resumo.comissao_prevista)} detail="Percentual cadastrado no contrato" />
          </div>
          ) : null}

          {isVisible('comercial.relatorio_operacional.distribuicoes_principais') ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <DistributionList title="VGV por empreendimento" rows={contratos.vgv_por_empreendimento || []} valueKey="valor" formatter={formatCurrency} />
            <DistributionList title="Contratos por status" rows={contratos.por_status || []} />
            <DistributionList title="Unidades por situacao" rows={unidades.por_situacao || []} />
          </div>
          ) : null}

          {isVisible('comercial.relatorio_operacional.contratos') ? (
          <section className="card sol-surface-card">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Contratos comerciais</h2>
              <p className="text-sm text-[var(--c-muted)]">Base analitica do periodo com valores reais cadastrados.</p>
            </div>
            <TabelaPadrao
              colunas={[
                {
                  id: 'numero',
                  titulo: 'Numero',
                  tipo: 'codigo',
                  noCard: 'titulo',
                  render: (contrato) => <span className="font-semibold text-[var(--c-text)]">{contrato.numero}</span>
                },
                {
                  id: 'empreendimento',
                  titulo: 'Empreendimento',
                  tipo: 'texto',
                  render: (contrato) => contrato.empreendimento_nome || '-'
                },
                {
                  id: 'unidade',
                  titulo: 'Unidade',
                  tipo: 'codigo',
                  render: (contrato) => contrato.unidade_codigo || '-'
                },
                {
                  id: 'cliente',
                  titulo: 'Cliente',
                  tipo: 'identidade',
                  render: (contrato) => contrato.cliente_nome || '-'
                },
                {
                  id: 'status',
                  titulo: 'Status',
                  tipo: 'status',
                  render: (contrato) => (
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColor(contrato.status)}`}>
                      {contrato.status}
                    </span>
                  )
                },
                {
                  id: 'data',
                  titulo: 'Data',
                  tipo: 'data',
                  render: (contrato) => formatDate(contrato.data_contrato)
                },
                {
                  id: 'valor',
                  titulo: 'Valor',
                  tipo: 'valor',
                  render: (contrato) => formatCurrency(contrato.valor_total)
                },
                {
                  id: 'desconto',
                  titulo: 'Desconto',
                  tipo: 'valor',
                  render: (contrato) => formatCurrency(contrato.desconto_concedido)
                }
              ]}
              itens={contratos.analitico || []}
              getId={(contrato) => contrato.id}
              storageKey="tabela:comercial-relatorio-operacional:contratos"
              rotuloRolagem="Contratos comerciais"
              vazio="Nenhum contrato encontrado no periodo."
            />
          </section>
          ) : null}

          {isVisible('comercial.relatorio_operacional.distribuicoes_secundarias') ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <DistributionList title="Estoque disponivel por empreendimento" rows={unidades.estoque_por_empreendimento || []} valueKey="valor" formatter={formatCurrency} />
            <DistributionList title="Contratos por corretor" rows={contratos.por_corretor || []} />
            <DistributionList title="Contratos por mes" rows={contratos.por_mes || []} />
          </div>
          ) : null}
        </>
      )}
    </div>
  );
}
