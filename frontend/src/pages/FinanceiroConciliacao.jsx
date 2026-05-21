import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  conciliarSugestoesBancarias,
  confirmarConciliacaoBancaria,
  confirmarConciliacaoFaturaCartao,
  confirmarConciliacaoTarifaBancaria,
  confirmarConciliacaoTransferencia,
  criarTituloConciliacaoBancaria,
  getConciliacoesBancarias,
  getCategoriasFinanceiras,
  getContasBancarias,
  getFaturasAssociacaoConciliacao,
  getImportacoesConciliacao,
  getMovimentosAssociacaoConciliacao,
  getTarifasBancariasAtalhos,
  ignorarConciliacaoBancaria,
  importarOfxConciliacao
} from '../services/financeiro';
import { buscarParceiros } from '../services/parceiros';
import { getMinhasObras } from '../services/obras';
import { formatCurrencyInput, normalizeCurrencyTyping, parseCurrencyInput } from '../utils/formatters';

const TIPOS_INTERCOMPANY = [
  { value: 'APORTE', label: 'Aporte' },
  { value: 'EMPRESTIMO', label: 'Emprestimo' },
  { value: 'REEMBOLSO', label: 'Reembolso' },
  { value: 'RATEIO', label: 'Rateio' },
  { value: 'COBERTURA_CAIXA', label: 'Cobertura de caixa' },
  { value: 'FOLHA', label: 'Folha' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
  { value: 'IMPOSTO', label: 'Imposto' },
  { value: 'TRANSFERENCIA_OPERACIONAL', label: 'Transferencia operacional' }
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'CONCILIADO') return 'Conciliado';
  if (s === 'IGNORADO') return 'Ignorado';
  return 'Pendente';
}

function statusClass(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'CONCILIADO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (s === 'IGNORADO') return 'app-status-pill bg-slate-100 text-slate-500';
  return 'app-status-pill bg-amber-100 text-amber-700';
}

function buildAssociacaoDefaults(item) {
  const valor = Math.abs(Number(item?.valor || 0));
  return {
    data_inicial: item?.data_movimento || '',
    data_final: item?.data_movimento || '',
    documento: '',
    numero_documento: item?.documento || '',
    valor_inicial: valor ? formatCurrencyInput(valor) : '',
    valor_final: valor ? formatCurrencyInput(valor) : '',
    limit: 30
  };
}

// ─── ícones ───────────────────────────────────────────────────────────────────

function getContaEmpresaId(conta) {
  return String(conta?.empresa_id || conta?.empresa?.id || '');
}

function getContaEmpresaNome(conta) {
  return conta?.empresa?.nome || conta?.empresa?.razao_social || (conta?.empresa_id ? `Empresa #${conta.empresa_id}` : 'Sem empresa vinculada');
}

function KeyIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M14.5 7.5a4.5 4.5 0 1 1-2.8 8l-4.2 4.2H5v-2.5H2.5v-2.5l4.1-4.1a4.5 4.5 0 0 1 7.9-3.1Z" />
      <path d="M16.5 7.5h.01" />
    </svg>
  );
}

function SparkIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="m12 3 1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3Z" />
      <path d="m18 14 1 2.6 2.5.7-2.5 1-1 2.7-1-2.7-2.5-1 2.5-.7 1-2.6Z" />
    </svg>
  );
}

function PlusIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// ─── ValorBanco ───────────────────────────────────────────────────────────────

function ValorBanco({ value, size = 'lg' }) {
  const positive = Number(value || 0) >= 0;
  const sizeClass = size === 'xl' ? 'text-2xl font-bold tabular-nums' : size === 'sm' ? 'text-sm font-semibold' : 'text-lg font-semibold';
  return (
    <span className={`${sizeClass} ${positive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
      {formatCurrency(value)}
    </span>
  );
}

// ─── NovoTituloRapidoModal ────────────────────────────────────────────────────

function AcoesRapidasConciliacaoModal({ item, tarifas, processingId, onClose, onNovoTitulo, onConfirmarTarifa }) {
  const tarifasAtivas = Array.isArray(tarifas) ? tarifas.filter((tarifa) => tarifa.ativo !== false) : [];
  const isSaida = Number(item?.valor || 0) < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-[var(--c-surface)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Acoes rapidas</h2>
            <p className="mt-0.5 text-sm text-[var(--c-muted)]">Escolha como registrar este lancamento bancario.</p>
            {item && (
              <div className="mt-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm">
                <span className="font-medium">{item.descricao_banco || 'Lancamento bancario'}</span>
                {' - '}{formatDate(item.data_movimento)}
                {' - '}<ValorBanco value={item.valor} size="sm" />
              </div>
            )}
          </div>
          <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={onClose}>Fechar</button>
        </div>

        <div className="mt-4 grid gap-3">
          <button
            type="button"
            className="rounded-xl border border-[var(--c-border)] px-4 py-3 text-left transition-colors hover:border-[var(--c-primary)] hover:bg-[var(--c-bg)]"
            onClick={() => onNovoTitulo(item)}
          >
            <span className="block text-sm font-semibold text-[var(--c-text)]">Criar titulo + baixa</span>
            <span className="mt-0.5 block text-xs text-[var(--c-muted)]">Usa o fluxo completo de contas a pagar/receber e concilia o movimento.</span>
          </button>

          <div className="rounded-xl border border-dashed border-[var(--c-border)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Registrar tarifa bancaria</p>
                <p className="text-xs text-[var(--c-muted)]">Cria movimento avulso de tarifa com categoria financeira explicita para DRE.</p>
              </div>
              {!isSaida && <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">Apenas saidas</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tarifasAtivas.length === 0 ? (
                <span className="text-xs text-[var(--c-muted)]">Nenhuma tarifa ativa configurada.</span>
              ) : tarifasAtivas.map((tarifa) => {
                const key = `tarifa-${item?.id}-${tarifa.codigo}`;
                const hasCategoria = Boolean(tarifa.categoria_financeira_id);
                return (
                  <button
                    key={tarifa.codigo}
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={!isSaida || !hasCategoria || processingId === key}
                    onClick={() => onConfirmarTarifa(item, tarifa)}
                    title={!hasCategoria ? 'Configure a categoria financeira deste atalho em Financeiro > Cadastros.' : (tarifa.descricao || tarifa.nome)}
                  >
                    {processingId === key ? 'Registrando...' : tarifa.nome}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NovoTituloRapidoModal({ item, contas, onClose, onConciliar }) {
  const tipoInferido = Number(item?.valor || 0) < 0 ? 'PAGAR' : 'RECEBER';
  const valorAbs = Math.abs(Number(item?.valor || 0));
  const contaInicialId = String(item?.conta_bancaria_id || contas[0]?.id || '');
  const contaInicial = contas.find((conta) => String(conta.id) === contaInicialId);

  const [form, setForm] = useState({
    tipo: tipoInferido,
    descricao: item?.descricao_banco || '',
    valor: valorAbs ? formatCurrencyInput(valorAbs) : '',
    data_vencimento: item?.data_movimento || today(),
    conta_bancaria_id: contaInicialId,
    empresa_id: String(contaInicial?.empresa_id || ''),
    obra_id: '',
    categoria_financeira_id: '',
    parceiro_id: '',
    data_pagamento: item?.data_movimento || today()
  });
  const [categorias, setCategorias] = useState([]);
  const [obras, setObras] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [buscaParceiro, setBuscaParceiro] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const buscaTimeout = useRef(null);

  useEffect(() => {
    Promise.all([
      getCategoriasFinanceiras().catch(() => []),
      getMinhasObras().catch(() => [])
    ]).then(([cats, obs]) => {
      const catList = Array.isArray(cats) ? cats : [];
      const obraList = Array.isArray(obs) ? obs : [];
      setCategorias(catList);
      setObras(obraList);
    });
  }, []);

  useEffect(() => {
    clearTimeout(buscaTimeout.current);
    if (!buscaParceiro.trim()) {
      setParceiros([]);
      return;
    }
    buscaTimeout.current = setTimeout(async () => {
      try {
        const data = await buscarParceiros({ q: buscaParceiro.trim(), limit: 20 });
        setParceiros(Array.isArray(data?.itens) ? data.itens : Array.isArray(data) ? data : []);
      } catch {
        setParceiros([]);
      }
    }, 300);
  }, [buscaParceiro]);

  const categoriasFiltradas = categorias.filter((c) => {
    const t = String(c.tipo || '').toUpperCase();
    return t === form.tipo || t === 'AMBOS';
  });

  async function handleSalvar(e) {
    e.preventDefault();
    if (saving) return;
    setErro('');
    if (!form.descricao.trim()) { setErro('Informe a descrição do título.'); return; }
    const valor = parseCurrencyInput(form.valor);
    if (!form.valor || valor <= 0) { setErro('Informe um valor válido.'); return; }
    if (!form.conta_bancaria_id) { setErro('Selecione a conta bancária.'); return; }
    if (!form.empresa_id) { setErro('A conta bancaria precisa estar vinculada a uma empresa pagadora.'); return; }
    if (!form.obra_id) { setErro('Selecione a obra.'); return; }
    if (!form.parceiro_id) { setErro('Selecione um parceiro (obrigatório).'); return; }

    try {
      setSaving(true);
      // 1. Criar título (sem conta_bancaria_id — vai apenas na baixa)
      await criarTituloConciliacaoBancaria(item.id, {
        tipo: form.tipo,
        obra_id: Number(form.obra_id),
        descricao: form.descricao.trim(),
        valor,
        data_vencimento: form.data_vencimento,
        conta_bancaria_id: Number(form.conta_bancaria_id),
        empresa_id: Number(form.empresa_id),
        data_movimento: form.data_pagamento,
        categoria_financeira_id: form.categoria_financeira_id ? Number(form.categoria_financeira_id) : undefined,
        parceiro_id: form.parceiro_id ? Number(form.parceiro_id) : undefined
      });
      await onConciliar();
      onClose();
    } catch (err) {
      setErro(err?.message || 'Erro ao criar título e registrar pagamento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white dark:bg-[var(--c-surface)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--c-border)] bg-white dark:bg-[var(--c-surface)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Novo título + baixa</h2>
            <p className="text-xs text-[var(--c-muted)]">Cria o título, registra o pagamento e concilia automaticamente.</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Fechar</button>
        </div>

        {/* Contexto do lançamento OFX */}
        <div className="mx-5 mt-4 flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2.5 text-sm">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--c-text)] truncate">{item?.descricao_banco || 'Lançamento bancário'}</p>
            <p className="text-xs text-[var(--c-muted)]">{item?.conta_bancaria_nome} · {formatDate(item?.data_movimento)}</p>
          </div>
          <ValorBanco value={item?.valor} size="sm" />
        </div>

        <form onSubmit={handleSalvar} className="grid gap-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="app-filter-field">
              <span className="app-filter-label">Tipo</span>
              <select className="input w-full" value={form.tipo} disabled>
                <option value="PAGAR">A pagar</option>
                <option value="RECEBER">A receber</option>
              </select>
            </label>
            <label className="app-filter-field">
              <span className="app-filter-label">Obra *</span>
              <select className="input w-full" value={form.obra_id}
                onChange={(e) => setForm((c) => ({ ...c, obra_id: e.target.value }))}>
                <option value="">Selecione</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </label>
          </div>

          <label className="app-filter-field">
            <span className="app-filter-label">Conta bancária *</span>
            <select className="input w-full" value={form.conta_bancaria_id} disabled>
              <option value="">Selecione</option>
              {contas.map((ct) => <option key={ct.id} value={ct.id}>{ct.nome}</option>)}
            </select>
          </label>

          <label className="app-filter-field">
            <span className="app-filter-label">Empresa pagadora *</span>
            <input
              className="input w-full"
              value={contas.find((ct) => String(ct.id) === String(form.conta_bancaria_id))?.empresa?.nome || form.empresa_id || ''}
              disabled
            />
          </label>

          <label className="app-filter-field">
            <span className="app-filter-label">Descrição *</span>
            <input className="input w-full" type="text" value={form.descricao}
              onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))}
              placeholder="Descrição do título" />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="app-filter-field">
              <span className="app-filter-label">Valor *</span>
              <input className="input w-full" inputMode="decimal" value={form.valor} disabled />
            </label>
            <label className="app-filter-field">
              <span className="app-filter-label">Vencimento</span>
              <input className="input w-full" type="date" value={form.data_vencimento}
                onChange={(e) => setForm((c) => ({ ...c, data_vencimento: e.target.value }))} />
            </label>
            <label className="app-filter-field">
              <span className="app-filter-label">Data de pagamento</span>
              <input className="input w-full" type="date" value={form.data_pagamento}
                onChange={(e) => setForm((c) => ({ ...c, data_pagamento: e.target.value }))} />
            </label>
          </div>

          <label className="app-filter-field">
            <span className="app-filter-label">Categoria</span>
            <select className="input w-full" value={form.categoria_financeira_id}
              onChange={(e) => setForm((c) => ({ ...c, categoria_financeira_id: e.target.value }))}>
              <option value="">Sem categoria</option>
              {categoriasFiltradas.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
            </select>
          </label>

          <div className="app-filter-field">
            <span className="app-filter-label">Parceiro (buscar)</span>
            <input className="input w-full" type="text" value={buscaParceiro}
              onChange={(e) => { setBuscaParceiro(e.target.value); if (!e.target.value) setForm((c) => ({ ...c, parceiro_id: '' })); }}
              placeholder="Digite nome ou CNPJ..." />
            {parceiros.length > 0 && (
              <div className="mt-1 rounded-xl border border-[var(--c-border)] bg-white shadow-lg">
                {parceiros.map((p) => (
                  <button key={p.id} type="button"
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--c-bg)] ${String(form.parceiro_id) === String(p.id) ? 'bg-[var(--c-bg)] font-semibold' : ''}`}
                    onClick={() => { setForm((c) => ({ ...c, parceiro_id: String(p.id) })); setBuscaParceiro(p.nome || p.razao_social || ''); setParceiros([]); }}>
                    {p.nome || p.razao_social} {p.cnpj_cpf ? `· ${p.cnpj_cpf}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {erro && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{erro}</div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar, baixar e conciliar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ItemConciliacao — layout 2 colunas ──────────────────────────────────────

function ItemConciliacao({ item, processingId, onConfirmar, onIgnorar, onAssociarManual, onAssociarFatura, onAssociarTransferencia, onAcoesRapidas }) {
  const [expandirSugestoes, setExpandirSugestoes] = useState(false);

  const isPendente = item.status === 'PENDENTE';

  // Melhor sugestão: prioriza a sugestão automática marcada pelo backend
  const topSugestao = isPendente
    ? (item.sugestoes?.find((s) => s.movimento_financeiro_id === item.sugestao_automatica?.movimento_financeiro_id) || item.sugestoes?.[0])
    : null;
  const outrasSugestoes = isPendente && item.sugestoes?.length > 1
    ? item.sugestoes.filter((s) => s.movimento_financeiro_id !== topSugestao?.movimento_financeiro_id)
    : [];

  const pidConfirmar = topSugestao ? `confirmar-${item.id}-${topSugestao.movimento_financeiro_id}` : null;
  const isConfirmando = processingId === pidConfirmar;
  const isIgnorando = processingId === `ignorar-${item.id}`;
  const podeConfirmar = isPendente && Boolean(topSugestao) && !isConfirmando;

  return (
    <div className="sol-surface-card card overflow-hidden rounded-lg border border-[var(--c-border)]">
      <div className="grid items-stretch" style={{ gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)' }}>

        {/* ── Coluna esquerda: lançamento OFX ── */}
        <div className="flex flex-col gap-1 p-2">
          {/* header */}
          <div className="flex items-center justify-between gap-1">
            <p className="text-[9px] uppercase tracking-wide font-semibold text-[var(--c-muted)]">Extrato bancário</p>
            <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
          </div>
          {/* card interno */}
          <div className="flex-1 rounded border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1.5">
            <p className="font-semibold text-[11px] text-[var(--c-text)] leading-tight truncate">
              {item.descricao_banco || 'Lançamento bancário'}
            </p>
            <p className="text-[10px] text-[var(--c-muted)] leading-tight">
              {item.conta_bancaria_nome}{item.documento ? ` · Doc. ${item.documento}` : ''}
            </p>
            <ValorBanco value={item.valor} size="sm" />
            <p className="text-[10px] text-[var(--c-muted)] leading-tight">
              {formatDate(item.data_movimento)}
              {item.conciliacao_em_lote_disponivel && <span className="ml-1.5 text-emerald-600">✦ Lote</span>}
              {item.associacao_manual_recomendada && <span className="ml-1.5 text-amber-600">● Manual</span>}
            </p>
          </div>
          {/* conciliado info */}
          {item.titulo && (
            <p className="text-[10px] text-emerald-700 leading-tight">
              ✓ #{item.titulo.id} {item.titulo.descricao}{item.titulo.parceiro_nome ? ` · ${item.titulo.parceiro_nome}` : ''}
            </p>
          )}
          {/* ignorar */}
          {isPendente && (
            <button
              type="button"
              className="self-start text-[10px] text-slate-400 hover:text-rose-600 underline underline-offset-2 leading-tight"
              disabled={isIgnorando}
              onClick={() => onIgnorar(item.id)}
            >
              {isIgnorando ? 'Ignorando...' : 'Ignorar'}
            </button>
          )}
        </div>

        {/* ── Centro: botão conciliar ── */}
        <div className="flex items-center justify-center px-2">
          {isPendente && (
            <button
              type="button"
              disabled={!podeConfirmar}
              onClick={() => topSugestao && onConfirmar(item.id, topSugestao.movimento_financeiro_id)}
              className={`btn btn-sm text-[11px] font-semibold tracking-wide transition-all ${podeConfirmar ? 'btn-primary' : 'btn-outline text-[var(--c-muted)] cursor-not-allowed opacity-40'}`}
              title={podeConfirmar ? 'Confirmar sugestão principal' : 'Sem lançamento equivalente encontrado'}
            >
              {isConfirmando ? '...' : 'Conciliar'}
            </button>
          )}
        </div>

        {/* ── Coluna direita: sugestão / vazio ── */}
        <div className="flex flex-col gap-1 p-2">
          {/* header */}
          {isPendente && (
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] uppercase tracking-wide font-semibold text-[var(--c-muted)]">Lançamento Fluxy</p>
              <div className="flex items-center gap-0.5">
                <button type="button" title="Acoes rapidas"
                  className="flex h-5 w-5 items-center justify-center rounded border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-muted)] hover:border-[var(--c-primary)] hover:text-[var(--c-primary)] transition-colors"
                  onClick={() => onAcoesRapidas(item)}>
                  <PlusIcon className="h-2.5 w-2.5" />
                </button>
                <button type="button" title="Associar manualmente"
                  className="flex h-5 w-5 items-center justify-center rounded border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-muted)] hover:border-[var(--c-primary)] hover:text-[var(--c-primary)] transition-colors"
                  onClick={() => onAssociarManual(item)}>
                  <KeyIcon className="h-2.5 w-2.5" />
                </button>
                <button type="button" title="Associar fatura de cartao"
                  className="flex h-5 min-w-5 items-center justify-center rounded border border-[var(--c-border)] bg-[var(--c-bg)] px-1 text-[9px] font-semibold text-[var(--c-muted)] hover:border-[var(--c-primary)] hover:text-[var(--c-primary)] transition-colors"
                  onClick={() => onAssociarFatura(item)}>
                  Fat
                </button>
                <button type="button" title="Conciliar como transferencia entre contas"
                  className="flex h-5 min-w-5 items-center justify-center rounded border border-[var(--c-border)] bg-[var(--c-bg)] px-1 text-[9px] font-semibold text-[var(--c-muted)] hover:border-[var(--c-primary)] hover:text-[var(--c-primary)] transition-colors"
                  onClick={() => onAssociarTransferencia(item)}>
                  Transf
                </button>
              </div>
            </div>
          )}

          {!isPendente && item.titulo ? (
            <div className="flex-1 rounded border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1.5 space-y-0.5">
              <p className="font-semibold text-[11px] text-[var(--c-text)] truncate">{item.titulo.descricao}</p>
              {item.titulo.parceiro_nome && <p className="text-[10px] text-[var(--c-muted)]">{item.titulo.parceiro_nome}</p>}
              {item.movimento && <p className="text-[10px] text-[var(--c-muted)]">Mov. #{item.movimento.id}</p>}
            </div>
          ) : !isPendente && item.movimento?.tipo_movimento === 'TARIFA_BANCARIA' ? (
            <div className="flex-1 rounded border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1.5 space-y-0.5">
              <p className="font-semibold text-[11px] text-[var(--c-text)] truncate">Tarifa bancaria</p>
              <p className="text-[10px] text-[var(--c-muted)]">{item.movimento.observacoes || item.descricao_banco}</p>
              <p className="text-[10px] text-[var(--c-muted)]">Mov. #{item.movimento.id}</p>
            </div>
          ) : !isPendente && item.transferencia ? (
            <div className="flex-1 rounded border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1.5 space-y-0.5">
              <p className="font-semibold text-[11px] text-[var(--c-text)] truncate">Transferencia #{item.transferencia.id}</p>
              <p className="text-[10px] text-[var(--c-muted)]">
                {item.transferencia.contaOrigem?.nome || 'Origem'} para {item.transferencia.contaDestino?.nome || 'Destino'}
              </p>
            </div>
          ) : !isPendente ? (
            <div className="flex flex-1 items-center justify-center py-1">
              <p className="text-[10px] text-[var(--c-muted)]">{statusLabel(item.status)}</p>
            </div>
          ) : topSugestao ? (
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex-1 rounded border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1.5">
                <p className="font-semibold text-[11px] text-[var(--c-text)] leading-tight truncate">{topSugestao.titulo_descricao}</p>
                <p className="text-[10px] text-[var(--c-muted)] leading-tight">
                  {topSugestao.parceiro_nome}{topSugestao.documento ? ` · Doc. ${topSugestao.documento}` : ''}
                </p>
                <ValorBanco value={topSugestao.valor_quitacao} size="sm" />
                <p className="text-[10px] text-[var(--c-muted)] leading-tight">
                  {formatDate(topSugestao.data_movimento)} · {topSugestao.tipo} · mov. #{topSugestao.movimento_financeiro_id}
                </p>
              </div>
              {outrasSugestoes.length > 0 && (
                <button type="button"
                  className="text-[10px] text-[var(--c-primary)] underline underline-offset-2 self-start"
                  onClick={() => setExpandirSugestoes((v) => !v)}>
                  {expandirSugestoes ? 'Ocultar' : `+${outrasSugestoes.length} outras`}
                </button>
              )}
              {expandirSugestoes && (
                <div className="space-y-1">
                  {outrasSugestoes.map((s) => {
                    const pid = `confirmar-${item.id}-${s.movimento_financeiro_id}`;
                    return (
                      <div key={s.movimento_financeiro_id} className="rounded border border-[var(--c-border)] px-2 py-1.5 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium truncate">{s.titulo_descricao}</p>
                          <p className="text-[10px] text-[var(--c-muted)]">{formatDate(s.data_movimento)} · {formatCurrency(s.valor_quitacao)}</p>
                        </div>
                        <button type="button" className="btn btn-outline btn-sm text-[10px] shrink-0"
                          disabled={processingId === pid}
                          onClick={() => onConfirmar(item.id, s.movimento_financeiro_id)}>
                          {processingId === pid ? '...' : 'Usar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded border border-dashed border-[var(--c-border)] py-2 text-center">
              <p className="text-[10px] text-[var(--c-muted)]">Nenhum lançamento equivalente encontrado</p>
            </div>
          )}
          {isPendente && <div className="h-[18px]" />}
        </div>
      </div>
    </div>
  );
}

// ─── HistoricoImportacaoItem ──────────────────────────────────────────────────

function HistoricoImportacaoItem({ item }) {
  return (
    <div className="app-list-card">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--c-text)]">{item.arquivo_nome}</p>
          <p className="mt-0.5 text-xs text-[var(--c-muted)]">
            {item.conta_bancaria_nome} ({item.banco || '-'}) · {formatDateTime(item.criado_em)}
          </p>
          <p className="text-[11px] text-[var(--c-muted)]">
            Por {item.criado_por?.nome || item.criado_por?.email || 'Sistema'} · hash {String(item.arquivo_hash || '').slice(0, 10)}…
          </p>
        </div>
        <div className="flex shrink-0 gap-2 text-center text-xs">
          <div className="rounded-lg bg-[var(--c-bg)] px-3 py-2">
            <div className="text-[var(--c-muted)]">Lidos</div>
            <div className="mt-0.5 font-semibold text-[var(--c-text)]">{item.total_lidos}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2">
            <div className="text-emerald-600">Import.</div>
            <div className="mt-0.5 font-semibold text-emerald-700">{item.importados}</div>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-2">
            <div className="text-amber-600">Ignor.</div>
            <div className="mt-0.5 font-semibold text-amber-700">{item.ignorados}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toolbar + Footer ─────────────────────────────────────────────────────────

function ToolbarConciliacao({ meta, filters, setFilters, setAppliedFilters, resumoSugestoes, bulkReconciling, onConciliarSugeridos, appliedFilters }) {
  return (
    <div className="card sol-surface-card app-toolbar-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--c-muted)]">
          <span>
            Pág. <strong className="text-[var(--c-text)]">{meta.current_page}</strong> / {meta.total_pages}
            {' '}· {meta.total_disponivel} registro(s)
          </span>
          {resumoSugestoes.prontos > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <SparkIcon className="h-3 w-3" />
              {resumoSugestoes.prontos} p/ lote
            </span>
          )}
          {resumoSugestoes.manuais > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <KeyIcon className="h-3 w-3" />
              {resumoSugestoes.manuais} manual
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
            Por página
            <select className="input input-sm" value={filters.page_size}
              onChange={(e) => {
                const ps = Number(e.target.value || 100);
                setFilters((c) => ({ ...c, page_size: ps, page: 1 }));
                setAppliedFilters((c) => ({ ...c, page_size: ps, page: 1 }));
              }}>
              {[25, 50, 100, 200, 500].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <button type="button" className="btn btn-primary btn-sm"
            disabled={bulkReconciling || appliedFilters.status === 'CONCILIADO' || appliedFilters.status === 'IGNORADO' || resumoSugestoes.prontos === 0}
            onClick={onConciliarSugeridos}>
            {bulkReconciling ? 'Conciliando...' : 'Conciliar em lote'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FooterPaginacao({ meta, onAlterarPagina }) {
  if (meta.total_pages <= 1) return null;
  return (
    <div className="card sol-surface-card app-toolbar-card">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--c-muted)]">Pág. {meta.current_page} / {meta.total_pages}</span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-outline btn-sm" disabled={meta.current_page <= 1}
            onClick={() => onAlterarPagina(meta.current_page - 1)}>← Anterior</button>
          <button type="button" className="btn btn-outline btn-sm" disabled={meta.current_page >= meta.total_pages}
            onClick={() => onAlterarPagina(meta.current_page + 1)}>Próxima →</button>
        </div>
      </div>
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

export default function FinanceiroConciliacao() {
  const [contas, setContas] = useState([]);
  const [tarifasBancarias, setTarifasBancarias] = useState([]);
  const [filters, setFilters] = useState({ status: 'PENDENTE', conta_bancaria_id: '', data_inicial: '', data_final: '', page: 1, page_size: 100 });
  const [appliedFilters, setAppliedFilters] = useState({ status: 'PENDENTE', conta_bancaria_id: '', data_inicial: '', data_final: '', page: 1, page_size: 100 });
  const [uploadForm, setUploadForm] = useState({ conta_bancaria_id: '', file: null });
  const [dados, setDados] = useState({
    resumo: { total: 0, pendentes: 0, conciliados: 0, ignorados: 0, valor_total: 0, valor_absoluto_total: 0 },
    meta: { total_disponivel: 0, total_listado: 0, current_page: 1, page_size: 100, total_pages: 1 },
    itens: []
  });
  const [importacoes, setImportacoes] = useState({
    resumo: { total_importacoes: 0, total_lidos: 0, total_importados: 0, total_ignorados: 0 },
    itens: []
  });
  const [loading, setLoading] = useState(true);
  const [loadingContas, setLoadingContas] = useState(true);
  const [importing, setImporting] = useState(false);
  const [bulkReconciling, setBulkReconciling] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [acoesRapidasItem, setAcoesRapidasItem] = useState(null);
  const [novoTituloItem, setNovoTituloItem] = useState(null); // item OFX para o modal de novo título
  const [associacaoModal, setAssociacaoModal] = useState({
    open: false, item: null, filters: buildAssociacaoDefaults(null),
    loading: false, processing: false, error: '',
    dados: { conciliacao: null, meta: { total: 0, limit: 30 }, itens: [] }
  });
  const [faturaModal, setFaturaModal] = useState({
    open: false, item: null, filters: buildAssociacaoDefaults(null),
    loading: false, processing: false, error: '',
    dados: { conciliacao: null, meta: { total: 0, limit: 30 }, itens: [] }
  });
  const [transferenciaModal, setTransferenciaModal] = useState({
    open: false,
    item: null,
    conta_contraparte_id: '',
    descricao: '',
    tipo_intercompany: '',
    motivo_intercompany: '',
    elimina_consolidado: true,
    processing: false,
    error: ''
  });

  const contaAtualTransferencia = useMemo(
    () => contas.find((conta) => String(conta.id) === String(transferenciaModal.item?.conta_bancaria_id)),
    [contas, transferenciaModal.item?.conta_bancaria_id]
  );
  const contaContraparteTransferencia = useMemo(
    () => contas.find((conta) => String(conta.id) === String(transferenciaModal.conta_contraparte_id)),
    [contas, transferenciaModal.conta_contraparte_id]
  );
  const transferenciaEntreEmpresas = Boolean(
    getContaEmpresaId(contaAtualTransferencia) &&
    getContaEmpresaId(contaContraparteTransferencia) &&
    getContaEmpresaId(contaAtualTransferencia) !== getContaEmpresaId(contaContraparteTransferencia)
  );

  async function carregarContas() {
    try {
      setLoadingContas(true);
      const contasData = await getContasBancarias();
      const normalized = Array.isArray(contasData) ? contasData : [];
      setContas(normalized);
      setUploadForm((c) => ({ ...c, conta_bancaria_id: c.conta_bancaria_id || String(normalized[0]?.id || '') }));
    } catch { setContas([]); } finally { setLoadingContas(false); }
  }

  async function carregarTarifasBancarias() {
    try {
      const data = await getTarifasBancariasAtalhos();
      setTarifasBancarias(Array.isArray(data) ? data : []);
    } catch {
      setTarifasBancarias([]);
    }
  }

  async function carregarConciliacoes() {
    try {
      setLoading(true);
      setError('');
      const [response, importacoesResponse] = await Promise.all([
        getConciliacoesBancarias(appliedFilters),
        getImportacoesConciliacao({ conta_bancaria_id: appliedFilters.conta_bancaria_id, data_inicial: appliedFilters.data_inicial, data_final: appliedFilters.data_final, limit: 8 })
      ]);
      setDados({
        resumo: {
          total: Number(response?.resumo?.total || 0),
          pendentes: Number(response?.resumo?.pendentes || 0),
          conciliados: Number(response?.resumo?.conciliados || 0),
          ignorados: Number(response?.resumo?.ignorados || 0),
          valor_total: Number(response?.resumo?.valor_total || 0),
          valor_absoluto_total: Number(response?.resumo?.valor_absoluto_total || 0)
        },
        meta: {
          total_disponivel: Number(response?.meta?.total_disponivel || response?.resumo?.total || 0),
          total_listado: Number(response?.meta?.total_listado || 0),
          current_page: Number(response?.meta?.current_page || appliedFilters.page || 1),
          page_size: Number(response?.meta?.page_size || appliedFilters.page_size || 100),
          total_pages: Number(response?.meta?.total_pages || 1)
        },
        itens: Array.isArray(response?.itens) ? response.itens : []
      });
      setImportacoes({
        resumo: {
          total_importacoes: Number(importacoesResponse?.resumo?.total_importacoes || 0),
          total_lidos: Number(importacoesResponse?.resumo?.total_lidos || 0),
          total_importados: Number(importacoesResponse?.resumo?.total_importados || 0),
          total_ignorados: Number(importacoesResponse?.resumo?.total_ignorados || 0)
        },
        itens: Array.isArray(importacoesResponse?.itens) ? importacoesResponse.itens : []
      });
    } catch (err) {
      setError(err?.message || 'Erro ao carregar conciliacoes bancarias');
      setDados({ resumo: { total: 0, pendentes: 0, conciliados: 0, ignorados: 0, valor_total: 0, valor_absoluto_total: 0 }, meta: { total_disponivel: 0, total_listado: 0, current_page: 1, page_size: 100, total_pages: 1 }, itens: [] });
      setImportacoes({ resumo: { total_importacoes: 0, total_lidos: 0, total_importados: 0, total_ignorados: 0 }, itens: [] });
    } finally { setLoading(false); }
  }

  useEffect(() => { carregarContas(); carregarTarifasBancarias(); }, []);
  useEffect(() => { carregarConciliacoes(); }, [appliedFilters]);

  const resumoFinanceiro = useMemo(() => ([
    { label: 'Pendentes', value: String(dados.resumo.pendentes), detail: 'Aguardando conferência' },
    { label: 'Conciliados', value: String(dados.resumo.conciliados), detail: 'Matches confirmados' },
    { label: 'Ignorados', value: String(dados.resumo.ignorados), detail: 'Descartados na conferência' },
    { label: 'Saldo líquido', value: formatCurrency(dados.resumo.valor_total), detail: dados.meta.total_disponivel > dados.meta.total_listado ? `${dados.meta.total_listado} de ${dados.meta.total_disponivel} exibidos` : `${dados.meta.total_disponivel} lançamento(s)` },
    { label: 'Movimentação bruta', value: formatCurrency(dados.resumo.valor_absoluto_total), detail: 'Soma absoluta do filtro' }
  ]), [dados.meta.total_disponivel, dados.meta.total_listado, dados.resumo]);

  const resumoSugestoesPagina = useMemo(() => dados.itens.reduce(
    (acc, item) => { if (item.conciliacao_em_lote_disponivel) acc.prontos += 1; if (item.associacao_manual_recomendada) acc.manuais += 1; return acc; },
    { prontos: 0, manuais: 0 }
  ), [dados.itens]);

  async function handleImportar(event) {
    event.preventDefault();
    if (!uploadForm.conta_bancaria_id || !uploadForm.file) { setError('Selecione a conta bancaria e o arquivo OFX.'); return; }
    try {
      setImporting(true); setError(''); setFeedback('');
      const formData = new FormData();
      formData.append('conta_bancaria_id', uploadForm.conta_bancaria_id);
      formData.append('file', uploadForm.file);
      const response = await importarOfxConciliacao(formData);
      setFeedback(`${response.importados || 0} lançamento(s) importado(s) e ${response.ignorados || 0} ignorado(s) do arquivo ${response.arquivo || ''}.`);
      setUploadForm((c) => ({ ...c, file: null }));
      const fi = document.getElementById('ofx-file-input');
      if (fi) fi.value = '';
      await carregarConciliacoes();
    } catch (err) { setError(err?.message || 'Erro ao importar OFX'); } finally { setImporting(false); }
  }

  async function handleConfirmar(conciliacaoId, movimentoId, { fecharModal = false } = {}) {
    // Se conciliacaoId for null, apenas recarrega (fluxo do novo título sem movimento_id)
    if (!conciliacaoId) { await carregarConciliacoes(); return; }
    if (!Number.isInteger(Number(movimentoId)) || Number(movimentoId) <= 0) {
      const message = 'Selecione um movimento financeiro valido para confirmar a conciliacao.';
      if (fecharModal) setAssociacaoModal((c) => ({ ...c, processing: false, error: message }));
      else setError(message);
      return;
    }
    try {
      setProcessingId(`confirmar-${conciliacaoId}-${movimentoId}`);
      setError(''); setFeedback('');
      if (fecharModal) setAssociacaoModal((c) => ({ ...c, processing: true, error: '' }));
      await confirmarConciliacaoBancaria(conciliacaoId, { movimento_financeiro_id: movimentoId });
      setFeedback('Conciliacao confirmada com sucesso.');
      if (fecharModal) setAssociacaoModal((c) => ({ ...c, open: false, processing: false, error: '', dados: { conciliacao: null, meta: { total: 0, limit: 30 }, itens: [] } }));
      await carregarConciliacoes();
    } catch (err) {
      const message = err?.message || 'Erro ao confirmar conciliacao';
      if (fecharModal) setAssociacaoModal((c) => ({ ...c, processing: false, error: message }));
      else setError(message);
    } finally {
      setProcessingId(null);
      if (fecharModal) setAssociacaoModal((c) => ({ ...c, processing: false }));
    }
  }

  async function handleIgnorar(conciliacaoId) {
    if (!window.confirm('Marcar este lancamento como ignorado?')) return;
    try {
      setProcessingId(`ignorar-${conciliacaoId}`); setError(''); setFeedback('');
      await ignorarConciliacaoBancaria(conciliacaoId);
      setFeedback('Lancamento marcado como ignorado.');
      await carregarConciliacoes();
    } catch (err) { setError(err?.message || 'Erro ao ignorar conciliacao'); } finally { setProcessingId(null); }
  }

  async function handleConciliarSugeridos() {
    if (!window.confirm('Conciliar em lote todos os lançamentos pendentes do filtro atual que tenham sugestão segura?')) return;
    try {
      setBulkReconciling(true); setError(''); setFeedback('');
      const response = await conciliarSugestoesBancarias({ status: appliedFilters.status === 'TODOS' ? 'TODOS' : 'PENDENTE', conta_bancaria_id: appliedFilters.conta_bancaria_id, data_inicial: appliedFilters.data_inicial, data_final: appliedFilters.data_final });
      const r = response?.resumo || {};
      setFeedback(`${r.total_conciliadas || 0} confirmada(s) em lote. ${r.associacao_manual || 0} para associação manual. ${r.sem_sugestao || 0} sem sugestão.`);
      await carregarConciliacoes();
    } catch (err) { setError(err?.message || 'Erro ao conciliar sugestoes em lote'); } finally { setBulkReconciling(false); }
  }

  async function carregarMovimentosAssociacao(conciliacaoId, filtersPayload, { manterAberto = true } = {}) {
    try {
      setAssociacaoModal((c) => ({ ...c, open: manterAberto, loading: true, error: '', filters: filtersPayload || c.filters }));
      const response = await getMovimentosAssociacaoConciliacao(conciliacaoId, filtersPayload);
      setAssociacaoModal((c) => ({ ...c, open: true, loading: false, error: '', dados: { conciliacao: response?.conciliacao || null, meta: { total: Number(response?.meta?.total || 0), limit: Number(response?.meta?.limit || filtersPayload?.limit || c.filters.limit || 30) }, itens: Array.isArray(response?.itens) ? response.itens : [] } }));
    } catch (err) { setAssociacaoModal((c) => ({ ...c, open: true, loading: false, error: err?.message || 'Erro ao buscar movimentos' })); }
  }

  async function abrirAssociacaoManual(item) {
    const defaults = buildAssociacaoDefaults(item);
    setAssociacaoModal({ open: true, item, filters: defaults, loading: true, processing: false, error: '', dados: { conciliacao: null, meta: { total: 0, limit: defaults.limit }, itens: [] } });
    await carregarMovimentosAssociacao(item.id, defaults);
  }

  function fecharAssociacaoManual() {
    setAssociacaoModal({ open: false, item: null, filters: buildAssociacaoDefaults(null), loading: false, processing: false, error: '', dados: { conciliacao: null, meta: { total: 0, limit: 30 }, itens: [] } });
  }

  async function consultarAssociacaoManual(event) {
    event.preventDefault();
    if (!associacaoModal.item?.id) return;
    await carregarMovimentosAssociacao(associacaoModal.item.id, associacaoModal.filters);
  }

  async function carregarFaturasAssociacao(conciliacaoId, filtersPayload, { manterAberto = true } = {}) {
    try {
      setFaturaModal((c) => ({ ...c, open: manterAberto, loading: true, error: '', filters: filtersPayload || c.filters }));
      const response = await getFaturasAssociacaoConciliacao(conciliacaoId, filtersPayload);
      setFaturaModal((c) => ({
        ...c,
        open: true,
        loading: false,
        error: '',
        dados: {
          conciliacao: response?.conciliacao || null,
          meta: {
            total: Number(response?.meta?.total || 0),
            limit: Number(response?.meta?.limit || filtersPayload?.limit || c.filters.limit || 30)
          },
          itens: Array.isArray(response?.itens) ? response.itens : []
        }
      }));
    } catch (err) {
      setFaturaModal((c) => ({ ...c, open: true, loading: false, error: err?.message || 'Erro ao buscar faturas' }));
    }
  }

  async function abrirAssociacaoFatura(item) {
    const defaults = buildAssociacaoDefaults(item);
    setFaturaModal({
      open: true,
      item,
      filters: defaults,
      loading: true,
      processing: false,
      error: '',
      dados: { conciliacao: null, meta: { total: 0, limit: defaults.limit }, itens: [] }
    });
    await carregarFaturasAssociacao(item.id, defaults);
  }

  function fecharAssociacaoFatura() {
    setFaturaModal({
      open: false,
      item: null,
      filters: buildAssociacaoDefaults(null),
      loading: false,
      processing: false,
      error: '',
      dados: { conciliacao: null, meta: { total: 0, limit: 30 }, itens: [] }
    });
  }

  async function consultarAssociacaoFatura(event) {
    event.preventDefault();
    if (!faturaModal.item?.id) return;
    await carregarFaturasAssociacao(faturaModal.item.id, faturaModal.filters);
  }

  async function handleConfirmarFatura(conciliacaoId, faturaId) {
    if (!Number.isInteger(Number(faturaId)) || Number(faturaId) <= 0) {
      setFaturaModal((c) => ({ ...c, processing: false, error: 'Selecione uma fatura valida para conciliar.' }));
      return;
    }

    try {
      const processingKey = `fatura-${conciliacaoId}-${faturaId}`;
      setProcessingId(processingKey);
      setFaturaModal((c) => ({ ...c, processing: true, error: '' }));
      setError('');
      setFeedback('');
      await confirmarConciliacaoFaturaCartao(conciliacaoId, { fatura_cartao_id: faturaId });
      setFeedback('Fatura conciliada e titulos vinculados baixados com sucesso.');
      fecharAssociacaoFatura();
      await carregarConciliacoes();
    } catch (err) {
      setFaturaModal((c) => ({ ...c, processing: false, error: err?.message || 'Erro ao conciliar fatura' }));
    } finally {
      setProcessingId(null);
      setFaturaModal((c) => ({ ...c, processing: false }));
    }
  }

  function abrirAssociacaoTransferencia(item) {
    const contasDisponiveis = contas.filter((conta) => String(conta.id) !== String(item?.conta_bancaria_id));
    setTransferenciaModal({
      open: true,
      item,
      conta_contraparte_id: String(contasDisponiveis[0]?.id || ''),
      descricao: item?.descricao_banco ? `Transferencia - ${item.descricao_banco}` : 'Transferencia entre contas',
      tipo_intercompany: '',
      motivo_intercompany: item?.descricao_banco || '',
      elimina_consolidado: true,
      processing: false,
      error: ''
    });
  }

  function fecharAssociacaoTransferencia() {
    setTransferenciaModal({
      open: false,
      item: null,
      conta_contraparte_id: '',
      descricao: '',
      tipo_intercompany: '',
      motivo_intercompany: '',
      elimina_consolidado: true,
      processing: false,
      error: ''
    });
  }

  async function handleConfirmarTransferencia(event) {
    event.preventDefault();
    if (!transferenciaModal.item?.id) return;
    if (!transferenciaModal.conta_contraparte_id) {
      setTransferenciaModal((current) => ({ ...current, error: 'Selecione a conta contraparte da transferencia.' }));
      return;
    }
    if (transferenciaEntreEmpresas && !transferenciaModal.tipo_intercompany) {
      setTransferenciaModal((current) => ({ ...current, error: 'Selecione o tipo intercompany da transferencia.' }));
      return;
    }
    if (transferenciaEntreEmpresas && !String(transferenciaModal.motivo_intercompany || '').trim()) {
      setTransferenciaModal((current) => ({ ...current, error: 'Informe o motivo intercompany da transferencia.' }));
      return;
    }

    try {
      setProcessingId(`transferencia-${transferenciaModal.item.id}`);
      setTransferenciaModal((current) => ({ ...current, processing: true, error: '' }));
      setError('');
      setFeedback('');
      await confirmarConciliacaoTransferencia(transferenciaModal.item.id, {
        conta_contraparte_id: transferenciaModal.conta_contraparte_id,
        descricao: transferenciaModal.descricao,
        tipo_intercompany: transferenciaEntreEmpresas ? transferenciaModal.tipo_intercompany : undefined,
        motivo_intercompany: transferenciaEntreEmpresas ? transferenciaModal.motivo_intercompany : undefined,
        elimina_consolidado: transferenciaEntreEmpresas ? transferenciaModal.elimina_consolidado : true
      });
      setFeedback('Lancamento conciliado como transferencia entre contas.');
      fecharAssociacaoTransferencia();
      await carregarConciliacoes();
    } catch (err) {
      setTransferenciaModal((current) => ({ ...current, processing: false, error: err?.message || 'Erro ao conciliar transferencia' }));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleConfirmarTarifa(item, tarifa) {
    if (!item?.id || !tarifa?.codigo) return;
    if (!tarifa.categoria_financeira_id) {
      setError('Configure a categoria financeira deste atalho de tarifa em Financeiro > Cadastros antes de conciliar.');
      return;
    }

    try {
      setProcessingId(`tarifa-${item.id}-${tarifa.codigo}`);
      setError('');
      setFeedback('');
      await confirmarConciliacaoTarifaBancaria(item.id, {
        codigo: tarifa.codigo,
        descricao: item.descricao_banco || tarifa.nome
      });
      setFeedback(`Lancamento conciliado como ${tarifa.nome}.`);
      setAcoesRapidasItem(null);
      await carregarConciliacoes();
    } catch (err) {
      setError(err?.message || 'Erro ao conciliar tarifa bancaria');
    } finally {
      setProcessingId(null);
    }
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters, page: 1 });
  }

  function alterarPagina(nextPage) {
    setAppliedFilters((c) => ({ ...c, page: nextPage }));
  }

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page solicitacoes-page">

      {/* Cabeçalho */}
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Conciliação Bancária</h1>
            <p className="page-subtitle">
              Importe o OFX, revise as sugestões de match e confirme individualmente ou em lote.
              A importação não concilia nem cria títulos automaticamente.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/titulos" className="btn btn-outline btn-sm">Títulos</Link>
            <Link to="/financeiro/relatorios" className="btn btn-outline btn-sm">Relatórios</Link>
            <Link to="/financeiro/cadastros" className="btn btn-outline btn-sm">Cadastros</Link>
          </div>
        </div>
      </div>

      {/* Importar OFX — linha horizontal */}
      <form className="mt-4 card sol-surface-card" onSubmit={handleImportar}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="app-filter-field flex-1 min-w-[160px]">
            <span className="app-filter-label">Importar OFX <span className="font-normal text-[var(--c-muted)]">— Remessas duplicadas são bloqueadas.</span></span>
            <select className="input w-full input-sm" value={uploadForm.conta_bancaria_id} disabled={loadingContas}
              onChange={(e) => setUploadForm((c) => ({ ...c, conta_bancaria_id: e.target.value }))}>
              <option value="">Conta bancária</option>
              {contas.map((ct) => <option key={ct.id} value={ct.id}>{ct.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field flex-[2] min-w-[200px]">
            <span className="app-filter-label">Arquivo OFX</span>
            <input id="ofx-file-input" className="input w-full input-sm" type="file" accept=".ofx"
              onChange={(e) => setUploadForm((c) => ({ ...c, file: e.target.files?.[0] || null }))} />
          </label>
          <button type="submit" className="btn btn-primary btn-sm shrink-0" disabled={importing || !uploadForm.conta_bancaria_id || !uploadForm.file}>
            {importing ? 'Importando...' : 'Importar OFX'}
          </button>
        </div>
      </form>

      {/* Filtros — linha horizontal */}
      <form className="card sol-surface-card" onSubmit={aplicarFiltros}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="app-filter-field min-w-[130px]">
            <span className="app-filter-label">Status</span>
            <select className="input w-full input-sm" value={filters.status}
              onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}>
              <option value="PENDENTE">Pendentes</option>
              <option value="CONCILIADO">Conciliados</option>
              <option value="IGNORADO">Ignorados</option>
              <option value="TODOS">Todos</option>
            </select>
          </label>
          <label className="app-filter-field flex-1 min-w-[150px]">
            <span className="app-filter-label">Conta bancária</span>
            <select className="input w-full input-sm" value={filters.conta_bancaria_id} disabled={loadingContas}
              onChange={(e) => setFilters((c) => ({ ...c, conta_bancaria_id: e.target.value }))}>
              <option value="">Todas</option>
              {contas.map((ct) => <option key={ct.id} value={ct.id}>{ct.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field min-w-[130px]">
            <span className="app-filter-label">Data inicial</span>
            <input className="input w-full input-sm" type="date" value={filters.data_inicial}
              onChange={(e) => setFilters((c) => ({ ...c, data_inicial: e.target.value }))} />
          </label>
          <label className="app-filter-field min-w-[130px]">
            <span className="app-filter-label">Data final</span>
            <input className="input w-full input-sm" type="date" value={filters.data_final}
              onChange={(e) => setFilters((c) => ({ ...c, data_final: e.target.value }))} />
          </label>
          <div className="flex gap-2 shrink-0">
            <button type="submit" className="btn btn-primary btn-sm">Filtrar</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => {
              const next = { status: 'PENDENTE', conta_bancaria_id: '', data_inicial: '', data_final: '', page: 1, page_size: filters.page_size || 100 };
              setFilters(next); setAppliedFilters(next);
            }}>Limpar</button>
          </div>
        </div>
      </form>

      {/* Alertas */}
      {error && <div className="app-alert app-alert--error">{error}</div>}
      {feedback && <div className="app-alert border-emerald-200 bg-emerald-50 text-emerald-700">{feedback}</div>}

      {/* Indicadores + Resumo consolidado — linha horizontal */}
      <div className="card sol-surface-card">
        <div className="flex flex-wrap items-center gap-3">
          {resumoFinanceiro.map((item) => (
            <div key={item.label} className="flex flex-col min-w-[100px] flex-1">
              <span className="text-[10px] uppercase tracking-wide text-[var(--c-muted)]">{item.label}</span>
              <span className="text-sm font-bold text-[var(--c-text)] tabular-nums">{item.value}</span>
              <span className="text-[10px] text-[var(--c-muted)]">{item.detail}</span>
            </div>
          ))}
          <div className="h-8 w-px bg-[var(--c-border)] shrink-0 hidden xl:block" />
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wide text-[var(--c-muted)]">Lidos</span>
              <span className="text-sm font-bold text-[var(--c-text)]">{importacoes.resumo.total_lidos}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wide text-emerald-600">Import.</span>
              <span className="text-sm font-bold text-emerald-700">{importacoes.resumo.total_importados}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wide text-amber-600">Ignor.</span>
              <span className="text-sm font-bold text-amber-700">{importacoes.resumo.total_ignorados}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Área operacional */}
      {loading
        ? <div className="app-empty-card sol-surface-card">Carregando lançamentos...</div>
        : (
          <div className="space-y-1.5">
            <ToolbarConciliacao
              meta={dados.meta} filters={filters} setFilters={setFilters} setAppliedFilters={setAppliedFilters}
              resumoSugestoes={resumoSugestoesPagina} bulkReconciling={bulkReconciling}
              onConciliarSugeridos={handleConciliarSugeridos} appliedFilters={appliedFilters}
            />

            {dados.itens.length === 0
              ? <div className="app-empty-card sol-surface-card">Nenhum lançamento encontrado com os filtros atuais.</div>
              : dados.itens.map((item) => (
                  <ItemConciliacao
                    key={item.id} item={item} processingId={processingId}
                    onConfirmar={handleConfirmar} onIgnorar={handleIgnorar}
                    onAssociarManual={abrirAssociacaoManual}
                    onAssociarFatura={abrirAssociacaoFatura}
                    onAssociarTransferencia={abrirAssociacaoTransferencia}
                    onAcoesRapidas={(it) => setAcoesRapidasItem(it)}
                  />
                ))
            }

            <FooterPaginacao meta={dados.meta} onAlterarPagina={alterarPagina} />
          </div>
        )
      }

      {acoesRapidasItem && (
        <AcoesRapidasConciliacaoModal
          item={acoesRapidasItem}
          tarifas={tarifasBancarias}
          processingId={processingId}
          onClose={() => setAcoesRapidasItem(null)}
          onNovoTitulo={(item) => {
            setAcoesRapidasItem(null);
            setNovoTituloItem(item);
          }}
          onConfirmarTarifa={handleConfirmarTarifa}
        />
      )}

      {/* Modal: Novo título + baixa */}
      {novoTituloItem && (
        <NovoTituloRapidoModal
          item={novoTituloItem}
          contas={contas}
          onClose={() => setNovoTituloItem(null)}
          onConciliar={async (conciliacaoId, movimentoId) => {
            setNovoTituloItem(null);
            if (conciliacaoId && movimentoId) {
              await handleConfirmar(conciliacaoId, movimentoId);
            } else {
              await carregarConciliacoes();
              setFeedback('Título criado e baixado. Verifique as sugestões atualizadas para conciliar.');
            }
          }}
        />
      )}

      {/* Modal: Transferencia entre contas */}
      {transferenciaModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-[var(--c-surface)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] pb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Conciliar transferencia</h2>
                <p className="mt-0.5 text-sm text-[var(--c-muted)]">
                  Informe a outra conta envolvida. O sistema define origem e destino pelo sinal do lancamento bancario.
                </p>
                {transferenciaModal.item && (
                  <div className="mt-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm">
                    <span className="font-medium">{transferenciaModal.item.descricao_banco || 'Lancamento'}</span>
                    {' - '}{formatDate(transferenciaModal.item.data_movimento)}
                    {' - '}<ValorBanco value={transferenciaModal.item.valor} size="sm" />
                  </div>
                )}
              </div>
              <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={fecharAssociacaoTransferencia}>Fechar</button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleConfirmarTransferencia}>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--c-muted)]">Conta contraparte</span>
                <select
                  className="input w-full"
                  value={transferenciaModal.conta_contraparte_id}
                  onChange={(e) => setTransferenciaModal((current) => ({ ...current, conta_contraparte_id: e.target.value, tipo_intercompany: '', error: '' }))}
                  required
                >
                  <option value="">Selecione</option>
                  {contas
                    .filter((conta) => String(conta.id) !== String(transferenciaModal.item?.conta_bancaria_id))
                    .map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome}{conta.banco ? ` - ${conta.banco}` : ''}
                      </option>
                    ))}
                </select>
              </label>
              {contaAtualTransferencia && contaContraparteTransferencia ? (
                <div className={`rounded-xl border px-4 py-3 text-sm ${transferenciaEntreEmpresas ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                  <strong>{transferenciaEntreEmpresas ? 'Transferencia intercompany' : 'Transferencia interna da mesma empresa'}</strong>
                  <div className="mt-1">
                    {getContaEmpresaNome(contaAtualTransferencia)} para {getContaEmpresaNome(contaContraparteTransferencia)}.
                  </div>
                </div>
              ) : null}
              {transferenciaEntreEmpresas ? (
                <>
                  <label className="text-sm">
                    <span className="mb-1 block text-[var(--c-muted)]">Tipo intercompany</span>
                    <select
                      className="input w-full"
                      value={transferenciaModal.tipo_intercompany}
                      onChange={(e) => setTransferenciaModal((current) => ({ ...current, tipo_intercompany: e.target.value }))}
                      required
                    >
                      <option value="">Selecione</option>
                      {TIPOS_INTERCOMPANY.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-[var(--c-muted)]">Motivo intercompany</span>
                    <input
                      className="input w-full"
                      value={transferenciaModal.motivo_intercompany}
                      onChange={(e) => setTransferenciaModal((current) => ({ ...current, motivo_intercompany: e.target.value }))}
                      placeholder="Ex.: cobertura de caixa para folha"
                      required
                    />
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-[var(--c-border)] px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={transferenciaModal.elimina_consolidado}
                      onChange={(e) => setTransferenciaModal((current) => ({ ...current, elimina_consolidado: e.target.checked }))}
                    />
                    <span>Eliminar do consolidado do grupo</span>
                  </label>
                </>
              ) : null}
              <label className="text-sm">
                <span className="mb-1 block text-[var(--c-muted)]">Descricao</span>
                <input
                  className="input w-full"
                  value={transferenciaModal.descricao}
                  onChange={(e) => setTransferenciaModal((current) => ({ ...current, descricao: e.target.value }))}
                />
              </label>
              {transferenciaModal.error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {transferenciaModal.error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-outline" onClick={fecharAssociacaoTransferencia}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={transferenciaModal.processing}>
                  {transferenciaModal.processing ? 'Conciliando...' : 'Conciliar transferencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Associação manual */}
      {associacaoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white dark:bg-[var(--c-surface)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] pb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Associação manual</h2>
                <p className="mt-0.5 text-sm text-[var(--c-muted)]">Escolha o movimento correto quando a sugestão automática não for suficiente.</p>
                {associacaoModal.item && (
                  <div className="mt-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm">
                    <span className="font-medium">{associacaoModal.item.descricao_banco || 'Lançamento'}</span>
                    {' · '}{formatDate(associacaoModal.item.data_movimento)}
                    {' · '}<ValorBanco value={associacaoModal.item.valor} size="sm" />
                    {associacaoModal.item.documento ? ` · Doc. ${associacaoModal.item.documento}` : ''}
                  </div>
                )}
              </div>
              <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={fecharAssociacaoManual}>Fechar</button>
            </div>

            <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={consultarAssociacaoManual}>
              {[
                { label: 'Data inicial', field: 'data_inicial', type: 'date' },
                { label: 'Data final', field: 'data_final', type: 'date' },
                { label: 'Documento / texto', field: 'documento', type: 'text', placeholder: 'Parceiro, descrição ou doc.' },
                { label: 'Número do documento', field: 'numero_documento', type: 'text' },
                { label: 'Valor inicial', field: 'valor_inicial', type: 'number' },
                { label: 'Valor final', field: 'valor_final', type: 'number' }
              ].map(({ label, field, type, placeholder }) => (
                <label key={field} className="text-sm">
                  <span className="mb-1 block text-[var(--c-muted)]">{label}</span>
                  <input className="input w-full" type={type === 'number' ? 'text' : type} inputMode={type === 'number' ? 'decimal' : undefined}
                    placeholder={placeholder} value={associacaoModal.filters[field]}
                    onChange={(e) => setAssociacaoModal((c) => ({
                      ...c,
                      filters: {
                        ...c.filters,
                        [field]: type === 'number' ? normalizeCurrencyTyping(e.target.value) : e.target.value
                      }
                    }))} />
                </label>
              ))}
              <label className="text-sm">
                <span className="mb-1 block text-[var(--c-muted)]">Limite</span>
                <select className="input w-full" value={associacaoModal.filters.limit}
                  onChange={(e) => setAssociacaoModal((c) => ({ ...c, filters: { ...c.filters, limit: Number(e.target.value || 30) } }))}>
                  {[20, 30, 50, 100].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <div className="flex items-end gap-2 xl:col-span-2">
                <button type="submit" className="btn btn-primary" disabled={associacaoModal.loading}>
                  {associacaoModal.loading ? 'Consultando...' : 'Consultar'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => {
                  const next = buildAssociacaoDefaults(associacaoModal.item);
                  setAssociacaoModal((c) => ({ ...c, filters: next }));
                  if (associacaoModal.item?.id) carregarMovimentosAssociacao(associacaoModal.item.id, next);
                }}>Limpar</button>
              </div>
            </form>

            {associacaoModal.error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{associacaoModal.error}</div>
            )}
            <div className="mt-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-2 text-sm text-[var(--c-muted)]">
              {associacaoModal.dados.meta.total} movimento(s) encontrado(s)
            </div>
            <div className="mt-3 space-y-2">
              {associacaoModal.loading
                ? <div className="rounded-xl border border-[var(--c-border)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">Carregando movimentos...</div>
                : associacaoModal.dados.itens.length === 0
                  ? <div className="rounded-xl border border-dashed border-[var(--c-border)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">Nenhum movimento encontrado com os filtros atuais.</div>
                  : associacaoModal.dados.itens.map((it) => (
                      <div key={it.movimento_financeiro_id} className="rounded-xl border border-[var(--c-border)] px-4 py-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-[var(--c-text)]">{it.titulo_descricao}</p>
                            <p className="text-[var(--c-muted)]">{it.parceiro_nome} · {it.tipo} · mov. #{it.movimento_financeiro_id}</p>
                            <p className="text-[var(--c-muted)]">{formatDate(it.data_movimento)} · {formatCurrency(it.valor_quitacao)}{it.documento ? ` · Doc. ${it.documento}` : ''}</p>
                            {it.motivos?.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {it.motivos.map((m) => <span key={`${it.movimento_financeiro_id}-${m}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{m}</span>)}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-start gap-2 md:items-end">
                            <span className="text-xs uppercase tracking-wide text-[var(--c-muted)]">Score {it.score}</span>
                            <button type="button" className="btn btn-primary btn-sm"
                              disabled={associacaoModal.processing || processingId === `confirmar-${associacaoModal.item?.id}-${it.movimento_financeiro_id}`}
                              onClick={() => handleConfirmar(associacaoModal.item?.id, it.movimento_financeiro_id, { fecharModal: true })}>
                              {associacaoModal.processing || processingId === `confirmar-${associacaoModal.item?.id}-${it.movimento_financeiro_id}` ? 'Associando...' : 'Associar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Modal: Associar fatura */}
      {faturaModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-[var(--c-surface)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] pb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Associar fatura de cartao</h2>
                <p className="mt-0.5 text-sm text-[var(--c-muted)]">
                  Use esta opcao quando o lancamento bancario pagar uma fatura inteira; os titulos da fatura serao baixados individualmente.
                </p>
                {faturaModal.item && (
                  <div className="mt-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm">
                    <span className="font-medium">{faturaModal.item.descricao_banco || 'Lancamento'}</span>
                    {' - '}{formatDate(faturaModal.item.data_movimento)}
                    {' - '}<ValorBanco value={faturaModal.item.valor} size="sm" />
                    {faturaModal.item.documento ? ` - Doc. ${faturaModal.item.documento}` : ''}
                  </div>
                )}
              </div>
              <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={fecharAssociacaoFatura}>Fechar</button>
            </div>

            <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={consultarAssociacaoFatura}>
              {[
                { label: 'Data inicial', field: 'data_inicial', type: 'date' },
                { label: 'Data final', field: 'data_final', type: 'date' },
                { label: 'Texto / cartao', field: 'documento', type: 'text', placeholder: 'Cartao, titular ou competencia' },
                { label: 'Valor inicial', field: 'valor_inicial', type: 'number' },
                { label: 'Valor final', field: 'valor_final', type: 'number' }
              ].map(({ label, field, type, placeholder }) => (
                <label key={field} className="text-sm">
                  <span className="mb-1 block text-[var(--c-muted)]">{label}</span>
                  <input
                    className="input w-full"
                    type={type === 'number' ? 'text' : type}
                    inputMode={type === 'number' ? 'decimal' : undefined}
                    placeholder={placeholder}
                    value={faturaModal.filters[field] || ''}
                    onChange={(e) => setFaturaModal((c) => ({
                      ...c,
                      filters: {
                        ...c.filters,
                        [field]: type === 'number' ? normalizeCurrencyTyping(e.target.value) : e.target.value
                      }
                    }))}
                  />
                </label>
              ))}
              <label className="text-sm">
                <span className="mb-1 block text-[var(--c-muted)]">Limite</span>
                <select className="input w-full" value={faturaModal.filters.limit}
                  onChange={(e) => setFaturaModal((c) => ({ ...c, filters: { ...c.filters, limit: Number(e.target.value || 30) } }))}>
                  {[20, 30, 50, 100].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <div className="flex items-end gap-2 xl:col-span-2">
                <button type="submit" className="btn btn-primary" disabled={faturaModal.loading}>
                  {faturaModal.loading ? 'Consultando...' : 'Consultar faturas'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => {
                  const next = buildAssociacaoDefaults(faturaModal.item);
                  setFaturaModal((c) => ({ ...c, filters: next }));
                  if (faturaModal.item?.id) carregarFaturasAssociacao(faturaModal.item.id, next);
                }}>Limpar</button>
              </div>
            </form>

            {faturaModal.error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{faturaModal.error}</div>
            )}
            <div className="mt-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-2 text-sm text-[var(--c-muted)]">
              {faturaModal.dados.meta.total} fatura(s) encontrada(s)
            </div>
            <div className="mt-3 space-y-2">
              {faturaModal.loading
                ? <div className="rounded-xl border border-[var(--c-border)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">Carregando faturas...</div>
                : faturaModal.dados.itens.length === 0
                  ? <div className="rounded-xl border border-dashed border-[var(--c-border)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">Nenhuma fatura encontrada com os filtros atuais.</div>
                  : faturaModal.dados.itens.map((fatura) => {
                    const processingKey = `fatura-${faturaModal.item?.id}-${fatura.id}`;
                    return (
                      <div key={fatura.id} className="rounded-xl border border-[var(--c-border)] px-4 py-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-[var(--c-text)]">
                              {fatura.cartao?.nome || 'Cartao'} - competencia {fatura.competencia}
                            </p>
                            <p className="text-[var(--c-muted)]">
                              {formatDate(fatura.data_fechamento)} a vencer em {formatDate(fatura.data_vencimento)}
                              {' - '}{fatura.total_titulos || 0} titulo(s)
                            </p>
                            <p className="text-[var(--c-muted)]">
                              Valor da fatura: {formatCurrency(fatura.valor_total)}
                            </p>
                          </div>
                          <div className="flex flex-col items-start gap-2 md:items-end">
                            <span className={statusClass(fatura.status)}>{fatura.status}</span>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={faturaModal.processing || processingId === processingKey}
                              onClick={() => handleConfirmarFatura(faturaModal.item?.id, fatura.id)}
                            >
                              {faturaModal.processing || processingId === processingKey ? 'Associando...' : 'Associar fatura'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
