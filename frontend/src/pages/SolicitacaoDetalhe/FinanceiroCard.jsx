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

function buildParcelasDetalhadas(parcelasAtuais = [], quantidade = 1, dataBase = today()) {
  return Array.from({ length: quantidade }, (_, index) => ({
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

function buildDefaultForm(solicitacao) {
  return {
    tipo: 'PAGAR',
    parceiro_id: solicitacao?.parceiro?.id ? String(solicitacao.parceiro.id) : '',
    categoria_financeira_id: '',
    valor: solicitacao?.valor ? formatCurrencyInput(solicitacao.valor) : '',
    data_vencimento: solicitacao?.data_vencimento || today(),
    forma_pagamento_id: '',
    cartao_id: '',
    quantidade_parcelas: '1',
    data_compra: today(),
    parcelas: []
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

  const formaPagamentoSelecionada = useMemo(() => {
    return formasPagamento.find((item) => String(item.id) === String(form.forma_pagamento_id)) || null;
  }, [formasPagamento, form.forma_pagamento_id]);

  const cartoesFiltradosPorForma = useMemo(() => {
    return cartoes.filter((item) => item.ativo !== false && cartaoCompativelComForma(item, formaPagamentoSelecionada));
  }, [cartoes, formaPagamentoSelecionada]);

  const quantidadeParcelas = useMemo(() => {
    return Math.max(Number(form.quantidade_parcelas || 1), 1);
  }, [form.quantidade_parcelas]);

  const usaParcelasDetalhadas = useMemo(() => {
    return Boolean(formaPagamentoSelecionada) && (isFormaBoleto(formaPagamentoSelecionada) || isFormaCheque(formaPagamentoSelecionada));
  }, [formaPagamentoSelecionada]);

  const usaVencimentoGeral = useMemo(() => {
    return !isFormaCartao(formaPagamentoSelecionada) && !usaParcelasDetalhadas;
  }, [formaPagamentoSelecionada, usaParcelasDetalhadas]);

  const parcelasDetalhadasValidas = useMemo(() => {
    if (!usaParcelasDetalhadas) return true;
    const parcelas = Array.isArray(form.parcelas) ? form.parcelas : [];
    if (parcelas.length !== quantidadeParcelas) return false;

    return parcelas.every((parcela) => {
      if (!parcela?.data_vencimento) return false;
      if (!isFormaCheque(formaPagamentoSelecionada)) return true;
      return Boolean(String(parcela.cheque_numero || '').trim() && String(parcela.cheque_emitente || '').trim());
    });
  }, [form.parcelas, formaPagamentoSelecionada, quantidadeParcelas, usaParcelasDetalhadas]);

  useEffect(() => {
    if (!modalOpen) return;

    setForm((current) => {
      if (!usaParcelasDetalhadas) {
        return Array.isArray(current.parcelas) && current.parcelas.length > 0
          ? { ...current, parcelas: [] }
          : current;
      }

      const normalizadas = buildParcelasDetalhadas(current.parcelas, quantidadeParcelas, current.data_vencimento || today());
      if (JSON.stringify(normalizadas) === JSON.stringify(current.parcelas || [])) {
        return current;
      }
      return { ...current, parcelas: normalizadas };
    });
  }, [modalOpen, quantidadeParcelas, usaParcelasDetalhadas]);

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

  function updateFormaPagamento(formaPagamentoId) {
    const forma = formasPagamento.find((item) => String(item.id) === String(formaPagamentoId));
    const cartaoAtual = cartoes.find((item) => String(item.id) === String(form.cartao_id));
    const manterCartao = forma?.exige_cartao && cartaoAtual && cartaoCompativelComForma(cartaoAtual, forma);
    const usaParcelas = forma && (isFormaBoleto(forma) || isFormaCheque(forma));
    setForm((current) => ({
      ...current,
      forma_pagamento_id: formaPagamentoId,
      cartao_id: manterCartao ? current.cartao_id : '',
      quantidade_parcelas: forma?.permite_parcelamento ? (current.quantidade_parcelas || '1') : '1',
      data_compra: forma?.exige_cartao ? (current.data_compra || today()) : current.data_compra,
      parcelas: usaParcelas
        ? buildParcelasDetalhadas(current.parcelas, Math.max(Number(current.quantidade_parcelas || 1), 1), current.data_vencimento || today())
        : []
    }));
  }

  function updateQuantidadeParcelas(value) {
    const quantidade = Math.max(Number(value || 1), 1);
    setForm((current) => ({
      ...current,
      quantidade_parcelas: value,
      parcelas: usaParcelasDetalhadas
        ? buildParcelasDetalhadas(current.parcelas, quantidade, current.data_vencimento || today())
        : current.parcelas
    }));
  }

  function updateParcela(index, field, value) {
    setForm((current) => {
      const parcelas = buildParcelasDetalhadas(current.parcelas, quantidadeParcelas, current.data_vencimento || today());
      parcelas[index] = {
        ...parcelas[index],
        [field]: value
      };
      return { ...current, parcelas };
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
        forma_pagamento_id: form.forma_pagamento_id || undefined,
        cartao_id: form.cartao_id || undefined,
        quantidade_parcelas: form.quantidade_parcelas || undefined,
        data_compra: form.data_compra || undefined,
        parcelas: usaParcelasDetalhadas ? form.parcelas : undefined,
        valor: form.valor,
        data_vencimento: usaVencimentoGeral ? form.data_vencimento : undefined
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
          <div className="card max-h-[92vh] w-full max-w-4xl space-y-4 overflow-y-auto">
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

                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Valor</span>
                  <input
                    className="input w-full"
                    type="text"
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    value={form.valor}
                    onChange={(event) => setForm((current) => ({ ...current, valor: normalizeCurrencyTyping(event.target.value) }))}
                    onBlur={(event) => setForm((current) => ({ ...current, valor: formatCurrencyInput(event.target.value) }))}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {usaVencimentoGeral ? (
                  <label className="text-sm">
                    <span className="mb-1 block text-slate-500">Vencimento</span>
                    <input
                      className="input w-full"
                      type="date"
                      value={form.data_vencimento}
                      onChange={(event) => setForm((current) => ({ ...current, data_vencimento: event.target.value }))}
                      required
                    />
                  </label>
                ) : (
                  <div className="text-sm">
                    <span className="mb-1 block text-slate-500">Vencimento</span>
                    <div className="input flex items-center bg-slate-50 text-slate-500">
                      {isFormaCartao(formaPagamentoSelecionada)
                        ? 'Definido pela data da compra/fatura'
                        : 'Definido nas parcelas abaixo'}
                    </div>
                  </div>
                )}
                <div className="text-sm">
                  <span className="mb-1 block text-slate-500">Obra</span>
                  <div className="input flex items-center bg-slate-50 text-slate-700">
                    {solicitacao.obra?.nome || '-'}
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

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Forma de pagamento</span>
                  <select
                    className="input w-full"
                    value={form.forma_pagamento_id}
                    onChange={(event) => updateFormaPagamento(event.target.value)}
                    disabled={loadingPagamento}
                  >
                    <option value="">{loadingPagamento ? 'Carregando...' : 'Nao informar'}</option>
                    {formasPagamento.filter((item) => item.ativo !== false).map((forma) => (
                      <option key={forma.id} value={forma.id}>
                        {forma.nome}
                      </option>
                    ))}
                  </select>
                </label>

                {formaPagamentoSelecionada?.permite_parcelamento ? (
                  <label className="text-sm">
                    <span className="mb-1 block text-slate-500">Parcelas</span>
                    <input
                      className="input w-full"
                      type="number"
                      min="1"
                      max="120"
                      value={form.quantidade_parcelas}
                      onChange={(event) => updateQuantidadeParcelas(event.target.value)}
                    />
                  </label>
                ) : (
                  <div className="text-sm">
                    <span className="mb-1 block text-slate-500">Parcelas</span>
                    <div className="input flex items-center bg-slate-50 text-slate-500">
                      1 parcela
                    </div>
                  </div>
                )}
              </div>

              {formaPagamentoSelecionada?.exige_cartao && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block text-slate-500">Cartao</span>
                    <select
                      className="input w-full"
                      value={form.cartao_id}
                      onChange={(event) => setForm((current) => ({ ...current, cartao_id: event.target.value }))}
                      required
                    >
                      <option value="">Selecione o cartao</option>
                      {cartoesFiltradosPorForma.map((cartao) => (
                        <option key={cartao.id} value={cartao.id}>
                          {cartao.nome} final {cartao.ultimos_digitos} ({labelTipoCartao(cartao.tipo)})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block text-slate-500">Data da compra</span>
                    <input
                      className="input w-full"
                      type="date"
                      value={form.data_compra}
                      onChange={(event) => setForm((current) => ({ ...current, data_compra: event.target.value }))}
                    />
                  </label>
                </div>
              )}

              {usaParcelasDetalhadas && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-[var(--c-text)]">
                      {isFormaCheque(formaPagamentoSelecionada) ? 'Cheques' : 'Boletos'} das parcelas
                    </div>
                    <div className="text-xs text-slate-500">
                      Informe o vencimento de cada {isFormaCheque(formaPagamentoSelecionada) ? 'cheque' : 'boleto'} antes de confirmar.
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(form.parcelas || []).map((parcela, index) => (
                      <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Parcela {index + 1}/{quantidadeParcelas}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="text-sm">
                            <span className="mb-1 block text-slate-500">Vencimento</span>
                            <input
                              className="input w-full"
                              type="date"
                              value={parcela.data_vencimento || ''}
                              onChange={(event) => updateParcela(index, 'data_vencimento', event.target.value)}
                              required
                            />
                          </label>

                          {!isFormaCheque(formaPagamentoSelecionada) && (
                            <label className="text-sm">
                              <span className="mb-1 block text-slate-500">Documento do boleto</span>
                              <input
                                className="input w-full"
                                value={parcela.numero_documento || ''}
                                onChange={(event) => updateParcela(index, 'numero_documento', event.target.value)}
                                placeholder="Nosso numero, linha ou referencia"
                              />
                            </label>
                          )}

                          {isFormaCheque(formaPagamentoSelecionada) && (
                            <>
                              <label className="text-sm">
                                <span className="mb-1 block text-slate-500">Numero do cheque</span>
                                <input
                                  className="input w-full"
                                  value={parcela.cheque_numero || ''}
                                  onChange={(event) => updateParcela(index, 'cheque_numero', event.target.value)}
                                  required
                                />
                              </label>
                              <label className="text-sm">
                                <span className="mb-1 block text-slate-500">Emitente</span>
                                <input
                                  className="input w-full"
                                  value={parcela.cheque_emitente || ''}
                                  onChange={(event) => updateParcela(index, 'cheque_emitente', event.target.value)}
                                  required
                                />
                              </label>
                              <label className="text-sm">
                                <span className="mb-1 block text-slate-500">Banco</span>
                                <input
                                  className="input w-full"
                                  value={parcela.cheque_banco || ''}
                                  onChange={(event) => updateParcela(index, 'cheque_banco', event.target.value)}
                                />
                              </label>
                              <label className="text-sm">
                                <span className="mb-1 block text-slate-500">Agencia</span>
                                <input
                                  className="input w-full"
                                  value={parcela.cheque_agencia || ''}
                                  onChange={(event) => updateParcela(index, 'cheque_agencia', event.target.value)}
                                />
                              </label>
                              <label className="text-sm">
                                <span className="mb-1 block text-slate-500">Conta</span>
                                <input
                                  className="input w-full"
                                  value={parcela.cheque_conta || ''}
                                  onChange={(event) => updateParcela(index, 'cheque_conta', event.target.value)}
                                />
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="block text-sm text-slate-500">Parceiro</span>
                <input
                  className="input w-full"
                  type="text"
                  placeholder={selectedPartner?.nome || 'Buscar parceiro por nome ou CPF/CNPJ'}
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
                    (usaVencimentoGeral && !form.data_vencimento) ||
                    !parcelasDetalhadasValidas ||
                    (formaPagamentoSelecionada?.exige_cartao && !form.cartao_id)
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
