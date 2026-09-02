import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowDownTray, HiOutlineBuildingOffice2, HiOutlineXMark } from 'react-icons/hi2';
import {
  confirmarImportacaoCustosHistoricosObra,
  getArquivosDoTitulo,
  getCategoriasFinanceiras,
  getRelatorioFinanceiroObras,
  previewImportacaoCustosHistoricosObra
} from '../services/financeiro';
import { fileUrl } from '../services/api';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros } from '../services/parceiros';
import { TabelaPadrao } from '../components/padrao';

const IMPORT_PREVIEW_PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStartIso() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

const DEFAULT_FILTERS = {
  analise: 'REALIZADO',
  periodo: 'PERSONALIZADO',
  data_inicial: getMonthStartIso(),
  data_final: getTodayIso(),
  obra_id: '',
  empresa_id: '',
  tipo: '',
  parceiro_id: '',
  categoria_financeira_id: '',
  incluir_historico: '1',
  q: '',
  limit: '1000'
};

const ANALISE_OPTIONS = [
  {
    value: 'REALIZADO',
    label: 'Realizado',
    description: 'Baixas efetivas no periodo, pela data de baixa.'
  },
  {
    value: 'COMPROMETIDO',
    label: 'Comprometido',
    description: 'Titulos existentes no periodo, pela data de vencimento.'
  },
  {
    value: 'A_REALIZAR',
    label: 'A realizar',
    description: 'Saldo em aberto dos titulos, pela data de vencimento.'
  }
];

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
  if (normalized === 'HISTORICO') return 'app-status-pill bg-indigo-100 text-indigo-700';
  if (normalized.startsWith('FRETE_')) return 'app-status-pill bg-cyan-100 text-cyan-800';
  if (normalized === 'QUITADO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'PARCIAL') return 'app-status-pill bg-amber-100 text-amber-700';
  if (normalized === 'ABERTO') return 'app-status-pill bg-slate-100 text-slate-700';
  return 'app-status-pill bg-slate-100 text-slate-600';
}

function formatStatus(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'FRETE_EMBUTIDO') return 'Frete embutido';
  if (normalized === 'FRETE_PENDENTE') return 'Frete pendente';
  return value || '-';
}

function csvValue(value) {
  const text = String(value ?? '');
  if (/[",;\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function Metric({ label, value, detail, tone = 'default' }) {
  const color = tone === 'positive' ? '#047857' : tone === 'negative' ? '#b91c1c' : 'var(--c-text)';
  return (
    <div className="app-metric-card">
      <span className="app-filter-label">{label}</span>
      <strong className="text-xl" style={{ color }}>{value}</strong>
      <small className="text-[var(--c-muted)]">{detail}</small>
    </div>
  );
}

function ImportMetric({ label, value, detail, tone = 'default' }) {
  const toneClass =
    tone === 'positive'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : tone === 'negative'
        ? 'border-rose-200 bg-rose-50 text-rose-900'
        : tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-slate-200 bg-slate-50 text-slate-900';

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">{label}</span>
      <strong className="mt-1 block text-lg leading-tight">{value}</strong>
      <small className="mt-1 block text-xs opacity-75">{detail}</small>
    </div>
  );
}

export default function FinanceiroObras() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [relatorio, setRelatorio] = useState({ filtros: {}, resumo: {}, linhas: [] });
  const [obras, setObras] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importForm, setImportForm] = useState({
    obra_id: '',
    empresa_id: '',
    categoria_financeira_id: '',
    file: null
  });
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importPreviewPage, setImportPreviewPage] = useState(1);
  const [importPreviewPageSize, setImportPreviewPageSize] = useState(25);

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);

    Promise.all([
      getMinhasObras({ modo: 'FINANCEIRO' }).catch(() => []),
      getEmpresasGrupo({ ativo: true }).catch(() => []),
      buscarParceiros({ ativo: true, limit: 300 }).catch(() => []),
      getCategoriasFinanceiras().catch(() => [])
    ])
      .then(([obrasData, empresasData, parceirosData, categoriasData]) => {
        if (!active) return;
        setObras(Array.isArray(obrasData) ? obrasData : []);
        setEmpresas(Array.isArray(empresasData) ? empresasData : []);
        setParceiros(Array.isArray(parceirosData) ? parceirosData : []);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
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

    getRelatorioFinanceiroObras(compact(appliedFilters))
      .then((data) => {
        if (!active) return;
        setRelatorio({
          filtros: data?.filtros || {},
          resumo: data?.resumo || {},
          linhas: Array.isArray(data?.linhas) ? data.linhas : []
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar financeiro de obras');
        setRelatorio({ filtros: {}, resumo: {}, linhas: [] });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const analiseAtual = useMemo(
    () => ANALISE_OPTIONS.find((item) => item.value === filters.analise) || ANALISE_OPTIONS[0],
    [filters.analise]
  );

  const importPreviewRows = useMemo(
    () => (Array.isArray(importPreview?.linhas) ? importPreview.linhas : []),
    [importPreview]
  );

  const importPreviewTotalPages = Math.max(1, Math.ceil(importPreviewRows.length / importPreviewPageSize));

  const importPreviewPagedRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, importPreviewPage), importPreviewTotalPages);
    const start = (safePage - 1) * importPreviewPageSize;
    return importPreviewRows.slice(start, start + importPreviewPageSize);
  }, [importPreviewPage, importPreviewPageSize, importPreviewRows, importPreviewTotalPages]);

  /**
   * ITEM 22 (23/08): clicando na linha, os arquivos daquele pagamento.
   *
   * Nem `anexos` nem `comprovantes` apontam para o titulo — as duas apontam para a SOLICITACAO. Por
   * isso o que se ve aqui sao os arquivos da solicitacao vinculada, e por isso um titulo importado
   * do historico ou lancado a mao aparece com uma explicacao em vez de uma janela vazia.
   */
  const [arquivosModal, setArquivosModal] = useState(null);
  const [arquivosLoading, setArquivosLoading] = useState(false);
  const [arquivosErro, setArquivosErro] = useState('');

  async function abrirArquivos(linha) {
    if (!linha?.titulo_id) return;
    setArquivosErro('');
    setArquivosLoading(true);
    setArquivosModal({ carregando: true, titulo_codigo: linha.titulo_parcela || linha.titulo_id });
    try {
      setArquivosModal(await getArquivosDoTitulo(linha.titulo_id));
    } catch (error) {
      setArquivosErro(error?.message || 'Erro ao buscar os arquivos.');
      setArquivosModal(null);
    } finally {
      setArquivosLoading(false);
    }
  }

  function setFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  function limparFiltros() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }

  function resetImportModal() {
    setImportForm({
      obra_id: '',
      empresa_id: '',
      categoria_financeira_id: '',
      file: null
    });
    setImportPreview(null);
    setImportPreviewPage(1);
    setImportError('');
    setImportLoading(false);
  }

  function fecharImportModal() {
    setImportModalOpen(false);
    resetImportModal();
  }

  async function gerarPreviewImportacao(event) {
    event.preventDefault();
    setImportError('');
    setImportPreview(null);

    if (!importForm.obra_id) {
      setImportError('Selecione a obra que recebera o historico.');
      return;
    }
    if (!importForm.file) {
      setImportError('Selecione a planilha para validar.');
      return;
    }

    const formData = new FormData();
    formData.append('file', importForm.file);
    formData.append('obra_id', importForm.obra_id);
    if (importForm.empresa_id) formData.append('empresa_id', importForm.empresa_id);
    if (importForm.categoria_financeira_id) formData.append('categoria_financeira_id', importForm.categoria_financeira_id);

    setImportLoading(true);
    try {
      const data = await previewImportacaoCustosHistoricosObra(formData);
      setImportPreview(data);
      setImportPreviewPage(1);
    } catch (err) {
      setImportError(err?.message || 'Erro ao validar importacao');
    } finally {
      setImportLoading(false);
    }
  }

  async function confirmarImportacao() {
    if (!importPreview?.linhas?.length) {
      return;
    }

    setImportLoading(true);
    setImportError('');
    try {
      await confirmarImportacaoCustosHistoricosObra({
        arquivo_nome: importPreview.arquivo_nome,
        arquivo_hash: importPreview.arquivo_hash,
        linhas: importPreview.linhas
      });
      fecharImportModal();
      setAppliedFilters((current) => ({ ...current }));
    } catch (err) {
      setImportError(err?.message || 'Erro ao confirmar importacao');
    } finally {
      setImportLoading(false);
    }
  }

  function exportarCsv() {
    const header = [
      'Baixa',
      'Vencto',
      'Cliente/Fornecedor/Complemento',
      'Titulo/Parcela',
      'Documento',
      'Plano financeiro',
      'Credito',
      'Debito',
      'Saldo',
      'Obra',
      'Empresa',
      'Status'
    ];
    const rows = relatorio.linhas.map((linha) => [
      formatDate(linha.data_baixa),
      formatDate(linha.data_vencimento),
      linha.parceiro_nome || '',
      linha.titulo_parcela || '',
      linha.documento || '',
      linha.plano_financeiro || '',
      Number(linha.credito || 0).toFixed(2).replace('.', ','),
      Number(linha.debito || 0).toFixed(2).replace('.', ','),
      Number(linha.saldo || 0).toFixed(2).replace('.', ','),
      linha.obra_nome || '',
      linha.empresa_nome || '',
      linha.status_titulo || ''
    ]);
    const csv = ['\uFEFF' + header.map(csvValue).join(';'), ...rows.map((row) => row.map(csvValue).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financeiro-obras-${filters.analise.toLowerCase()}-${filters.data_inicial || 'inicio'}-${filters.data_final || 'fim'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Financeiro de Obras</h1>
            <p className="page-subtitle">
              Relatorio de custo por obra baseado nos titulos financeiros, com visao realizada, comprometida e a realizar.
            </p>
          </div>
          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={() => setImportModalOpen(true)}>
              Importar historico
            </button>
            <button type="button" className="btn btn-outline" onClick={exportarCsv} disabled={!relatorio.linhas.length}>
              <HiOutlineArrowDownTray /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      <form className="card sol-surface-card" onSubmit={aplicarFiltros}>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="app-filter-field">
            <span className="app-filter-label">Analise</span>
            <select className="input w-full input-sm" value={filters.analise} onChange={(e) => setFilter('analise', e.target.value)}>
              {ANALISE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Data inicial</span>
            <input className="input w-full input-sm" type="date" value={filters.data_inicial} onChange={(e) => setFilter('data_inicial', e.target.value)} />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Data final</span>
            <input className="input w-full input-sm" type="date" value={filters.data_final} onChange={(e) => setFilter('data_final', e.target.value)} />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Tipo</span>
            <select className="input w-full input-sm" value={filters.tipo} onChange={(e) => setFilter('tipo', e.target.value)}>
              <option value="">Pagar e receber</option>
              <option value="PAGAR">Pagar</option>
              <option value="RECEBER">Receber</option>
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Limite</span>
            <input className="input w-full input-sm" type="number" min="1" max="3000" value={filters.limit} onChange={(e) => setFilter('limit', e.target.value)} />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Busca</span>
            <input className="input w-full input-sm" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} placeholder="Titulo, documento, parceiro..." />
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="app-filter-field">
            <span className="app-filter-label">Obra/Centro de custo</span>
            <select className="input w-full input-sm" value={filters.obra_id} onChange={(e) => setFilter('obra_id', e.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>{obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}</option>
              ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Empresa</span>
            <select className="input w-full input-sm" value={filters.empresa_id} onChange={(e) => setFilter('empresa_id', e.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
              ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Parceiro</span>
            <select className="input w-full input-sm" value={filters.parceiro_id} onChange={(e) => setFilter('parceiro_id', e.target.value)} disabled={loadingOptions}>
              <option value="">Todos</option>
              {parceiros.map((parceiro) => (
                <option key={parceiro.id} value={parceiro.id}>{parceiro.nome}</option>
              ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Plano financeiro</span>
            <select className="input w-full input-sm" value={filters.categoria_financeira_id} onChange={(e) => setFilter('categoria_financeira_id', e.target.value)} disabled={loadingOptions}>
              <option value="">Todos</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-[var(--c-muted)]">
            <HiOutlineBuildingOffice2 className="mt-0.5" />
            <span>{analiseAtual.description}</span>
          </div>
          {filters.analise === 'REALIZADO' ? (
            <label className="flex items-center gap-2 text-sm text-[var(--c-muted)]">
              <input
                type="checkbox"
                checked={filters.incluir_historico !== '0'}
                onChange={(event) => setFilter('incluir_historico', event.target.checked ? '1' : '0')}
              />
              Incluir historico legado no executado
            </label>
          ) : null}
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar</button>
            <button type="submit" className="btn btn-primary btn-sm">Gerar relatorio</button>
          </div>
        </div>
      </form>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}

      <div className="app-summary-grid">
        <Metric label="Credito" value={formatCurrency(relatorio.resumo.credito_total)} detail="Entradas no recorte" tone="positive" />
        <Metric label="Debito" value={formatCurrency(relatorio.resumo.debito_total)} detail="Saidas no recorte" tone="negative" />
        <Metric
          label="Saldo"
          value={formatCurrency(relatorio.resumo.saldo_total)}
          detail={`${relatorio.resumo.quantidade_linhas || 0} linha(s)`}
          tone={Number(relatorio.resumo.saldo_total || 0) >= 0 ? 'positive' : 'negative'}
        />
        <Metric
          label="Titulos"
          value={String(relatorio.resumo.titulos || 0)}
          detail={`${relatorio.resumo.movimentos || 0} baixa(s) / ${relatorio.resumo.historicos || 0} historico(s) / ${relatorio.resumo.fretes || 0} frete(s)`}
        />
      </div>

      <section className="card sol-surface-card app-dense-table-card financeiro-obras-detalhamento-card">
        <div className="app-dense-table-header">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Detalhamento financeiro</h2>
          <p className="text-sm text-[var(--c-muted)]">
            Periodo: {formatDate(relatorio.filtros.data_inicial)} ate {formatDate(relatorio.filtros.data_final)}.
          </p>
        </div>

        <TabelaPadrao
          colunas={[
            { id: 'data_baixa', titulo: 'Baixa', tipo: 'data', render: (linha) => formatDate(linha.data_baixa) },
            { id: 'data_vencimento', titulo: 'Vencto', tipo: 'data', render: (linha) => formatDate(linha.data_vencimento) },
            {
              id: 'parceiro_nome',
              titulo: 'Cliente/Fornecedor',
              // R17: o parceiro NOMEIA a linha do detalhamento.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (linha) => (
                <div data-testid={`linha-titulo-${linha.titulo_id || 'sem-titulo'}`}>
                  <strong className="block text-[var(--c-text)]">{linha.parceiro_nome || '-'}</strong>
                  <small className="text-[var(--c-muted)]">{linha.parceiro_cpf_cnpj || ''}</small>
                </div>
              )
            },
            { id: 'titulo_parcela', titulo: 'Titulo/Parcela', tipo: 'codigo', render: (linha) => linha.titulo_parcela || '-' },
            { id: 'documento', titulo: 'Documento', tipo: 'codigo', render: (linha) => <span className="text-xs">{linha.documento || '-'}</span> },
            { id: 'plano_financeiro', titulo: 'Plano financeiro', tipo: 'texto', render: (linha) => <span className="line-clamp-2">{linha.plano_financeiro || '-'}</span> },
            { id: 'credito', titulo: 'Credito', tipo: 'valor', render: (linha) => <span className="text-emerald-700 font-semibold">{linha.credito ? formatCurrency(linha.credito) : '-'}</span> },
            { id: 'debito', titulo: 'Debito', tipo: 'valor', render: (linha) => <span className="text-rose-700 font-semibold">{linha.debito ? formatCurrency(linha.debito) : '-'}</span> },
            { id: 'saldo', titulo: 'Saldo', tipo: 'valor', render: (linha) => <strong>{formatCurrency(linha.saldo)}</strong> },
            { id: 'obra_nome', titulo: 'Obra', tipo: 'texto', render: (linha) => (linha.obra_codigo ? `${linha.obra_codigo} - ${linha.obra_nome || ''}` : (linha.obra_nome || '-')) },
            { id: 'empresa_nome', titulo: 'Empresa', tipo: 'texto', render: (linha) => linha.empresa_nome || '-' },
            { id: 'status_titulo', titulo: 'Status', tipo: 'status', render: (linha) => <span className={statusClass(linha.status_titulo)}>{formatStatus(linha.status_titulo)}</span> }
          ]}
          itens={relatorio.linhas}
          carregando={loading}
          aoClicarLinha={abrirArquivos}
          storageKey="tabela:financeiro-obras:detalhamento"
          rotuloRolagem="Detalhamento financeiro das obras"
          vazio="Nenhum titulo encontrado para os filtros selecionados."
        />
      </section>

      {arquivosModal || arquivosErro ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="card sol-surface-card w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            data-testid="modal-arquivos-titulo">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Arquivos do pagamento</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  {arquivosModal?.solicitacao_codigo
                    ? `Titulo ${arquivosModal.titulo_codigo || ''} · solicitacao ${arquivosModal.solicitacao_codigo}`
                    : `Titulo ${arquivosModal?.titulo_codigo || ''}`}
                </p>
              </div>
              <button type="button" className="btn btn-icon btn-outline" aria-label="Fechar"
                onClick={() => { setArquivosModal(null); setArquivosErro(''); }}>
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {arquivosErro ? <div className="app-alert app-alert--error">{arquivosErro}</div> : null}
            {arquivosLoading ? <p className="text-sm text-[var(--c-muted)]">Carregando arquivos...</p> : null}

            {/* Titulo sem solicitacao nao tem arquivo — e isso e dito, em vez de abrir uma lista
                vazia que a pessoa leria como "os arquivos sumiram". */}
            {arquivosModal?.motivo ? (
              <p className="text-sm text-[var(--c-muted)]" data-testid="arquivos-motivo">{arquivosModal.motivo}</p>
            ) : null}

            {arquivosModal && !arquivosModal.motivo && !arquivosLoading
              && (arquivosModal.arquivos || []).length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]" data-testid="arquivos-vazio">
                  A solicitacao deste pagamento nao tem nenhum arquivo anexado.
                </p>
              ) : null}

            <ul className="space-y-2">
              {(arquivosModal?.arquivos || []).map((arquivo) => (
                <li key={arquivo.id}
                  className="flex items-center justify-between gap-3 rounded border border-[var(--c-border)] px-3 py-2"
                  data-testid={`arquivo-${arquivo.id}`}>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-[var(--c-text)]">{arquivo.nome}</strong>
                    <small className="text-[var(--c-muted)]">
                      {arquivo.origem === 'COMPROVANTE' ? 'Comprovante' : 'Anexo'}
                      {arquivo.tipo ? ` · ${arquivo.tipo}` : ''}
                    </small>
                  </span>
                  <a
                    className="btn btn-outline btn-sm shrink-0"
                    href={String(arquivo.caminho || '').startsWith('http') ? arquivo.caminho : fileUrl(arquivo.caminho)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {importModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="card sol-surface-card w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Importar custos historicos</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  As linhas importadas entram somente no executado/recebido do Financeiro de Obras e nao geram titulos, baixas, DRE ou movimento bancario.
                </p>
              </div>
              <button type="button" className="btn btn-icon btn-outline" onClick={fecharImportModal} disabled={importLoading} aria-label="Fechar">
                <HiOutlineXMark />
              </button>
            </div>

            {importError ? <div className="app-alert app-alert--error mb-3">{importError}</div> : null}

            <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={gerarPreviewImportacao}>
              <label className="app-filter-field">
                <span className="app-filter-label">Obra/Centro de custo</span>
                <select
                  className="input w-full input-sm"
                  value={importForm.obra_id}
                  onChange={(event) => setImportForm((current) => ({ ...current, obra_id: event.target.value }))}
                  disabled={loadingOptions || importLoading}
                >
                  <option value="">Selecione</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>{obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}</option>
                  ))}
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Empresa padrao</span>
                <select
                  className="input w-full input-sm"
                  value={importForm.empresa_id}
                  onChange={(event) => setImportForm((current) => ({ ...current, empresa_id: event.target.value }))}
                  disabled={loadingOptions || importLoading}
                >
                  <option value="">Usar empresa da obra/planilha</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                  ))}
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Plano financeiro padrao</span>
                <select
                  className="input w-full input-sm"
                  value={importForm.categoria_financeira_id}
                  onChange={(event) => setImportForm((current) => ({ ...current, categoria_financeira_id: event.target.value }))}
                  disabled={loadingOptions || importLoading}
                >
                  <option value="">Usar plano da planilha</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                  ))}
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Planilha</span>
                <input
                  className="input w-full input-sm"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => setImportForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                  disabled={importLoading}
                />
              </label>

              <div className="md:col-span-2 xl:col-span-4 flex justify-end gap-2">
                <button type="button" className="btn btn-outline btn-sm" onClick={resetImportModal} disabled={importLoading}>Limpar</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={importLoading}>
                  {importLoading ? 'Validando...' : 'Pre-visualizar'}
                </button>
              </div>
            </form>

            {importPreview ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <ImportMetric label="Importaveis" value={String(importPreview.resumo?.importaveis || 0)} detail="Linhas validas" tone="positive" />
                  <ImportMetric label="Duplicadas" value={String(importPreview.resumo?.duplicados || 0)} detail="Ja importadas" />
                  <ImportMetric label="Erros" value={String(importPreview.resumo?.erros || 0)} detail="Linhas ignoradas" tone={importPreview.resumo?.erros ? 'negative' : 'default'} />
                  <ImportMetric label="Creditos" value={formatCurrency(importPreview.resumo?.credito_total)} detail="Recebido legado" tone="positive" />
                  <ImportMetric label="Debitos" value={formatCurrency(importPreview.resumo?.debito_total)} detail="Custo legado" tone="negative" />
                  <ImportMetric label="Total" value={formatCurrency(importPreview.resumo?.valor_total)} detail="Total importavel" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-muted)] px-3 py-2">
                  <span className="text-sm text-[var(--c-muted)]">
                    Exibindo {importPreviewPagedRows.length} de {importPreviewRows.length} linha(s) da pre-visualizacao.
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-[var(--c-muted)]">
                      Por pagina
                      <select
                        className="input input-sm w-24"
                        value={importPreviewPageSize}
                        onChange={(event) => {
                          setImportPreviewPageSize(Number(event.target.value) || 25);
                          setImportPreviewPage(1);
                        }}
                      >
                        {IMPORT_PREVIEW_PAGE_SIZE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setImportPreviewPage((page) => Math.max(1, page - 1))}
                      disabled={importPreviewPage <= 1}
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-[var(--c-muted)]">{Math.min(importPreviewPage, importPreviewTotalPages)}/{importPreviewTotalPages}</span>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setImportPreviewPage((page) => Math.min(importPreviewTotalPages, page + 1))}
                      disabled={importPreviewPage >= importPreviewTotalPages}
                    >
                      Proxima
                    </button>
                  </div>
                </div>

                <div className="app-dense-table-wrapper max-h-[52vh] overflow-auto">
                  <TabelaPadrao
                    colunas={[
                      { id: 'row_number', titulo: 'Linha', tipo: 'numero', render: (linha) => linha.row_number },
                      { id: 'status', titulo: 'Status', tipo: 'status', render: (linha) => <span className={statusClass(linha.status === 'VALIDA' ? 'QUITADO' : linha.status)}>{linha.status}</span> },
                      { id: 'data_pagamento', titulo: 'Baixa', tipo: 'data', render: (linha) => formatDate(linha.data_pagamento) },
                      {
                        id: 'parceiro_nome',
                        titulo: 'Fornecedor',
                        // R17: o fornecedor NOMEIA a linha da pre-visualizacao.
                        tipo: 'identidade',
                        noCard: 'titulo',
                        render: (linha) => linha.parceiro_nome || '-'
                      },
                      { id: 'documento', titulo: 'Documento', tipo: 'codigo', render: (linha) => linha.documento || '-' },
                      { id: 'plano_financeiro', titulo: 'Plano financeiro', tipo: 'texto', render: (linha) => linha.plano_financeiro || '-' },
                      { id: 'credito', titulo: 'Credito', tipo: 'valor', render: (linha) => <span className="font-semibold text-emerald-700">{linha.tipo === 'RECEBER' ? formatCurrency(linha.valor) : '-'}</span> },
                      { id: 'debito', titulo: 'Debito', tipo: 'valor', render: (linha) => <span className="font-semibold text-rose-700">{linha.tipo === 'PAGAR' ? formatCurrency(linha.valor) : '-'}</span> },
                      { id: 'observacao', titulo: 'Observacao', tipo: 'texto', render: (linha) => <span className="text-xs text-[var(--c-muted)]">{linha.erros?.join(' ') || '-'}</span> }
                    ]}
                    itens={importPreviewPagedRows}
                    getId={(linha) => `${linha.row_number}-${linha.hash_linha}`}
                    storageKey="tabela:financeiro-obras:importacao-preview"
                    rotuloRolagem="Pre-visualizacao da importacao de custos historicos"
                    vazio="Nenhuma linha na pre-visualizacao."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-outline btn-sm" onClick={fecharImportModal} disabled={importLoading}>Cancelar</button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={confirmarImportacao}
                    disabled={importLoading || !importPreview.resumo?.importaveis}
                  >
                    {importLoading ? 'Importando...' : 'Confirmar importacao'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
