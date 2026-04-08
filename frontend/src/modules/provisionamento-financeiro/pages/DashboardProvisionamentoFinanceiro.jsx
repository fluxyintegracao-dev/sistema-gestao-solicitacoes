import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineArrowPath,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineArrowTrendingUp,
  HiOutlineBanknotes,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineCheckBadge,
  HiOutlineExclamationTriangle,
  HiOutlineShieldExclamation
} from 'react-icons/hi2';
import {
  getDashboardProvisionamentoFinanceiro,
  getProvisionamentoFinanceiroContexto,
  listarCategoriasMacroProvisionamento
} from '../../../services/provisoesFinanceiras';
import { formatarMoedaBRL } from '../utils/moeda';

const STATUS_OPCOES = [
  { value: '', label: 'Todos' },
  { value: 'previsto', label: 'Previsto' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'realizado', label: 'Realizado' }
];

const PRIORIDADE_OPCOES = [
  { value: '', label: 'Todas' },
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' }
];

const STATUS_BADGE_MAP = {
  previsto: 'badge-blue',
  em_analise: 'badge-amber',
  aprovado: 'badge-green',
  realizado: 'badge-green',
  cancelado: 'badge-gray'
};

const STATUS_LABEL_MAP = {
  previsto: 'Previsto',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  realizado: 'Realizado',
  cancelado: 'Cancelado'
};

const PRIORIDADE_BADGE_MAP = {
  baixa: 'badge-blue',
  media: 'badge-amber',
  alta: 'badge-orange',
  critica: 'badge-red'
};

const PRIORIDADE_LABEL_MAP = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica'
};

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

function calcularPercentual(total, referencia) {
  if (!referencia) return 0;
  return Number(((Number(total || 0) / Number(referencia || 0)) * 100).toFixed(1));
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DashboardProvisionamentoFinanceiro() {
  const navigate = useNavigate();
  const [contexto, setContexto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [chaveAtualizacao, setChaveAtualizacao] = useState(0);
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

  const podeVerDashboard = useMemo(
    () => Boolean(contexto?.permissoes?.superadmin || contexto?.permissoes?.pode_dashboard_global),
    [contexto]
  );

  useEffect(() => {
    if (!contexto || podeVerDashboard) return;
    navigate('/provisoes-financeiras', { replace: true });
  }, [contexto, navigate, podeVerDashboard]);

  useEffect(() => {
    if (!contexto || !podeVerDashboard) return;

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
  }, [contexto, filtros, podeVerDashboard, chaveAtualizacao]);

  const obrasAcesso = useMemo(() => (
    Array.isArray(contexto?.obras_acesso) ? contexto.obras_acesso : []
  ), [contexto]);

  const pipelineOrdenado = useMemo(
    () => [...(dashboard?.graficos?.pipeline_status || [])].sort((a, b) => Number(b?.total_valor || 0) - Number(a?.total_valor || 0)),
    [dashboard]
  );
  const obrasOrdenadas = useMemo(
    () => [...(dashboard?.graficos?.por_obra || [])].sort((a, b) => Number(b?.total_valor || 0) - Number(a?.total_valor || 0)),
    [dashboard]
  );
  const categoriasOrdenadas = useMemo(
    () => [...(dashboard?.graficos?.por_categoria || [])].sort((a, b) => Number(b?.total_valor || 0) - Number(a?.total_valor || 0)),
    [dashboard]
  );
  const mesesOrdenados = useMemo(
    () => [...(dashboard?.graficos?.por_mes || [])].sort((a, b) => String(a?.mes || '').localeCompare(String(b?.mes || ''))),
    [dashboard]
  );
  const semanasOrdenadas = useMemo(
    () => [...(dashboard?.graficos?.curva_semanal || [])].sort((a, b) => String(a?.semana_inicio || '').localeCompare(String(b?.semana_inicio || ''))),
    [dashboard]
  );

  const vencidasQtd = Number(dashboard?.alertas?.vencidas_nao_tratadas?.quantidade || 0);
  const criticasQtd = Number(dashboard?.alertas?.itens_criticos_proximos?.quantidade || 0);
  const obraLider = obrasOrdenadas[0] || null;
  const categoriaLider = categoriasOrdenadas[0] || null;
  const pipelineLider = pipelineOrdenado[0] || null;
  const totalPeriodo = Number(dashboard?.cards?.total_periodo || 0);
  const concentracaoLider = dashboard?.alertas?.obras_concentracao_alta?.[0] || null;
  const proximaSemana = Number(dashboard?.cards?.total_proximos_7_dias || 0);
  const proximos30 = Number(dashboard?.cards?.total_proximos_30_dias || 0);
  const quantidadeAbertas = Number(dashboard?.cards?.quantidade_abertas || 0);

  const cards = [
    {
      titulo: 'Total provisionado',
      valor: formatarMoedaBRL(totalPeriodo),
      detalhe: `${quantidadeAbertas} provisão(ões) em aberto`,
      destaque: pipelineLider ? `${formatarStatus(pipelineLider.status)} lidera o pipeline` : 'Sem pipeline dominante',
      icon: HiOutlineBanknotes
    },
    {
      titulo: 'Próximos 7 dias',
      valor: formatarMoedaBRL(proximaSemana),
      detalhe: `${criticasQtd} item(ns) críticos no curto prazo`,
      destaque: criticasQtd > 0 ? 'Atenção imediata' : 'Janela sob controle',
      icon: HiOutlineCalendarDays,
      variante: criticasQtd > 0 ? 'warning' : undefined
    },
    {
      titulo: 'Próximos 30 dias',
      valor: formatarMoedaBRL(proximos30),
      detalhe: obraLider ? `Maior concentração em ${formatarObra(obraLider.obra)}` : 'Sem obra líder',
      destaque: obraLider ? `${calcularPercentual(obraLider.total_valor, totalPeriodo)}% do total` : 'Sem concentração',
      icon: HiOutlineChartBarSquare
    },
    {
      titulo: 'Vencidas não tratadas',
      valor: String(vencidasQtd),
      detalhe: `${criticasQtd} crítica(s) próximas`,
      destaque: vencidasQtd > 0 ? 'Priorizar saneamento' : 'Sem atrasos relevantes',
      icon: HiOutlineShieldExclamation,
      variante: vencidasQtd > 0 ? 'danger' : undefined
    }
  ];

  const leituras = [
    {
      titulo: 'Obra com maior carga financeira',
      descricao: obraLider
        ? `${formatarObra(obraLider.obra)} concentra ${formatarMoedaBRL(obraLider.total_valor)} no recorte atual.`
        : 'Sem concentração de obra no período selecionado.',
      tonalidade: 'primary',
      icon: HiOutlineBuildingOffice2
    },
    {
      titulo: 'Categoria dominante',
      descricao: categoriaLider
        ? `${categoriaLider.categoria?.nome || '-'} lidera com ${formatarMoedaBRL(categoriaLider.total_valor)}.`
        : 'Sem categoria dominante no recorte atual.',
      tonalidade: 'neutral',
      icon: HiOutlineArrowTrendingUp
    },
    {
      titulo: 'Pressão de curto prazo',
      descricao: criticasQtd > 0
        ? `Existem ${criticasQtd} item(ns) críticos nos próximos 7 dias.`
        : 'Não há itens críticos imediatos no horizonte de 7 dias.',
      tonalidade: criticasQtd > 0 ? 'warning' : 'success',
      icon: HiOutlineExclamationTriangle
    },
    {
      titulo: 'Concentração relevante',
      descricao: concentracaoLider
        ? `${formatarObra(concentracaoLider.obra)} representa ${concentracaoLider.percentual}% do total provisionado.`
        : 'Nenhuma obra ultrapassou o limite de concentração definido.',
      tonalidade: concentracaoLider ? 'warning' : 'success',
      icon: HiOutlineCheckBadge
    }
  ];

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

  function aplicarPresetData(preset) {
    const hoje = new Date();
    let ini, fim;
    if (preset === 'este_mes') {
      ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    } else if (preset === 'proximos_30') {
      ini = new Date(hoje);
      fim = new Date(hoje);
      fim.setDate(hoje.getDate() + 30);
    } else if (preset === 'proximos_90') {
      ini = new Date(hoje);
      fim = new Date(hoje);
      fim.setDate(hoje.getDate() + 90);
    } else if (preset === 'este_ano') {
      ini = new Date(hoje.getFullYear(), 0, 1);
      fim = new Date(hoje.getFullYear(), 11, 31);
    }
    if (ini && fim) {
      setFiltros((atual) => ({ ...atual, data_inicial: fmtDate(ini), data_final: fmtDate(fim) }));
    }
  }

  function atualizarDashboard() {
    setChaveAtualizacao((k) => k + 1);
  }

  if (loadingBase) {
    return <div className="page"><p>Carregando dashboard...</p></div>;
  }

  if (!podeVerDashboard) {
    return <div className="page"><p>Redirecionando...</p></div>;
  }

  return (
    <div className="page dashboard space-y-6">
      <section className="dash-hero">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--c-muted)' }}>
              Provisionamento financeiro
            </p>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--c-text)' }}>
              Dashboard Gerencial de Provisionamento
            </h1>
            <p className="text-sm max-w-3xl" style={{ color: 'var(--c-muted)' }}>
              Leitura executiva para decidir prioridade, distribuição de caixa e risco de concentração por obra.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`chip ${dashboard?.escopo?.global ? '' : 'dash-chip-warning'}`}>
              <span className="chip-dot" style={{ background: dashboard?.escopo?.global ? '#22c55e' : '#f59e0b' }} />
              {dashboard?.escopo?.global ? 'Visão global habilitada' : 'Visão restrita ao escopo do usuário'}
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={atualizarDashboard}
              disabled={loadingDashboard}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <HiOutlineArrowPath size={15} style={loadingDashboard ? { animation: 'spin 1s linear infinite' } : {}} />
              {loadingDashboard ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        <div className="dash-hero-grid relative z-10">
          <div className="glass dash-spotlight">
            <div className="dash-spotlight-icon">
              <HiOutlineBanknotes size={22} />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--c-muted)' }}>
                Exposição do período
              </p>
              <div className="dash-spotlight-value">{formatarMoedaBRL(totalPeriodo)}</div>
              <p className="dash-spotlight-note">
                {obraLider
                  ? `${formatarObra(obraLider.obra)} lidera o recorte com ${formatarMoedaBRL(obraLider.total_valor)}.`
                  : 'Ainda não há concentração suficiente para destaque.'}
              </p>
            </div>
          </div>

          <div className="glass dash-hero-side">
            <MiniStat
              titulo="Vencidas"
              valor={String(vencidasQtd)}
              descricao="Itens fora do prazo e ainda sem tratamento"
            />
            <MiniStat
              titulo="Críticas"
              valor={String(criticasQtd)}
              descricao="Itens de prioridade crítica no curto prazo"
            />
            <MiniStat
              titulo="Pipeline líder"
              valor={pipelineLider ? formatarStatus(pipelineLider.status) : '-'}
              descricao={pipelineLider ? formatarMoedaBRL(pipelineLider.total_valor) : 'Sem pipeline dominante'}
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Filtros gerenciais</h2>
            <p className="text-sm text-[var(--c-muted)]">Ajuste o recorte para avaliar volume, risco e concentração.</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => aplicarPresetData('este_mes')}>
            Este mês
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => aplicarPresetData('proximos_30')}>
            Próximos 30 dias
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => aplicarPresetData('proximos_90')}>
            Próximos 90 dias
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => aplicarPresetData('este_ano')}>
            Este ano
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
      </section>

      <section className="dash-kpi-grid">
        {cards.map((card) => (
          <MetricCard key={card.titulo} {...card} />
        ))}
      </section>

      {loadingDashboard ? (
        <div className="card"><p className="text-sm text-[var(--c-muted)]">Carregando dados do dashboard...</p></div>
      ) : (
        <>
          <section className="dash-section-grid">
            <BarPanel
              titulo="Provisionamento por mês"
              subtitulo="Leitura de tendência para antecipar picos de desembolso."
              itens={mesesOrdenados.map((item) => ({
                label: formatarMes(item.mes),
                valor: Number(item.total_valor || 0),
                meta: `${item.quantidade || 0} registro(s)`
              }))}
            />
            <BarPanel
              titulo="Curva semanal de desembolso"
              subtitulo="Distribuição de caixa prevista semana a semana."
              itens={semanasOrdenadas.map((item) => ({
                label: item.semana_label,
                valor: Number(item.total_valor || 0),
                meta: `${item.quantidade || 0} registro(s)`
              }))}
            />
          </section>

          <section className="dash-section-grid">
            <BarPanel
              titulo="Top obras por valor provisionado"
              subtitulo="Onde a diretoria deve concentrar revisão financeira."
              itens={obrasOrdenadas.map((item) => ({
                label: formatarObra(item.obra),
                valor: Number(item.total_valor || 0),
                meta: `${item.quantidade || 0} registro(s)`
              }))}
            />
            <BarPanel
              titulo="Provisionamento por categoria macro"
              subtitulo="Composição do provisionamento por natureza de gasto."
              itens={categoriasOrdenadas.map((item) => ({
                label: item.categoria?.nome || '-',
                valor: Number(item.total_valor || 0),
                meta: `${item.quantidade || 0} registro(s)`
              }))}
            />
          </section>

          <section className="dash-section-grid">
            <BarPanel
              titulo="Pipeline por status"
              subtitulo="Status com maior impacto financeiro no recorte atual."
              itens={pipelineOrdenado.map((item) => ({
                label: formatarStatus(item.status),
                valor: Number(item.total_valor || 0),
                meta: `${item.quantidade || 0} registro(s)`
              }))}
            />
            <InsightsPanel itens={leituras} />
          </section>

          <section className="dash-section-grid">
            <AlertPanel
              titulo={`Vencidas não tratadas (${vencidasQtd})`}
              subtitulo="Itens que pedem regularização imediata."
              itens={dashboard?.alertas?.vencidas_nao_tratadas?.itens || []}
              acaoLabel="Ver listagem"
              onAcao={() => navigate('/provisoes-financeiras')}
            />
            <AlertPanel
              titulo={`Críticas próximas (${criticasQtd})`}
              subtitulo="Itens de alta pressão no horizonte de 7 dias."
              itens={dashboard?.alertas?.itens_criticos_proximos?.itens || []}
              acaoLabel="Ver listagem"
              onAcao={() => navigate('/provisoes-financeiras')}
            />
          </section>

          <section className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h2>Obras com concentração alta</h2>
                <p>Obras que concentram parcela relevante do valor provisionado no recorte atual.</p>
              </div>
            </div>
            {Array.isArray(dashboard?.alertas?.obras_concentracao_alta) && dashboard.alertas.obras_concentracao_alta.length > 0 ? (
              <div className="dash-insights">
                {dashboard.alertas.obras_concentracao_alta.map((item) => (
                  <article key={item.obra_id} className="dash-insight dash-insight-warning">
                    <div className="dash-insight-icon">
                      <HiOutlineBuildingOffice2 size={18} />
                    </div>
                    <div className="space-y-1">
                      <h3>{formatarObra(item.obra)}</h3>
                      <p>
                        {formatarMoedaBRL(item.total_valor)} concentrados no recorte. Participação de {item.percentual}% do total.
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dash-empty">Nenhuma obra ultrapassou o limite de concentração definido.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ titulo, valor, detalhe, destaque, icon: Icon, variante }) {
  const varianteClass = variante ? ` dash-kpi-card--${variante}` : '';
  return (
    <article className={`dash-kpi-card${varianteClass}`}>
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
        <strong>{destaque}</strong>
      </div>
    </article>
  );
}

function MiniStat({ titulo, valor, descricao }) {
  return (
    <div className="dash-mini-stat">
      <div className="dash-mini-stat-label">{titulo}</div>
      <div className="dash-mini-stat-value">{valor}</div>
      <div className="dash-mini-stat-desc">{descricao}</div>
    </div>
  );
}

function BarPanel({ titulo, subtitulo, itens }) {
  const maximo = Math.max(...itens.map((item) => Number(item.valor || 0)), 0);
  const totalPanel = itens.reduce((acc, item) => acc + Number(item.valor || 0), 0);

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
            const percentualTotal = totalPanel > 0
              ? Number(((valor / totalPanel) * 100).toFixed(1))
              : 0;
            return (
              <div key={`${titulo}-${item.label}-${index}`} className="dash-bar-row">
                <div className="dash-bar-top">
                  <div>
                    <div className="dash-bar-label">{item.label}</div>
                    <div className="dash-bar-meta">{item.meta}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <strong>{formatarMoedaBRL(valor)}</strong>
                    <div className="dash-bar-meta">{percentualTotal}% do total</div>
                  </div>
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

function InsightsPanel({ itens }) {
  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2>Leituras para decisão</h2>
          <p>Pontos de leitura rápida para orientar priorização e alocação financeira.</p>
        </div>
      </div>
      <div className="dash-insights">
        {itens.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.titulo} className={`dash-insight dash-insight-${item.tonalidade || 'neutral'}`}>
              <div className="dash-insight-icon">
                <Icon size={18} />
              </div>
              <div className="space-y-1">
                <h3>{item.titulo}</h3>
                <p>{item.descricao}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BadgeStatus({ valor }) {
  const cls = STATUS_BADGE_MAP[String(valor || '').toLowerCase()] || 'badge-gray';
  const label = STATUS_LABEL_MAP[String(valor || '').toLowerCase()] || formatarStatus(valor);
  return <span className={`dash-badge ${cls}`}>{label}</span>;
}

function BadgePrioridade({ valor }) {
  const key = String(valor || '').toLowerCase();
  const cls = PRIORIDADE_BADGE_MAP[key] || 'badge-gray';
  const label = PRIORIDADE_LABEL_MAP[key] || (valor ? String(valor).charAt(0).toUpperCase() + String(valor).slice(1) : '-');
  return <span className={`dash-badge ${cls}`}>{label}</span>;
}

function AlertPanel({ titulo, subtitulo, itens, acaoLabel, onAcao }) {
  const navigate = useNavigate();
  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
        {acaoLabel && onAcao && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onAcao}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}
          >
            {acaoLabel}
            <HiOutlineArrowTopRightOnSquare size={14} />
          </button>
        )}
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
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/provisoes-financeiras/${item.id}`)}
            >
              <div className="dash-alert-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{item.codigo}</span>
                <HiOutlineArrowTopRightOnSquare size={14} style={{ color: 'var(--c-muted)', flexShrink: 0 }} />
              </div>
              <div className="dash-alert-meta">
                {formatarObra(item.obra)} — {formatarData(item.data_prevista_desembolso)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', marginTop: '0.4rem' }}>
                <span className="dash-alert-meta">{formatarMoedaBRL(item.valor_previsto)}</span>
                <BadgeStatus valor={item.status} />
                <BadgePrioridade valor={item.prioridade} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
