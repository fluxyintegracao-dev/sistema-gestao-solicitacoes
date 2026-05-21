import { useEffect, useMemo, useRef, useState } from 'react';
import {
  atualizarCartaoFinanceiro,
  atualizarCategoriaFinanceira,
  atualizarContaBancaria,
  atualizarFormaPagamentoFinanceira,
  atualizarPaymentAccount,
  atualizarPaymentBeneficiary,
  atualizarTarifasBancariasAtalhos,
  criarCartaoFinanceiro,
  criarCategoriaFinanceira,
  criarContaBancaria,
  criarFormaPagamentoFinanceira,
  getCartoesFinanceiros,
  criarPaymentAccount,
  criarPaymentBeneficiary,
  getCategoriasFinanceiras,
  getContasBancarias,
  getFormasPagamentoFinanceiras,
  getPaymentAccounts,
  getPaymentBeneficiaries,
  getTarifasBancariasAtalhos
} from '../services/financeiro';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import { maskCpfCnpj } from '../utils/formatters';

function defaultContaForm() {
  return {
    id: null,
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: '',
    empresa_id: '',
    tipo_operacional: 'BANCARIA',
    exige_abertura_fechamento: false,
    saldo_inicial: '0',
    ativo: true
  };
}

function defaultCategoriaForm() {
  return {
    id: null,
    nome: '',
    tipo: 'AMBOS',
    descricao: '',
    classificacao_gerencial: 'OPERACIONAL',
    dre_grupo: '',
    dre_subgrupo: '',
    dre_ordem: '',
    considera_dre: true,
    ativo: true
  };
}

function defaultFormaPagamentoForm() {
  return {
    id: null,
    nome: '',
    codigo: '',
    tipo: 'OUTROS',
    permite_parcelamento: false,
    gera_fatura: false,
    gera_boleto: false,
    exige_cartao: false,
    exige_cheque: false,
    ordem: 0,
    ativo: true
  };
}

function defaultCartaoForm() {
  return {
    id: null,
    nome: '',
    titular: '',
    tipo: 'CREDITO',
    bandeira: '',
    ultimos_digitos: '',
    conta_bancaria_id: '',
    dia_fechamento: 25,
    dia_vencimento: 5,
    observacoes: '',
    ativo: true
  };
}

function defaultFavorecidoForm() {
  return {
    id: null,
    parceiro_id: '',
    nome: '',
    cpf_cnpj: '',
    pix_tipo_chave: 'CNPJ',
    pix_chave: '',
    ativo: true
  };
}

function defaultPaymentAccountForm() {
  return {
    id: null,
    conta_bancaria_id: '',
    empresa_id: '',
    cnpj_pagador: '',
    banco_codigo: '001',
    agencia: '',
    agencia_digito: '',
    conta: '',
    conta_digito: '',
    tipo_conta: 'CORRENTE',
    convenio: '',
    client_id_ref: '',
    client_secret_ref: '',
    certificate_ref: '',
    ambiente: 'HOMOLOGACAO',
    ativo: true
  };
}

function pickContaFormData(conta = {}) {
  return {
    id: conta.id || null,
    nome: conta.nome || '',
    banco: conta.banco || '',
    agencia: conta.agencia || '',
    conta: conta.conta || '',
    tipo_conta: conta.tipo_conta || '',
    empresa_id: conta.empresa_id ? String(conta.empresa_id) : '',
    tipo_operacional: conta.tipo_operacional || 'BANCARIA',
    exige_abertura_fechamento: conta.exige_abertura_fechamento === true,
    saldo_inicial: conta.saldo_inicial ?? '0',
    ativo: conta.ativo !== false
  };
}

function pickCategoriaFormData(categoria = {}) {
  return {
    id: categoria.id || null,
    nome: categoria.nome || '',
    tipo: categoria.tipo || 'AMBOS',
    descricao: categoria.descricao || '',
    classificacao_gerencial: categoria.classificacao_gerencial || 'OPERACIONAL',
    dre_grupo: categoria.dre_grupo || '',
    dre_subgrupo: categoria.dre_subgrupo || '',
    dre_ordem: categoria.dre_ordem ?? '',
    considera_dre: categoria.considera_dre !== false,
    ativo: categoria.ativo !== false
  };
}

function pickFormaPagamentoFormData(forma = {}) {
  return {
    id: forma.id || null,
    nome: forma.nome || '',
    codigo: forma.codigo || '',
    tipo: forma.tipo || 'OUTROS',
    permite_parcelamento: forma.permite_parcelamento === true,
    gera_fatura: forma.gera_fatura === true,
    gera_boleto: forma.gera_boleto === true,
    exige_cartao: forma.exige_cartao === true,
    exige_cheque: forma.exige_cheque === true,
    ordem: Number(forma.ordem || 0),
    ativo: forma.ativo !== false
  };
}

function pickCartaoFormData(cartao = {}) {
  return {
    id: cartao.id || null,
    nome: cartao.nome || '',
    titular: cartao.titular || '',
    tipo: normalizarTipoCartao(cartao.tipo),
    bandeira: cartao.bandeira || '',
    ultimos_digitos: cartao.ultimos_digitos || '',
    conta_bancaria_id: cartao.conta_bancaria_id ? String(cartao.conta_bancaria_id) : '',
    dia_fechamento: Number(cartao.dia_fechamento || 25),
    dia_vencimento: Number(cartao.dia_vencimento || 5),
    observacoes: cartao.observacoes || '',
    ativo: cartao.ativo !== false
  };
}

function pickPaymentAccountFormData(account = {}) {
  return {
    id: account.id || null,
    conta_bancaria_id: account.conta_bancaria_id ? String(account.conta_bancaria_id) : '',
    empresa_id: account.empresa_id ? String(account.empresa_id) : '',
    cnpj_pagador: account.cnpj_pagador || '',
    banco_codigo: account.banco_codigo || '001',
    agencia: account.agencia || '',
    agencia_digito: account.agencia_digito || '',
    conta: account.conta || '',
    conta_digito: account.conta_digito || '',
    tipo_conta: account.tipo_conta || 'CORRENTE',
    convenio: account.convenio || '',
    client_id_ref: account.client_id_ref || '',
    client_secret_ref: account.client_secret_ref || '',
    certificate_ref: account.certificate_ref || '',
    ambiente: account.ambiente || 'HOMOLOGACAO',
    ativo: account.ativo !== false
  };
}

function getContaEmpresaId(conta = {}) {
  return conta?.empresa_id ? String(conta.empresa_id) : '';
}

function statusClass(ativo) {
  return ativo ? 'app-status-pill bg-emerald-100 text-emerald-700' : 'app-status-pill bg-slate-100 text-slate-700';
}

function normalizarTipoCartao(value) {
  const normalized = String(value || 'CREDITO').trim().toUpperCase();
  return normalized === 'DEBITO' || normalized === 'CARTAO_DEBITO' ? 'DEBITO' : 'CREDITO';
}

function labelTipoCartao(value) {
  return normalizarTipoCartao(value) === 'DEBITO' ? 'Debito' : 'Credito';
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const CATEGORIA_TIPO_META = {
  TODAS: {
    label: 'Todas',
    titulo: 'Todas as categorias',
    descricao: 'Visao consolidada de contas a pagar, receber e categorias compartilhadas.'
  },
  PAGAR: {
    label: 'Contas a pagar',
    titulo: 'Categorias de contas a pagar',
    descricao: 'Aparecem apenas em titulos do tipo PAGAR.'
  },
  RECEBER: {
    label: 'Contas a receber',
    titulo: 'Categorias de contas a receber',
    descricao: 'Aparecem apenas em titulos do tipo RECEBER.'
  },
  AMBOS: {
    label: 'Compartilhadas',
    titulo: 'Categorias compartilhadas',
    descricao: 'Ficam disponiveis para titulos a pagar e a receber.'
  }
};

const CATEGORIA_CLASSIFICACAO_GERENCIAL = [
  ['OPERACIONAL', 'Operacional'],
  ['ENDIVIDAMENTO', 'Endividamento'],
  ['INVESTIMENTO', 'Investimento'],
  ['PATRIMONIAL', 'Patrimonial'],
  ['INTERCOMPANY', 'Intercompany'],
  ['TRANSFERENCIA_INTERNA', 'Transferencia interna'],
  ['IMPOSTO', 'Imposto'],
  ['FOLHA', 'Folha'],
  ['OUTROS', 'Outros']
];

const CLASSIFICACOES_INCOMPATIVEIS_COM_TARIFA = new Set([
  'ENDIVIDAMENTO',
  'INVESTIMENTO',
  'PATRIMONIAL',
  'INTERCOMPANY',
  'TRANSFERENCIA_INTERNA'
]);

function categoriaTipoLabel(tipo) {
  return CATEGORIA_TIPO_META[tipo]?.label || tipo;
}

function categoriaClassificacaoLabel(value) {
  const normalized = String(value || 'OPERACIONAL').trim().toUpperCase();
  return CATEGORIA_CLASSIFICACAO_GERENCIAL.find(([key]) => key === normalized)?.[1] || normalized;
}

function categoriaTipoBadgeClass(tipo) {
  if (tipo === 'PAGAR') {
    return 'finance-category-type-pill finance-category-type-pill--pagar';
  }
  if (tipo === 'RECEBER') {
    return 'finance-category-type-pill finance-category-type-pill--receber';
  }
  return 'finance-category-type-pill finance-category-type-pill--ambos';
}

function categoriaPossuiGrupoDre(categoria = {}) {
  return categoria.considera_dre !== false && Boolean(String(categoria.dre_grupo || '').trim());
}

function categoriaAptaParaTarifaBancaria(categoria = {}) {
  const tipo = String(categoria.tipo || '').trim().toUpperCase();
  const classificacao = String(categoria.classificacao_gerencial || '').trim().toUpperCase();
  return (
    categoria.ativo !== false &&
    ['PAGAR', 'AMBOS'].includes(tipo) &&
    categoriaPossuiGrupoDre(categoria) &&
    !CLASSIFICACOES_INCOMPATIVEIS_COM_TARIFA.has(classificacao)
  );
}

export default function FinanceiroCadastros() {
  const [contas, setContas] = useState([]);
  const [empresasGrupo, setEmpresasGrupo] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [tarifasBancariasAtalhos, setTarifasBancariasAtalhos] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [contaForm, setContaForm] = useState(defaultContaForm());
  const [paymentAccountForm, setPaymentAccountForm] = useState(defaultPaymentAccountForm());
  const [categoriaForm, setCategoriaForm] = useState(defaultCategoriaForm());
  const [formaPagamentoForm, setFormaPagamentoForm] = useState(defaultFormaPagamentoForm());
  const [cartaoForm, setCartaoForm] = useState(defaultCartaoForm());
  const [loading, setLoading] = useState(true);
  const [savingConta, setSavingConta] = useState(false);
  const [savingPaymentAccount, setSavingPaymentAccount] = useState(false);
  const [savingCategoria, setSavingCategoria] = useState(false);
  const [savingFormaPagamento, setSavingFormaPagamento] = useState(false);
  const [savingTarifasBancarias, setSavingTarifasBancarias] = useState(false);
  const [savingCartao, setSavingCartao] = useState(false);
  const [error, setError] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [categoriaTipoFiltro, setCategoriaTipoFiltro] = useState('TODAS');
  const [favorecidoForm, setFavorecidoForm] = useState(defaultFavorecidoForm());
  const [favorecidos, setFavorecidos] = useState([]);
  const [savingFavorecido, setSavingFavorecido] = useState(false);
  const [loadingFavorecidos, setLoadingFavorecidos] = useState(false);
  const categoriaFormRef = useRef(null);
  const categoriaNomeInputRef = useRef(null);

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const [contasData, categoriasData, paymentAccountsData, formasData, tarifasData, cartoesData, empresasData] = await Promise.all([
        getContasBancarias(),
        getCategoriasFinanceiras(),
        getPaymentAccounts().catch(() => []),
        getFormasPagamentoFinanceiras().catch(() => []),
        getTarifasBancariasAtalhos().catch(() => []),
        getCartoesFinanceiros().catch(() => []),
        getEmpresasGrupo({ ativo: true }).catch(() => [])
      ]);
      setContas(Array.isArray(contasData) ? contasData : []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      setPaymentAccounts(Array.isArray(paymentAccountsData) ? paymentAccountsData : []);
      setFormasPagamento(Array.isArray(formasData) ? formasData : []);
      setTarifasBancariasAtalhos(Array.isArray(tarifasData) ? tarifasData : []);
      setCartoes(Array.isArray(cartoesData) ? cartoesData : []);
      setEmpresasGrupo(Array.isArray(empresasData) ? empresasData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar cadastros financeiros');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const categoriasFiltradas = useMemo(() => {
    const search = normalizeSearchText(categoriaFiltro);
    return [...categorias]
      .filter((categoria) => {
        const tipoCategoria = String(categoria.tipo || 'AMBOS').trim().toUpperCase();
        const atendeTipo = categoriaTipoFiltro === 'TODAS' ? true : tipoCategoria === categoriaTipoFiltro;
        if (!atendeTipo) {
          return false;
        }

        if (!search) {
          return true;
        }

        const nome = normalizeSearchText(categoria.nome);
        const descricao = normalizeSearchText(categoria.descricao);
        const tipo = normalizeSearchText(tipoCategoria);
        const classificacao = normalizeSearchText(categoria.classificacao_gerencial);
        return nome.includes(search) || descricao.includes(search) || tipo.includes(search) || classificacao.includes(search);
      })
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' }));
  }, [categoriaFiltro, categoriaTipoFiltro, categorias]);

  const secoesCategorias = useMemo(() => {
    const grupos = [
      {
        key: 'PAGAR',
        titulo: CATEGORIA_TIPO_META.PAGAR.titulo,
        descricao: CATEGORIA_TIPO_META.PAGAR.descricao,
        itens: categoriasFiltradas.filter((categoria) => String(categoria.tipo || '').trim().toUpperCase() === 'PAGAR')
      },
      {
        key: 'RECEBER',
        titulo: CATEGORIA_TIPO_META.RECEBER.titulo,
        descricao: CATEGORIA_TIPO_META.RECEBER.descricao,
        itens: categoriasFiltradas.filter((categoria) => String(categoria.tipo || '').trim().toUpperCase() === 'RECEBER')
      },
      {
        key: 'AMBOS',
        titulo: CATEGORIA_TIPO_META.AMBOS.titulo,
        descricao: CATEGORIA_TIPO_META.AMBOS.descricao,
        itens: categoriasFiltradas.filter((categoria) => String(categoria.tipo || '').trim().toUpperCase() === 'AMBOS')
      }
    ];

    if (categoriaTipoFiltro === 'TODAS') {
      return grupos.filter((grupo) => grupo.itens.length > 0);
    }

    return grupos.filter((grupo) => grupo.key === categoriaTipoFiltro);
  }, [categoriaTipoFiltro, categoriasFiltradas]);

  const categoriasTarifasBancarias = useMemo(() => (
    [...categorias]
      .filter(categoriaAptaParaTarifaBancaria)
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' }))
  ), [categorias]);

  async function handleSalvarConta(event) {
    event.preventDefault();
    try {
      setSavingConta(true);
      setError('');
      const { id, ...contaPayload } = pickContaFormData(contaForm);
      const cleanPayload = {
        ...contaPayload,
        empresa_id: contaPayload.empresa_id ? Number(contaPayload.empresa_id) : null,
        saldo_inicial: contaPayload.saldo_inicial === '' ? 0 : contaPayload.saldo_inicial
      };
      if (contaForm.id) {
        await atualizarContaBancaria(contaForm.id, cleanPayload);
      } else {
        await criarContaBancaria(cleanPayload);
      }
      setContaForm(defaultContaForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar conta bancaria');
    } finally {
      setSavingConta(false);
    }
  }

  async function handleSalvarPaymentAccount(event) {
    event.preventDefault();
    try {
      setSavingPaymentAccount(true);
      setError('');
      const { id, ...payload } = pickPaymentAccountFormData(paymentAccountForm);
      if (!payload.empresa_id) {
        setError('Informe a empresa pagadora real da conta pagadora.');
        return;
      }
      const contaSelecionada = contas.find((item) => String(item.id) === String(payload.conta_bancaria_id));
      const empresaContaId = getContaEmpresaId(contaSelecionada);
      if (!empresaContaId) {
        setError('A conta bancaria interna precisa estar vinculada a uma empresa do grupo antes de virar conta pagadora.');
        return;
      }
      if (String(payload.empresa_id) !== empresaContaId) {
        setError('A empresa pagadora deve ser a mesma vinculada a conta bancaria interna.');
        return;
      }
      const cleanPayload = {
        ...payload,
        conta_bancaria_id: Number(payload.conta_bancaria_id),
        empresa_id: Number(payload.empresa_id)
      };
      if (paymentAccountForm.id) {
        await atualizarPaymentAccount(paymentAccountForm.id, cleanPayload);
      } else {
        await criarPaymentAccount(cleanPayload);
      }
      setPaymentAccountForm(defaultPaymentAccountForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar conta pagadora');
    } finally {
      setSavingPaymentAccount(false);
    }
  }

  function preencherContaPagadoraPelaContaBancaria(contaBancariaId) {
    const conta = contas.find((item) => String(item.id) === String(contaBancariaId));
    setPaymentAccountForm((current) => ({
      ...current,
      conta_bancaria_id: contaBancariaId,
      empresa_id: getContaEmpresaId(conta) || current.empresa_id,
      banco_codigo: current.banco_codigo || '001',
      agencia: conta?.agencia || current.agencia,
      conta: conta?.conta || current.conta,
      tipo_conta: conta?.tipo_conta || current.tipo_conta
    }));
  }

  async function handleSalvarCategoria(event) {
    event.preventDefault();
    try {
      setSavingCategoria(true);
      setError('');
      const { id, ...categoriaPayload } = pickCategoriaFormData(categoriaForm);
      if (categoriaPayload.considera_dre !== false && !String(categoriaPayload.dre_grupo || '').trim()) {
        setError('Informe o grupo DRE ou desmarque "Considerar na DRE" para salvar a categoria.');
        return;
      }
      if (categoriaForm.id) {
        await atualizarCategoriaFinanceira(categoriaForm.id, categoriaPayload);
      } else {
        await criarCategoriaFinanceira(categoriaPayload);
      }
      setCategoriaForm(defaultCategoriaForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar categoria financeira');
    } finally {
      setSavingCategoria(false);
    }
  }

  function handleEditarCategoria(categoria) {
    setCategoriaForm(pickCategoriaFormData(categoria));
    window.setTimeout(() => {
      categoriaFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      categoriaNomeInputRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  async function handleSalvarFormaPagamento(event) {
    event.preventDefault();
    try {
      setSavingFormaPagamento(true);
      setError('');
      const { id, ...payload } = pickFormaPagamentoFormData(formaPagamentoForm);
      if (formaPagamentoForm.id) {
        await atualizarFormaPagamentoFinanceira(formaPagamentoForm.id, payload);
      } else {
        await criarFormaPagamentoFinanceira(payload);
      }
      setFormaPagamentoForm(defaultFormaPagamentoForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar forma de pagamento');
    } finally {
      setSavingFormaPagamento(false);
    }
  }

  function handleAdicionarTarifaBancaria() {
    setTarifasBancariasAtalhos((current) => ([
      ...current,
      { codigo: '', nome: '', descricao: '', categoria_financeira_id: '', ativo: true }
    ]));
  }

  function handleAlterarTarifaBancaria(index, field, value) {
    setTarifasBancariasAtalhos((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function handleRemoverTarifaBancaria(index) {
    setTarifasBancariasAtalhos((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSalvarTarifasBancarias() {
    try {
      setSavingTarifasBancarias(true);
      setError('');
      const categoriasAptas = new Set(categoriasTarifasBancarias.map((categoria) => String(categoria.id)));
      const tarifaInvalida = tarifasBancariasAtalhos.find((tarifa) => !tarifa.categoria_financeira_id || !categoriasAptas.has(String(tarifa.categoria_financeira_id)));
      if (tarifaInvalida) {
        setError(`O atalho ${tarifaInvalida.nome || tarifaInvalida.codigo || 'de tarifa'} precisa usar uma categoria ativa, de saida e classificada para DRE.`);
        return;
      }
      await atualizarTarifasBancariasAtalhos({ itens: tarifasBancariasAtalhos });
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar atalhos de tarifas bancarias');
    } finally {
      setSavingTarifasBancarias(false);
    }
  }

  async function handleSalvarCartao(event) {
    event.preventDefault();
    try {
      setSavingCartao(true);
      setError('');
      const { id, ...payload } = pickCartaoFormData(cartaoForm);
      const cleanPayload = {
        ...payload,
        conta_bancaria_id: payload.conta_bancaria_id ? Number(payload.conta_bancaria_id) : null,
        dia_fechamento: Number(payload.dia_fechamento || 25),
        dia_vencimento: Number(payload.dia_vencimento || 5)
      };
      if (cartaoForm.id) {
        await atualizarCartaoFinanceiro(cartaoForm.id, cleanPayload);
      } else {
        await criarCartaoFinanceiro(cleanPayload);
      }
      setCartaoForm(defaultCartaoForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar cartao');
    } finally {
      setSavingCartao(false);
    }
  }

  async function carregarFavorecidos(parceiroId = favorecidoForm.parceiro_id) {
    if (!parceiroId) {
      setFavorecidos([]);
      return;
    }

    try {
      setLoadingFavorecidos(true);
      setError('');
      const data = await getPaymentBeneficiaries({ parceiro_id: parceiroId });
      setFavorecidos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar favorecidos bancarios');
    } finally {
      setLoadingFavorecidos(false);
    }
  }

  async function handleSalvarFavorecido(event) {
    event.preventDefault();
    try {
      setSavingFavorecido(true);
      setError('');
      const payload = {
        parceiro_id: Number(favorecidoForm.parceiro_id),
        nome: favorecidoForm.nome,
        cpf_cnpj: favorecidoForm.cpf_cnpj,
        metodo_preferencial: 'PIX_CHAVE',
        pix_tipo_chave: favorecidoForm.pix_tipo_chave,
        pix_chave: favorecidoForm.pix_chave,
        ativo: favorecidoForm.ativo
      };
      if (favorecidoForm.id) {
        await atualizarPaymentBeneficiary(favorecidoForm.id, payload);
      } else {
        await criarPaymentBeneficiary(payload);
      }
      const parceiroId = favorecidoForm.parceiro_id;
      setFavorecidoForm({ ...defaultFavorecidoForm(), parceiro_id: parceiroId });
      await carregarFavorecidos(parceiroId);
    } catch (err) {
      setError(err?.message || 'Erro ao salvar favorecido bancario');
    } finally {
      setSavingFavorecido(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header">
        <h1 className="text-xl font-semibold md:text-2xl">Cadastros Financeiros</h1>
        <p className="page-subtitle">
          Base simples para contas bancarias e categorias usadas nas baixas e nos titulos.
        </p>
      </div>

      {error && (
        <div className="app-alert app-alert--error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="app-empty-card">
          Carregando cadastros financeiros...
        </div>
      ) : (
        <>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="card sol-surface-card">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                {contaForm.id ? 'Editar conta bancaria' : 'Nova conta bancaria'}
              </h2>
              <form className="mt-4 space-y-3" onSubmit={handleSalvarConta}>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Nome</span>
                  <input className="input w-full" placeholder="Ex.: Banco do Brasil CSC ou Caixa Interno Matriz" value={contaForm.nome} onChange={(e) => setContaForm((c) => ({ ...c, nome: e.target.value }))} required />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Empresa do grupo</span>
                    <select className="input w-full" value={contaForm.empresa_id} onChange={(e) => setContaForm((c) => ({ ...c, empresa_id: e.target.value }))}>
                      <option value="">Nao vinculada</option>
                      {empresasGrupo.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Tipo operacional</span>
                    <select
                      className="input w-full"
                      value={contaForm.tipo_operacional}
                      onChange={(e) => {
                        const value = e.target.value;
                        setContaForm((c) => ({
                          ...c,
                          tipo_operacional: value,
                          exige_abertura_fechamento: value === 'CAIXA_INTERNO' ? true : c.exige_abertura_fechamento
                        }));
                      }}
                    >
                      <option value="BANCARIA">Conta bancaria</option>
                      <option value="CAIXA_INTERNO">Caixa interno</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="input w-full" placeholder="Banco" value={contaForm.banco} onChange={(e) => setContaForm((c) => ({ ...c, banco: e.target.value }))} />
                  <input className="input w-full" placeholder="Tipo da conta" value={contaForm.tipo_conta} onChange={(e) => setContaForm((c) => ({ ...c, tipo_conta: e.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="input w-full" placeholder="Agencia" value={contaForm.agencia} onChange={(e) => setContaForm((c) => ({ ...c, agencia: e.target.value }))} />
                  <input className="input w-full" placeholder="Conta" value={contaForm.conta} onChange={(e) => setContaForm((c) => ({ ...c, conta: e.target.value }))} />
                </div>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Saldo inicial</span>
                  <input className="input w-full" inputMode="decimal" placeholder="0,00" value={contaForm.saldo_inicial} onChange={(e) => setContaForm((c) => ({ ...c, saldo_inicial: e.target.value }))} />
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                    <input type="checkbox" checked={contaForm.exige_abertura_fechamento} onChange={(e) => setContaForm((c) => ({ ...c, exige_abertura_fechamento: e.target.checked }))} />
                    Exige abertura e fechamento de caixa
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                    <input type="checkbox" checked={contaForm.ativo} onChange={(e) => setContaForm((c) => ({ ...c, ativo: e.target.checked }))} />
                    Conta ativa
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={savingConta}>
                    {savingConta ? 'Salvando...' : (contaForm.id ? 'Salvar alteracoes' : 'Criar conta')}
                  </button>
                  {contaForm.id && (
                    <button type="button" className="btn btn-outline" onClick={() => setContaForm(defaultContaForm())}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card sol-surface-card space-y-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Contas bancarias</h2>
              {contas.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]">Nenhuma conta bancaria cadastrada.</p>
              ) : (
                <div className="app-list-stack">
                  {contas.map((conta) => (
                    <div key={conta.id} className="app-list-card">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="text-sm">
                          <div className="font-medium text-[var(--c-text)]">{conta.nome}</div>
                          <div className="text-[var(--c-muted)]">
                            {conta.banco || 'Banco nao informado'} - {conta.agencia || '-'} / {conta.conta || '-'}
                          </div>
                          <div className="mt-1 text-[var(--c-muted)]">
                            {conta.empresa?.nome || 'Sem empresa vinculada'} - {conta.tipo_operacional === 'CAIXA_INTERNO' ? 'Caixa interno' : 'Conta bancaria'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={statusClass(conta.ativo)}>
                            {conta.ativo ? 'ATIVA' : 'INATIVA'}
                          </span>
                          <button type="button" className="btn btn-outline" onClick={() => setContaForm(pickContaFormData(conta))}>
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card sol-surface-card">
              <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--c-text)]">
                    {paymentAccountForm.id ? 'Editar conta pagadora' : 'Nova conta pagadora'}
                  </h2>
                  <p className="text-sm text-[var(--c-muted)]">
                    Vincula uma conta bancaria interna ao CNPJ pagador, convenio bancario e empresa do grupo.
                  </p>
                </div>
              </div>

              <form className="mt-4 space-y-3" onSubmit={handleSalvarPaymentAccount}>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Conta bancaria interna</span>
                  <select
                    className="input w-full"
                    value={paymentAccountForm.conta_bancaria_id}
                    onChange={(e) => preencherContaPagadoraPelaContaBancaria(e.target.value)}
                    required
                  >
                    <option value="">Selecione a conta bancaria</option>
                    {contas.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome} - {conta.banco || 'Banco'} {conta.agencia || '-'} / {conta.conta || '-'}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">CNPJ pagador</span>
                    <input
                      className="input w-full"
                      inputMode="numeric"
                      placeholder="00.000.000/0000-00"
                      value={maskCpfCnpj(paymentAccountForm.cnpj_pagador)}
                      onChange={(e) => setPaymentAccountForm((c) => ({ ...c, cnpj_pagador: maskCpfCnpj(e.target.value) }))}
                      required
                    />
                  </label>
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Empresa pagadora</span>
                    <select className="input w-full" value={paymentAccountForm.empresa_id} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, empresa_id: e.target.value }))} required>
                      <option value="">Selecione a empresa pagadora</option>
                      {empresasGrupo.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Codigo banco</span>
                    <input className="input w-full" value={paymentAccountForm.banco_codigo} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, banco_codigo: e.target.value }))} required />
                  </label>
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Agencia</span>
                    <input className="input w-full" value={paymentAccountForm.agencia} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, agencia: e.target.value }))} required />
                  </label>
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Digito agencia</span>
                    <input className="input w-full" value={paymentAccountForm.agencia_digito} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, agencia_digito: e.target.value }))} />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Conta</span>
                    <input className="input w-full" value={paymentAccountForm.conta} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, conta: e.target.value }))} required />
                  </label>
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Digito conta</span>
                    <input className="input w-full" value={paymentAccountForm.conta_digito} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, conta_digito: e.target.value }))} />
                  </label>
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Tipo conta</span>
                    <input className="input w-full" value={paymentAccountForm.tipo_conta} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, tipo_conta: e.target.value }))} required />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Convenio bancario</span>
                    <input className="input w-full" value={paymentAccountForm.convenio} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, convenio: e.target.value }))} required />
                  </label>
                  <label className="sol-filter-field">
                    <span className="sol-filter-label">Ambiente</span>
                    <select className="input w-full" value={paymentAccountForm.ambiente} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, ambiente: e.target.value }))}>
                      <option value="HOMOLOGACAO">HOMOLOGACAO</option>
                      <option value="PRODUCAO">PRODUCAO</option>
                    </select>
                  </label>
                </div>

                <details className="rounded-lg border border-[var(--c-border)] p-3">
                  <summary className="cursor-pointer text-sm font-medium text-[var(--c-text)]">Referencias seguras de credenciais</summary>
                  <div className="mt-3 grid gap-3">
                    <input className="input w-full" placeholder="client_id_ref" value={paymentAccountForm.client_id_ref} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, client_id_ref: e.target.value }))} />
                    <input className="input w-full" placeholder="client_secret_ref" value={paymentAccountForm.client_secret_ref} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, client_secret_ref: e.target.value }))} />
                    <input className="input w-full" placeholder="certificate_ref" value={paymentAccountForm.certificate_ref} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, certificate_ref: e.target.value }))} />
                  </div>
                </details>

                <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                  <input type="checkbox" checked={paymentAccountForm.ativo} onChange={(e) => setPaymentAccountForm((c) => ({ ...c, ativo: e.target.checked }))} />
                  Conta pagadora ativa
                </label>

                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="btn btn-primary" disabled={savingPaymentAccount}>
                    {savingPaymentAccount ? 'Salvando...' : (paymentAccountForm.id ? 'Salvar conta pagadora' : 'Criar conta pagadora')}
                  </button>
                  {paymentAccountForm.id && (
                    <button type="button" className="btn btn-outline" onClick={() => setPaymentAccountForm(defaultPaymentAccountForm())}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card sol-surface-card space-y-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Contas pagadoras</h2>
              {paymentAccounts.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]">Nenhuma conta pagadora cadastrada.</p>
              ) : (
                <div className="app-list-stack">
                  {paymentAccounts.map((account) => (
                    <div key={account.id} className="app-list-card">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="text-sm">
                          <div className="font-medium text-[var(--c-text)]">
                            {account.contaBancaria?.nome || `Conta pagadora ${account.id}`}
                          </div>
                          <div className="text-[var(--c-muted)]">
                            CNPJ {account.cnpj_pagador} - Convenio {account.convenio || '-'}
                          </div>
                          <div className={account.empresa_id || account.empresa?.id ? 'text-[var(--c-muted)]' : 'font-medium text-rose-700'}>
                            {account.empresa?.nome || 'Empresa pagadora nao vinculada'} - {account.provider?.nome || account.provider?.codigo || 'Provider'} {account.ambiente}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={statusClass(account.ativo)}>
                            {account.ativo ? 'ATIVA' : 'INATIVA'}
                          </span>
                          <button type="button" className="btn btn-outline" onClick={() => setPaymentAccountForm(pickPaymentAccountFormData(account))}>
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card sol-surface-card" ref={categoriaFormRef}>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                {categoriaForm.id ? 'Editar categoria financeira' : 'Nova categoria financeira'}
              </h2>
              <form className="mt-4 space-y-3" onSubmit={handleSalvarCategoria}>
                <input ref={categoriaNomeInputRef} className="input w-full" placeholder="Nome" value={categoriaForm.nome} onChange={(e) => setCategoriaForm((c) => ({ ...c, nome: e.target.value }))} required />
                <select className="input w-full" value={categoriaForm.tipo} onChange={(e) => setCategoriaForm((c) => ({ ...c, tipo: e.target.value }))}>
                  <option value="AMBOS">Ambos</option>
                  <option value="PAGAR">Pagar</option>
                  <option value="RECEBER">Receber</option>
                </select>
                <label className="app-filter-field">
                  <span className="app-filter-label">Classificacao gerencial</span>
                  <select
                    className="input w-full"
                    value={categoriaForm.classificacao_gerencial}
                    onChange={(e) => setCategoriaForm((c) => ({ ...c, classificacao_gerencial: e.target.value }))}
                  >
                    {CATEGORIA_CLASSIFICACAO_GERENCIAL.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <textarea className="input min-h-[96px] w-full" placeholder="Descricao" value={categoriaForm.descricao} onChange={(e) => setCategoriaForm((c) => ({ ...c, descricao: e.target.value }))} />
                {categoriaForm.considera_dre && !String(categoriaForm.dre_grupo || '').trim() && (
                  <div className="app-alert border-amber-200 bg-amber-50 text-amber-800">
                    Para entrar na DRE, esta categoria precisa de grupo DRE definido de forma explicita. O sistema nao classifica automaticamente pelo nome.
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    className={`input w-full ${categoriaForm.considera_dre && !String(categoriaForm.dre_grupo || '').trim() ? 'border-amber-300 bg-amber-50' : ''}`}
                    placeholder="Grupo DRE"
                    value={categoriaForm.dre_grupo}
                    onChange={(e) => setCategoriaForm((c) => ({ ...c, dre_grupo: e.target.value }))}
                  />
                  <input
                    className="input w-full"
                    placeholder="Subgrupo DRE"
                    value={categoriaForm.dre_subgrupo}
                    onChange={(e) => setCategoriaForm((c) => ({ ...c, dre_subgrupo: e.target.value }))}
                  />
                  <input
                    className="input w-full"
                    placeholder="Ordem DRE"
                    type="number"
                    value={categoriaForm.dre_ordem}
                    onChange={(e) => setCategoriaForm((c) => ({ ...c, dre_ordem: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                  <input type="checkbox" checked={categoriaForm.considera_dre} onChange={(e) => setCategoriaForm((c) => ({ ...c, considera_dre: e.target.checked }))} />
                  Considerar na DRE
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                  <input type="checkbox" checked={categoriaForm.ativo} onChange={(e) => setCategoriaForm((c) => ({ ...c, ativo: e.target.checked }))} />
                  Categoria ativa
                </label>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={savingCategoria}>
                    {savingCategoria ? 'Salvando...' : (categoriaForm.id ? 'Salvar alteracoes' : 'Criar categoria')}
                  </button>
                  {categoriaForm.id && (
                    <button type="button" className="btn btn-outline" onClick={() => setCategoriaForm(defaultCategoriaForm())}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card sol-surface-card space-y-3">
              <div className="solicitacoes-toolbar rounded-xl p-0">
                <div className="finance-category-filter-row">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--c-text)]">Categorias financeiras</h2>
                    <p className="text-sm text-[var(--c-muted)]">
                      {categoriasFiltradas.length} categoria(s) exibida(s) de {categorias.length}.
                    </p>
                  </div>
                  <div className="finance-category-toolbar-actions">
                    <input
                      className="input w-full md:max-w-sm"
                      placeholder="Buscar categoria por nome, tipo ou descricao"
                      value={categoriaFiltro}
                      onChange={(e) => setCategoriaFiltro(e.target.value)}
                    />
                    <div className="finance-category-toggle-group" role="tablist" aria-label="Filtro de categorias financeiras">
                      {Object.entries(CATEGORIA_TIPO_META).map(([key, meta]) => (
                        <button
                          key={key}
                          type="button"
                          className={`finance-category-toggle ${categoriaTipoFiltro === key ? 'finance-category-toggle--active' : ''}`}
                          onClick={() => setCategoriaTipoFiltro(key)}
                        >
                          {meta.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="app-note">
                Na criacao do titulo, o sistema mostra apenas categorias compatíveis com o tipo escolhido e mantem as compartilhadas disponiveis nos dois fluxos.
              </div>
              {categorias.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]">Nenhuma categoria financeira cadastrada.</p>
              ) : categoriasFiltradas.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]">Nenhuma categoria encontrada para esse filtro.</p>
              ) : (
                <div className="finance-category-sections">
                  {secoesCategorias.map((secao) => (
                    <section key={secao.key} className="finance-category-section">
                      <div className="finance-category-section-head">
                        <div>
                          <h3 className="finance-category-section-title">{secao.titulo}</h3>
                          <p className="finance-category-section-subtitle">{secao.descricao}</p>
                        </div>
                        <span className="app-status-pill bg-slate-100 text-slate-700">
                          {secao.itens.length} item(ns)
                        </span>
                      </div>

                      {secao.itens.length === 0 ? (
                        <div className="app-note">
                          Nenhuma categoria em {categoriaTipoLabel(secao.key).toLowerCase()} para o filtro atual.
                        </div>
                      ) : (
                        <div className="app-list-stack">
                          {secao.itens.map((categoria) => (
                            <div key={categoria.id} className="app-list-card">
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="text-sm">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-medium text-[var(--c-text)]">{categoria.nome}</div>
                                    <span className={categoriaTipoBadgeClass(String(categoria.tipo || 'AMBOS').trim().toUpperCase())}>
                                      {categoriaTipoLabel(String(categoria.tipo || 'AMBOS').trim().toUpperCase())}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[var(--c-muted)]">
                                    {categoria.descricao || 'Sem descricao complementar.'}
                                  </div>
                                  <div className="mt-1 text-xs text-[var(--c-muted)]">
                                    DRE: {categoria.considera_dre === false ? 'Nao considera' : `${categoria.dre_grupo || 'Nao classificada'}${categoria.dre_subgrupo ? ` / ${categoria.dre_subgrupo}` : ''}`}
                                  </div>
                                  <div className="mt-1 text-xs text-[var(--c-muted)]">
                                    Gerencial: {categoriaClassificacaoLabel(categoria.classificacao_gerencial)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={statusClass(categoria.ativo)}>
                                    {categoria.ativo ? 'ATIVA' : 'INATIVA'}
                                  </span>
                                  <button type="button" className="btn btn-outline" onClick={() => handleEditarCategoria(categoria)}>
                                    Editar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="card sol-surface-card">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">
                  {formaPagamentoForm.id ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}
                </h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Define como o titulo sera gerado: boleto, cartao, cheque, pix ou outros fluxos.
                </p>
              </div>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSalvarFormaPagamento}>
              <div className="grid gap-3 md:grid-cols-2">
                <input className="input w-full" placeholder="Nome" value={formaPagamentoForm.nome} onChange={(e) => setFormaPagamentoForm((c) => ({ ...c, nome: e.target.value }))} required />
                <input className="input w-full" placeholder="Codigo" value={formaPagamentoForm.codigo} onChange={(e) => setFormaPagamentoForm((c) => ({ ...c, codigo: e.target.value }))} required />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select className="input w-full" value={formaPagamentoForm.tipo} onChange={(e) => setFormaPagamentoForm((c) => ({ ...c, tipo: e.target.value }))}>
                  <option value="BOLETO">Boleto</option>
                  <option value="PIX">Pix</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="CARTAO_CREDITO">Cartao de credito</option>
                  <option value="CARTAO_DEBITO">Cartao de debito</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="OUTROS">Outros</option>
                </select>
                <input className="input w-full" type="number" min="0" placeholder="Ordem" value={formaPagamentoForm.ordem} onChange={(e) => setFormaPagamentoForm((c) => ({ ...c, ordem: e.target.value }))} />
              </div>
              <div className="grid gap-2 text-sm text-[var(--c-text)] sm:grid-cols-2">
                {[
                  ['permite_parcelamento', 'Permite parcelamento'],
                  ['gera_fatura', 'Gera fatura'],
                  ['gera_boleto', 'Gera boleto'],
                  ['exige_cartao', 'Exige cartao'],
                  ['exige_cheque', 'Exige cheque'],
                  ['ativo', 'Ativa']
                ].map(([field, label]) => (
                  <label key={field} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(formaPagamentoForm[field])}
                      onChange={(e) => setFormaPagamentoForm((c) => ({ ...c, [field]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={savingFormaPagamento}>
                  {savingFormaPagamento ? 'Salvando...' : (formaPagamentoForm.id ? 'Salvar alteracoes' : 'Criar forma')}
                </button>
                {formaPagamentoForm.id && (
                  <button type="button" className="btn btn-outline" onClick={() => setFormaPagamentoForm(defaultFormaPagamentoForm())}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="mt-4 app-list-stack">
              {formasPagamento.length === 0 ? (
                <div className="app-note">Nenhuma forma de pagamento cadastrada.</div>
              ) : formasPagamento.map((forma) => (
                <div key={forma.id} className="app-list-card">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="text-sm">
                      <div className="font-medium text-[var(--c-text)]">{forma.nome}</div>
                      <div className="text-[var(--c-muted)]">
                        {forma.codigo} - {forma.tipo}
                        {forma.permite_parcelamento ? ' - parcelavel' : ''}
                        {forma.gera_fatura ? ' - fatura' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={statusClass(forma.ativo)}>{forma.ativo ? 'ATIVA' : 'INATIVA'}</span>
                      <button type="button" className="btn btn-outline" onClick={() => setFormaPagamentoForm(pickFormaPagamentoFormData(forma))}>
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card sol-surface-card">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Atalhos de tarifas bancarias</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Atalhos da conciliacao bancaria para tarifas como TAR PIX, TAR TED e manutencao de conta. Cada atalho precisa de categoria financeira de saida e classificada para DRE.
                </p>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleAdicionarTarifaBancaria}>
                Adicionar
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {tarifasBancariasAtalhos.length === 0 ? (
                <div className="app-note">Nenhum atalho de tarifa configurado.</div>
              ) : tarifasBancariasAtalhos.map((tarifa, index) => (
                <div key={`${tarifa.codigo || 'nova'}-${index}`} className="rounded-xl border border-[var(--c-border)] p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      className="input w-full"
                      placeholder="Nome exibido"
                      value={tarifa.nome || ''}
                      onChange={(e) => handleAlterarTarifaBancaria(index, 'nome', e.target.value)}
                    />
                    <input
                      className="input w-full"
                      placeholder="Codigo"
                      value={tarifa.codigo || ''}
                      onChange={(e) => handleAlterarTarifaBancaria(index, 'codigo', e.target.value)}
                    />
                  </div>
                  <textarea
                    className="input mt-3 min-h-[64px] w-full"
                    placeholder="Descricao opcional"
                    value={tarifa.descricao || ''}
                    onChange={(e) => handleAlterarTarifaBancaria(index, 'descricao', e.target.value)}
                  />
                  <select
                    className="input mt-3 w-full"
                    value={tarifa.categoria_financeira_id || ''}
                    onChange={(e) => handleAlterarTarifaBancaria(index, 'categoria_financeira_id', e.target.value)}
                    required
                  >
                    <option value="">Categoria financeira da tarifa</option>
                    {categoriasTarifasBancarias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome} ({categoria.dre_grupo}{categoria.dre_subgrupo ? ` / ${categoria.dre_subgrupo}` : ''})
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 text-xs text-[var(--c-muted)]">
                    A lista mostra apenas categorias ativas de pagar/ambos, com grupo DRE e sem classificacao de endividamento, investimento, patrimonial, intercompany ou transferencia interna.
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                      <input
                        type="checkbox"
                        checked={tarifa.ativo !== false}
                        onChange={(e) => handleAlterarTarifaBancaria(index, 'ativo', e.target.checked)}
                      />
                      Ativo
                    </label>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => handleRemoverTarifaBancaria(index)}>
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button type="button" className="btn btn-primary" disabled={savingTarifasBancarias} onClick={handleSalvarTarifasBancarias}>
                {savingTarifasBancarias ? 'Salvando...' : 'Salvar atalhos'}
              </button>
            </div>
          </div>

          <div className="card sol-surface-card">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">
                  {cartaoForm.id ? 'Editar cartao' : 'Novo cartao'}
                </h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Cartoes cadastrados agrupam titulos por fatura conforme fechamento e vencimento.
                </p>
              </div>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSalvarCartao}>
              <div className="grid gap-3 md:grid-cols-2">
                <input className="input w-full" placeholder="Nome do cartao" value={cartaoForm.nome} onChange={(e) => setCartaoForm((c) => ({ ...c, nome: e.target.value }))} required />
                <input className="input w-full" placeholder="Titular" value={cartaoForm.titular} onChange={(e) => setCartaoForm((c) => ({ ...c, titular: e.target.value }))} required />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <select className="input w-full" value={cartaoForm.tipo} onChange={(e) => setCartaoForm((c) => ({ ...c, tipo: e.target.value }))}>
                  <option value="CREDITO">Credito</option>
                  <option value="DEBITO">Debito</option>
                </select>
                <input className="input w-full" placeholder="Bandeira" value={cartaoForm.bandeira} onChange={(e) => setCartaoForm((c) => ({ ...c, bandeira: e.target.value }))} />
                <input className="input w-full" maxLength={4} inputMode="numeric" placeholder="4 ultimos digitos" value={cartaoForm.ultimos_digitos} onChange={(e) => setCartaoForm((c) => ({ ...c, ultimos_digitos: e.target.value.replace(/\D/g, '').slice(0, 4) }))} required />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <select className="input w-full" value={cartaoForm.conta_bancaria_id} onChange={(e) => setCartaoForm((c) => ({ ...c, conta_bancaria_id: e.target.value }))}>
                  <option value="">Conta de pagamento opcional</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>{conta.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Dia de fechamento</span>
                  <input className="input w-full" type="number" min="1" max="31" value={cartaoForm.dia_fechamento} onChange={(e) => setCartaoForm((c) => ({ ...c, dia_fechamento: e.target.value }))} required />
                </label>
                <label className="sol-filter-field">
                  <span className="sol-filter-label">Dia de vencimento</span>
                  <input className="input w-full" type="number" min="1" max="31" value={cartaoForm.dia_vencimento} onChange={(e) => setCartaoForm((c) => ({ ...c, dia_vencimento: e.target.value }))} required />
                </label>
              </div>
              <textarea className="input min-h-[72px] w-full" placeholder="Observacoes" value={cartaoForm.observacoes} onChange={(e) => setCartaoForm((c) => ({ ...c, observacoes: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                <input type="checkbox" checked={cartaoForm.ativo} onChange={(e) => setCartaoForm((c) => ({ ...c, ativo: e.target.checked }))} />
                Cartao ativo
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={savingCartao}>
                  {savingCartao ? 'Salvando...' : (cartaoForm.id ? 'Salvar alteracoes' : 'Criar cartao')}
                </button>
                {cartaoForm.id && (
                  <button type="button" className="btn btn-outline" onClick={() => setCartaoForm(defaultCartaoForm())}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="mt-4 app-list-stack">
              {cartoes.length === 0 ? (
                <div className="app-note">Nenhum cartao cadastrado.</div>
              ) : cartoes.map((cartao) => (
                <div key={cartao.id} className="app-list-card">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="text-sm">
                      <div className="font-medium text-[var(--c-text)]">{cartao.nome}</div>
                      <div className="text-[var(--c-muted)]">
                        {labelTipoCartao(cartao.tipo)} - {cartao.bandeira || 'Bandeira nao informada'} final {cartao.ultimos_digitos} - fecha dia {cartao.dia_fechamento}, vence dia {cartao.dia_vencimento}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={statusClass(cartao.ativo)}>{cartao.ativo ? 'ATIVO' : 'INATIVO'}</span>
                      <button type="button" className="btn btn-outline" onClick={() => setCartaoForm(pickCartaoFormData(cartao))}>
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 card sol-surface-card">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Favorecidos bancarios PIX</h2>
              <p className="text-sm text-[var(--c-muted)]">
                Cadastro rastreado usado pelos lotes de pagamento em massa.
              </p>
            </div>
            <button type="button" className="btn btn-outline" onClick={() => carregarFavorecidos()} disabled={!favorecidoForm.parceiro_id || loadingFavorecidos}>
              {loadingFavorecidos ? 'Carregando...' : 'Buscar favorecidos'}
            </button>
          </div>

          <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-12" onSubmit={handleSalvarFavorecido}>
            <label className="sol-filter-field xl:col-span-2">
              <span className="sol-filter-label">Parceiro ID</span>
              <input className="input w-full" inputMode="numeric" value={favorecidoForm.parceiro_id} onChange={(e) => setFavorecidoForm((c) => ({ ...c, parceiro_id: e.target.value }))} required />
            </label>
            <label className="sol-filter-field xl:col-span-3">
              <span className="sol-filter-label">Nome favorecido</span>
              <input className="input w-full" value={favorecidoForm.nome} onChange={(e) => setFavorecidoForm((c) => ({ ...c, nome: e.target.value }))} required />
            </label>
            <label className="sol-filter-field xl:col-span-2">
              <span className="sol-filter-label">CPF/CNPJ</span>
              <input className="input w-full" value={favorecidoForm.cpf_cnpj} onChange={(e) => setFavorecidoForm((c) => ({ ...c, cpf_cnpj: e.target.value }))} required />
            </label>
            <label className="sol-filter-field xl:col-span-2">
              <span className="sol-filter-label">Tipo chave</span>
              <select className="input w-full" value={favorecidoForm.pix_tipo_chave} onChange={(e) => setFavorecidoForm((c) => ({ ...c, pix_tipo_chave: e.target.value }))}>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">EMAIL</option>
                <option value="TELEFONE">TELEFONE</option>
                <option value="ALEATORIA">ALEATORIA</option>
              </select>
            </label>
            <label className="sol-filter-field xl:col-span-3">
              <span className="sol-filter-label">Chave PIX</span>
              <input className="input w-full" value={favorecidoForm.pix_chave} onChange={(e) => setFavorecidoForm((c) => ({ ...c, pix_chave: e.target.value }))} required />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--c-text)] xl:col-span-2">
              <input type="checkbox" checked={favorecidoForm.ativo} onChange={(e) => setFavorecidoForm((c) => ({ ...c, ativo: e.target.checked }))} />
              Favorecido ativo
            </label>
            <div className="flex flex-wrap gap-2 xl:col-span-10">
              <button type="submit" className="btn btn-primary" disabled={savingFavorecido}>
                {savingFavorecido ? 'Salvando...' : (favorecidoForm.id ? 'Salvar favorecido' : 'Criar favorecido')}
              </button>
              {favorecidoForm.id && (
                <button type="button" className="btn btn-outline" onClick={() => setFavorecidoForm((current) => ({ ...defaultFavorecidoForm(), parceiro_id: current.parceiro_id }))}>
                  Novo
                </button>
              )}
            </div>
          </form>

          <div className="mt-4 app-list-stack">
            {favorecidos.length === 0 ? (
              <div className="app-note">Informe o parceiro ID e busque os favorecidos vinculados.</div>
            ) : favorecidos.map((favorecido) => (
              <div key={favorecido.id} className="app-list-card">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="text-sm">
                    <div className="font-medium text-[var(--c-text)]">{favorecido.nome}</div>
                    <div className="text-[var(--c-muted)]">{favorecido.pix_tipo_chave} - {favorecido.pix_chave}</div>
                    <div className="text-[var(--c-muted)]">CPF/CNPJ: {favorecido.cpf_cnpj}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={statusClass(favorecido.ativo)}>{favorecido.ativo ? 'ATIVO' : 'INATIVO'}</span>
                    <button type="button" className="btn btn-outline" onClick={() => setFavorecidoForm({
                      id: favorecido.id,
                      parceiro_id: String(favorecido.parceiro_id || ''),
                      nome: favorecido.nome || '',
                      cpf_cnpj: favorecido.cpf_cnpj || '',
                      pix_tipo_chave: favorecido.pix_tipo_chave || 'CNPJ',
                      pix_chave: favorecido.pix_chave || '',
                      ativo: favorecido.ativo !== false
                    })}>
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
