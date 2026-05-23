import { useEffect, useMemo, useState } from 'react';
import {
  getVisibilidadeUi,
  salvarVisibilidadeUi
} from '../services/configuracoesSistema';
import { resetUiVisibilityCache } from '../hooks/useUiVisibility';

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function typeLabel(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'table') return 'Tabela';
  if (normalized === 'dashboard') return 'Dashboard';
  return 'Card';
}

function ComponentToggle({ component, checked, onChange }) {
  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-lg border px-3 py-3 transition-colors ${
        checked
          ? 'border-emerald-200 bg-emerald-50/70'
          : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--c-text)]">{component.label}</span>
        <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {typeLabel(component.type)}
        </span>
        <span className="mt-1 block font-mono text-[10px] text-slate-400">{component.key}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={onChange}
      />
    </label>
  );
}

export default function ConfiguracoesVisibilidadeUi() {
  const [registry, setRegistry] = useState([]);
  const [hidden, setHidden] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getVisibilidadeUi()
      .then((data) => {
        if (!active) return;
        setRegistry(Array.isArray(data?.registry) ? data.registry : []);
        setHidden(Array.isArray(data?.hidden) ? data.hidden.map(normalizeKey) : []);
      })
      .catch((err) => {
        alert(err?.message || 'Erro ao carregar configuracao de visibilidade');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const allKeys = useMemo(() => registry.flatMap((group) =>
    (group.pages || []).flatMap((page) =>
      (page.components || []).map((component) => normalizeKey(component.key))
    )
  ), [registry]);

  const visibleCount = allKeys.filter((key) => !hiddenSet.has(key)).length;
  const hiddenCount = allKeys.length - visibleCount;
  const filtroNormalizado = filtro.trim().toLowerCase();

  const filteredRegistry = useMemo(() => {
    if (!filtroNormalizado) return registry;

    return registry
      .map((group) => ({
        ...group,
        pages: (group.pages || [])
          .map((page) => ({
            ...page,
            components: (page.components || []).filter((component) => {
              const haystack = [
                group.label,
                group.module,
                page.label,
                page.path,
                component.label,
                component.key,
                component.type
              ].map((item) => String(item || '').toLowerCase()).join(' ');
              return haystack.includes(filtroNormalizado);
            })
          }))
          .filter((page) => page.components.length)
      }))
      .filter((group) => group.pages.length);
  }, [filtroNormalizado, registry]);

  function toggleKey(key) {
    const normalized = normalizeKey(key);
    setHidden((current) => (
      current.includes(normalized)
        ? current.filter((item) => item !== normalized)
        : [...current, normalized]
    ));
  }

  function setPageVisibility(page, visible) {
    const pageKeys = (page.components || []).map((component) => normalizeKey(component.key));
    setHidden((current) => {
      const currentSet = new Set(current);
      pageKeys.forEach((key) => {
        if (visible) currentSet.delete(key);
        else currentSet.add(key);
      });
      return Array.from(currentSet);
    });
  }

  async function salvar() {
    try {
      setSaving(true);
      const data = await salvarVisibilidadeUi({ hidden });
      setHidden(Array.isArray(data?.hidden) ? data.hidden.map(normalizeKey) : []);
      resetUiVisibilityCache();
      alert('Visibilidade salva com sucesso.');
    } catch (err) {
      alert(err?.message || 'Erro ao salvar visibilidade');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page solicitacoes-page space-y-5">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Visibilidade de Dashboards e Tabelas</h1>
            <p className="page-subtitle">
              Controle quais blocos aparecem nas telas sem alterar a permissao de acesso dos usuarios.
            </p>
          </div>
          <div className="app-page-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={salvar} disabled={saving || loading}>
              {saving ? 'Salvando...' : 'Salvar visibilidade'}
            </button>
          </div>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="app-summary-card">
          <span className="app-summary-label">Componentes mapeados</span>
          <strong className="app-summary-value">{allKeys.length}</strong>
          <span className="app-summary-subvalue">Dashboards, tabelas e cards</span>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Visiveis</span>
          <strong className="app-summary-value text-emerald-700">{visibleCount}</strong>
          <span className="app-summary-subvalue">Aparecem para usuarios autorizados</span>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Ocultos</span>
          <strong className="app-summary-value text-amber-700">{hiddenCount}</strong>
          <span className="app-summary-subvalue">Nao aparecem nas telas configuradas</span>
        </div>
      </section>

      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        <strong>Governanca:</strong> esta configuracao nao concede acesso. Primeiro o usuario precisa ter permissao de modulo/area.
        Depois disso, estes controles definem quais blocos ficam visiveis na experiencia.
      </div>

      <div className="card sol-surface-card">
        <input
          className="input input-sm w-full md:max-w-md"
          placeholder="Filtrar por modulo, pagina, tabela ou chave..."
          value={filtro}
          onChange={(event) => setFiltro(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="app-empty-card">Carregando componentes configuraveis...</div>
      ) : (
        <div className="space-y-4">
          {filteredRegistry.map((group) => (
            <section key={group.module} className="card sol-surface-card p-0">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
                  {group.module}
                </p>
                <h2 className="mt-1 text-lg font-bold text-[var(--c-text)]">{group.label}</h2>
                {group.description ? (
                  <p className="mt-1 text-sm text-[var(--c-muted)]">{group.description}</p>
                ) : null}
              </div>

              <div className="divide-y divide-[var(--c-border)]">
                {(group.pages || []).map((page) => {
                  const pageKeys = (page.components || []).map((component) => normalizeKey(component.key));
                  const visiblePageCount = pageKeys.filter((key) => !hiddenSet.has(key)).length;

                  return (
                    <div key={page.key} className="px-4 py-4">
                      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-[var(--c-text)]">{page.label}</h3>
                          <p className="font-mono text-[11px] text-[var(--c-muted)]">{page.path}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {visiblePageCount}/{pageKeys.length} visiveis
                          </span>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setPageVisibility(page, true)}>
                            Exibir pagina
                          </button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setPageVisibility(page, false)}>
                            Ocultar pagina
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {(page.components || []).map((component) => {
                          const key = normalizeKey(component.key);
                          return (
                            <ComponentToggle
                              key={component.key}
                              component={component}
                              checked={!hiddenSet.has(key)}
                              onChange={() => toggleKey(component.key)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
