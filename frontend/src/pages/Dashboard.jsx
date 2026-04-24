import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, authHeaders } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatsCard from '../components/StatsCard';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';

/* ─── Utilitários ──────────────────────────────────────────────── */
function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function normalizeStatus(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase();
}

/* ─── Sub-componentes internos ─────────────────────────────────── */

/** Barra de progresso relativa para listas de distribuição */
function ProgressList({ items = [], labelKey, valueKey, colors, valueFormatter }) {
  const maiorValor = items.reduce(
    (max, item) => Math.max(max, Number(item[valueKey] || 0)),
    0
  );

  if (!items.length) {
    return (
      <EmptyState
        title="Nenhum dado disponível"
        message="Não há registros para exibir neste período."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => {
        const total = Number(item[valueKey] || 0);
        const perc = maiorValor ? (total / maiorValor) * 100 : 0;
        const color = colors[index % colors.length];

        return (
          <div key={`${item[labelKey]}-${index}`} className="grid gap-1">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--c-muted)' }}>{item[labelKey]}</span>
              <span className="font-semibold" style={{ color: 'var(--c-text)' }}>
                {valueFormatter ? valueFormatter(total) : total}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--ui-border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${perc}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Card de seção do dashboard — superfície glass */
function SectionCard({ title, pill, children }) {
  return (
    <div className="card sol-surface-card grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold" style={{ color: 'var(--c-text)' }}>
          {title}
        </h3>
        {pill && (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              background: 'var(--ui-surface-soft)',
              color: 'var(--c-muted)',
              border: '1px solid var(--ui-border)',
            }}
          >
            {pill}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Item de lista financeira (obras, parceiros, vencimentos) */
function FinanceiroRow({ left, leftSub, rightLabel, rightValue, rightColor, href }) {
  const inner = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p
          className="truncate font-medium"
          style={{ color: href ? 'var(--c-primary)' : 'var(--c-text)' }}
        >
          {left}
        </p>
        {leftSub && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--c-muted)' }}>
            {leftSub}
          </p>
        )}
      </div>
      {(rightLabel || rightValue) && (
        <div className="shrink-0 text-right">
          {rightLabel && (
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--c-muted)' }}>
              {rightLabel}
            </p>
          )}
          <p
            className="font-semibold"
            style={{ color: rightColor ?? 'var(--c-text)' }}
          >
            {rightValue}
          </p>
        </div>
      )}
    </div>
  );

  const rowClass =
    'app-list-card transition-colors';
  const rowStyle = { borderColor: 'var(--ui-border)', background: 'var(--ui-surface)' };

  if (href) {
    return (
      <Link
        to={href}
        className={`${rowClass} hover:border-[var(--ui-border-strong)] block`}
        style={rowStyle}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={rowClass} style={rowStyle}>
      {inner}
    </div>
  );
}

/* ─── Componente principal ─────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const perfil = String(user?.perfil || '').toUpperCase();

  const [dados, setDados] = useState({
    total: 0,
    porStatus: [],
    porArea: [],
    valoresPorStatus: [],
    financeiro: {
      enabled: false,
      total_pagar_aberto: 0,
      total_receber_aberto: 0,
      quantidade_pagar_aberto: 0,
      quantidade_receber_aberto: 0,
      pagar_vencido: 0,
      receber_vencido: 0,
      quantidade_pagar_vencido: 0,
      quantidade_receber_vencido: 0,
      movimentado_mes_pagar: 0,
      movimentado_mes_receber: 0,
      conciliacao_pendente_quantidade: 0,
      conciliacao_pendente_valor: 0,
      conciliacaoPorConta: [],
      conciliacaoPendenciasRecentes: [],
      porObra: [],
      porParceiro: [],
      proximosVencimentos: [],
    },
    visao: { solicitacoes: false, financeiro: false },
  });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`${API_URL}/dashboard/executivo`, {
          headers: authHeaders(),
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
          valoresPorStatus: Array.isArray(json.valoresPorStatus) ? json.valoresPorStatus : [],
          financeiro: {
            enabled: Boolean(json.financeiro?.enabled),
            total_pagar_aberto: Number(json.financeiro?.total_pagar_aberto || 0),
            total_receber_aberto: Number(json.financeiro?.total_receber_aberto || 0),
            quantidade_pagar_aberto: Number(json.financeiro?.quantidade_pagar_aberto || 0),
            quantidade_receber_aberto: Number(json.financeiro?.quantidade_receber_aberto || 0),
            pagar_vencido: Number(json.financeiro?.pagar_vencido || 0),
            receber_vencido: Number(json.financeiro?.receber_vencido || 0),
            quantidade_pagar_vencido: Number(json.financeiro?.quantidade_pagar_vencido || 0),
            quantidade_receber_vencido: Number(json.financeiro?.quantidade_receber_vencido || 0),
            movimentado_mes_pagar: Number(json.financeiro?.movimentado_mes_pagar || 0),
            movimentado_mes_receber: Number(json.financeiro?.movimentado_mes_receber || 0),
            conciliacao_pendente_quantidade: Number(json.financeiro?.conciliacao_pendente_quantidade || 0),
            conciliacao_pendente_valor: Number(json.financeiro?.conciliacao_pendente_valor || 0),
            conciliacaoPorConta: Array.isArray(json.financeiro?.conciliacaoPorConta) ? json.financeiro.conciliacaoPorConta : [],
            conciliacaoPendenciasRecentes: Array.isArray(json.financeiro?.conciliacaoPendenciasRecentes) ? json.financeiro.conciliacaoPendenciasRecentes : [],
            porObra: Array.isArray(json.financeiro?.porObra) ? json.financeiro.porObra : [],
            porParceiro: Array.isArray(json.financeiro?.porParceiro) ? json.financeiro.porParceiro : [],
            proximosVencimentos: Array.isArray(json.financeiro?.proximosVencimentos) ? json.financeiro.proximosVencimentos : [],
          },
          visao: {
            solicitacoes: Boolean(json.visao?.solicitacoes),
            financeiro: Boolean(json.visao?.financeiro),
          },
        });
      } catch (error) {
        setErro(error?.message || 'Erro ao carregar dashboard');
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  /* Cores para barras de progresso */
  const cores = ['#3b82f6', '#6366f1', '#0ea5e9', '#8b5cf6', '#2563eb'];

  const totalSolicitacoesValor = useMemo(
    () => dados.valoresPorStatus.reduce((acc, item) => acc + Number(item.valor_total || 0), 0),
    [dados.valoresPorStatus]
  );

  const getTotalByStatus = (status) => {
    const target = normalizeStatus(status);
    const match = dados.porStatus.find(
      (item) => normalizeStatus(item.status_global) === target
    );
    return Number(match?.total || 0);
  };

  const titulo = useMemo(() => {
    if (dados.visao.solicitacoes && dados.visao.financeiro && perfil === 'SUPERADMIN')
      return 'Dashboard Executivo';
    if (dados.visao.solicitacoes && dados.visao.financeiro)
      return 'Dashboard Integrado';
    if (dados.visao.financeiro) return 'Dashboard Financeiro';
    return perfil === 'SUPERADMIN' ? 'Dashboard Executivo' : 'Dashboard do Setor';
  }, [dados.visao, perfil]);

  const subtitulo = useMemo(() => {
    if (dados.visao.solicitacoes && dados.visao.financeiro)
      return 'Visão combinada de solicitações e financeiro.';
    if (dados.visao.financeiro)
      return 'Acompanhamento de pagar, receber, vencidos e conciliação.';
    return 'Visão operacional das solicitações e indicadores.';
  }, [dados.visao]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="page">
        <Spinner full size="lg" label="Carregando dashboard..." />
      </div>
    );
  }

  /* ── Erro ── */
  if (erro) {
    return (
      <div className="page">
        <h1 className="page-title">Dashboard</h1>
        <Alert type="error" title="Não foi possível carregar o dashboard" message={erro} />
      </div>
    );
  }

  /* ── Render principal ── */
  return (
    <div className="page dashboard solicitacoes-page">

      {/* Cabeçalho */}
      <div className="dash-hero sol-surface-card">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--c-muted)' }}
            >
              {dados.visao.financeiro && !dados.visao.solicitacoes
                ? 'Visão Financeira'
                : 'Visão Operacional'}
            </p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--c-text)' }}>
              {titulo}
            </h1>
            <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
              {subtitulo}
            </p>
          </div>
          <div className="chip mt-1">
            <span className="chip-dot" style={{ background: '#3b82f6' }} />
            Atualização em tempo real
          </div>
        </div>
      </div>

      {/* ─── KPIs de solicitações ─── */}
      {dados.visao.solicitacoes && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de solicitações"
            value={dados.total}
            color="blue"
          />
          <StatsCard
            title="Pendentes"
            value={getTotalByStatus('PENDENTE')}
            color="amber"
          />
          <StatsCard
            title="Em análise"
            value={getTotalByStatus('EM_ANALISE')}
            color="purple"
          />
          <StatsCard
            title="Valor total"
            value={formatCurrency(totalSolicitacoesValor)}
            color="green"
          />
        </div>
      )}

      {/* ─── KPIs financeiros ─── */}
      {dados.visao.financeiro && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="A pagar (aberto)"
            value={formatCurrency(dados.financeiro.total_pagar_aberto)}
            subtitle={`${dados.financeiro.quantidade_pagar_aberto} título(s)`}
            color="blue"
          />
          <StatsCard
            title="A receber (aberto)"
            value={formatCurrency(dados.financeiro.total_receber_aberto)}
            subtitle={`${dados.financeiro.quantidade_receber_aberto} título(s)`}
            color="green"
          />
          <StatsCard
            title="Pagar vencido"
            value={formatCurrency(dados.financeiro.pagar_vencido)}
            subtitle={`${dados.financeiro.quantidade_pagar_vencido} em atraso`}
            color="red"
          />
          <StatsCard
            title="Conciliação pendente"
            value={dados.financeiro.conciliacao_pendente_quantidade}
            subtitle={formatCurrency(dados.financeiro.conciliacao_pendente_valor)}
            color="amber"
          />
        </div>
      )}

      {/* ─── Movimentação do mês ─── */}
      {dados.visao.financeiro && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatsCard
            title="Pago no mês"
            value={formatCurrency(dados.financeiro.movimentado_mes_pagar)}
            color="blue"
          />
          <StatsCard
            title="Recebido no mês"
            value={formatCurrency(dados.financeiro.movimentado_mes_receber)}
            color="green"
          />
        </div>
      )}

      {/* ─── Distribuição por status e área ─── */}
      {dados.visao.solicitacoes && (
        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Solicitações por status" pill="Operação">
            <ProgressList
              items={dados.porStatus.map((item) => ({
                label: item.status_global,
                total: Number(item.total || 0),
              }))}
              labelKey="label"
              valueKey="total"
              colors={cores}
            />
          </SectionCard>

          <SectionCard title="Solicitações por área" pill="Carga">
            <ProgressList
              items={dados.porArea.map((item) => ({
                label: item.area_responsavel,
                total: Number(item.total || 0),
              }))}
              labelKey="label"
              valueKey="total"
              colors={cores}
            />
          </SectionCard>
        </div>
      )}

      {/* ─── Valores por status ─── */}
      {dados.visao.solicitacoes && (
        <SectionCard title="Valores por status" pill="Solicitações">
          <ProgressList
            items={dados.valoresPorStatus.map((item) => ({
              label: item.status_global,
              total: Number(item.valor_total || 0),
            }))}
            labelKey="label"
            valueKey="total"
            colors={cores}
            valueFormatter={formatCurrency}
          />
        </SectionCard>
      )}

      {/* ─── Financeiro: obras e parceiros ─── */}
      {dados.visao.financeiro && (
        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Posição por obra" pill="Financeiro">
            {dados.financeiro.porObra.length === 0 ? (
              <EmptyState
                title="Sem títulos em aberto"
                message="Nenhum título em aberto nas obras visíveis."
              />
            ) : (
              <div className="grid gap-2">
                {dados.financeiro.porObra.map((item) => (
                  <FinanceiroRow
                    key={item.obra_id}
                    left={item.obra_nome}
                    leftSub={`Pagar ${formatCurrency(item.pagar_aberto)} · Receber ${formatCurrency(item.receber_aberto)}`}
                    rightLabel="Saldo projetado"
                    rightValue={formatCurrency(item.saldo_projetado)}
                    rightColor={item.saldo_projetado >= 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Posição por parceiro" pill="Exposição">
            {dados.financeiro.porParceiro.length === 0 ? (
              <EmptyState
                title="Sem saldo aberto"
                message="Nenhum parceiro com saldo financeiro aberto."
              />
            ) : (
              <div className="grid gap-2">
                {dados.financeiro.porParceiro.map((item) => (
                  <FinanceiroRow
                    key={item.parceiro_id}
                    left={item.parceiro_nome}
                    leftSub={`Pagar ${formatCurrency(item.pagar_aberto)} · Receber ${formatCurrency(item.receber_aberto)}`}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ─── Próximos vencimentos ─── */}
      {dados.visao.financeiro && (
        <SectionCard title="Próximos vencimentos" pill="Até 8 títulos">
          {dados.financeiro.proximosVencimentos.length === 0 ? (
            <EmptyState
              title="Nenhum vencimento pendente"
              message="Não há títulos com vencimento próximo."
            />
          ) : (
            <div className="grid gap-2">
              {dados.financeiro.proximosVencimentos.map((item) => (
                <FinanceiroRow
                  key={item.id}
                  href={`/financeiro/titulos/${item.id}`}
                  left={item.descricao || `Título #${item.id}`}
                  leftSub={`${item.parceiro_nome} · ${item.obra_nome}`}
                  rightLabel={`${item.tipo} · vence em ${formatDate(item.data_vencimento)}`}
                  rightValue={formatCurrency(item.valor_saldo)}
                />
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── Conciliação bancária ─── */}
      {dados.visao.financeiro && (
        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Conciliação pendente por conta" pill={
            <Link className="pill" to="/financeiro/conciliacao">
              Abrir conciliação
            </Link>
          }>
            {dados.financeiro.conciliacaoPorConta.length === 0 ? (
              <EmptyState title="Sem pendências" message="Nenhuma pendência bancária." />
            ) : (
              <div className="grid gap-2">
                {dados.financeiro.conciliacaoPorConta.map((item) => (
                  <FinanceiroRow
                    key={item.conta_bancaria_id ?? item.conta_bancaria_nome}
                    left={item.conta_bancaria_nome}
                    leftSub={`${item.pendentes} pendência(s)`}
                    rightLabel="Volume"
                    rightValue={formatCurrency(item.valor_total)}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Últimas pendências bancárias"
            pill={formatCurrency(dados.financeiro.conciliacao_pendente_valor)}
          >
            {dados.financeiro.conciliacaoPendenciasRecentes.length === 0 ? (
              <EmptyState title="Sem pendências recentes" />
            ) : (
              <div className="grid gap-2">
                {dados.financeiro.conciliacaoPendenciasRecentes.map((item) => (
                  <FinanceiroRow
                    key={item.id}
                    left={item.descricao_banco || `Lançamento #${item.id}`}
                    leftSub={`${item.conta_bancaria_nome} · ${formatDate(item.data_movimento)}${item.documento ? ` · Doc. ${item.documento}` : ''}`}
                    rightValue={formatCurrency(item.valor)}
                    rightColor={Number(item.valor || 0) >= 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
