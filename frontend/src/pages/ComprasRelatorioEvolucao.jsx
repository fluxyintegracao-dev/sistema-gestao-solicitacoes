import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Avisos,
  BarraFiltros,
  BlocoConteudo,
  Pagina,
  PageHeader,
  StatGrid,
  StatTile,
  TabelaPadrao
} from '../components/padrao';
import { obterRelatorioEvolucaoCompras } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

function readFilters(searchParams) {
  return {
    obra_id: searchParams.get('obra_id') || '',
    data_inicio: searchParams.get('data_inicio') || '',
    data_fim: searchParams.get('data_fim') || ''
  };
}

function buildSearchParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  return params;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar relatorio de evolucao mensal de compras';
  }
}

/**
 * MINIBARRA DA CURVA MENSAL — a largura em % e DADO (a proporcao do mes
 * contra o maior mes), nao medida de layout: por isso continua no `style` e
 * nao vira degrau da escala (R10). Trilho e preenchimento saem de token
 * (R25); antes eram `bg-slate-100` e `bg-blue-600`, paleta crua sem par no
 * tema escuro e fora do piso de contraste do ThemeContext.
 *
 * O ZERO NAO DESENHA (correcao de 04/09). A versao anterior calculava
 * `Math.max(4, ...)` sem guarda: um mes com valor ZERO saia com 4% de barra
 * pintada — barra visivel afirmando que houve compra num mes sem nenhuma.
 * O piso de 4% tem proposito legitimo (mes pequeno porem real precisa
 * aparecer), mas so vale DEPOIS de o valor ser maior que zero.
 */
function MiniBar({ value, max }) {
  const numero = Number(value || 0);
  const proporcao = max > 0 ? Math.round((numero / max) * 100) : 0;
  const largura = numero > 0 ? Math.max(4, proporcao) : 0;
  return (
    <div className="mt-1 h-2 rounded-full bg-[var(--ui-border)] overflow-clip">
      <div
        className="h-2 rounded-full bg-[var(--c-primary)]"
        style={{ width: `${largura}%` }}
      />
    </div>
  );
}

export default function ComprasRelatorioEvolucao() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtros, setFiltros] = useState(() => readFilters(searchParams));
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    getMinhasObras()
      .then((data) => {
        if (ativo) {
          setObras(Array.isArray(data) ? data : []);
        }
      })
      .catch((error) => console.error(error));

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const filtrosAtivos = readFilters(searchParams);
    setFiltros(filtrosAtivos);

    let ativo = true;
    async function carregar() {
      try {
        setLoading(true);
        setErro('');
        const data = await obterRelatorioEvolucaoCompras(filtrosAtivos);
        if (ativo) {
          setRelatorio(data);
        }
      } catch (error) {
        console.error(error);
        if (ativo) {
          setRelatorio(null);
          setErro(extractErrorMessage(error));
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [searchParams]);

  const resumo = relatorio?.resumo || {};
  const meses = useMemo(() => (Array.isArray(relatorio?.meses) ? relatorio.meses : []), [relatorio]);
  const obrasResumo = useMemo(() => (Array.isArray(relatorio?.obras) ? relatorio.obras : []), [relatorio]);
  const statusResumo = useMemo(() => (Array.isArray(relatorio?.status) ? relatorio.status : []), [relatorio]);
  const maxMesValor = useMemo(() => (
    meses.reduce((max, item) => Math.max(max, Number(item.valor_total || 0)), 0)
  ), [meses]);

  /*
    R12: a obra deixou de ser `<select>` e virou MARCACAO. `unico: true`
    porque o endpoint recebe UM `obra_id` (`parseInteger` no validador do
    backend, com `ensureAllowedKeys` limitando a chave a um valor): sem
    declarar, o menu abriria com caixa quadrada prometendo escolha multipla
    e, com duas marcas, a tela mandaria filtro nenhum — duas etiquetas na
    faixa e a lista sem estreitar (R15).
  */
  const ativos = useMemo(() => ({
    obra_id: new Set(filtros.obra_id ? [String(filtros.obra_id)] : [])
  }), [filtros.obra_id]);

  const dimensoes = useMemo(() => [
    {
      id: 'obra_id',
      rotulo: 'Obra / Centro de custo',
      unico: true,
      opcoes: obras.map((obra) => ({
        valor: String(obra.id),
        rotulo: obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome
      }))
    }
  ], [obras]);

  function atualizarCampo(campo, valor) {
    setFiltros((current) => ({ ...current, [campo]: valor }));
  }

  function alternarFiltro(dimensao, valor) {
    setFiltros((current) => ({
      ...current,
      [dimensao]: String(current[dimensao]) === String(valor) ? '' : String(valor)
    }));
  }

  function aplicarFiltros() {
    setSearchParams(buildSearchParams(filtros));
  }

  function limparFiltros() {
    setFiltros(DEFAULT_FILTERS);
    setSearchParams(new URLSearchParams());
  }

  return (
    <Pagina>
      {/* R11: "Voltar aos relatorios" era botao de acao fazendo papel de
          navegacao. Vira a seta `voltar` do PageHeader. */}
      <PageHeader
        titulo="Evolucao Mensal de Compras"
        voltar={{ to: '/compras/relatorios', title: 'Voltar aos relatorios' }}
        contagem={`${formatNumber(meses.length)} mes(es) com movimentacao`}
        /* R23: agregacao pesada sobre pedidos, itens e fornecedores — o
           recorte e RASCUNHO ate o clique, e a regra exige que a tela
           AVISE isso. */
        descricao="Curva mensal de pedidos de compra emitidos, valor total, ticket medio e concentracao por obra/centro. Marque o recorte e clique em Atualizar relatorio."
        acaoPrincipal={{
          rotulo: loading ? 'Atualizando...' : 'Atualizar relatorio',
          onClick: aplicarFiltros,
          desabilitada: loading
        }}
        secundarias={[{ rotulo: 'Limpar', onClick: limparFiltros }]}
      />

      <BlocoConteudo variante="secundario">
        {/* R12/R16b: obra e recorte enumeravel (marcacao + etiqueta); as
            datas sao contornos continuos — vao em `campos`. */}
        <BarraFiltros
          campos={[
            {
              id: 'data_inicio',
              rotulo: 'Pedido criado de',
              tipo: 'date',
              valor: filtros.data_inicio,
              aoMudar: (valor) => atualizarCampo('data_inicio', valor)
            },
            {
              id: 'data_fim',
              rotulo: 'Pedido criado ate',
              tipo: 'date',
              valor: filtros.data_fim,
              aoMudar: (valor) => atualizarCampo('data_fim', valor)
            }
          ]}
          filtros={dimensoes}
          ativos={ativos}
          /* R16: "Limpar" tem UM dono nesta tela — o botao secundario do
             cabecalho. Passar `aoLimpar` aqui poria um segundo controle
             com a MESMA acao no mesmo contexto visual; o ✕ de cada
             etiqueta continua removendo o recorte individual. */
          aoAlternar={alternarFiltro}
        />
      </BlocoConteudo>

      <Avisos
        avisos={erro ? [{ id: 'evolucao-erro', tipo: 'error', mensagem: erro }] : []}
        aoFechar={() => setErro('')}
      />

      <StatGrid colunas={3}>
        <StatTile label="Pedidos" valor={formatNumber(resumo.pedidos)} sub="Pedidos emitidos" />
        <StatTile label="Meses" valor={formatNumber(resumo.meses)} sub="Com movimentacao" />
        <StatTile label="Valor total" valor={formatMoney(resumo.valor_total)} sub="Soma dos pedidos" />
        <StatTile label="Ticket medio" valor={formatMoney(resumo.ticket_medio)} sub="Valor por pedido" />
        <StatTile
          label="Maior mes"
          valor={resumo.maior_mes?.label || '-'}
          sub={resumo.maior_mes ? formatMoney(resumo.maior_mes.valor_total) : 'Sem dados'}
          vazio={!resumo.maior_mes}
        />
        <StatTile label="Fornecedores" valor={formatNumber(resumo.fornecedores)} sub="Com pedido no periodo" />
      </StatGrid>

      {/* R18: o `overflow-hidden` que embrulhava esta tabela criava um
          scrollport e matava o `position: sticky` da coluna fixa e do
          cabecalho — sem erro e sem falha de build. */}
      <BlocoConteudo
        titulo="Curva mensal"
        descricao="Pedidos agrupados pelo mes real de criacao do pedido de compra."
        variante="primario"
        cor="var(--c-primary)"
      >
        <TabelaPadrao
          // R17: serie puramente temporal (mes x totais) — a linha e um
          // periodo, nao um registro nomeado; nao ha coluna de identidade.
          semIdentidade
          colunas={[
            { id: 'mes', titulo: 'Mes', tipo: 'texto', noCard: 'titulo', render: (item) => <span className="font-semibold text-[var(--c-text)]">{item.label}</span> },
            { id: 'pedidos', titulo: 'Pedidos', tipo: 'numero', render: (item) => formatNumber(item.pedidos) },
            { id: 'fornecedores', titulo: 'Fornecedores', tipo: 'numero', render: (item) => formatNumber(item.fornecedores) },
            { id: 'obras', titulo: 'Obras', tipo: 'numero', render: (item) => formatNumber(item.obras) },
            { id: 'itens', titulo: 'Itens', tipo: 'numero', render: (item) => formatNumber(item.itens) },
            {
              id: 'valor',
              titulo: 'Valor',
              tipo: 'valor',
              render: (item) => (
                <span className="font-semibold">
                  {formatMoney(item.valor_total)}
                  <MiniBar value={item.valor_total} max={maxMesValor} />
                </span>
              )
            },
            { id: 'ticket', titulo: 'Ticket', tipo: 'valor', render: (item) => formatMoney(item.ticket_medio) },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'texto',
              render: (item) => (
                <>
                  {/* `.badge-soft` NAO EXISTE em CSS nenhum do repositorio —
                      a pilula saia sem fundo, sem contorno e sem forma.
                      `badge-muted` existe e e a familia neutra do sistema. */}
                  {(item.status || []).slice(0, 3).map((status) => (
                    <span key={status.key} className="badge badge-muted mr-1">
                      {status.label}: {status.total}
                    </span>
                  ))}
                </>
              )
            }
          ]}
          itens={meses}
          getId={(item) => item.key}
          carregando={loading}
          storageKey="tabela:compras-evolucao:meses"
          rotuloRolagem="Curva mensal"
          vazio="Sem pedidos nos filtros."
        />
      </BlocoConteudo>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <BlocoConteudo
          titulo="Compras por obra/centro"
          descricao="Ranking de valor comprado por obra ou centro de custo no periodo."
          variante="secundario"
        >
          <TabelaPadrao
            colunas={[
              {
                id: 'obra',
                titulo: 'Obra/Centro',
                // R17: a obra/centro NOMEIA a linha do ranking.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.obra_nome
              },
              { id: 'pedidos', titulo: 'Pedidos', tipo: 'numero', render: (item) => formatNumber(item.pedidos) },
              { id: 'fornecedores', titulo: 'Fornecedores', tipo: 'numero', render: (item) => formatNumber(item.fornecedores) },
              { id: 'itens', titulo: 'Itens', tipo: 'numero', render: (item) => formatNumber(item.itens) },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => <span className="font-semibold">{formatMoney(item.valor_total)}</span> },
              { id: 'ticket', titulo: 'Ticket', tipo: 'valor', render: (item) => formatMoney(item.ticket_medio) },
              {
                id: 'meses',
                titulo: 'Meses',
                tipo: 'texto',
                render: (item) => (
                  <span className="text-xs text-[var(--c-muted)]">
                    {(item.meses || []).slice(-3).map((mes) => `${mes.label}: ${formatMoney(mes.valor_total)}`).join(' | ') || '-'}
                  </span>
                )
              }
            ]}
            itens={obrasResumo}
            getId={(item) => item.key}
            carregando={loading}
            storageKey="tabela:compras-evolucao:obras"
            rotuloRolagem="Compras por obra/centro"
            vazio="Sem dados por obra/centro."
          />
        </BlocoConteudo>

        <BlocoConteudo
          titulo="Pedidos por status"
          descricao="Distribuicao dos pedidos usados na evolucao."
          variante="secundario"
        >
          <TabelaPadrao
            colunas={[
              {
                id: 'status',
                titulo: 'Status',
                // R17: o status NOMEIA a linha deste agrupamento.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.label
              },
              { id: 'total', titulo: 'Total', tipo: 'numero', render: (item) => formatNumber(item.total) },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => <span className="font-semibold">{formatMoney(item.valor_total)}</span> }
            ]}
            itens={statusResumo}
            getId={(item) => item.key}
            carregando={loading}
            storageKey="tabela:compras-evolucao:status"
            rotuloRolagem="Pedidos por status"
            vazio="Sem status nos filtros."
          />
        </BlocoConteudo>
      </div>
    </Pagina>
  );
}
