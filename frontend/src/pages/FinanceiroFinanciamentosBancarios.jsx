import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineBanknotes,
  HiOutlineDocumentPlus,
  HiOutlineReceiptRefund
} from 'react-icons/hi2';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { buscarParceiros } from '../services/parceiros';
import {
  criarFinanciamentoBancario,
  gerarTitulosFinanciamentoBancario,
  getCategoriasFinanceiras,
  getContasBancarias,
  getFinanciamentosBancarios
} from '../services/financeiro';
import { getMinhasObras } from '../services/obras';

const EMPTY_FORM = {
  conta_bancaria_id: '',
  obra_id: '',
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

const FINANCIAMENTOS_COLUMNS = [
  { key: 'codigo', width: 118, minWidth: 96 },
  { key: 'contrato', width: 210, minWidth: 150 },
  { key: 'conta', width: 210, minWidth: 150 },
  { key: 'empresa', width: 180, minWidth: 130 },
  { key: 'parcelas', width: 108, minWidth: 90 },
  { key: 'total', width: 136, minWidth: 112 },
  { key: 'status', width: 112, minWidth: 90 },
  { key: 'acao', width: 148, minWidth: 124 }
];

const PARCELAS_COLUMNS = [
  { key: 'numero', width: 70, minWidth: 64 },
  { key: 'vencimento', width: 112, minWidth: 96 },
  { key: 'principal', width: 128, minWidth: 108 },
  { key: 'juros', width: 116, minWidth: 100 },
  { key: 'encargos', width: 116, minWidth: 100 },
  { key: 'total', width: 132, minWidth: 108 },
  { key: 'titulo', width: 132, minWidth: 108 }
];

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
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
  const [obras, setObras] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filters, setFilters] = useState({ status: '', q: '' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      getMinhasObras({ modo: 'FINANCEIRO', escopo: 'TODOS' }),
      buscarParceiros({ fornecedor: '1', ativo: '1', limit: 200 }),
      getCategoriasFinanceiras()
    ])
      .then(([contasData, obrasData, parceirosData, categoriasData]) => {
        if (!active) return;
        setContas(Array.isArray(contasData) ? contasData : []);
        setObras(Array.isArray(obrasData) ? obrasData : []);
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
      setSuccess('Financiamento cadastrado. Revise as parcelas e gere os titulos quando estiver conferido.');
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
      setSuccess('Titulos financeiros gerados para as parcelas do financiamento.');
      await loadFinanciamentos();
      setSelectedId(updated?.id || id);
    } catch (err) {
      setError(err?.message || 'Erro ao gerar titulos do financiamento');
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
            <h1 className="text-xl font-semibold md:text-2xl">Financiamentos Bancarios</h1>
            <p className="page-subtitle">
              Controle contratos de credito, acompanhe parcelas e gere os titulos de contas a pagar.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/titulos" className="btn btn-outline">Titulos</Link>
            <Link to="/financeiro/conciliacao" className="btn btn-outline">Conciliacao OFX</Link>
          </div>
        </div>
      </div>

      {error ? <div className="app-alert app-alert--warning">{error}</div> : null}
      {success ? <div className="app-alert app-alert--success">{success}</div> : null}

      <div className="app-summary-grid">
        <Metric label="Contratos" value={resumo.contratos} detail="cadastrados" icon={HiOutlineDocumentPlus} />
        <Metric label="Ativos" value={resumo.ativos} detail="com titulos gerados" icon={HiOutlineBanknotes} />
        <Metric label="Total contratado" value={formatCurrency(resumo.total)} detail="principal + encargos" icon={HiOutlineReceiptRefund} />
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
              placeholder="Contrato, codigo ou documento"
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
            <p className="text-sm text-[var(--c-muted)]">A conta bancaria representa onde o credito foi tomado.</p>
          </div>
          <div className="table-wrapper">
            <ResizableTable
              className="table"
              columns={FINANCIAMENTOS_COLUMNS}
              storageKey="fluxy.financeiro.financiamentos-bancarios.columnWidths"
            >
              <thead>
                <tr>
                  <ResizableTh columnKey="codigo">Codigo</ResizableTh>
                  <ResizableTh columnKey="contrato">Contrato</ResizableTh>
                  <ResizableTh columnKey="conta">Conta credito</ResizableTh>
                  <ResizableTh columnKey="empresa">Empresa</ResizableTh>
                  <ResizableTh columnKey="parcelas" className="text-right">Parcelas</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Total</ResizableTh>
                  <ResizableTh columnKey="status">Status</ResizableTh>
                  <ResizableTh columnKey="acao">Acoes</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center text-[var(--c-muted)]">Carregando financiamentos...</td></tr>
                ) : financiamentos.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-[var(--c-muted)]">Nenhum financiamento cadastrado.</td></tr>
                ) : (
                  financiamentos.map((item) => (
                    <tr key={item.id} className={Number(selected?.id) === Number(item.id) ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}>
                      <td className="font-semibold">{item.codigo || `#${item.id}`}</td>
                      <td>
                        <div className="font-semibold text-[var(--c-text)]">{item.numero_contrato}</div>
                        <div className="text-xs text-[var(--c-muted)]">{item.instituicaoFinanceira?.nome || '-'}</div>
                      </td>
                      <td>
                        <div>{item.contaBancaria?.nome || '-'}</div>
                        <div className="text-xs text-[var(--c-muted)]">{item.contaBancaria?.banco || ''}</div>
                      </td>
                      <td>{item.empresa?.nome || '-'}</td>
                      <td className="text-right">{item.quantidade_parcelas}</td>
                      <td className="text-right font-semibold">{formatCurrency(item.valor_total)}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn btn-outline btn-xs" onClick={() => setSelectedId(item.id)}>
                            Ver
                          </button>
                          {!item.titulos_gerados_em ? (
                            <button type="button" className="btn btn-primary btn-xs" disabled={saving} onClick={() => handleGerarTitulos(item.id)}>
                              Gerar titulos
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </section>

        <section className="card sol-surface-card">
          <div className="border-b border-[var(--c-border)] px-4 py-3">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Novo financiamento</h2>
            <p className="text-sm text-[var(--c-muted)]">A empresa do titulo sera a empresa vinculada a obra/centro de custo.</p>
          </div>

          <form className="space-y-4 p-4" onSubmit={submitForm}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="app-filter-field">
                <span className="app-filter-label">Conta que recebeu o credito</span>
                <select className="input w-full" value={form.conta_bancaria_id} onChange={(event) => updateForm('conta_bancaria_id', event.target.value)} required>
                  <option value="">Selecione</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>{conta.nome} - {conta.banco || 'Conta'}</option>
                  ))}
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Obra/Centro de custo</span>
                <select className="input w-full" value={form.obra_id} onChange={(event) => updateForm('obra_id', event.target.value)} required>
                  <option value="">Selecione</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>{obra.codigo ? `${obra.codigo} - ` : ''}{obra.nome}</option>
                  ))}
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Instituicao financeira</span>
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
                <span className="app-filter-label">Numero do contrato</span>
                <input className="input w-full" value={form.numero_contrato} onChange={(event) => updateForm('numero_contrato', event.target.value)} required />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Documento referencia</span>
                <input className="input w-full" value={form.documento_referencia} onChange={(event) => updateForm('documento_referencia', event.target.value)} />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Tipo de contrato</span>
                <input className="input w-full" value={form.tipo_contrato} onChange={(event) => updateForm('tipo_contrato', event.target.value)} />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Sistema de amortizacao</span>
                <select className="input w-full" value={form.sistema_amortizacao} onChange={(event) => updateForm('sistema_amortizacao', event.target.value)}>
                  <option value="FIXO">Parcelas fixas por valor informado</option>
                  <option value="PRICE">Tabela PRICE</option>
                  <option value="SAC">SAC</option>
                </select>
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Data contrato</span>
                <input className="input w-full" type="date" value={form.data_contrato} onChange={(event) => updateForm('data_contrato', event.target.value)} required />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Data credito</span>
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
                <span className="app-filter-label">Valor credito</span>
                <input className="input w-full" type="number" step="0.01" min="0.01" value={form.valor_credito} onChange={(event) => updateForm('valor_credito', event.target.value)} required />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Juros total</span>
                <input className="input w-full" type="number" step="0.01" min="0" value={form.valor_juros_total} onChange={(event) => updateForm('valor_juros_total', event.target.value)} disabled={['PRICE', 'SAC'].includes(form.sistema_amortizacao) && Number(form.taxa_juros_mensal || 0) > 0} />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Taxa mensal (%)</span>
                <input className="input w-full" type="number" step="0.0001" min="0" value={form.taxa_juros_mensal} onChange={(event) => updateForm('taxa_juros_mensal', event.target.value)} />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">IOF</span>
                <input className="input w-full" type="number" step="0.01" min="0" value={form.valor_iof} onChange={(event) => updateForm('valor_iof', event.target.value)} />
              </label>
              <label className="app-filter-field">
                <span className="app-filter-label">Tarifas</span>
                <input className="input w-full" type="number" step="0.01" min="0" value={form.valor_tarifas} onChange={(event) => updateForm('valor_tarifas', event.target.value)} />
              </label>
              <label className="app-filter-field md:col-span-2">
                <span className="app-filter-label">Observacoes</span>
                <textarea className="input w-full" rows={3} value={form.observacoes} onChange={(event) => updateForm('observacoes', event.target.value)} />
              </label>
            </div>

            <div className="rounded-md border border-[var(--c-border)] bg-[var(--c-surface-muted)] p-3 text-sm text-[var(--c-muted)]">
              Previa: {previewParcelas.length} parcela(s), principal {formatCurrency(previewTotais.principal)}, juros {formatCurrency(previewTotais.juros)}, encargos {formatCurrency(previewTotais.encargos)}, total {formatCurrency(previewTotais.total)}.
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
                Cada parcela gera um titulo a pagar e segue o fluxo normal de baixa e conciliacao.
              </p>
            </div>
            {selected && !selected.titulos_gerados_em ? (
              <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => handleGerarTitulos(selected.id)}>
                Gerar titulos do contrato
              </button>
            ) : null}
          </div>
        </div>
        <div className="table-wrapper">
          <ResizableTable
            className="table"
            columns={PARCELAS_COLUMNS}
            storageKey="fluxy.financeiro.financiamentos-bancarios.parcelas.columnWidths"
          >
            <thead>
              <tr>
                <ResizableTh columnKey="numero">#</ResizableTh>
                <ResizableTh columnKey="vencimento">Vencimento</ResizableTh>
                <ResizableTh columnKey="principal" className="text-right">Principal</ResizableTh>
                <ResizableTh columnKey="juros" className="text-right">Juros</ResizableTh>
                <ResizableTh columnKey="encargos" className="text-right">Encargos</ResizableTh>
                <ResizableTh columnKey="total" className="text-right">Parcela</ResizableTh>
                <ResizableTh columnKey="titulo">Titulo</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {!selected ? (
                <tr><td colSpan={7} className="text-center text-[var(--c-muted)]">Selecione um financiamento para ver as parcelas.</td></tr>
              ) : selectedParcelas.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-[var(--c-muted)]">Nenhuma parcela encontrada.</td></tr>
              ) : (
                selectedParcelas.map((parcela) => (
                  <tr key={parcela.id}>
                    <td>{parcela.numero_parcela}</td>
                    <td>{formatDate(parcela.data_vencimento)}</td>
                    <td className="text-right">{formatCurrency(parcela.valor_principal)}</td>
                    <td className="text-right">{formatCurrency(parcela.valor_juros)}</td>
                    <td className="text-right">{formatCurrency(Number(parcela.valor_iof || 0) + Number(parcela.valor_tarifa || 0))}</td>
                    <td className="text-right font-semibold">{formatCurrency(parcela.valor_parcela)}</td>
                    <td>
                      {parcela.tituloFinanceiro ? (
                        <Link to={`/financeiro/titulos/${parcela.tituloFinanceiro.id}`} className="text-blue-700 underline">
                          {parcela.tituloFinanceiro.codigo || `#${parcela.tituloFinanceiro.id}`}
                        </Link>
                      ) : (
                        <span className="text-[var(--c-muted)]">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ResizableTable>
        </div>
      </section>
    </div>
  );
}
