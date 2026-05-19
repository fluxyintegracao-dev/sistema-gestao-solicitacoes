import { useEffect, useMemo, useState } from 'react';
import {
  createFiscalAccountingBatch,
  generateFiscalAccountingBatch,
  getFiscalAccountingBatch,
  getFiscalAccountingBatches,
  getFiscalAccountingBatchZipUrl,
  getFiscalCompanies
} from '../services/fiscalApi';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

export default function FiscalAccountingBatches() {
  const today = useMemo(() => new Date(), []);
  const [companies, setCompanies] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [form, setForm] = useState({
    fiscal_company_id: '',
    reference_month: String(today.getMonth() + 1),
    reference_year: String(today.getFullYear())
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [openingZip, setOpeningZip] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [batchesResult, companiesResult] = await Promise.all([
        getFiscalAccountingBatches(),
        getFiscalCompanies({ ativo: true })
      ]);
      setBatches(batchesResult?.data || []);
      const nextCompanies = companiesResult?.data || [];
      setCompanies(nextCompanies);
      setForm((current) => ({
        ...current,
        fiscal_company_id: current.fiscal_company_id || String(nextCompanies[0]?.id || '')
      }));
    } catch (err) {
      setError(err.message || 'Erro ao buscar lotes contabeis fiscais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    load().finally(() => {
      if (!mounted) return;
    });
    return () => {
      mounted = false;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const result = await createFiscalAccountingBatch({
        fiscal_company_id: form.fiscal_company_id,
        reference_month: form.reference_month,
        reference_year: form.reference_year
      });
      setMessage(result?.message || 'Lote contabil fiscal processado.');
      setSelectedBatch(result?.batch || null);
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao criar lote contabil fiscal');
    } finally {
      setCreating(false);
    }
  };

  const openBatch = async (id) => {
    setOpening(true);
    setError('');
    try {
      const result = await getFiscalAccountingBatch(id);
      setSelectedBatch(result);
    } catch (err) {
      setError(err.message || 'Erro ao abrir lote contabil fiscal');
    } finally {
      setOpening(false);
    }
  };

  const generateBatchFile = async (id) => {
    setGenerating(true);
    setError('');
    setMessage('');
    try {
      const result = await generateFiscalAccountingBatch(id);
      setMessage('Arquivo ZIP do lote contabil gerado com sucesso.');
      setSelectedBatch(result?.batch || null);
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao gerar arquivo do lote contabil fiscal');
    } finally {
      setGenerating(false);
    }
  };

  const openZip = async (id) => {
    setOpeningZip(true);
    setError('');
    try {
      const result = await getFiscalAccountingBatchZipUrl(id);
      if (result?.url) window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message || 'Erro ao abrir ZIP do lote contabil fiscal');
    } finally {
      setOpeningZip(false);
    }
  };

  return (
    <div className="fiscal-page space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fiscal</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Exportacao contabil</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Lotes em rascunho com documentos fiscais validados. A geracao de ZIP/XML para envio contabil fica para a proxima fase.
          </p>
        </div>
        <form onSubmit={submit} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[minmax(220px,1fr)_110px_110px_auto]">
          <select
            className="input"
            value={form.fiscal_company_id}
            onChange={(event) => setForm((current) => ({ ...current, fiscal_company_id: event.target.value }))}
            required
          >
            <option value="">Empresa fiscal</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.razao_social}</option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            min="1"
            max="12"
            value={form.reference_month}
            onChange={(event) => setForm((current) => ({ ...current, reference_month: event.target.value }))}
            required
            aria-label="Mes"
          />
          <input
            className="input"
            type="number"
            min="2000"
            max="2100"
            value={form.reference_year}
            onChange={(event) => setForm((current) => ({ ...current, reference_year: event.target.value }))}
            required
            aria-label="Ano"
          />
          <button className="btn-primary whitespace-nowrap" type="submit" disabled={creating}>
            {creating ? 'Gerando...' : 'Gerar rascunho'}
          </button>
        </form>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40">
              <tr>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Documentos</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Arquivo</th>
                <th className="px-4 py-3 text-right">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td className="px-4 py-5 text-slate-500" colSpan={7}>Carregando lotes...</td></tr>
              ) : batches.length ? batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{String(batch.reference_month).padStart(2, '0')}/{batch.reference_year}</td>
                  <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{batch.company?.razao_social || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{batch.total_documents || 0}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatMoney(batch.total_value)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{batch.status}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{batch.zip_storage_key ? 'ZIP gerado' : 'Pendente'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary btn-sm" type="button" onClick={() => openBatch(batch.id)} disabled={opening}>
                        Abrir
                      </button>
                      {batch.zip_storage_key ? (
                        <button className="btn-secondary btn-sm" type="button" onClick={() => openZip(batch.id)} disabled={openingZip}>
                          ZIP
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td className="px-4 py-5 text-slate-500" colSpan={7}>Nenhum lote contabil fiscal encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Detalhe do lote</h2>
          {selectedBatch ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="block text-slate-500">Periodo</span>
                  <strong className="text-slate-950 dark:text-white">{String(selectedBatch.reference_month).padStart(2, '0')}/{selectedBatch.reference_year}</strong>
                </div>
                <div>
                  <span className="block text-slate-500">Status</span>
                  <strong className="text-slate-950 dark:text-white">{selectedBatch.status}</strong>
                </div>
                <div>
                  <span className="block text-slate-500">Documentos</span>
                  <strong className="text-slate-950 dark:text-white">{selectedBatch.total_documents || 0}</strong>
                </div>
                <div>
                  <span className="block text-slate-500">Valor total</span>
                  <strong className="text-slate-950 dark:text-white">{formatMoney(selectedBatch.total_value)}</strong>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => generateBatchFile(selectedBatch.id)}
                  disabled={generating}
                >
                  {generating ? 'Gerando ZIP...' : 'Gerar ZIP'}
                </button>
                {selectedBatch.zip_storage_key ? (
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => openZip(selectedBatch.id)}
                    disabled={openingZip}
                  >
                    Abrir ZIP
                  </button>
                ) : null}
              </div>

              <div className="space-y-2">
                {(selectedBatch.items || []).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                    <p className="font-medium text-slate-950 dark:text-white">{item.document?.issuer_name || item.document?.issuer_cnpj || '-'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      NF {item.document?.document_number || '-'} - {formatDate(item.document?.emission_date)} - {formatMoney(item.document?.total_value)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      XML: {item.included_xml ? 'sim' : 'nao'} | PDF/DANFE: {item.included_pdf ? 'sim' : 'nao'}
                    </p>
                  </div>
                ))}
                {!selectedBatch.items?.length ? <p className="text-sm text-slate-500">Abra um lote para ver os documentos incluidos.</p> : null}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Selecione um lote para conferir os documentos que entraram no rascunho.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
