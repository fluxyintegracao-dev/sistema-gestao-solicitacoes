import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { canManageSstArea, canViewSstArea } from '../../../utils/acessoProduto';
import { useAuth } from '../../../contexts/AuthContext';
import { useUiVisibility } from '../../../hooks/useUiVisibility';
import { getObras } from '../../../services/obras';
import { getRhColaboradores, getRhEmpresasGrupo } from '../../../services/rhDp';
import {
  analisarDocumentoIaSst,
  aprovarAnaliseIaSst,
  atualizarSst,
  criarSst,
  getDocumentoSstUrl,
  listarSst,
  rejeitarAnaliseIaSst,
  sincronizarEventosVencimentoSst,
  uploadDocumentoSst
} from '../services/sst';
import { isSstResourceVisible, SST_RESOURCES } from '../constants/sstResources';
import { TabelaPadrao } from '../../../components/padrao';
import { getCpfCnpjError, maskCpfCnpj, onlyDigits } from '../../../utils/formatters';

function getValue(row, path) {
  return String(path).split('.').reduce((acc, key) => acc?.[key], row) ?? '';
}

// R17 — esta tela é genérica: uma rota por recurso SST, com as colunas vindo
// do catálogo (constants/sstResources) como caminhos de campo. O papel de
// cada coluna é derivado AQUI, no ponto de uso, para que nenhuma coluna
// chegue à tabela sem `tipo` (a medida e o alinhamento saem dele).
const REGRAS_TIPO_COLUNA = [
  [/(^|\.)(createdAt|updatedAt|calculado_em|sampled_at|expires_at|last_hit_at|entrega_em)$/i, 'data'],
  [/(data|validade|vigencia)/i, 'data'],
  [/(^|\.)(status|ativo|apto|resultado|cat_emitida)$/i, 'status'],
  [/(severidade|criticidade|gravidade|prioridade|nivel|confianca)/i, 'badge'],
  [/(^|\.)(codigo|protocolo|recibo|ca|crm|cache_key|entidade_id|workflow_id)$/i, 'codigo'],
  [/(_ms$|_count$|_jobs$|attempts|score|peso|percentual|ordem|valor|intensidade)/i, 'numero']
];

// A coluna que NOMEIA o registro do recurso (R17). Recursos de log e
// telemetria (createdAt/acao/status/mensagem) não têm nenhuma — nesse caso a
// tabela declara `semIdentidade`.
const PADRAO_IDENTIDADE = /(^|\.)(nome|titulo|razao_social|nome_exame|epi_nome|responsavel|medico_responsavel|job_type|queue_name|metric_name|cache_key|automacao|integracao)$/i;

function tipoDaColuna(caminho) {
  const regra = REGRAS_TIPO_COLUNA.find(([padrao]) => padrao.test(caminho));
  return regra ? regra[1] : 'texto';
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
  const [refs, setRefs] = useState({ empresas: [], obras: [], colaboradores: [], ambientes: [], riscos: [], agentes: [], asos: [], ltcats: [] });
  const [filters, setFilters] = useState({ empresa_id: '', obra_id: '', colaborador_id: '', status: '', search: '' });
  const [syncingEvents, setSyncingEvents] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [rowActionId, setRowActionId] = useState('');

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
      listarSst('aso', { limit: 200 }),
      listarSst('ltcat', { limit: 200 })
    ]).then(([empresasResult, obrasResult, colaboradoresResult, ambientesResult, riscosResult, agentesResult, asosResult, ltcatsResult]) => {
      if (!active) return;
      setRefs({
        empresas: empresasResult.status === 'fulfilled' && Array.isArray(empresasResult.value) ? empresasResult.value : [],
        obras: obrasResult.status === 'fulfilled' && Array.isArray(obrasResult.value) ? obrasResult.value : [],
        colaboradores: colaboradoresResult.status === 'fulfilled' && Array.isArray(colaboradoresResult.value) ? colaboradoresResult.value : [],
        ambientes: ambientesResult.status === 'fulfilled' ? (ambientesResult.value.rows || []) : [],
        riscos: riscosResult.status === 'fulfilled' ? (riscosResult.value.rows || []) : [],
        agentes: agentesResult.status === 'fulfilled' ? (agentesResult.value.rows || []) : [],
        asos: asosResult.status === 'fulfilled' ? (asosResult.value.rows || []) : [],
        ltcats: ltcatsResult.status === 'fulfilled' ? (ltcatsResult.value.rows || []) : []
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const columns = useMemo(() => config.columns || [], [config.columns]);
  const indiceIdentidade = useMemo(
    () => columns.findIndex((coluna) => PADRAO_IDENTIDADE.test(coluna)),
    [columns]
  );
  const colunasTabela = useMemo(() => columns.map((coluna, indice) => ({
    id: coluna,
    titulo: coluna,
    tipo: indice === indiceIdentidade ? 'identidade' : tipoDaColuna(coluna),
    noCard: indice === indiceIdentidade ? 'titulo' : undefined,
    render: (row) => String(getValue(row, coluna) || '-')
  })), [columns, indiceIdentidade]);

  if (!isSstResourceVisible(resource)) {
    return <Navigate to="/sst" replace />;
  }

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
    const cpfErro = getCpfCnpjError(form.responsavel_tecnico_cpf, {
      type: 'cpf',
      label: 'CPF do responsavel tecnico'
    });
    if (cpfErro) {
      setError(cpfErro);
      return;
    }
    const payload = form.responsavel_tecnico_cpf
      ? { ...form, responsavel_tecnico_cpf: onlyDigits(form.responsavel_tecnico_cpf) }
      : form;
    setSaving(true);
    try {
      if (resource === 'documentos' && file && !editing) {
        await uploadDocumentoSst(payload, file);
      } else if (editing) {
        await atualizarSst(resource, editing.id, payload);
      } else {
        await criarSst(resource, payload);
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

  const analyzeDocument = async (row) => {
    setRowActionId(`ia-${row.id}`);
    try {
      const payload = await analisarDocumentoIaSst(row.id);
      setSyncMessage(`Analise IA: ${payload.status || 'registrada'}.`);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao analisar documento com IA');
    } finally {
      setRowActionId('');
    }
  };

  const approveIa = async (row) => {
    setRowActionId(`aprovar-${row.id}`);
    try {
      const payload = await aprovarAnaliseIaSst(row.id);
      setSyncMessage(`Sugestao IA: ${payload.status || 'aprovada'}.`);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao aprovar sugestao IA');
    } finally {
      setRowActionId('');
    }
  };

  const rejectIa = async (row) => {
    setRowActionId(`rejeitar-${row.id}`);
    try {
      const payload = await rejeitarAnaliseIaSst(row.id);
      setSyncMessage(`Sugestao IA: ${payload.status || 'rejeitada'}.`);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao rejeitar sugestao IA');
    } finally {
      setRowActionId('');
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
                    inputMode={field.key === 'responsavel_tecnico_cpf' ? 'numeric' : undefined}
                    maxLength={field.key === 'responsavel_tecnico_cpf' ? 14 : undefined}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      [field.key]: field.key === 'responsavel_tecnico_cpf'
                        ? maskCpfCnpj(event.target.value)
                        : event.target.value
                    }))}
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
          <div className="p-2">
            <TabelaPadrao
              colunas={colunasTabela}
              itens={rows}
              carregando={loading}
              vazio="Nenhum registro encontrado."
              storageKey={`tabela:sst-crud:${resource}`}
              rotuloRolagem={config.title}
              larguraAcoes={280}
              // Recursos de log/telemetria (createdAt, acao, status, mensagem)
              // não têm coluna que nomeie o registro — a ausência é declarada.
              {...(indiceIdentidade < 0 ? { semIdentidade: true } : null)}
              acoesLinha={(row) => (
                <>
                  {resource === 'documentos' && row.arquivo_url ? (
                    <button type="button" onClick={() => openDocument(row)} className="mr-3 text-sm font-semibold text-sky-700">Abrir</button>
                  ) : null}
                  {resource === 'documentos' && canManage ? (
                    <button
                      type="button"
                      onClick={() => analyzeDocument(row)}
                      disabled={rowActionId === `ia-${row.id}`}
                      className="mr-3 text-sm font-semibold text-indigo-700 disabled:opacity-60"
                    >
                      {rowActionId === `ia-${row.id}` ? 'Analisando...' : 'Analisar IA'}
                    </button>
                  ) : null}
                  {resource === 'documentos_ia' && canManage ? (
                    <>
                      <button
                        type="button"
                        onClick={() => approveIa(row)}
                        disabled={rowActionId === `aprovar-${row.id}`}
                        className="mr-3 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectIa(row)}
                        disabled={rowActionId === `rejeitar-${row.id}`}
                        className="mr-3 text-sm font-semibold text-rose-700 disabled:opacity-60"
                      >
                        Rejeitar
                      </button>
                    </>
                  ) : null}
                  {canManage ? (
                    <button type="button" onClick={() => startEdit(row)} className="text-sm font-semibold text-[var(--c-text)]">Editar</button>
                  ) : null}
                </>
              )}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
