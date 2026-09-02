import { useEffect, useState } from 'react';
import {
  atualizarNumeroCrm,
  criarNumeroCrm,
  excluirNumeroCrm,
  listarNumerosCrm
} from '../../../services/crm';
import { TabelaPadrao } from '../../../components/padrao';

const EMPTY_FORM = {
  label: '',
  phone_number: '',
  country_code: '+55',
  role_type: 'OPERATIONAL',
  provider: '',
  is_whatsapp_enabled: false,
  is_google_ads_enabled: false,
  is_meta_ads_enabled: false,
  display_name: '',
  risk_level: 'LOW',
  can_receive_messages: true,
  can_receive_calls: true,
  forward_to_phone: '',
  status: 'ACTIVE',
  notes: ''
};

const ROLE_LABEL = {
  MAIN: 'Principal',
  OPERATIONAL: 'Operacional',
  TRACKING: 'Tracking',
  DESTINATION: 'Destino'
};

const STATUS_LABEL = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  SUSPENDED: 'Suspenso'
};

const RISK_LABEL = {
  LOW: 'Baixo',
  MEDIUM: 'Medio',
  HIGH: 'Alto'
};

export default function CrmAdminNumeros() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    try {
      const data = await listarNumerosCrm();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(err.message || 'Erro ao carregar numeros');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function updateField(field) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({
      label: item.label || '',
      phone_number: item.phone_number || '',
      country_code: item.country_code || '+55',
      role_type: item.role_type || 'OPERATIONAL',
      provider: item.provider || '',
      is_whatsapp_enabled: Boolean(item.is_whatsapp_enabled),
      is_google_ads_enabled: Boolean(item.is_google_ads_enabled),
      is_meta_ads_enabled: Boolean(item.is_meta_ads_enabled),
      display_name: item.display_name || '',
      risk_level: item.risk_level || 'LOW',
      can_receive_messages: Boolean(item.can_receive_messages),
      can_receive_calls: Boolean(item.can_receive_calls),
      forward_to_phone: item.forward_to_phone || '',
      status: item.status || 'ACTIVE',
      notes: item.notes || ''
    });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await atualizarNumeroCrm(editingId, form);
      } else {
        await criarNumeroCrm(form);
      }
      resetForm();
      await load();
    } catch (err) {
      alert(err.message || 'Erro ao salvar numero');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Excluir este numero CRM?')) return;
    try {
      await excluirNumeroCrm(id);
      await load();
    } catch (err) {
      alert(err.message || 'Erro ao excluir numero');
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Numeros CRM</h1>
            <p className="page-subtitle">Separe numero institucional, operacional, tracking e destino.</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="card sol-surface-card p-5 mt-3 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="app-filter-label">Identificacao</span>
            <input className="input" value={form.label} onChange={updateField('label')} required />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">DDI</span>
            <input className="input" value={form.country_code} onChange={updateField('country_code')} />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Numero</span>
            <input className="input" value={form.phone_number} onChange={updateField('phone_number')} required />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Papel</span>
            <select className="input" value={form.role_type} onChange={updateField('role_type')}>
              {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Provider</span>
            <input className="input" value={form.provider} onChange={updateField('provider')} />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Nome exibido</span>
            <input className="input" value={form.display_name} onChange={updateField('display_name')} />
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Risco</span>
            <select className="input" value={form.risk_level} onChange={updateField('risk_level')}>
              {Object.entries(RISK_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="app-filter-label">Status</span>
            <select className="input" value={form.status} onChange={updateField('status')}>
              {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="app-filter-label">Encaminhar para</span>
            <input className="input" value={form.forward_to_phone} onChange={updateField('forward_to_phone')} />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="app-filter-label">Observacoes</span>
            <input className="input" value={form.notes} onChange={updateField('notes')} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="flex items-center gap-2 text-sm text-sub">
            <input type="checkbox" checked={form.is_whatsapp_enabled} onChange={updateField('is_whatsapp_enabled')} />
            WhatsApp ativo
          </label>
          <label className="flex items-center gap-2 text-sm text-sub">
            <input type="checkbox" checked={form.is_google_ads_enabled} onChange={updateField('is_google_ads_enabled')} />
            Google Ads
          </label>
          <label className="flex items-center gap-2 text-sm text-sub">
            <input type="checkbox" checked={form.is_meta_ads_enabled} onChange={updateField('is_meta_ads_enabled')} />
            Meta Ads
          </label>
          <label className="flex items-center gap-2 text-sm text-sub">
            <input type="checkbox" checked={form.can_receive_messages} onChange={updateField('can_receive_messages')} />
            Recebe mensagens
          </label>
          <label className="flex items-center gap-2 text-sm text-sub">
            <input type="checkbox" checked={form.can_receive_calls} onChange={updateField('can_receive_calls')} />
            Recebe ligacoes
          </label>
        </div>

        <div className="flex justify-end gap-2">
          {editingId && <button type="button" className="btn btn-secondary text-sm" onClick={resetForm}>Cancelar</button>}
          <button type="submit" className="btn btn-primary text-sm" disabled={saving}>
            {saving ? 'Salvando...' : editingId ? 'Salvar numero' : 'Criar numero'}
          </button>
        </div>
      </form>

      <div className="card sol-surface-card mt-3 overflow-hidden">
        <TabelaPadrao
          colunas={[
            {
              id: 'numero',
              titulo: 'Numero',
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => (
                <>
                  <div className="font-semibold text-main">{item.label}</div>
                  <div className="text-xs text-muted">{item.country_code} {item.phone_number}</div>
                </>
              )
            },
            {
              id: 'papel',
              titulo: 'Papel',
              tipo: 'badge',
              render: (item) => <span className="text-sm text-sub">{ROLE_LABEL[item.role_type] || item.role_type}</span>
            },
            {
              id: 'provider',
              titulo: 'Provider',
              tipo: 'texto',
              render: (item) => <span className="text-sm text-sub">{item.provider || '-'}</span>
            },
            {
              id: 'uso',
              titulo: 'Uso',
              tipo: 'texto',
              render: (item) => (
                <div className="text-xs text-muted">
                  <div>WhatsApp: {item.is_whatsapp_enabled ? 'sim' : 'nao'}</div>
                  <div>Meta: {item.is_meta_ads_enabled ? 'sim' : 'nao'} | Google: {item.is_google_ads_enabled ? 'sim' : 'nao'}</div>
                </div>
              )
            },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'status',
              render: (item) => (
                <span className="app-status-pill bg-elevated text-main">{STATUS_LABEL[item.status] || item.status}</span>
              )
            }
          ]}
          itens={items}
          getId={(item) => item.id}
          carregando={loading}
          vazio="Nenhum numero cadastrado."
          storageKey="tabela:crm-admin-numeros"
          rotuloRolagem="Numeros CRM"
          acoesLinha={(item) => (
            <>
              <button type="button" className="btn btn-secondary text-xs" onClick={() => edit(item)}>Editar</button>
              <button type="button" className="btn btn-secondary text-xs text-red-600" onClick={() => remove(item.id)}>Excluir</button>
            </>
          )}
          larguraAcoes={200}
        />
      </div>
    </div>
  );
}
