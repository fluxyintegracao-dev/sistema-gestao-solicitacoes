import { useEffect, useMemo, useState } from 'react';
import { getVisibilidadeUi } from '../services/configuracoesSistema';

let cachedConfig = null;
let pendingRequest = null;

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

export function useUiVisibility() {
  const [config, setConfig] = useState(cachedConfig || { hidden: [], registry: [] });
  const [loading, setLoading] = useState(!cachedConfig);

  useEffect(() => {
    let active = true;

    if (!pendingRequest) {
      pendingRequest = getVisibilidadeUi()
        .then((data) => {
          cachedConfig = {
            registry: Array.isArray(data?.registry) ? data.registry : [],
            hidden: Array.isArray(data?.hidden) ? data.hidden.map(normalizeKey) : []
          };
          return cachedConfig;
        })
        .catch(() => {
          cachedConfig = { registry: [], hidden: [] };
          return cachedConfig;
        })
        .finally(() => {
          pendingRequest = null;
        });
    }

    pendingRequest.then((data) => {
      if (!active) return;
      setConfig(data);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const hiddenSet = useMemo(() => new Set(config.hidden || []), [config.hidden]);

  return {
    loading,
    registry: config.registry || [],
    hidden: config.hidden || [],
    isVisible: (key) => !hiddenSet.has(normalizeKey(key))
  };
}

export function resetUiVisibilityCache() {
  cachedConfig = null;
  pendingRequest = null;
}
