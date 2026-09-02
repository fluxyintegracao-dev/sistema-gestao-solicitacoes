import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TabelaPadrao } from '../../../components/padrao';
import {
  getDashboardProvisionamentoFinanceiro,
  getProvisionamentoFinanceiroContexto,
  listarCategoriasMacroProvisionamento,
  listarProvisoesFinanceiras
} from '../../../services/provisoesFinanceiras';
import { formatarMoedaBRL } from '../utils/moeda';

const DEFAULT_FILTERS = {
  obra_id: '',
  categoria_macro_id: '',
  status: '',
  prioridade: '',
  data_inicial: '',
  data_final: ''
};

function formatarData(valor) {
  if (!valor) return '-';
  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return '-';
}

function formatarMes(valor) {
  const match = String(valor || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return valor || '-';
  return `${match[2]}/${match[1]}`;
}

function formatarObra(obra) {
  if (!obra) return '-';
  return `${obra.codigo ? `${obra.codigo} - ` : ''}${obra.nome}`;
}

function formatarStatus(valor) {
  const labels = {
    previsto: 'Previsto',
    em_analise: 'Em analise',
    aprovado: 'Aprovado',
    cancelado: 'Cancelado',
    realizado: 'Realizado'
  };
  return labels[String(valor || '').toLowerCase()] || '-';
}

function formatarPrioridade(valor) {
  const labels = {
    baixa: 'Baixa',
    media: 'Media',
    alta: 'Alta',
    critica: 'Critica'
  };
  return labels[String(valor || '').toLowerCase()] || '-';
}

function percentual(valor, total) {
  const base = Number(total || 0);
  if (!base) return '0,00%';
  return `${((Number(valor || 0) / base) * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function Card({ label, value, hint, tone = 'blue' }) {
  const toneClass = {
    blue: 'border-blue-200 bg-blue-50/70 text-blue-950',
    green: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-950',
    red: 'border-rose-200 bg-rose-50/70 text-rose-950',
    slate: 'border-slate-200 bg-slate-50 text-slate-950'
  }[tone] || 'border-blue-200 bg-blue-50/70 text-blue-950';

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function GroupTable({ title, rows, total, storageKey, labelResolver }) {
  return (
    <section className="card sol-surface-card app-table-shell">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <span className="text-xs text-slate-500">{rows.length} linha(s)</span>
      </div>
      <TabelaPadrao
        colunas={[
          {
            id: 'label',
            titulo: 'Descricao',
            // R17: o rotulo NOMEIA a linha do agrupamento (obra, categoria,
            // status ou semana conforme o bloco).
            tipo: 'identidade',
            noCard: 'titulo',
            render: (row) => labelResolver(row)
          },
          {
            id: 'quantidade',
            titulo: 'Qtd.',
            tipo: 'numero',
            render: (row) => Number(row.quantidade || 0).toLocaleString('pt-BR')
          },
          {
            id: 'valor',
            titulo: 'Valor',
            tipo: 'valor',
            render: (row) => formatarMoedaBRL(Number(row.total_valor || 0))
          },
          {
            id: 'participacao',
            titulo: 'Participacao',
            tipo: 'numero',
            render: (row) => percentual(Number(row.total_valor || 0), total)
          }
        ]}
        itens={rows}
        getId={(row) => labelResolver(row)}
        storageKey={storageKey}
        rotuloRolagem={title}
        vazio="Sem dados para os filtros."
      />
    </section>
  );
}

export default function ProvisionamentoRelatorioOperacional() {
  const [contexto, setContexto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [lista, setLista] = useState([]);
  const [filtros, setFiltros] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const obras = useMemo(() => (
    Array.isArray(contexto?.obras_acesso) ? contexto.obras_acesso : []
  ), [contexto]);

  async function carregar(params = filtros) {
    try {
      setLoading(true);
      setErro('');
      const [dashboardData, listaData] = await Promise.all([
        getDashboardProvisionamentoFinanceiro(params),
        listarProvisoesFinanceiras({
          ...params,
          sort_by: 'data_prevista_desembolso',
          sort_dir: 'ASC',
          page: 1,
          limit: 200
        })
      ]);
      setDashboard(dashboardData);
      setLista(Array.isArray(listaData?.items) ? listaData.items : []);
    } catch (error) {
      console.error(error);
      setErro(error?.message || 'Erro ao carregar relatorio de provisionamento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function carregarBase() {
      try {
        setLoading(true);
        const [contextoData, categoriasData] = await Promise.all([
          getProvisionamentoFinanceiroContexto(),
          listarCategoriasMacroProvisionamento()
        ]);
        setContexto(contextoData);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      } catch (error) {
        console.error(error);
        setErro(error?.message || 'Erro ao carregar contexto do provisionamento.');
        setLoading(false);
      }
    }

    carregarBase();
  }, []);

  useEffect(() => {
    if (!contexto) return;
    carregar(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexto]);

  const totalPeriodo = Number(dashboard?.cards?.total_periodo || 0);
  const abertas = Number(dashboard?.cards?.quantidade_abertas || 0);
  const vencidas = dashboard?.alertas?.vencidas_nao_tratadas?.itens || [];
  const criticas = dashboard?.alertas?.itens_criticos_proximos?.itens || [];
  const porMes = dashboard?.graficos?.por_mes || [];
  const maiorMes = Math.max(...porMes.map((item) => Number(item.total_valor || 0)), 1);

  function onChange(event) {
    const { name, value } = event.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    await carregar(filtros);
  }

  async function limpar() {
    setFiltros(DEFAULT_FILTERS);
    await carregar(DEFAULT_FILTERS);
  }

  return (
    <div className="page solicitacoes-page">
      <div className="sol-page-header">
        <div>
          <p className="eyebrow">Provisionamento / Relatorios</p>
          <h1 className="page-title">Painel operacional de provisionamento</h1>
          <p className="page-subtitle">
            Pressao futura de caixa, vencidos nao tratados, prioridades e concentracao por obra e categoria.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/provisoes-financeiras/relatorios" className="btn btn-outline">Voltar aos relatorios</Link>
          <Link to="/provisoes-financeiras" className="btn btn-primary">Lista de provisoes</Link>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card sol-surface-card rounded-xl p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="grid gap-1 text-sm">
            <span>Obra/Centro</span>
            <select name="obra_id" value={filtros.obra_id} onChange={onChange} className="input">
              <option value="">Todas</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>{formatarObra(obra)}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm xl:col-span-2">
            <span>Categoria macro</span>
            <select name="categoria_macro_id" value={filtros.categoria_macro_id} onChange={onChange} className="input">
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Status</span>
            <select name="status" value={filtros.status} onChange={onChange} className="input">
              <option value="">Todos</option>
              <option value="previsto">Previsto</option>
              <option value="em_analise">Em analise</option>
              <option value="aprovado">Aprovado</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Prioridade</span>
            <select name="prioridade" value={filtros.prioridade} onChange={onChange} className="input">
              <option value="">Todas</option>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span>Data inicial</span>
            <input name="data_inicial" type="date" value={filtros.data_inicial} onChange={onChange} className="input" />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Data final</span>
            <input name="data_final" type="date" value={filtros.data_final} onChange={onChange} className="input" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar relatorio'}
          </button>
          <button type="button" className="btn btn-outline" onClick={limpar} disabled={loading}>Limpar</button>
        </div>
      </form>

      {erro && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{erro}</div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card label="Total previsto" value={formatarMoedaBRL(totalPeriodo)} hint="Provisoes nao canceladas no recorte" />
        <Card label="Proximos 7 dias" value={formatarMoedaBRL(dashboard?.cards?.total_proximos_7_dias || 0)} hint="Pressao imediata de caixa" tone="amber" />
        <Card label="Proximos 30 dias" value={formatarMoedaBRL(dashboard?.cards?.total_proximos_30_dias || 0)} hint="Pressao de curto prazo" tone="blue" />
        <Card label="Vencidas nao tratadas" value={String(vencidas.length)} hint="Previstas/em analise vencidas" tone={vencidas.length ? 'red' : 'green'} />
        <Card label="Abertas" value={String(abertas)} hint="Previstas, em analise ou aprovadas" tone="slate" />
        <Card label="Criticas proximas" value={String(criticas.length)} hint="Prioridade critica nos proximos 7 dias" tone={criticas.length ? 'red' : 'green'} />
        <Card label="Analitico carregado" value={String(lista.length)} hint="Primeiros 200 itens do recorte" tone="slate" />
        <Card label="Concentracao alta" value={String(dashboard?.alertas?.obras_concentracao_alta?.length || 0)} hint="Obras acima do limiar do dashboard" tone="amber" />
      </div>

      <section className="card sol-surface-card rounded-xl p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">Curva mensal prevista</h2>
          <p className="text-sm text-slate-500">Valores por data prevista de desembolso, sem provisoes canceladas.</p>
        </div>
        <div className="space-y-3">
          {porMes.length === 0 && <p className="text-sm text-slate-500">Sem dados no recorte atual.</p>}
          {porMes.map((item) => (
            <div key={item.mes} className="grid gap-2 md:grid-cols-[96px_minmax(0,1fr)_150px] md:items-center">
              <span className="text-sm font-semibold text-slate-700">{formatarMes(item.mes)}</span>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.max((Number(item.total_valor || 0) / maiorMes) * 100, 4)}%` }}
                />
              </div>
              <span className="text-right text-sm font-semibold text-slate-900">{formatarMoedaBRL(item.total_valor)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <GroupTable
          title="Por obra/centro"
          rows={dashboard?.graficos?.por_obra || []}
          total={totalPeriodo}
          storageKey="tabela:provisionamento-relatorio-operacional:por-obra"
          labelResolver={(row) => formatarObra(row.obra)}
        />
        <GroupTable
          title="Por categoria macro"
          rows={dashboard?.graficos?.por_categoria || []}
          total={totalPeriodo}
          storageKey="tabela:provisionamento-relatorio-operacional:por-categoria"
          labelResolver={(row) => row.categoria?.nome || 'Sem categoria'}
        />
        <GroupTable
          title="Pipeline por status"
          rows={dashboard?.graficos?.pipeline_status || []}
          total={totalPeriodo}
          storageKey="tabela:provisionamento-relatorio-operacional:pipeline-status"
          labelResolver={(row) => formatarStatus(row.status)}
        />
        <GroupTable
          title="Curva semanal"
          rows={dashboard?.graficos?.curva_semanal || []}
          total={totalPeriodo}
          storageKey="tabela:provisionamento-relatorio-operacional:curva-semanal"
          labelResolver={(row) => row.semana_label || row.semana_inicio}
        />
      </div>

      <section className="card sol-surface-card app-table-shell">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Analitico do recorte</h2>
            <p className="text-sm text-slate-500">Primeiros 200 provisionamentos ordenados pela data prevista mais proxima.</p>
          </div>
          <span className="text-xs text-slate-500">{lista.length} item(ns)</span>
        </div>

        <TabelaPadrao
          colunas={[
            {
              id: 'codigo',
              titulo: 'Codigo',
              // R17: o codigo NOMEIA o provisionamento da linha.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => (
                <Link className="font-semibold text-blue-700" to={`/provisoes-financeiras/${item.id}`}>
                  {item.codigo}
                </Link>
              )
            },
            {
              id: 'data',
              titulo: 'Data prevista',
              tipo: 'data',
              render: (item) => formatarData(item.data_prevista_desembolso)
            },
            { id: 'obra', titulo: 'Obra/Centro', tipo: 'texto', render: (item) => formatarObra(item.obra) },
            { id: 'categoria', titulo: 'Categoria', tipo: 'texto', render: (item) => item.categoriaMacro?.nome || '-' },
            { id: 'descricao', titulo: 'Descricao', tipo: 'texto', render: (item) => item.descricao || '-' },
            { id: 'credor', titulo: 'Credor', tipo: 'texto', render: (item) => item.fornecedor_texto || '-' },
            { id: 'status', titulo: 'Status', tipo: 'status', render: (item) => formatarStatus(item.status) },
            { id: 'prioridade', titulo: 'Prioridade', tipo: 'badge', render: (item) => formatarPrioridade(item.prioridade) },
            { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => formatarMoedaBRL(item.valor_previsto) }
          ]}
          itens={lista}
          getId={(item) => item.id}
          storageKey="tabela:provisionamento-relatorio-operacional:analitico"
          rotuloRolagem="Analitico do recorte"
          vazio="Nenhum provisionamento encontrado."
        />
      </section>
    </div>
  );
}
