import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createFiscalDivergence,
  getFiscalDocument,
  getFiscalDocumentFileUrl,
  getFiscalLinkOptions,
  ignoreFiscalDocument,
  linkFiscalDocument,
  suggestFiscalDocumentLinks,
  updateFiscalDivergence,
  updateFiscalDocumentLink,
  uploadFiscalDocumentFile,
  validateFiscalDocument
} from '../services/fiscalApi';

const LINK_SEARCH_TYPES = [
  { value: 'solicitacao', label: 'Solicitacao', field: 'solicitacao_id' },
  { value: 'solicitacao_compra', label: 'Solicitacao de compra', field: 'solicitacao_compra_id' },
  { value: 'pedido', label: 'Pedido', field: 'pedido_id' },
  { value: 'pedido_item', label: 'Item do pedido', field: 'pedido_item_id' },
  { value: 'titulo', label: 'Titulo financeiro', field: 'financeiro_titulo_id' },
  { value: 'obra', label: 'Obra', field: 'obra_id' },
  { value: 'fornecedor', label: 'Fornecedor', field: 'fornecedor_id' },
  { value: 'centro_custo', label: 'Centro de custo', field: 'centro_custo_id' },
  { value: 'plano_financeiro', label: 'Plano financeiro', field: 'plano_financeiro_id' }
];

function getLinkSearchType(value) {
  return LINK_SEARCH_TYPES.find((item) => item.value === value) || LINK_SEARCH_TYPES[0];
}

const DIVERGENCE_TYPES = [
  { value: 'supplier_mismatch', label: 'Fornecedor divergente' },
  { value: 'value_mismatch', label: 'Valor divergente' },
  { value: 'quantity_mismatch', label: 'Quantidade divergente' },
  { value: 'item_mismatch', label: 'Item divergente' },
  { value: 'missing_order', label: 'Pedido ausente' },
  { value: 'missing_receipt', label: 'Recebimento ausente' },
  { value: 'duplicate_invoice', label: 'Nota duplicada' },
  { value: 'cancelled_document', label: 'Documento cancelado' },
  { value: 'unknown_cost_center', label: 'Centro de custo desconhecido' },
  { value: 'unknown_financial_plan', label: 'Plano financeiro desconhecido' },
  { value: 'other', label: 'Outro' }
];

const DIVERGENCE_SEVERITIES = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' }
];

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-950 dark:text-white">{value || '-'}</p>
    </div>
  );
}

function JsonBlock({ value }) {
  const content = useMemo(() => {
    if (!value) return '{}';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  return (
    <pre className="max-h-[420px] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100 dark:border-slate-800">
      {content}
    </pre>
  );
}

export default function FiscalDocumentDetail() {
  const { id } = useParams();
  const [documento, setDocumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingFile, setOpeningFile] = useState('');
  const [fileType, setFileType] = useState('danfe');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkForm, setLinkForm] = useState({
    solicitacao_id: '',
    solicitacao_compra_id: '',
    pedido_id: '',
    pedido_item_id: '',
    financeiro_titulo_id: '',
    obra_id: '',
    fornecedor_id: '',
    centro_custo_id: '',
    plano_financeiro_id: '',
    matched_reason: ''
  });
  const [linkSearchType, setLinkSearchType] = useState('solicitacao');
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [suggestingLinks, setSuggestingLinks] = useState(false);
  const [updatingLinkId, setUpdatingLinkId] = useState(null);
  const [divergenceForm, setDivergenceForm] = useState({
    divergence_type: 'value_mismatch',
    severity: 'medium',
    description: '',
    expected_value: '',
    actual_value: '',
    fiscal_document_link_id: ''
  });
  const [savingDivergence, setSavingDivergence] = useState(false);
  const [updatingDivergenceId, setUpdatingDivergenceId] = useState(null);
  const [ignoring, setIgnoring] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setDocumento(await getFiscalDocument(id));
    } catch (err) {
      setError(err.message || 'Erro ao buscar documento fiscal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const openFile = async (type) => {
    setOpeningFile(type);
    setError('');
    try {
      const result = await getFiscalDocumentFileUrl(id, type);
      if (result?.url) window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message || 'Erro ao abrir arquivo fiscal');
    } finally {
      setOpeningFile('');
    }
  };

  const submitFileUpload = async (event) => {
    event.preventDefault();
    if (!uploadFile) {
      setError('Selecione um arquivo fiscal em PDF, PNG ou JPG.');
      return;
    }

    setUploadingFile(true);
    setError('');
    setMessage('');
    try {
      const result = await uploadFiscalDocumentFile({ documentId: id, fileType, file: uploadFile });
      setDocumento(result?.document || await getFiscalDocument(id));
      setUploadFile(null);
      event.target.reset();
      setMessage(fileType === 'danfe' ? 'DANFE anexado com sucesso.' : 'PDF fiscal anexado com sucesso.');
    } catch (err) {
      setError(err.message || 'Erro ao anexar arquivo fiscal');
    } finally {
      setUploadingFile(false);
    }
  };

  const ignoreDocument = async () => {
    if (!window.confirm('Marcar este documento fiscal como ignorado?')) return;

    setIgnoring(true);
    setError('');
    setMessage('');
    try {
      setDocumento(await ignoreFiscalDocument(id));
      setMessage('Documento fiscal marcado como ignorado.');
    } catch (err) {
      setError(err.message || 'Erro ao ignorar documento fiscal');
    } finally {
      setIgnoring(false);
    }
  };

  const validateDocument = async () => {
    setValidating(true);
    setError('');
    setMessage('');
    try {
      setDocumento(await validateFiscalDocument(id));
      setMessage('Documento fiscal validado.');
    } catch (err) {
      setError(err.message || 'Erro ao validar documento fiscal');
    } finally {
      setValidating(false);
    }
  };

  const updateLinkField = (field, value) => {
    setLinkForm((current) => ({ ...current, [field]: value }));
  };

  const searchLinkOptions = async (event) => {
    event?.preventDefault?.();
    setLinkSearching(true);
    setError('');
    setMessage('');
    try {
      const result = await getFiscalLinkOptions({
        type: linkSearchType,
        q: linkSearchQuery,
        limit: 15
      });
      setLinkSearchResults(result?.data || []);
      if (!result?.data?.length) {
        setMessage('Nenhum registro encontrado para essa busca.');
      }
    } catch (err) {
      setError(err.message || 'Erro ao buscar opcoes de vinculo');
    } finally {
      setLinkSearching(false);
    }
  };

  const selectLinkOption = (option) => {
    const target = getLinkSearchType(option.type);
    updateLinkField(target.field, option.id);
    setMessage(`${target.label} #${option.id} selecionado para o vinculo.`);
  };

  const suggestLinks = async () => {
    setSuggestingLinks(true);
    setError('');
    setMessage('');
    try {
      const result = await suggestFiscalDocumentLinks(id);
      setDocumento(result?.document || await getFiscalDocument(id));
      setMessage(result?.created_count
        ? `${result.created_count} sugestao(oes) de vinculo registrada(s).`
        : 'Nenhuma nova sugestao de vinculo foi encontrada.');
    } catch (err) {
      setError(err.message || 'Erro ao sugerir vinculos fiscais');
    } finally {
      setSuggestingLinks(false);
    }
  };

  const changeLinkStatus = async (linkId, status) => {
    setUpdatingLinkId(linkId);
    setError('');
    setMessage('');
    try {
      setDocumento(await updateFiscalDocumentLink(id, linkId, { status }));
      setMessage(status === 'confirmed' ? 'Sugestao confirmada.' : 'Sugestao rejeitada.');
    } catch (err) {
      setError(err.message || 'Erro ao atualizar vinculo fiscal');
    } finally {
      setUpdatingLinkId(null);
    }
  };

  const updateDivergenceField = (field, value) => {
    setDivergenceForm((current) => ({ ...current, [field]: value }));
  };

  const submitDivergence = async (event) => {
    event.preventDefault();
    if (!String(divergenceForm.description || '').trim()) {
      setError('Informe a descricao da divergencia fiscal.');
      return;
    }

    const payload = Object.fromEntries(
      Object.entries(divergenceForm).filter(([, value]) => String(value || '').trim() !== '')
    );

    setSavingDivergence(true);
    setError('');
    setMessage('');
    try {
      setDocumento(await createFiscalDivergence(id, payload));
      setDivergenceForm({
        divergence_type: 'value_mismatch',
        severity: 'medium',
        description: '',
        expected_value: '',
        actual_value: '',
        fiscal_document_link_id: ''
      });
      setMessage('Divergencia fiscal registrada.');
    } catch (err) {
      setError(err.message || 'Erro ao registrar divergencia fiscal');
    } finally {
      setSavingDivergence(false);
    }
  };

  const changeDivergenceStatus = async (divergenceId, status) => {
    setUpdatingDivergenceId(divergenceId);
    setError('');
    setMessage('');
    try {
      setDocumento(await updateFiscalDivergence(id, divergenceId, { status }));
      setMessage(status === 'resolved' ? 'Divergencia resolvida.' : 'Divergencia ignorada.');
    } catch (err) {
      setError(err.message || 'Erro ao atualizar divergencia fiscal');
    } finally {
      setUpdatingDivergenceId(null);
    }
  };

  const submitManualLink = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(linkForm).filter(([, value]) => String(value || '').trim() !== '')
    );

    if (Object.keys(payload).length === 0 || (Object.keys(payload).length === 1 && payload.matched_reason)) {
      setError('Informe ao menos um ID para vincular o documento fiscal.');
      return;
    }

    setLinking(true);
    setError('');
    setMessage('');
    try {
      setDocumento(await linkFiscalDocument(id, payload));
      setMessage('Vinculo manual registrado com sucesso.');
      setLinkForm({
        solicitacao_id: '',
        solicitacao_compra_id: '',
        pedido_id: '',
        pedido_item_id: '',
        financeiro_titulo_id: '',
        obra_id: '',
        fornecedor_id: '',
        centro_custo_id: '',
        plano_financeiro_id: '',
        matched_reason: ''
      });
      setLinkSearchResults([]);
    } catch (err) {
      setError(err.message || 'Erro ao registrar vinculo manual');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">Carregando documento fiscal...</div>;
  }

  if (error && !documento) {
    return (
      <div className="space-y-4">
        <Link className="text-sm font-semibold text-blue-600" to="/fiscal/documentos">Voltar para documentos fiscais</Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const links = documento?.links || [];
  const divergences = documento?.divergences || [];
  const events = documento?.events || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link className="text-sm font-semibold text-blue-600" to="/fiscal/documentos">Voltar para documentos fiscais</Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Documento fiscal</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
            NF-e {documento?.document_number || documento?.access_key}
          </h1>
          <p className="mt-1 max-w-4xl break-words text-sm text-slate-600 dark:text-slate-300">{documento?.access_key}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {documento?.xml_storage_key ? (
            <button className="btn-secondary" type="button" onClick={() => openFile('xml')} disabled={openingFile === 'xml'}>
              {openingFile === 'xml' ? 'Abrindo...' : 'Abrir XML'}
            </button>
          ) : null}
          {(documento?.pdf_storage_key || documento?.danfe_storage_key) ? (
            <button className="btn-secondary" type="button" onClick={() => openFile('pdf')} disabled={openingFile === 'pdf'}>
              {openingFile === 'pdf' ? 'Abrindo...' : 'Abrir PDF'}
            </button>
          ) : null}
          <button className="btn-secondary" type="button" onClick={ignoreDocument} disabled={ignoring || documento?.document_status === 'ignored'}>
            {ignoring ? 'Ignorando...' : documento?.document_status === 'ignored' ? 'Ignorado' : 'Ignorar'}
          </button>
          <button
            className="btn-primary"
            type="button"
            onClick={validateDocument}
            disabled={validating || ['validated', 'ignored', 'cancelled'].includes(documento?.document_status)}
          >
            {validating ? 'Validando...' : documento?.document_status === 'validated' ? 'Validado' : 'Validar'}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Resumo</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Empresa monitorada" value={documento?.company?.razao_social} />
          <Field label="Fornecedor" value={documento?.issuer_name || documento?.issuer_cnpj} />
          <Field label="CNPJ fornecedor" value={documento?.issuer_cnpj} />
          <Field label="Destinatario" value={documento?.recipient_name || documento?.recipient_cnpj} />
          <Field label="Emissao" value={formatDate(documento?.emission_date)} />
          <Field label="Valor total" value={formatMoney(documento?.total_value)} />
          <Field label="Serie" value={documento?.series} />
          <Field label="Status fiscal" value={documento?.document_status} />
          <Field label="Manifestacao" value={documento?.manifestation_status} />
          <Field label="Origem" value={documento?.source} />
          <Field label="Chave XML" value={documento?.xml_storage_key ? 'Disponivel' : 'Indisponivel'} />
          <Field label="Criado em" value={formatDateTime(documento?.createdAt || documento?.created_at)} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Arquivos fiscais</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="XML" value={documento?.xml_storage_key ? 'Disponivel' : 'Indisponivel'} />
          <Field label="DANFE" value={documento?.danfe_storage_key ? 'Disponivel' : 'Indisponivel'} />
          <Field label="PDF" value={documento?.pdf_storage_key ? 'Disponivel' : 'Indisponivel'} />
        </div>
        <form onSubmit={submitFileUpload} className="mt-4 grid gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-[180px_1fr_auto]">
          <select className="input" value={fileType} onChange={(event) => setFileType(event.target.value)}>
            <option value="danfe">DANFE</option>
            <option value="pdf">PDF fiscal</option>
          </select>
          <input className="input" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
          <button className="btn-primary whitespace-nowrap" type="submit" disabled={uploadingFile}>
            {uploadingFile ? 'Anexando...' : 'Anexar arquivo'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Vinculos e divergencias</h2>
          <button className="btn-secondary" type="button" onClick={suggestLinks} disabled={suggestingLinks || ['ignored', 'cancelled'].includes(documento?.document_status)}>
            {suggestingLinks ? 'Sugerindo...' : 'Sugerir vinculos'}
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">Vinculos</div>
            {links.length ? links.map((link) => (
              <div key={link.id} className="border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-950 dark:text-white">{link.link_status || 'suggested'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {link.matched_by === 'automatic' ? 'Sugerido automaticamente' : 'Vinculo manual'}
                      {link.confidence_score ? ` | confianca ${Number(link.confidence_score).toFixed(0)}%` : ''}
                    </p>
                  </div>
                  {link.link_status === 'suggested' ? (
                    <div className="flex gap-2">
                      <button
                        className="btn-secondary px-3 py-1 text-xs"
                        type="button"
                        disabled={updatingLinkId === link.id}
                        onClick={() => changeLinkStatus(link.id, 'confirmed')}
                      >
                        Confirmar
                      </button>
                      <button
                        className="btn-secondary px-3 py-1 text-xs"
                        type="button"
                        disabled={updatingLinkId === link.id}
                        onClick={() => changeLinkStatus(link.id, 'rejected')}
                      >
                        Rejeitar
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 text-slate-500">{link.matched_reason || 'Sem motivo registrado.'}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {link.solicitacao_id ? <span>Solicitacao #{link.solicitacao_id}</span> : null}
                  {link.solicitacao_compra_id ? <span>Compra #{link.solicitacao_compra_id}</span> : null}
                  {link.pedido_id ? <span>Pedido #{link.pedido_id}</span> : null}
                  {link.pedido_item_id ? <span>Item #{link.pedido_item_id}</span> : null}
                  {link.financeiro_titulo_id ? <span>Titulo #{link.financeiro_titulo_id}</span> : null}
                  {link.obra_id ? <span>Obra #{link.obra_id}</span> : null}
                  {link.fornecedor_id ? <span>Fornecedor #{link.fornecedor_id}</span> : null}
                  {link.centro_custo_id ? <span>Centro de custo #{link.centro_custo_id}</span> : null}
                  {link.plano_financeiro_id ? <span>Plano financeiro #{link.plano_financeiro_id}</span> : null}
                </div>
              </div>
            )) : <p className="px-4 py-5 text-sm text-slate-500">Nenhum vinculo registrado nesta fase.</p>}
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">Divergencias</div>
            {divergences.length ? divergences.map((item) => (
              <div key={item.id} className="border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-950 dark:text-white">{item.divergence_type} - {item.severity}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.status}</p>
                  </div>
                  {item.status === 'open' ? (
                    <div className="flex gap-2">
                      <button
                        className="btn-secondary px-3 py-1 text-xs"
                        type="button"
                        disabled={updatingDivergenceId === item.id}
                        onClick={() => changeDivergenceStatus(item.id, 'resolved')}
                      >
                        Resolver
                      </button>
                      <button
                        className="btn-secondary px-3 py-1 text-xs"
                        type="button"
                        disabled={updatingDivergenceId === item.id}
                        onClick={() => changeDivergenceStatus(item.id, 'ignored')}
                      >
                        Ignorar
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 text-slate-500">{item.description}</p>
                {(item.expected_value || item.actual_value) ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {item.expected_value ? `Esperado: ${item.expected_value}` : ''}
                    {item.expected_value && item.actual_value ? ' | ' : ''}
                    {item.actual_value ? `Encontrado: ${item.actual_value}` : ''}
                  </p>
                ) : null}
              </div>
            )) : <p className="px-4 py-5 text-sm text-slate-500">Nenhuma divergencia registrada.</p>}
          </div>
        </div>
        <form onSubmit={submitDivergence} className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Registrar divergencia manual</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <select className="input" value={divergenceForm.divergence_type} onChange={(event) => updateDivergenceField('divergence_type', event.target.value)}>
              {DIVERGENCE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select className="input" value={divergenceForm.severity} onChange={(event) => updateDivergenceField('severity', event.target.value)}>
              {DIVERGENCE_SEVERITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input className="input" inputMode="numeric" placeholder="ID vinculo fiscal opcional" value={divergenceForm.fiscal_document_link_id} onChange={(event) => updateDivergenceField('fiscal_document_link_id', event.target.value)} />
            <input className="input" placeholder="Valor esperado" value={divergenceForm.expected_value} onChange={(event) => updateDivergenceField('expected_value', event.target.value)} />
            <input className="input" placeholder="Valor encontrado" value={divergenceForm.actual_value} onChange={(event) => updateDivergenceField('actual_value', event.target.value)} />
          </div>
          <textarea className="input mt-3 min-h-[84px]" placeholder="Descricao da divergencia" value={divergenceForm.description} onChange={(event) => updateDivergenceField('description', event.target.value)} />
          <div className="mt-3 flex justify-end">
            <button className="btn-primary" type="submit" disabled={savingDivergence}>{savingDivergence ? 'Registrando...' : 'Registrar divergencia'}</button>
          </div>
        </form>
        <form onSubmit={submitManualLink} className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Registrar vinculo manual</p>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
              <select className="input" value={linkSearchType} onChange={(event) => setLinkSearchType(event.target.value)}>
                {LINK_SEARCH_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <input
                className="input"
                placeholder="Busque por nome, codigo, descricao, documento ou ID"
                value={linkSearchQuery}
                onChange={(event) => setLinkSearchQuery(event.target.value)}
              />
              <button className="btn-secondary whitespace-nowrap" type="button" onClick={searchLinkOptions} disabled={linkSearching}>
                {linkSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {linkSearchResults.length ? (
              <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {linkSearchResults.map((option) => (
                  <button
                    key={`${option.type}-${option.id}`}
                    type="button"
                    className="block w-full px-3 py-3 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => selectLinkOption(option)}
                  >
                    <span className="font-semibold text-slate-950 dark:text-white">{option.label}</span>
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {getLinkSearchType(option.type).label}
                    </span>
                    {option.description ? <span className="mt-1 block text-xs text-slate-500">{option.description}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input className="input" inputMode="numeric" placeholder="ID solicitacao" value={linkForm.solicitacao_id} onChange={(event) => updateLinkField('solicitacao_id', event.target.value)} />
            <input className="input" inputMode="numeric" placeholder="ID solicitacao compra" value={linkForm.solicitacao_compra_id} onChange={(event) => updateLinkField('solicitacao_compra_id', event.target.value)} />
            <input className="input" inputMode="numeric" placeholder="ID pedido" value={linkForm.pedido_id} onChange={(event) => updateLinkField('pedido_id', event.target.value)} />
            <input className="input" inputMode="numeric" placeholder="ID item do pedido" value={linkForm.pedido_item_id} onChange={(event) => updateLinkField('pedido_item_id', event.target.value)} />
            <input className="input" inputMode="numeric" placeholder="ID titulo financeiro" value={linkForm.financeiro_titulo_id} onChange={(event) => updateLinkField('financeiro_titulo_id', event.target.value)} />
            <input className="input" inputMode="numeric" placeholder="ID obra" value={linkForm.obra_id} onChange={(event) => updateLinkField('obra_id', event.target.value)} />
            <input className="input" inputMode="numeric" placeholder="ID fornecedor" value={linkForm.fornecedor_id} onChange={(event) => updateLinkField('fornecedor_id', event.target.value)} />
            <input className="input" inputMode="numeric" placeholder="ID centro de custo" value={linkForm.centro_custo_id} onChange={(event) => updateLinkField('centro_custo_id', event.target.value)} />
            <input className="input" inputMode="numeric" placeholder="ID plano financeiro" value={linkForm.plano_financeiro_id} onChange={(event) => updateLinkField('plano_financeiro_id', event.target.value)} />
          </div>
          <textarea className="input mt-3 min-h-[84px]" placeholder="Motivo ou observacao do vinculo" value={linkForm.matched_reason} onChange={(event) => updateLinkField('matched_reason', event.target.value)} />
          <div className="mt-3 flex justify-end">
            <button className="btn-primary" type="submit" disabled={linking}>{linking ? 'Vinculando...' : 'Salvar vinculo'}</button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Eventos</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Protocolo</th>
                <th className="px-4 py-3">Descricao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.length ? events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(event.event_date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{event.event_type}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{event.event_protocol || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{event.event_description || '-'}</td>
                </tr>
              )) : (
                <tr><td className="px-4 py-5 text-slate-500" colSpan={4}>Nenhum evento registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Dados extraidos</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">XML parseado</p>
            <JsonBlock value={documento?.parsed_xml_json} />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Resumo bruto</p>
            <JsonBlock value={documento?.raw_summary_json} />
          </div>
        </div>
      </section>
    </div>
  );
}
