import { useEffect, useMemo, useRef, useState } from 'react';
import LinhaSolicitacao from './LinhaSolicitacao';
import { useAuth } from '../../contexts/AuthContext';
import { timestampOrdenacaoData } from '../../utils/dateLocal';

const SORTABLE_COLUMNS = new Set(['data', 'vencimento', 'valor']);
const MAX_COLUMN_WIDTH = 640;

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
  const resizeStateRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const { user } = useAuth();

  const setorTokens = [
    String(user?.setor?.codigo || '').toUpperCase(),
    String(user?.setor?.nome || '').toUpperCase(),
    String(user?.area || '').toUpperCase()
  ];
  const isSetorObra = setorTokens.includes('OBRA');

  const selecaoHabilitada = !mostrarArquivadas && typeof onToggleSelecionada === 'function';
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
      { id: 'numero_sienge', label: 'Nº SIENGE', width: 120, min: 100, weight: 0.9 },
      { id: 'obra', label: 'Obra', width: 170, min: 120, weight: 1.2 },
      { id: 'contrato', label: 'Contrato', width: 120, min: 95, weight: 1 },
      { id: 'descricao', label: 'Descrição', width: 110, min: 110, weight: 0, fixed: true },
      { id: 'tipo', label: 'Tipo de Solicitação', width: 170, min: 120, weight: 1.1 },
      { id: 'valor', label: 'Valor', width: 200, min: 160, weight: 1.15 },
      { id: 'setor', label: 'Setor', width: 110, min: 90, weight: 0.9 },
      { id: 'responsavel', label: 'Responsável', width: 130, min: 100, weight: 1.1 },
      { id: 'status', label: 'Status', width: 140, min: 110, weight: 1 },
      { id: 'vencimento', label: 'Vencimento', width: 120, min: 100, weight: 0.9 },
      { id: 'acoes', label: 'Ações', width: 220, min: 190, weight: 1.4 }
    ];

    if (isSetorObra) {
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
  }, [isSetorObra, selecaoHabilitada]);

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
      'contrato',
      ...(isSetorObra ? ['ref_contrato'] : []),
      'descricao',
      'tipo',
      'valor',
      'setor',
      'responsavel',
      'status',
      'vencimento',
      'acoes'
    ]);
  }, [viewportMode, selecaoHabilitada, isSetorObra]);

  const columns = useMemo(() => {
    const userFiltered = !visibleSet
      ? columnsBase
      : columnsBase.filter(col => col.id === 'selecionar' || visibleSet.has(col.id));

    if (!responsiveVisibleSet) return userFiltered;
    return userFiltered.filter(col => col.id === 'selecionar' || responsiveVisibleSet.has(col.id));
  }, [columnsBase, visibleSet, responsiveVisibleSet]);

  const columnWidthsStorageKey = useMemo(() => {
    const identificador = user?.id || user?.email || user?.nome || user?.perfil || 'anon';
    const escopo = mostrarArquivadas ? 'arquivadas' : 'ativas';
    const layout = isSetorObra ? 'obra' : 'geral';
    return `solicitacoes:larguras-colunas:${escopo}:${layout}:${identificador}`;
  }, [user?.id, user?.email, user?.nome, user?.perfil, mostrarArquivadas, isSetorObra]);
  const [widthsById, setWidthsById] = useState({});
  const [ordenacao, setOrdenacao] = useState({ campo: 'data', direcao: 'desc' });

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(columnWidthsStorageKey);
      const parsed = salvo ? JSON.parse(salvo) : {};
      setWidthsById(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      setWidthsById({});
    }
  }, [columnWidthsStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(columnWidthsStorageKey, JSON.stringify(widthsById));
    } catch (error) {
      console.error('Erro ao salvar larguras das colunas', error);
    }
  }, [columnWidthsStorageKey, widthsById]);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const widths = useMemo(() => {
    return columns.map(col => {
      const salvo = Number(widthsById[col.id]);
      if (!Number.isFinite(salvo) || salvo <= 0) return col.width;
      return Math.max(Number(col.min || 60), Math.min(MAX_COLUMN_WIDTH, salvo));
    });
  }, [columns, widthsById]);

  const totalTableWidth = useMemo(
    () => columns.reduce((acc, col, index) => acc + Number(widths[index] ?? col.width ?? 0), 0),
    [columns, widths]
  );

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
        const n = Number(item?.valor);
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

  function iniciarResizeColuna(event, col, index) {
    if (col.id === 'selecionar') return;

    event.preventDefault();
    event.stopPropagation();

    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startWidth = Number(widths[index] ?? col.width);
    const minWidth = Number(col.min || 60);

    resizeStateRef.current = {
      colId: col.id,
      pointerId,
      startX,
      startWidth,
      minWidth
    };

    const alvo = event.currentTarget;
    alvo.setPointerCapture?.(pointerId);
    document.body.classList.add('is-resizing-column');

    function moverResize(moveEvent) {
      const state = resizeStateRef.current;
      if (!state || state.pointerId !== pointerId) return;

      const delta = moveEvent.clientX - state.startX;
      const largura = Math.max(
        state.minWidth,
        Math.min(MAX_COLUMN_WIDTH, Math.round(state.startWidth + delta))
      );

      setWidthsById(prev => ({
        ...prev,
        [state.colId]: largura
      }));
    }

    function finalizarResize() {
      resizeStateRef.current = null;
      document.body.classList.remove('is-resizing-column');
      window.removeEventListener('pointermove', moverResize);
      window.removeEventListener('pointerup', finalizarResize);
      window.removeEventListener('pointercancel', finalizarResize);
    }

    window.addEventListener('pointermove', moverResize);
    window.addEventListener('pointerup', finalizarResize);
    window.addEventListener('pointercancel', finalizarResize);
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
          style={{ width: `${totalTableWidth}px`, minWidth: '100%' }}
        >
        <colgroup>
          {columns.map((col, index) => (
            <col key={col.id} style={{ width: `${widths[index] ?? col.width}px` }} />
          ))}
        </colgroup>

        <thead className="bg-gray-50 dark:bg-slate-800">
          <tr>
            {columns.map((col, index) => {
              const sortable = SORTABLE_COLUMNS.has(col.id);
              return (
                <th
                  key={col.id}
                  className="p-3 pr-5 text-left relative select-none whitespace-nowrap text-xs uppercase tracking-wide text-gray-600 dark:text-slate-200 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 bg-gray-50 dark:bg-slate-800"
                  style={{ width: `${widths[index] ?? col.width}px` }}
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
                  {col.id !== 'selecionar' && (
                    <span
                      className="solicitacoes-column-resizer"
                      onPointerDown={(event) => iniciarResizeColuna(event, col, index)}
                      onClick={(event) => event.stopPropagation()}
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Redimensionar coluna ${col.label}`}
                      title="Arraste para ajustar a largura"
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
