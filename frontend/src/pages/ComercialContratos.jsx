import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros, criarParceiro } from '../services/parceiros';
import { getCategoriasFinanceiras } from '../services/financeiro';
import { getComercialCategoriasContrato } from '../services/configuracoesSistema';
import { isValidCpfCnpj, maskCep, maskCpfCnpj, maskCreci, maskPhone, normalizeCurrencyTyping, onlyDigits } from '../utils/formatters';
import {
  atualizarContratoComercial,
  criarContratoComercial,
  distratarContratoComercial,
  enviarDocumentoContratoD4Sign,
  gerarDocumentoContratoComercial,
  getContratoComercialById,
  getContratosComerciais,
  getDocumentosContratoComercial,
  getEmpreendimentosComerciais,
  getLinkDocumentoContratoComercial,
  getModelosContratoComercial,
  getUnidadesComerciais,
  sincronizarStatusFinanceiroContratoComercial,
  trocarUnidadeContratoComercial
} from '../services/comercial';

const STATUS_CONTRATO = ['RASCUNHO', 'ATIVO', 'INADIMPLENTE', 'QUITADO', 'DISTRATADO', 'CANCELADO'];
const FORMAS_RECEBIMENTO = ['DINHEIRO', 'PIX', 'CARTAO', 'TRANSFERENCIA', 'BOLETO', 'CHEQUE', 'PERMUTA', 'BENS', 'OUTROS'];
const PARCELA_TIPOS = ['ENTRADA', 'PARCELA', 'INTERMEDIARIA', 'CHAVES', 'BALAO', 'OUTRA'];
const PARCELA_REAJUSTE_TIPOS = [
  { value: 'FIXA', label: 'Fixa', resumo: 'F' },
  { value: 'REAJUSTAVEL', label: 'Reajustavel', resumo: 'R' }
];
const TIPOS_DOCUMENTO_MODELO = [
  { value: 'CONTRATO', label: 'Contrato padrao' },
  { value: 'QUADRO_RESUMO', label: 'Quadro resumo' }
];
const MODOS_COMPOSICAO = [
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'PERIODICO', label: 'Parcelas periodicas' },
  { value: 'MANUAL', label: 'Lancamentos manuais' }
];
const PERIODICIDADES = [
  { value: 'AVISTA', label: 'A vista', intervalMonths: 0 },
  { value: 'MENSAL', label: 'Mensal', intervalMonths: 1 },
  { value: 'TRIMESTRAL', label: 'Trimestral', intervalMonths: 3 },
  { value: 'SEMESTRAL', label: 'Semestral', intervalMonths: 6 },
  { value: 'ANUAL', label: 'Anual', intervalMonths: 12 },
  { value: 'PERSONALIZADA', label: 'Datas pre-definidas', intervalMonths: null }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function defaultForm() {
  return {
    id: null,
    empreendimento_id: '',
    unidade_comercial_id: '',
    parceiro_id: '',
    corretor_parceiro_id: '',
    obra_id: '',
    categoria_financeira_id: '',
    categoria_financeira_comissao_id: '',
    numero: '',
    status: 'ATIVO',
    data_contrato: today(),
    valor_total: '',
    valor_entrada: '',
    desconto_concedido: '',
    indice_reajuste: '',
    corretor_nome: '',
    comissao_percentual: '',
    possui_vaga_garagem: false,
    quantidade_vagas_garagem: '',
    vagas_garagem_posicao_especifica: false,
    vagas_garagem_posicao: '',
    local_assinatura: '',
    data_assinatura: today(),
    observacoes: '',
    parcelas: []
  };
}

function defaultGenerator() {
  return {
    modo: 'PERIODICO',
    titulo_bloco: '',
    tipo_parcela: 'PARCELA',
    periodicidade: 'MENSAL',
    quantidade_parcelas: '12',
    valor_parcela: '',
    primeiro_vencimento: today(),
    forma_recebimento_prevista: 'BOLETO',
    reajuste_tipo: 'FIXA',
    detalhe_forma_recebimento: '',
    parcelas_personalizadas: [
      {
        descricao: 'Parcela 1',
        tipo_parcela: 'PARCELA',
        reajuste_tipo: 'FIXA',
        data_vencimento: today(),
        valor: '',
        observacoes: ''
      }
    ]
  };
}

function defaultDistratoForm() {
  return {
    data_distrato: today(),
    motivo_distrato: '',
    observacoes: ''
  };
}

function defaultTrocaForm() {
  return {
    unidade_comercial_destino_id: '',
    novo_valor_total: '',
    data_efetiva: today(),
    observacoes: ''
  };
}

function defaultPessoaRapidaForm(tipo = 'cliente') {
  return {
    tipo,
    cpf_cnpj: '',
    nome: '',
    telefone: '',
    email: '',
    data_nascimento: '',
    nacionalidade: '',
    profissao: '',
    estado_civil: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: '',
    municipio: '',
    estado: '',
    possui_conjuge: false,
    conjuge: defaultConjugeRapidoForm(),
    regime_bens: '',
    creci: ''
  };
}

function defaultConjugeRapidoForm() {
  return {
    cpf_cnpj: '',
    nome: '',
    telefone: '',
    email: '',
    data_nascimento: '',
    nacionalidade: '',
    profissao: '',
    estado_civil: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: '',
    municipio: '',
    estado: ''
  };
}

function buildPessoaRapidaPayload(form, tipo, extras = {}) {
  return {
    cpf_cnpj: onlyDigits(form.cpf_cnpj),
    nome: form.nome,
    telefone: onlyDigits(form.telefone),
    email: form.email,
    data_nascimento: form.data_nascimento,
    nacionalidade: form.nacionalidade,
    profissao: form.profissao,
    estado_civil: form.estado_civil,
    endereco: form.endereco,
    numero: form.numero,
    complemento: form.complemento,
    bairro: form.bairro,
    cep: onlyDigits(form.cep),
    municipio: form.municipio,
    estado: form.estado,
    creci: tipo === 'corretor' ? form.creci : '',
    cliente: tipo === 'cliente',
    fornecedor: tipo === 'corretor',
    corretor: tipo === 'corretor',
    ...extras
  };
}

function defaultDocumentoForm() {
  return {
    tipo_documento: 'CONTRATO',
    modelo_id: '',
    variaveis_json: ''
  };
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isDescricaoParcelaGenerica(value) {
  const normalized = normalizeSearch(value).trim();
  return !normalized || /^parcela\s+\d+$/.test(normalized);
}

function normalizarParcelasContrato(parcelas = []) {
  let sequenciaBoleto = 0;

  return parcelas.map((item, index) => {
    const formaRecebimento = String(item.forma_recebimento_prevista || '').trim().toUpperCase();
    const proximaParcela = {
      ...item,
      sequencia: index + 1
    };

    if (formaRecebimento === 'BOLETO') {
      sequenciaBoleto += 1;
      if (isDescricaoParcelaGenerica(proximaParcela.descricao)) {
        proximaParcela.descricao = `Parcela ${sequenciaBoleto}`;
      }
    }

    return proximaParcela;
  });
}

function formatCurrency(value) {
  return toNumber(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatCurrencyInput(value) {
  if (value == null || String(value).trim() === '') return '';
  const numeric = toNumber(value);
  return numeric > 0 ? formatCurrency(numeric) : '';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function toNumber(value) {
  if (value == null || String(value).trim() === '') return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value || '').trim().replace(/[R$\s]/gi, '');
  if (!raw) return 0;

  let normalized = raw;
  if (raw.includes(',')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function hasText(value) {
  return String(value ?? '').trim() !== '';
}

function formatMissingFields(fields) {
  if (fields.length <= 1) return fields[0] || '';
  if (fields.length === 2) return `${fields[0]} e ${fields[1]}`;
  return `${fields.slice(0, -1).join(', ')} e ${fields[fields.length - 1]}`;
}

function addMonths(dateString, monthsToAdd) {
  const [year, month, day] = String(dateString || '').split('-').map(Number);
  if (!year || !month || !day) return today();
  const target = new Date(year, month - 1 + monthsToAdd, day);
  if (target.getDate() !== day) target.setDate(0);
  return new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function getPeriodicidadeConfig(periodicidade) {
  return PERIODICIDADES.find((item) => item.value === periodicidade) || PERIODICIDADES[0];
}

function getModoComposicaoLabel(modo) {
  return MODOS_COMPOSICAO.find((item) => item.value === modo)?.label || 'Composicao';
}

function buildParcelaCustomizada(index = 1, overrides = {}) {
  return {
    descricao: `Parcela ${index}`,
    tipo_parcela: 'PARCELA',
    reajuste_tipo: 'FIXA',
    data_vencimento: today(),
    valor: '',
    observacoes: '',
    ...overrides
  };
}

function isFormaComDetalhe(forma) {
  return ['BENS', 'PERMUTA', 'OUTROS'].includes(String(forma || '').toUpperCase());
}

function buildObservacoesParcela(observacoes, detalheFormaRecebimento) {
  const partes = [
    detalheFormaRecebimento ? `Detalhe da forma: ${String(detalheFormaRecebimento).trim()}` : '',
    String(observacoes || '').trim()
  ].filter(Boolean);

  return partes.join('\n');
}

function statusClass(status) {
  switch (String(status || '').toUpperCase()) {
    case 'ATIVO':
      return 'bg-emerald-100 text-emerald-700';
    case 'QUITADO':
      return 'bg-blue-100 text-blue-700';
    case 'INADIMPLENTE':
      return 'bg-amber-100 text-amber-700';
    case 'DISTRATADO':
    case 'CANCELADO':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function documentoTipoLabel(tipo) {
  return TIPOS_DOCUMENTO_MODELO.find((item) => item.value === String(tipo || '').toUpperCase())?.label || tipo || '-';
}

function pickEditForm(contrato = {}) {
  return {
    id: contrato.id || null,
    empreendimento_id: contrato.empreendimento_id ? String(contrato.empreendimento_id) : '',
    unidade_comercial_id: contrato.unidade_comercial_id ? String(contrato.unidade_comercial_id) : '',
    parceiro_id: contrato.parceiro_id ? String(contrato.parceiro_id) : '',
    corretor_parceiro_id: contrato.corretor_parceiro_id ? String(contrato.corretor_parceiro_id) : '',
    obra_id: contrato.obra_id ? String(contrato.obra_id) : '',
    categoria_financeira_id: contrato.categoria_financeira_id ? String(contrato.categoria_financeira_id) : '',
    categoria_financeira_comissao_id: contrato.categoria_financeira_comissao_id ? String(contrato.categoria_financeira_comissao_id) : '',
    numero: contrato.numero || '',
    status: contrato.status || 'ATIVO',
    data_contrato: contrato.data_contrato || today(),
    valor_total: formatCurrencyInput(contrato.valor_total),
    valor_entrada: formatCurrencyInput(contrato.valor_entrada),
    desconto_concedido: formatCurrencyInput(contrato.desconto_concedido),
    indice_reajuste: contrato.indice_reajuste || '',
    corretor_nome: contrato.corretor_nome || '',
    comissao_percentual: contrato.comissao_percentual || '',
    possui_vaga_garagem: Boolean(contrato.possui_vaga_garagem),
    quantidade_vagas_garagem: contrato.quantidade_vagas_garagem ? String(contrato.quantidade_vagas_garagem) : '',
    vagas_garagem_posicao_especifica: Boolean(contrato.vagas_garagem_posicao),
    vagas_garagem_posicao: contrato.vagas_garagem_posicao || '',
    local_assinatura: contrato.local_assinatura || '',
    data_assinatura: contrato.data_assinatura || contrato.data_contrato || today(),
    observacoes: contrato.observacoes || '',
    parcelas: Array.isArray(contrato.parcelas) ? contrato.parcelas : []
  };
}

function resolveGeneratorByModo(modo, current = {}) {
  if (modo === 'ENTRADA') {
    return {
      ...current,
      modo,
      titulo_bloco: current.titulo_bloco || 'Entrada',
      tipo_parcela: 'ENTRADA',
      periodicidade: 'AVISTA',
      quantidade_parcelas: '1'
    };
  }

  return { ...current, modo };
}

function gerarParcelasDoBloco(plano = {}, planoId = '') {
  const formaRecebimento = plano.forma_recebimento_prevista || '';
  const tituloBase = String(plano.titulo_bloco || '').trim();
  const tipoParcelaPadrao = plano.tipo_parcela || 'PARCELA';
  const periodicidade = getPeriodicidadeConfig(plano.periodicidade);

  function withPlanoMetadata(parcela, index, intervalMonths = null) {
    return {
      ...parcela,
      plano_pagamento_id: planoId || plano.id || '',
      plano_parcela_index: index,
      plano_periodicidade: plano.periodicidade || '',
      plano_interval_months: intervalMonths
    };
  }

  if (plano.modo === 'ENTRADA') {
    const valorEntrada = toNumber(plano.valor_parcela);
    if (valorEntrada <= 0 || !plano.primeiro_vencimento) {
      return { error: 'Informe valor e vencimento da entrada.' };
    }

    const parcela = withPlanoMetadata({
      descricao: tituloBase || 'Entrada',
      tipo_parcela: 'ENTRADA',
      forma_recebimento_prevista: formaRecebimento,
      reajuste_tipo: plano.reajuste_tipo || 'FIXA',
      data_vencimento: plano.primeiro_vencimento,
      valor: valorEntrada.toFixed(2),
      observacoes: buildObservacoesParcela('', plano.detalhe_forma_recebimento)
    }, 0, 0);

    return {
      parcelas: [parcela],
      total: roundCurrency(valorEntrada)
    };
  }

  if (plano.modo === 'MANUAL') {
    const parcelas = (plano.parcelas_personalizadas || [])
      .map((item, index) => ({
        descricao: item.descricao || (tituloBase ? `${tituloBase} ${index + 1}` : `Lancamento ${index + 1}`),
        tipo_parcela: item.tipo_parcela || tipoParcelaPadrao,
        forma_recebimento_prevista: formaRecebimento,
        reajuste_tipo: item.reajuste_tipo || plano.reajuste_tipo || 'FIXA',
        data_vencimento: item.data_vencimento,
        valor: toNumber(item.valor).toFixed(2),
        observacoes: buildObservacoesParcela(item.observacoes, plano.detalhe_forma_recebimento)
      }))
      .filter((item) => item.data_vencimento && toNumber(item.valor) > 0);

    if (!parcelas.length) {
      return { error: 'Informe ao menos um lancamento manual com data e valor.' };
    }

    return {
      parcelas: parcelas.map((item, index) => withPlanoMetadata(item, index, null)),
      total: roundCurrency(parcelas.reduce((acc, item) => acc + toNumber(item.valor), 0))
    };
  }

  const quantidade = periodicidade.value === 'AVISTA'
    ? 1
    : Math.max(0, Number(plano.quantidade_parcelas || 0));
  const valorParcela = toNumber(plano.valor_parcela);

  if (!quantidade || valorParcela <= 0) {
    return { error: 'Informe quantidade e valor validos para a composicao periodica.' };
  }

  const parcelas = Array.from({ length: quantidade }).map((_, index) => withPlanoMetadata({
    descricao: tituloBase ? `${tituloBase} ${index + 1}` : `Parcela ${index + 1}`,
    tipo_parcela: tipoParcelaPadrao,
    forma_recebimento_prevista: formaRecebimento,
    reajuste_tipo: plano.reajuste_tipo || 'FIXA',
    data_vencimento: addMonths(plano.primeiro_vencimento || today(), index * periodicidade.intervalMonths),
    valor: valorParcela.toFixed(2),
    observacoes: buildObservacoesParcela('', plano.detalhe_forma_recebimento)
  }, index, periodicidade.intervalMonths));

  return {
    parcelas,
    total: roundCurrency(parcelas.reduce((acc, item) => acc + toNumber(item.valor), 0))
  };
}

export default function ComercialContratos() {
  const [form, setForm] = useState(defaultForm());
  const [generator, setGenerator] = useState(defaultGenerator());
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [corretores, setCorretores] = useState([]);
  const [obras, setObras] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaConfig, setCategoriaConfig] = useState({
    contrato_venda_categoria_ids: [],
    comissao_categoria_ids: []
  });
  const [categoriaConfigLoaded, setCategoriaConfigLoaded] = useState(false);
  const [contratos, setContratos] = useState([]);
  const [modelosContrato, setModelosContrato] = useState([]);
  const [documentosContrato, setDocumentosContrato] = useState([]);
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingAction, setProcessingAction] = useState('');
  const [showDistrato, setShowDistrato] = useState(false);
  const [showTroca, setShowTroca] = useState(false);
  const [pessoaRapidaModal, setPessoaRapidaModal] = useState(null);
  const [pessoaRapidaForm, setPessoaRapidaForm] = useState(defaultPessoaRapidaForm());
  const [documentoForm, setDocumentoForm] = useState(defaultDocumentoForm());
  const [distratoForm, setDistratoForm] = useState(defaultDistratoForm());
  const [trocaForm, setTrocaForm] = useState(defaultTrocaForm());
  const [error, setError] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const [empreData, unidData, clientesData, corretoresData, obrasData, categoriasData, contratosData, categoriaConfigData, modelosData] = await Promise.all([
        getEmpreendimentosComerciais({ ativo: 1 }),
        getUnidadesComerciais({ ativo: 1 }),
        buscarParceiros({ cliente: 1, ativo: 1, limit: 300 }),
        buscarParceiros({ corretor: 1, ativo: 1, limit: 300 }),
        getMinhasObras(),
        getCategoriasFinanceiras(),
        getContratosComerciais(),
        getComercialCategoriasContrato().catch(() => null),
        getModelosContratoComercial().catch(() => [])
      ]);
      setEmpreendimentos(Array.isArray(empreData) ? empreData : []);
      setUnidades(Array.isArray(unidData) ? unidData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setCorretores(Array.isArray(corretoresData) ? corretoresData : []);
      setObras(Array.isArray(obrasData) ? obrasData : []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      if (categoriaConfigData) {
        setCategoriaConfig({
          contrato_venda_categoria_ids: Array.isArray(categoriaConfigData.contrato_venda_categoria_ids)
            ? categoriaConfigData.contrato_venda_categoria_ids.map(Number)
            : [],
          comissao_categoria_ids: Array.isArray(categoriaConfigData.comissao_categoria_ids)
            ? categoriaConfigData.comissao_categoria_ids.map(Number)
            : []
        });
        setCategoriaConfigLoaded(true);
      } else {
        setCategoriaConfigLoaded(false);
      }
      setContratos(Array.isArray(contratosData) ? contratosData : []);
      setModelosContrato(Array.isArray(modelosData) ? modelosData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar contratos comerciais');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const unidadesDoEmpreendimento = useMemo(() => {
    const unidadesBase = form.empreendimento_id
      ? unidades.filter((item) => String(item.empreendimento_id) === String(form.empreendimento_id))
      : unidades;

    return unidadesBase.filter((item) => {
      const situacao = String(item.situacao || '').trim().toUpperCase();
      const unidadeAtualDoContrato = form.id && String(item.id) === String(form.unidade_comercial_id);
      return unidadeAtualDoContrato || situacao !== 'VENDIDA';
    });
  }, [form.empreendimento_id, form.id, form.unidade_comercial_id, unidades]);

  const empreendimentoSelecionado = useMemo(
    () => empreendimentos.find((item) => String(item.id) === String(form.empreendimento_id)),
    [empreendimentos, form.empreendimento_id]
  );

  const obraSelecionada = useMemo(
    () => obras.find((item) => String(item.id) === String(form.obra_id)),
    [form.obra_id, obras]
  );

  const categoriasCompativeis = useMemo(
    () => {
      const permitidas = new Set((categoriaConfig.contrato_venda_categoria_ids || []).map(Number));
      return categorias.filter((item) => {
        const compativel = ['RECEBER', 'AMBOS'].includes(String(item.tipo || '').toUpperCase());
        return compativel && (!categoriaConfigLoaded || permitidas.has(Number(item.id)));
      });
    },
    [categorias, categoriaConfig.contrato_venda_categoria_ids, categoriaConfigLoaded]
  );

  const categoriasCompativeisPagar = useMemo(
    () => {
      const permitidas = new Set((categoriaConfig.comissao_categoria_ids || []).map(Number));
      return categorias.filter((item) => {
        const compativel = ['PAGAR', 'AMBOS'].includes(String(item.tipo || '').toUpperCase());
        return compativel && (!categoriaConfigLoaded || permitidas.has(Number(item.id)));
      });
    },
    [categorias, categoriaConfig.comissao_categoria_ids, categoriaConfigLoaded]
  );

  const contratosFiltrados = useMemo(() => {
    const termo = normalizeSearch(busca);
    return contratos.filter((item) => {
      if (statusFiltro && String(item.status) !== statusFiltro) return false;
      if (!termo) return true;
      const blob = normalizeSearch([
        item.numero,
        item.cliente?.nome,
        item.unidadeComercial?.codigo,
        item.empreendimento?.nome,
        item.corretor_nome
      ].filter(Boolean).join(' '));
      return blob.includes(termo);
    });
  }, [busca, contratos, statusFiltro]);

  const totalParcelas = useMemo(
    () => form.parcelas.reduce((acc, item) => acc + toNumber(item.valor || item.valor_original), 0),
    [form.parcelas]
  );
  const valorEntradaComposicao = useMemo(
    () => form.parcelas
      .filter((item) => String(item.tipo_parcela || '').toUpperCase() === 'ENTRADA')
      .reduce((acc, item) => acc + toNumber(item.valor || item.valor_original), 0),
    [form.parcelas]
  );

  const valorTotalContrato = useMemo(() => toNumber(form.valor_total), [form.valor_total]);
  const diferencaComposicao = useMemo(
    () => roundCurrency(valorTotalContrato - totalParcelas),
    [valorTotalContrato, totalParcelas]
  );

  const unidadesElegiveisTroca = useMemo(() => {
    if (!contratoSelecionado?.unidade_comercial_id) return [];
    return unidades.filter((item) =>
      Number(item.id) !== Number(contratoSelecionado.unidade_comercial_id)
      && String(item.ativo) !== 'false'
      && !['VENDIDA', 'BLOQUEADA'].includes(String(item.situacao || '').toUpperCase())
    );
  }, [contratoSelecionado?.unidade_comercial_id, unidades]);

  const modelosDoContratoSelecionado = useMemo(() => {
    if (!contratoSelecionado?.empreendimento_id) return [];
    return modelosContrato.filter((item) =>
      Number(item.empreendimento_id) === Number(contratoSelecionado.empreendimento_id)
      && String(item.tipo_documento || '').toUpperCase() === String(documentoForm.tipo_documento || '').toUpperCase()
    );
  }, [contratoSelecionado?.empreendimento_id, documentoForm.tipo_documento, modelosContrato]);

  const possuiModeloQuadroResumoSelecionado = useMemo(() => {
    if (!contratoSelecionado?.empreendimento_id) return false;
    return modelosContrato.some((item) =>
      Number(item.empreendimento_id) === Number(contratoSelecionado.empreendimento_id)
      && String(item.tipo_documento || '').toUpperCase() === 'QUADRO_RESUMO'
    );
  }, [contratoSelecionado?.empreendimento_id, modelosContrato]);

  function aplicarPlanosAoContrato(planos) {
    const parcelas = normalizarParcelasContrato(planos.flatMap((plano) =>
      (plano.parcelas_geradas || []).map((item) => ({ ...item }))
    ));
    const total = roundCurrency(parcelas.reduce((acc, item) => acc + toNumber(item.valor), 0));

    setForm((current) => ({
      ...current,
      parcelas,
      valor_total: current.valor_total ? current.valor_total : (total > 0 ? formatCurrencyInput(total) : '')
    }));
  }

  function selecionarEmpreendimentoContrato(empreendimentoId) {
    const empreendimento = empreendimentos.find((item) => String(item.id) === String(empreendimentoId));
    setForm((current) => ({
      ...current,
      empreendimento_id: empreendimentoId,
      unidade_comercial_id: '',
      obra_id: empreendimento?.obra_id ? String(empreendimento.obra_id) : '',
      numero: ''
    }));
  }

  function adicionarFormaPagamento() {
    if (isFormaComDetalhe(generator.forma_recebimento_prevista) && !String(generator.detalhe_forma_recebimento || '').trim()) {
      setError('Descreva o bem, a permuta ou o outro recebimento antes de adicionar a forma de pagamento.');
      return;
    }

    const planoId = `${Date.now()}-${Math.random()}`;
    const resultado = gerarParcelasDoBloco(generator, planoId);
    if (resultado.error) {
      setError(resultado.error);
      return;
    }

    const proximoPlano = {
      id: planoId,
      ...generator,
      parcelas_geradas: resultado.parcelas,
      total_bloco: resultado.total
    };
    const proximosPlanos = [...paymentPlans, proximoPlano];

    setError('');
    setPaymentPlans(proximosPlanos);
    aplicarPlanosAoContrato(proximosPlanos);
    setGenerator(defaultGenerator());
  }

  function removerFormaPagamento(planoId) {
    const proximosPlanos = paymentPlans.filter((item) => item.id !== planoId);
    setPaymentPlans(proximosPlanos);
    aplicarPlanosAoContrato(proximosPlanos);
  }

  function updateParcelaCustomizada(index, field, value) {
    setGenerator((current) => {
      const parcelasPersonalizadas = [...(current.parcelas_personalizadas || [])];
      parcelasPersonalizadas[index] = {
        ...parcelasPersonalizadas[index],
        [field]: value
      };
      return {
        ...current,
        parcelas_personalizadas: parcelasPersonalizadas
      };
    });
  }

  function adicionarParcelaCustomizada() {
    setGenerator((current) => ({
      ...current,
      parcelas_personalizadas: [
        ...(current.parcelas_personalizadas || []),
        buildParcelaCustomizada((current.parcelas_personalizadas || []).length + 1)
      ]
    }));
  }

  function removerParcelaCustomizada(index) {
    setGenerator((current) => {
      const parcelasPersonalizadas = (current.parcelas_personalizadas || []).filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        parcelas_personalizadas: parcelasPersonalizadas.length
          ? parcelasPersonalizadas
          : [buildParcelaCustomizada(1)]
      };
    });
  }

  function updateParcela(index, field, value) {
    setForm((current) => {
      const parcelas = [...current.parcelas];
      const parcelaAtual = parcelas[index] || {};
      const planoId = parcelaAtual.plano_pagamento_id;

      parcelas[index] = { ...parcelaAtual, [field]: value };

      if (field === 'data_vencimento' && value && planoId && Number(parcelaAtual.plano_interval_months) > 0) {
        const intervalo = Number(parcelaAtual.plano_interval_months);
        const indiceBase = Number(parcelaAtual.plano_parcela_index || 0);

        parcelas.forEach((parcela, parcelaIndex) => {
          if (
            parcelaIndex !== index
            && parcela.plano_pagamento_id === planoId
            && Number(parcela.plano_parcela_index || 0) > indiceBase
          ) {
            parcelas[parcelaIndex] = {
              ...parcela,
              data_vencimento: addMonths(value, (Number(parcela.plano_parcela_index || 0) - indiceBase) * intervalo)
            };
          }
        });
      }

      const parcelasNormalizadas = normalizarParcelasContrato(parcelas);
      if (planoId) {
        setPaymentPlans((plans) => plans.map((plano) => {
          if (plano.id !== planoId) return plano;
          const parcelasGeradas = parcelasNormalizadas
            .filter((parcela) => parcela.plano_pagamento_id === planoId)
            .map((parcela) => ({ ...parcela }));
          return {
            ...plano,
            parcelas_geradas: parcelasGeradas,
            total_bloco: roundCurrency(parcelasGeradas.reduce((acc, item) => acc + toNumber(item.valor || item.valor_original), 0))
          };
        }));
      }

      return {
        ...current,
        parcelas: parcelasNormalizadas
      };
    });
  }

  async function carregarDocumentosContrato(contratoId) {
    if (!contratoId) {
      setDocumentosContrato([]);
      return [];
    }

    const data = await getDocumentosContratoComercial(contratoId);
    const lista = Array.isArray(data) ? data : [];
    setDocumentosContrato(lista);
    return lista;
  }

  async function selecionarContrato(id) {
    try {
      const detalhe = await getContratoComercialById(id);
      setContratoSelecionado(detalhe);
      setDocumentoForm(defaultDocumentoForm());
      await carregarDocumentosContrato(id);
      setShowDistrato(false);
      setShowTroca(false);
      setDistratoForm(defaultDistratoForm());
      setTrocaForm((current) => ({
        ...defaultTrocaForm(),
        novo_valor_total: formatCurrencyInput(detalhe?.valor_total)
      }));
      return detalhe;
    } catch (err) {
      setError(err?.message || 'Erro ao carregar detalhe do contrato');
      return null;
    }
  }

  async function editarContrato(id) {
    const detalhe = await selecionarContrato(id);
    if (!detalhe) return;
    setPaymentPlans([]);
    setForm(pickEditForm(detalhe));
  }

  async function handleSincronizarStatusFinanceiro(id) {
    try {
      setProcessingAction('sync');
      setError('');
      const data = await sincronizarStatusFinanceiroContratoComercial(id);
      setContratoSelecionado(data);
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao sincronizar status financeiro do contrato');
    } finally {
      setProcessingAction('');
    }
  }

  async function handleDistratarContrato() {
    if (!contratoSelecionado?.id) return;
    try {
      setProcessingAction('distrato');
      setError('');
      const data = await distratarContratoComercial(contratoSelecionado.id, distratoForm);
      setContratoSelecionado(data);
      setShowDistrato(false);
      setDistratoForm(defaultDistratoForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao distratar contrato');
    } finally {
      setProcessingAction('');
    }
  }

  async function handleTrocaUnidadeContrato() {
    if (!contratoSelecionado?.id) return;
    try {
      setProcessingAction('troca');
      setError('');
      const data = await trocarUnidadeContratoComercial(contratoSelecionado.id, trocaForm);
      setContratoSelecionado(data);
      setShowTroca(false);
      setTrocaForm({
        ...defaultTrocaForm(),
        novo_valor_total: formatCurrencyInput(data?.valor_total)
      });
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao trocar unidade do contrato');
    } finally {
      setProcessingAction('');
    }
  }

  async function handleGerarDocumentoContrato() {
    if (!contratoSelecionado?.id) return;
    try {
      setProcessingAction('gerar-documento');
      setError('');
      let variaveis;
      if (String(documentoForm.variaveis_json || '').trim()) {
        try {
          variaveis = JSON.parse(documentoForm.variaveis_json);
        } catch {
          setError('Variaveis adicionais precisam estar em JSON valido.');
          return;
        }
      }
      const payload = {
        tipo_documento: documentoForm.tipo_documento,
        modelo_id: documentoForm.modelo_id || undefined,
        variaveis
      };
      await gerarDocumentoContratoComercial(contratoSelecionado.id, payload);
      await carregarDocumentosContrato(contratoSelecionado.id);
    } catch (err) {
      setError(err?.message || 'Erro ao gerar documento do contrato');
    } finally {
      setProcessingAction('');
    }
  }

  async function abrirDocumentoContrato(documentoId, tipo = 'pdf') {
    try {
      setError('');
      const data = await getLinkDocumentoContratoComercial(documentoId, tipo);
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err?.message || 'Erro ao abrir documento');
    }
  }

  async function handleEnviarDocumentoD4Sign(documentoId) {
    try {
      setProcessingAction(`d4sign-${documentoId}`);
      setError('');
      await enviarDocumentoContratoD4Sign(documentoId);
      await carregarDocumentosContrato(contratoSelecionado?.id);
    } catch (err) {
      setError(err?.message || 'Erro ao enviar documento para D4Sign');
    } finally {
      setProcessingAction('');
    }
  }

  function abrirCadastroRapidoPessoa(tipo) {
    setPessoaRapidaForm(defaultPessoaRapidaForm(tipo));
    setPessoaRapidaModal(tipo);
  }

  function atualizarConjugeRapido(campo, valor) {
    setPessoaRapidaForm((current) => ({
      ...current,
      conjuge: {
        ...current.conjuge,
        [campo]: valor
      }
    }));
  }

  async function salvarPessoaRapida() {
    try {
      if (!isValidCpfCnpj(pessoaRapidaForm.cpf_cnpj)) {
        setError('Informe um CPF/CNPJ valido no cadastro rapido.');
        return;
      }

      const tipo = pessoaRapidaModal || pessoaRapidaForm.tipo || 'cliente';
      let conjugeCriado = null;

      if (tipo === 'cliente' && pessoaRapidaForm.possui_conjuge) {
        if (!isValidCpfCnpj(pessoaRapidaForm.conjuge.cpf_cnpj)) {
          setError('Informe um CPF/CNPJ valido para o conjuge.');
          return;
        }
        if (!String(pessoaRapidaForm.conjuge.nome || '').trim()) {
          setError('Informe o nome do conjuge.');
          return;
        }
        if (!String(pessoaRapidaForm.conjuge.telefone || '').trim()) {
          setError('Informe o telefone do conjuge.');
          return;
        }

        conjugeCriado = await criarParceiro(buildPessoaRapidaPayload(pessoaRapidaForm.conjuge, 'cliente'));
      }

      const payload = buildPessoaRapidaPayload(
        pessoaRapidaForm,
        tipo,
        tipo === 'cliente'
          ? {
              conjuge_nome: conjugeCriado?.nome || '',
              conjuge_parceiro_id: conjugeCriado?.id || null,
              regime_bens: pessoaRapidaForm.regime_bens
            }
          : {}
      );
      const pessoa = await criarParceiro(payload);

      if (tipo === 'cliente') {
        setClientes((current) => [...current, ...[pessoa, conjugeCriado].filter(Boolean)].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''))));
        setForm((current) => ({ ...current, parceiro_id: String(pessoa.id) }));
      } else {
        setCorretores((current) => [...current, pessoa].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''))));
        setForm((current) => ({
          ...current,
          corretor_parceiro_id: String(pessoa.id),
          corretor_nome: pessoa.nome || ''
        }));
      }

      setPessoaRapidaModal(null);
      setPessoaRapidaForm(defaultPessoaRapidaForm());
    } catch (err) {
      setError(err?.message || 'Erro ao cadastrar pessoa');
    }
  }

  function validarCriacaoContrato() {
    const camposFaltando = [];

    if (!hasText(form.empreendimento_id)) camposFaltando.push('Empreendimento');
    if (!hasText(form.unidade_comercial_id)) camposFaltando.push('Unidade');
    if (!hasText(form.parceiro_id)) camposFaltando.push('Cliente');
    if (!hasText(form.obra_id) || !empreendimentoSelecionado?.obra_id) camposFaltando.push('Obra vinculada ao empreendimento');
    if (!hasText(form.numero)) camposFaltando.push('Contrato');
    if (!hasText(form.data_contrato)) camposFaltando.push('Data');
    if (!hasText(form.status)) camposFaltando.push('Status');
    if (!hasText(form.categoria_financeira_id)) camposFaltando.push('Categoria financeira');
    if (!hasText(form.indice_reajuste)) camposFaltando.push('Indice reajuste');
    if (!hasText(form.corretor_parceiro_id)) camposFaltando.push('Corretor parceiro');
    if (!hasText(form.corretor_nome)) camposFaltando.push('Corretor no contrato');
    if (!hasText(form.categoria_financeira_comissao_id)) camposFaltando.push('Categoria comissao');
    if (!hasText(form.comissao_percentual) || toNumber(form.comissao_percentual) <= 0) camposFaltando.push('Comissao %');
    if (!hasText(form.valor_total) || roundCurrency(form.valor_total) <= 0) camposFaltando.push('Valor total');
    if (form.possui_vaga_garagem && (!hasText(form.quantidade_vagas_garagem) || Number(form.quantidade_vagas_garagem) <= 0)) camposFaltando.push('Quantidade de vagas');
    if (form.possui_vaga_garagem && form.vagas_garagem_posicao_especifica && !hasText(form.vagas_garagem_posicao)) camposFaltando.push('Posicao das vagas');
    if (!hasText(form.local_assinatura)) camposFaltando.push('Local de assinatura');
    if (!hasText(form.data_assinatura)) camposFaltando.push('Data de assinatura');

    if (!form.parcelas.length) {
      camposFaltando.push('Formas de pagamento');
    } else {
      const parcelaIncompleta = form.parcelas.some((item) =>
        !hasText(item.descricao)
        || !hasText(item.tipo_parcela)
        || !hasText(item.forma_recebimento_prevista)
        || !hasText(item.reajuste_tipo)
        || !hasText(item.data_vencimento)
        || roundCurrency(item.valor || item.valor_original) <= 0
      );
      if (parcelaIncompleta) camposFaltando.push('Dados das parcelas');
    }

    if (camposFaltando.length) {
      return `Para criar o contrato, preencha: ${formatMissingFields(camposFaltando)}. Desconto e observacoes podem ficar em branco.`;
    }

    if (Math.abs(diferencaComposicao) > 0.009) {
      return 'A composicao das formas de pagamento precisa fechar exatamente o valor total do contrato.';
    }

    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.id) {
      const validationMessage = validarCriacaoContrato();
      if (validationMessage) {
        setError(validationMessage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    try {
      setSaving(true);
      setError('');
      if (form.id) {
        await atualizarContratoComercial(form.id, {
          status: form.status,
          categoria_financeira_id: form.categoria_financeira_id ? Number(form.categoria_financeira_id) : undefined,
          corretor_parceiro_id: form.corretor_parceiro_id ? Number(form.corretor_parceiro_id) : null,
          categoria_financeira_comissao_id: form.categoria_financeira_comissao_id ? Number(form.categoria_financeira_comissao_id) : null,
          desconto_concedido: form.desconto_concedido || undefined,
          indice_reajuste: form.indice_reajuste || undefined,
          corretor_nome: form.corretor_nome || undefined,
          comissao_percentual: form.comissao_percentual || undefined,
          possui_vaga_garagem: Boolean(form.possui_vaga_garagem),
          quantidade_vagas_garagem: form.possui_vaga_garagem ? Number(form.quantidade_vagas_garagem || 0) : null,
          vagas_garagem_posicao: form.possui_vaga_garagem && form.vagas_garagem_posicao_especifica ? form.vagas_garagem_posicao || null : null,
          local_assinatura: form.local_assinatura || undefined,
          data_assinatura: form.data_assinatura || undefined,
          observacoes: form.observacoes || undefined
        });
      } else {
        await criarContratoComercial({
          empreendimento_id: Number(form.empreendimento_id),
          unidade_comercial_id: Number(form.unidade_comercial_id),
          parceiro_id: Number(form.parceiro_id),
          corretor_parceiro_id: form.corretor_parceiro_id ? Number(form.corretor_parceiro_id) : null,
          obra_id: Number(form.obra_id),
          categoria_financeira_id: form.categoria_financeira_id ? Number(form.categoria_financeira_id) : undefined,
          categoria_financeira_comissao_id: form.categoria_financeira_comissao_id ? Number(form.categoria_financeira_comissao_id) : null,
          numero: form.numero,
          status: form.status,
          data_contrato: form.data_contrato,
          valor_total: form.valor_total || undefined,
          valor_entrada: valorEntradaComposicao || undefined,
          desconto_concedido: form.desconto_concedido || undefined,
          indice_reajuste: form.indice_reajuste || undefined,
          corretor_nome: form.corretor_nome || undefined,
          comissao_percentual: form.comissao_percentual || undefined,
          possui_vaga_garagem: Boolean(form.possui_vaga_garagem),
          quantidade_vagas_garagem: form.possui_vaga_garagem ? Number(form.quantidade_vagas_garagem || 0) : null,
          vagas_garagem_posicao: form.possui_vaga_garagem && form.vagas_garagem_posicao_especifica ? form.vagas_garagem_posicao || null : null,
          local_assinatura: form.local_assinatura || undefined,
          data_assinatura: form.data_assinatura || form.data_contrato || undefined,
          observacoes: form.observacoes || undefined,
          parcelas: form.parcelas.map((item, index) => ({
            sequencia: item.sequencia || index + 1,
            descricao: item.descricao,
            tipo_parcela: item.tipo_parcela,
            forma_recebimento_prevista: item.forma_recebimento_prevista || undefined,
            reajuste_tipo: item.reajuste_tipo || 'FIXA',
            data_vencimento: item.data_vencimento,
            valor: item.valor || item.valor_original,
            observacoes: item.observacoes || undefined
          }))
        });
      }

      setForm(defaultForm());
      setGenerator(defaultGenerator());
      setPaymentPlans([]);
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar contrato comercial');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page solicitacoes-page"><div className="app-empty-card">Carregando contratos comerciais...</div></div>;
  }

  return (
    <div className="page solicitacoes-page space-y-5 md:space-y-6">
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Contratos de venda</h1>
            <p className="page-subtitle">
              Contratos, agenda financeira e titulos a receber integrados ao modulo financeiro.
            </p>
          </div>
        </div>
      </header>

      {error && <div className="app-alert app-alert--error">{error}</div>}

      <section className="sol-surface-card rounded-2xl p-4 md:p-5 space-y-4">
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">{form.id ? 'Editar resumo do contrato' : 'Novo contrato comercial'}</p>
            <p className="sol-filtros-subtitle">
              {form.id ? 'A edicao inicial ajusta status e dados complementares.' : 'A criacao gera as parcelas e os titulos financeiros.'}
            </p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="sol-filter-field">
              <span className="sol-filter-label">Empreendimento</span>
              <select className="input w-full" value={form.empreendimento_id} onChange={(e) => selecionarEmpreendimentoContrato(e.target.value)} required disabled={Boolean(form.id)}>
                <option value="">Selecione</option>
                {empreendimentos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Unidade</span>
              <select
                className="input w-full"
                value={form.unidade_comercial_id}
                onChange={(e) => {
                  const unidadeId = e.target.value;
                  const unidade = unidades.find((u) => String(u.id) === String(unidadeId));
                  const emp = empreendimentos.find((em) => String(em.id) === String(form.empreendimento_id));
                  const autoNumero = unidade && emp?.codigo
                    ? `${emp.codigo} - ${unidade.codigo}`
                    : (unidade?.codigo ?? '');
                  setForm((c) => ({ ...c, unidade_comercial_id: unidadeId, numero: autoNumero }));
                }}
                required
                disabled={Boolean(form.id)}
              >
                <option value="">Selecione</option>
                {unidadesDoEmpreendimento.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo}
                    {String(item.situacao || '').trim().toUpperCase() === 'VENDIDA' ? ' - vendida' : ''}
                  </option>
                ))}
              </select>
              {!form.id && form.empreendimento_id && unidadesDoEmpreendimento.length === 0 && (
                <span className="mt-1 text-xs text-[var(--c-muted)]">
                  Nenhuma unidade disponivel para contrato neste empreendimento.
                </span>
              )}
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Cliente</span>
              <select className="input w-full" value={form.parceiro_id} onChange={(e) => setForm((c) => ({ ...c, parceiro_id: e.target.value }))} required disabled={Boolean(form.id)}>
                <option value="">Selecione</option>
                {clientes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
              {!form.id && (
                <button type="button" className="btn btn-outline btn-sm mt-2" onClick={() => abrirCadastroRapidoPessoa('cliente')}>
                  Cadastro rapido
                </button>
              )}
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Obra</span>
              <input
                className="input w-full"
                value={
                  obraSelecionada
                    ? (obraSelecionada.codigo ? `${obraSelecionada.codigo} - ${obraSelecionada.nome}` : obraSelecionada.nome)
                    : ''
                }
                placeholder={form.empreendimento_id ? 'Empreendimento sem obra vinculada' : 'Selecione o empreendimento'}
                disabled
                required
              />
              {!form.id && form.empreendimento_id && !empreendimentoSelecionado?.obra_id && (
                <span className="mt-1 text-xs text-amber-600">
                  Vincule uma obra no cadastro do empreendimento antes de criar o contrato.
                </span>
              )}
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="sol-filter-field">
              <span className="sol-filter-label">Contrato</span>
              <input className="input w-full" value={form.numero} onChange={(e) => setForm((c) => ({ ...c, numero: e.target.value }))} required disabled={Boolean(form.id)} />
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Data</span>
              <input className="input w-full" type="date" value={form.data_contrato} onChange={(e) => setForm((c) => ({ ...c, data_contrato: e.target.value }))} required disabled={Boolean(form.id)} />
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Status</span>
              <select className="input w-full" value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}>
                {STATUS_CONTRATO.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Categoria financeira</span>
              <select className="input w-full" value={form.categoria_financeira_id} onChange={(e) => setForm((c) => ({ ...c, categoria_financeira_id: e.target.value }))}>
                <option value="">Nao vincular</option>
                {categoriasCompativeis.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="sol-filter-field"><span className="sol-filter-label">Desconto</span><input className="input w-full" inputMode="decimal" value={form.desconto_concedido} onChange={(e) => setForm((c) => ({ ...c, desconto_concedido: normalizeCurrencyTyping(e.target.value) }))} onBlur={(e) => setForm((c) => ({ ...c, desconto_concedido: formatCurrencyInput(e.target.value) }))} placeholder="R$ 0,00" /></label>
            <label className="sol-filter-field"><span className="sol-filter-label">Indice reajuste</span><input className="input w-full" value={form.indice_reajuste} onChange={(e) => setForm((c) => ({ ...c, indice_reajuste: e.target.value }))} /></label>
            <label className="sol-filter-field"><span className="sol-filter-label">Comissao %</span><input className="input w-full" type="number" step="0.01" value={form.comissao_percentual} onChange={(e) => setForm((c) => ({ ...c, comissao_percentual: e.target.value }))} /></label>
            <label className="sol-filter-field"><span className="sol-filter-label">Valor total</span><input className="input w-full" inputMode="decimal" value={form.valor_total} onChange={(e) => setForm((c) => ({ ...c, valor_total: normalizeCurrencyTyping(e.target.value) }))} onBlur={(e) => setForm((c) => ({ ...c, valor_total: formatCurrencyInput(e.target.value) }))} placeholder="R$ 0,00" /></label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="sol-filter-field">
              <span className="sol-filter-label">Vaga de garagem</span>
              <select
                className="input w-full"
                value={form.possui_vaga_garagem ? 'sim' : 'nao'}
                onChange={(e) => setForm((c) => ({
                  ...c,
                  possui_vaga_garagem: e.target.value === 'sim',
                  quantidade_vagas_garagem: e.target.value === 'sim' ? c.quantidade_vagas_garagem : '',
                  vagas_garagem_posicao_especifica: e.target.value === 'sim' ? c.vagas_garagem_posicao_especifica : false,
                  vagas_garagem_posicao: e.target.value === 'sim' ? c.vagas_garagem_posicao : ''
                }))}
              >
                <option value="nao">Nao possui</option>
                <option value="sim">Possui</option>
              </select>
            </label>
            {form.possui_vaga_garagem && (
              <>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Quantidade de vagas</span>
                  <input className="input w-full" type="number" min="1" value={form.quantidade_vagas_garagem} onChange={(e) => setForm((c) => ({ ...c, quantidade_vagas_garagem: e.target.value }))} />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Posicao especifica</span>
                  <select
                    className="input w-full"
                    value={form.vagas_garagem_posicao_especifica ? 'sim' : 'nao'}
                    onChange={(e) => setForm((c) => ({
                      ...c,
                      vagas_garagem_posicao_especifica: e.target.value === 'sim',
                      vagas_garagem_posicao: e.target.value === 'sim' ? c.vagas_garagem_posicao : ''
                    }))}
                  >
                    <option value="nao">Nao</option>
                    <option value="sim">Sim</option>
                  </select>
                </label>
                {form.vagas_garagem_posicao_especifica && (
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Posicao das vagas</span>
                    <input className="input w-full" value={form.vagas_garagem_posicao} onChange={(e) => setForm((c) => ({ ...c, vagas_garagem_posicao: e.target.value }))} placeholder="Ex.: vagas 12 e 13 / subsolo 1" />
                  </label>
                )}
              </>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="sol-filter-field">
              <span className="sol-filter-label">Corretor parceiro</span>
              <select
                className="input w-full"
                value={form.corretor_parceiro_id}
                onChange={(e) => {
                  const corretorId = e.target.value;
                  const corretor = corretores.find((item) => String(item.id) === String(corretorId));
                  setForm((c) => ({
                    ...c,
                    corretor_parceiro_id: corretorId,
                    corretor_nome: corretor?.nome || ''
                  }));
                }}
              >
                <option value="">Nao vincular</option>
                {corretores.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
              <button type="button" className="btn btn-outline btn-sm mt-2" onClick={() => abrirCadastroRapidoPessoa('corretor')}>
                Cadastro rapido
              </button>
            </label>
            <label className="sol-filter-field"><span className="sol-filter-label">Corretor no contrato</span><input className="input w-full" value={form.corretor_nome} onChange={(e) => setForm((c) => ({ ...c, corretor_nome: e.target.value }))} placeholder="Nome livre, se precisar ajustar" /></label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Categoria comissao</span>
              <select className="input w-full" value={form.categoria_financeira_comissao_id} onChange={(e) => setForm((c) => ({ ...c, categoria_financeira_comissao_id: e.target.value }))}>
                <option value="">Nao vincular</option>
                {categoriasCompativeisPagar.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="sol-filter-field md:col-span-2">
              <span className="sol-filter-label">Local de assinatura</span>
              <input className="input w-full" value={form.local_assinatura} onChange={(e) => setForm((c) => ({ ...c, local_assinatura: e.target.value }))} placeholder="Ex.: Balneario de Iriri, Anchieta-ES" />
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Data de assinatura</span>
              <input className="input w-full" type="date" value={form.data_assinatura} onChange={(e) => setForm((c) => ({ ...c, data_assinatura: e.target.value }))} />
            </label>
          </div>
          <label className="sol-filter-field"><span className="sol-filter-label">Observacoes</span><textarea className="input min-h-[92px] w-full" value={form.observacoes} onChange={(e) => setForm((c) => ({ ...c, observacoes: e.target.value }))} /></label>

          {!form.id && (
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--c-text)]">Composicao das formas de pagamento</p>
                  <p className="text-xs text-[var(--c-muted)]">
                    Adicione blocos de recebimento e acompanhe a diferenca ate fechar o valor total do contrato.
                  </p>
                  <p className="text-xs text-[var(--c-muted)]">
                    Se houver entrada em dinheiro, PIX, bens ou outro formato, registre essa parte como um bloco proprio abaixo.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-[var(--c-text)]">
                    Contrato: <strong className="ml-1">{formatCurrency(valorTotalContrato)}</strong>
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-[var(--c-text)]">
                    Agenda: <strong className="ml-1">{formatCurrency(totalParcelas)}</strong>
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-[var(--c-text)]">
                    Entrada: <strong className="ml-1">{formatCurrency(valorEntradaComposicao)}</strong>
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-3 py-2 ${Math.abs(diferencaComposicao) <= 0.009 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : diferencaComposicao > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                    {Math.abs(diferencaComposicao) <= 0.009
                      ? 'Fechado'
                      : diferencaComposicao > 0
                        ? `Faltam ${formatCurrency(diferencaComposicao)}`
                        : `Excede ${formatCurrency(Math.abs(diferencaComposicao))}`}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Modo</span>
                  <select className="input w-full" value={generator.modo} onChange={(e) => setGenerator((c) => resolveGeneratorByModo(e.target.value, c))}>
                    {MODOS_COMPOSICAO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Descricao do bloco</span>
                  <input className="input w-full" value={generator.titulo_bloco} onChange={(e) => setGenerator((c) => ({ ...c, titulo_bloco: e.target.value }))} placeholder="Ex.: Mensais, reforco anual, bens recebidos" />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Tipo da parcela</span>
                  <select className="input w-full" value={generator.tipo_parcela} onChange={(e) => setGenerator((c) => ({ ...c, tipo_parcela: e.target.value }))} disabled={generator.modo === 'ENTRADA'}>
                    {PARCELA_TIPOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                </label>
                <label className="sol-filter-field md:col-span-2">
                  <span className="sol-filter-label">Forma prevista</span>
                  <select className="input w-full" value={generator.forma_recebimento_prevista} onChange={(e) => setGenerator((c) => ({ ...c, forma_recebimento_prevista: e.target.value, detalhe_forma_recebimento: isFormaComDetalhe(e.target.value) ? c.detalhe_forma_recebimento : '' }))}>
                    <option value="">Nao informar</option>
                    {FORMAS_RECEBIMENTO.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Reajuste</span>
                  <select className="input w-full" value={generator.reajuste_tipo} onChange={(e) => setGenerator((c) => ({ ...c, reajuste_tipo: e.target.value }))}>
                    {PARCELA_REAJUSTE_TIPOS.map((item) => <option key={item.value} value={item.value}>{item.label} ({item.resumo})</option>)}
                  </select>
                </label>
              </div>

              {isFormaComDetalhe(generator.forma_recebimento_prevista) && (
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Detalhe do recebimento</span>
                  <input
                    className="input w-full"
                    value={generator.detalhe_forma_recebimento}
                    onChange={(e) => setGenerator((c) => ({ ...c, detalhe_forma_recebimento: e.target.value }))}
                    placeholder="Ex.: veiculo Corolla 2024, permuta por lote 12, credito de terceiros"
                  />
                </label>
              )}

              {generator.modo === 'ENTRADA' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Valor da entrada</span>
                    <input className="input w-full" inputMode="decimal" value={generator.valor_parcela} onChange={(e) => setGenerator((c) => ({ ...c, valor_parcela: normalizeCurrencyTyping(e.target.value) }))} onBlur={(e) => setGenerator((c) => ({ ...c, valor_parcela: formatCurrencyInput(e.target.value) }))} placeholder="R$ 0,00" />
                  </label>
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Vencimento da entrada</span>
                    <input className="input w-full" type="date" value={generator.primeiro_vencimento} onChange={(e) => setGenerator((c) => ({ ...c, primeiro_vencimento: e.target.value }))} />
                  </label>
                </div>
              ) : generator.modo === 'PERIODICO' ? (
                <div className="grid gap-3 md:grid-cols-4">
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Periodicidade</span>
                  <select className="input w-full" value={generator.periodicidade} onChange={(e) => setGenerator((c) => ({ ...c, periodicidade: e.target.value, quantidade_parcelas: e.target.value === 'AVISTA' ? '1' : c.quantidade_parcelas }))}>
                    {PERIODICIDADES.filter((item) => item.value !== 'PERSONALIZADA').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Qtd. parcelas</span>
                  <input className="input w-full" type="number" min="1" value={generator.periodicidade === 'AVISTA' ? '1' : generator.quantidade_parcelas} onChange={(e) => setGenerator((c) => ({ ...c, quantidade_parcelas: e.target.value }))} disabled={generator.periodicidade === 'AVISTA'} />
                </label>
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Valor parcela</span>
                    <input className="input w-full" inputMode="decimal" value={generator.valor_parcela} onChange={(e) => setGenerator((c) => ({ ...c, valor_parcela: normalizeCurrencyTyping(e.target.value) }))} onBlur={(e) => setGenerator((c) => ({ ...c, valor_parcela: formatCurrencyInput(e.target.value) }))} placeholder="R$ 0,00" />
                  </label>
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Primeiro vencimento</span>
                    <input className="input w-full" type="date" value={generator.primeiro_vencimento} onChange={(e) => setGenerator((c) => ({ ...c, primeiro_vencimento: e.target.value }))} />
                  </label>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--c-text)]">Lancamentos manuais</p>
                      <p className="text-xs text-[var(--c-muted)]">
                        Use para bens, outros recebimentos ou parcelas com datas e valores especificos.
                      </p>
                    </div>
                    <button type="button" className="btn btn-outline" onClick={adicionarParcelaCustomizada}>
                      Adicionar linha
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(generator.parcelas_personalizadas || []).map((item, index) => (
                      <div key={`custom-${index}`} className="grid gap-3 rounded-2xl border border-[var(--c-border)] p-3 md:grid-cols-[minmax(0,1.4fr)_160px_160px_170px_160px_auto]">
                        <label className="sol-filter-field">
                          <span className="sol-filter-label">Descricao</span>
                          <input className="input w-full" value={item.descricao} onChange={(e) => updateParcelaCustomizada(index, 'descricao', e.target.value)} />
                        </label>
                        <label className="sol-filter-field">
                          <span className="sol-filter-label">Tipo</span>
                          <select className="input w-full" value={item.tipo_parcela} onChange={(e) => updateParcelaCustomizada(index, 'tipo_parcela', e.target.value)}>
                            {PARCELA_TIPOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                          </select>
                        </label>
                        <label className="sol-filter-field">
                          <span className="sol-filter-label">Reajuste</span>
                          <select className="input w-full" value={item.reajuste_tipo || 'FIXA'} onChange={(e) => updateParcelaCustomizada(index, 'reajuste_tipo', e.target.value)}>
                            {PARCELA_REAJUSTE_TIPOS.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                          </select>
                        </label>
                        <label className="sol-filter-field">
                          <span className="sol-filter-label">Vencimento</span>
                          <input className="input w-full" type="date" value={item.data_vencimento} onChange={(e) => updateParcelaCustomizada(index, 'data_vencimento', e.target.value)} />
                        </label>
                        <label className="sol-filter-field">
                          <span className="sol-filter-label">Valor</span>
                          <input className="input w-full" inputMode="decimal" value={item.valor} onChange={(e) => updateParcelaCustomizada(index, 'valor', normalizeCurrencyTyping(e.target.value))} onBlur={(e) => updateParcelaCustomizada(index, 'valor', formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
                        </label>
                        <div className="flex items-end">
                          <button type="button" className="btn btn-outline w-full" onClick={() => removerParcelaCustomizada(index)}>
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline" onClick={adicionarFormaPagamento}>
                  Adicionar forma de pagamento
                </button>
                <span className="inline-flex items-center rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)]">
                  Rascunho do bloco: <strong className="ml-1">{formatCurrency(gerarParcelasDoBloco(generator).total || 0)}</strong>
                </span>
              </div>

              {paymentPlans.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-[var(--c-text)]">Formas adicionadas</div>
                  <div className="space-y-3">
                    {paymentPlans.map((plano, index) => (
                      <article key={plano.id} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                Forma {index + 1}
                              </span>
                              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                {getModoComposicaoLabel(plano.modo)}
                              </span>
                              {plano.forma_recebimento_prevista && (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  {plano.forma_recebimento_prevista}
                                </span>
                              )}
                              <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                                {plano.reajuste_tipo === 'REAJUSTAVEL' ? 'Reajustavel (R)' : 'Fixa (F)'}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-[var(--c-text)]">
                              {plano.titulo_bloco || 'Composicao sem descricao'}
                            </div>
                            {plano.detalhe_forma_recebimento && (
                              <div className="text-sm text-[var(--c-muted)]">
                                Detalhe: {plano.detalhe_forma_recebimento}
                              </div>
                            )}
                            <div className="grid gap-2 text-sm text-[var(--c-muted)] md:grid-cols-3">
                              <span>Parcelas geradas: {plano.parcelas_geradas?.length || 0}</span>
                              <span>Tipo base: {plano.tipo_parcela || 'PARCELA'}</span>
                              <span>Total: {formatCurrency(plano.total_bloco)}</span>
                            </div>
                          </div>
                          <button type="button" className="btn btn-outline" onClick={() => removerFormaPagamento(plano.id)}>
                            Remover forma
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {form.parcelas.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-[var(--c-border)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--c-bg)] text-[var(--c-muted)]">
                      <tr>
                        <th className="px-3 py-3 text-left">Descricao</th>
                        <th className="px-3 py-3 text-left">Tipo</th>
                        <th className="px-3 py-3 text-left">Forma</th>
                        <th className="px-3 py-3 text-left">Reajuste</th>
                        <th className="px-3 py-3 text-left">Detalhe</th>
                        <th className="px-3 py-3 text-left">Vencimento</th>
                        <th className="px-3 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.parcelas.map((item, index) => (
                        <tr key={`${item.descricao}-${index}`} className="border-t border-[var(--c-border)]">
                          <td className="px-3 py-3"><input className="input w-full" value={item.descricao} onChange={(e) => updateParcela(index, 'descricao', e.target.value)} /></td>
                          <td className="px-3 py-3">
                            <select className="input w-full" value={item.tipo_parcela} onChange={(e) => updateParcela(index, 'tipo_parcela', e.target.value)}>
                              {PARCELA_TIPOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <select className="input w-full" value={item.forma_recebimento_prevista || ''} onChange={(e) => updateParcela(index, 'forma_recebimento_prevista', e.target.value)}>
                              <option value="">Nao informar</option>
                              {FORMAS_RECEBIMENTO.map((forma) => <option key={forma} value={forma}>{forma}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <select className="input w-full" value={item.reajuste_tipo || 'FIXA'} onChange={(e) => updateParcela(index, 'reajuste_tipo', e.target.value)}>
                              {PARCELA_REAJUSTE_TIPOS.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label} ({tipo.resumo})</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <input className="input w-full" value={item.observacoes || ''} onChange={(e) => updateParcela(index, 'observacoes', e.target.value)} placeholder="Detalhe do bem, permuta ou outro recebimento" />
                          </td>
                          <td className="px-3 py-3"><input className="input w-full" type="date" value={item.data_vencimento} onChange={(e) => updateParcela(index, 'data_vencimento', e.target.value)} /></td>
                          <td className="px-3 py-3"><input className="input w-full text-right" inputMode="decimal" value={item.valor || formatCurrencyInput(item.valor_original)} onChange={(e) => updateParcela(index, 'valor', normalizeCurrencyTyping(e.target.value))} onBlur={(e) => updateParcela(index, 'valor', formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : form.id ? 'Salvar resumo' : 'Criar contrato'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => { setForm(defaultForm()); setGenerator(defaultGenerator()); setPaymentPlans([]); }}>
              Limpar
            </button>
          </div>
        </form>
      </section>

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Carteira comercial</p>
            <p className="sol-filtros-subtitle">Contratos de venda com acesso rapido ao financeiro.</p>
          </div>
          <div className="sol-filtros-meta">
            <span>Total listado {contratosFiltrados.length}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <label className="sol-filter-field">
            <span className="sol-filter-label">Status</span>
            <select className="input w-full" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
              <option value="">Todos</option>
              {STATUS_CONTRATO.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="sol-filter-field">
            <span className="sol-filter-label">Busca</span>
            <input className="input w-full" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Contrato, cliente ou unidade" />
          </label>
        </div>

        <div className="mt-4 space-y-3">
          {contratosFiltrados.length === 0 ? (
            <div className="app-empty-card">Nenhum contrato comercial encontrado.</div>
          ) : (
            contratosFiltrados.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--c-text)]">{item.numero}</h3>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>{item.status}</span>
                      {item.indicadoresFinanceiros?.status_sugerido && item.indicadoresFinanceiros.status_sugerido !== item.status && (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Financeiro sugere {item.indicadoresFinanceiros.status_sugerido}
                        </span>
                      )}
                    </div>
                    <div className="grid gap-2 text-sm text-[var(--c-muted)] md:grid-cols-2">
                      <span>Cliente: {item.cliente?.nome || '-'}</span>
                      <span>Corretor: {item.corretor_nome || '-'}</span>
                      <span>Comissao: {Number(item.comissao_percentual || 0) > 0 ? `${Number(item.comissao_percentual).toLocaleString('pt-BR')}%` : '-'}</span>
                      <span>Empreendimento: {item.empreendimento?.nome || '-'}</span>
                      <span>Unidade: {item.unidadeComercial?.codigo || '-'}</span>
                      <span>Valor total: {formatCurrency(item.valor_total)}</span>
                      <span>Data contrato: {formatDate(item.data_contrato)}</span>
                      <span>Obra: {item.obra?.nome || '-'}</span>
                      <span>Em aberto: {formatCurrency(item.indicadoresFinanceiros?.valor_em_aberto || 0)}</span>
                      <span>Vencido: {formatCurrency(item.indicadoresFinanceiros?.valor_vencido || 0)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-outline" onClick={() => selecionarContrato(item.id)}>
                      Detalhes
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => editarContrato(item.id)}>
                      Editar resumo
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {contratoSelecionado && (
        <section className="sol-surface-card rounded-2xl p-4 md:p-5">
          <div className="sol-filtros-head">
            <div>
              <p className="sol-filtros-title">Detalhe do contrato {contratoSelecionado.numero}</p>
              <p className="sol-filtros-subtitle">Parcelas geradas e acesso aos titulos do financeiro.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Corretor</div>
              <div className="mt-2 text-sm font-semibold text-[var(--c-text)]">{contratoSelecionado.corretor_nome || '-'}</div>
            </div>
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Comissao</div>
              <div className="mt-2 text-sm font-semibold text-[var(--c-text)]">
                {Number(contratoSelecionado.comissao_percentual || 0) > 0
                  ? `${Number(contratoSelecionado.comissao_percentual).toLocaleString('pt-BR')}%`
                  : '-'}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Categoria comissao</div>
              <div className="mt-2 text-sm font-semibold text-[var(--c-text)]">{contratoSelecionado.categoriaFinanceiraComissao?.nome || '-'}</div>
            </div>
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Titulo comissao</div>
              <div className="mt-2">
                {contratoSelecionado.tituloFinanceiroComissao?.id ? (
                  <Link className="btn btn-outline" to={`/financeiro/titulos/${contratoSelecionado.tituloFinanceiroComissao.id}`}>
                    Abrir titulo da comissao
                  </Link>
                ) : (
                  <span className="text-sm text-[var(--c-muted)]">Nao gerado</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Status sugerido</div>
              <div className="mt-2 text-sm font-semibold text-[var(--c-text)]">{contratoSelecionado.indicadoresFinanceiros?.status_sugerido || contratoSelecionado.status}</div>
            </div>
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Valor em aberto</div>
              <div className="mt-2 text-sm font-semibold text-[var(--c-text)]">{formatCurrency(contratoSelecionado.indicadoresFinanceiros?.valor_em_aberto || 0)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Valor vencido</div>
              <div className="mt-2 text-sm font-semibold text-[var(--c-text)]">{formatCurrency(contratoSelecionado.indicadoresFinanceiros?.valor_vencido || 0)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Proximo vencimento</div>
              <div className="mt-2 text-sm font-semibold text-[var(--c-text)]">{formatDate(contratoSelecionado.indicadoresFinanceiros?.proximo_vencimento)}</div>
            </div>
          </div>

          {(contratoSelecionado.data_distrato || contratoSelecionado.motivo_distrato) && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <strong>Distrato registrado.</strong> Data: {formatDate(contratoSelecionado.data_distrato)}. Motivo: {contratoSelecionado.motivo_distrato || '-'}
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Acoes operacionais do contrato</p>
                <p className="text-xs text-[var(--c-muted)]">Controle inadimplencia, distrato guiado e troca de unidade com ajuste financeiro.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline" onClick={() => handleSincronizarStatusFinanceiro(contratoSelecionado.id)} disabled={processingAction === 'sync'}>
                  {processingAction === 'sync' ? 'Sincronizando...' : 'Sincronizar status financeiro'}
                </button>
                {!['DISTRATADO', 'CANCELADO'].includes(String(contratoSelecionado.status || '').toUpperCase()) && (
                  <>
                    <button type="button" className="btn btn-outline" onClick={() => { setShowTroca((value) => !value); setShowDistrato(false); }}>
                      {showTroca ? 'Fechar troca' : 'Trocar unidade'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => { setShowDistrato((value) => !value); setShowTroca(false); }}>
                      {showDistrato ? 'Fechar distrato' : 'Distratar contrato'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {showTroca && (
              <div className="grid gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4 md:grid-cols-4">
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Nova unidade</span>
                  <select className="input w-full" value={trocaForm.unidade_comercial_destino_id} onChange={(e) => setTrocaForm((current) => ({ ...current, unidade_comercial_destino_id: e.target.value }))}>
                    <option value="">Selecione</option>
                    {unidadesElegiveisTroca.map((item) => <option key={item.id} value={item.id}>{item.codigo} - {item.empreendimento?.nome || item.nome || 'Unidade'}</option>)}
                  </select>
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Novo valor total</span>
                  <input className="input w-full" inputMode="decimal" value={trocaForm.novo_valor_total} onChange={(e) => setTrocaForm((current) => ({ ...current, novo_valor_total: normalizeCurrencyTyping(e.target.value) }))} onBlur={(e) => setTrocaForm((current) => ({ ...current, novo_valor_total: formatCurrencyInput(e.target.value) }))} placeholder="R$ 0,00" />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Data efetiva</span>
                  <input className="input w-full" type="date" value={trocaForm.data_efetiva} onChange={(e) => setTrocaForm((current) => ({ ...current, data_efetiva: e.target.value }))} />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Observacoes</span>
                  <input className="input w-full" value={trocaForm.observacoes} onChange={(e) => setTrocaForm((current) => ({ ...current, observacoes: e.target.value }))} />
                </label>
                <div className="md:col-span-4">
                  <button type="button" className="btn btn-primary" onClick={handleTrocaUnidadeContrato} disabled={processingAction === 'troca'}>
                    {processingAction === 'troca' ? 'Aplicando troca...' : 'Confirmar troca de unidade'}
                  </button>
                </div>
              </div>
            )}

            {showDistrato && (
              <div className="grid gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 md:grid-cols-3">
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Data do distrato</span>
                  <input className="input w-full" type="date" value={distratoForm.data_distrato} onChange={(e) => setDistratoForm((current) => ({ ...current, data_distrato: e.target.value }))} />
                </label>
                <label className="sol-filter-field md:col-span-2">
                  <span className="sol-filter-label">Motivo</span>
                  <input className="input w-full" value={distratoForm.motivo_distrato} onChange={(e) => setDistratoForm((current) => ({ ...current, motivo_distrato: e.target.value }))} />
                </label>
                <label className="sol-filter-field md:col-span-3">
                  <span className="sol-filter-label">Observacoes</span>
                  <textarea className="input min-h-[92px] w-full" value={distratoForm.observacoes} onChange={(e) => setDistratoForm((current) => ({ ...current, observacoes: e.target.value }))} />
                </label>
                <div className="md:col-span-3">
                  <button type="button" className="btn btn-primary" onClick={handleDistratarContrato} disabled={processingAction === 'distrato'}>
                    {processingAction === 'distrato' ? 'Distratando...' : 'Confirmar distrato'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Documentos e assinatura digital</p>
                <p className="text-xs text-[var(--c-muted)]">
                  Ao gerar contrato, o PDF sai com Quadro Resumo primeiro e Contrato na sequencia.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="input min-w-[180px]"
                  value={documentoForm.tipo_documento}
                  onChange={(e) => setDocumentoForm((current) => ({ ...current, tipo_documento: e.target.value, modelo_id: '' }))}
                >
                  {TIPOS_DOCUMENTO_MODELO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <select
                  className="input min-w-[220px]"
                  value={documentoForm.modelo_id}
                  onChange={(e) => setDocumentoForm((current) => ({ ...current, modelo_id: e.target.value }))}
                >
                  <option value="">Modelo ativo mais recente</option>
                  {modelosDoContratoSelecionado.map((modelo) => <option key={modelo.id} value={modelo.id}>{modelo.nome}</option>)}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGerarDocumentoContrato}
                  disabled={
                    processingAction === 'gerar-documento'
                    || modelosDoContratoSelecionado.length === 0
                    || (documentoForm.tipo_documento === 'CONTRATO' && !possuiModeloQuadroResumoSelecionado)
                  }
                >
                  {processingAction === 'gerar-documento' ? 'Gerando PDF...' : 'Gerar PDF'}
                </button>
              </div>
            </div>

            {modelosDoContratoSelecionado.length === 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Cadastre um modelo DOCX para este empreendimento e tipo de documento antes de gerar o PDF.
                <Link className="btn btn-outline btn-sm ml-2" to="/comercial/modelos-contrato">
                  Abrir modelos
                </Link>
              </div>
            )}

            {documentoForm.tipo_documento === 'CONTRATO' && !possuiModeloQuadroResumoSelecionado && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Para gerar o contrato completo, cadastre tambem um modelo ativo de Quadro Resumo para este empreendimento.
              </div>
            )}

            <label className="sol-filter-field block">
              <span className="sol-filter-label">Variaveis adicionais opcionais (JSON)</span>
              <textarea
                className="input min-h-[88px] w-full"
                value={documentoForm.variaveis_json}
                onChange={(e) => setDocumentoForm((current) => ({ ...current, variaveis_json: e.target.value }))}
                placeholder='{"cliente":{"nacionalidade":"brasileiro","profissao":"engenheiro"},"conjuge":{"nome":"Maria"}}'
              />
              <span className="mt-1 block text-xs text-[var(--c-muted)]">
                Use para dados juridicos que ainda nao existem no cadastro do cliente; o restante vem automatico do contrato.
              </span>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              {documentosContrato.length === 0 ? (
                <div className="app-empty-card md:col-span-2">Nenhum documento gerado para este contrato.</div>
              ) : (
                documentosContrato.map((documento) => (
                  <article key={documento.id} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">{documentoTipoLabel(documento.tipo_documento)}</div>
                        <div className="mt-2 text-sm font-semibold text-[var(--c-text)]">{documento.nome}</div>
                        <div className="mt-1 text-xs text-[var(--c-muted)]">Status: {documento.status}</div>
                        {documento.erro && <div className="mt-2 text-xs text-rose-600">{documento.erro}</div>}
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(documento.status)}`}>
                        {documento.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className="btn btn-outline" onClick={() => abrirDocumentoContrato(documento.id, 'pdf')}>
                        Abrir PDF
                      </button>
                      <button type="button" className="btn btn-outline" onClick={() => abrirDocumentoContrato(documento.id, 'docx')}>
                        Baixar DOCX
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleEnviarDocumentoD4Sign(documento.id)}
                        disabled={processingAction === `d4sign-${documento.id}` || documento.status === 'ASSINADO'}
                      >
                        {processingAction === `d4sign-${documento.id}` ? 'Enviando...' : 'Enviar D4Sign'}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--c-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--c-bg)] text-[var(--c-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left">Seq.</th>
                  <th className="px-4 py-3 text-left">Descricao</th>
                  <th className="px-4 py-3 text-left">Forma prevista</th>
                  <th className="px-4 py-3 text-left">Reajuste</th>
                  <th className="px-4 py-3 text-left">Detalhe</th>
                  <th className="px-4 py-3 text-left">Vencimento</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-left">Status financeiro</th>
                  <th className="px-4 py-3 text-right">Acao</th>
                </tr>
              </thead>
              <tbody>
                {(contratoSelecionado.parcelas || []).map((parcela) => (
                  <tr key={parcela.id} className="border-t border-[var(--c-border)]">
                    <td className="px-4 py-3 text-[var(--c-text)]">{parcela.sequencia}</td>
                    <td className="px-4 py-3 text-[var(--c-text)]">{parcela.descricao}</td>
                    <td className="px-4 py-3 text-[var(--c-text)]">{parcela.forma_recebimento_prevista || '-'}</td>
                    <td className="px-4 py-3 text-[var(--c-text)]">{String(parcela.reajuste_tipo || 'FIXA') === 'REAJUSTAVEL' ? 'Reajustavel (R)' : 'Fixa (F)'}</td>
                    <td className="px-4 py-3 text-[var(--c-text)]">{parcela.observacoes || '-'}</td>
                    <td className="px-4 py-3 text-[var(--c-text)]">{formatDate(parcela.data_vencimento)}</td>
                    <td className="px-4 py-3 text-right text-[var(--c-text)]">{formatCurrency(parcela.valor_original)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(parcela.tituloFinanceiro?.status || 'ABERTO')}`}>
                        {parcela.tituloFinanceiro?.status || 'ABERTO'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {parcela.tituloFinanceiro?.id ? (
                        <Link className="btn btn-outline" to={`/financeiro/titulos/${parcela.tituloFinanceiro.id}`}>
                          Abrir titulo
                        </Link>
                      ) : (
                        <span className="text-[var(--c-muted)]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <div className="text-sm font-semibold text-[var(--c-text)]">Historico operacional</div>
            <div className="mt-3 space-y-3">
              {(contratoSelecionado.eventos || []).length === 0 ? (
                <div className="text-sm text-[var(--c-muted)]">Nenhum evento comercial registrado para este contrato.</div>
              ) : (
                (contratoSelecionado.eventos || []).map((evento) => (
                  <article key={`${evento.id}-${evento.data_evento}`} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{evento.tipo_evento}</span>
                      <span className="text-[var(--c-muted)]">{formatDate(evento.data_evento)}</span>
                      <span className="text-[var(--c-muted)]">{evento.criadoPor?.nome || '-'}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-[var(--c-text)]">{evento.descricao}</div>
                    {evento.metadata && (
                      <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950/90 p-3 text-xs text-slate-100">{JSON.stringify(evento.metadata, null, 2)}</pre>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {pessoaRapidaModal && (
        <div className="quick-person-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="quick-person-dialog w-full">
            <div className="quick-person-header">
              <div>
                <p className="quick-person-kicker">Contrato comercial</p>
                <h2 className="quick-person-title">
                  Cadastro rapido de {pessoaRapidaModal === 'cliente' ? 'cliente' : 'corretor'}
                </h2>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPessoaRapidaModal(null)}>
                Fechar
              </button>
            </div>

            <div className="quick-person-body">
              <section className="quick-person-section">
                <div className="quick-person-section-head">
                  <h3>Identificacao</h3>
                  <p>Dados minimos para criar a pessoa e vincular ao contrato.</p>
                </div>
                <div className="quick-person-grid quick-person-grid-main">
              <label className="sol-filter-field">
                <span className="sol-filter-label">CPF/CNPJ</span>
                <input
                  className="input w-full"
                  value={pessoaRapidaForm.cpf_cnpj}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, cpf_cnpj: maskCpfCnpj(e.target.value) }))}
                  onBlur={() => {
                    if (pessoaRapidaForm.cpf_cnpj && !isValidCpfCnpj(pessoaRapidaForm.cpf_cnpj)) {
                      setError('Informe um CPF/CNPJ valido no cadastro rapido.');
                    }
                  }}
                  required
                />
              </label>
              <label className="sol-filter-field quick-span-2">
                <span className="sol-filter-label">Nome</span>
                <input
                  className="input w-full"
                  value={pessoaRapidaForm.nome}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, nome: e.target.value }))}
                  required
                />
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Telefone</span>
                <input
                  className="input w-full"
                  value={pessoaRapidaForm.telefone}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, telefone: maskPhone(e.target.value) }))}
                  required
                />
              </label>
              <label className="sol-filter-field quick-span-2">
                <span className="sol-filter-label">E-mail</span>
                <input
                  className="input w-full"
                  value={pessoaRapidaForm.email}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, email: e.target.value }))}
                />
              </label>
              {pessoaRapidaModal === 'corretor' && (
                <label className="sol-filter-field quick-span-2">
                  <span className="sol-filter-label">CRECI</span>
                  <input
                    className="input w-full"
                    value={pessoaRapidaForm.creci}
                    onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, creci: maskCreci(e.target.value) }))}
                  />
                </label>
              )}
                </div>
              </section>

            {pessoaRapidaModal === 'cliente' && (
                <section className="quick-person-section">
                  <div className="quick-person-section-head">
                    <h3>Dados civis</h3>
                    <p>Campos usados pelos modelos de contrato e quadro resumo.</p>
                  </div>
                  <div className="quick-person-grid">
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Nascimento</span>
                  <input
                    className="input w-full"
                    type="date"
                    value={pessoaRapidaForm.data_nascimento}
                    onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, data_nascimento: e.target.value }))}
                  />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Nacionalidade</span>
                  <input
                    className="input w-full"
                    value={pessoaRapidaForm.nacionalidade}
                    onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, nacionalidade: e.target.value }))}
                  />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Profissao</span>
                  <input
                    className="input w-full"
                    value={pessoaRapidaForm.profissao}
                    onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, profissao: e.target.value }))}
                  />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Estado civil</span>
                  <input
                    className="input w-full"
                    value={pessoaRapidaForm.estado_civil}
                    onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, estado_civil: e.target.value }))}
                  />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Regime de bens</span>
                  <input
                    className="input w-full"
                    value={pessoaRapidaForm.regime_bens}
                    onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, regime_bens: e.target.value }))}
                  />
                </label>
                <label className="quick-person-check quick-span-2">
                  <input
                    type="checkbox"
                    checked={pessoaRapidaForm.possui_conjuge}
                    onChange={(e) => setPessoaRapidaForm((current) => ({
                      ...current,
                      possui_conjuge: e.target.checked,
                      conjuge: e.target.checked ? current.conjuge : defaultConjugeRapidoForm()
                    }))}
                  />
                  <span>
                    <strong>Possui conjuge</strong>
                    <small>Cadastra o conjuge como uma segunda pessoa no sistema.</small>
                  </span>
                </label>
                  </div>
                </section>
            )}

              <section className="quick-person-section">
                <div className="quick-person-section-head">
                  <h3>Endereco</h3>
                  <p>Preenche rua, numero, bairro, cidade, UF e CEP nos documentos.</p>
                </div>
                <div className="quick-person-grid">
              <label className="sol-filter-field quick-span-2">
                <span className="sol-filter-label">Endereco</span>
                <input
                  className="input w-full"
                  value={pessoaRapidaForm.endereco}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, endereco: e.target.value }))}
                />
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Numero</span>
                <input
                  className="input w-full"
                  value={pessoaRapidaForm.numero}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, numero: e.target.value }))}
                />
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Complemento</span>
                <input
                  className="input w-full"
                  value={pessoaRapidaForm.complemento}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, complemento: e.target.value }))}
                />
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Bairro</span>
                <input
                  className="input w-full"
                  value={pessoaRapidaForm.bairro}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, bairro: e.target.value }))}
                />
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">CEP</span>
                <input
                  className="input w-full"
                  value={pessoaRapidaForm.cep}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, cep: maskCep(e.target.value) }))}
                />
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Municipio</span>
                <input
                  className="input w-full"
                  value={pessoaRapidaForm.municipio}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, municipio: e.target.value }))}
                />
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">UF</span>
                <input
                  className="input w-full"
                  maxLength={2}
                  value={pessoaRapidaForm.estado}
                  onChange={(e) => setPessoaRapidaForm((current) => ({ ...current, estado: e.target.value.toUpperCase() }))}
                />
              </label>
                </div>
              </section>

              {pessoaRapidaModal === 'cliente' && pessoaRapidaForm.possui_conjuge && (
                <>
                  <section className="quick-person-section">
                    <div className="quick-person-section-head">
                      <h3>Conjuge</h3>
                      <p>Cria uma segunda pessoa ativa e vincula ao cliente principal.</p>
                    </div>
                    <div className="quick-person-grid quick-person-grid-main">
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">CPF/CNPJ</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.cpf_cnpj}
                          onChange={(e) => atualizarConjugeRapido('cpf_cnpj', maskCpfCnpj(e.target.value))}
                          onBlur={() => {
                            if (pessoaRapidaForm.conjuge.cpf_cnpj && !isValidCpfCnpj(pessoaRapidaForm.conjuge.cpf_cnpj)) {
                              setError('Informe um CPF/CNPJ valido para o conjuge.');
                            }
                          }}
                        />
                      </label>
                      <label className="sol-filter-field quick-span-2">
                        <span className="sol-filter-label">Nome</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.nome}
                          onChange={(e) => atualizarConjugeRapido('nome', e.target.value)}
                        />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Telefone</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.telefone}
                          onChange={(e) => atualizarConjugeRapido('telefone', maskPhone(e.target.value))}
                        />
                      </label>
                      <label className="sol-filter-field quick-span-2">
                        <span className="sol-filter-label">E-mail</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.email}
                          onChange={(e) => atualizarConjugeRapido('email', e.target.value)}
                        />
                      </label>
                    </div>
                  </section>

                  <section className="quick-person-section">
                    <div className="quick-person-section-head">
                      <h3>Dados civis do conjuge</h3>
                      <p>Usado nos contratos quando o modelo exigir assinatura do casal.</p>
                    </div>
                    <div className="quick-person-grid">
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Nascimento</span>
                        <input
                          className="input w-full"
                          type="date"
                          value={pessoaRapidaForm.conjuge.data_nascimento}
                          onChange={(e) => atualizarConjugeRapido('data_nascimento', e.target.value)}
                        />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Nacionalidade</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.nacionalidade}
                          onChange={(e) => atualizarConjugeRapido('nacionalidade', e.target.value)}
                        />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Profissao</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.profissao}
                          onChange={(e) => atualizarConjugeRapido('profissao', e.target.value)}
                        />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Estado civil</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.estado_civil}
                          onChange={(e) => atualizarConjugeRapido('estado_civil', e.target.value)}
                        />
                      </label>
                    </div>
                  </section>

                  <section className="quick-person-section">
                    <div className="quick-person-section-head">
                      <h3>Endereco do conjuge</h3>
                      <p>Pode repetir o endereco do cliente ou guardar um endereco proprio.</p>
                    </div>
                    <div className="quick-person-grid">
                      <label className="sol-filter-field quick-span-2">
                        <span className="sol-filter-label">Endereco</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.endereco}
                          onChange={(e) => atualizarConjugeRapido('endereco', e.target.value)}
                        />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Numero</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.numero}
                          onChange={(e) => atualizarConjugeRapido('numero', e.target.value)}
                        />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Complemento</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.complemento}
                          onChange={(e) => atualizarConjugeRapido('complemento', e.target.value)}
                        />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Bairro</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.bairro}
                          onChange={(e) => atualizarConjugeRapido('bairro', e.target.value)}
                        />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">CEP</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.cep}
                          onChange={(e) => atualizarConjugeRapido('cep', maskCep(e.target.value))}
                        />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Municipio</span>
                        <input
                          className="input w-full"
                          value={pessoaRapidaForm.conjuge.municipio}
                          onChange={(e) => atualizarConjugeRapido('municipio', e.target.value)}
                        />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">UF</span>
                        <input
                          className="input w-full"
                          maxLength={2}
                          value={pessoaRapidaForm.conjuge.estado}
                          onChange={(e) => atualizarConjugeRapido('estado', e.target.value.toUpperCase())}
                        />
                      </label>
                    </div>
                  </section>
                </>
              )}
            </div>

            <div className="quick-person-footer">
              <p>
                {pessoaRapidaModal === 'cliente'
                  ? 'Sera salvo como cliente ativo e selecionado neste contrato.'
                  : 'Sera salvo como corretor e credor/fornecedor para comissao financeira.'}
              </p>
              <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={() => setPessoaRapidaModal(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={salvarPessoaRapida}>
                Salvar pessoa
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
