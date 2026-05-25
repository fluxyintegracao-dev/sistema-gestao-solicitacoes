import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineCreditCard
} from 'react-icons/hi2';
import {
  baixarFaturaCartaoFinanceiro,
  getContasBancarias,
  getFaturaCartaoFinanceiro
} from '../services/financeiro';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return '-';
  return `${day}/${month}/${year}`;
}

function statusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAGA' || normalized === 'QUITADO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'FECHADA' || normalized === 'ABERTO') return 'app-status-pill bg-blue-100 text-blue-700';
  if (normalized === 'PARCIAL') return 'app-status-pill bg-amber-100 text-amber-700';
  if (normalized === 'CANCELADA' || normalized === 'CANCELADO') return 'app-status-pill bg-rose-100 text-rose-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function cartaoLabel(cartao) {
  if (!cartao) return 'Cartao nao informado';
  const final = String(cartao.ultimos_digitos || '').replace(/\D/g, '').slice(-4);
  const bandeira = String(cartao.bandeira || '').trim();
  return final
    ? `${bandeira || 'Cartao'} final ${final}`
    : `Cartao #${cartao.id}`;
}

function contaLabel(conta) {
  if (!conta) return 'Conta nao informada';
  const banco = conta.banco || conta.tipo_operacional || 'Conta';
  return `${conta.nome || `Conta #${conta.id}`} - ${banco}`;
}

function getValorAberto(fatura) {
  return (fatura?.titulos || []).reduce((total, titulo) => {
    if (!['ABERTO', 'PARCIAL'].includes(String(titulo.status || '').toUpperCase())) return total;
    return total + Number(titulo.valor_saldo || titulo.valor_original || 0);
  }, 0);
}

function countTitulosAbertos(fatura) {
  return (fatura?.titulos || []).filter((titulo) => ['ABERTO', 'PARCIAL'].includes(String(titulo.status || '').toUpperCase())).length;
}

export default function FinanceiroFaturaCartaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fatura, setFatura] = useState(null);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [baixaForm, setBaixaForm] = useState({
    conta_bancaria_id: '',
    data_pagamento: today(),
    observacoes: ''
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getFaturaCartaoFinanceiro(id)
      .then((data) => {
        if (!active) return;
        setFatura(data);
        setBaixaForm((current) => ({
          ...current,
          conta_bancaria_id: data.conta_bancaria_id || data.cartao?.conta_bancaria_id || ''
        }));
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Erro ao carregar fatura de cartao');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);

    getContasBancarias()
      .then((data) => {
        if (active) setContas(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setContas([]);
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const resumo = useMemo(() => ({
    total: Number(fatura?.valor_total || 0),
    aberto: getValorAberto(fatura),
    titulos: (fatura?.titulos || []).length,
    titulosAbertos: countTitulosAbertos(fatura)
  }), [fatura]);

  async function baixarFatura(event) {
    event.preventDefault();
    if (!fatura) return;

    try {
      setProcessing(true);
      setError('');
      setMessage('');
      const data = await baixarFaturaCartaoFinanceiro(fatura.id, baixaForm);
      setFatura(data);
      setMessage('Fatura baixada. Os titulos abertos foram quitados com movimentos na conta bancaria informada.');
    } catch (err) {
      setError(err?.message || 'Erro ao baixar fatura de cartao');
    } finally {
      setProcessing(false);
    }
  }

  const status = String(fatura?.status || '').toUpperCase();
  const canBaixar = fatura && ['ABERTA', 'FECHADA', 'PARCIAL'].includes(status) && resumo.titulosAbertos > 0;

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header-row">
        <div>
          <button type="button" className="btn btn-outline btn-sm mb-3" onClick={() => navigate('/financeiro/faturas-cartao')}>
            <HiOutlineArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <h1 className="page-title">Detalhes da Fatura</h1>
          <p className="page-subtitle">Confira todos os titulos vinculados antes de registrar a baixa da fatura.</p>
        </div>
        <div className="app-page-actions">
          <Link to="/financeiro/faturas-cartao" className="btn btn-outline btn-sm">Faturas</Link>
          <Link to="/financeiro/titulos" className="btn btn-outline btn-sm">Titulos</Link>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {loading ? (
        <div className="card sol-surface-card">Carregando fatura...</div>
      ) : !fatura ? (
        <div className="app-empty-card">Fatura nao encontrada.</div>
      ) : (
        <div className="space-y-4">
          <section className="card sol-surface-card">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Fatura</p>
                <h2 className="mt-1 text-2xl font-semibold text-[var(--c-text)]">{fatura.competencia || `#${fatura.id}`}</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  {cartaoLabel(fatura.cartao)} - periodo {formatDate(fatura.data_inicio)} a {formatDate(fatura.data_fechamento)} - vence em {formatDate(fatura.data_vencimento)}
                </p>
              </div>
              <span className={statusClass(fatura.status)}>{fatura.status || 'ABERTA'}</span>
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="card sol-surface-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Valor total</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{formatCurrency(resumo.total)}</p>
                </div>
                <HiOutlineCreditCard className="h-5 w-5 text-[var(--c-muted)]" />
              </div>
            </div>
            <div className="card sol-surface-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Saldo aberto</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{formatCurrency(resumo.aberto)}</p>
                </div>
                <HiOutlineBanknotes className="h-5 w-5 text-[var(--c-muted)]" />
              </div>
            </div>
            <div className="card sol-surface-card">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Titulos</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{resumo.titulos}</p>
              </div>
            </div>
            <div className="card sol-surface-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Abertos</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{resumo.titulosAbertos}</p>
                </div>
                <HiOutlineCheckCircle className="h-5 w-5 text-[var(--c-muted)]" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="card sol-surface-card">
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Titulos da fatura</h2>
                <p className="text-sm text-[var(--c-muted)]">Lista completa dos titulos vinculados a esta fatura.</p>
              </div>

              <div className="app-table-shell overflow-x-auto">
                <table className="table min-w-full">
                  <thead>
                    <tr>
                      <th>Titulo</th>
                      <th>Parceiro</th>
                      <th>Vencimento</th>
                      <th>Status</th>
                      <th>Valor</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fatura.titulos || []).length === 0 ? (
                      <tr><td colSpan="6">Nenhum titulo vinculado a esta fatura.</td></tr>
                    ) : fatura.titulos.map((titulo) => (
                      <tr key={titulo.id}>
                        <td>
                          <div className="font-semibold text-[var(--c-text)]">{titulo.codigo || `Titulo #${titulo.id}`}</div>
                          <div className="max-w-xl text-xs text-[var(--c-muted)]">{titulo.descricao || 'Sem descricao'}</div>
                        </td>
                        <td>{titulo.parceiro?.nome || 'Parceiro nao informado'}</td>
                        <td>{formatDate(titulo.data_vencimento)}</td>
                        <td><span className={statusClass(titulo.status)}>{titulo.status || 'ABERTO'}</span></td>
                        <td className="font-semibold">{formatCurrency(titulo.valor_original)}</td>
                        <td>{formatCurrency(titulo.valor_saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="card sol-surface-card">
              {canBaixar ? (
                <form className="space-y-3" onSubmit={baixarFatura}>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--c-text)]">Baixar fatura</h2>
                    <p className="text-sm text-[var(--c-muted)]">
                      A baixa quita os titulos abertos e gera movimentos na conta bancaria real.
                    </p>
                  </div>
                  <label className="app-filter-field">
                    <span className="app-filter-label">Conta bancaria</span>
                    <select
                      className="input w-full input-sm"
                      value={baixaForm.conta_bancaria_id}
                      onChange={(event) => setBaixaForm((current) => ({ ...current, conta_bancaria_id: event.target.value }))}
                      disabled={loadingOptions}
                      required
                    >
                      <option value="">Selecione a conta real</option>
                      {contas.map((conta) => (
                        <option key={conta.id} value={conta.id}>{contaLabel(conta)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="app-filter-field">
                    <span className="app-filter-label">Data de pagamento</span>
                    <input
                      className="input w-full input-sm"
                      type="date"
                      value={baixaForm.data_pagamento}
                      onChange={(event) => setBaixaForm((current) => ({ ...current, data_pagamento: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="app-filter-field">
                    <span className="app-filter-label">Observacoes</span>
                    <textarea
                      className="input min-h-[88px] w-full"
                      value={baixaForm.observacoes}
                      onChange={(event) => setBaixaForm((current) => ({ ...current, observacoes: event.target.value }))}
                      placeholder="Opcional"
                    />
                  </label>
                  <button type="submit" className="btn btn-primary w-full" disabled={processing}>
                    {processing ? 'Baixando...' : 'Baixar fatura'}
                  </button>
                </form>
              ) : (
                <div className="app-note">
                  Esta fatura nao possui titulos abertos para baixa.
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
