import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Avisos,
  BarraFiltros,
  BlocoConteudo,
  CelulaDupla,
  Pagina,
  PageHeader,
  StatGrid,
  StatTile,
  TabelaPadrao,
  useAvisos
} from '../components/padrao';
import { listarAuditoriaItensPedidoCompra } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  pedido_id: '',
  item_id: '',
  acao: '',
  q: ''
};

// Sem a linha "Todas as acoes": no padrao de marcacao (R12) "todas" e a
// AUSENCIA de marca, e a etiqueta some junto. Uma opcao chamada "todas"
// dentro do menu voltaria a ser o select disfarcado.
const ACTION_OPTIONS = [
  { value: 'AJUSTE_MANUAL', label: 'Ajuste manual' },
  { value: 'ITEM_ADICIONADO', label: 'Item adicionado' },
  { value: 'ITEM_ADICIONADO_FORNECEDOR', label: 'Item adicionado do fornecedor' },
  { value: 'ITEM_ADICIONADO_MANUAL', label: 'Item adicionado manualmente' },
  { value: 'GERADO_DA_COTACAO', label: 'Gerado da cotacao' },
  { value: 'REMOVIDO', label: 'Item removido' }
];

const ACTION_LABELS = Object.fromEntries(
  ACTION_OPTIONS.map((item) => [item.value, item.label])
);

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR');
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '-';
  }

  return numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatActionLabel(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return ACTION_LABELS[normalized] || normalized.replace(/_/g, ' ') || '-';
}

function readFilters(searchParams) {
  return {
    obra_id: searchParams.get('obra_id') || '',
    pedido_id: searchParams.get('pedido_id') || '',
    item_id: searchParams.get('item_id') || '',
    acao: searchParams.get('acao') || '',
    q: searchParams.get('q') || ''
  };
}

function buildSearchParams(filters) {
  const params = new URLSearchParams();

  Object.entries(filters || {}).forEach(([key, value]) => {
    const normalized = String(value || '').trim();
    if (normalized) {
      params.set(key, normalized);
    }
  });

  return params;
}

// M1/R10: o tom da acao vem do token semantico (badge-info/muted/success),
// nunca de paleta escrita no className — cor de tela nao acompanha tema.
function actionClassName(value) {
  switch (String(value || '').toUpperCase()) {
    case 'AJUSTE_MANUAL':
      return 'badge badge-info';
    case 'REMOVIDO':
      return 'badge badge-muted';
    default:
      return 'badge badge-success';
  }
}

function formatFieldValue(field, value) {
  if (value == null || value === '') {
    return '-';
  }

  if (field === 'preco_unitario') {
    return formatMoney(value);
  }

  if (field === 'quantidade_pedido') {
    return formatNumber(value);
  }

  return String(value);
}

function buildChangeSummary(registro) {
  const anteriores = parseJson(registro?.dados_anteriores);
  const novos = parseJson(registro?.dados_novos);
  const parts = [];

  ['quantidade_pedido', 'preco_unitario', 'observacoes'].forEach((field) => {
    const before = anteriores?.[field];
    const after = novos?.[field];

    if (before == null && after == null) {
      return;
    }

    if (before === after) {
      parts.push(`${field}: ${formatFieldValue(field, after)}`);
      return;
    }

    parts.push(`${field}: ${formatFieldValue(field, before)} -> ${formatFieldValue(field, after)}`);
  });

  if (!parts.length && novos?.resposta_item_id) {
    parts.push(`Resposta vinculada: ${novos.resposta_item_id}`);
  }

  if (!parts.length && (anteriores || novos)) {
    parts.push(JSON.stringify(novos || anteriores));
  }

  return parts.join(' | ') || '-';
}

function normalizeAuditErrorMessage(error) {
  const message = String(error?.message || '').trim();

  if (/Cannot GET\s+\/api\/compras\/relatorios\/auditoria-itens-pedido/i.test(message)) {
    return 'A API de auditoria ainda nao esta disponivel no backend em execucao. Reinicie o backend para carregar a nova rota de auditoria de compras.';
  }

  if (/404/.test(message) && /auditoria-itens-pedido/i.test(message)) {
    return 'A rota de auditoria de compras nao foi encontrada no backend em execucao. Reinicie o backend para aplicar a nova rota.';
  }

  return message || 'Erro ao carregar auditoria de compras';
}

/**
 * TELA COMPARTILHADA — duas rotas servem este mesmo componente:
 * `/compras/relatorios/auditoria` (card "Auditoria de compras" da
 * ModuloRelatorios) e `/relatorios/administrativos` (destino do botao de
 * auditoria do PedidoCompraDetalhe). As duas passam pelos MESMOS guardas e
 * carregam os MESMOS dados: a tela nao le a rota nem muda de comportamento
 * conforme a origem — nada aqui supoe "vim de Compras".
 *
 * O que a faixa precisa dizer, entao, e o ASSUNTO — auditoria dos itens de
 * pedidos de compra —, porque NENHUMA das duas rotas tem no de menu, e o
 * breadcrumb para nas duas em "Inicio". Ver o relatorio da leva.
 */
export default function RelatoriosAdministrativos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtros, setFiltros] = useState(() => readFilters(searchParams));
  const [obras, setObras] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const { avisos, avisar, fechar } = useAvisos();

  useEffect(() => {
    let ativo = true;

    getMinhasObras()
      .then((data) => {
        if (!ativo) {
          return;
        }
        setObras(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error(error);
      });

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
        setErroCarregamento('');
        const data = await listarAuditoriaItensPedidoCompra(filtrosAtivos);
        if (!ativo) {
          return;
        }
        setRegistros(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        if (ativo) {
          setRegistros([]);
          const mensagem = normalizeAuditErrorMessage(error);
          setErroCarregamento(mensagem);
          // R3: a falha da consulta e EVENTO — faixa do sistema, com o tom
          // semantico e fechavel. O cartao vazio abaixo continua sendo a
          // CONDICAO (fecha e o problema continua), e por isso nao vira aviso.
          avisar.erro(mensagem);
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
  }, [searchParams, avisar]);

  const resumo = useMemo(() => {
    const pedidos = new Set();
    const itens = new Set();

    registros.forEach((registro) => {
      if (registro?.pedido?.id) {
        pedidos.add(registro.pedido.id);
      }
      if (registro?.item?.id) {
        itens.add(registro.item.id);
      }
    });

    return {
      total: registros.length,
      pedidos: pedidos.size,
      itens: itens.size,
      ultimaMovimentacao: registros[0]?.createdAt || null
    };
  }, [registros]);

  /*
    R12/R15: obra e acao sao recortes ENUMERAVEIS, entao viram marcacao com
    etiqueta removivel. `unico: true` nas duas porque o servico recebe UM
    valor por chave (`obra_id=`, `acao=`): a marca fica REDONDA e marcar
    outra substitui, em vez de prometer soma que o endpoint nao aceita.
  */
  const dimensoes = useMemo(() => [
    {
      id: 'obra_id',
      rotulo: 'Obra',
      unico: true,
      opcoes: obras.map((obra) => ({ valor: String(obra.id), rotulo: obra.nome }))
    },
    {
      id: 'acao',
      rotulo: 'Acao',
      unico: true,
      opcoes: ACTION_OPTIONS.map((opcao) => ({ valor: opcao.value, rotulo: opcao.label }))
    }
  ], [obras]);

  const ativos = useMemo(() => ({
    obra_id: new Set(filtros.obra_id ? [String(filtros.obra_id)] : []),
    acao: new Set(filtros.acao ? [String(filtros.acao)] : [])
  }), [filtros]);

  function atualizarFiltro(campo, valor) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }

  function alternarFiltro(dimensao, valor) {
    setFiltros((atual) => ({
      ...atual,
      [dimensao]: String(atual[dimensao]) === String(valor) ? '' : String(valor)
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
      {/*
        C2/R5: titulo em 22px e o apoio em UMA linha, na propria faixa.
        R23 (excecao declarada): quatro recortes combinaveis — obra, acao,
        pedido e item — passam do criterio de "consulta cara", entao a marca
        e RASCUNHO ate o clique em Buscar. A regra exige que a tela AVISE
        isso; sem o aviso a etiqueta apareceria antes de a lista mudar.
        D6/R11: o "Voltar aos pedidos" saiu — era navegacao disfarcada de
        acao na barra do cabecalho de uma LISTAGEM.
      */}
      <PageHeader
        titulo="Relatorios Administrativos"
        descricao="Auditoria dos itens de pedidos de compra: marque o recorte e clique em Buscar."
        acaoPrincipal={{
          rotulo: loading ? 'Buscando...' : 'Buscar',
          onClick: aplicarFiltros,
          desabilitada: loading
        }}
        secundarias={[{ rotulo: 'Limpar filtros', onClick: limparFiltros }]}
      />

      <Avisos avisos={avisos} aoFechar={fechar} />

      {/* Bloco 1 — ACAO: montar o recorte. */}
      <BlocoConteudo variante="secundario">
        {/*
          F1/R16: UMA busca, ocupando a largura da faixa. Pedido e item sao
          identificadores digitados (nao ha lista fechada), entao vao em
          `campos`; obra e acao ficam na marcacao.
        */}
        <BarraFiltros
          busca={{
            valor: filtros.q,
            aoMudar: (valor) => atualizarFiltro('q', valor),
            placeholder: 'Pedido, item, obra, usuario ou descricao'
          }}
          campos={[
            {
              id: 'pedido_id',
              rotulo: 'Pedido',
              tipo: 'number',
              valor: filtros.pedido_id,
              aoMudar: (valor) => atualizarFiltro('pedido_id', valor)
            },
            {
              id: 'item_id',
              rotulo: 'Item',
              tipo: 'number',
              valor: filtros.item_id,
              aoMudar: (valor) => atualizarFiltro('item_id', valor)
            }
          ]}
          filtros={dimensoes}
          ativos={ativos}
          aoAlternar={alternarFiltro}
          /* R16: UM dono para "limpar" — o botao do cabecalho. O "Limpar
             tudo" da barra seria o segundo, com o mesmo efeito. As etiquetas
             seguem removiveis uma a uma (F3). */
        />
      </BlocoConteudo>

      {/* Bloco 2 — CONTEXTO: o que o recorte devolveu. */}
      <StatGrid>
        <StatTile label="Registros" valor={resumo.total} sub="Movimentacoes listadas" />
        <StatTile label="Pedidos afetados" valor={resumo.pedidos} sub="Pedidos com log visivel" />
        <StatTile label="Itens afetados" valor={resumo.itens} sub="Itens com historico no filtro" />
        <StatTile
          label="Ultima movimentacao"
          valor={formatDateTime(resumo.ultimaMovimentacao)}
          sub="Ordenacao decrescente por data"
        />
      </StatGrid>

      {/* Bloco 3 — HISTORICO, por ultimo (ordem de blocos decidida pelo cliente). */}
      <BlocoConteudo
        titulo="Historico de alteracoes"
        descricao="Esta area sera expandida para relatorios operacionais, de compras e financeiros sem misturar o fluxo transacional das telas operacionais."
        variante="primario"
        cor="var(--c-primary)"
      >
        {erroCarregamento && !loading ? (
          <div className="app-empty-card">
            A tela esta pronta, mas a consulta depende do backend com a rota de auditoria ativa.
          </div>
        ) : (
          <TabelaPadrao
            colunas={[
              {
                id: 'data',
                titulo: 'Data',
                tipo: 'data',
                render: (registro) => formatDateTime(registro.createdAt)
              },
              {
                id: 'acao',
                titulo: 'Acao',
                tipo: 'badge',
                render: (registro) => (
                  <span className={actionClassName(registro.acao)}>{formatActionLabel(registro.acao)}</span>
                )
              },
              {
                id: 'pedido',
                titulo: 'Pedido / obra',
                // R17: o pedido (com a obra) nomeia o registro auditado.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (registro) => (
                  <CelulaDupla
                    principal={registro.pedido?.codigo || '-'}
                    sub={`${registro.pedido?.obra?.nome || '-'}${registro.pedido?.obra?.codigo ? ` - ${registro.pedido.obra.codigo}` : ''}`}
                  />
                )
              },
              {
                id: 'item',
                titulo: 'Item',
                tipo: 'texto',
                render: (registro) => (
                  <CelulaDupla
                    principal={registro.item?.descricao || '-'}
                    sub={`${registro.item?.origem || '-'}${registro.item?.unidade ? ` - ${registro.item.unidade}` : ''}`}
                  />
                )
              },
              {
                id: 'usuario',
                titulo: 'Usuario',
                tipo: 'texto',
                render: (registro) => registro.usuario?.nome || 'Sistema'
              },
              {
                id: 'detalhes',
                titulo: 'Detalhes',
                tipo: 'texto',
                render: (registro) => (
                  <CelulaDupla
                    principal={registro.descricao || '-'}
                    sub={buildChangeSummary(registro)}
                  />
                )
              }
            ]}
            itens={registros}
            getId={(registro) => registro.id}
            carregando={loading}
            storageKey="tabela:relatorios-administrativos:auditoria"
            rotuloRolagem="Historico de alteracoes"
            vazio="Nenhum registro de auditoria encontrado para os filtros informados."
            /* A1: a acao da linha e um link focavel — quem nao usa mouse
               chega nela pelo teclado sem depender do clique na linha. */
            acoesLinha={(registro) => (
              registro.pedido?.id ? (
                <Link to={`/pedidos-compra/${registro.pedido.id}`} className="btn btn-outline">
                  Abrir pedido
                </Link>
              ) : (
                <span className="text-xs text-[var(--c-muted)]">Sem pedido</span>
              )
            )}
            larguraAcoes={160}
          />
        )}
      </BlocoConteudo>
    </Pagina>
  );
}
