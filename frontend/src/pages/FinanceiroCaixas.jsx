import { useEffect, useMemo, useState } from 'react';
import {
  abrirCaixaFinanceiro,
  cancelarTransferenciaFinanceira,
  fecharCaixaFinanceiro,
  getCaixasFinanceiros,
  getContasBancarias,
  criarTransferenciaFinanceira,
  getTransferenciasFinanceiras
} from '../services/financeiro';
import { getEmpresasGrupo } from '../services/empresasGrupo';

const DEFAULT_FILTERS = {
  status: 'ABERTO',
  empresa_id: '',
  conta_bancaria_id: '',
  limit: '100'
};

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

function compact(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
  );
}

function statusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ABERTO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'FECHADO') return 'app-status-pill bg-slate-100 text-slate-700';
  return 'app-status-pill bg-blue-100 text-blue-700';
}

function contaLabel(conta) {
  if (!conta) return 'Conta nao informada';
  const sufixo = conta.tipo_operacional === 'CAIXA_INTERNO' ? 'Caixa interno' : (conta.banco || 'Conta bancaria');
  return `${conta.nome || `Conta ${conta.id}`} - ${sufixo}`;
}

export default function FinanceiroCaixas() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [contas, setContas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [abrirForm, setAbrirForm] = useState({
    conta_bancaria_id: '',
    data_abertura: today(),
    saldo_abertura: '',
    observacoes: ''
  });
  const [fecharForm, setFecharForm] = useState({});
  const [transferenciaForm, setTransferenciaForm] = useState({
    conta_origem_id: '',
    conta_destino_id: '',
    data_transferencia: today(),
    valor: '',
    descricao: ''
  });
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);

    Promise.all([
      getContasBancarias().catch(() => []),
      getEmpresasGrupo({ ativo: true }).catch(() => [])
    ])
      .then(([contasData, empresasData]) => {
        if (!active) return;
        setContas(Array.isArray(contasData) ? contasData : []);
        setEmpresas(Array.isArray(empresasData) ? empresasData : []);
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      getCaixasFinanceiros(compact(appliedFilters)),
      getTransferenciasFinanceiras(compact({
        empresa_id: appliedFilters.empresa_id,
        conta_bancaria_id: appliedFilters.conta_bancaria_id,
        status: 'TODOS',
        limit: appliedFilters.limit
      }))
    ])
      .then(([data, transferenciasData]) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setSessoes(list);
        setTransferencias(Array.isArray(transferenciasData) ? transferenciasData : []);
        setFecharForm((current) => {
          const next = { ...current };
          for (const sessao of list) {
            if (sessao.status === 'ABERTO' && !next[sessao.id]) {
              next[sessao.id] = {
                data_fechamento: today(),
                saldo_informado: sessao.resumo_atual?.saldo_sistema ?? sessao.saldo_sistema ?? '',
                observacoes: ''
              };
            }
          }
          return next;
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar caixas financeiros');
        setSessoes([]);
        setTransferencias([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const contasFiltradas = useMemo(() => {
    if (!filters.empresa_id) return contas;
    return contas.filter((conta) => String(conta.empresa_id || '') === String(filters.empresa_id));
  }, [contas, filters.empresa_id]);

  const resumo = useMemo(() => sessoes.reduce((acc, sessao) => {
    acc.quantidade += 1;
    if (sessao.status === 'ABERTO') acc.abertos += 1;
    if (sessao.status === 'FECHADO') acc.fechados += 1;
    const saldoAtual = sessao.resumo_atual?.saldo_sistema ?? sessao.saldo_sistema ?? 0;
    acc.saldo += Number(saldoAtual || 0);
    return acc;
  }, { quantidade: 0, abertos: 0, fechados: 0, saldo: 0 }), [sessoes]);

  function setFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === 'empresa_id' ? { conta_bancaria_id: '' } : {})
    }));
  }

  async function handleAbrir(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await abrirCaixaFinanceiro({
        ...abrirForm,
        saldo_abertura: abrirForm.saldo_abertura === '' ? undefined : abrirForm.saldo_abertura
      });
      setMessage('Caixa aberto com sucesso.');
      setAbrirForm({
        conta_bancaria_id: '',
        data_abertura: today(),
        saldo_abertura: '',
        observacoes: ''
      });
      setAppliedFilters((current) => ({ ...current }));
    } catch (err) {
      setError(err?.message || 'Erro ao abrir caixa financeiro');
    } finally {
      setSaving(false);
    }
  }

  async function handleFechar(sessaoId) {
    const payload = fecharForm[sessaoId] || {};
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await fecharCaixaFinanceiro(sessaoId, payload);
      setMessage('Caixa fechado com sucesso.');
      setAppliedFilters((current) => ({ ...current }));
    } catch (err) {
      setError(err?.message || 'Erro ao fechar caixa financeiro');
    } finally {
      setSaving(false);
    }
  }

  async function handleTransferencia(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await criarTransferenciaFinanceira(transferenciaForm);
      setMessage('Transferencia registrada com sucesso.');
      setTransferenciaForm({
        conta_origem_id: '',
        conta_destino_id: '',
        data_transferencia: today(),
        valor: '',
        descricao: ''
      });
      setAppliedFilters((current) => ({ ...current }));
    } catch (err) {
      setError(err?.message || 'Erro ao registrar transferencia financeira');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelarTransferencia(transferenciaId) {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await cancelarTransferenciaFinanceira(transferenciaId, {});
      setMessage('Transferencia cancelada com sucesso.');
      setAppliedFilters((current) => ({ ...current }));
    } catch (err) {
      setError(err?.message || 'Erro ao cancelar transferencia financeira');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header">
        <h1 className="text-xl font-semibold md:text-2xl">Abertura e Fechamento de Caixa</h1>
        <p className="page-subtitle">
          Controle operacional por empresa e conta, incluindo contas bancarias e caixa interno em especie.
        </p>
      </div>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}
      {message ? <div className="app-alert">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="app-summary-card">
          <span className="app-summary-label">Sessoes filtradas</span>
          <strong className="app-summary-value">{resumo.quantidade}</strong>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Abertas</span>
          <strong className="app-summary-value">{resumo.abertos}</strong>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Fechadas</span>
          <strong className="app-summary-value">{resumo.fechados}</strong>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Saldo apurado</span>
          <strong className="app-summary-value">{formatCurrency(resumo.saldo)}</strong>
        </div>
      </div>

      <div className="card sol-surface-card">
        <div className="solicitacoes-toolbar rounded-xl p-0">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Filtros</h2>
            <p className="text-sm text-[var(--c-muted)]">Use os filtros para acompanhar uma empresa, conta ou status.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setAppliedFilters(filters)} disabled={loading}>
            Consultar
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="sol-filter-field">
            <span className="sol-filter-label">Empresa</span>
            <select className="input w-full" value={filters.empresa_id} onChange={(e) => setFilter('empresa_id', e.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
              ))}
            </select>
          </label>
          <label className="sol-filter-field">
            <span className="sol-filter-label">Conta</span>
            <select className="input w-full" value={filters.conta_bancaria_id} onChange={(e) => setFilter('conta_bancaria_id', e.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {contasFiltradas.map((conta) => (
                <option key={conta.id} value={conta.id}>{contaLabel(conta)}</option>
              ))}
            </select>
          </label>
          <label className="sol-filter-field">
            <span className="sol-filter-label">Status</span>
            <select className="input w-full" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="ABERTO">Abertos</option>
              <option value="FECHADO">Fechados</option>
              <option value="TODOS">Todos</option>
            </select>
          </label>
          <label className="sol-filter-field">
            <span className="sol-filter-label">Limite</span>
            <select className="input w-full" value={filters.limit} onChange={(e) => setFilter('limit', e.target.value)}>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(300px,360px)_minmax(320px,400px)_1fr]">
        <div className="card sol-surface-card">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Abrir caixa</h2>
          <form className="mt-4 space-y-3" onSubmit={handleAbrir}>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Conta</span>
              <select
                className="input w-full"
                value={abrirForm.conta_bancaria_id}
                onChange={(e) => setAbrirForm((current) => ({ ...current, conta_bancaria_id: e.target.value }))}
                required
                disabled={loadingOptions}
              >
                <option value="">Selecione</option>
                {contas.map((conta) => (
                  <option key={conta.id} value={conta.id}>{contaLabel(conta)}</option>
                ))}
              </select>
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Data de abertura</span>
              <input
                className="input w-full"
                type="date"
                value={abrirForm.data_abertura}
                onChange={(e) => setAbrirForm((current) => ({ ...current, data_abertura: e.target.value }))}
              />
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Saldo de abertura</span>
              <input
                className="input w-full"
                inputMode="decimal"
                placeholder="Usar saldo do ultimo fechamento"
                value={abrirForm.saldo_abertura}
                onChange={(e) => setAbrirForm((current) => ({ ...current, saldo_abertura: e.target.value }))}
              />
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Observacoes</span>
              <textarea
                className="input min-h-[88px] w-full"
                value={abrirForm.observacoes}
                onChange={(e) => setAbrirForm((current) => ({ ...current, observacoes: e.target.value }))}
              />
            </label>
            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
              {saving ? 'Salvando...' : 'Abrir caixa'}
            </button>
          </form>
        </div>

        <div className="card sol-surface-card">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Transferir entre contas</h2>
          <form className="mt-4 space-y-3" onSubmit={handleTransferencia}>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Conta de origem</span>
              <select
                className="input w-full"
                value={transferenciaForm.conta_origem_id}
                onChange={(e) => setTransferenciaForm((current) => ({ ...current, conta_origem_id: e.target.value }))}
                required
                disabled={loadingOptions}
              >
                <option value="">Selecione</option>
                {contas.map((conta) => (
                  <option key={conta.id} value={conta.id}>{contaLabel(conta)}</option>
                ))}
              </select>
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Conta de destino</span>
              <select
                className="input w-full"
                value={transferenciaForm.conta_destino_id}
                onChange={(e) => setTransferenciaForm((current) => ({ ...current, conta_destino_id: e.target.value }))}
                required
                disabled={loadingOptions}
              >
                <option value="">Selecione</option>
                {contas.map((conta) => (
                  <option key={conta.id} value={conta.id}>{contaLabel(conta)}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sol-filter-field">
                <span className="sol-filter-label">Data</span>
                <input
                  className="input w-full"
                  type="date"
                  value={transferenciaForm.data_transferencia}
                  onChange={(e) => setTransferenciaForm((current) => ({ ...current, data_transferencia: e.target.value }))}
                />
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Valor</span>
                <input
                  className="input w-full"
                  inputMode="decimal"
                  value={transferenciaForm.valor}
                  onChange={(e) => setTransferenciaForm((current) => ({ ...current, valor: e.target.value }))}
                  required
                />
              </label>
            </div>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Descricao</span>
              <input
                className="input w-full"
                value={transferenciaForm.descricao}
                onChange={(e) => setTransferenciaForm((current) => ({ ...current, descricao: e.target.value }))}
                placeholder="Ex.: transferencia para suprimento de caixa"
              />
            </label>
            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar transferencia'}
            </button>
          </form>
        </div>

        <div className="card sol-surface-card">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Sessoes de caixa</h2>
          {loading ? (
            <div className="app-empty-card mt-4">Carregando caixas...</div>
          ) : sessoes.length === 0 ? (
            <div className="app-empty-card mt-4">Nenhum caixa encontrado.</div>
          ) : (
            <div className="mt-4 app-list-stack">
              {sessoes.map((sessao) => {
                const resumoAtual = sessao.resumo_atual || {};
                const saldoSistema = resumoAtual.saldo_sistema ?? sessao.saldo_sistema ?? 0;
                return (
                  <div key={sessao.id} className="app-list-card">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-[var(--c-text)]">{contaLabel(sessao.contaBancaria)}</strong>
                          <span className={statusClass(sessao.status)}>{sessao.status}</span>
                        </div>
                        <div className="mt-1 text-[var(--c-muted)]">
                          {sessao.empresa?.nome || 'Sem empresa'} - Aberto em {formatDate(sessao.data_abertura)}
                          {sessao.data_fechamento ? ` - Fechado em ${formatDate(sessao.data_fechamento)}` : ''}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-4">
                          <div>
                            <span className="app-summary-label">Abertura</span>
                            <strong className="block text-[var(--c-text)]">{formatCurrency(sessao.saldo_abertura)}</strong>
                          </div>
                          <div>
                            <span className="app-summary-label">Entradas</span>
                            <strong className="block text-emerald-700">{formatCurrency(resumoAtual.total_entradas ?? sessao.total_entradas)}</strong>
                          </div>
                          <div>
                            <span className="app-summary-label">Saidas</span>
                            <strong className="block text-rose-700">{formatCurrency(resumoAtual.total_saidas ?? sessao.total_saidas)}</strong>
                          </div>
                          <div>
                            <span className="app-summary-label">Saldo sistema</span>
                            <strong className="block text-[var(--c-text)]">{formatCurrency(saldoSistema)}</strong>
                          </div>
                        </div>
                        {sessao.status === 'FECHADO' ? (
                          <div className="mt-2 text-[var(--c-muted)]">
                            Saldo informado {formatCurrency(sessao.saldo_informado)} - Diferenca {formatCurrency(sessao.diferenca)}
                          </div>
                        ) : null}
                      </div>

                      {sessao.status === 'ABERTO' ? (
                        <div className="w-full rounded-xl border border-[var(--c-border)] p-3 lg:max-w-xs">
                          <div className="grid gap-2">
                            <label className="sol-filter-field">
                              <span className="sol-filter-label">Data fechamento</span>
                              <input
                                className="input w-full"
                                type="date"
                                value={fecharForm[sessao.id]?.data_fechamento || today()}
                                onChange={(e) => setFecharForm((current) => ({
                                  ...current,
                                  [sessao.id]: { ...(current[sessao.id] || {}), data_fechamento: e.target.value }
                                }))}
                              />
                            </label>
                            <label className="sol-filter-field">
                              <span className="sol-filter-label">Saldo informado</span>
                              <input
                                className="input w-full"
                                inputMode="decimal"
                                value={fecharForm[sessao.id]?.saldo_informado ?? saldoSistema}
                                onChange={(e) => setFecharForm((current) => ({
                                  ...current,
                                  [sessao.id]: { ...(current[sessao.id] || {}), saldo_informado: e.target.value }
                                }))}
                              />
                            </label>
                            <button type="button" className="btn btn-primary" onClick={() => handleFechar(sessao.id)} disabled={saving}>
                              Fechar caixa
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 border-t border-[var(--c-border)] pt-5">
            <h3 className="text-base font-semibold text-[var(--c-text)]">Transferencias recentes</h3>
            {transferencias.length === 0 ? (
              <div className="app-empty-card mt-3">Nenhuma transferencia encontrada nos filtros atuais.</div>
            ) : (
              <div className="mt-3 space-y-3">
                {transferencias.map((transferencia) => (
                  <div key={transferencia.id} className="rounded-xl border border-[var(--c-border)] px-4 py-3 text-sm">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <strong className="text-[var(--c-text)]">{formatCurrency(transferencia.valor)}</strong>
                        <span className="ml-2 text-[var(--c-muted)]">{formatDate(transferencia.data_transferencia)}</span>
                        <span className={`ml-2 ${statusClass(transferencia.status)}`}>{transferencia.status}</span>
                        <div className="mt-1 text-[var(--c-muted)]">
                          {contaLabel(transferencia.contaOrigem)} para {contaLabel(transferencia.contaDestino)}
                        </div>
                        {transferencia.descricao ? (
                          <div className="mt-1 text-[var(--c-muted)]">{transferencia.descricao}</div>
                        ) : null}
                      </div>
                      {transferencia.status === 'ATIVA' && !transferencia.conciliacao_origem_id && !transferencia.conciliacao_destino_id ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleCancelarTransferencia(transferencia.id)}
                          disabled={saving}
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
