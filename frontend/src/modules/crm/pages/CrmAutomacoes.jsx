import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ativarAutomacaoCrm,
  atualizarAutomacaoCrm,
  criarAutomacaoCrm,
  desativarAutomacaoCrm,
  executarCicloAutomacoesCrm,
  listarExecucoesAutomacaoCrm,
  listarAutomacoesCrm
} from '../../../services/crm';

const TRIGGERS = {
  LEAD_CREATED: 'Lead criado',
  NO_FIRST_CONTACT: 'Sem primeiro contato',
  NO_ACTIVITY: 'Sem atividade',
  STAGE_CHANGED: 'Mudanca de etapa',
  MESSAGE_RECEIVED: 'Mensagem recebida',
  LEAD_REFUSED: 'Lead recusado',
  DAILY_LIMIT_REACHED: 'Limite diario atingido',
  ROLLOUT_PHASE_CHANGED: 'Mudanca de fase do rollout'
};

const emptyForm = {
  nome: '',
  trigger_type: 'LEAD_CREATED',
  priority: 100,
  ativo: true,
  conditions_json: '{\n  "exemplo": true\n}',
  actions_json: '[\n  {\n    "type": "CREATE_TASK",\n    "title": "Executar acao comercial"\n  }\n]'
};

function fmtJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

export default function CrmAutomacoes() {
  const [items, setItems] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [filters, setFilters] = useState({ ativo: '', trigger_type: '' });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCycle, setRunningCycle] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return listarAutomacoesCrm(filters)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Erro ao carregar automacoes'))
      .finally(() => setLoading(false));
  }, [filters]);

  const loadExecutions = useCallback(() => {
    return listarExecucoesAutomacaoCrm({ limit: 20 })
      .then((data) => setExecutions(Array.isArray(data) ? data : []))
      .catch(() => setExecutions([]));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadExecutions(); }, [loadExecutions]);

  const resumo = useMemo(() => {
    const ativos = items.filter((item) => item.ativo).length;
    return { total: items.length, ativos, inativos: items.length - ativos };
  }, [items]);

  function updateForm(field) {
    return (event) => {
      const value = field === 'ativo' ? event.target.checked : event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      nome: item.nome || '',
      trigger_type: item.trigger_type || 'LEAD_CREATED',
      priority: item.priority || 100,
      ativo: Boolean(item.ativo),
      conditions_json: fmtJson(item.conditions_json, '{}'),
      actions_json: fmtJson(item.actions_json, '[]')
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        priority: Number(form.priority || 100)
      };
      if (editingId) {
        await atualizarAutomacaoCrm(editingId, payload);
      } else {
        await criarAutomacaoCrm(payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar automacao');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item) {
    try {
      if (item.ativo) {
        await desativarAutomacaoCrm(item.id);
      } else {
        await ativarAutomacaoCrm(item.id);
      }
      load();
    } catch (err) {
      setError(err.message || 'Erro ao alterar status');
    }
  }

  async function handleRunCycle() {
    setRunningCycle(true);
    setError('');
    try {
      const result = await executarCicloAutomacoesCrm();
      if (result?.ok === false) {
        setError(result.message || 'Nao foi possivel executar o ciclo de automacoes.');
        return;
      }
      await Promise.all([
        load(),
        loadExecutions()
      ]);
    } catch (err) {
      setError(err.message || 'Erro ao executar ciclo de automacoes');
    } finally {
      setRunningCycle(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Automacoes CRM</h1>
            <p className="page-subtitle">Regras cadastrais para padronizar resposta, SLA e follow-up comercial.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary text-sm" onClick={load}>Atualizar</button>
            <button type="button" className="btn btn-primary text-sm" onClick={handleRunCycle} disabled={runningCycle}>
              {runningCycle ? 'Executando...' : 'Executar ciclo'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card sol-surface-card p-5">
          <p className="text-xs text-muted">Total configurado</p>
          <p className="mt-1 text-3xl font-bold text-main">{resumo.total}</p>
        </div>
        <div className="card sol-surface-card p-5">
          <p className="text-xs text-muted">Ativas</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{resumo.ativos}</p>
        </div>
        <div className="card sol-surface-card p-5">
          <p className="text-xs text-muted">Inativas</p>
          <p className="mt-1 text-3xl font-bold text-muted">{resumo.inativos}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-4">
        <form onSubmit={handleSubmit} className="card sol-surface-card p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-main">{editingId ? 'Editar automacao' : 'Nova automacao'}</h2>
            <p className="text-xs text-muted">O runtime ja executa regras ativas por evento e por ciclo agendado; use esta tela para calibrar prioridade, condicoes e acoes.</p>
          </div>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm text-main">
              Nome
              <input className="input" value={form.nome} onChange={updateForm('nome')} placeholder="Ex: Criar tarefa apos lead novo" />
            </label>
            <label className="grid gap-1.5 text-sm text-main">
              Gatilho
              <select className="input" value={form.trigger_type} onChange={updateForm('trigger_type')}>
                {Object.entries(TRIGGERS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm text-main">
                Prioridade
                <input className="input" type="number" min="1" value={form.priority} onChange={updateForm('priority')} />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-base bg-elevated/40 px-3 py-2 text-sm text-main">
                <input type="checkbox" checked={form.ativo} onChange={updateForm('ativo')} />
                Ativa
              </label>
            </div>
            <label className="grid gap-1.5 text-sm text-main">
              Condicoes JSON
              <textarea className="input min-h-[130px] font-mono text-xs" value={form.conditions_json} onChange={updateForm('conditions_json')} />
            </label>
            <label className="grid gap-1.5 text-sm text-main">
              Acoes JSON
              <textarea className="input min-h-[150px] font-mono text-xs" value={form.actions_json} onChange={updateForm('actions_json')} />
              <span className="text-xs text-muted">
                Acoes suportadas: CREATE_TASK, CHANGE_STAGE, ADD_TAG, ASSIGN_USER, REDISTRIBUTE_LEAD, NOTIFY_MANAGER, NOTIFY_OWNER, CREATE_INTERNAL_NOTE e ARCHIVE_LEAD.
              </span>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {editingId && <button type="button" className="btn btn-secondary text-sm" onClick={resetForm}>Cancelar</button>}
            <button type="submit" className="btn btn-primary text-sm" disabled={saving}>{saving ? 'Salvando...' : 'Salvar automacao'}</button>
          </div>
        </form>

        <section className="card sol-surface-card p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-main">Regras cadastradas</h2>
              <p className="text-xs text-muted">Filtros para suporte e auditoria operacional.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="input max-w-[180px]" value={filters.ativo} onChange={(e) => setFilters((f) => ({ ...f, ativo: e.target.value }))}>
                <option value="">Todos status</option>
                <option value="true">Ativas</option>
                <option value="false">Inativas</option>
              </select>
              <select className="input max-w-[240px]" value={filters.trigger_type} onChange={(e) => setFilters((f) => ({ ...f, trigger_type: e.target.value }))}>
                <option value="">Todos gatilhos</option>
                {Object.entries(TRIGGERS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted">Carregando automacoes...</p>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base p-8 text-center text-sm text-muted">Nenhuma automacao cadastrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-[0.12em] text-muted">
                  <tr className="border-b border-base">
                    <th className="py-3 pr-4">Automacao</th>
                    <th className="py-3 pr-4">Gatilho</th>
                    <th className="py-3 pr-4">Prioridade</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-base last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-main">{item.nome}</p>
                        <p className="text-xs text-muted">Criado por {item.criadoPor?.nome || '-'}</p>
                        <p className="text-xs text-muted">Ultima execucao: {item.last_run_at ? new Date(item.last_run_at).toLocaleString('pt-BR') : '-'}</p>
                      </td>
                      <td className="py-3 pr-4 text-sub">{TRIGGERS[item.trigger_type] || item.trigger_type}</td>
                      <td className="py-3 pr-4 text-sub">{item.priority}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-elevated text-muted'}`}>
                          {item.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" className="btn btn-secondary text-xs" onClick={() => startEdit(item)}>Editar</button>
                          <button type="button" className="btn btn-secondary text-xs" onClick={() => toggleStatus(item)}>{item.ativo ? 'Desativar' : 'Ativar'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card sol-surface-card p-5 mt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-main">Execucoes recentes</h2>
            <p className="text-xs text-muted">Log operacional do runtime para homologacao e auditoria.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary text-sm"
            onClick={loadExecutions}
          >
            Atualizar log
          </button>
        </div>

        {executions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-base p-8 text-center text-sm text-muted">Nenhuma execucao registrada ate o momento.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.12em] text-muted">
                <tr className="border-b border-base">
                  <th className="py-3 pr-4">Quando</th>
                  <th className="py-3 pr-4">Regra</th>
                  <th className="py-3 pr-4">Lead</th>
                  <th className="py-3 pr-4">Trigger</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((execution) => (
                  <tr key={execution.id} className="border-b border-base last:border-0">
                    <td className="py-3 pr-4 text-sub">{execution.createdAt ? new Date(execution.createdAt).toLocaleString('pt-BR') : '-'}</td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-main">{execution.rule?.nome || `Regra #${execution.rule_id}`}</p>
                    </td>
                    <td className="py-3 pr-4 text-sub">{execution.lead?.nome || '-'}</td>
                    <td className="py-3 pr-4 text-sub">{TRIGGERS[execution.trigger_type] || execution.trigger_type}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        execution.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-700'
                          : execution.status === 'ERROR'
                            ? 'bg-red-100 text-red-700'
                            : execution.status === 'PROCESSING'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-elevated text-muted'
                      }`}>
                        {execution.status}
                      </span>
                    </td>
                    <td className="py-3 text-sub">{execution.message || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
