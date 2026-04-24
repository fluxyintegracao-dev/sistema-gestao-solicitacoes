import { useEffect, useState } from 'react';
import {
  atualizarCanalCrm,
  criarCanalCrm,
  excluirCanalCrm,
  listarCanaisCrm
} from '../../../services/crm';

const EMPTY_FORM = {
  nome: '',
  type: 'WHATSAPP',
  status: 'ACTIVE',
  provider: '',
  public_label: '',
  business_main_phone: '',
  operational_phone: '',
  tracking_phone: '',
  destination_phone: '',
  meta_waba_id: '',
  meta_phone_number_id: '',
  google_customer_id: ''
};

const TYPE_LABEL = {
  WHATSAPP: 'WhatsApp',
  PHONE: 'Telefone',
  EMAIL: 'E-mail',
  FORM: 'Formulario',
  CHAT: 'Chat'
};

const STATUS_LABEL = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  BLOCKED: 'Bloqueado'
};

export default function CrmAdminCanais() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    try {
      const data = await listarCanaisCrm();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(err.message || 'Erro ao carregar canais');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function updateField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({
      nome: item.nome || '',
      type: item.type || 'WHATSAPP',
      status: item.status || 'ACTIVE',
      provider: item.provider || '',
      public_label: item.public_label || '',
      business_main_phone: item.business_main_phone || '',
      operational_phone: item.operational_phone || '',
      tracking_phone: item.tracking_phone || '',
      destination_phone: item.destination_phone || '',
      meta_waba_id: item.meta_waba_id || '',
      meta_phone_number_id: item.meta_phone_number_id || '',
      google_customer_id: item.google_customer_id || ''
    });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await atualizarCanalCrm(editingId, form);
      } else {
        await criarCanalCrm(form);
      }
      resetForm();
      await load();
    } catch (err) {
      alert(err.message || 'Erro ao salvar canal');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Excluir este canal CRM?')) return;
    try {
      await excluirCanalCrm(id);
      await load();
    } catch (err) {
      alert(err.message || 'Erro ao excluir canal');
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Canais CRM</h1>
            <p className="page-subtitle">Configure canais de origem, atendimento e rastreamento.</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="card sol-surface-card p-5 mt-3 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="app-filter-label">Nome interno</span>
            <input className="input" value={form.nome} onChange={updateField('nome')} required />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Tipo</span>
            <select className="input" value={form.type} onChange={updateField('type')}>
              {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Status</span>
            <select className="input" value={form.status} onChange={updateField('status')}>
              {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Fornecedor</span>
            <input className="input" value={form.provider} onChange={updateField('provider')} placeholder="Meta, Google, Zenvia..." />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="app-filter-label">Nome publico</span>
            <input className="input" value={form.public_label} onChange={updateField('public_label')} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="app-filter-label">Numero principal</span>
            <input className="input" value={form.business_main_phone} onChange={updateField('business_main_phone')} />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Numero operacional</span>
            <input className="input" value={form.operational_phone} onChange={updateField('operational_phone')} />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Tracking</span>
            <input className="input" value={form.tracking_phone} onChange={updateField('tracking_phone')} />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Destino</span>
            <input className="input" value={form.destination_phone} onChange={updateField('destination_phone')} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="app-filter-label">Meta WABA ID</span>
            <input className="input" value={form.meta_waba_id} onChange={updateField('meta_waba_id')} />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Meta Phone ID</span>
            <input className="input" value={form.meta_phone_number_id} onChange={updateField('meta_phone_number_id')} />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Google Customer ID</span>
            <input className="input" value={form.google_customer_id} onChange={updateField('google_customer_id')} />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          {editingId && <button type="button" className="btn btn-secondary text-sm" onClick={resetForm}>Cancelar</button>}
          <button type="submit" className="btn btn-primary text-sm" disabled={saving}>
            {saving ? 'Salvando...' : editingId ? 'Salvar canal' : 'Criar canal'}
          </button>
        </div>
      </form>

      <div className="card sol-surface-card mt-3 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">Nenhum canal cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="app-table w-full">
              <thead>
                <tr>
                  <th>Canal</th>
                  <th>Tipo</th>
                  <th>Provider</th>
                  <th>Numeros</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-semibold text-main">{item.nome}</div>
                      <div className="text-xs text-muted">{item.public_label || '-'}</div>
                    </td>
                    <td className="text-sm text-sub">{TYPE_LABEL[item.type] || item.type}</td>
                    <td className="text-sm text-sub">{item.provider || '-'}</td>
                    <td className="text-xs text-muted">
                      <div>Principal: {item.business_main_phone || '-'}</div>
                      <div>Operacional: {item.operational_phone || '-'}</div>
                      <div>Tracking: {item.tracking_phone || '-'}</div>
                    </td>
                    <td><span className="app-status-pill bg-elevated text-main">{STATUS_LABEL[item.status] || item.status}</span></td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-secondary text-xs" onClick={() => edit(item)}>Editar</button>
                        <button type="button" className="btn btn-secondary text-xs text-red-600" onClick={() => remove(item.id)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
