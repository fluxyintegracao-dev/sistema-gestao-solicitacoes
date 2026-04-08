import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiAdjustmentsHorizontal,
  HiDocumentArrowDown,
  HiViewColumns
} from 'react-icons/hi2';
import { AuthContext } from '../../../contexts/AuthContext';
import {
  getProvisionamentoFinanceiroContexto,
  listarCategoriasMacroProvisionamento,
  listarProvisoesFinanceiras
} from '../../../services/provisoesFinanceiras';
import { formatarMoedaBRL } from '../utils/moeda';

const DEFAULT_FILTERS = {
  obra_id: '',
  categoria_macro_id: '',
  prioridade: '',
  busca: '',
  fornecedor: '',
  data_inicial: '',
  data_final: '',
  valor_minimo: '',
  valor_maximo: '',
  usuario_criacao_id: ''
};

const DEFAULT_VISIBLE_FILTERS = [
  'obra_id',
  'categoria_macro_id',
  'prioridade',
  'busca',
  'fornecedor',
  'usuario_criacao_id',
  'data_inicial',
  'data_final',
  'valor_minimo',
  'valor_maximo'
];

const FILTER_OPTIONS = [
  { id: 'obra_id', label: 'Obra' },
  { id: 'categoria_macro_id', label: 'Item Macro' },
  { id: 'prioridade', label: 'Prioridade' },
  { id: 'busca', label: 'Busca' },
  { id: 'fornecedor', label: 'Fornecedor' },
  { id: 'usuario_criacao_id', label: 'Criador' },
  { id: 'data_inicial', label: 'Data prevista inicial' },
  { id: 'data_final', label: 'Data prevista final' },
  { id: 'valor_minimo', label: 'Valor minimo' },
  { id: 'valor_maximo', label: 'Valor maximo' }
];

const COLUMN_DEFS = [
  { id: 'codigo', label: 'Codigo', sortKey: 'codigo', mandatory: true },
  { id: 'obra', label: 'Obra', sortKey: 'obra' },
  { id: 'data_prevista', label: 'Data prevista', sortKey: 'data_prevista_desembolso' },
  { id: 'item_macro', label: 'Item Macro', sortKey: 'categoria_macro' },
  { id: 'descricao', label: 'Descricao', sortKey: 'descricao' },
  { id: 'fornecedor', label: 'Fornecedor', sortKey: 'fornecedor_texto' },
  { id: 'valor_previsto', label: 'Valor previsto', sortKey: 'valor_previsto' },
  { id: 'prioridade', label: 'Prioridade', sortKey: 'prioridade' },
  { id: 'criador', label: 'Criador', sortKey: 'usuario_criacao' },
  { id: 'criado_em', label: 'Criado em', sortKey: 'createdAt' },
  { id: 'acoes', label: 'Acoes', mandatory: true }
];

const DEFAULT_VISIBLE_COLUMNS = COLUMN_DEFS.map((coluna) => coluna.id);

const PRIORIDADE_OPCOES = [
  { value: '', label: 'Todas' },
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Critica' }
];

function formatarData(valor) {
  if (!valor) return '-';
  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return '-';
  }
  return data.toLocaleDateString('pt-BR');
}

function formatarObra(obra) {
  if (!obra) return '-';
  return `${obra.codigo ? `${obra.codigo} - ` : ''}${obra.nome}`;
}

function formatarPrioridade(valor) {
  if (!valor) return '-';
  return String(valor).charAt(0).toUpperCase() + String(valor).slice(1);
}

function valueOrEmpty(valor) {
  return valor ?? '';
}

function escaparColunaCsv(valor) {
  const texto = String(valor ?? '');
  if (!texto.includes(';') && !texto.includes('"') && !texto.includes('\n')) {
    return texto;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}

function limparObjetoFiltros(filtros) {
  return Object.keys(DEFAULT_FILTERS).reduce((acc, chave) => {
    acc[chave] = valueOrEmpty(filtros?.[chave] ?? DEFAULT_FILTERS[chave]);
    return acc;
  }, {});
}

function normalizarListaPreferencias(lista, opcoes, obrigatorias = []) {
  const idsValidos = new Set(opcoes.map((opcao) => opcao.id));
  const filtradas = Array.isArray(lista)
    ? lista.filter((item) => idsValidos.has(item))
    : [];

  obrigatorias.forEach((id) => {
    if (!filtradas.includes(id)) {
      filtradas.push(id);
    }
  });

  if (filtradas.length === 0) {
    return opcoes.map((opcao) => opcao.id);
  }

  return filtradas;
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
  const { user } = useContext(AuthContext);
  const [contexto, setContexto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [lista, setLista] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0, limit: 25 });
  const [resumo, setResumo] = useState({
    total_registros_filtrados: 0,
    valor_total_filtrado: 0
  });
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingLista, setLoadingLista] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [filtrosStoragePronto, setFiltrosStoragePronto] = useState(false);
  const [selecionadasIds, setSelecionadasIds] = useState([]);
  const [itensSelecionados, setItensSelecionados] = useState({});
  const [filtros, setFiltros] = useState(DEFAULT_FILTERS);
  const [ordenacao, setOrdenacao] = useState({
    sort_by: 'data_prevista_desembolso',
    sort_dir: 'ASC'
  });
  const [mostrarSeletorColunas, setMostrarSeletorColunas] = useState(false);
  const [mostrarSeletorFiltros, setMostrarSeletorFiltros] = useState(false);
  const [colunasVisiveis, setColunasVisiveis] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(DEFAULT_VISIBLE_FILTERS);
  const seletorColunasRef = useRef(null);
  const seletorFiltrosRef = useRef(null);
  const botaoColunasRef = useRef(null);
  const botaoFiltrosRef = useRef(null);

  const storageKey = useMemo(() => {
    const identificador = user?.id || user?.email || user?.nome || user?.perfil || 'anon';
    return `provisionamento-financeiro:lista:${identificador}`;
  }, [user?.id, user?.email, user?.nome, user?.perfil]);

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(storageKey);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed?.filtros && typeof parsed.filtros === 'object') {
          setFiltros(limparObjetoFiltros(parsed.filtros));
        }
        if (parsed?.ordenacao && typeof parsed.ordenacao === 'object') {
          setOrdenacao((atual) => ({
            ...atual,
            sort_by: parsed.ordenacao.sort_by || atual.sort_by,
            sort_dir: parsed.ordenacao.sort_dir === 'DESC' ? 'DESC' : 'ASC'
          }));
        }
        if (parsed?.limit) {
          setMeta((atual) => ({ ...atual, limit: Number(parsed.limit) || atual.limit || 25 }));
        }
        if (parsed?.colunasVisiveis) {
          setColunasVisiveis(normalizarListaPreferencias(parsed.colunasVisiveis, COLUMN_DEFS, ['codigo', 'acoes']));
        }
        if (parsed?.filtrosVisiveis) {
          setFiltrosVisiveis(normalizarListaPreferencias(parsed.filtrosVisiveis, FILTER_OPTIONS));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar preferencias do provisionamento financeiro', error);
    } finally {
      setFiltrosStoragePronto(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!filtrosStoragePronto) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        filtros,
        ordenacao,
        limit: meta.limit,
        colunasVisiveis,
        filtrosVisiveis
      }));
    } catch (error) {
      console.error('Erro ao salvar preferencias do provisionamento financeiro', error);
    }
  }, [filtros, ordenacao, meta.limit, colunasVisiveis, filtrosVisiveis, storageKey, filtrosStoragePronto]);

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
        alert(error?.message || 'Erro ao carregar o modulo de provisionamento financeiro.');
      } finally {
        setLoadingBase(false);
      }
    }

    carregarBase();
  }, []);

  useEffect(() => {
    if (!contexto || !filtrosStoragePronto) return;

    async function carregarLista() {
      try {
        setLoadingLista(true);
        const data = await listarProvisoesFinanceiras({
          page: meta.page,
          limit: meta.limit,
          ...ordenacao,
          ...filtros
        });

        setLista(Array.isArray(data?.items) ? data.items : []);
        setMeta((atual) => ({
          ...atual,
          ...data?.meta,
          page: Number(data?.meta?.page || atual.page || 1),
          pages: Number(data?.meta?.pages || 0),
          total: Number(data?.meta?.total || 0)
        }));
        setResumo({
          total_registros_filtrados: Number(data?.resumo?.total_registros_filtrados || data?.meta?.total || 0),
          valor_total_filtrado: Number(data?.resumo?.valor_total_filtrado || 0)
        });
      } catch (error) {
        console.error(error);
        alert(error?.message || 'Erro ao listar provisoes financeiras.');
      } finally {
        setLoadingLista(false);
      }
    }

    carregarLista();
  }, [contexto, filtrosStoragePronto, filtros, ordenacao, meta.page, meta.limit]);

  useEffect(() => {
    function fecharAoClicarFora(event) {
      const alvo = event.target;

      if (
        mostrarSeletorColunas &&
        !seletorColunasRef.current?.contains(alvo) &&
        !botaoColunasRef.current?.contains(alvo)
      ) {
        setMostrarSeletorColunas(false);
      }

      if (
        mostrarSeletorFiltros &&
        !seletorFiltrosRef.current?.contains(alvo) &&
        !botaoFiltrosRef.current?.contains(alvo)
      ) {
        setMostrarSeletorFiltros(false);
      }
    }

    document.addEventListener('mousedown', fecharAoClicarFora);
    return () => document.removeEventListener('mousedown', fecharAoClicarFora);
  }, [mostrarSeletorColunas, mostrarSeletorFiltros]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== 'Escape') return;
      setMostrarSeletorColunas(false);
      setMostrarSeletorFiltros(false);
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const obrasAcesso = useMemo(() => (
    Array.isArray(contexto?.obras_acesso) ? contexto.obras_acesso : []
  ), [contexto]);

  const criadoresFiltro = useMemo(() => (
    Array.isArray(contexto?.criadores_filtro) ? contexto.criadores_filtro : []
  ), [contexto]);

  const idsPaginaAtual = useMemo(() => (
    lista
      .map((item) => Number(item?.id))
      .filter((id) => Number.isInteger(id) && id > 0)
  ), [lista]);

  const todasPaginaSelecionadas = useMemo(() => (
    idsPaginaAtual.length > 0 && idsPaginaAtual.every((id) => selecionadasIds.includes(id))
  ), [idsPaginaAtual, selecionadasIds]);

  const quantidadeSelecionadas = selecionadasIds.length;

  const colunasRenderizadas = useMemo(() => (
    COLUMN_DEFS.filter((coluna) => colunasVisiveis.includes(coluna.id))
  ), [colunasVisiveis]);

  useEffect(() => {
    if (!Array.isArray(lista) || lista.length === 0) return;

    setItensSelecionados((atual) => {
      const proximo = { ...atual };
      lista.forEach((item) => {
        if (selecionadasIds.includes(Number(item.id))) {
          proximo[item.id] = item;
        }
      });
      return proximo;
    });
  }, [lista, selecionadasIds]);

  function atualizarFiltro(campo, valor) {
    setMeta((atual) => ({ ...atual, page: 1 }));
    setFiltros((atual) => ({ ...atual, [campo]: valueOrEmpty(valor) }));
  }

  function limparFiltros() {
    setMeta((atual) => ({ ...atual, page: 1 }));
    setFiltros(DEFAULT_FILTERS);
  }

  function alternarOrdenacao(sortKey) {
    if (!sortKey) return;

    setMeta((atual) => ({ ...atual, page: 1 }));
    setOrdenacao((atual) => {
      if (atual.sort_by !== sortKey) {
        return { sort_by: sortKey, sort_dir: 'ASC' };
      }

      return {
        sort_by: sortKey,
        sort_dir: atual.sort_dir === 'ASC' ? 'DESC' : 'ASC'
      };
    });
  }

  function indicadorOrdenacao(sortKey) {
    if (ordenacao.sort_by !== sortKey) return '';
    return ordenacao.sort_dir === 'ASC' ? ' ^' : ' v';
  }

  function alternarSelecionada(item) {
    const itemId = Number(item?.id);
    if (!Number.isInteger(itemId) || itemId <= 0) return;
    const jaSelecionada = selecionadasIds.includes(itemId);

    setSelecionadasIds((atual) => {
      if (atual.includes(itemId)) {
        return atual.filter((id) => id !== itemId);
      }
      return [...atual, itemId];
    });

    setItensSelecionados((atual) => {
      if (jaSelecionada) {
        const proximo = { ...atual };
        delete proximo[itemId];
        return proximo;
      }

      return {
        ...atual,
        [itemId]: item
      };
    });
  }

  function alternarTodasPaginaAtual() {
    if (idsPaginaAtual.length === 0) return;

    if (todasPaginaSelecionadas) {
      setSelecionadasIds((atual) => atual.filter((id) => !idsPaginaAtual.includes(id)));
      setItensSelecionados((atual) => {
        const proximo = { ...atual };
        idsPaginaAtual.forEach((id) => {
          delete proximo[id];
        });
        return proximo;
      });
      return;
    }

    setSelecionadasIds((atual) => Array.from(new Set([...atual, ...idsPaginaAtual])));
    setItensSelecionados((atual) => {
      const proximo = { ...atual };
      lista.forEach((item) => {
        proximo[item.id] = item;
      });
      return proximo;
    });
  }

  function toggleColuna(id) {
    const obrigatorias = new Set(['codigo', 'acoes']);
    if (obrigatorias.has(id)) return;

    setColunasVisiveis((atual) => (
      atual.includes(id)
        ? atual.filter((colunaId) => colunaId !== id)
        : [...atual, id]
    ));
  }

  function toggleFiltroVisivel(id) {
    setFiltrosVisiveis((atual) => (
      atual.includes(id)
        ? atual.filter((filtroId) => filtroId !== id)
        : [...atual, id]
    ));
  }

  function exportarSelecionadasCsv() {
    if (selecionadasIds.length === 0) {
      alert('Selecione ao menos uma previsao para exportar.');
      return;
    }

    try {
      setExportando(true);

      const registros = selecionadasIds
        .map((id) => itensSelecionados[id])
        .filter(Boolean);

      if (registros.length === 0) {
        alert('Nenhuma previsao selecionada esta disponivel para exportacao.');
        return;
      }

      const cabecalho = [
        'Codigo',
        'Obra',
        'Data prevista',
        'Item Macro',
        'Descricao',
        'Fornecedor',
        'Valor previsto',
        'Prioridade',
        'Criador',
        'Data de criacao'
      ];

      const linhas = registros.map((item) => ([
        item.codigo || '',
        formatarObra(item.obra),
        formatarData(item.data_prevista_desembolso),
        item.categoriaMacro?.nome || '',
        item.descricao || '',
        item.fornecedor_texto || '',
        Number(item.valor_previsto || 0).toFixed(2).replace('.', ','),
        item.prioridade || '',
        item.usuarioCriacao?.nome || '',
        formatarData(item.createdAt)
      ]));

      const csv = [cabecalho, ...linhas]
        .map((colunas) => colunas.map(escaparColunaCsv).join(';'))
        .join('\n');

      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `provisoes-financeiras-selecionadas-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao exportar previsoes selecionadas.');
    } finally {
      setExportando(false);
    }
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
                <option key={obra.id} value={obra.id}>
                  {formatarObra(obra)}
                </option>
              ))}
            </select>
          </label>
        );
      case 'categoria_macro_id':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Item Macro
            <select className="input" value={filtros.categoria_macro_id} onChange={(event) => atualizarFiltro('categoria_macro_id', event.target.value)}>
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
              ))}
            </select>
          </label>
        );
      case 'prioridade':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Prioridade
            <select className="input" value={filtros.prioridade} onChange={(event) => atualizarFiltro('prioridade', event.target.value)}>
              {PRIORIDADE_OPCOES.map((prioridade) => (
                <option key={prioridade.value || 'todas'} value={prioridade.value}>{prioridade.label}</option>
              ))}
            </select>
          </label>
        );
      case 'busca':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Busca
            <input
              className="input"
              placeholder="Codigo, descricao ou fornecedor"
              value={filtros.busca}
              onChange={(event) => atualizarFiltro('busca', event.target.value)}
            />
          </label>
        );
      case 'fornecedor':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Fornecedor
            <input
              className="input"
              placeholder="Nome do fornecedor"
              value={filtros.fornecedor}
              onChange={(event) => atualizarFiltro('fornecedor', event.target.value)}
            />
          </label>
        );
      case 'usuario_criacao_id':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Criador
            <select className="input" value={filtros.usuario_criacao_id} onChange={(event) => atualizarFiltro('usuario_criacao_id', event.target.value)}>
              <option value="">Todos</option>
              {criadoresFiltro.map((criador) => (
                <option key={criador.id} value={criador.id}>
                  {criador.nome || criador.email || `Usuario ${criador.id}`}
                </option>
              ))}
            </select>
          </label>
        );
      case 'data_inicial':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Data prevista inicial
            <input
              type="date"
              className="input"
              value={filtros.data_inicial}
              onChange={(event) => atualizarFiltro('data_inicial', event.target.value)}
            />
          </label>
        );
      case 'data_final':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Data prevista final
            <input
              type="date"
              className="input"
              value={filtros.data_final}
              onChange={(event) => atualizarFiltro('data_final', event.target.value)}
            />
          </label>
        );
      case 'valor_minimo':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Valor minimo
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={filtros.valor_minimo}
              onChange={(event) => atualizarFiltro('valor_minimo', event.target.value)}
            />
          </label>
        );
      case 'valor_maximo':
        return (
          <label key={id} className="grid gap-1 text-sm">
            Valor maximo
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={filtros.valor_maximo}
              onChange={(event) => atualizarFiltro('valor_maximo', event.target.value)}
            />
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
      case 'item_macro':
        return item.categoriaMacro?.nome || '-';
      case 'descricao':
        return item.descricao || '-';
      case 'fornecedor':
        return item.fornecedor_texto || '-';
      case 'valor_previsto':
        return formatarMoedaBRL(item.valor_previsto);
      case 'prioridade':
        return formatarPrioridade(item.prioridade);
      case 'criador':
        return item.usuarioCriacao?.nome || '-';
      case 'criado_em':
        return formatarData(item.createdAt);
      case 'acoes':
        return (
          <button
            type="button"
            className="btn btn-outline"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/provisoes-financeiras/${item.id}`);
            }}
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Provisionamento Financeiro</h1>
          <p className="page-subtitle">
            Registro macro de previsao de desembolso por obra, sem fluxo de etapas e com foco em acompanhamento gerencial.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard titulo="Total filtrado" valor={formatarMoedaBRL(resumo.valor_total_filtrado)} />
        <ResumoCard titulo="Registros filtrados" valor={String(resumo.total_registros_filtrados || 0)} />
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Filtros</h2>
          <button type="button" className="btn btn-outline" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>

        {filtrosVisiveis.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {FILTER_OPTIONS
              .filter((filtro) => filtrosVisiveis.includes(filtro.id))
              .map((filtro) => renderFiltro(filtro.id))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--c-border)] p-6 text-sm text-[var(--c-muted)]">
            Nenhum filtro visivel selecionado. Use o botao <strong>Filtros</strong> na barra acima da tabela para escolher quais filtros exibir.
          </div>
        )}
      </div>

      <div className="card relative space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="text-sm text-[var(--c-muted)]">
            Selecionadas: <strong>{quantidadeSelecionadas}</strong>
          </div>
          <div className="flex flex-wrap gap-2 xl:ml-auto">
            {String(user?.perfil || '').toUpperCase() === 'SUPERADMIN' && (
              <button type="button" className="btn btn-outline" onClick={() => navigate('/provisoes-financeiras/categorias')}>
                Categorias macro
              </button>
            )}
            <button type="button" className="btn btn-outline inline-flex items-center gap-2" onClick={exportarSelecionadasCsv} disabled={exportando || quantidadeSelecionadas === 0}>
              <HiDocumentArrowDown className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              ref={botaoColunasRef}
              type="button"
              className="btn btn-outline inline-flex items-center gap-2"
              onClick={() => {
                setMostrarSeletorColunas((valor) => !valor);
                setMostrarSeletorFiltros(false);
              }}
            >
              <HiViewColumns className="w-4 h-4" />
              <span className="hidden sm:inline">Colunas</span>
            </button>
            <button
              ref={botaoFiltrosRef}
              type="button"
              className="btn btn-outline inline-flex items-center gap-2"
              onClick={() => {
                setMostrarSeletorFiltros((valor) => !valor);
                setMostrarSeletorColunas(false);
              }}
            >
              <HiAdjustmentsHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
            {Boolean(contexto?.permissoes?.pode_criar) && (
              <button type="button" className="btn btn-primary" onClick={() => navigate('/provisoes-financeiras/nova')}>
                Nova provisao
              </button>
            )}
          </div>
        </div>

        {mostrarSeletorColunas && (
          <div ref={seletorColunasRef} className="absolute right-0 top-[56px] z-20 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Colunas visiveis</p>
              <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setColunasVisiveis(COLUMN_DEFS.map((coluna) => coluna.id))}>
                Mostrar todas
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {COLUMN_DEFS.map((coluna) => {
                const obrigatoria = Boolean(coluna.mandatory);
                const marcada = colunasVisiveis.includes(coluna.id);
                return (
                  <label key={coluna.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={marcada} disabled={obrigatoria} onChange={() => toggleColuna(coluna.id)} />
                    <span className={obrigatoria ? 'text-gray-500' : ''}>{coluna.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {mostrarSeletorFiltros && (
          <div ref={seletorFiltrosRef} className="absolute right-0 top-[56px] z-20 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Filtros visiveis</p>
              <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setFiltrosVisiveis(FILTER_OPTIONS.map((filtro) => filtro.id))}>
                Mostrar todos
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
              {FILTER_OPTIONS.map((filtro) => {
                const marcada = filtrosVisiveis.includes(filtro.id);
                return (
                  <label key={filtro.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={marcada} onChange={() => toggleFiltroVisivel(filtro.id)} />
                    <span>{filtro.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Registros</h2>
          <span className="text-sm text-[var(--c-muted)]">{meta.total || 0} registro(s)</span>
        </div>

        {loadingLista ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">Carregando...</div>
        ) : lista.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">Nenhuma provisao financeira encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">
                    <label className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={todasPaginaSelecionadas}
                        onChange={alternarTodasPaginaAtual}
                        onClick={(event) => event.stopPropagation()}
                        title={todasPaginaSelecionadas ? 'Desmarcar todas da pagina' : 'Selecionar todas da pagina'}
                      />
                    </label>
                  </th>
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
                  <tr key={item.id} className="cursor-pointer" onClick={() => alternarSelecionada(item)}>
                    <td>
                      <label className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selecionadasIds.includes(Number(item.id))}
                          onChange={() => alternarSelecionada(item)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </label>
                    </td>
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
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[var(--c-muted)]">
              Pagina {meta.page || 1} de {meta.pages || 1}
            </span>
            <label className="flex items-center gap-2 text-[var(--c-muted)]">
              <span>Itens por pagina</span>
              <select
                className="input min-w-[96px]"
                value={meta.limit}
                onChange={(event) => {
                  const limit = Number(event.target.value) || 25;
                  setMeta((atual) => ({ ...atual, limit, page: 1 }));
                }}
              >
                {[25, 50, 100, 200].map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </label>
          </div>
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
