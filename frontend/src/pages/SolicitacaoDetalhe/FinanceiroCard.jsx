import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buscarParceiros } from '../../services/parceiros';
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function buildDefaultForm(solicitacao) {
  return {
    tipo: 'PAGAR',
    parceiro_id: solicitacao?.parceiro?.id ? String(solicitacao.parceiro.id) : '',
    categoria_financeira_id: '',
    valor: solicitacao?.valor ? String(solicitacao.valor) : '',
    data_vencimento: solicitacao?.data_vencimento || today(),
    forma_pagamento_id: '',
    cartao_id: '',
    quantidade_parcelas: '1',
    data_compra: today()
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
    setForm((current) => ({
      ...current,
      forma_pagamento_id: formaPagamentoId,
      cartao_id: forma?.exige_cartao ? current.cartao_id : '',
      quantidade_parcelas: forma?.permite_parcelamento ? (current.quantidade_parcelas || '1') : '1',
      data_compra: forma?.exige_cartao ? (current.data_compra || today()) : current.data_compra
    }));
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
        valor: form.valor,
        data_vencimento: form.data_vencimento
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
          <div className="card w-full max-w-2xl space-y-4">
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
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor}
                    onChange={(event) => setForm((current) => ({ ...current, valor: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
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
                      onChange={(event) => setForm((current) => ({ ...current, quantidade_parcelas: event.target.value }))}
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
                      {cartoes.filter((item) => item.ativo !== false).map((cartao) => (
                        <option key={cartao.id} value={cartao.id}>
                          {cartao.nome} final {cartao.ultimos_digitos}
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

              <div className="space-y-2">
                <span className="block text-sm text-slate-500">Parceiro</span>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="font-medium text-[var(--c-text)]">{selectedPartner?.nome || 'Nenhum parceiro selecionado'}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {selectedPartner?.cpf_cnpj || 'Informe ou selecione um parceiro'} {selectedPartner?.telefone ? `- ${selectedPartner.telefone}` : ''}
                  </div>
                </div>

                <input
                  className="input w-full"
                  type="text"
                  placeholder="Buscar parceiro por nome ou CPF/CNPJ"
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
                    !form.data_vencimento ||
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
