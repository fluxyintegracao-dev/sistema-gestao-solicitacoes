import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  status: '',
  prioridade: '',
  busca: '',
  fornecedor: '',
  data_inicial: '',
  data_final: '',
  valor_minimo: '',
  valor_maximo: '',
  usuario_criacao_id: ''
};

const STATUS_OPCOES = [
  { value: '', label: 'Todos' },
  { value: 'previsto', label: 'Previsto' },
  { value: 'em_analise', label: 'Em analise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'realizado', label: 'Realizado' }
];

const PRIORIDADE_OPCOES = [
  { value: '', label: 'Todas' },
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Critica' }
];

const ORDENACAO_OPCOES = [
  { value: 'data_prevista_desembolso', label: 'Data prevista' },
  { value: 'createdAt', label: 'Data de criacao' },
  { value: 'valor_previsto', label: 'Valor previsto' },
  { value: 'codigo', label: 'Codigo' },
  { value: 'status', label: 'Status' },
  { value: 'prioridade', label: 'Prioridade' }
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

function formatarStatus(valor) {
  return String(valor || '-')
    .replace(/_/g, ' ')
    .toUpperCase();
}

function formatarObra(obra) {
  if (!obra) return '-';
  return `${obra.codigo ? `${obra.codigo} - ` : ''}${obra.nome}`;
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

  const storageKey = useMemo(() => {
    const identificador = user?.id || user?.email || user?.nome || user?.perfil || 'anon';
    return `provisionamento-financeiro:filtros:${identificador}`;
  }, [user?.id, user?.email, user?.nome, user?.perfil]);

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(storageKey);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed?.filtros && typeof parsed.filtros === 'object') {
          setFiltros((atual) => ({ ...atual, ...parsed.filtros }));
        }
        if (parsed?.ordenacao && typeof parsed.ordenacao === 'object') {
          setOrdenacao((atual) => ({ ...atual, ...parsed.ordenacao }));
        }
        if (parsed?.limit) {
          setMeta((atual) => ({ ...atual, limit: Number(parsed.limit) || atual.limit || 25 }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar filtros do provisionamento financeiro', error);
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
        limit: meta.limit
      }));
    } catch (error) {
      console.error('Erro ao salvar filtros do provisionamento financeiro', error);
    }
  }, [filtros, ordenacao, meta.limit, storageKey, filtrosStoragePronto]);

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

  function atualizarOrdenacao(campo, valor) {
    setMeta((atual) => ({ ...atual, page: 1 }));
    setOrdenacao((atual) => ({ ...atual, [campo]: valor }));
  }

  function limparFiltros() {
    setMeta((atual) => ({ ...atual, page: 1 }));
    setFiltros(DEFAULT_FILTERS);
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
        'Status',
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
        formatarStatus(item.status),
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

  async function exportarCsv() {
    exportarSelecionadasCsv();
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
            Registro macro de previsao de desembolso por obra, sem substituir o fluxo principal do sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {String(user?.perfil || '').toUpperCase() === 'SUPERADMIN' && (
            <button type="button" className="btn btn-outline" onClick={() => navigate('/provisoes-financeiras/categorias')}>
              Categorias macro
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={exportarCsv} disabled={exportando}>
            {exportando ? 'Exportando...' : `Exportar CSV${quantidadeSelecionadas > 0 ? ` (${quantidadeSelecionadas})` : ''}`}
          </button>
          {Boolean(contexto?.permissoes?.pode_criar) && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('/provisoes-financeiras/nova')}>
              Nova provisao
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          titulo="Total filtrado"
          valor={formatarMoedaBRL(resumo.valor_total_filtrado)}
        />
        <ResumoCard
          titulo="Registros filtrados"
          valor={String(resumo.total_registros_filtrados || 0)}
        />
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Filtros</h2>
          <button type="button" className="btn btn-outline" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm">
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

          <label className="grid gap-1 text-sm">
            Item Macro
            <select className="input" value={filtros.categoria_macro_id} onChange={(event) => atualizarFiltro('categoria_macro_id', event.target.value)}>
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Status
            <select className="input" value={filtros.status} onChange={(event) => atualizarFiltro('status', event.target.value)}>
              {STATUS_OPCOES.map((status) => (
                <option key={status.value || 'todos'} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Prioridade
            <select className="input" value={filtros.prioridade} onChange={(event) => atualizarFiltro('prioridade', event.target.value)}>
              {PRIORIDADE_OPCOES.map((prioridade) => (
                <option key={prioridade.value || 'todas'} value={prioridade.value}>{prioridade.label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Busca
            <input
              className="input"
              placeholder="Codigo, descricao ou fornecedor"
              value={filtros.busca}
              onChange={(event) => atualizarFiltro('busca', event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            Fornecedor
            <input
              className="input"
              placeholder="Nome do fornecedor"
              value={filtros.fornecedor}
              onChange={(event) => atualizarFiltro('fornecedor', event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
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

          <label className="grid gap-1 text-sm">
            Data prevista inicial
            <input
              type="date"
              className="input"
              value={filtros.data_inicial}
              onChange={(event) => atualizarFiltro('data_inicial', event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            Data prevista final
            <input
              type="date"
              className="input"
              value={filtros.data_final}
              onChange={(event) => atualizarFiltro('data_final', event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
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

          <label className="grid gap-1 text-sm">
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

          <label className="grid gap-1 text-sm">
            Ordenar por
            <select className="input" value={ordenacao.sort_by} onChange={(event) => atualizarOrdenacao('sort_by', event.target.value)}>
              {ORDENACAO_OPCOES.map((opcao) => (
                <option key={opcao.value} value={opcao.value}>{opcao.label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Direcao
            <select className="input" value={ordenacao.sort_dir} onChange={(event) => atualizarOrdenacao('sort_dir', event.target.value)}>
              <option value="ASC">Crescente</option>
              <option value="DESC">Decrescente</option>
            </select>
          </label>
        </div>
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
                  <th>Codigo</th>
                  <th>Obra</th>
                  <th>Data prevista</th>
                    <th>Item Macro</th>
                  <th>Descricao</th>
                  <th>Fornecedor</th>
                  <th>Valor previsto</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Criador</th>
                  <th>Criado em</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => alternarSelecionada(item)}
                  >
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
                    <td className="font-mono text-xs font-semibold">{item.codigo}</td>
                    <td>{formatarObra(item.obra)}</td>
                    <td>{formatarData(item.data_prevista_desembolso)}</td>
                    <td>{item.categoriaMacro?.nome || '-'}</td>
                    <td>{item.descricao || '-'}</td>
                    <td>{item.fornecedor_texto || '-'}</td>
                    <td>{formatarMoedaBRL(item.valor_previsto)}</td>
                    <td>{formatarStatus(item.status)}</td>
                    <td>{item.prioridade || '-'}</td>
                    <td>{item.usuarioCriacao?.nome || '-'}</td>
                    <td>{formatarData(item.createdAt)}</td>
                    <td>
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
                    </td>
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
            <span className="text-[var(--c-muted)]">
              {quantidadeSelecionadas} selecionada(s)
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
            <button
              type="button"
              className="btn btn-outline"
              disabled={(meta.page || 1) <= 1}
              onClick={() => setMeta((atual) => ({ ...atual, page: Math.max(1, (atual.page || 1) - 1) }))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={!meta.pages || (meta.page || 1) >= meta.pages}
              onClick={() => setMeta((atual) => ({ ...atual, page: (atual.page || 1) + 1 }))}
            >
              Proxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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

function ResumoCard({ titulo, valor }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-white px-4 py-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-[var(--c-muted)]">{titulo}</div>
      <div className="mt-2 text-xl font-semibold">{valor}</div>
    </div>
  );
}
