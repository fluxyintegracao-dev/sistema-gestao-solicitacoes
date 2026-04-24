import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineExclamationTriangle,
  HiOutlineTag
} from 'react-icons/hi2';
import {
  getDashboardProvisionamentoFinanceiro,
  getProvisionamentoFinanceiroContexto,
  listarCategoriasMacroProvisionamento
} from '../../../services/provisoesFinanceiras';
import { formatarMoedaBRL } from '../utils/moeda';

function formatarObra(obra) {
  if (!obra) return '-';
  return `${obra.codigo ? `${obra.codigo} - ` : ''}${obra.nome}`;
}

function formatarMes(valor) {
  const match = String(valor || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return valor || '-';
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric'
  });
}

function formatarData(valor) {
  if (!valor) return '-';
  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return '-';
}

export default function DashboardProvisionamentoFinanceiro() {
  const navigate = useNavigate();
  const [contexto, setContexto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtros, setFiltros] = useState({
    obra_id: '',
    categoria_macro_id: '',
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
        alert(error?.message || 'Erro ao carregar base do dashboard.');
      } finally {
        setLoadingBase(false);
      }
    }

    carregarBase();
  }, []);

  const podeVerDashboard = useMemo(
    () => Boolean(contexto?.permissoes?.superadmin || contexto?.permissoes?.pode_dashboard),
    [contexto]
  );

  useEffect(() => {
    if (!contexto || podeVerDashboard) return;
    navigate('/provisoes-financeiras', { replace: true });
  }, [contexto, podeVerDashboard, navigate]);

  useEffect(() => {
    if (!contexto || !podeVerDashboard) return;

    async function carregarDashboard() {
      try {
        setLoadingDashboard(true);
        const data = await getDashboardProvisionamentoFinanceiro(filtros);
        setDashboard(data);
      } catch (error) {
        console.error(error);
        alert(error?.message || 'Erro ao carregar dashboard.');
      } finally {
        setLoadingDashboard(false);
      }
    }

    carregarDashboard();
  }, [contexto, podeVerDashboard, filtros, refreshKey]);

  const obrasAcesso = useMemo(() => (
    Array.isArray(contexto?.obras_acesso) ? contexto.obras_acesso : []
  ), [contexto]);

  const obrasOrdenadas = useMemo(
    () => [...(dashboard?.graficos?.por_obra || [])].sort((a, b) => Number(b?.total_valor || 0) - Number(a?.total_valor || 0)),
    [dashboard]
  );

  const categoriasOrdenadas = useMemo(
    () => [...(dashboard?.graficos?.por_categoria || [])].sort((a, b) => Number(b?.total_valor || 0) - Number(a?.total_valor || 0)),
    [dashboard]
  );

  const curvaSemanal = useMemo(
    () => [...(dashboard?.graficos?.curva_semanal || [])].sort((a, b) => String(a?.semana_inicio || '').localeCompare(String(b?.semana_inicio || ''))),
    [dashboard]
  );

  const destaqueObra = useMemo(() => obrasOrdenadas[0] || null, [obrasOrdenadas]);
  const destaqueCategoria = useMemo(() => categoriasOrdenadas[0] || null, [categoriasOrdenadas]);
  const obrasConcentracaoAlta = useMemo(() => dashboard?.alertas?.obras_concentracao_alta || [], [dashboard]);

  if (loadingBase) {
    return <div className="page"><p>Carregando dashboard...</p></div>;
  }

  if (!podeVerDashboard) {
    return <div className="page"><p>Redirecionando...</p></div>;
  }

  return (
    <div className="page dashboard space-y-6">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="page-title">Dashboard de Previsao</h1>
          <p className="page-subtitle">Leitura gerencial do desembolso previsto por obra, categoria e janela de tempo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/provisoes-financeiras')}>
            Ver lista
          </button>
          <button
            type="button"
            className="btn btn-outline inline-flex items-center gap-2"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loadingDashboard}
          >
            <HiOutlineArrowPath size={15} style={loadingDashboard ? { animation: 'spin 1s linear infinite' } : {}} />
            {loadingDashboard ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </section>

      <section className="card mx-auto w-full max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Filtros gerenciais</h2>
            <p className="text-sm text-[var(--c-muted)]">Refine o recorte por obra, categoria, prioridade e periodo.</p>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setFiltros({
              obra_id: '',
              categoria_macro_id: '',
              prioridade: '',
              data_inicial: '',
              data_final: ''
            })}
          >
            Limpar filtros
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-1 text-sm">
            Obra
            <select className="input" value={filtros.obra_id} onChange={(event) => setFiltros((atual) => ({ ...atual, obra_id: event.target.value }))}>
              <option value="">Todas</option>
              {obrasAcesso.map((obra) => (
                <option key={obra.id} value={obra.id}>{formatarObra(obra)}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm xl:col-span-2">
            Item macro
            <select className="input" value={filtros.categoria_macro_id} onChange={(event) => setFiltros((atual) => ({ ...atual, categoria_macro_id: event.target.value }))}>
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Prioridade
            <select className="input" value={filtros.prioridade} onChange={(event) => setFiltros((atual) => ({ ...atual, prioridade: event.target.value }))}>
              <option value="">Todas</option>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Data inicial
            <input type="date" className="input" value={filtros.data_inicial} onChange={(event) => setFiltros((atual) => ({ ...atual, data_inicial: event.target.value }))} />
          </label>

          <label className="grid gap-1 text-sm">
            Data final
            <input type="date" className="input" value={filtros.data_final} onChange={(event) => setFiltros((atual) => ({ ...atual, data_final: event.target.value }))} />
          </label>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard titulo="Total do periodo" valor={formatarMoedaBRL(dashboard?.cards?.total_periodo || 0)} detalhe={`${dashboard?.cards?.quantidade_abertas || 0} provisao(oes) em aberto`} icon={HiOutlineBanknotes} />
        <MetricCard titulo="Proximos 7 dias" valor={formatarMoedaBRL(dashboard?.cards?.total_proximos_7_dias || 0)} detalhe="Pressao financeira imediata" icon={HiOutlineCalendarDays} />
        <MetricCard titulo="Proximos 30 dias" valor={formatarMoedaBRL(dashboard?.cards?.total_proximos_30_dias || 0)} detalhe="Visao de caixa do curto prazo" icon={HiOutlineChartBarSquare} />
        <MetricCard titulo="Vencidas nao tratadas" valor={String(dashboard?.alertas?.vencidas_nao_tratadas?.quantidade || 0)} detalhe="Itens que pedem acao imediata" icon={HiOutlineExclamationTriangle} />
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          titulo="Obra com maior concentracao"
          valor={destaqueObra ? formatarMoedaBRL(destaqueObra.total_valor) : '-'}
          detalhe={destaqueObra ? formatarObra(destaqueObra.obra) : 'Sem destaque no recorte atual'}
          icon={HiOutlineBuildingOffice2}
        />
        <MetricCard
          titulo="Categoria dominante"
          valor={destaqueCategoria ? formatarMoedaBRL(destaqueCategoria.total_valor) : '-'}
          detalhe={destaqueCategoria?.categoria?.nome || 'Sem destaque no recorte atual'}
          icon={HiOutlineTag}
        />
        <MetricCard
          titulo="Obras em concentracao alta"
          valor={String(obrasConcentracaoAlta.length || 0)}
          detalhe="Obras acima do limiar de concentracao do recorte"
          icon={HiOutlineExclamationTriangle}
        />
      </section>

      {loadingDashboard ? (
        <div className="card mx-auto w-full max-w-6xl"><p className="text-sm text-[var(--c-muted)]">Carregando dados do dashboard...</p></div>
      ) : (
        <>
          <section className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-2">
            <BarPanel
              titulo="Provisionamento por mes"
              subtitulo="Curva de previsao para antecipar picos de desembolso."
              itens={(dashboard?.graficos?.por_mes || []).map((item) => ({
                label: formatarMes(item.mes),
                valor: Number(item.total_valor || 0),
                meta: `${item.quantidade || 0} registro(s)`
              }))}
            />
            <BarPanel
              titulo="Top obras por valor"
              subtitulo="Onde a concentracao financeira esta mais forte."
              itens={obrasOrdenadas.map((item) => ({
                label: formatarObra(item.obra),
                valor: Number(item.total_valor || 0),
                meta: `${item.quantidade || 0} registro(s)`
              }))}
            />
          </section>

          <section className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-2">
            <BarPanel
              titulo="Provisionamento por item macro"
              subtitulo="Composicao da previsao por natureza de gasto."
              itens={categoriasOrdenadas.map((item) => ({
                label: item.categoria?.nome || '-',
                valor: Number(item.total_valor || 0),
                meta: `${item.quantidade || 0} registro(s)`
              }))}
            />
            <BarPanel
              titulo="Curva semanal"
              subtitulo="Distribuicao da previsao nas proximas semanas do recorte."
              itens={curvaSemanal.map((item) => ({
                label: item.semana_label || '-',
                valor: Number(item.total_valor || 0),
                meta: `${item.quantidade || 0} registro(s)`
              }))}
            />
          </section>

          <section className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-3">
            <AlertPanel
              titulo={`Vencidas nao tratadas (${dashboard?.alertas?.vencidas_nao_tratadas?.quantidade || 0})`}
              subtitulo="Itens que precisam de regularizacao."
              itens={dashboard?.alertas?.vencidas_nao_tratadas?.itens || []}
            />
            <AlertPanel
              titulo={`Criticas proximas (${dashboard?.alertas?.itens_criticos_proximos?.quantidade || 0})`}
              subtitulo="Itens de prioridade critica no horizonte imediato."
              itens={dashboard?.alertas?.itens_criticos_proximos?.itens || []}
            />
            <ConcentracaoPanel itens={obrasConcentracaoAlta} />
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ titulo, valor, detalhe, icon: Icon }) {
  return (
    <article className="dash-kpi-card">
      <div className="dash-kpi-head">
        <div>
          <div className="dash-kpi-title">{titulo}</div>
          <div className="dash-kpi-value">{valor}</div>
        </div>
        <div className="dash-kpi-icon">
          <Icon size={20} />
        </div>
      </div>
      <div className="dash-kpi-foot">
        <span>{detalhe}</span>
      </div>
    </article>
  );
}

function BarPanel({ titulo, subtitulo, itens }) {
  const maximo = Math.max(...itens.map((item) => Number(item.valor || 0)), 0);

  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
      </div>
      {itens.length === 0 ? (
        <div className="dash-empty">Sem dados para o recorte atual.</div>
      ) : (
        <div className="dash-bar-list">
          {itens.map((item, index) => {
            const valor = Number(item.valor || 0);
            const percentualBarra = maximo > 0 ? Math.max(6, (valor / maximo) * 100) : 0;
            return (
              <div key={`${titulo}-${item.label}-${index}`} className="dash-bar-row">
                <div className="dash-bar-top">
                  <div>
                    <div className="dash-bar-label">{item.label}</div>
                    <div className="dash-bar-meta">{item.meta}</div>
                  </div>
                  <strong>{formatarMoedaBRL(valor)}</strong>
                </div>
                <div className="dash-bar-track">
                  <div className="dash-bar-fill" style={{ width: `${percentualBarra}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AlertPanel({ titulo, subtitulo, itens }) {
  const navigate = useNavigate();

  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
      </div>
      {itens.length === 0 ? (
        <div className="dash-empty">Nenhum item neste alerta.</div>
      ) : (
        <div className="dash-alert-list">
          {itens.map((item) => (
            <article
              key={item.id}
              className="dash-alert-card dash-alert-card--link"
              onClick={() => navigate(`/provisoes-financeiras/${item.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => event.key === 'Enter' && navigate(`/provisoes-financeiras/${item.id}`)}
            >
              <div className="dash-alert-title">{item.codigo}</div>
              <div className="dash-alert-meta">{`${formatarObra(item.obra)} - ${formatarData(item.data_prevista_desembolso)}`}</div>
              <div className="dash-alert-meta">{`${formatarMoedaBRL(item.valor_previsto)} - prioridade ${item.prioridade || 'nao definida'}`}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ConcentracaoPanel({ itens }) {
  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2>Concentracao por obra</h2>
          <p>Obras com peso mais alto dentro do valor previsto do recorte.</p>
        </div>
      </div>
      {!Array.isArray(itens) || !itens.length ? (
        <div className="dash-empty">Nenhuma obra acima do limiar de concentracao.</div>
      ) : (
        <div className="dash-alert-list">
          {itens.map((item) => (
            <article key={item.obra_id} className="dash-alert-card">
              <div className="dash-alert-title">{formatarObra(item.obra)}</div>
              <div className="dash-alert-meta">{formatarMoedaBRL(item.total_valor)}</div>
              <div className="dash-alert-meta">{item.percentual}% do valor previsto do recorte</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
