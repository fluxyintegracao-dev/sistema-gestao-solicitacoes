import { useEffect, useState } from 'react';
import { getFiscalDocuments } from '../services/fiscalApi';

export default function FiscalDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getFiscalDocuments()
      .then((result) => {
        if (mounted) setDocuments(result?.data || []);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Erro ao buscar documentos fiscais');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fiscal</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Documentos fiscais</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Caixa inicial de documentos DFe. A sincronizacao SEFAZ real ainda nao esta ativa nesta fase.</p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40">
            <tr>
              <th className="px-4 py-3">Emissao</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Numero</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={5}>Carregando documentos...</td></tr>
            ) : documents.length ? documents.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.emission_date ? new Date(item.emission_date).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{item.issuer_name || item.issuer_cnpj || '-'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.document_number || '-'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{Number(item.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.document_status}</td>
              </tr>
            )) : (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={5}>Nenhum documento fiscal encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
