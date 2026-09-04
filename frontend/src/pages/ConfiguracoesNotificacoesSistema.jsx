import { useEffect, useMemo, useState } from 'react';
import {
  getNotificacoesSistema,
  salvarNotificacoesSistema
} from '../services/configuracoesSistema';
import {
  alternarValorFiltro,
  Avisos,
  BarraFiltros,
  BlocoConteudo,
  Pagina,
  PageHeader,
  useAvisos
} from '../components/padrao';

/**
 * NOTIFICAÇÕES DO SISTEMA — reforma de 04/09.
 *
 * ## O defeito que esta tela tinha, e por que ele é o mais instrutivo
 *
 * O cabeçalho já vestia `className="app-page-header"` — a classe sticky da
 * R13 — mas a tela NÃO renderizava o `Pagina`. Quem publica a variável
 * `--pos-cabecalho-fixo` (a altura REAL da topbar, medida no DOM) é só o
 * `Pagina`; sem ele o CSS caía no literal de fallback `top: 96px`, que é a
 * origem conhecida do vão transparente registrado em 02/09 — conteúdo da
 * lista rolando por trás, visível entre a base da topbar e o topo da faixa.
 * E sem o `PageHeader` não existia compactação nenhuma, porque a
 * compactação é ESTADO do componente (ele mede a rolagem), não da classe.
 *
 * **Vestir a classe certa sem o componente que a alimenta é pior do que não
 * ter faixa, porque parece resolvido**: o `grep` acha `app-page-header`, o
 * check estático acha o sticky no CSS, e nada disso é a tela. Migrar para
 * `Pagina` + `PageHeader` fecha os dois de uma vez — a posição vem do
 * primeiro, a compactação do segundo.
 */

export default function ConfiguracoesNotificacoesSistema() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');
  /*
    R12/F2/F3: o filtro de módulo era uma fileira de botões de escolha única
    sobre um estado ESCALAR (`moduloAtivo`, com o sentinela 'TODOS'). Sem
    marcação múltipla e sem etiqueta removível, o recorte ativo só existia
    como a cor de um botão. Agora é um conjunto: vazio = todos os módulos,
    e cada valor marcado vira etiqueta removível na faixa.
  */
  const [modulosMarcados, setModulosMarcados] = useState(new Set());
  // R3/R19: as três caixas do navegador (carregar, salvar com sucesso,
  // salvar com erro) viraram avisos do sistema.
  const { avisos, avisar, fechar } = useAvisos();

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
          avisar.erro(error.message || 'Erro ao carregar notificacoes do sistema');
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
  }, [avisar]);

  const resumo = useMemo(() => {
    const eventos = grupos.flatMap((grupo) => grupo.eventos || []);
    return {
      total: eventos.length,
      ativos: eventos.filter((evento) => evento.ativo !== false).length
    };
  }, [grupos]);

  const opcoesDeModulo = useMemo(
    () => grupos.map((grupo) => ({
      valor: grupo.modulo,
      rotulo: grupo.modulo_label || grupo.modulo
    })),
    [grupos]
  );

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return grupos
      // Conjunto vazio = sem recorte. É a leitura do BarraFiltros em toda
      // tela: "Limpar tudo" devolve a lista inteira sem opção "Todos".
      .filter((grupo) => modulosMarcados.size === 0 || modulosMarcados.has(String(grupo.modulo)))
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
  }, [busca, grupos, modulosMarcados]);

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
      avisar.sucesso('Notificacoes do sistema atualizadas com sucesso.');
    } catch (error) {
      console.error(error);
      avisar.erro(error.message || 'Erro ao salvar notificacoes do sistema');
    } finally {
      setSaving(false);
    }
  }

  /*
    R5/C2: o apoio da TELA mora na faixa fixa, nas props do PageHeader. O
    `page-subtitle` solto virou `descricao`, e o "N/M ativos" — que era um
    <span> com pílula própria na barra de AÇÕES — virou a prop `contagem`,
    que rende em <strong> ancorado ao título. Contagem não é ação: estava no
    lugar de um botão, disputando espaço com o "Salvar notificações".
  */
  const cabecalho = (
    <PageHeader
      titulo="Notificacoes do Sistema"
      contagem={loading ? null : `${resumo.ativos}/${resumo.total} ativos`}
      descricao="Defina quais eventos podem gerar avisos no sino. A regra vale para todos os usuarios da instalacao."
      acaoPrincipal={{
        rotulo: saving ? 'Salvando...' : 'Salvar notificacoes',
        onClick: handleSalvar,
        desabilitada: saving || loading
      }}
    />
  );

  if (loading) {
    return (
      <Pagina>
        {cabecalho}
        <Avisos avisos={avisos} aoFechar={fechar} />
        <div className="app-empty-card">Carregando notificacoes do sistema...</div>
      </Pagina>
    );
  }

  return (
    <Pagina>
      {cabecalho}

      <Avisos avisos={avisos} aoFechar={fechar} />

      <BlocoConteudo titulo="Controle operacional dos avisos" variante="secundario">
        {/* R25: a caixa azul usava paleta crua (border-sky-200 / bg-sky-50 /
            text-sky-900), que não tem par no tema escuro nem passa pelo piso
            de contraste do ThemeContext. O tom informativo do sistema são os
            tokens --sem-info-*. */}
        <p className="rounded-xl border border-[var(--sem-info-border)] bg-[var(--sem-info-bg)] p-4 text-sm text-[var(--sem-info)]">
          Desativar um evento impede novas notificacoes desse tipo. Notificacoes antigas continuam registradas para
          auditoria e rastreabilidade.
        </p>
      </BlocoConteudo>

      <BlocoConteudo
        titulo="Eventos do sino"
        variante="primario"
        cor="var(--c-primary)"
      >
        {/* R16: a busca é do BarraFiltros. O <input className="input"> que
            existia aqui SAI no mesmo movimento — duas caixas de busca no
            mesmo contexto é o defeito que a F1 reprova. */}
        <BarraFiltros
          busca={{
            valor: busca,
            aoMudar: setBusca,
            placeholder: 'Digite modulo, evento ou descricao'
          }}
          filtros={[{
            id: 'modulo',
            rotulo: 'Módulo',
            opcoes: opcoesDeModulo
          }]}
          ativos={{ modulo: modulosMarcados }}
          aoAlternar={(dim, valor, opcoes) => setModulosMarcados(
            (atual) => alternarValorFiltro({ [dim]: atual }, dim, valor, opcoes)[dim]
          )}
          aoLimpar={() => setModulosMarcados(new Set())}
        />

        {gruposFiltrados.length === 0 ? (
          <div className="app-empty-card">
            Nenhum evento encontrado para os filtros informados.
          </div>
        ) : null}

        <div className="grid gap-4">
          {gruposFiltrados.map((grupo) => {
            const ativosGrupo = (grupo.eventos || []).filter((evento) => evento.ativo !== false).length;
            const totalGrupo = (grupo.eventos || []).length;

            return (
              <article
                key={grupo.modulo}
                className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4"
              >
                <div className="flex flex-col gap-3 border-b border-[var(--c-border)] pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
                      {grupo.modulo}
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--c-text)]">{grupo.modulo_label || grupo.modulo}</h3>
                    <p className="text-sm text-[var(--c-muted)]">{ativosGrupo}/{totalGrupo} evento(s) ativo(s)</p>
                  </div>
                  <div className="app-actionbar">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => marcarGrupo(grupo.modulo, true)}
                    >
                      Ativar todos
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
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
                      className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--c-text)]">{evento.nome}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">
                          {evento.chave}
                        </div>
                        <p className="mt-2 text-sm text-[var(--c-muted)]">{evento.descricao}</p>
                      </div>
                      {/* M2/R10: o `h-5 w-5` era medida à mão fora da escala.
                          O alvo de clique aqui é a etiqueta inteira (M1), não
                          a caixinha — então ela não precisa de dimensão
                          própria. */}
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0"
                        checked={evento.ativo !== false}
                        onChange={(event) => atualizarEvento(evento.chave, event.target.checked)}
                      />
                    </label>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </BlocoConteudo>
    </Pagina>
  );
}
