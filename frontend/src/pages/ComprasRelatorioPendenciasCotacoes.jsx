import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TabelaPadrao } from '../components/padrao';
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

function PendenciaBadge({ active, children, tone = 'amber' }) {
  if (!active) {
    return null;
  }
  const classes = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classes}`}>
      {children}
    </span>
  );
}

export default function ComprasRelatorioPendenciasCotacoes() {
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
        const data = await obterRelatorioPendenciasCotacoesCompras(filtrosAtivos);
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
  const cotacoes = useMemo(() => (Array.isArray(relatorio?.cotacoes) ? relatorio.cotacoes : []), [relatorio]);
  const fornecedoresVencidos = useMemo(() => (
    Array.isArray(relatorio?.fornecedores_vencidos) ? relatorio.fornecedores_vencidos : []
  ), [relatorio]);
  const obrasResumo = useMemo(() => (Array.isArray(relatorio?.obras) ? relatorio.obras : []), [relatorio]);

  function aplicarFiltros(event) {
    event.preventDefault();
    setSearchParams(buildSearchParams(filtros));
  }

  function limparFiltros() {
    setFiltros(DEFAULT_FILTERS);
    setSearchParams(new URLSearchParams());
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <p className="eyebrow">Compras / Relatorios</p>
            <h1 className="page-title">Pendencias de Cotacoes</h1>
            <p className="page-subtitle">
              Cotacoes sem minimo de respostas e fornecedores com prazo vencido sem resposta.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/compras/relatorios" className="btn btn-outline">
              Voltar aos relatorios
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card solicitacoes-filtros app-filters-card">
        <form className="grid gap-4" onSubmit={aplicarFiltros}>
          <div className="app-filters-grid">
            <label className="app-filter-field">
              <span className="app-filter-label">Obra / Centro de custo</span>
              <select
                className="input"
                value={filtros.obra_id}
                onChange={(event) => setFiltros((current) => ({ ...current, obra_id: event.target.value }))}
              >
                <option value="">Todos</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Cotacao criada de</span>
              <input
                className="input"
                type="date"
                value={filtros.data_inicio}
                onChange={(event) => setFiltros((current) => ({ ...current, data_inicio: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Cotacao criada ate</span>
              <input
                className="input"
                type="date"
                value={filtros.data_fim}
                onChange={(event) => setFiltros((current) => ({ ...current, data_fim: event.target.value }))}
              />
            </label>
          </div>

          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={limparFiltros}>
              Limpar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar relatorio'}
            </button>
          </div>
        </form>
      </div>

      {erro && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="metric-card">
          <span>Cotacoes</span>
          <strong>{formatNumber(resumo.cotacoes)}</strong>
          <small>Com fornecedores enviados</small>
        </div>
        <div className="metric-card">
          <span>Sem minimo</span>
          <strong>{formatNumber(resumo.cotacoes_sem_minimo)}</strong>
          <small>Minimo atual: {formatNumber(resumo.minimo_cotacoes)}</small>
        </div>
        <div className="metric-card">
          <span>Prazo vencido</span>
          <strong>{formatNumber(resumo.cotacoes_com_prazo_vencido)}</strong>
          <small>Cotacoes com fornecedor atrasado</small>
        </div>
        <div className="metric-card">
          <span>Fornecedores vencidos</span>
          <strong>{formatNumber(resumo.fornecedores_vencidos_sem_resposta)}</strong>
          <small>Sem resposta ate o prazo</small>
        </div>
        <div className="metric-card">
          <span>Taxa resposta</span>
          <strong>{formatPercent(resumo.taxa_resposta)}</strong>
          <small>Respondidos sobre enviados</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Cotacoes com pendencias</h2>
        <p className="page-subtitle mb-3">Top 100 cotacoes priorizadas por prazo vencido e falta de respostas minimas.</p>
        <TabelaPadrao
          colunas={[
            {
              id: 'cotacao',
              titulo: 'Cotacao',
              // R17: a cotacao (SC) NOMEIA o registro.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => (
                <Link className="font-semibold text-blue-700 hover:underline" to={`/solicitacoes-compra/${item.id}`}>
                  SC #{item.id}
                </Link>
              )
            },
            { id: 'titulo', titulo: 'Titulo', tipo: 'texto', render: (item) => <span className="font-semibold text-slate-900">{item.titulo || '-'}</span> },
            { id: 'obra', titulo: 'Obra/Centro', tipo: 'texto', render: (item) => item.obra?.nome || '-' },
            { id: 'status', titulo: 'Status', tipo: 'status', render: (item) => item.status || '-' },
            { id: 'fornecedores', titulo: 'Enviados', tipo: 'numero', render: (item) => formatNumber(item.fornecedores_enviados) },
            { id: 'respostas', titulo: 'Respostas', tipo: 'numero', render: (item) => `${formatNumber(item.fornecedores_respondidos)} / ${formatNumber(item.minimo_cotacoes)}` },
            {
              id: 'pendencias',
              titulo: 'Pendencias',
              tipo: 'badge',
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <PendenciaBadge active={item.sem_minimo}>Sem minimo</PendenciaBadge>
                  <PendenciaBadge active={item.prazo_vencido} tone="red">Prazo vencido</PendenciaBadge>
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
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Fornecedores vencidos sem resposta</h2>
          <p className="page-subtitle mb-3">Fornecedores com prazo de resposta anterior a hoje e sem resposta registrada.</p>
          <TabelaPadrao
            colunas={[
              {
                id: 'cotacao',
                titulo: 'Cotacao',
                tipo: 'codigo',
                render: (item) => (
                  <Link className="font-semibold text-blue-700 hover:underline" to={`/solicitacoes-compra/${item.cotacao_id}`}>
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
              { id: 'prazo', titulo: 'Prazo', tipo: 'data', render: (item) => <span className="font-semibold text-red-700">{formatDate(item.prazo_resposta)}</span> }
            ]}
            itens={fornecedoresVencidos}
            getId={(item) => `${item.cotacao_id}-${item.fornecedor_id || item.fornecedor_nome}`}
            carregando={loading}
            storageKey="tabela:compras-pendencias-cotacoes:fornecedores-vencidos"
            rotuloRolagem="Fornecedores vencidos sem resposta"
            vazio="Sem fornecedores vencidos sem resposta."
          />
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Pendencias por obra/centro</h2>
          <p className="page-subtitle mb-3">Onde estao concentradas cotacoes sem minimo e com prazo vencido.</p>
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
        </div>
      </div>
    </div>
  );
}
