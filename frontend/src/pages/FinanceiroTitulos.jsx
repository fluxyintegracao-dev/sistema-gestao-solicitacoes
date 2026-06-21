import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineDocumentChartBar,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineXMark
} from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';
import {
  baixarTituloFinanceiro,
  baixarTitulosFinanceirosEmMassaParcelado,
  getCategoriasFinanceiras,
  getCartoesFinanceiros,
  getChequesTerceirosDisponiveis,
  getContasBancarias,
  getTitulosFinanceiros,
  excluirTitulosFinanceirosEmMassa,
  importarCodigosBarrasTitulos
} from '../services/financeiro';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros } from '../services/parceiros';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import { normalizeCurrencyTyping } from '../utils/formatters';
import ParceiroAutocomplete from '../components/ui/ParceiroAutocomplete';

const FILTER_STORAGE_KEY = 'fluxy.financeiro.titulos.filters';
const FILTER_VISIBILITY_STORAGE_PREFIX = 'fluxy.financeiro.titulos.visibleFilters';
const COLUMN_ORDER_STORAGE_PREFIX = 'fluxy.financeiro.titulos.columnOrder';
const FORMAS_RECEBIMENTO = ['DINHEIRO', 'PIX', 'CARTAO', 'TRANSFERENCIA', 'BOLETO', 'CHEQUE', 'PERMUTA', 'BENS', 'OUTROS'];
const PAGE_SIZE_OPTIONS = ['25', '50', '100', '150', '200', 'all'];

const FILTER_DEFINITIONS = [
  { id: 'codigo', label: 'Titulo', group: 'basic', span: 'xl:col-span-2' },
  { id: 'q', label: 'Busca rapida', group: 'basic', span: 'xl:col-span-4' },
  { id: 'status', label: 'Status', group: 'basic', span: 'xl:col-span-2' },
  { id: 'numero_documento', label: 'N. documento', group: 'basic', span: 'xl:col-span-2' },
  { id: 'parceiro_id', label: 'Cliente/Credor', group: 'basic', span: 'xl:col-span-4' },
  { id: 'obra_id', label: 'Obra', group: 'basic', span: 'xl:col-span-4' },
  { id: 'data_emissao_inicial', label: 'Emissao inicio', group: 'basic', span: 'xl:col-span-2' },
  { id: 'data_emissao_final', label: 'Emissao fim', group: 'basic', span: 'xl:col-span-2' },
  { id: 'categoria_financeira_id', label: 'Categoria financeira', group: 'advanced', span: 'xl:col-span-3' },
  { id: 'vencimento_inicial', label: 'Vencimento inicio', group: 'advanced', span: 'xl:col-span-2' },
  { id: 'vencimento_final', label: 'Vencimento fim', group: 'advanced', span: 'xl:col-span-2' }
];

const DEFAULT_VISIBLE_FILTER_IDS = FILTER_DEFINITIONS.map((item) => item.id);

function getDefaultFilters(tipo = 'RECEBER') {
  return {
    tipo,
    status: 'ABERTO',
    q: '',
    codigo: '',
    obra_id: '',
    parceiro_id: '',
    categoria_financeira_id: '',
    numero_documento: '',
    data_emissao_inicial: '',
    data_emissao_final: '',
    vencimento_inicial: '',
    vencimento_final: ''
  };
}

function normalizeFilters(filters = {}, forcedTipo = null) {
  const normalized = {
    ...getDefaultFilters(forcedTipo || 'RECEBER'),
    ...Object.fromEntries(
      Object.entries(filters || {}).map(([key, value]) => [key, value == null ? '' : String(value)])
    )
  };
  return forcedTipo ? { ...normalized, tipo: forcedTipo } : normalized;
}

function compactFilters(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
  );
}

function getVisibilityStorageKey(user, storagePrefix = FILTER_VISIBILITY_STORAGE_PREFIX) {
  const userToken = user?.id || user?.email || 'anonimo';
  return `${storagePrefix}.${userToken}`;
}

function loadVisibleFilterIds(user, storagePrefix = FILTER_VISIBILITY_STORAGE_PREFIX) {
  try {
    const stored = localStorage.getItem(getVisibilityStorageKey(user, storagePrefix));
    const parsed = stored ? JSON.parse(stored) : null;
    if (!Array.isArray(parsed)) {
      return DEFAULT_VISIBLE_FILTER_IDS;
    }

    const allowed = new Set(FILTER_DEFINITIONS.map((item) => item.id));
    const normalized = parsed.filter((id) => allowed.has(id));
    return normalized.length > 0 ? normalized : DEFAULT_VISIBLE_FILTER_IDS;
  } catch (error) {
    return DEFAULT_VISIBLE_FILTER_IDS;
  }
}

function getColumnOrderStorageKey(user, fixedTipo = null) {
  const userToken = user?.id || user?.email || 'anonimo';
  const scope = fixedTipo ? fixedTipo.toLowerCase() : 'geral';
  return `${COLUMN_ORDER_STORAGE_PREFIX}.${scope}.${userToken}`;
}

function loadColumnOrder(user, fixedTipo, headers) {
  try {
    const stored = localStorage.getItem(getColumnOrderStorageKey(user, fixedTipo));
    const parsed = stored ? JSON.parse(stored) : null;
    if (!Array.isArray(parsed)) return headers;
    const allowed = new Set(headers);
    const ordered = parsed.filter((header) => allowed.has(header));
    const missing = headers.filter((header) => !ordered.includes(header));
    return [...ordered, ...missing];
  } catch (error) {
    return headers;
  }
}

function pickVisibleFilters(filters, visibleFilterIds) {
  const visible = new Set(visibleFilterIds);
  return Object.fromEntries(
    Object.entries(filters).filter(([key]) => key === 'tipo' || visible.has(key))
  );
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatChequeTerceiroLabel(cheque) {
  const numero = cheque?.numero_cheque || cheque?.codigo || 'Sem numero';
  const titular = cheque?.titular_nome || cheque?.cliente_nome || cheque?.parceiroEntregou?.nome || 'Titular nao informado';
  const vencimento = cheque?.data_vencimento ? ` - venc. ${formatDate(cheque.data_vencimento)}` : '';
  return `${numero} - ${titular} - ${formatCurrency(cheque?.valor)}${vencimento}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatCodigoBarrasExport(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const normalized = text.replace(/\s+/g, '').replace(/[^\d.,]/g, '');
  if (/^\d+[.,]0+$/.test(normalized)) {
    return normalized.replace(/[.,]0+$/, '');
  }
  return normalized.replace(/\D/g, '');
}

function parseCsvLine(line = '') {
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === ';' || char === ',') && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCsvText(text = '') {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => ({
      ...row,
      [header]: values[index] || ''
    }), {});
  });
}

function downloadCsv(filename, rows) {
  const content = rows.map((row) => row.map(csvEscape).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function statusClass(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'QUITADO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'PARCIAL') return 'app-status-pill bg-amber-100 text-amber-700';
  if (normalized === 'CANCELADO' || normalized === 'ESTORNADO') return 'app-status-pill bg-rose-100 text-rose-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function isOverdue(titulo) {
  const normalized = String(titulo?.status || '').trim().toUpperCase();
  if (!['ABERTO', 'PARCIAL'].includes(normalized)) return false;
  const today = new Date();
  const dueDate = new Date(`${titulo?.data_vencimento}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return false;
  return dueDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function getTituloCodigo(titulo) {
  return titulo?.codigo || `#${titulo?.id}`;
}

function getOrigemTitulo(titulo) {
  if (titulo?.solicitacao?.id) return 'Solicitacao';
  if (titulo?.forma_cobranca) return 'Comercial';
  return 'Manual';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function contaBancariaObrigatoria(formaRecebimento) {
  return !['DINHEIRO', 'CARTAO', 'PERMUTA', 'BENS', 'OUTROS'].includes(String(formaRecebimento || '').toUpperCase());
}

function isCartaoForma(formaRecebimento) {
  return String(formaRecebimento || '').toUpperCase() === 'CARTAO';
}

function isChequeForma(formaRecebimento) {
  return String(formaRecebimento || '').toUpperCase() === 'CHEQUE';
}

function isCartaoDebito(cartao) {
  return String(cartao?.tipo || '').toUpperCase() === 'DEBITO';
}

function getCartaoLabel(cartao) {
  const tipo = isCartaoDebito(cartao) ? 'Debito' : 'Credito';
  const bandeira = cartao?.bandeira ? `${cartao.bandeira} ` : '';
  const final = cartao?.ultimos_digitos ? ` final ${cartao.ultimos_digitos}` : '';
  return `${cartao?.nome || 'Cartao'} - ${tipo} - ${bandeira}${final}`.trim();
}

function isTituloBaixavel(titulo) {
  return ['ABERTO', 'PARCIAL'].includes(String(titulo?.status || '').trim().toUpperCase()) && Number(titulo?.valor_saldo || 0) > 0;
}

function isTituloEditavel(titulo) {
  return String(titulo?.status || '').trim().toUpperCase() === 'ABERTO' && Number(titulo?.valor_baixado || 0) === 0;
}

function parseCurrencyInput(value) {
  if (value == null || value === '') return 0;
  const raw = String(value).trim().replace(/[R$\s]/gi, '');
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundValue(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function formatCurrencyInput(value) {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function addMonthsToDate(dateString, amount) {
  const date = new Date(`${dateString || today()}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString || today();
  const day = date.getDate();
  date.setMonth(date.getMonth() + Number(amount || 0), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function buildBaixaMassaParcelas(total = 0, quantidade = 2, dataInicial = today()) {
  const qtd = Math.max(1, Math.min(Number(quantidade || 1), 60));
  const totalCentavos = Math.round(Number(total || 0) * 100);
  const base = Math.floor(totalCentavos / qtd);
  let resto = totalCentavos - (base * qtd);
  return Array.from({ length: qtd }, (_, index) => {
    const centavos = base + (resto > 0 ? 1 : 0);
    if (resto > 0) resto -= 1;
    return {
      data_movimento: addMonthsToDate(dataInicial, index),
      valor: formatCurrencyInput(centavos / 100),
      documento_referencia: '',
      cheque_numero: '',
      cheque_emitente: '',
      cheque_banco: '',
      cheque_agencia: '',
      cheque_conta: '',
      usar_cheque_terceiro: false,
      cheque_terceiro_id: '',
      observacoes: ''
    };
  });
}

function buildBaixaMassaForm(contasBancarias = [], total = 0) {
  return {
    empresa_id: '',
    conta_bancaria_id: '',
    cartao_id: '',
    forma_recebimento: '',
    desconto: '',
    cheque_numero: '',
    cheque_emitente: '',
    cheque_banco: '',
    cheque_agencia: '',
    cheque_conta: '',
    cheque_terceiro_id: '',
    data_movimento: today(),
    observacoes: '',
    parcelado: false,
    usar_cheque_terceiro: false,
    quantidade_parcelas: 2,
    parcelas: buildBaixaMassaParcelas(total, 2, today())
  };
}

export default function FinanceiroTitulos({ tipoFixo = null }) {
  const { user } = useAuth();
  const fixedTipo = ['PAGAR', 'RECEBER'].includes(String(tipoFixo || '').toUpperCase())
    ? String(tipoFixo).toUpperCase()
    : null;
  const filterStorageKey = fixedTipo ? `${FILTER_STORAGE_KEY}.${fixedTipo.toLowerCase()}` : FILTER_STORAGE_KEY;
  const visibilityStoragePrefix = fixedTipo
    ? `${FILTER_VISIBILITY_STORAGE_PREFIX}.${fixedTipo.toLowerCase()}`
    : FILTER_VISIBILITY_STORAGE_PREFIX;
  const pageTitle = fixedTipo === 'PAGAR'
    ? 'Contas a Pagar'
    : fixedTipo === 'RECEBER'
      ? 'Contas a Receber'
      : 'Consulta de Titulos Financeiros';
  const pageSubtitle = fixedTipo === 'PAGAR'
    ? 'Consulte, baixe e acompanhe os compromissos financeiros em aberto ou quitados.'
    : fixedTipo === 'RECEBER'
      ? 'Consulte, baixe e acompanhe os recebimentos em aberto ou quitados.'
      : 'Filtre a carteira antes de operar baixas, boletos e integracoes.';
  const [saveFilterCache, setSaveFilterCache] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filterChooserOpen, setFilterChooserOpen] = useState(false);
  const [visibleFilterIds, setVisibleFilterIds] = useState(() => loadVisibleFilterIds(user, visibilityStoragePrefix));
  const [draftFilters, setDraftFilters] = useState(() => {
    try {
      const stored = localStorage.getItem(filterStorageKey);
      return normalizeFilters(stored ? JSON.parse(stored) : getDefaultFilters(fixedTipo || 'RECEBER'), fixedTipo);
    } catch (error) {
      return getDefaultFilters(fixedTipo || 'RECEBER');
    }
  });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [obras, setObras] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [chequesTerceiros, setChequesTerceiros] = useState([]);
  const [empresasGrupo, setEmpresasGrupo] = useState([]);
  const [titulos, setTitulos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: '25', total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');
  const [selectedTituloIds, setSelectedTituloIds] = useState([]);
  const [modalBaixaMassaOpen, setModalBaixaMassaOpen] = useState(false);
  const [baixaMassaForm, setBaixaMassaForm] = useState(() => buildBaixaMassaForm([]));
  const [savingBaixaMassa, setSavingBaixaMassa] = useState(false);
  const [importandoCodigos, setImportandoCodigos] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);

    Promise.all([
      getMinhasObras({ modo: 'FINANCEIRO' }).catch(() => []),
      buscarParceiros({ ativo: true, limit: 200 }).catch(() => []),
      getCategoriasFinanceiras().catch(() => []),
      getContasBancarias().catch(() => []),
      getCartoesFinanceiros().catch(() => []),
      getChequesTerceirosDisponiveis().catch(() => []),
      getEmpresasGrupo({ ativo: true }).catch(() => [])
    ])
      .then(([obrasData, parceirosData, categoriasData, contasData, cartoesData, chequesData, empresasData]) => {
        if (!active) return;
        setObras(Array.isArray(obrasData) ? obrasData : []);
        setParceiros(Array.isArray(parceirosData) ? parceirosData : []);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        const contasNormalizadas = Array.isArray(contasData) ? contasData : [];
        setContasBancarias(contasNormalizadas);
        setCartoes(Array.isArray(cartoesData) ? cartoesData : []);
        setChequesTerceiros(Array.isArray(chequesData) ? chequesData : []);
        setEmpresasGrupo(Array.isArray(empresasData) ? empresasData : []);
      })
      .finally(() => {
        if (active) {
          setLoadingOptions(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setVisibleFilterIds(loadVisibleFilterIds(user, visibilityStoragePrefix));
    setFilterChooserOpen(false);
  }, [user?.id, user?.email, visibilityStoragePrefix]);

  useEffect(() => {
    const defaults = getDefaultFilters(fixedTipo || 'RECEBER');
    let nextFilters = defaults;

    try {
      const stored = localStorage.getItem(filterStorageKey);
      nextFilters = normalizeFilters(stored ? JSON.parse(stored) : defaults, fixedTipo);
    } catch (error) {
      nextFilters = defaults;
    }

    setDraftFilters(nextFilters);
    setAppliedFilters(null);
    setTitulos([]);
    setPagination((current) => ({ ...current, page: 1, total: 0, total_pages: 0 }));
    setLoading(false);
    setError('');
    setSelectedTituloIds([]);
  }, [filterStorageKey, fixedTipo]);

  useEffect(() => {
    if (!appliedFilters) {
      setTitulos([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');

    getTitulosFinanceiros({
      ...compactFilters(pickVisibleFilters(appliedFilters, visibleFilterIds)),
      paginated: 1,
      page: pagination.page,
      limit: pagination.limit
    })
      .then((data) => {
        if (active) {
          if (Array.isArray(data)) {
            setTitulos(data);
            setPagination((current) => ({
              ...current,
              total: data.length,
              total_pages: data.length > 0 ? 1 : 0
            }));
          } else {
            setTitulos(Array.isArray(data?.data) ? data.data : []);
            setPagination((current) => ({
              ...current,
              ...(data?.pagination || {}),
              page: Number(data?.pagination?.page || current.page || 1),
              limit: data?.pagination?.limit || current.limit
            }));
          }
          setSelectedTituloIds([]);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || 'Erro ao carregar titulos financeiros');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [appliedFilters, pagination.page, pagination.limit, visibleFilterIds]);

  const categoriasFiltradas = useMemo(() => {
    const tipo = String(draftFilters.tipo || '').toUpperCase();
    return categorias.filter((categoria) => {
      const categoriaTipo = String(categoria?.tipo || '').toUpperCase();
      return categoriaTipo === tipo;
    });
  }, [categorias, draftFilters.tipo]);

  const parceirosFiltrados = useMemo(() => {
    const tipo = String(draftFilters.tipo || '').toUpperCase();
    return parceiros.filter((parceiro) => (
      tipo === 'PAGAR'
        ? parceiro?.fornecedor !== false || parceiro?.corretor === true
        : parceiro?.cliente !== false
    ));
  }, [parceiros, draftFilters.tipo]);

  const resumo = useMemo(() => titulos.reduce((acc, item) => {
    acc.total += Number(item.valor_original || 0);
    acc.saldo += Number(item.valor_saldo || 0);
    acc.quantidade += 1;
    if (isOverdue(item)) {
      acc.vencido += Number(item.valor_saldo || 0);
      acc.quantidadeVencida += 1;
    }
    return acc;
  }, {
    total: 0,
    saldo: 0,
    vencido: 0,
    quantidade: 0,
    quantidadeVencida: 0
  }), [titulos]);

  const hasConsulted = Boolean(appliedFilters);
  const visibleFilterSet = useMemo(() => new Set(visibleFilterIds), [visibleFilterIds]);
  const basicVisibleFilters = useMemo(
    () => FILTER_DEFINITIONS.filter((item) => item.group === 'basic' && visibleFilterSet.has(item.id)),
    [visibleFilterSet]
  );
  const advancedVisibleFilters = useMemo(
    () => FILTER_DEFINITIONS.filter((item) => item.group === 'advanced' && visibleFilterSet.has(item.id)),
    [visibleFilterSet]
  );
  const tipoAtual = fixedTipo || draftFilters.tipo;
  const tipoReferencia = fixedTipo || appliedFilters?.tipo || draftFilters.tipo;
  const tipoLabel = tipoReferencia === 'PAGAR' ? 'a pagar' : 'a receber';
  const parceiroLabel = tipoAtual === 'PAGAR' ? 'Credor' : 'Cliente';
  const parceiroResultadoLabel = tipoReferencia === 'PAGAR' ? 'Credor' : 'Cliente';
  const categoriasLabel = tipoAtual === 'PAGAR' ? 'contas a pagar' : 'contas a receber';
  const showTipoColumn = !fixedTipo;
  const baseTableHeaders = useMemo(() => [
    'Titulo',
    'Status',
    ...(showTipoColumn ? ['Tipo'] : []),
    'Documento',
    parceiroResultadoLabel,
    'Obra',
    'Categoria',
    'Origem',
    'Emissao',
    'Vencimento',
    'Valor total',
    'Saldo',
    'Acoes'
  ], [showTipoColumn, parceiroResultadoLabel]);
  const [columnOrder, setColumnOrder] = useState(() => loadColumnOrder(user, fixedTipo, baseTableHeaders));
  const tableHeaders = useMemo(() => {
    const allowed = new Set(baseTableHeaders);
    const ordered = columnOrder.filter((header) => allowed.has(header));
    const missing = baseTableHeaders.filter((header) => !ordered.includes(header));
    return [...ordered, ...missing];
  }, [baseTableHeaders, columnOrder]);
  const totalColunas = 1 + tableHeaders.length;
  const titulosBaixaveis = useMemo(() => titulos.filter(isTituloBaixavel), [titulos]);
  const selectedTituloSet = useMemo(() => new Set(selectedTituloIds.map((id) => Number(id))), [selectedTituloIds]);
  const selectedTitulos = useMemo(
    () => titulos.filter((titulo) => selectedTituloSet.has(Number(titulo.id))),
    [titulos, selectedTituloSet]
  );
  const selectedTitulosBaixaveis = useMemo(() => selectedTitulos.filter(isTituloBaixavel), [selectedTitulos]);
  const selectedSaldo = useMemo(() => selectedTitulosBaixaveis.reduce(
    (total, titulo) => total + Number(titulo.valor_saldo || 0),
    0
  ), [selectedTitulosBaixaveis]);
  const contasBancariasBaixaMassa = useMemo(() => {
    if (!baixaMassaForm.empresa_id) return [];
    return contasBancarias.filter((conta) => String(conta.empresa_id || '') === String(baixaMassaForm.empresa_id));
  }, [baixaMassaForm.empresa_id, contasBancarias]);
  const selectedCartaoBaixaMassa = useMemo(
    () => cartoes.find((cartao) => String(cartao.id) === String(baixaMassaForm.cartao_id)) || null,
    [cartoes, baixaMassaForm.cartao_id]
  );
  const cartoesBaixaMassa = useMemo(() => cartoes.filter((cartao) => {
    if (cartao.ativo === false) return false;
    if (!baixaMassaForm.empresa_id) return true;
    if (!isCartaoDebito(cartao)) return true;
    const contaCartao = contasBancarias.find((conta) => String(conta.id) === String(cartao.conta_bancaria_id));
    return String(contaCartao?.empresa_id || '') === String(baixaMassaForm.empresa_id);
  }), [baixaMassaForm.empresa_id, cartoes, contasBancarias]);
  const baixaMassaUsaCartao = isCartaoForma(baixaMassaForm.forma_recebimento);
  const baixaMassaCartaoDebito = baixaMassaUsaCartao && isCartaoDebito(selectedCartaoBaixaMassa);
  const baixaMassaFormaParcelavel = baixaMassaUsaCartao || isChequeForma(baixaMassaForm.forma_recebimento);
  const baixaMassaParcelada = baixaMassaFormaParcelavel && Boolean(baixaMassaForm.parcelado);
  const baixaMassaTipoSelecionado = String(selectedTitulosBaixaveis[0]?.tipo || fixedTipo || draftFilters.tipo || '').toUpperCase();
  const chequesTerceirosDisponiveis = useMemo(
    () => chequesTerceiros.filter((cheque) => String(cheque?.status || '').toUpperCase() === 'EM_CARTEIRA'),
    [chequesTerceiros]
  );
  const baixaMassaUsaChequeTerceiro = isChequeForma(baixaMassaForm.forma_recebimento) &&
    baixaMassaTipoSelecionado === 'PAGAR' &&
    Boolean(baixaMassaForm.usar_cheque_terceiro);
  const baixaMassaTotalParcelas = useMemo(() => (
    (baixaMassaForm.parcelas || []).reduce((total, parcela) => total + parseCurrencyInput(parcela.valor), 0)
  ), [baixaMassaForm.parcelas]);
  const baixaMassaDiferencaParcelas = roundValue(selectedSaldo - baixaMassaTotalParcelas);
  const allBaixaveisSelected = titulosBaixaveis.length > 0 && titulosBaixaveis.every((titulo) => selectedTituloSet.has(Number(titulo.id)));

  useEffect(() => {
    setColumnOrder((current) => {
      const allowed = new Set(baseTableHeaders);
      const ordered = current.filter((header) => allowed.has(header));
      const missing = baseTableHeaders.filter((header) => !ordered.includes(header));
      return [...ordered, ...missing];
    });
  }, [baseTableHeaders]);

  useEffect(() => {
    try {
      localStorage.setItem(getColumnOrderStorageKey(user, fixedTipo), JSON.stringify(tableHeaders));
    } catch (error) {
      // Mantem a tabela funcional mesmo quando o navegador bloqueia storage.
    }
  }, [fixedTipo, tableHeaders, user]);

  function moverColuna(header, direction) {
    setColumnOrder(() => {
      const ordered = tableHeaders.slice();
      const index = ordered.indexOf(header);
      const nextIndex = direction === 'left' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return ordered;
      [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
      return ordered;
    });
  }

  function renderTituloCell(titulo, header) {
    switch (header) {
      case 'Titulo':
        return (
          <td className="px-3 py-2 whitespace-nowrap">
            <Link
              className="font-semibold text-[var(--c-primary)] hover:underline"
              to={`/financeiro/titulos/${titulo.id}`}
            >
              {getTituloCodigo(titulo)}
            </Link>
            <div className="max-w-[220px] truncate text-[10px] text-[var(--c-muted)]">
              {titulo.descricao || '-'}
            </div>
          </td>
        );
      case 'Status':
        return (
          <td className="px-3 py-2 whitespace-nowrap">
            <span className={statusClass(titulo.status)}>{titulo.status}</span>
          </td>
        );
      case 'Tipo':
        return <td className="px-3 py-2 font-medium text-[var(--c-muted)] whitespace-nowrap">{titulo.tipo}</td>;
      case 'Documento':
        return <td className="px-3 py-2 whitespace-nowrap">{titulo.numero_documento || '-'}</td>;
      case parceiroResultadoLabel:
        return (
          <td className="px-3 py-2">
            <div className="max-w-[180px] truncate font-medium text-[var(--c-text)]">{titulo.parceiro?.nome || '-'}</div>
            <div className="text-[10px] text-[var(--c-muted)]">{titulo.parceiro?.cpf_cnpj || ''}</div>
          </td>
        );
      case 'Obra':
        return (
          <td className="px-3 py-2">
            <div className="max-w-[150px] truncate text-[var(--c-muted)]">{titulo.obra?.nome || '-'}</div>
          </td>
        );
      case 'Categoria':
        return (
          <td className="px-3 py-2">
            <div className="max-w-[150px] truncate text-[var(--c-muted)]">{titulo.categoriaFinanceira?.nome || '-'}</div>
          </td>
        );
      case 'Origem':
        return (
          <td className="px-3 py-2 whitespace-nowrap">
            {titulo.solicitacao?.id ? (
              <Link
                className="text-[var(--c-primary)] hover:underline"
                to={`/solicitacoes/${titulo.solicitacao.id}`}
              >
                {titulo.solicitacao.codigo || `#${titulo.solicitacao.id}`}
              </Link>
            ) : (
              getOrigemTitulo(titulo)
            )}
          </td>
        );
      case 'Emissao':
        return <td className="px-3 py-2 whitespace-nowrap text-[var(--c-muted)]">{formatDate(titulo.data_emissao)}</td>;
      case 'Vencimento':
        return (
          <td className={`px-3 py-2 whitespace-nowrap ${isOverdue(titulo) ? 'font-semibold text-rose-600' : 'text-[var(--c-text)]'}`}>
            {formatDate(titulo.data_vencimento)}
          </td>
        );
      case 'Valor total':
        return (
          <td className="px-3 py-2 whitespace-nowrap text-[var(--c-text)] tabular-nums">
            {formatCurrency(titulo.valor_original)}
          </td>
        );
      case 'Saldo':
        return (
          <td className="px-3 py-2 whitespace-nowrap font-semibold text-[var(--c-text)] tabular-nums">
            {formatCurrency(titulo.valor_saldo)}
          </td>
        );
      case 'Acoes':
        return (
          <td className="px-3 py-2 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Link
                className="btn btn-outline btn-sm"
                to={`/financeiro/titulos/${titulo.id}`}
                title="Abrir titulo"
              >
                <HiOutlineEye className="h-4 w-4" />
              </Link>
              {isTituloEditavel(titulo) ? (
                <Link
                  className="btn btn-outline btn-sm"
                  to={`/financeiro/titulos/${titulo.id}/editar`}
                  title="Editar informacoes do titulo"
                >
                  <HiOutlinePencilSquare className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline btn-sm opacity-50"
                  disabled
                  title="Somente titulos em aberto e sem baixa podem ser editados"
                >
                  <HiOutlinePencilSquare className="h-4 w-4" />
                </button>
              )}
            </div>
          </td>
        );
      default:
        return <td className="px-3 py-2">-</td>;
    }
  }

  function setFilter(name, value) {
    setDraftFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function setTipoFiltro(tipo) {
    if (fixedTipo) return;
    setDraftFilters({
      ...getDefaultFilters(),
      tipo
    });
    setAppliedFilters(null);
    setTitulos([]);
    setLoading(false);
    setError('');
    setSelectedTituloIds([]);
  }

  function submitFilters(event) {
    event.preventDefault();
    const normalized = normalizeFilters(draftFilters, fixedTipo);
    const visibleFilters = pickVisibleFilters(normalized, visibleFilterIds);
    if (Object.keys(compactFilters(visibleFilters)).length === 0) {
      setError('Selecione ao menos um filtro visivel antes de consultar.');
      setTitulos([]);
      setAppliedFilters(null);
      return;
    }

    setAppliedFilters(normalized);
    setPagination((current) => ({ ...current, page: 1, total: 0, total_pages: 0 }));
    if (saveFilterCache) {
      localStorage.setItem(filterStorageKey, JSON.stringify(normalized));
    } else {
      localStorage.removeItem(filterStorageKey);
    }
  }

  function clearFilters() {
    const defaults = getDefaultFilters(fixedTipo || 'RECEBER');
    setDraftFilters(defaults);
    setAppliedFilters(null);
    setTitulos([]);
    setPagination((current) => ({ ...current, page: 1, total: 0, total_pages: 0 }));
    setLoading(false);
    setError('');
    setSelectedTituloIds([]);
    localStorage.removeItem(filterStorageKey);
  }

  function toggleTituloSelecionado(titulo, checked) {
    if (!isTituloBaixavel(titulo)) return;
    const tituloId = Number(titulo.id);
    setSelectedTituloIds((current) => {
      const set = new Set(current.map((id) => Number(id)));
      if (checked) {
        set.add(tituloId);
      } else {
        set.delete(tituloId);
      }
      return Array.from(set);
    });
  }

  function toggleTodosBaixaveis(checked) {
    setSelectedTituloIds(checked ? titulosBaixaveis.map((titulo) => Number(titulo.id)) : []);
  }

  function abrirModalBaixaMassa() {
    if (selectedTitulosBaixaveis.length === 0) {
      setError('Selecione ao menos um titulo em aberto ou parcial para baixar.');
      return;
    }

    setError('');
    setBaixaMassaForm(buildBaixaMassaForm(contasBancarias, selectedSaldo));
    setModalBaixaMassaOpen(true);
  }

  async function excluirTitulosSelecionados() {
    if (selectedTitulosBaixaveis.length === 0) {
      setError('Selecione ao menos um titulo aberto ou parcial para excluir.');
      return;
    }

    const confirmado = window.confirm(
      `Excluir ${selectedTitulosBaixaveis.length} titulo(s) selecionado(s)? Eles sairao das telas e relatorios, mas ficarao preservados para auditoria.`
    );
    if (!confirmado) return;

    try {
      setLoading(true);
      setError('');
      await excluirTitulosFinanceirosEmMassa({
        titulo_ids: selectedTitulosBaixaveis.map((titulo) => Number(titulo.id)),
        motivo: 'Exclusao em massa pela tela de contas a pagar/receber'
      });

      const data = await getTitulosFinanceiros({
        ...compactFilters(pickVisibleFilters(appliedFilters, visibleFilterIds)),
        paginated: 1,
        page: pagination.page,
        limit: pagination.limit
      });
      setTitulos(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
      if (data?.pagination) {
        setPagination((current) => ({
          ...current,
          ...data.pagination,
          page: Number(data.pagination.page || current.page || 1),
          limit: data.pagination.limit || current.limit
        }));
      }
      setSelectedTituloIds([]);
    } catch (err) {
      setError(err?.message || 'Erro ao excluir titulos selecionados.');
    } finally {
      setLoading(false);
    }
  }

  function setBaixaMassaParcelamentoAtivo(checked) {
    setBaixaMassaForm((current) => ({
      ...current,
      parcelado: checked,
      desconto: checked ? '' : current.desconto,
      quantidade_parcelas: current.quantidade_parcelas || 2,
      parcelas: checked
        ? buildBaixaMassaParcelas(selectedSaldo, current.quantidade_parcelas || 2, current.data_movimento)
        : current.parcelas
    }));
  }

  function setQuantidadeParcelasBaixaMassa(value) {
    const quantidade = Math.max(1, Math.min(Number(value || 1), 60));
    setBaixaMassaForm((current) => ({
      ...current,
      quantidade_parcelas: quantidade,
      parcelas: buildBaixaMassaParcelas(selectedSaldo, quantidade, current.data_movimento)
    }));
  }

  function updateBaixaMassaParcela(index, field, value) {
    setBaixaMassaForm((current) => ({
      ...current,
      parcelas: (current.parcelas || []).map((parcela, itemIndex) => (
        itemIndex === index ? { ...parcela, [field]: value } : parcela
      ))
    }));
  }

  async function handleBaixaMassaSubmit(event) {
    event.preventDefault();
    if (selectedTitulosBaixaveis.length === 0) {
      setError('Selecione ao menos um titulo em aberto ou parcial para baixar.');
      return;
    }

    if (!baixaMassaForm.forma_recebimento) {
      setError('Informe a forma de recebimento/pagamento da baixa em massa.');
      return;
    }

    if (!baixaMassaForm.empresa_id) {
      setError('Informe a empresa pagadora da baixa em massa.');
      return;
    }

    if (baixaMassaUsaCartao && !baixaMassaForm.cartao_id) {
      setError('Informe o cartao utilizado na baixa em massa.');
      return;
    }

    if (baixaMassaParcelada && !baixaMassaForm.conta_bancaria_id) {
      setError('Informe a conta bancaria para conciliar as parcelas geradas.');
      return;
    }

    if (!baixaMassaParcelada && baixaMassaCartaoDebito && !baixaMassaForm.conta_bancaria_id) {
      setError('Cartao de debito precisa ter conta bancaria vinculada.');
      return;
    }

    if (!baixaMassaParcelada && contaBancariaObrigatoria(baixaMassaForm.forma_recebimento) && !baixaMassaForm.conta_bancaria_id) {
      setError('Conta bancaria e obrigatoria para esta forma de baixa.');
      return;
    }

    if (baixaMassaParcelada) {
      const parcelas = Array.isArray(baixaMassaForm.parcelas) ? baixaMassaForm.parcelas : [];
      if (parcelas.length === 0) {
        setError('Informe ao menos uma parcela para a baixa agrupada.');
        return;
      }
      const parcelaInvalida = parcelas.find((parcela) => !parcela.data_movimento || parseCurrencyInput(parcela.valor) <= 0);
      if (parcelaInvalida) {
        setError('Todas as parcelas precisam ter data e valor maior que zero.');
        return;
      }
      if (Math.abs(baixaMassaDiferencaParcelas) >= 0.01) {
        setError('A soma das parcelas precisa ser igual ao saldo total selecionado.');
        return;
      }
      if (isChequeForma(baixaMassaForm.forma_recebimento)) {
        if (baixaMassaUsaChequeTerceiro) {
          const chequeTerceiroInvalido = parcelas.find((parcela) => !String(parcela.cheque_terceiro_id || '').trim());
          if (chequeTerceiroInvalido) {
            setError('Selecione um cheque de terceiro disponivel para cada parcela.');
            return;
          }
        } else {
          const chequeInvalido = parcelas.find((parcela) => !String(parcela.cheque_numero || '').trim() || !String(parcela.cheque_emitente || '').trim());
          if (chequeInvalido) {
            setError('Para cheque, informe numero e emitente em todas as parcelas.');
            return;
          }
        }
      }
    }

    if (!baixaMassaParcelada && baixaMassaUsaChequeTerceiro) {
      if (!String(baixaMassaForm.cheque_terceiro_id || '').trim()) {
        setError('Selecione o cheque de terceiro usado na baixa.');
        return;
      }
    }

    if (!baixaMassaParcelada && isChequeForma(baixaMassaForm.forma_recebimento) && baixaMassaTipoSelecionado === 'RECEBER') {
      if (!String(baixaMassaForm.cheque_numero || '').trim() || !String(baixaMassaForm.cheque_emitente || '').trim()) {
        setError('Para receber em cheque, informe numero e emitente do cheque.');
          return;
      }
    }

    try {
      setSavingBaixaMassa(true);
      setError('');

      const falhas = [];
      if (baixaMassaParcelada) {
        await baixarTitulosFinanceirosEmMassaParcelado({
          titulo_ids: selectedTitulosBaixaveis.map((titulo) => Number(titulo.id)),
          empresa_id: baixaMassaForm.empresa_id,
          conta_bancaria_id: baixaMassaForm.conta_bancaria_id,
          cartao_id: baixaMassaForm.cartao_id || null,
          forma_recebimento: baixaMassaForm.forma_recebimento,
          data_movimento: baixaMassaForm.data_movimento,
          observacoes: baixaMassaForm.observacoes || 'Baixa em massa agrupada e parcelada.',
          parcelas: baixaMassaForm.parcelas.map((parcela) => ({
            ...parcela,
            usar_cheque_terceiro: Boolean(parcela.usar_cheque_terceiro),
            cheque_terceiro_id: parcela.cheque_terceiro_id || undefined,
            valor: parseCurrencyInput(parcela.valor)
          }))
        });
      } else {
        for (const titulo of selectedTitulosBaixaveis) {
          try {
            await baixarTituloFinanceiro(titulo.id, {
              empresa_id: baixaMassaForm.empresa_id,
              conta_bancaria_id: baixaMassaForm.conta_bancaria_id || null,
              cartao_id: baixaMassaForm.cartao_id || null,
              forma_recebimento: baixaMassaForm.forma_recebimento,
              valor: Number(titulo.valor_saldo || 0),
              desconto: baixaMassaForm.desconto || 0,
              usar_cheque_terceiro: Boolean(baixaMassaForm.usar_cheque_terceiro),
              cheque_terceiro_id: baixaMassaForm.cheque_terceiro_id || undefined,
              cheque_numero: baixaMassaForm.cheque_numero || undefined,
              cheque_emitente: baixaMassaForm.cheque_emitente || undefined,
              cheque_banco: baixaMassaForm.cheque_banco || undefined,
              cheque_agencia: baixaMassaForm.cheque_agencia || undefined,
              cheque_conta: baixaMassaForm.cheque_conta || undefined,
              data_movimento: baixaMassaForm.data_movimento,
              observacoes: baixaMassaForm.observacoes || `Baixa em massa registrada pela tela de titulos.`
            });
          } catch (err) {
            falhas.push(`${getTituloCodigo(titulo)}: ${err?.message || 'erro ao baixar'}`);
          }
        }
      }

      const data = await getTitulosFinanceiros({
        ...compactFilters(pickVisibleFilters(appliedFilters, visibleFilterIds)),
        paginated: 1,
        page: pagination.page,
        limit: pagination.limit
      });
      setTitulos(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
      if (data?.pagination) {
        setPagination((current) => ({
          ...current,
          ...data.pagination,
          page: Number(data.pagination.page || current.page || 1),
          limit: data.pagination.limit || current.limit
        }));
      }
      setSelectedTituloIds([]);
      setModalBaixaMassaOpen(false);

      if (falhas.length > 0) {
        setError(`Alguns titulos nao foram baixados: ${falhas.join(' | ')}`);
      } else {
        setError('');
        alert(`${selectedTitulosBaixaveis.length} titulo(s) baixado(s) com sucesso.`);
      }
    } catch (err) {
      setError(err?.message || 'Erro ao registrar baixas em massa.');
    } finally {
      setSavingBaixaMassa(false);
    }
  }

  function exportarModeloCodigosBarras() {
    const linhas = [
      ['id', 'codigo', 'tipo', 'credor_cliente', 'vencimento', 'valor_saldo', 'linha_digitavel', 'codigo_barras', 'banco_boleto']
    ];

    const base = titulos.length > 0 ? titulos : [];
    base.forEach((titulo) => {
      linhas.push([
        titulo.id,
        titulo.codigo || '',
        titulo.tipo || '',
        titulo.parceiro?.nome || '',
        titulo.data_vencimento || '',
        Number(titulo.valor_saldo || titulo.valor_original || 0).toFixed(2).replace('.', ','),
        titulo.linha_digitavel || '',
        formatCodigoBarrasExport(titulo.codigo_barras),
        titulo.banco_boleto || ''
      ]);
    });

    if (linhas.length === 1) {
      linhas.push(['', '', fixedTipo || draftFilters.tipo || 'PAGAR', '', '', '', '', '', '']);
    }

    downloadCsv(`modelo-codigos-barras-${fixedTipo || draftFilters.tipo || 'titulos'}.csv`, linhas);
  }

  async function importarCodigosBarras(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setImportandoCodigos(true);
      setError('');
      const text = await file.text();
      const itens = parseCsvText(text).map((row) => ({
        id: row.id || row.titulo_id,
        codigo: row.codigo || row.codigo_titulo || row.titulo,
        linha_digitavel: row.linha_digitavel || row.linha,
        codigo_barras: row.codigo_barras || row.barras,
        banco_boleto: row.banco_boleto || row.banco
      }));

      const resultado = await importarCodigosBarrasTitulos({ itens });
      if (appliedFilters) {
        const data = await getTitulosFinanceiros({
          ...compactFilters(pickVisibleFilters(appliedFilters, visibleFilterIds)),
          paginated: 1,
          page: pagination.page,
          limit: pagination.limit
        });
        setTitulos(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
        if (data?.pagination) {
          setPagination((current) => ({
            ...current,
            ...data.pagination,
            page: Number(data.pagination.page || current.page || 1),
            limit: data.pagination.limit || current.limit
          }));
        }
      }

      const erros = Array.isArray(resultado?.erros) && resultado.erros.length > 0
        ? `\n\nPendencias:\n${resultado.erros.slice(0, 10).map((item) => `Linha ${item.linha}: ${item.erro}`).join('\n')}`
        : '';
      alert(`Importacao concluida. Importados: ${resultado?.importados || 0}. Ignorados: ${resultado?.ignorados || 0}.${erros}`);
    } catch (err) {
      setError(err?.message || 'Erro ao importar codigos de barras.');
    } finally {
      setImportandoCodigos(false);
    }
  }

  function persistVisibleFilters(nextIds) {
    const normalized = nextIds.length > 0 ? nextIds : DEFAULT_VISIBLE_FILTER_IDS;
    setVisibleFilterIds(normalized);
    localStorage.setItem(getVisibilityStorageKey(user, visibilityStoragePrefix), JSON.stringify(normalized));
  }

  function toggleVisibleFilter(filterId) {
    const current = new Set(visibleFilterIds);
    if (current.has(filterId)) {
      current.delete(filterId);
    } else {
      current.add(filterId);
    }

    persistVisibleFilters(FILTER_DEFINITIONS
      .map((item) => item.id)
      .filter((id) => current.has(id)));
  }

  function resetVisibleFilters() {
    persistVisibleFilters(DEFAULT_VISIBLE_FILTER_IDS);
  }

  function renderFilterField(filter) {
    const commonClass = `app-filter-field ${filter.span || ''}`;

    switch (filter.id) {
      case 'codigo':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Titulo</span>
            <input
              className="input w-full input-sm"
              value={draftFilters.codigo}
              onChange={(event) => setFilter('codigo', event.target.value)}
              placeholder="TIT-000001"
            />
          </label>
        );
      case 'q':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Busca rapida</span>
            <input
              className="input w-full input-sm"
              value={draftFilters.q}
              onChange={(event) => setFilter('q', event.target.value)}
              placeholder="Cliente/credor, obra, documento ou texto"
            />
          </label>
        );
      case 'status':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Status</span>
            <select
              className="input w-full input-sm"
              value={draftFilters.status}
              onChange={(event) => setFilter('status', event.target.value)}
            >
              <option value="">Todos</option>
              <option value="ABERTO">Aberto</option>
              <option value="PARCIAL">Parcial</option>
              <option value="QUITADO">Quitado</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="ESTORNADO">Estornado</option>
            </select>
          </label>
        );
      case 'numero_documento':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">N. documento</span>
            <input
              className="input w-full input-sm"
              value={draftFilters.numero_documento}
              onChange={(event) => setFilter('numero_documento', event.target.value)}
              placeholder="Ex.: NF, contrato"
            />
          </label>
        );
      case 'parceiro_id':
        return (
          <ParceiroAutocomplete
            key={filter.id}
            className={commonClass}
            inputClassName="input w-full input-sm"
            label={parceiroLabel}
            value={draftFilters.parceiro_id}
            options={parceirosFiltrados}
            onChange={(nextValue) => setFilter('parceiro_id', nextValue)}
            disabled={loadingOptions}
            placeholder={draftFilters.tipo === 'PAGAR' ? 'Digite o credor' : 'Digite o cliente'}
            emptyLabel={draftFilters.tipo === 'PAGAR' ? 'Nenhum credor encontrado' : 'Nenhum cliente encontrado'}
          />
        );
      case 'obra_id':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Obra</span>
            <select
              className="input w-full input-sm"
              value={draftFilters.obra_id}
              onChange={(event) => setFilter('obra_id', event.target.value)}
              disabled={loadingOptions}
            >
              <option value="">Todas as obras</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>{obra.nome}</option>
              ))}
            </select>
          </label>
        );
      case 'data_emissao_inicial':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Emissao inicio</span>
            <input
              className="input w-full input-sm"
              type="date"
              value={draftFilters.data_emissao_inicial}
              onChange={(event) => setFilter('data_emissao_inicial', event.target.value)}
            />
          </label>
        );
      case 'data_emissao_final':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Emissao fim</span>
            <input
              className="input w-full input-sm"
              type="date"
              value={draftFilters.data_emissao_final}
              onChange={(event) => setFilter('data_emissao_final', event.target.value)}
            />
          </label>
        );
      case 'categoria_financeira_id':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Categoria financeira</span>
            <select
              className="input w-full input-sm"
              value={draftFilters.categoria_financeira_id}
              onChange={(event) => setFilter('categoria_financeira_id', event.target.value)}
              disabled={loadingOptions}
            >
              <option value="">Todas as categorias de {categoriasLabel}</option>
              {categoriasFiltradas.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
              ))}
            </select>
          </label>
        );
      case 'vencimento_inicial':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Vencimento inicio</span>
            <input
              className="input w-full input-sm"
              type="date"
              value={draftFilters.vencimento_inicial}
              onChange={(event) => setFilter('vencimento_inicial', event.target.value)}
            />
          </label>
        );
      case 'vencimento_final':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Vencimento fim</span>
            <input
              className="input w-full input-sm"
              type="date"
              value={draftFilters.vencimento_final}
              onChange={(event) => setFilter('vencimento_final', event.target.value)}
            />
          </label>
        );
      default:
        return null;
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header-row">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">{pageSubtitle}</p>
        </div>
        <div className="app-page-actions">
          <Link to="/financeiro/relatorios" className="btn btn-outline btn-sm">
            <HiOutlineDocumentChartBar className="h-4 w-4" />
            Relatorios
          </Link>
          <Link to="/financeiro/baixas" className="btn btn-outline btn-sm">
            Baixas
          </Link>
          <Link to="/financeiro/conciliacao" className="btn btn-outline btn-sm">
            Conciliacao OFX
          </Link>
          <Link to={`/financeiro/titulos/novo?tipo=${fixedTipo || draftFilters.tipo || 'RECEBER'}`} className="btn btn-primary btn-sm">
            <HiOutlinePlus className="h-4 w-4" />
            Novo titulo
          </Link>
        </div>
      </div>

      <form className="card sol-surface-card app-toolbar-card" onSubmit={submitFilters}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--c-text)]">Consulta de titulos {tipoLabel}</h2>
              <p className="text-xs text-[var(--c-muted)]">A lista abaixo atualiza somente ao consultar.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--c-text)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--c-primary)]"
                checked={saveFilterCache}
                onChange={(event) => setSaveFilterCache(event.target.checked)}
              />
              Salvar filtro neste navegador
            </label>
          </div>

          {fixedTipo ? (
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-1 text-xs font-semibold text-[var(--c-muted)]">
              Carteira fixa: {fixedTipo === 'PAGAR' ? 'Contas a pagar' : 'Contas a receber'}
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="app-filter-label">Tipo</span>
              <div className="inline-grid w-full max-w-[220px] grid-cols-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-1">
                {[
                  { value: 'RECEBER', label: 'Receber' },
                  { value: 'PAGAR', label: 'Pagar' }
                ].map((option) => {
                  const active = draftFilters.tipo === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-[var(--c-primary)] text-white shadow-sm'
                          : 'text-[var(--c-muted)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text)]'
                      }`}
                      onClick={() => setTipoFiltro(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
            {basicVisibleFilters.map((filter) => renderFilterField(filter))}
            {basicVisibleFilters.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--c-border)] px-3 py-4 text-sm text-[var(--c-muted)] xl:col-span-12">
                Nenhum filtro principal visivel. Use o olho em filtros para escolher os campos.
              </div>
            ) : null}
          </div>

          <div className={`grid transition-[grid-template-rows] duration-200 ${advancedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="grid gap-3 border-t border-[var(--c-border)] pt-3 md:grid-cols-2 xl:grid-cols-12">
                {advancedVisibleFilters.map((filter) => renderFilterField(filter))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--c-border)] pt-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setAdvancedOpen((current) => !current)}
              >
                <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
                {advancedOpen ? 'Menos filtros' : 'Mais filtros'}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setFilterChooserOpen(true)}
                title="Escolher filtros visiveis"
              >
                <HiOutlineEye className="h-4 w-4" />
                Filtros
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={clearFilters}>
                <HiOutlineXMark className="h-4 w-4" />
                Limpar
              </button>
            </div>

            <button type="submit" className="btn btn-primary btn-sm">
              <HiOutlineMagnifyingGlass className="h-4 w-4" />
              Consultar
            </button>
          </div>
        </div>
      </form>

      {filterChooserOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-[var(--c-text)]">Filtros visiveis</div>
                <div className="text-[11px] text-[var(--c-muted)]">Salvo apenas para este usuario neste navegador.</div>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-[var(--c-muted)] hover:bg-[var(--c-bg)] hover:text-[var(--c-text)]"
                onClick={() => setFilterChooserOpen(false)}
                title="Fechar"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-1 overflow-y-auto px-3 py-3">
              {FILTER_DEFINITIONS.map((filter) => {
                const checked = visibleFilterSet.has(filter.id);
                return (
                  <label
                    key={filter.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-[var(--c-bg)]"
                  >
                    <span className="text-[var(--c-text)]">{filter.label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--c-primary)]"
                      checked={checked}
                      onChange={() => toggleVisibleFilter(filter.id)}
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex justify-between border-t border-[var(--c-border)] px-4 py-3">
              <button type="button" className="btn btn-outline btn-sm" onClick={resetVisibleFilters}>
                Restaurar
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setFilterChooserOpen(false)}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Titulos filtrados', value: String(resumo.quantidade), icon: HiOutlineDocumentText },
          { label: 'Valor total', value: formatCurrency(resumo.total), icon: HiOutlineSparkles },
          { label: 'Saldo em aberto', value: formatCurrency(resumo.saldo), icon: HiOutlineDocumentChartBar },
          { label: 'Vencidos', value: formatCurrency(resumo.vencido), sub: `${resumo.quantidadeVencida} titulo(s)`, icon: HiOutlineAdjustmentsHorizontal }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card sol-surface-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--c-muted)]">{item.label}</span>
                  <div className="mt-1 text-lg font-semibold text-[var(--c-text)] tabular-nums">{item.value}</div>
                  {item.sub ? <div className="text-xs text-[var(--c-muted)]">{item.sub}</div> : null}
                </div>
                <Icon className="h-5 w-5 text-[var(--c-primary)]" />
              </div>
            </div>
          );
        })}
      </div>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}

      <div className="sol-surface-card card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-[var(--c-border)] px-3 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--c-text)]">Resultado da consulta</h2>
            <p className="text-xs text-[var(--c-muted)]">
              {!hasConsulted
                ? 'Aplique um filtro para carregar os titulos.'
                : loading
                  ? 'Carregando titulos...'
                  : `${titulos.length} de ${pagination.total || titulos.length} titulo(s) exibido(s).`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-[var(--c-muted)]">
              <span>Por pagina</span>
              <select
                className="input input-sm w-[96px]"
                value={String(pagination.limit || '25')}
                onChange={(event) => {
                  const nextLimit = event.target.value;
                  setPagination((current) => ({
                    ...current,
                    limit: nextLimit,
                    page: 1
                  }));
                }}
                disabled={!hasConsulted || loading}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'Todos' : option}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1 text-xs text-[var(--c-muted)]">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={!hasConsulted || loading || Number(pagination.page || 1) <= 1}
                onClick={() => setPagination((current) => ({
                  ...current,
                  page: Math.max(Number(current.page || 1) - 1, 1)
                }))}
              >
                Anterior
              </button>
              <span className="px-1">
                {pagination.limit === 'all'
                  ? 'Todos'
                  : `${pagination.page || 1}/${pagination.total_pages || 1}`}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={
                  !hasConsulted ||
                  loading ||
                  pagination.limit === 'all' ||
                  Number(pagination.page || 1) >= Number(pagination.total_pages || 1)
                }
                onClick={() => setPagination((current) => ({
                  ...current,
                  page: Number(current.page || 1) + 1
                }))}
              >
                Proxima
              </button>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={abrirModalBaixaMassa}
              disabled={selectedTitulosBaixaveis.length === 0 || savingBaixaMassa}
              title="Baixar titulos selecionados"
            >
              Baixar selecionados
              {selectedTitulosBaixaveis.length > 0 ? ` (${selectedTitulosBaixaveis.length})` : ''}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm text-rose-700 hover:border-rose-300 hover:bg-rose-50"
              onClick={excluirTitulosSelecionados}
              disabled={selectedTitulosBaixaveis.length === 0 || loading || savingBaixaMassa}
              title="Excluir titulos selecionados sem apagar o registro do banco"
            >
              Excluir selecionados
              {selectedTitulosBaixaveis.length > 0 ? ` (${selectedTitulosBaixaveis.length})` : ''}
            </button>
            <Link to="/financeiro/cadastros" className="btn btn-outline btn-sm">Cadastros</Link>
            <Link to="/financeiro/baixas" className="btn btn-outline btn-sm">Baixas</Link>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={exportarModeloCodigosBarras}
              disabled={loading}
              title="Exporta os titulos listados para preencher linha digitavel ou codigo de barras"
            >
              Exportar codigos
            </button>
            <label className={`btn btn-outline btn-sm ${importandoCodigos ? 'opacity-60 pointer-events-none' : ''}`}>
              {importandoCodigos ? 'Importando...' : 'Importar codigos'}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={importarCodigosBarras}
                disabled={importandoCodigos}
              />
            </label>
            <Link to="/financeiro/relatorios" className="btn btn-outline btn-sm">Gerar relatorio</Link>
          </div>
        </div>

        {selectedTitulosBaixaveis.length > 0 ? (
          <div className="flex flex-col gap-2 border-b border-[var(--c-border)] bg-[var(--c-bg)]/70 px-3 py-2 text-xs md:flex-row md:items-center md:justify-between">
            <div className="font-medium text-[var(--c-text)]">
              {selectedTitulosBaixaveis.length} titulo(s) selecionado(s) para baixa em massa
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[var(--c-muted)]">
              <span>Saldo selecionado: <strong className="text-[var(--c-text)]">{formatCurrency(selectedSaldo)}</strong></span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedTituloIds([])}>
                Limpar selecao
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg)]">
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--c-muted)] whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--c-primary)]"
                    checked={allBaixaveisSelected}
                    disabled={titulosBaixaveis.length === 0}
                    onChange={(event) => toggleTodosBaixaveis(event.target.checked)}
                    title="Selecionar todos os titulos filtrados baixaveis"
                  />
                </th>
                {tableHeaders.map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--c-muted)] whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>{header}</span>
                      <span className="inline-flex rounded-md border border-[var(--c-border)] bg-[var(--c-surface)] normal-case shadow-sm">
                        <button
                          type="button"
                          className="px-1 text-[10px] leading-4 text-[var(--c-muted)] hover:text-[var(--c-primary)] disabled:opacity-30"
                          onClick={() => moverColuna(header, 'left')}
                          disabled={tableHeaders.indexOf(header) === 0}
                          title="Mover coluna para esquerda"
                        >
                          {'<'}
                        </button>
                        <button
                          type="button"
                          className="border-l border-[var(--c-border)] px-1 text-[10px] leading-4 text-[var(--c-muted)] hover:text-[var(--c-primary)] disabled:opacity-30"
                          onClick={() => moverColuna(header, 'right')}
                          disabled={tableHeaders.indexOf(header) === tableHeaders.length - 1}
                          title="Mover coluna para direita"
                        >
                          {'>'}
                        </button>
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {!hasConsulted ? (
                <tr>
                  <td colSpan={totalColunas} className="px-3 py-10 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="text-sm font-medium text-[var(--c-text)]">Nenhum filtro aplicado</div>
                      <p className="mt-1 text-xs text-[var(--c-muted)]">
                        A tabela fica vazia ate voce consultar os titulos com os filtros desejados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}

              {loading ? (
                <tr>
                  <td colSpan={totalColunas} className="px-3 py-8 text-center text-[var(--c-muted)]">
                    Carregando...
                  </td>
                </tr>
              ) : null}

              {hasConsulted && !loading && titulos.length === 0 ? (
                <tr>
                  <td colSpan={totalColunas} className="px-3 py-10 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="text-sm font-medium text-[var(--c-text)]">Nenhum titulo encontrado</div>
                      <p className="mt-1 text-xs text-[var(--c-muted)]">
                        Ajuste os filtros ou limpe a consulta para ampliar o resultado.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}

              {!loading && titulos.map((titulo) => (
                <tr
                  key={titulo.id}
                  className={`align-top transition-colors hover:bg-[var(--c-bg)] ${
                    selectedTituloSet.has(Number(titulo.id)) ? 'bg-blue-50/60' : isOverdue(titulo) ? 'bg-rose-50/40' : ''
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--c-primary)]"
                      checked={selectedTituloSet.has(Number(titulo.id))}
                      disabled={!isTituloBaixavel(titulo)}
                      onChange={(event) => toggleTituloSelecionado(titulo, event.target.checked)}
                      title={isTituloBaixavel(titulo) ? 'Selecionar titulo para baixa' : 'Somente titulos abertos ou parciais podem ser baixados'}
                    />
                  </td>
                  {tableHeaders.map((header) => renderTituloCell(titulo, header))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalBaixaMassaOpen ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-sm">
          <form
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-2xl"
            onSubmit={handleBaixaMassaSubmit}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--c-border)] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Baixa em massa</h2>
                <p className="text-xs text-[var(--c-muted)]">
                  {selectedTitulosBaixaveis.length} titulo(s), saldo total {formatCurrency(selectedSaldo)}.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-[var(--c-muted)] hover:bg-[var(--c-bg)] hover:text-[var(--c-text)]"
                onClick={() => setModalBaixaMassaOpen(false)}
                disabled={savingBaixaMassa}
                title="Fechar"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="app-filter-field">
                  <span className="app-filter-label">Data da baixa</span>
                  <input
                    className="input w-full input-sm"
                    type="date"
                    value={baixaMassaForm.data_movimento}
                    onChange={(event) => setBaixaMassaForm((current) => ({
                      ...current,
                      data_movimento: event.target.value,
                      parcelas: current.parcelado
                        ? buildBaixaMassaParcelas(selectedSaldo, current.quantidade_parcelas || 2, event.target.value)
                        : current.parcelas
                    }))}
                    required
                  />
                </label>

                <label className="app-filter-field">
                  <span className="app-filter-label">Forma</span>
                  <select
                    className="input w-full input-sm"
                    value={baixaMassaForm.forma_recebimento}
                    onChange={(event) => setBaixaMassaForm((current) => ({
                      ...current,
                      forma_recebimento: event.target.value,
                      cartao_id: '',
                      conta_bancaria_id: isCartaoForma(event.target.value) ? '' : current.conta_bancaria_id,
                      parcelado: false,
                      desconto: '',
                      usar_cheque_terceiro: false,
                      cheque_terceiro_id: '',
                      cheque_numero: '',
                      cheque_emitente: '',
                      cheque_banco: '',
                      cheque_agencia: '',
                      cheque_conta: '',
                      parcelas: buildBaixaMassaParcelas(selectedSaldo, current.quantidade_parcelas || 2, current.data_movimento)
                    }))}
                    required
                  >
                    <option value="">Selecione</option>
                    {FORMAS_RECEBIMENTO.map((forma) => (
                      <option key={forma} value={forma}>{forma}</option>
                    ))}
                  </select>
                </label>

                <label className="app-filter-field md:col-span-2">
                  <span className="app-filter-label">Empresa pagadora</span>
                  <select
                    className="input w-full input-sm"
                    value={baixaMassaForm.empresa_id}
                    onChange={(event) => setBaixaMassaForm((current) => ({
                      ...current,
                      empresa_id: event.target.value,
                      conta_bancaria_id: '',
                      cartao_id: ''
                    }))}
                    required
                  >
                    <option value="">Selecione</option>
                    {empresasGrupo.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nome || empresa.razao_social || `Empresa #${empresa.id}`}
                      </option>
                    ))}
                  </select>
                </label>

                {baixaMassaUsaCartao ? (
                  <label className="app-filter-field md:col-span-2">
                    <span className="app-filter-label">Cartao utilizado</span>
                    <select
                      className="input w-full input-sm"
                      value={baixaMassaForm.cartao_id}
                      onChange={(event) => {
                        const cartaoSelecionado = cartoes.find((cartao) => String(cartao.id) === String(event.target.value));
                        const contaCartao = isCartaoDebito(cartaoSelecionado) ? String(cartaoSelecionado?.conta_bancaria_id || '') : '';
                        setBaixaMassaForm((current) => ({
                          ...current,
                          cartao_id: event.target.value,
                          conta_bancaria_id: current.parcelado ? current.conta_bancaria_id : contaCartao
                        }));
                      }}
                      required
                    >
                      <option value="">Selecione o cartao</option>
                      {cartoesBaixaMassa.map((cartao) => (
                        <option key={cartao.id} value={cartao.id}>
                          {getCartaoLabel(cartao)}
                        </option>
                      ))}
                    </select>
                    {baixaMassaCartaoDebito ? (
                      <span className="mt-1 block text-xs text-[var(--c-muted)]">
                        Cartao de debito baixa pela conta bancaria vinculada ao cartao.
                      </span>
                    ) : null}
                  </label>
                ) : null}

                <label className="app-filter-field md:col-span-2">
                  <span className="app-filter-label">Conta bancaria</span>
                  <select
                    className="input w-full input-sm"
                    value={baixaMassaForm.conta_bancaria_id}
                    onChange={(event) => setBaixaMassaForm((current) => ({ ...current, conta_bancaria_id: event.target.value }))}
                    required={baixaMassaParcelada || contaBancariaObrigatoria(baixaMassaForm.forma_recebimento) || baixaMassaCartaoDebito}
                    disabled={
                      !baixaMassaForm.empresa_id ||
                      (!baixaMassaParcelada && (baixaMassaUsaCartao || !contaBancariaObrigatoria(baixaMassaForm.forma_recebimento)))
                    }
                  >
                    <option value="">
                      {baixaMassaParcelada
                        ? 'Selecione a conta para conciliacao das parcelas'
                        : baixaMassaUsaCartao
                        ? (baixaMassaCartaoDebito ? 'Conta vinculada ao cartao' : 'Cartao de credito sem baixa bancaria imediata')
                        : (baixaMassaForm.empresa_id ? 'Sem conta bancaria' : 'Selecione a empresa pagadora')}
                    </option>
                    {contasBancariasBaixaMassa.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome}
                        {conta.banco ? ` - ${conta.banco}` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {baixaMassaFormaParcelavel ? (
                  <div className="md:col-span-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
                    <label className="flex items-start gap-3 text-sm font-semibold text-[var(--c-text)]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={Boolean(baixaMassaForm.parcelado)}
                        onChange={(event) => setBaixaMassaParcelamentoAtivo(event.target.checked)}
                      />
                      <span>
                        Agrupar titulos e gerar parcelas para conciliacao
                        <span className="mt-1 block text-xs font-normal text-[var(--c-muted)]">
                          Use para cheque ou cartao quando varios titulos forem pagos em parcelas. Os titulos originais serao quitados e cada parcela ficara disponivel para conciliacao pela data e valor.
                        </span>
                      </span>
                    </label>
                  </div>
                ) : null}

                {isChequeForma(baixaMassaForm.forma_recebimento) && baixaMassaTipoSelecionado === 'PAGAR' ? (
                  <div className="md:col-span-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
                    <label className="flex items-start gap-3 text-sm font-semibold text-[var(--c-text)]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={Boolean(baixaMassaForm.usar_cheque_terceiro)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setBaixaMassaForm((current) => ({
                            ...current,
                            usar_cheque_terceiro: checked,
                            cheque_terceiro_id: checked ? current.cheque_terceiro_id : '',
                            parcelas: (current.parcelas || []).map((parcela) => ({
                              ...parcela,
                              usar_cheque_terceiro: checked,
                              cheque_terceiro_id: checked ? parcela.cheque_terceiro_id : ''
                            }))
                          }));
                        }}
                      />
                      <span>
                        Usar cheque de terceiro em carteira
                        <span className="mt-1 block text-xs font-normal text-[var(--c-muted)]">
                          Selecione um cheque recebido anteriormente para pagar estes titulos.
                        </span>
                      </span>
                    </label>
                  </div>
                ) : null}

                {isChequeForma(baixaMassaForm.forma_recebimento) && baixaMassaTipoSelecionado === 'RECEBER' ? (
                  <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    Ao baixar recebimentos em cheque, o sistema registra automaticamente o cheque em carteira para uso futuro.
                  </div>
                ) : null}

                {!baixaMassaParcelada && baixaMassaUsaChequeTerceiro ? (
                  <label className="app-filter-field md:col-span-2">
                    <span className="app-filter-label">Cheque de terceiro</span>
                    <select
                      className="input w-full input-sm"
                      value={baixaMassaForm.cheque_terceiro_id || ''}
                      onChange={(event) => setBaixaMassaForm((current) => ({ ...current, cheque_terceiro_id: event.target.value }))}
                      required
                    >
                      <option value="">Selecione um cheque disponivel</option>
                      {chequesTerceirosDisponiveis.map((cheque) => (
                        <option key={cheque.id} value={cheque.id}>
                          {formatChequeTerceiroLabel(cheque)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {!baixaMassaParcelada && isChequeForma(baixaMassaForm.forma_recebimento) && baixaMassaTipoSelecionado === 'RECEBER' ? (
                  <div className="md:col-span-2 grid gap-2 md:grid-cols-2">
                    <label className="app-filter-field">
                      <span className="app-filter-label">Numero do cheque</span>
                      <input
                        className="input w-full input-sm"
                        value={baixaMassaForm.cheque_numero}
                        onChange={(event) => setBaixaMassaForm((current) => ({ ...current, cheque_numero: event.target.value }))}
                        required
                      />
                    </label>
                    <label className="app-filter-field">
                      <span className="app-filter-label">Emitente do cheque</span>
                      <input
                        className="input w-full input-sm"
                        value={baixaMassaForm.cheque_emitente}
                        onChange={(event) => setBaixaMassaForm((current) => ({ ...current, cheque_emitente: event.target.value }))}
                        required
                      />
                    </label>
                  </div>
                ) : null}

                {!baixaMassaParcelada ? (
                  <label className="app-filter-field md:col-span-2">
                    <span className="app-filter-label">Desconto por titulo</span>
                    <input
                      className="input w-full input-sm"
                      value={baixaMassaForm.desconto}
                      onChange={(event) => setBaixaMassaForm((current) => ({ ...current, desconto: normalizeCurrencyTyping(event.target.value) }))}
                      placeholder="0,00"
                    />
                  </label>
                ) : null}

                {baixaMassaParcelada ? (
                  <div className="md:col-span-2 space-y-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <label className="app-filter-field w-full sm:max-w-[220px]">
                        <span className="app-filter-label">Quantidade de parcelas</span>
                        <input
                          className="input w-full input-sm"
                          type="number"
                          min="1"
                          max="60"
                          value={baixaMassaForm.quantidade_parcelas}
                          onChange={(event) => setQuantidadeParcelasBaixaMassa(event.target.value)}
                        />
                      </label>
                      <div className="text-xs text-[var(--c-muted)] sm:text-right">
                        <strong className="block text-sm text-[var(--c-text)]">
                          Total das parcelas: {formatCurrency(baixaMassaTotalParcelas)}
                        </strong>
                        {Math.abs(baixaMassaDiferencaParcelas) >= 0.01 ? (
                          <span className="text-amber-700">
                            Diferenca: {formatCurrency(baixaMassaDiferencaParcelas)}
                          </span>
                        ) : (
                          <span className="text-emerald-700">Parcelas batem com o saldo selecionado.</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(baixaMassaForm.parcelas || []).map((parcela, index) => (
                        <div key={`baixa-parcela-${index}`} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <strong className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">
                              Parcela {index + 1}/{baixaMassaForm.parcelas.length}
                            </strong>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              {formatCurrency(parseCurrencyInput(parcela.valor))}
                            </span>
                          </div>
                          <div className="grid gap-2 md:grid-cols-3">
                            <label className="app-filter-field">
                              <span className="app-filter-label">Data da parcela</span>
                              <input
                                className="input w-full input-sm"
                                type="date"
                                value={parcela.data_movimento}
                                onChange={(event) => updateBaixaMassaParcela(index, 'data_movimento', event.target.value)}
                                required
                              />
                            </label>
                            <label className="app-filter-field">
                              <span className="app-filter-label">Valor</span>
                              <input
                                className="input w-full input-sm"
                                value={parcela.valor}
                                onChange={(event) => updateBaixaMassaParcela(index, 'valor', normalizeCurrencyTyping(event.target.value))}
                                onBlur={(event) => updateBaixaMassaParcela(index, 'valor', formatCurrencyInput(parseCurrencyInput(event.target.value)))}
                                placeholder="0,00"
                                required
                              />
                            </label>
                            <label className="app-filter-field">
                              <span className="app-filter-label">Documento</span>
                              <input
                                className="input w-full input-sm"
                                value={parcela.documento_referencia}
                                onChange={(event) => updateBaixaMassaParcela(index, 'documento_referencia', event.target.value)}
                                placeholder="Referencia da parcela"
                              />
                            </label>
                          </div>

                          {isChequeForma(baixaMassaForm.forma_recebimento) ? (
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              {baixaMassaUsaChequeTerceiro ? (
                                <label className="app-filter-field md:col-span-2">
                                  <span className="app-filter-label">Cheque de terceiro</span>
                                  <select
                                    className="input w-full input-sm"
                                    value={parcela.cheque_terceiro_id || ''}
                                    onChange={(event) => updateBaixaMassaParcela(index, 'cheque_terceiro_id', event.target.value)}
                                    required
                                  >
                                    <option value="">Selecione um cheque disponivel</option>
                                    {chequesTerceirosDisponiveis.map((cheque) => (
                                      <option key={cheque.id} value={cheque.id}>
                                        {formatChequeTerceiroLabel(cheque)}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : (
                                <>
                                  <label className="app-filter-field">
                                    <span className="app-filter-label">Numero do cheque</span>
                                    <input
                                      className="input w-full input-sm"
                                      value={parcela.cheque_numero}
                                      onChange={(event) => updateBaixaMassaParcela(index, 'cheque_numero', event.target.value)}
                                      required
                                    />
                                  </label>
                                  <label className="app-filter-field">
                                    <span className="app-filter-label">Emitente do cheque</span>
                                    <input
                                      className="input w-full input-sm"
                                      value={parcela.cheque_emitente}
                                      onChange={(event) => updateBaixaMassaParcela(index, 'cheque_emitente', event.target.value)}
                                      required
                                    />
                                  </label>
                                  <label className="app-filter-field">
                                    <span className="app-filter-label">Banco</span>
                                    <input
                                      className="input w-full input-sm"
                                      value={parcela.cheque_banco}
                                      onChange={(event) => updateBaixaMassaParcela(index, 'cheque_banco', event.target.value)}
                                    />
                                  </label>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="app-filter-field">
                                      <span className="app-filter-label">Agencia</span>
                                      <input
                                        className="input w-full input-sm"
                                        value={parcela.cheque_agencia}
                                        onChange={(event) => updateBaixaMassaParcela(index, 'cheque_agencia', event.target.value)}
                                      />
                                    </label>
                                    <label className="app-filter-field">
                                      <span className="app-filter-label">Conta</span>
                                      <input
                                        className="input w-full input-sm"
                                        value={parcela.cheque_conta}
                                        onChange={(event) => updateBaixaMassaParcela(index, 'cheque_conta', event.target.value)}
                                      />
                                    </label>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <label className="app-filter-field md:col-span-2">
                  <span className="app-filter-label">Observacoes</span>
                  <textarea
                    className="input min-h-[92px] w-full"
                    value={baixaMassaForm.observacoes}
                    onChange={(event) => setBaixaMassaForm((current) => ({ ...current, observacoes: event.target.value }))}
                    placeholder="Ex.: Baixa em massa conforme extrato bancario."
                  />
                </label>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <strong>Conferencia:</strong> a baixa em massa quita os titulos selecionados conforme a forma informada. Para cheque ou cartao parcelado, as parcelas geradas ficam disponiveis para conciliacao.
              </div>

              {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--c-border)] px-5 py-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModalBaixaMassaOpen(false)}
                disabled={savingBaixaMassa}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  savingBaixaMassa ||
                  !baixaMassaForm.empresa_id ||
                  (baixaMassaUsaCartao && !baixaMassaForm.cartao_id) ||
                  (baixaMassaParcelada && !baixaMassaForm.conta_bancaria_id) ||
                  (!baixaMassaParcelada && baixaMassaCartaoDebito && !baixaMassaForm.conta_bancaria_id) ||
                  (!baixaMassaParcelada && contaBancariaObrigatoria(baixaMassaForm.forma_recebimento) && !baixaMassaForm.conta_bancaria_id) ||
                  (baixaMassaParcelada && Math.abs(baixaMassaDiferencaParcelas) >= 0.01) ||
                  (baixaMassaParcelada && baixaMassaUsaChequeTerceiro && (baixaMassaForm.parcelas || []).some((parcela) => !parcela.cheque_terceiro_id)) ||
                  (!baixaMassaParcelada && baixaMassaUsaChequeTerceiro && !baixaMassaForm.cheque_terceiro_id)
                }
              >
                {savingBaixaMassa ? 'Registrando...' : 'Registrar baixa'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {importandoCodigos ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-5 py-4 text-sm font-semibold text-[var(--c-text)] shadow-xl">
            Importando codigos de barras...
          </div>
        </div>
      ) : null}
    </div>
  );
}
