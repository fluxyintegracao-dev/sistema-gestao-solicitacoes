import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { canManageSstArea, canViewSstArea } from '../../../utils/acessoProduto';
import { useAuth } from '../../../contexts/AuthContext';
import { useUiVisibility } from '../../../hooks/useUiVisibility';
import { getObras } from '../../../services/obras';
import { getRhColaboradores, getRhEmpresasGrupo } from '../../../services/rhDp';
import { atualizarSst, criarSst, getDocumentoSstUrl, listarSst, sincronizarEventosVencimentoSst, uploadDocumentoSst } from '../services/sst';
import { SST_RESOURCES } from '../constants/sstResources';

function getValue(row, path) {
  return String(path).split('.').reduce((acc, key) => acc?.[key], row) ?? '';
}

function emptyForm(fields) {
  return fields.reduce((acc, field) => {
    acc[field.key] = field.type === 'checkbox' ? false : '';
    return acc;
  }, {});
}

function optionLabel(type, item) {
  if (!item) return '';
  if (type === 'colaboradores') {
    return [item.nome, item.cpf ? `CPF ${item.cpf}` : null].filter(Boolean).join(' - ');
  }
  if (type === 'obras') {
    return [item.nome, item.codigo ? `Codigo ${item.codigo}` : null].filter(Boolean).join(' - ');
  }
  if (['ambientes', 'riscos', 'agentes', 'asos'].includes(type)) {
    return item.nome || item.tipo_exame || item.nome_exame || item.titulo || `#${item.id}`;
  }
  return item.razao_social || item.nome_fantasia || item.nome || `#${item.id}`;
}

export default function SstCrudPage() {
  const { resource } = useParams();
  const { user } = useAuth();
  const { isVisible } = useUiVisibility();
  const config = SST_RESOURCES[resource] || SST_RESOURCES.riscos;
  const canView = canViewSstArea(user, config.area);
  const canManage = canManageSstArea(user, config.area);
  const tableVisible = isVisible(`sst.${resource}.tabela`);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => emptyForm(config.fields));
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refs, setRefs] = useState({ empresas: [], obras: [], colaboradores: [], ambientes: [], riscos: [], agentes: [], asos: [] });
  const [filters, setFilters] = useState({ empresa_id: '', obra_id: '', colaborador_id: '', status: '', search: '' });
  const [syncingEvents, setSyncingEvents] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    setForm(emptyForm(config.fields));
    setEditing(null);
    setFile(null);
    setSyncMessage('');
  }, [resource, config.fields]);

  const load = () => {
    setLoading(true);
    listarSst(resource, filters)
      .then((payload) => {
        setRows(payload.rows || []);
        setError('');
      })
      .catch((err) => setError(err.message || 'Erro ao carregar SST'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!canView) return;
    load();
  }, [resource, canView]);

  const resetFilters = () => {
    const empty = { empresa_id: '', obra_id: '', colaborador_id: '', status: '', search: '' };
    setFilters(empty);
    setLoading(true);
    listarSst(resource, empty)
      .then((payload) => {
        setRows(payload.rows || []);
        setError('');
      })
      .catch((err) => setError(err.message || 'Erro ao carregar SST'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getRhEmpresasGrupo({ ativo: true }),
      getObras({ ativo: true }),
      getRhColaboradores({ status: 'ATIVO' }),
      listarSst('ambientes', { limit: 200 }),
      listarSst('riscos', { limit: 200 }),
      listarSst('agentes', { limit: 200 }),
      listarSst('aso', { limit: 200 })
    ]).then(([empresasResult, obrasResult, colaboradoresResult, ambientesResult, riscosResult, agentesResult, asosResult]) => {
      if (!active) return;
      setRefs({
        empresas: empresasResult.status === 'fulfilled' && Array.isArray(empresasResult.value) ? empresasResult.value : [],
        obras: obrasResult.status === 'fulfilled' && Array.isArray(obrasResult.value) ? obrasResult.value : [],
        colaboradores: colaboradoresResult.status === 'fulfilled' && Array.isArray(colaboradoresResult.value) ? colaboradoresResult.value : [],
        ambientes: ambientesResult.status === 'fulfilled' ? (ambientesResult.value.rows || []) : [],
        riscos: riscosResult.status === 'fulfilled' ? (riscosResult.value.rows || []) : [],
        agentes: agentesResult.status === 'fulfilled' ? (agentesResult.value.rows || []) : [],
        asos: asosResult.status === 'fulfilled' ? (asosResult.value.rows || []) : []
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const columns = useMemo(() => config.columns || [], [config.columns]);

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-800">
        Voce nao tem permissao para visualizar esta area do SST.
      </div>
    );
  }

  const startEdit = (row) => {
    const next = emptyForm(config.fields);
    config.fields.forEach((field) => {
      next[field.key] = row[field.key] ?? (field.type === 'checkbox' ? false : '');
    });
    setEditing(row);
    setForm(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm(config.fields));
    setFile(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (resource === 'documentos' && file && !editing) {
        await uploadDocumentoSst(form, file);
      } else if (editing) {
        await atualizarSst(resource, editing.id, form);
      } else {
        await criarSst(resource, form);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar registro SST');
    } finally {
      setSaving(false);
    }
  };

  const openDocument = async (row) => {
    try {
      const payload = await getDocumentoSstUrl(row.id);
      if (payload?.url) window.open(payload.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message || 'Erro ao abrir documento');
    }
  };

  const syncEvents = async () => {
    setSyncingEvents(true);
    try {
      const payload = await sincronizarEventosVencimentoSst();
      setSyncMessage(`${payload.eventos_criados || 0} evento(s) novo(s), ${payload.eventos_existentes || 0} ja existentes.`);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao sincronizar eventos SST');
    } finally {
      setSyncingEvents(false);
    }
  };

  return (
    <div className="sst-page space-y-5">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">SST</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--c-text)]">{config.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{config.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {resource === 'eventos' && canManage ? (
              <button
                type="button"
                onClick={syncEvents}
                disabled={syncingEvents}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncingEvents ? 'Sincronizando...' : 'Atualizar vencimentos'}
              </button>
            ) : null}
            <Link to="/sst" className="text-sm font-semibold text-sky-700 hover:text-sky-900">Voltar ao dashboard</Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
      ) : null}

      {syncMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{syncMessage}</div>
      ) : null}

      {canManage ? (
        <form onSubmit={submit} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">{editing ? 'Editar registro' : 'Novo registro'}</h2>
            {editing ? <button type="button" onClick={resetForm} className="text-sm font-semibold text-[var(--c-muted)] hover:text-slate-900">Cancelar edicao</button> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {config.fields.map((field) => (
              <label key={field.key} className={field.type === 'textarea' ? 'md:col-span-2 xl:col-span-3' : ''}>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea
                    value={form[field.key] || ''}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="mt-1 min-h-24 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                ) : field.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.key])}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.checked }))}
                    className="mt-3 block h-5 w-5 rounded border-slate-300 text-sky-600"
                  />
                ) : field.type === 'selectRef' ? (
                  <select
                    value={form[field.key] || ''}
                    required={field.required}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">Selecionar</option>
                    {(refs[field.ref] || []).map((item) => (
                      <option key={item.id} value={item.id}>{optionLabel(field.ref, item)}</option>
                    ))}
                  </select>
                ) : field.options ? (
                  <select
                    value={form[field.key] || ''}
                    required={field.required}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">Selecionar</option>
                    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={form[field.key] || ''}
                    required={field.required}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                )}
              </label>
            ))}
            {resource === 'documentos' && !editing ? (
              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">Arquivo</span>
                <input
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)]"
                />
              </label>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      ) : null}

      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Filtros</h2>
            <p className="text-sm text-[var(--c-muted)]">Use filtros reais para auditar registros por empresa, obra, colaborador, status ou texto.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-[var(--c-border)] px-4 py-2 text-sm font-semibold text-[var(--c-text)] transition hover:bg-[var(--c-surface-muted)]"
            >
              Limpar
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">Empresa</span>
            <select
              value={filters.empresa_id}
              onChange={(event) => setFilters((current) => ({ ...current, empresa_id: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Todas</option>
              {refs.empresas.map((item) => <option key={item.id} value={item.id}>{optionLabel('empresas', item)}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">Obra/Centro</span>
            <select
              value={filters.obra_id}
              onChange={(event) => setFilters((current) => ({ ...current, obra_id: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Todos</option>
              {refs.obras.map((item) => <option key={item.id} value={item.id}>{optionLabel('obras', item)}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">Colaborador</span>
            <select
              value={filters.colaborador_id}
              onChange={(event) => setFilters((current) => ({ ...current, colaborador_id: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Todos</option>
              {refs.colaboradores.map((item) => <option key={item.id} value={item.id}>{optionLabel('colaboradores', item)}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">Status</span>
            <input
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              placeholder="Ex.: ATIVO"
              className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">Busca</span>
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Nome, titulo, mensagem..."
              className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>
        </div>
      </section>

      {tableVisible ? (
        <section className="overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Registros</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">{loading ? 'Carregando' : `${rows.length} item(ns)`}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--c-surface-muted)] text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">
                <tr>
                  {columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}
                  <th className="px-4 py-3">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-border)]">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    {columns.map((column) => (
                      <td key={column} className="px-4 py-3 font-medium text-[var(--c-text)]">{String(getValue(row, column) || '-')}</td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3">
                      {resource === 'documentos' && row.arquivo_url ? (
                        <button type="button" onClick={() => openDocument(row)} className="mr-3 text-sm font-semibold text-sky-700">Abrir</button>
                      ) : null}
                      {canManage ? (
                        <button type="button" onClick={() => startEdit(row)} className="text-sm font-semibold text-[var(--c-text)]">Editar</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!rows.length && !loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-[var(--c-muted)]" colSpan={columns.length + 1}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

