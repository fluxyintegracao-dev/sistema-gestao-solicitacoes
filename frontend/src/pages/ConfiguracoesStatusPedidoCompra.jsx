import { useEffect, useState } from 'react';
import {
  getStatusPedidosCompra,
  salvarStatusPedidosCompra
} from '../services/configuracoesSistema';
import {
  Avisos,
  BlocoConteudo,
  CampoForm,
  FormSecao,
  Pagina,
  PageHeader,
  TabelaPadrao,
  CelulaDupla,
  useAvisos
} from '../components/padrao';
import StatusBadge from '../components/StatusBadge';
import OverlayModal from '../components/ui/OverlayModal';

const EXEMPLOS_STATUS = [
  'ABERTO',
  'EM_ANALISE',
  'ENVIADO_FORNECEDOR',
  'NEGOCIACAO',
  'FECHADO_FORNECEDOR',
  'CANCELADO'
];

/*
  R25 — este hexadecimal NAO e estilo de tela: e DADO.

  A cor do status e um campo do registro, escolhido pelo usuario no seletor
  de cor e gravado no banco; a tela apenas a exibe. O `<input type="color">`
  so aceita o formato `#rrggbb` — token nao e valor valido para ele —, e
  trocar este valor por `var(--c-primary)` gravaria a string do token no
  banco, quebrando o dado em vez de corrigir uma cor de interface.

  Fica UMA ocorrencia, nomeada, servindo de valor inicial do status novo e
  de reserva para registro antigo salvo sem cor.
*/
const COR_PADRAO_STATUS = '#2563eb';

function criarNovoStatus() {
  return {
    codigo: '',
    nome: '',
    cor: COR_PADRAO_STATUS,
    bloqueia_edicao: false,
    ativo: true
  };
}

export default function ConfiguracoesStatusPedidoCompra() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  // null = modal de cadastro fechado. `indice` guarda a posicao do status
  // que esta sendo editado (-1 quando e um status novo).
  const [form, setForm] = useState(null);
  // R3/R19: aviso do sistema no lugar da caixa do navegador.
  const { avisos, avisar, fechar } = useAvisos();

  async function carregar() {
    try {
      setLoading(true);
      const data = await getStatusPedidosCompra();
      setStatuses(Array.isArray(data?.statuses) ? data.statuses : []);
    } catch (error) {
      console.error(error);
      avisar.erro(error.message || 'Erro ao carregar status dos pedidos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovoStatus() {
    setForm({ ...criarNovoStatus(), indice: -1 });
  }

  // O `codigo` e o identificador do status (nao muda depois de salvo), entao
  // e por ele que a linha clicada encontra a propria posicao na lista — nao
  // pela identidade do objeto, que a tabela pode ter recriado.
  function editarStatus(item) {
    const indice = statuses.findIndex((atual) => atual.codigo === item.codigo);
    setForm({ ...item, indice });
  }

  function fecharFormulario() {
    setForm(null);
  }

  function atualizarForm(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  /*
    A API e de LOTE (PATCH com a lista inteira), entao o salvamento monta a
    lista completa com o status editado no lugar — ou acrescentado no fim,
    quando e novo — e envia tudo, exatamente como a tela fazia antes. O que
    mudou foi de onde o dado vem: do modal, e nao de um formulario inteiro
    empilhado na tela (R9/R1).
  */
  async function handleSalvar(event) {
    event.preventDefault();
    // R26: a lista e o registro editado ficam FIXADOS antes do await; nada
    // e relido do estado depois dele.
    const edicao = form;
    const lista = statuses.map(({ codigo, nome, cor, bloqueia_edicao, ativo }) => ({
      codigo, nome, cor, bloqueia_edicao, ativo
    }));
    const editado = {
      codigo: edicao.codigo,
      nome: edicao.nome,
      cor: edicao.cor,
      bloqueia_edicao: edicao.bloqueia_edicao,
      ativo: edicao.ativo
    };
    const payload = {
      statuses: edicao.indice >= 0
        ? lista.map((item, idx) => (idx === edicao.indice ? editado : item))
        : [...lista, editado]
    };

    try {
      setSalvando(true);
      const response = await salvarStatusPedidosCompra(payload);
      setStatuses(Array.isArray(response?.statuses) ? response.statuses : []);
      setForm(null);
      avisar.sucesso(`Status ${editado.codigo} salvo com sucesso.`);
    } catch (error) {
      console.error(error);
      avisar.erro(error.message || 'Erro ao salvar status dos pedidos');
    } finally {
      setSalvando(false);
    }
  }

  // C1/R13/C2/R5: titulo, apoio e acao principal na FAIXA FIXA do topo —
  // antes eram h1 + <p class="page-subtitle"> soltos sobre o canvas (B5) e
  // um botao ao lado deles.
  const cabecalho = (
    <PageHeader
      titulo="Status dos Pedidos de Compra"
      contagem={loading ? null : `${statuses.length} status`}
      descricao="Status marcados com bloqueio impedem ajuste de itens e congelam a compra até nova mudança de status."
      acaoPrincipal={{ rotulo: 'Novo status', onClick: abrirNovoStatus }}
    />
  );

  if (loading) {
    return (
      <Pagina>
        {cabecalho}
        <Avisos avisos={avisos} aoFechar={fechar} />
        <div className="app-empty-card">Carregando...</div>
      </Pagina>
    );
  }

  const colunas = [
    {
      id: 'status',
      titulo: 'Status',
      tipo: 'identidade',
      noCard: 'titulo',
      render: (item) => (
        <CelulaDupla principal={item.nome || item.codigo} sub={item.nome ? item.codigo : null} />
      )
    },
    {
      id: 'cor',
      titulo: 'Cor',
      tipo: 'texto',
      flex: false,
      render: (item) => (
        <span className="flex items-center gap-2">
          {/* A cor exibida vem do DADO do registro, nao de um token de tela. */}
          <span
            aria-hidden="true"
            className="inline-block w-4 h-4"
            style={{ background: item.cor || COR_PADRAO_STATUS, borderRadius: 'var(--raio-1)' }}
          />
          <span>{item.cor || '-'}</span>
        </span>
      )
    },
    {
      id: 'bloqueio',
      titulo: 'Bloqueia edição',
      tipo: 'badge',
      render: (item) => (item.bloqueia_edicao ? 'Sim' : 'Não')
    },
    {
      id: 'situacao',
      titulo: 'Situação',
      tipo: 'status',
      render: (item) => <StatusBadge status={item.ativo ? 'Ativo' : 'Inativo'} />
    }
  ];

  // R16: UM dono para a faixa de avisos. Com o modal aberto ela vive dentro
  // dele (o erro do salvar acontece com o modal aberto e ficaria atras do
  // fundo escuro); com o modal fechado, logo abaixo do PageHeader.
  const faixaAvisos = <Avisos avisos={avisos} aoFechar={fechar} />;
  const formAtivo = form !== null;

  return (
    <Pagina>
      {cabecalho}

      {!formAtivo && faixaAvisos}

      {/* R9/R1: cadastro esporadico abre em MODAL — a tela inteira fica com
          a listagem. Antes, "Novo status" anexava mais um bloco de
          formulario embaixo dos que ja estavam abertos. */}
      {formAtivo && (
        <OverlayModal
          aberto
          rotulo={form.indice >= 0 ? 'Editar status do pedido' : 'Novo status do pedido'}
          onFechar={fecharFormulario}
        >
          <BlocoConteudo
            titulo={form.indice >= 0 ? `Editar status — ${form.nome || form.codigo}` : 'Novo status do pedido'}
            acoes={(
              <button type="button" className="btn btn-outline btn-sm" onClick={fecharFormulario}>
                Fechar
              </button>
            )}
          >
            <form className="space-y-4" onSubmit={handleSalvar}>
              {faixaAvisos}

              <FormSecao legenda="Identificação" colunas={2}>
                <CampoForm
                  label="Código"
                  obrigatorio
                  hint="Identificador do status no fluxo, em maiúsculas e sem espaços. Não muda depois de salvo."
                >
                  <input
                    className="input w-full"
                    value={form.codigo || ''}
                    onChange={(event) => atualizarForm('codigo', event.target.value.toUpperCase())}
                    disabled={form.indice >= 0}
                    placeholder="EX.: FECHADO_FORNECEDOR"
                    required
                  />
                </CampoForm>

                <CampoForm label="Nome exibido" obrigatorio>
                  <input
                    className="input w-full"
                    value={form.nome || ''}
                    onChange={(event) => atualizarForm('nome', event.target.value)}
                    placeholder="Ex.: Fechado com o fornecedor"
                    required
                  />
                </CampoForm>

                <CampoForm label="Cor" hint="Cor do status nas listas e nos filtros.">
                  <span className="flex gap-2">
                    {/* M2/R10: 48x32 vem dos degraus da escala (w-12/h-8); a
                        borda e o raio vem de token, nao de px na tela — antes
                        era h-11 w-14, medida fora da escala. */}
                    <input
                      type="color"
                      className="w-12 h-8 p-0 border"
                      style={{ borderColor: 'var(--ui-border)', borderRadius: 'var(--raio-1)' }}
                      value={form.cor || COR_PADRAO_STATUS}
                      onChange={(event) => atualizarForm('cor', event.target.value)}
                    />
                    <input
                      className="input w-full"
                      value={form.cor || ''}
                      onChange={(event) => atualizarForm('cor', event.target.value)}
                    />
                  </span>
                </CampoForm>
              </FormSecao>

              <FormSecao legenda="Comportamento" colunas={2}>
                {/* M2/R10: o alinhamento da marca com a primeira linha do
                    texto usava mt-0.5 (2px), degrau que nao existe. */}
                <label className="form-campo--linha flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(form.ativo)}
                    onChange={(event) => atualizarForm('ativo', event.target.checked)}
                  />
                  <div>
                    <div className="text-sm font-medium">Status ativo</div>
                    <div className="app-note">
                      Status inativos deixam de aparecer na troca de status e nos filtros.
                    </div>
                  </div>
                </label>

                <label className="form-campo--linha flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(form.bloqueia_edicao)}
                    onChange={(event) => atualizarForm('bloqueia_edicao', event.target.checked)}
                  />
                  <div>
                    <div className="text-sm font-medium">Bloqueia edição do pedido</div>
                    <div className="app-note">
                      Use para status de fechamento, cancelamento ou qualquer etapa em que a compra não possa mais ser alterada.
                    </div>
                  </div>
                </label>
              </FormSecao>

              <div className="app-actionbar">
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar status'}
                </button>
                <button type="button" className="btn btn-outline" onClick={fecharFormulario}>
                  Cancelar
                </button>
              </div>
            </form>
          </BlocoConteudo>
        </OverlayModal>
      )}

      {/* B3: os exemplos recomendados eram um card inteiro so para hospedar
          uma linha de texto. Viraram o APOIO deste bloco — uma aparicao so,
          ancorada na listagem que eles descrevem — e o card vazio de funcao
          saiu. */}
      <BlocoConteudo
        titulo="Status cadastrados"
        descricao={`Exemplos recomendados: ${EXEMPLOS_STATUS.join(' · ')}`}
        variante="primario"
        cor="var(--c-primary)"
      >
        <TabelaPadrao
          colunas={colunas}
          itens={statuses}
          getId={(item) => item.codigo}
          storageKey="tabela:configuracoes-status-pedido-compra"
          larguraAcoes={110}
          aoClicarLinha={editarStatus}
          vazio={{
            title: 'Nenhum status cadastrado',
            message: 'Cadastre o primeiro status para montar o fluxo do pedido de compra.'
          }}
          acoesLinha={(item) => (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => editarStatus(item)}
            >
              Editar
            </button>
          )}
        />
      </BlocoConteudo>
    </Pagina>
  );
}
