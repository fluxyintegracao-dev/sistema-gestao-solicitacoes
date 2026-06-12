import { useEffect, useMemo, useRef, useState } from 'react';
import LinhaSolicitacao from './LinhaSolicitacao';
import { useAuth } from '../../contexts/AuthContext';
import { timestampOrdenacaoData } from '../../utils/dateLocal';
import { userHasSetorCapability } from '../../utils/setor';
import { hasEnabledModule } from '../../utils/acessoProduto';

const SORTABLE_COLUMNS = new Set(['data', 'vencimento', 'valor']);
const COLUMN_WIDTHS_STORAGE_KEY = 'solicitacoes:tabela:larguras:v1';
const MAX_COLUMN_WIDTH = 520;

export default function TabelaSolicitacoes({
  solicitacoes,
  onAtualizar,
  setoresMap,
  permissaoUsuario,
  mostrarArquivadas = false,
  selecionadasIds = [],
  onToggleSelecionada,
  onToggleSelecionarTodas,
  visibleColumns = null
}) {
  const tableWrapRef = useRef(null);
  const resizeCleanupRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [widthsById, setWidthsById] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = JSON.parse(localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY) || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch (error) {
      console.error('Erro ao carregar larguras da tabela de solicitações', error);
      return {};
    }
  });
  const [resizingColumnId, setResizingColumnId] = useState(null);
  const { user } = useAuth();

  const isSetorObra = userHasSetorCapability(user, 'eh_setor_obra');
  const moduloContratosHabilitado = hasEnabledModule(user, 'CONTRATOS');

  const selecaoHabilitada = typeof onToggleSelecionada === 'function';
  const viewportMode = viewportWidth < 768 ? 'mobile' : viewportWidth < 1024 ? 'tablet' : 'desktop';
  const idsSet = useMemo(() => new Set((selecionadasIds || []).map(Number)), [selecionadasIds]);
  const todasSelecionadas = selecaoHabilitada && solicitacoes.length > 0 &&
    solicitacoes.every(item => idsSet.has(Number(item.id)));
  const algumaSelecionada = selecaoHabilitada &&
    solicitacoes.some(item => idsSet.has(Number(item.id)));

  const columnsBase = useMemo(() => {
    const base = [
      ...(selecaoHabilitada ? [{ id: 'selecionar', label: '', width: 42, min: 42, weight: 0, fixed: true }] : []),
      { id: 'data', label: 'Data', width: 110, min: 90, weight: 0.9 },
      { id: 'codigo', label: 'Código', width: 100, min: 80, weight: 0.9 },
      { id: 'numero_sienge', label: 'Nº pedido', width: 120, min: 100, weight: 0.9 },
      { id: 'obra', label: 'Obra', width: 170, min: 120, weight: 1.2 },
      ...(moduloContratosHabilitado ? [{ id: 'contrato', label: 'Contrato', width: 120, min: 95, weight: 1 }] : []),
      { id: 'descricao', label: 'Descrição', width: 110, min: 110, weight: 0, fixed: true },
      { id: 'tipo', label: 'Tipo de Solicitação', width: 170, min: 120, weight: 1.1 },
      { id: 'valor', label: 'Valor', width: 200, min: 160, weight: 1.15 },
      { id: 'setor', label: 'Setor', width: 110, min: 90, weight: 0.9 },
      { id: 'responsavel', label: 'Responsável', width: 130, min: 100, weight: 1.1 },
      { id: 'status', label: 'Status', width: 140, min: 110, weight: 1 },
      { id: 'vencimento', label: 'Vencimento', width: 120, min: 100, weight: 0.9 },
      { id: 'acoes', label: 'Ações', width: 220, min: 190, weight: 1.4 }
    ];

    if (isSetorObra && moduloContratosHabilitado) {
      base.splice(6, 0, {
        id: 'ref_contrato',
        label: 'Ref. do Contrato',
        width: 110,
        min: 110,
        weight: 0,
        fixed: true
      });
    }

    return base;
  }, [isSetorObra, moduloContratosHabilitado, selecaoHabilitada]);

  const visibleSet = useMemo(() => {
    if (!Array.isArray(visibleColumns) || visibleColumns.length === 0) return null;
    return new Set(visibleColumns);
  }, [visibleColumns]);

  const responsiveVisibleSet = useMemo(() => {
    if (viewportMode === 'desktop') return null;

    if (viewportMode === 'tablet') {
      return new Set([
        ...(selecaoHabilitada ? ['selecionar'] : []),
        'data',
        'codigo',
        'numero_sienge',
        'obra',
        'status',
        'vencimento',
        'acoes'
      ]);
    }

    return new Set([
      ...(selecaoHabilitada ? ['selecionar'] : []),
      'codigo',
      'numero_sienge',
      'obra',
      ...(moduloContratosHabilitado ? ['contrato'] : []),
      ...(isSetorObra && moduloContratosHabilitado ? ['ref_contrato'] : []),
      'descricao',
      'tipo',
      'valor',
      'setor',
      'responsavel',
      'status',
      'vencimento',
      'acoes'
    ]);
  }, [viewportMode, selecaoHabilitada, isSetorObra, moduloContratosHabilitado]);

  const columns = useMemo(() => {
    const userFiltered = !visibleSet
      ? columnsBase
      : columnsBase.filter(col => col.id === 'selecionar' || visibleSet.has(col.id));

    if (!responsiveVisibleSet) return userFiltered;
    return userFiltered.filter(col => col.id === 'selecionar' || responsiveVisibleSet.has(col.id));
  }, [columnsBase, visibleSet, responsiveVisibleSet]);

  const [ordenacao, setOrdenacao] = useState({ campo: 'data', direcao: 'desc' });

  useEffect(() => {
    const validColumnIds = new Set(columnsBase.map(col => col.id));
    setWidthsById(prev => {
      let changed = false;
      const next = {};
      Object.entries(prev || {}).forEach(([id, value]) => {
        const numericValue = Number(value);
        if (validColumnIds.has(id) && Number.isFinite(numericValue)) {
          next[id] = numericValue;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [columnsBase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(widthsById));
    } catch (error) {
      console.error('Erro ao salvar larguras da tabela de solicitações', error);
    }
  }, [widthsById]);

  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalTableWidth = useMemo(
    () => columns.reduce((acc, col) => acc + getColumnWidth(col), 0),
    [columns, widthsById]
  );

  function getColumnWidth(col) {
    const defaultWidth = Number(col.width ?? col.min ?? 80);
    const savedWidth = Number(widthsById?.[col.id]);
    const minWidth = Number(col.min ?? 60);
    const maxWidth = Number(col.max ?? MAX_COLUMN_WIDTH);
    const currentWidth = Number.isFinite(savedWidth) ? savedWidth : defaultWidth;
    return Math.round(Math.min(Math.max(currentWidth, minWidth), maxWidth));
  }

  function ajustarLarguraColuna(col, delta) {
    setWidthsById(prev => {
      const current = Number(prev?.[col.id] ?? col.width ?? col.min ?? 80);
      const minWidth = Number(col.min ?? 60);
      const maxWidth = Number(col.max ?? MAX_COLUMN_WIDTH);
      const nextWidth = Math.round(Math.min(Math.max(current + delta, minWidth), maxWidth));
      return { ...prev, [col.id]: nextWidth };
    });
  }

  function restaurarLarguraColuna(event, col) {
    event.preventDefault();
    event.stopPropagation();
    setWidthsById(prev => {
      if (!prev?.[col.id]) return prev;
      const next = { ...prev };
      delete next[col.id];
      return next;
    });
  }

  function iniciarRedimensionamento(event, col) {
    if (col.id === 'selecionar') return;

    event.preventDefault();
    event.stopPropagation();
    resizeCleanupRef.current?.();

    const startX = event.clientX;
    const startWidth = getColumnWidth(col);
    const minWidth = Number(col.min ?? 60);
    const maxWidth = Number(col.max ?? MAX_COLUMN_WIDTH);
    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;

    setResizingColumnId(col.id);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function handlePointerMove(moveEvent) {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.round(Math.min(Math.max(startWidth + delta, minWidth), maxWidth));
      setWidthsById(prev => ({ ...prev, [col.id]: nextWidth }));
    }

    function finalizarRedimensionamento() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finalizarRedimensionamento);
      window.removeEventListener('pointercancel', finalizarRedimensionamento);
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
      resizeCleanupRef.current = null;
      setResizingColumnId(null);
    }

    resizeCleanupRef.current = finalizarRedimensionamento;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finalizarRedimensionamento);
    window.addEventListener('pointercancel', finalizarRedimensionamento);
  }

  function handleResizerKeyDown(event, col) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      ajustarLarguraColuna(col, event.shiftKey ? -40 : -16);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      ajustarLarguraColuna(col, event.shiftKey ? 40 : 16);
    }
    if (event.key === 'Enter' || event.key === ' ') {
      restaurarLarguraColuna(event, col);
    }
  }

  const solicitacoesOrdenadas = useMemo(() => {
    const { campo, direcao } = ordenacao || {};
    if (!SORTABLE_COLUMNS.has(campo)) return solicitacoes;

    const fator = direcao === 'asc' ? 1 : -1;
    const getter = (item) => {
      if (campo === 'data') {
        const raw = item?.createdAt || item?.data_criacao || item?.created_at || null;
        const ts = raw ? new Date(raw).getTime() : null;
        return Number.isNaN(ts) ? null : ts;
      }
      if (campo === 'vencimento') {
        const raw = item?.data_vencimento || null;
        const ts = raw ? timestampOrdenacaoData(raw) : null;
        return ts;
      }
      if (campo === 'valor') {
        const n = Number(item?.valor_exibicao ?? item?.saldo_pagamento ?? item?.valor);
        return Number.isNaN(n) ? null : n;
      }
      return null;
    };

    return [...solicitacoes].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return -1 * fator;
      if (va > vb) return 1 * fator;
      return 0;
    });
  }, [solicitacoes, ordenacao]);

  function alternarOrdenacao(colId) {
    if (!SORTABLE_COLUMNS.has(colId)) return;

    setOrdenacao(prev => {
      if (prev?.campo !== colId) return { campo: colId, direcao: 'asc' };
      return { campo: colId, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' };
    });
  }

  function indicadorOrdenacao(colId) {
    if (ordenacao?.campo !== colId) return '';
    return ordenacao.direcao === 'asc' ? ' ^' : ' v';
  }

  return (
    <div className={`sol-surface-card rounded-xl solicitacoes-table-shell solicitacoes-table-shell--${viewportMode} solicitacoes-table-compact`}>
      <div
        ref={tableWrapRef}
        className="solicitacoes-table-scroll scrollbar-thin"
        style={{ scrollbarGutter: 'stable both-edges' }}
      >
        <table
          className={`text-sm table-fixed solicitacoes-table solicitacoes-table--${viewportMode}`}
          style={{ width: '100%', minWidth: `${totalTableWidth}px` }}
        >
        <colgroup>
          {columns.map(col => (
            <col key={col.id} style={{ width: `${getColumnWidth(col)}px` }} />
          ))}
        </colgroup>

        <thead className="bg-gray-50 dark:bg-slate-800">
          <tr>
            {columns.map(col => {
              const sortable = SORTABLE_COLUMNS.has(col.id);
              const resizable = col.id !== 'selecionar';
              return (
                <th
                  key={col.id}
                  className={`p-3 text-left relative select-none whitespace-nowrap text-xs uppercase tracking-wide text-gray-600 dark:text-slate-200 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 bg-gray-50 dark:bg-slate-800 solicitacoes-resizable-th ${resizingColumnId === col.id ? 'is-resizing' : ''}`}
                  style={{ width: `${getColumnWidth(col)}px` }}
                >
                  {col.id === 'selecionar' ? (
                    <input
                      type="checkbox"
                      checked={todasSelecionadas}
                      ref={el => {
                        if (el) el.indeterminate = !todasSelecionadas && algumaSelecionada;
                      }}
                      onChange={() => onToggleSelecionarTodas?.()}
                      aria-label="Selecionar todas"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao(col.id)}
                      disabled={!sortable}
                      className={sortable ? 'hover:underline' : 'cursor-default'}
                      title={sortable ? 'Clique para ordenar' : undefined}
                    >
                      {col.label}{indicadorOrdenacao(col.id)}
                    </button>
                  )}
                  {resizable && (
                    <span
                      role="separator"
                      aria-label={`Redimensionar coluna ${col.label}`}
                      aria-orientation="vertical"
                      tabIndex={0}
                      className={`solicitacoes-col-resizer ${resizingColumnId === col.id ? 'is-active' : ''}`}
                      title="Arraste para redimensionar. Enter restaura."
                      onPointerDown={(event) => iniciarRedimensionamento(event, col)}
                      onDoubleClick={(event) => restaurarLarguraColuna(event, col)}
                      onKeyDown={(event) => handleResizerKeyDown(event, col)}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {solicitacoesOrdenadas.map(s => (
            <LinhaSolicitacao
              key={s.id}
              solicitacao={s}
              onAtualizar={onAtualizar}
              setoresMap={setoresMap}
              permissaoUsuario={permissaoUsuario}
              mostrarRefContrato={isSetorObra}
              visibleColumns={visibleSet ? Array.from(visibleSet) : null}
              mostrarArquivadas={mostrarArquivadas}
              selecaoHabilitada={selecaoHabilitada}
              selecionada={idsSet.has(Number(s.id))}
              onToggleSelecionada={onToggleSelecionada}
              viewportMode={viewportMode}
            />
          ))}
        </tbody>
        </table>
      </div>

    </div>
  );
}
