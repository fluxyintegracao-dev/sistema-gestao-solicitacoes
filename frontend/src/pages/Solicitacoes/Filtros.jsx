import { useEffect, useState } from 'react';
import BlocoConteudo from '../../components/padrao/BlocoConteudo';
import BarraFiltros from '../../components/padrao/BarraFiltros';
import { alternarValorFiltro } from '../../components/padrao/BarraFiltros';
import StatGrid from '../../components/padrao/StatGrid';
import { StatTile } from '../../components/padrao/StatGrid';
import { FiltroRapido } from '../../components/lista-avancada/ListaAvancada';

/**
 * FILTROS AVANÇADOS DAS SOLICITAÇÕES — migrados para `BarraFiltros` (R12).
 *
 * ## O que mudou de forma, e por quê
 *
 * A versão anterior era uma GRADE DE CAMPOS: quatro "multi-selects" escritos
 * à mão (obra, setor, tipo, status), cada um com o seu popover, o seu
 * `useEffect` de clique-fora, a sua rotina de posicionamento em pixels e o
 * seu resumo "Fulano, Beltrano +3" — 971 linhas para fazer o que o
 * `FiltroRapido` da `ListaAvancada` já faz, e que a `BarraFiltros`
 * reaproveita. R12: filtro é MARCAÇÃO com etiqueta removível, não campo que
 * só conta quantos itens escolhi.
 *
 * ## Onde cada recorte foi parar
 *
 * - **`filtros` (marcação, múltipla)**: obra, setor, tipo e status. Os quatro
 *   viram um parâmetro CSV (`obra_ids=1,2`) e o `SolicitacaoController.index`
 *   quebra os quatro por vírgula e monta `IN (...)` — conferido no serviço,
 *   não presumido. Por isso NENHUM deles declara `unico`: aqui a marcação
 *   múltipla chega inteira ao banco, e a etiqueta afirma a verdade (R23/F3).
 * - **`campos` (recorte contínuo, não enumerável)**: código, descrição,
 *   número do pedido, valor mín./máx., data de registro e o período de
 *   resposta/pagamento. Texto e faixa não têm lista fechada — é exatamente o
 *   caso que a `BarraFiltros` declara para `campos`.
 * - **Responsável fica em `campos`, e é decisão, não descuido**: a lista de
 *   responsáveis (`responsaveisOptions`) é extraída da PÁGINA carregada, não
 *   do banco. Virar marcação sobre ela ofereceria um conjunto que se
 *   encolhe conforme a lista pagina — capacidade aparente (R15) — e tiraria
 *   a busca por parte do nome, que o backend faz com `LIKE` quando vem um
 *   valor só. Enquanto o conjunto não for fechado, o recorte é contínuo.
 *
 * ## O que esta faixa NÃO tem, de propósito
 *
 * **Busca.** A `BarraFiltros` traz uma, mas este componente é renderizado
 * DENTRO do painel avançado da `ListaAvancada`, que já é dona da busca da
 * mesma lista. Duas caixas de busca no mesmo contexto é o defeito que a R16
 * nomeia (o caso das Empresas do Grupo). Uma responsabilidade, um dono.
 *
 * ## Filtros visíveis
 *
 * O seletor de quais filtros aparecem continua, com a mesma chave de
 * `localStorage` — só que como menu de MARCAÇÃO (`FiltroRapido`), no lugar
 * do painel flutuante posicionado em pixels à mão (R10).
 */
const FILTROS_DISPONIVEIS = [
  { id: 'codigo', label: 'Codigo da solicitacao' },
  { id: 'descricao', label: 'Descrição' },
  { id: 'numero_sienge', label: 'Numero do pedido' },
  { id: 'obra_ids', label: 'Obra' },
  { id: 'area', label: 'Setor' },
  { id: 'tipo_solicitacao_id', label: 'Tipo de solicitacao' },
  { id: 'status', label: 'Status' },
  { id: 'valor_min', label: 'Valor minimo' },
  { id: 'valor_max', label: 'Valor maximo' },
  { id: 'data_registro', label: 'Data de registro' },
  { id: 'data_vencimento', label: 'Periodo Data Resposta/Pagamento' },
  { id: 'responsavel', label: 'Responsavel' }
];

const FILTROS_OBRIGATORIOS = ['codigo', 'descricao'];

const FILTROS_VAZIOS = {
  codigo: '',
  descricao: '',
  numero_sienge: '',
  obra_ids: '',
  area: '',
  tipo_solicitacao_id: '',
  status: '',
  valor_min: '',
  valor_max: '',
  data_registro: '',
  data_vencimento: '',
  data_vencimento_inicio: '',
  data_vencimento_fim: '',
  responsavel: ''
};

/* CSV do parâmetro → conjunto de marcados, e de volta. É o formato que o
   serviço aceita; a tela não inventa outro. */
function csvParaConjunto(valor) {
  return new Set(
    String(valor || '')
      .split(',')
      .map((item) => String(item).trim())
      .filter(Boolean)
  );
}

export default function Filtros({
  filtros,
  setFiltros,
  obrasOptions = [],
  responsaveisOptions = [],
  setores = [],
  tiposSolicitacao = [],
  statusOptions = [],
  mostrarFiltroResponsavel = false,
  mostrarSomaValor = false,
  somaValorFiltrado = 0,
  errosDatas = {}
}) {
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(() => {
    try {
      const salvo = localStorage.getItem('solicitacoes:filtros-visiveis');
      if (salvo) {
        const filtrosSalvos = JSON.parse(salvo);
        if (Array.isArray(filtrosSalvos)) {
          const salvosComNovosFiltros = [...filtrosSalvos];
          FILTROS_OBRIGATORIOS.slice().reverse().forEach((filtroId) => {
            if (!salvosComNovosFiltros.includes(filtroId)) {
              salvosComNovosFiltros.unshift(filtroId);
            }
          });
          return salvosComNovosFiltros;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar filtros visíveis', error);
    }
    return FILTROS_DISPONIVEIS.map((f) => f.id);
  });

  useEffect(() => {
    try {
      localStorage.setItem('solicitacoes:filtros-visiveis', JSON.stringify(filtrosVisiveis));
    } catch (error) {
      console.error('Erro ao salvar filtros visíveis', error);
    }
  }, [filtrosVisiveis]);

  const isFiltroVisivel = (filtroId) => filtrosVisiveis.includes(filtroId);

  function definirCampo(nome, valor) {
    setFiltros((prev) => ({ ...prev, [nome]: valor }));
  }

  function limparFiltros() {
    setFiltros({ ...FILTROS_VAZIOS });
  }

  function alternarFiltroVisivel(filtroId) {
    setFiltrosVisiveis((prev) => (
      prev.includes(filtroId)
        ? prev.filter((id) => id !== filtroId)
        : [...prev, filtroId]
    ));
  }

  /* ---- Marcação: o estado da tela é o CSV; `ativos` é a leitura dele ---- */
  const ativos = {
    obra_ids: csvParaConjunto(filtros.obra_ids),
    area: csvParaConjunto(filtros.area),
    tipo_solicitacao_id: csvParaConjunto(filtros.tipo_solicitacao_id),
    status: csvParaConjunto(filtros.status)
  };

  function aoAlternar(dimensao, valor, opcoes) {
    const proximos = alternarValorFiltro(ativos, dimensao, valor, opcoes);
    definirCampo(dimensao, Array.from(proximos[dimensao]).join(','));
  }

  const dimensoes = [
    isFiltroVisivel('obra_ids') && {
      id: 'obra_ids',
      rotulo: 'Obra',
      vazio: 'Nenhuma obra disponível para filtrar.',
      opcoes: obrasOptions.map((obra) => ({ valor: String(obra.value), rotulo: obra.label }))
    },
    isFiltroVisivel('area') && {
      id: 'area',
      rotulo: 'Setor',
      vazio: 'Nenhum setor disponível para filtrar.',
      opcoes: setores.map((setor) => ({
        valor: String(setor.codigo || setor.nome || setor.id),
        rotulo: setor.nome || setor.codigo || String(setor.id)
      }))
    },
    isFiltroVisivel('tipo_solicitacao_id') && {
      id: 'tipo_solicitacao_id',
      rotulo: 'Tipo de solicitação',
      vazio: 'Nenhum tipo de solicitação cadastrado para filtrar.',
      opcoes: (tiposSolicitacao || []).map((tipo) => ({ valor: String(tipo.id), rotulo: tipo.nome }))
    },
    isFiltroVisivel('status') && {
      id: 'status',
      rotulo: 'Status',
      vazio: 'Nenhum status disponível para filtrar.',
      opcoes: statusOptions.map((item) => ({ valor: String(item.value), rotulo: item.label }))
    }
  ].filter(Boolean);

  /*
    O par de datas de resposta/pagamento continua governado pela MESMA marca
    do seletor de visibilidade que governava antes (`data_vencimento`) — o
    rótulo dela na lista é "Periodo Data Resposta/Pagamento".
  */
  const mostrarPeriodoVencimento = isFiltroVisivel('data_vencimento');

  const campos = [
    isFiltroVisivel('codigo') && {
      id: 'codigo',
      rotulo: 'Código da solicitação',
      tipo: 'text',
      valor: filtros.codigo || '',
      aoMudar: (valor) => definirCampo('codigo', valor)
    },
    isFiltroVisivel('descricao') && {
      id: 'descricao',
      rotulo: 'Descrição',
      tipo: 'search',
      valor: filtros.descricao || '',
      aoMudar: (valor) => definirCampo('descricao', valor)
    },
    isFiltroVisivel('numero_sienge') && {
      id: 'numero_sienge',
      rotulo: 'Número do pedido',
      tipo: 'text',
      valor: filtros.numero_sienge || '',
      aoMudar: (valor) => definirCampo('numero_sienge', valor)
    },
    isFiltroVisivel('valor_min') && {
      id: 'valor_min',
      rotulo: 'Valor mínimo',
      tipo: 'number',
      min: 0,
      valor: filtros.valor_min || '',
      aoMudar: (valor) => definirCampo('valor_min', valor)
    },
    isFiltroVisivel('valor_max') && {
      id: 'valor_max',
      rotulo: 'Valor máximo',
      tipo: 'number',
      min: 0,
      valor: filtros.valor_max || '',
      aoMudar: (valor) => definirCampo('valor_max', valor)
    },
    isFiltroVisivel('data_registro') && {
      id: 'data_registro',
      rotulo: 'Data de registro',
      tipo: 'date',
      min: '1900-01-01',
      max: '2200-12-31',
      valor: filtros.data_registro || '',
      aoMudar: (valor) => definirCampo('data_registro', valor)
    },
    mostrarPeriodoVencimento && {
      id: 'data_vencimento_inicio',
      rotulo: 'Data Resposta/Pagamento de',
      tipo: 'date',
      min: '1900-01-01',
      max: '2200-12-31',
      valor: filtros.data_vencimento_inicio || '',
      aoMudar: (valor) => definirCampo('data_vencimento_inicio', valor)
    },
    mostrarPeriodoVencimento && {
      id: 'data_vencimento_fim',
      rotulo: 'Data Resposta/Pagamento até',
      tipo: 'date',
      min: '1900-01-01',
      max: '2200-12-31',
      valor: filtros.data_vencimento_fim || '',
      aoMudar: (valor) => definirCampo('data_vencimento_fim', valor)
    },
    mostrarFiltroResponsavel && isFiltroVisivel('responsavel') && {
      id: 'responsavel',
      rotulo: 'Responsável',
      tipo: 'text',
      valor: filtros.responsavel || '',
      aoMudar: (valor) => definirCampo('responsavel', valor)
    }
  ].filter(Boolean);

  const quantidadeFiltrosAtivos = [
    filtros.codigo,
    filtros.descricao,
    filtros.numero_sienge,
    filtros.obra_ids,
    filtros.area,
    filtros.tipo_solicitacao_id,
    filtros.status,
    filtros.valor_min,
    filtros.valor_max,
    filtros.data_registro,
    filtros.data_vencimento,
    filtros.data_vencimento_inicio,
    filtros.data_vencimento_fim,
    mostrarFiltroResponsavel ? filtros.responsavel : ''
  ].filter((v) => String(v || '').trim() !== '').length;

  /*
    CONDIÇÃO DERIVADA DO CONTEÚDO, não evento: data inválida continua
    valendo depois de fechar um aviso, então ela mora ao lado dos campos,
    como texto fixo — nunca em `useAvisos` (a fronteira está escrita no
    próprio `Avisos.jsx`).
  */
  const errosVisiveis = Object.entries(errosDatas || {}).filter(([, mensagem]) => Boolean(mensagem));

  const dimensaoVisibilidade = {
    id: 'filtros-visiveis',
    rotulo: 'Filtros visíveis',
    opcoes: FILTROS_DISPONIVEIS
      .filter((filtro) => filtro.id !== 'responsavel' || mostrarFiltroResponsavel)
      .map((filtro) => ({ valor: filtro.id, rotulo: filtro.label }))
  };

  return (
    <BlocoConteudo
      variante="secundario"
      titulo="Filtros"
      contagem={quantidadeFiltrosAtivos > 0 ? `${quantidadeFiltrosAtivos} ativo(s)` : null}
      descricao="Refine por obra, setor, tipo, status, valor e datas."
      recolhivel
      className="solicitacoes-filtros"
    >
      {mostrarSomaValor && (
        <StatGrid colunas={1}>
          <StatTile
            label="Soma filtrada"
            valor={Number(somaValorFiltrado || 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
            sub="Soma do valor das solicitações que atendem ao recorte atual."
          />
        </StatGrid>
      )}

      <BarraFiltros
        campos={campos}
        filtros={dimensoes}
        ativos={ativos}
        aoAlternar={aoAlternar}
        aoLimpar={limparFiltros}
      />

      {errosVisiveis.length > 0 && (
        <div role="alert">
          {errosVisiveis.map(([campo, mensagem]) => (
            <p key={campo} className="form-error">{mensagem}</p>
          ))}
        </div>
      )}

      <div className="app-actionbar">
        <FiltroRapido
          dim={dimensaoVisibilidade}
          selecionados={new Set(filtrosVisiveis)}
          onToggle={(valor) => alternarFiltroVisivel(valor)}
        />
        <button className="btn btn-outline" type="button" onClick={limparFiltros}>
          Limpar filtros
        </button>
      </div>
    </BlocoConteudo>
  );
}
