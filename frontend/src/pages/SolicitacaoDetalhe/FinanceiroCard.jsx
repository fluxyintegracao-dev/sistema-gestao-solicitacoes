import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buscarParceiros } from '../../services/parceiros';
import { formatCurrencyInput, normalizeCurrencyTyping } from '../../utils/formatters';
import {
  gerarContaPorSolicitacao,
  getCartoesFinanceiros,
  getCategoriasFinanceiras,
  getFormasPagamentoFinanceiras,
  getTitulosFinanceirosPorSolicitacao
} from '../../services/financeiro';

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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

function isCategoriaCompativel(categoria, tipoTitulo) {
  if (!categoria || categoria.ativo === false) {
    return false;
  }

  const tipoCategoria = String(categoria.tipo || '').trim().toUpperCase();
  const tipo = String(tipoTitulo || '').trim().toUpperCase();

  return !tipoCategoria || tipoCategoria === 'AMBOS' || tipoCategoria === tipo;
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

function today() {
  return new Date().toISOString().slice(0, 10);
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

function buildParcelasDetalhadas(parcelasAtuais = [], quantidade = 1, dataBase = today(), valorTotal = '') {
  const valoresSugeridos = distribuirParcelasFormatadas(valorTotal, quantidade);
  return Array.from({ length: quantidade }, (_, index) => ({
    valor: parcelasAtuais[index]?.valor || valoresSugeridos[index] || '',
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

function createPagamento(solicitacao, valor = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    valor,
    data_vencimento: solicitacao?.data_vencimento || today(),
    forma_pagamento_id: '',
    cartao_id: '',
    quantidade_parcelas: '1',
    data_compra: today(),
    parcelas: []
  };
}

function buildDefaultForm(solicitacao) {
  const valorSolicitacao = solicitacao?.valor ? formatCurrencyInput(solicitacao.valor) : '';
  return {
    tipo: 'PAGAR',
    parceiro_id: solicitacao?.parceiro?.id ? String(solicitacao.parceiro.id) : '',
    categoria_financeira_id: '',
    valor: valorSolicitacao,
    data_vencimento: solicitacao?.data_vencimento || today(),
    forma_pagamento_id: '',
    cartao_id: '',
    quantidade_parcelas: '1',
    data_compra: today(),
    parcelas: [],
    pagamentos: [createPagamento(solicitacao, valorSolicitacao)]
  };
}

function statusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'QUITADO') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'PARCIAL') return 'bg-amber-100 text-amber-700';
  if (normalized === 'CANCELADO' || normalized === 'ESTORNADO') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function FinanceiroCard({ solicitacao, onTituloCriado }) {
  const [titulos, setTitulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(() => buildDefaultForm(solicitacao));
  const [selectedPartner, setSelectedPartner] = useState(solicitacao?.parceiro || null);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerOptions, setPartnerOptions] = useState([]);
  const [searchingPartners, setSearchingPartners] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [categoriaSearch, setCategoriaSearch] = useState('');
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [loadingPagamento, setLoadingPagamento] = useState(false);

  function resetModalState(baseSolicitacao = solicitacao) {
    setForm(buildDefaultForm(baseSolicitacao));
    setSelectedPartner(baseSolicitacao?.parceiro || null);
    setSelectedCategory(null);
    setPartnerSearch('');
    setPartnerOptions([]);
    setCategoriaSearch('');
    setCategoriaModalOpen(false);
  }

  useEffect(() => {
    resetModalState(solicitacao);
  }, [solicitacao]);

  async function carregarTitulos() {
    try {
      setLoading(true);
      setErro('');
      const data = await getTitulosFinanceirosPorSolicitacao(solicitacao.id);
      setTitulos(Array.isArray(data) ? data : []);
    } catch (error) {
      setErro(error?.message || 'Erro ao carregar titulos da solicitacao');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTitulos();
  }, [solicitacao.id]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    if (!partnerSearch || partnerSearch.trim().length < 2) {
      setSearchingPartners(false);
      setPartnerOptions([]);
      return undefined;
    }

    let active = true;
    setSearchingPartners(true);

    const timer = setTimeout(() => {
      buscarParceiros({ q: partnerSearch, limit: 8 })
        .then((data) => {
          if (!active) return;
          setPartnerOptions(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!active) return;
          setPartnerOptions([]);
        })
        .finally(() => {
          if (active) setSearchingPartners(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [modalOpen, partnerSearch]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    let active = true;
    setLoadingCategorias(true);

    getCategoriasFinanceiras()
      .then((data) => {
        if (!active) return;
        setCategorias(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!active) return;
        setCategorias([]);
        setErro(error?.message || 'Erro ao carregar categorias financeiras');
      })
      .finally(() => {
        if (active) setLoadingCategorias(false);
      });

    return () => {
      active = false;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    let active = true;
    setLoadingPagamento(true);

    Promise.all([
      getFormasPagamentoFinanceiras(),
      getCartoesFinanceiros()
    ])
      .then(([formasData, cartoesData]) => {
        if (!active) return;
        setFormasPagamento(Array.isArray(formasData) ? formasData : []);
        setCartoes(Array.isArray(cartoesData) ? cartoesData : []);
      })
      .catch((error) => {
        if (!active) return;
        setFormasPagamento([]);
        setCartoes([]);
        setErro(error?.message || 'Erro ao carregar formas de pagamento');
      })
      .finally(() => {
        if (active) setLoadingPagamento(false);
      });

    return () => {
      active = false;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (selectedCategory && !isCategoriaCompativel(selectedCategory, form.tipo)) {
      setSelectedCategory(null);
      setForm((current) => ({ ...current, categoria_financeira_id: '' }));
      setCategoriaSearch('');
    }
  }, [form.tipo, selectedCategory]);

  const totalTitulos = useMemo(() => {
    return titulos.reduce((acc, item) => acc + Number(item.valor_original || 0), 0);
  }, [titulos]);

  const categoriasFiltradas = useMemo(() => {
    const search = normalizeSearchText(categoriaSearch);

    return categorias.filter((categoria) => {
      if (!isCategoriaCompativel(categoria, form.tipo)) {
        return false;
      }

      if (!search) {
        return true;
      }

      const nome = normalizeSearchText(categoria.nome);
      const descricao = normalizeSearchText(categoria.descricao);
      return nome.includes(search) || descricao.includes(search);
    });
  }, [categoriaSearch, categorias, form.tipo]);

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

  const valorSolicitacao = useMemo(() => roundCurrency(currencyToNumber(form.valor)), [form.valor]);
  const diferencaPagamentos = useMemo(() => roundCurrency(valorSolicitacao - totalPagamentos), [valorSolicitacao, totalPagamentos]);
  const totalBateComSolicitacao = Math.abs(diferencaPagamentos) <= 0.009;

  const pagamentosValidos = useMemo(() => {
    const pagamentos = Array.isArray(form.pagamentos) ? form.pagamentos : [];
    if (pagamentos.length === 0) return false;

    return pagamentos.every((pagamento) => {
      const forma = getFormaPagamento(pagamento.forma_pagamento_id);
      const quantidade = getQuantidadeParcelas(pagamento);
      const usaDetalhe = forma && (isFormaBoleto(forma) || isFormaCheque(forma));

      if (forma?.exige_cartao && !pagamento.cartao_id) return false;
      if (usaDetalhe) {
        const parcelas = Array.isArray(pagamento.parcelas) ? pagamento.parcelas : [];
        if (parcelas.length !== quantidade) return false;
        return parcelas.every((parcela) => {
          if (!parcela?.data_vencimento || currencyToNumber(parcela.valor) <= 0) return false;
          if (!isFormaCheque(forma)) return true;
          return Boolean(String(parcela.cheque_numero || '').trim() && String(parcela.cheque_emitente || '').trim());
        });
      }

      if (!isFormaCartao(forma) && !pagamento.data_vencimento) return false;
      return currencyToNumber(pagamento.valor) > 0;
    });
  }, [form.pagamentos, formasPagamento]);

  const categoriasAutocomplete = useMemo(() => {
    if (!categoriaSearch.trim() || selectedCategory) {
      return [];
    }

    return categoriasFiltradas.slice(0, 5);
  }, [categoriaSearch, categoriasFiltradas, selectedCategory]);

  function selecionarCategoria(categoria) {
    setSelectedCategory(categoria);
    setCategoriaSearch(categoria?.nome || '');
    setForm((current) => ({
      ...current,
      categoria_financeira_id: categoria?.id ? String(categoria.id) : ''
    }));
    setCategoriaModalOpen(false);
  }

  function limparCategoria() {
    setSelectedCategory(null);
    setCategoriaSearch('');
    setForm((current) => ({ ...current, categoria_financeira_id: '' }));
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
      const pagamento = pagamentos[index] || createPagamento(solicitacao);
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
      const pagamento = pagamentos[index] || createPagamento(solicitacao);
      pagamentos[index] = {
        ...pagamento,
        quantidade_parcelas: value,
        parcelas: pagamentoUsaParcelasDetalhadas(pagamento)
          ? buildParcelasDetalhadas(pagamento.parcelas, quantidade, pagamento.data_vencimento || today(), pagamento.valor)
          : pagamento.parcelas
      };
      return { ...current, pagamentos };
    });
  }

  function updateValorPagamento(index, value) {
    setForm((current) => {
      const pagamentos = [...(current.pagamentos || [])];
      const pagamento = pagamentos[index] || createPagamento(solicitacao);
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
      const pagamento = pagamentos[pagamentoIndex] || createPagamento(solicitacao);
      const quantidade = getQuantidadeParcelas(pagamento);
      const parcelas = buildParcelasDetalhadas(pagamento.parcelas, quantidade, pagamento.data_vencimento || today(), pagamento.valor);
      parcelas[parcelaIndex] = {
        ...parcelas[parcelaIndex],
        [field]: value
      };
      pagamentos[pagamentoIndex] = { ...pagamento, parcelas };
      return { ...current, pagamentos };
    });
  }

  function adicionarPagamento() {
    setForm((current) => ({
      ...current,
      pagamentos: [...(current.pagamentos || []), createPagamento(solicitacao)]
    }));
  }

  function removerPagamento(index) {
    setForm((current) => {
      const pagamentos = (current.pagamentos || []).filter((_, itemIndex) => itemIndex !== index);
      return { ...current, pagamentos: pagamentos.length ? pagamentos : [createPagamento(solicitacao, current.valor)] };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setErro('');

      await gerarContaPorSolicitacao(solicitacao.id, {
        tipo: form.tipo,
        parceiro_id: selectedPartner?.id || form.parceiro_id,
        categoria_financeira_id: form.categoria_financeira_id || undefined,
        valor: form.valor,
        pagamentos: (form.pagamentos || []).map((pagamento) => {
          const forma = getFormaPagamento(pagamento.forma_pagamento_id);
          const usaDetalhe = forma && (isFormaBoleto(forma) || isFormaCheque(forma));
          return {
            valor: usaDetalhe ? undefined : pagamento.valor,
            forma_pagamento_id: pagamento.forma_pagamento_id || undefined,
            cartao_id: pagamento.cartao_id || undefined,
            quantidade_parcelas: pagamento.quantidade_parcelas || undefined,
            data_compra: isFormaCartao(forma) ? pagamento.data_compra : undefined,
            data_vencimento: !isFormaCartao(forma) && !usaDetalhe ? pagamento.data_vencimento : undefined,
            parcelas: usaDetalhe ? pagamento.parcelas : undefined
          };
        })
      });

      setModalOpen(false);
      resetModalState(solicitacao);
      await carregarTitulos();
      if (typeof onTituloCriado === 'function') {
        await onTituloCriado();
      }
      alert('Conta gerada com sucesso.');
    } catch (error) {
      setErro(error?.message || 'Erro ao gerar conta');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Financeiro</h2>
            <p className="text-sm text-[var(--c-muted)]">
              Gere contas a pagar ou receber sem sair do fluxo da solicitacao.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/financeiro/titulos" className="btn btn-outline">
              Ver titulos
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setErro('');
                resetModalState(solicitacao);
                setModalOpen(true);
              }}
            >
              Gerar conta
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-[var(--c-bg)] px-3 py-2">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Titulos</div>
            <div className="mt-1 text-lg font-semibold text-[var(--c-text)]">{titulos.length}</div>
          </div>
          <div className="rounded-xl bg-[var(--c-bg)] px-3 py-2">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Total</div>
            <div className="mt-1 text-lg font-semibold text-[var(--c-text)]">{formatCurrency(totalTitulos)}</div>
          </div>
          <div className="rounded-xl bg-[var(--c-bg)] px-3 py-2">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Parceiro</div>
            <div className="mt-1 text-sm font-medium text-[var(--c-text)]">{solicitacao.parceiro?.nome || 'Nao vinculado'}</div>
          </div>
          <div className="rounded-xl bg-[var(--c-bg)] px-3 py-2">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Valor sugerido</div>
            <div className="mt-1 text-sm font-medium text-[var(--c-text)]">
              {solicitacao.valor ? formatCurrency(solicitacao.valor) : 'Nao informado'}
            </div>
          </div>
        </div>

        {erro && !modalOpen && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-[var(--c-bg)] px-3 py-4 text-sm text-[var(--c-muted)]">
            Carregando titulos financeiros...
          </div>
        ) : titulos.length === 0 ? (
          <div className="rounded-xl bg-[var(--c-bg)] px-3 py-4 text-sm text-[var(--c-muted)]">
            Nenhum titulo financeiro foi gerado para esta solicitacao.
          </div>
        ) : (
          <div className="space-y-2">
            {titulos.map((titulo) => (
              <div
                key={titulo.id}
                className="rounded-xl border border-[var(--c-border)] px-3 py-3 text-sm"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link className="font-medium text-blue-600 hover:underline" to={`/financeiro/titulos/${titulo.id}`}>
                      {titulo.descricao || `${titulo.tipo} #${titulo.id}`}
                    </Link>
                    <div className="text-[var(--c-muted)]">
                      {titulo.parceiro?.nome || '-'} - vencimento {formatDate(titulo.data_vencimento)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(titulo.status)}`}>
                      {titulo.status}
                    </span>
                    <span className="text-sm font-semibold text-[var(--c-text)]">
                      {formatCurrency(titulo.valor_saldo)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--c-text)]">Gerar conta</h3>
                <p className="text-sm text-slate-500">
                  O sistema sugere os dados da solicitacao. Voce confirma e cria o titulo.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setErro('');
                  setModalOpen(false);
                  resetModalState(solicitacao);
                }}
              >
                Fechar
              </button>
            </div>

            {erro && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {erro}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Tipo</span>
                  <select
                    className="input w-full"
                    value={form.tipo}
                    onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value }))}
                  >
                    <option value="PAGAR">Pagar</option>
                    <option value="RECEBER">Receber</option>
                  </select>
                </label>

                <div className="space-y-2 text-sm">
                  <span className="block text-slate-500">Credor</span>
                  <input
                    className="input w-full"
                    type="text"
                    placeholder={selectedPartner?.nome || 'Buscar credor por nome ou CPF/CNPJ'}
                    value={partnerSearch}
                    onChange={(event) => setPartnerSearch(event.target.value)}
                  />

                  {searchingPartners && (
                    <div className="text-xs text-slate-500">Buscando parceiros...</div>
                  )}

                  {partnerOptions.length > 0 && (
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-2">
                      {partnerOptions.map((partner) => (
                        <button
                          key={partner.id}
                          type="button"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => {
                            setSelectedPartner(partner);
                            setForm((current) => ({ ...current, parceiro_id: String(partner.id) }));
                            setPartnerSearch('');
                            setPartnerOptions([]);
                          }}
                        >
                          <div className="font-medium text-[var(--c-text)]">{partner.nome}</div>
                          <div className="text-xs text-slate-500">{partner.cpf_cnpj || '-'} {partner.telefone ? `- ${partner.telefone}` : ''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="text-sm">
                  <span className="mb-1 block text-slate-500">Valor</span>
                  <div className="input flex items-center bg-slate-50 text-slate-700">
                    {form.valor || 'R$ 0,00'}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="mb-1 block text-slate-500">Obra</span>
                  <div className="input flex items-center bg-slate-50 text-slate-700">
                    {solicitacao.obra?.nome || '-'}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="mb-1 block text-slate-500">Total das formas</span>
                  <div className={`input flex items-center ${totalBateComSolicitacao ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {formatCurrency(totalPagamentos)}
                    {!totalBateComSolicitacao && ` (${diferencaPagamentos > 0 ? 'faltam' : 'sobram'} ${formatCurrency(Math.abs(diferencaPagamentos))})`}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-sm text-slate-500">Categoria financeira</span>
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      className="input w-full"
                      type="text"
                      placeholder="Digite para buscar a categoria"
                      value={categoriaSearch}
                      onChange={(event) => {
                        setCategoriaSearch(event.target.value);
                        if (selectedCategory) {
                          setSelectedCategory(null);
                          setForm((current) => ({ ...current, categoria_financeira_id: '' }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline shrink-0"
                      title="Pesquisar categorias"
                      aria-label="Pesquisar categorias financeiras"
                      onClick={() => setCategoriaModalOpen(true)}
                    >
                      <SearchIcon />
                    </button>
                    {selectedCategory && (
                      <button
                        type="button"
                        className="btn btn-outline shrink-0"
                        onClick={limparCategoria}
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {categoriasAutocomplete.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                      {categoriasAutocomplete.map((categoria) => (
                        <button
                          key={categoria.id}
                          type="button"
                          className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => selecionarCategoria(categoria)}
                        >
                          <span className="block font-medium text-[var(--c-text)]">{categoria.nome}</span>
                          <span className="block text-xs text-slate-500">
                            {categoria.tipo} - {categoria.descricao || 'Sem descricao complementar'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {categoriaSearch.trim() && !selectedCategory && !loadingCategorias && categoriasAutocomplete.length === 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 shadow-lg">
                      Nenhuma categoria encontrada. Use a lupa para pesquisar com mais detalhes.
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {selectedCategory
                    ? `${selectedCategory.tipo} - ${selectedCategory.descricao || 'Sem descricao complementar'}`
                    : loadingCategorias
                      ? 'Carregando categorias financeiras...'
                      : 'Opcional. A lista considera o tipo da conta selecionado.'}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--c-text)]">Formas de pagamento</div>
                    <div className="text-xs text-slate-500">
                      Combine pix, cartao, boleto ou cheque ate fechar o valor da solicitacao.
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
                    <div key={pagamento.id || pagamentoIndex} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                          <span className="mb-1 block text-slate-500">Forma de pagamento</span>
                          <select
                            className="input w-full"
                            value={pagamento.forma_pagamento_id}
                            onChange={(event) => updateFormaPagamento(pagamentoIndex, event.target.value)}
                            disabled={loadingPagamento}
                          >
                            <option value="">{loadingPagamento ? 'Carregando...' : 'Nao informar'}</option>
                            {formasPagamento.filter((item) => item.ativo !== false).map((item) => (
                              <option key={item.id} value={item.id}>{item.nome}</option>
                            ))}
                          </select>
                        </label>

                        <label className="text-sm">
                          <span className="mb-1 block text-slate-500">Valor desta forma</span>
                          <input
                            className="input w-full"
                            type="text"
                            inputMode="decimal"
                            placeholder="R$ 0,00"
                            value={pagamento.valor}
                            onChange={(event) => updateValorPagamento(pagamentoIndex, normalizeCurrencyTyping(event.target.value))}
                            onBlur={(event) => updateValorPagamento(pagamentoIndex, formatCurrencyInput(event.target.value))}
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {forma?.permite_parcelamento ? (
                          <label className="text-sm">
                            <span className="mb-1 block text-slate-500">Parcelas</span>
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
                            <span className="mb-1 block text-slate-500">Parcelas</span>
                            <div className="input flex items-center bg-slate-50 text-slate-500">1 parcela</div>
                          </div>
                        )}

                        {usaCartao ? (
                          <label className="text-sm">
                            <span className="mb-1 block text-slate-500">Data da compra</span>
                            <input
                              className="input w-full"
                              type="date"
                              value={pagamento.data_compra}
                              onChange={(event) => updatePagamento(pagamentoIndex, { data_compra: event.target.value })}
                            />
                          </label>
                        ) : usaDetalhe ? (
                          <div className="text-sm">
                            <span className="mb-1 block text-slate-500">Vencimento</span>
                            <div className="input flex items-center bg-slate-50 text-slate-500">Definido nas parcelas</div>
                          </div>
                        ) : (
                          <label className="text-sm">
                            <span className="mb-1 block text-slate-500">Vencimento</span>
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
                          <span className="mb-1 block text-slate-500">Cartao</span>
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
                          <div className="text-xs text-slate-500">
                            Informe vencimento e valor de cada {isFormaCheque(forma) ? 'cheque' : 'boleto'}.
                          </div>
                          {(pagamento.parcelas || []).map((parcela, parcelaIndex) => (
                            <div key={parcelaIndex} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Parcela {parcelaIndex + 1}/{quantidade}
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-sm">
                                  <span className="mb-1 block text-slate-500">Valor</span>
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
                                  <span className="mb-1 block text-slate-500">Vencimento</span>
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
                                    <span className="mb-1 block text-slate-500">Documento do boleto</span>
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
                                      <span className="mb-1 block text-slate-500">Numero do cheque</span>
                                      <input
                                        className="input w-full"
                                        value={parcela.cheque_numero || ''}
                                        onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'cheque_numero', event.target.value)}
                                        required
                                      />
                                    </label>
                                    <label className="text-sm">
                                      <span className="mb-1 block text-slate-500">Emitente</span>
                                      <input
                                        className="input w-full"
                                        value={parcela.cheque_emitente || ''}
                                        onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'cheque_emitente', event.target.value)}
                                        required
                                      />
                                    </label>
                                    <label className="text-sm">
                                      <span className="mb-1 block text-slate-500">Banco</span>
                                      <input className="input w-full" value={parcela.cheque_banco || ''} onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'cheque_banco', event.target.value)} />
                                    </label>
                                    <label className="text-sm">
                                      <span className="mb-1 block text-slate-500">Agencia</span>
                                      <input className="input w-full" value={parcela.cheque_agencia || ''} onChange={(event) => updateParcela(pagamentoIndex, parcelaIndex, 'cheque_agencia', event.target.value)} />
                                    </label>
                                    <label className="text-sm">
                                      <span className="mb-1 block text-slate-500">Conta</span>
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

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setErro('');
                    setModalOpen(false);
                    resetModalState(solicitacao);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    saving ||
                    !selectedPartner?.id ||
                    !form.valor ||
                    !pagamentosValidos ||
                    !totalBateComSolicitacao
                  }
                >
                  {saving ? 'Gerando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalOpen && categoriaModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="card w-full max-w-3xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--c-text)]">Selecionar categoria financeira</h3>
                <p className="text-sm text-slate-500">
                  Pesquise pelo nome e escolha uma categoria compativel com o tipo do titulo.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setCategoriaModalOpen(false)}
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="input w-full"
                type="text"
                placeholder="Buscar categoria por nome ou descricao"
                value={categoriaSearch}
                onChange={(event) => setCategoriaSearch(event.target.value)}
              />

              <div className="text-xs text-slate-500">
                {loadingCategorias
                  ? 'Carregando categorias financeiras...'
                  : `${categoriasFiltradas.length} categoria(s) disponivel(is) para ${String(form.tipo || '').toLowerCase()}.`}
              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-2">
                {loadingCategorias ? (
                  <div className="px-3 py-4 text-sm text-slate-500">
                    Buscando categorias...
                  </div>
                ) : categoriasFiltradas.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-slate-500">
                    Nenhuma categoria encontrada para esse filtro.
                  </div>
                ) : categoriasFiltradas.map((categoria) => (
                  <button
                    key={categoria.id}
                    type="button"
                    className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      selectedCategory?.id === categoria.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => selecionarCategoria(categoria)}
                  >
                    <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-medium text-[var(--c-text)]">{categoria.nome}</div>
                        <div className="text-xs text-slate-500">
                          {categoria.tipo} - {categoria.descricao || 'Sem descricao complementar'}
                        </div>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        #{categoria.id}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
