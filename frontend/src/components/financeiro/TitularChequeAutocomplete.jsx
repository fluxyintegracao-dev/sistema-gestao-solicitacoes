import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineMagnifyingGlass, HiOutlineXMark } from 'react-icons/hi2';
import { buscarParceiros } from '../../services/parceiros';
import { maskCpfCnpj, onlyDigits } from '../../utils/formatters';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeResponse(data) {
  return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
}

function PartnerOption({ partner, onSelect }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-sm text-[var(--c-text)] transition-colors hover:bg-[var(--c-bg)] focus:bg-[var(--c-bg)] focus:outline-none"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(partner)}
    >
      <span className="min-w-0">
        <strong className="block truncate">{partner.nome || 'Nome não informado'}</strong>
        <small className="block truncate text-[var(--c-muted)]">{partner.cpf_cnpj ? maskCpfCnpj(partner.cpf_cnpj) : 'CPF/CNPJ não informado'}</small>
      </span>
      <span className="shrink-0 text-xs font-semibold text-[var(--c-primary)]">Selecionar</span>
    </button>
  );
}

export default function TitularChequeAutocomplete({
  nameValue,
  documentValue,
  documentError,
  onNameChange,
  onDocumentChange,
  onDocumentBlur,
  onSelect
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalQuery, setModalQuery] = useState('');
  const [allPartners, setAllPartners] = useState([]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (!open || term.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      buscarParceiros({ q: term, ativo: 1, limit: 8 }, { signal: controller.signal })
        .then((data) => setResults(normalizeResponse(data)))
        .catch((error) => {
          if (error?.name !== 'AbortError') setResults([]);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, searchTerm]);

  useEffect(() => {
    if (!modalOpen || allPartners.length) return undefined;
    let active = true;
    setModalLoading(true);
    buscarParceiros({ ativo: 1, limit: 'all' })
      .then((data) => { if (active) setAllPartners(normalizeResponse(data)); })
      .catch(() => { if (active) setAllPartners([]); })
      .finally(() => { if (active) setModalLoading(false); });
    return () => { active = false; };
  }, [allPartners.length, modalOpen]);

  const modalResults = useMemo(() => {
    const term = normalizeText(modalQuery);
    const digits = onlyDigits(modalQuery);
    if (!term && !digits) return allPartners;
    return allPartners.filter((partner) => (
      normalizeText(partner?.nome).includes(term)
      || (digits && onlyDigits(partner?.cpf_cnpj).includes(digits))
    ));
  }, [allPartners, modalQuery]);

  function selectPartner(partner) {
    onSelect(partner);
    setSearchTerm('');
    setResults([]);
    setOpen(false);
    setModalOpen(false);
  }

  const autocomplete = open && searchTerm.trim().length >= 2 ? (
    <div className="absolute inset-x-0 top-[calc(100%+6px)] z-[135] max-h-64 overflow-y-auto rounded-xl border border-[var(--modal-border)] bg-[var(--modal-bg)] p-1 shadow-xl">
      {loading ? <div className="px-3 py-3 text-sm text-[var(--c-muted)]">Consultando titulares...</div> : null}
      {!loading && results.length ? results.map((partner) => <PartnerOption key={partner.id} partner={partner} onSelect={selectPartner} />) : null}
      {!loading && !results.length ? <div className="px-3 py-3 text-sm text-[var(--c-muted)]">Nenhum titular cadastrado encontrado.</div> : null}
    </div>
  ) : null;

  const modal = modalOpen && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulares-cheque-modal-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}
    >
      <section className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--modal-border)] bg-[var(--modal-bg)] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--modal-border)] px-5 py-4">
          <div>
            <h2 id="titulares-cheque-modal-title" className="text-lg font-semibold text-[var(--c-text)]">Selecionar titular cadastrado</h2>
            <p className="mt-1 text-sm text-[var(--c-muted)]">Pesquise pelo nome ou CPF/CNPJ e selecione para preencher o cheque.</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)} aria-label="Fechar"><HiOutlineXMark className="h-5 w-5" /></button>
        </header>
        <div className="border-b border-[var(--modal-border)] p-4">
          <label className="form-control">
            <span>Pesquisar titular</span>
            <div className="relative">
              <input
                className="input w-full pr-11"
                autoFocus
                value={modalQuery}
                onChange={(event) => setModalQuery(event.target.value)}
                placeholder="Nome ou CPF/CNPJ"
              />
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--c-muted)]" />
            </div>
          </label>
          <p className="mt-2 text-xs text-[var(--c-muted)]">{modalResults.length} titular(es) encontrado(s)</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {modalLoading ? <div className="p-6 text-center text-sm text-[var(--c-muted)]">Carregando titulares...</div> : null}
          {!modalLoading && modalResults.length ? modalResults.map((partner) => <PartnerOption key={partner.id} partner={partner} onSelect={selectPartner} />) : null}
          {!modalLoading && !modalResults.length ? <div className="p-8 text-center text-sm text-[var(--c-muted)]">Nenhum cadastro corresponde à pesquisa.</div> : null}
        </div>
      </section>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative grid gap-3 sm:col-span-2 sm:grid-cols-2">
      <label className="form-control">
        <span>Titular *</span>
        <input
          className="input"
          required
          value={nameValue}
          autoComplete="off"
          onFocus={() => { setSearchTerm(nameValue || ''); setOpen(true); }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            onNameChange(event.target.value);
            setSearchTerm(event.target.value);
            setOpen(true);
          }}
        />
      </label>

      <label className="form-control">
        <span>CPF/CNPJ do titular</span>
        <div className="relative">
          <input
            className={`input w-full pr-11 ${documentError ? 'border-rose-400' : ''}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={18}
            value={documentValue}
            aria-invalid={Boolean(documentError)}
            aria-describedby={documentError ? 'cheque-titular-documento-erro' : undefined}
            onFocus={() => { setSearchTerm(documentValue || ''); setOpen(true); }}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 150);
              onDocumentBlur();
            }}
            onChange={(event) => {
              const value = maskCpfCnpj(event.target.value);
              onDocumentChange(value);
              setSearchTerm(value);
              setOpen(true);
            }}
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--c-muted)] transition-colors hover:bg-[var(--c-bg)] hover:text-[var(--c-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
            onClick={() => { setModalQuery(nameValue || documentValue || ''); setModalOpen(true); }}
            title="Listar titulares cadastrados"
            aria-label="Listar titulares cadastrados"
          >
            <HiOutlineMagnifyingGlass className="h-5 w-5" />
          </button>
        </div>
        {documentError ? <small id="cheque-titular-documento-erro" className="text-rose-700">{documentError}</small> : null}
      </label>

      {autocomplete}
      {modal}
    </div>
  );
}
