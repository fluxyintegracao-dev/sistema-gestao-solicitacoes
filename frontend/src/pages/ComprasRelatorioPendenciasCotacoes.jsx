import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Avisos,
  BarraFiltros,
  BlocoConteudo,
  Pagina,
  PageHeader,
  StatGrid,
  StatTile,
  TabelaPadrao,
  useAvisos
} from '../components/padrao';
import StatusBadge from '../components/StatusBadge';
import { obterRelatorioPendenciasCotacoesCompras } from '../services/compras';
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

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
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
    return message || 'Erro ao carregar pendencias de cotacoes';
  }
}

export default function ComprasRelatorioPendenciasCotacoes() {
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
        const data = await obterRelatorioPendenciasCotacoesCompras(filtrosAtivos);
        if (ativo) {
          setRelatorio(data);
        }
      } catch (error) {
        console.error(error);
        if (ativo) {
          setRelatorio(null);
          // R19: a falha da consulta vira faixa do sistema (Avisos), não
          // caixa de paleta crua montada à mão dentro da página.
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
  const cotacoes = useMemo(() => (Array.isArray(relatorio?.cotacoes) ? relatorio.cotacoes : []), [relatorio]);
  const fornecedoresVencidos = useMemo(() => (
    Array.isArray(relatorio?.fornecedores_vencidos) ? relatorio.fornecedores_vencidos : []
  ), [relatorio]);
  const obrasResumo = useMemo(() => (Array.isArray(relatorio?.obras) ? relatorio.obras : []), [relatorio]);

  /*
    R12: o recorte por obra/centro era um `<select>` de escolha única — com
    ele o estado do filtro só aparece abrindo a lista. Agora é marcação com
    etiqueta removível na BarraFiltros; as duas datas são recorte CONTÍNUO
    (não têm lista fechada de opções) e vão em `campos`, o espaço declarado
    da R16b.
  */
  const ativos = useMemo(() => ({
    obra_id: new Set(filtros.obra_id ? [String(filtros.obra_id)] : [])
  }), [filtros.obra_id]);

  /*
    `unico: true` porque o SERVIÇO só aceita um valor: o backend valida
    `obra_id` com `parseInteger` (validateCompraRelatorioPendenciasCotacoesQuery).
    Sem declarar, a caixa sairia QUADRADA prometendo múltipla escolha para um
    parâmetro escalar — capacidade aparente sem efeito (R15).
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
    R23: com 1 dimensão marcável + 2 datas esta tela NÃO alcança o critério
    da consulta cara (4+ dimensões), então o recorte APLICA AO MARCAR — a
    etiqueta na faixa nunca afirma um filtro que ainda não está valendo. O
    botão "Atualizar relatorio" continua existindo e continua sendo uma ação
    de verdade: recarrega o recorte atual (pendência é dado que muda sozinho
    com a passagem do prazo).
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
        titulo="Pendencias de Cotacoes"
        contagem="Compras / Relatorios"
        descricao="Cotacoes sem minimo de respostas e fornecedores com prazo vencido sem resposta."
        /* R11: o caminho de volta ao hub de relatórios continua existindo,
           mas na seta do cabeçalho — não como botão na barra de ações, onde
           navegação se veste de ação (C6). */
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
              rotulo: 'Cotacao criada de',
              tipo: 'date',
              valor: filtros.data_inicio,
              aoMudar: (valor) => mudarCampo('data_inicio', valor)
            },
            {
              id: 'data_fim',
              rotulo: 'Cotacao criada ate',
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
        <StatTile label="Cotacoes" valor={formatNumber(resumo.cotacoes)} sub="Com fornecedores enviados" />
        <StatTile
          label="Sem minimo"
          valor={formatNumber(resumo.cotacoes_sem_minimo)}
          sub={`Minimo atual: ${formatNumber(resumo.minimo_cotacoes)}`}
          tom={Number(resumo.cotacoes_sem_minimo || 0) > 0 ? 'warning' : undefined}
        />
        <StatTile
          label="Prazo vencido"
          valor={formatNumber(resumo.cotacoes_com_prazo_vencido)}
          sub="Cotacoes com fornecedor atrasado"
          tom={Number(resumo.cotacoes_com_prazo_vencido || 0) > 0 ? 'danger' : undefined}
        />
        <StatTile
          label="Fornecedores vencidos"
          valor={formatNumber(resumo.fornecedores_vencidos_sem_resposta)}
          sub="Sem resposta ate o prazo"
          tom={Number(resumo.fornecedores_vencidos_sem_resposta || 0) > 0 ? 'danger' : undefined}
        />
        <StatTile label="Taxa resposta" valor={formatPercent(resumo.taxa_resposta)} sub="Respondidos sobre enviados" />
      </StatGrid>

      {/* R18: o `overflow-hidden` que envolvia estas tabelas criava um
          scrollport e matava o `position: sticky` do cabeçalho fixo e da
          coluna fixa — sem erro nenhum no console. O BlocoConteudo não
          recorta; onde precisar cortar, o idioma é `overflow: clip`. */}
      <BlocoConteudo
        titulo="Cotacoes com pendencias"
        contagem="Top 100"
        descricao="Cotacoes priorizadas por prazo vencido e falta de respostas minimas."
        variante="primario"
        cor="var(--c-primary)"
      >
        <TabelaPadrao
          colunas={[
            {
              id: 'cotacao',
              titulo: 'Cotacao',
              // R17: a cotacao (SC) NOMEIA o registro.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => (
                <Link className="font-semibold text-[var(--c-primary)] hover:underline" to={`/solicitacoes-compra/${item.id}`}>
                  SC #{item.id}
                </Link>
              )
            },
            { id: 'titulo', titulo: 'Titulo', tipo: 'texto', render: (item) => <span className="font-semibold text-[var(--c-text)]">{item.titulo || '-'}</span> },
            { id: 'obra', titulo: 'Obra/Centro', tipo: 'texto', render: (item) => item.obra?.nome || '-' },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'status',
              render: (item) => <StatusBadge status={item.status || '-'} />
            },
            { id: 'fornecedores', titulo: 'Enviados', tipo: 'numero', render: (item) => formatNumber(item.fornecedores_enviados) },
            { id: 'respostas', titulo: 'Respostas', tipo: 'numero', render: (item) => `${formatNumber(item.fornecedores_respondidos)} / ${formatNumber(item.minimo_cotacoes)}` },
            {
              id: 'pendencias',
              titulo: 'Pendencias',
              tipo: 'badge',
              /*
                R25: o `PendenciaBadge` local cravava a paleta do Tailwind
                (amber/red) na tela. As duas pendências não perderam a
                distinção — ganharam FAMÍLIA SEMÂNTICA explícita no
                StatusBadge do sistema: falta de mínimo é `warning`
                (pendência, ainda dá para agir), prazo vencido é `danger`
                (o prazo já passou). E vêm com ícone, porque cor sozinha não
                comunica para daltônicos.
              */
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  {item.sem_minimo ? <StatusBadge status="Sem minimo" kind="warning" /> : null}
                  {item.prazo_vencido ? <StatusBadge status="Prazo vencido" kind="danger" /> : null}
                </div>
              )
            },
            { id: 'criada', titulo: 'Criada em', tipo: 'data', render: (item) => formatDate(item.criada_em) }
          ]}
          itens={cotacoes}
          carregando={loading}
          storageKey="tabela:compras-pendencias-cotacoes:cotacoes"
          rotuloRolagem="Cotacoes com pendencias"
          vazio="Sem cotacoes com fornecedores nos filtros."
        />
      </BlocoConteudo>

      <div className="grid gap-4 xl:grid-cols-2">
        <BlocoConteudo
          titulo="Fornecedores vencidos sem resposta"
          descricao="Fornecedores com prazo de resposta anterior a hoje e sem resposta registrada."
        >
          <TabelaPadrao
            colunas={[
              {
                id: 'cotacao',
                titulo: 'Cotacao',
                tipo: 'codigo',
                render: (item) => (
                  <Link className="font-semibold text-[var(--c-primary)] hover:underline" to={`/solicitacoes-compra/${item.cotacao_id}`}>
                    SC #{item.cotacao_id}
                  </Link>
                )
              },
              {
                id: 'fornecedor',
                titulo: 'Fornecedor',
                // R17: o fornecedor NOMEIA a pendencia listada.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.fornecedor_nome
              },
              { id: 'obra', titulo: 'Obra/Centro', tipo: 'texto', render: (item) => item.obra?.nome || '-' },
              { id: 'enviado', titulo: 'Enviado', tipo: 'data', render: (item) => formatDate(item.enviado_em) },
              { id: 'visualizado', titulo: 'Visualizado', tipo: 'data', render: (item) => formatDate(item.visualizado_em) },
              { id: 'prazo', titulo: 'Prazo', tipo: 'data', render: (item) => <span className="font-semibold text-[var(--c-danger)]">{formatDate(item.prazo_resposta)}</span> }
            ]}
            itens={fornecedoresVencidos}
            getId={(item) => `${item.cotacao_id}-${item.fornecedor_id || item.fornecedor_nome}`}
            carregando={loading}
            storageKey="tabela:compras-pendencias-cotacoes:fornecedores-vencidos"
            rotuloRolagem="Fornecedores vencidos sem resposta"
            vazio="Sem fornecedores vencidos sem resposta."
          />
        </BlocoConteudo>

        <BlocoConteudo
          titulo="Pendencias por obra/centro"
          descricao="Onde estao concentradas cotacoes sem minimo e com prazo vencido."
        >
          <TabelaPadrao
            colunas={[
              {
                id: 'obra',
                titulo: 'Obra/Centro',
                // R17: a obra/centro NOMEIA a linha deste resumo.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.obra_nome
              },
              { id: 'cotacoes', titulo: 'Cotacoes', tipo: 'numero', render: (item) => formatNumber(item.cotacoes) },
              { id: 'sem_minimo', titulo: 'Sem minimo', tipo: 'numero', render: (item) => formatNumber(item.sem_minimo) },
              { id: 'vencidas', titulo: 'Vencidas', tipo: 'numero', render: (item) => formatNumber(item.vencidas) }
            ]}
            itens={obrasResumo}
            getId={(item) => item.key}
            carregando={loading}
            storageKey="tabela:compras-pendencias-cotacoes:obras"
            rotuloRolagem="Pendencias por obra/centro"
            vazio="Sem pendencias por obra/centro."
          />
        </BlocoConteudo>
      </div>
    </Pagina>
  );
}
