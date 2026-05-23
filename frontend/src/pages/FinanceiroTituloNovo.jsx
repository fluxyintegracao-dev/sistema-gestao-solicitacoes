import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros } from '../services/parceiros';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import {
  atualizarPaymentBeneficiary,
  criarPaymentBeneficiary,
  criarTituloFinanceiro,
  getCartoesFinanceiros,
  getCategoriasFinanceiras,
  getFormasPagamentoFinanceiras,
  getPaymentAccounts,
  getPaymentBeneficiaries
} from '../services/financeiro';
import { listarApropriacoes } from '../services/apropriacoes';
import { useAuth } from '../contexts/AuthContext';
import { hasEnabledModule } from '../utils/acessoProduto';
import { formatCurrencyInput, maskCpfCnpj, normalizeCurrencyTyping, onlyDigits } from '../utils/formatters';

const FORMAS_COBRANCA = ['BOLETO', 'PIX', 'OUTROS'];
const STATUS_COBRANCA = ['PENDENTE_EMISSAO', 'EMITIDO', 'PAGO_BANCO', 'CONCILIADO', 'CANCELADO'];
const PIX_TIPOS_CHAVE = ['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'];
const TIPOS_INTERCOMPANY = [
  ['APORTE', 'Aporte'],
  ['EMPRESTIMO', 'Emprestimo'],
  ['REEMBOLSO', 'Reembolso'],
  ['RATEIO', 'Rateio'],
  ['COBERTURA_CAIXA', 'Cobertura de caixa'],
  ['FOLHA', 'Folha'],
  ['ADMINISTRATIVO', 'Administrativo'],
  ['IMPOSTO', 'Imposto'],
  ['TRANSFERENCIA_OPERACIONAL', 'Transferencia operacional']
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function resolveTipo(value) {
  return String(value || '').trim().toUpperCase() === 'RECEBER' ? 'RECEBER' : 'PAGAR';
}

function isCadastroObra(obra) {
  return String(obra?.tipo_centro_custo || 'OBRA').trim().toUpperCase() === 'OBRA';
}

function getEmpresaObraId(obra) {
  return obra?.empresa_grupo_id ? String(obra.empresa_grupo_id) : '';
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function currencyToNumber(value) {
  if (value == null || value === '') return 0;
  const raw = String(value).trim().replace(/[R$\s]/gi, '');
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function addMonths(dateString, amount) {
  const date = new Date(`${dateString || today()}T00:00:00`);
  if (Number.isNaN(date.getTime())) return today();
  const day = date.getDate();
  date.setMonth(date.getMonth() + Number(amount || 0), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function distribuirParcelasFormatadas(valorTotal, quantidade) {
  const totalCentavos = Math.round(currencyToNumber(valorTotal) * 100);
  if (!totalCentavos || !quantidade) return [];
  const base = Math.floor(totalCentavos / quantidade);
  let resto = totalCentavos - (base * quantidade);
  return Array.from({ length: quantidade }, () => {
    const centavos = base + (resto > 0 ? 1 : 0);
    if (resto > 0) resto -= 1;
    return formatCurrencyInput(centavos / 100);
  });
}

function buildParcelasDetalhadas(
  parcelasAtuais = [],
  quantidade = 1,
  dataBase = today(),
  valorTotal = '',
  { redistribuirValores = false } = {}
) {
  const valoresSugeridos = distribuirParcelasFormatadas(valorTotal, quantidade);
  return Array.from({ length: quantidade }, (_, index) => ({
    valor: redistribuirValores ? (valoresSugeridos[index] || '') : (parcelasAtuais[index]?.valor || valoresSugeridos[index] || ''),
    data_vencimento: parcelasAtuais[index]?.data_vencimento || addMonths(dataBase || today(), index),
    numero_documento: parcelasAtuais[index]?.numero_documento || '',
    observacoes: parcelasAtuais[index]?.observacoes || '',
    cheque_numero: parcelasAtuais[index]?.cheque_numero || '',
    cheque_banco: parcelasAtuais[index]?.cheque_banco || '',
    cheque_agencia: parcelasAtuais[index]?.cheque_agencia || '',
    cheque_conta: parcelasAtuais[index]?.cheque_conta || '',
    cheque_emitente: parcelasAtuais[index]?.cheque_emitente || ''
  }));
}

function createPagamento(valor = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    valor,
    data_vencimento: today(),
    forma_pagamento_id: '',
    cartao_id: '',
    quantidade_parcelas: '1',
    data_compra: today(),
    parcelas: []
  };
}

function buildDefaultForm(tipo = 'PAGAR') {
  return {
    tipo: resolveTipo(tipo),
    obra_id: '',
    empresa_id: '',
    parceiro_id: '',
    categoria_financeira_id: '',
    descricao: '',
    numero_documento: '',
    forma_cobranca: '',
    status_cobranca: 'PENDENTE_EMISSAO',
    banco_cobranca: '',
    nosso_numero: '',
    linha_digitavel: '',
    codigo_barras: '',
    identificador_externo: '',
    boleto_emitido_em: '',
    valor: '',
    data_emissao: today(),
    competencia_data: today(),
    considera_dre: true,
    intercompany: false,
    empresa_contraparte_id: '',
    intercompany_group_id: '',
    empresa_origem_id: '',
    empresa_destino_id: '',
    tipo_intercompany: '',
    motivo_intercompany: '',
    elimina_consolidado: true,
    transferencia_interna: true,
    data_vencimento: today(),
    observacoes: '',
    apropriacao_id: '',
    forma_pagamento_id: '',
    cartao_id: '',
    quantidade_parcelas: 1,
    data_compra: today(),
    pagamentos: [createPagamento('')]
  };
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function categoriaCompativel(categoria, tipoTitulo) {
  const tipoCategoria = String(categoria?.tipo || '').trim().toUpperCase();
  return tipoCategoria === tipoTitulo;
}

function prioridadeCategoria(categoria, tipoTitulo) {
  const tipoCategoria = String(categoria?.tipo || '').trim().toUpperCase();
  if (tipoCategoria === tipoTitulo) return 0;
  return 2;
}

function labelTipoTitulo(tipoTitulo) {
  return tipoTitulo === 'RECEBER' ? 'receber' : 'pagar';
}

function getTipoCartaoPorForma(forma) {
  const value = `${forma?.tipo || ''} ${forma?.codigo || ''}`.toUpperCase();
  if (value.includes('DEBITO')) return 'DEBITO';
  if (value.includes('CREDITO')) return 'CREDITO';
  return null;
}

function cartaoCompativelComForma(cartao, forma) {
  const tipoEsperado = getTipoCartaoPorForma(forma);
  if (!tipoEsperado) return true;
  return String(cartao?.tipo || 'CREDITO').trim().toUpperCase() === tipoEsperado;
}

function labelTipoCartao(value) {
  return String(value || 'CREDITO').trim().toUpperCase() === 'DEBITO' ? 'debito' : 'credito';
}

function isFormaCartao(forma) {
  const value = `${forma?.tipo || ''} ${forma?.codigo || ''}`.toUpperCase();
  return Boolean(forma?.exige_cartao) || value.includes('CARTAO');
}

function isFormaBoleto(forma) {
  const value = `${forma?.tipo || ''} ${forma?.codigo || ''}`.toUpperCase();
  return value.includes('BOLETO');
}

function isFormaCheque(forma) {
  const value = `${forma?.tipo || ''} ${forma?.codigo || ''}`.toUpperCase();
  return value.includes('CHEQUE');
}

function getParceiroPixOptions(parceiro) {
  if (!parceiro) return [];
  return [
    {
      id: 'pix_chave_fixa_1',
      label: 'Chave fixa 1',
      tipo: parceiro.pix_chave_fixa_1_tipo,
      chave: parceiro.pix_chave_fixa_1
    },
    {
      id: 'pix_chave_fixa_2',
      label: 'Chave fixa 2',
      tipo: parceiro.pix_chave_fixa_2_tipo,
      chave: parceiro.pix_chave_fixa_2
    },
    {
      id: 'pix_chave_variavel',
      label: 'Chave variavel',
      tipo: parceiro.pix_chave_variavel_tipo,
      chave: parceiro.pix_chave_variavel
    }
  ].filter((item) => item.tipo && item.chave);
}

function getParceiroPixPrincipal(parceiro) {
  return getParceiroPixOptions(parceiro)[0] || null;
}

function getEmpresaNome(empresas, empresaId) {
  return empresas.find((empresa) => String(empresa.id) === String(empresaId))?.nome || '';
}

function getCategoriaDreResumo(categoria) {
  if (!categoria) return 'Sem categoria financeira';
  if (categoria.considera_dre === false) return 'Categoria fora da DRE';
  const grupo = categoria.dre_grupo || 'Grupo DRE nao classificado';
  const subgrupo = categoria.dre_subgrupo ? ` / ${categoria.dre_subgrupo}` : '';
  return `${grupo}${subgrupo}`;
}

function isCategoriaClassificadaParaDre(categoria) {
  return Boolean(categoria && categoria.considera_dre !== false && String(categoria.dre_grupo || '').trim());
}

function ImpactoGerencialPreview({ form, categoria, empresasGrupo, totalPagamentos }) {
  const valorTitulo = roundCurrency(currencyToNumber(form.valor));
  const valorCaixa = roundCurrency(totalPagamentos || valorTitulo);
  const categoriaSelecionada = Boolean(categoria);
  const categoriaEntraDre = isCategoriaClassificadaParaDre(categoria);
  const dreAtiva = form.considera_dre !== false && categoriaEntraDre;
  const origem = getEmpresaNome(empresasGrupo, form.empresa_origem_id);
  const destino = getEmpresaNome(empresasGrupo, form.empresa_destino_id);

  const dreTexto = !form.considera_dre
    ? 'Nao entra na DRE'
      : !categoriaSelecionada
        ? 'Pendente de categoria'
      : categoria?.considera_dre === false
        ? 'Categoria fora da DRE'
        : !String(categoria?.dre_grupo || '').trim()
          ? 'Categoria sem grupo DRE'
          : 'Entra na DRE gerencial';

  const consolidadoTexto = form.intercompany
    ? form.elimina_consolidado
      ? 'Elimina no consolidado'
      : 'Mantem no consolidado'
    : 'Movimento externo';

  const caixaTexto = valorCaixa > 0
    ? `${form.tipo === 'RECEBER' ? 'Entrada' : 'Saida'} prevista de ${formatCurrency(valorCaixa)}`
    : 'Valor ainda nao informado';

  return (
    <div className="md:col-span-2 xl:col-span-12 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[var(--c-text)]">Impacto gerencial antes de salvar</div>
          <div className="text-xs text-[var(--c-muted)]">Conferencia operacional para DRE, caixa e consolidado.</div>
        </div>
        {form.intercompany && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Intercompany
          </span>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className={`rounded-lg border px-3 py-2 ${dreAtiva ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">DRE</div>
          <div className="mt-1 text-sm font-semibold">{dreTexto}</div>
          <div className="mt-1 text-xs opacity-80">{getCategoriaDreResumo(categoria)}</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">Caixa</div>
          <div className="mt-1 text-sm font-semibold">{caixaTexto}</div>
          <div className="mt-1 text-xs opacity-80">Considerado no fluxo previsto ate a baixa.</div>
        </div>
        <div className={`rounded-lg border px-3 py-2 ${form.intercompany ? 'border-violet-200 bg-violet-50 text-violet-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">Consolidado</div>
          <div className="mt-1 text-sm font-semibold">{consolidadoTexto}</div>
          <div className="mt-1 text-xs opacity-80">
            {form.intercompany
              ? `${origem || 'Origem nao informada'} -> ${destino || 'Destino nao informado'}`
              : 'Nao ha eliminacao intercompany.'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinanceiroTituloNovo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const moduloApropriacoesHabilitado = hasEnabledModule(user, 'OBRAS');
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTipo = resolveTipo(searchParams.get('tipo'));
  const [form, setForm] = useState(() => buildDefaultForm(initialTipo));
  const [obras, setObras] = useState([]);
  const [empresasGrupo, setEmpresasGrupo] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [apropriacoes, setApropriacoes] = useState([]);
  const [loadingApropriacoes, setLoadingApropriacoes] = useState(false);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingParceiros, setLoadingParceiros] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [parceiroDocumentoBusca, setParceiroDocumentoBusca] = useState('');
  const [parceiroNomeBusca, setParceiroNomeBusca] = useState('');
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [paymentDraft, setPaymentDraft] = useState({
    preparar_pagamento_pix: false,
    usar_credor_como_favorecido: false,
    payment_beneficiary_id: '',
    nome: '',
    cpf_cnpj: '',
    pix_tipo_chave: 'CNPJ',
    pix_chave: '',
    payment_account_id: '',
    data_pagamento: today()
  });

  useEffect(() => {
    let active = true;

    async function carregarBase() {
      try {
        setLoadingBase(true);
        setError('');
        const [obrasData, categoriasData, empresasData, paymentAccountsData, formasData, cartoesData] = await Promise.all([
          getMinhasObras({ modo: 'FINANCEIRO', escopo: 'TODOS' }),
          getCategoriasFinanceiras(),
          getEmpresasGrupo({ ativo: 1 }).catch(() => []),
          getPaymentAccounts().catch(() => []),
          getFormasPagamentoFinanceiras().catch(() => []),
          getCartoesFinanceiros().catch(() => [])
        ]);

        if (!active) return;

        const obrasLista = Array.isArray(obrasData) ? obrasData : [];
        const categoriasLista = Array.isArray(categoriasData) ? categoriasData : [];
        setObras(obrasLista);
        setCategorias(categoriasLista);
        setEmpresasGrupo(Array.isArray(empresasData) ? empresasData : []);
        setPaymentAccounts(Array.isArray(paymentAccountsData) ? paymentAccountsData : []);
        setFormasPagamento(Array.isArray(formasData) ? formasData : []);
        setCartoes(Array.isArray(cartoesData) ? cartoesData : []);
        setPaymentDraft((current) => ({
          ...current,
          payment_account_id: current.payment_account_id || String(paymentAccountsData?.[0]?.id || '')
        }));
        setForm((current) => {
          const obraPadrao = obrasLista.find((obra) => String(obra.id) === String(current.obra_id)) || obrasLista[0];
          return {
            ...current,
            obra_id: current.obra_id || String(obraPadrao?.id || ''),
            empresa_id: current.empresa_id || getEmpresaObraId(obraPadrao)
          };
        });
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar dados do financeiro');
      } finally {
        if (active) setLoadingBase(false);
      }
    }

    carregarBase();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function carregarParceiros() {
      try {
        setLoadingParceiros(true);
        const termoDocumento = parceiroDocumentoBusca.trim();
        const termoNome = parceiroNomeBusca.trim();
        const params = {
          ativo: 1,
          limit: 200,
          q: termoDocumento || termoNome
        };

        if (form.tipo === 'RECEBER') {
          params.cliente = 1;
        }

        const data = await buscarParceiros(params);
        if (!active) return;
        const listaBase = Array.isArray(data) ? data : [];
        const lista = form.tipo === 'RECEBER'
          ? listaBase.filter((item) => item.cliente !== false)
          : listaBase.filter((item) => item.fornecedor !== false || item.corretor === true);
        setParceiros(lista);
      } catch (err) {
        if (!active) return;
        setParceiros([]);
        setError(err?.message || 'Erro ao carregar parceiros');
      } finally {
        if (active) setLoadingParceiros(false);
      }
    }

    carregarParceiros();

    return () => {
      active = false;
    };
  }, [form.tipo, parceiroDocumentoBusca, parceiroNomeBusca]);

  const obraSelecionada = useMemo(
    () => obras.find((obra) => String(obra.id) === String(form.obra_id)) || null,
    [obras, form.obra_id]
  );
  const obraSelecionadaEhObra = isCadastroObra(obraSelecionada);
  const empresaDaObraId = getEmpresaObraId(obraSelecionada);
  const empresaTituloDivergente = Boolean(
    form.empresa_id &&
    empresaDaObraId &&
    String(form.empresa_id) !== String(empresaDaObraId)
  );

  useEffect(() => {
    if (!moduloApropriacoesHabilitado || !form.obra_id || !obraSelecionadaEhObra) {
      setApropriacoes([]);
      setForm((current) => ({ ...current, apropriacao_id: '' }));
      setLoadingApropriacoes(false);
      return;
    }

    let active = true;

    async function carregarApropriacoes() {
      try {
        setLoadingApropriacoes(true);
        const data = await listarApropriacoes({ obra_id: form.obra_id });
        if (!active) return;
        setApropriacoes(Array.isArray(data) ? data : []);
        setForm((current) => {
          if (!current.apropriacao_id) return current;
          const lista = Array.isArray(data) ? data : [];
          const exists = lista.some((item) => String(item.id) === String(current.apropriacao_id));
          return exists ? current : { ...current, apropriacao_id: '' };
        });
      } catch {
        if (!active) return;
        setApropriacoes([]);
      } finally {
        if (active) setLoadingApropriacoes(false);
      }
    }

    carregarApropriacoes();

    return () => {
      active = false;
    };
  }, [form.obra_id, obraSelecionadaEhObra, moduloApropriacoesHabilitado]);

  useEffect(() => {
    if (form.tipo !== 'PAGAR' || !form.parceiro_id) {
      setBeneficiaries([]);
      setPaymentDraft((current) => ({
        ...current,
        usar_credor_como_favorecido: false,
        payment_beneficiary_id: '',
        nome: '',
        cpf_cnpj: '',
        pix_chave: ''
      }));
      return undefined;
    }

    let active = true;
    getPaymentBeneficiaries({ parceiro_id: form.parceiro_id })
      .then((data) => {
        if (!active) return;
        const lista = Array.isArray(data) ? data : [];
        setBeneficiaries(lista);
        const beneficiary = lista.find((item) => item.ativo !== false) || lista[0];
        if (beneficiary) {
          setPaymentDraft((current) => ({
            ...current,
            payment_beneficiary_id: current.usar_credor_como_favorecido ? '' : String(beneficiary.id),
            nome: current.usar_credor_como_favorecido ? current.nome : (beneficiary.nome || current.nome),
            cpf_cnpj: current.usar_credor_como_favorecido ? current.cpf_cnpj : (beneficiary.cpf_cnpj || current.cpf_cnpj),
            pix_tipo_chave: current.usar_credor_como_favorecido ? current.pix_tipo_chave : (beneficiary.pix_tipo_chave || current.pix_tipo_chave),
            pix_chave: current.usar_credor_como_favorecido ? current.pix_chave : (beneficiary.pix_chave || current.pix_chave)
          }));
        }
      })
      .catch(() => setBeneficiaries([]));

    return () => {
      active = false;
    };
  }, [form.tipo, form.parceiro_id]);

  const categoriasFiltradas = useMemo(() => {
    return [...categorias]
      .filter((categoria) => categoriaCompativel(categoria, form.tipo))
      .sort((a, b) => {
        const prioridade = prioridadeCategoria(a, form.tipo) - prioridadeCategoria(b, form.tipo);
        if (prioridade !== 0) return prioridade;
        return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' });
      });
  }, [categorias, form.tipo]);

  const categoriaResumo = useMemo(() => {
    const especificas = categoriasFiltradas.filter((categoria) => String(categoria.tipo || '').trim().toUpperCase() === form.tipo).length;

    if (!categoriasFiltradas.length) {
      return `Nenhuma categoria compativel com titulos de ${labelTipoTitulo(form.tipo)}.`;
    }

    return `${especificas} categoria(s) de contas a ${labelTipoTitulo(form.tipo)} disponivel(is).`;
  }, [categoriasFiltradas, form.tipo]);

  const categoriaSelecionada = useMemo(() => {
    return categorias.find((categoria) => String(categoria.id) === String(form.categoria_financeira_id)) || null;
  }, [categorias, form.categoria_financeira_id]);

  const parceiroSelecionado = useMemo(() => {
    return parceiros.find((item) => String(item.id) === String(form.parceiro_id)) || null;
  }, [form.parceiro_id, parceiros]);

  const parceiroPixOptions = useMemo(() => getParceiroPixOptions(parceiroSelecionado), [parceiroSelecionado]);

  const parceiroResumo = useMemo(() => {
    const termo = parceiroDocumentoBusca.trim() || parceiroNomeBusca.trim();
    if (!termo) {
      return `${parceiros.length} ${form.tipo === 'RECEBER' ? 'cliente(s)' : 'credor(es)'} carregado(s)`;
    }
    return `${parceiros.length} ${form.tipo === 'RECEBER' ? 'cliente(s)' : 'credor(es)'} encontrado(s) para "${termo}"`;
  }, [form.tipo, parceiros, parceiroDocumentoBusca, parceiroNomeBusca]);

  function getFormaPagamento(formaPagamentoId) {
    return formasPagamento.find((item) => String(item.id) === String(formaPagamentoId)) || null;
  }

  function getQuantidadeParcelas(pagamento) {
    return Math.max(Number(pagamento?.quantidade_parcelas || 1), 1);
  }

  function pagamentoUsaParcelasDetalhadas(pagamento) {
    const forma = getFormaPagamento(pagamento?.forma_pagamento_id);
    return Boolean(forma) && (isFormaBoleto(forma) || isFormaCheque(forma));
  }

  function getValorPagamento(pagamento) {
    if (pagamentoUsaParcelasDetalhadas(pagamento)) {
      return roundCurrency((pagamento.parcelas || []).reduce((acc, parcela) => acc + currencyToNumber(parcela.valor), 0));
    }
    return roundCurrency(currencyToNumber(pagamento?.valor));
  }

  const totalPagamentos = useMemo(() => {
    return roundCurrency((form.pagamentos || []).reduce((acc, pagamento) => acc + getValorPagamento(pagamento), 0));
  }, [form.pagamentos, formasPagamento]);

  const valorTitulo = useMemo(() => roundCurrency(currencyToNumber(form.valor)), [form.valor]);
  const diferencaPagamentos = useMemo(() => roundCurrency(valorTitulo - totalPagamentos), [valorTitulo, totalPagamentos]);
  const totalBateComTitulo = Math.abs(diferencaPagamentos) <= 0.009;

  function preencherFavorecidoComParceiro(parceiro) {
    const pix = getParceiroPixPrincipal(parceiro);
    setPaymentDraft((current) => ({
      ...current,
      payment_beneficiary_id: '',
      nome: parceiro?.nome || '',
      cpf_cnpj: parceiro?.cpf_cnpj || '',
      pix_tipo_chave: pix?.tipo || current.pix_tipo_chave || 'CNPJ',
      pix_chave: pix?.chave || ''
    }));
  }

  function selecionarParceiro(parceiro) {
    if (!parceiro) return;
    setForm((current) => ({ ...current, parceiro_id: String(parceiro.id) }));
    setParceiroNomeBusca(parceiro.nome || '');
    setParceiroDocumentoBusca(maskCpfCnpj(parceiro.cpf_cnpj || ''));
    setPaymentDraft((current) => {
      if (!current.usar_credor_como_favorecido) return current;
      const pix = getParceiroPixPrincipal(parceiro);
      return {
        ...current,
        payment_beneficiary_id: '',
        nome: parceiro.nome || '',
        cpf_cnpj: parceiro.cpf_cnpj || '',
        pix_tipo_chave: pix?.tipo || current.pix_tipo_chave || 'CNPJ',
        pix_chave: pix?.chave || ''
      };
    });
  }

  useEffect(() => {
    if (paymentDraft.usar_credor_como_favorecido && parceiroSelecionado) {
      preencherFavorecidoComParceiro(parceiroSelecionado);
    }
  }, [paymentDraft.usar_credor_como_favorecido, parceiroSelecionado]);

  function updateField(field, value) {
    if (field === 'intercompany') {
      setForm((current) => ({
        ...current,
        intercompany: Boolean(value),
        empresa_contraparte_id: value ? current.empresa_contraparte_id : '',
        intercompany_group_id: value ? current.intercompany_group_id : '',
        empresa_origem_id: value ? current.empresa_origem_id : '',
        empresa_destino_id: value ? current.empresa_destino_id : '',
        tipo_intercompany: value ? current.tipo_intercompany : '',
        motivo_intercompany: value ? current.motivo_intercompany : '',
        elimina_consolidado: value ? current.elimina_consolidado : true,
        transferencia_interna: value ? current.transferencia_interna : true
      }));
      return;
    }

    if (field === 'tipo') {
      setSearchParams({ tipo: value });
      setParceiroDocumentoBusca('');
      setParceiroNomeBusca('');
      setBeneficiaries([]);
      setForm((current) => ({
        ...current,
        tipo: value,
        parceiro_id: '',
        categoria_financeira_id: '',
        forma_cobranca: value === 'RECEBER' ? current.forma_cobranca : '',
        status_cobranca: value === 'RECEBER' ? current.status_cobranca : 'PENDENTE_EMISSAO',
        banco_cobranca: value === 'RECEBER' ? current.banco_cobranca : '',
        nosso_numero: value === 'RECEBER' ? current.nosso_numero : '',
        linha_digitavel: value === 'RECEBER' ? current.linha_digitavel : '',
        codigo_barras: value === 'RECEBER' ? current.codigo_barras : '',
        identificador_externo: value === 'RECEBER' ? current.identificador_externo : '',
        boleto_emitido_em: value === 'RECEBER' ? current.boleto_emitido_em : ''
      }));
      return;
    }

    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'obra_id') {
        const obra = obras.find((item) => String(item.id) === String(value));
        next.empresa_id = getEmpresaObraId(obra);
        next.apropriacao_id = '';
      }
      if (field === 'valor' && (current.pagamentos || []).length === 1) {
        const pagamento = current.pagamentos[0] || createPagamento(value);
        const quantidade = getQuantidadeParcelas(pagamento);
        next.pagamentos = [{
          ...pagamento,
          valor: value,
          parcelas: pagamentoUsaParcelasDetalhadas(pagamento)
            ? buildParcelasDetalhadas(pagamento.parcelas, quantidade, pagamento.data_vencimento || today(), value)
            : pagamento.parcelas
        }];
      }
      return next;
    });
  }

  function updatePagamento(index, changes) {
    setForm((current) => {
      const pagamentos = [...(current.pagamentos || [])];
      pagamentos[index] = {
        ...pagamentos[index],
        ...changes
      };
      return { ...current, pagamentos };
    });
  }

  function updateFormaPagamento(index, formaPagamentoId) {
    setForm((current) => {
      const pagamentos = [...(current.pagamentos || [])];
      const pagamento = pagamentos[index] || createPagamento();
      const forma = formasPagamento.find((item) => String(item.id) === String(formaPagamentoId));
      const cartaoAtual = cartoes.find((item) => String(item.id) === String(pagamento.cartao_id));
      const manterCartao = forma?.exige_cartao && cartaoAtual && cartaoCompativelComForma(cartaoAtual, forma);
      const quantidade = forma?.permite_parcelamento ? getQuantidadeParcelas(pagamento) : 1;
      const usaParcelas = forma && (isFormaBoleto(forma) || isFormaCheque(forma));
      pagamentos[index] = {
        ...pagamento,
        forma_pagamento_id: formaPagamentoId,
        cartao_id: manterCartao ? pagamento.cartao_id : '',
        quantidade_parcelas: String(quantidade),
        data_compra: forma?.exige_cartao ? (pagamento.data_compra || today()) : pagamento.data_compra,
        parcelas: usaParcelas
          ? buildParcelasDetalhadas(pagamento.parcelas, quantidade, pagamento.data_vencimento || today(), pagamento.valor)
          : []
      };
      return { ...current, pagamentos };
    });
  }

  function updateQuantidadeParcelas(index, value) {
    const quantidade = Math.max(Number(value || 1), 1);
    setForm((current) => {
      const pagamentos = [...(current.pagamentos || [])];
      const pagamento = pagamentos[index] || createPagamento();
      pagamentos[index] = {
        ...pagamento,
        quantidade_parcelas: value,
        parcelas: pagamentoUsaParcelasDetalhadas(pagamento)
          ? buildParcelasDetalhadas(
              pagamento.parcelas,
              quantidade,
              pagamento.data_vencimento || today(),
              pagamento.valor,
              { redistribuirValores: true }
            )
          : pagamento.parcelas
      };
      return { ...current, pagamentos };
    });
  }

  function updateValorPagamento(index, value) {
    setForm((current) => {
      const pagamentos = [...(current.pagamentos || [])];
      const pagamento = pagamentos[index] || createPagamento();
      const quantidade = getQuantidadeParcelas(pagamento);
      pagamentos[index] = {
        ...pagamento,
        valor: value,
        parcelas: pagamentoUsaParcelasDetalhadas(pagamento)
          ? buildParcelasDetalhadas(pagamento.parcelas, quantidade, pagamento.data_vencimento || today(), value)
          : pagamento.parcelas
      };
      return { ...current, pagamentos };
    });
  }

  function updateParcela(pagamentoIndex, parcelaIndex, field, value) {
    setForm((current) => {
      const pagamentos = [...(current.pagamentos || [])];
      const pagamento = pagamentos[pagamentoIndex] || createPagamento();
      const quantidade = getQuantidadeParcelas(pagamento);
      const parcelas = buildParcelasDetalhadas(pagamento.parcelas, quantidade, pagamento.data_vencimento || today(), pagamento.valor);
      parcelas[parcelaIndex] = {
        ...parcelas[parcelaIndex],
        [field]: value
      };
      pagamentos[pagamentoIndex] = {
        ...pagamento,
        parcelas,
        valor: field === 'valor'
          ? formatCurrencyInput(parcelas.reduce((acc, parcela) => acc + currencyToNumber(parcela.valor), 0))
          : pagamento.valor
      };
      return { ...current, pagamentos };
    });
  }

  function adicionarPagamento() {
    setForm((current) => ({
      ...current,
      pagamentos: [...(current.pagamentos || []), createPagamento()]
    }));
  }

  function removerPagamento(index) {
    setForm((current) => {
      const pagamentos = (current.pagamentos || []).filter((_, itemIndex) => itemIndex !== index);
      return { ...current, pagamentos: pagamentos.length ? pagamentos : [createPagamento(current.valor)] };
    });
  }

  function validarCadastroTitulo() {
    if (!form.empresa_id) {
      return 'Informe a empresa real do titulo.';
    }

    if (empresaTituloDivergente) {
      return 'A empresa do titulo deve ser a mesma vinculada a obra/centro de custo selecionado.';
    }

    if (!form.parceiro_id) {
      return `Selecione o ${form.tipo === 'RECEBER' ? 'cliente' : 'credor'} na lista antes de salvar.`;
    }

    if (form.considera_dre && !isCategoriaClassificadaParaDre(categoria)) {
      return 'Para considerar na DRE, selecione uma categoria financeira com grupo DRE classificado.';
    }

    if (valorTitulo <= 0) {
      return 'Informe o valor total do titulo.';
    }

    const pagamentos = Array.isArray(form.pagamentos) ? form.pagamentos : [];
    if (pagamentos.length === 0) {
      return 'Informe pelo menos uma forma de pagamento.';
    }

    for (const [pagamentoIndex, pagamento] of pagamentos.entries()) {
      const forma = getFormaPagamento(pagamento.forma_pagamento_id);
      const usaDetalhe = forma && (isFormaBoleto(forma) || isFormaCheque(forma));
      const usaCartao = isFormaCartao(forma);
      const valorPagamento = getValorPagamento(pagamento);
      const labelForma = `forma de pagamento ${pagamentoIndex + 1}`;

      if (valorPagamento <= 0) {
        return `Informe o valor da ${labelForma}.`;
      }

      if (forma?.exige_cartao && !pagamento.cartao_id) {
        return `Selecione o cartao da ${labelForma}.`;
      }

      if (usaDetalhe) {
        const quantidade = getQuantidadeParcelas(pagamento);
        const parcelas = Array.isArray(pagamento.parcelas) ? pagamento.parcelas : [];
        if (parcelas.length !== quantidade) {
          return `Confira a quantidade de parcelas da ${labelForma}.`;
        }

        for (const [parcelaIndex, parcela] of parcelas.entries()) {
          const labelParcela = `parcela ${parcelaIndex + 1} da ${labelForma}`;
          if (currencyToNumber(parcela.valor) <= 0) {
            return `Informe o valor da ${labelParcela}.`;
          }
          if (!parcela.data_vencimento) {
            return `Informe o vencimento da ${labelParcela}.`;
          }
          if (isFormaCheque(forma)) {
            if (!String(parcela.cheque_numero || '').trim()) {
              return `Informe o numero do cheque da ${labelParcela}.`;
            }
            if (!String(parcela.cheque_emitente || '').trim()) {
              return `Informe o emitente do cheque da ${labelParcela}.`;
            }
          }
        }
      } else if (!usaCartao && !pagamento.data_vencimento) {
        return `Informe o vencimento da ${labelForma}.`;
      }
    }

    if (!totalBateComTitulo) {
      const direcao = diferencaPagamentos > 0 ? 'faltam' : 'sobram';
      return `A soma das formas de pagamento precisa ser igual ao valor do titulo. Valor do titulo: ${formatCurrency(valorTitulo)}. Total informado: ${formatCurrency(totalPagamentos)}. Ainda ${direcao} ${formatCurrency(Math.abs(diferencaPagamentos))}.`;
    }

    if (form.intercompany) {
      if (!form.empresa_origem_id) return 'Informe a empresa origem do intercompany.';
      if (!form.empresa_destino_id) return 'Informe a empresa destino do intercompany.';
      if (String(form.empresa_origem_id) === String(form.empresa_destino_id)) {
        return 'Empresa origem e destino nao podem ser iguais no intercompany.';
      }
      if (!form.tipo_intercompany) return 'Informe o tipo intercompany.';
    }

    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const erroValidacao = validarCadastroTitulo();
    if (erroValidacao) {
      setError(erroValidacao);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        ...form,
        obra_id: Number(form.obra_id),
        empresa_id: Number(form.empresa_id),
        parceiro_id: Number(form.parceiro_id),
        apropriacao_id: form.apropriacao_id ? Number(form.apropriacao_id) : undefined,
        categoria_financeira_id: form.categoria_financeira_id ? Number(form.categoria_financeira_id) : undefined
      };
      payload.empresa_contraparte_id = form.intercompany && form.empresa_contraparte_id
        ? Number(form.empresa_contraparte_id)
        : form.intercompany && form.empresa_destino_id
          ? Number(form.empresa_destino_id)
          : undefined;
      payload.empresa_origem_id = form.intercompany && form.empresa_origem_id
        ? Number(form.empresa_origem_id)
        : undefined;
      payload.empresa_destino_id = form.intercompany && form.empresa_destino_id
        ? Number(form.empresa_destino_id)
        : undefined;
      payload.tipo_intercompany = form.intercompany ? form.tipo_intercompany || undefined : undefined;
      payload.motivo_intercompany = form.intercompany ? form.motivo_intercompany || undefined : undefined;
      payload.intercompany_group_id = form.intercompany ? form.intercompany_group_id || undefined : undefined;
      payload.elimina_consolidado = form.intercompany ? Boolean(form.elimina_consolidado) : false;
      payload.transferencia_interna = form.intercompany ? Boolean(form.transferencia_interna) : false;
      payload.considera_dre = Boolean(form.considera_dre);
      payload.intercompany = Boolean(form.intercompany);
      payload.competencia_data = form.competencia_data || undefined;
      payload.pagamentos = (form.pagamentos || []).map((pagamento) => {
        const forma = getFormaPagamento(pagamento.forma_pagamento_id);
        const usaDetalhe = forma && (isFormaBoleto(forma) || isFormaCheque(forma));
        return {
          valor: usaDetalhe ? undefined : pagamento.valor,
          forma_pagamento_id: pagamento.forma_pagamento_id || undefined,
          cartao_id: pagamento.cartao_id || undefined,
          quantidade_parcelas: pagamento.quantidade_parcelas || undefined,
          data_compra: isFormaCartao(forma) ? pagamento.data_compra : undefined,
          data_vencimento: !isFormaCartao(forma) && !usaDetalhe ? pagamento.data_vencimento : undefined,
          numero_documento: pagamento.numero_documento || undefined,
          observacoes: pagamento.observacoes || undefined,
          parcelas: usaDetalhe ? pagamento.parcelas : undefined
        };
      });

      if (form.tipo === 'PAGAR' && paymentDraft.preparar_pagamento_pix) {
        if (!form.parceiro_id || !paymentDraft.nome || !paymentDraft.cpf_cnpj || !paymentDraft.pix_tipo_chave || !paymentDraft.pix_chave) {
          throw new Error('Preencha os dados PIX do favorecido para pagamento em massa.');
        }

        const beneficiaryPayload = {
          parceiro_id: Number(form.parceiro_id),
          nome: paymentDraft.nome,
          cpf_cnpj: paymentDraft.cpf_cnpj,
          metodo_preferencial: 'PIX_CHAVE',
          pix_tipo_chave: paymentDraft.pix_tipo_chave,
          pix_chave: paymentDraft.pix_chave,
          ativo: true
        };

        if (paymentDraft.payment_beneficiary_id) {
          await atualizarPaymentBeneficiary(paymentDraft.payment_beneficiary_id, beneficiaryPayload);
        } else {
          await criarPaymentBeneficiary(beneficiaryPayload);
        }
      }

      const titulo = await criarTituloFinanceiro(payload);
      alert('Conta criada com sucesso.');
      navigate(`/financeiro/titulos/${titulo.id}`);
    } catch (err) {
      setError(err?.message || 'Erro ao criar conta manual');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page solicitacoes-page max-w-5xl mx-auto">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">
              {form.tipo === 'RECEBER' ? 'Nova conta a receber' : 'Nova conta a pagar'}
            </h1>
            <p className="page-subtitle">
              Cadastre contas manuais que nao nasceram de uma solicitacao ou contrato de venda.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/titulos" className="btn btn-outline">Voltar para titulos</Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="app-alert app-alert--error">
          {error}
        </div>
      )}

      {loadingBase ? (
        <div className="app-empty-card">Carregando estrutura do financeiro...</div>
      ) : (
        <div className="card sol-surface-card">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="sol-filtros-head">
              <div>
                <p className="sol-filtros-title">Dados da conta</p>
                <p className="sol-filtros-subtitle">
                  Esta conta entra no previsto enquanto estiver em aberto ou parcial, mesmo sem solicitacao vinculada.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
              <label className="sol-filter-field xl:col-span-2">
                <span className="sol-filter-label">Tipo</span>
                <select
                  className="input w-full"
                  value={form.tipo}
                  onChange={(event) => {
                    const tipo = resolveTipo(event.target.value);
                    setSearchParams({ tipo });
                    setForm((current) => ({
                      ...current,
                      tipo,
                      parceiro_id: '',
                      categoria_financeira_id: '',
                      forma_cobranca: tipo === 'RECEBER' ? current.forma_cobranca : '',
                      status_cobranca: tipo === 'RECEBER' ? current.status_cobranca : 'PENDENTE_EMISSAO',
                      banco_cobranca: tipo === 'RECEBER' ? current.banco_cobranca : '',
                      nosso_numero: tipo === 'RECEBER' ? current.nosso_numero : '',
                      linha_digitavel: tipo === 'RECEBER' ? current.linha_digitavel : '',
                      codigo_barras: tipo === 'RECEBER' ? current.codigo_barras : '',
                      identificador_externo: tipo === 'RECEBER' ? current.identificador_externo : '',
                      boleto_emitido_em: tipo === 'RECEBER' ? current.boleto_emitido_em : ''
                    }));
                  }}
                >
                  <option value="PAGAR">Conta a pagar</option>
                  <option value="RECEBER">Conta a receber</option>
                </select>
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Obra/Centro de Custo</span>
                <select
                  className="input w-full"
                  value={form.obra_id}
                  onChange={(event) => updateField('obra_id', event.target.value)}
                  required
                >
                  <option value="">Selecione a obra/centro de custo</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Empresa do titulo</span>
                <select
                  className={`input w-full ${empresaTituloDivergente ? 'border-rose-300 bg-rose-50' : ''}`}
                  value={form.empresa_id}
                  onChange={(event) => updateField('empresa_id', event.target.value)}
                  required
                >
                  <option value="">Selecione a empresa real</option>
                  {empresasGrupo.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </option>
                  ))}
                </select>
                <span className={`app-note mt-2 ${empresaTituloDivergente ? 'text-rose-600' : ''}`}>
                  {empresaTituloDivergente
                    ? 'A empresa deve coincidir com a empresa vinculada ao cadastro selecionado.'
                    : 'Informe a empresa economica responsavel pelo titulo.'}
                </span>
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Categoria financeira</span>
                <select
                  className={`input w-full ${form.considera_dre && !isCategoriaClassificadaParaDre(categoria) ? 'border-amber-300 bg-amber-50' : ''}`}
                  value={form.categoria_financeira_id}
                  onChange={(event) => updateField('categoria_financeira_id', event.target.value)}
                  required={Boolean(form.considera_dre)}
                >
                  <option value="">Sem categoria</option>
                  {categoriasFiltradas.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
                <span className="app-note mt-2">
                  {form.considera_dre && !isCategoriaClassificadaParaDre(categoria)
                    ? `${categoriaResumo}. Para DRE, selecione categoria com grupo DRE classificado.`
                    : categoriaResumo}
                </span>
              </label>

              <label className="sol-filter-field md:col-span-2 xl:col-span-3">
                <span className="sol-filter-label">Consulta por CPF/CNPJ</span>
                <input
                  className="input w-full"
                  placeholder="Digite CPF/CNPJ"
                  value={parceiroDocumentoBusca}
                  onChange={(event) => {
                    setParceiroDocumentoBusca(maskCpfCnpj(event.target.value));
                    if (onlyDigits(event.target.value).length >= 6) {
                      setParceiroNomeBusca('');
                    }
                  }}
                />
                <span className="app-note mt-2">{loadingParceiros ? 'Carregando parceiros...' : parceiroResumo}</span>
              </label>

              <div className="sol-filter-field md:col-span-2 xl:col-span-6">
                <span className="sol-filter-label">{form.tipo === 'RECEBER' ? 'Cliente' : 'Credor'}</span>
                <input
                  className="input w-full"
                  placeholder={form.tipo === 'RECEBER' ? 'Digite o nome do cliente' : 'Digite o nome do credor'}
                  value={parceiroNomeBusca}
                  onChange={(event) => {
                    setParceiroNomeBusca(event.target.value);
                    if (event.target.value.trim()) setParceiroDocumentoBusca('');
                    setForm((current) => ({ ...current, parceiro_id: '' }));
                  }}
                  required={!form.parceiro_id}
                  disabled={loadingParceiros}
                />
                <input type="hidden" value={form.parceiro_id} required />
                <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)]">
                  {parceiros.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-[var(--c-muted)]">
                      Nenhum {form.tipo === 'RECEBER' ? 'cliente' : 'credor'} encontrado.
                    </div>
                  ) : parceiros.slice(0, 8).map((parceiro) => {
                    const selected = String(parceiro.id) === String(form.parceiro_id);
                    return (
                      <button
                        key={parceiro.id}
                        type="button"
                        className={`w-full border-b border-[var(--c-border)] px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[var(--c-surface-muted)] ${selected ? 'bg-[var(--c-surface-muted)] font-medium text-[var(--c-text)]' : 'text-[var(--c-muted)]'}`}
                        onClick={() => selecionarParceiro(parceiro)}
                      >
                        <span className="block text-[var(--c-text)]">{parceiro.nome}</span>
                        <span className="block text-xs">{parceiro.cpf_cnpj || 'CPF/CNPJ nao informado'}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="app-note mt-2">
                  Ao selecionar pelo nome, o CPF/CNPJ e preenchido automaticamente.
                </span>
              </div>

              <label className="sol-filter-field md:col-span-2 xl:col-span-4">
                <span className="sol-filter-label">Descricao</span>
                <input
                  className="input w-full"
                  placeholder="Ex.: Aluguel administrativo, recebimento de cliente, ajuste de caixa"
                  value={form.descricao}
                  onChange={(event) => updateField('descricao', event.target.value)}
                  required
                />
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Numero do documento</span>
                <input
                  className="input w-full"
                  placeholder="NF, boleto, recibo ou referencia interna"
                  value={form.numero_documento}
                  onChange={(event) => updateField('numero_documento', event.target.value)}
                />
              </label>

              <label className="sol-filter-field xl:col-span-2">
                <span className="sol-filter-label">Valor</span>
                <input
                  className="input w-full"
                  placeholder="R$ 0,00"
                  value={form.valor}
                  onChange={(event) => updateField('valor', normalizeCurrencyTyping(event.target.value))}
                  onBlur={(event) => updateField('valor', formatCurrencyInput(event.target.value))}
                  required
                />
              </label>

              <div className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Total das formas</span>
                <div className={`input flex items-center ${totalBateComTitulo ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {formatCurrency(totalPagamentos)}
                  {!totalBateComTitulo && ` (${diferencaPagamentos > 0 ? 'faltam' : 'sobram'} ${formatCurrency(Math.abs(diferencaPagamentos))})`}
                </div>
              </div>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Data de emissao</span>
                <input
                  type="date"
                  className="input w-full"
                  value={form.data_emissao}
                  onChange={(event) => updateField('data_emissao', event.target.value)}
                />
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Competencia DRE</span>
                <input
                  type="date"
                  className="input w-full"
                  value={form.competencia_data}
                  onChange={(event) => updateField('competencia_data', event.target.value)}
                  required={Boolean(form.considera_dre)}
                />
                <span className="app-note mt-2">
                  {form.considera_dre
                    ? 'Obrigatoria para DRE. Use o mes/periodo economico real do fato gerador.'
                    : 'Opcional quando o titulo nao entra na DRE.'}
                </span>
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">DRE</span>
                <span className="flex min-h-[42px] items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 text-sm text-[var(--c-text)]">
                  <input
                    type="checkbox"
                    checked={Boolean(form.considera_dre)}
                    onChange={(event) => updateField('considera_dre', event.target.checked)}
                  />
                  Considerar na DRE gerencial
                </span>
              </label>

              <div className="sol-filter-field md:col-span-2 xl:col-span-6">
                <span className="sol-filter-label">Intercompany</span>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <label className="flex min-h-[42px] items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 text-sm text-[var(--c-text)]">
                    <input
                      type="checkbox"
                      checked={Boolean(form.intercompany)}
                      onChange={(event) => updateField('intercompany', event.target.checked)}
                    />
                    Movimentacao entre empresas do grupo
                  </label>
                  <select
                    className="input w-full"
                    value={form.empresa_origem_id}
                    onChange={(event) => updateField('empresa_origem_id', event.target.value)}
                    disabled={!form.intercompany}
                  >
                    <option value="">Empresa origem</option>
                    {empresasGrupo
                      .filter((empresa) => empresa.ativo !== false && String(empresa.tipo_empresa || 'OPERACIONAL').toUpperCase() !== 'HOLDING')
                      .map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                      ))}
                  </select>
                  <select
                    className="input w-full"
                    value={form.empresa_destino_id}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      empresa_destino_id: event.target.value,
                      empresa_contraparte_id: event.target.value
                    }))}
                    disabled={!form.intercompany}
                  >
                    <option value="">Empresa destino</option>
                    {empresasGrupo
                      .filter((empresa) => empresa.ativo !== false && String(empresa.tipo_empresa || 'OPERACIONAL').toUpperCase() !== 'HOLDING')
                      .map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                      ))}
                  </select>
                  <select
                    className="input w-full"
                    value={form.tipo_intercompany}
                    onChange={(event) => updateField('tipo_intercompany', event.target.value)}
                    disabled={!form.intercompany}
                  >
                    <option value="">Tipo intercompany</option>
                    {TIPOS_INTERCOMPANY.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <input
                    className="input w-full"
                    value={form.intercompany_group_id}
                    onChange={(event) => updateField('intercompany_group_id', event.target.value)}
                    disabled={!form.intercompany}
                    placeholder="Grupo intercompany opcional"
                  />
                  <input
                    className="input w-full"
                    value={form.motivo_intercompany}
                    onChange={(event) => updateField('motivo_intercompany', event.target.value)}
                    disabled={!form.intercompany}
                    placeholder="Motivo"
                  />
                  <label className="flex min-h-[42px] items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 text-sm text-[var(--c-text)]">
                    <input
                      type="checkbox"
                      checked={Boolean(form.elimina_consolidado)}
                      onChange={(event) => updateField('elimina_consolidado', event.target.checked)}
                      disabled={!form.intercompany}
                    />
                    Eliminar no consolidado
                  </label>
                  <label className="flex min-h-[42px] items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 text-sm text-[var(--c-text)]">
                    <input
                      type="checkbox"
                      checked={Boolean(form.transferencia_interna)}
                      onChange={(event) => updateField('transferencia_interna', event.target.checked)}
                      disabled={!form.intercompany}
                    />
                    Transferencia interna
                  </label>
                </div>
                <span className="app-note mt-2">
                  Informe origem, destino e tipo. A DRE consolidada elimina apenas o que estiver marcado para eliminacao.
                </span>
              </div>

              <ImpactoGerencialPreview
                form={form}
                categoria={categoriaSelecionada}
                empresasGrupo={empresasGrupo}
                totalPagamentos={totalPagamentos}
              />

              <div className="financeiro-formas-pagamento md:col-span-2 xl:col-span-12 space-y-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--c-text)]">Formas de pagamento</div>
                    <div className="text-xs text-[var(--c-muted)]">
                      Combine pix, cartao, boleto ou cheque ate fechar o valor total do titulo.
                    </div>
                  </div>
                  <button type="button" className="btn btn-outline shrink-0" onClick={adicionarPagamento}>
                    Adicionar
                  </button>
                </div>

                {(form.pagamentos || []).map((pagamento, pagamentoIndex) => {
                  const forma = getFormaPagamento(pagamento.forma_pagamento_id);
                  const quantidade = getQuantidadeParcelas(pagamento);
                  const usaDetalhe = forma && (isFormaBoleto(forma) || isFormaCheque(forma));
                  const usaCartao = isFormaCartao(forma);
                  const cartoesFiltrados = cartoes.filter((item) => item.ativo !== false && cartaoCompativelComForma(item, forma));

                  return (
                    <div key={pagamento.id || pagamentoIndex} className="space-y-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
                          Forma {pagamentoIndex + 1}
                        </div>
                        {(form.pagamentos || []).length > 1 && (
                          <button type="button" className="text-sm font-semibold text-rose-600" onClick={() => removerPagamento(pagamentoIndex)}>
                            Remover
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm">
                          <span className="mb-1 block text-[var(--c-muted)]">Forma de pagamento</span>
                          <select
                            className="input w-full"
                            value={pagamento.forma_pagamento_id}
                            onChange={(event) => updateFormaPagamento(pagamentoIndex, event.target.value)}
                          >
                            <option value="">Nao informar</option>
                            {formasPagamento.filter((item) => item.ativo !== false).map((item) => (
                              <option key={item.id} value={item.id}>{item.nome}</option>
                            ))}
                          </select>
                        </label>

                        <div className="text-sm">
                          <span className="mb-1 block text-[var(--c-muted)]">Valor desta forma</span>
                          {usaDetalhe ? (
                            <div className="input flex items-center bg-slate-50 text-slate-700">
                              {pagamento.valor || 'R$ 0,00'}
                            </div>
                          ) : (
                            <input
                              className="input w-full"
                              type="text"
                              inputMode="decimal"
                              placeholder="R$ 0,00"
                              value={pagamento.valor}
                              onChange={(event) => updateValorPagamento(pagamentoIndex, normalizeCurrencyTyping(event.target.value))}
                              onBlur={(event) => updateValorPagamento(pagamentoIndex, formatCurrencyInput(event.target.value))}
                            />
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {forma?.permite_parcelamento ? (
                          <label className="text-sm">
                            <span className="mb-1 block text-[var(--c-muted)]">Parcelas</span>
                            <input
                              className="input w-full"
                              type="number"
                              min="1"
                              max="120"
                              value={pagamento.quantidade_parcelas}
                              onChange={(event) => updateQuantidadeParcelas(pagamentoIndex, event.target.value)}
                            />
                          </label>
                        ) : (
                          <div className="text-sm">
                            <span className="mb-1 block text-[var(--c-muted)]">Parcelas</span>
                            <div className="input flex items-center bg-slate-50 text-slate-500">1 parcela</div>
                          </div>
                        )}

                        {usaCartao ? (
                          <label className="text-sm">
                            <span className="mb-1 block text-[var(--c-muted)]">Data da compra</span>
                            <input
                              className="input w-full"
                              type="date"
                              value={pagamento.data_compra}
                              onChange={(event) => updatePagamento(pagamentoIndex, { data_compra: event.target.value })}
                            />
                          </label>
                        ) : usaDetalhe ? (
                          <div className="text-sm">
                            <span className="mb-1 block text-[var(--c-muted)]">Vencimento</span>
                            <div className="input flex items-center bg-slate-50 text-slate-500">Definido nas parcelas</div>
                          </div>
                        ) : (
                          <label className="text-sm">
                            <span className="mb-1 block text-[var(--c-muted)]">Vencimento</span>
                            <input
                              className="input w-full"
                              type="date"
                              value={pagamento.data_vencimento}
                              onChange={(event) => updatePagamento(pagamentoIndex, { data_vencimento: event.target.value })}
                              required
                            />
                          </label>
                        )}
                      </div>

                      {forma?.exige_cartao && (
                        <label className="text-sm">
                          <span className="mb-1 block text-[var(--c-muted)]">Cartao</span>
                          <select
                            className="input w-full"
                            value={pagamento.cartao_id}
                            onChange={(event) => updatePagamento(pagamentoIndex, { cartao_id: event.target.value })}
                            required
                          >
                            <option value="">Selecione o cartao</option>
                            {cartoesFiltrados.map((cartao) => (
                              <option key={cartao.id} value={cartao.id}>
                                {cartao.nome} final {cartao.ultimos_digitos} ({labelTipoCartao(cartao.tipo)})
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      {usaDetalhe && (
                        <div className="space-y-3">
                          <div className="text-xs text-[var(--c-muted)]">
                            Informe vencimento e valor de cada {isFormaCheque(forma) ? 'cheque' : 'boleto'}.
                          </div>
                          {(pagamento.parcelas || []).map((parcela, parcelaIndex) => (
                            <div key={parcelaIndex} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-muted)] p-3">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
                                Parcela {parcelaIndex + 1}/{quantidade}
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-sm">
                                  <span className="mb-1 block text-[var(--c-muted)]">Valor</span>
                                  <input
                                    className="input w-full"
                                    type="text"
                                    inputMode="decimal"
                                    value={parcela.valor || ''}
                                    onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'valor', normalizeCurrencyTyping(event.target.value))}
                                    onBlur={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'valor', formatCurrencyInput(event.target.value))}
                                    required
                                  />
                                </label>
                                <label className="text-sm">
                                  <span className="mb-1 block text-[var(--c-muted)]">Vencimento</span>
                                  <input
                                    className="input w-full"
                                    type="date"
                                    value={parcela.data_vencimento || ''}
                                    onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'data_vencimento', event.target.value)}
                                    required
                                  />
                                </label>

                                {!isFormaCheque(forma) && (
                                  <label className="text-sm md:col-span-2">
                                    <span className="mb-1 block text-[var(--c-muted)]">Documento do boleto</span>
                                    <input
                                      className="input w-full"
                                      value={parcela.numero_documento || ''}
                                      onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'numero_documento', event.target.value)}
                                      placeholder="Nosso numero, linha ou referencia"
                                    />
                                  </label>
                                )}

                                {isFormaCheque(forma) && (
                                  <>
                                    <label className="text-sm">
                                      <span className="mb-1 block text-[var(--c-muted)]">Numero do cheque</span>
                                      <input
                                        className="input w-full"
                                        value={parcela.cheque_numero || ''}
                                        onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'cheque_numero', event.target.value)}
                                        required
                                      />
                                    </label>
                                    <label className="text-sm">
                                      <span className="mb-1 block text-[var(--c-muted)]">Emitente</span>
                                      <input
                                        className="input w-full"
                                        value={parcela.cheque_emitente || ''}
                                        onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'cheque_emitente', event.target.value)}
                                        required
                                      />
                                    </label>
                                    <label className="text-sm">
                                      <span className="mb-1 block text-[var(--c-muted)]">Banco</span>
                                      <input className="input w-full" value={parcela.cheque_banco || ''} onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'cheque_banco', event.target.value)} />
                                    </label>
                                    <label className="text-sm">
                                      <span className="mb-1 block text-[var(--c-muted)]">Agencia</span>
                                      <input className="input w-full" value={parcela.cheque_agencia || ''} onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'cheque_agencia', event.target.value)} />
                                    </label>
                                    <label className="text-sm">
                                      <span className="mb-1 block text-[var(--c-muted)]">Conta</span>
                                      <input className="input w-full" value={parcela.cheque_conta || ''} onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'cheque_conta', event.target.value)} />
                                    </label>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {form.tipo === 'RECEBER' && (
                <>
                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Forma de cobranca</span>
                    <select
                      className="input w-full"
                      value={form.forma_cobranca}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        forma_cobranca: event.target.value,
                        status_cobranca: event.target.value ? (current.status_cobranca || 'PENDENTE_EMISSAO') : 'PENDENTE_EMISSAO'
                      }))}
                    >
                      <option value="">Nao controlar</option>
                      {FORMAS_COBRANCA.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Status da cobranca</span>
                    <select
                      className="input w-full"
                      value={form.status_cobranca}
                      onChange={(event) => updateField('status_cobranca', event.target.value)}
                      disabled={!form.forma_cobranca}
                    >
                      {STATUS_COBRANCA.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Banco da cobranca</span>
                    <input
                      className="input w-full"
                      placeholder="Ex.: Caixa, Banco do Brasil, Sicredi"
                      value={form.banco_cobranca}
                      onChange={(event) => updateField('banco_cobranca', event.target.value)}
                    />
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Emitido em</span>
                    <input
                      type="date"
                      className="input w-full"
                      value={form.boleto_emitido_em}
                      onChange={(event) => updateField('boleto_emitido_em', event.target.value)}
                    />
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Nosso numero</span>
                    <input
                      className="input w-full"
                      value={form.nosso_numero}
                      onChange={(event) => updateField('nosso_numero', event.target.value)}
                    />
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Identificador externo</span>
                    <input
                      className="input w-full"
                      placeholder="ID da cobranca no banco"
                      value={form.identificador_externo}
                      onChange={(event) => updateField('identificador_externo', event.target.value)}
                    />
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Linha digitavel</span>
                    <input
                      className="input w-full"
                      value={form.linha_digitavel}
                      onChange={(event) => updateField('linha_digitavel', event.target.value)}
                    />
                  </label>

                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Codigo de barras</span>
                    <input
                      className="input w-full"
                      value={form.codigo_barras}
                      onChange={(event) => updateField('codigo_barras', event.target.value)}
                    />
                  </label>
                </>
              )}

              {moduloApropriacoesHabilitado && obraSelecionadaEhObra && (
              <label className="sol-filter-field xl:col-span-4">
                <span className="sol-filter-label">Item de apropriacão</span>
                <select
                  className="input w-full"
                  value={form.apropriacao_id}
                  onChange={(event) => updateField('apropriacao_id', event.target.value)}
                  disabled={!form.obra_id || loadingApropriacoes}
                >
                  <option value="">Sem apropriacão</option>
                  {apropriacoes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.codigo ? `${item.codigo} — ${item.descricao}` : item.descricao}
                    </option>
                  ))}
                </select>
                <span className="app-note mt-2">
                  {!form.obra_id
                    ? 'Selecione uma obra para ver os itens.'
                    : loadingApropriacoes
                      ? 'Carregando...'
                      : apropriacoes.length === 0
                        ? 'Nenhum item cadastrado para esta obra.'
                        : `${apropriacoes.length} item(s) disponivel(is).`}
                </span>
              </label>
              )}

              {form.tipo === 'PAGAR' && (
                <div className="md:col-span-2 xl:col-span-12 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-[var(--c-text)]">Dados para pagamento do credor</h2>
                      <p className="text-sm text-[var(--c-muted)]">
                        Use estes dados para deixar o credor pronto para lotes PIX por chave.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                      <input
                        type="checkbox"
                        checked={paymentDraft.preparar_pagamento_pix}
                        onChange={(event) => setPaymentDraft((current) => ({ ...current, preparar_pagamento_pix: event.target.checked }))}
                      />
                      Preparar PIX
                    </label>
                  </div>

                  {paymentDraft.preparar_pagamento_pix && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                      <div className="xl:col-span-12 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-muted)] px-3 py-2 text-sm text-[var(--c-muted)]">
                        Favorecido vinculado e o cadastro bancario rastreado que sera usado no lote PIX. Ele pode ser o proprio credor do titulo ou um favorecido separado, com snapshot travado quando o lote for criado.
                      </div>

                      <label className="flex items-start gap-2 text-sm text-[var(--c-text)] xl:col-span-4">
                        <input
                          type="checkbox"
                          checked={paymentDraft.usar_credor_como_favorecido}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setPaymentDraft((current) => ({ ...current, usar_credor_como_favorecido: checked }));
                            if (checked && parceiroSelecionado) preencherFavorecidoComParceiro(parceiroSelecionado);
                          }}
                          disabled={!parceiroSelecionado}
                        />
                        <span>
                          Usar o mesmo credor como favorecido
                          <span className="mt-1 block text-xs text-[var(--c-muted)]">
                            Preenche nome, CPF/CNPJ e a primeira chave PIX cadastrada no credor.
                          </span>
                        </span>
                      </label>

                      <label className="sol-filter-field xl:col-span-4">
                        <span className="sol-filter-label">Favorecido bancario vinculado</span>
                        <select
                          className="input w-full"
                          value={paymentDraft.payment_beneficiary_id}
                          onChange={(event) => {
                            const selected = beneficiaries.find((item) => String(item.id) === String(event.target.value));
                            setPaymentDraft((current) => ({
                              ...current,
                              usar_credor_como_favorecido: false,
                              payment_beneficiary_id: event.target.value,
                              nome: selected?.nome || current.nome,
                              cpf_cnpj: selected?.cpf_cnpj || current.cpf_cnpj,
                              pix_tipo_chave: selected?.pix_tipo_chave || current.pix_tipo_chave,
                              pix_chave: selected?.pix_chave || current.pix_chave
                            }));
                          }}
                        >
                          <option value="">Novo favorecido</option>
                          {beneficiaries.map((beneficiary) => (
                            <option key={beneficiary.id} value={beneficiary.id}>
                              {beneficiary.nome} - {beneficiary.pix_chave || 'sem PIX'}
                            </option>
                          ))}
                        </select>
                        <span className="app-note mt-2">
                          Se nao houver favorecido salvo, use o proprio credor ou informe os dados abaixo.
                        </span>
                      </label>
                      {paymentDraft.usar_credor_como_favorecido && parceiroPixOptions.length > 1 && (
                        <label className="sol-filter-field xl:col-span-4">
                          <span className="sol-filter-label">Chave PIX do credor</span>
                          <select
                            className="input w-full"
                            value={`${paymentDraft.pix_tipo_chave}:${paymentDraft.pix_chave}`}
                            onChange={(event) => {
                              const selected = parceiroPixOptions.find((item) => `${item.tipo}:${item.chave}` === event.target.value);
                              if (!selected) return;
                              setPaymentDraft((current) => ({
                                ...current,
                                pix_tipo_chave: selected.tipo,
                                pix_chave: selected.chave
                              }));
                            }}
                          >
                            {parceiroPixOptions.map((item) => (
                              <option key={item.id} value={`${item.tipo}:${item.chave}`}>
                                {item.label} - {item.tipo} {item.chave}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label className="sol-filter-field xl:col-span-3">
                        <span className="sol-filter-label">Nome favorecido</span>
                        <input className="input w-full" value={paymentDraft.nome} onChange={(event) => setPaymentDraft((current) => ({ ...current, nome: event.target.value }))} required={paymentDraft.preparar_pagamento_pix} />
                      </label>
                      <label className="sol-filter-field xl:col-span-2">
                        <span className="sol-filter-label">CPF/CNPJ</span>
                        <input className="input w-full" value={paymentDraft.cpf_cnpj} onChange={(event) => setPaymentDraft((current) => ({ ...current, cpf_cnpj: event.target.value }))} required={paymentDraft.preparar_pagamento_pix} />
                      </label>
                      <label className="sol-filter-field xl:col-span-2">
                        <span className="sol-filter-label">Tipo chave PIX</span>
                        <select className="input w-full" value={paymentDraft.pix_tipo_chave} onChange={(event) => setPaymentDraft((current) => ({ ...current, pix_tipo_chave: event.target.value }))}>
                          {PIX_TIPOS_CHAVE.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                        </select>
                      </label>
                      <label className="sol-filter-field xl:col-span-2">
                        <span className="sol-filter-label">Chave PIX</span>
                        <input className="input w-full" value={paymentDraft.pix_chave} onChange={(event) => setPaymentDraft((current) => ({ ...current, pix_chave: event.target.value }))} required={paymentDraft.preparar_pagamento_pix} />
                      </label>
                      <label className="sol-filter-field xl:col-span-4">
                        <span className="sol-filter-label">Conta pagadora BB</span>
                        <select className="input w-full" value={paymentDraft.payment_account_id} onChange={(event) => setPaymentDraft((current) => ({ ...current, payment_account_id: event.target.value }))}>
                          <option value="">Selecione a conta</option>
                          {paymentAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.contaBancaria?.nome || `Conta ${account.id}`} - CNPJ {account.cnpj_pagador} - Conv. {account.convenio || '-'}
                            </option>
                          ))}
                        </select>
                        <span className="app-note mt-2">
                          Cadastre em Cadastros Financeiros &gt; Contas pagadoras BB. Cada conta pode ter empresa, CNPJ e convenio proprios.
                        </span>
                      </label>
                      <label className="sol-filter-field xl:col-span-2">
                        <span className="sol-filter-label">Data de Pagamento</span>
                        <input className="input w-full" type="date" value={paymentDraft.data_pagamento || form.data_vencimento} onChange={(event) => setPaymentDraft((current) => ({ ...current, data_pagamento: event.target.value }))} />
                      </label>
                      <div className="xl:col-span-6 app-note">
                        O titulo guarda o parceiro como origem. O lote futuro cria snapshot imutavel do favorecido, valor e conta pagadora.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <label className="sol-filter-field md:col-span-2 xl:col-span-12">
                <span className="sol-filter-label">Observacoes</span>
                <textarea
                  className="input min-h-[120px] w-full"
                  placeholder="Informacoes adicionais para a operacao financeira"
                  value={form.observacoes}
                  onChange={(event) => updateField('observacoes', event.target.value)}
                />
              </label>
            </div>

            <div className="app-page-actions justify-end">
              <Link to="/financeiro/titulos" className="btn btn-outline">Cancelar</Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : (form.tipo === 'RECEBER' ? 'Criar conta a receber' : 'Criar conta a pagar')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
