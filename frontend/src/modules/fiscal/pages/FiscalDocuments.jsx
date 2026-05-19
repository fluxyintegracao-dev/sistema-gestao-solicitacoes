import { useEffect, useState } from 'react';
import { getFiscalDocumentFileUrl, getFiscalDocuments } from '../services/fiscalApi';

export default function FiscalDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingFile, setOpeningFile] = useState('');
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

  const openFile = async (documentId, type) => {
    setOpeningFile(`${documentId}-${type}`);
    setError('');
    try {
      const result = await getFiscalDocumentFileUrl(documentId, type);
      if (result?.url) window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message || 'Erro ao abrir arquivo fiscal');
    } finally {
      setOpeningFile('');
    }
  };

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
              <th className="px-4 py-3 text-right">Arquivos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={6}>Carregando documentos...</td></tr>
            ) : documents.length ? documents.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.emission_date ? new Date(item.emission_date).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{item.issuer_name || item.issuer_cnpj || '-'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.document_number || '-'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{Number(item.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.document_status}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {item.xml_storage_key ? (
                      <button className="btn-secondary btn-sm" type="button" onClick={() => openFile(item.id, 'xml')} disabled={openingFile === `${item.id}-xml`}>
                        XML
                      </button>
                    ) : null}
                    {(item.pdf_storage_key || item.danfe_storage_key) ? (
                      <button className="btn-secondary btn-sm" type="button" onClick={() => openFile(item.id, 'pdf')} disabled={openingFile === `${item.id}-pdf`}>
                        PDF
                      </button>
                    ) : null}
                    {!item.xml_storage_key && !item.pdf_storage_key && !item.danfe_storage_key ? (
                      <span className="text-xs text-slate-400">Indisponivel</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={6}>Nenhum documento fiscal encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
