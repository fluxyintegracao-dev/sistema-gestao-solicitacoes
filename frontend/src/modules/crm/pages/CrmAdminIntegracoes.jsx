import { useEffect, useState } from 'react';
import {
  atualizarIntegracoesCrm,
  listarEventosGoogleCrm,
  listarEventosMetaCrm,
  obterIntegracoesCrm,
  reprocessarEventoGoogleCrm,
  reprocessarEventoMetaCrm
} from '../../../services/crm';
import { API_ORIGIN } from '../../../services/api';

const API_BASE_URL = API_ORIGIN || window.location.origin;

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function StatusPill({ status }) {
  const cls = status === 'PROCESSED'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'ERROR'
      ? 'bg-red-100 text-red-700'
      : status === 'DUPLICATE'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-elevated text-main';

  return <span className={`app-status-pill ${cls}`}>{status || '-'}</span>;
}

function VinculosEvento({ event }) {
  const lead = event.processedLead;
  const conversation = event.processedConversation;
  const message = event.processedMessage;

  if (!lead && !conversation && !message) {
    return <span className="text-xs text-muted">Sem vínculo ainda</span>;
  }

  return (
    <div className="space-y-1 text-xs">
      {lead ? <div className="text-main">Lead #{lead.id} • {lead.nome || '-'}</div> : null}
      {conversation ? <div className="text-sub">Conversa #{conversation.id} • {conversation.channel_type} • {conversation.status}</div> : null}
      {message ? <div className="text-muted">Mensagem #{message.id} • {message.message_type}</div> : null}
    </div>
  );
}

function EventosTabela({ title, events, loading, onReprocess }) {
  return (
    <div className="card sol-surface-card overflow-hidden">
      <div className="p-4 border-b border-base flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-main">{title}</h2>
          <p className="text-xs text-muted">Ultimos eventos recebidos e processados pelo CRM.</p>
        </div>
      </div>
      {loading ? (
        <div className="p-8 text-center text-muted text-sm">Carregando...</div>
      ) : events.length === 0 ? (
        <div className="p-8 text-center text-muted text-sm">Nenhum evento registrado.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="app-table w-full">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Campanha</th>
                <th>Status</th>
                <th>Vinculos</th>
                <th>Recebido em</th>
                <th>Erro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <div className="font-medium text-main">{event.external_event_id || `#${event.id}`}</div>
                    <div className="text-xs text-muted">{event.event_type || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-sub">{event.campaign_name || '-'}</div>
                    <div className="text-xs text-muted">{event.adset_name || event.ad_group_name || event.asset_name || '-'}</div>
                  </td>
                  <td><StatusPill status={event.processing_status} /></td>
                  <td><VinculosEvento event={event} /></td>
                  <td className="text-sm text-sub whitespace-nowrap">{fmtDate(event.received_at)}</td>
                  <td className="text-xs text-muted max-w-xs truncate">{event.error_message || '-'}</td>
                  <td>
                    {event.processing_status === 'ERROR' && (
                      <button className="btn btn-secondary text-xs" onClick={() => onReprocess(event.id)}>
                        Reprocessar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CrmAdminIntegracoes() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({ meta_verify_token: '', meta_webhook_secret: '', google_webhook_secret: '' });
  const [metaEvents, setMetaEvents] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [cfg, meta, google] = await Promise.all([
        obterIntegracoesCrm(),
        listarEventosMetaCrm({ limit: 20 }),
        listarEventosGoogleCrm({ limit: 20 })
      ]);
      setConfig(cfg);
      setForm((prev) => ({
        ...prev,
        meta_verify_token: cfg?.meta?.verify_token || ''
      }));
      setMetaEvents(meta?.events || []);
      setGoogleEvents(google?.events || []);
    } catch (err) {
      alert(err.message || 'Erro ao carregar integracoes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function updateField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { meta_verify_token: form.meta_verify_token };
      if (form.meta_webhook_secret.trim()) payload.meta_webhook_secret = form.meta_webhook_secret.trim();
      if (form.google_webhook_secret.trim()) payload.google_webhook_secret = form.google_webhook_secret.trim();
      const updated = await atualizarIntegracoesCrm(payload);
      setConfig(updated);
      setForm((prev) => ({ ...prev, meta_webhook_secret: '', google_webhook_secret: '' }));
      alert('Configuracoes salvas.');
    } catch (err) {
      alert(err.message || 'Erro ao salvar integracoes');
    } finally {
      setSaving(false);
    }
  }

  async function reprocessMeta(id) {
    try {
      await reprocessarEventoMetaCrm(id);
      await load();
    } catch (err) {
      alert(err.message || 'Erro ao reprocessar evento Meta');
    }
  }

  async function reprocessGoogle(id) {
    try {
      await reprocessarEventoGoogleCrm(id);
      await load();
    } catch (err) {
      alert(err.message || 'Erro ao reprocessar evento Google');
    }
  }

  const metaWebhookUrl = `${API_BASE_URL}${config?.meta?.webhook_path || '/api/crm/webhooks/meta'}`;
  const googleWebhookUrl = `${API_BASE_URL}${config?.google?.webhook_path || '/api/crm/webhooks/google'}`;

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Integracoes CRM</h1>
            <p className="page-subtitle">Webhooks e processamento base para Meta Ads e Google Ads.</p>
          </div>
          <button className="btn btn-secondary text-sm" onClick={load} disabled={loading}>Atualizar</button>
        </div>
      </div>

      <form onSubmit={submit} className="card sol-surface-card p-5 mt-3 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-base bg-elevated p-4 space-y-3">
            <div>
              <h2 className="font-semibold text-main">Meta Ads</h2>
              <p className="text-xs text-muted">Use esta URL no app Meta para verificacao e recebimento dos eventos.</p>
            </div>
            <input className="input font-mono text-xs" value={metaWebhookUrl} readOnly />
            <label className="space-y-1 block">
              <span className="app-filter-label">Verify token</span>
              <input className="input" value={form.meta_verify_token} onChange={updateField('meta_verify_token')} />
            </label>
            <label className="space-y-1 block">
              <span className="app-filter-label">Webhook secret</span>
              <input className="input" value={form.meta_webhook_secret} onChange={updateField('meta_webhook_secret')} placeholder={config?.meta?.webhook_secret_configurado ? 'Configurado. Preencha para trocar.' : 'Nao configurado'} />
            </label>
          </div>

          <div className="rounded-2xl border border-base bg-elevated p-4 space-y-3">
            <div>
              <h2 className="font-semibold text-main">Google Ads</h2>
              <p className="text-xs text-muted">Endpoint base para eventos de chamada, tracking e origem Google.</p>
            </div>
            <input className="input font-mono text-xs" value={googleWebhookUrl} readOnly />
            <label className="space-y-1 block">
              <span className="app-filter-label">Webhook secret</span>
              <input className="input" value={form.google_webhook_secret} onChange={updateField('google_webhook_secret')} placeholder={config?.google?.webhook_secret_configurado ? 'Configurado. Preencha para trocar.' : 'Nao configurado'} />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary text-sm" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar configuracoes'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <EventosTabela title="Eventos Meta" events={metaEvents} loading={loading} onReprocess={reprocessMeta} />
        <EventosTabela title="Eventos Google" events={googleEvents} loading={loading} onReprocess={reprocessGoogle} />
      </div>
    </div>
  );
}
