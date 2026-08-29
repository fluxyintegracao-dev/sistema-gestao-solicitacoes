import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowPath,
  HiOutlineArrowsRightLeft,
  HiOutlineEye,
  HiOutlineUserMinus
} from 'react-icons/hi2';
import OverlayModal from '../components/ui/OverlayModal';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { useAuth } from '../contexts/AuthContext';
import { getObras } from '../services/obras';
import {
  abrirRhSolicitacao,
  aprovarRhSolicitacao,
  cancelarRhSolicitacao,
  conferirDocumentacaoRhSolicitacao,
  getRhColaboradores,
  getRhEmpresasGrupo,
  listarRhSolicitacoes,
  reenviarRhSolicitacao,
  rejeitarRhSolicitacao
,
  getRhCargos,
  getRhApontamentos,
  anexarNaRhSolicitacao,
  getRhChecklistDoTipo} from '../services/rhDp';
import RhDpPessoalSolicitacoes from './RhDpPessoalSolicitacoes';
import RhDpJornada from './RhDpJornada';
import RhDpApuracao from './RhDpApuracao';
import { hasAnyExplicitPermissao } from '../utils/acessoProduto';
import { formatCurrencyInput, maskCpfCnpj, normalizeCurrencyTyping } from '../utils/formatters';

/**
 * A TELA CONSOLIDADA DO DP (Fase 6 do modulo DP, 26/08).
 *
 * Pedido do cliente, textual: "uma unica pagina com avisos visuais de novas solicitacoes para
 * termos agilidade tanto da parte da obra quanto da parte do DP, de preferencia que isso ocorra em
 * uma lista de colaboradores que, quando tiver alguma solicitacao para aquele colaborador, ele seja
 * posicionado primeiro na lista e ganhe destaque visual e de status".
 *
 * A ORDENACAO NAO E FEITA AQUI. `listarColaboradoresRh` ja devolve quem tem pedido em aberto
 * primeiro, com os pedidos embutidos na linha. Reordenar no navegador significaria baixar tudo para
 * so entao decidir o que mostrar em cima — e a tela que existe para dar AGILIDADE ficaria mais
 * lenta quanto mais pedidos houvesse, que e exatamente o contrario do pedido.
 *
 * OS BOTOES SEGUEM A PERMISSAO, nao o setor. Quem pode abrir ve os botoes de pedir; quem pode
 * decidir ve aprovar e devolver. Um usuario que acumule as duas ve as duas — o sistema nao presume
 * que "obra" e "DP" sejam pessoas diferentes, porque em obra pequena as vezes nao sao.
 */

const TIPOS = [
  { valor: 'ADMISSAO', rotulo: 'Admissao' },
  { valor: 'MOVIMENTACAO', rotulo: 'Movimentacao' },
  { valor: 'DEMISSAO', rotulo: 'Demissao' },
  { valor: 'PAGAMENTO_MAO_DE_OBRA', rotulo: 'Pagamento de mao de obra' },
  { valor: 'EVENTO_RECORRENTE', rotulo: 'Evento recorrente' },
  // LEGADOS: nao sao mais oferecidos, mas existem gravados e a tela precisa saber rotula-los.
  { valor: 'TROCA_OBRA', rotulo: 'Troca de obra' },
  { valor: 'ALTERACAO_SALARIAL', rotulo: 'Alteracao salarial' }
];

/**
 * OS SEIS SUBTIPOS DE MOVIMENTACAO, na ordem do item 9 do escopo.
 *
 * Decisao do cliente em 27/08: "Movimentacoes passa o botao principal, e Troca de Obra e Alteracao
 * de Salario entra na lista de movimentacoes possiveis". Por isso a coluna de acoes passou de
 * quatro icones para tres — os dois que sairam viraram opcao DENTRO deste modal.
 */
const SUBTIPOS_MOVIMENTACAO = [
  { valor: 'ATESTADO', rotulo: 'Atestado' },
  { valor: 'FERIAS', rotulo: 'Ferias' },
  { valor: 'RETORNO_AFASTAMENTO', rotulo: 'Retorno de afastamento' },
  { valor: 'ALTERACAO_SALARIAL', rotulo: 'Alteracao salarial' },
  { valor: 'ALTERACAO_CARGO', rotulo: 'Alteracao de cargo ou funcao' },
  { valor: 'TRANSFERENCIA_OBRA', rotulo: 'Transferencia de obra' }
];

/** Os cinco motivos do item 10. Aqui o motivo E o subtipo — e o que muda a papelada exigida. */
const MOTIVOS_DEMISSAO = [
  { valor: 'PEDIDO_DEMISSAO', rotulo: 'Pedido de demissao' },
  { valor: 'SEM_JUSTA_CAUSA', rotulo: 'Sem justa causa' },
  { valor: 'COM_JUSTA_CAUSA', rotulo: 'Com justa causa' },
  { valor: 'TERMINO_CONTRATO', rotulo: 'Termino de contrato' },
  { valor: 'ACORDO_PARTES', rotulo: 'Acordo entre as partes' }
];

/**
 * Os dias de afastamento, contando os DOIS extremos — igual ao servidor.
 *
 * Atestado de 10 a 12 e de TRES dias, nao dois: o dia de inicio e dia parado. A conta e repetida
 * aqui so para a tela mostrar o numero enquanto se digita; quem grava e o servidor, que recalcula.
 * Numero vindo do cliente e sugestao, nunca verdade.
 */
function diasEntre(inicio, fim) {
  if (!inicio || !fim) return null;
  const de = new Date(inicio + 'T00:00:00.000Z');
  const ate = new Date(fim + 'T00:00:00.000Z');
  if (Number.isNaN(de.getTime()) || Number.isNaN(ate.getTime())) return null;
  const dias = Math.floor((ate.getTime() - de.getTime()) / 86400000) + 1;
  return dias > 0 ? dias : null;
}

const ROTULO_SUBTIPO = [...SUBTIPOS_MOVIMENTACAO, ...MOTIVOS_DEMISSAO]
  .reduce((acc, s) => ({ ...acc, [s.valor]: s.rotulo }), {});

/**
 * AS ACOES DA LINHA SAO ICONES, NAO BOTOES DE TEXTO.
 *
 * Cinco botoes escritos por linha ocupavam 400px de coluna e ainda quebravam em duas fileiras — a
 * tabela virava uma escada e o nome do colaborador, que e o que se procura, competia com eles.
 *
 * Cada icone leva `title` E `aria-label`: o primeiro da a dica ao passar o mouse, o segundo e o que
 * o leitor de tela anuncia. Icone sem nome acessivel e um botao mudo.
 */
/**
 * A ACAO DE OBRA TROCA DE NOME conforme o colaborador tenha ou nao lotacao.
 *
 * 136 dos 137 colaboradores da base estao SEM OBRA. Para eles, "Trocar de obra" e a palavra errada:
 * nao ha troca, ha a primeira lotacao. Oferecer "trocar" a quem nunca esteve em obra nenhuma faz a
 * pessoa procurar uma acao de "vincular" que nao existe — e desistir.
 *
 * O FLUXO E O MESMO (tipo TROCA_OBRA, mesma aprovacao, mesmo vinculo com vigencia). O que muda e o
 * rotulo e o icone. Criar um tipo de pedido separado so para isso duplicaria a regra de vigencia,
 * que e onde mora a aritmetica dificil.
 */
/**
 * O ROTULO DA OBRA MUDOU DE LUGAR, mas nao morreu (27/08).
 *
 * Ele era um icone proprio na coluna; com a decisao do cliente, transferencia de obra virou opcao
 * DENTRO de Movimentacoes. O que nao podia se perder e a razao de o rotulo variar:
 *
 * 136 dos 137 colaboradores da base estao SEM OBRA. Para eles, "transferencia" e a palavra errada —
 * nao ha transferencia, ha a primeira lotacao. Quem nunca esteve em obra nenhuma procura uma acao
 * de "vincular", nao acha, e desiste.
 *
 * O FLUXO E O MESMO (subtipo TRANSFERENCIA_OBRA, mesma aprovacao, mesmo vinculo com vigencia). Só
 * o texto muda, e agora ele muda na lista de subtipos do modal.
 */
function rotuloDaTransferencia(origem) {
  // `primeiraLotacao` vem do formulario e ja sabe se o colaborador tinha obra. Ler `obra_id` aqui
  // seria ler a obra do PEDIDO, que o usuario acabou de escolher — e ai todo mundo veria
  // "Transferencia", inclusive os 136 que nunca estiveram em obra nenhuma.
  return origem?.primeiraLotacao ? 'Vincular a uma obra' : 'Transferencia de obra';
}

/** Os subtipos como a tela deve mostra-los para ESTE colaborador. */
function subtiposParaColaborador(colaborador) {
  return SUBTIPOS_MOVIMENTACAO.map((subtipo) => (
    subtipo.valor === 'TRANSFERENCIA_OBRA'
      ? { ...subtipo, rotulo: rotuloDaTransferencia(colaborador) }
      : subtipo
  ));
}

/**
 * TRES ICONES, e nao mais quatro (27/08).
 *
 * `Movimentacoes` virou o botao principal e absorveu "Trocar de obra" e "Alterar salario", que eram
 * icones proprios. A coluna ficou mais curta e a escolha do que se quer fazer passou para dentro do
 * modal, onde ha espaco para explicar cada opcao — na coluna, um icone so cabia o desenho.
 */
const ACOES_DA_LINHA = [
  { tipo: 'MOVIMENTACAO', rotulo: 'Movimentacoes', Icone: HiOutlineArrowsRightLeft },
  { tipo: 'DEMISSAO', rotulo: 'Demitir', Icone: HiOutlineUserMinus },
  { tipo: 'EVENTO_RECORRENTE', rotulo: 'Evento recorrente', Icone: HiOutlineArrowPath }
];

const ROTULO_TIPO = TIPOS.reduce((acc, t) => ({ ...acc, [t.valor]: t.rotulo }), {});

/** O titulo do modal acompanha o rotulo do icone que o abriu. */
function ehFutura(data) {
  if (!data) return false;
  return String(data).slice(0, 10) > new Date().toISOString().slice(0, 10);
}

/** Admissao futura sugere a data da admissao; o resto sugere hoje. */
function sugestaoDeVigencia(colaborador) {
  if (ehFutura(colaborador?.data_admissao)) return String(colaborador.data_admissao).slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function tituloDoFormulario(formulario) {
  // Cobre os dois: `TROCA_OBRA` e o tipo antigo, `MOVIMENTACAO/TRANSFERENCIA_OBRA` e o novo.
  const ehTransferencia = formulario.tipo === 'TROCA_OBRA'
    || (formulario.tipo === 'MOVIMENTACAO' && formulario.subtipo === 'TRANSFERENCIA_OBRA');
  if (ehTransferencia && formulario.primeiraLotacao) return 'Vincular a uma obra';
  return ROTULO_TIPO[formulario.tipo] || formulario.tipo;
}

function chipDoTipo(tipo) {
  if (tipo === 'ALTERACAO_SALARIAL') return 'rh-chip rh-chip--diretoria';
  if (tipo === 'EVENTO_RECORRENTE') return 'rh-chip rh-chip--evento';
  return 'rh-chip rh-chip--pedido';
}

/**
 * LARGURAS DAS COLUNAS.
 *
 * `ResizableTable` so distribui largura quando recebe `columns`, e cada `ResizableTh` precisa do
 * `columnKey` correspondente. Sem isso as colunas colapsam para o minimo e o cabecalho aparece
 * como "C...", "O...", "V..." — foi o que aconteceu na primeira versao desta tela.
 *
 * `acoes` e larga (400) porque a linha tem CINCO botoes. Com largura de coluna comum, eles quebram
 * um caractere por linha e a tabela vira uma coluna de letras empilhadas.
 */
const COLUNAS_COLABORADORES = [
  { key: 'colaborador', width: 230, minWidth: 170 },
  { key: 'obra', width: 190, minWidth: 140 },
  { key: 'vinculo', width: 110, minWidth: 90 },
  { key: 'salario', width: 130, minWidth: 110 },
  { key: 'situacao', width: 120, minWidth: 100 },
  { key: 'solicitacao', width: 190, minWidth: 150 },
  { key: 'acoes', width: 215, minWidth: 200 }
];

function formularioVazio(tipo) {
  return {
    tipo,
    // Em MOVIMENTACAO e o evento; em DEMISSAO e o MOTIVO. Nasce vazio de proposito: e a primeira
    // escolha do usuario, e e ela que decide quais campos o modal mostra.
    subtipo: '',
    colaborador_id: '',
    obra_id: '',
    justificativa: '',
    // MOVIMENTACAO (afastamentos e alteracao de cargo)
    data_inicial: '',
    data_final: '',
    novo_cargo_id: '',
    // DEMISSAO (item 10)
    solicitado_por: '',
    ultimo_dia_trabalhado: '',
    valor_acordado: '',
    justificativa_acordo: '',
    apontamentos: [],
    // Uma linha por arquivo: cada uma leva o SEU tipo de documento. Um `<input multiple>` puro
    // deixaria os arquivos sem tipo, e todos com o mesmo tipo seria pior — a certidao do dependente
    // e o comprovante de escolaridade viriam etiquetados igual.
    anexos: [],
    // Item 8 do escopo: cargo pelo catalogo e carga horaria.
    cargo_id: '',
    carga_horaria_semanal: '',
    telefone: '', email: '', nome_pai: '', nome_mae: '',
    endereco: '', numero: '', complemento: '', bairro: '', municipio: '', estado: '', cep: '',
    banco: '', agencia: '', conta: '', conta_tipo: '', pix_chave_tipo: '', pix_chave: '',
    // ADMISSAO
    nome: '',
    cpf: '',
    empresa_grupo_id: '',
    cargo: '',
    tipo_vinculo: 'CLT',
    data_admissao: '',
    salario_base: '',
    // TROCA_OBRA
    obra_destino_id: '',
    data_vigencia: '',
    // DEMISSAO
    tem_aviso_previo: false,
    tipo_aviso_previo: 'TRABALHADO',
    data_desligamento: '',
    // EVENTO_RECORRENTE
    codigo: 'VALE_ALIMENTACAO',
    natureza: 'CREDITO',
    valor: '',
    competencia_inicio: '',
    parcelas_total: '',
    // ALTERACAO_SALARIAL
    novo_salario: '',
    motivo: ''
  };
}

export default function RhDpPessoal() {
  const { user } = useAuth();

  const [colaboradores, setColaboradores] = useState([]);
  const [obras, setObras] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  // O catalogo de cargos (Fase 7). Carregado sob demanda, e nao junto da lista principal: e usado
  // so na alteracao de cargo, e buscar sempre faria uma consulta que quase ninguem aproveita.
  const [cargos, setCargos] = useState([]);
  /**
   * O checklist do TIPO escolhido — usado para tipar cada arquivo que a obra anexa.
   *
   * Arquivo sem tipo entra como anexo AVULSO: nao conta para o checklist e nao vai para a pasta do
   * colaborador (regra da Fase 3). Por isso o campo de tipo nao e opcional na linha de anexo.
   */
  const [checklistDoTipo, setChecklistDoTipo] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  /**
   * DUAS ABAS, e a de solicitacoes vem PRIMEIRO de proposito.
   *
   * O cliente pediu "avisos visuais de novas solicitacoes para termos agilidade tanto da parte da
   * obra quanto da parte do DP". Quem abre esta tela abre para resolver o que esta parado — a lista
   * de colaboradores e consulta, e consulta pode esperar um clique.
   */
  const [abaAtiva, setAbaAtiva] = useState('solicitacoes');

  const [filtroObra, setFiltroObra] = useState('');
  const [busca, setBusca] = useState('');

  const [formulario, setFormulario] = useState(null);
  const [conferencia, setConferencia] = useState(null);
  const [pedidosDoColaborador, setPedidosDoColaborador] = useState({ id: null, lista: [] });

  /**
   * `hasAnyExplicitPermissao`, e NAO `hasPermissao`.
   *
   * A diferenca decide se a tela mente. `hasPermissao` devolve `true` quando o usuario nao tem
   * configuracao nenhuma — uma compatibilidade que faz sentido para telas antigas, mas nao aqui: o
   * backend destas rotas usa `userHasStrictAreaPermission`, que NAO trata "nao configurado" como
   * liberado. Com o helper permissivo, a tela ofereceria "Aprovar" a quem o servidor vai recusar,
   * e a pessoa descobriria isso clicando.
   *
   * A permissao tambem se le de `areas_permissoes` (ARRAY), nao de um objeto indexado — a primeira
   * versao desta tela lia `permissoes_areas[chave]`, que e sempre `undefined` e teria escondido
   * todos os botoes de todo mundo, em silencio.
   */
  const podeAbrir = hasAnyExplicitPermissao(user, ['rh_dp.solicitacoes.abrir']);
  const podeDecidir = hasAnyExplicitPermissao(user, ['rh_dp.solicitacoes.decidir']);
  const podeAprovarSalario = hasAnyExplicitPermissao(user, ['rh_dp.salario.aprovar']);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [lista, listaObras] = await Promise.all([
        getRhColaboradores({ obra_id: filtroObra || undefined, q: busca || undefined }),
        obras.length ? Promise.resolve(obras) : getObras()
      ]);
      setColaboradores(Array.isArray(lista) ? lista : []);
      if (!obras.length) setObras(Array.isArray(listaObras) ? listaObras : []);
    } catch (error) {
      setErro(error.message || 'Nao foi possivel carregar a lista de pessoal.');
    } finally {
      setCarregando(false);
    }
  }, [filtroObra, busca, obras, empresas]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroObra]);

  const pendentes = useMemo(
    () => colaboradores.filter((c) => c.tem_solicitacao_aberta),
    [colaboradores]
  );

  const alertas = useMemo(() => {
    const contagem = {};
    pendentes.forEach((colaborador) => {
      (colaborador.solicitacoes_abertas || []).forEach((pedido) => {
        contagem[pedido.tipo] = (contagem[pedido.tipo] || 0) + 1;
      });
    });
    return contagem;
  }, [pendentes]);

  async function abrirPedido(evento) {
    evento.preventDefault();
    setErro('');
    setAviso('');

    const f = formulario;
    const dados = {};

    if (f.tipo === 'ADMISSAO') {
      Object.assign(dados, {
        nome: f.nome,
        cpf: f.cpf.replace(/\D/g, ''),
        obra_id: Number(f.obra_id) || undefined,
        empresa_grupo_id: Number(f.empresa_grupo_id) || undefined,
        cargo: f.cargo || undefined,
        cargo_id: Number(f.cargo_id) || undefined,
        carga_horaria_semanal: f.carga_horaria_semanal ? Number(f.carga_horaria_semanal) : undefined,
        // Os campos do item 8 viajam em bloco: escrever um por um aqui daria 17 linhas iguais e
        // uma chance de esquecer uma — que so apareceria como campo silenciosamente vazio na ficha.
        ...Object.fromEntries(
          ['telefone', 'email', 'nome_pai', 'nome_mae', 'endereco', 'numero', 'complemento',
            'bairro', 'municipio', 'estado', 'cep', 'banco', 'agencia', 'conta', 'conta_tipo',
            'pix_chave_tipo', 'pix_chave']
            .map((chave) => [chave, f[chave] || undefined])
            .filter(([, valor]) => valor !== undefined)
        ),
        tipo_vinculo: f.tipo_vinculo,
        data_admissao: f.data_admissao || undefined,
        salario_base: normalizeCurrencyTyping(f.salario_base) || undefined
      });
    }
    if (f.tipo === 'TROCA_OBRA') {
      Object.assign(dados, {
        obra_destino_id: Number(f.obra_destino_id) || undefined,
        data_vigencia: f.data_vigencia || undefined
      });
    }
    if (f.tipo === 'MOVIMENTACAO') {
      Object.assign(dados, {
        obra_id: Number(f.obra_id) || undefined,
        data_inicial: f.data_inicial || undefined,
        data_final: f.data_final || undefined,
        obra_destino_id: Number(f.obra_destino_id) || undefined,
        data_vigencia: f.data_vigencia || undefined,
        novo_cargo_id: Number(f.novo_cargo_id) || undefined,
        novo_salario: normalizeCurrencyTyping(f.novo_salario) || undefined,
        motivo: f.motivo || undefined
      });
    }
    if (f.tipo === 'DEMISSAO') {
      Object.assign(dados, {
        tem_aviso_previo: f.tem_aviso_previo,
        tipo_aviso_previo: f.tem_aviso_previo ? f.tipo_aviso_previo : undefined,
        data_desligamento: f.data_desligamento || undefined,
        ultimo_dia_trabalhado: f.ultimo_dia_trabalhado || undefined,
        solicitado_por: f.solicitado_por || undefined,
        valor_acordado: normalizeCurrencyTyping(f.valor_acordado) || undefined,
        justificativa_acordo: f.justificativa_acordo || undefined
      });
    }
    if (f.tipo === 'EVENTO_RECORRENTE') {
      Object.assign(dados, {
        codigo: f.codigo,
        natureza: f.natureza,
        valor: normalizeCurrencyTyping(f.valor),
        competencia_inicio: f.competencia_inicio,
        parcelas_total: f.parcelas_total ? Number(f.parcelas_total) : null
      });
    }
    if (f.tipo === 'ALTERACAO_SALARIAL') {
      Object.assign(dados, {
        novo_salario: normalizeCurrencyTyping(f.novo_salario),
        data_vigencia: f.data_vigencia || undefined,
        motivo: f.motivo
      });
    }

    try {
      const criada = await abrirRhSolicitacao({
        tipo: f.tipo,
        // Em MOVIMENTACAO e o evento; em DEMISSAO e o MOTIVO. E ele que decide o checklist.
        subtipo: f.subtipo || undefined,
        colaborador_id: f.colaborador_id || undefined,
        obra_id: Number(f.obra_id) || undefined,
        justificativa: f.justificativa || undefined,
        dados
      });

      /**
       * OS ARQUIVOS SOBEM DEPOIS, e nao junto: o anexo e uma linha com FK para a solicitacao, entao
       * ela precisa existir primeiro. E por isso que o pedido nasce RASCUNHO — o rascunho e o que
       * segura o trabalho entre "gravei o pedido" e "a papelada esta toda la".
       */
      const comArquivo = (f.anexos || []).filter((a) => a.arquivo && a.documento_tipo_id);
      const falhas = comArquivo.length ? await subirAnexosDoModal(criada.id, comArquivo) : [];

      /**
       * A MENSAGEM DIZ O ESTADO REAL.
       *
       * Ela dizia "o Departamento Pessoal vai decidir" — e mentia desde que o rascunho passou a
       * existir: o DP nao ve rascunho. Quem lesse isso acharia que tinha terminado, e o pedido
       * ficaria parado sem ninguem saber.
       */
      if (falhas.length) {
        // O rascunho FICA, com o que subiu. Apagar perderia os arquivos que deram certo e o
        // formulario inteiro que a pessoa preencheu.
        setErro(
          `Rascunho #${criada.id} criado, mas ${falhas.length} arquivo(s) nao subiram: `
          + `${falhas.join(', ')}. Abra o rascunho e reenvie so esses.`
        );
      } else {
        setAviso(
          `Rascunho #${criada.id} criado${comArquivo.length ? ` com ${comArquivo.length} arquivo(s)` : ''}. `
          + 'Confira a documentacao e clique em Enviar para o Departamento Pessoal receber.'
        );
      }
      setFormulario(null);
      await carregar();
    } catch (error) {
      setErro(error.message || 'Nao foi possivel abrir a solicitacao.');
    }
  }

  async function decidir(pedido, acao) {
    setErro('');
    setAviso('');
    try {
      if (acao === 'aprovar') {
        /**
         * A CONFERENCIA DE DOCUMENTOS AVISA, NAO TRAVA.
         *
         * O ASO costuma sair depois do pedido; travar obrigaria a obra a ter tudo em maos no minuto
         * zero. Entao a tela CONFIRMA com quem decide, listando o que falta — a decisao continua
         * sendo dele, mas deixa de ser distraida.
         */
        const conferido = await conferirDocumentacaoRhSolicitacao(pedido.id);
        if (conferido?.exigeConferencia && conferido.faltando?.length) {
          const faltas = conferido.faltando.map((d) => d.nome).join(', ');
          // eslint-disable-next-line no-alert
          const seguir = window.confirm(
            `Faltam documentos obrigatorios: ${faltas}.\n\nAprovar mesmo assim?`
          );
          if (!seguir) return;
        }
        await aprovarRhSolicitacao(pedido.id);
        setAviso('Solicitacao aprovada.');
      }

      if (acao === 'devolver') {
        // eslint-disable-next-line no-alert
        const motivo = window.prompt('Por que esta sendo devolvida? Quem pediu precisa saber o que corrigir.');
        if (!motivo || !motivo.trim()) return;
        await rejeitarRhSolicitacao(pedido.id, motivo.trim());
        setAviso('Solicitacao devolvida a quem abriu.');
      }

      if (acao === 'reenviar') {
        await reenviarRhSolicitacao(pedido.id, {});
        setAviso('Solicitacao reenviada.');
      }

      if (acao === 'cancelar') {
        // eslint-disable-next-line no-alert
        const motivo = window.prompt('Motivo do cancelamento (opcional):') || '';
        await cancelarRhSolicitacao(pedido.id, motivo);
        setAviso('Solicitacao cancelada.');
      }

      await carregar();
      setPedidosDoColaborador({ id: null, lista: [] });
    } catch (error) {
      setErro(error.message || 'Nao foi possivel concluir a acao.');
    }
  }

  async function verPedidos(colaborador) {
    setErro('');
    try {
      const lista = await listarRhSolicitacoes({ colaborador_id: colaborador.id });
      setPedidosDoColaborador({ id: colaborador.id, lista: Array.isArray(lista) ? lista : [] });
    } catch (error) {
      setErro(error.message || 'Nao foi possivel carregar as solicitacoes do colaborador.');
    }
  }

  /**
   * As empresas do grupo so sao buscadas quando o formulario de ADMISSAO abre.
   *
   * Buscar junto com a lista quebrava a tela para quem nao tem `rh_dp.empresas.gerenciar`: a
   * chamada respondia 403 e o erro subia como faixa vermelha no topo, dando a impressao de que a
   * pagina inteira falhou — quando na verdade so um campo de um formulario fechado nao carregou.
   *
   * A falha aqui tambem NAO vira erro de pagina: quem nao pode ver empresas simplesmente nao
   * consegue abrir admissao, e o formulario diz isso no lugar certo.
   */
  async function carregarEmpresasSePreciso() {
    if (empresas.length) return;
    try {
      const lista = await getRhEmpresasGrupo();
      setEmpresas(Array.isArray(lista) ? lista : []);
    } catch (error) {
      setEmpresas([]);
    }
  }

  /**
   * O QUE CADA MODAL PRECISA SABER, buscado SO quando ele abre.
   *
   * Cargos so importam na movimentacao (alteracao de cargo); apontamentos, so na demissao. Buscar
   * os dois junto da lista principal faria toda abertura da tela pagar por consultas que a maioria
   * dos acessos nao usa — foi exatamente o erro que o carregamento das empresas teve, e que
   * quebrava a pagina inteira com um 403 de um campo de formulario fechado.
   *
   * Falha aqui NAO impede abrir o pedido: sem cargos o campo fica vazio e o usuario percebe na
   * hora; sem apontamentos o alerta some, e o alerta sempre foi aviso, nunca trava.
   */
  function carregarApoioDoModal(tipo, colaborador) {
    if (['MOVIMENTACAO', 'ADMISSAO'].includes(tipo) && !cargos.length) {
      getRhCargos().then((r) => setCargos(r.itens || [])).catch(() => setCargos([]));
    }
    if (tipo === 'DEMISSAO' && colaborador?.id) {
      getRhApontamentos(colaborador.id)
        .then((r) => setFormulario((atual) => (atual ? { ...atual, apontamentos: r.alertas || [] } : atual)))
        .catch(() => {});
    }
  }

  /**
   * A lista de tipos de documento daquele tipo/subtipo de pedido.
   *
   * Recarregada quando o SUBTIPO muda, porque o checklist do atestado nao e o das ferias. Falhar
   * aqui deixa o campo de tipo vazio — o usuario ve e sabe que nao da para anexar ainda; nao vira
   * erro de pagina.
   */
  async function carregarChecklist(tipo, subtipo) {
    if (!tipo) return setChecklistDoTipo([]);
    try {
      const r = await getRhChecklistDoTipo(tipo, subtipo);
      setChecklistDoTipo(Array.isArray(r?.itens) ? r.itens : []);
    } catch (error) {
      setChecklistDoTipo([]);
    }
  }

  /** Uma linha de anexo por arquivo: cada uma leva o SEU tipo. */
  function acrescentarLinhaDeAnexo() {
    setFormulario((atual) => (atual
      ? { ...atual, anexos: [...(atual.anexos || []), { documento_tipo_id: '', arquivo: null }] }
      : atual));
  }

  function alterarLinhaDeAnexo(indice, campo, valor) {
    setFormulario((atual) => {
      if (!atual) return atual;
      const anexos = [...(atual.anexos || [])];
      anexos[indice] = { ...anexos[indice], [campo]: valor };
      return { ...atual, anexos };
    });
  }

  function removerLinhaDeAnexo(indice) {
    setFormulario((atual) => (atual
      ? { ...atual, anexos: (atual.anexos || []).filter((_, i) => i !== indice) }
      : atual));
  }

  /**
   * Sobe os arquivos do modal, UM DE CADA VEZ.
   *
   * Sequencial e nao paralelo de proposito: a rota aceita um arquivo por chamada, o multer grava em
   * disco e o S3 recebe um por vez. Disparar cinco juntos multiplicaria a chance de parar no meio.
   *
   * Devolve os que FALHARAM, com nome — quem chama precisa poder dizer exatamente o que reenviar.
   */
  async function subirAnexosDoModal(solicitacaoId, anexos) {
    const falhas = [];
    for (const linha of anexos) {
      if (!linha?.arquivo || !linha?.documento_tipo_id) continue;
      try {
        // eslint-disable-next-line no-await-in-loop
        await anexarNaRhSolicitacao(
          solicitacaoId,
          { documento_tipo_id: Number(linha.documento_tipo_id) },
          linha.arquivo
        );
      } catch (error) {
        falhas.push(linha.arquivo.name || 'arquivo sem nome');
      }
    }
    return falhas;
  }

  function novoPedido(tipo, colaborador = null) {
    setConferencia(null);
    if (tipo === 'ADMISSAO') carregarEmpresasSePreciso();
    carregarApoioDoModal(tipo, colaborador);
    carregarChecklist(tipo, null);
    setFormulario({
      ...formularioVazio(tipo),
      colaborador_id: colaborador?.id || '',
      obra_id: colaborador?.obra_id || filtroObra || '',
      // O modal fala a mesma lingua do icone: "Vincular" para quem nunca teve obra, "Trocar" para
      // quem tem. Sem isto o usuario clica em "Vincular a uma obra" e abre "Troca de obra".
      // Continua valendo, agora dentro de MOVIMENTACAO: quem nunca teve obra ve "Vincular".
      primeiraLotacao: !colaborador?.obra_id,
      obra_id_colaborador: colaborador?.obra_id || null,
      nomeDoColaborador: colaborador?.nome || '',
      /**
       * ADMISSAO PROGRAMADA: a vigencia sugerida e a data de ADMISSAO, nao hoje.
       *
       * 19 dos 137 colaboradores tem admissao marcada para o futuro. Sugerir hoje para eles diria
       * que estao na obra desde hoje — quando nem foram admitidos ainda. O backend corrige isso
       * sozinho (preenche a obra no vinculo existente, mantendo a vigencia), mas o campo mostrar a
       * data certa evita a pessoa achar que errou.
       */
      data_vigencia: tipo === 'MOVIMENTACAO' ? sugestaoDeVigencia(colaborador) : '',
      admissaoFutura: tipo === 'MOVIMENTACAO' && ehFutura(colaborador?.data_admissao)
    });
  }

  return (
    <div className="page solicitacoes-page rhdp-page rh-pessoal-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">RH/DP • Pessoal</h1>
            <p className="page-subtitle">
              A obra pede, o Departamento Pessoal decide. Quem tem solicitacao em aberto aparece
              primeiro na lista.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/rh-dp" className="btn btn-outline">Voltar ao RH/DP</Link>
            <Link to="/rh-dp/colaboradores" className="btn btn-outline">Cadastro completo</Link>
          </div>
        </div>
      </div>

      {erro ? <div className="alert alert-danger">{erro}</div> : null}
      {aviso ? <div className="alert alert-success">{aviso}</div> : null}

      {/* As duas abas. A de solicitacoes carrega o numero do que esta parado, no proprio rotulo —
          e o aviso visual que o cliente pediu, no lugar onde o olho ja vai. */}
      <div className="rh-pessoal-abas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'solicitacoes'}
          className={`rh-pessoal-aba${abaAtiva === 'solicitacoes' ? ' rh-pessoal-aba--ativa' : ''}`}
          onClick={() => setAbaAtiva('solicitacoes')}
        >
          Solicitacoes
          {pendentes.length ? <span className="rh-pessoal-aba-contador">{pendentes.length}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'colaboradores'}
          className={`rh-pessoal-aba${abaAtiva === 'colaboradores' ? ' rh-pessoal-aba--ativa' : ''}`}
          onClick={() => setAbaAtiva('colaboradores')}
        >
          Colaboradores
        </button>
        {/*
          Jornada e Apuracao entram como abas, e nao como paginas separadas, porque sao o MESMO
          trabalho em sequencia: a obra pede e informa a jornada; o DP decide e apura. Obrigar a
          trocar de pagina no meio disso e o que fazia a pessoa perder o fio.

          As rotas proprias (/rh-dp/jornada e /rh-dp/apuracao) continuam existindo — o mesmo
          componente serve aos dois usos, com `comoAba` tirando so o cabecalho.
        */}
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'jornada'}
          className={`rh-pessoal-aba${abaAtiva === 'jornada' ? ' rh-pessoal-aba--ativa' : ''}`}
          onClick={() => setAbaAtiva('jornada')}
        >
          Jornada
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'apuracao'}
          className={`rh-pessoal-aba${abaAtiva === 'apuracao' ? ' rh-pessoal-aba--ativa' : ''}`}
          onClick={() => setAbaAtiva('apuracao')}
        >
          Apuracao
        </button>
      </div>

      {abaAtiva === 'solicitacoes' ? (
        <RhDpPessoalSolicitacoes
          podeAbrir={podeAbrir}
          podeDecidir={podeDecidir}
          podeAprovarSalario={podeAprovarSalario}
          aoMudar={carregar}
        />
      ) : null}

      {abaAtiva === 'colaboradores' ? (
        <>
      {/* Os avisos visuais que o cliente pediu: o que exige acao, contado por tipo. */}
      <div className="rh-pessoal-alertas">
        <div className="rh-pessoal-alerta">
          <div className="rh-pessoal-alerta-numero">{pendentes.length}</div>
          <div className="rh-pessoal-alerta-texto">
            {pendentes.length === 1 ? 'colaborador com solicitacao aberta' : 'colaboradores com solicitacao aberta'}
          </div>
        </div>
        {Object.entries(alertas).map(([tipo, quantidade]) => (
          <div className="rh-pessoal-alerta" key={tipo}>
            <div className="rh-pessoal-alerta-numero">{quantidade}</div>
            <div className="rh-pessoal-alerta-texto">{ROTULO_TIPO[tipo] || tipo}</div>
          </div>
        ))}
      </div>

      <div className="sol-surface-card solicitacoes-toolbar app-toolbar-card rounded-xl p-3 md:p-4 space-y-3">
        <div className="rh-colaboradores-filter-grid">
          <select
            className="form-control"
            value={filtroObra}
            onChange={(e) => setFiltroObra(e.target.value)}
          >
            <option value="">Todas as obras que eu enxergo</option>
            {obras.map((obra) => (
              <option key={obra.id} value={obra.id}>{obra.nome}</option>
            ))}
          </select>
          <input
            className="form-control"
            placeholder="Nome, CPF ou matricula"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') carregar(); }}
          />
        </div>
        <div className="app-page-actions">
          <button type="button" className="btn btn-outline" onClick={carregar} disabled={carregando}>
            {carregando ? 'Carregando...' : 'Atualizar'}
          </button>
          {podeAbrir ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => novoPedido('ADMISSAO')}>
                Pedir admissao
              </button>
              <Link to="/rh-dp/jornada" className="btn btn-outline">Enviar jornada</Link>
            </>
          ) : null}
        </div>
      </div>

      <div className="card sol-surface-card app-table-shell">
        <div className="app-dense-table-wrapper">
          <ResizableTable
            columns={COLUNAS_COLABORADORES}
            storageKey="rh-pessoal-colaboradores-colunas-v2"
            className="app-dense-data-table rh-pessoal-table"
          >
            <thead>
              <tr>
                <ResizableTh columnKey="colaborador">Colaborador</ResizableTh>
                <ResizableTh columnKey="obra">Obra</ResizableTh>
                <ResizableTh columnKey="vinculo">Vinculo</ResizableTh>
                <ResizableTh columnKey="salario">Salario</ResizableTh>
                <ResizableTh columnKey="situacao">Situacao</ResizableTh>
                <ResizableTh columnKey="solicitacao">Solicitacao em curso</ResizableTh>
                <ResizableTh columnKey="acoes">Acoes</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {colaboradores.length === 0 && !carregando ? (
                <tr><td colSpan={7} className="text-center">Nenhum colaborador nesta obra.</td></tr>
              ) : null}

              {colaboradores.map((colaborador) => (
                <tr
                  key={colaborador.id}
                  /* O destaque visual que o cliente pediu — a linha inteira, nao so um icone. */
                  className={colaborador.tem_solicitacao_aberta ? 'rh-pessoal-linha--pendente' : undefined}
                >
                  <td>
                    <div className="font-medium">{colaborador.nome}</div>
                    <div className="text-xs opacity-70">{colaborador.cargo || '—'}</div>
                  </td>
                  <td>{colaborador.obra?.nome || '—'}</td>
                  <td>{colaborador.tipo_vinculo}</td>
                  <td className="tabular-nums">
                    {colaborador.salario_base
                      ? formatCurrencyInput(String(colaborador.salario_base))
                      : '—'}
                  </td>
                  <td>
                    <span className={colaborador.status === 'ATIVO' ? 'rh-chip' : 'rh-chip rh-chip--saindo'}>
                      {colaborador.status}
                    </span>
                  </td>
                  <td>
                    {(colaborador.solicitacoes_abertas || []).length === 0 ? (
                      <span className="opacity-60">—</span>
                    ) : (
                      colaborador.solicitacoes_abertas.map((pedido) => (
                        <span key={pedido.id} className={chipDoTipo(pedido.tipo)}>
                          {/* Mesma logica do icone: sem obra e "vincular", nao "trocar". */}
                          {(pedido.tipo === 'TROCA_OBRA' || pedido.subtipo === 'TRANSFERENCIA_OBRA') && !colaborador.obra_id
                            ? 'Vincular a obra'
                            : ROTULO_TIPO[pedido.tipo] || pedido.tipo}
                        </span>
                      ))
                    )}
                  </td>
                  <td>
                    <div className="rh-acoes-icones">
                      <button
                        type="button"
                        className="rh-acao-icone"
                        title="Acompanhar solicitacoes deste colaborador"
                        aria-label={`Acompanhar solicitacoes de ${colaborador.nome}`}
                        onClick={() => verPedidos(colaborador)}
                      >
                        <HiOutlineEye aria-hidden="true" />
                      </button>
                      {podeAbrir ? ACOES_DA_LINHA.map(({ tipo, rotulo, Icone }) => (
                        <button
                          key={tipo}
                          type="button"
                          className="rh-acao-icone"
                          title={rotulo}
                          aria-label={`${rotulo}: ${colaborador.nome}`}
                          onClick={() => novoPedido(tipo, colaborador)}
                        >
                          <Icone aria-hidden="true" />
                        </button>
                      )) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </ResizableTable>
        </div>
      </div>

        </>
      ) : null}

      {/*
        MODAL, e nao card no fim da pagina.
        O card abria ABAIXO da tabela de 137 linhas. Quem clicava nao via nada acontecer e concluia
        que o sistema tinha ignorado o clique — a acao so aparecia depois de rolar a tela inteira.
        O modal aparece onde o olho ja esta.
      */}
      {/*
        Montadas so quando a aba esta ativa: cada uma carrega obras, empresas e a propria lista, e
        deixa-las montadas em segundo plano faria tres telas buscarem dados a cada visita.
      */}
      {abaAtiva === 'jornada' ? <RhDpJornada comoAba /> : null}
      {abaAtiva === 'apuracao' ? <RhDpApuracao comoAba /> : null}

      {pedidosDoColaborador.id ? (
        <OverlayModal
          rotulo="Solicitacoes do colaborador"
          largura="820px"
          onFechar={() => setPedidosDoColaborador({ id: null, lista: [] })}
        >
          <div className="rh-modal-conteudo space-y-3">
            <div className="app-page-header-row">
              <h2 className="text-lg font-semibold">Solicitacoes do colaborador</h2>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPedidosDoColaborador({ id: null, lista: [] })}>
                Fechar
              </button>
            </div>

          {pedidosDoColaborador.lista.length === 0 ? (
            <p className="opacity-70">Nenhuma solicitacao para este colaborador.</p>
          ) : (
            <ul className="rh-pessoal-pedidos">
              {pedidosDoColaborador.lista.map((pedido) => (
                <li key={pedido.id} className="rh-pessoal-pedido">
                  <div>
                    <span className={chipDoTipo(pedido.tipo)}>{ROTULO_TIPO[pedido.tipo] || pedido.tipo}</span>
                    <strong className="ml-2">{pedido.situacao}</strong>
                    {pedido.motivo_rejeicao ? (
                      <div className="text-sm rh-pessoal-devolucao">
                        Devolvida: {pedido.motivo_rejeicao}
                      </div>
                    ) : null}
                  </div>
                  <div className="app-page-actions">
                    {podeDecidir && pedido.situacao === 'ABERTA' ? (
                      <>
                        {/*
                          Alteracao salarial so aparece para quem tem a permissao de Diretoria. O
                          backend recusa de qualquer forma; esconder o botao evita oferecer uma acao
                          que vai falhar — mas a tranca de verdade continua sendo a do servidor.
                        */}
                        {pedido.tipo !== 'ALTERACAO_SALARIAL' || podeAprovarSalario ? (
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => decidir(pedido, 'aprovar')}>
                            Aprovar
                          </button>
                        ) : (
                          <span className="text-sm opacity-70">Aguardando a Diretoria</span>
                        )}
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => decidir(pedido, 'devolver')}>
                          Devolver
                        </button>
                      </>
                    ) : null}

                    {podeAbrir && pedido.situacao === 'REJEITADA' ? (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => decidir(pedido, 'reenviar')}>
                        Reenviar
                      </button>
                    ) : null}

                    {podeAbrir && pedido.situacao === 'ABERTA' ? (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => decidir(pedido, 'cancelar')}>
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            )}
          </div>
        </OverlayModal>
      ) : null}

      {formulario ? (
        <OverlayModal
          rotulo={tituloDoFormulario(formulario)}
          largura="880px"
          onFechar={() => setFormulario(null)}
        >
          <div className="rh-modal-conteudo space-y-3">
            <div className="app-page-header-row">
              <div>
                <h2 className="text-lg font-semibold">{tituloDoFormulario(formulario)}</h2>
                {formulario.nomeDoColaborador ? (
                  <p className="page-subtitle">{formulario.nomeDoColaborador}</p>
                ) : null}
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setFormulario(null)}>
                Fechar
              </button>
            </div>

          <form onSubmit={abrirPedido} className="space-y-3">
            {/* Os campos do item 8 vao em grades separadas — identificacao, contato, filiacao,
                endereco e banco. Vinte e dois campos numa grade unica viram um paredao, e nele
                ninguem enxerga o que ainda falta preencher. */}
            {formulario.tipo === 'ADMISSAO' ? (
              <div className="space-y-3">
              <div className="rh-colaboradores-filter-grid">
                <label className="form-field">
                  <span className="form-label form-label--required">Nome completo</span>
                  <input className="form-control" value={formulario.nome}
                    onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} required />
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">CPF</span>
                  <input className="form-control" value={formulario.cpf} inputMode="numeric"
                    onChange={(e) => setFormulario({ ...formulario, cpf: maskCpfCnpj(e.target.value) })} required />
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">Empresa do grupo</span>
                  <select className="form-control" value={formulario.empresa_grupo_id}
                    onChange={(e) => setFormulario({ ...formulario, empresa_grupo_id: e.target.value })} required>
                    {/*
                      Aqui a primeira opcao NAO e o rotulo: quando nao ha empresas, ela avisa que o
                      problema e de PERMISSAO, e nao que a lista esta vazia. Trocar por "Selecione"
                      apagaria essa informacao.
                    */}
                    <option value="">
                      {empresas.length ? 'Selecione' : 'Sem acesso as empresas do grupo'}
                    </option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">Obra</span>
                  <select className="form-control" value={formulario.obra_id}
                    onChange={(e) => setFormulario({ ...formulario, obra_id: e.target.value })} required>
                    <option value="">Selecione</option>
                    {obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}
                  </select>
                </label>

                {/*
                  O CARGO VEM DO CATALOGO (Fase 7), e nao mais de texto livre.
                  O escopo pede "Cargo (lista do banco de dados)". Enquanto os cargos nao carregam,
                  o campo de texto continua valendo — melhor um cargo digitado do que nenhum.
                */}
                <label className="form-field">
                  <span className="form-label">Cargo</span>
                  {cargos.length ? (
                    <select className="form-control" value={formulario.cargo_id || ''}
                      onChange={(e) => setFormulario({ ...formulario, cargo_id: e.target.value })}>
                      <option value="">Selecione</option>
                      {cargos.map((cargo) => <option key={cargo.id} value={cargo.id}>{cargo.nome}</option>)}
                    </select>
                  ) : (
                    <input className="form-control" value={formulario.cargo}
                      onChange={(e) => setFormulario({ ...formulario, cargo: e.target.value })} />
                  )}
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">Tipo de contratacao</span>
                  <select className="form-control" value={formulario.tipo_vinculo}
                    onChange={(e) => setFormulario({ ...formulario, tipo_vinculo: e.target.value })}>
                    {/* Os cinco do item 8 do escopo. `NAO_CLT` fica por ultimo: e o valor gravado
                        nos registros antigos, e some-lo da lista faria eles perderem o rotulo. */}
                    <option value="CLT">CLT</option>
                    <option value="EXPERIENCIA">Experiencia</option>
                    <option value="PRAZO_DETERMINADO">Prazo determinado</option>
                    <option value="APRENDIZ">Aprendiz</option>
                    <option value="ESTAGIARIO">Estagiario</option>
                    <option value="NAO_CLT">Nao CLT</option>
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label">Carga horaria semanal</span>
                  <input className="form-control" type="number" min="0" step="0.5"
                    value={formulario.carga_horaria_semanal || ''}
                    onChange={(e) => setFormulario({ ...formulario, carga_horaria_semanal: e.target.value })} />
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">Data de admissao</span>
                  <input className="form-control" type="date" value={formulario.data_admissao}
                    onChange={(e) => setFormulario({ ...formulario, data_admissao: e.target.value })} required />
                </label>

                <label className="form-field">
                  <span className="form-label">Salario</span>
                  <input className="form-control" value={formulario.salario_base}
                    onChange={(e) => setFormulario({ ...formulario, salario_base: formatCurrencyInput(e.target.value) })} />
                </label>
              </div>
              <div className="rh-colaboradores-filter-grid">
                <label className="form-field">
                  <span className="form-label form-label--required">Telefone</span>
                  <input className="form-control" type="tel" value={formulario.telefone || ''}
                    onChange={(e) => setFormulario({ ...formulario, telefone: e.target.value })} required />
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">E-mail</span>
                  <input className="form-control" type="email" value={formulario.email || ''}
                    onChange={(e) => setFormulario({ ...formulario, email: e.target.value })} required />
                </label>

              </div>

              {/* O escopo pede "nome dos pais". Dois campos, e nao um: a certidao de
                  nascimento e o eSocial tratam pai e mae separadamente. */}
              <div className="rh-colaboradores-filter-grid">
                <label className="form-field">
                  <span className="form-label">Nome do pai</span>
                  <input className="form-control" value={formulario.nome_pai || ''}
                    onChange={(e) => setFormulario({ ...formulario, nome_pai: e.target.value })} />
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">Nome da mae</span>
                  <input className="form-control" value={formulario.nome_mae || ''}
                    onChange={(e) => setFormulario({ ...formulario, nome_mae: e.target.value })} required />
                </label>

              </div>

              <div className="rh-colaboradores-filter-grid">
                <label className="form-field">
                  <span className="form-label form-label--required">Endereco</span>
                  <input className="form-control" value={formulario.endereco || ''}
                    onChange={(e) => setFormulario({ ...formulario, endereco: e.target.value })} required />
                </label>

                <label className="form-field">
                  <span className="form-label">Numero</span>
                  <input className="form-control" value={formulario.numero || ''}
                    onChange={(e) => setFormulario({ ...formulario, numero: e.target.value })} />
                </label>

                <label className="form-field">
                  <span className="form-label">Complemento</span>
                  <input className="form-control" value={formulario.complemento || ''}
                    onChange={(e) => setFormulario({ ...formulario, complemento: e.target.value })} />
                </label>

                <label className="form-field">
                  <span className="form-label">Bairro</span>
                  <input className="form-control" value={formulario.bairro || ''}
                    onChange={(e) => setFormulario({ ...formulario, bairro: e.target.value })} />
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">Municipio</span>
                  <input className="form-control" value={formulario.municipio || ''}
                    onChange={(e) => setFormulario({ ...formulario, municipio: e.target.value })} required />
                </label>

                <label className="form-field">
                  <span className="form-label">UF</span>
                  <input className="form-control" maxLength={2} value={formulario.estado || ''}
                    onChange={(e) => setFormulario({ ...formulario, estado: e.target.value.toUpperCase() })} />
                </label>

                <label className="form-field">
                  <span className="form-label">CEP</span>
                  <input className="form-control" value={formulario.cep || ''}
                    onChange={(e) => setFormulario({ ...formulario, cep: e.target.value })} />
                </label>

              </div>

              {/* Dados bancarios E chave PIX: o escopo pede os dois, e eles nao sao
                  alternativos — a conta recebe a folha, o PIX resolve pagamento avulso. */}
              <div className="rh-colaboradores-filter-grid">
                <label className="form-field">
                  <span className="form-label">Banco</span>
                  <input className="form-control" value={formulario.banco || ''}
                    onChange={(e) => setFormulario({ ...formulario, banco: e.target.value })} />
                </label>

                <label className="form-field">
                  <span className="form-label">Agencia</span>
                  <input className="form-control" value={formulario.agencia || ''}
                    onChange={(e) => setFormulario({ ...formulario, agencia: e.target.value })} />
                </label>

                <label className="form-field">
                  <span className="form-label">Conta</span>
                  <input className="form-control" value={formulario.conta || ''}
                    onChange={(e) => setFormulario({ ...formulario, conta: e.target.value })} />
                </label>

                <label className="form-field">
                  <span className="form-label">Tipo de conta</span>
                  <select className="form-control" value={formulario.conta_tipo || ''}
                    onChange={(e) => setFormulario({ ...formulario, conta_tipo: e.target.value })}>
                    <option value="">Selecione</option>
                    <option value="CORRENTE">Corrente</option>
                    <option value="POUPANCA">Poupanca</option>
                    <option value="SALARIO">Salario</option>
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label">Tipo da chave PIX</span>
                  <select className="form-control" value={formulario.pix_chave_tipo || ''}
                    onChange={(e) => setFormulario({ ...formulario, pix_chave_tipo: e.target.value })}>
                    <option value="">Selecione</option>
                    <option value="CPF">CPF</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="TELEFONE">Telefone</option>
                    <option value="ALEATORIA">Aleatoria</option>
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label">Chave PIX</span>
                  <input className="form-control" value={formulario.pix_chave || ''}
                    onChange={(e) => setFormulario({ ...formulario, pix_chave: e.target.value })} />
                </label>
              </div>
            </div>
            ) : null}

            {/*
              MOVIMENTACOES (item 9 do escopo). O subtipo vem PRIMEIRO porque e ele que decide quais
              campos existem — e tambem qual checklist o pedido vai cobrar. Escolher depois faria o
              usuario preencher campos que a proxima escolha apagaria.
            */}
            {formulario.tipo === 'MOVIMENTACAO' ? (
              <div className="space-y-3">
                <label className="form-field">
                <span className="form-label form-label--required">Tipo da movimentacao</span>
                <select className="form-control" value={formulario.subtipo || ''} required
                  onChange={(e) => {
                    const subtipo = e.target.value;
                    // Trocar o subtipo troca o checklist, e com ele os tipos oferecidos no anexo.
                    // Os anexos ja escolhidos sao zerados: o tipo deles pode nao existir na lista
                    // nova, e deixar um `documento_tipo_id` orfao faria o envio ser recusado com
                    // uma mensagem que nao explica nada.
                    setFormulario({ ...formulario, subtipo, anexos: [] });
                    carregarChecklist(formulario.tipo, subtipo);
                  }}>
                  <option value="">Selecione</option>
                  {subtiposParaColaborador(formulario).map((sub) => (
                    <option key={sub.valor} value={sub.valor}>{sub.rotulo}</option>
                  ))}
                </select>
                </label>

                {['ATESTADO', 'FERIAS', 'RETORNO_AFASTAMENTO'].includes(formulario.subtipo) ? (
                  <div className="rh-colaboradores-filter-grid">
                    <label className="form-field">
                      <span className="form-label form-label--required">Data inicial do afastamento</span>
                      <input className="form-control" type="date" required value={formulario.data_inicial || ''}
                        onChange={(e) => setFormulario({ ...formulario, data_inicial: e.target.value })} />
                    </label>

                    <label className="form-field">
                      <span className="form-label form-label--required">Data final do afastamento</span>
                      <input className="form-control" type="date" required value={formulario.data_final || ''}
                        onChange={(e) => setFormulario({ ...formulario, data_final: e.target.value })} />
                    </label>
                    {/*
                      Os dias sao CALCULADOS e so de leitura — o escopo pede que o sistema os calcule.
                      Campo editavel convidaria a digitar um numero que o servidor recalcularia por
                      cima, e o usuario veria um valor virar outro sem explicacao.
                    */}
                    <label className="form-field">
                      <span className="form-label">Dias de afastamento</span>
                      {/* Calculado e so de leitura: o escopo pede que o sistema calcule. Campo
                          editavel convidaria a digitar um numero que o servidor recalcularia por
                          cima, e o usuario veria um valor virar outro sem explicacao. */}
                      <input className="form-control" readOnly tabIndex={-1}
                        value={diasEntre(formulario.data_inicial, formulario.data_final) ?? ''} />
                    </label>
                  </div>
                ) : null}

                {formulario.subtipo === 'TRANSFERENCIA_OBRA' ? (
                  <div className="rh-colaboradores-filter-grid">
                    <label className="form-field">
                      <span className="form-label form-label--required">
                        {formulario.primeiraLotacao ? 'Obra' : 'Obra de destino'}
                      </span>
                      <select className="form-control" required value={formulario.obra_destino_id || ''}
                        onChange={(e) => setFormulario({ ...formulario, obra_destino_id: e.target.value })}>
                        <option value="">Selecione</option>
                        {obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}
                      </select>
                    </label>

                    <label className="form-field">
                      <span className="form-label">A partir de</span>
                      <input className="form-control" type="date" value={formulario.data_vigencia || ''}
                        onChange={(e) => setFormulario({ ...formulario, data_vigencia: e.target.value })} />
                    </label>
                  </div>
                ) : null}

                {formulario.subtipo === 'ALTERACAO_CARGO' ? (
                  <div className="rh-colaboradores-filter-grid">
                    <label className="form-field">
                      <span className="form-label form-label--required">Novo cargo</span>
                      <select className="form-control" required value={formulario.novo_cargo_id || ''}
                        onChange={(e) => setFormulario({ ...formulario, novo_cargo_id: e.target.value })}>
                        <option value="">Selecione</option>
                        {cargos.map((cargo) => <option key={cargo.id} value={cargo.id}>{cargo.nome}</option>)}
                      </select>
                    </label>
                    <p className="text-sm opacity-80">
                      Conferir se a mudanca de funcao exige ASO novo. O checklist ja traz o campo.
                    </p>
                  </div>
                ) : null}

                {formulario.subtipo === 'ALTERACAO_SALARIAL' ? (
                  <div className="rh-colaboradores-filter-grid">
                    <label className="form-field">
                      <span className="form-label form-label--required">Novo salario</span>
                      <input className="form-control" required value={formulario.novo_salario || ''}
                        onChange={(e) => setFormulario({ ...formulario, novo_salario: formatCurrencyInput(e.target.value) })} />
                    </label>

                    <label className="form-field">
                      <span className="form-label form-label--required">Vale a partir de</span>
                      <input className="form-control" type="date" required value={formulario.data_vigencia || ''}
                        onChange={(e) => setFormulario({ ...formulario, data_vigencia: e.target.value })} />
                    </label>

                    <label className="form-field">
                      <span className="form-label form-label--required">Motivo</span>
                      {/* Sem motivo a Diretoria decide no escuro, e aumento e custo permanente. */}
                      <input className="form-control" required value={formulario.motivo || ''}
                        onChange={(e) => setFormulario({ ...formulario, motivo: e.target.value })} />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/*
              O BLOCO DO TIPO ANTIGO CONTINUA, e nao e sobra esquecida.

              `TROCA_OBRA` deixou de ser oferecido — virou subtipo de Movimentacoes. Mas o deploy
              do codigo e a execucao de `migrarTrocaObraParaMovimentacao.js` sao DOIS momentos, e
              entre eles existem registros com o tipo antigo no banco. Um pedido devolvido nessa
              janela precisa poder ser reaberto e corrigido.

              Depois que o script rodar em producao, este bloco pode sair.
            */}
            {formulario.tipo === 'TROCA_OBRA' ? (
              <div className="rh-colaboradores-filter-grid">
                <label className="form-field">
                  <span className="form-label form-label--required">
                    {formulario.primeiraLotacao ? 'Obra' : 'Obra de destino'}
                  </span>
                  <select className="form-control" value={formulario.obra_destino_id}
                    onChange={(e) => setFormulario({ ...formulario, obra_destino_id: e.target.value })} required>
                    <option value="">Selecione</option>
                    {obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label">A partir de</span>
                  <input className="form-control" type="date" value={formulario.data_vigencia}
                    onChange={(e) => setFormulario({ ...formulario, data_vigencia: e.target.value })} />
                </label>
                {formulario.admissaoFutura ? (
                  <p className="text-sm opacity-80">
                    Este colaborador tem admissao programada. A obra passa a valer a partir da
                    admissao, e nao de hoje.
                  </p>
                ) : null}
              </div>
            ) : null}

            {formulario.tipo === 'DEMISSAO' ? (
              <div className="space-y-2">
                {/*
                  O MOTIVO E O SUBTIPO, e ele vem primeiro porque muda a papelada exigida: pedido de
                  demissao cobra o pedido assinado, termino de contrato cobra o termo de encerramento.
                */}
                <label className="form-field">
                <span className="form-label form-label--required">Motivo do desligamento</span>
                <select className="form-control" required value={formulario.subtipo || ''}
                  onChange={(e) => {
                    const subtipo = e.target.value;
                    // Trocar o subtipo troca o checklist, e com ele os tipos oferecidos no anexo.
                    // Os anexos ja escolhidos sao zerados: o tipo deles pode nao existir na lista
                    // nova, e deixar um `documento_tipo_id` orfao faria o envio ser recusado com
                    // uma mensagem que nao explica nada.
                    setFormulario({ ...formulario, subtipo, anexos: [] });
                    carregarChecklist(formulario.tipo, subtipo);
                  }}>
                  <option value="">Selecione</option>
                  {MOTIVOS_DEMISSAO.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
                </select>
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">Quem pediu o desligamento</span>
                  {/* Muda a verba rescisoria inteira. Em branco, o DP adivinha. */}
                  <select className="form-control" required value={formulario.solicitado_por || ''}
                    onChange={(e) => setFormulario({ ...formulario, solicitado_por: e.target.value })}>
                    <option value="">Selecione</option>
                    <option value="EMPRESA">A empresa</option>
                    <option value="COLABORADOR">O colaborador</option>
                  </select>
                </label>

                {/*
                  ACORDO ENTRE AS PARTES e o unico motivo em que o numero e NEGOCIADO em vez de
                  calculado. Sem registrar quanto foi combinado, nao ha como conferir a rescisao
                  depois contra o que se acertou.
                */}
                {formulario.subtipo === 'ACORDO_PARTES' ? (
                  <div className="rh-colaboradores-filter-grid">
                    <label className="form-field">
                      <span className="form-label form-label--required">Valor acordado</span>
                      <input className="form-control" required value={formulario.valor_acordado || ''}
                        onChange={(e) => setFormulario({ ...formulario, valor_acordado: formatCurrencyInput(e.target.value) })} />
                    </label>

                    <label className="form-field">
                      <span className="form-label form-label--required">Justificativa do acordo</span>
                      <input className="form-control" required value={formulario.justificativa_acordo || ''}
                        onChange={(e) => setFormulario({ ...formulario, justificativa_acordo: e.target.value })} />
                    </label>
                  </div>
                ) : null}

                <label className="form-field">
                  <span className="form-label form-label--required">Ultimo dia trabalhado</span>
                  <input className="form-control" type="date" required
                    value={formulario.ultimo_dia_trabalhado || ''}
                    onChange={(e) => setFormulario({ ...formulario, ultimo_dia_trabalhado: e.target.value })} />
                </label>

                {/*
                  ALERTA, E NAO TRAVA. Ferias vencidas nao impedem demitir — mudam a rescisao, e quem
                  decide isso e o DP. Mesma escolha do ASO na Fase 3: a cor avisa, o botao nao some.
                */}
                {(formulario.apontamentos || []).length ? (
                  <div className="rh-alerta-apontamentos">
                    <strong>Antes de seguir, confira:</strong>
                    <ul>
                      {formulario.apontamentos.map((a, i) => (
                        <li key={a.tipo + '-' + i}>{a.descricao}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formulario.tem_aviso_previo}
                    onChange={(e) => setFormulario({ ...formulario, tem_aviso_previo: e.target.checked })} />
                  Tem aviso previo
                </label>
                {formulario.tem_aviso_previo ? (
                  <div className="rh-colaboradores-filter-grid">
                    <label className="form-field">
                      <span className="form-label form-label--required">Tipo do aviso previo</span>
                      <select className="form-control" value={formulario.tipo_aviso_previo}
                        onChange={(e) => setFormulario({ ...formulario, tipo_aviso_previo: e.target.value })}>
                        <option value="TRABALHADO">Trabalhado</option>
                        <option value="INDENIZADO">Indenizado</option>
                      </select>
                    </label>
                  </div>
                ) : null}
                <label className="form-field">
                  <span className="form-label form-label--required">Data de desligamento</span>
                  <input className="form-control" type="date" value={formulario.data_desligamento}
                    onChange={(e) => setFormulario({ ...formulario, data_desligamento: e.target.value })} />
                </label>
                {formulario.tem_aviso_previo && formulario.tipo_aviso_previo === 'TRABALHADO' ? (
                  <p className="text-sm opacity-80">
                    Com aviso trabalhado o colaborador continua na obra e no custo dela ate a data de
                    desligamento.
                  </p>
                ) : null}
              </div>
            ) : null}

            {formulario.tipo === 'EVENTO_RECORRENTE' ? (
              <div className="rh-colaboradores-filter-grid">
                <label className="form-field">
                <span className="form-label form-label--required">Tipo do evento</span>
                <select className="form-control" value={formulario.codigo}
                  onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })}>
                  <option value="VALE_ALIMENTACAO">Vale alimentacao</option>
                  <option value="VALE_TRANSPORTE">Vale transporte</option>
                  <option value="PLANO_SAUDE">Plano de saude</option>
                  <option value="DESCONTO_ADIANTAMENTO">Desconto de adiantamento</option>
                  <option value="PENSAO_ALIMENTICIA">Pensao alimenticia</option>
                  <option value="OUTRO">Outro</option>
                </select>
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">Natureza</span>
                  <select className="form-control" value={formulario.natureza}
                    onChange={(e) => setFormulario({ ...formulario, natureza: e.target.value })}>
                    <option value="CREDITO">Credito</option>
                    <option value="DESCONTO">Desconto</option>
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">Valor</span>
                  <input className="form-control" value={formulario.valor}
                    onChange={(e) => setFormulario({ ...formulario, valor: formatCurrencyInput(e.target.value) })} required />
                </label>

                <label className="form-field">
                  <span className="form-label form-label--required">Competencia inicial</span>
                  <input className="form-control" placeholder="AAAA-MM"
                    value={formulario.competencia_inicio}
                    onChange={(e) => setFormulario({ ...formulario, competencia_inicio: e.target.value })} required />
                </label>

                <label className="form-field">
                  <span className="form-label">Parcelas</span>
                  {/* O placeholder AQUI continua, e nao e rotulo: ele explica o que VAZIO significa
                      ("sem fim"), que e informacao que nenhum rotulo carrega. */}
                  <input className="form-control" type="number" min="1" placeholder="Vazio = sem fim"
                    value={formulario.parcelas_total}
                    onChange={(e) => setFormulario({ ...formulario, parcelas_total: e.target.value })} />
                </label>
              </div>
            ) : null}

            {formulario.tipo === 'ALTERACAO_SALARIAL' ? (
              <div className="space-y-2">
                <div className="rh-colaboradores-filter-grid">
                  <label className="form-field">
                    <span className="form-label form-label--required">Novo salario</span>
                    <input className="form-control" value={formulario.novo_salario}
                      onChange={(e) => setFormulario({ ...formulario, novo_salario: formatCurrencyInput(e.target.value) })} required />
                  </label>

                  <label className="form-field">
                    <span className="form-label form-label--required">Vale a partir de</span>
                    <input className="form-control" type="date" value={formulario.data_vigencia}
                      onChange={(e) => setFormulario({ ...formulario, data_vigencia: e.target.value })} required />
                  </label>

                  <label className="form-field">
                    <span className="form-label form-label--required">Motivo</span>
                    <input className="form-control" value={formulario.motivo}
                      onChange={(e) => setFormulario({ ...formulario, motivo: e.target.value })} required />
                  </label>
                </div>
                <p className="text-sm opacity-80">
                  Quem decide alteracao salarial e a Diretoria, nao o Departamento Pessoal.
                </p>
              </div>
            ) : null}

            <label className="form-field">
              <span className="form-label">Justificativa</span>
              <textarea className="form-control" rows={2}
                value={formulario.justificativa}
                onChange={(e) => setFormulario({ ...formulario, justificativa: e.target.value })} />
            </label>


            {/*
              ANEXAR NO PROPRIO MODAL (27/08).

              Pedido do cliente: "tem movimentacao que precisa anexar arquivo como Atestado por
              exemplo, e permitir anexar multiplos arquivos".

              OS ARQUIVOS SOBEM DEPOIS de o pedido ser gravado — o anexo e uma linha com FK para a
              solicitacao, entao ela precisa existir primeiro. E exatamente o que o RASCUNHO resolve:
              ele segura o trabalho entre "gravei o pedido" e "a papelada esta toda la".

              UMA LINHA POR ARQUIVO, cada uma com o SEU tipo. Um `<input multiple>` puro deixaria os
              arquivos sem tipo, e todos com o mesmo tipo seria pior — a certidao do dependente e o
              comprovante de escolaridade viriam etiquetados igual. E arquivo sem tipo entra como
              anexo AVULSO: nao conta para o checklist e nao vai para a pasta do colaborador.
            */}
            {checklistDoTipo.length ? (
              <div className="rh-anexos-do-modal">
                <div className="rh-anexos-cabecalho">
                  <span className="form-label">Documentos</span>
                  <button type="button" className="btn btn-outline btn-sm" onClick={acrescentarLinhaDeAnexo}>
                    Acrescentar arquivo
                  </button>
                </div>

                {(formulario.anexos || []).length === 0 ? (
                  <p className="form-hint">
                    Nenhum arquivo escolhido. Da para anexar agora ou depois, abrindo o rascunho.
                  </p>
                ) : null}

                {(formulario.anexos || []).map((linha, indice) => (
                  <div className="rh-anexo-linha" key={`anexo-${indice}`}>
                    <label className="form-field">
                      <span className="form-label">Tipo do documento</span>
                      <select
                        className="form-control"
                        value={linha.documento_tipo_id}
                        onChange={(e) => alterarLinhaDeAnexo(indice, 'documento_tipo_id', e.target.value)}
                      >
                        <option value="">Selecione</option>
                        {checklistDoTipo.map((item) => (
                          <option key={item.documento_tipo_id} value={item.documento_tipo_id}>
                            {item.nome}{item.nivel === 'OBRIGATORIO' ? ' (obrigatorio)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="form-field">
                      <span className="form-label">Arquivo</span>
                      <input
                        className="form-control"
                        type="file"
                        onChange={(e) => alterarLinhaDeAnexo(indice, 'arquivo', e.target.files?.[0] || null)}
                      />
                    </label>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => removerLinhaDeAnexo(indice)}
                      aria-label={`Remover o arquivo ${indice + 1}`}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="app-page-actions">
              {/*
                O ROTULO DIZ O QUE O BOTAO FAZ. Ele dizia "Enviar ao Departamento Pessoal" e passou
                a mentir quando o pedido virou RASCUNHO: aqui so se GRAVA o rascunho e sobem os
                arquivos. Quem enviava de fato era este botao, e agora e o de Enviar, na lista.
              */}
              <button type="submit" className="btn btn-primary">Salvar rascunho</button>
              <button type="button" className="btn btn-outline" onClick={() => setFormulario(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </OverlayModal>
      ) : null}

      {conferencia ? (
        <div className="alert alert-warning">
          Faltam: {conferencia.faltando.map((d) => d.nome).join(', ')}
        </div>
      ) : null}
    </div>
  );
}
