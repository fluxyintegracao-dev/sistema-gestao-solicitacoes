import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFecharAoSair } from '../../hooks/useFecharAoSair';

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
  // A lista vai em PORTAL, e a posicao dela e medida a partir do input.
  //
  // Ela era `absolute` dentro do proprio campo, e por isso sumia quando o autocomplete ficava
  // dentro de um container com `overflow` — foi o que aconteceu na tabela de rateio: com UMA
  // linha a tabela e baixa, a lista cai inteira fora da area visivel e some; com mais linhas ha
  // altura sobrando e ela aparece. Dava a impressao de "so funciona com mais de uma apropriacao".
  //
  // Em portal no body, nenhum ancestral consegue recortar — vale para este uso e para qualquer
  // outro lugar que ponha o campo dentro de uma area com rolagem.
  const campoRef = useRef(null);
  const painelRef = useRef(null);
  const [caixa, setCaixa] = useState(null);

  useEffect(() => {
    if (!open || !campoRef.current) return undefined;
    const medir = () => {
      const r = campoRef.current?.getBoundingClientRect();
      if (r) setCaixa({ left: r.left, top: r.bottom + 4, width: r.width });
    };
    medir();
    window.addEventListener('resize', medir);
    // `true` para capturar rolagem de QUALQUER ancestral, nao so da janela.
    window.addEventListener('scroll', medir, true);
    return () => {
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
    };
  }, [open]);

  const selectedOption = useMemo(
    () => options.find((item) => String(item.id) === String(value || '')),
    [options, value],
  );
  const selectedLabel = selectedOption ? optionLabel(selectedOption) : '';

  useEffect(() => {
    if (!open) {
      setQuery(selectedOption ? optionLabel(selectedOption) : '');
    }
  }, [open, selectedOption]);

  /*
    A LISTA FECHA AO CLICAR FORA, NAO AO PERDER O FOCO (05/09).

    Era `onBlur` com `setTimeout(150)`: quem fechava a camada era a saida do
    FOCO, e o atraso existia so para o clique na opcao ganhar a corrida. O
    preco era um fechamento que nao acompanha o uso real — clicar num rotulo,
    rolar a pagina ou abrir outro painel com o foco preso no campo NAO fechava,
    e o Esc so valia enquanto o foco estivesse dentro do input.

    Agora quem fecha e o `useFecharAoSair`: `mousedown`/`touchstart` fora e
    `Escape` em qualquer lugar do documento.

    POR QUE A SELECAO SOBREVIVE — e aqui sao DOIS motivos, os dois necessarios
    porque esta lista vive em PORTAL no `body`:
    1) o hook recebe a LISTA de refs (campo + painel). O painel nao e
       descendente do campo, entao com um ref so o clique na opcao seria
       "fora" e a camada fecharia no `mousedown`, antes da escolha;
    2) a opcao ja escolhe no proprio `onMouseDown` com `preventDefault()` — o
       React ouve o portal no `body`, que borbulha ANTES do `document` onde o
       hook escuta, entao `select()` roda primeiro de qualquer forma.

    Fechar aqui e so `setOpen(false)`: o efeito acima ja devolve ao campo o
    rotulo da opcao selecionada quando `open` vira falso, entao nao fica texto
    solto de busca no input.
  */
  useFecharAoSair([campoRef, painelRef], open && !disabled, () => setOpen(false));

  const filteredOptions = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    if (selectedLabel && q === normalize(selectedLabel)) return options;
    return options.filter((item) => {
      const searchable = [item.codigo, item.descricao, item.nome].filter(Boolean).join(' ');
      return normalize(searchable).includes(q);
    });
  }, [options, query, selectedLabel]);

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
    <div ref={campoRef} className={`relative ${className}`}>
      <input
        className={inputClassName}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? disabledPlaceholder : placeholder}
        disabled={disabled}
        required={required && !value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {open && !disabled && caixa && typeof document !== 'undefined' && createPortal((
        <div
          ref={painelRef}
          className="fixed max-h-60 overflow-y-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-1 shadow-xl"
          style={{ left: caixa.left, top: caixa.top, width: caixa.width, zIndex: 'var(--z-dropdown-portal, 90)' }}
        >
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
                    className={`block font-mono text-xs ${
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
      ), document.body)}
    </div>
  );
}
