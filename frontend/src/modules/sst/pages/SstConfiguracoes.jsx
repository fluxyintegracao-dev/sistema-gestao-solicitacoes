import { useEffect, useMemo, useState } from 'react';
import { getSstConfig, salvarSstConfig } from '../services/sst';

const LIST_FIELDS = [
  ['tipos_risco', 'Tipos de risco'],
  ['severidades', 'Severidades'],
  ['probabilidades', 'Probabilidades'],
  ['tipos_exame', 'Tipos de exame'],
  ['status_exame', 'Status de exame'],
  ['tipos_documento', 'Tipos de documento'],
  ['status_documento', 'Status de documento'],
  ['tipos_acidente', 'Tipos de acidente/incidente'],
  ['gravidades_acidente', 'Gravidades'],
  ['status_epi', 'Status de EPI'],
  ['status_programa', 'Status de PGR/PCMSO'],
  ['eventos_esocial', 'Eventos eSocial preparados'],
  ['status_esocial', 'Status eSocial']
];

const ESOCIAL_AMBIENTES = ['NAO_CONFIGURADO', 'PRODUCAO_RESTRITA', 'PRODUCAO'];

function listToText(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function textToList(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

export default function SstConfiguracoes() {
  const [form, setForm] = useState({ dias_alerta_validade: 30 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getSstConfig()
      .then((data) => {
        if (active) setForm(data || {});
      })
      .catch((err) => {
        if (active) setMessage(err.message || 'Erro ao carregar configuracoes SST');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalItens = useMemo(() => (
    LIST_FIELDS.reduce((acc, [key]) => acc + (Array.isArray(form[key]) ? form[key].length : 0), 0)
  ), [form]);

  function updateList(key, value) {
    setForm((current) => ({ ...current, [key]: textToList(value) }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const data = await salvarSstConfig(form);
      setForm(data || {});
      setMessage('Configuracoes SST salvas com sucesso.');
    } catch (err) {
      setMessage(err.message || 'Erro ao salvar configuracoes SST');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sst-page space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">SST</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Configuracoes SST</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Parametrize listas operacionais usadas no modulo. Essas configuracoes ajudam a evitar hardcodes e mantem o cadastro alinhado com a realidade da empresa.
        </p>
      </section>

      {message ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-800">{message}</div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="app-summary-card">
          <span className="app-summary-label">Itens configurados</span>
          <strong className="app-summary-value">{totalItens}</strong>
          <span className="app-summary-subvalue">Listas operacionais</span>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Alerta de validade</span>
          <strong className="app-summary-value">{form.dias_alerta_validade || 30} dias</strong>
          <span className="app-summary-subvalue">Vencimentos proximos</span>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">eSocial</span>
          <strong className="app-summary-value">{Array.isArray(form.eventos_esocial) ? form.eventos_esocial.length : 0}</strong>
          <span className="app-summary-subvalue">Eventos preparados</span>
        </div>
      </section>

      <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dias de alerta de validade</span>
            <input
              type="number"
              min="1"
              value={form.dias_alerta_validade || 30}
              onChange={(event) => setForm((current) => ({ ...current, dias_alerta_validade: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ambiente eSocial</span>
            <select
              value={form.esocial_ambiente || 'NAO_CONFIGURADO'}
              onChange={(event) => setForm((current) => ({ ...current, esocial_ambiente: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              {ESOCIAL_AMBIENTES.map((ambiente) => <option key={ambiente} value={ambiente}>{ambiente}</option>)}
            </select>
          </label>
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-start gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.esocial_documentacao_oficial_validada)}
                onChange={(event) => setForm((current) => ({ ...current, esocial_documentacao_oficial_validada: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600"
              />
              Documentacao oficial validada
            </label>
            <label className="flex items-start gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.esocial_transmissao_habilitada)}
                onChange={(event) => setForm((current) => ({ ...current, esocial_transmissao_habilitada: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600"
              />
              Habilitar transmissao futura
            </label>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Observacoes tecnicas eSocial</span>
          <textarea
            value={form.esocial_observacoes_tecnicas || ''}
            onChange={(event) => setForm((current) => ({ ...current, esocial_observacoes_tecnicas: event.target.value }))}
            className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {LIST_FIELDS.map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
              <textarea
                value={listToText(form[key])}
                onChange={(event) => updateList(key, event.target.value)}
                className="mt-1 min-h-32 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || saving}
          className="mt-5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar configuracoes'}
        </button>
      </form>
    </div>
  );
}
