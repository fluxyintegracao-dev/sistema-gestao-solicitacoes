import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Avisos,
  BarraFiltros,
  BlocoConteudo,
  BlocosPersonalizaveis,
  Pagina,
  PageHeader,
  StatGrid,
  StatTile,
  TabelaPadrao
} from '../components/padrao';
import { obterRelatorioCicloCompras } from '../services/compras';
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

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar ciclo de compras';
  }
}

/**
 * BARRA DE PROPORCAO — a "biblioteca de grafico" aqui e uma div com largura
 * percentual, e a largura em % e DADO (a proporcao da etapa), nao medida de
 * layout: por isso continua no `style` e nao vira degrau da escala (R10).
 *
 * O ZERO NAO DESENHA (correcao de 04/09). A versao anterior calculava
 * `Math.max(4, pct)` sem guarda: uma etapa com valor ZERO saia com 4% de
 * barra pintada — barra visivel afirmando que existe tempo onde nao existe
 * nenhum. O piso de 4% tem um proposito legitimo (valor pequeno porem real
 * precisa aparecer), mas ele so vale DEPOIS de o valor ser maior que zero.
 * Agora: zero desenha trilho vazio; qualquer valor positivo tem no minimo
 * 4% para nao sumir. Cor do trilho e do preenchimento saem de token (R25).
 */
function BarraProporcao({ valor, maximo }) {
  const numero = Number(valor || 0);
  const proporcao = maximo > 0 ? (numero / maximo) * 100 : 0;
  const largura = numero > 0 ? Math.max(4, proporcao) : 0;
  return (
    <div className="h-2 rounded-full bg-[var(--ui-border)] overflow-clip">
      <div className="h-full rounded-full bg-[var(--c-primary)]" style={{ width: `${largura}%` }} />
    </div>
  );
}

export default function ComprasRelatorioCiclo() {
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
        const data = await obterRelatorioCicloCompras(filtrosAtivos);
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
  const solicitacoes = useMemo(
    () => (Array.isArray(relatorio?.solicitacoes) ? relatorio.solicitacoes : []),
    [relatorio]
  );
  const etapasCiclo = useMemo(() => ([
    {
      key: 'criacao_liberacao',
      label: 'Criacao ate liberacao',
      value: resumo.tempo_medio_criacao_liberacao_horas,
      detail: 'Pedido revisado e liberado para compras'
    },
    {
      key: 'liberacao_envio',
      label: 'Liberacao ate envio',
      value: resumo.tempo_medio_liberacao_envio_horas,
      detail: 'Tempo ate primeiro fornecedor receber cotacao'
    },
    {
      key: 'envio_resposta',
      label: 'Envio ate primeira resposta',
      value: resumo.tempo_medio_envio_primeira_resposta_horas,
      detail: 'Resposta inicial dos fornecedores'
    },
    {
      key: 'criacao_encerramento',
      label: 'Criacao ate encerramento',
      value: resumo.tempo_medio_criacao_encerramento_horas,
      detail: 'Tempo medio ate fechar a cotacao'
    },
    {
      key: 'ciclo_pedido',
      label: 'Ciclo ate pedido',
      value: resumo.tempo_medio_ciclo_total_ate_pedido_horas,
      detail: 'Tempo medio ate existir pedido de compra'
    }
  ]).filter((etapa) => etapa.value !== null && etapa.value !== undefined), [resumo]);
  const maiorTempoEtapa = useMemo(
    () => Math.max(...etapasCiclo.map((etapa) => Number(etapa.value || 0)), 0),
    [etapasCiclo]
  );

  /*
    R12: a obra deixou de ser `<select>` e virou MARCACAO. `unico: true`
    porque o endpoint recebe UM `obra_id` (`parseInteger` no validador do
    backend, com `ensureAllowedKeys` limitando a chave a um valor): sem
    declarar, o menu abriria com caixa quadrada prometendo escolha multipla
    e, com duas marcas, a tela mandaria filtro nenhum — duas etiquetas na
    faixa e a lista sem estreitar (R15: forma do controle tem de dizer o
    que ele aceita).
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
      {/* R11: "Voltar aos relatorios" era um botao de acao fazendo o papel de
          navegacao. Vira a seta `voltar` do PageHeader — mesma rota, mesma
          saida, na affordance que o sistema usa para retorno. */}
      <PageHeader
        titulo="Ciclo de Compras"
        voltar={{ to: '/compras/relatorios', title: 'Voltar aos relatorios' }}
        contagem={`${formatNumber(solicitacoes.length)} solicitacao(oes) no recorte`}
        /* R23: agregacao pesada sobre solicitacao, cotacao e pedido — o
           recorte e RASCUNHO ate o clique, e a regra exige que a tela
           AVISE isso; sem o aviso a etiqueta aparece marcada e a pessoa le
           como filtro ja aplicado. */
        descricao="Tempo real do processo entre solicitacao, liberacao, cotacao, encerramento e pedido. Marque o recorte e clique em Atualizar relatorio."
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
              rotulo: 'Criacao inicial',
              tipo: 'date',
              valor: filtros.data_inicio,
              aoMudar: (valor) => atualizarCampo('data_inicio', valor)
            },
            {
              id: 'data_fim',
              rotulo: 'Criacao final',
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
        avisos={erro ? [{ id: 'ciclo-erro', tipo: 'error', mensagem: erro }] : []}
        aoFechar={() => setErro('')}
      />

      <StatGrid>
        <StatTile
          label="Solicitacoes"
          valor={formatNumber(resumo.solicitacoes)}
          sub="Criadas no periodo"
        />
        <StatTile
          label="Resposta fornecedor"
          valor={formatPercent(resumo.taxa_resposta_fornecedor)}
          sub={`${formatNumber(resumo.fornecedores_respondidos)} de ${formatNumber(resumo.fornecedores_enviados)}`}
          tom="success"
        />
        <StatTile
          label="Criacao ate encerramento"
          valor={formatHours(resumo.tempo_medio_criacao_encerramento_horas)}
          sub="Tempo medio das cotacoes encerradas"
          tom="warning"
        />
        <StatTile
          label="Ciclo ate pedido"
          valor={formatHours(resumo.tempo_medio_ciclo_total_ate_pedido_horas)}
          sub={`${formatNumber(resumo.solicitacoes_com_pedido)} com pedido`}
        />
      </StatGrid>

      {/*
        BLOCOS PERSONALIZÁVEIS (05/09). Tela de relatório/painel é o grupo
        em que ligar isto é SEGURO: estes 3 blocos são leituras
        independentes — sem ordem obrigatória entre si, sem botão de gravar
        dentro e sem campo obrigatório que ocultar esconda. O padrão continua
        sendo o do código; a preferência guarda só o DESVIO. No celular o
        modo não existe (arrastar é HTML5 nativo e não responde a toque).
      */}
      <BlocosPersonalizaveis chave="blocos:compras-relatorio-ciclo" larguraPadrao="total">
        <BlocoConteudo
          titulo="Ciclo medio por etapa"
          descricao="Gargalos do processo calculados pelas datas reais registradas na solicitacao, cotacao e pedido."
        >
          {loading ? (
            <div className="app-empty-card">Carregando etapas do ciclo...</div>
          ) : etapasCiclo.length === 0 ? (
            <div className="app-empty-card">Sem datas suficientes para montar o grafico do ciclo.</div>
          ) : (
            <div className="grid gap-3">
              {etapasCiclo.map((etapa) => (
                <div key={`ciclo-etapa-${etapa.key}`} className="grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="text-sm text-[var(--c-text)]">{etapa.label}</strong>
                      <span className="ml-2 text-xs text-[var(--c-muted)]">{etapa.detail}</span>
                    </div>
                    <strong className="text-sm tabular-nums text-[var(--c-text)]">{formatHours(etapa.value)}</strong>
                  </div>
                  <BarraProporcao valor={etapa.value} maximo={maiorTempoEtapa} />
                </div>
              ))}
            </div>
          )}
        </BlocoConteudo>

        {/* Estes tres tempos JA aparecem no grafico acima (mesma origem, mesmo
            numero). Ficam porque a reorganizacao e pura — a proposta de
            remover a segunda aparicao esta no relatorio, nao no codigo. */}
        <BlocoConteudo titulo="Etapas iniciais em numeros" variante="secundario">
          <StatGrid colunas={3}>
            <StatTile
              label="Criacao ate liberacao"
              valor={formatHours(resumo.tempo_medio_criacao_liberacao_horas)}
              sub="Tempo medio"
            />
            <StatTile
              label="Liberacao ate primeiro envio"
              valor={formatHours(resumo.tempo_medio_liberacao_envio_horas)}
              sub="Tempo medio"
            />
            <StatTile
              label="Envio ate primeira resposta"
              valor={formatHours(resumo.tempo_medio_envio_primeira_resposta_horas)}
              sub="Tempo medio"
            />
          </StatGrid>
        </BlocoConteudo>

        {/* R18: o `overflow-hidden` que embrulhava esta tabela criava um
            scrollport e matava o `position: sticky` da coluna fixa e do
            cabecalho — sem erro, sem falha de build. O BlocoConteudo nao
            recorta nada; quem precisa rolar e o proprio contêiner da tabela. */}
        <BlocoConteudo
          titulo="Ciclo por solicitacao"
          descricao="Cada solicitacao com os tempos reais entre criacao, encerramento e pedido."
          variante="primario"
          cor="var(--c-primary)"
        >
          <TabelaPadrao
            colunas={[
              {
                id: 'solicitacao',
                titulo: 'Solicitacao',
                // R17: a solicitacao NOMEIA o registro desta linha.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (linha) => (
                  <div>
                    <strong>SC #{linha.solicitacao.id}</strong>
                    <div className="text-xs text-[var(--c-muted)]">{linha.solicitacao.titulo || 'Sem titulo'}</div>
                  </div>
                )
              },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (linha) => linha.solicitacao.status },
              {
                id: 'datas',
                titulo: 'Datas',
                tipo: 'texto',
                render: (linha) => (
                  <div>
                    <div>Criada: {formatDate(linha.solicitacao.criado_em)}</div>
                    <div className="text-xs text-[var(--c-muted)]">Encerrada: {formatDate(linha.solicitacao.encerrado_em)}</div>
                  </div>
                )
              },
              {
                id: 'fornecedores',
                titulo: 'Fornecedores',
                tipo: 'numero',
                render: (linha) => (
                  <>
                    {formatNumber(linha.contadores.fornecedores_respondidos)} de{' '}
                    {formatNumber(linha.contadores.fornecedores_enviados)}
                  </>
                )
              },
              { id: 'criacao_encerramento', titulo: 'Criacao → encerramento', tipo: 'numero', render: (linha) => formatHours(linha.tempos.criacao_para_encerramento_horas) },
              { id: 'encerramento_pedido', titulo: 'Encerramento → pedido', tipo: 'numero', render: (linha) => formatHours(linha.tempos.encerramento_para_pedido_horas) },
              { id: 'ciclo_total', titulo: 'Ciclo total', tipo: 'numero', render: (linha) => formatHours(linha.tempos.ciclo_total_ate_pedido_horas) }
            ]}
            itens={solicitacoes}
            getId={(linha) => linha.solicitacao.id}
            carregando={loading}
            storageKey="tabela:compras-ciclo:solicitacoes"
            rotuloRolagem="Ciclo por solicitacao"
            vazio="Nenhuma solicitacao encontrada para os filtros selecionados."
          />
        </BlocoConteudo>
      </BlocosPersonalizaveis>
    </Pagina>
  );
}
