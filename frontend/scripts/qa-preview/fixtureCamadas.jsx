/*
 * FIXTURE VIVA DAS CAMADAS FLUTUANTES — os COMPONENTES REAIS, nas três
 * larguras do harness.
 * ============================================================================
 *
 * POR QUE ELA NÃO É A `fixturePreferencias`. Aquela reproduz o CONTRATO DE
 * DOM das capacidades e serve para provar que os CHECKS mordem; ela mesma
 * diz, no topo, o que não prova: "que os componentes REAIS cumprem o
 * contrato". A geometria de uma camada é exatamente o que uma reprodução
 * não carrega — a largura mínima, o teto de altura, a borda que a classe
 * ancora e o cálculo do hook são do componente de verdade, e é neles que o
 * defeito da captura do cliente morava.
 *
 * O QUE ELA MONTA: os três componentes compartilhados que respondem pela
 * maior parte das camadas do sistema — `PainelFiltrosVisiveis` (o da
 * captura), `MenuMais` (o "⋯" do padrão) e `FiltroRapido` (o menu de
 * marcação que a `BarraFiltros` reaproveita em toda faixa de filtro) — com
 * o CSS REAL do sistema.
 *
 * E MONTA CADA UM DUAS VEZES, encostado na borda ESQUERDA e na borda
 * DIREITA da janela. Não é capricho: uma camada que ancora pela direita só
 * vaza quando o botão está à esquerda, e uma que ancora pela esquerda só
 * vaza quando o botão está à direita. Medir num lugar só é como o defeito
 * do cliente passou — o painel estava certo na tela larga com o botão no
 * meio, e cortado na estreita com ele na ponta.
 *
 * `?d=<defeito>` planta um defeito. Hoje só um: `semPosicao`, que devolve o
 * painel de filtros ao arranjo ANTERIOR (`absolute; right: 0`) para provar
 * que a medição REPROVA o estado de antes — check que não reprova o defeito
 * conhecido não está medindo nada.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PainelFiltrosVisiveis from '../../src/components/padrao/PainelFiltrosVisiveis.jsx';
import MenuMais from '../../src/components/padrao/MenuMais.jsx';
import { FiltroRapido } from '../../src/components/lista-avancada/ListaAvancada.jsx';
import ApropriacaoAutocomplete from '../../src/components/ui/ApropriacaoAutocomplete.jsx';

const params = new URLSearchParams(window.location.search);
const D = params.get('d') || '';

/* Os 15 filtros da Consulta de títulos, que é a faixa mais larga do
   sistema e a da captura — inclusive o rótulo comprido do aviso. */
const FILTROS = [
  { id: 'busca', rotulo: 'Buscar', obrigatorio: true },
  { id: 'empresa', rotulo: 'Empresa' },
  { id: 'obra', rotulo: 'Obra' },
  { id: 'parceiro', rotulo: 'Parceiro' },
  { id: 'status', rotulo: 'Status' },
  { id: 'categoria', rotulo: 'Categoria financeira' },
  { id: 'venc_ini', rotulo: 'Vencimento início' },
  { id: 'venc_fim', rotulo: 'Vencimento fim' },
  { id: 'emis_ini', rotulo: 'Emissão início' },
  { id: 'emis_fim', rotulo: 'Emissão fim' },
  { id: 'conta', rotulo: 'Conta bancária' },
  { id: 'centro', rotulo: 'Centro de custo' },
  { id: 'doc', rotulo: 'Documento' },
  { id: 'valor_min', rotulo: 'Valor mínimo' },
  { id: 'valor_max', rotulo: 'Valor máximo' }
];

/*
  A VISIBILIDADE TEM ESTADO DE VERDADE — e não um `alternar` que não faz nada.

  A primeira versão desta fixture passou stubs vazios, e a conferência de
  seleção acusou as três camadas: a marcação ia de `true` para `true` porque
  NADA no mundo mudava, e o defeito era do instrumento, não do componente.
  Instrumento que acusa o inocente é tão inútil quanto o que absolve o
  culpado — e este repositório já pagou por sete assim.
*/
function useVisibilidade() {
  const [ocultos, setOcultos] = useState(() => new Set());
  const visiveis = FILTROS.map((f) => f.id).filter((id) => !ocultos.has(id));
  return {
    chave: 'prova-camadas',
    declarados: FILTROS,
    visiveis,
    escolhidos: visiveis,
    obrigatorios: ['busca'],
    padrao: FILTROS.map((f) => f.id),
    /* "preenchido" é o que faz aparecer o aviso longo da captura — e é ele
       que estica a caixa do painel. Sem ele a medição seria de outro painel. */
    preenchidos: ['status', 'venc_ini'],
    ehVisivel: (id) => visiveis.includes(id),
    alternar: (id) => setOcultos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id); else proximo.add(id);
      return proximo;
    }),
    restaurar: () => setOcultos(new Set())
  };
}

const ITENS_MAIS = [
  { rotulo: 'Exportar para Excel', onClick: () => {} },
  { rotulo: 'Imprimir a lista', onClick: () => {} },
  { rotulo: 'Configurar colunas do relatório', onClick: () => {} },
  { rotulo: 'Excluir selecionados', perigosa: true, onClick: () => {} }
];

/* O autocomplete de apropriação é o quarto: ele é o único que usa a
   `larguraDaAncora` (a lista tem a largura do campo) e o único que vai em
   PORTAL para o `body`. Se o hook tivesse laço com essas duas coisas, é
   aqui que ele apareceria. */
const APROPRIACOES = Array.from({ length: 18 }, (_, i) => ({
  id: i + 1,
  codigo: `3.01.${String(i + 1).padStart(3, '0')}`,
  descricao: `Apropriação de custo indireto número ${i + 1} — rótulo longo de propósito`
}));

const DIMENSAO = {
  id: 'status',
  rotulo: 'Situação do título',
  opcoes: [
    { valor: 'ABERTO', rotulo: 'Em aberto' },
    { valor: 'PAGO', rotulo: 'Pago integralmente' },
    { valor: 'PARCIAL', rotulo: 'Pago parcialmente' },
    { valor: 'VENCIDO', rotulo: 'Vencido há mais de 30 dias' },
    { valor: 'CANCELADO', rotulo: 'Cancelado' }
  ]
};

/*
  O DEFEITO PLANTADO: o painel volta ao arranjo de antes do conserto —
  `position: absolute; right: 0`, que é literalmente o que estava no
  arquivo até 06/09. Ele é aplicado por CSS de mais alta especificidade
  para não precisar de uma segunda cópia do componente: o que se quer
  provar é a MEDIÇÃO, e ela olha a caixa pintada.
*/
const CSS_DEFEITO = `
  .prova-defeito .app-mais-menu.app-colunas-menu {
    position: absolute !important;
    top: calc(100% + 6px) !important;
    right: 0 !important;
    left: auto !important;
    max-height: none !important;
    max-width: none !important;
    width: auto !important;
  }
`;

function Ancora({ lado, children }) {
  return (
    <div className={`prova-ancora prova-ancora--${lado}`} data-lado={lado}>
      {children}
    </div>
  );
}

function Linha({ lado }) {
  const visibilidade = useVisibilidade();
  const [marcados, setMarcados] = useState(() => new Set());
  const [abrirApropriacao, setAbrirApropriacao] = useState(false);
  const [apropriacao, setApropriacao] = useState('');
  const alternarMarca = (valor) => setMarcados((atual) => {
    const proximo = new Set(atual);
    if (proximo.has(valor)) proximo.delete(valor); else proximo.add(valor);
    return proximo;
  });

  return (
    <div className="prova-linha">
      <Ancora lado={lado}>
        <span data-camada="filtros-visiveis">
          <PainelFiltrosVisiveis visibilidade={visibilidade} />
        </span>
      </Ancora>
      <Ancora lado={lado}>
        <span data-camada="menu-mais">
          <MenuMais itens={ITENS_MAIS} />
        </span>
      </Ancora>
      <Ancora lado={lado}>
        <span data-camada="filtro-rapido" className="la-filtros-linha">
          <FiltroRapido dim={DIMENSAO} selecionados={marcados} onToggle={alternarMarca} />
        </span>
      </Ancora>
      <Ancora lado={lado}>
        <span data-camada="apropriacao" style={{ width: 260, display: 'block' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setAbrirApropriacao(true)}>
            Apropriação
          </button>
          {abrirApropriacao ? (
            <ApropriacaoAutocomplete
              value={apropriacao}
              options={APROPRIACOES}
              onChange={setApropriacao}
            />
          ) : null}
        </span>
      </Ancora>
    </div>
  );
}

function App() {
  return (
    <div className={`prova-pagina${D === 'semPosicao' ? ' prova-defeito' : ''}`}>
      <Linha lado="esq" />
      <Linha lado="dir" />
      <div className="prova-vazio" />
      <style>{D === 'semPosicao' ? CSS_DEFEITO : ''}</style>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
