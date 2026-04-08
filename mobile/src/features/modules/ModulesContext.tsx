import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../../services/api/client';
import { getProvisionamentoFinanceiroContexto } from '../../services/api/provisionamento';
import type { ProvisionamentoContexto } from '../../services/api/types';

interface ModulesContextValue {
  loadingProvisionamento: boolean;
  provisionamentoContexto: ProvisionamentoContexto | null;
  hasSolicitacoesModule: boolean;
  hasProvisionamentoAccess: boolean;
  canCreateProvisionamento: boolean;
  canApproveProvisionamento: boolean;
  canViewProvisionamentoDashboard: boolean;
  hasAnyOperationalModule: boolean;
  refreshProvisionamento: () => Promise<void>;
}

const ModulesContext = createContext<ModulesContextValue | null>(null);

function isForbiddenError(error: unknown) {
  return error instanceof ApiError && [401, 403, 404].includes(error.status);
}

export function ModulesProvider({ children }: { children: ReactNode }) {
  const { status, user, hasModule } = useAuth();
  const [loadingProvisionamento, setLoadingProvisionamento] = useState(false);
  const [provisionamentoContexto, setProvisionamentoContexto] = useState<ProvisionamentoContexto | null>(null);

  const hasSolicitacoesModule = hasModule('SOLICITACOES');
  const isSuperadmin = String(user?.perfil || '').toUpperCase() === 'SUPERADMIN';

  const refreshProvisionamento = useCallback(async () => {
    if (status !== 'authenticated') {
      setProvisionamentoContexto(null);
      return;
    }

    try {
      setLoadingProvisionamento(true);
      const data = await getProvisionamentoFinanceiroContexto();
      setProvisionamentoContexto(data);
    } catch (error) {
      if (!isForbiddenError(error)) {
        console.warn('Falha ao carregar contexto mobile de Provisionamento.', error);
      }
      setProvisionamentoContexto(null);
    } finally {
      setLoadingProvisionamento(false);
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setProvisionamentoContexto(null);
      setLoadingProvisionamento(false);
      return;
    }

    void refreshProvisionamento();
  }, [status, user?.id, refreshProvisionamento]);

  const value = useMemo<ModulesContextValue>(() => {
    const hasProvisionamentoAccess = Boolean(
      isSuperadmin || provisionamentoContexto?.permissoes?.pode_acessar
    );
    const canCreateProvisionamento = Boolean(
      isSuperadmin || provisionamentoContexto?.permissoes?.pode_criar
    );
    const canApproveProvisionamento = Boolean(
      isSuperadmin || provisionamentoContexto?.permissoes?.pode_aprovar
    );
    const canViewProvisionamentoDashboard = Boolean(
      isSuperadmin || provisionamentoContexto?.permissoes?.pode_dashboard_global
    );

    return {
      loadingProvisionamento,
      provisionamentoContexto,
      hasSolicitacoesModule,
      hasProvisionamentoAccess,
      canCreateProvisionamento,
      canApproveProvisionamento,
      canViewProvisionamentoDashboard,
      hasAnyOperationalModule: hasSolicitacoesModule || hasProvisionamentoAccess,
      refreshProvisionamento
    };
  }, [hasSolicitacoesModule, isSuperadmin, loadingProvisionamento, provisionamentoContexto, refreshProvisionamento]);

  return (
    <ModulesContext.Provider value={value}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const context = useContext(ModulesContext);

  if (!context) {
    throw new Error('useModules precisa ser usado dentro de ModulesProvider');
  }

  return context;
}
