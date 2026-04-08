import { useEffect, useMemo, useState } from 'react';
import {
  getDashboardProvisionamentoFinanceiro,
  getProvisionamentoFinanceiroContexto,
  listarCategoriasMacroProvisionamento
} from '../../../services/provisoesFinanceiras';
import { formatarMoedaBRL } from '../utils/moeda';

const STATUS_OPCOES = [
  { value: '', label: 'Todos' },
  { value: 'previsto', label: 'Previsto' },
  { value: 'em_analise', label: 'Em analise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'realizado', label: 'Realizado' }
];

const PRIORIDADE_OPCOES = [
  { value: '', label: 'Todas' },
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Critica' }
];

function formatarData(valor) {
  if (!valor) return '-';
  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return '-';
  }
  return data.toLocaleDateString('pt-BR');
}

function formatarStatus(valor) {
  return String(valor || '-')
    .replace(/_/g, ' ')
    .toUpperCase();
}

function formatarObra(obra) {
  if (!obra) return '-';
  return `${obra.codigo ? `${obra.codigo} - ` : ''}${obra.nome}`;
}

function formatarMes(anoMes) {
  const match = String(anoMes || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return anoMes || '-';
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric'
  });
}

export default function DashboardProvisionamentoFinanceiro() {
  const [contexto, setContexto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [filtros, setFiltros] = useState({
    obra_id: '',
    categoria_macro_id: '',
    status: '',
    prioridade: '',
    data_inicial: '',
    data_final: ''
  });

  useEffect(() => {
    async function carregarBase() {
      try {
        setLoadingBase(true);
        const [contextoData, categoriasData] = await Promise.all([
          getProvisionamentoFinanceiroContexto(),
          listarCategoriasMacroProvisionamento()
        ]);
        setContexto(contextoData);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      } catch (error) {
        console.error(error);
        alert(error?.message || 'Erro ao carregar base do dashboard do provisionamento financeiro.');
      } finally {
        setLoadingBase(false);
      }
    }

    carregarBase();
  }, []);

  useEffect(() => {
    if (!contexto) return;

    async function carregarDashboard() {
      try {
        setLoadingDashboard(true);
        const data = await getDashboardProvisionamentoFinanceiro(filtros);
        setDashboard(data);
      } catch (error) {
        console.error(error);
        alert(error?.message || 'Erro ao carregar dashboard do provisionamento financeiro.');
      } finally {
        setLoadingDashboard(false);
      }
    }

    carregarDashboard();
  }, [contexto, filtros]);

  const obrasAcesso = useMemo(() => (
    Array.isArray(contexto?.obras_acesso) ? contexto.obras_acesso : []
  ), [contexto]);

  function atualizarFiltro(campo, valor) {
    setFiltros((atual) => ({ ...atual, [campo]: valor ?? '' }));
  }

  function limparFiltros() {
    setFiltros({
      obra_id: '',
      categoria_macro_id: '',
      status: '',
      prioridade: '',
      data_inicial: '',
      data_final: ''
    });
  }

  if (loadingBase) {
    return <div className="page"><p>Carregando dashboard...</p></div>;
  }

  return (
    <div className="page space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard de Provisionamento</h1>
          <p className="page-subtitle">
            Visao gerencial consolidada das previsoes financeiras por obra.
          </p>
        </div>
        <div className={`rounded-full px-4 py-2 text-sm font-medium ${dashboard?.escopo?.global ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
          {dashboard?.escopo?.global ? 'Visao global habilitada' : 'Visao restrita as obras permitidas'}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Filtros do dashboard</h2>
          <button type="button" className="btn btn-outline" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Obra
            <select className="input" value={filtros.obra_id} onChange={(event) => atualizarFiltro('obra_id', event.target.value)}>
              <option value="">Todas</option>
              {obrasAcesso.map((obra) => (
                <option key={obra.id} value={obra.id}>{formatarObra(obra)}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Categoria macro
            <select className="input" value={filtros.categoria_macro_id} onChange={(event) => atualizarFiltro('categoria_macro_id', event.target.value)}>
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Status
            <select className="input" value={filtros.status} onChange={(event) => atualizarFiltro('status', event.target.value)}>
              {STATUS_OPCOES.map((item) => (
                <option key={item.value || 'todos'} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Prioridade
            <select className="input" value={filtros.prioridade} onChange={(event) => atualizarFiltro('prioridade', event.target.value)}>
              {PRIORIDADE_OPCOES.map((item) => (
                <option key={item.value || 'todas'} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Data inicial
            <input type="date" className="input" value={filtros.data_inicial} onChange={(event) => atualizarFiltro('data_inicial', event.target.value)} />
          </label>

          <label className="grid gap-1 text-sm">
            Data final
            <input type="date" className="input" value={filtros.data_final} onChange={(event) => atualizarFiltro('data_final', event.target.value)} />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard titulo="Total no periodo" valor={formatarMoedaBRL(dashboard?.cards?.total_periodo)} />
        <ResumoCard titulo="Proximos 7 dias" valor={formatarMoedaBRL(dashboard?.cards?.total_proximos_7_dias)} />
        <ResumoCard titulo="Proximos 30 dias" valor={formatarMoedaBRL(dashboard?.cards?.total_proximos_30_dias)} />
        <ResumoCard titulo="Provisoes abertas" valor={String(dashboard?.cards?.quantidade_abertas || 0)} />
      </div>

      {loadingDashboard ? (
        <div className="card"><p className="text-sm text-[var(--c-muted)]">Carregando dados do dashboard...</p></div>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <BarChartCard
              titulo="Provisionamento por mes"
              itens={(dashboard?.graficos?.por_mes || []).map((item) => ({
                label: formatarMes(item.mes),
                valor: Number(item.total_valor || 0),
                detalhe: `${item.quantidade || 0} registro(s)`
              }))}
            />
            <BarChartCard
              titulo="Curva semanal de desembolso"
              itens={(dashboard?.graficos?.curva_semanal || []).map((item) => ({
                label: item.semana_label,
                valor: Number(item.total_valor || 0),
                detalhe: `${item.quantidade || 0} registro(s)`
              }))}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <BarChartCard
              titulo="Top obras por valor provisionado"
              itens={(dashboard?.graficos?.por_obra || []).map((item) => ({
                label: formatarObra(item.obra),
                valor: Number(item.total_valor || 0),
                detalhe: `${item.quantidade || 0} registro(s)`
              }))}
            />
            <BarChartCard
              titulo="Provisionamento por categoria macro"
              itens={(dashboard?.graficos?.por_categoria || []).map((item) => ({
                label: item.categoria?.nome || '-',
                valor: Number(item.total_valor || 0),
                detalhe: `${item.quantidade || 0} registro(s)`
              }))}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <BarChartCard
              titulo="Pipeline por status"
              itens={(dashboard?.graficos?.pipeline_status || []).map((item) => ({
                label: formatarStatus(item.status),
                valor: Number(item.total_valor || 0),
                detalhe: `${item.quantidade || 0} registro(s)`
              }))}
            />
            <div className="card space-y-4">
              <div className="card-header">
                <h2 className="font-semibold">Alertas gerenciais</h2>
              </div>
              <AlertaLista
                titulo={`Vencidas nao tratadas (${dashboard?.alertas?.vencidas_nao_tratadas?.quantidade || 0})`}
                itens={dashboard?.alertas?.vencidas_nao_tratadas?.itens || []}
              />
              <AlertaLista
                titulo={`Criticas proximas (${dashboard?.alertas?.itens_criticos_proximos?.quantidade || 0})`}
                itens={dashboard?.alertas?.itens_criticos_proximos?.itens || []}
              />
            </div>
          </div>

          <div className="card space-y-4">
            <div className="card-header">
              <h2 className="font-semibold">Obras com concentracao alta</h2>
            </div>
            {Array.isArray(dashboard?.alertas?.obras_concentracao_alta) && dashboard.alertas.obras_concentracao_alta.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dashboard.alertas.obras_concentracao_alta.map((item) => (
                  <div key={item.obra_id} className="rounded-lg border border-[var(--c-border)] px-4 py-3">
                    <div className="font-medium">{formatarObra(item.obra)}</div>
                    <div className="text-sm text-[var(--c-muted)] mt-1">
                      {formatarMoedaBRL(item.total_valor)} • {item.percentual}% do total
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--c-muted)]">Nenhuma obra com concentracao alta no recorte atual.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ResumoCard({ titulo, valor }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-white px-4 py-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-[var(--c-muted)]">{titulo}</div>
      <div className="mt-2 text-xl font-semibold">{valor}</div>
    </div>
  );
}

function BarChartCard({ titulo, itens }) {
  const maxValor = Math.max(...itens.map((item) => Number(item.valor || 0)), 0);

  return (
    <div className="card space-y-4">
      <div className="card-header">
        <h2 className="font-semibold">{titulo}</h2>
      </div>

      {itens.length === 0 ? (
        <div className="text-sm text-[var(--c-muted)]">Sem dados para o recorte atual.</div>
      ) : (
        <div className="space-y-3">
          {itens.map((item, index) => {
            const valor = Number(item.valor || 0);
            const width = maxValor > 0 ? Math.max(8, (valor / maxValor) * 100) : 0;
            return (
              <div key={`${titulo}-${item.label}-${index}`} className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span>{formatarMoedaBRL(valor)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
                {item.detalhe && (
                  <div className="text-xs text-[var(--c-muted)]">{item.detalhe}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AlertaLista({ titulo, itens }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{titulo}</div>
      {itens.length === 0 ? (
        <div className="text-sm text-[var(--c-muted)]">Nenhum item neste alerta.</div>
      ) : (
        <div className="space-y-2">
          {itens.map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--c-border)] px-3 py-3 text-sm">
              <div className="font-medium">{item.codigo}</div>
              <div className="text-[var(--c-muted)] mt-1">
                {formatarObra(item.obra)} • {formatarData(item.data_prevista_desembolso)} • {formatarMoedaBRL(item.valor_previsto)}
              </div>
              <div className="text-[var(--c-muted)] mt-1">
                Status: {formatarStatus(item.status)} • Prioridade: {item.prioridade || '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
