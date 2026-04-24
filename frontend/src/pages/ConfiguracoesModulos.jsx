import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getModulosSistema, salvarModulosSistema } from '../services/configuracoesSistema';
import { getModuleGovernance, MODULE_GOVERNANCE } from '../constants/moduleGovernance';

export default function ConfiguracoesModulos() {
  const { updateUser } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getModulosSistema();
        if (!active) return;
        setModules(Array.isArray(data?.modules) ? data.modules : []);
      } catch (error) {
        console.error(error);
        if (active) {
          alert(error.message || 'Erro ao carregar modulos');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const enabledCount = useMemo(
    () => modules.filter((item) => item?.enabled).length,
    [modules]
  );
  const enabledMap = useMemo(
    () => new Map(modules.map((item) => [item.key, Boolean(item.enabled)])),
    [modules]
  );

  function toggleModule(targetKey) {
    setModules((current) => current.map((item) => {
      if (item.key !== targetKey || item.locked) {
        return item;
      }

      return {
        ...item,
        enabled: !item.enabled
      };
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      const data = await salvarModulosSistema({ modules });
      const nextModules = Array.isArray(data?.modules) ? data.modules : modules;
      setModules(nextModules);
      updateUser({ modulos_habilitados: nextModules });
      alert('Modulos atualizados com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar modulos');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page solicitacoes-page">
        <p>Carregando modulos...</p>
      </div>
    );
  }

  return (
    <div className="page solicitacoes-page space-y-5 md:space-y-6">
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Modulos e planos</h1>
            <p className="page-subtitle">
              Controle quais modulos ficam disponiveis para esta instalacao sem expor essa camada ao administrador interno.
            </p>
          </div>
          <div className="app-page-actions">
            <span className="inline-flex items-center rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)]">
              Ativos: <strong className="ml-1">{enabledCount}</strong>
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar modulos'}
            </button>
          </div>
        </div>
      </header>

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/90 p-4 text-sm text-sky-900">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Matriz operacional da instalacao</h2>
              <p className="text-sm text-sky-800">
                Esta leitura evita ambiguidade comercial e operacional: desligar um modulo deve ocultar menu, rotas e
                obrigatoriedades ligadas a ele, sem quebrar o fluxo principal quando o acoplamento for opcional.
              </p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-white/80 px-3 py-2 text-xs text-sky-700">
              Instalacao single-tenant: o efeito vale para toda a base do cliente.
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {MODULE_GOVERNANCE.map((item) => {
              const active = enabledMap.get(item.key);
              return (
                <article
                  key={item.key}
                  className="rounded-2xl border border-sky-200 bg-white/85 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">{item.role}</div>
                      <h3 className="mt-1 text-base font-semibold text-[var(--c-text)]">{item.label}</h3>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {active ? 'Ativo na instalacao' : 'Desabilitado'}
                    </span>
                  </div>

                  <dl className="mt-3 space-y-2 text-sm text-[var(--c-muted)]">
                    <div>
                      <dt className="font-medium text-[var(--c-text)]">Relacao com os demais modulos</dt>
                      <dd>{item.dependency}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[var(--c-text)]">Superficies impactadas</dt>
                      <dd>{item.usedIn.join(' | ')}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[var(--c-text)]">Ao desabilitar</dt>
                      <dd>{item.disabledEffect}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => (
            <ModuleCard
              key={item.key}
              item={item}
              governance={getModuleGovernance(item.key)}
              onToggle={toggleModule}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ModuleCard({ item, governance, onToggle }) {
  return (
    <article className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--c-text)]">{item.label}</h2>
          <p className="text-sm text-[var(--c-muted)]">{item.description}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            item.enabled
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {item.enabled ? 'Ativo' : 'Desabilitado'}
        </span>
      </div>

      {governance && (
        <div className="mt-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-3 text-xs text-[var(--c-muted)]">
          <div className="font-semibold uppercase tracking-[0.12em] text-[var(--c-text)]">{governance.role}</div>
          <p className="mt-1">{governance.dependency}</p>
          <p className="mt-2">
            <strong className="text-[var(--c-text)]">Impacto operacional:</strong> {governance.disabledEffect}
          </p>
          <p className="mt-2">
            <strong className="text-[var(--c-text)]">Usado em:</strong> {governance.usedIn.join(' | ')}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--c-text)]">
            {item.locked ? 'Modulo obrigatorio' : 'Disponivel no plano'}
          </p>
          <p className="text-xs text-[var(--c-muted)]">
            {item.locked
              ? 'Este modulo faz parte do nucleo do produto e nao pode ser desativado.'
              : 'Desative para ocultar menu, rotas e operacao desse dominio na instalacao.'}
          </p>
        </div>

        <button
          type="button"
          className={`btn ${item.enabled ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => onToggle(item.key)}
          disabled={item.locked}
        >
          {item.locked ? 'Fixo' : (item.enabled ? 'Desabilitar' : 'Habilitar')}
        </button>
      </div>
    </article>
  );
}
