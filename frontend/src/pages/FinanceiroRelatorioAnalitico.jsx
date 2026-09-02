import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowDownTray,
  HiOutlineEye,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark
} from 'react-icons/hi2';
import {
  getCategoriasFinanceiras,
  getContasBancarias,
  getRelatorioAnaliticoFinanceiro
} from '../services/financeiro';
import { TabelaPadrao } from '../components/padrao';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros } from '../services/parceiros';

// Uma chave só para a tabela: a TabelaPadrao guarda nela a escolha de
// colunas (visíveis + ordem) e as larguras. Substitui a chave antiga
// "fluxy.financeiro.relatorioAnalitico.columns", que a tela mantinha à mão.
const STORAGE_KEY = 'tabela:financeiro-relatorio-analitico';

const DEFAULT_FILTERS = {
  tipo: '',
  status_titulo: '',
  status_movimento: 'TODOS',
  q: '',
  obra_id: '',
  parceiro_id: '',
  categoria_financeira_id: '',
  conta_bancaria_id: '',
  data_inicial: '',
  data_final: '',
  vencimento_inicial: '',
  vencimento_final: '',
  limit: '500'
};

function compact(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
  );
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return '-';
  return `${day}/${month}/${year}`;
}

function statusClass(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'PREVISAO') return 'app-status-pill bg-sky-100 text-sky-700';
  if (['QUITADO', 'ATIVO'].includes(normalized)) return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (['PARCIAL', 'SEM_BAIXA'].includes(normalized)) return 'app-status-pill bg-amber-100 text-amber-700';
  if (['ESTORNADO', 'CANCELADO'].includes(normalized)) return 'app-status-pill bg-rose-100 text-rose-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function toCsvValue(value) {
  const text = String(value ?? '');
  if (/[",;\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// Leitores de célula: o mesmo valor serve para a grade e para o CSV.
const campoTexto = (id) => (row) => row[id] || '-';
const campoData = (id) => (row) => formatDate(row[id]);
const campoValor = (id) => (row) => formatCurrency(row[id]);

/* COLUNAS DO RELATÓRIO — a escolha (quais e em que ordem) é do usuário,
   pelo painel "Colunas" da TabelaPadrao. `texto` é o que vai para o CSV
   quando a célula da grade é um elemento (link, pílula de status). */
const COLUNAS = [
  {
    id: 'titulo_codigo',
    titulo: 'Titulo',
    // R17: o código do título é o que nomeia a linha do relatório.
    tipo: 'identidade',
    noCard: 'titulo',
    texto: campoTexto('titulo_codigo'),
    render: (row) => (
      <Link className="font-semibold text-[var(--c-primary)] hover:underline" to={`/financeiro/titulos/${row.titulo_id}`}>
        {row.titulo_codigo || '-'}
      </Link>
    )
  },
  { id: 'tipo', titulo: 'Tipo', tipo: 'texto', render: campoTexto('tipo') },
  {
    id: 'status_titulo',
    titulo: 'Status titulo',
    tipo: 'status',
    texto: campoTexto('status_titulo'),
    render: (row) => <span className={statusClass(row.status_titulo)}>{row.status_titulo || '-'}</span>
  },
  {
    id: 'status_movimento',
    titulo: 'Status baixa',
    tipo: 'status',
    texto: campoTexto('status_movimento'),
    render: (row) => <span className={statusClass(row.status_movimento)}>{row.status_movimento || '-'}</span>
  },
  { id: 'parceiro_nome', titulo: 'Parceiro', tipo: 'texto', render: campoTexto('parceiro_nome') },
  { id: 'parceiro_cpf_cnpj', titulo: 'CPF/CNPJ', tipo: 'codigo', render: campoTexto('parceiro_cpf_cnpj') },
  { id: 'obra_nome', titulo: 'Obra', tipo: 'texto', render: campoTexto('obra_nome') },
  { id: 'categoria_nome', titulo: 'Categoria', tipo: 'texto', render: campoTexto('categoria_nome') },
  { id: 'numero_documento', titulo: 'Documento', tipo: 'codigo', render: campoTexto('numero_documento') },
  { id: 'data_emissao', titulo: 'Emissao', tipo: 'data', render: campoData('data_emissao') },
  { id: 'data_vencimento', titulo: 'Vencimento', tipo: 'data', render: campoData('data_vencimento') },
  { id: 'data_movimento', titulo: 'Data baixa', tipo: 'data', render: campoData('data_movimento') },
  { id: 'conta_bancaria_nome', titulo: 'Conta', tipo: 'texto', render: campoTexto('conta_bancaria_nome') },
  { id: 'valor_original', titulo: 'Valor original', tipo: 'valor', render: campoValor('valor_original') },
  { id: 'valor_saldo', titulo: 'Saldo', tipo: 'valor', render: campoValor('valor_saldo') },
  { id: 'valor_baixado', titulo: 'Valor baixado', tipo: 'valor', render: campoValor('valor_baixado') },
  { id: 'valor_movimento', titulo: 'Valor movimento', tipo: 'valor', render: campoValor('valor_movimento') },
  { id: 'juros', titulo: 'Juros', tipo: 'valor', render: campoValor('juros') },
  { id: 'multa', titulo: 'Multa', tipo: 'valor', render: campoValor('multa') },
  { id: 'desconto', titulo: 'Desconto', tipo: 'valor', render: campoValor('desconto') },
  { id: 'valor_quitacao', titulo: 'Quitacao', tipo: 'valor', render: campoValor('valor_quitacao') },
  { id: 'usuario_baixa', titulo: 'Usuario baixa', tipo: 'texto', render: campoTexto('usuario_baixa') },
  { id: 'origem', titulo: 'Origem', tipo: 'texto', render: campoTexto('origem') }
];

/* O CSV exporta EXATAMENTE o que está na grade — quais colunas e em que
   ordem. Quem manda nisso agora é o painel da TabelaPadrao, que grava a
   escolha em `<storageKey>:colunas`; o componente não devolve a escolha
   para a tela, então a leitura acontece aqui, no clique (sempre o valor
   mais recente, sem estado duplicado). Sem preferência salva, vale a
   ordem declarada. */
function colunasVisiveis() {
  const ids = COLUNAS.map((coluna) => coluna.id);
  let pref = null;
  try {
    pref = JSON.parse(localStorage.getItem(`${STORAGE_KEY}:colunas`) || 'null');
  } catch (error) {
    pref = null;
  }
  if (!pref) return COLUNAS;
  const salva = Array.isArray(pref.ordem) ? pref.ordem.filter((id) => ids.includes(id)) : [];
  const ordem = [...salva, ...ids.filter((id) => !salva.includes(id))];
  const visiveis = Array.isArray(pref.visiveis) ? pref.visiveis : null;
  const ocultas = Array.isArray(pref.ocultas) ? pref.ocultas : [];
  return ordem
    .filter((id) => (visiveis ? visiveis.includes(id) || !ocultas.includes(id) : true))
    .map((id) => COLUNAS.find((coluna) => coluna.id === id));
}

export default function FinanceiroRelatorioAnalitico() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [relatorio, setRelatorio] = useState({ resumo: {}, linhas: [] });
  const [obras, setObras] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);

    Promise.all([
      getMinhasObras({ modo: 'FINANCEIRO' }).catch(() => []),
      buscarParceiros({ ativo: true, limit: 300 }).catch(() => []),
      getCategoriasFinanceiras().catch(() => []),
      getContasBancarias().catch(() => [])
    ])
      .then(([obrasData, parceirosData, categoriasData, contasData]) => {
        if (!active) return;
        setObras(Array.isArray(obrasData) ? obrasData : []);
        setParceiros(Array.isArray(parceirosData) ? parceirosData : []);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        setContas(Array.isArray(contasData) ? contasData : []);
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getRelatorioAnaliticoFinanceiro(compact(appliedFilters))
      .then((data) => {
        if (!active) return;
        setRelatorio({
          resumo: data?.resumo || {},
          linhas: Array.isArray(data?.linhas) ? data.linhas : []
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar relatorio analitico');
        setRelatorio({ resumo: {}, linhas: [] });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  function setFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  function limparFiltros() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }

  function exportarCsv() {
    const escolhidas = colunasVisiveis();
    const header = escolhidas.map((column) => toCsvValue(column.titulo)).join(';');
    const rows = relatorio.linhas.map((row) => (
      escolhidas
        .map((column) => toCsvValue((column.texto || column.render)(row)))
        .join(';')
    ));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio-financeiro-analitico.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header-row">
        <div>
          <h1 className="page-title">Relatorio Analitico Financeiro</h1>
          <p className="page-subtitle">Monte a visao por titulo, baixa, conta e parceiro. Use o painel "Colunas" para escolher e reordenar os campos.</p>
        </div>
        <div className="app-page-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={exportarCsv} disabled={!relatorio.linhas.length}>
            <HiOutlineArrowDownTray className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      <form className="card sol-surface-card" onSubmit={aplicarFiltros}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Tipo</span>
            <select className="input w-full input-sm" value={filters.tipo} onChange={(event) => setFilter('tipo', event.target.value)}>
              <option value="">Todos</option>
              <option value="PAGAR">Pagar</option>
              <option value="RECEBER">Receber</option>
            </select>
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Status titulo</span>
            <select className="input w-full input-sm" value={filters.status_titulo} onChange={(event) => setFilter('status_titulo', event.target.value)}>
              <option value="">Todos</option>
              <option value="PREVISAO">Previsao</option>
              <option value="ABERTO">Aberto</option>
              <option value="PARCIAL">Parcial</option>
              <option value="QUITADO">Quitado</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="ESTORNADO">Estornado</option>
            </select>
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Status baixa</span>
            <select className="input w-full input-sm" value={filters.status_movimento} onChange={(event) => setFilter('status_movimento', event.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="ATIVO">Ativo</option>
              <option value="ESTORNADO">Estornado</option>
              <option value="SEM_BAIXA">Sem baixa</option>
            </select>
          </label>
          <label className="app-filter-field xl:col-span-6">
            <span className="app-filter-label">Busca</span>
            <input className="input w-full input-sm" value={filters.q} onChange={(event) => setFilter('q', event.target.value)} placeholder="Titulo, parceiro, documento ou obra" />
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Baixa inicial</span>
            <input className="input w-full input-sm" type="date" value={filters.data_inicial} onChange={(event) => setFilter('data_inicial', event.target.value)} />
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Baixa final</span>
            <input className="input w-full input-sm" type="date" value={filters.data_final} onChange={(event) => setFilter('data_final', event.target.value)} />
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Venc. inicial</span>
            <input className="input w-full input-sm" type="date" value={filters.vencimento_inicial} onChange={(event) => setFilter('vencimento_inicial', event.target.value)} />
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Venc. final</span>
            <input className="input w-full input-sm" type="date" value={filters.vencimento_final} onChange={(event) => setFilter('vencimento_final', event.target.value)} />
          </label>
          <label className="app-filter-field xl:col-span-4">
            <span className="app-filter-label">Obra</span>
            <select className="input w-full input-sm" value={filters.obra_id} onChange={(event) => setFilter('obra_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field xl:col-span-4">
            <span className="app-filter-label">Parceiro</span>
            <select className="input w-full input-sm" value={filters.parceiro_id} onChange={(event) => setFilter('parceiro_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todos</option>
              {parceiros.map((parceiro) => <option key={parceiro.id} value={parceiro.id}>{parceiro.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field xl:col-span-4">
            <span className="app-filter-label">Categoria</span>
            <select className="input w-full input-sm" value={filters.categoria_financeira_id} onChange={(event) => setFilter('categoria_financeira_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field xl:col-span-4">
            <span className="app-filter-label">Conta</span>
            <select className="input w-full input-sm" value={filters.conta_bancaria_id} onChange={(event) => setFilter('conta_bancaria_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--c-border)] pt-3">
          <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>
            <HiOutlineXMark className="h-4 w-4" />
            Limpar
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            <HiOutlineMagnifyingGlass className="h-4 w-4" />
            Consultar
          </button>
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="card sol-surface-card"><span className="app-summary-label">Linhas</span><strong className="app-summary-value">{relatorio.resumo?.quantidade_linhas || 0}</strong></div>
        <div className="card sol-surface-card"><span className="app-summary-label">Titulos</span><strong className="app-summary-value">{relatorio.resumo?.titulos || 0}</strong></div>
        <div className="card sol-surface-card"><span className="app-summary-label">Saldo</span><strong className="app-summary-value">{formatCurrency(relatorio.resumo?.total_saldo)}</strong></div>
        <div className="card sol-surface-card"><span className="app-summary-label">Quitacao</span><strong className="app-summary-value">{formatCurrency(relatorio.resumo?.total_quitacao)}</strong></div>
      </div>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}

      <section className="card sol-surface-card">
        <TabelaPadrao
          colunas={COLUNAS}
          itens={relatorio.linhas}
          carregando={loading}
          colunasConfiguraveis
          storageKey={STORAGE_KEY}
          rotuloRolagem="Relatorio analitico financeiro"
          vazio="Nenhuma linha encontrada."
          larguraAcoes={120}
          acoesLinha={(row) => (
            <Link className="btn btn-outline btn-sm" to={`/financeiro/titulos/${row.titulo_id}`} title="Abrir titulo">
              <HiOutlineEye className="h-4 w-4" />
            </Link>
          )}
        />
      </section>

    </div>
  );
}
