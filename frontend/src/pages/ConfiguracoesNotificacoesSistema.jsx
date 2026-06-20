import { useEffect, useMemo, useState } from 'react';
import {
  getNotificacoesSistema,
  salvarNotificacoesSistema
} from '../services/configuracoesSistema';

const TODOS = 'TODOS';

export default function ConfiguracoesNotificacoesSistema() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');
  const [moduloAtivo, setModuloAtivo] = useState(TODOS);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getNotificacoesSistema();
        if (!active) return;
        setGrupos(Array.isArray(data?.grupos) ? data.grupos : []);
      } catch (error) {
        console.error(error);
        if (active) {
          alert(error.message || 'Erro ao carregar notificacoes do sistema');
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

  const resumo = useMemo(() => {
    const eventos = grupos.flatMap((grupo) => grupo.eventos || []);
    return {
      total: eventos.length,
      ativos: eventos.filter((evento) => evento.ativo !== false).length
    };
  }, [grupos]);

  const modulos = useMemo(
    () => [
      { key: TODOS, label: 'Todos' },
      ...grupos.map((grupo) => ({
        key: grupo.modulo,
        label: grupo.modulo_label || grupo.modulo
      }))
    ],
    [grupos]
  );

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return grupos
      .filter((grupo) => moduloAtivo === TODOS || grupo.modulo === moduloAtivo)
      .map((grupo) => {
        const eventos = (grupo.eventos || []).filter((evento) => {
          if (!termo) return true;
          return [
            evento.chave,
            evento.nome,
            evento.descricao,
            grupo.modulo_label,
            grupo.modulo
          ].some((valor) => String(valor || '').toLowerCase().includes(termo));
        });
        return { ...grupo, eventos };
      })
      .filter((grupo) => grupo.eventos.length > 0);
  }, [busca, grupos, moduloAtivo]);

  function atualizarEvento(chave, ativo) {
    setGrupos((current) =>
      current.map((grupo) => ({
        ...grupo,
        eventos: (grupo.eventos || []).map((evento) =>
          evento.chave === chave ? { ...evento, ativo } : evento
        )
      }))
    );
  }

  function marcarGrupo(modulo, ativo) {
    setGrupos((current) =>
      current.map((grupo) =>
        grupo.modulo === modulo
          ? {
              ...grupo,
              eventos: (grupo.eventos || []).map((evento) => ({ ...evento, ativo }))
            }
          : grupo
      )
    );
  }

  async function handleSalvar() {
    try {
      setSaving(true);
      const eventos = {};
      for (const grupo of grupos) {
        for (const evento of grupo.eventos || []) {
          eventos[evento.chave] = { ativo: evento.ativo !== false };
        }
      }
      const data = await salvarNotificacoesSistema({ eventos });
      setGrupos(Array.isArray(data?.grupos) ? data.grupos : grupos);
      alert('Notificacoes do sistema atualizadas com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar notificacoes do sistema');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page solicitacoes-page">
        <div className="sol-surface-card rounded-2xl p-6 text-sm text-[var(--c-muted)]">
          Carregando notificacoes do sistema...
        </div>
      </div>
    );
  }

  return (
    <div className="page solicitacoes-page space-y-5 md:space-y-6">
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Notificacoes do Sistema</h1>
            <p className="page-subtitle">
              Defina quais eventos podem gerar avisos no sino. A regra vale para todos os usuarios da instalacao.
            </p>
          </div>
          <div className="app-page-actions">
            <span className="inline-flex items-center rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)]">
              {resumo.ativos}/{resumo.total} ativos
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSalvar}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar notificacoes'}
            </button>
          </div>
        </div>
      </header>

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/90 p-4 text-sm text-sky-900">
          <h2 className="text-base font-semibold">Controle operacional dos avisos</h2>
          <p className="mt-1 text-sm text-sky-800">
            Desativar um evento impede novas notificacoes desse tipo. Notificacoes antigas continuam registradas para
            auditoria e rastreabilidade.
          </p>
        </div>
      </section>

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--c-text)]">Buscar evento</span>
            <input
              className="input"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Digite modulo, evento ou descricao"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {modulos.map((modulo) => (
              <button
                key={modulo.key}
                type="button"
                className={`btn ${moduloAtivo === modulo.key ? 'btn-primary' : 'btn-outline'} px-3 py-2 text-sm`}
                onClick={() => setModuloAtivo(modulo.key)}
              >
                {modulo.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {gruposFiltrados.length === 0 ? (
          <div className="sol-surface-card rounded-2xl p-6 text-sm text-[var(--c-muted)]">
            Nenhum evento encontrado para os filtros informados.
          </div>
        ) : null}

        {gruposFiltrados.map((grupo) => {
          const ativosGrupo = (grupo.eventos || []).filter((evento) => evento.ativo !== false).length;
          const totalGrupo = (grupo.eventos || []).length;

          return (
            <article key={grupo.modulo} className="sol-surface-card rounded-2xl p-4 md:p-5">
              <div className="flex flex-col gap-3 border-b border-[var(--c-border)] pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
                    {grupo.modulo}
                  </p>
                  <h2 className="text-lg font-semibold text-[var(--c-text)]">{grupo.modulo_label || grupo.modulo}</h2>
                  <p className="text-sm text-[var(--c-muted)]">{ativosGrupo}/{totalGrupo} evento(s) ativo(s)</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-outline px-3 py-2 text-sm"
                    onClick={() => marcarGrupo(grupo.modulo, true)}
                  >
                    Ativar todos
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline px-3 py-2 text-sm"
                    onClick={() => marcarGrupo(grupo.modulo, false)}
                  >
                    Desativar todos
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(grupo.eventos || []).map((evento) => (
                  <label
                    key={evento.chave}
                    className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--c-text)]">{evento.nome}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">
                        {evento.chave}
                      </div>
                      <p className="mt-2 text-sm text-[var(--c-muted)]">{evento.descricao}</p>
                    </div>
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0"
                      checked={evento.ativo !== false}
                      onChange={(event) => atualizarEvento(evento.chave, event.target.checked)}
                    />
                  </label>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
