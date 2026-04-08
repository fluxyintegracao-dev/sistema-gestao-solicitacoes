import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import {
  getProvisionamentoFinanceiroContexto,
  listarCategoriasMacroProvisionamento,
  listarProvisoesFinanceiras
} from '../../../services/provisoesFinanceiras';

const STATUS_OPCOES = [
  { value: '', label: 'Todos' },
  { value: 'previsto', label: 'Previsto' },
  { value: 'em_analise', label: 'Em analise' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'realizado', label: 'Realizado' }
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

function formatarMoeda(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatarStatus(valor) {
  return String(valor || '-')
    .replace(/_/g, ' ')
    .toUpperCase();
}

export default function ProvisionamentosFinanceiros() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [contexto, setContexto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [lista, setLista] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    obra_id: '',
    categoria_macro_id: '',
    status: '',
    busca: ''
  });

  useEffect(() => {
    async function carregarBase() {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    }

    carregarBase();
  }, []);

  useEffect(() => {
    async function carregarLista() {
      try {
        setLoading(true);
        const data = await listarProvisoesFinanceiras({
          page: meta.page,
          limit: meta.limit,
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
      } catch (error) {
        console.error(error);
        alert(error?.message || 'Erro ao listar provisoes financeiras.');
      } finally {
        setLoading(false);
      }
    }

    if (contexto) {
      carregarLista();
    }
  }, [contexto, filtros, meta.page, meta.limit]);

  const obrasAcesso = useMemo(() => (
    Array.isArray(contexto?.obras_acesso) ? contexto.obras_acesso : []
  ), [contexto]);

  function atualizarFiltro(campo, valor) {
    setMeta((atual) => ({ ...atual, page: 1 }));
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
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
          {Boolean(contexto?.permissoes?.pode_criar) && (
            <button type="button" className="btn btn-primary" onClick={() => navigate('/provisoes-financeiras/nova')}>
              Nova provisao
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm">
            Obra
            <select className="input" value={filtros.obra_id} onChange={(event) => atualizarFiltro('obra_id', event.target.value)}>
              <option value="">Todas</option>
              {obrasAcesso.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.codigo ? `${obra.codigo} - ` : ''}
                  {obra.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Categoria macro
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
            Busca
            <input
              className="input"
              placeholder="Codigo, descricao ou fornecedor"
              value={filtros.busca}
              onChange={(event) => atualizarFiltro('busca', event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Registros</h2>
          <span className="text-sm text-[var(--c-muted)]">{meta.total || 0} registro(s)</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">Carregando...</div>
        ) : lista.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">Nenhuma provisao financeira encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Obra</th>
                  <th>Data prevista</th>
                  <th>Categoria</th>
                  <th>Descricao</th>
                  <th>Fornecedor</th>
                  <th>Valor previsto</th>
                  <th>Status</th>
                  <th>Criador</th>
                  <th>Criado em</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-xs font-semibold">{item.codigo}</td>
                    <td>{item.obra ? `${item.obra.codigo ? `${item.obra.codigo} - ` : ''}${item.obra.nome}` : '-'}</td>
                    <td>{formatarData(item.data_prevista_desembolso)}</td>
                    <td>{item.categoriaMacro?.nome || '-'}</td>
                    <td>{item.descricao || '-'}</td>
                    <td>{item.fornecedor_texto || '-'}</td>
                    <td>{formatarMoeda(item.valor_previsto)}</td>
                    <td>{formatarStatus(item.status)}</td>
                    <td>{item.usuarioCriacao?.nome || '-'}</td>
                    <td>{formatarData(item.createdAt)}</td>
                    <td>
                      <button type="button" className="btn btn-outline" onClick={() => navigate(`/provisoes-financeiras/${item.id}`)}>
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
          <span className="text-[var(--c-muted)]">
            Pagina {meta.page || 1} de {meta.pages || 1}
          </span>
          <div className="flex gap-2">
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
