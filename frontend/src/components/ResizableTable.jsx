import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ResizableTableContext = createContext(null);

function getColumnKey(column) {
  return column.key || column.id;
}

function getInitialWidths(columns, storageKey) {
  const defaults = Object.fromEntries(
    columns.map((column) => {
      const key = getColumnKey(column);
      return [key, Number(column.width || column.defaultWidth || 140)];
    })
  );

  if (!storageKey || typeof window === 'undefined') {
    return defaults;
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    return Object.fromEntries(
      columns.map((column) => {
        const key = getColumnKey(column);
        const minWidth = Number(column.minWidth || 72);
        const storedWidth = Number(stored[key]);
        const width = Number.isFinite(storedWidth) ? storedWidth : defaults[key];
        return [key, Math.max(minWidth, width)];
      })
    );
  } catch (_) {
    return defaults;
  }
}

export function ResizableTable({
  columns,
  storageKey,
  className = '',
  minColumnWidth = 72,
  children,
  ...props
}) {
  const normalizedColumns = useMemo(
    () => (columns || []).filter((column) => getColumnKey(column)),
    [columns]
  );
  const [widths, setWidths] = useState(() => getInitialWidths(normalizedColumns, storageKey));
  const resizingRef = useRef(null);

  useEffect(() => {
    setWidths((current) => {
      const next = { ...current };
      normalizedColumns.forEach((column) => {
        const key = getColumnKey(column);
        if (!next[key]) {
          next[key] = Number(column.width || column.defaultWidth || 140);
        }
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
    if (!storageKey || typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(widths));
  }, [storageKey, widths]);

  useEffect(() => {
    function handlePointerMove(event) {
      if (!resizingRef.current) {
        return;
      }
      const { key, startX, startWidth, minWidth } = resizingRef.current;
      const nextWidth = Math.max(minWidth, startWidth + event.clientX - startX);
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
