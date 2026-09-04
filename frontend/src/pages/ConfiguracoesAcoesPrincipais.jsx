import { useEffect, useState } from 'react';
import {
  Pagina,
  PageHeader,
  BlocoConteudo,
  TabelaPadrao,
  FormSecao,
  CampoForm,
  Avisos,
  useAvisos,
  useConfirmacao
} from '../components/padrao';
import OverlayModal from '../components/ui/OverlayModal';
import { getSetores } from '../services/setores';
import {
  CATALOGO_ACOES_PRINCIPAIS,
  getAcoesPrincipais,
  criarAcaoPrincipal,
  atualizarAcaoPrincipal,
  excluirAcaoPrincipal
} from '../services/acoesPrincipais';

// =====================================================================
// AÇÃO PRINCIPAL POR SETOR — Configurações
// ---------------------------------------------------------------------
// Mapeia setor + estado (status_global) → ação em destaque no topo do
// detalhe da solicitação. Estado vazio = qualquer estado (curinga); o
// match mais específico vence. Sem mapeamento, o detalhe mantém as ações
// genéricas atuais. O catálogo referencia SOMENTE ações que a tela de
// detalhe já executa — nada de regra nova.
// =====================================================================

function formVazio() {
  return { setor: '', status_global: '', acao: '', rotulo: '' };
}

export default function ConfiguracoesAcoesPrincipais() {
  const [itens, setItens] = useState([]);
  const [setores, setSetores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  // null = modal de cadastro fechado (R9: mapeamento novo é cadastro raro,
  // então a tela inteira fica com a listagem e o formulário só existe
  // enquanto alguém está cadastrando).
  const [form, setForm] = useState(null);
  // R3/R19: erro de carga, de validação e de gravação passam pela faixa de
  // avisos do sistema — a caixa do navegador ignorava tema e tokens,
  // bloqueava a página e sumia sem deixar rastro no DOM.
  const { avisos, avisar, fechar } = useAvisos();
  const { confirmar, elementoConfirmacao } = useConfirmacao();

  async function carregar() {
    try {
      setCarregando(true);
      const [lista, listaSetores] = await Promise.all([
        getAcoesPrincipais(),
        getSetores().catch(() => [])
      ]);
      setItens(lista);
      setSetores(Array.isArray(listaSetores) ? listaSetores : []);
    } catch (error) {
      avisar.erro(error?.message || 'Erro ao carregar');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar() {
    if (!form.setor || !form.acao) {
      avisar.erro('Informe o setor e a ação.');
      return;
    }
    try {
      setSalvando(true);
      await criarAcaoPrincipal(form);
      setForm(null);
      await carregar();
    } catch (error) {
      avisar.erro(error?.message || 'Erro ao criar mapeamento');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(item) {
    try {
      await atualizarAcaoPrincipal(item.id, { ativo: !item.ativo });
      await carregar();
    } catch (error) {
      avisar.erro(error?.message || 'Erro ao atualizar');
    }
  }

  async function excluir(item) {
    // R26: o alvo já chega FIXADO como parâmetro da linha clicada e é ele
    // que a mensagem cita e que a exclusão usa — nada é relido do estado
    // depois do `await`. Isso importa porque o modal do sistema NÃO
    // bloqueia a página como o `window.confirm` bloqueava: a lista segue
    // montada e pode até recarregar enquanto a pergunta está aberta.
    const descricao = `${item.setor}${item.status_global ? ` + "${item.status_global}"` : ''}`;
    const { ok } = await confirmar({
      titulo: 'Excluir mapeamento',
      mensagem: `Excluir o mapeamento de ${descricao}? Esta ação não pode ser desfeita — para voltar a destacar essa ação será preciso cadastrar o mapeamento de novo.`,
      rotuloConfirmar: 'Excluir mapeamento',
      destrutiva: true
    });
    if (!ok) return;
    try {
      await excluirAcaoPrincipal(item.id);
      await carregar();
    } catch (error) {
      avisar.erro(error?.message || 'Erro ao excluir');
    }
  }

  const rotuloAcao = (valor) => (
    CATALOGO_ACOES_PRINCIPAIS.find((acao) => acao.valor === valor)?.rotulo || valor
  );

  // R16: UM dono para a faixa de avisos. Com o modal aberto ela vive dentro
  // dele — o erro de validação e o de gravação acontecem com o modal aberto
  // e ficariam atrás do fundo escuro, invisíveis para quem clicou.
  const faixaAvisos = <Avisos avisos={avisos} aoFechar={fechar} />;
  const formAtivo = form !== null;

  return (
    <Pagina>
      {/* C1/R13: título, contagem e apoio na faixa fixa do topo, com a ação
          principal sempre a um clique. */}
      <PageHeader
        titulo="Ação principal por setor"
        contagem={carregando ? null : `${itens.length} mapeamento(s)`}
        descricao="Define qual ação aparece em destaque no topo da solicitação para cada setor e estado. Estado em branco vale para qualquer estado; o mapeamento mais específico vence. Sem mapeamento, a tela mantém as ações genéricas — e a ação só é destacada para quem tem permissão de executá-la."
        acaoPrincipal={{ rotulo: 'Novo mapeamento', onClick: () => setForm(formVazio()) }}
      />

      {!formAtivo && faixaAvisos}

      {/* R1/R9: cadastro de uso esporádico abre em MODAL — antes era um
          painel permanente ocupando a metade de cima da tela mesmo para
          quem só veio conferir a lista. Mesmos campos, mesmo payload. */}
      {formAtivo && (
        <OverlayModal
          aberto
          rotulo="Novo mapeamento de ação principal"
          onFechar={() => setForm(null)}
        >
          <BlocoConteudo
            titulo="Novo mapeamento"
            acoes={(
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm(null)}>
                Fechar
              </button>
            )}
          >
            {faixaAvisos}

            {/* R12: estes selects são entrada de FORMULÁRIO (o dado que está
                sendo cadastrado), não filtro de lista. */}
            <FormSecao legenda="Quando destacar" colunas={2}>
              <CampoForm label="Setor" obrigatorio>
                <select
                  className="input w-full"
                  value={form.setor}
                  onChange={(event) => setForm((prev) => ({ ...prev, setor: event.target.value }))}
                >
                  <option value="">Selecione…</option>
                  {setores.map((setor) => (
                    <option key={setor.id} value={setor.codigo || setor.nome}>
                      {setor.nome}
                    </option>
                  ))}
                </select>
              </CampoForm>
              <CampoForm label="Estado (status global)" hint="Vazio = qualquer estado.">
                <input
                  className="input w-full"
                  type="text"
                  placeholder="Vazio = qualquer estado"
                  value={form.status_global}
                  onChange={(event) => setForm((prev) => ({ ...prev, status_global: event.target.value }))}
                />
              </CampoForm>
            </FormSecao>

            <FormSecao legenda="O que destacar" colunas={2}>
              <CampoForm label="Ação em destaque" obrigatorio>
                <select
                  className="input w-full"
                  value={form.acao}
                  onChange={(event) => setForm((prev) => ({ ...prev, acao: event.target.value }))}
                >
                  <option value="">Selecione…</option>
                  {CATALOGO_ACOES_PRINCIPAIS.map((acao) => (
                    <option key={acao.valor} value={acao.valor}>{acao.rotulo}</option>
                  ))}
                </select>
              </CampoForm>
              <CampoForm label="Rótulo do botão (opcional)">
                <input
                  className="input w-full"
                  type="text"
                  placeholder="Ex.: Gerar conta"
                  value={form.rotulo}
                  onChange={(event) => setForm((prev) => ({ ...prev, rotulo: event.target.value }))}
                />
              </CampoForm>
            </FormSecao>

            <div className="app-actionbar">
              <button type="button" className="btn btn-primary" onClick={adicionar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Adicionar mapeamento'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>
                Cancelar
              </button>
            </div>
          </BlocoConteudo>
        </OverlayModal>
      )}

      {/* B2: com o cadastro fora da tela sobrou UM assunto, e é ele que
          responde a pergunta da página — daí a barra de cor do primário. */}
      <BlocoConteudo
        titulo="Mapeamentos"
        variante="primario"
        cor="var(--c-primary)"
      >
        <TabelaPadrao
          colunas={[
            {
              id: 'setor',
              titulo: 'Setor',
              // R17: o setor é quem nomeia o mapeamento desta lista.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => item.setor
            },
            {
              id: 'status_global',
              titulo: 'Estado',
              tipo: 'texto',
              render: (item) => (
                item.status_global || <em className="text-[var(--c-muted)]">qualquer estado</em>
              )
            },
            {
              id: 'acao',
              titulo: 'Ação',
              tipo: 'texto',
              render: (item) => rotuloAcao(item.acao)
            },
            {
              id: 'rotulo',
              titulo: 'Rótulo',
              tipo: 'texto',
              render: (item) => item.rotulo || '-'
            },
            {
              id: 'ativo',
              titulo: 'Ativo',
              tipo: 'status',
              render: (item) => (
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(item.ativo)} onChange={() => alternarAtivo(item)} />
                  <span>{item.ativo ? 'Sim' : 'Não'}</span>
                </label>
              )
            }
          ]}
          itens={itens}
          getId={(item) => item.id}
          carregando={carregando}
          storageKey="tabela:configuracoes-acoes-principais"
          rotuloRolagem="Mapeamentos de ação principal"
          vazio="Nenhum mapeamento — o detalhe da solicitação segue com as ações genéricas."
          acoesLinha={(item) => (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => excluir(item)}>
              Excluir
            </button>
          )}
          larguraAcoes={120}
        />
      </BlocoConteudo>

      {elementoConfirmacao}
    </Pagina>
  );
}
