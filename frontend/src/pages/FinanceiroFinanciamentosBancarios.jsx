import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineBanknotes,
  HiOutlineDocumentPlus,
  HiOutlineReceiptRefund
} from 'react-icons/hi2';
import { TabelaPadrao } from '../components/padrao';
import { buscarParceiros } from '../services/parceiros';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import {
  atualizarParcelaFinanciamentoBancario,
  criarFinanciamentoBancario,
  gerarTitulosFinanciamentoBancario,
  getCategoriasFinanceiras,
  getContasBancarias,
  getFinanciamentosBancarios
} from '../services/financeiro';

const EMPTY_FORM = {
  conta_bancaria_id: '',
  empresa_id: '',
  parceiro_id: '',
  categoria_financeira_id: '',
  numero_contrato: '',
  documento_referencia: '',
  tipo_contrato: 'Capital de giro',
  sistema_amortizacao: 'FIXO',
  taxa_juros_mensal: '',
  data_contrato: new Date().toISOString().slice(0, 10),
  data_credito: new Date().toISOString().slice(0, 10),
  primeiro_vencimento: '',
  quantidade_parcelas: 12,
  valor_credito: '',
  valor_juros_total: '',
  valor_iof: '',
  valor_tarifas: '',
  observacoes: ''
};

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function parseCurrencyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? Number(digits) / 100 : '';
}

function formatCurrencyInput(value) {
  if (value === '' || value === null || value === undefined) return '';
  return formatCurrency(value);
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function addMonths(dateString, amount) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  const day = date.getDate();
  date.setMonth(date.getMonth() + Number(amount || 0), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function distribuirValor(valorTotal, quantidade) {
  const totalCentavos = Math.round(Number(valorTotal || 0) * 100);
  const base = Math.floor(totalCentavos / quantidade);
  let resto = totalCentavos - (base * quantidade);
  return Array.from({ length: quantidade }, () => {
    const centavos = base + (resto > 0 ? 1 : 0);
    if (resto > 0) resto -= 1;
    return roundCurrency(centavos / 100);
  });
}

function calcularPreviewParcelas(form) {
  const quantidade = Math.max(Number(form.quantidade_parcelas || 0), 0);
  const principal = roundCurrency(form.valor_credito);
  if (!quantidade || principal <= 0 || !form.primeiro_vencimento) return [];

  const sistema = String(form.sistema_amortizacao || 'FIXO').toUpperCase();
  const taxaMensal = Number(form.taxa_juros_mensal || 0) / 100;
  const jurosInformado = roundCurrency(form.valor_juros_total || 0);
  const iofParcelas = distribuirValor(form.valor_iof || 0, quantidade);
  const tarifaParcelas = distribuirValor(form.valor_tarifas || 0, quantidade);
  let principalParcelas = [];
  let jurosParcelas = [];

  if (sistema === 'SAC' && taxaMensal > 0) {
    principalParcelas = distribuirValor(principal, quantidade);
    let saldo = principal;
    jurosParcelas = principalParcelas.map((amortizacao) => {
      const juros = roundCurrency(saldo * taxaMensal);
      saldo = roundCurrency(saldo - amortizacao);
      return juros;
    });
  } else if (sistema === 'PRICE' && taxaMensal > 0) {
    const parcelaBase = roundCurrency(principal * (taxaMensal / (1 - ((1 + taxaMensal) ** (-quantidade)))));
    let saldo = principal;
    for (let index = 0; index < quantidade; index += 1) {
      const juros = roundCurrency(saldo * taxaMensal);
      const amortizacao = index === quantidade - 1 ? roundCurrency(saldo) : roundCurrency(parcelaBase - juros);
      principalParcelas.push(amortizacao);
      jurosParcelas.push(juros);
      saldo = roundCurrency(saldo - amortizacao);
    }
  } else {
    principalParcelas = distribuirValor(principal, quantidade);
    jurosParcelas = distribuirValor(jurosInformado, quantidade);
  }

  return Array.from({ length: quantidade }, (_, index) => {
    const principalParcela = principalParcelas[index] || 0;
    const jurosParcela = jurosParcelas[index] || 0;
    const iofParcela = iofParcelas[index] || 0;
    const tarifaParcela = tarifaParcelas[index] || 0;
    return {
      numero_parcela: index + 1,
      data_vencimento: addMonths(form.primeiro_vencimento, index),
      valor_principal: principalParcela,
      valor_juros: jurosParcela,
      valor_iof: iofParcela,
      valor_tarifa: tarifaParcela,
      valor_parcela: roundCurrency(principalParcela + jurosParcela + iofParcela + tarifaParcela)
    };
  });
}

function getFinanciamentoTotais(parcelas = []) {
  return parcelas.reduce((acc, parcela) => ({
    principal: roundCurrency(acc.principal + Number(parcela.valor_principal || 0)),
    juros: roundCurrency(acc.juros + Number(parcela.valor_juros || 0)),
    encargos: roundCurrency(acc.encargos + Number(parcela.valor_iof || 0) + Number(parcela.valor_tarifa || 0)),
    total: roundCurrency(acc.total + Number(parcela.valor_parcela || 0))
  }), {
    principal: 0,
    juros: 0,
    encargos: 0,
    total: 0
  });
}

function Metric({ label, value, detail, icon: Icon }) {
  return (
    <div className="app-summary-card">
      <span className="app-summary-label">{label}</span>
      <strong className="app-summary-value">{value}</strong>
      {detail ? <span className="app-summary-subvalue">{Icon ? <Icon className="inline-block h-4 w-4" /> : null} {detail}</span> : null}
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || 'RASCUNHO').toUpperCase();
  const className = normalized === 'ATIVO'
    ? 'badge badge-success'
    : normalized === 'CANCELADO'
      ? 'badge badge-danger'
      : 'badge badge-soft';
  return <span className={className}>{normalized}</span>;
}

export default function FinanceiroFinanciamentosBancarios() {
  const [financiamentos, setFinanciamentos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [contas, setContas] = useState([]);
  const [empresasGrupo, setEmpresasGrupo] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filters, setFilters] = useState({ status: '', q: '' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingParcela, setEditingParcela] = useState(null);
  const [parcelaForm, setParcelaForm] = useState({
    valor_principal: '',
    valor_juros: '',
    observacoes: ''
  });

  const selected = useMemo(
    () => financiamentos.find((item) => Number(item.id) === Number(selectedId)) || financiamentos[0] || null,
    [financiamentos, selectedId]
  );

  const selectedParcelas = Array.isArray(selected?.parcelas) ? selected.parcelas : [];
  const previewParcelas = useMemo(() => calcularPreviewParcelas(form), [form]);
  const previewTotais = useMemo(() => getFinanciamentoTotais(previewParcelas), [previewParcelas]);
  const resumo = useMemo(() => {
    const ativos = financiamentos.filter((item) => String(item.status).toUpperCase() === 'ATIVO');
    const totalAberto = financiamentos.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
    const titulosGerados = financiamentos.filter((item) => item.titulos_gerados_em).length;
    return {
      contratos: financiamentos.length,
      ativos: ativos.length,
      total: totalAberto,
      titulosGerados
    };
  }, [financiamentos]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getContasBancarias(),
      getEmpresasGrupo({ ativo: true }),
      buscarParceiros({ fornecedor: '1', ativo: '1', limit: 200 }),
      getCategoriasFinanceiras()
    ])
      .then(([contasData, empresasData, parceirosData, categoriasData]) => {
        if (!active) return;
        setContas(Array.isArray(contasData) ? contasData : []);
        setEmpresasGrupo(Array.isArray(empresasData) ? empresasData : []);
        setParceiros(Array.isArray(parceirosData) ? parceirosData : []);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Erro ao carregar cadastros financeiros');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadFinanciamentos();
  }, []);

  async function loadFinanciamentos(params = filters) {
    setLoading(true);
    setError('');
    try {
      const data = await getFinanciamentosBancarios({ ...params, limit: 200 });
      setFinanciamentos(Array.isArray(data) ? data : []);
    } catch (err) {
      setFinanciamentos([]);
      setError(err?.message || 'Erro ao carregar financiamentos bancarios');
    } finally {
      setLoading(false);
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateMoneyField(field, value) {
    updateForm(field, parseCurrencyInput(value));
  }

  function updateParcelaMoneyField(field, value) {
    setParcelaForm((current) => ({
      ...current,
      [field]: parseCurrencyInput(value)
    }));
  }

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const created = await criarFinanciamentoBancario({
        ...form,
        quantidade_parcelas: Number(form.quantidade_parcelas || 0),
        valor_credito: Number(form.valor_credito || 0),
        valor_juros_total: Number(form.valor_juros_total || 0),
        valor_iof: Number(form.valor_iof || 0),
        valor_tarifas: Number(form.valor_tarifas || 0),
        taxa_juros_mensal: form.taxa_juros_mensal === '' ? undefined : Number(form.taxa_juros_mensal)
      });
      setSuccess('Financiamento cadastrado. Revise as parcelas e gere os títulos quando estiver conferido.');
      setForm(EMPTY_FORM);
      await loadFinanciamentos();
      setSelectedId(created?.id || null);
    } catch (err) {
      setError(err?.message || 'Erro ao cadastrar financiamento bancario');
    } finally {
      setSaving(false);
    }
  }

  async function handleGerarTitulos(id) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await gerarTitulosFinanciamentoBancario(id);
      setSuccess('Títulos financeiros gerados para as parcelas do financiamento.');
      await loadFinanciamentos();
      setSelectedId(updated?.id || id);
    } catch (err) {
      setError(err?.message || 'Erro ao gerar títulos do financiamento');
    } finally {
      setSaving(false);
    }
  }

  function parcelaPodeSerEditada(parcela) {
    const titulo = parcela?.tituloFinanceiro;
    if (!titulo) return true;
    const status = String(titulo.status || '').toUpperCase();
    return Number(titulo.valor_baixado || 0) <= 0 && !['BAIXADO', 'PAGO', 'QUITADO'].includes(status);
  }

  function abrirEdicaoParcela(parcela) {
    setEditingParcela(parcela);
    setParcelaForm({
      valor_principal: Number(parcela?.valor_principal || 0),
      valor_juros: Number(parcela?.valor_juros || 0),
      observacoes: parcela?.observacoes || ''
    });
  }

  async function salvarParcela(event) {
    event.preventDefault();
    if (!editingParcela) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await atualizarParcelaFinanciamentoBancario(editingParcela.id, {
        valor_principal: Number(parcelaForm.valor_principal || 0),
        valor_juros: Number(parcelaForm.valor_juros || 0),
        observacoes: parcelaForm.observacoes || null
      });

      setFinanciamentos((current) => current.map((item) => (
        Number(item.id) === Number(updated?.id) ? updated : item
      )));
      setSelectedId(updated?.id || selectedId);
      setEditingParcela(null);
      setSuccess('Parcela do financiamento atualizada.');
    } catch (err) {
      setError(err?.message || 'Erro ao atualizar parcela do financiamento');
    } finally {
      setSaving(false);
    }
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    loadFinanciamentos(filters);
  }

  const categoriasPagar = categorias.filter((categoria) => {
    const tipo = String(categoria.tipo || 'AMBOS').toUpperCase();
    return categoria.ativo !== false && (tipo === 'PAGAR' || tipo === 'AMBOS');
  });

  return (
    <div className="page solicitacoes-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Financiamentos Bancários</h1>
            <p className="page-subtitle">
              Controle contratos de crédito, acompanhe parcelas e gere os títulos de contas a pagar.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/titulos" className="btn btn-outline">Títulos</Link>
            <Link to="/financeiro/conciliacao" className="btn btn-outline">Conciliação OFX</Link>
          </div>
        </div>
      </div>

      {error ? <div className="app-alert app-alert--warning">{error}</div> : null}
      {success ? <div className="app-alert app-alert--success">{success}</div> : null}

      <div className="app-summary-grid">
        <Metric label="Contratos" value={resumo.contratos} detail="cadastrados" icon={HiOutlineDocumentPlus} />
        <Metric label="Ativos" value={resumo.ativos} detail="com títulos gerados" icon={HiOutlineBanknotes} />
        <Metric label="Total contratado" value={formatCurrency(resumo.total)} detail="amortização + encargos" icon={HiOutlineReceiptRefund} />
        <Metric label="Cronogramas enviados" value={resumo.titulosGerados} detail="para contas a pagar" />
      </div>

      <form className="card sol-surface-card" onSubmit={handleFilterSubmit}>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="app-filter-field md:col-span-2">
            <span className="app-filter-label">Busca</span>
            <input
              className="input w-full input-sm"
              value={filters.q}
              onChange={(event) => updateFilter('q', event.target.value)}
              placeholder="Contrato, código ou documento"
            />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Status</span>
            <select className="input w-full input-sm" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Todos</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="ATIVO">Ativo</option>
              <option value="LIQUIDADO">Liquidado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn btn-primary btn-sm">Atualizar</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setFilters({ status: '', q: '' }); loadFinanciamentos({ status: '', q: '' }); }}>
              Limpar
            </button>
          </div>
        </div>
      </form>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <section className="card sol-surface-card app-table-shell">
          <div className="border-b border-[var(--c-border)] px-4 py-3">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Contratos cadastrados</h2>
            <p className="text-sm text-[var(--c-muted)]">A conta bancária representa onde o crédito foi tomado.</p>
          </div>
          <TabelaPadrao
            colunas={[
              {
                id: 'codigo',
                titulo: 'Código',
                tipo: 'codigo',
                render: (item) => (
                  <span className={Number(selected?.id) === Number(item.id) ? 'font-semibold text-[var(--c-primary)]' : 'font-semibold'}>
                    {item.codigo || `#${item.id}`}
                  </span>
                )
              },
              {
                id: 'contrato',
                titulo: 'Contrato',
                // R17: o contrato (e sua instituição) NOMEIA o financiamento.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => (
                  <div>
                    <div className="font-semibold text-[var(--c-text)]">{item.numero_contrato}</div>
                    <div className="text-xs text-[var(--c-muted)]">{item.instituicaoFinanceira?.nome || '-'}</div>
                  </div>
                )
              },
              {
                id: 'conta',
                titulo: 'Conta do crédito',
                tipo: 'texto',
                render: (item) => (
                  <div>
                    <div>{item.contaBancaria?.nome || '-'}</div>
                    <div className="text-xs text-[var(--c-muted)]">{item.contaBancaria?.banco || ''}</div>
                  </div>
                )
              },
              { id: 'empresa', titulo: 'Empresa', tipo: 'texto', render: (item) => item.empresa?.nome || '-' },
              { id: 'parcelas', titulo: 'Parcelas', tipo: 'numero', render: (item) => item.quantidade_parcelas },
              { id: 'total', titulo: 'Total', tipo: 'valor', render: (item) => formatCurrency(item.valor_total) },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (item) => <StatusBadge status={item.status} /> }
            ]}
            itens={financiamentos}
            carregando={loading}
            vazio="Nenhum financiamento cadastrado."
            storageKey="tabela:financiamentos-bancarios:contratos"
            rotuloRolagem="Contratos de financiamento cadastrados"
            larguraAcoes={220}
            acoesLinha={(item) => (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedId(item.id)}>
                  Ver
                </button>
                {!item.titulos_gerados_em ? (
                  <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => handleGerarTitulos(item.id)}>
                    Gerar títulos
                  </button>
                ) : null}
              </>
            )}
          />
        </section>

        <section className="card sol-surface-card">
          <div className="border-b border-[var(--c-border)] px-4 py-3">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Novo financiamento</h2>
              <p className="text-sm text-[var(--c-muted)]">A empresa do título será a empresa do grupo selecionada para o contrato.</p>
          </div>

          <form className="space-y-4 p-4" onSubmit={submitForm}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="app-filter-field">
                <span className="app-filter-label">Conta que recebeu o crédito</span>
                <select className="input w-full" value={form.conta_bancaria_id} onChange={(event) => updateForm('conta_bancaria_id', event.target.value)} required>
                  <option value="">Selecione</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>{conta.nome} - {conta.banco || 'Conta'}</option>
                  ))}
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Empresa do grupo</span>
                <select className="input w-full" value={form.empresa_id} onChange={(event) => updateForm('empresa_id', event.target.value)} required>
                  <option value="">Selecione</option>
                  {empresasGrupo.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.codigo ? `${empresa.codigo} - ` : ''}{empresa.nome || empresa.razao_social}
                    </option>
                  ))}
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Instituição financeira</span>
                <select className="input w-full" value={form.parceiro_id} onChange={(event) => updateForm('parceiro_id', event.target.value)} required>
                  <option value="">Banco/fornecedor</option>
                  {parceiros.map((parceiro) => (
                    <option key={parceiro.id} value={parceiro.id}>{parceiro.nome}</option>
                  ))}
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Categoria das parcelas</span>
                <select className="input w-full" value={form.categoria_financeira_id} onChange={(event) => updateForm('categoria_financeira_id', event.target.value)} required>
                  <option value="">Selecione</option>
                  {categoriasPagar.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                  ))}
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Número do contrato</span>
                <input className="input w-full" value={form.numero_contrato} onChange={(event) => updateForm('numero_contrato', event.target.value)} required />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Documento de referência</span>
                <input className="input w-full" value={form.documento_referencia} onChange={(event) => updateForm('documento_referencia', event.target.value)} />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Tipo de contrato</span>
                <input className="input w-full" value={form.tipo_contrato} onChange={(event) => updateForm('tipo_contrato', event.target.value)} />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Sistema de amortização</span>
                <select className="input w-full" value={form.sistema_amortizacao} onChange={(event) => updateForm('sistema_amortizacao', event.target.value)}>
                  <option value="FIXO">Parcelas fixas por valor informado</option>
                  <option value="PRICE">Tabela PRICE</option>
                  <option value="SAC">SAC</option>
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Data do contrato</span>
                <input className="input w-full" type="date" value={form.data_contrato} onChange={(event) => updateForm('data_contrato', event.target.value)} required />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Data do crédito</span>
                <input className="input w-full" type="date" value={form.data_credito} onChange={(event) => updateForm('data_credito', event.target.value)} required />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Primeiro vencimento</span>
                <input className="input w-full" type="date" value={form.primeiro_vencimento} onChange={(event) => updateForm('primeiro_vencimento', event.target.value)} required />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Parcelas</span>
                <input className="input w-full" type="number" min="1" max="240" value={form.quantidade_parcelas} onChange={(event) => updateForm('quantidade_parcelas', event.target.value)} required />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Valor do crédito</span>
                <input className="input w-full" inputMode="decimal" value={formatCurrencyInput(form.valor_credito)} onChange={(event) => updateMoneyField('valor_credito', event.target.value)} required />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Juros total</span>
                <input className="input w-full" inputMode="decimal" value={formatCurrencyInput(form.valor_juros_total)} onChange={(event) => updateMoneyField('valor_juros_total', event.target.value)} disabled={['PRICE', 'SAC'].includes(form.sistema_amortizacao) && Number(form.taxa_juros_mensal || 0) > 0} />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Taxa mensal (%)</span>
                <input className="input w-full" type="number" step="0.0001" min="0" value={form.taxa_juros_mensal} onChange={(event) => updateForm('taxa_juros_mensal', event.target.value)} />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">IOF</span>
                <input className="input w-full" inputMode="decimal" value={formatCurrencyInput(form.valor_iof)} onChange={(event) => updateMoneyField('valor_iof', event.target.value)} />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Tarifas</span>
                <input className="input w-full" inputMode="decimal" value={formatCurrencyInput(form.valor_tarifas)} onChange={(event) => updateMoneyField('valor_tarifas', event.target.value)} />
              </label>
              <label className="app-filter-field md:col-span-2">
                <span className="app-filter-label">Observações</span>
                <textarea className="input w-full" rows={3} value={form.observacoes} onChange={(event) => updateForm('observacoes', event.target.value)} />
              </label>
            </div>

            <div className="rounded-md border border-[var(--c-border)] bg-[var(--c-surface-muted)] p-3 text-sm text-[var(--c-muted)]">
              Prévia: {previewParcelas.length} parcela(s), amortização {formatCurrency(previewTotais.principal)}, juros {formatCurrency(previewTotais.juros)}, encargos {formatCurrency(previewTotais.encargos)}, total {formatCurrency(previewTotais.total)}.
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={() => setForm(EMPTY_FORM)} disabled={saving}>Limpar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>Cadastrar financiamento</button>
            </div>
          </form>
        </section>
      </div>

      <section className="card sol-surface-card app-table-shell">
        <div className="border-b border-[var(--c-border)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                Parcelas {selected ? `- ${selected.codigo || selected.numero_contrato}` : ''}
              </h2>
              <p className="text-sm text-[var(--c-muted)]">
                Cada parcela gera um título a pagar e segue o fluxo normal de baixa e conciliação.
              </p>
            </div>
            {selected && !selected.titulos_gerados_em ? (
              <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => handleGerarTitulos(selected.id)}>
                Gerar títulos do contrato
              </button>
            ) : null}
          </div>
        </div>
        <TabelaPadrao
          // Sem coluna de IDENTIDADE por natureza: a parcela não tem nome
          // próprio — o contrato que a nomeia já está no título da seção e
          // as linhas são posições numeradas (número, datas e valores).
          semIdentidade
          colunas={[
            { id: 'numero', titulo: '#', tipo: 'numero', noCard: 'titulo', render: (parcela) => parcela.numero_parcela },
            { id: 'vencimento', titulo: 'Vencimento', tipo: 'data', render: (parcela) => formatDate(parcela.data_vencimento) },
            { id: 'principal', titulo: 'Amortização', tipo: 'valor', render: (parcela) => formatCurrency(parcela.valor_principal) },
            { id: 'juros', titulo: 'Juros', tipo: 'valor', render: (parcela) => formatCurrency(parcela.valor_juros) },
            { id: 'encargos', titulo: 'Encargos', tipo: 'valor', render: (parcela) => formatCurrency(Number(parcela.valor_iof || 0) + Number(parcela.valor_tarifa || 0)) },
            { id: 'total', titulo: 'Parcela', tipo: 'valor', render: (parcela) => <span className="font-semibold">{formatCurrency(parcela.valor_parcela)}</span> },
            {
              id: 'titulo',
              titulo: 'Titulo',
              tipo: 'codigo',
              render: (parcela) => (parcela.tituloFinanceiro ? (
                <Link to={`/financeiro/titulos/${parcela.tituloFinanceiro.id}`} className="text-blue-700 underline">
                  {parcela.tituloFinanceiro.codigo || `#${parcela.tituloFinanceiro.id}`}
                </Link>
              ) : (
                <span className="text-[var(--c-muted)]">Pendente</span>
              ))
            }
          ]}
          itens={selected ? selectedParcelas : []}
          vazio={selected ? 'Nenhuma parcela encontrada.' : 'Selecione um financiamento para ver as parcelas.'}
          storageKey="tabela:financiamentos-bancarios:parcelas"
          rotuloRolagem="Parcelas do financiamento"
          larguraAcoes={140}
          acoesLinha={(parcela) => (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => abrirEdicaoParcela(parcela)}
              disabled={!parcelaPodeSerEditada(parcela) || saving}
              title={parcelaPodeSerEditada(parcela) ? 'Editar amortização e juros' : 'Parcela com título baixado'}
            >
              Editar
            </button>
          )}
        />
      </section>

      {editingParcela ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form className="card w-full max-w-xl space-y-4" onSubmit={salvarParcela}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--c-text)]">
                  Editar parcela #{editingParcela.numero_parcela}
                </h3>
                <p className="text-sm text-[var(--c-muted)]">
                  Ajuste amortização e juros. Parcelas já baixadas ficam bloqueadas.
                </p>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingParcela(null)}>
                Fechar
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="app-filter-field">
                <span className="app-filter-label">Amortização</span>
                <input
                  className="input w-full"
                  inputMode="decimal"
                  value={formatCurrencyInput(parcelaForm.valor_principal)}
                  onChange={(event) => updateParcelaMoneyField('valor_principal', event.target.value)}
                  required
                />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Juros</span>
                <input
                  className="input w-full"
                  inputMode="decimal"
                  value={formatCurrencyInput(parcelaForm.valor_juros)}
                  onChange={(event) => updateParcelaMoneyField('valor_juros', event.target.value)}
                />
              </label>
              <label className="app-filter-field md:col-span-2">
                <span className="app-filter-label">Observações</span>
                <textarea
                  className="input w-full"
                  rows={3}
                  value={parcelaForm.observacoes}
                  onChange={(event) => setParcelaForm((current) => ({ ...current, observacoes: event.target.value }))}
                />
              </label>
            </div>

            <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface-muted)] p-3 text-sm text-[var(--c-muted)]">
              Total recalculado: <strong className="text-[var(--c-text)]">{formatCurrency(Number(parcelaForm.valor_principal || 0) + Number(parcelaForm.valor_juros || 0) + Number(editingParcela.valor_iof || 0) + Number(editingParcela.valor_tarifa || 0))}</strong>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={() => setEditingParcela(null)} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar parcela'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
