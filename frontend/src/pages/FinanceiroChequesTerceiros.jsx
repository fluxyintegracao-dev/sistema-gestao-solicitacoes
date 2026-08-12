import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineArrowRight,
  HiOutlineArrowUpTray,
  HiOutlineBanknotes,
  HiOutlineEye,
  HiOutlinePlus,
  HiOutlineXMark
} from 'react-icons/hi2';
import PessoaChequeAutocomplete from '../components/financeiro/PessoaChequeAutocomplete';
import { useAuth } from '../contexts/AuthContext';
import {
  baixarModeloChequesTerceiros,
  confirmarImportacaoChequesTerceiros,
  criarChequeTerceiro,
  getChequeTerceiro,
  getChequesTerceiros,
  getContasBancarias,
  movimentarChequeTerceiro,
  previewImportacaoChequesTerceiros
} from '../services/financeiro';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import { hasPermissao } from '../utils/acessoProduto';
import { maskCpfCnpj } from '../utils/formatters';

const STATUS_LABELS = {
  EM_CARTEIRA: 'Em carteira',
  RESERVADO: 'Reservado',
  UTILIZADO: 'Utilizado',
  DEPOSITADO: 'Depositado',
  DEVOLVIDO: 'Devolvido',
  CANCELADO: 'Cancelado'
};

function createEmptyForm() {
  return {
  empresa_id: '', numero_cheque: '', titular_parceiro_id: '', titular_nome: '', titular_documento: '',
  parceiro_entregou_id: '', cliente_nome: '', cliente_documento: '', banco: '', agencia: '', conta: '',
  valor: '', data_vencimento: '', data_entrada: new Date().toISOString().slice(0, 10),
  motivo_origem: 'Saldo inicial sem lastro de obra identificado', observacoes: ''
  };
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateBr(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function Modal({ title, subtitle, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <section className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-[var(--modal-border)] bg-[var(--modal-bg)] shadow-2xl ${wide ? 'max-w-6xl' : 'max-w-2xl'}`}>
        <header className="flex items-start justify-between gap-4 border-b border-[var(--c-border)] px-5 py-4">
          <div><h2 className="text-lg font-semibold text-[var(--c-text)]">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-[var(--c-muted)]">{subtitle}</p> : null}</div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} aria-label="Fechar"><HiOutlineXMark className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || '').toUpperCase();
  const tone = normalized === 'EM_CARTEIRA' ? 'bg-emerald-100 text-emerald-800'
    : normalized === 'DEVOLVIDO' || normalized === 'CANCELADO' ? 'bg-rose-100 text-rose-800'
      : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>{STATUS_LABELS[normalized] || normalized || '-'}</span>;
}

export default function FinanceiroChequesTerceiros() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ q: '', empresa_id: '', status: 'EM_CARTEIRA' });
  const [data, setData] = useState({ cheques: [], totais: {}, total: 0 });
  const [empresas, setEmpresas] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(createEmptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [actionForm, setActionForm] = useState({ data_evento: new Date().toISOString().slice(0, 10), conta_bancaria_id: '', empresa_destino_id: '', observacoes: '' });

  const canCreate = hasPermissao(user, 'financeiro.cheques.cadastrar');
  const canImport = hasPermissao(user, 'financeiro.cheques.importar');
  const canDeposit = hasPermissao(user, 'financeiro.cheques.depositar');
  const canReturn = hasPermissao(user, 'financeiro.cheques.devolver');
  const canCancel = hasPermissao(user, 'financeiro.cheques.cancelar');
  const canTransfer = hasPermissao(user, 'financeiro.cheques.transferir');

  async function load() {
    setLoading(true); setError('');
    try { setData(await getChequesTerceiros(filters)); }
    catch (err) { setError(err.message || 'Erro ao carregar carteira de cheques.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    Promise.all([getEmpresasGrupo({ ativo: true }), getContasBancarias()])
      .then(([empresasData, contasData]) => {
        setEmpresas(Array.isArray(empresasData) ? empresasData : empresasData?.items || []);
        setContas(Array.isArray(contasData) ? contasData : contasData?.items || []);
      }).catch(() => {});
  }, []);

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [filters.q, filters.empresa_id, filters.status]);

  const totalCarteira = Number(data?.totais?.EM_CARTEIRA || 0);
  const contasEmpresaAcao = useMemo(() => contas.filter((item) => Number(item.empresa_id) === Number(selected?.empresa_id)), [contas, selected]);

  async function submitCreate(event) {
    event.preventDefault();
    if (!form.titular_parceiro_id) {
      setError('Selecione o titular na pesquisa de pessoas cadastradas.');
      return;
    }
    setSaving(true); setError('');
    try {
      const { cliente_documento: _clienteDocumento, ...payload } = form;
      await criarChequeTerceiro({ ...payload, valor: Number(String(form.valor).replace(',', '.')) });
      setCreateOpen(false); setForm(createEmptyForm()); await load();
    } catch (err) { setError(err.message || 'Erro ao cadastrar cheque.'); }
    finally { setSaving(false); }
  }

  async function openDetail(id) {
    try { setSelected(await getChequeTerceiro(id)); }
    catch (err) { setError(err.message); }
  }

  async function downloadModel() {
    try {
      const blob = await baixarModeloChequesTerceiros();
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = 'modelo-carteira-cheques-terceiros.xlsx'; link.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  }

  async function importFile(file) {
    if (!file) return;
    setSaving(true); setError('');
    try { const preview = await previewImportacaoChequesTerceiros(file); setImportRows(preview.linhas || []); }
    catch (err) { setError(err.message || 'Erro ao validar planilha.'); }
    finally { setSaving(false); }
  }

  function updateImportRow(index, field, value) {
    setImportRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value, erros: [], valido: true } : row));
  }

  async function confirmImport() {
    setSaving(true); setError('');
    try {
      await confirmarImportacaoChequesTerceiros({ linhas: importRows }, crypto.randomUUID());
      setImportOpen(false); setImportRows([]); await load();
    } catch (err) { setError(err.message || 'Erro ao importar cheques.'); }
    finally { setSaving(false); }
  }

  async function submitAction(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await movimentarChequeTerceiro(selected.id, { acao: action, ...actionForm });
      setAction(null); setSelected(null); await load();
    } catch (err) { setError(err.message || 'Erro ao movimentar cheque.'); }
    finally { setSaving(false); }
  }

  const actionLabels = { DEPOSITAR: 'Registrar depósito', DEVOLVER: 'Registrar devolução', CANCELAR: 'Cancelar cheque', TRANSFERIR: 'Transferir custódia' };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Financeiro · Custódia</p><h1 className="text-2xl font-bold text-[var(--c-text)]">Cheques de terceiros</h1><p className="text-sm text-[var(--c-muted)]">Controle físico e auditável sem transformar cheques em contas bancárias fictícias.</p></div>
        <div className="flex flex-wrap gap-2">
          {canImport ? <button className="btn btn-outline btn-sm" type="button" onClick={() => setImportOpen(true)}><HiOutlineArrowUpTray className="h-4 w-4" /> Importar</button> : null}
          {canCreate ? <button className="btn btn-primary btn-sm" type="button" onClick={() => setCreateOpen(true)}><HiOutlinePlus className="h-4 w-4" /> Cadastrar cheque</button> : null}
        </div>
      </header>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><span className="text-xs font-semibold uppercase text-[var(--c-muted)]">Em carteira</span><strong className="mt-1 block text-xl text-emerald-700">{money(totalCarteira)}</strong></div>
        <div className="card p-4"><span className="text-xs font-semibold uppercase text-[var(--c-muted)]">Documentos exibidos</span><strong className="mt-1 block text-xl text-[var(--c-text)]">{data.total || 0}</strong></div>
        <div className="card p-4"><span className="text-xs font-semibold uppercase text-[var(--c-muted)]">Escopo</span><strong className="mt-1 block truncate text-base text-[var(--c-text)]">{filters.empresa_id ? empresas.find((item) => Number(item.id) === Number(filters.empresa_id))?.nome : 'Grupo empresarial'}</strong></div>
      </section>

      <section className="card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(180px,260px)_minmax(170px,220px)_auto]">
          <label className="form-control"><span>Pesquisar</span><input className="input" value={filters.q} onChange={(e) => setFilters((v) => ({ ...v, q: e.target.value }))} placeholder="Código, número, titular ou banco" /></label>
          <label className="form-control"><span>Empresa detentora</span><select className="select" value={filters.empresa_id} onChange={(e) => setFilters((v) => ({ ...v, empresa_id: e.target.value }))}><option value="">Todas</option>{empresas.map((item) => <option key={item.id} value={item.id}>{item.codigo ? `${item.codigo} · ` : ''}{item.nome}</option>)}</select></label>
          <label className="form-control"><span>Status</span><select className="select" value={filters.status} onChange={(e) => setFilters((v) => ({ ...v, status: e.target.value }))}><option value="">Todos</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button type="button" className="btn btn-outline self-end" onClick={load} disabled={loading}><HiOutlineArrowPath className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar</button>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table min-w-[980px]">
            <thead><tr><th>Código / cheque</th><th>Empresa</th><th>Titular</th><th>Banco</th><th>Vencimento</th><th className="text-right">Valor</th><th>Status</th><th className="w-20">Ação</th></tr></thead>
            <tbody>{(data.cheques || []).map((item) => <tr key={item.id}><td><strong>{item.codigo}</strong><small className="block text-[var(--c-muted)]">Nº {item.numero_cheque || '-'}</small></td><td>{item.empresa?.nome || '-'}</td><td>{item.titular_nome || '-'}<small className="block text-[var(--c-muted)]">{item.titular_documento ? maskCpfCnpj(item.titular_documento) : (item.cliente_nome || '')}</small></td><td>{item.banco || '-'}<small className="block text-[var(--c-muted)]">{[item.agencia, item.conta].filter(Boolean).join(' / ')}</small></td><td>{dateBr(item.data_vencimento)}</td><td className="text-right font-semibold">{money(item.valor)}</td><td><StatusBadge status={item.status} /></td><td><button type="button" className="btn btn-outline btn-sm" onClick={() => openDetail(item.id)} title="Ver histórico"><HiOutlineEye className="h-4 w-4" /></button></td></tr>)}</tbody>
          </table>
        </div>
        {!loading && !(data.cheques || []).length ? <div className="p-8 text-center text-sm text-[var(--c-muted)]">Nenhum cheque encontrado para os filtros.</div> : null}
      </section>

      {createOpen ? (
        <Modal
          title="Cadastrar cheque de terceiro"
          subtitle="Entrada de saldo inicial legado. Não cria título nem receita."
          onClose={() => setCreateOpen(false)}
        >
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitCreate}>
            {[
              ['numero_cheque', 'Número do cheque', 'text', true]
            ].map(([key, label, type, required]) => (
              <label className="form-control" key={key}>
                <span>{label}{required ? ' *' : ''}</span>
                <input
                  className="input"
                  type={type}
                  step={type === 'number' ? '0.01' : undefined}
                  required={required}
                  value={form[key]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                />
              </label>
            ))}

            <PessoaChequeAutocomplete
              label="Titular (nome ou CPF/CNPJ)"
              required
              selected={form.titular_parceiro_id ? {
                id: form.titular_parceiro_id,
                nome: form.titular_nome,
                cpf_cnpj: form.titular_documento
              } : null}
              createButtonLabel="Cadastrar titular"
              onSelect={(partner) => {
                setForm((current) => ({
                  ...current,
                  titular_parceiro_id: partner?.id || '',
                  titular_nome: partner?.nome || '',
                  titular_documento: partner?.cpf_cnpj || ''
                }));
              }}
            />

            <PessoaChequeAutocomplete
              label="Cliente/origem informada"
              selected={form.parceiro_entregou_id ? {
                id: form.parceiro_entregou_id,
                nome: form.cliente_nome,
                cpf_cnpj: form.cliente_documento
              } : null}
              createButtonLabel="Cadastrar cliente/origem"
              helperText="Campo opcional. Pesquise qualquer pessoa ativa ou faça um cadastro rápido como cliente."
              onSelect={(partner) => setForm((current) => ({
                ...current,
                parceiro_entregou_id: partner?.id || '',
                cliente_nome: partner?.nome || '',
                cliente_documento: partner?.cpf_cnpj || ''
              }))}
            />

            {[
              ['banco', 'Banco', 'text'],
              ['agencia', 'Agência', 'text'],
              ['conta', 'Conta', 'text'],
              ['valor', 'Valor', 'number', true],
              ['data_vencimento', 'Data de vencimento', 'date', true],
              ['data_entrada', 'Data de entrada', 'date', true]
            ].map(([key, label, type, required]) => (
              <label className="form-control" key={key}>
                <span>{label}{required ? ' *' : ''}</span>
                <input
                  className="input"
                  type={type}
                  step={type === 'number' ? '0.01' : undefined}
                  required={required}
                  value={form[key]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                />
              </label>
            ))}

            <label className="form-control sm:col-span-2">
              <span>Empresa detentora *</span>
              <select className="select" required value={form.empresa_id} onChange={(event) => setForm((current) => ({ ...current, empresa_id: event.target.value }))}>
                <option value="">Selecione</option>
                {empresas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </label>
            <label className="form-control sm:col-span-2">
              <span>Justificativa da origem *</span>
              <input className="input" required value={form.motivo_origem} onChange={(event) => setForm((current) => ({ ...current, motivo_origem: event.target.value }))} />
            </label>
            <label className="form-control sm:col-span-2">
              <span>Observações</span>
              <textarea className="textarea" value={form.observacoes} onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))} />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn btn-outline" onClick={() => setCreateOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving || !form.titular_parceiro_id}>Salvar cheque</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {importOpen ? <Modal wide title="Importar cheques" subtitle="Revise as linhas antes de confirmar. A operação é atômica e auditada." onClose={() => { setImportOpen(false); setImportRows([]); }}><div className="mb-4 flex flex-wrap gap-2"><button type="button" className="btn btn-outline" onClick={downloadModel}><HiOutlineArrowDownTray className="h-4 w-4" /> Baixar modelo</button><label className="btn btn-primary cursor-pointer"><HiOutlineArrowUpTray className="h-4 w-4" /> Selecionar XLSX<input type="file" className="hidden" accept=".xlsx" onChange={(e) => importFile(e.target.files?.[0])} /></label><button type="button" className="btn btn-outline" onClick={() => setImportRows((rows) => [...rows, { linha: `Nova ${rows.length + 1}`, empresa_id: empresas[0]?.id || '', empresa_codigo: empresas[0]?.codigo || '', numero_cheque: '', titular_nome: '', titular_documento: '', banco: '', agencia: '', conta: '', valor: '', data_vencimento: '', data_entrada: new Date().toISOString().slice(0, 10), motivo_origem: 'Saldo inicial sem lastro de obra identificado', erros: [], valido: true }])}><HiOutlinePlus /> Adicionar linha</button></div>{importRows.length ? <><div className="max-h-[52vh] overflow-auto rounded-xl border border-[var(--c-border)]"><table className="table min-w-[1200px]"><thead><tr><th>Linha</th><th>Empresa</th><th>Número</th><th>Titular</th><th>Banco</th><th>Valor</th><th>Vencimento</th><th>Validação</th><th /></tr></thead><tbody>{importRows.map((row, index) => <tr key={`${row.linha}-${index}`}><td>{row.linha}</td><td><select className="select select-sm min-w-44" value={row.empresa_id || ''} onChange={(e) => { const empresa = empresas.find((item) => Number(item.id) === Number(e.target.value)); setImportRows((rows) => rows.map((item, i) => i === index ? { ...item, empresa_id: empresa?.id || '', empresa_codigo: empresa?.codigo || '', erros: [], valido: true } : item)); }}><option value="">Selecione</option>{empresas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></td><td><input className="input input-sm min-w-32" value={row.numero_cheque || ''} onChange={(e) => updateImportRow(index, 'numero_cheque', e.target.value)} /></td><td><input className="input input-sm min-w-48" value={row.titular_nome || ''} onChange={(e) => updateImportRow(index, 'titular_nome', e.target.value)} /></td><td><input className="input input-sm min-w-32" value={row.banco || ''} onChange={(e) => updateImportRow(index, 'banco', e.target.value)} /></td><td><input className="input input-sm w-28" type="number" step="0.01" value={row.valor || ''} onChange={(e) => updateImportRow(index, 'valor', e.target.value)} /></td><td><input className="input input-sm" type="date" value={row.data_vencimento || ''} onChange={(e) => updateImportRow(index, 'data_vencimento', e.target.value)} /></td><td className={row.valido ? 'text-emerald-700' : 'text-rose-700'}>{row.valido ? 'Válida' : (row.erros || []).join(' ')}</td><td><button type="button" className="btn btn-outline btn-sm" onClick={() => setImportRows((rows) => rows.filter((_, i) => i !== index))}><HiOutlineXMark /></button></td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-between"><span className="text-sm text-[var(--c-muted)]">{importRows.length} cheque(s) no lote</span><button type="button" className="btn btn-primary" disabled={saving || importRows.some((row) => !row.valido)} onClick={confirmImport}>Confirmar importação</button></div></> : <div className="rounded-xl border border-dashed border-[var(--c-border)] p-8 text-center text-sm text-[var(--c-muted)]">Baixe o modelo, preencha e selecione o arquivo para gerar o preview.</div>}</Modal> : null}

      {selected && !action ? <Modal title={`${selected.codigo} · cheque ${selected.numero_cheque}`} subtitle={`${selected.empresa?.nome || '-'} · ${money(selected.valor)}`} onClose={() => setSelected(null)}><div className="grid gap-3 sm:grid-cols-4"><div><small className="text-[var(--c-muted)]">Status</small><div className="mt-1"><StatusBadge status={selected.status} /></div></div><div><small className="text-[var(--c-muted)]">Titular</small><strong className="block">{selected.titularParceiro?.nome || selected.titular_nome || '-'}</strong></div><div><small className="text-[var(--c-muted)]">Cliente/origem</small><strong className="block">{selected.parceiroEntregou?.nome || selected.cliente_nome || '-'}</strong></div><div><small className="text-[var(--c-muted)]">Vencimento</small><strong className="block">{dateBr(selected.data_vencimento)}</strong></div></div>{selected.status === 'EM_CARTEIRA' ? <div className="mt-5 flex flex-wrap gap-2">{canDeposit ? <button className="btn btn-outline btn-sm" onClick={() => setAction('DEPOSITAR')}><HiOutlineBanknotes /> Depositar</button> : null}{canTransfer ? <button className="btn btn-outline btn-sm" onClick={() => setAction('TRANSFERIR')}><HiOutlineArrowRight /> Transferir</button> : null}{canReturn ? <button className="btn btn-outline btn-sm" onClick={() => setAction('DEVOLVER')}>Devolver</button> : null}{canCancel ? <button className="btn btn-outline btn-sm text-rose-700" onClick={() => setAction('CANCELAR')}>Cancelar</button> : null}</div> : null}<h3 className="mt-6 font-semibold">Histórico</h3><div className="mt-2 space-y-2">{(selected.historico || []).map((item) => <div key={item.id} className="rounded-xl border border-[var(--c-border)] p-3 text-sm"><div className="flex justify-between gap-3"><strong>{item.tipo_evento}</strong><span>{dateBr(item.data_evento)}</span></div><p className="mt-1 text-[var(--c-muted)]">{item.observacoes || `${item.status_anterior || '-'} → ${item.status_novo}`}</p></div>)}</div></Modal> : null}

      {selected && action ? <Modal title={actionLabels[action]} subtitle={`${selected.codigo} · ${money(selected.valor)}`} onClose={() => setAction(null)}><form className="space-y-3" onSubmit={submitAction}>{action === 'DEPOSITAR' ? <label className="form-control"><span>Conta de destino *</span><select className="select" required value={actionForm.conta_bancaria_id} onChange={(e) => setActionForm((v) => ({ ...v, conta_bancaria_id: e.target.value }))}><option value="">Selecione</option>{contasEmpresaAcao.map((item) => <option key={item.id} value={item.id}>{item.nome || item.banco_nome || `Conta #${item.id}`}</option>)}</select></label> : null}{action === 'TRANSFERIR' ? <label className="form-control"><span>Empresa de destino *</span><select className="select" required value={actionForm.empresa_destino_id} onChange={(e) => setActionForm((v) => ({ ...v, empresa_destino_id: e.target.value }))}><option value="">Selecione</option>{empresas.filter((item) => Number(item.id) !== Number(selected.empresa_id)).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label> : null}<label className="form-control"><span>Data *</span><input type="date" className="input" required value={actionForm.data_evento} onChange={(e) => setActionForm((v) => ({ ...v, data_evento: e.target.value }))} /></label><label className="form-control"><span>Justificativa / observação *</span><textarea className="textarea" required value={actionForm.observacoes} onChange={(e) => setActionForm((v) => ({ ...v, observacoes: e.target.value }))} /></label><div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={() => setAction(null)}>Voltar</button><button className="btn btn-primary" disabled={saving}>Confirmar</button></div></form></Modal> : null}
    </div>
  );
}
