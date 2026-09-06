import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Avisos,
  BarraFiltros,
  BlocoConteudo,
  BlocosPersonalizaveis,
  Pagina,
  PageHeader,
  StatGrid,
  StatTile,
  TabelaPadrao,
  useAvisos
} from '../components/padrao';
import StatusBadge from '../components/StatusBadge';
import { obterRelatorioDemandaPedidosCompras } from '../services/compras';
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

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleDateString('pt-BR');
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar relatorio de demanda e pedidos';
  }
}

/*
  As duas tabelas "por status" são a MESMA tabela com dados diferentes — o
  bloco padrão entra aqui inteiro (título, apoio e superfície), no lugar do
  `card ... overflow-hidden` + `h2` + `page-subtitle` copiados (R5/R18).
*/
function StatusTable({ title, subtitle, rows, storageKey, loading }) {
  return (
    <BlocoConteudo titulo={title} descricao={subtitle}>
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
          { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => formatMoney(item.valor_total) }
        ]}
        itens={rows}
        getId={(item) => item.key}
        carregando={loading}
        storageKey={storageKey}
        rotuloRolagem={title}
        vazio="Sem registros no periodo."
      />
    </BlocoConteudo>
  );
}

export default function ComprasRelatorioDemandaPedidos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { avisos, avisar, fechar } = useAvisos();
  const [filtros, setFiltros] = useState(() => readFilters(searchParams));
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recarga, setRecarga] = useState(0);

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
        const data = await obterRelatorioDemandaPedidosCompras(filtrosAtivos);
        if (ativo) {
          setRelatorio(data);
        }
      } catch (error) {
        console.error(error);
        if (ativo) {
          setRelatorio(null);
          // R19: falha da consulta é evento — faixa do sistema (Avisos), não
          // caixa de paleta crua montada à mão.
          avisar.erro(extractErrorMessage(error));
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
  }, [searchParams, recarga, avisar]);

  const resumo = relatorio?.resumo || {};
  const solicitacoesPorStatus = useMemo(() => (
    Array.isArray(relatorio?.solicitacoes_por_status) ? relatorio.solicitacoes_por_status : []
  ), [relatorio]);
  const pedidosPorStatus = useMemo(() => (
    Array.isArray(relatorio?.pedidos_por_status) ? relatorio.pedidos_por_status : []
  ), [relatorio]);
  const solicitacoesPorObra = useMemo(() => (
    Array.isArray(relatorio?.solicitacoes_por_obra) ? relatorio.solicitacoes_por_obra : []
  ), [relatorio]);
  const pedidosPorObra = useMemo(() => (
    Array.isArray(relatorio?.pedidos_por_obra) ? relatorio.pedidos_por_obra : []
  ), [relatorio]);
  const solicitacoes = useMemo(() => (
    Array.isArray(relatorio?.solicitacoes) ? relatorio.solicitacoes : []
  ), [relatorio]);
  const pedidos = useMemo(() => (
    Array.isArray(relatorio?.pedidos) ? relatorio.pedidos : []
  ), [relatorio]);

  /*
    R12: obra/centro sai do `<select>` e vira marcação com etiqueta
    removível; as datas são recorte contínuo (sem lista fechada) e entram em
    `campos`, o espaço declarado da R16b.
  */
  const ativos = useMemo(() => ({
    obra_id: new Set(filtros.obra_id ? [String(filtros.obra_id)] : [])
  }), [filtros.obra_id]);

  /*
    `unico: true`: o backend valida `obra_id` com `parseInteger`
    (validateCompraRelatorioDemandaPedidosQuery) — UM valor. Marca redonda,
    marcar outro substitui; caixa quadrada aqui prometeria múltipla escolha
    que o serviço não aceita (R15).
  */
  const dimensoes = useMemo(() => [
    {
      id: 'obra_id',
      rotulo: 'Obra / Centro de custo',
      unico: true,
      opcoes: obras.map((obra) => ({ valor: String(obra.id), rotulo: obra.nome }))
    }
  ], [obras]);

  /*
    R23: 1 dimensão marcável + 2 datas fica LONGE do critério de consulta
    cara (4+ dimensões), então o recorte aplica ao marcar e a etiqueta nunca
    afirma um filtro que ainda não vale. "Atualizar relatorio" continua na
    tela como o que sempre deveria ter sido: recarregar o recorte atual.
  */
  function aplicar(proximos) {
    setFiltros(proximos);
    setSearchParams(buildSearchParams(proximos));
  }

  function alternarFiltro(dimensao, valor) {
    aplicar({
      ...filtros,
      [dimensao]: String(filtros[dimensao]) === String(valor) ? '' : String(valor)
    });
  }

  function mudarCampo(campo, valor) {
    aplicar({ ...filtros, [campo]: valor });
  }

  function limparFiltros() {
    setFiltros(DEFAULT_FILTERS);
    setSearchParams(new URLSearchParams());
  }

  function recarregar() {
    setRecarga((atual) => atual + 1);
  }

  return (
    <Pagina>
      <PageHeader
        titulo="Demanda e Pedidos"
        contagem="Compras / Relatorios"
        descricao="Visao sintetica e analitica das solicitacoes de compra e dos pedidos gerados."
        /* R11: o retorno ao hub de relatórios fica na seta do cabeçalho —
           navegação não é ação, então não volta para a barra de ações. */
        voltar={{ to: '/compras/relatorios', title: 'Voltar aos relatorios' }}
        acaoPrincipal={{
          rotulo: loading ? 'Atualizando...' : 'Atualizar relatorio',
          onClick: recarregar,
          desabilitada: loading
        }}
        secundarias={[{ rotulo: 'Limpar', onClick: limparFiltros }]}
      />

      <Avisos avisos={avisos} aoFechar={fechar} />

      <BlocoConteudo variante="secundario">
        <BarraFiltros
          campos={[
            {
              id: 'data_inicio',
              rotulo: 'Criacao inicial',
              tipo: 'date',
              valor: filtros.data_inicio,
              aoMudar: (valor) => mudarCampo('data_inicio', valor)
            },
            {
              id: 'data_fim',
              rotulo: 'Criacao final',
              tipo: 'date',
              valor: filtros.data_fim,
              aoMudar: (valor) => mudarCampo('data_fim', valor)
            }
          ]}
          filtros={dimensoes}
          ativos={ativos}
          aoAlternar={alternarFiltro}
          aoLimpar={limparFiltros}
        />
      </BlocoConteudo>

      <StatGrid colunas={5}>
        <StatTile label="Solicitacoes" valor={formatNumber(resumo.solicitacoes)} sub="Criadas no periodo" />
        <StatTile label="Liberadas" valor={formatNumber(resumo.solicitacoes_liberadas)} sub="Com liberacao para compra" />
        <StatTile label="Pedidos" valor={formatNumber(resumo.pedidos)} sub="Gerados no periodo" />
        <StatTile label="Valor pedidos" valor={formatMoney(resumo.valor_pedidos)} sub="Somente pedidos reais" />
        <StatTile label="Ticket medio" valor={formatMoney(resumo.ticket_medio_pedido)} sub="Valor medio por pedido" />
      </StatGrid>

      {/* R18: as cinco tabelas viviam dentro de `card ... overflow-hidden`.
          O `hidden` cria scrollport e mata o `position: sticky` do cabeçalho
          e da coluna fixa, calado — nenhum erro, nenhum teste. O
          BlocoConteudo não recorta; onde cortar for necessário, o idioma é
          `overflow: clip`. */}
      <div className="grid gap-4 xl:grid-cols-2">
        <StatusTable
          title="Solicitacoes por status"
          subtitle="Volume de demandas de compra pela situacao atual."
          rows={solicitacoesPorStatus}
          storageKey="tabela:compras-demanda-pedidos:status-solicitacoes"
          loading={loading}
        />
        <StatusTable
          title="Pedidos por status"
          subtitle="Pedidos emitidos agrupados pela situacao atual."
          rows={pedidosPorStatus}
          storageKey="tabela:compras-demanda-pedidos:status-pedidos"
          loading={loading}
        />
      </div>

      {/*
        BLOCOS PERSONALIZÁVEIS (05/09). Tela de relatório/painel é o grupo
        em que ligar isto é SEGURO: estes 3 blocos são leituras
        independentes — sem ordem obrigatória entre si, sem botão de gravar
        dentro e sem campo obrigatório que ocultar esconda. O padrão continua
        sendo o do código; a preferência guarda só o DESVIO. No celular o
        modo não existe (arrastar é HTML5 nativo e não responde a toque).
      */}
      <BlocosPersonalizaveis chave="blocos:compras-relatorio-demanda-pedidos" larguraPadrao="total">
        <div data-bloco-id="solicitacoes-por-obra-centro" data-bloco-rotulo="Solicitacoes por obra/centro" className="grid gap-4 xl:grid-cols-2">
          <BlocoConteudo titulo="Solicitacoes por obra/centro" descricao="Origem das demandas no periodo filtrado.">
            <TabelaPadrao
              colunas={[
                {
                  id: 'obra',
                  titulo: 'Obra/Centro',
                  // R17: a obra/centro NOMEIA a linha deste resumo.
                  tipo: 'identidade',
                  noCard: 'titulo',
                  render: (item) => item.label
                },
                { id: 'total', titulo: 'Total', tipo: 'numero', render: (item) => formatNumber(item.total) },
                { id: 'valor', titulo: 'Valor pedidos', tipo: 'valor', render: (item) => formatMoney(item.valor_total) }
              ]}
              itens={solicitacoesPorObra}
              getId={(item) => item.key}
              carregando={loading}
              storageKey="tabela:compras-demanda-pedidos:obras-solicitacoes"
              rotuloRolagem="Solicitacoes por obra/centro"
              vazio="Sem solicitacoes no periodo."
            />
          </BlocoConteudo>

          <BlocoConteudo titulo="Pedidos por obra/centro" descricao="Valor efetivamente pedido por origem operacional.">
            <TabelaPadrao
              colunas={[
                {
                  id: 'obra',
                  titulo: 'Obra/Centro',
                  // R17: a obra/centro NOMEIA a linha deste resumo.
                  tipo: 'identidade',
                  noCard: 'titulo',
                  render: (item) => item.label
                },
                { id: 'total', titulo: 'Pedidos', tipo: 'numero', render: (item) => formatNumber(item.total) },
                { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => formatMoney(item.valor_total) }
              ]}
              itens={pedidosPorObra}
              getId={(item) => item.key}
              carregando={loading}
              storageKey="tabela:compras-demanda-pedidos:obras-pedidos"
              rotuloRolagem="Pedidos por obra/centro"
              vazio="Sem pedidos no periodo."
            />
          </BlocoConteudo>
        </div>

        <BlocoConteudo
          titulo="Analitico de solicitacoes"
          contagem="Ultimas 100"
          descricao="Solicitacoes conforme os filtros aplicados."
          variante="primario"
          cor="var(--c-primary)"
        >
          <TabelaPadrao
            colunas={[
              {
                id: 'codigo',
                titulo: 'Codigo',
                // R17: o codigo da solicitacao NOMEIA o registro.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => (
                  <Link className="font-semibold text-[var(--c-primary)] hover:underline" to={`/solicitacoes-compra/${item.id}`}>
                    SC #{item.id}
                  </Link>
                )
              },
              { id: 'titulo', titulo: 'Titulo', tipo: 'texto', render: (item) => <span className="font-semibold text-[var(--c-text)]">{item.titulo || '-'}</span> },
              {
                id: 'status',
                titulo: 'Status',
                tipo: 'status',
                render: (item) => <StatusBadge status={item.status_label || '-'} />
              },
              { id: 'obra', titulo: 'Obra/Centro', tipo: 'texto', render: (item) => item.obra?.nome || '-' },
              { id: 'pedidos', titulo: 'Pedidos', tipo: 'numero', render: (item) => formatNumber(item.pedidos) },
              { id: 'valor', titulo: 'Valor pedidos', tipo: 'valor', render: (item) => formatMoney(item.valor_pedidos) },
              { id: 'criado', titulo: 'Criada em', tipo: 'data', render: (item) => formatDate(item.criado_em) }
            ]}
            itens={solicitacoes}
            carregando={loading}
            storageKey="tabela:compras-demanda-pedidos:solicitacoes"
            rotuloRolagem="Analitico de solicitacoes"
            vazio="Sem solicitacoes no periodo."
          />
        </BlocoConteudo>

        <BlocoConteudo
          titulo="Analitico de pedidos"
          contagem="Ultimos 100"
          descricao="Pedidos conforme os filtros aplicados."
        >
          <TabelaPadrao
            colunas={[
              {
                id: 'codigo',
                titulo: 'Pedido',
                // R17: o codigo do pedido NOMEIA o registro.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => (
                  <Link className="font-semibold text-[var(--c-primary)] hover:underline" to={`/pedidos-compra/${item.id}`}>
                    PC #{item.id}
                  </Link>
                )
              },
              {
                id: 'status',
                titulo: 'Status',
                tipo: 'status',
                render: (item) => <StatusBadge status={item.status_label || '-'} />
              },
              { id: 'solicitacao', titulo: 'Solicitacao', tipo: 'codigo', render: (item) => (item.solicitacao ? `SC #${item.solicitacao.id}` : '-') },
              { id: 'obra', titulo: 'Obra/Centro', tipo: 'texto', render: (item) => item.obra?.nome || '-' },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => formatMoney(item.valor_total) },
              { id: 'criado', titulo: 'Criado em', tipo: 'data', render: (item) => formatDate(item.criado_em) }
            ]}
            itens={pedidos}
            carregando={loading}
            storageKey="tabela:compras-demanda-pedidos:pedidos"
            rotuloRolagem="Analitico de pedidos"
            vazio="Sem pedidos no periodo."
          />
        </BlocoConteudo>
      </BlocosPersonalizaveis>
    </Pagina>
  );
}
