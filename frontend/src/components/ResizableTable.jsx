import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ResizableTableContext = createContext(null);

function getColumnKey(column) {
  return column.key || column.id;
}

/*
  DE QUEM É CADA LARGURA (03/09)

  Duas fontes disputam a mesma propriedade e a diferença precisa ser
  PERSISTENTE, não por montagem:
   - o COMPONENTE calcula a largura a partir do tipo da coluna e distribui a
     sobra do contêiner (muda com o tamanho da janela);
   - o USUÁRIO arrasta a alça e espera que aquilo fique.

  A primeira tentativa guardou "o usuário arrastou" num `useRef`, que nasce
  `false` a cada montagem. Resultado medido em 03/09: arrastar, recarregar e
  o arrasto sumia — o efeito de sincronia sobrescrevia a largura restaurada
  do localStorage. Foram 16 telas reprovando no T3, uma regressão nova.

  Então quem manda é o localStorage: chave gravada lá é chave DO USUÁRIO, e
  o cálculo do componente nunca a substitui. Chave ausente é do componente,
  e acompanha a janela.
*/
function getInitialWidths(columns, storageKey) {
  const defaults = Object.fromEntries(
    columns.map((column) => {
      const key = getColumnKey(column);
      return [key, Number(column.width || column.defaultWidth || 140)];
    })
  );

  if (!storageKey || typeof window === 'undefined') {
    return { widths: defaults, doUsuario: new Set() };
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    const doUsuario = new Set(
      columns.map(getColumnKey).filter((key) => Number.isFinite(Number(stored[key])))
    );
    const widths = Object.fromEntries(
      columns.map((column) => {
        const key = getColumnKey(column);
        const minWidth = Number(column.minWidth || 72);
        const storedWidth = Number(stored[key]);
        const width = Number.isFinite(storedWidth) ? storedWidth : defaults[key];
        return [key, Math.max(minWidth, width)];
      })
    );
    return { widths, doUsuario };
  } catch (_) {
    return { widths: defaults, doUsuario: new Set() };
  }
}

export function ResizableTable({
  columns,
  storageKey,
  className = '',
  minColumnWidth = 72,
  scrollLabel = 'Tabela com rolagem horizontal',
  children,
  ...props
}) {
  const normalizedColumns = useMemo(
    () => (columns || []).filter((column) => getColumnKey(column)),
    [columns]
  );
  const inicial = useState(() => getInitialWidths(normalizedColumns, storageKey))[0];
  const [widths, setWidths] = useState(inicial.widths);
  const resizingRef = useRef(null);
  // Persistir SÓ depois de um redimensionamento real do usuário: gravar os
  // defaults no mount congelava a tabela nas larguras iniciais e engolia a
  // distribuição de sobra da TabelaPadrao (defeito de 02/09).
  const usuarioRedimensionouRef = useRef(false);
  // Chaves cuja largura é DO USUÁRIO — semeadas do localStorage (portanto
  // sobrevivem a recarga) e acrescidas a cada arrasto novo.
  const colunasDoUsuarioRef = useRef(inicial.doUsuario);

  /*
    A largura vinda das colunas tem de SUBSTITUIR a atual, não só preencher
    chave ausente.

    A versão anterior só preenchia o que faltava (`if (!next[key])`). Isso
    fez o `ResizeObserver` que a TabelaPadrao ganhou em 02/09 virar um
    conserto pela metade: ela remedia o contêiner e recalculava a
    distribuição, e a nova largura nunca chegava ao DOM. Medido no preview
    em 03/09: a tabela montada em 1920 e a janela reduzida para 1366
    continuava com 1805px de largura e o NOME com 813px — OBRA, VÍNCULO,
    STATUS e AÇÕES fora da borda do cartão, para sempre. Só um remount
    (passar pelo estado "Carregando") corrigia.

    O que NÃO pode ser sobrescrito é a largura que o USUÁRIO arrastou: essa
    é escolha dele e o `usuarioRedimensionouRef` a protege — mesma razão por
    que os defaults não são persistidos no mount.
  */
  useEffect(() => {
    setWidths((current) => {
      const next = { ...current };
      normalizedColumns.forEach((column) => {
        const key = getColumnKey(column);
        const proposta = Number(column.width || column.defaultWidth || 140);
        // Largura do USUÁRIO não é tocada — nem no mount, nem quando a
        // janela muda. O resto acompanha o cálculo do componente.
        if (colunasDoUsuarioRef.current.has(key)) return;
        if (next[key] !== proposta) next[key] = proposta;
      });
      Object.keys(next).forEach((key) => {
        if (!normalizedColumns.some((column) => getColumnKey(column) === key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [normalizedColumns]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined' || !usuarioRedimensionouRef.current) {
      return;
    }
    /*
      Grava APENAS as colunas que o usuário arrastou. A versão anterior
      gravava o mapa inteiro, e aí um único arrasto congelava a distribuição
      de TODAS as colunas para sempre — a tabela deixava de acompanhar a
      janela porque tudo virava "escolha do usuário".
    */
    const apenasDoUsuario = Object.fromEntries(
      Object.entries(widths).filter(([key]) => colunasDoUsuarioRef.current.has(key))
    );
    window.localStorage.setItem(storageKey, JSON.stringify(apenasDoUsuario));
  }, [storageKey, widths]);

  useEffect(() => {
    function handlePointerMove(event) {
      if (!resizingRef.current) {
        return;
      }
      const { key, startX, startWidth, minWidth } = resizingRef.current;
      const nextWidth = Math.max(minWidth, startWidth + event.clientX - startX);
      // A partir daqui esta coluna é do usuário e o cálculo não a substitui.
      colunasDoUsuarioRef.current.add(key);
      setWidths((current) => ({ ...current, [key]: nextWidth }));
    }

    function handlePointerUp() {
      resizingRef.current = null;
      document.body.classList.remove('is-column-resizing');
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.classList.remove('is-column-resizing');
    };
  }, []);

  function startResize(columnKey, event) {
    const column = normalizedColumns.find((item) => getColumnKey(item) === columnKey);
    if (!column) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    usuarioRedimensionouRef.current = true;
    resizingRef.current = {
      key: columnKey,
      startX: event.clientX,
      startWidth: Number(widths[columnKey] || column.width || column.defaultWidth || 140),
      minWidth: Number(column.minWidth || minColumnWidth)
    };
    document.body.classList.add('is-column-resizing');
  }

  function nudgeWidth(columnKey, delta) {
    const column = normalizedColumns.find((item) => getColumnKey(item) === columnKey);
    const minWidth = Number(column?.minWidth || minColumnWidth);
    usuarioRedimensionouRef.current = true;
    setWidths((current) => ({
      ...current,
      [columnKey]: Math.max(minWidth, Number(current[columnKey] || column?.width || 140) + delta)
    }));
  }

  const tableMinWidth = normalizedColumns.reduce(
    (total, column) => total + Number(widths[getColumnKey(column)] || column.width || 140),
    0
  );

  const contextValue = useMemo(
    () => ({ widths, startResize, nudgeWidth }),
    [widths]
  );

  return (
    <ResizableTableContext.Provider value={contextValue}>
      <div
        className="resizable-table-scroll"
        data-table-scroll
        role="region"
        aria-label={scrollLabel}
        tabIndex={0}
      >
        <table
          className={`resizable-table ${className}`.trim()}
          style={{
            minWidth: `${Math.max(tableMinWidth, 320)}px`,
            width: `${Math.max(tableMinWidth, 320)}px`
          }}
          {...props}
        >
          <colgroup>
            {normalizedColumns.map((column) => {
              const key = getColumnKey(column);
              return <col key={key} style={{ width: `${widths[key] || column.width || 140}px` }} />;
            })}
          </colgroup>
          {children}
        </table>
      </div>
    </ResizableTableContext.Provider>
  );
}

export function ResizableTh({ columnKey, children, className = '', title, ...props }) {
  const context = useContext(ResizableTableContext);
  const width = context?.widths?.[columnKey];

  function handleKeyDown(event) {
    if (!context) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      context.nudgeWidth(columnKey, -16);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      context.nudgeWidth(columnKey, 16);
    }
  }

  return (
    <th
      className={`resizable-th ${className}`.trim()}
      style={width ? { width: `${width}px` } : undefined}
      title={title}
      {...props}
    >
      <span className="resizable-th-label">{children}</span>
      {context ? (
        <span
          aria-label="Redimensionar coluna"
          className="resizable-th-handle"
          role="separator"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={(event) => context.startResize(columnKey, event)}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
    </th>
  );
}
