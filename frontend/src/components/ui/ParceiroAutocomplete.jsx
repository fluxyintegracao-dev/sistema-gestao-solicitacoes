import { useEffect, useMemo, useState } from 'react';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function ParceiroAutocomplete({
  label,
  value,
  options = [],
  onChange,
  disabled = false,
  placeholder = 'Digite para buscar',
  emptyLabel = 'Nenhuma opcao encontrada',
  className = '',
  inputClassName = 'input w-full'
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedOption = useMemo(
    () => options.find((item) => String(item.id) === String(value || '')),
    [options, value]
  );

  useEffect(() => {
    if (selectedOption) {
      setQuery(selectedOption.nome || '');
      return;
    }

    if (!value && !open) {
      setQuery('');
    }
  }, [open, selectedOption, value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    const source = Array.isArray(options) ? options : [];

    if (!normalizedQuery) {
      return source.slice(0, 30);
    }

    return source
      .filter((item) => {
        const searchable = [
          item?.nome,
          item?.razao_social,
          item?.cpf_cnpj,
          item?.email
        ].filter(Boolean).join(' ');
        return normalizeText(searchable).includes(normalizedQuery);
      })
      .slice(0, 30);
  }, [options, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, options.length]);

  function selectOption(option) {
    if (!option) return;
    onChange(String(option.id));
    setQuery(option.nome || '');
    setOpen(false);
  }

  function handleInputChange(event) {
    setQuery(event.target.value);
    if (value) {
      onChange('');
    }
    setOpen(true);
  }

  function handleKeyDown(event) {
    if (disabled) return;

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

    if (event.key === 'Enter') {
      if (open && filteredOptions.length) {
        event.preventDefault();
        selectOption(filteredOptions[activeIndex] || filteredOptions[0]);
      }
      return;
    }

    if (event.key === 'Tab' && open && filteredOptions.length && query.trim()) {
      selectOption(filteredOptions[activeIndex] || filteredOptions[0]);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <span className="sol-filter-label app-filter-label">{label}</span>
      <input
        className={inputClassName}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] max-h-64 overflow-y-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-1 shadow-xl">
          {filteredOptions.length ? filteredOptions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                index === activeIndex
                  ? 'bg-[var(--c-primary)] text-white'
                  : 'text-[var(--c-text)] hover:bg-[var(--c-bg)]'
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(option);
              }}
            >
              <span className="block truncate font-medium">{option.nome}</span>
              {option.cpf_cnpj ? (
                <span className={`block truncate text-[11px] ${index === activeIndex ? 'text-white/80' : 'text-[var(--c-muted)]'}`}>
                  {option.cpf_cnpj}
                </span>
              ) : null}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-[var(--c-muted)]">{emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
