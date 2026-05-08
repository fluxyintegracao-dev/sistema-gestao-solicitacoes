import { useEffect, useMemo, useState } from 'react';

function normalize(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function optionLabel(item) {
  const desc = item.descricao || item.nome || '';
  return item.codigo ? `${item.codigo} - ${desc}` : desc;
}

export default function ApropriacaoAutocomplete({
  value,
  options = [],
  onChange,
  disabled = false,
  required = false,
  placeholder = 'Buscar por código ou nome...',
  disabledPlaceholder = 'Selecione',
  className = '',
  inputClassName = 'input w-full',
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedOption = useMemo(
    () => options.find((item) => String(item.id) === String(value || '')),
    [options, value],
  );

  useEffect(() => {
    if (!open) {
      setQuery(selectedOption ? optionLabel(selectedOption) : '');
    }
  }, [open, selectedOption]);

  const filteredOptions = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter((item) => {
      const searchable = [item.codigo, item.descricao, item.nome].filter(Boolean).join(' ');
      return normalize(searchable).includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, options.length]);

  function select(option) {
    onChange(option ? String(option.id) : '');
    setOpen(false);
  }

  function handleInputChange(e) {
    setQuery(e.target.value);
    if (value) onChange('');
    setOpen(true);
  }

  function handleKeyDown(e) {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(filteredOptions.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filteredOptions.length) {
        e.preventDefault();
        select(filteredOptions[activeIndex] ?? filteredOptions[0]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Tab' && open && filteredOptions.length && query.trim()) {
      select(filteredOptions[activeIndex] ?? filteredOptions[0]);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <input
        className={inputClassName}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? disabledPlaceholder : placeholder}
        disabled={disabled}
        required={required && !value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[80] max-h-60 overflow-y-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-1 shadow-xl">
          {filteredOptions.length ? (
            filteredOptions.map((option, i) => (
              <button
                key={option.id}
                type="button"
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  i === activeIndex
                    ? 'bg-[var(--c-primary)] text-white'
                    : 'text-[var(--c-text)] hover:bg-[var(--c-bg)]'
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(option);
                }}
              >
                {option.codigo && (
                  <span
                    className={`block font-mono text-[11px] ${
                      i === activeIndex ? 'text-white/70' : 'text-[var(--c-muted)]'
                    }`}
                  >
                    {option.codigo}
                  </span>
                )}
                <span className="block truncate font-medium">
                  {option.descricao || option.nome || ''}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-[var(--c-muted)]">
              Nenhuma apropriação encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
}
