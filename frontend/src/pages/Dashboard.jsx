import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL, authHeaders } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function normalizeStatus(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function statusLabel(value) {
  return String(value || 'Sem status')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function MetricTile({ label, value, detail, href }) {
  const content = (
    <div className="relative overflow-hidden rounded-3xl border border-blue-700 bg-gradient-to-br from-blue-950 to-sky-800 p-4 text-white shadow-sm">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
      <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-white/65">{label}</p>
      <strong className="relative mt-3 block text-2xl font-semibold tracking-tight md:text-3xl">{value}</strong>
      {detail ? <p className="relative mt-2 text-xs leading-5 text-white/70">{detail}</p> : null}
    </div>
  );

  if (!href) return content;

  return (
    <Link to={href} className="block transition-transform hover:-translate-y-0.5">
      {content}
    </Link>
  );
}

function DecisionItem({ tone = 'slate', title, detail, value, href }) {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700'
  };

  const content = (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 shadow-sm transition-colors hover:bg-[var(--c-bg)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${tones[tone] || tones.slate}`}>
            {tone === 'red' ? 'Critico' : tone === 'amber' ? 'Atencao' : 'Acao'}
          </span>
          <p className="font-semibold text-[var(--c-text)]">{title}</p>
        </div>
        {detail ? <p className="mt-1 text-sm leading-5 text-[var(--c-muted)]">{detail}</p> : null}
      </div>
      {value ? <strong className="shrink-0 text-right text-sm text-[var(--c-text)]">{value}</strong> : null}
    </div>
  );

  if (!href) return content;

  return <Link to={href} className="block">{content}</Link>;
}

function Section({ title, subtitle, action, children }) {
  return (
    <section className="sol-surface-card rounded-3xl p-4 md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)] md:text-lg">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[var(--c-muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BarList({ items, labelKey, valueKey, valueFormatter = formatNumber, limit = 6 }) {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => ({ ...item, value: Number(item?.[valueKey] || 0) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
  const max = normalized.reduce((acc, item) => Math.max(acc, item.value), 0);

  if (!normalized.length) {
    return <EmptyState title="Sem dados relevantes" message="Nada exige leitura executiva neste momento." />;
  }

  return (
    <div className="grid gap-3">
      {normalized.map((item, index) => {
        const percent = max ? Math.max(8, (item.value / max) * 100) : 0;
        return (
          <div key={`${item[labelKey]}-${index}`} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-[var(--c-text)]">{item[labelKey] || '-'}</span>
              <span className="shrink-0 font-semibold text-[var(--c-muted)]">{valueFormatter(item.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate-900 via-blue-700 to-sky-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FinanceRow({ title, subtitle, amount, tone = 'slate', href }) {
  const amountColor = tone === 'red' ? 'text-red-600' : tone === 'green' ? 'text-emerald-600' : 'text-[var(--c-text)]';
  const content = (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--c-text)]">{title || '-'}</p>
        {subtitle ? <p className="mt-0.5 text-sm text-[var(--c-muted)]">{subtitle}</p> : null}
      </div>
      <strong className={`shrink-0 text-right ${amountColor}`}>{amount}</strong>
    </div>
  );

  if (!href) return content;
  return <Link to={href} className="block transition-transform hover:-translate-y-0.5">{content}</Link>;
}

function createDefaultDashboardState() {
  return {
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
      proximosVencimentos: []
    },
    visao: { solicitacoes: false, financeiro: false }
  };
}

function normalizeDashboardResponse(json) {
  return {
    total: Number(json?.total || 0),
    porStatus: Array.isArray(json?.porStatus) ? json.porStatus : [],
    porArea: Array.isArray(json?.porArea) ? json.porArea : [],
    valoresPorStatus: Array.isArray(json?.valoresPorStatus) ? json.valoresPorStatus : [],
    financeiro: {
      enabled: Boolean(json?.financeiro?.enabled),
      total_pagar_aberto: Number(json?.financeiro?.total_pagar_aberto || 0),
      total_receber_aberto: Number(json?.financeiro?.total_receber_aberto || 0),
      quantidade_pagar_aberto: Number(json?.financeiro?.quantidade_pagar_aberto || 0),
      quantidade_receber_aberto: Number(json?.financeiro?.quantidade_receber_aberto || 0),
      pagar_vencido: Number(json?.financeiro?.pagar_vencido || 0),
      receber_vencido: Number(json?.financeiro?.receber_vencido || 0),
      quantidade_pagar_vencido: Number(json?.financeiro?.quantidade_pagar_vencido || 0),
      quantidade_receber_vencido: Number(json?.financeiro?.quantidade_receber_vencido || 0),
      movimentado_mes_pagar: Number(json?.financeiro?.movimentado_mes_pagar || 0),
      movimentado_mes_receber: Number(json?.financeiro?.movimentado_mes_receber || 0),
      conciliacao_pendente_quantidade: Number(json?.financeiro?.conciliacao_pendente_quantidade || 0),
      conciliacao_pendente_valor: Number(json?.financeiro?.conciliacao_pendente_valor || 0),
      conciliacaoPorConta: Array.isArray(json?.financeiro?.conciliacaoPorConta) ? json.financeiro.conciliacaoPorConta : [],
      conciliacaoPendenciasRecentes: Array.isArray(json?.financeiro?.conciliacaoPendenciasRecentes) ? json.financeiro.conciliacaoPendenciasRecentes : [],
      porObra: Array.isArray(json?.financeiro?.porObra) ? json.financeiro.porObra : [],
      porParceiro: Array.isArray(json?.financeiro?.porParceiro) ? json.financeiro.porParceiro : [],
      proximosVencimentos: Array.isArray(json?.financeiro?.proximosVencimentos) ? json.financeiro.proximosVencimentos : []
    },
    visao: {
      solicitacoes: Boolean(json?.visao?.solicitacoes),
      financeiro: Boolean(json?.visao?.financeiro)
    }
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const perfil = String(user?.perfil || '').toUpperCase();
  const [dados, setDados] = useState(createDefaultDashboardState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  async function carregarDashboard({ initial = false } = {}) {
    try {
      if (initial) setLoading(true);
      setRefreshing(!initial);
      setErro('');

      const res = await fetch(`${API_URL}/dashboard/executivo`, {
        headers: authHeaders()
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Acesso negado');
      }

      const json = await res.json();
      setDados(normalizeDashboardResponse(json));
      setUpdatedAt(new Date().toISOString());
    } catch (error) {
      setErro(error?.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    carregarDashboard({ initial: true });
  }, []);

  const financeiro = dados.financeiro;
  const saldoAberto = financeiro.total_receber_aberto - financeiro.total_pagar_aberto;
  const resultadoMes = financeiro.movimentado_mes_receber - financeiro.movimentado_mes_pagar;
  const totalVencido = financeiro.pagar_vencido + financeiro.receber_vencido;
  const totalSolicitacoesValor = useMemo(
    () => dados.valoresPorStatus.reduce((acc, item) => acc + Number(item.valor_total || 0), 0),
    [dados.valoresPorStatus]
  );

  const statusMap = useMemo(() => {
    return dados.porStatus.reduce((acc, item) => {
      acc[normalizeStatus(item.status_global)] = Number(item.total || item.get?.('total') || 0);
      return acc;
    }, {});
  }, [dados.porStatus]);

  const solicitacoesPendentes = (statusMap.PENDENTE || 0) + (statusMap.EM_ANALISE || 0) + (statusMap.EM_ANALISE_SETOR || 0);

  const topAreas = useMemo(() => {
    return dados.porArea
      .map((item) => ({
        area: item.area_responsavel || 'Sem area',
        total: Number(item.total || item.get?.('total') || 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [dados.porArea]);

  const topStatus = useMemo(() => {
    return dados.porStatus
      .map((item) => ({
        status: statusLabel(item.status_global),
        total: Number(item.total || item.get?.('total') || 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [dados.porStatus]);

  const decisoes = useMemo(() => {
    const items = [];

    if (dados.visao.financeiro && financeiro.pagar_vencido > 0) {
      items.push({
        tone: 'red',
        title: 'Regularizar pagamentos vencidos',
        detail: `${financeiro.quantidade_pagar_vencido} titulo(s) vencido(s) podem gerar bloqueio operacional ou juros.`,
        value: formatCurrency(financeiro.pagar_vencido),
        href: '/financeiro/titulos'
      });
    }

    if (dados.visao.financeiro && financeiro.receber_vencido > 0) {
      items.push({
        tone: 'amber',
        title: 'Priorizar cobranca de recebiveis atrasados',
        detail: `${financeiro.quantidade_receber_vencido} titulo(s) vencido(s) impactam caixa previsto.`,
        value: formatCurrency(financeiro.receber_vencido),
        href: '/financeiro/titulos'
      });
    }

    if (dados.visao.financeiro && financeiro.conciliacao_pendente_quantidade > 0) {
      items.push({
        tone: 'blue',
        title: 'Concluir conciliacao bancaria',
        detail: 'Movimentos pendentes reduzem confianca nos saldos e relatorios.',
        value: `${financeiro.conciliacao_pendente_quantidade} pend.`,
        href: '/financeiro/conciliacao'
      });
    }

    if (dados.visao.financeiro && saldoAberto < 0) {
      items.push({
        tone: 'red',
        title: 'Saldo aberto projetado negativo',
        detail: 'Ha mais compromissos em aberto do que recebiveis cadastrados.',
        value: formatCurrency(saldoAberto),
        href: '/financeiro/relatorios'
      });
    }

    if (dados.visao.solicitacoes && solicitacoesPendentes > 0) {
      items.push({
        tone: 'amber',
        title: 'Destravar solicitacoes aguardando acao',
        detail: 'Fila pendente ou em analise pode atrasar compras, pagamentos e execucao.',
        value: formatNumber(solicitacoesPendentes),
        href: '/solicitacoes'
      });
    }

    return items.slice(0, 5);
  }, [dados.visao, financeiro, saldoAberto, solicitacoesPendentes]);

  const titulo = useMemo(() => {
    if (dados.visao.solicitacoes && dados.visao.financeiro && perfil === 'SUPERADMIN') return 'Painel Executivo';
    if (dados.visao.solicitacoes && dados.visao.financeiro) return 'Painel Integrado';
    if (dados.visao.financeiro) return 'Painel Financeiro';
    return perfil === 'SUPERADMIN' ? 'Painel Executivo' : 'Painel do Setor';
  }, [dados.visao, perfil]);

  if (loading) {
    return (
      <div className="page">
        <Spinner full size="lg" label="Carregando painel..." />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="page">
        <h1 className="page-title">Dashboard</h1>
        <Alert type="error" title="Nao foi possivel carregar o painel" message={erro} />
      </div>
    );
  }

  return (
    <div className="page dashboard solicitacoes-page space-y-5 md:space-y-6">
      <header className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(30,64,175,0.18),_transparent_34%),linear-gradient(135deg,_#0f172a,_#1e293b_52%,_#0f766e)] p-5 text-white shadow-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Centro de decisao</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight !text-white md:text-4xl">{titulo}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Leitura objetiva dos pontos que pedem acao: vencidos, caixa aberto, conciliacao, fila operacional e exposicao por obra.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white/75">
              Atualizado {formatDateTime(updatedAt)}
            </span>
            <button type="button" className="btn btn-outline border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => carregarDashboard()} disabled={refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dados.visao.financeiro && (
          <>
            <MetricTile
              label="Saldo aberto projetado"
              value={formatCurrency(saldoAberto)}
              detail="Receber em aberto menos pagar em aberto"
              href="/financeiro/relatorios"
            />
            <MetricTile
              label="Resultado do mes"
              value={formatCurrency(resultadoMes)}
              detail="Recebido no mes menos pago no mes"
              href="/financeiro/relatorios"
            />
            <MetricTile
              label="Vencidos em aberto"
              value={formatCurrency(totalVencido)}
              detail={`${financeiro.quantidade_pagar_vencido + financeiro.quantidade_receber_vencido} titulo(s) exigem revisao`}
              href="/financeiro/titulos"
            />
            <MetricTile
              label="Conciliacao pendente"
              value={formatNumber(financeiro.conciliacao_pendente_quantidade)}
              detail={formatCurrency(financeiro.conciliacao_pendente_valor)}
              href="/financeiro/conciliacao"
            />
          </>
        )}

        {dados.visao.solicitacoes && !dados.visao.financeiro && (
          <>
            <MetricTile label="Solicitacoes abertas" value={formatNumber(dados.total)} detail="Total operacional visivel" tone="blue" href="/solicitacoes" />
            <MetricTile label="Aguardando acao" value={formatNumber(solicitacoesPendentes)} detail="Pendentes e em analise" tone={solicitacoesPendentes > 0 ? 'amber' : 'green'} href="/solicitacoes" />
            <MetricTile label="Valor em solicitacoes" value={formatCurrency(totalSolicitacoesValor)} detail="Base informada nos registros" tone="slate" href="/solicitacoes" />
            <MetricTile label="Areas com demanda" value={formatNumber(topAreas.length)} detail="Setores com solicitacoes abertas" tone="blue" />
          </>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Section
          title="Fila de decisao"
          subtitle="Lista priorizada por risco financeiro e operacional. Comece por aqui."
          action={<span className="rounded-full border border-[var(--c-border)] px-3 py-1 text-xs font-semibold text-[var(--c-muted)]">{decisoes.length} ponto(s)</span>}
        >
          {decisoes.length ? (
            <div className="grid gap-3">
              {decisoes.map((item) => <DecisionItem key={item.title} {...item} />)}
            </div>
          ) : (
            <EmptyState title="Sem acao critica agora" message="Nao ha alertas executivos relevantes com os dados atuais." />
          )}
        </Section>

        {dados.visao.financeiro && (
          <Section title="Pulso financeiro" subtitle="Compara compromissos, recebiveis e movimento liquidado no mes.">
            <div className="grid gap-3">
              <FinanceRow
                title="A receber em aberto"
                subtitle={`${financeiro.quantidade_receber_aberto} titulo(s) a receber`}
                amount={formatCurrency(financeiro.total_receber_aberto)}
                tone="green"
                href="/financeiro/titulos"
              />
              <FinanceRow
                title="A pagar em aberto"
                subtitle={`${financeiro.quantidade_pagar_aberto} titulo(s) a pagar`}
                amount={formatCurrency(financeiro.total_pagar_aberto)}
                tone="red"
                href="/financeiro/titulos"
              />
              <FinanceRow
                title="Recebido no mes"
                subtitle="Entradas baixadas no periodo atual"
                amount={formatCurrency(financeiro.movimentado_mes_receber)}
                tone="green"
              />
              <FinanceRow
                title="Pago no mes"
                subtitle="Saidas baixadas no periodo atual"
                amount={formatCurrency(financeiro.movimentado_mes_pagar)}
                tone="red"
              />
            </div>
          </Section>
        )}
      </section>

      {dados.visao.financeiro && (
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Section title="Proximos vencimentos" subtitle="Agenda curta para antecipar cobranca e pagamento.">
            {financeiro.proximosVencimentos.length ? (
              <div className="grid gap-3">
                {financeiro.proximosVencimentos.map((item) => (
                  <FinanceRow
                    key={item.id}
                    title={item.descricao || `Titulo #${item.id}`}
                    subtitle={`${item.tipo || '-'} - ${item.parceiro_nome || '-'} - ${formatDate(item.data_vencimento)}`}
                    amount={formatCurrency(item.valor_saldo)}
                    tone={String(item.tipo || '').toUpperCase() === 'RECEBER' ? 'green' : 'red'}
                    href={`/financeiro/titulos/${item.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Sem vencimentos proximos" message="Nenhum titulo em aberto na agenda curta." />
            )}
          </Section>

          <Section title="Exposicao por obra" subtitle="Obras que mais podem alterar o caixa aberto.">
            {financeiro.porObra.length ? (
              <div className="grid gap-3">
                {financeiro.porObra.map((item) => (
                  <FinanceRow
                    key={item.obra_id}
                    title={item.obra_nome}
                    subtitle={`Pagar ${formatCurrency(item.pagar_aberto)} - Receber ${formatCurrency(item.receber_aberto)}`}
                    amount={formatCurrency(item.saldo_projetado)}
                    tone={Number(item.saldo_projetado || 0) >= 0 ? 'green' : 'red'}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Sem exposicao por obra" message="Nao ha titulos abertos vinculados a obras visiveis." />
            )}
          </Section>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        {dados.visao.solicitacoes && (
          <Section title="Carga operacional por area" subtitle="Onde a operacao esta concentrada agora.">
            <BarList items={topAreas} labelKey="area" valueKey="total" />
          </Section>
        )}

        {dados.visao.solicitacoes && (
          <Section title="Status das solicitacoes" subtitle="Distribuicao atual para destravar gargalos.">
            <BarList items={topStatus} labelKey="status" valueKey="total" />
          </Section>
        )}

        {dados.visao.financeiro && (
          <Section
            title="Conciliacao por conta"
            subtitle="Contas com maior volume pendente de classificacao."
            action={<Link to="/financeiro/conciliacao" className="btn btn-outline btn-sm">Abrir conciliacao</Link>}
          >
            {financeiro.conciliacaoPorConta.length ? (
              <div className="grid gap-3">
                {financeiro.conciliacaoPorConta.map((item) => (
                  <FinanceRow
                    key={item.conta_bancaria_id || item.conta_bancaria_nome}
                    title={item.conta_bancaria_nome}
                    subtitle={`${item.pendentes} pendencia(s)`}
                    amount={formatCurrency(item.valor_total)}
                    tone="amber"
                    href="/financeiro/conciliacao"
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Conciliacao em dia" message="Nenhuma pendencia bancaria encontrada." />
            )}
          </Section>
        )}

        {dados.visao.financeiro && (
          <Section title="Maiores exposicoes por parceiro" subtitle="Parceiros com maior saldo aberto combinado.">
            {financeiro.porParceiro.length ? (
              <div className="grid gap-3">
                {financeiro.porParceiro.map((item) => (
                  <FinanceRow
                    key={item.parceiro_id}
                    title={item.parceiro_nome}
                    subtitle={`Pagar ${formatCurrency(item.pagar_aberto)} - Receber ${formatCurrency(item.receber_aberto)}`}
                    amount={formatCurrency(Number(item.pagar_aberto || 0) + Number(item.receber_aberto || 0))}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Sem exposicao por parceiro" message="Nao ha saldos financeiros abertos por parceiro." />
            )}
          </Section>
        )}
      </section>
    </div>
  );
}
