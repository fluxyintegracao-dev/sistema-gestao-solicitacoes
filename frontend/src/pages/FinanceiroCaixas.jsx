import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowDownCircle,
  HiOutlineArrowPath,
  HiOutlineArrowUpCircle,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlinePlus,
  HiOutlineScale,
  HiOutlineXMark
} from 'react-icons/hi2';
import {
  abrirCaixaFinanceiro,
  confirmarConciliacaoDiaCaixa,
  estornarMovimentoCaixaFinanceiro,
  fecharCaixaFinanceiro,
  getCaixaFinanceiro,
  getCaixasFinanceiros,
  getContasBancarias,
  registrarMovimentoCaixaFinanceiro
} from '../services/financeiro';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';

const MOVIMENTO_COLUMNS = [
  { key: 'data', width: 112, minWidth: 96 },
  { key: 'natureza', width: 118, minWidth: 104 },
  { key: 'descricao', width: 320, minWidth: 220 },
  { key: 'documento', width: 170, minWidth: 130 },
  { key: 'origem', width: 160, minWidth: 130 },
  { key: 'valor', width: 150, minWidth: 125 },
  { key: 'acao', width: 112, minWidth: 96 }
];

const FECHAMENTO_COLUMNS = [
  { key: 'abertura', width: 120, minWidth: 104 },
  { key: 'fechamento', width: 120, minWidth: 104 },
  { key: 'saldo_inicial', width: 150, minWidth: 126 },
  { key: 'entradas', width: 140, minWidth: 116 },
  { key: 'saidas', width: 140, minWidth: 116 },
  { key: 'saldo_contado', width: 158, minWidth: 132 },
  { key: 'diferenca', width: 156, minWidth: 132 },
  { key: 'responsavel', width: 220, minWidth: 180 }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString || today()}T12:00:00`);
  if (Number.isNaN(date.getTime())) return today();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '-';
}

function contaEhCaixaFisico(conta) {
  return String(conta?.tipo_operacional || '').toUpperCase() === 'CAIXA_INTERNO';
}

function contaParticipaDoControle(conta) {
  return conta?.ativo !== false && (contaEhCaixaFisico(conta) || conta?.exige_abertura_fechamento === true);
}

function contaLabel(conta) {
  if (!conta) return 'Conta não informada';
  const tipo = contaEhCaixaFisico(conta) ? 'Caixa físico' : (conta.banco || 'Conta financeira');
  return `${conta.nome || `Conta ${conta.id}`} · ${tipo}`;
}

function empresaLabel(conta) {
  return conta?.empresa?.nome || conta?.empresa?.razao_social || 'Empresa não informada';
}

function statusClass(status) {
  return String(status || '').toUpperCase() === 'ABERTO'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function Metric({ label, value, icon: Icon, tone = 'default', hint }) {
  const toneClass = {
    default: 'text-[var(--c-text)]',
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400'
  }[tone];
  return (
    <div className="min-w-0 rounded-xl border border-[var(--c-border)] bg-[var(--c-soft)] px-3.5 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-muted)]">
        {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}<span>{label}</span>
      </div>
      <strong className={`mt-1 block break-words text-base leading-tight sm:text-lg ${toneClass}`} title={String(value)}>{value}</strong>
      {hint ? <span className="mt-0.5 block text-xs text-[var(--c-muted)]">{hint}</span> : null}
    </div>
  );
}

export default function FinanceiroCaixas() {
  const [contas, setContas] = useState([]);
  const [contaSelecionadaId, setContaSelecionadaId] = useState('');
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  const [sessoes, setSessoes] = useState([]);
  const [sessaoDetalhe, setSessaoDetalhe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [abrirForm, setAbrirForm] = useState({ data_abertura: today(), saldo_abertura: '', observacoes: '' });
  const [movimentoForm, setMovimentoForm] = useState({ natureza: 'SAIDA', data_movimento: today(), valor: '', descricao: '', documento_referencia: '' });
  const [fecharForm, setFecharForm] = useState({ data_fechamento: today(), saldo_informado: '', observacoes: '' });
  const [estorno, setEstorno] = useState({ movimento: null, motivo: '' });

  useEffect(() => {
    let active = true;
    getContasBancarias()
      .then((data) => {
        if (!active) return;
        const elegiveis = (Array.isArray(data) ? data : [])
          .filter(contaParticipaDoControle)
          .sort((a, b) => Number(contaEhCaixaFisico(b)) - Number(contaEhCaixaFisico(a)) || String(a.nome || '').localeCompare(String(b.nome || '')));
        setContas(elegiveis);
        setContaSelecionadaId((current) => current || String(elegiveis[0]?.id || ''));
      })
      .catch((err) => setError(err?.message || 'Erro ao carregar as contas configuradas para caixa.'));
    return () => { active = false; };
  }, []);

  const empresas = useMemo(() => {
    const map = new Map();
    contas.forEach((conta) => {
      if (conta.empresa_id && conta.empresa) map.set(String(conta.empresa_id), conta.empresa);
    });
    return [...map.values()].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
  }, [contas]);

  const contasFiltradas = useMemo(() => contas.filter((conta) => (
    !empresaFiltro || String(conta.empresa_id || '') === String(empresaFiltro)
  )), [contas, empresaFiltro]);

  const contaSelecionada = useMemo(
    () => contas.find((conta) => String(conta.id) === String(contaSelecionadaId)) || null,
    [contas, contaSelecionadaId]
  );

  useEffect(() => {
    if (!contasFiltradas.some((conta) => String(conta.id) === String(contaSelecionadaId))) {
      setContaSelecionadaId(String(contasFiltradas[0]?.id || ''));
    }
  }, [contasFiltradas, contaSelecionadaId]);

  useEffect(() => {
    if (!contaSelecionadaId) {
      setSessoes([]); setSessaoDetalhe(null); setLoading(false); return undefined;
    }
    let active = true;
    setLoading(true); setError('');
    getCaixasFinanceiros({ conta_bancaria_id: contaSelecionadaId, status: 'TODOS', limit: 100 })
      .then(async (data) => {
        if (!active) return;
        const lista = Array.isArray(data) ? data : [];
        setSessoes(lista);
        const aberta = lista.find((sessao) => sessao.status === 'ABERTO');
        if (!aberta) { setSessaoDetalhe(null); return; }
        const detalhe = await getCaixaFinanceiro(aberta.id);
        if (!active) return;
        setSessaoDetalhe(detalhe);
        setFecharForm({ data_fechamento: today(), saldo_informado: String(detalhe?.resumo_atual?.saldo_sistema ?? detalhe?.saldo_sistema ?? ''), observacoes: '' });
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar o controle do caixa.'); setSessoes([]); setSessaoDetalhe(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [contaSelecionadaId, refreshKey]);

  const sessaoAberta = useMemo(() => sessoes.find((sessao) => sessao.status === 'ABERTO') || null, [sessoes]);
  const sessoesFechadas = useMemo(() => sessoes.filter((sessao) => sessao.status === 'FECHADO'), [sessoes]);
  const resumo = sessaoDetalhe?.resumo_atual || sessaoAberta?.resumo_atual || {};
  const movimentos = Array.isArray(sessaoDetalhe?.movimentos_detalhados) ? sessaoDetalhe.movimentos_detalhados : [];
  const saldoSistema = Number(resumo.saldo_sistema ?? sessaoAberta?.saldo_sistema ?? 0);
  const saldoInformado = Number(String(fecharForm.saldo_informado || '0').replace(',', '.'));
  const diferencaFechamento = Number.isFinite(saldoInformado) ? saldoInformado - saldoSistema : 0;
  const caixaFisico = contaEhCaixaFisico(contaSelecionada);

  function refresh() { setRefreshKey((current) => current + 1); }

  async function executar(acao, mensagemErro) {
    try {
      setSaving(true); setError(''); setMessage(''); await acao(); refresh();
    } catch (err) {
      setError(err?.message || mensagemErro);
    } finally {
      setSaving(false);
    }
  }

  async function handleAbrir(event) {
    event.preventDefault();
    await executar(async () => {
      await abrirCaixaFinanceiro({ conta_bancaria_id: contaSelecionadaId, data_abertura: abrirForm.data_abertura, saldo_abertura: abrirForm.saldo_abertura === '' ? undefined : abrirForm.saldo_abertura, observacoes: abrirForm.observacoes });
      setMessage('Caixa aberto com sucesso.');
      setAbrirForm({ data_abertura: today(), saldo_abertura: '', observacoes: '' });
    }, 'Erro ao abrir o caixa.');
  }

  async function handleConfirmarOfx() {
    await executar(async () => {
      const dataReferencia = addDays(abrirForm.data_abertura, -1);
      await confirmarConciliacaoDiaCaixa({ conta_bancaria_id: contaSelecionadaId, data_referencia: dataReferencia, observacoes: abrirForm.observacoes });
      setMessage(`Conferência OFX de ${formatDate(dataReferencia)} confirmada.`);
    }, 'Erro ao confirmar a conferência OFX.');
  }

  async function handleMovimento(event) {
    event.preventDefault();
    if (!sessaoAberta) return;
    await executar(async () => {
      await registrarMovimentoCaixaFinanceiro(sessaoAberta.id, movimentoForm);
      setMessage(`${movimentoForm.natureza === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada com sucesso.`);
      setMovimentoForm({ natureza: movimentoForm.natureza, data_movimento: today(), valor: '', descricao: '', documento_referencia: '' });
    }, 'Erro ao registrar o movimento.');
  }

  async function handleFechar(event) {
    event.preventDefault();
    if (!sessaoAberta) return;
    await executar(async () => {
      await fecharCaixaFinanceiro(sessaoAberta.id, fecharForm);
      setMessage('Caixa fechado e conferência registrada com sucesso.');
    }, 'Erro ao fechar o caixa.');
  }

  async function handleEstornar(event) {
    event.preventDefault();
    if (!sessaoAberta || !estorno.movimento) return;
    await executar(async () => {
      await estornarMovimentoCaixaFinanceiro(sessaoAberta.id, estorno.movimento.id, { motivo: estorno.motivo });
      setMessage('Movimento estornado com trilha de auditoria.');
      setEstorno({ movimento: null, motivo: '' });
    }, 'Erro ao estornar o movimento.');
  }

  return (
    <div className="page solicitacoes-page mx-auto w-full max-w-[1600px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-primary)]">Financeiro · tesouraria</span>
          <h1 className="mt-1 text-xl font-semibold text-[var(--c-text)] md:text-2xl">Caixas e Contas</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--c-muted)]">Abertura, movimentação e conferência do dinheiro físico em um único fluxo operacional.</p>
        </div>
        <button type="button" className="btn btn-secondary w-fit shrink-0" onClick={refresh} disabled={loading || saving} title="Atualizar dados">
          <HiOutlineArrowPath className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {error ? <div className="app-alert app-alert-error mt-3">{error}</div> : null}
      {message ? <div className="app-alert app-alert-success mt-3">{message}</div> : null}

      <section className="mt-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 md:grid-cols-12 md:items-end">
          <label className="sol-filter-field md:col-span-4">
            <span className="sol-filter-label">Empresa</span>
            <select className="input w-full" value={empresaFiltro} onChange={(event) => setEmpresaFiltro(event.target.value)}>
              <option value="">Todas as empresas</option>
              {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome || empresa.razao_social}</option>)}
            </select>
          </label>
          <label className="sol-filter-field md:col-span-6">
            <span className="sol-filter-label">Caixa / conta com controle diário</span>
            <select className="input w-full" value={contaSelecionadaId} onChange={(event) => setContaSelecionadaId(event.target.value)}>
              {contasFiltradas.length === 0 ? <option value="">Nenhuma conta configurada</option> : null}
              {contasFiltradas.map((conta) => <option key={conta.id} value={conta.id}>{contaLabel(conta)}</option>)}
            </select>
          </label>
          <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-soft)] px-3 py-2 text-sm md:col-span-2">
            {sessaoAberta ? <HiOutlineLockOpen className="h-5 w-5 shrink-0 text-emerald-600" /> : <HiOutlineLockClosed className="h-5 w-5 shrink-0 text-[var(--c-muted)]" />}
            <div className="min-w-0">
              <strong className="block truncate text-[var(--c-text)]">{sessaoAberta ? 'Caixa aberto' : 'Caixa fechado'}</strong>
              <span className="block truncate text-xs text-[var(--c-muted)]">{contaSelecionada ? empresaLabel(contaSelecionada) : 'Selecione uma conta'}</span>
            </div>
          </div>
        </div>
      </section>

      {!contaSelecionada && !loading ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--c-card)] px-5 py-8 text-center text-sm text-[var(--c-muted)]">
          Cadastre uma conta como <strong className="text-[var(--c-text)]">Caixa interno</strong> e habilite abertura e fechamento nos Cadastros Financeiros.
        </div>
      ) : null}

      {contaSelecionada && !sessaoAberta && !loading ? (
        <section className="mt-4 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[var(--c-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--c-text)]"><HiOutlineLockOpen className="h-5 w-5 text-[var(--c-primary)]" /> Abrir caixa</h2>
              <p className="mt-1 text-sm text-[var(--c-muted)]">{caixaFisico ? 'Informe o saldo inicial. O caixa físico não depende de conciliação OFX.' : 'Esta conta mantém a conferência OFX anterior.'}</p>
            </div>
            <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass('FECHADO')}`}>FECHADO</span>
          </div>
          <form className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-12 xl:items-end" onSubmit={handleAbrir}>
            <label className="sol-filter-field xl:col-span-2"><span className="sol-filter-label">Data de abertura *</span><input className="input w-full" type="date" value={abrirForm.data_abertura} onChange={(event) => setAbrirForm((current) => ({ ...current, data_abertura: event.target.value }))} required /></label>
            <label className="sol-filter-field xl:col-span-2"><span className="sol-filter-label">Saldo inicial</span><input className="input w-full" inputMode="decimal" placeholder="Ex.: 500,00" value={abrirForm.saldo_abertura} onChange={(event) => setAbrirForm((current) => ({ ...current, saldo_abertura: event.target.value }))} /></label>
            <label className="sol-filter-field sm:col-span-2 xl:col-span-6"><span className="sol-filter-label">Observação de abertura</span><input className="input w-full" maxLength={4000} placeholder="Opcional" value={abrirForm.observacoes} onChange={(event) => setAbrirForm((current) => ({ ...current, observacoes: event.target.value }))} /></label>
            <div className="flex flex-wrap justify-end gap-2 sm:col-span-2 xl:col-span-2">{!caixaFisico ? <button type="button" className="btn btn-secondary" onClick={handleConfirmarOfx} disabled={saving}>Confirmar OFX</button> : null}<button type="submit" className="btn btn-primary" disabled={saving}>Abrir caixa</button></div>
          </form>
        </section>
      ) : null}

      {sessaoAberta ? <>
        <section className="mt-4 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[var(--c-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><h2 className="text-base font-semibold text-[var(--c-text)]">Movimento do caixa · {formatDate(sessaoAberta.data_abertura)}</h2><p className="mt-1 text-sm text-[var(--c-muted)]">Resumo financeiro da sessão aberta.</p></div>
            <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass('ABERTO')}`}>ABERTO</span>
          </div>
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-4 sm:p-4">
            <Metric icon={HiOutlineBanknotes} label="Saldo de abertura" value={formatCurrency(sessaoAberta.saldo_abertura)} />
            <Metric icon={HiOutlineArrowDownCircle} label="Entradas" value={formatCurrency(resumo.total_entradas)} tone="positive" />
            <Metric icon={HiOutlineArrowUpCircle} label="Saídas" value={formatCurrency(resumo.total_saidas)} tone="negative" />
            <Metric icon={HiOutlineScale} label="Saldo no sistema" value={formatCurrency(saldoSistema)} tone={saldoSistema < 0 ? 'negative' : 'default'} hint={`${resumo.quantidade_movimentos || 0} movimento(s)`} />
          </div>
        </section>

        {caixaFisico ? (
          <section className="mt-4 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] shadow-sm">
            <div className="border-b border-[var(--c-border)] px-4 py-3"><h2 className="text-base font-semibold text-[var(--c-text)]">Registrar entrada ou saída</h2><p className="mt-1 text-sm text-[var(--c-muted)]">Use para dinheiro físico ainda não registrado por outro fluxo financeiro.</p></div>
            <form className="grid items-stretch gap-3 p-4 sm:grid-cols-2 xl:grid-cols-12" onSubmit={handleMovimento}>
              <label className="sol-filter-field h-full xl:col-span-2"><span className="sol-filter-label">Natureza *</span><select className="input mt-auto w-full" value={movimentoForm.natureza} onChange={(event) => setMovimentoForm((current) => ({ ...current, natureza: event.target.value }))}><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></label>
              <label className="sol-filter-field h-full xl:col-span-2"><span className="sol-filter-label">Data *</span><input className="input mt-auto w-full" type="date" value={movimentoForm.data_movimento} onChange={(event) => setMovimentoForm((current) => ({ ...current, data_movimento: event.target.value }))} required /></label>
              <label className="sol-filter-field h-full xl:col-span-2"><span className="sol-filter-label">Valor *</span><input className="input mt-auto w-full" type="number" min="0.01" step="0.01" value={movimentoForm.valor} onChange={(event) => setMovimentoForm((current) => ({ ...current, valor: event.target.value }))} required /></label>
              <label className="sol-filter-field h-full sm:col-span-2 xl:col-span-3"><span className="sol-filter-label">Descrição *</span><input className="input mt-auto w-full" minLength={3} maxLength={4000} placeholder="Ex.: compra emergencial de material" value={movimentoForm.descricao} onChange={(event) => setMovimentoForm((current) => ({ ...current, descricao: event.target.value }))} required /></label>
              <label className="sol-filter-field h-full sm:col-span-2 xl:col-span-2"><span className="sol-filter-label">Documento / referência</span><input className="input mt-auto w-full" maxLength={120} placeholder="Recibo, NF ou controle" value={movimentoForm.documento_referencia} onChange={(event) => setMovimentoForm((current) => ({ ...current, documento_referencia: event.target.value }))} /></label>
              <div className="flex items-center justify-end sm:col-span-2 xl:col-span-1">
                <button type="submit" className="btn btn-primary btn-icon-only" disabled={saving} aria-label="Registrar entrada ou saída" title="Registrar entrada ou saída">
                  <HiOutlinePlus className="h-5 w-5" />
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="mt-4 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] px-4 py-3"><div className="min-w-0"><h2 className="text-base font-semibold text-[var(--c-text)]">Livro do caixa</h2><p className="mt-1 text-sm text-[var(--c-muted)]">Entradas, saídas e transferências da sessão.</p></div><span className="shrink-0 rounded-full bg-[var(--c-soft)] px-3 py-1 text-xs font-semibold text-[var(--c-muted)]">{movimentos.length} registro(s)</span></div>
          {movimentos.length === 0 ? (
            <div className="m-4 rounded-xl border border-dashed border-[var(--c-border)] bg-[var(--c-soft)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">Nenhum movimento registrado nesta sessão.</div>
          ) : <>
            <div className="hidden overflow-x-auto md:block">
              <ResizableTable columns={MOVIMENTO_COLUMNS} storageKey="fluxy.financeiro.caixas.movimentos.columns" className="app-table" scrollLabel="Livro do caixa com colunas redimensionáveis">
                <thead><tr><ResizableTh columnKey="data">Data</ResizableTh><ResizableTh columnKey="natureza">Natureza</ResizableTh><ResizableTh columnKey="descricao">Descrição</ResizableTh><ResizableTh columnKey="documento">Documento</ResizableTh><ResizableTh columnKey="origem">Origem</ResizableTh><ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh><ResizableTh columnKey="acao">Ação</ResizableTh></tr></thead>
                <tbody>{movimentos.map((movimento) => <tr key={`${movimento.origem}-${movimento.id}`}><td>{formatDate(movimento.data)}</td><td><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${movimento.natureza === 'ENTRADA' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'}`}>{movimento.natureza === 'ENTRADA' ? 'Entrada' : 'Saída'}</span></td><td className="whitespace-normal"><strong className="block text-[var(--c-text)]">{movimento.descricao}</strong>{movimento.conta_contraparte ? <span className="text-xs text-[var(--c-muted)]">Contraparte: {movimento.conta_contraparte}</span> : null}</td><td>{movimento.documento || '-'}</td><td>{movimento.origem === 'TRANSFERENCIA' ? 'Transferência' : (movimento.tipo?.includes('MANUAL') ? 'Lançamento manual' : 'Financeiro')}</td><td className={`text-right font-semibold ${movimento.natureza === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>{movimento.natureza === 'ENTRADA' ? '+' : '-'}{formatCurrency(movimento.valor)}</td><td>{movimento.estornavel ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEstorno({ movimento, motivo: '' })}>Estornar</button> : '-'}</td></tr>)}</tbody>
              </ResizableTable>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {movimentos.map((movimento) => <article key={`${movimento.origem}-${movimento.id}`} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-soft)] p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="text-xs text-[var(--c-muted)]">{formatDate(movimento.data)} · {movimento.origem === 'TRANSFERENCIA' ? 'Transferência' : (movimento.tipo?.includes('MANUAL') ? 'Manual' : 'Financeiro')}</span><strong className="mt-1 block text-sm text-[var(--c-text)]">{movimento.descricao}</strong></div><strong className={`shrink-0 text-sm ${movimento.natureza === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>{movimento.natureza === 'ENTRADA' ? '+' : '-'}{formatCurrency(movimento.valor)}</strong></div>{movimento.documento ? <p className="mt-2 text-xs text-[var(--c-muted)]">Documento: {movimento.documento}</p> : null}{movimento.estornavel ? <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => setEstorno({ movimento, motivo: '' })}>Estornar</button> : null}</article>)}
            </div>
          </>}
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] shadow-sm">
          <div className="border-b border-[var(--c-border)] px-4 py-3"><h2 className="flex items-center gap-2 text-base font-semibold text-[var(--c-text)]"><HiOutlineCheckCircle className="h-5 w-5 text-[var(--c-primary)]" /> Conferir e fechar caixa</h2><p className="mt-1 text-sm text-[var(--c-muted)]">{caixaFisico ? 'Conte o dinheiro físico e informe o saldo encontrado.' : 'Confira o saldo operacional e informe o valor apurado.'} Divergências ficam registradas com justificativa.</p></div>
          <form className="grid items-stretch gap-3 p-4 sm:grid-cols-2 xl:grid-cols-12" onSubmit={handleFechar}>
            <label className="sol-filter-field h-full xl:col-span-2"><span className="sol-filter-label">Data de fechamento *</span><input className="input mt-auto w-full" type="date" value={fecharForm.data_fechamento} onChange={(event) => setFecharForm((current) => ({ ...current, data_fechamento: event.target.value }))} required /></label>
            <label className="sol-filter-field h-full xl:col-span-2"><span className="sol-filter-label">Saldo contado *</span><input className="input mt-auto w-full" type="number" step="0.01" value={fecharForm.saldo_informado} onChange={(event) => setFecharForm((current) => ({ ...current, saldo_informado: event.target.value }))} required /></label>
            <div className={`flex h-full min-h-[88px] flex-col justify-center rounded-xl border px-3 py-2 xl:col-span-2 ${Math.abs(diferencaFechamento) > 0.009 ? 'border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30'}`}><span className="block text-[11px] font-semibold uppercase text-[var(--c-muted)]">Diferença</span><strong className={Math.abs(diferencaFechamento) > 0.009 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>{formatCurrency(diferencaFechamento)}</strong></div>
            <label className="sol-filter-field h-full sm:col-span-2 xl:col-span-4"><span className="sol-filter-label">Justificativa {Math.abs(diferencaFechamento) > 0.009 ? '*' : ''}</span><input className="input mt-auto w-full" minLength={Math.abs(diferencaFechamento) > 0.009 ? 10 : undefined} maxLength={4000} placeholder={Math.abs(diferencaFechamento) > 0.009 ? 'Obrigatória para divergência' : 'Observação opcional'} value={fecharForm.observacoes} onChange={(event) => setFecharForm((current) => ({ ...current, observacoes: event.target.value }))} required={Math.abs(diferencaFechamento) > 0.009} /></label>
            <div className="flex items-center justify-end sm:col-span-2 xl:col-span-2">
              <button type="submit" className="btn btn-primary btn-icon-only" disabled={saving} aria-label="Fechar caixa" title="Fechar caixa">
                <HiOutlineLockClosed className="h-5 w-5" />
              </button>
            </div>
          </form>
        </section>
      </> : null}

      {contaSelecionada ? (
        <section className="mt-4 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] px-4 py-3"><div className="min-w-0"><h2 className="flex items-center gap-2 text-base font-semibold text-[var(--c-text)]"><HiOutlineClock className="h-5 w-5" /> Histórico de fechamentos</h2><p className="mt-1 text-sm text-[var(--c-muted)]">Conferências anteriores da conta selecionada.</p></div><span className="shrink-0 text-xs text-[var(--c-muted)]">{sessoesFechadas.length} fechamento(s)</span></div>
          {sessoesFechadas.length === 0 ? (
            <div className="m-4 rounded-xl border border-dashed border-[var(--c-border)] bg-[var(--c-soft)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">Nenhum fechamento registrado para esta conta.</div>
          ) : <>
            <div className="hidden overflow-x-auto md:block">
              <ResizableTable columns={FECHAMENTO_COLUMNS} storageKey="fluxy.financeiro.caixas.fechamentos.columns" className="app-table" scrollLabel="Histórico de fechamentos com colunas redimensionáveis">
                <thead><tr><ResizableTh columnKey="abertura">Abertura</ResizableTh><ResizableTh columnKey="fechamento">Fechamento</ResizableTh><ResizableTh columnKey="saldo_inicial" className="text-right">Saldo inicial</ResizableTh><ResizableTh columnKey="entradas" className="text-right">Entradas</ResizableTh><ResizableTh columnKey="saidas" className="text-right">Saídas</ResizableTh><ResizableTh columnKey="saldo_contado" className="text-right">Saldo contado</ResizableTh><ResizableTh columnKey="diferenca" className="pr-4 text-right">Diferença</ResizableTh><ResizableTh columnKey="responsavel" className="border-l border-[var(--c-border)] pl-4">Responsável</ResizableTh></tr></thead>
                <tbody>{sessoesFechadas.map((sessao) => <tr key={sessao.id}><td>{formatDate(sessao.data_abertura)}</td><td>{formatDate(sessao.data_fechamento)}</td><td className="text-right">{formatCurrency(sessao.saldo_abertura)}</td><td className="text-right text-emerald-600">{formatCurrency(sessao.total_entradas)}</td><td className="text-right text-rose-600">{formatCurrency(sessao.total_saidas)}</td><td className="text-right font-semibold">{formatCurrency(sessao.saldo_informado)}</td><td className={`pr-4 text-right font-semibold ${Math.abs(Number(sessao.diferenca || 0)) > 0.009 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatCurrency(sessao.diferenca)}</td><td className="border-l border-[var(--c-border)] pl-4 whitespace-normal">{sessao.fechadoPor?.nome || '-'}</td></tr>)}</tbody>
              </ResizableTable>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {sessoesFechadas.map((sessao) => <article key={sessao.id} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-soft)] p-3"><div className="flex items-start justify-between gap-3"><div><span className="text-xs text-[var(--c-muted)]">{formatDate(sessao.data_abertura)} → {formatDate(sessao.data_fechamento)}</span><strong className="mt-1 block text-sm text-[var(--c-text)]">{sessao.fechadoPor?.nome || 'Responsável não informado'}</strong></div><strong className={`text-sm ${Math.abs(Number(sessao.diferenca || 0)) > 0.009 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatCurrency(sessao.diferenca)}</strong></div><dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-[var(--c-muted)]">Saldo inicial</dt><dd className="font-semibold text-[var(--c-text)]">{formatCurrency(sessao.saldo_abertura)}</dd></div><div><dt className="text-[var(--c-muted)]">Saldo contado</dt><dd className="font-semibold text-[var(--c-text)]">{formatCurrency(sessao.saldo_informado)}</dd></div><div><dt className="text-[var(--c-muted)]">Entradas</dt><dd className="font-semibold text-emerald-600">{formatCurrency(sessao.total_entradas)}</dd></div><div><dt className="text-[var(--c-muted)]">Saídas</dt><dd className="font-semibold text-rose-600">{formatCurrency(sessao.total_saidas)}</dd></div></dl></article>)}
            </div>
          </>}
        </section>
      ) : null}

      {loading ? <div className="mt-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">Carregando controle de caixa...</div> : null}

      {estorno.movimento ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="estorno-caixa-title"><form className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] shadow-2xl" onSubmit={handleEstornar}><div className="flex items-start justify-between gap-4 border-b border-[var(--c-border)] p-4"><div><h2 id="estorno-caixa-title" className="text-base font-semibold text-[var(--c-text)]">Estornar movimento</h2><p className="mt-1 text-sm text-[var(--c-muted)]">O registro será preservado e marcado como estornado na auditoria.</p></div><button type="button" className="btn btn-secondary btn-sm" onClick={() => setEstorno({ movimento: null, motivo: '' })} aria-label="Fechar"><HiOutlineXMark className="h-5 w-5" /></button></div><div className="space-y-3 p-4"><div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-soft)] p-3 text-sm"><strong className="block text-[var(--c-text)]">{estorno.movimento.descricao}</strong><span className="text-[var(--c-muted)]">{formatDate(estorno.movimento.data)} · {formatCurrency(estorno.movimento.valor)}</span></div><label className="sol-filter-field"><span className="sol-filter-label">Motivo do estorno *</span><textarea className="input min-h-24 w-full" minLength={10} maxLength={4000} value={estorno.motivo} onChange={(event) => setEstorno((current) => ({ ...current, motivo: event.target.value }))} placeholder="Explique o motivo com pelo menos 10 caracteres" required /></label></div><div className="flex justify-end gap-2 border-t border-[var(--c-border)] p-4"><button type="button" className="btn btn-secondary" onClick={() => setEstorno({ movimento: null, motivo: '' })}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>Confirmar estorno</button></div></form></div> : null}
    </div>
  );
}
