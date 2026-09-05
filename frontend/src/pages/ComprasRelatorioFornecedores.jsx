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
import { obterRelatorioFornecedoresCompras } from '../services/compras';
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

function formatHours(value) {
  if (value === null || value === undefined) {
    return '-';
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '-';
  }

  if (numeric < 24) {
    return `${numeric.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
  }

  return `${(numeric / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dia(s)`;
}

function respostaBadge(item) {
  const classificacao = item?.classificacao_resposta || 'SEM_AMOSTRA';
  if (classificacao === 'BAIXA_RESPOSTA') {
    return { label: 'Baixa resposta', className: 'badge badge-danger' };
  }
  if (classificacao === 'ATENCAO') {
    return { label: 'Atencao', className: 'badge badge-warning' };
  }
  if (classificacao === 'RESPONSIVO') {
    return { label: 'Responsivo', className: 'badge badge-success' };
  }
  return { label: 'Sem amostra', className: 'badge badge-muted' };
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar relatorio de fornecedores';
  }
}

export default function ComprasRelatorioFornecedores() {
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
        const data = await obterRelatorioFornecedoresCompras(filtrosAtivos);
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
  const fornecedores = useMemo(
    () => (Array.isArray(relatorio?.fornecedores) ? relatorio.fornecedores : []),
    [relatorio]
  );
  const fornecedoresBaixaResposta = useMemo(
    () => (Array.isArray(relatorio?.fornecedores_baixa_resposta) ? relatorio.fornecedores_baixa_resposta : []),
    [relatorio]
  );

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
          navegacao. Vira a seta `voltar` do PageHeader — mesma rota, mesma
          saida, na affordance que o sistema usa para retorno. */}
      <PageHeader
        titulo="Fornecedores"
        voltar={{ to: '/compras/relatorios', title: 'Voltar aos relatorios' }}
        contagem={`${formatNumber(fornecedores.length)} fornecedor(es) no recorte`}
        /* R23: agregacao pesada sobre cotacoes, respostas e itens — o
           recorte e RASCUNHO ate o clique, e a regra exige que a tela
           AVISE isso; sem o aviso a etiqueta marcada e lida como filtro
           ja aplicado. */
        descricao="Analise de participacao, resposta e vitorias por fornecedor no processo de cotacao. Marque o recorte e clique em Atualizar relatorio."
        acaoPrincipal={{
          rotulo: loading ? 'Atualizando...' : 'Atualizar relatorio',
          onClick: aplicarFiltros,
          desabilitada: loading
        }}
        secundarias={[{ rotulo: 'Limpar', onClick: limparFiltros }]}
      />

      <BlocoConteudo variante="secundario">
        {/* R12/R16b: obra e recorte enumeravel (marcacao + etiqueta); as
            datas sao contornos continuos, sem lista fechada — vao em
            `campos`, o espaco declarado da BarraFiltros para isso. */}
        <BarraFiltros
          campos={[
            {
              id: 'data_inicio',
              rotulo: 'Data inicial',
              tipo: 'date',
              valor: filtros.data_inicio,
              aoMudar: (valor) => atualizarCampo('data_inicio', valor)
            },
            {
              id: 'data_fim',
              rotulo: 'Data final',
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

      {/* A classe `.alert-danger` NAO EXISTE em CSS nenhum do repositorio: o
          erro de carregamento aparecia sem tom, sem icone e sem contorno de
          alerta. Agora e o Avisos do sistema (tom semantico + icone). */}
      <Avisos
        avisos={erro ? [{ id: 'fornecedores-erro', tipo: 'error', mensagem: erro }] : []}
        aoFechar={() => setErro('')}
      />

      <StatGrid colunas={3}>
        <StatTile
          label="Fornecedores"
          valor={formatNumber(resumo.fornecedores)}
          sub="Com cotacoes no periodo"
        />
        <StatTile
          label="Cotacoes enviadas"
          valor={formatNumber(resumo.cotacoes_enviadas)}
          sub="Participacoes registradas"
        />
        <StatTile
          label="Taxa de resposta"
          valor={formatPercent(resumo.taxa_resposta)}
          sub={`${formatNumber(resumo.cotacoes_respondidas)} respondida(s)`}
          tom="success"
        />
        <StatTile
          label="Sem resposta"
          valor={formatNumber(resumo.cotacoes_sem_resposta)}
          sub="Participacoes sem retorno"
          tom={Number(resumo.cotacoes_sem_resposta || 0) > 0 ? 'warning' : undefined}
        />
        <StatTile
          label="Baixa resposta"
          valor={formatNumber(resumo.fornecedores_baixa_resposta)}
          sub="Fornecedor(es) com amostra minima"
          tom={Number(resumo.fornecedores_baixa_resposta || 0) > 0 ? 'danger' : undefined}
        />
        <StatTile
          label="Valor vencedor"
          valor={formatMoney(resumo.valor_vencedor)}
          sub={`${formatNumber(resumo.itens_vencedores)} item(ns) vencedor(es)`}
        />
      </StatGrid>

      {/* R18: o `overflow-hidden` que embrulhava esta tabela criava um
          scrollport e matava o `position: sticky` da coluna fixa e do
          cabecalho — sem erro e sem falha de build. O BlocoConteudo nao
          recorta nada. */}
      <BlocoConteudo
        titulo="Fornecedores com menor taxa de resposta"
        descricao="Ranking gerado apenas por cotacoes enviadas e respostas registradas. Fornecedores com menos de 2 participacoes ficam fora desta lista."
      >
        <TabelaPadrao
          colunas={[
            {
              id: 'fornecedor',
              titulo: 'Fornecedor',
              // R17: o fornecedor NOMEIA a linha do ranking.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => (
                <div>
                  <strong>{item.fornecedor.nome}</strong>
                  <div className="text-xs text-[var(--c-muted)]">
                    {[item.fornecedor.cnpj, item.fornecedor.cidade, item.fornecedor.estado]
                      .filter(Boolean)
                      .join(' - ') || 'Sem dados complementares'}
                  </div>
                </div>
              )
            },
            { id: 'taxa_resposta', titulo: 'Taxa resposta', tipo: 'numero', render: (item) => <strong>{formatPercent(item.taxa_resposta)}</strong> },
            { id: 'sem_resposta', titulo: 'Sem resposta', tipo: 'numero', render: (item) => formatNumber(item.cotacoes_sem_resposta) },
            { id: 'cotacoes', titulo: 'Cotacoes', tipo: 'numero', render: (item) => formatNumber(item.cotacoes_enviadas) },
            { id: 'visualizacao', titulo: 'Visualizacao', tipo: 'numero', render: (item) => formatPercent(item.taxa_visualizacao) },
            { id: 'ultima_cotacao', titulo: 'Ultima cotacao', tipo: 'data', render: (item) => <span className="tabular-nums">{formatDate(item.ultima_cotacao)}</span> },
            {
              id: 'sinal',
              titulo: 'Sinal',
              tipo: 'badge',
              render: (item) => {
                const badge = respostaBadge(item);
                return <span className={badge.className}>{badge.label}</span>;
              }
            }
          ]}
          itens={fornecedoresBaixaResposta}
          getId={(item) => `risco-${item.fornecedor.id || item.fornecedor.nome}`}
          carregando={loading}
          storageKey="tabela:compras-fornecedores:baixa-resposta"
          rotuloRolagem="Fornecedores com menor taxa de resposta"
          vazio="Nenhum fornecedor com baixa resposta para os filtros selecionados."
        />
      </BlocoConteudo>

      <BlocoConteudo
        titulo="Base analitica de fornecedores"
        descricao="Participacao completa em cotacoes, respostas, itens e valores por fornecedor."
        variante="primario"
        cor="var(--c-primary)"
      >
        <TabelaPadrao
          colunas={[
            {
              id: 'fornecedor',
              titulo: 'Fornecedor',
              // R17: o fornecedor NOMEIA o registro desta base analitica.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => (
                <div>
                  <strong>{item.fornecedor.nome}</strong>
                  <div className="text-xs text-[var(--c-muted)]">
                    {[item.fornecedor.cnpj, item.fornecedor.cidade, item.fornecedor.estado]
                      .filter(Boolean)
                      .join(' - ') || 'Sem dados complementares'}
                  </div>
                </div>
              )
            },
            { id: 'cotacoes', titulo: 'Cotacoes', tipo: 'numero', render: (item) => formatNumber(item.cotacoes_enviadas) },
            {
              id: 'resposta',
              titulo: 'Resposta',
              tipo: 'numero',
              render: (item) => (
                <div>
                  <strong>{formatPercent(item.taxa_resposta)}</strong>
                  <div className="text-xs text-[var(--c-muted)]">
                    {formatNumber(item.cotacoes_respondidas)} de{' '}
                    {formatNumber(item.cotacoes_enviadas)}
                  </div>
                </div>
              )
            },
            { id: 'sem_resposta', titulo: 'Sem resposta', tipo: 'numero', render: (item) => formatNumber(item.cotacoes_sem_resposta) },
            { id: 'visualizacao', titulo: 'Visualizacao', tipo: 'numero', render: (item) => formatPercent(item.taxa_visualizacao) },
            { id: 'prazo', titulo: 'Prazo medio', tipo: 'numero', render: (item) => formatHours(item.prazo_medio_resposta_horas) },
            { id: 'itens_respondidos', titulo: 'Itens respondidos', tipo: 'numero', render: (item) => formatNumber(item.itens_respondidos) },
            { id: 'itens_vencedores', titulo: 'Itens vencedores', tipo: 'numero', render: (item) => formatNumber(item.itens_vencedores) },
            { id: 'valor_cotado', titulo: 'Valor cotado', tipo: 'valor', render: (item) => <span className="tabular-nums">{formatMoney(item.valor_cotado)}</span> },
            { id: 'valor_vencedor', titulo: 'Valor vencedor', tipo: 'valor', render: (item) => <span className="tabular-nums">{formatMoney(item.valor_vencedor)}</span> },
            { id: 'ultima_cotacao', titulo: 'Ultima cotacao', tipo: 'data', render: (item) => <span className="tabular-nums">{formatDate(item.ultima_cotacao)}</span> },
            {
              id: 'sinal',
              titulo: 'Sinal',
              tipo: 'badge',
              render: (item) => {
                const badge = respostaBadge(item);
                return <span className={badge.className}>{badge.label}</span>;
              }
            }
          ]}
          itens={fornecedores}
          getId={(item) => item.fornecedor.id || item.fornecedor.nome}
          carregando={loading}
          storageKey="tabela:compras-fornecedores:base-analitica"
          rotuloRolagem="Base analitica de fornecedores"
          vazio="Nenhum fornecedor encontrado para os filtros selecionados."
        />
      </BlocoConteudo>
    </Pagina>
  );
}
