import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiAdjustmentsHorizontal,
  HiViewColumns
} from 'react-icons/hi2';
import {
  getProvisionamentoFinanceiroContexto,
  listarCategoriasMacroProvisionamento,
  listarProvisoesFinanceiras
} from '../../../services/provisoesFinanceiras';
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
  { id: 'fornecedor', label: 'Fornecedor' },
  { id: 'usuario_criacao_id', label: 'Criador' },
  { id: 'data_inicial', label: 'Data inicial' },
  { id: 'data_final', label: 'Data final' }
];

const COLUMN_DEFS = [
  { id: 'codigo', label: 'Codigo', sortKey: 'codigo', mandatory: true },
  { id: 'obra', label: 'Obra', sortKey: 'obra' },
  { id: 'data_prevista', label: 'Data prevista', sortKey: 'data_prevista_desembolso' },
  { id: 'categoria', label: 'Item macro', sortKey: 'categoria_macro' },
  { id: 'descricao', label: 'Descricao', sortKey: 'descricao' },
  { id: 'fornecedor', label: 'Fornecedor', sortKey: 'fornecedor_texto' },
  { id: 'valor', label: 'Valor previsto', sortKey: 'valor_previsto' },
  { id: 'status', label: 'Status' },
  { id: 'prioridade', label: 'Prioridade' },
  { id: 'acoes', label: 'Acoes', mandatory: true }
];

const DEFAULT_VISIBLE_COLUMNS = COLUMN_DEFS.map((coluna) => coluna.id);
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
  const [mostrarColunas, setMostrarColunas] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState(DEFAULT_FILTERS);
  const [ordenacao, setOrdenacao] = useState({
    sort_by: 'data_prevista_desembolso',
    sort_dir: 'ASC'
  });
  const [colunasVisiveis, setColunasVisiveis] = useState(DEFAULT_VISIBLE_COLUMNS);
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

  const colunasRenderizadas = useMemo(() => (
    COLUMN_DEFS.filter((coluna) => colunasVisiveis.includes(coluna.id))
  ), [colunasVisiveis]);

  function atualizarFiltro(campo, valor) {
    setMeta((atual) => ({ ...atual, page: 1 }));
    setFiltros((atual) => ({ ...atual, [campo]: valor ?? '' }));
  }

  function limparFiltros() {
    setMeta((atual) => ({ ...atual, page: 1 }));
    setFiltros(DEFAULT_FILTERS);
  }

  function alternarOrdenacao(sortKey) {
    if (!sortKey) return;
    setMeta((atual) => ({ ...atual, page: 1 }));
    setOrdenacao((atual) => (
      atual.sort_by === sortKey
        ? { sort_by: sortKey, sort_dir: atual.sort_dir === 'ASC' ? 'DESC' : 'ASC' }
        : { sort_by: sortKey, sort_dir: 'ASC' }
    ));
  }

  function indicadorOrdenacao(sortKey) {
    if (ordenacao.sort_by !== sortKey) return '';
    return ordenacao.sort_dir === 'ASC' ? ' ^' : ' v';
  }

  function toggleColuna(id) {
    const obrigatorias = new Set(['codigo', 'acoes']);
    if (obrigatorias.has(id)) return;
    setColunasVisiveis((atual) => (
      atual.includes(id)
        ? atual.filter((item) => item !== id)
        : [...atual, id]
    ));
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
            <input className="input" value={filtros.busca} onChange={(event) => atualizarFiltro('busca', event.target.value)} placeholder="Codigo, descricao ou fornecedor" />
          </label>
        );
      case 'fornecedor':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Fornecedor
            <input className="input" value={filtros.fornecedor} onChange={(event) => atualizarFiltro('fornecedor', event.target.value)} placeholder="Nome do fornecedor" />
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

  function renderCelula(item, colunaId) {
    switch (colunaId) {
      case 'codigo':
        return <span className="font-mono text-xs font-semibold">{item.codigo}</span>;
      case 'obra':
        return formatarObra(item.obra);
      case 'data_prevista':
        return formatarData(item.data_prevista_desembolso);
      case 'categoria':
        return item.categoriaMacro?.nome || '-';
      case 'descricao':
        return item.descricao || '-';
      case 'fornecedor':
        return item.fornecedor_texto || '-';
      case 'valor':
        return formatarMoedaBRL(item.valor_previsto);
      case 'status':
        return formatarStatus(item.status);
      case 'prioridade':
        return formatarPrioridade(item.prioridade);
      case 'acoes':
        return (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate(`/provisoes-financeiras/${item.id}`)}
          >
            Detalhes
          </button>
        );
      default:
        return '-';
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
            <button type="button" className="btn btn-outline inline-flex items-center gap-2" onClick={() => { setMostrarFiltros((valor) => !valor); setMostrarColunas(false); }}>
              <HiAdjustmentsHorizontal className="h-4 w-4" />
              Filtros
            </button>
            <button type="button" className="btn btn-outline inline-flex items-center gap-2" onClick={() => { setMostrarColunas((valor) => !valor); setMostrarFiltros(false); }}>
              <HiViewColumns className="h-4 w-4" />
              Colunas
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

        {mostrarColunas && (
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <div className="flex flex-wrap gap-3">
              {COLUMN_DEFS.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={colunasVisiveis.includes(item.id)}
                    disabled={Boolean(item.mandatory)}
                    onChange={() => toggleColuna(item.id)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card mx-auto w-full max-w-6xl">
        {loadingLista ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">Carregando...</div>
        ) : lista.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">Nenhum provisionamento encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  {colunasRenderizadas.map((coluna) => (
                    <th key={coluna.id}>
                      {coluna.sortKey ? (
                        <button type="button" className="font-inherit hover:underline" onClick={() => alternarOrdenacao(coluna.sortKey)}>
                          {coluna.label}{indicadorOrdenacao(coluna.sortKey)}
                        </button>
                      ) : coluna.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((item) => (
                  <tr key={item.id}>
                    {colunasRenderizadas.map((coluna) => (
                      <td key={coluna.id}>{renderCelula(item, coluna.id)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
