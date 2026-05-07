import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros } from '../services/parceiros';
import {
  atualizarPaymentBeneficiary,
  criarPaymentBeneficiary,
  criarTituloFinanceiro,
  getCategoriasFinanceiras,
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function resolveTipo(value) {
  return String(value || '').trim().toUpperCase() === 'RECEBER' ? 'RECEBER' : 'PAGAR';
}

function buildDefaultForm(tipo = 'PAGAR') {
  return {
    tipo: resolveTipo(tipo),
    obra_id: '',
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
    data_vencimento: today(),
    observacoes: '',
    apropriacao_id: ''
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

export default function FinanceiroTituloNovo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const moduloApropriacoesHabilitado = hasEnabledModule(user, 'OBRAS');
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTipo = resolveTipo(searchParams.get('tipo'));
  const [form, setForm] = useState(() => buildDefaultForm(initialTipo));
  const [obras, setObras] = useState([]);
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
        const [obrasData, categoriasData, paymentAccountsData] = await Promise.all([
          getMinhasObras({ modo: 'FINANCEIRO' }),
          getCategoriasFinanceiras(),
          getPaymentAccounts().catch(() => [])
        ]);

        if (!active) return;

        const obrasLista = Array.isArray(obrasData) ? obrasData : [];
        const categoriasLista = Array.isArray(categoriasData) ? categoriasData : [];
        setObras(obrasLista);
        setCategorias(categoriasLista);
        setPaymentAccounts(Array.isArray(paymentAccountsData) ? paymentAccountsData : []);
        setPaymentDraft((current) => ({
          ...current,
          payment_account_id: current.payment_account_id || String(paymentAccountsData?.[0]?.id || '')
        }));
        setForm((current) => ({
          ...current,
          obra_id: current.obra_id || String(obrasLista[0]?.id || '')
        }));
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

  useEffect(() => {
    if (!moduloApropriacoesHabilitado || !form.obra_id) {
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
  }, [form.obra_id, moduloApropriacoesHabilitado]);

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
    setForm((current) => ({ ...current, [field]: value }));
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
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');

      const payload = {
        ...form,
        obra_id: Number(form.obra_id),
        parceiro_id: Number(form.parceiro_id),
        categoria_financeira_id: form.categoria_financeira_id ? Number(form.categoria_financeira_id) : undefined
      };
      delete payload.apropriacao_id;

      if (!form.parceiro_id) {
        throw new Error(`Selecione o ${form.tipo === 'RECEBER' ? 'cliente' : 'credor'} na lista antes de salvar.`);
      }

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
                <span className="sol-filter-label">Obra</span>
                <select
                  className="input w-full"
                  value={form.obra_id}
                  onChange={(event) => updateField('obra_id', event.target.value)}
                  required
                >
                  <option value="">Selecione a obra</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sol-filter-field xl:col-span-3">
                <span className="sol-filter-label">Categoria financeira</span>
                <select
                  className="input w-full"
                  value={form.categoria_financeira_id}
                  onChange={(event) => updateField('categoria_financeira_id', event.target.value)}
                >
                  <option value="">Sem categoria</option>
                  {categoriasFiltradas.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
                <span className="app-note mt-2">
                  {categoriaResumo}
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
                <span className="sol-filter-label">Data de vencimento</span>
                <input
                  type="date"
                  className="input w-full"
                  value={form.data_vencimento}
                  onChange={(event) => updateField('data_vencimento', event.target.value)}
                  required
                />
              </label>

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

              {moduloApropriacoesHabilitado && (
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
