import { useEffect, useMemo, useState } from 'react';
import { canManageSstArea } from '../../../utils/acessoProduto';
import { useAuth } from '../../../contexts/AuthContext';
import { useUiVisibility } from '../../../hooks/useUiVisibility';
import {
  assinarXmlEsocialSst,
  consultarRetornoEsocialSst,
  criarLoteRestritaEsocialSst,
  enviarLoteRestritaEsocialSst,
  gerarXmlEsocialSst,
  getEsocialCertificadoStatusSst,
  getEsocialEventosSst,
  getEsocialLotesSst,
  validarXmlEsocialSst
} from '../services/sst';

function statusClass(status) {
  const value = String(status || '').toUpperCase();
  if (value.includes('VALID') || value.includes('GERADO') || value.includes('ASSINADO')) return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
  if (value.includes('BLOQUEADO') || value.includes('PENDENCIA')) return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (value.includes('ERRO') || value.includes('INVALIDO')) return 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200';
  return 'border-[var(--c-border)] bg-[var(--c-surface-muted)] text-[var(--c-text)]';
}

export default function SstEsocial() {
  const { user } = useAuth();
  const { isVisible } = useUiVisibility();
  const canManage = canManageSstArea(user, 'esocial');
  const [eventos, setEventos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [certStatus, setCertStatus] = useState(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const load = async () => {
    setLoading(true);
    try {
      const [eventosPayload, lotesPayload, certPayload] = await Promise.all([
        getEsocialEventosSst({ limit: 100 }),
        getEsocialLotesSst({ limit: 50 }),
        getEsocialCertificadoStatusSst()
      ]);
      setEventos(eventosPayload.rows || []);
      setLotes(lotesPayload.rows || []);
      setCertStatus(certPayload);
      setError('');
    } catch (err) {
      setError(err.message || 'Erro ao carregar eSocial SST');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runEventAction = async (eventId, action, label) => {
    setActionId(`${label}-${eventId}`);
    try {
      const payload = await action(eventId);
      setMessage(`${label}: ${payload.status || payload?.evento?.status || 'concluido'}.`);
      await load();
    } catch (err) {
      setError(err.message || `Erro em ${label}`);
    } finally {
      setActionId('');
    }
  };

  const createBatch = async () => {
    setActionId('lote');
    try {
      const payload = await criarLoteRestritaEsocialSst(selected);
      setMessage(`Lote restrito criado: #${payload.id}.`);
      setSelected([]);
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao criar lote restrito');
    } finally {
      setActionId('');
    }
  };

  const runBatchAction = async (loteId, action, label) => {
    setActionId(`${label}-${loteId}`);
    try {
      const payload = await action(loteId);
      setMessage(`${label}: ${payload.status || 'concluido'}.`);
      await load();
    } catch (err) {
      setError(err.message || `Erro em ${label}`);
    } finally {
      setActionId('');
    }
  };

  return (
    <div className="sst-page space-y-5">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">SST / eSocial</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--c-text)]">Integração eSocial controlada</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--c-muted)]">
              Geração, validação, assinatura e transmissão restrita dos eventos S-2210, S-2220 e S-2240 com produção oficial bloqueada.
            </p>
          </div>
          <button type="button" onClick={load} className="rounded-lg border border-[var(--c-border)] px-4 py-2 text-sm font-semibold text-[var(--c-text)] hover:bg-[var(--c-surface-muted)]">
            Atualizar
          </button>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">Ambiente</p>
          <p className="mt-2 text-lg font-semibold text-[var(--c-text)]">Produção restrita</p>
          <p className="mt-1 text-sm text-[var(--c-muted)]">Produção oficial permanece bloqueada por regra de backend.</p>
        </div>
        {isVisible('sst.esocial.certificado') ? (
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">Certificado A1</p>
          <p className="mt-2 text-lg font-semibold text-[var(--c-text)]">{certStatus?.status || 'Nao validado'}</p>
          <p className="mt-1 text-sm text-[var(--c-muted)]">{certStatus?.errors?.[0] || 'Metadados seguros, sem expor senha ou caminho.'}</p>
        </div>
        ) : null}
        {isVisible('sst.esocial.acoes_xml') ? (
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">Lote restrito</p>
          <button
            type="button"
            disabled={!canManage || !selected.length || actionId === 'lote'}
            onClick={createBatch}
            className="mt-3 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600"
          >
            {actionId === 'lote' ? 'Gerando...' : `Criar lote (${selected.length})`}
          </button>
        </div>
        ) : null}
      </section>

      {isVisible('sst.esocial.tabela') ? (
      <section className="overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Eventos preparados</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">{loading ? 'Carregando' : `${eventos.length} evento(s)`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--c-surface-muted)] text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">
              <tr>
                <th className="px-4 py-3">Selecionar</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ambiente</th>
                <th className="px-4 py-3">Protocolo</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {eventos.map((evento) => (
                <tr key={evento.id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(evento.id)}
                      onChange={(event) => setSelected((current) => (event.target.checked ? [...current, evento.id] : current.filter((id) => id !== evento.id)))}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{evento.tipo_evento}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(evento.status)}`}>{evento.status}</span></td>
                  <td className="px-4 py-3 text-[var(--c-muted)]">{evento.ambiente || '-'}</td>
                  <td className="px-4 py-3 text-[var(--c-muted)]">{evento.protocolo || '-'}</td>
                  <td className="space-x-3 whitespace-nowrap px-4 py-3">
                    <button type="button" disabled={!canManage || Boolean(actionId)} onClick={() => runEventAction(evento.id, gerarXmlEsocialSst, 'Gerar XML')} className="text-sm font-semibold text-sky-700 disabled:opacity-50">Gerar XML</button>
                    <button type="button" disabled={!canManage || Boolean(actionId)} onClick={() => runEventAction(evento.id, validarXmlEsocialSst, 'Validar XML')} className="text-sm font-semibold text-emerald-700 disabled:opacity-50">Validar</button>
                    <button type="button" disabled={!canManage || Boolean(actionId)} onClick={() => runEventAction(evento.id, assinarXmlEsocialSst, 'Assinar XML')} className="text-sm font-semibold text-indigo-700 disabled:opacity-50">Assinar</button>
                  </td>
                </tr>
              ))}
              {!eventos.length && !loading ? (
                <tr><td className="px-4 py-8 text-center text-sm text-[var(--c-muted)]" colSpan={6}>Nenhum evento preparado.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {isVisible('sst.esocial.lotes') ? (
      <section className="overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] shadow-sm">
        <div className="border-b border-[var(--c-border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Lotes restritos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--c-surface-muted)] text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">
              <tr>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ambiente</th>
                <th className="px-4 py-3">Protocolo</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {lotes.map((lote) => (
                <tr key={lote.id}>
                  <td className="px-4 py-3 font-semibold text-[var(--c-text)]">#{lote.id}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(lote.status)}`}>{lote.status}</span></td>
                  <td className="px-4 py-3 text-[var(--c-muted)]">{lote.ambiente}</td>
                  <td className="px-4 py-3 text-[var(--c-muted)]">{lote.protocolo || '-'}</td>
                  <td className="space-x-3 whitespace-nowrap px-4 py-3">
                    <button type="button" disabled={!canManage || Boolean(actionId)} onClick={() => runBatchAction(lote.id, enviarLoteRestritaEsocialSst, 'Enviar restrita')} className="text-sm font-semibold text-sky-700 disabled:opacity-50">Enviar restrita</button>
                    <button type="button" disabled={!canManage || Boolean(actionId)} onClick={() => runBatchAction(lote.id, consultarRetornoEsocialSst, 'Consultar retorno')} className="text-sm font-semibold text-emerald-700 disabled:opacity-50">Consultar</button>
                  </td>
                </tr>
              ))}
              {!lotes.length && !loading ? (
                <tr><td className="px-4 py-8 text-center text-sm text-[var(--c-muted)]" colSpan={5}>Nenhum lote restrito criado.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}
    </div>
  );
}
