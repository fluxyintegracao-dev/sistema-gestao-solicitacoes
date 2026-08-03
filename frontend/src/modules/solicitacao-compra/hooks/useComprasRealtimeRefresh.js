import { useCallback, useEffect, useRef } from 'react';
import { useLiveUpdateSubscription } from '../../../contexts/LiveUpdatesContext';

export default function useComprasRealtimeRefresh(refresh, {
  enabled = true,
  solicitacaoCompraId = null,
  pedidoCompraId = null,
  debounceMs = 350
} = {}) {
  const refreshRef = useRef(refresh);
  const timerRef = useRef(null);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const agendarRefresh = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      refreshRef.current?.();
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return useLiveUpdateSubscription({
    enabled,
    filter: (payload) => {
      if (String(payload?.event_type || '').toUpperCase() !== 'COMPRAS') return false;
      if (solicitacaoCompraId && Number(payload?.solicitacao_compra_id) !== Number(solicitacaoCompraId)) {
        return false;
      }
      if (pedidoCompraId && Number(payload?.pedido_compra_id) !== Number(pedidoCompraId)) {
        return false;
      }
      return true;
    },
    onEvent: agendarRefresh,
    fallbackRefresh: () => refreshRef.current?.(),
    fallbackMs: 60 * 1000
  });
}
