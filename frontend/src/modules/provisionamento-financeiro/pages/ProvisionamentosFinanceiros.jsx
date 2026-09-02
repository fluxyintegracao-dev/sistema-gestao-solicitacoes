import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiAdjustmentsHorizontal } from 'react-icons/hi2';
import {
  getProvisionamentoFinanceiroContexto,
  listarCategoriasMacroProvisionamento,
  listarProvisoesFinanceiras
} from '../../../services/provisoesFinanceiras';
import { TabelaPadrao } from '../../../components/padrao';
import { formatarMoedaBRL } from '../utils/moeda';

const DEFAULT_FILTERS = {
  obra_id: '',
  categoria_macro_id: '',
  status: '',
  prioridade: '',
  busca: '',
  fornecedor: '',
  usuario_criacao_id: '',
  data_inicial: '',
  data_final: ''
};

const FILTER_OPTIONS = [
  { id: 'obra_id', label: 'Obra' },
  { id: 'categoria_macro_id', label: 'Item macro' },
  { id: 'prioridade', label: 'Prioridade' },
  { id: 'busca', label: 'Busca' },
  { id: 'fornecedor', label: 'Credor' },
  { id: 'usuario_criacao_id', label: 'Criador' },
  { id: 'data_inicial', label: 'Data inicial' },
  { id: 'data_final', label: 'Data final' }
];

/* A consulta continua pedindo ao servidor a ordem PADRÃO da lista
   (desembolso mais próximo primeiro), como antes. Do primeiro clique num
   título em diante quem ordena é a TabelaPadrao — por isso `alternarOrdenacao`
   e o indicador à mão saíram: a ordem virou capacidade do componente. */
const ORDENACAO_PADRAO = {
  sort_by: 'data_prevista_desembolso',
  sort_dir: 'ASC'
};

/* A lista é PAGINADA NO SERVIDOR: ordenar só a página à vista faria o
   usuário ler "as maiores provisões" quando são apenas as maiores daquelas
   25. Por isso o clique no cabeçalho reconsulta o backend — o mapa liga a
   coluna da tabela ao campo que a API ordena. */
const CAMPO_ORDENACAO_POR_COLUNA = {
  obra: 'obra_nome',
  data_prevista: 'data_prevista_desembolso',
  categoria: 'categoria_nome',
  descricao: 'descricao',
  fornecedor: 'fornecedor_nome',
  valor: 'valor_previsto',
  status: 'status'
};

// Uma chave só: a TabelaPadrao guarda nela a escolha de colunas (quais e em
// que ordem, no painel "Colunas") e as larguras. Substitui o painel de
// colunas próprio da tela (`colunasVisiveis`/`toggleColuna`).
const STORAGE_KEY = 'tabela:provisionamentos-financeiros';

const DEFAULT_VISIBLE_FILTERS = FILTER_OPTIONS.map((item) => item.id);

function formatarData(valor) {
  if (!valor) return '-';
  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return '-';
}

function formatarObra(obra) {
  if (!obra) return '-';
  return `${obra.codigo ? `${obra.codigo} - ` : ''}${obra.nome}`;
}

function formatarStatus(valor) {
  const normalized = String(valor || '').toLowerCase();
  const labels = {
    previsto: 'Previsto',
    em_analise: 'Em analise',
    aprovado: 'Aprovado',
    cancelado: 'Cancelado',
    realizado: 'Realizado'
  };
  return labels[normalized] || '-';
}

function formatarPrioridade(valor) {
  const normalized = String(valor || '').toLowerCase();
  const labels = {
    baixa: 'Baixa',
    media: 'Media',
    alta: 'Alta',
    critica: 'Critica'
  };
  return labels[normalized] || '-';
}

function ResumoCard({ titulo, valor }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-white px-4 py-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-[var(--c-muted)]">{titulo}</div>
      <div className="mt-2 text-xl font-semibold">{valor}</div>
    </div>
  );
}

export default function ProvisionamentosFinanceiros() {
  const navigate = useNavigate();
  const [contexto, setContexto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [lista, setLista] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [resumo, setResumo] = useState({ total_registros_filtrados: 0, valor_total_filtrado: 0 });
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingLista, setLoadingLista] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState(DEFAULT_FILTERS);
  const [ordenacao, setOrdenacao] = useState(ORDENACAO_PADRAO);
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(DEFAULT_VISIBLE_FILTERS);

  useEffect(() => {
    async function carregarBase() {
      try {
        setLoadingBase(true);
        const [contextoData, categoriasData] = await Promise.all([
          getProvisionamentoFinanceiroContexto(),
          listarCategoriasMacroProvisionamento()
        ]);
        setContexto(contextoData);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      } catch (error) {
        console.error(error);
        alert(error?.message || 'Erro ao carregar o modulo de provisoes.');
      } finally {
        setLoadingBase(false);
      }
    }

    carregarBase();
  }, []);

  useEffect(() => {
    if (!contexto) return;

    async function carregarLista() {
      try {
        setLoadingLista(true);
        const data = await listarProvisoesFinanceiras({
          ...filtros,
          ...ordenacao,
          page: meta.page,
          limit: meta.limit
        });

        setLista(Array.isArray(data?.items) ? data.items : []);
        setMeta((atual) => ({
          ...atual,
          page: Number(data?.meta?.page || atual.page || 1),
          limit: Number(data?.meta?.limit || atual.limit || 25),
          total: Number(data?.meta?.total || 0),
          pages: Number(data?.meta?.pages || 0)
        }));
        setResumo({
          total_registros_filtrados: Number(data?.resumo?.total_registros_filtrados || 0),
          valor_total_filtrado: Number(data?.resumo?.valor_total_filtrado || 0)
        });
      } catch (error) {
        console.error(error);
        alert(error?.message || 'Erro ao listar provisoes.');
      } finally {
        setLoadingLista(false);
      }
    }

    carregarLista();
  }, [contexto, filtros, ordenacao, meta.page, meta.limit]);

  const obrasAcesso = useMemo(() => (
    Array.isArray(contexto?.obras_acesso) ? contexto.obras_acesso : []
  ), [contexto]);

  const criadoresFiltro = useMemo(() => (
    Array.isArray(contexto?.criadores_filtro) ? contexto.criadores_filtro : []
  ), [contexto]);

  function atualizarFiltro(campo, valor) {
    setMeta((atual) => ({ ...atual, page: 1 }));
    setFiltros((atual) => ({ ...atual, [campo]: valor ?? '' }));
  }

  function limparFiltros() {
    setMeta((atual) => ({ ...atual, page: 1 }));
    setFiltros(DEFAULT_FILTERS);
  }

  function toggleFiltro(id) {
    setFiltrosVisiveis((atual) => (
      atual.includes(id)
        ? atual.filter((item) => item !== id)
        : [...atual, id]
    ));
  }

  function renderFiltro(id) {
    switch (id) {
      case 'obra_id':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Obra
            <select className="input" value={filtros.obra_id} onChange={(event) => atualizarFiltro('obra_id', event.target.value)}>
              <option value="">Todas</option>
              {obrasAcesso.map((obra) => (
                <option key={obra.id} value={obra.id}>{formatarObra(obra)}</option>
              ))}
            </select>
          </label>
        );
      case 'categoria_macro_id':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Item macro
            <select className="input" value={filtros.categoria_macro_id} onChange={(event) => atualizarFiltro('categoria_macro_id', event.target.value)}>
              <option value="">Todos</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
              ))}
            </select>
          </label>
        );
      case 'status':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Status
            <select className="input" value={filtros.status} onChange={(event) => atualizarFiltro('status', event.target.value)}>
              <option value="">Todos</option>
              <option value="previsto">Previsto</option>
              <option value="em_analise">Em analise</option>
              <option value="aprovado">Aprovado</option>
              <option value="cancelado">Cancelado</option>
              <option value="realizado">Realizado</option>
            </select>
          </label>
        );
      case 'prioridade':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Prioridade
            <select className="input" value={filtros.prioridade} onChange={(event) => atualizarFiltro('prioridade', event.target.value)}>
              <option value="">Todas</option>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
          </label>
        );
      case 'busca':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Busca
            <input className="input" value={filtros.busca} onChange={(event) => atualizarFiltro('busca', event.target.value)} placeholder="Codigo, descricao ou credor" />
          </label>
        );
      case 'fornecedor':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Credor
            <input className="input" value={filtros.fornecedor} onChange={(event) => atualizarFiltro('fornecedor', event.target.value)} placeholder="Nome do credor" />
          </label>
        );
      case 'usuario_criacao_id':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Criador
            <select className="input" value={filtros.usuario_criacao_id} onChange={(event) => atualizarFiltro('usuario_criacao_id', event.target.value)}>
              <option value="">Todos</option>
              {criadoresFiltro.map((criador) => (
                <option key={criador.id} value={criador.id}>{criador.nome || criador.email}</option>
              ))}
            </select>
          </label>
        );
      case 'data_inicial':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Data inicial
            <input type="date" className="input" value={filtros.data_inicial} onChange={(event) => atualizarFiltro('data_inicial', event.target.value)} />
          </label>
        );
      case 'data_final':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Data final
            <input type="date" className="input" value={filtros.data_final} onChange={(event) => atualizarFiltro('data_final', event.target.value)} />
          </label>
        );
      default:
        return null;
    }
  }

  if (loadingBase) {
    return <div className="page"><p>Carregando modulo...</p></div>;
  }

  return (
    <div className="page space-y-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Provisionamentos</h1>
          <p className="page-subtitle">Acompanhe previsoes de desembolso por obra, categoria e periodo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Boolean(contexto?.permissoes?.pode_categorias) && (
            <button type="button" className="btn btn-outline" onClick={() => navigate('/provisoes-financeiras/categorias')}>
              Categorias macro
            </button>
          )}
          {Boolean(contexto?.permissoes?.pode_criar) && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('/provisoes-financeiras/nova')}>
              Nova provisao
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ResumoCard titulo="Valor total filtrado" valor={formatarMoedaBRL(resumo.valor_total_filtrado)} />
        <ResumoCard titulo="Registros filtrados" valor={String(resumo.total_registros_filtrados || 0)} />
        <ResumoCard titulo="Pagina atual" valor={`${meta.page || 1} / ${meta.pages || 1}`} />
      </div>

      <div className="card relative mx-auto w-full max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Filtros</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline inline-flex items-center gap-2" onClick={() => setMostrarFiltros((valor) => !valor)}>
              <HiAdjustmentsHorizontal className="h-4 w-4" />
              Filtros
            </button>
            <button type="button" className="btn btn-outline" onClick={limparFiltros}>
              Limpar
            </button>
          </div>
        </div>

        {mostrarFiltros && (
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {FILTER_OPTIONS.filter((item) => filtrosVisiveis.includes(item.id)).map((item) => renderFiltro(item.id))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {FILTER_OPTIONS.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={filtrosVisiveis.includes(item.id)} onChange={() => toggleFiltro(item.id)} />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

      </div>

      <div className="card mx-auto w-full max-w-6xl">
        <TabelaPadrao
          colunas={[
            {
              id: 'codigo',
              titulo: 'Codigo',
              // R17: o codigo NOMEIA a provisao — coluna travada no painel.
              tipo: 'identidade',
              noCard: 'titulo',
              ordenavel: true,
              valorOrdenacao: (item) => String(item.codigo || ''),
              render: (item) => <span className="font-semibold">{item.codigo}</span>
            },
            {
              id: 'obra',
              titulo: 'Obra',
              tipo: 'texto',
              ordenavel: true,
              valorOrdenacao: (item) => formatarObra(item.obra),
              render: (item) => formatarObra(item.obra)
            },
            {
              id: 'data_prevista',
              titulo: 'Data prevista',
              tipo: 'data',
              ordenavel: true,
              // Ordena pela data ISO crua (AAAA-MM-DD ordena como texto);
              // o dd/mm/aaaa exibido ordenaria pelo dia.
              valorOrdenacao: (item) => item.data_prevista_desembolso || '',
              render: (item) => formatarData(item.data_prevista_desembolso)
            },
            {
              id: 'categoria',
              titulo: 'Item macro',
              tipo: 'texto',
              ordenavel: true,
              valorOrdenacao: (item) => item.categoriaMacro?.nome || '',
              render: (item) => item.categoriaMacro?.nome || '-'
            },
            {
              id: 'descricao',
              titulo: 'Descricao',
              tipo: 'texto',
              ordenavel: true,
              valorOrdenacao: (item) => item.descricao || '',
              render: (item) => item.descricao || '-'
            },
            {
              id: 'fornecedor',
              titulo: 'Credor',
              tipo: 'texto',
              ordenavel: true,
              valorOrdenacao: (item) => item.fornecedor_texto || '',
              render: (item) => item.fornecedor_texto || '-'
            },
            {
              id: 'valor',
              titulo: 'Valor previsto',
              tipo: 'valor',
              ordenavel: true,
              // Dinheiro interessa do MAIOR para o menor no primeiro clique.
              ordemInicial: 'desc',
              valorOrdenacao: (item) => Number(item.valor_previsto || 0),
              render: (item) => formatarMoedaBRL(item.valor_previsto)
            },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'status',
              render: (item) => formatarStatus(item.status)
            },
            {
              id: 'prioridade',
              titulo: 'Prioridade',
              tipo: 'status',
              render: (item) => formatarPrioridade(item.prioridade)
            }
          ]}
          itens={lista}
          getId={(item) => item.id}
          carregando={loadingLista}
          vazio="Nenhum provisionamento encontrado."
          colunasConfiguraveis
          // Ordenação NO SERVIDOR (lista paginada): a tabela avisa, a tela
          // reconsulta e volta à página 1 — ordenar mantendo a página 7
          // mostraria um recorte sem sentido.
          aoOrdenar={(coluna, direcao) => {
            const campo = coluna ? CAMPO_ORDENACAO_POR_COLUNA[coluna] : null;
            setOrdenacao(campo
              ? { sort_by: campo, sort_dir: direcao === 'desc' ? 'DESC' : 'ASC' }
              : ORDENACAO_PADRAO);
            setMeta((atual) => ({ ...atual, page: 1 }));
          }}
          storageKey={STORAGE_KEY}
          rotuloRolagem="Provisionamentos financeiros"
          larguraAcoes={140}
          acoesLinha={(item) => (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => navigate(`/provisoes-financeiras/${item.id}`)}
            >
              Detalhes
            </button>
          )}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-[var(--c-muted)]">
            Pagina {meta.page || 1} de {meta.pages || 1} · {meta.total || 0} registro(s)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-outline" disabled={(meta.page || 1) <= 1} onClick={() => setMeta((atual) => ({ ...atual, page: Math.max(1, (atual.page || 1) - 1) }))}>
              Anterior
            </button>
            <button type="button" className="btn btn-outline" disabled={!meta.pages || (meta.page || 1) >= meta.pages} onClick={() => setMeta((atual) => ({ ...atual, page: (atual.page || 1) + 1 }))}>
              Proxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
