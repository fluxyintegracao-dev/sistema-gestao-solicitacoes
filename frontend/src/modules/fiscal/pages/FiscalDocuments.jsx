import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  generateFiscalDocumentDanfe,
  getFiscalCompanies,
  getFiscalDocumentFileUrl,
  getFiscalDocuments,
  uploadFiscalXml
} from '../services/fiscalApi';

export default function FiscalDocuments() {
  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({
    company_id: '',
    status: '',
    document_type: '',
    source: '',
    manifestation_status: '',
    issuer_cnpj: '',
    emission_start: '',
    emission_end: '',
    min_value: '',
    max_value: '',
    has_xml: '',
    has_pdf: '',
    q: ''
  });
  const [uploadCompanyId, setUploadCompanyId] = useState('');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingFile, setOpeningFile] = useState('');
  const [generatingDanfe, setGeneratingDanfe] = useState('');
  const [importReport, setImportReport] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [documentsResult, companiesResult] = await Promise.all([
        getFiscalDocuments(filters),
        getFiscalCompanies({ ativo: true })
      ]);
      setDocuments(documentsResult?.data || []);
      const nextCompanies = companiesResult?.data || [];
      setCompanies(nextCompanies);
      setUploadCompanyId((current) => current || String(nextCompanies[0]?.id || ''));
    } catch (err) {
      setError(err.message || 'Erro ao buscar documentos fiscais');
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

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const submitFilters = async (event) => {
    event.preventDefault();
    await load();
  };

  const clearFilters = async () => {
    const emptyFilters = {
      company_id: '',
      status: '',
      document_type: '',
      source: '',
      manifestation_status: '',
      issuer_cnpj: '',
      emission_start: '',
      emission_end: '',
      min_value: '',
      max_value: '',
      has_xml: '',
      has_pdf: '',
      q: ''
    };
    setFilters(emptyFilters);
    setLoading(true);
    setError('');
    try {
      const result = await getFiscalDocuments(emptyFilters);
      setDocuments(result?.data || []);
    } catch (err) {
      setError(err.message || 'Erro ao limpar filtros fiscais');
    } finally {
      setLoading(false);
    }
  };

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

  const generateDanfe = async (documentId) => {
    setGeneratingDanfe(String(documentId));
    setError('');
    try {
      const result = await generateFiscalDocumentDanfe(documentId);
      if (result?.url) window.open(result.url, '_blank', 'noopener,noreferrer');
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao gerar DANFE fiscal');
    } finally {
      setGeneratingDanfe('');
    }
  };

  const submitUpload = async (event) => {
    event.preventDefault();
    if (!uploadCompanyId || !uploadFiles.length) {
      setError('Selecione a empresa fiscal e ao menos um XML ou ZIP fiscal.');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');
    try {
      const result = await uploadFiscalXml({ companyId: uploadCompanyId, files: uploadFiles });
      setImportReport(result || null);
      const falhas = Number(result?.failed_count || 0);
      const importados = Number(result?.imported_count || 0);
      const duplicados = Number(result?.duplicate_count || 0);
      setMessage(
        falhas
          ? `${importados} XML(s) importado(s), ${duplicados} reimportado(s) e ${falhas} arquivo(s) com erro.`
          : `${importados} XML(s) importado(s) com sucesso. ${duplicados ? `${duplicados} ja existiam e foram atualizados.` : ''}`
      );
      setUploadFiles([]);
      event.target.reset();
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao importar XML fiscal');
      setImportReport(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fiscal-page space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fiscal</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Documentos fiscais</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Caixa de documentos DFe com importacao manual de XMLs individuais ou ZIP exportado por outro sistema.</p>
        </div>
        <form onSubmit={submitUpload} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
          <select className="input min-w-[220px]" value={uploadCompanyId} onChange={(event) => setUploadCompanyId(event.target.value)} required>
            <option value="">Empresa fiscal</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.razao_social}</option>
            ))}
          </select>
          <label className="input flex min-w-[260px] cursor-pointer items-center justify-between gap-3">
            <span className="truncate text-sm text-slate-700 dark:text-slate-200">
              {uploadFiles.length ? `${uploadFiles.length} arquivo(s) selecionado(s)` : 'Selecionar XMLs ou ZIP'}
            </span>
            <input
              className="sr-only"
              type="file"
              accept=".xml,.zip,application/xml,text/xml,application/zip"
              multiple
              onChange={(event) => setUploadFiles(Array.from(event.target.files || []))}
              required
            />
          </label>
          <button className="btn-primary whitespace-nowrap" type="submit" disabled={uploading}>{uploading ? 'Importando...' : 'Importar XML/ZIP'}</button>
        </form>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
      {importReport ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Relatorio de importacao</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {Number(importReport.total || 0)} XML(s) lido(s), {Number(importReport.imported_count || 0)} processado(s),
                {' '}{Number(importReport.duplicate_count || 0)} reimportado(s) e {Number(importReport.failed_count || 0)} com erro.
              </p>
            </div>
            <button className="btn-secondary btn-sm" type="button" onClick={() => setImportReport(null)}>Fechar</button>
          </div>
          {importReport.failed?.length ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-red-200 dark:border-red-900/60">
              <table className="min-w-full divide-y divide-red-100 text-sm dark:divide-red-900/60">
                <thead className="bg-red-50 text-left text-xs font-semibold uppercase text-red-700 dark:bg-red-950/30 dark:text-red-200">
                  <tr>
                    <th className="px-4 py-3">Arquivo</th>
                    <th className="px-4 py-3">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-red-900/60">
                  {importReport.failed.map((item, index) => (
                    <tr key={`${item.original_name}-${index}`}>
                      <td className="max-w-[520px] truncate px-4 py-3 text-slate-700 dark:text-slate-200" title={item.original_name}>{item.original_name}</td>
                      <td className="px-4 py-3 text-red-700 dark:text-red-200">{item.error || 'Erro ao importar XML fiscal.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      <form onSubmit={submitFilters} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input
            className="input"
            placeholder="Busca por chave, fornecedor ou numero"
            value={filters.q}
            onChange={(event) => updateFilter('q', event.target.value)}
          />
          <select className="input" value={filters.company_id} onChange={(event) => updateFilter('company_id', event.target.value)}>
            <option value="">Todas as empresas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.razao_social}</option>
            ))}
          </select>
          <select className="input" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">Todos os status</option>
            <option value="pending_link">Pendente de vinculo</option>
            <option value="linked_to_order">Vinculado</option>
            <option value="with_divergence">Com divergencia</option>
            <option value="validated">Validado</option>
            <option value="ignored">Ignorado</option>
            <option value="xml_downloaded">XML baixado</option>
            <option value="discovered">Descoberto</option>
          </select>
          <select className="input" value={filters.document_type} onChange={(event) => updateFilter('document_type', event.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="nfe">NFe</option>
            <option value="cte">CTe</option>
            <option value="nfse">NFSe</option>
          </select>
          <select className="input" value={filters.source} onChange={(event) => updateFilter('source', event.target.value)}>
            <option value="">Todas as origens</option>
            <option value="manual_upload">Upload manual</option>
            <option value="sefaz_distribution">SEFAZ</option>
            <option value="batch_import">Importacao em lote</option>
          </select>
          <select className="input" value={filters.manifestation_status} onChange={(event) => updateFilter('manifestation_status', event.target.value)}>
            <option value="">Manifestacao</option>
            <option value="pending">Pendente</option>
            <option value="not_required">Nao requerida</option>
            <option value="ciencia_operacao">Ciencia</option>
            <option value="confirmacao_operacao">Confirmacao</option>
            <option value="desconhecimento_operacao">Desconhecimento</option>
            <option value="operacao_nao_realizada">Operacao nao realizada</option>
          </select>
          <input
            className="input"
            placeholder="CNPJ fornecedor"
            value={filters.issuer_cnpj}
            onChange={(event) => updateFilter('issuer_cnpj', event.target.value)}
          />
          <input
            className="input"
            type="date"
            value={filters.emission_start}
            onChange={(event) => updateFilter('emission_start', event.target.value)}
            aria-label="Emissao inicial"
          />
          <input
            className="input"
            type="date"
            value={filters.emission_end}
            onChange={(event) => updateFilter('emission_end', event.target.value)}
            aria-label="Emissao final"
          />
          <input
            className="input"
            placeholder="Valor minimo"
            value={filters.min_value}
            onChange={(event) => updateFilter('min_value', event.target.value)}
          />
          <input
            className="input"
            placeholder="Valor maximo"
            value={filters.max_value}
            onChange={(event) => updateFilter('max_value', event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={filters.has_xml} onChange={(event) => updateFilter('has_xml', event.target.value)}>
              <option value="">XML</option>
              <option value="true">Com XML</option>
              <option value="false">Sem XML</option>
            </select>
            <select className="input" value={filters.has_pdf} onChange={(event) => updateFilter('has_pdf', event.target.value)}>
              <option value="">PDF</option>
              <option value="true">Com PDF</option>
              <option value="false">Sem PDF</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-secondary" type="button" onClick={clearFilters}>Limpar</button>
          <button className="btn-primary" type="submit">Filtrar</button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40">
            <tr>
              <th className="px-4 py-3">Emissao</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Chave</th>
              <th className="px-4 py-3">Numero</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Arquivos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={7}>Carregando documentos...</td></tr>
            ) : documents.length ? documents.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.emission_date ? new Date(item.emission_date).toLocaleDateString('pt-BR') : '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">
                  <Link className="hover:text-blue-600" to={`/fiscal/documentos/${item.id}`}>
                    {item.issuer_name || item.issuer_cnpj || '-'}
                  </Link>
                </td>
                <td className="max-w-[240px] truncate px-4 py-3 text-xs text-slate-500" title={item.access_key}>{item.access_key || '-'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.document_number || '-'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{Number(item.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.document_status}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link className="btn-secondary btn-sm" to={`/fiscal/documentos/${item.id}`}>
                      Detalhes
                    </Link>
                    {item.xml_storage_key ? (
                      <button className="btn-secondary btn-sm" type="button" onClick={() => openFile(item.id, 'xml')} disabled={openingFile === `${item.id}-xml`}>
                        XML
                      </button>
                    ) : null}
                    {item.pdf_storage_key ? (
                      <button className="btn-secondary btn-sm" type="button" onClick={() => openFile(item.id, 'pdf')} disabled={openingFile === `${item.id}-pdf`}>
                        PDF
                      </button>
                    ) : null}
                    {item.xml_storage_key ? (
                      <button
                        className="btn-secondary btn-sm"
                        type="button"
                        onClick={() => (item.danfe_storage_key ? openFile(item.id, 'pdf') : generateDanfe(item.id))}
                        disabled={generatingDanfe === String(item.id) || openingFile === `${item.id}-pdf`}
                      >
                        {generatingDanfe === String(item.id) ? 'Gerando...' : 'DANFE'}
                      </button>
                    ) : null}
                    {!item.xml_storage_key && !item.pdf_storage_key && !item.danfe_storage_key ? (
                      <span className="text-xs text-slate-400">Indisponivel</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={7}>Nenhum documento fiscal encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
