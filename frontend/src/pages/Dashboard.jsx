import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowTrendingUp,
  HiOutlineBanknotes,
  HiOutlineBuildingOffice2,
  HiOutlineCheckBadge,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineScale
} from 'react-icons/hi2';
import { API_URL, authHeaders } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function normalizeStatus(value) {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function calcularPercentual(total, referencia) {
  if (!referencia) return 0;
  return Number(((Number(total || 0) / Number(referencia || 0)) * 100).toFixed(1));
}

export default function Dashboard() {
  const { user } = useAuth();
  const isSuperadmin = String(user?.perfil || '').toUpperCase() === 'SUPERADMIN';

  const [dados, setDados] = useState({
    total: 0,
    porStatus: [],
    porArea: [],
    valoresPorStatus: []
  });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregarDashboard() {
      try {
        const res = await fetch(`${API_URL}/dashboard/executivo`, {
          headers: authHeaders()
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || 'Acesso negado');
        }

        const json = await res.json();
        setDados({
          total: json.total ?? 0,
          porStatus: Array.isArray(json.porStatus) ? json.porStatus : [],
          porArea: Array.isArray(json.porArea) ? json.porArea : [],
          valoresPorStatus: Array.isArray(json.valoresPorStatus) ? json.valoresPorStatus : []
        });
      } catch (error) {
        console.error('Erro ao carregar dashboard', error);
        setErro(error?.message || 'Erro ao carregar dashboard');
      } finally {
        setLoading(false);
      }
    }

    carregarDashboard();
  }, []);

  const totaisPorStatus = useMemo(() => {
    const mapa = new Map();
    dados.porStatus.forEach((item) => {
      mapa.set(normalizeStatus(item.status_global), Number(item.total || 0));
    });
    return mapa;
  }, [dados.porStatus]);

  const valorTotal = useMemo(
    () => dados.valoresPorStatus.reduce(
      (acc, item) => acc + Number(item.valor_total || 0),
      0
    ),
    [dados.valoresPorStatus]
  );

  const pendentes = totaisPorStatus.get('PENDENTE') || 0;
  const emAnalise = totaisPorStatus.get('EM_ANALISE') || 0;
  const concluidas = totaisPorStatus.get('CONCLUIDA') || 0;
  const taxaPendencia = calcularPercentual(pendentes, dados.total);
  const taxaConclusao = calcularPercentual(concluidas, dados.total);
  const cargaAtiva = pendentes + emAnalise;

  const rankingStatus = useMemo(
    () => [...dados.porStatus]
      .map((item) => ({
        label: item.status_global || '-',
        valor: Number(item.total || 0),
        meta: `${calcularPercentual(item.total, dados.total)}% do volume`
      }))
      .sort((a, b) => b.valor - a.valor),
    [dados.porStatus, dados.total]
  );

  const rankingAreas = useMemo(
    () => [...dados.porArea]
      .map((item) => ({
        label: item.area_responsavel || '-',
        valor: Number(item.total || 0),
        meta: `${calcularPercentual(item.total, dados.total)}% da carga`
      }))
      .sort((a, b) => b.valor - a.valor),
    [dados.porArea, dados.total]
  );

  const rankingValores = useMemo(
    () => [...dados.valoresPorStatus]
      .map((item) => ({
        label: item.status_global || '-',
        valor: Number(item.valor_total || 0),
        meta: `${calcularPercentual(item.valor_total, valorTotal)}% da exposicao`
      }))
      .sort((a, b) => b.valor - a.valor),
    [dados.valoresPorStatus, valorTotal]
  );

  const statusDominante = rankingStatus[0] || null;
  const areaMaisDemandada = rankingAreas[0] || null;
  const maiorExposicao = rankingValores[0] || null;

  const cards = [
    {
      titulo: 'Volume total',
      valor: dados.total,
      detalhe: `${cargaAtiva} solicitacao(oes) em fluxo ativo`,
      destaque: `${taxaPendencia}% pendente`,
      icon: HiOutlineClipboardDocumentList
    },
    {
      titulo: 'Pendentes',
      valor: pendentes,
      detalhe: `${emAnalise} em analise`,
      destaque: `${taxaPendencia}% do volume`,
      icon: HiOutlineClock
    },
    {
      titulo: 'Concluidas',
      valor: concluidas,
      detalhe: `${taxaConclusao}% do volume total`,
      destaque: taxaConclusao >= 50 ? 'Fluxo saudavel' : 'Acompanhar throughput',
      icon: HiOutlineCheckBadge
    },
    {
      titulo: 'Exposicao financeira',
      valor: formatarMoeda(valorTotal),
      detalhe: maiorExposicao ? `Maior concentracao em ${maiorExposicao.label}` : 'Sem valores consolidados',
      destaque: maiorExposicao ? maiorExposicao.meta : 'Sem exposicao',
      icon: HiOutlineBanknotes
    }
  ];

  const leiturasGestao = [
    {
      titulo: 'Status dominante',
      descricao: statusDominante
        ? `${statusDominante.label} lidera o fluxo com ${statusDominante.valor} solicitacao(oes).`
        : 'Sem dados de status no recorte atual.',
      tonalidade: 'primary',
      icon: HiOutlineArrowTrendingUp
    },
    {
      titulo: 'Area mais demandada',
      descricao: areaMaisDemandada
        ? `${areaMaisDemandada.label} concentra ${areaMaisDemandada.valor} solicitacao(oes).`
        : 'Sem areas com carga registrada.',
      tonalidade: 'neutral',
      icon: HiOutlineBuildingOffice2
    },
    {
      titulo: 'Ponto de atencao',
      descricao: taxaPendencia >= 40
        ? 'O volume pendente esta alto. Vale revisar capacidade e prioridades do setor lider.'
        : 'A taxa de pendencia esta sob controle no recorte atual.',
      tonalidade: taxaPendencia >= 40 ? 'warning' : 'success',
      icon: HiOutlineExclamationTriangle
    },
    {
      titulo: 'Equilibrio do fluxo',
      descricao: taxaConclusao >= 50
        ? 'A taxa de conclusao esta consistente para a operacao atual.'
        : 'A taxa de conclusao pede revisao de gargalos ou reasignacao de capacidade.',
      tonalidade: taxaConclusao >= 50 ? 'success' : 'warning',
      icon: HiOutlineScale
    }
  ];

  const titulo = isSuperadmin ? 'Dashboard Executivo' : 'Dashboard do Setor';
  const subtitulo = isSuperadmin
    ? 'Visao consolidada para acompanhar pressao operacional, distribuicao por area e exposicao financeira.'
    : 'Visao consolidada do seu setor para acompanhar volume, ritmo e concentracao.';

  if (loading) {
    return (
      <div className="page dashboard">
        <p className="text-sm" style={{ color: 'var(--c-muted)' }}>Carregando dashboard executivo...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="page dashboard">
        <div className="card">
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--c-muted)' }}>{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboard space-y-6">
      <section className="dash-hero">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--c-muted)' }}>
              {isSuperadmin ? 'Visao global' : 'Visao setorial'}
            </p>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--c-text)' }}>{titulo}</h1>
            <p className="text-sm max-w-3xl" style={{ color: 'var(--c-muted)' }}>{subtitulo}</p>
          </div>
          <div className="chip">
            <span className="chip-dot" style={{ background: '#3b82f6' }} />
            Dados consolidados em tempo real
          </div>
        </div>

        <div className="dash-hero-grid relative z-10">
          <div className="glass dash-spotlight">
            <div className="dash-spotlight-icon">
              <HiOutlineClipboardDocumentList size={22} />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--c-muted)' }}>
                Pulso operacional
              </p>
              <div className="dash-spotlight-value">{dados.total}</div>
              <p className="dash-spotlight-note">
                {statusDominante
                  ? `${statusDominante.label} e o principal ponto de concentracao do fluxo atual.`
                  : 'Ainda nao ha massa suficiente para leitura do fluxo.'}
              </p>
            </div>
          </div>

          <div className="glass dash-hero-side">
            <MiniStat
              titulo="Pendencias"
              valor={`${taxaPendencia}%`}
              descricao={`${pendentes} solicitacao(oes) pendentes`}
            />
            <MiniStat
              titulo="Conclusao"
              valor={`${taxaConclusao}%`}
              descricao={`${concluidas} solicitacao(oes) concluida(s)`}
            />
            <MiniStat
              titulo="Area lider"
              valor={areaMaisDemandada?.label || '-'}
              descricao={areaMaisDemandada ? `${areaMaisDemandada.valor} solicitacao(oes)` : 'Sem concentracao relevante'}
            />
          </div>
        </div>
      </section>

      <section className="dash-kpi-grid">
        {cards.map((card) => (
          <MetricCard key={card.titulo} {...card} />
        ))}
      </section>

      <section className="dash-section-grid">
        <BarPanel
          titulo="Pressao por status"
          subtitulo="Distribuicao atual do fluxo para orientar priorizacao."
          itens={rankingStatus}
          formatter={(valor) => String(valor)}
        />
        <BarPanel
          titulo="Carga por area"
          subtitulo="Onde o volume esta concentrado agora."
          itens={rankingAreas}
          formatter={(valor) => String(valor)}
        />
      </section>

      <section className="dash-section-grid">
        <BarPanel
          titulo="Exposicao financeira por status"
          subtitulo="Leitura direta da concentracao financeira do pipeline."
          itens={rankingValores}
          formatter={(valor) => formatarMoeda(valor)}
        />
        <InsightsPanel itens={leiturasGestao} />
      </section>
    </div>
  );
}

function MetricCard({ titulo, valor, detalhe, destaque, icon: Icon }) {
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

function BarPanel({ titulo, subtitulo, itens, formatter }) {
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
            const percentual = maximo > 0 ? Math.max(6, (valor / maximo) * 100) : 0;
            return (
              <div key={`${titulo}-${item.label}-${index}`} className="dash-bar-row">
                <div className="dash-bar-top">
                  <div>
                    <div className="dash-bar-label">{item.label}</div>
                    <div className="dash-bar-meta">{item.meta}</div>
                  </div>
                  <strong>{formatter(valor)}</strong>
                </div>
                <div className="dash-bar-track">
                  <div className="dash-bar-fill" style={{ width: `${percentual}%` }} />
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
          <h2>Leituras para decisao</h2>
          <p>Resumo objetivo para orientar priorizacao e alocacao de capacidade.</p>
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
