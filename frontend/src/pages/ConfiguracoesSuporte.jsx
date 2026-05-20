import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getSuporteWhatsapp,
  salvarSuporteWhatsapp
} from '../services/configuracoesSistema';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function maskPhone(value) {
  const digits = onlyDigits(value).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function ConfiguracoesSuporte() {
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getSuporteWhatsapp()
      .then((data) => {
        if (!active) return;
        setWhatsapp(maskPhone(data?.whatsapp || ''));
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar configuracao de suporte.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const previewUrl = useMemo(() => {
    const digits = onlyDigits(whatsapp);
    if (!digits) return '';
    const normalized = digits.startsWith('55') ? digits : `55${digits}`;
    return `https://wa.me/${normalized}`;
  }, [whatsapp]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage(null);
    setSaving(true);

    try {
      const data = await salvarSuporteWhatsapp({ whatsapp });
      setWhatsapp(maskPhone(data?.whatsapp || ''));
      setMessage('WhatsApp de suporte atualizado.');
    } catch (err) {
      setError(err?.message || 'Erro ao salvar WhatsApp de suporte.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="solicitacoes-page config-page space-y-5 md:space-y-6">
      <header className="config-page-header">
        <div className="config-page-header-row">
          <div>
            <p className="config-summary-kicker">Suporte</p>
            <h1 className="config-page-title">WhatsApp do Suporte</h1>
            <p className="config-page-subtitle">
              Defina o numero usado pelo botao Suporte no topo do sistema.
            </p>
          </div>
          <Link to="/configuracoes" className="btn btn-outline">
            Voltar
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="config-summary-card">
        <div className="w-full max-w-2xl space-y-4">
          <div>
            <label className="app-filter-label" htmlFor="suporte-whatsapp">
              Numero WhatsApp
            </label>
            <input
              id="suporte-whatsapp"
              className="input"
              value={whatsapp}
              onChange={(event) => {
                setWhatsapp(maskPhone(event.target.value));
                setMessage(null);
                setError('');
              }}
              placeholder="(27) 99999-9999"
              disabled={loading || saving}
            />
          </div>

          {previewUrl ? (
            <p className="config-item-description">
              Link gerado: <span className="font-semibold text-slate-900">{previewUrl}</span>
            </p>
          ) : (
            <p className="config-item-description">
              Informe DDD e numero. O sistema adiciona o DDI 55 automaticamente.
            </p>
          )}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn btn-primary" disabled={loading || saving}>
              {saving ? 'Salvando...' : 'Salvar numero'}
            </button>
            {previewUrl ? (
              <a
                className="btn btn-outline"
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
              >
                Testar WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
