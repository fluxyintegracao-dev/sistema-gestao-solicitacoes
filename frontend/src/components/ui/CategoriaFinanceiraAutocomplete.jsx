import { useEffect, useId, useMemo, useState } from 'react';
import { textMatchesSearchTerms } from '../../utils/search';

function getCategoriaResumo(categoria) {
  return [
    categoria?.tipo,
    categoria?.dre_grupo,
    categoria?.dre_subgrupo
  ].filter(Boolean).join(' - ');
}

export default function CategoriaFinanceiraAutocomplete({
  label = 'Categoria financeira',
  value,
  options = [],
  onChange,
  helperText,
  disabled = false,
  placeholder = 'Digite para buscar a categoria'
}) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedOption = useMemo(
    () => options.find((categoria) => String(categoria.id) === String(value || '')) || null,
    [options, value]
  );

  useEffect(() => {
    setQuery(selectedOption?.nome || '');
  }, [selectedOption]);

  const filteredOptions = useMemo(() => {
    const source = Array.isArray(options) ? options : [];
    const termo = query.trim();

    if (!termo) return source.slice(0, 8);

    return source
      .filter((categoria) => textMatchesSearchTerms([
        categoria?.nome,
        categoria?.descricao,
        categoria?.tipo,
        categoria?.dre_grupo,
        categoria?.dre_subgrupo,
        categoria?.classificacao_gerencial
      ], termo))
      .slice(0, 8);
  }, [options, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, options.length]);

  function selecionar(categoria) {
    if (!categoria) return;
    onChange(String(categoria.id));
    setQuery(categoria.nome || '');
    setOpen(false);
  }

  function restaurarSelecao() {
    setQuery(selectedOption?.nome || '');
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter' && open && filteredOptions.length) {
      event.preventDefault();
      selecionar(filteredOptions[activeIndex] || filteredOptions[0]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      restaurarSelecao();
    }
  }

  return (
    <div className="text-sm">
      <label htmlFor={inputId} className="mb-1 block text-[var(--c-muted)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className="input w-full"
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={(event) => {
            event.target.select();
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(restaurarSelecao, 120)}
          onKeyDown={handleKeyDown}
        />

        {open && !disabled && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] max-h-64 overflow-y-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-1 shadow-xl">
            {filteredOptions.length ? filteredOptions.map((categoria, index) => (
              <button
                key={categoria.id}
                type="button"
                className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                  index === activeIndex
                    ? 'bg-[var(--c-primary)] text-white'
                    : 'text-[var(--c-text)] hover:bg-[var(--c-bg)]'
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selecionar(categoria);
                }}
              >
                <span className="block font-medium">{categoria.nome}</span>
                {getCategoriaResumo(categoria) && (
                  <span className={`block text-xs ${index === activeIndex ? 'text-white/80' : 'text-[var(--c-muted)]'}`}>
                    {getCategoriaResumo(categoria)}
                  </span>
                )}
              </button>
            )) : (
              <div className="px-3 py-2 text-[var(--c-muted)]">Nenhuma categoria encontrada.</div>
            )}
          </div>
        )}
      </div>
      {helperText && <span className="mt-1 block text-xs text-[var(--c-muted)]">{helperText}</span>}
    </div>
  );
}
